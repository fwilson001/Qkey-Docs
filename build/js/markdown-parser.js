/**
 * Zero-dependency Markdown parser for Qkey Docs
 * Supports all common Markdown features with accessibility in mind
 */
class MarkdownParser {
    constructor() {
        this.headingCounter = {};
        this.currentPath = '';
    }

    /**
     * Parse markdown text into HTML
     * @param {string} markdown - The markdown text to parse
     * @param {string} path - Optional path for link resolution
     * @returns {string} HTML string
     */
    parse(markdown, path = '') {
        this.currentPath = path;
        this.headingCounter = {};
        
        // Normalize line endings
        markdown = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Split into blocks
        const blocks = this.splitIntoBlocks(markdown);
        
        // Parse each block
        const htmlBlocks = blocks.map(block => this.parseBlock(block));
        
        return htmlBlocks.join('\n');
    }

    /**
     * Split markdown into logical blocks
     * @param {string} markdown 
     * @returns {Array} Array of block objects
     */
    splitIntoBlocks(markdown) {
        const lines = markdown.split('\n');
        const blocks = [];
        let currentBlock = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = lines[i + 1] || '';
            
            // Code blocks (fenced)
            if (line.trim().startsWith('```')) {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
                
                const language = line.trim().substring(3).trim();
                const codeLines = [];
                i++;
                
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                
                blocks.push({
                    type: 'code',
                    content: codeLines.join('\n'),
                    language: language
                });
                continue;
            }
            
            // Headings
            if (line.match(/^#{1,6}\s/)) {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
                
                const level = line.match(/^#+/)[0].length;
                const text = line.replace(/^#+\s*/, '').replace(/\s*#+\s*$/, '');
                
                blocks.push({
                    type: 'heading',
                    level: level,
                    content: text
                });
                continue;
            }
            
            // Horizontal rules
            if (line.match(/^(-{3,}|\*{3,}|_{3,})\s*$/)) {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
                
                blocks.push({
                    type: 'hr'
                });
                continue;
            }
            
            // Blockquotes
            if (line.trim().startsWith('>')) {
                if (currentBlock && currentBlock.type !== 'blockquote') {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
                
                if (!currentBlock) {
                    currentBlock = {
                        type: 'blockquote',
                        content: []
                    };
                }
                
                currentBlock.content.push(line.replace(/^\s*>\s?/, ''));
                continue;
            }
            
            // Lists
            if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
                const isOrdered = line.match(/^\s*\d+\.\s/);
                const indent = line.match(/^\s*/)[0].length;
                
                if (currentBlock && currentBlock.type !== 'list') {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
                
                if (!currentBlock) {
                    currentBlock = {
                        type: 'list',
                        ordered: isOrdered,
                        items: []
                    };
                }
                
                const itemText = line.replace(/^\s*[-*+\d.]\s/, '');
                currentBlock.items.push({
                    text: itemText,
                    indent: indent
                });
                continue;
            }
            
            // Tables
            if (line.includes('|') && nextLine.match(/^\s*\|?[\s:|-]+\|?[\s:|-]*$/)) {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
                
                const headerRow = this.parseTableRow(line);
                const separatorRow = nextLine;
                const alignments = this.parseTableAlignments(separatorRow);
                const rows = [headerRow];
                
                i += 2; // Skip separator row
                
                while (i < lines.length && lines[i].includes('|')) {
                    rows.push(this.parseTableRow(lines[i]));
                    i++;
                }
                i--; // Back up one since the loop will increment
                
                blocks.push({
                    type: 'table',
                    rows: rows,
                    alignments: alignments
                });
                continue;
            }
            
            // Empty lines
            if (line.trim() === '') {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
                continue;
            }
            
            // Regular paragraphs
            if (currentBlock && currentBlock.type !== 'paragraph') {
                blocks.push(currentBlock);
                currentBlock = null;
            }
            
            if (!currentBlock) {
                currentBlock = {
                    type: 'paragraph',
                    content: []
                };
            }
            
            currentBlock.content.push(line);
        }
        
        // Don't forget the last block
        if (currentBlock) {
            blocks.push(currentBlock);
        }
        
        return blocks;
    }

    /**
     * Parse a single block into HTML
     * @param {Object} block 
     * @returns {string} HTML
     */
    parseBlock(block) {
        switch (block.type) {
            case 'heading':
                return this.parseHeading(block);
            case 'paragraph':
                return this.parseParagraph(block);
            case 'code':
                return this.parseCodeBlock(block);
            case 'blockquote':
                return this.parseBlockquote(block);
            case 'list':
                return this.parseList(block);
            case 'table':
                return this.parseTable(block);
            case 'hr':
                return '<hr>';
            default:
                return '';
        }
    }

    /**
     * Parse heading block
     * @param {Object} block 
     * @returns {string} HTML
     */
    parseHeading(block) {
        const id = this.generateHeadingId(block.content);
        const level = Math.min(block.level, 6);
        const content = this.parseInlineMarkdown(block.content);
        
        return `<h${level} id="${id}">${content}</h${level}>`;
    }

    /**
     * Parse paragraph block
     * @param {Object} block 
     * @returns {string} HTML
     */
    parseParagraph(block) {
        const content = this.parseInlineMarkdown(block.content.join(' '));
        return `<p>${content}</p>`;
    }

    /**
     * Parse code block
     * @param {Object} block 
     * @returns {string} HTML
     */
    parseCodeBlock(block) {
        const escapedContent = this.escapeHtml(block.content);
        const language = block.language ? ` class="language-${this.escapeHtml(block.language)}"` : '';
        
        return `<pre><code${language}>${escapedContent}</code></pre>`;
    }

    /**
     * Parse blockquote
     * @param {Object} block 
     * @returns {string} HTML
     */
    parseBlockquote(block) {
        const content = this.parseInlineMarkdown(block.content.join('\n'));
        return `<blockquote>${content}</blockquote>`;
    }

    /**
     * Parse list block
     * @param {Object} block 
     * @returns {string} HTML
     */
    parseList(block) {
        const tag = block.ordered ? 'ol' : 'ul';
        const items = block.items.map(item => {
            const content = this.parseInlineMarkdown(item.text);
            return `<li>${content}</li>`;
        }).join('\n');
        
        return `<${tag}>\n${items}\n</${tag}>`;
    }

    /**
     * Parse table block
     * @param {Object} block 
     * @returns {string} HTML
     */
    parseTable(block) {
        const [headerRow, ...dataRows] = block.rows;
        
        const headerHtml = headerRow.map((cell, index) => {
            const align = block.alignments[index];
            const style = align ? ` style="text-align: ${align}"` : '';
            const content = this.parseInlineMarkdown(cell);
            return `<th${style}>${content}</th>`;
        }).join('');
        
        const bodyHtml = dataRows.map(row => {
            const cells = row.map((cell, index) => {
                const align = block.alignments[index];
                const style = align ? ` style="text-align: ${align}"` : '';
                const content = this.parseInlineMarkdown(cell);
                return `<td${style}>${content}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('\n');
        
        return `<table>\n<thead>\n<tr>${headerHtml}</tr>\n</thead>\n<tbody>\n${bodyHtml}\n</tbody>\n</table>`;
    }

    /**
     * Parse inline markdown (bold, italic, links, code, etc.)
     * @param {string} text 
     * @returns {string} HTML
     */
    parseInlineMarkdown(text) {
        // Code spans (must be done first to avoid processing markdown inside code)
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Bold and italic
        text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
        text = text.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
        
        // Links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
            const cleanUrl = this.resolveUrl(url);
            const isExternal = url.startsWith('http');
            const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            const ariaLabel = isExternal ? ` aria-label="${this.escapeHtml(linkText)} (opens in new tab)"` : '';
            
            return `<a href="${this.escapeHtml(cleanUrl)}"${target}${ariaLabel}>${this.escapeHtml(linkText)}</a>`;
        });
        
        // Images
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, altText, url) => {
            const cleanUrl = this.resolveUrl(url);
            const alt = altText || 'Image';
            
            return `<img src="${this.escapeHtml(cleanUrl)}" alt="${this.escapeHtml(alt)}" loading="lazy">`;
        });
        
        // Strikethrough
        text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        
        // Line breaks
        text = text.replace(/  \n/g, '<br>\n');
        
        return text;
    }

    /**
     * Parse table row
     * @param {string} row 
     * @returns {Array} Array of cell contents
     */
    parseTableRow(row) {
        return row.split('|')
            .map(cell => cell.trim())
            .filter((cell, index, array) => {
                // Remove empty cells at the beginning and end
                return !(cell === '' && (index === 0 || index === array.length - 1));
            });
    }

    /**
     * Parse table alignments from separator row
     * @param {string} separator 
     * @returns {Array} Array of alignment strings
     */
    parseTableAlignments(separator) {
        return separator.split('|')
            .map(cell => cell.trim())
            .filter(cell => cell !== '')
            .map(cell => {
                if (cell.startsWith(':') && cell.endsWith(':')) {
                    return 'center';
                } else if (cell.endsWith(':')) {
                    return 'right';
                } else {
                    return 'left';
                }
            });
    }

    /**
     * Generate unique heading ID for table of contents
     * @param {string} text 
     * @returns {string} ID
     */
    generateHeadingId(text) {
        let id = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        // Ensure uniqueness
        const originalId = id;
        let counter = 1;
        while (this.headingCounter[id]) {
            id = `${originalId}-${counter}`;
            counter++;
        }
        
        this.headingCounter[id] = true;
        return id;
    }

    /**
     * Resolve relative URLs
     * @param {string} url 
     * @returns {string} Resolved URL
     */
    resolveUrl(url) {
        if (url.startsWith('http') || url.startsWith('#') || url.startsWith('/')) {
            return url;
        }
        
        // Resolve relative to current path
        if (this.currentPath) {
            const basePath = this.currentPath.replace(/\/[^/]*$/, '/');
            return basePath + url;
        }
        
        return url;
    }

    /**
     * Escape HTML special characters
     * @param {string} text 
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Extract table of contents from markdown
     * @param {string} markdown 
     * @returns {Array} TOC structure
     */
    extractTableOfContents(markdown) {
        const lines = markdown.split('\n');
        const toc = [];
        
        for (const line of lines) {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                const level = match[1].length;
                const text = match[2].replace(/\s*#+\s*$/, ''); // Remove trailing #
                const id = this.generateHeadingId(text);
                
                toc.push({
                    level: level,
                    text: text,
                    id: id
                });
            }
        }
        
        return toc;
    }

    /**
     * Extract plain text from markdown for search indexing
     * @param {string} markdown 
     * @returns {string} Plain text
     */
    extractPlainText(markdown) {
        // Remove code blocks
        markdown = markdown.replace(/```[\s\S]*?```/g, '');
        
        // Remove inline code
        markdown = markdown.replace(/`[^`]+`/g, '');
        
        // Remove links but keep text
        markdown = markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        
        // Remove images
        markdown = markdown.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
        
        // Remove markdown formatting
        markdown = markdown.replace(/[#*_~`]/g, '');
        
        // Remove blockquote markers
        markdown = markdown.replace(/^\s*>\s?/gm, '');
        
        // Remove list markers
        markdown = markdown.replace(/^\s*[-*+]\s/gm, '');
        markdown = markdown.replace(/^\s*\d+\.\s/gm, '');
        
        // Clean up whitespace
        markdown = markdown.replace(/\s+/g, ' ').trim();
        
        return markdown;
    }
}

// Export for use in other modules
window.MarkdownParser = MarkdownParser;