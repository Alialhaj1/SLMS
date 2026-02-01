const { exec } = require('child_process');
exec('docker logs slms-backend-1 --tail 50 --since 1m', (error, stdout) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  const lines = stdout.split('\n');
  let found = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Error') || lines[i].includes('error') || lines[i].includes('500')) {
      console.log('=== LAST ERROR CONTEXT ===');
      for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 10); j++) {
        console.log(lines[j]);
      }
      found = true;
      break;
    }
  }
  if (!found) {
    console.log('No errors found. Last 15 lines:');
    console.log(lines.slice(-15).join('\n'));
  }
});
