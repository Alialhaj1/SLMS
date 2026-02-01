/*
 * 🔎 ROUTE AUDITOR (JS fallback)
 * =====================================================
 * Windows environments often block `npx.ps1` and TS ESM resolution can be finicky.
 * This JS script audits `config/menu.registry.ts` by regex to extract menu paths
 * and compares them against Next.js `pages/**`.
 *
 * Run:
 *   node scripts/audit-routes.js
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const pagesRoot = path.join(repoRoot, 'pages');
const auditsDir = path.join(repoRoot, 'audits');
const menuRegistryPath = path.join(repoRoot, 'config', 'menu.registry.ts');

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function walkFiles(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkFiles(abs, out);
    } else {
      out.push(abs);
    }
  }
}

function routeFromPageFile(absFile) {
  const rel = path.relative(pagesRoot, absFile);
  const relPosix = toPosix(rel);

  if (relPosix.startsWith('api/')) return null;
  if (relPosix.startsWith('_')) return null;

  if (!/\.(tsx|ts|jsx|js)$/i.test(relPosix)) return null;

  const noExt = relPosix.replace(/\.(tsx|ts|jsx|js)$/i, '');

  if (noExt === 'index') return '/';
  if (noExt.endsWith('/index')) return '/' + noExt.slice(0, -'/index'.length);
  return '/' + noExt;
}

function expectedCandidatesForMenuPath(menuPath) {
  const normalized = (menuPath || '').replace(/\/$/, '') || '/';
  if (normalized === '/') {
    return [
      path.join(pagesRoot, 'index.tsx'),
      path.join(pagesRoot, 'index.ts'),
      path.join(pagesRoot, 'index.jsx'),
      path.join(pagesRoot, 'index.js'),
    ];
  }
  const withoutLeading = normalized.replace(/^\//, '');
  return [
    path.join(pagesRoot, `${withoutLeading}.tsx`),
    path.join(pagesRoot, `${withoutLeading}.ts`),
    path.join(pagesRoot, `${withoutLeading}.jsx`),
    path.join(pagesRoot, `${withoutLeading}.js`),
    path.join(pagesRoot, withoutLeading, 'index.tsx'),
    path.join(pagesRoot, withoutLeading, 'index.ts'),
    path.join(pagesRoot, withoutLeading, 'index.jsx'),
    path.join(pagesRoot, withoutLeading, 'index.js'),
  ];
}

function main() {
  const menuText = fs.readFileSync(menuRegistryPath, 'utf-8');
  const lines = menuText.split(/\r?\n/);

  const pathRegex = /\bpath\s*:\s*(['"])(.*?)\1\s*,?/g;

  /** @type {{path:string, keyHint:string|null, permissionPresent:boolean}[]} */
  const menuPaths = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    while ((m = pathRegex.exec(line)) !== null) {
      const p = m[2];

      // Heuristic: look back ~12 lines for key and permission
      const windowStart = Math.max(0, i - 12);
      const window = lines.slice(windowStart, i + 1).join('\n');
      const keyMatch = window.match(/\bkey\s*:\s*(['"])(.*?)\1/);
      const keyHint = keyMatch ? keyMatch[2] : null;
      const permissionPresent = /\bpermission\s*:\s*/.test(window);

      menuPaths.push({ path: p, keyHint, permissionPresent });
    }
  }

  const uniqueMenuPaths = Array.from(new Set(menuPaths.map((x) => x.path))).sort();

  const pageFiles = [];
  walkFiles(pagesRoot, pageFiles);

  const pageEntries = [];
  for (const f of pageFiles) {
    const r = routeFromPageFile(f);
    if (!r) continue;
    pageEntries.push({ route: r, file: toPosix(path.relative(repoRoot, f)) });
  }

  const pageRouteSet = new Set(pageEntries.map((x) => x.route));

  const missingPagesForMenu = [];
  for (const p of uniqueMenuPaths) {
    const candidates = expectedCandidatesForMenuPath(p);
    const exists = candidates.some((c) => fs.existsSync(c));
    if (!exists) {
      const any = menuPaths.find((x) => x.path === p);
      missingPagesForMenu.push({
        path: p,
        keyHint: any?.keyHint || null,
        permissionPresent: !!any?.permissionPresent,
        candidates: candidates.map((c) => toPosix(path.relative(repoRoot, c))),
      });
    }
  }

  const orphanPages = pageEntries.filter((p) => !uniqueMenuPaths.includes(p.route));

  const menuPathsMissingPermission = uniqueMenuPaths
    .map((p) => {
      const any = menuPaths.find((x) => x.path === p);
      return { path: p, keyHint: any?.keyHint || null, permissionPresent: !!any?.permissionPresent };
    })
    .filter((x) => !x.permissionPresent);

  const result = {
    generatedAt: new Date().toISOString(),
    stats: {
      menuPaths: uniqueMenuPaths.length,
      pageRoutes: pageRouteSet.size,
      missingPagesForMenu: missingPagesForMenu.length,
      orphanPages: orphanPages.length,
      menuPathsMissingPermission: menuPathsMissingPermission.length,
    },
    missingPagesForMenu,
    menuPathsMissingPermission,
    orphanPages,
  };

  if (!fs.existsSync(auditsDir)) fs.mkdirSync(auditsDir, { recursive: true });

  const jsonPath = path.join(auditsDir, 'menu-route-audit.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

  const mdPath = path.join(auditsDir, 'menu-route-audit.md');
  const md = [];
  md.push('# Menu Route Audit (JS)');
  md.push('');
  md.push(`Generated: ${result.generatedAt}`);
  md.push('');
  md.push('## Stats');
  md.push(`- Menu paths: ${result.stats.menuPaths}`);
  md.push(`- Page routes: ${result.stats.pageRoutes}`);
  md.push(`- Missing pages for menu: ${result.stats.missingPagesForMenu}`);
  md.push(`- Orphan pages (not in menu): ${result.stats.orphanPages}`);
  md.push(`- Menu paths missing permission (heuristic): ${result.stats.menuPathsMissingPermission}`);
  md.push('');
  md.push('## Missing Pages For Menu Routes');
  if (missingPagesForMenu.length === 0) {
    md.push('- None');
  } else {
    for (const m of missingPagesForMenu) {
      md.push(`- ${m.path} (keyHint=${m.keyHint || 'UNKNOWN'}, permissionPresent=${m.permissionPresent})`);
      md.push(`  - candidates: ${m.candidates.join(', ')}`);
    }
  }
  md.push('');
  md.push('## Menu Paths Missing Permission (Heuristic)');
  if (menuPathsMissingPermission.length === 0) {
    md.push('- None');
  } else {
    for (const m of menuPathsMissingPermission) {
      md.push(`- ${m.path} (keyHint=${m.keyHint || 'UNKNOWN'})`);
    }
  }
  md.push('');
  md.push('## Orphan Pages (Not Referenced By Menu)');
  if (orphanPages.length === 0) {
    md.push('- None');
  } else {
    for (const o of orphanPages.slice(0, 250)) {
      md.push(`- ${o.route} (${o.file})`);
    }
    if (orphanPages.length > 250) md.push(`... truncated (${orphanPages.length - 250} more)`);
  }
  md.push('');

  fs.writeFileSync(mdPath, md.join('\n'), 'utf-8');

  console.log(`Wrote: ${toPosix(path.relative(repoRoot, jsonPath))}`);
  console.log(`Wrote: ${toPosix(path.relative(repoRoot, mdPath))}`);
  console.log(`Missing pages for menu: ${result.stats.missingPagesForMenu}`);
}

main();
