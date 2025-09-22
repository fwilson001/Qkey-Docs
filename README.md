# @querykey/qkey-docs-engine

A lightweight, dynamic documentation engine that transforms Markdown content into portable documentation containers with a polished, accessible runtime viewer.

## Features

- **Container Format**: Aggregate multiple Markdown books into a single portable `.qdoc` file
- **Runtime Viewer**: Fast, accessible documentation viewer with search, navigation, and keyboard shortcuts
- **CLI Tool**: Simple command-line interface for building documentation
- **Zero Dependencies**: Built with Node.js built-ins only
- **Accessible**: WCAG-compliant with keyboard navigation and screen reader support

## Quick Start

### Installation

```bash
npm install @querykey/qkey-docs-engine --save-dev
```

### Build Documentation

1. Create a `content/` directory with your Markdown files
2. Run the build command:

```bash
npx docs-build
```

This creates a `docs.qdoc` file containing all your documentation.

### Serve Documentation

```javascript
import { loadContainer, buildNavModel, attachSearch } from '@querykey/qkey-docs-engine/runtime';

// Load the documentation container
await loadContainer('./docs.qdoc');

// Build navigation model
const nav = buildNavModel();

// Attach search functionality
const input = document.querySelector('#search-input');
const form = document.querySelector('#search-form');
attachSearch({
  input,
  form,
  navigate: (slug) => { location.hash = '#/' + encodeURIComponent(slug); }
});
```

## Content Structure

Organize your documentation as books → chapters → pages:

```
content/
├── book1/
│   ├── README.md          # Book overview
│   ├── getting-started.md # Page
│   └── api/
│       ├── README.md      # Chapter overview
│       ├── endpoints.md   # Page
│       └── schemas.md     # Page
└── book2/
    └── README.md
```

## License

GPL-3.0-or-later

Copyright (c) 2025 Qkey Docs Team
