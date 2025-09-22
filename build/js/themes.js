/**
 * Theme management system for Qkey Docs
 * Handles light/dark theme switching with system preference detection
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'auto';
        this.systemTheme = 'light';
        this.themeToggle = null;
        this.mediaQuery = null;
        this.storageKey = 'qkey-docs-theme';
    }

    /**
     * Initialize theme management
     */
    init() {
        this.themeToggle = document.getElementById('theme-toggle');
        
        // Set up media query listener for system theme changes
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.systemTheme = this.mediaQuery.matches ? 'dark' : 'light';
        
        // Listen for system theme changes
        this.mediaQuery.addEventListener('change', (e) => {
            this.systemTheme = e.matches ? 'dark' : 'light';
            if (this.currentTheme === 'auto') {
                this.applyTheme();
            }
        });

        // Load saved theme or use auto
        this.loadTheme();

        // Set up theme toggle button
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });

            // Keyboard support
            this.themeToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleTheme();
                }
            });
        }

        // Initial theme application
        this.applyTheme();
    }

    /**
     * Load theme from localStorage or use default
     */
    loadTheme() {
        try {
            const savedTheme = localStorage.getItem(this.storageKey);
            if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
                this.currentTheme = savedTheme;
            }
        } catch (e) {
            console.warn('Could not load theme from localStorage:', e);
        }
    }

    /**
     * Save theme to localStorage
     */
    saveTheme() {
        try {
            localStorage.setItem(this.storageKey, this.currentTheme);
        } catch (e) {
            console.warn('Could not save theme to localStorage:', e);
        }
    }

    /**
     * Toggle between light, dark, and auto themes
     */
    toggleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        
        this.setTheme(themes[nextIndex]);
    }

    /**
     * Set specific theme
     * @param {string} theme - 'light', 'dark', or 'auto'
     */
    setTheme(theme) {
        if (!['light', 'dark', 'auto'].includes(theme)) {
            console.warn('Invalid theme:', theme);
            return;
        }

        this.currentTheme = theme;
        this.saveTheme();
        this.applyTheme();
        this.updateToggleButton();
        this.announceThemeChange();
    }

    /**
     * Apply current theme to the document
     */
    applyTheme() {
        const effectiveTheme = this.getEffectiveTheme();
        
        // Remove existing theme attributes
        document.documentElement.removeAttribute('data-theme');
        
        // Set new theme attribute
        if (effectiveTheme !== 'auto') {
            document.documentElement.setAttribute('data-theme', effectiveTheme);
        }

        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(effectiveTheme);
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: {
                theme: this.currentTheme,
                effectiveTheme: effectiveTheme
            }
        }));
    }

    /**
     * Get the effective theme (resolves 'auto' to actual theme)
     * @returns {string} 'light' or 'dark'
     */
    getEffectiveTheme() {
        if (this.currentTheme === 'auto') {
            return this.systemTheme;
        }
        return this.currentTheme;
    }

    /**
     * Update theme toggle button appearance and labels
     */
    updateToggleButton() {
        if (!this.themeToggle) return;

        const effectiveTheme = this.getEffectiveTheme();
        
        // Update button label
        const labels = {
            'auto': 'Switch to light theme',
            'light': 'Switch to dark theme', 
            'dark': 'Switch to auto theme'
        };
        
        this.themeToggle.setAttribute('aria-label', labels[this.currentTheme]);
        this.themeToggle.setAttribute('title', labels[this.currentTheme]);

        // Update visual state
        const lightIcon = this.themeToggle.querySelector('.light-icon');
        const darkIcon = this.themeToggle.querySelector('.dark-icon');
        
        if (lightIcon && darkIcon) {
            if (effectiveTheme === 'dark') {
                lightIcon.style.opacity = '0';
                darkIcon.style.opacity = '1';
            } else {
                lightIcon.style.opacity = '1';
                darkIcon.style.opacity = '0';
            }
        }
    }

    /**
     * Update meta theme-color for mobile browsers
     * @param {string} theme 
     */
    updateMetaThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const colors = {
                'light': '#2563eb',
                'dark': '#3b82f6'
            };
            metaThemeColor.setAttribute('content', colors[theme] || colors.light);
        }
    }

    /**
     * Announce theme change to screen readers
     */
    announceThemeChange() {
        const effectiveTheme = this.getEffectiveTheme();
        const message = `Theme changed to ${this.currentTheme}${this.currentTheme === 'auto' ? ` (${effectiveTheme})` : ''}`;
        
        // Create temporary announcement element
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Get current theme information
     * @returns {Object} Theme info
     */
    getThemeInfo() {
        return {
            current: this.currentTheme,
            effective: this.getEffectiveTheme(),
            system: this.systemTheme,
            available: ['light', 'dark', 'auto']
        };
    }

    /**
     * Check if user prefers reduced motion
     * @returns {boolean} True if reduced motion is preferred
     */
    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Check if user prefers high contrast
     * @returns {boolean} True if high contrast is preferred
     */
    prefersHighContrast() {
        return window.matchMedia('(prefers-contrast: high)').matches;
    }

    /**
     * Apply accessibility preferences
     */
    applyAccessibilityPreferences() {
        const html = document.documentElement;
        
        // Reduced motion
        if (this.prefersReducedMotion()) {
            html.classList.add('reduce-motion');
        } else {
            html.classList.remove('reduce-motion');
        }
        
        // High contrast
        if (this.prefersHighContrast()) {
            html.classList.add('high-contrast');
        } else {
            html.classList.remove('high-contrast');
        }
    }

    /**
     * Export theme configuration
     * @returns {Object} Exportable theme config
     */
    exportConfig() {
        return {
            currentTheme: this.currentTheme,
            systemTheme: this.systemTheme,
            effectiveTheme: this.getEffectiveTheme(),
            reducedMotion: this.prefersReducedMotion(),
            highContrast: this.prefersHighContrast()
        };
    }

    /**
     * Import theme configuration
     * @param {Object} config - Theme configuration
     */
    importConfig(config) {
        if (config && config.currentTheme) {
            this.setTheme(config.currentTheme);
        }
    }

    /**
     * Add custom CSS properties based on theme
     */
    addCustomProperties() {
        const effectiveTheme = this.getEffectiveTheme();
        const root = document.documentElement;

        // Add theme-specific custom properties
        if (effectiveTheme === 'dark') {
            root.style.setProperty('--theme-transition', 'all 0.3s ease');
        } else {
            root.style.setProperty('--theme-transition', 'all 0.3s ease');
        }
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        if (this.mediaQuery) {
            this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange);
        }
    }
}

// Export for use in other modules
window.ThemeManager = ThemeManager;