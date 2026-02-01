import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

type ComingSoonEntry = {
  route: string;
  file: string;
  title: string | null;
  titleAr: string | null;
};

function toRoute(pagesDir: string, filePath: string): string {
  const rel = path.relative(pagesDir, filePath).replace(/\\/g, '/');
  const noExt = rel.replace(/\.tsx$/, '');
  const normalized = noExt.endsWith('/index') ? noExt.slice(0, -'/index'.length) : noExt;
  return '/' + normalized;
}

function extractProp(source: string, propName: string): string | null {
  // Covers: title="..." and title='...'
  const re = new RegExp(`${propName}\\s*=\\s*["']([^"']+)["']`);
  const match = source.match(re);
  return match?.[1] ?? null;
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const pagesDir = path.join(projectRoot, 'pages');
  const auditsDir = path.join(projectRoot, 'audits');

  const files = globSync('**/*.tsx', {
    cwd: pagesDir,
    absolute: true,
    ignore: ['**/api/**', '**/_app.tsx', '**/_document.tsx', '**/_error.tsx'],
  });

  const entries: ComingSoonEntry[] = [];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, 'utf8');
    if (!source.includes('ComingSoonPage')) continue;
    if (!source.includes('<ComingSoonPage')) continue;

    const route = toRoute(pagesDir, filePath);
    const title = extractProp(source, 'title');
    const titleAr = extractProp(source, 'titleAr');

    entries.push({
      route,
      file: path.relative(projectRoot, filePath).replace(/\\/g, '/'),
      title,
      titleAr,
    });
  }

  entries.sort((a, b) => a.route.localeCompare(b.route));

  if (!fs.existsSync(auditsDir)) fs.mkdirSync(auditsDir, { recursive: true });

  const jsonPath = path.join(auditsDir, 'coming-soon-pages.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ total: entries.length, entries }, null, 2), 'utf8');

  const mdLines: string[] = [];
  mdLines.push('# Coming Soon Pages Audit');
  mdLines.push('');
  mdLines.push(`Total: ${entries.length}`);
  mdLines.push('');
  mdLines.push('| Route | Title prop | File |');
  mdLines.push('| --- | --- | --- |');
  for (const e of entries) {
    const titleDisplay = (e.title ?? '').replace(/\|/g, '\\|');
    mdLines.push(`| ${e.route} | ${titleDisplay} | ${e.file} |`);
  }

  const mdPath = path.join(auditsDir, 'coming-soon-pages.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');

  // Console summary
  console.log(`ComingSoon pages: ${entries.length}`);
  console.log(`Wrote: ${path.relative(projectRoot, jsonPath).replace(/\\/g, '/')}`);
  console.log(`Wrote: ${path.relative(projectRoot, mdPath).replace(/\\/g, '/')}`);
}

main();
