const fs = require('fs');
const path = require('path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip build artifacts
      if (entry.name === '.next' || entry.name === 'node_modules' || entry.name === 'dist') continue;
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function normalizeSlashes(p) {
  return p.replace(/\\/g, '/');
}

function extractMenuPaths(menuRegistryPath) {
  const content = readText(menuRegistryPath);
  const paths = new Set();
  const re = /\bpath\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const p = m[1].trim();
    if (!p || p === '#') continue;
    if (!p.startsWith('/')) continue;
    paths.add(p);
  }
  return paths;
}

function extractHeaderLinks(headerPath) {
  const content = readText(headerPath);
  const paths = new Set();

  // Link href="/foo"
  const re1 = /<Link[^>]+href\s*=\s*{?\s*['"]([^'"]+)['"]\s*}?/g;
  let m;
  while ((m = re1.exec(content)) !== null) {
    const p = m[1].trim();
    if (p.startsWith('/')) paths.add(p);
  }

  // router.push('/foo') etc
  const re2 = /\b(?:push|replace)\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = re2.exec(content)) !== null) {
    const p = m[1].trim();
    if (p.startsWith('/')) paths.add(p);
  }

  return paths;
}

function buildExistingRoutes(pagesDir) {
  const files = walk(pagesDir).filter((f) => /\.(tsx|ts|js|jsx)$/.test(f));
  const routes = new Set();

  for (const file of files) {
    const rel = normalizeSlashes(path.relative(pagesDir, file));
    if (rel.startsWith('api/')) continue;
    if (rel.startsWith('_')) continue;

    const noExt = rel.replace(/\.(tsx|ts|js|jsx)$/, '');
    const parts = noExt.split('/');

    // Skip special files
    if (parts[0] === '_app' || parts[0] === '_document' || parts[0] === '_error') continue;

    // Next route mapping
    if (parts[parts.length - 1] === 'index') {
      parts.pop();
    }

    // dynamic routes become patterns; keep them but don't use for exact-missing resolution
    const route = '/' + parts.join('/');
    routes.add(route === '/' ? '/' : route);
  }

  return routes;
}

function routeExists(expectedPath, existingRoutes) {
  // exact
  if (existingRoutes.has(expectedPath)) return true;

  // trailing slash tolerance
  if (expectedPath.endsWith('/') && existingRoutes.has(expectedPath.slice(0, -1))) return true;
  if (!expectedPath.endsWith('/') && existingRoutes.has(expectedPath + '/')) return true;

  // dynamic match: /shipments/123 should match /shipments/[id]
  const parts = expectedPath.split('/').filter(Boolean);
  for (const r of existingRoutes) {
    const rp = r.split('/').filter(Boolean);
    if (rp.length !== parts.length) continue;
    let ok = true;
    for (let i = 0; i < rp.length; i++) {
      if (/^\[.+\]$/.test(rp[i])) continue;
      if (rp[i] !== parts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }

  return false;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const frontendDir = path.join(repoRoot, 'frontend-next');

  const menuRegistryPath = path.join(frontendDir, 'config', 'menu.registry.ts');
  const headerPath = path.join(frontendDir, 'components', 'layout', 'Header.tsx');
  const pagesDir = path.join(frontendDir, 'pages');

  if (!fs.existsSync(menuRegistryPath)) {
    console.error('Missing', menuRegistryPath);
    process.exit(1);
  }
  if (!fs.existsSync(pagesDir)) {
    console.error('Missing', pagesDir);
    process.exit(1);
  }

  const menuPaths = extractMenuPaths(menuRegistryPath);
  const headerPaths = fs.existsSync(headerPath) ? extractHeaderLinks(headerPath) : new Set();

  const expected = new Set([...menuPaths, ...headerPaths]);
  const existingRoutes = buildExistingRoutes(pagesDir);

  const missing = [];
  const present = [];

  for (const p of Array.from(expected).sort()) {
    if (routeExists(p, existingRoutes)) present.push(p);
    else missing.push(p);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    counts: {
      expected: expected.size,
      present: present.length,
      missing: missing.length,
    },
    missing,
    presentSample: present.slice(0, 50),
  };

  const outPath = path.join(repoRoot, 'NAVIGATION_AUDIT.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('Navigation audit written:', outPath);
  console.log('Expected:', expected.size, 'Present:', present.length, 'Missing:', missing.length);
  if (missing.length) {
    console.log('\nMissing routes:');
    for (const m of missing) console.log(' -', m);
  }
}

main();
