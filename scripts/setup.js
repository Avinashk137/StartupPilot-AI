const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🛠️  StartupPilot AI Cross-Platform Setup');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const rootDir = path.join(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const isWindows = process.platform === 'win32';

// 1. Environment Files Configuration
console.log('📂 Setting up environment files...');
const backendEnvPath = path.join(backendDir, '.env');
const backendEnvExamplePath = path.join(backendDir, '.env.example');
if (!fs.existsSync(backendEnvPath)) {
  if (fs.existsSync(backendEnvExamplePath)) {
    fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
    console.log('✓ Created backend/.env from backend/.env.example');
  } else {
    fs.writeFileSync(backendEnvPath, 'DATABASE_URL=\nSUPABASE_URL=\nSUPABASE_ANON_KEY=\nSECRET_KEY=\nGEMINI_API_KEY=\n');
    console.log('✓ Created empty backend/.env');
  }
} else {
  console.log('✓ backend/.env already exists');
}

const frontendEnvPath = path.join(frontendDir, '.env.local');
const frontendEnvExamplePath = path.join(frontendDir, '.env.example');
if (!fs.existsSync(frontendEnvPath)) {
  if (fs.existsSync(frontendEnvExamplePath)) {
    fs.copyFileSync(frontendEnvExamplePath, frontendEnvPath);
    console.log('✓ Created frontend/.env.local from frontend/.env.example');
  } else {
    fs.writeFileSync(frontendEnvPath, 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\nDATABASE_URL=\n');
    console.log('✓ Created empty frontend/.env.local');
  }
} else {
  console.log('✓ frontend/.env.local already exists');
}

console.log('');

// 2. Frontend Dependencies Installation
console.log('📦 Installing frontend npm dependencies...');
try {
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
  console.log('✓ Frontend dependencies installed successfully.\n');
} catch (error) {
  console.error('❌ Failed to install frontend dependencies. Please run "npm install" manually inside the "frontend" directory.\n');
}

// 3. Python Environment Setup
console.log('🐍 Setting up Python Virtual Environment (venv)...');

function getPythonCommand() {
  const commands = ['python3', 'python', 'py'];
  for (const cmd of commands) {
    try {
      const output = execSync(`${cmd} --version`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
      if (output.toLowerCase().includes('python 3') || (output && /^[0-9]/.test(output) && output.startsWith('3'))) {
        return cmd;
      }
    } catch (e) {
      // Command failed or not found
    }
  }
  return null;
}

const pythonCmd = getPythonCommand();
if (!pythonCmd) {
  console.error('❌ Python 3 was not found in your system PATH.');
  console.error('   Please install Python 3.10+ and make sure it is added to your environment variables.');
  console.error('   After installing Python, re-run this setup.\n');
  process.exit(1);
}

console.log(`✓ Detected Python command: ${pythonCmd}`);

const venvPath = path.join(backendDir, 'venv');

// Self-healing: Check if existing venv is broken (e.g. copied from another machine)
// We import pydantic — if that fails, compiled extensions are incompatible with this machine.
let venvWorking = false;
if (fs.existsSync(venvPath)) {
  try {
    const testPythonPath = isWindows 
      ? path.join(venvPath, 'Scripts', 'python.exe')
      : path.join(venvPath, 'bin', 'python');
      
    if (fs.existsSync(testPythonPath)) {
      // Test that compiled extensions (e.g. pydantic_core) actually load correctly
      execSync(`"${testPythonPath}" -c "import pydantic; import pydantic_settings"`, { stdio: 'ignore' });
      venvWorking = true;
    }
  } catch (e) {
    venvWorking = false;
  }
}

if (fs.existsSync(venvPath) && !venvWorking) {
  console.log('⚠️  Detected a broken or copied virtual environment. Recreating it to fix local paths...');
  try {
    fs.rmSync(venvPath, { recursive: true, force: true });
    console.log('✓ Removed broken virtual environment.');
  } catch (error) {
    console.error('❌ Failed to remove broken virtual environment folder. Please delete backend/venv manually and re-run.');
    process.exit(1);
  }
}

if (!fs.existsSync(venvPath)) {
  console.log('⚙️  Creating Python virtual environment in backend/venv...');
  try {
    execSync(`${pythonCmd} -m venv venv`, { cwd: backendDir, stdio: 'inherit' });
    console.log('✓ Virtual environment created successfully.');
  } catch (error) {
    console.error('❌ Failed to create python virtual environment.');
    console.error(error.message);
    process.exit(1);
  }
} else {
  console.log('✓ Python virtual environment already exists and is functional.');
}

// Determine path to venv python
const venvPythonPath = isWindows 
  ? path.join(venvPath, 'Scripts', 'python.exe')
  : path.join(venvPath, 'bin', 'python');

if (!fs.existsSync(venvPythonPath)) {
  console.error(`❌ Could not locate python executable inside virtual environment at ${venvPythonPath}`);
  process.exit(1);
}

console.log('⚙️  Installing Python backend dependencies from requirements.txt...');
try {
  // Use venv python explicitly to run pip so activation is not required
  execSync(`"${venvPythonPath}" -m pip install -r requirements.txt`, { cwd: backendDir, stdio: 'inherit' });
  console.log('\n✓ Python backend dependencies installed successfully.');
} catch (error) {
  console.error('\n❌ Failed to install Python dependencies.');
  console.error(error.message);
  process.exit(1);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎉 Setup Completed Successfully!');
console.log('👉 Run "npm run dev" to start frontend and backend together.');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
process.exit(0);
