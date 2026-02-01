const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');

// Read all migration files
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip files that already use DO $$ blocks for constraints
  if (content.includes('information_schema.table_constraints')) {
    console.log(`⏭️  Skipping ${file} (already has constraint checks)`);
    return;
  }
  
  let modified = false;
  
  // Find all ALTER TABLE...ADD CONSTRAINT patterns
  const constraintPattern = /ALTER TABLE\s+(\w+)\s+ADD CONSTRAINT\s+(\w+)\s+FOREIGN KEY\s*\(([^)]+)\)\s+REFERENCES\s+(\w+)\s*\(([^)]+)\)([^;]*);/gi;
  
  let constraints = [];
  let match;
  while ((match = constraintPattern.exec(content)) !== null) {
    constraints.push({
      full: match[0],
      table: match[1],
      constraintName: match[2],
      column: match[3],
      refTable: match[4],
      refColumn: match[5],
      extra: match[6]
    });
    modified = true;
  }
  
  if (constraints.length > 0) {
    // Build a DO $$ block for all constraints
    let doBlock = 'DO $$\nBEGIN\n';
    constraints.forEach(c => {
      doBlock += `  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='${c.constraintName}' AND table_name='${c.table}') THEN\n`;
      doBlock += `    ALTER TABLE ${c.table}\n`;
      doBlock += `      ADD CONSTRAINT ${c.constraintName}\n`;
      doBlock += `      FOREIGN KEY (${c.column}) REFERENCES ${c.refTable}(${c.refColumn})${c.extra};\n`;
      doBlock += `  END IF;\n\n`;
    });
    doBlock += 'END $$;';
    
    // Replace all constraint statements with the DO block
    constraints.forEach(c => {
      content = content.replace(c.full, '');
    });
    
    // Find a good place to insert the DO block (after all ALTER TABLE ADD COLUMN statements)
    const lastAlterIndex = content.lastIndexOf('ALTER TABLE');
    if (lastAlterIndex !== -1) {
      // Find the end of that statement
      const nextSemicolon = content.indexOf(';', lastAlterIndex);
      if (nextSemicolon !== -1) {
        content = content.slice(0, nextSemicolon + 1) + '\n\n' + doBlock + '\n' + content.slice(nextSemicolon + 1);
      } else {
        content += '\n\n' + doBlock;
      }
    } else {
      content += '\n\n' + doBlock;
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    console.log(`✓ Fixed ${file} (${constraints.length} constraints)`);
  }
});

console.log(`\nFixed ${fixedCount} migration files`);
