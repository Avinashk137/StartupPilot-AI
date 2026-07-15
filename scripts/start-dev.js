/**
 * start-dev.js — StartupPilot AI Development Orchestrator
 *
 * Startup sequence:
 *   1. Auto-run setup if dependencies are missing
 *   2. Start the FastAPI backend (via uvicorn)
 *   3. Poll /api/health until backend is ready (up to 60 seconds)
 *   4. Start the Vite frontend
 *   5. Open the browser once frontend has printed its "ready" URL
 *   6. Show the full banner
 *
 * On Ctrl+C:
 *   - Kills both processes cleanly (uses taskkill on Windows)
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ── Paths ──────────────────────────────────────────────────────────────────────
const rootDir   = path.join(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const isWindows = process.platform === 'win32';

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
};

function log(msg)  { console.log(msg); }
function info(msg) { console.log(`${C.blue}ℹ${C.reset}  ${msg}`); }
function ok(msg)   { console.log(`${C.green}✓${C.reset}  ${msg}`); }
function warn(msg) { console.log(`${C.yellow}⚠${C.reset}  ${msg}`); }
function err(msg)  { console.log(`${C.red}✗${C.reset}  ${msg}`); }

// ── Step 1: Auto-setup ─────────────────────────────────────────────────────────
const venvPath          = path.join(backendDir, 'venv');
const frontendModules   = path.join(frontendDir, 'node_modules');

if (!fs.existsSync(venvPath) || !fs.existsSync(frontendModules)) {
  log(`\n${C.bold}🔍 Missing dependencies — running setup first...${C.reset}\n`);
  try {
    execSync('node scripts/setup.js', { cwd: rootDir, stdio: 'inherit' });
    log('');
  } catch {
    err('Setup failed. Cannot start. Please run: npm run setup');
    process.exit(1);
  }
}

// ── Resolve venv Python executable ────────────────────────────────────────────
const venvPythonPath = isWindows
  ? path.join(venvPath, 'Scripts', 'python.exe')
  : path.join(venvPath, 'bin', 'python');

if (!fs.existsSync(venvPythonPath)) {
  err(`Python executable not found at ${venvPythonPath}`);
  err('Run: npm run setup');
  process.exit(1);
}

// ── Ensure log directory exists ────────────────────────────────────────────────
const logDir = path.join(backendDir, 'logs');
fs.mkdirSync(logDir, { recursive: true });

// ── Print initial header ───────────────────────────────────────────────────────
console.clear();
log(`\n${C.bold}${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
log(`${C.bold}   🚀 StartupPilot AI — Dev Mode${C.reset}`);
log(`${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}\n`);

// ── Step 2: Start Backend ──────────────────────────────────────────────────────
info('Starting FastAPI backend...');

// Use uvicorn to run the backend as a package from the project root.
// This correctly resolves relative imports like `from .core.config import settings`.
const backend = spawn(
  venvPythonPath,
  ['-m', 'uvicorn', 'backend.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'],
  {
    cwd: rootDir,   // Project root — so `backend` is a package
    shell: false,
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONDONTWRITEBYTECODE: '1',
    },
  }
);

let backendExited = false;

function handleOutput(data, source) {
  const str = data.toString().trim();
  if (!str) return;
  const lower = str.toLowerCase();
  const isError =
    lower.includes('error') ||
    lower.includes('traceback') ||
    lower.includes('exception') ||
    lower.includes('critical') ||
    lower.includes('failed');
  if (isError) {
    console.log(`${C.red}[${source}]${C.reset} ${str}`);
  } else if (lower.includes('warning') || lower.includes('warn')) {
    console.log(`${C.yellow}[${source}]${C.reset} ${str}`);
  }
  // Normal info/debug output is suppressed (goes to log file)
}

backend.stdout.on('data', (d) => handleOutput(d, 'Backend'));
backend.stderr.on('data', (d) => handleOutput(d, 'Backend'));

backend.on('exit', (code) => {
  backendExited = true;
  if (code !== 0 && code !== null) {
    err(`Backend process exited with code ${code}`);
    err(`Check logs: ${path.join(backendDir, 'logs', 'server.log')}`);
  }
});

// ── Step 3: Poll health endpoint ───────────────────────────────────────────────
const HEALTH_URL  = 'http://127.0.0.1:8000/api/health';
const MAX_WAIT_MS = 60_000;  // 60 seconds
const POLL_MS     = 2_000;   // poll every 2 seconds

async function pollHealth() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    let dots = 0;

    process.stdout.write(`${C.blue}ℹ${C.reset}  Waiting for backend`);

    const interval = setInterval(() => {
      if (backendExited) {
        clearInterval(interval);
        process.stdout.write('\n');
        reject(new Error('Backend process exited before becoming healthy'));
        return;
      }

      if (Date.now() - started > MAX_WAIT_MS) {
        clearInterval(interval);
        process.stdout.write('\n');
        reject(new Error(`Backend did not become healthy within ${MAX_WAIT_MS / 1000}s`));
        return;
      }

      // Print dots to show progress
      dots = (dots + 1) % 4;
      process.stdout.write('\r' + `${C.blue}ℹ${C.reset}  Waiting for backend` + '.'.repeat(dots) + '   ');

      const req = http.get(HEALTH_URL, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            // Accept both "healthy" and "degraded" (DB up, AI keys may be missing)
            if (data.status === 'healthy' || data.status === 'degraded') {
              clearInterval(interval);
              process.stdout.write('\n');
              resolve(data);
            }
          } catch {
            // Not yet ready
          }
        });
      });
      req.on('error', () => { /* not ready yet — keep polling */ });
      req.setTimeout(1500, () => req.destroy());
    }, POLL_MS);
  });
}

// ── Step 4 & 5: Start Frontend after backend is ready ─────────────────────────
let frontend = null;
let browserOpened = false;

async function startAll() {
  try {
    const healthData = await pollHealth();
    ok(`Backend ready! (${healthData.status})`);

    if (healthData.ai?.status === 'degraded' || !healthData.ai?.providers?.length) {
      warn('No AI providers configured. Add GEMINI_API_KEY to backend/.env to enable AI analysis.');
    }

    info('Starting Vite frontend...');

    frontend = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      shell: true,
      stdio: 'pipe',
    });

    frontend.stdout.on('data', (data) => {
      const str = data.toString();
      // Do not suppress Vite output; print it directly
      process.stdout.write(str);

      // Detect when Vite is ready and extract the exact local URL (handling dynamic ports)
      if (!browserOpened) {
        const match = str.match(/http:\/\/(localhost|127\.0\.0\.1):\d+/);
        if (match) {
          const localUrl = match[0];
          browserOpened = true;
          // Small delay to let Vite fully initialize
          setTimeout(() => {
            printBanner(localUrl);
            openBrowser(localUrl);
          }, 800);
        }
      }
    });
    
    frontend.stderr.on('data', (data) => {
      // Do not suppress errors; print exactly what failed
      process.stderr.write(data);
    });

    frontend.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        err(`Frontend process exited with code ${code}`);
      }
    });
  } catch (e) {
    err(`Could not start: ${e.message}`);
    err('Make sure backend/.env is configured and try again.');
    killAll();
    process.exit(1);
  }
}

function openBrowser(url) {
  try {
    if (isWindows) {
      execSync(`start "" "${url}"`, { shell: true });
    } else if (process.platform === 'darwin') {
      execSync(`open "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
  } catch {
    // Non-critical — browser open failing is OK
  }
}

function printBanner(url) {
  log(`\n${C.bold}${C.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
  log(`${C.green}Backend Ready ✓${C.reset}`);
  log(`${C.green}Frontend Ready ✓${C.reset}`);
  log(`Opening browser...`);
  log(`Local: ${C.cyan}${url}${C.reset}`);
  log(`${C.bold}${C.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}\n`);
  log(`   ${C.bold}Backend${C.reset}   : ${C.cyan}http://127.0.0.1:8000${C.reset}`);
  log(`   ${C.bold}API Docs${C.reset}  : ${C.cyan}http://127.0.0.1:8000/api/docs${C.reset}`);
  log(`   ${C.bold}Health${C.reset}    : ${C.cyan}http://127.0.0.1:8000/api/health${C.reset}`);
  log(`   ${C.bold}Logs${C.reset}      : ${C.gray}backend/logs/server.log${C.reset}`);
  log(`\n   ${C.dim}Press Ctrl+C to stop all servers${C.reset}`);
  log(`${C.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}\n`);
}

// ── Process cleanup ────────────────────────────────────────────────────────────
function killProcess(proc, name) {
  if (!proc || proc.exitCode !== null) return;
  try {
    if (isWindows) {
      // On Windows, kill() sends SIGTERM which may not propagate to child processes.
      // taskkill /F /T kills the process tree.
      try {
        execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
      } catch {
        proc.kill();
      }
    } else {
      proc.kill('SIGTERM');
    }
  } catch (e) {
    // Already dead — that's fine
  }
}

function killAll() {
  log(`\n${C.yellow}  Shutting down StartupPilot AI...${C.reset}`);
  killProcess(backend, 'Backend');
  killProcess(frontend, 'Frontend');
}

let shutdownInProgress = false;
function handleShutdown() {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  killAll();
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT',  handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('exit',    killAll);

// ── Kick it off ────────────────────────────────────────────────────────────────
startAll();
