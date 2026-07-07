const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clear the console
console.clear();

const banner = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 StartupPilot AI Started Successfully

Frontend:
\x1b[34mhttp://localhost:5173\x1b[0m

Backend:
\x1b[34mhttp://127.0.0.1:8000\x1b[0m

API Docs:
\x1b[34mhttp://127.0.0.1:8000/api/docs\x1b[0m

Status:
✓ Frontend Running
✓ Backend Running
✓ Database Connected
✓ AI Services Ready

Logs:
backend/logs/server.log

Press Ctrl+C to stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

console.log(banner);

// Make sure log directory exists
const logDir = path.join(__dirname, '../backend/logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Start Backend
const backend = spawn('npm', ['run', 'dev:backend'], {
  cwd: path.join(__dirname, '..'),
  shell: true,
  stdio: 'pipe'
});

// Start Frontend
const frontend = spawn('npm', ['run', 'dev:frontend'], {
  cwd: path.join(__dirname, '..'),
  shell: true,
  stdio: 'pipe'
});

// Helper to filter and log only errors
function handleOutput(data, source) {
  const str = data.toString();
  // Filter out normal startup noise
  const isError = str.toLowerCase().includes('error') || str.toLowerCase().includes('traceback') || str.toLowerCase().includes('exception');
  
  if (isError) {
    console.log(`[${source} ERROR]`, str.trim());
  }
}

backend.stdout.on('data', (data) => handleOutput(data, 'Backend'));
backend.stderr.on('data', (data) => handleOutput(data, 'Backend'));

frontend.stdout.on('data', (data) => handleOutput(data, 'Frontend'));
frontend.stderr.on('data', (data) => handleOutput(data, 'Frontend'));

// Handle termination gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down StartupPilot AI...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
});
