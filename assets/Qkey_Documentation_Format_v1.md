# Qkey Documentation Format – Version 1.0

> Specification for authoring, aggregating, validating, packaging, and loading Qkey product documentation without JSON artifacts. All structures conform to Qkey styled blocks and container syntax, mirroring UnifiedQKeyEngine normalization principles.

---
## 1. Design Goals

* **Deterministic Structure**: Books → Chapters → Pages. No runtime guessing.
* **Single Source of Truth**: Aggregated container file (`docs.qdoc`) optionally derived from per‑page sources; both human readable.
* **Zero JSON**: No JSON manifests or indexes. All metadata encoded as Qkey blocks.
* **Fast Client Runtime**: Loader consumes prebuilt container; minimal parsing.
* **Integrity & Validation**: Build step enforces ordering, uniqueness, link correctness, and required metadata.
* **Extensible Directives**: Structured admonitions, examples, API refs, variables.
* **Versionable**: Parallel version folders with a `@docversions` descriptor.
* **Future Safety**: Reserved blocks defined now to prevent collisions.

---
## 2. Authoring Units

Two source modes are supported:

1. **Per‑Page Files** (`*.qdoc` or `*.md` with `@docmeta` block) – recommended during authoring.
2. **Aggregated Container** (`docs.qdoc`) – build artifact consumed by runtime; may also be hand‑edited for small sets.

### 2.1 Page File Layout

```qdoc
@docmeta {
  book: "backup"           // required (folder-like logical group)
  chapter: "introduction"   // required (sub grouping inside book)
  title: "Getting Started"  // required (display)
  order: 10                  // required (numeric ordering within chapter)
  versionIntroduced: "1.0"  // required (semver string)
  status: "published"       // enum: draft|published|deprecated
  tags: ["core","beginner"] // optional
  deprecated: false          // optional (if true supply replacedBy)
  replacedBy: "advanced/setup" // optional slug (book/chap/page)
  audience: "user"          // enum: user|dev|internal (optional)
}

# Getting Started

Intro paragraph...

::: tip
Remember to configure encryption early.
:::

## Install
Steps...

[[backup/advanced/config#encryption]]  (internal reference example)
```

### 2.2 Slug Generation

Page slug format: `book/chapter/page`

* `book` → sanitized `docmeta.book`
* `chapter` → sanitized `docmeta.chapter`
* `page` → derived from `title` unless explicit `page:` override is later introduced (reserved)

Sanitization: lowercase, remove non `[a-z0-9 -_]`, collapse whitespace to `-`, collapse multiple dashes.

### 2.3 Topics & IDs
Topic IDs are deterministic: `kebab-case` of text, stripping punctuation; duplicates append `-n`.

---
## 3. Directives (Version 1.0 Core Set)

* **Admonition**: `::: tip|note|warning` ... `:::` → styled callout block with type attribute.
* **Internal Link**: `[[slug#topic]]` → validated; replaced with `<a href="#/slug#topic-id">` using resolved title text.
* **Variable**: `{{var:name}}` → substituted from variable map (future) else left literal.
* **Code Block**: ````lang [name=.. test=..] ...```` → `<pre><code class="language-lang" data-name data-test>` attributes optional.
* **Example (future)**: `::: example name=... lang=js` ... `:::` → normalized to code block + metadata (reserved for v1.1).

Unknown directives MUST pass through unchanged (forward compatibility).

---
\n## 1. Design Goals
A single file providing all navigational, structural, and search metadata.

\n## 2. Authoring Units
1. `@metadata` – container level info
2. `@docschema` – structural schema declaration (optional hint; can be synthesized)
\n### 2.3 Topics & IDs
4. `@index` – search tokens / summaries
5. `@dochashes` – per page content hash map
\n## 3. Directives (Version 1.0 Core Set)
7. Reserved future blocks

\n## 4. Aggregated Container (`docs.qdoc`)

```qdoc
\n### 4.1 Top-Level Block Order
  format: "QkeyDocFormat"
  version: "1.0"
  generatedAt: ISO("2025-09-05T12:00:00Z")
  sourceMode: "aggregated"
}

@docschema {
  books: [ { id: String, title: String, order: Number, chapters: Array } ]
}

@docs {
  books: {
    backup: {
      title: "Qkey Backup"
1. `@metadata` – container level info
2. `@docschema` – structural schema declaration (optional hint; can be synthesized)
3. `@docs` – hierarchical tree
4. `@index` – search tokens / summaries
5. `@dochashes` – per page content hash map
6. `@docversions` – (only if this is a versions descriptor file, not typical main container)
7. Reserved future blocks
              title: "Getting Started"
              order: 10
\n### 4.3 Hash Algorithm
              versionIntroduced: "1.0"
              tags: ["core","beginner"]
\n## 5. Validation Rules (Build Phase)
              hash: HEX("ab12cd34")
              body: <<DOC
# Getting Started

Content line 1

::: tip
Helpful tip.
:::

## Install
Steps...
DOC
            }
          }
        }
      }
    }
  }
}

@index {
  pages: {
\n## 6. Search Index (`@index` Block)
      summary: "Intro and installation overview."
      tags: ["core","beginner"]
\n### 6.1 Token Normalization
  }
}

@dochashes {
  "backup/introduction/getting-started": "ab12cd34"
}
```

Notes:
* `body` uses a heredoc style `<<ID` ... `ID` terminator. Any UPPERCASE token accepted; MUST NOT appear inside body.
* Arrays can be on one line if short; multi-line permitted.
* Quoted keys required only if containing `/` or special chars.

### 4.3 Hash Algorithm
* Default: SHA256, hex lower, truncated to first 8 bytes (16 hex chars) for `hash` field.
* Full 64 hex chars may be stored in `@dochashes`; truncation is allowed if no collisions.

---
## 5. Validation Rules (Build Phase)
| Rule | Severity | Description |
|------|----------|-------------|
| Missing required docmeta field | Error | book, chapter, title, order, versionIntroduced, status. |
| Duplicate slug | Error | Two pages resolve to same slug. |
| Duplicate order within chapter | Error | Orders must be unique per chapter. |
| Unresolved internal link | Error | `[[slug#topic]]` slug or topic not found. |
| Topic duplicate IDs | Error | After ID generation. |
| Unknown status value | Error | Must be draft|published|deprecated. |
| Deprecated without replacedBy | Warning | Encourage mapping forward. |
| Empty body | Warning | Page exists but has no content. |
| Large page (>150KB body) | Warning | Suggest split. |
| Unused tag (globally single use) | Info | Possibly mis-typed tag. |

Strict mode elevates warnings (except Empty body & Large page) to errors.

---
## 6. Search Index (`@index` Block)
* `pages` object keyed by full slug.
* `tokens` is a space-delimited normalized token string (lowercase, stop words removed).
* `summary` first 160 chars (trimmed at word boundary).
* Optional `boost: Number` field for weighting (future).

### 6.1 Token Normalization
1. Strip code fences & inline code.
2. Remove punctuation except hyphen.
3. Split on whitespace / hyphen.
4. Remove tokens < 3 chars (configurable) and stop list (e.g. the, and, of, to, for).

---
## 7. Runtime Consumption (High-Level Contract)
1. Load `docs.qdoc` (single fetch).

2. Parse blocks sequentially:

* Build maps: slug → page meta
* Store page body text; parse markdown to HTML on demand (or cache)
* Build search token index from `@index`

1. On navigation:

* Find page meta by slug
* Render markdown (client parser) to HTML
* Inject TOC using provided `topics` (reuse rather than scanning DOM first). If mismatch, fallback to DOM scan.

### 7.1 Minimal Required Parser Behaviors

* Recognize `@blockName {` ... `}` with nested object/array, ignoring indentation.
* Recognize heredoc: `body: <<ID` ... `ID`.
* Preserve exact body text (no trimming inside heredoc boundaries).

---
 
## 8. Reserved Blocks / Future Extensions

| Block | Purpose (Future) |
|-------|------------------|
| `@doctranslations` | Localization key-value sets. |
| `@docvars` | Variable substitutions for `{{var:name}}`. |
| `@docpermissions` | Audience / role gating policies. |
| `@docdiff` | Embedded changelog between two hashes. |
| `@docmedia` | Binary/media metadata indexing. |

Implementations MUST ignore unknown `@doc*` blocks safely.

---
 
## 9. Directive Extension Mechanism (Forward Spec)

A directive registry (build side) maps directive identifiers → transformer:

```ts
interface DirectiveTransformer {
  match: (lineOrFence: string) => boolean
  collect: (lines: string[], startIndex: number) => { html: string, endIndex: number, meta?: object }
}
```
Output meta can augment `topics` or tags if needed.

---
 
## 10. Variables & Substitution

If a `@docvars` block appears later (future additive within v1.0):

```qdoc
@docvars { productName: "Qkey Backup" }
```
Occurrences of `{{var:productName}}` replaced at render time (NOT inside code fences) – default leave literal if undefined.

---
 
## 11. Versioning Structure

Directory layout:

```text
public/docs/v/1.0/docs.qdoc
public/docs/v/1.1/docs.qdoc
public/docs/versions.qdoc
```

`versions.qdoc` example:

```qdoc
@docversions {
  default: "1.1"
  list: ["1.0","1.1"]
  notes: {
    "1.1": "Added advanced scheduling chapter."
    "1.0": "Initial release."
  }
}
```

---
 
## 12. Hashing & Incremental Build Strategy

 
* Before emitting a page, compute content fingerprint: SHA256(front-matter +  body + normalized topics list).
* If unchanged vs prior build (tracked in `@dochashes`), skip re-tokenizing to accelerate build.
* Rebuild `@index` if any page changed or `build --force` specified.

---
 
## 13. Security & Sanitization

* Build step MUST escape `<script>` tags in body unless explicitly whitelisted directive.
* Disallow raw `on*=` HTML attributes after markdown conversion (strip or escape) unless permitted directive context.
* Links beginning with `javascript:` MUST be rejected (error).

---
 
## 14. Compliance Matrix (v1.0 Minimal Runtime)

| Feature | Required Client Support | Build Only |
|---------|-------------------------|------------|
| Admonitions | Yes (styling) | Build can pre-transform (optional) |
| Internal Links | Yes (resolve slug) | Validation |
| Search Tokens | Yes (index usage) | Generation |
| Variable Substitution | Optional (future) | Optional |
| Version Switching | Yes (path change) | Generation |
| Hash Integrity | Optional (cache) | Yes |

---
 
## 15. Example End-to-End Workflow
1. Author adds `docs/backup/introduction/getting-started.qdoc` with `@docmeta`.
2. Run converter: `qkey-doc convert ./docs/pages ./public/docs/docs.qdoc`.
3. Converter parses, validates, writes container with updated `@docs`, `@index`, `@dochashes`.
4. Browser runtime loads `docs.qdoc`, renders requested page.
5. On new release, copy container to `public/docs/v/1.1/`, update `versions.qdoc`.

---
## 16. Reference Grammar (Informal)

```ebnf
CONTAINER := (BLOCK NEWLINE*)+
BLOCK := '@' IDENT WS '{' BODY '}'
BODY := ( key ':' VALUE NEWLINE )+ | HEREDOC | NESTED_OBJECTS
HEREDOC := '<<' IDENT NEWLINE (.* NEWLINE)* IDENT
VALUE := STRING | NUMBER | BOOLEAN | ARRAY | OBJECT | IDENT | SPECIAL_FN
ARRAY := '[' (VALUE (',' VALUE)*)? ']'
OBJECT := '{' (key ':' VALUE (NEWLINE|','))* '}'
```
Notes: Commas optional at line ends for readability; trailing commas disallowed in v1.0.

---
 
## 17. Implementation MUST / SHOULD Summary

| Requirement | Level |
|-------------|-------|
| Support @docs, @index, @dochashes parse | MUST |
| Validate required @docmeta fields | MUST |
| Enforce unique slug + order within chapter | MUST |
| Provide deterministic topic IDs | MUST |
| Provide tokenization rules | MUST |
| Ignore unknown @doc* blocks | MUST |
| Sanitize script / javascript: links | MUST |
| Support heredoc body preservation | MUST |
| Support internal link validation | MUST |
| Support versions via directory layout | SHOULD |
| Provide deprecated + replacedBy warning | SHOULD |
| Incremental build via hashes | SHOULD |
| Variable substitution | MAY (future) |

---
 
## 18. Change Control

* v1.0 freezes core blocks: `@metadata`, `@docs`, `@index`, `@dochashes`.
* Additive only until v2.0 (no breaking renames / semantics changes).
* Proposed new blocks require prefix `@doc` and spec addendum.

---

## 19. Appendix: Minimal Page to Container Mapping

| Page Field | Container Location |
|------------|--------------------|
| book | `@docs.books.<book>` key |
| chapter | `chapters.<chapter>` key inside book |
| title | page object.title |
| order | page object.order OR chapter/book.order |
| versionIntroduced | page object.versionIntroduced |
| status | page object.status |
| tags | page object.tags |
| body | page object.body heredoc |
| topics | page object.topics array |
| hash | page object.hash & `@dochashes` |

---

## 20. Status

This document constitutes the authoritative v1.0 release of the Qkey Documentation Format.

> End of Specification.
