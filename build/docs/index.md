# Getting Started with Qkey Docs

Welcome to **Qkey Docs** - a zero-dependency documentation system that transforms Markdown into beautiful, searchable documentation that works completely offline.

## What is Qkey Docs?

Qkey Docs is a lightweight documentation generator that provides:

- 🚀 **Zero Dependencies** - No external libraries or CDNs required
- 📱 **Fully Responsive** - Works perfectly on all devices
- 🎨 **Beautiful Design** - Clean, modern interface with dark/light themes
- 🔍 **Powerful Search** - Client-side search with fuzzy matching
- ♿ **Fully Accessible** - Built with WCAG 2.1 AA compliance
- 📦 **Container Ready** - Perfect for Docker and containerized deployments
- 🔧 **Easy Setup** - Just add your Markdown files and go

## Quick Start

### 1. Directory Structure

Create the following directory structure:

```
your-docs/
├── src/
│   ├── index.html
│   ├── styles/
│   │   ├── main.css
│   │   ├── themes.css
│   │   └── print.css
│   └── js/
│       ├── app.js
│       ├── markdown-parser.js
│       ├── search.js
│       ├── navigation.js
│       └── themes.js
└── docs/
    ├── index.md
    ├── getting-started.md
    └── api-reference.md
```

### 2. Add Your Content

Place your Markdown files in the `docs/` directory. The system will automatically:

- Parse your Markdown into beautiful HTML
- Generate a table of contents
- Index content for search
- Create navigation between pages

### 3. Configure Your Documentation

Create a `config.js` file to customize your documentation:

```javascript
window.QkeyDocsConfig = {
    basePath: '',
    defaultPage: 'index',
    documentPaths: [
        'index',
        'getting-started',
        'api-reference',
        'examples'
    ]
};
```

### 4. Serve Your Documentation

Use any web server to serve your documentation:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

## Features

### Markdown Support

Qkey Docs supports all standard Markdown features:

- **Headers** (H1-H6)
- **Text formatting** (bold, italic, strikethrough)
- **Lists** (ordered and unordered)
- **Links** and images
- **Code blocks** with syntax highlighting
- **Tables**
- **Blockquotes**
- **Horizontal rules**

### Search Functionality

The built-in search provides:

- **Instant results** as you type
- **Fuzzy matching** for approximate searches
- **Keyword highlighting** in results
- **Keyboard navigation** (arrow keys, Enter)
- **Accessibility support** with screen reader announcements

### Navigation

Smart navigation features include:

- **Automatic table of contents** generation
- **Smooth scrolling** to sections
- **Active section highlighting**
- **Previous/next page** navigation
- **Mobile-friendly** navigation menu

### Themes

Beautiful theming system with:

- **Light and dark modes**
- **System preference detection**
- **Smooth transitions**
- **Accessibility considerations**
- **Print-friendly** styles

## Accessibility

Qkey Docs is built with accessibility as a first-class feature:

- **WCAG 2.1 AA compliance**
- **Keyboard navigation** throughout
- **Screen reader support** with proper ARIA labels
- **High contrast mode** support
- **Reduced motion** support
- **Focus management**
- **Skip links** for easy navigation

## Container Deployment

Perfect for containerized environments:

### Dockerfile Example

```dockerfile
FROM nginx:alpine

# Copy documentation files
COPY src/ /usr/share/nginx/html/
COPY docs/ /usr/share/nginx/html/docs/

# Copy nginx configuration if needed
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  docs:
    build: .
    ports:
      - "8080:80"
    volumes:
      - ./docs:/usr/share/nginx/html/docs:ro
```

## Advanced Configuration

### Custom Styling

Override default styles by adding custom CSS:

```css
:root {
    --accent-primary: #your-brand-color;
    --text-primary: #your-text-color;
}

.content h1 {
    color: var(--accent-primary);
}
```

### Search Configuration

Customize search behavior:

```javascript
// Override search settings
window.app.search.config = {
    maxResults: 15,
    minQueryLength: 2,
    fuzzyThreshold: 0.6
};
```

### Navigation Customization

Control navigation behavior:

```javascript
// Custom page ordering
window.app.navigation.setPageOrder([
    'introduction',
    'getting-started',
    'advanced-topics',
    'api-reference'
]);
```

## Browser Support

Qkey Docs works in all modern browsers:

- **Chrome** 60+
- **Firefox** 60+
- **Safari** 12+
- **Edge** 79+

## Contributing

Qkey Docs is open source and welcomes contributions:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - feel free to use in your projects!

---

Ready to get started? Check out our [API Reference](api-reference) or explore the [Examples](examples) section.