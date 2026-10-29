'use strict';
// Compile only this lab into an owned temporary directory; never leave .class files in src/.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const exercises = ['ex0-basics', 'ex1-race', 'ex2-queue', 'ex3-pool', 'ex4-deadlock', 'ex5-workers', 'test'];
const exercise = process.argv[2];
async function run(command, args, timeout) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    const stop = () => child.kill('SIGTERM');
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    const cleanup = () => {
      clearTimeout(timer);
      process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    };
    child.once('error', error => { cleanup(); reject(error); });
    child.once('close', (code, signal) => {
      cleanup();
      if (signal) reject(new Error(command + ' stopped: ' + signal));
      else resolve(code);
    });
  });
}
async function main() {
  if (!exercises.includes(exercise)) {
    console.error('JDK 21+ required. Usage: node start.js ' + exercises.join(' | '));
    process.exitCode = 1;
    return;
  }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sdg-concurrency-'));
  try {
    const sources = fs.readdirSync(path.join(__dirname, 'src')).filter(f => f.endsWith('.java'));
    const compiled = await run('javac', ['--release', '21', '-d', out,
      ...sources.map(f => path.join(__dirname, 'src', f))], 30000);
    if (compiled !== 0) {
      console.error('Install/use a JDK 21+ with both java and javac on PATH. No npm install needed.');
      process.exitCode = 1;
    } else {
      process.exitCode = await run('java', ['-cp', out, 'LabRunner', exercise, ...process.argv.slice(3)], 20000);
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
