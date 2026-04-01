


class EnhancedCodeFormatter {
    constructor() {
        this.formatters = {
            javascript: this.formatJavaScript,
            typescript: this.formatTypeScript,
            html: this.formatHTML,
            css: this.formatCSS,
            json: this.formatJSON,
            python: this.formatPython,
            java: this.formatJava,
            c: this.formatC,
            cpp: this.formatCPlusPlus,
            csharp: this.formatCSharp,
            php: this.formatPHP,
            ruby: this.formatRuby,
            go: this.formatGo,
            rust: this.formatRust,
            swift: this.formatSwift,
            kotlin: this.formatKotlin,
            sql: this.formatSQL,
            markdown: this.formatMarkdown,
            yaml: this.formatYAML,
            xml: this.formatXML
        };

        this.defaultOptions = {
            indentSize: 4,
            useTabs: false,
            bracketSpacing: true,
            semi: true,
            singleQuote: false,
            trailingComma: 'es5',
            arrowParens: 'always',
            printWidth: 80,
            tabWidth: 4,
            endOfLine: 'lf'
        };

        this.init();
    }

    init() {

        this.waitForEditor();
        this.setupEventListeners();
    }

    waitForEditor() {
        const checkEditor = () => {
            if (window.editor) {
                this.setupEditorIntegration();
            } else {
                setTimeout(checkEditor, 100);
            }
        };
        checkEditor();
    }

    setupEditorIntegration() {

        this.addFormatCommand();


        this.addFormatOnSave();


        this.addFormatSelectionCommand();
    }

    setupEventListeners() {

        window.formatDocument = () => this.formatCurrentDocument();
        window.formatSelection = () => this.formatCurrentSelection();
        window.toggleFormatOnSave = (enabled) => this.toggleFormatOnSave(enabled);
    }

    addFormatCommand() {

        if (window.editor) {
            window.editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_F,
                () => this.formatCurrentDocument()
            );


            if (window.editor._contextMenu) {
                window.editor._contextMenu.addAction({
                    id: 'format-document',
                    label: 'Format Document',
                    contextMenuGroupId: 'navigation',
                    run: () => this.formatCurrentDocument()
                });
            }
        }
    }

    addFormatSelectionCommand() {
        if (window.editor) {
            window.editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_F,
                () => this.formatCurrentSelection()
            );
        }
    }

    addFormatOnSave() {

        if (window.config && window.config.formatOnSave) {
            this.setupFormatOnSave();
        }
    }

    setupFormatOnSave() {
        if (window.editor) {
            let isFormatting = false;

            window.editor.onDidSaveModel(() => {
                if (isFormatting) return;

                const model = window.editor.getModel();
                if (!model) return;

                const file = window.localFiles.find(f => f.id === window.activeFileId);
                if (!file) return;

                isFormatting = true;
                this.formatDocumentContent(file.content, file.lang)
                    .then(formatted => {
                        if (formatted !== file.content) {
                            file.content = formatted;
                            model.setValue(formatted);
                            this.showFormatSuccess('Document formatted on save');
                        }
                        isFormatting = false;
                    })
                    .catch(error => {
                        console.error('Format on save error:', error);
                        isFormatting = false;
                    });
            });
        }
    }

    toggleFormatOnSave(enabled) {
        if (window.config) {
            window.config.formatOnSave = enabled;
            localStorage.kg_bekaei_config = JSON.stringify(window.config);

            if (enabled) {
                this.setupFormatOnSave();
                this.showToast('Format on save enabled', 'success');
            } else {
                this.showToast('Format on save disabled', 'info');
            }
        }
    }

    formatCurrentDocument() {
        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file to format', 'error');
            return;
        }

        this.showToast('Formatting document...', 'info');

        this.formatDocumentContent(file.content, file.lang)
            .then(formatted => {
                if (formatted !== file.content) {
                    file.content = formatted;
                    if (window.editor) {
                        window.editor.setValue(formatted);
                    }
                    this.showFormatSuccess('Document formatted successfully');
                } else {
                    this.showToast('Document is already formatted', 'info');
                }
            })
            .catch(error => {
                console.error('Format error:', error);
                this.showToast('Format failed: ' + error.message, 'error');
            });
    }

    formatCurrentSelection() {
        if (!window.editor) {
            this.showToast('Editor not ready', 'error');
            return;
        }

        const selection = window.editor.getSelection();
        if (!selection) {
            this.showToast('No selection to format', 'error');
            return;
        }

        const selectedText = window.editor.getModel().getValueInRange(selection);
        if (!selectedText || selectedText.trim() === '') {
            this.showToast('No text selected', 'error');
            return;
        }

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file', 'error');
            return;
        }

        this.showToast('Formatting selection...', 'info');

        this.formatDocumentContent(selectedText, file.lang)
            .then(formatted => {
                if (formatted !== selectedText) {
                    window.editor.executeEdits('format-selection', [{
                        range: selection,
                        text: formatted
                    }]);
                    this.showFormatSuccess('Selection formatted successfully');
                } else {
                    this.showToast('Selection is already formatted', 'info');
                }
            })
            .catch(error => {
                console.error('Format selection error:', error);
                this.showToast('Format failed: ' + error.message, 'error');
            });
    }

    async formatDocumentContent(content, language) {
        if (!content || typeof content !== 'string') {
            return content;
        }

        try {

            const formatter = this.formatters[language.toLowerCase()] || this.formatters['javascript'];
            return await formatter.call(this, content);
        } catch (error) {
            console.error('Format error for ' + language + ':', error);
            throw error;
        }
    }


    async formatJavaScript(content) {
        return this.formatWithPrettier(content, 'javascript');
    }

    async formatTypeScript(content) {
        return this.formatWithPrettier(content, 'typescript');
    }

    async formatHTML(content) {
        return this.formatWithPrettier(content, 'html');
    }

    async formatCSS(content) {
        return this.formatWithPrettier(content, 'css');
    }

    async formatJSON(content) {
        return this.formatWithPrettier(content, 'json');
    }

    async formatPython(content) {
        return this.formatWithPrettier(content, 'python');
    }

    async formatJava(content) {
        return this.formatWithPrettier(content, 'java');
    }

    async formatC(content) {
        return this.formatWithPrettier(content, 'c');
    }

    async formatCPlusPlus(content) {
        return this.formatWithPrettier(content, 'cpp');
    }

    async formatCSharp(content) {
        return this.formatWithPrettier(content, 'csharp');
    }

    async formatPHP(content) {
        return this.formatWithPrettier(content, 'php');
    }

    async formatRuby(content) {
        return this.formatWithPrettier(content, 'ruby');
    }

    async formatGo(content) {
        return this.formatWithPrettier(content, 'go');
    }

    async formatRust(content) {
        return this.formatWithPrettier(content, 'rust');
    }

    async formatSwift(content) {
        return this.formatWithPrettier(content, 'swift');
    }

    async formatKotlin(content) {
        return this.formatWithPrettier(content, 'kotlin');
    }

    async formatSQL(content) {
        return this.formatWithPrettier(content, 'sql');
    }

    async formatMarkdown(content) {
        return this.formatWithPrettier(content, 'markdown');
    }

    async formatYAML(content) {
        return this.formatWithPrettier(content, 'yaml');
    }

    async formatXML(content) {
        return this.formatWithPrettier(content, 'xml');
    }

    async formatWithPrettier(content, parser) {
        try {

            await this.loadPrettier();

            if (window.prettier) {
                const options = {
                    parser: parser,
                    plugins: window.prettierPlugins || [],
                    ...this.defaultOptions
                };

                return window.prettier.format(content, options);
            } else {

                return this.basicFormat(content);
            }
        } catch (error) {
            console.error('Prettier format error:', error);
            return this.basicFormat(content);
        }
    }

    async loadPrettier() {
        if (window.prettier) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/prettier@3.0.0/standalone.mjs';
            script.onload = () => {

                this.loadPrettierPlugins().then(resolve).catch(reject);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadPrettierPlugins() {
        const plugins = [
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/babel.mjs',
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/estree.mjs',
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/html.mjs',
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/postcss.mjs',
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/typescript.mjs',
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/flow.mjs',
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/glimmer.mjs',
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/graphql.mjs',
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/markdown.mjs',
            'https://cdn.jsdelivr.net/npm/prettier@3.0.0/plugins/yaml.mjs'
        ];

        window.prettierPlugins = [];

        for (const pluginUrl of plugins) {
            try {
                const response = await fetch(pluginUrl);
                const pluginCode = await response.text();
                const pluginModule = { exports: {} };
                new Function('exports', 'module', pluginCode)(pluginModule.exports, pluginModule);
                window.prettierPlugins.push(pluginModule.exports);
            } catch (error) {
                console.warn('Failed to load Prettier plugin:', pluginUrl, error);
            }
        }
    }

    basicFormat(content) {
        try {

            let lines = content.split('\n');
            let indentLevel = 0;
            let inString = false;
            let inComment = false;
            let quoteChar = '';

            const formattedLines = lines.map(line => {
                const trimmed = line.trim();


                if (!inString && (trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith('`'))) {
                    inString = true;
                    quoteChar = trimmed[0];
                }

                if (inString && trimmed.endsWith(quoteChar) && !trimmed.endsWith('\\' + quoteChar)) {
                    inString = false;
                    quoteChar = '';
                }


                if (trimmed.startsWith('//')) inComment = true;
                if (trimmed.startsWith('')) inComment = false;


                if (inString || inComment) {
                    return line;
                }


                const newIndentLevel = this.getIndentLevel(trimmed, indentLevel);
                const indent = ' '.repeat(newIndentLevel * this.defaultOptions.indentSize);
                indentLevel = newIndentLevel;

                return indent + trimmed;
            });

            return formattedLines.join('\n');
        } catch (error) {
            console.error('Basic format error:', error);
            return content;
        }
    }

    getIndentLevel(line, currentLevel) {
        const trimmed = line.trim();


        if (trimmed.endsWith('{') || trimmed.endsWith('(') || trimmed.endsWith('[')) {
            return currentLevel + 1;
        }


        if (trimmed.startsWith('}') || trimmed.startsWith(')') || trimmed.startsWith(']')) {
            return Math.max(0, currentLevel - 1);
        }


        if (trimmed === 'else' || trimmed === 'else if' || trimmed === 'catch' || trimmed === 'finally') {
            return Math.max(0, currentLevel - 1);
        }

        return currentLevel;
    }


    showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    showFormatSuccess(message) {
        this.showToast(message, 'success');
    }
}


window.enhancedCodeFormatter = new EnhancedCodeFormatter();


window.formatDocument = () => window.enhancedCodeFormatter.formatCurrentDocument();
window.formatSelection = () => window.enhancedCodeFormatter.formatCurrentSelection();
window.toggleFormatOnSave = (enabled) => window.enhancedCodeFormatter.toggleFormatOnSave(enabled);

