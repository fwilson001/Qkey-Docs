# Qkey Documentation Engine — Authoring & Packaging Guide

The Qkey Doc system uses the Qkey Documentation Format v1.0. It's a lightweight runtime and build toolchain that turns a directory of Markdown into a single portable container (`docs.qdoc`) and renders it with a polished, accessible UI. This engine is published as an npm package for reuse across projects and systems.

This guide explains how to structure your content (books → chapters → pages), author Markdown with optional directives, and use the engine in development and packaging scenarios.y Documentation Engine — Authoring & Packaging Guide

The Qkey Doc system uses the Qkey Documentation Format v1.0, created by the QueryKey Research Team. It’s a lightweight runtime and build toolchain that turns a directory of Markdown into a single portable container (`docs.qdoc`) and renders it with a polished, accessible UI. This engine will be published as an npm package to reuse across Qkey Cases and other systems.

This guide explains how to structure your content (books → chapters → pages), author Markdown with optional directives, and use the engine in development and packaging scenarios.

---

## 1) What’s in the box

- Content root: `content/`
- Build tools: `tools/build-docs-container.mjs`, `tools/build-docs-manifest.mjs`
- Runtime: `assets/js/qkey-docs.mjs` + `assets/css/qkey-theme.css`
- Artifacts: `docs.qdoc` (preferred) or `docs-manifest.json`

The runtime loads the container/manifest, builds a left navigation for Books/Chapters/Pages, a Topics section (in-page TOC), search with typeahead, breadcrumbs, keyboard navigation, and an optional page rating widget. No external network calls are required at runtime.

---

## 2) How to format your documentation

Think in three layers: Book → Chapter → Page.

- Book = folder under `content/` (e.g., `content/mybook`)
- Chapter = a logical group of pages within a book
- Page = a single `.md` file (topic)

At minimum, each Book must have a `README.md` (or `index.md`) which becomes the Book overview page.

Example:

```text
content/
	mybook/
		README.md            # Book overview
		getting-started.md   # Page
		chapter-1/           # Optional: organize by subfolders if desired
			README.md          # Chapter overview (optional)
			topic-a.md         # Page
			topic-b.md         # Page

	anotherbook/
		README.md
		concepts.md
```

Front-matter (optional) goes at the top of markdown files between `---` lines:

```yaml
---
title: Custom Page Title
order: 1
chapter: Getting Started       # optional grouping hint (builder-dependent)
chapterOrder: 1                # optional ordering within the book
author: Jane Doe               # used by runtime in page footer
---
```

Notes:

- `title`: Overrides the page title.
- `order`: Sorts pages within their container (lower comes first).
- `chapter`/`chapterOrder`: Optional hints used by builders that perform grouping; if not used, the container/build may group or inject an Introduction chapter automatically.
- `author`: Displayed in the footer when available.

---

## 3) Authoring Markdown that “just works”

Supported syntax and conventions:

- Headings: `#`, `##`, `###` are used for the Topics section (TOC). H2/H3 become collapsible “topic” sections:
	- The header stays visible; clicking the toggle hides/shows only the section body.
	- Sections are closed by default. The chevron on the button indicates state.
	- Deep‑linking to a heading is supported; links look like `#/<slug>?h=<heading-id>`.
- Admonitions (tips/notes/warnings):
	```
	::: tip
	This is a tip.
	:::

	::: warning
	Be careful!
	:::
	```
- Code blocks: triple backticks with language label for styling:
		```js
		console.log('hello');
		```
	The runtime adds Copy, Wrap, and Expand controls automatically.

---

## 4) Qkey directives (inline blocks)

Directives let you embed structured UI directly from Markdown.

### Endpoint directive

```
::: endpoint
method: GET
path: /api/v1/users/{id}
summary: Get user details
stability: stable
access: public
rate: 100/min
tags: [users, read]
params:
	- name: id | in: path | type: string | required: true | description: User ID
query:
	- name: include | in: query | type: string | description: Optional expansions
responses:
	200:
		{
			"id": "user_123",
			"name": "John Doe",
			"email": "john@example.com"
		}
samples:
	curl: |
		curl -H "Authorization: Bearer $TOKEN" https://api.example.com/v1/users/user_123
:::
```

The engine renders a full endpoint panel with badges, parameters, responses, and tabbed samples.

### Schema directive

```
::: schema
name: User
summary: User account object
fields:
	- name: id | type: string | required: true | description: Unique user ID
	- name: status | type: enum[active,inactive] | description: Account status
relations:
	- name: organization | type: Organization | cardinality: many-to-one | description: Parent organization
examples:
	json: |
		{ "id":"user_123", "name":"John Doe", "email":"john@example.com" }
:::
```

The engine renders a schema panel with tables for fields/relations and tabbed examples.

---

## 5) Navigation & UX features

- Books selector (left): Switch across books in the container.
- Chapters: Collapsible with chevrons; state persists per book.
- Topics (page TOC): Built from H1–H3. H2/H3 are collapsible by default.
- Breadcrumbs: Show where you are.
- Search: Typeahead dropdown + in-page highlighting; press `/` to focus the search field.
- Page rating: “Rate this page” widget at the bottom with local fallback.
- Keyboard:
	- `/` focuses search
	- ArrowRight / PageDown / `k` → next page
	- ArrowLeft / PageUp / `j` → previous page
- Print/Export: In the UI or with the built-in export; use the browser’s “Save as PDF”.
- Deep links to headings: Copy link from the anchor icon; URL includes `?h=<heading-id>` and auto-expands/scrolls on load.

---

## 5.1) Auto-generated pages policy (builder)

To keep books readable and avoid redundancy, the builder follows these rules when generating helper pages:

- Book Introduction page
	- Suppressed if your book has a meaningful `README.md`/`index.md` body. In that case, the README serves as the book’s introduction/overview.
	- If no meaningful body exists, an auto “Introduction” page is inserted into the first chapter at order 0.

- Chapter Overview page
	- Only auto-added when a chapter contains more than one page. Chapters with a single page don’t need an overview.
	- The generated title avoids duplication (e.g., won’t produce “Overview Overview”).

- Author page
	- If no author page exists, an “Author” page is added at a very high order so it appears at the end. You can override author via front‑matter.

Tip: You can always provide explicit overview/intro pages when needed; the builder will skip auto‑generation if a real page already exists.

---

## 6) Building the documentation

### Development (auto-build)
The runtime can auto-build a container from `content/` at load time (where environment/server supports directory listing). This is convenient for quick iteration.

### Manual build (recommended for release)
Use the provided tools:

```bash
node tools/build-docs-container.mjs
node tools/build-docs-manifest.mjs
```

Place `docs.qdoc` and/or `docs-manifest.json` in the `docs/` folder served by your app.

---

## 7) Packaging for reuse (npm)

When consumed as an npm package (`@querykey/qkey-docs-engine`):

```bash
npm install @querykey/qkey-docs-engine --save-dev
```

Programmatic usage:

```js
import { loadContainer, buildNavModel, attachSearch } from '@querykey/qkey-docs-engine/runtime';
await loadContainer('/path/to/docs.qdoc');
const nav = buildNavModel();
const input = document.querySelector('#doc-search-input');
const form  = document.querySelector('#doc-search-form');
attachSearch({ input, form, navigate: (slug) => { location.hash = '#/' + encodeURIComponent(slug); } });
```

CLI usage:

```bash
npx docs-build
```

Outputs `docs.qdoc` by scanning `./content` in the current working directory.

---

## 8) Best practices for authors

- One concept per page; keep titles short and descriptive.
- Use `order` front‑matter to control page order.
- Start each book with `README.md` or `index.md`.
- Prefer H2/H3 for “topic sections” inside a page. The engine will make them collapsible.
- Use directives for APIs and schemas to keep docs and code in sync.
- Public content policy: never reference internal development documents (e.g., files under `docs/`). Summarize what users need directly on the page.
- Toggle defaults: Chapters and endpoint/schema details are default-closed; H2/H3 topic sections are open-by-default; deep links auto-expand the target section.

---

## 8.1) Authoring standards: code fences & preflight

To ensure consistent, copyable code boxes with labels, always use fenced code blocks with a language tag. The builder runs a preflight that warns when a code fence is missing a language tag (or is tagged as `text`).

Required language tags

- json — API request/response bodies, JSON examples
- sh — shell commands (curl, export, npm, brew, etc.)
- js / ts — JavaScript / TypeScript snippets
- yaml — config files or directive-like examples
- http — HTTP examples like `GET /cases` or base URLs
- txt — plain text that you still want boxed (use instead of `text`)

Style rules

- Don’t end code blocks with sentence punctuation inside the fence; keep periods outside.
- Avoid prompts (`$`) unless they’re part of the example. Prefer copyable commands.
- Prefer `jsonc` only when comments are intentionally included in JSON-like examples.

Examples

```json
{ "id": "case_123", "status": "open" }
```

```sh
curl -sS -H "Authorization: Bearer $API_KEY" \
	-H "Content-Type: application/json" \
	-d @user.json https://api.example.com/v1/users
```

```js
import { APIClient } from '@example/client'
const client = new APIClient({ apiKey: process.env.API_TOKEN })
const results = await client.search({ q: 'active', type: 'user' })
```

Builder preflight

- During `node tools/build-docs-container.mjs`, the preflight scans all Markdown files and prints warnings like:
	- `Preflight: 2 code fence(s) without language tag across 2 file(s).`
	- `- api.md: 1 fence(s) missing tag [line 11 (suggest: http)]`
- Fix by adding an appropriate language after the opening backticks: e.g., change ``` to ```json.
- The runtime will attempt to guess a language if missing, but authors should still tag fences to keep builds clean.

---

## 9) Troubleshooting

- Missing content? Verify folder names and `.md` extensions.
- Ordering off? Check the `order` fields and filenames.
- Directives not rendering? Ensure the block fences match exactly (`::: endpoint` / `::: schema`).
- Search empty? Type a term that exists; results are token-based and ranked by frequency.

---

## 10) License

GPL-3.0-or-later

Copyright (c) 2025 Farrel Wilson, CEO QueryKey.com

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
