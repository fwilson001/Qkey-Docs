// Topic feedback/rating stubs
window.topicRate = function(id, rating) {
  alert(`Thank you for rating topic '${id}' with ${rating} stars!`);
};
window.topicComment = function(id) {
  const comment = prompt(`Leave feedback for topic '${id}':`);
  if(comment) alert(`Thank you for your feedback on topic '${id}':\n${comment}`);
};
/**
 * ==========================================================================
 * QkeyBackupEngine – qkey-docs.mjs
 *
 * @fileOverview
 *   Dynamic documentation runtime: loads manifest, renders markdown pages,
 *   builds navigation (books + pages), table-of-contents, search (token-based),
 *   breadcrumbs, in-page highlighting. No external network calls.
 *
 * @author
 *   GitHub Copilot – system
 *
 * @maintainer
 *   Backup Systems Team (Qkey/BackupEngine Submodule)
 *
 * @usage
 *   <script type="module" src="./assets/js/qkey-docs.mjs"></script>
 *
 *  - buildContinuousBookHTML: extend export styling or inject TOC
 *
 * Accessibility:
 *  - aria-label on major regions (header, main, sidebar, article, breadcrumbs)
 *  - Keyboard navigation via arrow / page keys (prev/next page)
 *  - Focus styling inherits from theme token definitions
 */

// Note: QKeyConverter (container parser) not present in this build; operating in JSON/legacy mode only.
// If a compiled docs.qdoc container + converter are added later, detection logic below will switch automatically.

// NOTE: These URLs are resolved relative to the page (/docs/), not the script.
// docs.qdoc, docs-manifest.json, and versions.json live next to index.html in /docs/.
const DOCS_CONTAINER_URL = './docs.qdoc'; // aggregated container (preferred if present)
const DEFAULT_MANIFEST_URL = './docs-manifest.json';
let MANIFEST_URL = DEFAULT_MANIFEST_URL; // fallback JSON manifest (legacy)
const VERSIONS_INDEX_URL = './versions.json'; // optional file listing versions
const CONTENT_ROOT = './content';
const HASH_PREFIX = '#/';
// In production, prefer the prebuilt container; disable client auto-build to prevent partial books
const AUTO_BUILD_ON_LOAD = false; // auto-rebuild docs container from source markdown each load
// LocalStorage keys
const LS_KEY_COLLAPSE = 'qkey-docs-chapters-collapsed';
const LS_KEY_LAST_PAGE = 'qkey-docs-last-page';
const LS_KEY_RATINGS = 'qkey-docs-ratings-qkey'; // Using QKey format
const LS_KEY_CHAPTERS_SECTION = 'qkey-docs-chapters-section-collapsed';

let manifest = null;          // { docs: [] } or derived from docs container
let docsContainer = null;     // parsed docs.qdoc (if available)
let slugMap = new Map();      // slug -> node meta
let indexBuilt = false;
let indexing = false;
let searchCache = [];         // { slug, title, body, tokens }
let searchCacheVersionKey = ''; // builds from MANIFEST_URL
let dropdownEl = null;        // search suggestions dropdown element
let activeResultIndex = -1;   // keyboard selection index

const articleEl = document.getElementById('qk-article');
const contentEl = document.getElementById('doc-content');
const tocNav = document.getElementById('toc-nav');
const breadcrumbsEl = document.getElementById('breadcrumbs');
const searchForm = document.getElementById('doc-search-form');
const searchInput = document.getElementById('doc-search-input');
const searchMeta = document.getElementById('search-meta');

/* ---------------- Manifest Loading & Indexing ---------------- */
async function loadManifest() {
  if (manifest) return manifest;
  if (AUTO_BUILD_ON_LOAD) {
    await attemptClientSideRebuild();
  }
  // 1. Attempt docs container only if file exists (HEAD probe) and parser utilities are present
  try {
    const head = await fetch(DOCS_CONTAINER_URL, { method: 'HEAD', cache: 'no-store' });
    if (head.ok) {
      const cRes = await fetch(DOCS_CONTAINER_URL, { cache: 'no-store' });
      if (cRes.ok) {
        const text = await cRes.text();
        docsContainer = parseDocsContainer(text);
        if (docsContainer && docsContainer.docs) {
          manifest = { generatedAt: docsContainer.metadata?.generatedAt || new Date().toISOString(), docs: normalizeDocsTreeFromContainer(docsContainer.docs) };
          flattenManifest(manifest.docs);
          console.info('[docs] Using container format');
          return manifest;
        } else {
          console.info('[docs] Container present but parse failed; falling back to JSON manifest');
        }
      }
    }
  } catch (e) { console.info('[docs] Container probe failed:', e.message); }
  // 2. Legacy JSON manifest
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (res.ok) {
      manifest = await res.json();
      flattenManifest(manifest.docs);
      console.info('[docs] Using JSON manifest');
      return manifest;
    }
  } catch (e) { console.warn('[docs] JSON manifest fetch failed, attempting dynamic crawl:', e.message); }
  // 3. Dynamic crawl fallback
  manifest = { generatedAt: new Date().toISOString(), docs: await buildDynamicManifest() };
  flattenManifest(manifest.docs);
  console.info('[docs] Using dynamic crawl fallback');
  return manifest;
}
/** Attempt client-side rebuild (development mode only) */

/* ---------------- Client-Side Rebuild (Development Convenience) ---------------- */
async function attemptClientSideRebuild(){
  try {
    showLoader('Building documentation…');
    // Fetch directory listings starting from content root heuristically
    const allFiles = await crawlContentForMarkdown('');
    if(!allFiles.length){ hideLoader(); return; }
    const { containerText } = await buildContainerInBrowser(allFiles);
    // Provide fresh container to parser without persisting file
    docsContainer = parseDocsContainer(containerText);
    hideLoader();
  } catch(err){ console.warn('[Docs] Auto build failed:', err); hideLoader(); }
}

async function crawlContentForMarkdown(prefix){
  // Strategy: attempt to fetch directory indexes by assuming static server exposes listings. If not, fall back silently.
  const results=[];
  const base = `${CONTENT_ROOT}/${prefix}`.replace(/\/$/,'');
  const url = base + '/';
  let html='';
  try { const res=await fetch(url,{cache:'no-store'}); if(!res.ok) return results; html=await res.text(); } catch { return results; }
  const links = extractLinksFromListing(html);
  for(const l of links){
    if(l.endsWith('/')){ const sub = (prefix? prefix + '/' : '') + l.slice(0,-1); const subRes = await crawlContentForMarkdown(sub); results.push(...subRes); }
    else if(/\.md$/i.test(l)){ results.push({ rel: (prefix? prefix + '/' : '') + l }); }
  }
  return results;
}

async function buildContainerInBrowser(fileMeta){
  // Minimal clone of build script behavior (books -> chapters(introduction) -> pages)
  const byDir = new Map();
  for(const f of fileMeta){
    const dir = f.rel.split('/').slice(0,-1).join('/');
    if(!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(f.rel.split('/').pop());
  }
  const books=[];
  for(const [dir, files] of byDir.entries()){
    const readme = files.find(n=>/^(readme|index)\.md$/i.test(n));
    if(!readme) continue;
    const slug = dir;
    const readmeRaw = await safeFetchText(`${CONTENT_ROOT}/${dir}/${readme}`);
    const { frontMatter: rmFM, body: rmBody } = extractFrontMatter(readmeRaw||'');
    const book = { slug, title: rmFM.title || humanize(slug.split('/').pop()||'Documentation'), order: Number(rmFM.order)||999, readmeBody: rmBody, updatedAt: new Date().toISOString(), author: rmFM.author || '' , pages:[] };
    for(const f of files){
      if(f===readme) continue;
      const pageRaw = await safeFetchText(`${CONTENT_ROOT}/${dir}/${f}`);
      const { frontMatter: pfm, body: pBody } = extractFrontMatter(pageRaw||'');
      const base = f.replace(/\.md$/,'');
      book.pages.push({ slug: `${slug}/${base}`, title: pfm.title || humanize(base), order: Number(pfm.order)||999, body: pBody, updatedAt: new Date().toISOString(), author: pfm.author||'' });
    }
    books.push(book);
  }
  books.sort((a,b)=> a.order===b.order ? a.title.localeCompare(b.title): a.order-b.order);
  // Build container text (simplified) matching existing parser expectation
  let text='@metadata {\n  format: "QkeyDocFormat"\n  version: "1.0"\n  generatedAt: "'+ new Date().toISOString() +'"\n}\n\n@docs {\n  books: {\n';
  for(const b of books){
    text += `    ${b.slug}: {\n      title: "${escapeQuotes(b.title)}"\n      order: ${b.order}\n      author: "${escapeQuotes(b.author)}"\n      updatedAt: "${escapeQuotes(b.updatedAt)}"\n      body: <<DOC\n${b.readmeBody.trim()}\nDOC\n      chapters: {\n        introduction: {\n          title: "Introduction"\n          order: 1\n          pages: {\n`;
    // Pages
    const pages = b.pages.slice().sort((a,b)=> a.order===b.order ? a.title.localeCompare(b.title): a.order-b.order);
    for(const p of pages){
      const pb = p.body.trim();
      text += `            ${p.slug.split('/').pop()}: {\n              title: "${escapeQuotes(p.title)}"\n              order: ${p.order}\n              author: "${escapeQuotes(p.author)}"\n              updatedAt: "${escapeQuotes(p.updatedAt)}"\n              body: <<DOC\n${pb}\nDOC\n            }\n`;
    }
    // Auto intro + author
    text += `            introduction: {\n              title: "Introduction"\n              order: 1\n              author: "${escapeQuotes(b.author)}"\n              updatedAt: "${escapeQuotes(b.updatedAt)}"\n              body: <<DOC\n# Introduction\n\nWelcome to the **${escapeQuotes(b.title)}** documentation. This introductory page was auto-generated (client).\nDOC\n            }\n            author: {\n              title: "Author"\n              order: 9999\n              author: "${escapeQuotes(b.author)}"\n              updatedAt: "${escapeQuotes(b.updatedAt)}"\n              body: <<DOC\n# Author\n\n**Author:** ${escapeQuotes(b.author)}\n\n**Book Updated:** ${b.updatedAt.split('T')[0]}\nDOC\n            }\n          }\n        }\n      }\n    }\n`;
  }
  text += '  }\n}\n\n@index {\n  pages: { }\n}\n\n@dochashes { }\n';
  return { containerText: text };
}

function showLoader(msg){
  let el=document.getElementById('docs-loader');
  if(!el){
    el=document.createElement('div');
    el.id='docs-loader';
    el.innerHTML=`<div class="docs-loader-inner"><div class="spinner"></div><div class="loader-msg"></div></div>`;
    document.body.appendChild(el);
  }
  el.querySelector('.loader-msg').textContent = msg || 'Loading…';
  el.hidden=false;
}
function hideLoader(){ const el=document.getElementById('docs-loader'); if(el) el.hidden=true; }

/* ---------------- Dynamic Manifest (Directory Crawl Fallback) ---------------- */
async function buildDynamicManifest(){
  const books=[];
  const visited=new Set();
  async function crawl(dirPath){
    if(visited.has(dirPath)) return; visited.add(dirPath);
    const listingUrl = `${CONTENT_ROOT}/${dirPath}`.replace(/\/$/,'') + '/';
    let html;
    try {
      const res = await fetch(listingUrl,{cache:'no-store'});
      if(!res.ok) return; // directory may not exist
      html = await res.text();
    } catch { return; }
    const links = extractLinksFromListing(html);
    const mdFiles = links.filter(l=>l.toLowerCase().endsWith('.md'));
    const subdirs = links.filter(l=>/\/$/.test(l));
    const readme = mdFiles.find(f=>/^(readme|index)\.md$/i.test(f));
    if(readme){
      const readmePath = (dirPath ? dirPath + '/' : '') + readme;
      const raw = await safeFetchText(`${CONTENT_ROOT}/${readmePath}`);
      const { frontMatter } = extractFrontMatter(raw||'');
      const slug = dirPath.replace(/\/$/,'');
      const title = frontMatter.title || humanize(slug.split('/').pop() || 'Documentation');
      const group = frontMatter.group || inferGroupFromSlug(slug);
      const order = numberOr(frontMatter.order, 999);
      const children=[];
      for(const f of mdFiles){
        if(f===readme) continue;
        const filePath = (dirPath ? dirPath + '/' : '') + f;
        const rawP = await safeFetchText(`${CONTENT_ROOT}/${filePath}`);
        const { frontMatter: pfm } = extractFrontMatter(rawP||'');
        const base = f.replace(/\.md$/,'');
        children.push({
          slug: (slug? slug + '/' : '') + base,
          title: pfm.title || humanize(base),
          type: 'page',
            order: numberOr(pfm.order, 999),
          file: filePath
        });
      }
      children.sort(sortByOrderThenTitle);
      books.push({ slug, title, type:'book', order, group, file: readmePath, children });
    }
    // Recurse into subdirectories
    await Promise.all(subdirs.map(sd=> crawl((dirPath ? dirPath + '/' : '') + sd.replace(/\/$/,''))));
  }
  await crawl('');
  books.sort(sortByOrderThenTitle);
  return books;
}

function extractLinksFromListing(html){
  // Very lightweight parser for simple auto-generated directory indexes
  const out=[]; const re=/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi; let m;
  while((m=re.exec(html))){
    const href=m[1];
    if(href === '../') continue;
    if(/^[?#]/.test(href)) continue;
    out.push(decodeURIComponent(href.replace(/\/?$/,(x)=>x))); // keep trailing / for dirs
  }
  return out;
}

async function safeFetchText(url){
  try { const r=await fetch(url,{cache:'no-store'}); if(!r.ok) return ''; return await r.text(); } catch { return ''; }
}

function inferGroupFromSlug(slug){
  if(slug.startsWith('products/')) return 'Products';
  if(slug.startsWith('shared/')) return 'Shared';
  if(slug.startsWith('architecture/')) return 'Architecture';
  if(slug.startsWith('servers/')) return 'Servers';
  if(slug.startsWith('changelogs/')) return 'Changelogs';
  return 'General';
}

const numberOr = (v,d)=>{ const n=Number(v); return Number.isFinite(n)? n : d; };
const humanize = s=> s.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const sortByOrderThenTitle = (a,b)=> a.order===b.order ? a.title.localeCompare(b.title) : a.order - b.order;

function flattenManifest(nodes, trail = []) {
  nodes.forEach(n => {
    slugMap.set(n.slug, { ...n, trail: [...trail, n] });
    if (n.children?.length) flattenManifest(n.children, [...trail, n]);
  });
}

/* ---------------- Navigation (Sidebar Equivalent via Books) ---------------- */
function buildBookNav() {
  const tocContainer = document.querySelector('.toc');
  if(!tocContainer || !manifest) return;
  let nav = document.getElementById('book-nav');
  if(!nav){
    nav = document.createElement('nav');
    nav.id = 'book-nav';
    nav.className = 'book-nav';
    nav.setAttribute('aria-label','Chapters and pages');
    // Insert at the top of the toc so Books/Chapters appear before Topics
    tocContainer.insertBefore(nav, tocContainer.firstChild || null);
  }
  const current = currentSlug();
  if(!current || !slugMap.size) return;
  const meta = slugMap.get(current);
  if(!meta) return;
  // Determine book root
  const bookNode = meta.type === 'book' ? meta : (meta.trail ? meta.trail.find(n=>n.type==='book') : null);
  if(!bookNode) return;
  // If docsContainer unavailable, render a simple flat list of that book's pages as fallback
  if(!docsContainer){
    nav.innerHTML='';
    const list = document.createElement('ul');
    list.className = 'book-nav-fallback';
    (bookNode.children||[]).forEach(p=>{
      const li=document.createElement('li');
      li.className='book-nav-item';
      const a=document.createElement('a');
      a.href = HASH_PREFIX + encodeURIComponent(p.slug);
      a.textContent = p.title;
      if(p.slug===current) a.classList.add('active');
      li.appendChild(a);
      list.appendChild(li);
    });
    nav.appendChild(list);
    return;
  }
  const bookObj = docsContainer.docs?.books?.[bookNode.slug];
  if(!bookObj) return;
  nav.innerHTML='';
  // Books dropdown
  const currentBookSlug = bookNode.slug;
  const booksWrap = document.createElement('div');
  booksWrap.className = 'books-select-wrap';
  booksWrap.innerHTML = `
    <label class="books-select-label" for="books-select">Books</label>
    <select id="books-select" class="books-select" aria-label="Select documentation book"></select>`;
  nav.appendChild(booksWrap);
  const selectEl = booksWrap.querySelector('#books-select');
  if(selectEl){
    const allBooks = Object.entries(docsContainer.docs.books||{}).map(([k,v])=>({slug:k, title:v.title||humanize(k), order:Number(v.order)||999}));
    allBooks.sort((a,b)=> a.order===b.order ? a.title.localeCompare(b.title): a.order-b.order);
    selectEl.innerHTML = '';
    allBooks.forEach(b=>{
      const opt=document.createElement('option');
      opt.value=b.slug;
      const full = (b.title||'').trim();
      const max = 36;
      const truncated = full.length > max ? (full.slice(0, max-1) + '…') : full;
      opt.textContent = truncated || b.slug;
      if (full) opt.title = full;
      selectEl.appendChild(opt);
    });
    selectEl.value = currentBookSlug;
    if(!selectEl.dataset.bound){
      selectEl.addEventListener('change',()=>{
        const targetBook = selectEl.value;
        if(!targetBook || targetBook === currentBookSlug) return;
        let last = '';
        try { const data = JSON.parse(localStorage.getItem(LS_KEY_LAST_PAGE)||'{}'); last = data[targetBook] || ''; } catch {}
        if(last){ location.hash = HASH_PREFIX + encodeURIComponent(last); }
        else { location.hash = HASH_PREFIX + encodeURIComponent(targetBook); }
      });
      selectEl.dataset.bound='1';
    }
  }
  // Chapters section header + container
  const chaptersToggleWrap = document.createElement('div');
  chaptersToggleWrap.className = 'chapters-toggle-wrap';
  // Default collapsed when no prior state
  let chaptersCollapsed=true; try {
    const v = localStorage.getItem(LS_KEY_CHAPTERS_SECTION);
    if(v === '0') chaptersCollapsed = false;
    else if(v === '1') chaptersCollapsed = true;
  } catch {}
  chaptersToggleWrap.innerHTML = `<button type="button" class="chapters-section-toggle" aria-expanded="${!chaptersCollapsed}" aria-controls="chapters-section"><span class="chapters-toggle-icon" aria-hidden="true"><svg class="chev" viewBox="0 0 20 20" width="12" height="12" aria-hidden="true" focusable="false"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span> <span class="chapters-toggle-text">Chapters</span></button>`;
  nav.appendChild(chaptersToggleWrap);
  const chaptersSection = document.createElement('div');
  chaptersSection.className='chapters-section';
  chaptersSection.id='chapters-section';
  if(chaptersCollapsed) chaptersSection.hidden = true;
  nav.appendChild(chaptersSection);
  // Chapters tools: filter removed; bulk expand/collapse removed per spec
  const chaptersToggleBtn = chaptersToggleWrap.querySelector('.chapters-section-toggle');
  if(chaptersToggleBtn && !chaptersToggleBtn.dataset.bound){
    chaptersToggleBtn.addEventListener('click',()=>{
      const nowExpanded = chaptersToggleBtn.getAttribute('aria-expanded')==='true';
      chaptersToggleBtn.setAttribute('aria-expanded', String(!nowExpanded));
      chaptersSection.hidden = nowExpanded;
      try { localStorage.setItem(LS_KEY_CHAPTERS_SECTION, nowExpanded ? '1':'0'); } catch {}
    });
    chaptersToggleBtn.dataset.bound='1';
  }
  const chapters = Object.entries(bookObj.chapters||{}).map(([k,v])=>({key:k, title:v.title||k, order:Number(v.order)||999, pages:v.pages||{}})).sort((a,b)=> a.order===b.order ? a.title.localeCompare(b.title) : a.order - b.order);
  // Load collapse state
  let collapsedState = {};
  try { collapsedState = JSON.parse(localStorage.getItem(LS_KEY_COLLAPSE)||'{}'); } catch { collapsedState={}; }
  // Determine current chapter key from slug (bookKey/chapterKey/pageKey)
  const slugParts = current.split('/');
  const currentChapterKey = slugParts.length >= 3 ? slugParts[1] : null;
  const userHasState = Object.keys(collapsedState).some(k => k.startsWith(bookNode.slug + '::'));
  chapters.forEach(ch=>{
    const chId = `chap-${bookNode.slug.replace(/[^a-z0-9]/gi,'_')}-${ch.key}`;
    const wrapper = document.createElement('div');
    wrapper.className='book-chapter-group';
    // Header (toggle)
    const header = document.createElement('button');
    header.type='button';
    header.className='chapter-toggle';
    header.setAttribute('data-target', chId);
    // If user has no prior state, collapse all except the chapter of the current page
    let collapsed = false;
    if(userHasState){
      collapsed = !!collapsedState[`${bookNode.slug}::${ch.key}`];
    } else {
      collapsed = true; // default all chapters closed when no prior state
    }
    header.setAttribute('aria-expanded', String(!collapsed));
    header.dataset.chapterKey = ch.key;
    header.innerHTML = `<span class="chapter-toggle-icon" aria-hidden="true"><svg class="chev" viewBox="0 0 20 20" width="12" height="12" aria-hidden="true" focusable="false"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="chapter-toggle-text" title="${escapeHTML(ch.title)}">${escapeHTML(ch.title)}</span><span class="chapter-badge">${Object.keys(ch.pages).length}</span>`;
    wrapper.appendChild(header);
    // Page list
    const ul = document.createElement('ul');
    ul.id = chId;
    ul.className='book-nav-list';
  if(collapsed) ul.hidden = true;
    const orderedPages = Object.entries(ch.pages)
      .map(([k,v])=>({key:k, title:(v.title||k), order:Number(v.order)||999}))
      .sort((a,b)=> a.order===b.order ? a.title.localeCompare(b.title): a.order-b.order)
      .map(p=>{
        // De-duplicate repetitive names like "Overview Overview"
        const parts = p.title.trim().split(/\s+/);
        if(parts.length>=2 && parts[0].toLowerCase()===parts[1].toLowerCase()){
          p.title = parts.slice(1).join(' ');
        }
        return p;
      });
    orderedPages.forEach(p=>{
      const fullSlug = `${bookNode.slug}/${ch.key}/${p.key}`;
      const li = document.createElement('li');
      li.className='book-nav-item';
      const a = document.createElement('a');
      a.href = HASH_PREFIX + encodeURIComponent(fullSlug);
      a.textContent = p.title;
      if(fullSlug === current) a.classList.add('active');
      li.appendChild(a);
      ul.appendChild(li);
    });
    wrapper.appendChild(ul);
    chaptersSection.appendChild(wrapper);
  });
  // Toggle logic
  if(!chaptersSection.dataset.bound){
    chaptersSection.addEventListener('click', e=>{
      const link = e.target.closest('.book-nav-item a');
      if(link){
        // Prevent this click from bubbling into any other handlers that might toggle
        if(e.stopPropagation) e.stopPropagation();
        // When navigating to a page, ensure its chapter remains open
        const li = link.closest('.book-chapter-group');
        const header = li?.querySelector('.chapter-toggle');
        const target = header ? document.getElementById(header.getAttribute('data-target')) : null;
        if(header && target){
          header.setAttribute('aria-expanded','true');
          target.hidden = false;
          // persist expanded state for this chapter
          let state={};
          try { state = JSON.parse(localStorage.getItem(LS_KEY_COLLAPSE)||'{}'); } catch { state={}; }
          const bookChapterKey = `${bookNode.slug}::${header.dataset.chapterKey || ''}`;
          delete state[bookChapterKey];
          try { localStorage.setItem(LS_KEY_COLLAPSE, JSON.stringify(state)); } catch {}
        }
        return; // don't let this click bubble to toggle handler
      }
      const btn = e.target.closest('.chapter-toggle');
      if(!btn) return;
      const target = document.getElementById(btn.getAttribute('data-target'));
      if(!target) return;
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      target.hidden = expanded;
      // persist collapse state
      let state={};
      try { state = JSON.parse(localStorage.getItem(LS_KEY_COLLAPSE)||'{}'); } catch { state={}; }
      const bookChapterKey = `${bookNode.slug}::${btn.dataset.chapterKey || ''}`;
      if(expanded) state[bookChapterKey]=true; else delete state[bookChapterKey];
      try { localStorage.setItem(LS_KEY_COLLAPSE, JSON.stringify(state)); } catch {}
    });
    chaptersSection.dataset.bound='1';
  }
  // Ensure current chapter is expanded on initial render so it doesn't unexpectedly collapse on navigation
  if(currentChapterKey){
    const curHeader = chaptersSection.querySelector(`.chapter-toggle[data-chapter-key="${CSS.escape(currentChapterKey)}"]`);
    const curList = curHeader ? document.getElementById(curHeader.getAttribute('data-target')) : null;
    if(curHeader && curList){
      curHeader.setAttribute('aria-expanded','true');
      curList.hidden = false;
      // Persist expanded state by ensuring this chapter is not marked as collapsed
      let state={};
      try { state = JSON.parse(localStorage.getItem(LS_KEY_COLLAPSE)||'{}'); } catch { state={}; }
      const bookChapterKey = `${bookNode.slug}::${currentChapterKey}`;
      delete state[bookChapterKey];
      try { localStorage.setItem(LS_KEY_COLLAPSE, JSON.stringify(state)); } catch {}
    }
  }
  // Filter behavior removed; badges show total count only. No bulk expand/collapse controls.
}

/* ---------------- Hash / Route Handling ---------------- */
function currentSlug() {
  return location.hash.startsWith(HASH_PREFIX) ? decodeURIComponent(location.hash.slice(2)) : '';
}

function getHashParam(name){
  if(!location.hash.startsWith(HASH_PREFIX)) return '';
  const raw = location.hash.slice(HASH_PREFIX.length);
  const q = raw.indexOf('?');
  if(q === -1) return '';
  const qs = raw.slice(q+1);
  const parts = qs.split('&');
  for(const p of parts){
    const [k,v] = p.split('=');
    if(decodeURIComponent(k||'') === name) return decodeURIComponent(v||'');
  }
  return '';
}

function copyTopicLink(id){
  try {
    const slug = currentSlug();
    const url = `${location.origin}${location.pathname}${location.search}#/${encodeURIComponent(slug)}?h=${encodeURIComponent(id)}`;
    navigator.clipboard.writeText(url);
  } catch {}
  return false;
}

async function handleRoute() {
  await loadManifest();
  let slug = currentSlug();
  if (!slug || !slugMap.has(slug)) {
    // fallback to first manifest entry
    const first = manifest.docs[0];
    if (first) {
      slug = first.slug;
      history.replaceState(null, '', HASH_PREFIX + encodeURIComponent(slug));
    }
  }
  // If slug points to a book root, auto-redirect to its first page (Introduction or first ordered page)
  if (slug && slugMap.has(slug)) {
    const node = slugMap.get(slug);
    if (node.type === 'book' && docsContainer) {
      const bookKey = node.slug;
      const bookObj = docsContainer?.docs?.books?.[bookKey];
      if (bookObj) {
        const chapters = Object.entries(bookObj.chapters||{}).map(([k,v])=>({k,v, o:Number(v.order)||999})).sort((a,b)=> a.o===b.o ? a.k.localeCompare(b.k): a.o-b.o);
        let targetPageSlug='';
        for (const ch of chapters) {
          const pages = Object.entries(ch.v.pages||{}).map(([k,v])=>({k,v, o:Number(v.order)||999, t:v.title||k})).sort((a,b)=> a.o===b.o ? a.t.localeCompare(b.t): a.o-b.o);
          // Prefer overview chapter introduction page if named introduction
          const intro = pages.find(p=> p.k === 'introduction');
          if (intro) { targetPageSlug = `${bookKey}/${ch.k}/${intro.k}`; break; }
          if (pages.length) { targetPageSlug = `${bookKey}/${ch.k}/${pages[0].k}`; break; }
        }
        if (targetPageSlug) {
          slug = targetPageSlug;
          history.replaceState(null,'', HASH_PREFIX + encodeURIComponent(slug));
        }
      }
    }
  }
  if (!slug) {
    contentEl.innerHTML = '<h1>Documentation</h1><p>No content available.</p>';
    return;
  }
  await renderSlug(slug);
  buildBookNav();
}

/* ---------------- Markdown Fetch & Render ---------------- */
async function renderSlug(slug) {
  let node = slugMap.get(slug);
  if (!node) {
    // Graceful fallback: redirect to first available page
    try {
      await loadManifest();
      // Prefer container-based first page if available
      let target = '';
      if (docsContainer?.docs?.books) {
        const books = Object.entries(docsContainer.docs.books).map(([k, v]) => ({ k, o: Number(v.order) || 999, v }))
          .sort((a, b) => (a.o === b.o ? a.k.localeCompare(b.k) : a.o - b.o));
        for (const b of books) {
          const chapters = Object.entries(b.v.chapters || {}).map(([k, v]) => ({ k, o: Number(v.order) || 999, v }))
            .sort((a, b) => (a.o === b.o ? a.k.localeCompare(b.k) : a.o - b.o));
          for (const ch of chapters) {
            const pages = Object.entries(ch.v.pages || {}).map(([k, v]) => ({ k, o: Number(v.order) || 999, t: v.title || k }))
              .sort((a, b) => (a.o === b.o ? a.t.localeCompare(b.t) : a.o - b.o));
            const intro = pages.find(p => p.k === 'introduction');
            const pick = intro || pages[0];
            if (pick) { target = `${b.k}/${ch.k}/${pick.k}`; break; }
          }
          if (target) break;
        }
      }
      if (!target && Array.isArray(manifest?.docs) && manifest.docs.length) {
        const first = manifest.docs[0];
        if (Array.isArray(first.children) && first.children.length) target = first.children[0].slug;
        else target = first.slug;
      }
      if (target) {
        history.replaceState(null, '', HASH_PREFIX + encodeURIComponent(target));
        return handleRoute();
      }
    } catch {/* ignore and show message below */}
    contentEl.innerHTML = '<h1>Not Found</h1><p>Page does not exist.</p>';
    return;
  }
  let body = '';
  let pageTitle = node.title;
  let metaLineHTML = '';
  if (docsContainer) {
    // Resolve body from docsContainer structure (node.containerPath stores path array)
    const pageObj = resolveContainerPage(docsContainer.docs, node.containerPath || []);
    if (pageObj && typeof pageObj.body === 'string') body = pageObj.body; else body = 'Missing body.';
    metaLineHTML = buildContainerMetaLine(node);
  } else {
    // Legacy per-file fetch
    const fileUrl = `${CONTENT_ROOT}/${node.file}`;
    const res = await fetch(fileUrl, { cache: 'no-store' });
    if (!res.ok) {
      contentEl.innerHTML = '<h1>Error</h1><p>Failed to load document.</p>';
      return;
    }
    const raw = await res.text();
    const fm = extractFrontMatter(raw); body = fm.body; if (fm.frontMatter.title) pageTitle = fm.frontMatter.title;
    metaLineHTML = buildLegacyMetaLine(node);
  }
  const html = renderMarkdown(body);
  breadcrumbsEl.innerHTML = buildBreadcrumbs(node.trail);
  contentEl.innerHTML = `${metaLineHTML}${html}`;

  injectPageFooter(node, body);
  activateMetaChips();
  injectPageCounter(node);
  document.title = `${pageTitle} – Qkey Documentation`;
  // Append rating to bottom
  const ratingWrap = document.createElement('div');
  ratingWrap.className = 'page-rating';
  ratingWrap.setAttribute('data-slug', slug);
  ratingWrap.setAttribute('aria-label', 'Rate this page');
  ratingWrap.innerHTML = `
    <span class='page-rating-label'>Rate this page:</span>
    <button class='page-rate' data-rating='1' aria-label='1 star' aria-pressed='false'>★</button>
    <button class='page-rate' data-rating='2' aria-label='2 stars' aria-pressed='false'>★</button>
    <button class='page-rate' data-rating='3' aria-label='3 stars' aria-pressed='false'>★</button>
    <button class='page-rate' data-rating='4' aria-label='4 stars' aria-pressed='false'>★</button>
    <button class='page-rate' data-rating='5' aria-label='5 stars' aria-pressed='false'>★</button>
    <span class='page-rating-value' aria-live='polite'>0/5</span>`;
  const ratingFeedback = document.createElement('div');
  ratingFeedback.id = 'rating-feedback';
  ratingFeedback.className = 'rating-feedback';
  ratingFeedback.setAttribute('aria-live','polite');
  contentEl.appendChild(ratingWrap);
  contentEl.appendChild(ratingFeedback);
  loadAndApplyRating(slug);
  bindRatingButtons(slug);
  buildTOC();
  buildBookNav();
  highlightActiveTOC();
  applySyntaxHighlighting();
  ensureFooter();
  // If deep-linked to a specific heading (e.g., ?h=heading-id), expand and scroll to it
  maybeScrollToSection();
  articleEl.scrollTop = 0;
}

function maybeScrollToSection(){
  const id = getHashParam('h');
  if(!id) return;
  const h = contentEl.querySelector(`#${CSS.escape(id)}`);
  if(!h) return;
  const wrapper = h.closest('.collapsible-topic');
  if(wrapper){
    wrapper.setAttribute('data-expanded','true');
    const body = wrapper.querySelector('.collapsible-body');
    if(body) body.style.display = 'block';
    const toggleBtn = wrapper.querySelector('.topic-toggle');
    if(toggleBtn) toggleBtn.setAttribute('aria-expanded','true');
  }
  h.scrollIntoView({ behavior:'smooth', block:'start' });
}

function extractFrontMatter(text) {
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) {
      const rawFM = text.slice(3, end).trim();
      const body = text.slice(end + 4);
      return { frontMatter: parseSimpleYAML(rawFM), body };
    }
  }
  return { frontMatter: {}, body: text };
}

function parseSimpleYAML(src) {
  const out = {};
  src.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"(.+)"$/, '$1');
  });
  return out;
}

function renderMarkdown(md){
  return parseMarkdown(md);
}

/* ---------------- Docs Container Parsing (Qkey Documentation Format v1.0) ---------------- */
function parseDocsContainer(text){
  // Minimal block extraction for @metadata, @docs, @index, @dochashes
  const blocks = {};
  const reBlock = /(^|\n)@([a-zA-Z0-9_]+)\s*{([\s\S]*?\n)}/g; let m;
  while((m=reBlock.exec(text))){
    const name = m[2].toLowerCase();
    blocks[name] = m[3];
  }
  if(!blocks.docs) return null;
  return {
    metadata: safeParseSimpleKV(blocks.metadata||''),
    docs: parseDocsTree(blocks.docs),
    index: parseLooseObject(blocks.index||''),
    dochashes: parseLooseObject(blocks.dochashes||''),
    rawBlocks: blocks
  };
}
function safeParseSimpleKV(raw){
  const out={}; raw.split(/\n+/).forEach(l=>{ const t=l.trim(); if(!t||t.startsWith('//')) return; const mm=t.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/); if(!mm) return; let v=mm[2].trim().replace(/,$/,''); if(/^".*"$/.test(v)) v=v.slice(1,-1); out[mm[1]]=v; }); return out;
}
function parseLooseObject(raw){
  const root={}; const stack=[root]; const path=[root]; const lines=raw.split(/\n/); let cur=root;
  for(let line of lines){ const t=line.trim(); if(!t||t.startsWith('//')) continue; if(t.endsWith('{')){ const key=t.slice(0,-1).replace(/:/,'').trim(); const o={}; cur[key]=o; stack.push(cur); cur=o; } else if(t==='}'){ cur=stack.pop()||root; } else { const mm=t.match(/^"?([^:\s]+)"?\s*:\s*(.+)$/); if(!mm) continue; let v=mm[2].replace(/,$/,'').trim(); if(v.startsWith('[')&&v.endsWith(']')) v=v.slice(1,-1).split(',').map(s=>s.trim().replace(/^"|"$/g,'')); else if(/^".*"$/.test(v)) v=v.slice(1,-1); cur[mm[1]]=v; } }
  return root;
}
function parseDocsTree(raw){
  const root={}; const stack=[root]; let cur=root; let capturing=false; let bodyKey=null; let endToken=''; let buf=[]; const lines=raw.split(/\n/);
  const finalize=()=>{ if(bodyKey){ cur[bodyKey]=buf.join('\n'); bodyKey=null; buf=[]; } capturing=false; };
  for(let line of lines){ const rawLine=line; const t=line.trim(); if(capturing){ if(t===endToken){ finalize(); } else buf.push(rawLine.replace(/\r?$/,'')); continue; } if(!t) continue; if(t==='}') { cur=stack.pop()||root; continue; } if(t.endsWith('{')){ const key=t.slice(0,-1).replace(/:/,'').trim(); const o={}; cur[key]=o; stack.push(cur); cur=o; continue; }
    const hd=t.match(/^body:\s*<<(\w+)$/); if(hd){ capturing=true; bodyKey='body'; endToken=hd[1]; buf=[]; continue; }
    const mm=t.match(/^([^:]+):\s*(.+)$/); if(mm){ let v=mm[2].replace(/,$/,''); if(v.startsWith('[')&&v.endsWith(']')) v=v.slice(1,-1).split(',').map(s=>s.trim().replace(/^"|"$/g,'')); else v=v.replace(/^"|"$/g,''); cur[mm[1].trim()]=v; }
  }
  if(capturing) finalize();
  return root;
}

/** Build flat navigation array from container structure */
function normalizeDocsTreeFromContainer(docsRoot){
  // Expect structure: books: { bookKey: { title, chapters: { chapterKey: { pages: { pageKey: {...} }}}}}
  if(!docsRoot.books) return [];
  const books=[]; for(const [bookKey, bookVal] of Object.entries(docsRoot.books)){
    const pages=[]; // flatten chapter/pages for navigation (book landing + pages)
    const chapters=bookVal.chapters || {};
    for(const [chapKey, chapVal] of Object.entries(chapters)){
      const chapterPages=chapVal.pages || {};
      for(const [pageKey, pageObj] of Object.entries(chapterPages)){
        const slug = `${bookKey}/${chapKey}/${pageKey}`;
        pages.push({ slug, title: pageObj.title || humanize(pageKey), type:'page', order: Number(pageObj.order)||999, file: null, containerPath:['books',bookKey,'chapters',chapKey,'pages',pageKey] });
      }
    }
    books.push({ slug: bookKey, title: bookVal.title || humanize(bookKey), type:'book', order: Number(bookVal.order)||999, group: 'Products', file: null, children: pages.sort(sortByOrderThenTitle), containerPath:['books',bookKey] });
  }
  return books.sort(sortByOrderThenTitle);
}
function resolveContainerPage(root, path){ if(!path||!path.length) return null; let cur=root; for(const seg of path){ if(cur && Object.prototype.hasOwnProperty.call(cur, seg)) cur=cur[seg]; else return null; } return cur; }

/* ---------------- Meta Line Builders (Book / Chapter / Page numbering) ---------------- */
function buildContainerMetaLine(node){
  try {
    if(!node.containerPath) return '';
    const cp = node.containerPath; // ['books', bookKey, 'chapters', chapterKey, 'pages', pageKey]
    const booksRoot = docsContainer.docs.books || {};
    const bookKey = cp[1];
    const bookObj = booksRoot[bookKey];
    if(!bookObj) return '';
    // Book ordering for number
    const orderedBooks = Object.entries(booksRoot).map(([k,v])=>({k, o:Number(v.order)||999})).sort((a,b)=> a.o===b.o ? a.k.localeCompare(b.k): a.o-b.o);
    const bookIndex = orderedBooks.findIndex(b=>b.k===bookKey) + 1;
  const chips=[];
    // Determine first page of the book (first chapter's first ordered page) for navigation
    let firstBookPageSlug = '';
    const allChapters = Object.entries(bookObj.chapters||{}).map(([k,v])=>({k, o:Number(v.order)||999, v})).sort((a,b)=> a.o===b.o ? a.k.localeCompare(b.k): a.o-b.o);
    for(const ch of allChapters){
      const pages = Object.entries(ch.v.pages||{}).map(([k,v])=>({k, o:Number(v.order)||999, t:v.title||k})).sort((a,b)=> a.o===b.o ? a.t.localeCompare(b.t): a.o-b.o);
      if(pages.length){
        firstBookPageSlug = `${bookKey}/${ch.k}/${pages[0].k}`;
        break;
      }
    }
    // Book chip shows folder (slug) name rather than numeric label; still compute index if future styling uses it
    const folderName = bookKey.split('/').pop();
    chips.push(`<span class=\"meta-chip chip-book\" ${firstBookPageSlug?`data-slug=\"${encodeURIComponent(firstBookPageSlug)}\"`:''}>${escapeHTML(folderName)}</span>`);
    let chapterKey, chapterObj, orderedPages;
    if(cp.includes('chapters')){
      chapterKey = cp[3];
      chapterObj = bookObj.chapters?.[chapterKey];
      if(chapterObj){
  const orderedChapters = Object.entries(bookObj.chapters||{}).map(([k,v])=>({k, o:Number(v.order)||999, t:v.title||k})).sort((a,b)=> a.o===b.o ? a.t.localeCompare(b.t): a.o-b.o);
  const chapterIndex = orderedChapters.findIndex(c=>c.k===chapterKey) + 1;
  const chapterTotal = orderedChapters.length;
        // Determine first page slug in chapter for navigation target
        const chapterPages = chapterObj.pages || {};
        orderedPages = Object.entries(chapterPages).map(([k,v])=>({k, o:Number(v.order)||999, t:v.title||k})).sort((a,b)=> a.o===b.o ? a.t.localeCompare(b.t): a.o-b.o);
        const firstPageSlug = orderedPages.length ? `${bookKey}/${chapterKey}/${orderedPages[0].k}` : '';
        const chapterCount = Object.keys(bookObj.chapters||{}).length;
        const viewingPageKey = cp.includes('pages') ? cp[5] : '';
        const viewingIsIntro = (chapterKey === 'introduction') && (viewingPageKey === 'introduction');
        // Suppress chapter chips if user is on the introduction page AND there's only one chapter to avoid duplicate "Introduction"
        if(!(viewingIsIntro && chapterCount === 1)){
          // Chapter number chip (with total count to aid orientation)
          chips.push(`<span class=\"meta-chip chip-chapter\" ${firstPageSlug?`data-slug=\"${encodeURIComponent(firstPageSlug)}\"`:''}>Chapter ${chapterIndex}/${chapterTotal}</span>`);
          const chapterTitleEsc = escapeHTML(chapterObj.title||chapterKey);
          // Avoid duplicate chapter title if it matches current page title
          const currentPageTitleMaybe = viewingPageKey ? (chapterPages[viewingPageKey]?.title || viewingPageKey) : '';
          if(chapterTitleEsc !== escapeHTML(currentPageTitleMaybe)){
            chips.push(`<span class=\"meta-chip chip-chapter-title\" ${firstPageSlug?`data-slug=\"${encodeURIComponent(firstPageSlug)}\"`:''}>${chapterTitleEsc}</span>`);
          }
        }
        if(cp.includes('pages')){
          const pageKey = cp[5];
          const pageTitle = chapterPages[pageKey]?.title || pageKey;
          chips.push(`<span class=\"meta-chip chip-page-title current\">${escapeHTML(pageTitle)}</span>`);
          // Chapter switcher chip (only if >1 chapter) listing other chapter names as data attributes for simple cycling
          if(orderedChapters.length > 1){
            const other = orderedChapters.filter(c=>c.k!==chapterKey).map(c=>c.k).join(',');
            chips.push(`<span class=\"meta-chip chip-chapter-title\" data-chapter-switch=\"${escapeHTML(other)}\">Switch Chapter</span>`);
          }
        }
      }
    }
    return `<div class=\"doc-meta-line doc-meta-chips\" role=\"navigation\" aria-label=\"Document Context\">${chips.join('')}</div>`;
  } catch (e) { return ''; }
}

function buildLegacyMetaLine(node){
  try {
    // Determine book via trail
    const trailBook = node.trail ? node.trail.find(n=>n.type==='book') : null;
    if(!trailBook) return '';
    const books = manifest.docs.slice().sort((a,b)=> a.order===b.order ? a.title.localeCompare(b.title): a.order-b.order);
    const bookIndex = books.findIndex(b=>b.slug===trailBook.slug) + 1;
    const bookPart = `<span class="doc-meta-book">Book ${bookIndex}: ${escapeHTML(trailBook.title)}</span>`;
    if(node.type==='book') return `<div class="doc-meta-line">${bookPart}</div>`;
    const pages = (trailBook.children||[]).slice().sort((a,b)=> a.order===b.order ? a.title.localeCompare(b.title): a.order-b.order);
    const pageIndex = pages.findIndex(p=>p.slug===node.slug) + 1;
  const pagePart = `<span class="doc-meta-page">Page ${pageIndex}/${pages.length}: ${escapeHTML(node.title)}</span>`;
    return `<div class="doc-meta-line">${bookPart}${pagePart}</div>`;
  } catch (e) { return ''; }
}

// Primary (self-contained) markdown parser with stable placeholders
function parseMarkdown(src){
  function guessLangFromCode(code){
    const s = (code||'').trim();
    const head = s.slice(0, 200).toLowerCase();
    // JSON: object/array, likely valid JSON
    if((head.startsWith('{') || head.startsWith('['))){
      try { JSON.parse(s); return 'json'; } catch {}
      // allow jsonc style comments fallback
      if(/:[\s]*"|\{|\[/.test(head)) return 'json';
    }
    // Shell / curl
    if(/^\$?\s*(curl|wget|export|sudo|npm|pnpm|yarn|brew|apt|apk)\b/m.test(head)) return 'sh';
    // YAML
    if(/^[a-z0-9_\-]+:\s/m.test(head) && !/[;{}]/.test(head)) return 'yaml';
    // JS/TS
    if(/^(import|export)\s|require\(|=>|const\s|let\s|function\s/m.test(head)) return 'js';
    // HTTP request examples
    if(/^(get|post|put|patch|delete)\s+\//i.test(head)) return 'http';
    return 'text';
  }
  const ORIGINAL = src.replace(/\r\n?/g,'\n');
  // Normalize indented code fences (Markdown allows up to 3 leading spaces)
  const NORMALIZED = ORIGINAL
  // opening fences with optional language (be more permissive with indentation)
  .replace(/(^|\n)[ \t]{0,9}```([a-zA-Z0-9+#_-]+)?[ \t]*\n/g, (m,lead,lang)=> `${lead}\
\`\`\`${lang||''}\n`)
  // closing fences
  .replace(/(^|\n)[ \t]{0,9}```[ \t]*(?=\n|$)/g, (m,lead)=> `${lead}\
\`\`\``);
  const codeBlocks=[];
  const admos=[]; // {type, body}
  let text = NORMALIZED.replace(/```(\w+)?\n([\s\S]*?)```/g,(m,lang,code)=>{
    let l = (lang||'').trim().toLowerCase();
    if(!l || l==='text') l = guessLangFromCode(code);
    codeBlocks.push({lang:l, code});
    return `@@CODE_${codeBlocks.length-1}@@`;
  });
  text = text.replace(/::: (tip|note|warning)\n([\s\S]*?)(?:\n:::\s*(?=\n|$)|\n?:::\s*$)/g,(m,type,body)=>{
    const id=admos.push({type, body:body.trim()})-1; return `@@ADMO_${id}@@`; });
  const lines = text.split('\n');
  const out=[]; let i=0; let listMode=null; let listBuffer=[]; let quoteBuffer=[];
  function inline(txt){
    // Allow directive placeholders to pass through unescaped
    const placeholders = [];
    let safe = txt.replace(/@@DIR_[ES]_\d+@@/g, m=>{ placeholders.push(m); return `@@PH_${placeholders.length-1}@@`; });
    safe = escapeHTML(safe)
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
    // Restore placeholders
    safe = safe.replace(/@@PH_(\d+)@@/g, (m,i)=> placeholders[Number(i)] || m);
    return safe;
  }
  function flushList(){ if(listMode){ out.push(`<${listMode}>`+listBuffer.map(li=>`<li>${inline(li.trim())}</li>`).join('')+`</${listMode}>`); listMode=null; listBuffer=[]; } }
  function flushQuote(){ if(quoteBuffer.length){ out.push(`<blockquote>${quoteBuffer.map(p=>`<p>${inline(p)}</p>`).join('')}</blockquote>`); quoteBuffer=[]; } }
  let inCollapsible = false;
  let collapsibleBuffer = [];
  let collapsibleId = '';
  function flushCollapsible(){
    if(inCollapsible && collapsibleBuffer.length){
      const header = collapsibleBuffer[0] || '';
      const body = collapsibleBuffer.slice(1).join('\n');
      // Default OPEN: topic toggles start expanded (content visible)
      out.push(`<div class="collapsible-topic" id="collapsible-${collapsibleId}" data-expanded="true">${header}<div id="collapsible-content-${collapsibleId}" class="collapsible-body" style="display:block">${body}</div></div>`);
      collapsibleBuffer = [];
      inCollapsible = false;
      collapsibleId = '';
    }
  }
  for(; i<lines.length; i++){
    let line=lines[i];
    if(!line.trim()){
      // Allow blank lines inside a collapsible body without closing it
      flushList(); flushQuote();
      if(inCollapsible){ collapsibleBuffer.push(''); continue; }
      continue;
    }
    if(/^>\s?/.test(line)){ flushList(); line=line.replace(/^>\s?/,''); quoteBuffer.push(line); continue; } else flushQuote();
    const h=line.match(/^(#{1,6})\s+(.*)$/);
    if(h){
      flushList();
      const level = h[1].length;
      const text = h[2].trim();
      const id = slugify(text);
      let anchor = '';
      let toggle = '';
  if(level === 2 || level === 3){
        anchor = `<a class="topic-anchor" href="#${id}" title="Copy link to topic" onclick="navigator.clipboard.writeText(window.location.pathname + '#${id}')"><svg width="14" height="14" viewBox="0 0 20 20" style="vertical-align:middle"><path d="M7.5 10a2.5 2.5 0 0 1 2.5-2.5h4A2.5 2.5 0 0 1 16.5 10v4a2.5 2.5 0 0 1-2.5 2.5h-4A2.5 2.5 0 0 1 7.5 14v-4zm5-7A2.5 2.5 0 0 1 15 5.5v4A2.5 2.5 0 0 1 12.5 12h-4A2.5 2.5 0 0 1 6 9.5v-4A2.5 2.5 0 0 1 8.5 3h4z" fill="#888"/></svg></a>`;
  toggle = `<button class="topic-toggle" aria-controls="collapsible-content-${id}" aria-expanded="true" aria-label="Toggle section" onclick="const c=document.getElementById('collapsible-content-${id}');const w=this.closest('.collapsible-topic');if(c){const e=this.getAttribute('aria-expanded')==='true';this.setAttribute('aria-expanded',String(!e));if(w){w.setAttribute('data-expanded', String(!e));}c.style.display=e?'none':'block';}"></button>`;
        if(inCollapsible && collapsibleBuffer.length){ flushCollapsible(); }
        inCollapsible = true;
        collapsibleId = id;
  collapsibleBuffer.push(`<h${level} id="${id}">${toggle}${anchor}${inline(text)}</h${level}>`);
        continue;
      }
      if(inCollapsible && collapsibleBuffer.length){ flushCollapsible(); }
      out.push(`<h${level} id="${id}">${anchor}${inline(text)}</h${level}>`);
      continue;
    }
    if(inCollapsible){
      // Support fenced code blocks inside collapsible sections
      const fenceStart = line.match(/^[ \t]{0,9}```([a-zA-Z0-9+#_-]+)?[ \t]*$/);
      if(fenceStart){
        const langRaw = (fenceStart[1]||'').trim().toLowerCase();
        let j=i+1; const codeLines=[];
        while(j<lines.length && !/^[ \t]{0,9}```[ \t]*$/.test(lines[j])){ codeLines.push(lines[j].replace(/\r?$/,'')); j++; }
        // Advance past closing fence if present
        if(j<lines.length && /^[ \t]{0,9}```[ \t]*$/.test(lines[j])) i=j; else i=j-1;
        const rawCode = codeLines.join('\n');
        let lang = langRaw;
        if(!lang) lang = guessLangFromCode(rawCode);
        const label = lang ? ` class=\"language-${escapeHTML(lang)}\"` : '';
        collapsibleBuffer.push(`<pre><code${label}>${escapeHTML(rawCode)}</code></pre>`);
        continue;
      }
      // Default: wrap as paragraph within collapsible
      collapsibleBuffer.push(`<p>${inline(line.trim())}</p>`);
      continue;
    }
    if(/^(---|\*\*\*|___)\s*$/.test(line)){ flushList(); out.push('<hr />'); continue; }
    const ol=line.match(/^\d+\.\s+(.+)/); if(ol){ if(listMode && listMode!=='ol') flushList(); listMode='ol'; listBuffer.push(ol[1]); continue; }
    const ul=line.match(/^[-*+]\s+(.+)/); if(ul){ if(listMode && listMode!=='ul') flushList(); listMode='ul'; listBuffer.push(ul[1]); continue; }
    if(/^[|].*[|]$/.test(line)){ flushList(); const rows=[line]; let j=i+1; while(j<lines.length && /^[|].*[|]$/.test(lines[j])){ rows.push(lines[j]); j++; } i=j-1; const htmlRows=rows.map(r=>'<tr>'+r.replace(/^\||\|$/g,'').split('|').map(c=>`<td>${inline(c.trim())}</td>`).join('')+'</tr>').join(''); out.push(`<table>${htmlRows}</table>`); continue; }
    flushList(); out.push(`<p>${inline(line.trim())}</p>`);
  }
  flushList(); flushQuote();
  flushCollapsible();
  let html=out.join('\n');
  html = html.replace(/@@ADMO_(\d+)@@/g,(m,idx)=>{ const ad=admos[Number(idx)]; if(!ad) return m; const segs=ad.body.split(/\n{2,}/).map(p=>`<p>${inline(p)}</p>`).join(''); return `<div class="admonition" data-type="${ad.type}"><div class="admonition-title">${ad.type.toUpperCase()}</div><div class="admonition-body">${segs}</div></div>`; });
  html = html.replace(/@@CODE_(\d+)@@/g,(m,idx)=>{ const blk=codeBlocks[Number(idx)]; if(!blk) return m; return `<pre><code${blk.lang?` class=\"language-${escapeHTML(blk.lang)}\"`:''}>${escapeHTML(blk.code)}</code></pre>`; });
  return html;
}

// (Admonitions handled inside parseMarkdown)

/* ---------------- Breadcrumbs ---------------- */
function buildBreadcrumbs(trail) {
  if (!trail || !trail.length) return '';
  return trail.map((n,i) => {
    if (i === trail.length - 1) return `<span>${escapeHTML(n.title)}</span>`;
    return `<a href="${HASH_PREFIX + encodeURIComponent(n.slug)}">${escapeHTML(n.title)}</a>`;
  }).join('<span>/</span>');
}

/* ---------------- TOC (Headings h1-h3) ---------------- */
function buildTOC() {
  const headings = Array.from(contentEl.querySelectorAll('h1, h2, h3'));
  const list = document.createElement('ul');
  list.className = 'toc-list';
  headings.forEach(h => {
    if (!h.id) h.id = slugify(h.textContent);
    const lvl = parseInt(h.tagName.substring(1), 10);
    const li = document.createElement('li');
    li.className = `toc-item level-${lvl}`;
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    li.appendChild(a);
    list.appendChild(li);
  });
  // Ensure topics section is in the left sidebar .toc
  const tocContainer = document.querySelector('.toc');
  let topicsHost = document.getElementById('toc-nav');
  if(!topicsHost && tocContainer){
    topicsHost = document.createElement('div');
    topicsHost.id = 'toc-nav';
    topicsHost.className = 'topics-section';
    const title = document.createElement('div');
    title.className = 'toc-title';
    title.textContent = 'Topics';
    topicsHost.appendChild(title);
    tocContainer.appendChild(topicsHost);
  }
  if(topicsHost){
    // Replace existing list under topics host
    // Remove any previous list
    Array.from(topicsHost.querySelectorAll('ul.toc-list')).forEach(el=> el.remove());
    topicsHost.appendChild(list);
  } else if (tocNav) {
    // Fallback to existing container if present
    tocNav.innerHTML = '';
    tocNav.appendChild(list);
  }
}

function highlightActiveTOC() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        document.querySelectorAll('.toc-list a').forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
  document.querySelectorAll('#doc-content h1, #doc-content h2, #doc-content h3').forEach(h => observer.observe(h));
}

/* ---------------- Search Index ---------------- */
async function buildIndex() {
  if (indexBuilt || indexing) return;
  indexing = true;
  searchCacheVersionKey = 'qkey-docs-index:' + MANIFEST_URL;
  // Try cache
  const cached = localStorage.getItem(searchCacheVersionKey);
  if(cached){
    try { const parsed=JSON.parse(cached); if(Array.isArray(parsed)){ searchCache=parsed; indexBuilt=true; indexing=false; return; } } catch{}
  }
  for (const [slug, meta] of slugMap.entries()) {
    try {
      let pageTitle = meta.title;
      let plain = '';
      if (docsContainer && Array.isArray(meta.containerPath)) {
        // Prefer docs container content when available
        const pageObj = resolveContainerPage(docsContainer.docs, meta.containerPath);
        if (pageObj) {
          pageTitle = pageObj.title || pageTitle;
          const body = pageObj.body || '';
          plain = body.replace(/```[\s\S]*?```/g,' ').replace(/[#!>*_`\[\]()\-]/g,' ');
          // Add synthetic weighting tokens for endpoint blocks (method + path + tags)
          const epMatches = body.match(/<section class="endpoint-block"[\s\S]*?<\/section>/g) || [];
          epMatches.forEach(sec=>{
            const methodMatch = sec.match(/data-method="([A-Z]+)"/i);
            const pathMatch = sec.match(/data-path="([^"]+)"/i);
            if(methodMatch && pathMatch){
              const method = methodMatch[1].toLowerCase();
              const path = pathMatch[1].toLowerCase();
              plain += ' ' + method.repeat(4) + ' ' + path.split('/').filter(Boolean).map(f=>f.repeat(2)).join(' ');
            }
          });
        }
      } else if (meta.file) {
        // Legacy: fetch markdown file
        const url = `${CONTENT_ROOT}/${meta.file}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const raw = await res.text();
        const { frontMatter, body } = extractFrontMatter(raw);
        pageTitle = frontMatter.title || pageTitle;
        plain = (body||'').replace(/```[\s\S]*?```/g,' ').replace(/[#!>*_`\[\]()\-]/g,' ');
        // Boost legacy endpoint directive raw blocks (if any before container build)
        if(/:::\s*endpoint/.test(raw)){
          plain += ' endpoint endpoint api api';
        }
      }
      if (!plain) continue;
      const tokens = plain.toLowerCase().split(/\s+/).filter(Boolean);
      searchCache.push({ slug, title: pageTitle, body: plain.slice(0, 12000), tokens });
    } catch {/* silent */}
  }
  indexBuilt = true;
  indexing = false;
  try { localStorage.setItem(searchCacheVersionKey, JSON.stringify(searchCache)); } catch{}
}

async function search(term) {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  await buildIndex();
  const parts = q.split(/\s+/).filter(Boolean);
  const out = [];
  for (const entry of searchCache) {
    let score = 0;
    for (const p of parts) {
      const freq = entry.tokens.filter(t => t.includes(p)).length;
      score += freq;
    }
    if (score > 0) out.push({ ...entry, score });
  }
  out.sort((a,b) => b.score - a.score);
  return out.slice(0, 40);
}

/* ---------------- In-Page Highlight ---------------- */
function clearHighlights() {
  articleEl.querySelectorAll('mark[data-hl]').forEach(m => {
    const parent = m.parentNode;
    parent.replaceChild(document.createTextNode(m.textContent), m);
    parent.normalize();
  });
}

function highlightTerm(q) {
  if (!q) return 0;
  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, { acceptNode: n => /\S/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const term = q.toLowerCase();
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let hits = 0;
  nodes.forEach(node => {
    const val = node.nodeValue;
    const idx = val.toLowerCase().indexOf(term);
    if (idx !== -1) {
      const before = val.slice(0, idx);
      const match = val.slice(idx, idx + term.length);
      const after = val.slice(idx + term.length);
      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      const mark = document.createElement('mark');
      mark.dataset.hl = '1';
      mark.textContent = match;
      frag.appendChild(mark);
      if (after) frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
      hits++;
    }
  });
  return hits;
}

function performSearchUI(query) {
  clearHighlights();
  const q = query.trim();
  if (!q) { searchMeta.hidden = true; return; }
  const hits = highlightTerm(q);
  searchMeta.textContent = `${hits} match${hits === 1 ? '' : 'es'}`;
  searchMeta.hidden = false;
  if (hits) {
    const first = articleEl.querySelector('mark[data-hl]');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/* ---------------- Search Typeahead Dropdown ---------------- */
function ensureSearchDropdown(){
  if (dropdownEl) return dropdownEl;
  const form = document.getElementById('doc-search-form');
  if (!form) return null;
  dropdownEl = document.createElement('div');
  dropdownEl.id = 'doc-search-dropdown';
  dropdownEl.className = 'doc-search-dropdown';
  dropdownEl.setAttribute('role','listbox');
  form.appendChild(dropdownEl);
  return dropdownEl;
}

function hideSearchDropdown(){ if(dropdownEl) dropdownEl.hidden = true; activeResultIndex = -1; }

function showSearchDropdown(results, query){
  const dd = ensureSearchDropdown();
  if (!dd) return;
  if (!results || !results.length){
    dd.innerHTML = `<div class="search-suggestion empty">No results for “${escapeHTML(query)}”</div>`;
    dd.hidden = false; activeResultIndex = -1; return;
  }
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  dd.innerHTML = results.slice(0, 12).map((r, idx)=>{
    const meta = slugMap.get(r.slug) || {};
    const trail = meta.trail || [];
    const book = trail.find(t=>t.type==='book');
    const chapter = trail.find(t=>t.type==='page') ? trail[trail.length-2] : trail.find(t=>t.type!=='book' && t.type);
    const crumb = [book?.title, chapter && chapter!==book ? chapter.title : null].filter(Boolean).join(' › ');
    const snippet = buildSnippet(r.body, terms, 140);
    const markedTitle = highlightInline(r.title, terms);
    return `
      <a href="#/${encodeURIComponent(r.slug)}" class="search-suggestion" role="option" data-index="${idx}" data-slug="${encodeURIComponent(r.slug)}">
        <div class="suggestion-title">${markedTitle}</div>
        ${crumb ? `<div class="suggestion-meta">${escapeHTML(crumb)}</div>`:''}
        ${snippet ? `<div class="suggestion-snippet">${snippet}</div>`:''}
      </a>`;
  }).join('');
  dd.hidden = false;
  activeResultIndex = -1;
}

function buildSnippet(body, terms, maxLen=140){
  if(!body) return '';
  const low = body.toLowerCase();
  let hitIndex = -1, hitLen = 0; let hitTerm='';
  for(const t of terms){ const i = low.indexOf(t); if(i !== -1 && (hitIndex === -1 || i < hitIndex)){ hitIndex=i; hitLen=t.length; hitTerm=t; } }
  if(hitIndex === -1){ const s = body.slice(0, maxLen); return escapeHTML(s) + (body.length>maxLen?'…':''); }
  const start = Math.max(0, hitIndex - Math.floor(maxLen/2));
  const end = Math.min(body.length, start + maxLen);
  const raw = (start>0?'…':'') + body.slice(start, end) + (end<body.length?'…':'');
  return highlightInline(raw, terms);
}

function highlightInline(text, terms){
  let out = escapeHTML(text);
  for(const t of terms){ if(!t) continue; const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'); out = out.replace(re, '<mark>$1</mark>'); }
  return out;
}

/* ---------------- Utilities ---------------- */
const slugify = str => str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-');
function escapeHTML(str) { return str.replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }

/* ---------------- Page Rating Logic (Server-Side) ---------------- */
async function saveRating(slug, rating) {
  try {
    const response = await fetch('/api/doc-ratings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slug, rating }),
    });
    if (!response.ok) {
        throw new Error('Failed to save rating on server.');
    }
    const result = await response.json();
    return result.success;
  } catch (e) {
    console.error("Failed to save rating:", e);
    return false;
  }
}

function saveLocalRating(slug, rating){
  try {
    const data = JSON.parse(localStorage.getItem(LS_KEY_RATINGS)||'{}');
    data[slug] = rating;
    localStorage.setItem(LS_KEY_RATINGS, JSON.stringify(data));
  } catch {}
}

function loadLocalRating(slug){
  try { const data = JSON.parse(localStorage.getItem(LS_KEY_RATINGS)||'{}'); return Number(data[slug]||0); } catch { return 0; }
}

async function loadRating(slug) {
  try {
    const response = await fetch(`/api/doc-ratings/${slug}`);
    if (!response.ok) {
        return 0; // Don't throw, just return no rating
    }
    const result = await response.json();
    return result.success ? result.rating : loadLocalRating(slug);
  } catch (e) {
    console.error("Failed to load rating:", e);
    return loadLocalRating(slug);
  }
}

function updateRatingDisplay(slug, rating) {
  const container = document.querySelector(`.page-rating[data-slug="${slug}"]`);
  if (!container) return;
  container.querySelectorAll('.page-rate').forEach(btn => {
    const btnRating = parseInt(btn.dataset.rating, 10);
    const isActive = btnRating <= rating;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    if (!isActive) {
      btn.style.color = '';
    }
  });
  const valueEl = container.querySelector('.page-rating-value');
  if (valueEl) valueEl.textContent = `${rating}/5`;
}

async function loadAndApplyRating(slug) {
  const rating = await loadRating(slug);
  updateRatingDisplay(slug, rating || 0);
}

function bindRatingButtons(slug) {
    const container = document.querySelector(`.page-rating[data-slug="${slug}"]`);
    if (!container || container.dataset.bound) return;
    container.dataset.bound = 'true';

    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('.page-rate');
        if (!btn) return;

        const rating = parseInt(btn.dataset.rating, 10);
    // Update UI immediately for responsiveness
    updateRatingDisplay(slug, rating);
    const feedbackEl = document.getElementById('rating-feedback');
    if(feedbackEl) {
      feedbackEl.textContent = `Thanks! You rated this ${rating}/5.`;
      setTimeout(()=>{ feedbackEl.textContent=''; }, 2500);
    }
    // Try server save; on failure, persist locally
    const success = await saveRating(slug, rating);
    if(!success) saveLocalRating(slug, rating);
    });
}

/* ---------------- Syntax Highlighting ---------------- */
function applySyntaxHighlighting(){ /* No external highlighter; could integrate later. */ }

/* ---------------- Page Footer (Author / Updated) ---------------- */
function injectPageFooter(node, rawBody){
  try {
    const articleFooterId='doc-page-footer-info';
    const existing=document.getElementById(articleFooterId);
    if(existing) existing.remove();
    // Acquire author/updated from container page if available
    let author='', updated='';
    if(docsContainer && node.containerPath){
      const pageObj = resolveContainerPage(docsContainer.docs, node.containerPath||[]);
      author = pageObj?.author || docsContainer.docs?.books?.[node.containerPath[1]]?.author || '';
      updated = (pageObj?.updatedAt || docsContainer.docs?.books?.[node.containerPath[1]]?.updatedAt || '').split('T')[0];
    }
    if(!author && node.trail){
      const book = node.trail.find(t=>t.type==='book');
      author = book?.author || '';
    }
    if(!updated){
      // heuristic: look for first ISO date in body
      const m = rawBody.match(/\d{4}-\d{2}-\d{2}/);
      if(m) updated = m[0];
    }
    if(!author && !updated) return;
    const footer=document.createElement('div');
    footer.id=articleFooterId;
    footer.className='doc-page-footer';
    const segs=[];
    if(author) segs.push(`<span class="doc-page-meta-label">Author</span><span class="doc-page-meta-value">${escapeHTML(author)}</span>`);
    if(updated) segs.push(`<span class="doc-page-meta-label">Updated</span><span class="doc-page-meta-value">${escapeHTML(updated)}</span>`);
    footer.innerHTML=`<div class="doc-page-footer-inner"><div class="doc-page-meta-line">${segs.join('')}</div></div>`;
  contentEl.appendChild(footer);
  } catch {}
}

/* ---------------- Clickable Meta Line (navigate to book root) ---------------- */
function makeMetaLineClickable(){} // legacy no-op

/* ---------------- Interactive Chips ---------------- */
function activateMetaChips(){
  const wrap = contentEl.querySelector('.doc-meta-line.doc-meta-chips');
  if(!wrap || wrap.dataset.chipsBound) return;
  wrap.dataset.chipsBound='1';
  wrap.addEventListener('click', e=>{
    const chip = e.target.closest('.meta-chip');
    if(!chip) return;
    if(chip.hasAttribute('data-slug')){
      const targetSlug = decodeURIComponent(chip.getAttribute('data-slug'));
      if(targetSlug){
        const current = currentSlug();
        if(current === targetSlug){
          renderSlug(targetSlug);
        } else {
          location.hash = HASH_PREFIX + encodeURIComponent(targetSlug);
        }
      }
      return;
    }
    // Chapter switcher
    if(chip.hasAttribute('data-chapter-switch')){
      try {
        const cp = slugMap.get(currentSlug())?.containerPath;
        if(!cp) return;
        const bookKey = cp[1];
        const chapters = Object.entries(docsContainer.docs.books[bookKey].chapters||{}).map(([k,v])=>({k, order:Number(v.order)||999})).sort((a,b)=> a.order===b.order? a.k.localeCompare(b.k): a.order-b.order);
        const curChapter = cp[3];
        const idx = chapters.findIndex(c=>c.k===curChapter);
        const next = chapters[(idx+1) % chapters.length];
        if(!next) return;
        // Find first page in next chapter
        const pages = Object.entries(docsContainer.docs.books[bookKey].chapters[next.k].pages||{}).map(([k,v])=>({k, order:Number(v.order)||999, t:v.title||k})).sort((a,b)=> a.order===b.order? a.t.localeCompare(b.t): a.order-b.order);
        if(!pages.length) return;
        const targetSlug = `${bookKey}/${next.k}/${pages[0].k}`;
        location.hash = HASH_PREFIX + encodeURIComponent(targetSlug);
      } catch {}
    }
  });
}

/* ---------------- Page Counter (bottom-right) ---------------- */
function injectPageCounter(node){
  try {
    if(!node || node.type !== 'page' || !node.containerPath) return;
    const cp = node.containerPath;
    if(!cp.includes('chapters')) return;
    const bookKey = cp[1];
    const chapterKey = cp[3];
    const pageKey = cp[5];
    const bookObj = docsContainer?.docs?.books?.[bookKey];
    const chapterObj = bookObj?.chapters?.[chapterKey];
    const pages = chapterObj ? Object.entries(chapterObj.pages||{}).map(([k,v])=>({k, o:Number(v.order)||999, t:v.title||k})) : [];
    pages.sort((a,b)=> a.o===b.o ? a.t.localeCompare(b.t): a.o-b.o);
    const pageIndex = pages.findIndex(p=>p.k===pageKey) + 1;
    const pageCount = pages.length || 0;
    if(!pageIndex || !pageCount) return;
    // Remove any legacy fixed elements (from previous implementation)
    const legacyCounter = document.body.querySelector('#doc-page-counter');
    const legacyNext = document.body.querySelector('#doc-page-next');
    if(legacyCounter && !legacyCounter.closest('.doc-page-nav')) legacyCounter.remove();
    if(legacyNext && !legacyNext.closest('.doc-page-nav')) legacyNext.remove();
    // Ensure nav container inside article
    const article = document.querySelector('.doc-article');
    if(!article) return;
    let nav = document.getElementById('doc-page-nav');
    if(!nav){
      nav = document.createElement('div');
      nav.id='doc-page-nav';
      nav.className='doc-page-nav';
      article.appendChild(nav);
    }
    nav.innerHTML='';
    const counterEl = document.createElement('div');
    counterEl.id='doc-page-counter';
    counterEl.className='doc-page-counter';
    counterEl.textContent = `Page ${pageIndex} / ${pageCount}`;
    nav.appendChild(counterEl);
    // Build linear list across chapters for prev/next
    const linear = buildLinearPageSequence(bookKey);
    const currentFull = `${bookKey}/${chapterKey}/${pageKey}`;
    const curIdx = linear.findIndex(l=>l.slug===currentFull);
    const prev = curIdx>0 ? linear[curIdx-1] : null;
    const next = curIdx>=0 && curIdx<linear.length-1 ? linear[curIdx+1] : null;
    if(prev){
      const prevBtn = document.createElement('button');
      prevBtn.id='doc-page-prev';
      prevBtn.type='button';
      prevBtn.className='doc-page-prev';
      prevBtn.setAttribute('data-target-slug', prev.slug);
      prevBtn.textContent = `◀ Prev: ${prev.title}`;
      prevBtn.addEventListener('click',()=>{ location.hash = HASH_PREFIX + encodeURIComponent(prev.slug); });
      nav.appendChild(prevBtn);
    }
    if(next){
      const nextBtn = document.createElement('button');
      nextBtn.id='doc-page-next';
      nextBtn.type='button';
      nextBtn.className='doc-page-next';
      nextBtn.setAttribute('data-target-slug', next.slug);
      nextBtn.textContent = `Next: ${next.title} ▶`;
      nextBtn.addEventListener('click',()=>{ location.hash = HASH_PREFIX + encodeURIComponent(next.slug); });
      nav.appendChild(nextBtn);
    }
    // Progress bar
    injectProgressBar(linear, curIdx);
    // Persist last visited
    persistLastVisited(bookKey, currentFull);
  } catch {/* silent */}
}

function buildLinearPageSequence(bookKey){
  const bookObj = docsContainer?.docs?.books?.[bookKey];
  if(!bookObj) return [];
  const chapters = Object.entries(bookObj.chapters||{}).map(([k,v])=>({k, o:Number(v.order)||999, v})).sort((a,b)=> a.o===b.o ? a.k.localeCompare(b.k): a.o-b.o);
  const out=[];
  chapters.forEach(ch=>{
    const pages = Object.entries(ch.v.pages||{})
      .map(([k,v])=>({k, o:Number(v.order)||999, t:v.title||k, title:v.title||k}))
      .sort((a,b)=> a.o===b.o ? a.t.localeCompare(b.t): a.o-b.o);
    pages.forEach(p=> out.push({ slug:`${bookKey}/${ch.k}/${p.k}`, title:p.title, chapter:ch.k }));
  });
  return out;
}

function injectProgressBar(list, index){
  let barWrap = document.getElementById('doc-progress-wrap');
  if(!barWrap){
    barWrap = document.createElement('div');
    barWrap.id='doc-progress-wrap';
    barWrap.className='doc-progress-wrap';
    const article = document.querySelector('.doc-article');
    article?.appendChild(barWrap);
    const inner = document.createElement('div');
    inner.id='doc-progress';
    inner.className='doc-progress';
    inner.setAttribute('role','progressbar');
    barWrap.appendChild(inner);
  }
  const bar = document.getElementById('doc-progress');
  if(!bar) return;
  if(!list.length){ bar.style.width='0%'; return; }
  const pct = ((index+1)/list.length)*100;
  bar.style.width = pct + '%';
  bar.setAttribute('aria-valuenow', String(index+1));
  bar.setAttribute('aria-valuemax', String(list.length));
  bar.setAttribute('aria-valuemin','1');
}

function persistLastVisited(bookKey, slug){
  try {
    const data = JSON.parse(localStorage.getItem(LS_KEY_LAST_PAGE)||'{}');
    data[bookKey]=slug;
    localStorage.setItem(LS_KEY_LAST_PAGE, JSON.stringify(data));
  } catch {}
}

/* ---------------- Footer Injection Safety ---------------- */
function ensureFooter(){
  if(!document.querySelector('.site-footer')){
    const f=document.createElement('footer');
    f.className='site-footer';
    f.innerHTML='<div class="footer-inner"><span>Powered by <a href="https://QueryKey.com" rel="noopener" target="_blank">QueryKey Docs</a></span></div>';
    document.body.appendChild(f);
  }
}

function ensureBackToTop(){
  let btn = document.getElementById('back-to-top');
  if(btn) return;
  btn = document.createElement('button');
  btn.id='back-to-top';
  btn.className='back-to-top';
  btn.type='button';
  btn.title='Back to top';
  btn.textContent='↑ Top';
  document.body.appendChild(btn);
  btn.addEventListener('click',()=>{ document.querySelector('.doc-article')?.scrollTo({ top:0, behavior:'smooth' }); });
  const article = document.querySelector('.doc-article');
  if(article){
    article.addEventListener('scroll',()=>{
      const sc = article.scrollTop || 0; btn.classList.toggle('visible', sc > 240);
    }, { passive:true });
  }
}

/* ---------------- Events ---------------- */
searchForm.addEventListener('submit', e => { e.preventDefault(); performSearchUI(searchInput.value); });
searchInput.addEventListener('change', () => performSearchUI(searchInput.value));
searchInput.addEventListener('input', async () => {
  const q = searchInput.value.trim();
  if (!q) { clearHighlights(); searchMeta.hidden = true; hideSearchDropdown(); return; }
  // Build results and show dropdown
  const results = await search(q);
  showSearchDropdown(results, q);
});

// Keyboard navigation for dropdown
searchInput.addEventListener('keydown', e => {
  const open = dropdownEl && !dropdownEl.hidden;
  if(!open) return; // only intercept when open
  const items = Array.from(dropdownEl.querySelectorAll('.search-suggestion'));
  if (!items.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); activeResultIndex = (activeResultIndex + 1) % items.length; updateActive(items); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeResultIndex = (activeResultIndex - 1 + items.length) % items.length; updateActive(items); }
  else if (e.key === 'Enter') { if(activeResultIndex>=0){ e.preventDefault(); const a=items[activeResultIndex]; a.click(); hideSearchDropdown(); } }
  else if (e.key === 'Escape') { hideSearchDropdown(); }
});

function updateActive(items){
  items.forEach((el, i)=> el.classList.toggle('active', i===activeResultIndex));
  const el = items[activeResultIndex]; if(el) el.scrollIntoView({ block:'nearest' });
}
window.addEventListener('hashchange', handleRoute);
document.addEventListener('keydown', e=>{
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  if(['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  if(e.key === '/'){
    const input = document.getElementById('doc-search-input');
    if(input){ e.preventDefault(); input.focus(); }
    return;
  }
  if(e.key==='ArrowRight' || e.key==='PageDown' || e.key==='k'){ const n=document.getElementById('doc-page-next'); if(n){ e.preventDefault(); n.click(); } }
  if(e.key==='ArrowLeft' || e.key==='PageUp' || e.key==='j'){ const p=document.getElementById('doc-page-prev'); if(p){ e.preventDefault(); p.click(); } }
});

// Close dropdown when clicking outside
document.addEventListener('click', (evt)=>{
  const form = document.getElementById('doc-search-form');
  if(!form) return;
  if(!form.contains(evt.target)) hideSearchDropdown();
});

/* ---------------- Version Switching ---------------- */
async function loadVersions(){
  try {
    const res = await fetch(VERSIONS_INDEX_URL,{cache:'no-store'});
    const sel=document.getElementById('version-select');
    if(!sel) return; // no select element present in top bar; silently skip
    if(res.ok){
      const versions = await res.json(); // [{label, manifest}]
      if(Array.isArray(versions) && versions.length){
        sel.innerHTML='';
        versions.forEach(v=>{ const opt=document.createElement('option'); opt.value=v.manifest; opt.textContent=v.label; if(v.default) opt.selected=true; sel.appendChild(opt); });
        sel.addEventListener('change',async ()=>{
          MANIFEST_URL = sel.value || DEFAULT_MANIFEST_URL;
          manifest=null; slugMap=new Map(); indexBuilt=false; searchCache=[]; localStorage.removeItem(searchCacheVersionKey);
          await handleRoute();
        });
        return; // versions mode active
      }
    }
    // No top selector available or versions missing; nothing to do
  } catch {
    // If top selector is absent, ignore errors gracefully
  }
}

async function ensureManifestLoaded(){
  if(!manifest) await loadManifest();
}

// populateBookSelector removed: no top-bar book selection in this layout

/* ---------------- Print / Export ---------------- */
async function exportAllPages(){
  await loadManifest();
  const zipParts=[]; // naive: collect HTML strings
  for(const [slug, meta] of slugMap.entries()){
    if(meta.type==='page' || meta.type==='book'){
      const res=await fetch(`${CONTENT_ROOT}/${meta.file}`); if(!res.ok) continue;
      const raw=await res.text(); const { body }=extractFrontMatter(raw);
      const html=renderMarkdown(body);
      zipParts.push(`<!-- ${slug} -->\n<section id="${slug}">\n${html}\n</section>`);
    }
  }
  const blob=new Blob([`<html><head><meta charset='utf-8'><title>Docs Export</title></head><body>${zipParts.join('\n')}\n</body></html>`],{type:'text/html'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='docs-export.html'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),2000);
}
window.exportDocs = exportAllPages;

/* ---------------- Link Integrity Checker (Quick) ---------------- */
async function checkLinks(){
  const bad=[]; const seen=new Set();
  document.querySelectorAll('#doc-content a[href^="#/"]').forEach(a=>{ const slug=a.getAttribute('href').slice(2); if(!slugMap.has(slug)) bad.push(slug); seen.add(slug); });
  if(bad.length){ console.warn('[Docs] Broken slugs:', bad); }
  else console.info('[Docs] All local links valid');
}
window.checkDocLinks = checkLinks;

/* ---------------- Init ---------------- */
(async function init(){
  try {
  await loadVersions();
    await handleRoute();
  document.addEventListener('keydown',e=>{ if(e.key==='p' && (e.metaKey||e.ctrlKey)){ e.preventDefault(); exportAllPages(); }});
  // Theme initialization
  initThemeToggle();
  // Back to top button
  ensureBackToTop();
  } catch (e) {
    contentEl.innerHTML = `<h1>Initialization Error</h1><p>${escapeHTML(e.message)}</p>`;
  }
})();

/* ---------------- Theme Toggle ---------------- */
function initThemeToggle(){
  const btn=document.getElementById('theme-toggle');
  const densityBtn=document.getElementById('density-toggle');
  const printBtn=document.getElementById('print-export');
  const pdfBtn=document.getElementById('pdf-export');
  if(!btn) return;
  const root=document.documentElement;
  const LS_KEY='qkey-docs-theme';
  const preferred = localStorage.getItem(LS_KEY) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light':'dark');
  applyTheme(preferred);
  btn.addEventListener('click',()=>{
    const next = root.getAttribute('data-theme')==='light' ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem(LS_KEY,next);
  });
  // Density toggle (compact spacing toggle)
  if(densityBtn){
    densityBtn.addEventListener('click',()=>{
      document.documentElement.classList.toggle('compact-density');
    });
  }
  // Print export (continuous book HTML)
  if(printBtn){
    printBtn.addEventListener('click',()=>{
      const current = currentSlug();
      if(!current) return;
      const bookKey = current.split('/')[0];
      if(!docsContainer?.docs?.books?.[bookKey]) return;
      const html = buildContinuousBookHTML(bookKey, true, { forPrint:true });
      openPrintWindow(html); // user uses native print dialog
    });
  }
  // PDF export placeholder
  if(pdfBtn){
    pdfBtn.addEventListener('click',()=>{
      alert('PDF export not yet implemented. Use Print for now and choose "Save as PDF".');
    });
  }
  function applyTheme(mode){
    if(mode==='light') root.setAttribute('data-theme','light'); else root.removeAttribute('data-theme');
    btn.textContent = mode==='light' ? '🌑' : '🌙';
  }
}

function buildContinuousBookHTML(bookKey, includeStyles=false, opts={}){
  const bookObj = docsContainer?.docs?.books?.[bookKey];
  if(!bookObj) return '';
  const chapters = Object.entries(bookObj.chapters||{}).map(([k,v])=>({k,v,o:Number(v.order)||999})).sort((a,b)=> a.o===b.o? a.k.localeCompare(b.k): a.o-b.o);
  const parts=[];
  parts.push(`<h1>${escapeHTML(bookObj.title)}</h1>`);
  chapters.forEach(ch=>{
    parts.push(`<h2>${escapeHTML(ch.v.title||ch.k)}</h2>`);
    const pages = Object.entries(ch.v.pages||{}).map(([k,v])=>({k,v,o:Number(v.order)||999,t:v.title||k})).sort((a,b)=> a.o===b.o? a.t.localeCompare(b.t): a.o-b.o);
    pages.forEach(p=>{
    parts.push(`<article class=\"print-page\" data-slug=\"${bookKey}/${ch.k}/${p.k}\"><h3>${escapeHTML(p.v.title||p.k)}</h3>\n${renderMarkdown(p.v.body||'')}</article>`);
    });
  });
  const style = includeStyles ? `<style>
  body{font-family:Inter,system-ui,sans-serif;padding:34px 42px;max-width:920px;margin:0 auto;line-height:1.5;color:#111;background:#fff;}
  h1{margin:0 0 20px;font-size:38px;}
  h2{margin:70px 0 18px;font-size:26px;border-bottom:2px solid #333;padding-bottom:8px;page-break-after:avoid;}
  h3{margin:44px 0 14px;font-size:19px;page-break-after:avoid;}
  article.print-page{page-break-inside:avoid;margin:0 0 28px;}
  article.print-page:not(:last-child){page-break-after:always;}
  code,pre{background:#f2f4f7;}
  pre{padding:14px 16px;border:1px solid #ddd;border-radius:6px;overflow:auto;font-size:13px;}
  table{border-collapse:collapse;width:100%;margin:20px 0 30px;font-size:13px;}
  td,th{border:1px solid #bbb;padding:6px 10px;text-align:left;}
  a{color:#0645ad;text-decoration:none;}a:hover{text-decoration:underline;}
  mark{background:yellow;}
  @page{margin:16mm 14mm 18mm 14mm;}
  @media print { body{background:#fff;} }
  .print-footer{position:fixed;bottom:4mm;left:0;right:0;font-size:10px;text-align:center;color:#555;}
  </style>` : '';
  const autoPrint = opts.forPrint ? `<script>window.onload=function(){try{window.print();}catch(e){}}</script>` : '';
  return `<!DOCTYPE html><html><head><meta charset='utf-8'><title>${escapeHTML(bookObj.title)} – Export</title>${style}</head><body>${parts.join('\n')}<div class='print-footer'>Generated ${new Date().toISOString().split('T')[0]} – ${escapeHTML(bookObj.title)}</div>${autoPrint}</body></html>`;
}

function openPrintWindow(html){
  const w = window.open('', '_blank');
  if(!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function parseEndpointDirective(raw){
  // YAML-ish with support for: method, path, summary, stability, access, rate, tags, params/query (list), responses, samples
  const lines = raw.split(/\n/);
  const data = { query:[], params:[], responses:{}, samples:{}, tags:[] };
  let section = null; let buffer=[]; let currentResponse=null;
  const flushBuffer = ()=>{
    const consumeList = () => {
      buffer.forEach(l=>{
        const m = l.match(/^\s*-\s*(.+)$/); if(!m) return; const parts = m[1].split(/\s+\|\s+/); const row={};
        parts.forEach(p=>{ const kv=p.split(/:\s*/); if(kv.length>=2){ row[kv[0].trim()]=kv.slice(1).join(':').trim(); }});
        if(Object.keys(row).length){ if(section==='query') data.query.push(row); else if(section==='params') data.params.push(row); }
      });
    };
    if((section==='query'||section==='params') && buffer.length) consumeList();
    else if(section==='responses' && buffer.length && currentResponse){ data.responses[currentResponse] = buffer.join('\n').trim(); }
    // samples handled inline
    buffer=[]; currentResponse=null; section=null;
  };
  lines.forEach(line=>{
    if(/^\s*$/.test(line)) { buffer.push(line); return; }
    if(/^query:\s*$/.test(line)){ flushBuffer(); section='query'; return; }
    if(/^params:\s*$/.test(line)){ flushBuffer(); section='params'; return; }
    if(/^responses:\s*$/.test(line)){ flushBuffer(); section='responses'; return; }
    if(/^samples:\s*$/.test(line)){ flushBuffer(); section='samples'; return; }
    if(section==='responses'){
      const rm = line.match(/^\s*(\d{3}):\s*$/); if(rm){ flushBuffer(); section='responses'; currentResponse=rm[1]; return; }
    }
    if(section==='samples'){
      const sm=line.match(/^\s*(\w+):\s*\|?\s*$/); if(sm){ const key=sm[1]; flushBuffer(); section='samples'; data.samples[key]=''; return; }
      const keys=Object.keys(data.samples); if(keys.length){ data.samples[keys[keys.length-1]] += (data.samples[keys[keys.length-1]]?'\n':'') + line.replace(/^\s{2,}/,''); }
      return;
    }
    if(section==='query' || section==='params' || section==='responses'){ buffer.push(line); return; }
    const km = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)$/);
    if(km){
      const k = km[1]; let v = km[2];
      if(/^["'].*["']$/.test(v)) v=v.slice(1,-1);
      if(k==='tags'){ data.tags = v.replace(/[\[\]]/g,'').split(/[,_\s]+/).filter(Boolean); }
      else data[k]=v;
    }
  });
  flushBuffer();
  return data;
}

function renderEndpoint(data){
  if(!data.method || !data.path) return `<div class="endpoint-block error">Missing method/path in endpoint block</div>`;
  const id = `ep-${data.method.toLowerCase()}-${data.path.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')}`;
  const stability = data.stability ? `<span class="ep-badge stability ${data.stability.toLowerCase()}">${data.stability.toUpperCase()}</span>`:'';
  const access = data.access ? `<span class="ep-badge access ${data.access.toLowerCase()}">${data.access.toUpperCase()}</span>`:'';
  const rate = data.rate || data.rateBucket ? `<span class="ep-badge rate">Rate: ${escapeHTML(data.rate || data.rateBucket)}</span>`:'';
  const summary = data.summary? `<p class="ep-summary">${escapeHTML(data.summary)}</p>`:'';
  const booster = `<span class="ep-search-booster" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">${escapeHTML((data.method+' '+data.path+' '+(data.tags||[]).join(' ')).toLowerCase())}</span>`;
  const makeTable = (rows, title) => rows && rows.length ? `<details class="ep-params"><summary>${title}</summary><table><thead><tr><th>Name</th><th>In</th><th>Type</th><th>Req</th><th>Description</th></tr></thead><tbody>${rows.map(r=>`<tr><td><code>${escapeHTML(r.name||'')}</code></td><td>${escapeHTML(r.in||'')}</td><td>${escapeHTML(r.type||'')}</td><td>${/true|yes|required/i.test(r.required||'')?'Yes':'No'}</td><td>${escapeHTML(r.description||'')}</td></tr>`).join('')}</tbody></table></details>`:'';
  const queryHTML = makeTable(data.query, 'Query Parameters');
  const paramsHTML = makeTable(data.params, 'Parameters');
  const samplesKeys = Object.keys(data.samples||{});
  const samplesHTML = samplesKeys.length ? `<div class="code-tabs"><div class="code-tab-bar" role="tablist">${samplesKeys.map((k,i)=>`<button type="button" class="code-tab${i===0?' active':''}" data-tab-target="${id}-sample-${k}" role="tab" aria-selected="${i===0?'true':'false'}">${k}</button>`).join('')}</div>${samplesKeys.map((k,i)=>`<div id="${id}-sample-${k}" class="code-tab-panel${i===0?' active':''}" role="tabpanel"><pre><code>${escapeHTML(data.samples[k])}</code></pre></div>`).join('')}</div>` : '';
  const responsesKeys = Object.keys(data.responses||{});
  const responsesHTML = responsesKeys.length ? `<details class="ep-responses"><summary>Responses (${responsesKeys.length})</summary>${responsesKeys.map(code=>`<div class="ep-response"><div class="ep-response-code">${code}</div><pre><code>${escapeHTML(data.responses[code])}</code></pre></div>`).join('')}</details>`:'';
  const tags = (data.tags||[]).length? `<div class="ep-tags">${data.tags.map(t=>`<span class="ep-tag">${escapeHTML(t)}</span>`).join('')}</div>`:'';
  return `<section class="endpoint-block" id="${id}" data-method="${escapeHTML(data.method)}" data-path="${escapeHTML(data.path)}">`+
    `<header><h3><span class="method ${data.method.toLowerCase()}">${data.method.toUpperCase()}</span> <code class="ep-path">${escapeHTML(data.path)}</code></h3><div class="ep-badges">${stability}${access}${rate}</div>${booster}</header>`+
    summary+paramsHTML+queryHTML+samplesHTML+responsesHTML+tags+
  `</section>`;
}

// Extend markdown parser to transform endpoint directives before normal parsing
const ENDPOINT_BLOCK_RE = /:::\s*endpoint\n([\s\S]*?)\n:::/g;
function transformEndpointDirectives(md){
  return md.replace(ENDPOINT_BLOCK_RE,(m,body)=>{ const data=parseEndpointDirective(body); return renderEndpoint(data); });
}

/* ================= Schema Directive ================= */
// Syntax example:
// ::: schema
// name: Case
// summary: Primary case object
// fields:
//   - name: id | type: string | required: true | description: Unique ID
//   - name: status | type: enum[open,closed] | description: Workflow status
// examples:
//   json: |
//     { "id":"case_123", "status":"open" }
// relations:
//   - name: collection | type: Collection | cardinality: many-to-one | description: Parent collection
// :::
const SCHEMA_BLOCK_RE = /:::\s*schema\n([\s\S]*?)\n:::/g;

function parseSchemaDirective(raw){
  const lines = raw.split(/\n/);
  const data = { fields:[], relations:[], examples:{} };
  let section=null; let currentExample=null;
  lines.forEach(line=>{
    if(/^\s*$/.test(line)) return;
    if(/^fields:\s*$/.test(line)){ section='fields'; return; }
    if(/^relations:\s*$/.test(line)){ section='relations'; return; }
    if(/^examples:\s*$/.test(line)){ section='examples'; return; }
    if(section==='examples'){
      const exm = line.match(/^\s*(\w+):\s*\|?\s*$/);
      if(exm){ currentExample=exm[1]; data.examples[currentExample]=''; return; }
      if(currentExample){ data.examples[currentExample] += (data.examples[currentExample]?'\n':'') + line.replace(/^\s{2,}/,''); }
      return;
    }
    if(section==='fields' || section==='relations'){
      const fm = line.match(/^\s*-\s*(.+)$/); if(!fm) return;
      const obj={}; fm[1].split(/\s+\|\s+/).forEach(seg=>{ const kv=seg.split(/:\s*/); if(kv.length>=2){ obj[kv[0].trim()]=kv.slice(1).join(':').trim(); }});
      if(Object.keys(obj).length){ (section==='fields'? data.fields : data.relations).push(obj); }
      return;
    }
    const km = line.match(/^([a-zA-Z_][\w-]*):\s*(.+)$/); if(km){ let v=km[2]; if(/^['"].*['"]$/.test(v)) v=v.slice(1,-1); data[km[1]]=v; }
  });
  return data;
}

function renderSchema(data){
  if(!data.name) return '<div class="schema-block error">Missing schema name</div>';
  const id = 'schema-'+data.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const summary = data.summary? `<p class="schema-summary">${escapeHTML(data.summary)}</p>`:'';
  const fieldsTable = data.fields.length ? `<details class="schema-fields"><summary>Fields (${data.fields.length})</summary><table><thead><tr><th>Name</th><th>Type</th><th>Req</th><th>Description</th></tr></thead><tbody>${data.fields.map(f=>`<tr><td><code>${escapeHTML(f.name||'')}</code></td><td>${escapeHTML(f.type||'')}</td><td>${/true|yes|required/i.test(f.required||'')?'Yes':'No'}</td><td>${escapeHTML(f.description||'')}</td></tr>`).join('')}</tbody></table></details>`:'';
  const relationsTable = data.relations.length ? `<details class="schema-relations"><summary>Relations (${data.relations.length})</summary><table><thead><tr><th>Name</th><th>Type</th><th>Cardinality</th><th>Description</th></tr></thead><tbody>${data.relations.map(r=>`<tr><td><code>${escapeHTML(r.name||'')}</code></td><td>${escapeHTML(r.type||'')}</td><td>${escapeHTML(r.cardinality||'')}</td><td>${escapeHTML(r.description||'')}</td></tr>`).join('')}</tbody></table></details>`:'';
  const examplesKeys = Object.keys(data.examples||{});
  const examplesHTML = examplesKeys.length ? `<div class="schema-examples"><div class="code-tabs"><div class="code-tab-bar" role="tablist">${examplesKeys.map((k,i)=>`<button type="button" class="code-tab${i===0?' active':''}" data-tab-target="${id}-ex-${k}" role="tab" aria-selected="${i===0?'true':'false'}">${k}</button>`).join('')}</div>${examplesKeys.map((k,i)=>`<div id="${id}-ex-${k}" class="code-tab-panel${i===0?' active':''}" role="tabpanel"><pre><code>${escapeHTML(data.examples[k])}</code></pre></div>`).join('')}</div></div>`:'';
  const booster = `<span class="schema-search-booster" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">schema ${escapeHTML((data.name+' '+(data.fields.map(f=>f.name).join(' '))).toLowerCase())}</span>`;
  return `<section class="schema-block" id="${id}"><header><h3><span class="schema-name">${escapeHTML(data.name)}</span></h3>${booster}</header>${summary}${fieldsTable}${relationsTable}${examplesHTML}</section>`;
}

function transformSchemaDirectives(md){
  return md.replace(SCHEMA_BLOCK_RE,(m,body)=>{ const data=parseSchemaDirective(body); return renderSchema(data); });
}

// Patch original renderMarkdown pipeline using placeholders so directive HTML isn't escaped by the markdown parser
const _originalRenderMarkdown = renderMarkdown;
function preprocessDirectivesToPlaceholders(md){
  const stash = [];
  let idx = 0;
  const replaceEndpoint = (m, body)=>{
    const html = renderEndpoint(parseEndpointDirective(body));
    const key = `@@DIR_E_${idx++}@@`;
    stash.push({ key, html });
    return `\n\n${key}\n\n`;
  };
  const replaceSchema = (m, body)=>{
    const html = renderSchema(parseSchemaDirective(body));
    const key = `@@DIR_S_${idx++}@@`;
    stash.push({ key, html });
    return `\n\n${key}\n\n`;
  };
  const out = md
    .replace(ENDPOINT_BLOCK_RE, replaceEndpoint)
    .replace(SCHEMA_BLOCK_RE, replaceSchema);
  return { md: out, stash };
}

renderMarkdown = function(md){
  const { md: pre, stash } = preprocessDirectivesToPlaceholders(md);
  let html = _originalRenderMarkdown(pre);
  // Unwrap placeholders possibly wrapped in <p> tags
  for(const { key, html: frag } of stash){
    const paraRE = new RegExp(`<p>\\s*${key}\\s*<\\/p>`, 'g');
    if(paraRE.test(html)){
      html = html.replace(paraRE, frag);
    } else {
      html = html.replaceAll(key, frag);
    }
  }
  return html;
};


function initCodeTabs(ctx){
  (ctx||document).querySelectorAll('.code-tabs').forEach(ct=>{
    if(ct.dataset.bound) return; ct.dataset.bound='1';
    const tabs = ct.querySelectorAll('.code-tab');
    tabs.forEach(tab=>{
      tab.addEventListener('click',()=>{
        const target = tab.getAttribute('data-tab-target');
        const group = ct;
        group.querySelectorAll('.code-tab').forEach(t=>{ t.classList.toggle('active', t===tab); t.setAttribute('aria-selected', t===tab?'true':'false'); });
        group.querySelectorAll('.code-tab-panel').forEach(p=> p.classList.toggle('active', p.id===target));
      });
    });
  });
  // Add copy buttons
  (ctx||document).querySelectorAll('.code-tab-panel pre').forEach(pre=>{
    if(pre.querySelector('.copy-btn')) return;
    const btn=document.createElement('button'); btn.className='copy-btn'; btn.type='button'; btn.textContent='Copy';
    btn.addEventListener('click',()=>{
      const code = pre.querySelector('code');
      const text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(()=>{ btn.textContent='Copied'; setTimeout(()=>btn.textContent='Copy',1800); });
    });
    pre.appendChild(btn);
  });
}

// After each page render, initialize tab behavior by hooking into existing renderSlug success path
const _origRenderSlug = renderSlug;
renderSlug = async function(slug){ await _origRenderSlug(slug); try { initCodeTabs(contentEl); enhanceCodeBlocks(contentEl); ensureBackToTop(); } catch {} };

function enhanceCodeBlocks(ctx){
  const scope = ctx || document;
  const blocks = Array.from(scope.querySelectorAll('pre'));
  blocks.forEach(pre=>{
    if(pre.dataset.enhanced) return;
    pre.dataset.enhanced = '1';
    const code = pre.querySelector('code');
    // Language label
    if(code){
      let langMatch = (code.className||'').match(/language-([a-z0-9+#]+)/i);
      if(!langMatch){
        // Try to guess and set class so label + syntax styling works
        const guess = (function(){
          const t = (code.textContent||'').trim();
          const h = t.slice(0,200).toLowerCase();
          if((h.startsWith('{')||h.startsWith('['))){ try{ JSON.parse(t); return 'json'; } catch{} if(/:\s*"|\{|\[/.test(h)) return 'json'; }
          if(/^\$?\s*(curl|wget|export|sudo|npm|pnpm|yarn|brew|apt|apk)\b/m.test(h)) return 'sh';
          if(/^[a-z0-9_\-]+:\s/m.test(h) && !/[;{}]/.test(h)) return 'yaml';
          if(/^(import|export)\s|require\(|=>|const\s|let\s|function\s/m.test(h)) return 'js';
          if(/^(get|post|put|patch|delete)\s+\//i.test(h)) return 'http';
          return '';
        })();
        if(guess){ code.classList.add(`language-${guess}`); langMatch = [null, guess]; }
      }
      if(langMatch && !pre.querySelector('.code-lang-label')){
        const lab = document.createElement('span');
        lab.className='code-lang-label';
        lab.textContent = langMatch[1].toUpperCase();
        pre.appendChild(lab);
      }
    }
    // Copy button (add if not present)
    if(!pre.querySelector('.copy-btn')){
      const btn=document.createElement('button');
      btn.className='copy-btn'; btn.type='button'; btn.textContent='Copy';
      btn.addEventListener('click',()=>{ navigator.clipboard.writeText(pre.textContent).then(()=>{ btn.textContent='Copied'; setTimeout(()=>btn.textContent='Copy',1800); }); });
      pre.appendChild(btn);
    }
    // Wrap toggle
    if(!pre.querySelector('.code-wrap-btn')){
      const w=document.createElement('button');
      w.className='code-wrap-btn'; w.type='button'; w.title='Toggle line wrap'; w.textContent='Wrap';
      w.addEventListener('click',()=>{ pre.classList.toggle('wrap-lines'); });
      pre.appendChild(w);
    }
    // Expand toggle (only if tall)
    const needsCollapse = pre.scrollHeight > 380;
    if(needsCollapse){ pre.classList.add('code-collapsed'); }
    if(!pre.querySelector('.code-expand-btn')){
      const x=document.createElement('button');
      x.className='code-expand-btn'; x.type='button'; x.title='Expand code'; x.textContent='Expand';
      x.addEventListener('click',()=>{
        const wasCollapsed = pre.classList.toggle('code-collapsed');
        x.textContent = wasCollapsed ? 'Expand' : 'Collapse';
      });
      if(needsCollapse) x.textContent = 'Expand'; else x.hidden = true;
      pre.appendChild(x);
    }
  });
}

/* ---------------- Endpoint Directive Self-Test (Dev Utility) ---------------- */
function _testEndpointDirective(){
  const sample=`::: endpoint\nmethod: GET\npath: /_health\nsummary: Health check\nstability: stable\naccess: public\n:::`;
  const transformed = transformEndpointDirectives(sample);
  const ok = /endpoint-block/.test(transformed) && /GET/.test(transformed) && /_health/.test(transformed);
  return { ok, transformed };
}
window.qkeyDocsTest = Object.assign(window.qkeyDocsTest||{}, { endpointDirective: _testEndpointDirective });
window.qkeyDocsTest.schemaDirective = function(){
  const sample = `::: schema\nname: Sample\nsummary: Example schema\nfields:\n  - name: id | type: string | required: true | description: Identifier\nrelations:\n  - name: parent | type: Sample | cardinality: many-to-one | description: Parent link\nexamples:\n  json: |\n    { \"id\": \"x\" }\n:::`;
  const transformed = transformSchemaDirectives(sample);
  const ok = /schema-block/.test(transformed) && /Sample/.test(transformed);
  return { ok, transformed };
};
