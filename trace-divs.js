const fs = require('fs');
const content = fs.readFileSync('/app/pages/purchasing/orders.tsx', 'utf8');
const lines = content.split('\n');
let balance = 0;
lines.forEach((line, i) => {
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div/g) || []).length;
  balance += opens - closes;
  if (i > 805 && i < 1170 && (opens > 0 || closes > 0)) {
    console.log(`Line ${i+1}: bal=${balance} +${opens} -${closes} | ${line.trim().substring(0, 60)}`);
  }
});
console.log(`\nFinal balance: ${balance}`);
