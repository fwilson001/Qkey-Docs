/**
 * Main application for Qkey Docs
 * Orchestrates all components: markdown parsing, search, navigation, themes
 */
class QkeyDocsApp {
    constructor() {
        this.parser = new MarkdownParser();
        this.search = new SearchEngine();
        this.navigation = new NavigationSystem();
        this.theme = new ThemeManager();
        
        this.contentElement = null;
        this.loadingElement = null;
        
        this.config = {
            basePath: '',
            defaultPage: 'index',
            documentPaths: []
        };
        
        this.isInitialized = false;
        this.currentPage = '';
    }

    /**
     * Initialize the application
     * @param {Object} config - Configuration object
     */
    async init(config = {}) {
        // Merge configuration
        this.config = { ...this.config, ...config };
        
        // Initialize DOM elements
        this.contentElement = document.getElementById('content');
        this.loadingElement = this.contentElement?.querySelector('.loading');
        
        if (!this.contentElement) {
            console.error('Content element not found');
            return;
        }

        // Initialize components
        this.theme.init();
        this.search.init();
        this.navigation.init();
        
        // Set up routing
        this.setupRouting();
        
        // Load initial content
        await this.loadInitialContent();
        
        // Set up additional event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('qkeydocs:ready', {
            detail: { app: this }
        }));
    }

    /**
     * Set up routing system
     */
    setupRouting() {
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
        
        // Handle initial load
        this.handleRoute();
    }

    /**
     * Handle route changes
     */
    async handleRoute() {
        const hash = window.location.hash.substring(1); // Remove #
        let [path, headingId] = hash.split('#');
        
        // Use default page if no path
        if (!path) {
            path = this.config.defaultPage;
        }
        
        // Navigate to page
        await this.navigate(path, headingId);
    }

    /**
     * Navigate to a specific page
     * @param {string} path - Page path
     * @param {string} headingId - Optional heading ID to scroll to
     */
    async navigate(path, headingId = null) {
        if (this.currentPage === path && !headingId) {
            return; // Already on this page
        }

        this.showLoading();
        
        try {
            // Load page content
            const content = await this.loadPage(path);
            
            if (content) {
                this.currentPage = path;
                await this.renderPage(content, path);
                
                // Scroll to heading if specified
                if (headingId) {
                    setTimeout(() => {
                        this.navigation.scrollToHeading(headingId);
                    }, 100);
                } else {
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                
                // Update browser history if needed
                const currentHash = window.location.hash.substring(1);
                const newHash = headingId ? `${path}#${headingId}` : path;
                
                if (currentHash !== newHash) {
                    if (history.replaceState) {
                        history.replaceState(null, null, `#${newHash}`);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to navigate to page:', path, error);
            this.showError('Failed to load page: ' + path);
        }
        
        this.hideLoading();
    }

    /**
     * Load page content
     * @param {string} path - Page path
     * @returns {Promise<string>} Page content
     */
    async loadPage(path) {
        // Try different file extensions and locations
        const possiblePaths = [
            `${this.config.basePath}docs/${path}.md`,
            `${this.config.basePath}docs/${path}/index.md`,
            `${this.config.basePath}${path}.md`,
            `${this.config.basePath}${path}`
        ];

        for (const fullPath of possiblePaths) {
            try {
                const response = await fetch(fullPath);
                if (response.ok) {
                    return await response.text();
                }
            } catch (error) {
                console.debug('Failed to load from:', fullPath);
            }
        }

        // If no markdown file found, try to generate a default page
        if (path === this.config.defaultPage) {
            return this.generateDefaultPage();
        }

        throw new Error(`Page not found: ${path}`);
    }

    /**
     * Generate default page content
     * @returns {string} Default markdown content
     */
    generateDefaultPage() {
        return `# Welcome to Qkey Docs

Transform Markdown into beautiful, searchable documentation with zero dependencies.

## Features

- **Zero Dependencies**: No external libraries or CDNs required
- **Offline Ready**: Works completely offline once loaded
- **Fully Accessible**: Built with accessibility in mind
- **Container Ready**: Perfect for containerized deployments
- **Beautiful Design**: Clean, modern interface with dark/light themes
- **Fast Search**: Client-side search with fuzzy matching
- **Mobile Responsive**: Works great on all devices

## Getting Started

1. Place your Markdown files in the \`docs/\` directory
2. Update the configuration to include your pages
3. Serve the files with any web server

## Navigation

Use the table of contents on the left to navigate between sections. On mobile, tap the menu button to access navigation.

## Search

Use the search box in the header to quickly find content across all documentation.

## Themes

Toggle between light and dark themes using the theme button in the header. The system will remember your preference.
`;
    }

    /**
     * Render page content
     * @param {string} content - Markdown content
     * @param {string} path - Page path
     */
    async renderPage(content, path) {
        // Parse markdown
        const html = this.parser.parse(content, path);
        
        // Extract table of contents
        const headings = this.parser.extractTableOfContents(content);
        
        // Get page title (first heading or default)
        const pageTitle = headings.length > 0 ? headings[0].text : path;
        
        // Update document title
        document.title = `${pageTitle} - Qkey Docs`;
        
        // Render content
        this.contentElement.innerHTML = html;
        
        // Add page to navigation and search
        this.navigation.addPage(path, pageTitle, headings);
        this.search.addDocument(path, pageTitle, content, headings);
        
        // Build table of contents
        this.navigation.buildTableOfContents(path, headings);
        
        // Set up content interactions
        this.setupContentInteractions();
        
        // Announce page load to screen readers
        this.announcePageLoad(pageTitle);
    }

    /**
     * Set up content interactions (links, etc.)
     */
    setupContentInteractions() {
        // Handle internal links
        this.contentElement.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href').substring(1);
                const [path, headingId] = href.split('#');
                
                if (path && path !== this.currentPage) {
                    this.navigate(path, headingId);
                } else if (headingId) {
                    this.navigation.scrollToHeading(headingId);
                }
            });
        });

        // Handle external links (open in new tab)
        this.contentElement.querySelectorAll('a[href^="http"]').forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });

        // Add copy buttons to code blocks
        this.addCodeBlockCopyButtons();

        // Enhance tables for mobile
        this.enhanceTablesForMobile();
    }

    /**
     * Add copy buttons to code blocks
     */
    addCodeBlockCopyButtons() {
        this.contentElement.querySelectorAll('pre').forEach(pre => {
            const code = pre.querySelector('code');
            if (!code) return;

            const button = document.createElement('button');
            button.className = 'copy-button';
            button.textContent = 'Copy';
            button.setAttribute('aria-label', 'Copy code to clipboard');
            
            button.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(code.textContent);
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = 'Copy';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    button.textContent = 'Failed';
                    setTimeout(() => {
                        button.textContent = 'Copy';
                    }, 2000);
                }
            });

            pre.style.position = 'relative';
            pre.appendChild(button);
        });
    }

    /**
     * Enhance tables for mobile viewing
     */
    enhanceTablesForMobile() {
        this.contentElement.querySelectorAll('table').forEach(table => {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    /**
     * Load initial content and build navigation
     */
    async loadInitialContent() {
        // If document paths are configured, preload them
        if (this.config.documentPaths && this.config.documentPaths.length > 0) {
            await this.preloadDocuments();
        }
        
        // Navigate to initial page
        const initialPath = window.location.hash.substring(1) || this.config.defaultPage;
        await this.navigate(initialPath);
    }

    /**
     * Preload configured documents
     */
    async preloadDocuments() {
        const promises = this.config.documentPaths.map(async (docPath, index) => {
            try {
                const content = await this.loadPage(docPath);
                const headings = this.parser.extractTableOfContents(content);
                const title = headings.length > 0 ? headings[0].text : docPath;
                
                this.navigation.addPage(docPath, title, headings, index);
                this.search.addDocument(docPath, title, content, headings);
            } catch (error) {
                console.warn('Failed to preload document:', docPath, error);
            }
        });

        await Promise.all(promises);
        
        // Build main navigation if we have multiple pages
        if (this.config.documentPaths.length > 1) {
            this.navigation.buildMainNavigation();
        }
    }

    /**
     * Set up additional event listeners
     */
    setupEventListeners() {
        // Focus management
        document.addEventListener('keydown', (e) => {
            // Skip to main content
            if (e.key === 'Tab' && !e.shiftKey) {
                const skipLink = document.querySelector('.skip-link');
                if (document.activeElement === skipLink) {
                    e.preventDefault();
                    document.getElementById('main-content')?.focus();
                }
            }
        });

        // Print support
        window.addEventListener('beforeprint', () => {
            document.body.classList.add('printing');
        });

        window.addEventListener('afterprint', () => {
            document.body.classList.remove('printing');
        });
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.contentElement.innerHTML = `
            <div class="error-message">
                <h1>Error</h1>
                <p>${this.escapeHtml(message)}</p>
                <p><a href="#${this.config.defaultPage}">Return to home</a></p>
            </div>
        `;
    }

    /**
     * Announce page load to screen readers
     * @param {string} pageTitle - Page title
     */
    announcePageLoad(pageTitle) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = `Page loaded: ${pageTitle}`;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Escape HTML characters
     * @param {string} text 
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get application statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            app: {
                initialized: this.isInitialized,
                currentPage: this.currentPage,
                configuredPages: this.config.documentPaths.length
            },
            search: this.search.getStats(),
            navigation: {
                totalPages: this.navigation.getAllPages().length
            },
            theme: this.theme.getThemeInfo()
        };
    }

    /**
     * Export application state
     * @returns {Object} Exportable state
     */
    exportState() {
        return {
            currentPage: this.currentPage,
            theme: this.theme.exportConfig(),
            config: this.config
        };
    }

    /**
     * Import application state
     * @param {Object} state - Application state
     */
    importState(state) {
        if (state.theme) {
            this.theme.importConfig(state.theme);
        }
        
        if (state.currentPage) {
            this.navigate(state.currentPage);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QkeyDocsApp();
    
    // Initialize with default configuration
    // This can be overridden by including a config.js file
    const defaultConfig = {
        basePath: '',
        defaultPage: 'index',
        documentPaths: [] // Add your document paths here
    };
    
    // Check for global config
    const config = window.QkeyDocsConfig || defaultConfig;
    
    window.app.init(config).catch(error => {
        console.error('Failed to initialize Qkey Docs:', error);
    });
});

// Export for use in other modules
window.QkeyDocsApp = QkeyDocsApp;