#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, '6c74284b6f7a0bda.js');
const args = process.argv.slice(2);

const child = spawn('node', [scriptPath, ...args], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_OPTIONS: '--no-warnings' }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
