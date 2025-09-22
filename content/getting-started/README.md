---
title: Getting Started
order: 1
---

# Getting Started

Welcome to your documentation! This is a starter book to help you get familiar with the Qkey Docs Engine.

## What is Qkey Docs Engine?

Qkey Docs Engine is a lightweight documentation system that transforms Markdown content into portable, searchable documentation containers. It features:

- **Container Format**: Bundle multiple books into a single `.qdoc` file
- **Runtime Viewer**: Fast, accessible documentation with search and navigation
- **Zero Dependencies**: Built with Node.js built-ins only
- **CLI Tool**: Simple command-line interface for building

## Quick Start

1. **Install the package:**
   ```bash
   npm install @querykey/qkey-docs-engine --save-dev
   ```

2. **Create your content structure:**
   ```
   content/
   ├── your-book/
   │   ├── README.md          # Book overview
   │   └── page.md            # Documentation page
   ```

3. **Build your documentation:**
   ```bash
   npx docs-build
   ```

4. **Serve your docs:**
   ```javascript
   import { loadContainer, buildNavModel } from '@querykey/qkey-docs-engine/runtime';
   await loadContainer('./docs.qdoc');
   ```

## Next Steps

- [Installation Guide](installation.md) - Detailed setup instructions
- [Content Structure](structure.md) - How to organize your documentation
- [API Reference](api.md) - Programmatic usage examples