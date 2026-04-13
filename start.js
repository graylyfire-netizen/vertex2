const { spawn } = require('child_process');

const child = spawn('sh', ['start.sh']);

child.stdout.on('data', (data) => {
  console.log(`${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`${data}`);
});

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

child.on('error', (err) => {
  console.error('Failed to start child process.', err);
});