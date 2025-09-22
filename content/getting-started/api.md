---
title: API Reference
order: 4
---

## Programmatic Usage

### Loading Documentation

```javascript
import { loadContainer } from '@querykey/qkey-docs-engine/runtime';

await loadContainer('./docs.qdoc');
```

### Building Navigation

```javascript
import { buildNavModel } from '@querykey/qkey-docs-engine/runtime';

const nav = buildNavModel();
// Returns navigation structure for UI rendering
```

### Adding Search

```javascript
import { attachSearch } from '@querykey/qkey-docs-engine/runtime';

const input = document.querySelector('#search-input');
const form = document.querySelector('#search-form');

attachSearch({
  input,
  form,
  navigate: (slug) => {
    location.hash = '#/' + encodeURIComponent(slug);
  }
});
```

### Building Content

```javascript
import { buildContainer } from '@querykey/qkey-docs-engine/build';

await buildContainer({
  contentDir: './content',
  outputFile: './docs.qdoc'
});
```

## CLI Usage

Build documentation from the command line:

```bash
npx docs-build
```

This scans `./content` and generates `./docs.qdoc`.
