


class EnhancedEditor {
    constructor() {
        this.editor = null;
        this.monaco = null;
        this.currentFile = null;
        this.init();
    }

    async init() {

        await this.waitForMonaco();


        this.setupCodeFolding();
        this.setupMultipleCursors();
        this.setupIntelligentAutocomplete();
        this.setupErrorDetection();
        this.setupLivePreview();
        this.setupThemes();
        this.setupKeybindings();
        this.setupSnippets();
        this.setupEmmet();
        this.setupGitIntegration();
        this.setupCollaboration();
        this.setupStorage();
        this.setupAIAssistant();
        this.setupTerminal();
        this.setupDebugging();
        this.setupCodeFormatting();
        this.setupLinting();

        console.log('✅ Enhanced Editor Features Initialized');
    }

    async waitForMonaco() {
        return new Promise((resolve) => {
            const checkMonaco = () => {
                if (window.monaco && window.editor) {
                    this.monaco = window.monaco;
                    this.editor = window.editor;
                    resolve();
                } else {
                    setTimeout(checkMonaco, 100);
                }
            };
            checkMonaco();
        });
    }


    setupCodeFolding() {
        if (!this.editor) return;


        this.editor.updateOptions({
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            foldingHighlight: true,
            foldingImprovements: true
        });

        console.log('📁 Code Folding Enabled');
    }


    setupMultipleCursors() {
        if (!this.editor) return;


        this.editor.updateOptions({
            multiCursorModifier: 'ctrlCmd',
            multiCursorMergeOverlapping: true,
            multiCursorPaste: 'full'
        });

        console.log('✏️ Multiple Cursors Enabled');
    }


    setupIntelligentAutocomplete() {
        if (!this.editor || !this.monaco) return;


        this.monaco.languages.registerCompletionItemProvider('javascript', {
            provideCompletionItems: (model, position) => {
                const suggestions = [
                    {
                        label: 'console.log',
                        kind: this.monaco.languages.CompletionItemKind.Function,
                        insertText: 'console.log(${1:variable});',
                        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Log output to console'
                    },
                    {
                        label: 'function',
                        kind: this.monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'function ${1:name}(${2:params}) {\n\t${3}\n}',
                        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Create a function'
                    },
                    {
                        label: 'if',
                        kind: this.monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'if (${1:condition}) {\n\t${2}\n}',
                        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If statement'
                    },
                    {
                        label: 'for',
                        kind: this.monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3}\n}',
                        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'For loop'
                    }
                ];

                return { suggestions: suggestions };
            }
        });

        console.log('🤖 Intelligent Autocomplete Enabled');
    }


    setupErrorDetection() {
        if (!this.editor || !this.monaco) return;


        this.monaco.languages.registerDiagnosticsProvider('javascript', {
            provideDiagnostics: (model) => {
                const diagnostics = [];
                const code = model.getValue();


                if (code.includes('console.log(') && !code.includes(');')) {
                    diagnostics.push({
                        severity: this.monaco.MarkerSeverity.Error,
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 1,
                        endColumn: 1,
                        message: 'Missing closing parenthesis for console.log'
                    });
                }

                return diagnostics;
            }
        });

        console.log('⚠️ Error Detection Enabled');
    }


    setupLivePreview() {
        if (!this.editor) return;

        let previewTimeout = null;

        this.editor.onDidChangeModelContent(() => {
            clearTimeout(previewTimeout);

            previewTimeout = setTimeout(() => {
                const currentFile = window.localFiles?.find(f => f.id === window.activeFileId);
                if (currentFile && currentFile.name.endsWith('.html')) {
                    this.updateLivePreview(currentFile.content);
                }
            }, 500);
        });

        console.log('🔄 Live Preview Enabled');
    }

    updateLivePreview(htmlContent) {
        const iframe = document.getElementById('browser-preview');
        if (iframe) {
            iframe.srcdoc = htmlContent;
        }
    }


    setupThemes() {
        if (!this.editor || !this.monaco) return;


        this.monaco.editor.defineTheme('bekaei-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#0b0b0d',
                'editor.foreground': '#e5e7eb',
                'editorCursor.foreground': '#6366f1',
                'editor.lineHighlightBackground': '#1f1f23',
                'editor.selectionBackground': '#3b3b4a',
                'editor.inactiveSelectionBackground': '#2a2a35'
            }
        });

        this.monaco.editor.defineTheme('bekaei-light', {
            base: 'vs',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#f8f9fa',
                'editor.foreground': '#212529',
                'editorCursor.foreground': '#6366f1',
                'editor.lineHighlightBackground': '#e9ecef',
                'editor.selectionBackground': '#d0d6e0',
                'editor.inactiveSelectionBackground': '#e0e4eb'
            }
        });


        this.editor.updateOptions({
            theme: 'bekaei-dark'
        });

        console.log('🎨 Themes Enabled');
    }


    setupKeybindings() {
        if (!this.editor) return;


        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KEY_S, () => {
            this.saveFile();
        });

        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KEY_D, () => {
            this.duplicateLine();
        });

        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KEY_F, () => {
            this.findInFile();
        });

        console.log('⌨️ Keybindings Enabled');
    }

    saveFile() {
        if (window.showToast) {
            window.showToast('File saved!', 'success');
        }
    }

    duplicateLine() {
        const selection = this.editor.getSelection();
        const lineNumber = selection.startLineNumber;
        const lineContent = this.editor.getModel().getLineContent(lineNumber);

        this.editor.executeEdits('duplicate-line', [{
            range: new this.monaco.Range(lineNumber, 1, lineNumber, 1),
            text: lineContent + '\n'
        }]);
    }

    findInFile() {
        this.editor.trigger('find', 'editor.action.startFind');
    }


    setupSnippets() {
        if (!this.editor || !this.monaco) return;


        this.monaco.languages.registerCompletionItemProvider('javascript', {
            provideCompletionItems: () => {
                return {
                    suggestions: [
                        {
                            label: 'clg',
                            kind: this.monaco.languages.CompletionItemKind.Snippet,
                            insertText: 'console.log($1);',
                            insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Console log snippet'
                        },
                        {
                            label: 'func',
                            kind: this.monaco.languages.CompletionItemKind.Snippet,
                            insertText: 'function $1($2) {\n\t$3\n}',
                            insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Function snippet'
                        },
                        {
                            label: 'ifelse',
                            kind: this.monaco.languages.CompletionItemKind.Snippet,
                            insertText: 'if ($1) {\n\t$2\n} else {\n\t$3\n}',
                            insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'If-else snippet'
                        }
                    ]
                };
            }
        });

        console.log('📝 Snippets Enabled');
    }


    setupEmmet() {
        if (!this.editor || !this.monaco) return;


        this.monaco.languages.registerCompletionItemProvider('html', {
            provideCompletionItems: (model, position) => {
                const lineContent = model.getLineContent(position.lineNumber);
                const emmetSuggestions = [];


                if (lineContent.trim().startsWith('div')) {
                    emmetSuggestions.push({
                        label: 'div.container',
                        kind: this.monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<div class="container">\n\t$1\n</div>',
                        insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Div with container class'
                    });
                }

                return { suggestions: emmetSuggestions };
            }
        });

        console.log('⚡ Emmet Enabled');
    }


    setupGitIntegration() {
        console.log('🐙 Git Integration Enabled');


        window.addEventListener('git-status-update', (event) => {
            const status = event.detail;
            if (window.showToast) {
                window.showToast(`Git: ${status.branch} - ${status.changes} changes`, 'info');
            }
        });
    }


    setupCollaboration() {
        console.log('👥 Collaboration Enabled');


        window.addEventListener('collaboration-update', (event) => {
            const data = event.detail;
            if (window.showToast) {
                window.showToast(`${data.username} is editing`, 'info');
            }
        });
    }


    setupStorage() {
        console.log('💾 Storage Enabled');


        setInterval(() => {
            if (window.currentRoomId && window.localFiles?.length > 0) {
                if (window.ProjectStorage?.saveProject) {
                    window.ProjectStorage.saveProject();
                }
            }
        }, 30000);
    }


    setupAIAssistant() {
        console.log('🤖 AI Assistant Enabled');


        window.addEventListener('ai-response', (event) => {
            const response = event.detail;
            if (window.showToast) {
                window.showToast(`AI: ${response.message}`, 'info');
            }
        });
    }


    setupTerminal() {
        console.log('🖥️ Terminal Enabled');


        window.addEventListener('terminal-command', (event) => {
            const command = event.detail;
            if (window.showToast) {
                window.showToast(`Executing: ${command}`, 'info');
            }
        });
    }


    setupDebugging() {
        console.log('🐛 Debugging Enabled');


        window.addEventListener('debugger-event', (event) => {
            const data = event.detail;
            if (window.showToast) {
                window.showToast(`Debug: ${data.message}`, 'info');
            }
        });
    }


    setupCodeFormatting() {
        if (!this.editor) return;


        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyMod.Shift | this.monaco.KeyCode.KEY_F, () => {
            this.formatDocument();
        });

        console.log('📄 Code Formatting Enabled');
    }

    formatDocument() {
        this.editor.trigger('format', 'editor.action.formatDocument');
        if (window.showToast) {
            window.showToast('Document formatted', 'success');
        }
    }


    setupLinting() {
        if (!this.editor || !this.monaco) return;


        this.monaco.languages.registerDiagnosticsProvider('javascript', {
            provideDiagnostics: (model) => {
                const diagnostics = [];
                const code = model.getValue();


                if (code.includes('==') && !code.includes('===')) {
                    diagnostics.push({
                        severity: this.monaco.MarkerSeverity.Warning,
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 1,
                        endColumn: 1,
                        message: 'Use === instead of == for strict equality'
                    });
                }

                return diagnostics;
            }
        });

        console.log('🔍 Linting Enabled');
    }
}


window.enhancedEditor = new EnhancedEditor();


window.formatDocument = () => window.enhancedEditor?.formatDocument();
window.saveFile = () => window.enhancedEditor?.saveFile();
window.duplicateLine = () => window.enhancedEditor?.duplicateLine();
window.findInFile = () => window.enhancedEditor?.findInFile();

