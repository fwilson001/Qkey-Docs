/**
 * ==========================================================================
 * QkeyBackupEngine – build-docs-container.mjs
 *
 * @fileOverview
 *   Aggregates markdown sources under ./content into a single Qkey
 *   documentation container (docs.qdoc) implementing v1.0 of the
 *   Qkey Documentation Format. Replaces legacy JSON manifest build.
 *
 * @author
 *   GitHub Copilot – system
 *
 * @maintainer
 *   Backup Systems Team (Qkey/BackupEngine Submodule)
 *
 * @usage
 *   node web/public/docs/tools/build-docs-container.mjs
 *
 * @dependencies
 *   Node.js built-ins only (fs, path, crypto)
 *
 * @notes
 *   - Front-matter: flat YAML (key: value) at file start between --- lines.
 *   - README|index.md denote a book root; remaining .md files become pages.
 *   - All pages placed in a single chapter "introduction" per book for now.
 *   - Headings extracted (h1-h3) and slugified for quick in-page nav.
 *   - @index tokens are lower-cased unique words (punctuation stripped).
 *   - @dochashes use first 8 chars of SHA256 of raw markdown body (post front-matter strip).
 *   - Derived implementation: logic structure mirrors earlier public converter concepts
 *     concepts (parseDocContainer/stringifyDocContainer data model) but is
 *     intentionally self-contained to avoid bundling the full multi-format
 *     converter; keep this note so future refactors can unify if desired.
 *
 * @license
 *   QueryKey™ is a trademark of Farrel Wilson. All rights reserved.
 * ==========================================================================
 */
/**
 * Architecture Overview
 * ---------------------
 * Source markdown lives under ./content/<book-slug>/.
 * A "book" folder MUST contain a README.md or index.md acting as the book root.
 * Additional .md files inside that folder (non-recursive at present) become pages.
 * Pages may declare optional front‑matter keys:
 *   title:        Custom page title
 *   order:        Numeric ordering (ascending) relative to siblings (default 999)
 *   chapter:      Logical chapter grouping name (default "Overview")
 *   chapterOrder: Order for the chapter grouping (default 1) – alias chapter_order
 *   author:       Page author (falls back to book author)
 *
 * The builder produces a single container file (docs.qdoc) composed of 4 blocks:
 *   @metadata  : top‑level generation metadata
 *   @docs      : hierarchical content (books -> chapters -> pages)
 *   @index     : lightweight search index (per page tokens + summary)
 *   @dochashes : short content hashes for change detection / integrity
 *
 * Auto Pages / Augmentations:
 *   - If a book lacks an Introduction page one is auto‑inserted (order 0) into
 *     the first ordered chapter.
 *   - If a book lacks an Author page one is auto‑inserted (order 9999).
 *   - A chapter overview page ("<Chapter> Overview") is auto‑generated if not
 *     present. (Order 1 to appear immediately after Introduction.)
 *
 * Design Goals:
 *   - Deterministic output (stable ordering when metadata equal)
 *   - Minimal external dependencies (Node built‑ins only)
 *   - Human‑readable container (facilitates diff reviews in VCS)
 *   - Easy to extend: add fields -> update serializeContainer + runtime parser
 *
 * Future Extension Ideas:
 *   - Recursive subchapter support
 *   - Asset (images) embedding block (@assets) with hash addressing
 *   - Incremental regeneration (hash compare vs last build)
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Derive docs root relative to script location so invocation cwd does not matter.
const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..'); // ../ (docs directory)
const CONTENT_ROOT = join(ROOT, 'content');
const OUT_FILE = join(ROOT, 'docs.qdoc');
const DEFAULT_AUTHOR = 'Qkey Docs Team';

async function main(){
  const tree = await walk(CONTENT_ROOT);
  // Preflight: warn about code fences without language tags
  try { runPreflightFenceWarnings(tree); } catch {}
  const books = buildBooks(tree);
  const container = buildContainer(books);
  const serialized = serializeContainer(container);
  await writeFile(OUT_FILE, serialized, 'utf8');
  process.stdout.write(`Docs container generated: ${relative(process.cwd(), OUT_FILE)}\n`);
}

/* ---------------- File System Walk ---------------- */
async function walk(dir){
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for(const ent of entries){
    if(ent.name.startsWith('.')) continue;
    const full = join(dir, ent.name);
    if(ent.isDirectory()){
      out.push({ type:'dir', name: ent.name, path: full, children: await walk(full) });
    } else if(ent.isFile() && ent.name.endsWith('.md')) {
      const relPath = relative(CONTENT_ROOT, full).split(sep).join('/');
      const raw = await readFile(full,'utf8');
      const { frontMatter, body } = extractFrontMatter(raw);
      const st = await stat(full);
      out.push({ type:'file', name: ent.name, relPath, frontMatter, body, updatedAt: new Date(st.mtimeMs).toISOString() });
    }
  }
  return out;
}

/* ---------------- Preflight Checks ---------------- */
function runPreflightFenceWarnings(nodes){
  const files=[];
  (function dfs(n){
    for(const child of n){
      if(child.type==='file') files.push(child);
      if(child.type==='dir') dfs(child.children||[]);
    }
  })(nodes||[]);
  const warnings=[];
  for(const f of files){
    const { count, samples } = findFencesMissingLanguage(f.body||'');
    if(count>0){ warnings.push({ file:f.relPath, count, samples }); }
  }
  if(warnings.length){
    const total = warnings.reduce((a,w)=>a+w.count,0);
    process.stdout.write(`Preflight: ${total} code fence(s) without language tag across ${warnings.length} file(s).\n`);
    warnings.slice(0,25).forEach(w=>{
      const sampleTxt = w.samples.slice(0,3).map(s=>`line ${s.line}${s.suggest?` (suggest: ${s.suggest})`:''}`).join(', ');
      process.stdout.write(` - ${w.file}: ${w.count} fence(s) missing tag${sampleTxt?` [${sampleTxt}]`:''}\n`);
    });
    process.stdout.write(`Tip: Use fenced blocks with language tags, e.g., \`\`\`json, \`\`\`sh, \`\`\`js, \`\`\`yaml, \`\`\`http.\n`);
  }
}

function findFencesMissingLanguage(body){
  const lines = String(body||'').split(/\n/);
  let count=0; const samples=[];
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    const m = line.match(/^```\s*([^`\s]+)?\s*$/);
    if(m){
      const lang = (m[1]||'').trim().toLowerCase();
      if(!lang || lang==='text'){
        count++;
        const snippet = (lines[i+1]||'') + '\n' + (lines[i+2]||'');
        const suggest = guessLangFromSnippet(snippet);
        samples.push({ line:i+1, suggest });
      }
      // advance to closing fence to avoid nested counts
      let j=i+1; while(j<lines.length && !/^```\s*$/.test(lines[j])) j++; i=j; // i continues from j in for-loop
    }
  }
  return { count, samples };
}

function guessLangFromSnippet(snippet){
  const s = (snippet||'').trim();
  const head = s.slice(0,200).toLowerCase();
  if((head.startsWith('{')||head.startsWith('['))){
    try{ JSON.parse(s); return 'json'; } catch{}
    if(/:\s*"|\{|\[/.test(head)) return 'json';
  }
  if(/^\$?\s*(curl|wget|export|sudo|npm|pnpm|yarn|brew|apt|apk)\b/m.test(head)) return 'sh';
  if(/^[a-z0-9_\-]+:\s/m.test(head) && !/[;{}]/.test(head)) return 'yaml';
  if(/^(import|export)\s|require\(|=>|const\s|let\s|function\s/m.test(head)) return 'js';
  if(/^(get|post|put|patch|delete)\s+\//i.test(head)) return 'http';
  return '';
}

/* ---------------- Book & Page Assembly ---------------- */
function buildBooks(nodes){
  const books = [];
  for(const n of nodes){
    if(n.type === 'dir'){
      // Skip folders that look like OS/UI duplicate copies (e.g. "products copy")
      if(/\bcopy\b/i.test(n.name)) {
        continue;
      }
      const readme = n.children.find(c => c.type==='file' && /^(README|index)\.md$/i.test(c.name));
      if(readme){
        const slug = relative(CONTENT_ROOT, n.path).split(sep).join('/');
        const book = {
          slug,
          title: readme.frontMatter.title || humanize(n.name),
          order: numOr(readme.frontMatter.order, 999),
          group: readme.frontMatter.group || inferGroup(slug),
          file: readme.relPath,
          readmeBody: readme.body, // preserve root README body for book landing
          updatedAt: readme.updatedAt,
          author: readme.frontMatter.author || DEFAULT_AUTHOR,
          pages: collectPages(n)
        };
        books.push(book);
      }
      books.push(...buildBooks(n.children));
    }
  }
  // Deduplicate books that share the same title (keep the one whose slug does not contain ' copy')
  const byTitle = new Map();
  for(const b of books){
    const existing = byTitle.get(b.title);
    if(!existing){ byTitle.set(b.title, b); continue; }
    const existingIsCopy = /\bcopy\b/i.test(existing.slug);
    const currentIsCopy = /\bcopy\b/i.test(b.slug);
    if(existingIsCopy && !currentIsCopy){
      byTitle.set(b.title, b);
    }
  }
  return Array.from(byTitle.values()).sort(sortByOrderThenTitle);
}

function collectPages(dirNode){
  // NEW: recurse into nested subdirectories so pages under api/endpoints/, api/schemas/ etc are included.
  const pages = [];
  function dfs(currentDir){
    for(const child of currentDir.children){
      if(child.type==='file' && !/^(README|index)\.md$/i.test(child.name)){
        const base = child.name.replace(/\.md$/, '');
        // Slug derived from relative path (without .md)
        const slug = child.relPath.replace(/\.md$/,''); // e.g. api/endpoints/cases
        const subPathParts = slug.split('/').slice(1); // drop book root segment for chapter inference
        // Chapter inference: use explicit front-matter if provided; else first subdirectory name humanized; fallback 'Overview'
        let inferredChapter = child.frontMatter.chapter || (subPathParts.length>1 ? humanize(subPathParts[0]) : 'Overview');
        const chapterOrder = numOr(child.frontMatter.chapterOrder || child.frontMatter.chapter_order, (inferredChapter==='Overview'?1:2));
        pages.push({
          slug,
          title: child.frontMatter.title || humanize(base),
          order: numOr(child.frontMatter.order, 999),
          chapter: inferredChapter,
          chapterOrder,
          file: child.relPath,
          body: child.body,
          updatedAt: child.updatedAt,
          author: child.frontMatter.author || DEFAULT_AUTHOR
        });
      } else if(child.type==='dir') {
        dfs(child);
      }
    }
  }
  dfs(dirNode);
  return pages.sort(sortByOrderThenTitle);
}

/* ---------------- Container Construction ---------------- */
function buildContainer(books){
  const metadata = {
    format: 'QkeyDocFormat',
    version: '1.0',
    generatedAt: new Date().toISOString()
  };
  const docs = { books: {} };
  const index = { pages: {} };
  const dochashes = {};
  for(const book of books){
    const bookObj = docs.books[book.slug] = {
      title: book.title,
      order: book.order,
      chapters: {},
      body: book.readmeBody ? book.readmeBody.trim() : undefined,
      updatedAt: book.updatedAt,
      author: book.author
    };
      // Group pages by chapter
      const chapterGroups = new Map();
      for(const p of book.pages){
        const chapName = (p.chapter || 'Overview').trim();
        const chapKey = slugify(chapName).replace(/[^a-z0-9-]/g,'') || 'overview';
        if(!chapterGroups.has(chapKey)){
          // Default chapter order now 1 so chapters without explicit ordering appear at the top
          chapterGroups.set(chapKey,{ title: chapName, order: p.chapterOrder || 1, pages: [] });
        }
        chapterGroups.get(chapKey).pages.push(p);
      }
      // Ensure at least one chapter exists
      if(!chapterGroups.size){
        chapterGroups.set('overview',{ title:'Overview', order:1, pages:[] });
      }
      // Create chapter objects
      const orderedChapters = Array.from(chapterGroups.entries()).map(([k,v])=>({key:k, ...v})).sort((a,b)=> a.order===b.order ? a.title.localeCompare(b.title): a.order-b.order);
      for(const ch of orderedChapters){
        const chapter = bookObj.chapters[ch.key] = { title: ch.title, order: ch.order, pages: {} };
        const orderedPages = ch.pages.slice().sort(sortByOrderThenTitle);
        for(const p of orderedPages){
          const headings = extractHeadings(p.body);
          const body = buildPageBody(p.body);
          const relPageKey = p.slug.split('/').pop();
          chapter.pages[relPageKey] = {
            title: p.title,
            order: p.order,
            headings,
            body,
            updatedAt: p.updatedAt,
            author: p.author
          };
          const tokens = tokenize(body);
          const summary = summarize(body);
          index.pages[prefixSlug(book.slug, ch.key, relPageKey)] = { tokens: tokens.join(' '), summary };
          dochashes[prefixSlug(book.slug, ch.key, relPageKey)] = sha256Short(body);
        }
        // Auto chapter overview page (skip if already exists). Only add if chapter contains > 1 actual page to avoid redundancy.
        const realPageCount = Object.keys(chapter.pages).filter(k=> k !== 'overview').length;
        if(!chapter.pages['overview'] && realPageCount > 1){
          const listItems = Object.entries(chapter.pages)
            .filter(([k])=> k !== 'overview')
            .sort((a,b)=> (a[1].order===b[1].order? a[1].title.localeCompare(b[1].title): a[1].order-b[1].order))
            .map(([k,v])=> `- [${v.title}](#/${book.slug}/${ch.key}/${k})`).join('\n');
          const safeTitle = ch.title.replace(/\s+Overview$/i,'');
          const overviewBody = `# ${safeTitle} Overview\n\nPages:\n\n${listItems}`.trim();
          chapter.pages['overview'] = {
            title: `${safeTitle} Overview`,
            order: 1, // After introduction (0) if present
            headings: ['overview'],
            body: overviewBody,
            updatedAt: book.updatedAt,
            author: book.author
          };
          const tokens = tokenize(overviewBody);
          const summary = summarize(overviewBody);
          index.pages[prefixSlug(book.slug, ch.key, 'overview')] = { tokens: tokens.join(' '), summary };
          dochashes[prefixSlug(book.slug, ch.key, 'overview')] = sha256Short(overviewBody);
        }
      }
      // Decide which chapter to place auto pages (use first ordered chapter)
      const primaryChapterKey = orderedChapters.length ? orderedChapters[0].key : 'overview';
      const primaryChapter = bookObj.chapters[primaryChapterKey];
      // Auto Introduction page if missing globally AND the book README has no meaningful body
      const hasIntro = Object.values(bookObj.chapters).some(ch=> ch.pages['introduction']);
      const hasMeaningfulReadme = !!(book.readmeBody && book.readmeBody.trim());
      if(!hasIntro && !hasMeaningfulReadme){
        const introBody = `# Introduction\n\nWelcome to the **${book.title}** documentation. This introductory page was auto-generated. Replace this content with an overview for the book.`;
        primaryChapter.pages['introduction'] = {
          title: 'Introduction',
          // Force order 0 so it always stays first even if user supplies order:1 pages
          order: 0,
          headings: ['introduction'],
          body: introBody,
          updatedAt: book.updatedAt,
          author: book.author
        };
        const tokens = tokenize(introBody);
        const summary = summarize(introBody);
        index.pages[prefixSlug(book.slug, primaryChapterKey, 'introduction')] = { tokens: tokens.join(' '), summary };
        dochashes[prefixSlug(book.slug, primaryChapterKey, 'introduction')] = sha256Short(introBody);
      }
      // Auto Author page if missing globally
      const hasAuthor = Object.values(bookObj.chapters).some(ch=> ch.pages['author']);
      if(!hasAuthor){
        const authorBody = `# Author\n\n**Author:** ${book.author}\n\n**Book Updated:** ${book.updatedAt?.split('T')[0] || ''}`.trim();
        primaryChapter.pages['author'] = {
          title: 'Author',
          order: 9999,
          headings: ['author'],
          body: authorBody,
          updatedAt: book.updatedAt,
          author: book.author
        };
        const tokens = tokenize(authorBody);
        const summary = summarize(authorBody);
        index.pages[prefixSlug(book.slug, primaryChapterKey, 'author')] = { tokens: tokens.join(' '), summary };
        dochashes[prefixSlug(book.slug, primaryChapterKey, 'author')] = sha256Short(authorBody);
      }
  }
  return { metadata, docs, index, dochashes };
}

const prefixSlug = (book, chapter, page)=> `${book}/${chapter}/${page}`;

/* ---------------- Parsing Helpers ---------------- */
function extractFrontMatter(txt){
  if(txt.startsWith('---')){
    const end = txt.indexOf('\n---',3);
    if(end !== -1){
      const raw = txt.slice(3, end).trim();
      const body = txt.slice(end+4).replace(/^\n+/,'');
      return { frontMatter: parseYAML(raw), body };
    }
  }
  return { frontMatter:{}, body: txt };
}
function parseYAML(src){
  const out={};
  src.split(/\n/).forEach(line=>{ const m=line.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/); if(m) out[m[1]]=m[2].replace(/^"(.+)"$/,'$1'); });
  return out;
}
function extractHeadings(md){
  const heads=[]; md.split(/\n/).forEach(line=>{ const m=line.match(/^(#{1,3})\s+(.*)$/); if(m){ heads.push(slugify(m[2].trim())); } }); return heads;
}
function buildPageBody(md){ return md.trim(); }
function tokenize(body){
  const plain = body.replace(/```[\s\S]*?```/g,' ') // remove code fences
                    .replace(/[#>*_`\[\]()|:]/g,' ') // punctuation
                    .toLowerCase();
  const tokens = plain.split(/\s+/).filter(Boolean);
  const uniq=[...new Set(tokens.filter(t=>t.length>1))];
  return uniq.slice(0, 60); // cap tokens per page for size
}
function summarize(body){
  const stripped = body.replace(/```[\s\S]*?```/g,' ').replace(/\s+/g,' ').trim();
  return stripped.slice(0, 140) + (stripped.length>140 ? '…':'');
}
function sha256Short(data){ return createHash('sha256').update(data,'utf8').digest('hex').slice(0,8); }

/* ---------------- Serialization ---------------- */
function serializeContainer(c){
  const lines=[];
  lines.push('@metadata {');
  for(const [k,v] of Object.entries(c.metadata)) lines.push(`  ${k}: "${escapeQuotes(v)}"`);
  lines.push('}\n');
  lines.push('@docs {');
  lines.push('  books: {');
  for(const [bookKey, bookVal] of Object.entries(c.docs.books)){
    lines.push(`    ${bookKey}: {`);
    lines.push(`      title: "${escapeQuotes(bookVal.title)}"`);
    lines.push(`      order: ${bookVal.order}`);
  if(bookVal.author) lines.push(`      author: "${escapeQuotes(bookVal.author)}"`);
  if(bookVal.updatedAt) lines.push(`      updatedAt: "${escapeQuotes(bookVal.updatedAt)}"`);
    if(bookVal.body){
      lines.push('      body: <<DOC');
      lines.push(bookVal.body);
      lines.push('DOC');
    }
    lines.push('      chapters: {');
    for(const [chapKey, chapVal] of Object.entries(bookVal.chapters)){
      lines.push(`        ${chapKey}: {`);
      lines.push(`          title: "${escapeQuotes(chapVal.title)}"`);
      lines.push(`          order: ${chapVal.order}`);
      lines.push('          pages: {');
      for(const [pageKey, pageVal] of Object.entries(chapVal.pages)){
        lines.push(`            ${pageKey}: {`);
        lines.push(`              title: "${escapeQuotes(pageVal.title)}"`);
        lines.push(`              order: ${pageVal.order}`);
  if(pageVal.author) lines.push(`              author: "${escapeQuotes(pageVal.author)}"`);
  if(pageVal.updatedAt) lines.push(`              updatedAt: "${escapeQuotes(pageVal.updatedAt)}"`);
        if(pageVal.headings?.length) lines.push(`              headings: [${pageVal.headings.map(h=>`"${escapeQuotes(h)}"`).join(',')}]`);
        lines.push('              body: <<DOC');
        lines.push(pageVal.body); // raw body
        lines.push('DOC');
        lines.push('            }');
      }
      lines.push('          }'); // pages
      lines.push('        }'); // chapter
    }
    lines.push('      }'); // chapters
    lines.push('    }'); // book
  }
  lines.push('  }'); // books
  lines.push('}\n');
  lines.push('@index {');
  lines.push('  pages: {');
  for(const [slug, meta] of Object.entries(c.index.pages)){
    lines.push(`    "${slug}": {`);
    lines.push(`      tokens: "${escapeQuotes(meta.tokens)}"`);
    lines.push(`      summary: "${escapeQuotes(meta.summary)}"`);
    lines.push('    }');
  }
  lines.push('  }');
  lines.push('}\n');
  lines.push('@dochashes {');
  for(const [slug, hash] of Object.entries(c.dochashes)){
    lines.push(`  "${slug}": "${hash}"`);
  }
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

/* ---------------- Utilities ---------------- */
function slugify(str){ return str.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-'); }
function escapeQuotes(v){ return String(v).replace(/"/g,'\\"'); }
function humanize(s){ return s.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
function inferGroup(slug){
  if(slug.startsWith('products/')) return 'Products';
  if(slug.startsWith('shared/')) return 'Shared';
  if(slug.startsWith('architecture/')) return 'Architecture';
  if(slug.startsWith('servers/')) return 'Servers';
  if(slug.startsWith('changelogs/')) return 'Changelogs';
  return 'General';
}
const numOr = (v,d)=>{ const n=Number(v); return Number.isFinite(n)? n : d; };
const sortByOrderThenTitle=(a,b)=> a.order===b.order ? a.title.localeCompare(b.title) : a.order - b.order;

await main().catch(err=>{ process.stderr.write(`Build failed: ${err.message}\n`); process.exitCode=1; });
