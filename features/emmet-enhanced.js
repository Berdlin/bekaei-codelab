


class EnhancedEmmet {
    constructor() {
        this.emmetRules = {
            html: this.getHTMLEmmetRules(),
            css: this.getCSSEmmetRules(),
            javascript: this.getJavaScriptEmmetRules()
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

        this.addEmmetCommands();


        this.setupEmmetExpansion();
    }

    setupEventListeners() {

        window.expandEmmet = () => this.expandEmmetAbbreviation();
        window.toggleEmmet = (enabled) => this.toggleEmmet(enabled);
        window.getEmmetSuggestions = (language) => this.getEmmetSuggestions(language);
    }

    addEmmetCommands() {
        if (window.editor) {

            window.editor.addCommand(
                monaco.KeyCode.Tab,
                (editor, action) => {

                    const position = editor.getPosition();
                    if (position) {
                        const lineContent = editor.getModel().getLineContent(position.lineNumber);
                        const beforeCursor = lineContent.substring(0, position.column - 1);


                        if (this.isEmmetAbbreviation(beforeCursor)) {
                            this.expandEmmetAbbreviation();
                            return;
                        }
                    }


                    return false;
                }
            );


            if (window.editor._contextMenu) {
                window.editor._contextMenu.addAction({
                    id: 'expand-emmet',
                    label: 'Expand Emmet Abbreviation',
                    contextMenuGroupId: 'navigation',
                    run: () => this.expandEmmetAbbreviation()
                });
            }
        }
    }

    setupEmmetExpansion() {

        if (window.monaco && window.monaco.languages) {
            window.monaco.languages.registerCompletionItemProvider('html', {
                provideCompletionItems: (model, position) => {
                    return this.provideEmmetSuggestions(model, position, 'html');
                },
                triggerCharacters: ['>', '.', '#', '[', '(', '+', '*', '$', '@']
            });

            window.monaco.languages.registerCompletionItemProvider('css', {
                provideCompletionItems: (model, position) => {
                    return this.provideEmmetSuggestions(model, position, 'css');
                },
                triggerCharacters: ['.', '#', ':', '[', '(', '+', '*', '$', '@']
            });
        }
    }

    isEmmetAbbreviation(text) {
        if (!text || text.trim() === '') return false;


        const emmetChars = ['>', '.', '#', '[', '(', '+', '*', '$', '@', ':', '-', '_'];
        return emmetChars.some(char => text.includes(char));
    }

    expandEmmetAbbreviation() {
        if (!window.editor) {
            this.showToast('Editor not ready', 'error');
            return false;
        }

        const position = window.editor.getPosition();
        if (!position) {
            this.showToast('No cursor position', 'error');
            return false;
        }

        const model = window.editor.getModel();
        if (!model) {
            this.showToast('No active document', 'error');
            return false;
        }


        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);
        const afterCursor = lineContent.substring(position.column - 1);


        const abbreviation = this.extractEmmetAbbreviation(beforeCursor);
        if (!abbreviation) {
            this.showToast('No valid Emmet abbreviation found', 'info');
            return false;
        }


        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file', 'error');
            return false;
        }

        const ext = file.name.split('.').pop().toLowerCase();
        const language = window.LANGUAGE_MAP[ext] || 'html';


        const expanded = this.expandAbbreviation(abbreviation, language);
        if (!expanded) {
            this.showToast('Could not expand Emmet abbreviation', 'error');
            return false;
        }


        const startColumn = position.column - abbreviation.length;
        window.editor.executeEdits('expand-emmet', [{
            range: new monaco.Range(
                position.lineNumber,
                startColumn,
                position.lineNumber,
                position.column
            ),
            text: expanded
        }]);

        this.showToast(`Expanded Emmet: ${abbreviation}`, 'success');
        return true;
    }

    extractEmmetAbbreviation(text) {
        if (!text) return null;


        let endPos = text.length;
        let startPos = endPos;


        while (startPos > 0) {
            const char = text[startPos - 1];


            if (char === ' ' || char === '\t' || char === ';' || char === '{' || char === '}') {
                break;
            }

            startPos--;
        }

        const abbreviation = text.substring(startPos, endPos).trim();
        return abbreviation.length > 0 ? abbreviation : null;
    }

    expandAbbreviation(abbreviation, language) {
        try {
            const rules = this.emmetRules[language] || this.emmetRules.html;
            return rules.expand(abbreviation);
        } catch (error) {
            console.error('Emmet expansion error:', error);
            return null;
        }
    }

    provideEmmetSuggestions(model, position, language) {
        const suggestions = [];
        const rules = this.emmetRules[language] || this.emmetRules.html;

        if (!rules || !rules.suggestions) return { suggestions: [] };


        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);


        const words = beforeCursor.split(/\s+/);
        const lastWord = words[words.length - 1] || '';

        if (lastWord && this.isEmmetAbbreviation(lastWord)) {

            const abbreviationSuggestions = rules.getSuggestions(lastWord);

            abbreviationSuggestions.forEach(suggestion => {
                suggestions.push({
                    label: suggestion.label,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: suggestion.body,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: suggestion.description,
                    detail: 'Emmet',
                    range: {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: position.column - lastWord.length,
                        endColumn: position.column
                    }
                });
            });
        }

        return { suggestions: suggestions };
    }

    toggleEmmet(enabled) {
        this.isEmmetEnabled = enabled;
        this.showToast(enabled ? 'Emmet enabled' : 'Emmet disabled', enabled ? 'success' : 'info');
        return true;
    }

    getEmmetSuggestions(language) {
        const rules = this.emmetRules[language] || this.emmetRules.html;
        return rules.suggestions || [];
    }


    getHTMLEmmetRules() {
        return {
            expand: (abbreviation) => {
                return this.expandHTMLAbbreviation(abbreviation);
            },
            getSuggestions: (abbreviation) => {
                return this.getHTMLSuggestions(abbreviation);
            },
            suggestions: [
                { label: 'div', description: 'Div element' },
                { label: 'p', description: 'Paragraph' },
                { label: 'a', description: 'Anchor' },
                { label: 'img', description: 'Image' },
                { label: 'ul>li', description: 'Unordered list with items' },
                { label: 'table>tr>td', description: 'Table with rows and cells' }
            ]
        };
    }

    getCSSEmmetRules() {
        return {
            expand: (abbreviation) => {
                return this.expandCSSAbbreviation(abbreviation);
            },
            getSuggestions: (abbreviation) => {
                return this.getCSSSuggestions(abbreviation);
            },
            suggestions: [
                { label: 'm10', description: 'Margin: 10px' },
                { label: 'p10', description: 'Padding: 10px' },
                { label: 'w100', description: 'Width: 100px' },
                { label: 'h100', description: 'Height: 100px' },
                { label: 'fg#f00', description: 'Color: #f00' },
                { label: 'bg#00f', description: 'Background: #00f' }
            ]
        };
    }

    getJavaScriptEmmetRules() {
        return {
            expand: (abbreviation) => {
                return this.expandJavaScriptAbbreviation(abbreviation);
            },
            getSuggestions: (abbreviation) => {
                return this.getJavaScriptSuggestions(abbreviation);
            },
            suggestions: [
                { label: 'cl', description: 'console.log()' },
                { label: 'fn', description: 'Function' },
                { label: 'af', description: 'Arrow function' },
                { label: 'if', description: 'If statement' },
                { label: 'for', description: 'For loop' }
            ]
        };
    }


    expandHTMLAbbreviation(abbreviation) {

        if (abbreviation.match(/^[a-z]+$/i)) {
            return `<${abbreviation}></${abbreviation}>`;
        }


        if (abbreviation.match(/^[a-z]+#/i)) {
            const parts = abbreviation.split('#');
            return `<${parts[0]} id="${parts[1]}"></${parts[0]}>`;
        }


        if (abbreviation.match(/^[a-z]+\./i)) {
            const parts = abbreviation.split('.');
            return `<${parts[0]} class="${parts[1]}"></${parts[0]}>`;
        }


        if (abbreviation.match(/^[a-z]+#[a-z]+\.[a-z]+$/i)) {
            const parts = abbreviation.split(/#|\./);
            return `<${parts[0]} id="${parts[1]}" class="${parts[2]}"></${parts[0]}>`;
        }


        if (abbreviation.includes('>')) {
            const parts = abbreviation.split('>');
            let result = '';

            parts.forEach((part, index) => {
                const tag = part.trim();
                const indent = '\t'.repeat(index);
                result += `${indent}<${tag}>\n`;
            });


            for (let i = parts.length - 1; i >= 0; i--) {
                const tag = parts[i].trim();
                const indent = '\t'.repeat(i);
                result += `${indent}</${tag}>\n`;
            }

            return result.trim();
        }


        if (abbreviation.includes('+')) {
            const parts = abbreviation.split('+');
            return parts.map(part => this.expandHTMLAbbreviation(part)).join('\n');
        }


        if (abbreviation.includes('[')) {
            const tagMatch = abbreviation.match(/^([a-z]+)/i);
            if (tagMatch) {
                const tag = tagMatch[1];
                const attrs = abbreviation.substring(tag.length);
                return `<${tag}${attrs}></${tag}>`;
            }
        }


        return `<${abbreviation}></${abbreviation}>`;
    }

    getHTMLSuggestions(abbreviation) {
        const suggestions = [];


        const commonElements = ['div', 'p', 'a', 'img', 'span', 'h1', 'h2', 'h3', 'ul', 'li', 'table', 'tr', 'td'];

        commonElements.forEach(element => {
            if (element.startsWith(abbreviation.toLowerCase())) {
                suggestions.push({
                    label: element,
                    body: `<${element}></${element}>`,
                    description: `${element} element`
                });
            }
        });


        if (abbreviation === 'ul' || abbreviation === 'list') {
            suggestions.push({
                label: 'ul>li',
                body: '<ul>\n\t<li></li>\n</ul>',
                description: 'Unordered list with items'
            });
        }

        if (abbreviation === 'table') {
            suggestions.push({
                label: 'table>tr>td',
                body: '<table>\n\t<tr>\n\t\t<td></td>\n\t</tr>\n</table>',
                description: 'Table with rows and cells'
            });
        }

        return suggestions;
    }


    expandCSSAbbreviation(abbreviation) {

        if (abbreviation.match(/^[mp][trbl]?\d+$/i)) {
            const type = abbreviation.startsWith('m') ? 'margin' : 'padding';
            const value = abbreviation.match(/\d+/)[0];
            return `${type}: ${value}px;`;
        }


        if (abbreviation.match(/^[wh]\d+$/i)) {
            const type = abbreviation.startsWith('w') ? 'width' : 'height';
            const value = abbreviation.match(/\d+/)[0];
            return `${type}: ${value}px;`;
        }


        if (abbreviation.match(/^[fc]g#?[a-f0-9]{3,6}$/i)) {
            const isForeground = abbreviation.startsWith('f');
            const type = isForeground ? 'color' : 'background';
            const color = abbreviation.match(/#?[a-f0-9]{3,6}/i)[0];
            return `${type}: #${color.startsWith('#') ? color.substring(1) : color};`;
        }


        if (abbreviation.match(/^fz\d+$/i)) {
            const value = abbreviation.match(/\d+/)[0];
            return `font-size: ${value}px;`;
        }


        if (abbreviation === 'dib') return 'display: inline-block;';
        if (abbreviation === 'db') return 'display: block;';
        if (abbreviation === 'dif') return 'display: inline-flex;';
        if (abbreviation === 'df') return 'display: flex;';


        if (abbreviation === 'posr') return 'position: relative;';
        if (abbreviation === 'posa') return 'position: absolute;';
        if (abbreviation === 'posf') return 'position: fixed;';


        return abbreviation + ': ;';
    }

    getCSSSuggestions(abbreviation) {
        const suggestions = [];


        const commonProperties = [
            { trigger: 'm', full: 'margin', value: '0' },
            { trigger: 'p', full: 'padding', value: '0' },
            { trigger: 'w', full: 'width', value: 'auto' },
            { trigger: 'h', full: 'height', value: 'auto' },
            { trigger: 'fg', full: 'color', value: '#000' },
            { trigger: 'bg', full: 'background', value: '#fff' },
            { trigger: 'fz', full: 'font-size', value: '16px' },
            { trigger: 'fw', full: 'font-weight', value: 'normal' }
        ];

        commonProperties.forEach(prop => {
            if (prop.trigger.startsWith(abbreviation.toLowerCase())) {
                suggestions.push({
                    label: prop.trigger,
                    body: `${prop.full}: ${prop.value};`,
                    description: `${prop.full} property`
                });
            }
        });

        return suggestions;
    }


    expandJavaScriptAbbreviation(abbreviation) {

        if (abbreviation === 'cl' || abbreviation === 'log') {
            return 'console.log($1);';
        }


        if (abbreviation === 'fn' || abbreviation === 'function') {
            return 'function $1($2) {\n\t$3\n}';
        }


        if (abbreviation === 'af' || abbreviation === 'arrow') {
            return 'const $1 = ($2) => {\n\t$3\n};';
        }


        if (abbreviation === 'if') {
            return 'if ($1) {\n\t$2\n}';
        }


        if (abbreviation === 'for') {
            return 'for (let $1 = 0; $1 < $2; $1++) {\n\t$3\n}';
        }


        if (abbreviation === 'try') {
            return 'try {\n\t$1\n} catch (error) {\n\tconsole.error(\'Error:\', error);\n}';
        }


        return abbreviation + '();';
    }

    getJavaScriptSuggestions(abbreviation) {
        const suggestions = [];


        const commonPatterns = [
            { trigger: 'cl', full: 'console.log', body: 'console.log($1);' },
            { trigger: 'fn', full: 'function', body: 'function $1($2) {\n\t$3\n}' },
            { trigger: 'af', full: 'arrow function', body: 'const $1 = ($2) => {\n\t$3\n};' },
            { trigger: 'if', full: 'if statement', body: 'if ($1) {\n\t$2\n}' },
            { trigger: 'for', full: 'for loop', body: 'for (let $1 = 0; $1 < $2; $1++) {\n\t$3\n}' },
            { trigger: 'try', full: 'try-catch', body: 'try {\n\t$1\n} catch (error) {\n\tconsole.error(\'Error:\', error);\n}' }
        ];

        commonPatterns.forEach(pattern => {
            if (pattern.trigger.startsWith(abbreviation.toLowerCase())) {
                suggestions.push({
                    label: pattern.trigger,
                    body: pattern.body,
                    description: pattern.full
                });
            }
        });

        return suggestions;
    }


    showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}


window.enhancedEmmet = new EnhancedEmmet();


window.expandEmmet = () => window.enhancedEmmet.expandEmmetAbbreviation();
window.toggleEmmet = (enabled) => window.enhancedEmmet.toggleEmmet(enabled);
window.getEmmetSuggestions = (language) => window.enhancedEmmet.getEmmetSuggestions(language);

