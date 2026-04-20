const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) results = results.concat(walk(full));
      else if (/\.(tsx?|jsx?)$/.test(e.name)) results.push(full);
    }
  } catch(err) {}
  return results;
}

const files = walk('./frontend-next');
const tCalls = new Set();
const pattern = /\bt\(\s*['`]([^'`\$]+)['`]/g;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = pattern.exec(content)) !== null) {
    tCalls.add(m[1]);
  }
});

const en = require('./frontend-next/locales/en.json');
const ar = require('./frontend-next/locales/ar.json');

function getNestedValue(obj, key) {
  if (!obj) return undefined;
  if (obj.hasOwnProperty(key)) return obj[key];
  const parts = key.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    if (!cur) return undefined;
    const rem = parts.slice(i).join('.');
    if (cur.hasOwnProperty && cur.hasOwnProperty(rem)) return cur[rem];
    if (cur.hasOwnProperty && cur.hasOwnProperty(parts[i])) {
      cur = cur[parts[i]];
    } else {
      return undefined;
    }
  }
  return cur;
}

const usedKeys = [...tCalls].sort();
const missingBoth = [];
const missingAr = [];
const missingEn = [];

usedKeys.forEach(k => {
  const inEn = getNestedValue(en, k) !== undefined;
  const inAr = getNestedValue(ar, k) !== undefined;
  // Also check master. prefix fallback
  const inEnMaster = getNestedValue(en, 'master.' + k) !== undefined;
  const inArMaster = getNestedValue(ar, 'master.' + k) !== undefined;
  const foundEn = inEn || inEnMaster;
  const foundAr = inAr || inArMaster;
  if (!foundEn && !foundAr) missingBoth.push(k);
  else if (!foundAr && foundEn) missingAr.push(k);
  else if (!foundEn && foundAr) missingEn.push(k);
});

console.log('Total unique t() keys used in code: ' + usedKeys.length);
console.log('\n=== Missing in BOTH EN and AR (' + missingBoth.length + ') ===');
missingBoth.forEach(k => console.log('  ' + k));
console.log('\n=== Missing in AR only (' + missingAr.length + ') ===');
missingAr.forEach(k => console.log('  ' + k));
console.log('\n=== Missing in EN only (' + missingEn.length + ') ===');
missingEn.forEach(k => console.log('  ' + k));
