


class EnhancedThemeSystem {
    constructor() {
        this.currentTheme = 'bekaei-dark';
        this.customThemes = new Map();
        this.themePresets = new Map();
        this.themeEditor = null;
        this.init();
    }

    async init() {
        this.loadThemePresets();
        this.loadCustomThemes();
        this.setupThemeSwitcher();
        this.setupThemeEditor();
        this.applyCurrentTheme();
    }


    loadThemePresets() {
        this.themePresets.set('bekaei-dark', {
            name: 'Bekaei Dark',
            author: 'Bekaei Team',
            description: 'Default dark theme with optimized readability',
            colors: {
                background: '#0d1117',
                foreground: '#c9d1d9',
                sidebar: '#161b22',
                panel: '#161b22',
                border: '#30363d',
                accent: '#58a6ff',
                success: '#2ea043',
                warning: '#d29922',
                error: '#f85149',
                text: '#c9d1d9',
                muted: '#8b949e',
                highlight: '#79c0ff'
            },
            editor: {
                background: '#0d1117',
                foreground: '#c9d1d9',
                cursor: '#f85149',
                selection: '#1f6feb40',
                lineHighlight: '#161b22',
                lineNumber: '#8b949e',
                bracketMatch: '#2d333b'
            }
        });

        this.themePresets.set('bekaei-light', {
            name: 'Bekaei Light',
            author: 'Bekaei Team',
            description: 'Clean light theme for bright environments',
            colors: {
                background: '#ffffff',
                foreground: '#24292f',
                sidebar: '#f6f8fa',
                panel: '#f6f8fa',
                border: '#e1e4e8',
                accent: '#0969da',
                success: '#1f883d',
                warning: '#9a6700',
                error: '#d73a49',
                text: '#24292f',
                muted: '#6e7681',
                highlight: '#0969da'
            },
            editor: {
                background: '#ffffff',
                foreground: '#24292f',
                cursor: '#d73a49',
                selection: '#0969da40',
                lineHighlight: '#f6f8fa',
                lineNumber: '#6e7681',
                bracketMatch: '#eaeef2'
            }
        });

        this.themePresets.set('terminal-dark', {
            name: 'Terminal Dark',
            author: 'Bekaei Team',
            description: 'Terminal-inspired dark theme',
            colors: {
                background: '#000000',
                foreground: '#00ff00',
                sidebar: '#111111',
                panel: '#111111',
                border: '#333333',
                accent: '#00ff00',
                success: '#00ff00',
                warning: '#ffff00',
                error: '#ff0000',
                text: '#00ff00',
                muted: '#888888',
                highlight: '#00ffff'
            },
            editor: {
                background: '#000000',
                foreground: '#00ff00',
                cursor: '#00ff00',
                selection: '#00ff0040',
                lineHighlight: '#111111',
                lineNumber: '#555555',
                bracketMatch: '#333333'
            }
        });

        this.themePresets.set('minimal-dark', {
            name: 'Minimal Dark',
            author: 'Bekaei Team',
            description: 'Minimal dark theme with subtle accents',
            colors: {
                background: '#1a1a1a',
                foreground: '#ffffff',
                sidebar: '#222222',
                panel: '#222222',
                border: '#444444',
                accent: '#ffffff',
                success: '#ffffff',
                warning: '#ffffff',
                error: '#ffffff',
                text: '#ffffff',
                muted: '#aaaaaa',
                highlight: '#ffffff'
            },
            editor: {
                background: '#1a1a1a',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selection: '#ffffff40',
                lineHighlight: '#222222',
                lineNumber: '#888888',
                bracketMatch: '#444444'
            }
        });

        this.themePresets.set('high-contrast', {
            name: 'High Contrast',
            author: 'Bekaei Team',
            description: 'High contrast theme for accessibility',
            colors: {
                background: '#000000',
                foreground: '#ffffff',
                sidebar: '#333333',
                panel: '#333333',
                border: '#ffffff',
                accent: '#ffff00',
                success: '#00ff00',
                warning: '#ff8800',
                error: '#ff0000',
                text: '#ffffff',
                muted: '#888888',
                highlight: '#ffff00'
            },
            editor: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#ffff00',
                selection: '#ffff0040',
                lineHighlight: '#333333',
                lineNumber: '#888888',
                bracketMatch: '#ffffff'
            }
        });
    }


    loadCustomThemes() {
        const savedThemes = localStorage.getItem('bekaei-custom-themes');
        if (savedThemes) {
            try {
                const themes = JSON.parse(savedThemes);
                themes.forEach(theme => {
                    this.customThemes.set(theme.id, theme);
                });
            } catch (error) {
                console.error('Error loading custom themes:', error);
            }
        }
    }

    saveCustomThemes() {
        const themesArray = Array.from(this.customThemes.values());
        localStorage.setItem('bekaei-custom-themes', JSON.stringify(themesArray));
    }

    createCustomTheme(themeData) {
        const themeId = 'custom-' + Date.now();
        const theme = {
            id: themeId,
            name: themeData.name || 'Custom Theme',
            author: themeData.author || 'User',
            description: themeData.description || 'Custom theme',
            colors: themeData.colors || {},
            editor: themeData.editor || {},
            isCustom: true
        };

        this.customThemes.set(themeId, theme);
        this.saveCustomThemes();
        return themeId;
    }

    deleteCustomTheme(themeId) {
        this.customThemes.delete(themeId);
        this.saveCustomThemes();
    }


    setupThemeSwitcher() {

        const switcher = document.createElement('div');
        switcher.className = 'theme-switcher';
        switcher.innerHTML = `
            <div class="theme-header">
                <h3>Theme Manager</h3>
                <button onclick="window.enhancedTheme.openThemeEditor()">Create Theme</button>
            </div>
            <div class="theme-list" id="theme-list">
                ${this.renderThemeList()}
            </div>
        `;


        const settingsPanel = document.getElementById('panel-ai');
        if (settingsPanel) {
            settingsPanel.appendChild(switcher);
        }
    }

    renderThemeList() {
        let html = '';


        this.themePresets.forEach((theme, key) => {
            html += `
                <div class="theme-item ${this.currentTheme === key ? 'active' : ''}" onclick="window.enhancedTheme.switchTheme('${key}')">
                    <div class="theme-preview">
                        <div class="preview-colors">
                            <div style="background:${theme.colors.accent}"></div>
                            <div style="background:${theme.colors.success}"></div>
                            <div style="background:${theme.colors.warning}"></div>
                            <div style="background:${theme.colors.error}"></div>
                        </div>
                    </div>
                    <div class="theme-info">
                        <div class="theme-name">${theme.name}</div>
                        <div class="theme-author">${theme.author}</div>
                        <div class="theme-desc">${theme.description}</div>
                    </div>
                </div>
            `;
        });


        this.customThemes.forEach(theme => {
            html += `
                <div class="theme-item custom ${this.currentTheme === theme.id ? 'active' : ''}" onclick="window.enhancedTheme.switchTheme('${theme.id}')">
                    <div class="theme-preview">
                        <div class="preview-colors">
                            <div style="background:${theme.colors.accent || '#58a6ff'}"></div>
                            <div style="background:${theme.colors.success || '#2ea043'}"></div>
                            <div style="background:${theme.colors.warning || '#d29922'}"></div>
                            <div style="background:${theme.colors.error || '#f85149'}"></div>
                        </div>
                    </div>
                    <div class="theme-info">
                        <div class="theme-name">${theme.name}</div>
                        <div class="theme-author">${theme.author}</div>
                        <div class="theme-desc">${theme.description}</div>
                        <div class="theme-actions">
                            <button onclick="event.stopPropagation(); window.enhancedTheme.editCustomTheme('${theme.id}')">Edit</button>
                            <button onclick="event.stopPropagation(); window.enhancedTheme.deleteCustomTheme('${theme.id}')" class="danger">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        });

        return html;
    }

    switchTheme(themeId) {
        this.currentTheme = themeId;
        this.applyCurrentTheme();
        localStorage.setItem('bekaei-theme', themeId);


        this.updateThemeListUI();


        if (window.showToast) {
            const theme = this.getTheme(themeId);
            window.showToast(`Theme switched to ${theme.name}`, 'success');
        }
    }

    updateThemeListUI() {
        const themeList = document.getElementById('theme-list');
        if (themeList) {
            themeList.innerHTML = this.renderThemeList();
        }
    }

    getTheme(themeId) {
        return this.themePresets.get(themeId) || this.customThemes.get(themeId);
    }


    applyCurrentTheme() {
        const theme = this.getTheme(this.currentTheme);
        if (!theme) return;


        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });


        if (window.monaco && window.editor) {

            const monacoTheme = {
                base: theme.editor.background === '#ffffff' ? 'vs' : 'vs-dark',
                inherit: true,
                rules: [
                    { token: '', foreground: theme.editor.foreground },
                    { token: 'keyword', foreground: theme.colors.accent },
                    { token: 'string', foreground: theme.colors.highlight },
                    { token: 'number', foreground: theme.colors.highlight },
                    { token: 'comment', foreground: theme.colors.muted, fontStyle: 'italic' }
                ],
                colors: {
                    'editor.background': theme.editor.background,
                    'editor.foreground': theme.editor.foreground,
                    'editorCursor.foreground': theme.editor.cursor,
                    'editor.selectionBackground': theme.editor.selection,
                    'editor.lineHighlightBackground': theme.editor.lineHighlight,
                    'editorLineNumber.foreground': theme.editor.lineNumber,
                    'editorBracketMatch.background': theme.editor.bracketMatch
                }
            };


            window.monaco.editor.defineTheme('current-theme', monacoTheme);
            window.monaco.editor.setTheme('current-theme');
        }


        if (window.editor) {
            window.editor.updateOptions({
                theme: 'current-theme'
            });
        }
    }


    setupThemeEditor() {
        this.themeEditor = {
            currentEditingTheme: null,
            init: () => {
                this.createThemeEditorModal();
            }
        };
    }

    createThemeEditorModal() {
        const modal = document.createElement('div');
        modal.className = 'theme-editor-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Theme Editor</h3>
                <div class="theme-editor-form">
                    <div class="form-group">
                        <label>Theme Name</label>
                        <input type="text" id="theme-name" placeholder="Enter theme name">
                    </div>
                    <div class="form-group">
                        <label>Author</label>
                        <input type="text" id="theme-author" placeholder="Your name">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="theme-desc" placeholder="Describe your theme"></textarea>
                    </div>
                    
                    <div class="color-section">
                        <h4>UI Colors</h4>
                        <div class="color-grid">
                            ${this.createColorInputs(['background', 'foreground', 'sidebar', 'panel', 'border', 'accent', 'success', 'warning', 'error', 'text', 'muted', 'highlight'])}
                        </div>
                    </div>
                    
                    <div class="color-section">
                        <h4>Editor Colors</h4>
                        <div class="color-grid">
                            ${this.createColorInputs(['editor-background', 'editor-foreground', 'editor-cursor', 'editor-selection', 'editor-lineHighlight', 'editor-lineNumber', 'editor-bracketMatch'], 'editor')}
                        </div>
                    </div>
                    
                    <div class="theme-actions">
                        <button onclick="window.enhancedTheme.saveTheme()">Save Theme</button>
                        <button onclick="window.enhancedTheme.previewTheme()">Preview</button>
                        <button onclick="window.enhancedTheme.resetTheme()">Reset</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    createColorInputs(colors, prefix = '') {
        return colors.map(color => `
            <div class="color-input">
                <label>${color.replace('-', ' ')}</label>
                <input type="color" id="${prefix ? prefix + '-' : ''}${color}" value="#58a6ff">
            </div>
        `).join('');
    }

    openThemeEditor() {
        const modal = document.querySelector('.theme-editor-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeThemeEditor() {
        const modal = document.querySelector('.theme-editor-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    saveTheme() {
        const themeData = {
            name: document.getElementById('theme-name').value,
            author: document.getElementById('theme-author').value,
            description: document.getElementById('theme-desc').value,
            colors: this.getThemeColors(),
            editor: this.getEditorColors()
        };

        const themeId = this.createCustomTheme(themeData);
        this.switchTheme(themeId);
        this.closeThemeEditor();

        if (window.showToast) {
            window.showToast('Custom theme saved and applied!', 'success');
        }
    }

    getThemeColors() {
        const colors = ['background', 'foreground', 'sidebar', 'panel', 'border', 'accent', 'success', 'warning', 'error', 'text', 'muted', 'highlight'];
        const result = {};

        colors.forEach(color => {
            const input = document.getElementById(color);
            if (input) {
                result[color] = input.value;
            }
        });

        return result;
    }

    getEditorColors() {
        const colors = ['editor-background', 'editor-foreground', 'editor-cursor', 'editor-selection', 'editor-lineHighlight', 'editor-lineNumber', 'editor-bracketMatch'];
        const result = {};

        colors.forEach(color => {
            const input = document.getElementById(color);
            if (input) {
                result[color.replace('editor-', '')] = input.value;
            }
        });

        return result;
    }

    previewTheme() {
        const themeData = {
            name: document.getElementById('theme-name').value || 'Preview',
            author: document.getElementById('theme-author').value || 'User',
            description: document.getElementById('theme-desc').value || 'Preview theme',
            colors: this.getThemeColors(),
            editor: this.getEditorColors()
        };


        this.applyPreviewTheme(themeData);
    }

    applyPreviewTheme(themeData) {
        const root = document.documentElement;
        Object.entries(themeData.colors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });


        if (window.monaco) {
            const monacoTheme = {
                base: themeData.editor.background === '#ffffff' ? 'vs' : 'vs-dark',
                inherit: true,
                rules: [
                    { token: '', foreground: themeData.editor.foreground },
                    { token: 'keyword', foreground: themeData.colors.accent },
                    { token: 'string', foreground: themeData.colors.highlight },
                    { token: 'number', foreground: themeData.colors.highlight },
                    { token: 'comment', foreground: themeData.colors.muted, fontStyle: 'italic' }
                ],
                colors: {
                    'editor.background': themeData.editor.background,
                    'editor.foreground': themeData.editor.foreground,
                    'editorCursor.foreground': themeData.editor.cursor,
                    'editor.selectionBackground': themeData.editor.selection,
                    'editor.lineHighlightBackground': themeData.editor.lineHighlight,
                    'editorLineNumber.foreground': themeData.editor.lineNumber,
                    'editorBracketMatch.background': themeData.editor.bracketMatch
                }
            };

            window.monaco.editor.defineTheme('preview-theme', monacoTheme);
            window.monaco.editor.setTheme('preview-theme');
        }
    }

    resetTheme() {

        const currentTheme = this.getTheme(this.currentTheme);
        if (currentTheme) {
            this.populateThemeEditor(currentTheme);
        }
    }

    populateThemeEditor(theme) {
        document.getElementById('theme-name').value = theme.name;
        document.getElementById('theme-author').value = theme.author;
        document.getElementById('theme-desc').value = theme.description;


        Object.entries(theme.colors).forEach(([key, value]) => {
            const input = document.getElementById(key);
            if (input) input.value = value;
        });


        Object.entries(theme.editor).forEach(([key, value]) => {
            const input = document.getElementById('editor-' + key);
            if (input) input.value = value;
        });
    }

    editCustomTheme(themeId) {
        const theme = this.customThemes.get(themeId);
        if (theme) {
            this.populateThemeEditor(theme);
            this.openThemeEditor();
        }
    }


    setupThemeMarketplace() {


        console.log('Theme marketplace integration ready');
    }


    exportTheme(themeId) {
        const theme = this.getTheme(themeId);
        if (!theme) return null;

        const themeData = JSON.stringify(theme, null, 2);
        const blob = new Blob([themeData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${theme.name.replace(/\s+/g, '-').toLowerCase()}.theme.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            window.showToast('Theme exported successfully', 'success');
        }
    }

    importTheme(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const themeData = JSON.parse(e.target.result);
                    const themeId = this.createCustomTheme(themeData);
                    resolve(themeId);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }
}


window.enhancedTheme = new EnhancedThemeSystem();


window.switchTheme = (themeId) => window.enhancedTheme.switchTheme(themeId);
window.createCustomTheme = (themeData) => window.enhancedTheme.createCustomTheme(themeData);
window.deleteCustomTheme = (themeId) => window.enhancedTheme.deleteCustomTheme(themeId);
window.openThemeEditor = () => window.enhancedTheme.openThemeEditor();
window.saveTheme = () => window.enhancedTheme.saveTheme();
window.previewTheme = () => window.enhancedTheme.previewTheme();
window.resetTheme = () => window.enhancedTheme.resetTheme();
window.exportTheme = (themeId) => window.enhancedTheme.exportTheme(themeId);
window.importTheme = (file) => window.enhancedTheme.importTheme(file);

