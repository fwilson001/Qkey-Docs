/**
 * ==========================================================================
 * QkeyBackupEngine – build-docs-manifest.mjs
 *
 * @fileOverview
 *   Scans ./content for markdown files, composes hierarchical manifest of
 *   books (directories with README.md|index.md) and pages (other .md files),
 *   writes ./docs-manifest.json used by runtime loader.
 *
 * @author
 *   GitHub Copilot – system
 *
 * @maintainer
 *   Backup Systems Team (Qkey/BackupEngine Submodule)
 *
 * @usage
 *   node public/docs/tools/build-docs-manifest.mjs
 *
 * @dependencies
 *   Node.js built-ins only.
 *
 * @notes
 *   - Flat YAML front-matter (key: value) supported; no nested.
 *   - group/order/title taken from front-matter else inferred.
 *
 * @license
 *   QueryKey™ is a trademark of Farrel Wilson. All rights reserved.
 * ==========================================================================
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, relative, sep } from 'node:path';

const ROOT = resolve(process.cwd(), 'web', 'public', 'docs');
const CONTENT = join(ROOT, 'content');
const OUT = join(ROOT, 'docs-manifest.json');

async function main() {
  const tree = await walk(CONTENT);
  const books = buildBooks(tree);
  const manifest = { generatedAt: new Date().toISOString(), docs: books.sort(sortByOrder) };
  await writeFile(OUT, JSON.stringify(manifest, null, 2), 'utf8');
  process.stdout.write(`Manifest generated: ${relative(process.cwd(), OUT)}\n`);
}

async function walk(dir) {
  const entries = await readdir(dir);
  const acc = [];
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = await stat(full);
    if (st.isDirectory()) {
      acc.push({ type: 'dir', name, path: full, children: await walk(full) });
    } else if (st.isFile() && name.endsWith('.md')) {
      const relPath = relative(CONTENT, full).split(sep).join('/');
      const raw = await readFile(full, 'utf8');
      const { frontMatter } = extractFrontMatter(raw);
      acc.push({ type: 'file', name, relPath, frontMatter });
    }
  }
  return acc;
}

function buildBooks(tree) {
  const books = [];
  for (const n of tree) {
    if (n.type === 'dir') {
      const indexFile = n.children.find(c => c.type === 'file' && /^(README|index)\.md$/i.test(c.name));
      if (indexFile) {
        const slug = relative(CONTENT, n.path).split(sep).join('/');
        const book = {
          slug,
          title: indexFile.frontMatter.title || humanize(n.name),
          type: 'book',
          order: numberOr(indexFile.frontMatter.order, 999),
          group: indexFile.frontMatter.group || inferGroup(slug),
          file: indexFile.relPath,
          children: collectPages(n)
        };
        books.push(book);
      }
      books.push(...buildBooks(n.children));
    }
  }
  return books;
}

function collectPages(dirNode) {
  const pages = [];
  for (const c of dirNode.children) {
    if (c.type === 'file' && !/^(README|index)\.md$/i.test(c.name)) {
      const base = c.name.replace(/\.md$/, '');
      const parentSlug = relative(CONTENT, dirNode.path).split(sep).join('/');
      pages.push({
        slug: `${parentSlug}/${base}`,
        title: c.frontMatter.title || humanize(base),
        type: 'page',
        order: numberOr(c.frontMatter.order, 999),
        file: c.relPath
      });
    }
  }
  return pages.sort(sortByOrder);
}

function extractFrontMatter(txt) {
  if (txt.startsWith('---')) {
    const end = txt.indexOf('\n---', 3);
    if (end !== -1) {
      const raw = txt.slice(3, end).trim();
      return { frontMatter: parseYAML(raw), body: txt.slice(end + 4) };
    }
  }
  return { frontMatter: {}, body: txt };
}

function parseYAML(src) {
  const out = {};
  src.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"(.+)"$/, '$1');
  });
  return out;
}

function inferGroup(slug) {
  if (slug.startsWith('products/')) return 'Products';
  if (slug.startsWith('shared/')) return 'Shared';
  if (slug.startsWith('architecture/')) return 'Architecture';
  if (slug.startsWith('servers/')) return 'Servers';
  if (slug.startsWith('changelogs/')) return 'Changelogs';
  return 'General';
}

const numberOr = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const humanize = s => s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const sortByOrder = (a,b) => (a.order||999) - (b.order||999);

await main();
