const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');

// Read all migration files
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix CREATE INDEX
  const fixedIndex = content.replace(/CREATE INDEX (idx_[a-zA-Z0-9_]+)/g, (match, indexName) => {
    modified = true;
    return `CREATE INDEX IF NOT EXISTS ${indexName}`;
  });
  
  // Fix CREATE TRIGGER (need to add DROP IF EXISTS before)
  const fixedTrigger = fixedIndex.replace(/(CREATE TRIGGER )([a-zA-Z0-9_]+)/g, (match, createPart, triggerName) => {
    modified = true;
    return `DROP TRIGGER IF EXISTS ${triggerName} ON ${getTriggerTable(content, triggerName)};\n${createPart}${triggerName}`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, fixedTrigger, 'utf8');
    fixedCount++;
    console.log(`✓ Fixed ${file}`);
  }
});

console.log(`\nFixed ${fixedCount} migration files`);

function getTriggerTable(content, triggerName) {
  // Try to find the table name in the trigger definition
  const match = content.match(new RegExp(`${triggerName}[\\s\\S]*?ON\\s+(\\w+)`, 'i'));
  return match ? match[1] : 'unknown_table';
}
