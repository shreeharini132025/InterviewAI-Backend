const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const tempRepoDir = path.join(os.tmpdir(), `sip-gh-pages-${Date.now()}`);
const branch = 'gh-pages';

function runGit(args, options = {}) {
  execFileSync('git', args, {
    cwd: rootDir,
    stdio: 'inherit',
    ...options
  });
}

function copyRecursive(source, target) {
  if (!fs.existsSync(source)) return;

  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

if (!fs.existsSync(distDir)) {
  console.error('Build output not found. Run `npm run build` first.');
  process.exit(1);
}

let originUrl = '';

try {
  originUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
    cwd: rootDir,
    encoding: 'utf8'
  }).trim();

  fs.mkdirSync(tempRepoDir, { recursive: true });
  runGit(['init'], { cwd: tempRepoDir });
  runGit(['remote', 'add', 'origin', originUrl], { cwd: tempRepoDir });
  runGit(['checkout', '--orphan', branch], { cwd: tempRepoDir });

  copyRecursive(distDir, tempRepoDir);

  runGit(['add', '-A'], { cwd: tempRepoDir });
  try {
    runGit(['commit', '-m', 'Deploy frontend to GitHub Pages'], {
      cwd: tempRepoDir
    });
  } catch (error) {
    const message = String(error?.message || '');
    if (!message.includes('nothing to commit')) {
      throw error;
    }
  }
  runGit(['push', '--force-with-lease', 'origin', branch], { cwd: tempRepoDir });

  console.log(`Published ${distDir} to ${branch}.`);
} finally {
  if (fs.existsSync(tempRepoDir)) {
    try {
      fs.rmSync(tempRepoDir, { recursive: true, force: true });
    } catch {
      // Leave the temp repo in place if cleanup fails.
    }
  }
}