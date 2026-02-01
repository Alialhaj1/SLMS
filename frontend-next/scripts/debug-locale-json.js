const fs = require('fs');
const path = require('path');

function analyze(localeFile) {
  const filePath = path.join(__dirname, '..', 'locales', localeFile);
  const raw = fs.readFileSync(filePath, 'utf8');

  const rawNeedle = '"contractTypes"';
  const rawIndex = raw.indexOf(rawNeedle);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`[${localeFile}] JSON.parse failed:`, e.message);
    process.exitCode = 1;
    return;
  }

  const keys = Object.keys(parsed);
  const hasContractTypes = Object.prototype.hasOwnProperty.call(parsed, 'contractTypes');

  // Find contractTypes anywhere in the object (to detect accidental nesting)
  const foundPaths = [];
  const visited = new Set();
  const stack = [{ value: parsed, path: '' }];
  while (stack.length && foundPaths.length < 10) {
    const { value, path: currentPath } = stack.pop();
    if (!value || typeof value !== 'object') continue;
    if (visited.has(value)) continue;
    visited.add(value);

    for (const [k, v] of Object.entries(value)) {
      const nextPath = currentPath ? `${currentPath}.${k}` : k;
      if (k === 'contractTypes') {
        foundPaths.push(nextPath);
      }
      if (v && typeof v === 'object') {
        stack.push({ value: v, path: nextPath });
      }
    }
  }

  // detect duplicate top-level object keys (only those with object values, like "  \"foo\": {")
  const lines = raw.split(/\r?\n/);
  const keyLineRegex = /^\s{2}"([^"]+)":\s*\{/;
  const firstLineByKey = new Map();
  const duplicates = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(keyLineRegex);
    if (!m) continue;
    const key = m[1];
    const lineNumber = i + 1;
    if (firstLineByKey.has(key)) {
      duplicates.push({ key, first: firstLineByKey.get(key), second: lineNumber });
    } else {
      firstLineByKey.set(key, lineNumber);
    }
  }

  console.log(`\n== ${localeFile} ==`);
  console.log(`Top-level keys: ${keys.length}`);
  console.log(`Has contractTypes: ${hasContractTypes}`);
  console.log(`contractTypes.title: ${parsed.contractTypes?.title ?? '<missing>'}`);
  console.log(`Found contractTypes paths: ${foundPaths.length ? foundPaths.join(' | ') : '<none>'}`);
  console.log(`Last 15 keys: ${keys.slice(-15).join(', ')}`);

  console.log(`Raw contains ${rawNeedle}: ${rawIndex !== -1}`);
  if (rawIndex !== -1) {
    const snippetStart = Math.max(0, rawIndex - 20);
    const snippetEnd = Math.min(raw.length, rawIndex + rawNeedle.length + 30);
    const snippet = raw.slice(snippetStart, snippetEnd);
    const snippetCodes = Array.from(snippet).map((ch) => ch.codePointAt(0));
    console.log(`Raw snippet: ${JSON.stringify(snippet)}`);
    console.log(`Raw snippet code points: ${snippetCodes.join(' ')}`);
  }

  if (duplicates.length) {
    console.log(`Duplicate top-level object keys: ${duplicates.length}`);
    duplicates.slice(0, 25).forEach((d) => {
      console.log(`- ${d.key} (lines ${d.first} and ${d.second})`);
    });
    if (duplicates.length > 25) {
      console.log(`... plus ${duplicates.length - 25} more`);
    }
  } else {
    console.log('Duplicate top-level object keys: 0');
  }
}

analyze('ar.json');
analyze('en.json');
