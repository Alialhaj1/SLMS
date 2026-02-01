/**
 * 🧩 Missing Pages Generator
 * =====================================================
 * Creates minimal placeholder Next.js pages for menu routes that don't have a matching file under `pages/`.
 *
 * Rules:
 * - Never overwrites existing files.
 * - Prefers `pages/<route>/index.tsx` if a directory already exists for that route (to avoid file/dir conflicts).
 * - Otherwise creates `pages/<route>.tsx`.
 *
 * Run:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/create-missing-pages.ts
 */

import * as fs from 'fs';
import * as path from 'path';

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

const repoRoot = path.resolve(__dirname, '..');
const pagesRoot = path.join(repoRoot, 'pages');

function collectMenuRoutes(items: MenuItemConfig[]): MenuRoute[] {
  const routes: MenuRoute[] = [];
  const walk = (nodes: MenuItemConfig[]) => {
    for (const item of nodes) {
      if (item.path && typeof item.path === 'string') {
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

function normalizeMenuPath(p: string): string | null {
  const trimmed = String(p ?? '').trim();
  if (!trimmed) return null;
  if (trimmed === '#') return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return null;

  // remove query/hash
  const noQuery = trimmed.split('?')[0].split('#')[0];
  if (!noQuery.startsWith('/')) return null;

  const normalized = noQuery.replace(/\/+$/, '') || '/';
  return normalized;
}

function expectedCandidatesFor(menuPath: string): string[] {
  if (menuPath === '/') {
    return [
      path.join(pagesRoot, 'index.tsx'),
      path.join(pagesRoot, 'index.ts'),
      path.join(pagesRoot, 'index.jsx'),
      path.join(pagesRoot, 'index.js'),
    ];
  }

  const withoutLeading = menuPath.replace(/^\//, '');

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

function existsAny(files: string[]) {
  return files.some((f) => fs.existsSync(f));
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function computeRelativeImportPrefix(fromAbsFile: string) {
  const relFromPages = path.relative(pagesRoot, path.dirname(fromAbsFile));
  const segments = relFromPages ? relFromPages.split(path.sep).filter(Boolean) : [];
  return segments.length === 0 ? '.' : segments.map(() => '..').join('/');
}

function pageTemplate(opts: {
  title: string;
  routePath: string;
  labelKey: string;
  menuKey: string;
  permission?: string;
  importPrefix: string;
}) {
  const { title, routePath, labelKey, menuKey, permission, importPrefix } = opts;
  const permissionLiteral = permission ? JSON.stringify(permission) : 'null';

  return `import Head from 'next/head';
import MainLayout from '${importPrefix}/components/layout/MainLayout';
import { usePermissions } from '${importPrefix}/hooks/usePermissions';
import { useTranslation } from '${importPrefix}/hooks/useTranslation';

export default function GeneratedPage() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  const requiredPermission: string | null = ${permissionLiteral};

  if (requiredPermission && !hasPermission(requiredPermission as any)) {
    return (
      <MainLayout>
        <Head>
          <title>{t('common.accessDenied') || 'Access denied'} - SLMS</title>
        </Head>
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('common.accessDenied') || 'Access denied'}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('common.noPermission') || 'You do not have permission to view this page.'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>${JSON.stringify(title)} - SLMS</title>
      </Head>
      <div className="p-6">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">${title}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('common.comingSoon') || 'This page is under construction.'}
          </p>

          <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div><span className="font-medium">Route:</span> ${routePath}</div>
              <div><span className="font-medium">Menu key:</span> ${menuKey}</div>
              <div><span className="font-medium">Label key:</span> ${labelKey}</div>
              ${permission ? `<div><span className="font-medium">Permission:</span> ${permission}</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
`;
}

function pickTargetFile(menuPath: string): { absFile: string; kind: 'file' | 'dir-index' } {
  if (menuPath === '/') {
    return { absFile: path.join(pagesRoot, 'index.tsx'), kind: 'file' };
  }

  const withoutLeading = menuPath.replace(/^\//, '');
  const dirCandidate = path.join(pagesRoot, withoutLeading);

  // If a directory exists for that route (due to nested routes), use index.tsx.
  if (fs.existsSync(dirCandidate) && fs.statSync(dirCandidate).isDirectory()) {
    return { absFile: path.join(dirCandidate, 'index.tsx'), kind: 'dir-index' };
  }

  return { absFile: path.join(pagesRoot, `${withoutLeading}.tsx`), kind: 'file' };
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../config/menu.registry') as { MENU_REGISTRY: MenuItemConfig[] };
  const menuRoutesRaw = collectMenuRoutes(mod.MENU_REGISTRY);

  const menuRoutes: MenuRoute[] = menuRoutesRaw
    .map((r) => ({ ...r, path: normalizeMenuPath(r.path) }))
    .filter((r): r is MenuRoute => typeof r.path === 'string' && !!r.path);

  const uniqueByPath = new Map<string, MenuRoute>();
  for (const r of menuRoutes) {
    if (!uniqueByPath.has(r.path)) uniqueByPath.set(r.path, r);
  }

  const routes = Array.from(uniqueByPath.values()).sort((a, b) => a.path.localeCompare(b.path));

  const missing: Array<MenuRoute & { candidates: string[] }> = [];
  for (const r of routes) {
    const candidates = expectedCandidatesFor(r.path);
    if (!existsAny(candidates)) {
      missing.push({ ...r, candidates });
    }
  }

  if (missing.length === 0) {
    // eslint-disable-next-line no-console
    console.log('✅ No missing pages found for MENU_REGISTRY routes.');
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`Found ${missing.length} missing pages. Creating placeholders...`);

  let created = 0;
  for (const m of missing) {
    const target = pickTargetFile(m.path);

    if (fs.existsSync(target.absFile)) {
      continue;
    }

    ensureDir(path.dirname(target.absFile));

    const importPrefix = computeRelativeImportPrefix(target.absFile);

    const title = m.labelKey?.startsWith('menu.') ? m.labelKey.replace(/^menu\./, '').replace(/\./g, ' / ') : m.labelKey;

    const content = pageTemplate({
      title,
      routePath: m.path,
      labelKey: m.labelKey,
      menuKey: m.key,
      permission: m.permission,
      importPrefix,
    });

    fs.writeFileSync(target.absFile, content, 'utf-8');
    created++;

    // eslint-disable-next-line no-console
    console.log(`+ ${path.relative(repoRoot, target.absFile)} (${target.kind})`);
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${created} placeholder pages.`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
