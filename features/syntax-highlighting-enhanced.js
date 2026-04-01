


class EnhancedSyntaxHighlighting {
    constructor() {
        this.monaco = null;
        this.currentTheme = 'vs-dark';
        this.customThemes = new Map();
        this.languageDefinitions = new Map();
        this.init();
    }

    async init() {
        await this.loadMonaco();
        this.setupCustomThemes();
        this.setupLanguageDefinitions();
        this.setupBracketMatching();
        this.setupSemanticHighlighting();
    }

    async loadMonaco() {
        return new Promise((resolve) => {
            if (typeof monaco !== 'undefined') {
                this.monaco = monaco;
                resolve();
            } else {

                const checkMonaco = () => {
                    if (typeof monaco !== 'undefined') {
                        this.monaco = monaco;
                        resolve();
                    } else {
                        setTimeout(checkMonaco, 100);
                    }
                };
                checkMonaco();
            }
        });
    }


    setupCustomThemes() {

        this.customThemes.set('bekaei-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '79c0ff' },
                { token: 'string', foreground: '9ecbff' },
                { token: 'number', foreground: '79c0ff' },
                { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
                { token: 'function', foreground: 'd2a8ff' },
                { token: 'class', foreground: 'ffa657' },
                { token: 'interface', foreground: 'ffa657' },
                { token: 'type', foreground: 'ffa657' },
                { token: 'variable', foreground: 'c9d1d9' },
                { token: 'property', foreground: '7ee787' },
                { token: 'operator', foreground: 'f97583' },
                { token: 'bracket', foreground: '8b949e' },
                { token: 'tag', foreground: '7ee787' },
                { token: 'attribute', foreground: '79c0ff' }
            ],
            colors: {
                'editor.background': '#0d1117',
                'editor.foreground': '#c9d1d9',
                'editorCursor.foreground': '#f85149',
                'editor.lineHighlightBackground': '#161b22',
                'editorLineNumber.foreground': '#8b949e',
                'editor.selectionBackground': '#1f6feb40',
                'editor.inactiveSelectionBackground': '#1f6feb20',
                'editor.wordHighlightBackground': '#23812320',
                'editor.wordHighlightStrongBackground': '#0e5a0e20',
                'editor.findMatchBackground': '#ffd33d40',
                'editor.findMatchHighlightBackground': '#ffd33d20',
                'editorBracketMatch.background': '#2d333b',
                'editorBracketMatch.border': '#8b949e'
            }
        });


        this.customThemes.set('bekaei-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '0969da' },
                { token: 'string', foreground: '0a3069' },
                { token: 'number', foreground: '0969da' },
                { token: 'comment', foreground: '6e7681', fontStyle: 'italic' },
                { token: 'function', foreground: '8250df' },
                { token: 'class', foreground: '9a6700' },
                { token: 'interface', foreground: '9a6700' },
                { token: 'type', foreground: '9a6700' },
                { token: 'variable', foreground: '#24292f' },
                { token: 'property', foreground: '1f883d' },
                { token: 'operator', foreground: 'd73a49' },
                { token: 'bracket', foreground: '6e7681' },
                { token: 'tag', foreground: '1f883d' },
                { token: 'attribute', foreground: '0969da' }
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#24292f',
                'editorCursor.foreground': '#d73a49',
                'editor.lineHighlightBackground': '#f6f8fa',
                'editorLineNumber.foreground': '#6e7681',
                'editor.selectionBackground': '#0969da40',
                'editor.inactiveSelectionBackground': '#0969da20',
                'editor.wordHighlightBackground': '#1f883d20',
                'editor.wordHighlightStrongBackground': '#0e5a0e20',
                'editor.findMatchBackground': '#ffd33d40',
                'editor.findMatchHighlightBackground': '#ffd33d20',
                'editorBracketMatch.background': '#eaeef2',
                'editorBracketMatch.border': '#6e7681'
            }
        });


        this.customThemes.set('bekaei-terminal', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '00ff00' },
                { token: 'string', foreground: 'ffff00' },
                { token: 'number', foreground: '00ffff' },
                { token: 'comment', foreground: '888888', fontStyle: 'italic' },
                { token: 'function', foreground: 'ff00ff' },
                { token: 'class', foreground: 'ff8800' },
                { token: 'variable', foreground: 'ffffff' },
                { token: 'operator', foreground: 'ff0000' }
            ],
            colors: {
                'editor.background': '#000000',
                'editor.foreground': '#ffffff',
                'editorCursor.foreground': '#00ff00',
                'editor.lineHighlightBackground': '#111111',
                'editorLineNumber.foreground': '#555555',
                'editor.selectionBackground': '#00ff0040'
            }
        });


        this.customThemes.set('bekaei-minimal', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: 'ffffff' },
                { token: 'string', foreground: 'ffffff' },
                { token: 'number', foreground: 'ffffff' },
                { token: 'comment', foreground: 'aaaaaa', fontStyle: 'italic' },
                { token: 'function', foreground: 'ffffff' },
                { token: 'class', foreground: 'ffffff' },
                { token: 'variable', foreground: 'ffffff' },
                { token: 'operator', foreground: 'ffffff' }
            ],
            colors: {
                'editor.background': '#1a1a1a',
                'editor.foreground': '#ffffff',
                'editorCursor.foreground': '#ffffff',
                'editor.lineHighlightBackground': '#222222',
                'editorLineNumber.foreground': '#888888'
            }
        });


        this.customThemes.set('bekaei-high-contrast', {
            base: 'hc-black',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: 'ffff00', fontStyle: 'bold' },
                { token: 'string', foreground: '00ff00' },
                { token: 'number', foreground: '00ffff' },
                { token: 'comment', foreground: 'ff00ff', fontStyle: 'italic' },
                { token: 'function', foreground: 'ff8800', fontStyle: 'bold' },
                { token: 'class', foreground: 'ff8800', fontStyle: 'bold' },
                { token: 'variable', foreground: 'ffffff' },
                { token: 'operator', foreground: 'ff0000', fontStyle: 'bold' }
            ],
            colors: {
                'editor.background': '#000000',
                'editor.foreground': '#ffffff',
                'editorCursor.foreground': '#ffff00',
                'editor.lineHighlightBackground': '#333333',
                'editorLineNumber.foreground': '#888888'
            }
        });


        this.customThemes.forEach((themeData, themeName) => {
            this.monaco.editor.defineTheme(themeName, themeData);
        });
    }


    setupLanguageDefinitions() {

        this.languageDefinitions.set('javascript', {
            keywords: [
                'abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case', 'catch', 'class',
                'const', 'constructor', 'continue', 'debugger', 'declare', 'default', 'delete', 'do',
                'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function',
                'get', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'is', 'keyof',
                'let', 'module', 'namespace', 'never', 'new', 'null', 'number', 'object', 'of', 'package',
                'private', 'protected', 'public', 'readonly', 'require', 'return', 'set', 'static',
                'string', 'super', 'switch', 'symbol', 'this', 'throw', 'true', 'try', 'type', 'typeof',
                'undefined', 'unique', 'unknown', 'var', 'void', 'while', 'with', 'yield'
            ],
            operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':'],
            brackets: [['(', ')'], ['[', ']'], ['{', '}']],
            strings: ['"', "'", '`'],
            comments: ['//', '']
        });


        this.languageDefinitions.set('python', {
            keywords: [
                'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
                'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import',
                'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
                'True', 'try', 'while', 'with', 'yield'
            ],
            operators: ['+', '-', '*', '/', '//', '%', '**', '=', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not'],
            brackets: [['(', ')'], ['[', ']'], ['{', '}']],
            strings: ['"', "'", '"""', "'''"],
            comments: ['#']
        });


        this.languageDefinitions.set('html', {
            tags: ['html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'script', 'style', 'link', 'meta', 'title'],
            attributes: ['class', 'id', 'href', 'src', 'alt', 'title', 'style', 'data-*', 'aria-*', 'role'],
            selfClosingTags: ['img', 'br', 'hr', 'input', 'meta', 'link']
        });


        this.languageDefinitions.set('css', {
            properties: [
                'color', 'background', 'background-color', 'background-image', 'border', 'border-radius',
                'margin', 'padding', 'width', 'height', 'display', 'position', 'top', 'left', 'right',
                'bottom', 'font-size', 'font-family', 'font-weight', 'text-align', 'text-decoration',
                'flex', 'grid', 'transform', 'transition', 'animation'
            ],
            values: ['px', 'em', 'rem', '%', 'vh', 'vw', 'auto', 'none', 'block', 'inline', 'flex', 'grid']
        });


        this.languageDefinitions.forEach((config, language) => {
            this.monaco.languages.setLanguageConfiguration(language, {
                brackets: config.brackets || [['(', ')'], ['[', ']'], ['{', '}']],
                autoClosingPairs: this.getAutoClosingPairs(config),
                surroundingPairs: this.getSurroundingPairs(config),
                comments: config.comments ? {
                    lineComment: config.comments[0],
                    blockComment: config.comments.length > 2 ? [config.comments[1], config.comments[2]] : undefined
                } : undefined
            });
        });
    }

    getAutoClosingPairs(config) {
        const pairs = [];
        if (config.strings) {
            config.strings.forEach(str => {
                pairs.push([str, str]);
            });
        }
        if (config.brackets) {
            config.brackets.forEach(bracket => {
                pairs.push([bracket[0], bracket[1]]);
            });
        }
        return pairs;
    }

    getSurroundingPairs(config) {
        const pairs = [];
        if (config.strings) {
            config.strings.forEach(str => {
                pairs.push([str, str]);
            });
        }
        if (config.brackets) {
            config.brackets.forEach(bracket => {
                pairs.push([bracket[0], bracket[1]]);
            });
        }
        return pairs;
    }


    setupBracketMatching() {

        const bracketMatchDecoration = {
            className: 'bekaei-bracket-match',
            overviewRuler: {
                color: '#79c0ff',
                position: this.monaco.editor.OverviewRulerLane.Center
            }
        };

        const bracketErrorDecoration = {
            className: 'bekaei-bracket-error',
            overviewRuler: {
                color: '#f85149',
                position: this.monaco.editor.OverviewRulerLane.Center
            }
        };


        this.monaco.languages.registerDocumentHighlightProvider('*', {
            provideDocumentHighlights: (model, position, token) => {
                const word = model.getWordAtPosition(position);
                if (!word) return [];

                const wordRange = model.getWordRangeAtPosition(position);
                const wordText = model.getValueInRange(wordRange);

                const highlights = [];
                const matches = model.findMatches(wordText, false, true, false, null, true);

                matches.forEach(match => {
                    highlights.push({
                        range: match.range,
                        kind: this.monaco.languages.DocumentHighlightKind.Read
                    });
                });

                return highlights;
            }
        });
    }


    setupSemanticHighlighting() {

        this.monaco.languages.registerDocumentSemanticTokensProvider('*', {
            getLegend: () => ({
                tokenTypes: ['function', 'class', 'variable', 'parameter', 'property', 'method'],
                tokenModifiers: ['declaration', 'documentation', 'readonly']
            }),

            provideDocumentSemanticTokens: (model, lastResultId, token) => {
                const tokens = [];
                const lines = model.getLineCount();

                for (let line = 1; line <= lines; line++) {
                    const text = model.getLineContent(line);
                    const words = text.match(/\b\w+\b/g) || [];

                    words.forEach(word => {
                        const wordStart = text.indexOf(word);
                        const wordEnd = wordStart + word.length;


                        let tokenType = 'variable';
                        let tokenModifiers = [];

                        if (word.match(/^[A-Z]/)) {
                            tokenType = 'class';
                            tokenModifiers.push('declaration');
                        } else if (word.match(/^[a-z]+[A-Z]/)) {
                            tokenType = 'function';
                            tokenModifiers.push('declaration');
                        } else if (word.match(/^_/)) {
                            tokenModifiers.push('readonly');
                        }

                        tokens.push({
                            line: line,
                            startCharacter: wordStart,
                            length: word.length,
                            tokenType: tokenType,
                            tokenModifiers: tokenModifiers
                        });
                    });
                }

                return {
                    data: new Uint32Array(tokens.flatMap(t => [
                        t.line - 1, t.startCharacter, t.length, 0, 0
                    ]))
                };
            },

            releaseDocumentSemanticTokens: () => { }
        });
    }


    setTheme(themeName) {
        if (this.monaco) {
            this.currentTheme = themeName;
            this.monaco.editor.setTheme(themeName);


            localStorage.setItem('bekaei-theme', themeName);


            if (window.editor) {
                this.monaco.editor.setTheme(themeName);
            }
        }
    }

    getAvailableThemes() {
        return [
            'vs', 'vs-dark', 'hc-black',
            'bekaei-dark', 'bekaei-light', 'bekaei-terminal', 'bekaei-minimal', 'bekaei-high-contrast'
        ];
    }


    detectLanguage(filename, content) {
        if (!filename && !content) return 'plaintext';


        const ext = filename ? filename.split('.').pop().toLowerCase() : null;

        const languageMap = {
            'js': 'javascript', 'ts': 'typescript', 'jsx': 'javascript', 'tsx': 'typescript',
            'html': 'html', 'htm': 'html',
            'css': 'css', 'scss': 'scss', 'sass': 'sass', 'less': 'less',
            'py': 'python',
            'java': 'java',
            'c': 'c', 'cpp': 'cpp', 'c++': 'cpp', 'h': 'c',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml', 'yml': 'yaml',
            'md': 'markdown',
            'sql': 'sql',
            'sh': 'bash', 'bash': 'bash'
        };

        if (ext && languageMap[ext]) {
            return languageMap[ext];
        }


        if (content) {
            if (content.includes('<html>') || content.includes('<!DOCTYPE')) return 'html';
            if (content.includes('function ') || content.includes('const ')) return 'javascript';
            if (content.includes('def ') || content.includes('import ')) return 'python';
            if (content.includes('.class') || content.includes('public class')) return 'java';
            if (content.includes('SELECT') || content.includes('FROM')) return 'sql';
        }

        return 'plaintext';
    }


    applyToEditor(editor) {
        if (!this.monaco || !editor) return;


        this.setTheme(this.currentTheme);


        editor.updateOptions({
            matchBrackets: 'always',
            bracketPairColorization: {
                enabled: true,
                independentColorPoolPerBracketType: true
            }
        });


        editor.updateOptions({
            semanticHighlighting: {
                enabled: true
            }
        });
    }
}


window.enhancedSyntax = new EnhancedSyntaxHighlighting();


window.setTheme = (themeName) => window.enhancedSyntax.setTheme(themeName);
window.getAvailableThemes = () => window.enhancedSyntax.getAvailableThemes();
window.detectLanguage = (filename, content) => window.enhancedSyntax.detectLanguage(filename, content);
window.applyEnhancedHighlighting = (editor) => window.enhancedSyntax.applyToEditor(editor);

