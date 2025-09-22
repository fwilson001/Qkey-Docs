/**
 * Navigation system for Qkey Docs
 * Handles table of contents, page navigation, and routing
 */
class NavigationSystem {
    constructor() {
        this.tocContainer = null;
        this.tocList = null;
        this.currentPath = '';
        this.pages = new Map();
        this.pageOrder = [];
        this.currentPageIndex = -1;
        this.observer = null;
        this.activeHeading = null;
    }

    /**
     * Initialize navigation system
     */
    init() {
        this.tocContainer = document.getElementById('toc');
        this.tocList = this.tocContainer?.querySelector('.toc-list');
        
        if (!this.tocContainer || !this.tocList) {
            console.warn('TOC elements not found');
            return;
        }

        this.setupIntersectionObserver();
        this.setupPageNavigation();
        this.setupMobileMenu();
    }

    /**
     * Set up intersection observer for active heading highlighting
     */
    setupIntersectionObserver() {
        const options = {
            rootMargin: '-20% 0% -35% 0%',
            threshold: 0
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.setActiveHeading(entry.target.id);
                }
            });
        }, options);
    }

    /**
     * Set up page navigation (prev/next)
     */
    setupPageNavigation() {
        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');

        if (prevButton) {
            prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPrevPage();
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToNextPage();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.navigateToPrevPage();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.navigateToNextPage();
                }
            }
        });
    }

    /**
     * Set up mobile menu toggle
     */
    setupMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');

        if (!menuToggle || !sidebar) return;

        menuToggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.contains('show');
            
            if (isOpen) {
                this.closeMobileMenu();
            } else {
                this.openMobileMenu();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    this.closeMobileMenu();
                }
            }
        });

        // Close menu on window resize to larger screen
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.getElementById('menu-toggle');

        if (sidebar && menuToggle) {
            sidebar.classList.add('show');
            menuToggle.setAttribute('aria-expanded', 'true');
            
            // Focus first link in sidebar
            const firstLink = sidebar.querySelector('a');
            if (firstLink) {
                firstLink.focus();
            }
        }
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.getElementById('menu-toggle');

        if (sidebar && menuToggle) {
            sidebar.classList.remove('show');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Add page to navigation
     * @param {string} path - Page path
     * @param {string} title - Page title
     * @param {Array} headings - Page headings for TOC
     * @param {number} order - Page order (optional)
     */
    addPage(path, title, headings = [], order = null) {
        const page = {
            path: path,
            title: title,
            headings: headings,
            order: order !== null ? order : this.pages.size
        };

        this.pages.set(path, page);
        
        // Update page order array
        this.updatePageOrder();
    }

    /**
     * Update the page order array
     */
    updatePageOrder() {
        this.pageOrder = Array.from(this.pages.values())
            .sort((a, b) => a.order - b.order)
            .map(page => page.path);
    }

    /**
     * Build table of contents for current page
     * @param {string} path - Current page path
     * @param {Array} headings - Page headings
     */
    buildTableOfContents(path, headings) {
        if (!this.tocList) return;

        this.currentPath = path;
        this.currentPageIndex = this.pageOrder.indexOf(path);
        
        // Clear existing TOC
        this.tocList.innerHTML = '';

        // Build TOC structure
        const tocStructure = this.buildTocStructure(headings);
        const tocHtml = this.renderTocStructure(tocStructure);
        
        this.tocList.innerHTML = tocHtml;

        // Set up click handlers
        this.tocList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                this.scrollToHeading(href.substring(1)); // Remove #
                
                // Close mobile menu if open
                if (window.innerWidth <= 768) {
                    this.closeMobileMenu();
                }
            });
        });

        // Update page navigation
        this.updatePageNavigation();

        // Start observing headings
        this.observeHeadings(headings);
    }

    /**
     * Build hierarchical TOC structure
     * @param {Array} headings 
     * @returns {Array} Nested structure
     */
    buildTocStructure(headings) {
        const structure = [];
        const stack = [];

        headings.forEach(heading => {
            const item = {
                ...heading,
                children: []
            };

            // Find the correct parent level
            while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
                stack.pop();
            }

            if (stack.length === 0) {
                structure.push(item);
            } else {
                stack[stack.length - 1].children.push(item);
            }

            stack.push(item);
        });

        return structure;
    }

    /**
     * Render TOC structure as HTML
     * @param {Array} structure 
     * @returns {string} HTML
     */
    renderTocStructure(structure) {
        if (!structure.length) return '';

        const items = structure.map(item => {
            const childrenHtml = item.children.length > 0 
                ? `<ul class="toc-list">${this.renderTocStructure(item.children)}</ul>`
                : '';

            return `
                <li>
                    <a href="#${item.id}" data-heading-id="${item.id}">
                        ${this.escapeHtml(item.text)}
                    </a>
                    ${childrenHtml}
                </li>
            `;
        }).join('');

        return items;
    }

    /**
     * Start observing headings for active state
     * @param {Array} headings 
     */
    observeHeadings(headings) {
        // Stop observing previous headings
        if (this.observer) {
            this.observer.disconnect();
        }

        // Start observing new headings
        headings.forEach(heading => {
            const element = document.getElementById(heading.id);
            if (element && this.observer) {
                this.observer.observe(element);
            }
        });
    }

    /**
     * Set active heading in TOC
     * @param {string} headingId 
     */
    setActiveHeading(headingId) {
        if (this.activeHeading === headingId) return;

        this.activeHeading = headingId;

        // Remove previous active state
        this.tocList?.querySelectorAll('a').forEach(link => {
            link.classList.remove('active');
        });

        // Set new active state
        const activeLink = this.tocList?.querySelector(`a[data-heading-id="${headingId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            
            // Scroll TOC to show active item
            activeLink.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }

    /**
     * Scroll to heading
     * @param {string} headingId 
     */
    scrollToHeading(headingId) {
        const element = document.getElementById(headingId);
        if (element) {
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const offset = headerHeight + 20;
            
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            // Update URL hash
            if (history.replaceState) {
                history.replaceState(null, null, `#${this.currentPath}#${headingId}`);
            }

            // Focus the heading for accessibility
            element.setAttribute('tabindex', '-1');
            element.focus();
        }
    }

    /**
     * Update page navigation buttons
     */
    updatePageNavigation() {
        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');

        if (!prevButton || !nextButton) return;

        // Previous page
        const prevIndex = this.currentPageIndex - 1;
        if (prevIndex >= 0 && prevIndex < this.pageOrder.length) {
            const prevPath = this.pageOrder[prevIndex];
            const prevPage = this.pages.get(prevPath);
            
            if (prevPage) {
                prevButton.classList.remove('hidden');
                prevButton.href = `#${prevPath}`;
                prevButton.querySelector('.page-nav-title').textContent = prevPage.title;
            }
        } else {
            prevButton.classList.add('hidden');
        }

        // Next page
        const nextIndex = this.currentPageIndex + 1;
        if (nextIndex >= 0 && nextIndex < this.pageOrder.length) {
            const nextPath = this.pageOrder[nextIndex];
            const nextPage = this.pages.get(nextPath);
            
            if (nextPage) {
                nextButton.classList.remove('hidden');
                nextButton.href = `#${nextPath}`;
                nextButton.querySelector('.page-nav-title').textContent = nextPage.title;
            }
        } else {
            nextButton.classList.add('hidden');
        }
    }

    /**
     * Navigate to previous page
     */
    navigateToPrevPage() {
        const prevIndex = this.currentPageIndex - 1;
        if (prevIndex >= 0 && prevIndex < this.pageOrder.length) {
            const prevPath = this.pageOrder[prevIndex];
            if (window.app && window.app.navigate) {
                window.app.navigate(prevPath);
            } else {
                window.location.hash = prevPath;
            }
        }
    }

    /**
     * Navigate to next page
     */
    navigateToNextPage() {
        const nextIndex = this.currentPageIndex + 1;
        if (nextIndex >= 0 && nextIndex < this.pageOrder.length) {
            const nextPath = this.pageOrder[nextIndex];
            if (window.app && window.app.navigate) {
                window.app.navigate(nextPath);
            } else {
                window.location.hash = nextPath;
            }
        }
    }

    /**
     * Build main navigation menu from all pages
     */
    buildMainNavigation() {
        if (!this.tocList) return;

        const pages = Array.from(this.pages.values())
            .sort((a, b) => a.order - b.order);

        const navigationHtml = pages.map(page => {
            const isActive = page.path === this.currentPath;
            const activeClass = isActive ? ' class="active"' : '';
            
            return `
                <li>
                    <a href="#${page.path}"${activeClass}>
                        ${this.escapeHtml(page.title)}
                    </a>
                </li>
            `;
        }).join('');

        this.tocList.innerHTML = navigationHtml;

        // Set up click handlers
        this.tocList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                const path = href.substring(1); // Remove #
                
                if (window.app && window.app.navigate) {
                    window.app.navigate(path);
                } else {
                    window.location.hash = path;
                }
                
                // Close mobile menu if open
                if (window.innerWidth <= 768) {
                    this.closeMobileMenu();
                }
            });
        });
    }

    /**
     * Get page information
     * @param {string} path 
     * @returns {Object|null} Page info
     */
    getPage(path) {
        return this.pages.get(path) || null;
    }

    /**
     * Get all pages
     * @returns {Array} All pages
     */
    getAllPages() {
        return Array.from(this.pages.values())
            .sort((a, b) => a.order - b.order);
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
     * Clean up observers
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Export for use in other modules
window.NavigationSystem = NavigationSystem;