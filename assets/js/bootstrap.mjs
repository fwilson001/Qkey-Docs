// Bootstraps the docs page: ensures docs.qdoc is (re)built server-side,
// then loads the runtime module. Shows a loader while building.

async function rebuildDocsIfSupported() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 120000); // 120s safety
  const endpoint = '/__docs/rebuild';
  try {
    const res = await fetch(endpoint, { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json' } });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    if (data?.status === 'rebuilt' || data?.status === 'skipped') {
      return data;
    }
  } catch (e) {
    // Silently continue if endpoint missing (static hosting) or CORS blocked
    console.warn('[docs] rebuild endpoint unavailable, continuing:', e.message);
  }
  return { status: 'skipped' };
}

async function loadRuntime() {
  // Dynamically import the docs runtime after rebuild completes
  try {
    await import('./qkey-docs.mjs');
  } catch (e) {
    console.error('[docs] failed to load runtime', e);
    const container = document.getElementById('doc-content');
    if (container) {
      container.innerHTML = `<div class="doc-error" style="padding:32px;color:#fff;max-width:640px;margin:40px auto;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
        <h2 style="margin-top:0;color:#ffb4b4;font-size:20px;">Documentation Viewer Failed to Load</h2>
        <p>The dynamic documentation module couldn't be loaded. This can happen if:</p>
        <ul style="margin:0 0 16px 20px;list-style:disc;">
          <li>A network or caching issue blocked the module</li>
          <li>The build step hasn't generated required assets yet</li>
          <li>You are viewing a stale service worker cached version</li>
        </ul>
        <p><strong>Try:</strong> Hard refreshing (Shift+Reload) or clearing cache. If running locally ensure build scripts completed.</p>
        <p style="opacity:.7;font-size:13px;">Error: ${e.message}</p>
      </div>`;
    }
    // Keep loader hidden even on failure
    hideLoader();
  }
}

function hideLoader() {
  const el = document.getElementById('page-loader');
  if (el) el.style.display = 'none';
}

function showLoaderMsg(msg) {
  const el = document.getElementById('page-loader');
  if (!el) return;
  const label = el.querySelector('div:last-child');
  if (label) label.textContent = msg;
}

(async () => {
  try {
    showLoaderMsg('Building documentation…');
    await rebuildDocsIfSupported();
    showLoaderMsg('Loading…');
    // Small delay to allow filesystem to settle on some hosts
    await new Promise(r => setTimeout(r, 150));
    await loadRuntime();
  } catch (err) {
    console.error('[docs] bootstrap fatal', err);
  } finally {
    hideLoader();
  }
})();
