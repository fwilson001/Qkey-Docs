# Qkey Docs

Transform Markdown into beautiful, searchable documentation with zero dependencies. Container-based format, offline-ready, and fully accessible.

![Qkey Docs](https://img.shields.io/badge/status-stable-green) ![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-blue) ![Accessibility](https://img.shields.io/badge/a11y-WCAG%202.1%20AA-green)

## ✨ Features

- 🚀 **Zero Dependencies** - No external libraries, CDNs, or build tools required
- 📱 **Fully Responsive** - Beautiful on desktop, tablet, and mobile
- 🎨 **Modern Design** - Clean interface with light/dark theme support
- 🔍 **Powerful Search** - Client-side fuzzy search with instant results
- ♿ **Fully Accessible** - WCAG 2.1 AA compliant with keyboard navigation
- 📦 **Container Ready** - Perfect for Docker deployments
- 🔧 **Easy Setup** - Just add your Markdown files and serve
- 📄 **Offline Ready** - Works completely offline once loaded
- 🖨️ **Print Friendly** - Beautiful print styles for offline reading

## 🚀 Quick Start

### 1. Clone or Download

```bash
git clone https://github.com/fwilson001/Qkey-Docs.git
cd Qkey-Docs
```

### 2. Build the Documentation

```bash
./build.sh
```

### 3. Add Your Content

Place your Markdown files in the `build/docs/` directory:

```bash
echo "# My Documentation" > build/docs/my-page.md
```

### 4. Serve Locally

```bash
cd build
python3 serve.py
```

Visit http://localhost:8000 to see your documentation!

## 📁 Project Structure

```
Qkey-Docs/
├── src/                    # Source files
│   ├── index.html         # Main HTML template
│   ├── config.js          # Configuration
│   ├── styles/            # CSS files
│   │   ├── main.css       # Main styles
│   │   ├── themes.css     # Theme system
│   │   └── print.css      # Print styles
│   └── js/                # JavaScript modules
│       ├── app.js         # Main application
│       ├── markdown-parser.js # Zero-dependency MD parser
│       ├── search.js      # Search engine
│       ├── navigation.js  # Navigation system
│       └── themes.js      # Theme manager
├── docs/                  # Sample documentation
│   └── index.md          # Sample content
├── build.sh              # Build script
└── README.md             # This file
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
cd build
docker-compose up -d
```

### Using Docker Directly

```bash
cd build
docker build -t qkey-docs .
docker run -p 8080:80 qkey-docs
```

Your documentation will be available at http://localhost:8080

## ⚙️ Configuration

Edit `src/config.js` to customize your documentation:

```javascript
window.QkeyDocsConfig = {
    basePath: '',
    defaultPage: 'index',
    documentPaths: [
        'index',
        'getting-started',
        'api-reference'
    ],
    site: {
        title: 'My Documentation',
        description: 'Beautiful documentation'
    }
};
```

## 📝 Writing Documentation

### Supported Markdown Features

- **Headers** (H1-H6) with auto-generated IDs
- **Text formatting** (bold, italic, strikethrough)
- **Lists** (ordered and unordered)
- **Links** and images
- **Code blocks** with copy buttons
- **Tables** with mobile-friendly scrolling
- **Blockquotes**
- **Horizontal rules**

### Internal Links

Link to other pages using relative paths:

```markdown
[Getting Started](getting-started)
[API Reference](api-reference#authentication)
```

### Navigation

The system automatically generates:
- Table of contents from headers
- Previous/next page navigation  
- Mobile-friendly menu
- Breadcrumb navigation

## 🎨 Themes

Qkey Docs includes:

- **Light theme** - Clean and professional
- **Dark theme** - Easy on the eyes
- **Auto theme** - Follows system preference
- **Print theme** - Optimized for printing

Users can toggle themes using the theme button in the header.

## ♿ Accessibility Features

- **WCAG 2.1 AA** compliance
- **Keyboard navigation** throughout
- **Screen reader** support with proper ARIA labels
- **High contrast** mode support
- **Reduced motion** support for users with vestibular disorders
- **Focus management** and skip links
- **Semantic HTML** structure

## 🔍 Search Features

The built-in search provides:

- **Instant results** as you type
- **Fuzzy matching** for typos and partial matches
- **Keyword highlighting** in results
- **Keyboard navigation** (arrow keys, Enter, Escape)
- **Accessibility** with screen reader announcements
- **Client-side indexing** - no server required

## 🌐 Browser Support

Works in all modern browsers:

- **Chrome** 60+
- **Firefox** 60+  
- **Safari** 12+
- **Edge** 79+

## 📊 Performance

- **Zero build time** - serve directly
- **Fast loading** - minimal assets
- **Offline capable** - works without internet
- **Small footprint** - under 100KB total
- **No JavaScript framework** dependencies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- 📖 [Documentation](docs/index.md)
- 🐛 [Issues](https://github.com/fwilson001/Qkey-Docs/issues)
- 💬 [Discussions](https://github.com/fwilson001/Qkey-Docs/discussions)

---

Built with ❤️ for the documentation community.
