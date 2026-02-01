const { exec } = require('child_process');

exec('docker logs slms-backend-1 --tail 100', (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Find validation errors
  const lines = stdout.split('\n');
  let foundError = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Validation') || line.includes('validation') || line.includes('400') || line.includes('error')) {
      foundError = true;
      // Print context
      console.log('=== ERROR CONTEXT ===');
      for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 10); j++) {
        console.log(lines[j]);
      }
      console.log('==================\n');
      break;
    }
  }
  
  if (!foundError) {
    console.log('No validation errors found in recent logs');
    console.log('Last 20 lines:');
    console.log(lines.slice(-20).join('\n'));
  }
});
