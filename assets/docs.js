/**
 * ==========================================================================
 * Self-Contained Documentation System for Qkey Backup
 * 
 * Client-side documentation system using static files and JavaScript
 * ==========================================================================
 */

// Documentation configuration
const DOCS_CONFIG = {
    baseUrl: './',
    contentPath: './content/',
    searchIndex: null,
    navigation: null,
    books: []
};

// Documentation data structure
const DOCS_DATA = {
    books: [
        {
            slug: 'getting-started',
            title: 'Getting Started',
            description: 'Learn the basics of Qkey Backup and get up and running quickly',
            icon: '🚀',
            order: 1,
            chapters: [
                {
                    slug: 'introduction',
                    title: 'Welcome to Qkey Backup',
                    description: 'Introduction to Qkey Backup and its key features',
                    icon: '👋',
                    order: 1
                },
                {
                    slug: 'installation',
                    title: 'Installation & Setup',
                    description: 'Step-by-step guide to installing and configuring Qkey Backup',
                    icon: '💿',
                    order: 2
                },
                {
                    slug: 'first-backup',
                    title: 'Your First Backup',
                    description: 'Create and run your first backup job with Qkey Backup',
                    icon: '📁',
                    order: 3
                },
                {
                    slug: 'scheduling',
                    title: 'Backup Scheduling',
                    description: 'Set up automatic backups with flexible scheduling options',
                    icon: '⏰',
                    order: 4
                }
            ]
        },
        {
            slug: 'user-guide',
            title: 'User Guide',
            description: 'Complete user guide for Qkey Backup features and functionality',
            icon: '📖',
            order: 2,
            chapters: [
                {
                    slug: 'overview',
                    title: 'User Guide Overview',
                    description: 'Complete user guide for Qkey Backup features and functionality',
                    icon: '📋',
                    order: 1
                },
                {
                    slug: 'backup-jobs',
                    title: 'Managing Backup Jobs',
                    description: 'Create, configure, and manage backup jobs',
                    icon: '⚙️',
                    order: 2
                },
                {
                    slug: 'security',
                    title: 'Security & Encryption',
                    description: 'Protect your backup data with advanced security features',
                    icon: '🔒',
                    order: 3
                },
                {
                    slug: 'restore',
                    title: 'Restore Operations',
                    description: 'Recover your data with flexible restore options',
                    icon: '♻️',
                    order: 4
                },
                {
                    slug: 'monitoring',
                    title: 'Monitoring & Reports',
                    description: 'Track backup health and performance',
                    icon: '📊',
                    order: 5
                }
            ]
        },
        {
            slug: 'troubleshooting',
            title: 'Troubleshooting',
            description: 'Solve common problems and get help when needed',
            icon: '🛠️',
            order: 3,
            chapters: [
                {
                    slug: 'common-issues',
                    title: 'Common Issues',
                    description: 'Solutions to frequently encountered problems',
                    icon: '❓',
                    order: 1
                },
                {
                    slug: 'error-codes',
                    title: 'Error Codes',
                    description: 'Understanding and resolving error messages',
                    icon: '⚠️',
                    order: 2
                },
                {
                    slug: 'support',
                    title: 'Getting Support',
                    description: 'How to get help from our support team',
                    icon: '💬',
                    order: 3
                }
            ]
        },
        {
            slug: 'api',
            title: 'API Reference',
            description: 'Developer documentation and API references',
            icon: '⚡',
            order: 4,
            chapters: [
                {
                    slug: 'overview',
                    title: 'API Overview',
                    description: 'Introduction to the Qkey Backup API',
                    icon: '🔌',
                    order: 1
                },
                {
                    slug: 'authentication',
                    title: 'Authentication',
                    description: 'API authentication and security',
                    icon: '🔑',
                    order: 2
                },
                {
                    slug: 'endpoints',
                    title: 'API Endpoints',
                    description: 'Complete API endpoint reference',
                    icon: '📡',
                    order: 3
                }
            ]
        }
    ]
};

/**
 * Initialize the documentation system
 */
function initializeDocs() {
    DOCS_CONFIG.books = DOCS_DATA.books;
    buildSearchIndex();
    setupEventListeners();
}

/**
 * Build search index from all content
 */
function buildSearchIndex() {
    const searchData = [];
    
    DOCS_DATA.books.forEach(book => {
        // Add book to search index
        searchData.push({
            type: 'book',
            title: book.title,
            content: book.description,
            url: `./${book.slug}.html`,
            book: book.title,
            icon: book.icon
        });
        
        // Add chapters to search index
        book.chapters.forEach(chapter => {
            searchData.push({
                type: 'chapter',
                title: chapter.title,
                content: chapter.description,
                url: `./${book.slug}.html#${chapter.slug}`,
                book: book.title,
                chapter: chapter.title,
                icon: chapter.icon
            });
        });
    });
    
    DOCS_CONFIG.searchIndex = searchData;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }
    
    // Navigation toggle for mobile
    setupMobileNavigation();
}

/**
 * Handle search input
 */
function handleSearchInput(event) {
    const query = event.target.value.trim();
    if (query.length < 2) {
        hideSearchResults();
        return;
    }
    
    const results = performSearchQuery(query);
    showSearchResults(results, query);
}

/**
 * Perform search and redirect to search page
 */
function performSearch(event) {
    event.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        window.location.href = `./search.html?q=${encodeURIComponent(query)}`;
    }
}

/**
 * Perform search query
 */
function performSearchQuery(query) {
    if (!DOCS_CONFIG.searchIndex) return [];
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
    const results = [];
    
    DOCS_CONFIG.searchIndex.forEach(item => {
        let score = 0;
        const title = item.title.toLowerCase();
        const content = item.content.toLowerCase();
        
        searchTerms.forEach(term => {
            // Title matches are worth more
            if (title.includes(term)) {
                score += title.indexOf(term) === 0 ? 10 : 5;
            }
            
            // Content matches
            if (content.includes(term)) {
                score += 2;
            }
        });
        
        if (score > 0) {
            results.push({ ...item, score });
        }
    });
    
    return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Show search results dropdown
 */
function showSearchResults(results, query) {
    let dropdown = document.getElementById('searchDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'searchDropdown';
        dropdown.className = 'search-dropdown';
        document.querySelector('.search-container').appendChild(dropdown);
    }
    
    if (results.length === 0) {
        dropdown.innerHTML = `
            <div class="search-result-item">
                <div class="no-results">No results found for "${query}"</div>
            </div>
        `;
    } else {
        const terms = query.toLowerCase().split(' ').filter(t => t.length>1);
        const snippetFor = (text) => {
            const body = (text||'').toString();
            const low = body.toLowerCase();
            let i=-1, term='';
            for(const t of terms){ const idx=low.indexOf(t); if(idx!==-1 && (i===-1 || idx<i)){ i=idx; term=t; } }
            if(i===-1){ const s = body.slice(0, 120); return s && (body.length>120 ? s + '…' : s); }
            const start=Math.max(0, i-60), end=Math.min(body.length, i+60);
            const raw=(start>0?'…':'') + body.slice(start,end) + (end<body.length?'…':'');
            let esc = raw.replace(/[&<>]/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[s]));
            terms.forEach(t=>{ if(!t) return; const re=new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi'); esc = esc.replace(re,'<mark>$1</mark>'); });
            return esc;
        };
        dropdown.innerHTML = results.map(result => `
            <a href="${result.url}" class="search-result-item">
                <div class="result-icon">${result.icon||''}</div>
                <div class="result-content">
                    <div class="result-title">${highlightSearchTerms(result.title, query)}</div>
                    <div class="result-meta">${result.book}${result.chapter ? ' › ' + result.chapter : ''}</div>
                    ${result.content ? `<div class="result-snippet">${snippetFor(result.content)}</div>`:''}
                </div>
            </a>
        `).join('');
    }
    
    dropdown.style.display = 'block';
}

/**
 * Hide search results dropdown
 */
function hideSearchResults() {
    const dropdown = document.getElementById('searchDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

/**
 * Highlight search terms in text
 */
function highlightSearchTerms(text, query) {
    const terms = query.toLowerCase().split(' ').filter(term => term.length > 1);
    let highlightedText = text;
    
    terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
}

/**
 * Load navigation data
 */
function loadNavigationData() {
    const navigation = document.getElementById('navigation');
    if (!navigation) return;
    
    const navHTML = DOCS_DATA.books.map(book => `
        <div class="nav-book">
            <a href="./${book.slug}.html" class="nav-book-title">
                <span class="nav-icon">${book.icon}</span>
                <span class="nav-title">${book.title}</span>
            </a>
            <div class="nav-chapters">
                ${book.chapters.map(chapter => `
                    <a href="./${book.slug}.html#${chapter.slug}" class="nav-chapter">
                        <span class="nav-icon">${chapter.icon}</span>
                        <span class="nav-title">${chapter.title}</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    navigation.innerHTML = navHTML;
    
    // Add click handlers for expanding/collapsing chapters
    setupNavigationToggle();
}

/**
 * Setup navigation toggle functionality
 */
function setupNavigationToggle() {
    const bookTitles = document.querySelectorAll('.nav-book-title');
    bookTitles.forEach(title => {
        title.addEventListener('click', function(e) {
            // Don't prevent navigation, just toggle expansion
            const chapters = this.parentNode.querySelector('.nav-chapters');
            if (chapters) {
                chapters.classList.toggle('expanded');
            }
        });
    });
    
    // Expand current book
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const currentBook = currentPage.replace('.html', '');
    
    if (currentBook && currentBook !== 'index' && currentBook !== 'search') {
        const currentBookElement = document.querySelector(`[href="./${currentBook}.html"]`);
        if (currentBookElement) {
            const chapters = currentBookElement.parentNode.querySelector('.nav-chapters');
            if (chapters) {
                chapters.classList.add('expanded');
            }
        }
    }
}

/**
 * Load books grid for home page
 */
function loadBooksGrid() {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    const booksHTML = DOCS_DATA.books.map(book => `
        <div class="book-card">
            <a href="./${book.slug}.html" class="book-link">
                <div class="book-header">
                    <div class="book-icon">${book.icon}</div>
                    <h2>${book.title}</h2>
                </div>
                <p class="book-description">${book.description}</p>
                <div class="book-meta">
                    <div class="chapter-count">
                        <i class="fas fa-file-alt"></i>
                        ${book.chapters.length} chapters
                    </div>
                </div>
            </a>
        </div>
    `).join('');
    
    booksGrid.innerHTML = booksHTML;
}

/**
 * Load book page content
 */
function loadBookPage(bookSlug) {
    const book = DOCS_DATA.books.find(b => b.slug === bookSlug);
    if (!book) {
        showNotFound();
        return;
    }
    
    // Update page title
    document.title = `${book.title} - Qkey Backup Documentation`;
    
    // Update breadcrumbs
    updateBreadcrumbs([
        { title: 'Documentation', url: './' },
        { title: book.title, current: true }
    ]);
    
    // Update navigation active state
    updateNavigationActive(bookSlug);
    
    // Load book content
    const content = `
        <div class="book-page">
            <div class="book-header">
                <div class="book-title-section">
                    <div class="book-icon-large">${book.icon}</div>
                    <div class="book-title-content">
                        <h1>${book.title}</h1>
                        <p class="book-description">${book.description}</p>
                        <div class="book-stats">
                            <div class="stat">
                                <i class="fas fa-file-alt"></i>
                                ${book.chapters.length} chapters
                            </div>
                            <div class="stat">
                                <i class="fas fa-clock"></i>
                                Last updated: ${new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="chapters-list">
                <h2>Chapters</h2>
                <div class="chapters-grid">
                    ${book.chapters.map((chapter, index) => `
                        <div class="chapter-card">
                            <a href="#${chapter.slug}" class="chapter-link" onclick="loadChapter('${book.slug}', '${chapter.slug}')">
                                <div class="chapter-number">${index + 1}</div>
                                <div class="chapter-content">
                                    <div class="chapter-header">
                                        <span class="chapter-icon">${chapter.icon}</span>
                                        <h3>${chapter.title}</h3>
                                    </div>
                                    <p class="chapter-description">${chapter.description}</p>
                                </div>
                                <span class="chapter-arrow">
                                    <i class="fas fa-chevron-right"></i>
                                </span>
                            </a>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    const mainContent = document.querySelector('.docs-main');
    mainContent.innerHTML = content;
}

/**
 * Load chapter content
 */
function loadChapter(bookSlug, chapterSlug) {
    const book = DOCS_DATA.books.find(b => b.slug === bookSlug);
    if (!book) return;
    
    const chapter = book.chapters.find(c => c.slug === chapterSlug);
    if (!chapter) return;
    
    // Update page title
    document.title = `${chapter.title} - ${book.title} - Qkey Backup Documentation`;
    
    // Update breadcrumbs
    updateBreadcrumbs([
        { title: 'Documentation', url: './' },
        { title: book.title, url: `./${book.slug}.html` },
        { title: chapter.title, current: true }
    ]);
    
    // Update navigation active state
    updateNavigationActive(bookSlug, chapterSlug);
    
    // For now, show placeholder content
    const content = `
        <div class="chapter-page">
            <div class="chapter-header">
                <div class="chapter-meta">
                    <a href="./${book.slug}.html" class="book-link">
                        <i class="fas fa-arrow-left"></i>
                        ${book.title}
                    </a>
                    <div class="chapter-title">
                        <span class="chapter-icon">${chapter.icon}</span>
                        ${chapter.title}
                    </div>
                </div>
                <a href="https://github.com/your-repo/docs/edit/main/${book.slug}/${chapter.slug}.md" class="edit-btn" target="_blank">
                    <i class="fas fa-edit"></i>
                    Edit Page
                </a>
            </div>
            
            <div class="chapter-content">
                <h1>${chapter.title}</h1>
                <p class="chapter-description">${chapter.description}</p>
                
                <div class="content-placeholder">
                    <h2>Coming Soon</h2>
                    <p>This chapter content is being prepared. Please check back soon for detailed information about ${chapter.title.toLowerCase()}.</p>
                    
                    <h3>What you'll learn:</h3>
                    <ul>
                        <li>Key concepts and terminology</li>
                        <li>Step-by-step instructions</li>
                        <li>Best practices and tips</li>
                        <li>Troubleshooting common issues</li>
                    </ul>
                    
                    <div class="help-box">
                        <h4>Need help now?</h4>
                        <p>Contact our support team or check the <a href="./troubleshooting.html">troubleshooting guide</a> for immediate assistance.</p>
                    </div>
                </div>
            </div>
            
            ${generateChapterNavigation(book, chapter)}
            
            <div class="chapter-footer">
                <div class="last-updated">Last updated: ${new Date().toLocaleDateString()}</div>
                <div class="improve-page">
                    <a href="https://github.com/your-repo/docs/edit/main/${book.slug}/${chapter.slug}.md" target="_blank">
                        <i class="fas fa-edit"></i>
                        Improve this page
                    </a>
                </div>
            </div>
        </div>
    `;
    
    const mainContent = document.querySelector('.docs-main');
    mainContent.innerHTML = content;
}

/**
 * Generate chapter navigation (prev/next)
 */
function generateChapterNavigation(book, currentChapter) {
    const currentIndex = book.chapters.findIndex(c => c.slug === currentChapter.slug);
    const prevChapter = currentIndex > 0 ? book.chapters[currentIndex - 1] : null;
    const nextChapter = currentIndex < book.chapters.length - 1 ? book.chapters[currentIndex + 1] : null;
    
    return `
        <div class="chapter-navigation">
            <div class="nav-section">
                ${prevChapter ? `
                    <a href="#${prevChapter.slug}" class="nav-link" onclick="loadChapter('${book.slug}', '${prevChapter.slug}')">
                        <div class="nav-direction">
                            <i class="fas fa-chevron-left"></i>
                            Previous
                        </div>
                        <div class="nav-title">${prevChapter.title}</div>
                    </a>
                ` : '<div class="nav-placeholder"></div>'}
            </div>
            
            <div class="nav-section">
                <a href="./${book.slug}.html" class="nav-link">
                    <div class="nav-direction">
                        <i class="fas fa-list"></i>
                        Contents
                    </div>
                    <div class="nav-title">${book.title}</div>
                </a>
            </div>
            
            <div class="nav-section">
                ${nextChapter ? `
                    <a href="#${nextChapter.slug}" class="nav-link" onclick="loadChapter('${book.slug}', '${nextChapter.slug}')">
                        <div class="nav-direction">
                            Next
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="nav-title">${nextChapter.title}</div>
                    </a>
                ` : '<div class="nav-placeholder"></div>'}
            </div>
        </div>
    `;
}

/**
 * Update breadcrumbs
 */
function updateBreadcrumbs(breadcrumbs) {
    const breadcrumbsElement = document.querySelector('.breadcrumbs');
    if (!breadcrumbsElement) return;
    
    const breadcrumbsHTML = breadcrumbs.map((crumb, index) => {
        if (crumb.current) {
            return `<span class="breadcrumb-current">${crumb.title}</span>`;
        } else {
            const separator = index < breadcrumbs.length - 1 ? '<span class="breadcrumb-separator">›</span>' : '';
            return `<a href="${crumb.url}" class="breadcrumb-link">${crumb.title}</a>${separator}`;
        }
    }).join('');
    
    breadcrumbsElement.innerHTML = breadcrumbsHTML;
}

/**
 * Update navigation active state
 */
function updateNavigationActive(bookSlug, chapterSlug = null) {
    // Remove all active states
    document.querySelectorAll('.nav-book-title, .nav-chapter').forEach(el => {
        el.classList.remove('active');
    });
    
    // Add active state to current book
    const bookElement = document.querySelector(`[href="./${bookSlug}.html"]`);
    if (bookElement) {
        bookElement.classList.add('active');
        
        // Expand chapters
        const chapters = bookElement.parentNode.querySelector('.nav-chapters');
        if (chapters) {
            chapters.classList.add('expanded');
        }
    }
    
    // Add active state to current chapter
    if (chapterSlug) {
        const chapterElement = document.querySelector(`[href="./${bookSlug}.html#${chapterSlug}"]`);
        if (chapterElement) {
            chapterElement.classList.add('active');
        }
    }
}

/**
 * Setup mobile navigation
 */
function setupMobileNavigation() {
    // Add mobile menu toggle if needed
    // This would be implemented based on responsive design requirements
}

/**
 * Show 404 not found page
 */
function showNotFound() {
    const content = `
        <div class="not-found-page">
            <div class="not-found-content">
                <div class="not-found-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h1>Page Not Found</h1>
                <p>The documentation page you're looking for doesn't exist.</p>
                <a href="./" class="btn-primary">
                    <i class="fas fa-home"></i>
                    Back to Documentation Home
                </a>
            </div>
        </div>
    `;
    
    const mainContent = document.querySelector('.docs-main');
    mainContent.innerHTML = content;
}

/**
 * Debounce function for search input
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Click outside to close search dropdown
document.addEventListener('click', function(event) {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer && !searchContainer.contains(event.target)) {
        hideSearchResults();
    }
});

// Export functions for global use
window.initializeDocs = initializeDocs;
window.loadNavigationData = loadNavigationData;
window.loadBooksGrid = loadBooksGrid;
window.loadBookPage = loadBookPage;
window.loadChapter = loadChapter;
window.performSearch = performSearch;
