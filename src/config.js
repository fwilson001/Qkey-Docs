// Configuration for Qkey Docs
window.QkeyDocsConfig = {
    // Base path for your documentation (usually empty for root)
    basePath: '',
    
    // Default page to load when no hash is provided
    defaultPage: 'index',
    
    // List of document paths (without .md extension)
    // The order here determines the navigation order
    documentPaths: [
        'index'
    ],
    
    // Site configuration
    site: {
        title: 'Qkey Docs',
        description: 'Beautiful, searchable documentation with zero dependencies'
    },
    
    // Search configuration
    search: {
        maxResults: 10,
        minQueryLength: 2,
        fuzzyThreshold: 0.6
    },
    
    // Theme configuration
    theme: {
        default: 'auto', // 'light', 'dark', or 'auto'
        allowToggle: true
    }
};