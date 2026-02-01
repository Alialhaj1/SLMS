/**
 * 🔎 ROUTE AUDITOR - Menu paths vs Next.js pages
 * =====================================================
 * Checks:
 * - Every `MENU_REGISTRY` item with `path` has a corresponding file under `pages/`
 * - Pages that are not referenced by the menu (orphans)
 * - Menu items with `path` but missing `permission` (warning)
 *
 * Run:
 *   npx ts-node scripts/audit-routes.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { globSync } from 'glob';

type MenuItemConfig = {
  key: string;
  labelKey: string;
  icon: string;
  permission?: string;
  path?: string;
  children?: MenuItemConfig[];
};

type MenuRoute = {
  key: string;
  labelKey: string;
  path: string;
  permission?: string;
};

type AuditResult = {
  generatedAt: string;
  stats: {
    menuPaths: number;
    pageRoutes: number;
    missingPagesForMenu: number;
    orphanPages: number;
    menuPathsMissingPermission: number;
  };
  missingPagesForMenu: Array<MenuRoute & { expectedCandidates: string[] }>;
  orphanPages: Array<{ route: string; file: string }>;
  menuPathsMissingPermission: MenuRoute[];
};

const repoRoot = path.resolve(__dirname, '..');
const pagesRoot = path.join(repoRoot, 'pages');
const outDir = path.join(repoRoot, 'audits');

function toPosix(p: string) {
  return p.replace(/\\/g, '/');
}

function collectMenuRoutes(items: MenuItemConfig[]): MenuRoute[] {
  const routes: MenuRoute[] = [];

  const walk = (nodes: MenuItemConfig[]) => {
    for (const item of nodes) {
      if (item.path) {
        routes.push({
          key: item.key,
          labelKey: item.labelKey,
          path: item.path,
          permission: item.permission,
        });
      }
      if (item.children?.length) walk(item.children);
    }
  };

  walk(items);
  return routes;
}

function routeFromPageFile(absFile: string): string | null {
  const rel = path.relative(pagesRoot, absFile);
  const relPosix = toPosix(rel);

  if (relPosix.startsWith('api/')) return null;
  if (relPosix.startsWith('_')) return null;

  const noExt = relPosix.replace(/\.(tsx|ts|jsx|js)$/i, '');

  // e.g. index -> /
  if (noExt === 'index') return '/';

  // e.g. dashboard/index -> /dashboard
  if (noExt.endsWith('/index')) return '/' + noExt.slice(0, -'/index'.length);

  return '/' + noExt;
}

function existsAny(candidates: string[]) {
  return candidates.some((p) => fs.existsSync(p));
}

function expectedPageCandidatesForMenuPath(menuPath: string): string[] {
  const normalized = menuPath.replace(/\/$/, '') || '/';

  if (normalized === '/') {
    return [path.join(pagesRoot, 'index.tsx'), path.join(pagesRoot, 'index.ts')];
  }

  const withoutLeading = normalized.replace(/^\//, '');

  return [
    path.join(pagesRoot, `${withoutLeading}.tsx`),
    path.join(pagesRoot, `${withoutLeading}.ts`),
    path.join(pagesRoot, withoutLeading, 'index.tsx'),
    path.join(pagesRoot, withoutLeading, 'index.ts'),
  ];
}

async function main() {
  // Use require() to avoid TS/ESM resolution issues on Windows.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MENU_REGISTRY } = require('../config/menu.registry') as { MENU_REGISTRY: MenuItemConfig[] };
  const menuRoutes = collectMenuRoutes(MENU_REGISTRY);
  const menuPaths = Array.from(new Set(menuRoutes.map((r) => r.path))).sort();

  const pageFiles = globSync(path.join(pagesRoot, '**/*.{ts,tsx,js,jsx}'), {
    windowsPathsNoEscape: true,
    nodir: true,
  });

  const pageRouteEntries: Array<{ route: string; file: string }> = [];
  for (const file of pageFiles) {
    const route = routeFromPageFile(file);
    if (!route) continue;
    pageRouteEntries.push({ route, file: path.relative(repoRoot, file) });
  }

  const pageRoutesSet = new Set(pageRouteEntries.map((x) => x.route));

  const missingPagesForMenu: Array<MenuRoute & { expectedCandidates: string[] }> = [];
  for (const r of menuRoutes) {
    const candidates = expectedPageCandidatesForMenuPath(r.path);
    if (!existsAny(candidates)) {
      missingPagesForMenu.push({
        ...r,
        expectedCandidates: candidates.map((c) => path.relative(repoRoot, c)),
      });
    }
  }

  const orphanPages: Array<{ route: string; file: string }> = [];
  for (const entry of pageRouteEntries) {
    if (!menuPaths.includes(entry.route)) {
      orphanPages.push(entry);
    }
  }

  const menuPathsMissingPermission = menuRoutes.filter(
    (r) => !!r.path && !r.permission
  );

  const result: AuditResult = {
    generatedAt: new Date().toISOString(),
    stats: {
      menuPaths: menuPaths.length,
      pageRoutes: pageRoutesSet.size,
      missingPagesForMenu: missingPagesForMenu.length,
      orphanPages: orphanPages.length,
      menuPathsMissingPermission: menuPathsMissingPermission.length,
    },
    missingPagesForMenu,
    orphanPages: orphanPages.sort((a, b) => a.route.localeCompare(b.route)),
    menuPathsMissingPermission,
  };

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'menu-route-audit.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

  const mdPath = path.join(outDir, 'menu-route-audit.md');
  const md = [
    `# Menu Route Audit`,
    ``,
    `Generated: ${result.generatedAt}`,
    ``,
    `## Stats`,
    `- Menu paths: ${result.stats.menuPaths}`,
    `- Page routes: ${result.stats.pageRoutes}`,
    `- Missing pages for menu: ${result.stats.missingPagesForMenu}`,
    `- Orphan pages (not in menu): ${result.stats.orphanPages}`,
    `- Menu paths missing permission: ${result.stats.menuPathsMissingPermission}`,
    ``,
    `## Missing Pages For Menu Routes`,
    ...(result.missingPagesForMenu.length
      ? result.missingPagesForMenu.map(
          (m) =>
            `- ${m.path} (key=${m.key}, labelKey=${m.labelKey}, permission=${m.permission || 'NONE'})\n  - candidates: ${m.expectedCandidates.join(', ')}`
        )
      : ['- None']),
    ``,
    `## Menu Paths Missing Permission`,
    ...(result.menuPathsMissingPermission.length
      ? result.menuPathsMissingPermission.map(
          (m) => `- ${m.path} (key=${m.key}, labelKey=${m.labelKey})`
        )
      : ['- None']),
    ``,
    `## Orphan Pages (Not Referenced By Menu)`,
    ...(result.orphanPages.length
      ? result.orphanPages.slice(0, 250).map((o) => `- ${o.route} (${o.file})`)
      : ['- None']),
    ...(result.orphanPages.length > 250
      ? [``, `... truncated (${result.orphanPages.length - 250} more)`]
      : []),
    ``,
  ].join('\n');

  fs.writeFileSync(mdPath, md, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Wrote: ${path.relative(repoRoot, jsonPath)}`);
  // eslint-disable-next-line no-console
  console.log(`Wrote: ${path.relative(repoRoot, mdPath)}`);
  // eslint-disable-next-line no-console
  console.log(`Missing pages for menu: ${result.stats.missingPagesForMenu}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
