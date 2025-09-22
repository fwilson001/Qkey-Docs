/**
 * Client-side search functionality for Qkey Docs
 * Zero dependencies, fully offline, fast searching with fuzzy matching
 */
class SearchEngine {
    constructor() {
        this.searchIndex = [];
        this.documents = new Map();
        this.isIndexing = false;
        this.searchInput = null;
        this.searchResults = null;
        this.searchResultsCount = null;
        this.currentResults = [];
        this.selectedResultIndex = -1;
        this.searchTimeout = null;
    }

    /**
     * Initialize search functionality
     */
    init() {
        this.searchInput = document.getElementById('search-input');
        this.searchResults = document.getElementById('search-results');
        this.searchResultsCount = document.getElementById('search-results-count');
        
        if (!this.searchInput || !this.searchResults) {
            console.warn('Search elements not found');
            return;
        }

        this.setupEventListeners();
    }

    /**
     * Set up event listeners for search
     */
    setupEventListeners() {
        // Search input handling
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Focus management
        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value.trim()) {
                this.showResults();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.searchResults.contains(e.target)) {
                this.hideResults();
            }
        });

        // Escape to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideResults();
                this.searchInput.blur();
            }
        });
    }

    /**
     * Handle search input with debouncing
     * @param {string} query 
     */
    handleSearchInput(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.trim().length < 2) {
            this.hideResults();
            return;
        }

        this.searchTimeout = setTimeout(() => {
            this.performSearch(query.trim());
        }, 150);
    }

    /**
     * Handle keyboard navigation in search results
     * @param {KeyboardEvent} e 
     */
    handleKeyNavigation(e) {
        if (!this.currentResults.length) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedResultIndex = Math.min(
                    this.selectedResultIndex + 1, 
                    this.currentResults.length - 1
                );
                this.updateSelectedResult();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedResultIndex = Math.max(this.selectedResultIndex - 1, -1);
                this.updateSelectedResult();
                break;

            case 'Enter':
                e.preventDefault();
                if (this.selectedResultIndex >= 0 && this.currentResults[this.selectedResultIndex]) {
                    this.selectResult(this.currentResults[this.selectedResultIndex]);
                }
                break;
        }
    }

    /**
     * Add document to search index
     * @param {string} path - Document path/ID
     * @param {string} title - Document title
     * @param {string} content - Document content (markdown or plain text)
     * @param {Array} headings - Array of heading objects
     */
    addDocument(path, title, content, headings = []) {
        const parser = new MarkdownParser();
        const plainText = parser.extractPlainText(content);
        
        const document = {
            path: path,
            title: title,
            content: plainText,
            headings: headings,
            wordCount: plainText.split(/\s+/).length
        };

        this.documents.set(path, document);
        
        // Create search entries for the document
        this.indexDocument(document);
    }

    /**
     * Index a document for searching
     * @param {Object} document 
     */
    indexDocument(document) {
        // Index the main document
        this.searchIndex.push({
            type: 'document',
            path: document.path,
            title: document.title,
            content: document.content,
            searchText: `${document.title} ${document.content}`.toLowerCase(),
            score: 0
        });

        // Index individual headings for more precise results
        document.headings.forEach(heading => {
            this.searchIndex.push({
                type: 'heading',
                path: document.path,
                title: document.title,
                heading: heading.text,
                headingId: heading.id,
                content: document.content,
                searchText: `${heading.text} ${document.title}`.toLowerCase(),
                score: 0
            });
        });
    }

    /**
     * Perform search and display results
     * @param {string} query 
     */
    performSearch(query) {
        if (!query || query.length < 2) {
            this.hideResults();
            return;
        }

        const results = this.search(query);
        this.currentResults = results;
        this.selectedResultIndex = -1;
        
        this.displayResults(results, query);
        this.updateSearchResultsCount(results.length, query);
    }

    /**
     * Search through indexed documents
     * @param {string} query 
     * @returns {Array} Search results
     */
    search(query) {
        const queryTerms = this.tokenize(query.toLowerCase());
        const results = [];

        this.searchIndex.forEach(item => {
            const score = this.calculateScore(item, queryTerms, query.toLowerCase());
            if (score > 0) {
                results.push({
                    ...item,
                    score: score,
                    snippet: this.generateSnippet(item.content, queryTerms)
                });
            }
        });

        // Sort by score (descending) and then by title
        results.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.title.localeCompare(b.title);
        });

        // Remove duplicates and limit results
        const uniqueResults = this.removeDuplicates(results);
        return uniqueResults.slice(0, 10);
    }

    /**
     * Calculate search score for an item
     * @param {Object} item 
     * @param {Array} queryTerms 
     * @param {string} fullQuery 
     * @returns {number} Score
     */
    calculateScore(item, queryTerms, fullQuery) {
        let score = 0;
        const searchText = item.searchText;
        const title = item.title.toLowerCase();
        const heading = item.heading ? item.heading.toLowerCase() : '';

        // Exact phrase match (highest score)
        if (searchText.includes(fullQuery)) {
            score += 100;
            if (title.includes(fullQuery)) score += 50;
            if (heading.includes(fullQuery)) score += 30;
        }

        // Individual term matches
        queryTerms.forEach(term => {
            if (searchText.includes(term)) {
                score += 10;
                
                // Boost for title matches
                if (title.includes(term)) {
                    score += 20;
                }
                
                // Boost for heading matches
                if (heading.includes(term)) {
                    score += 15;
                }
                
                // Boost for term at start of words
                if (searchText.match(new RegExp(`\\b${this.escapeRegex(term)}`, 'i'))) {
                    score += 5;
                }
            }
        });

        // Fuzzy matching for single character differences
        if (score === 0) {
            queryTerms.forEach(term => {
                if (this.fuzzyMatch(searchText, term)) {
                    score += 2;
                }
            });
        }

        return score;
    }

    /**
     * Tokenize query into searchable terms
     * @param {string} query 
     * @returns {Array} Terms
     */
    tokenize(query) {
        return query
            .split(/\s+/)
            .filter(term => term.length > 1)
            .map(term => term.replace(/[^\w]/g, ''));
    }

    /**
     * Generate snippet with highlighted search terms
     * @param {string} content 
     * @param {Array} queryTerms 
     * @returns {string} Snippet
     */
    generateSnippet(content, queryTerms) {
        const maxLength = 150;
        const words = content.split(/\s+/);
        
        // Find the best position for the snippet
        let bestStart = 0;
        let bestScore = 0;

        for (let i = 0; i < words.length - 10; i++) {
            const snippet = words.slice(i, i + 20).join(' ').toLowerCase();
            let score = 0;
            
            queryTerms.forEach(term => {
                if (snippet.includes(term)) {
                    score += 1;
                }
            });
            
            if (score > bestScore) {
                bestScore = score;
                bestStart = i;
            }
        }

        // Extract snippet
        const snippetWords = words.slice(bestStart, bestStart + 20);
        let snippet = snippetWords.join(' ');

        // Truncate if needed
        if (snippet.length > maxLength) {
            snippet = snippet.substring(0, maxLength) + '...';
        }

        // Add ellipsis at the beginning if not starting from the beginning
        if (bestStart > 0) {
            snippet = '...' + snippet;
        }

        return snippet;
    }

    /**
     * Remove duplicate results
     * @param {Array} results 
     * @returns {Array} Unique results
     */
    removeDuplicates(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = `${result.path}-${result.heading || 'main'}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Simple fuzzy matching
     * @param {string} text 
     * @param {string} term 
     * @returns {boolean} Match found
     */
    fuzzyMatch(text, term) {
        if (term.length < 3) return false;
        
        const regex = new RegExp(term.split('').join('.*'), 'i');
        return regex.test(text);
    }

    /**
     * Escape special regex characters
     * @param {string} string 
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Display search results
     * @param {Array} results 
     * @param {string} query 
     */
    displayResults(results, query) {
        if (!results.length) {
            this.searchResults.innerHTML = '<div class="search-result"><div class="search-result-title">No results found</div></div>';
            this.showResults();
            return;
        }

        const resultsHtml = results.map((result, index) => {
            const title = result.heading || result.title;
            const highlightedTitle = this.highlightTerms(title, query);
            const highlightedSnippet = this.highlightTerms(result.snippet, query);
            
            const url = result.headingId ? `#${result.path}#${result.headingId}` : `#${result.path}`;
            
            return `
                <div class="search-result" data-index="${index}" data-url="${url}">
                    <div class="search-result-title">${highlightedTitle}</div>
                    <div class="search-result-snippet">${highlightedSnippet}</div>
                </div>
            `;
        }).join('');

        this.searchResults.innerHTML = resultsHtml;
        
        // Add click handlers
        this.searchResults.querySelectorAll('.search-result').forEach((element, index) => {
            element.addEventListener('click', () => {
                this.selectResult(results[index]);
            });
        });

        this.showResults();
    }

    /**
     * Highlight search terms in text
     * @param {string} text 
     * @param {string} query 
     * @returns {string} Highlighted text
     */
    highlightTerms(text, query) {
        if (!text || !query) return text || '';
        
        const terms = this.tokenize(query.toLowerCase());
        let highlightedText = text;

        terms.forEach(term => {
            const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<span class="search-highlight">$1</span>');
        });

        return highlightedText;
    }

    /**
     * Update visual selection of search result
     */
    updateSelectedResult() {
        this.searchResults.querySelectorAll('.search-result').forEach((element, index) => {
            element.classList.toggle('selected', index === this.selectedResultIndex);
        });

        // Scroll selected result into view
        if (this.selectedResultIndex >= 0) {
            const selectedElement = this.searchResults.children[this.selectedResultIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    }

    /**
     * Select a search result
     * @param {Object} result 
     */
    selectResult(result) {
        const url = result.headingId ? `${result.path}#${result.headingId}` : result.path;
        
        // Navigate to the result
        if (window.app && window.app.navigate) {
            window.app.navigate(url);
        } else {
            window.location.hash = url;
        }

        this.hideResults();
        this.searchInput.blur();
    }

    /**
     * Show search results
     */
    showResults() {
        this.searchResults.classList.add('show');
        this.searchResults.setAttribute('aria-expanded', 'true');
    }

    /**
     * Hide search results
     */
    hideResults() {
        this.searchResults.classList.remove('show');
        this.searchResults.setAttribute('aria-expanded', 'false');
        this.selectedResultIndex = -1;
    }

    /**
     * Update search results count for screen readers
     * @param {number} count 
     * @param {string} query 
     */
    updateSearchResultsCount(count, query) {
        if (this.searchResultsCount) {
            const message = count === 0 
                ? `No results found for "${query}"`
                : `${count} result${count === 1 ? '' : 's'} found for "${query}"`;
            
            this.searchResultsCount.textContent = message;
        }
    }

    /**
     * Clear search index (useful for rebuilding)
     */
    clearIndex() {
        this.searchIndex = [];
        this.documents.clear();
    }

    /**
     * Get search statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            indexedDocuments: this.documents.size,
            indexedEntries: this.searchIndex.length,
            totalWords: Array.from(this.documents.values())
                .reduce((total, doc) => total + doc.wordCount, 0)
        };
    }
}

// Export for use in other modules
window.SearchEngine = SearchEngine;