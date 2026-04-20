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

const files = walk('./frontend-next');
const tCalls = new Map(); // key -> set of files
const pattern = /\bt\(\s*['`]([^'`\$]+)['`]/g;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = pattern.exec(content)) !== null) {
    const key = m[1];
    if (!tCalls.has(key)) tCalls.set(key, new Set());
    tCalls.set(key, tCalls.get(key).add(f));
  }
});

// Categorize all used keys
const missingBoth = [];
const missingAr = [];
const missingEn = [];

[...tCalls.keys()].sort().forEach(k => {
  const inEn = getNestedValue(en, k) !== undefined;
  const inAr = getNestedValue(ar, k) !== undefined;
  const inEnMaster = getNestedValue(en, 'master.' + k) !== undefined;
  const inArMaster = getNestedValue(ar, 'master.' + k) !== undefined;
  const foundEn = inEn || inEnMaster;
  const foundAr = inAr || inArMaster;
  if (!foundEn && !foundAr) missingBoth.push(k);
  else if (!foundAr && foundEn) missingAr.push(k);
  else if (!foundEn && foundAr) missingEn.push(k);
});

// Group by section
function groupBySection(keys) {
  const groups = {};
  keys.forEach(k => {
    const sec = k.split('.')[0];
    if (!groups[sec]) groups[sec] = [];
    groups[sec].push(k);
  });
  return groups;
}

// Output full list for patch generation
const output = {
  missingInBoth: groupBySection(missingBoth),
  missingInAr: groupBySection(missingAr),
  missingInEn: groupBySection(missingEn)
};

fs.writeFileSync('missing-translations.json', JSON.stringify(output, null, 2));
console.log('Written to missing-translations.json');
console.log('Missing in both:', missingBoth.length);
console.log('Missing in AR:', missingAr.length);
console.log('Missing in EN:', missingEn.length);

// Show the AR-only missing keys grouped
console.log('\n=== Keys in EN but missing in AR (need Arabic translation) by section ===');
const arGroups = groupBySection(missingAr);
Object.entries(arGroups).sort((a,b) => b[1].length - a[1].length).forEach(([sec, keys]) => {
  console.log(`\n--- ${sec} (${keys.length}) ---`);
  keys.forEach(k => {
    const enVal = getNestedValue(en, k) || getNestedValue(en, 'master.' + k);
    console.log(`  ${k} = "${enVal}"`);
  });
});

// Show the EN-only missing keys
console.log('\n=== Keys in AR but missing in EN (need English translation) ===');
missingEn.forEach(k => {
  const arVal = getNestedValue(ar, k) || getNestedValue(ar, 'master.' + k);
  console.log(`  ${k} = "${arVal}"`);
});
