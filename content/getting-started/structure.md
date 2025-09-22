---
title: Content Structure
order: 3
---

## Organizing Your Documentation

Qkey Docs Engine organizes content in a hierarchical structure:

### Books
Books are top-level containers for related documentation. Each book should have its own directory under `content/`.

### Chapters
Chapters group related pages within a book. Use subdirectories to organize chapters.

### Pages
Individual Markdown files that contain your documentation content.

## Example Structure

```text
content/
├── getting-started/
│   ├── README.md          # Book overview
│   ├── installation.md    # Page
│   └── api/
│       ├── README.md      # Chapter overview
│       └── endpoints.md   # Page
└── advanced/
    └── README.md          # Another book
```

## Front Matter

Add metadata to your pages using YAML front matter:

```yaml
---
title: Custom Page Title
order: 1
chapter: Getting Started
---
```

Available options:
- `title`: Page title (defaults to filename)
- `order`: Sort order (lower numbers first)
- `chapter`: Chapter grouping hint
- `author`: Page author (shown in footer)