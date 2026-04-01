


class EnhancedCodeCompletion {
    constructor() {
        this.monaco = null;
        this.completionProviders = new Map();
        this.snippets = new Map();
        this.aiSuggestions = new Map();
        this.contextAnalyzer = new ContextAnalyzer();
        this.init();
    }

    async init() {
        await this.loadMonaco();
        this.setupCompletionProviders();
        this.setupSnippets();
        this.setupAICompletion();
        this.setupContextAnalysis();
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


    setupCompletionProviders() {

        this.completionProviders.set('javascript', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions = this.getJavaScriptSuggestions(model, position);
                return {
                    suggestions: suggestions.map(s => ({
                        label: s.label,
                        kind: this.monaco.languages.CompletionItemKind[s.kind] || this.monaco.languages.CompletionItemKind.Text,
                        documentation: s.documentation,
                        insertText: s.insertText,
                        range: range,
                        sortText: s.sortText
                    }))
                };
            }
        });


        this.completionProviders.set('python', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions = this.getPythonSuggestions(model, position);
                return {
                    suggestions: suggestions.map(s => ({
                        label: s.label,
                        kind: this.monaco.languages.CompletionItemKind[s.kind] || this.monaco.languages.CompletionItemKind.Text,
                        documentation: s.documentation,
                        insertText: s.insertText,
                        range: range,
                        sortText: s.sortText
                    }))
                };
            }
        });


        this.completionProviders.set('html', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions = this.getHTMLSuggestions(model, position);
                return {
                    suggestions: suggestions.map(s => ({
                        label: s.label,
                        kind: this.monaco.languages.CompletionItemKind[s.kind] || this.monaco.languages.CompletionItemKind.Text,
                        documentation: s.documentation,
                        insertText: s.insertText,
                        range: range,
                        sortText: s.sortText
                    }))
                };
            }
        });


        this.completionProviders.set('css', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions = this.getCSSSuggestions(model, position);
                return {
                    suggestions: suggestions.map(s => ({
                        label: s.label,
                        kind: this.monaco.languages.CompletionItemKind[s.kind] || this.monaco.languages.CompletionItemKind.Text,
                        documentation: s.documentation,
                        insertText: s.insertText,
                        range: range,
                        sortText: s.sortText
                    }))
                };
            }
        });


        this.completionProviders.forEach((provider, language) => {
            this.monaco.languages.registerCompletionItemProvider(language, provider);
        });
    }


    getJavaScriptSuggestions(model, position) {
        const suggestions = [];
        const lineContent = model.getLineContent(position.lineNumber);
        const context = this.contextAnalyzer.analyze(model, position);


        const keywords = [
            'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
            'continue', 'return', 'class', 'extends', 'import', 'export', 'default', 'async', 'await',
            'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'typeof', 'instanceof', 'delete'
        ];

        keywords.forEach(keyword => {
            suggestions.push({
                label: keyword,
                kind: 'Keyword',
                documentation: `JavaScript keyword: ${keyword}`,
                insertText: keyword,
                sortText: '0'
            });
        });


        if (context.inObject) {
            suggestions.push(
                { label: 'length', kind: 'Property', insertText: 'length', sortText: '1' },
                { label: 'toString', kind: 'Method', insertText: 'toString()', sortText: '1' },
                { label: 'valueOf', kind: 'Method', insertText: 'valueOf()', sortText: '1' }
            );
        }

        if (context.inArray) {
            suggestions.push(
                { label: 'push', kind: 'Method', insertText: 'push()', sortText: '1' },
                { label: 'pop', kind: 'Method', insertText: 'pop()', sortText: '1' },
                { label: 'length', kind: 'Property', insertText: 'length', sortText: '1' }
            );
        }


        if (context.inDOM) {
            suggestions.push(
                { label: 'getElementById', kind: 'Method', insertText: 'getElementById(\'\')', sortText: '2' },
                { label: 'querySelector', kind: 'Method', insertText: 'querySelector(\'\')', sortText: '2' },
                { label: 'addEventListener', kind: 'Method', insertText: 'addEventListener(\'\', () => {})', sortText: '2' }
            );
        }

        return suggestions;
    }


    getPythonSuggestions(model, position) {
        const suggestions = [];
        const context = this.contextAnalyzer.analyze(model, position);


        const keywords = [
            'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally',
            'import', 'from', 'as', 'return', 'yield', 'lambda', 'with', 'pass', 'break', 'continue',
            'global', 'nonlocal', 'async', 'await', 'True', 'False', 'None'
        ];

        keywords.forEach(keyword => {
            suggestions.push({
                label: keyword,
                kind: 'Keyword',
                documentation: `Python keyword: ${keyword}`,
                insertText: keyword,
                sortText: '0'
            });
        });


        if (context.inString) {
            suggestions.push(
                { label: 'split', kind: 'Method', insertText: 'split()', sortText: '1' },
                { label: 'join', kind: 'Method', insertText: 'join()', sortText: '1' },
                { label: 'replace', kind: 'Method', insertText: 'replace()', sortText: '1' }
            );
        }

        if (context.inList) {
            suggestions.push(
                { label: 'append', kind: 'Method', insertText: 'append()', sortText: '1' },
                { label: 'pop', kind: 'Method', insertText: 'pop()', sortText: '1' },
                { label: 'len', kind: 'Function', insertText: 'len()', sortText: '1' }
            );
        }

        return suggestions;
    }


    getHTMLSuggestions(model, position) {
        const suggestions = [];
        const context = this.contextAnalyzer.analyze(model, position);

        if (context.inTag) {
            const tags = [
                'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'button', 'input',
                'form', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'header', 'footer', 'nav',
                'section', 'article', 'aside', 'main', 'figure', 'figcaption', 'blockquote'
            ];

            tags.forEach(tag => {
                suggestions.push({
                    label: tag,
                    kind: 'Keyword',
                    insertText: tag,
                    sortText: '0'
                });
            });
        }

        if (context.inAttribute) {
            const attributes = [
                'class', 'id', 'href', 'src', 'alt', 'title', 'style', 'data-*', 'aria-*', 'role',
                'onclick', 'onload', 'onsubmit', 'onchange', 'oninput'
            ];

            attributes.forEach(attr => {
                suggestions.push({
                    label: attr,
                    kind: 'Property',
                    insertText: attr,
                    sortText: '1'
                });
            });
        }

        return suggestions;
    }


    getCSSSuggestions(model, position) {
        const suggestions = [];
        const context = this.contextAnalyzer.analyze(model, position);

        if (context.inProperty) {
            const properties = [
                'color', 'background', 'background-color', 'background-image', 'border', 'border-radius',
                'margin', 'padding', 'width', 'height', 'display', 'position', 'top', 'left', 'right',
                'bottom', 'font-size', 'font-family', 'font-weight', 'text-align', 'text-decoration',
                'flex', 'grid', 'transform', 'transition', 'animation', 'opacity', 'z-index'
            ];

            properties.forEach(prop => {
                suggestions.push({
                    label: prop,
                    kind: 'Property',
                    insertText: `${prop}: `,
                    sortText: '0'
                });
            });
        }

        if (context.inValue) {
            const values = [
                'px', 'em', 'rem', '%', 'vh', 'vw', 'auto', 'none', 'block', 'inline', 'flex', 'grid',
                'relative', 'absolute', 'fixed', 'sticky', 'center', 'left', 'right', 'top', 'bottom'
            ];

            values.forEach(value => {
                suggestions.push({
                    label: value,
                    kind: 'Value',
                    insertText: value,
                    sortText: '1'
                });
            });
        }

        return suggestions;
    }


    setupSnippets() {

        this.snippets.set('javascript', [
            {
                prefix: 'log',
                body: 'console.log($1);',
                description: 'Console log statement'
            },
            {
                prefix: 'func',
                body: 'function ${1:functionName}(${2:parameters}) {\n\t$0\n}',
                description: 'Function declaration'
            },
            {
                prefix: 'arrow',
                body: 'const ${1:functionName} = (${2:parameters}) => {\n\t$0\n};',
                description: 'Arrow function'
            },
            {
                prefix: 'class',
                body: 'class ${1:ClassName} {\n\tconstructor(${2:parameters}) {\n\t\t$0\n\t}\n}',
                description: 'Class declaration'
            },
            {
                prefix: 'for',
                body: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$0\n}',
                description: 'For loop'
            },
            {
                prefix: 'if',
                body: 'if (${1:condition}) {\n\t$0\n}',
                description: 'If statement'
            },
            {
                prefix: 'try',
                body: 'try {\n\t$0\n} catch (${1:error}) {\n\tconsole.error(${1:error});\n}',
                description: 'Try-catch block'
            }
        ]);


        this.snippets.set('python', [
            {
                prefix: 'def',
                body: 'def ${1:function_name}(${2:parameters}):\n\t"""${3:Docstring}"""\n\t$0',
                description: 'Function definition'
            },
            {
                prefix: 'class',
                body: 'class ${1:ClassName}:\n\tdef __init__(self, ${2:parameters}):\n\t\t$0',
                description: 'Class definition'
            },
            {
                prefix: 'for',
                body: 'for ${1:item} in ${2:iterable}:\n\t$0',
                description: 'For loop'
            },
            {
                prefix: 'if',
                body: 'if ${1:condition}:\n\t$0',
                description: 'If statement'
            },
            {
                prefix: 'try',
                body: 'try:\n\t$0\nexcept ${1:Exception} as ${2:e}:\n\tprint(${2:e})',
                description: 'Try-except block'
            }
        ]);


        this.snippets.set('html', [
            {
                prefix: 'html',
                body: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
                description: 'HTML document template'
            },
            {
                prefix: 'div',
                body: '<div class="${1:className}">\n\t$0\n</div>',
                description: 'Div element'
            },
            {
                prefix: 'form',
                body: '<form action="${1:action}" method="${2:method}">\n\t$0\n</form>',
                description: 'Form element'
            }
        ]);


        this.snippets.set('css', [
            {
                prefix: 'flex',
                body: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};',
                description: 'Flexbox layout'
            },
            {
                prefix: 'grid',
                body: 'display: grid;\ngrid-template-columns: ${1:1fr 1fr};\ngap: ${2:10px};',
                description: 'Grid layout'
            },
            {
                prefix: 'transition',
                body: 'transition: ${1:property} ${2:0.3s} ${3:ease};',
                description: 'CSS transition'
            }
        ]);


        this.snippets.forEach((snippetList, language) => {
            snippetList.forEach(snippet => {
                this.monaco.languages.registerCompletionItemProvider(language, {
                    provideCompletionItems: () => ({
                        suggestions: [{
                            label: snippet.prefix,
                            kind: this.monaco.languages.CompletionItemKind.Snippet,
                            documentation: snippet.description,
                            insertText: snippet.body,
                            insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                        }]
                    })
                });
            });
        });
    }


    setupAICompletion() {

        this.monaco.languages.registerCompletionItemProvider('*', {
            triggerCharacters: ['.', '(', ' '],
            provideCompletionItems: async (model, position) => {
                const context = this.contextAnalyzer.analyze(model, position);
                const suggestions = await this.getAISuggestions(model, position, context);

                return {
                    suggestions: suggestions.map(s => ({
                        label: s.label,
                        kind: this.monaco.languages.CompletionItemKind[s.kind] || this.monaco.languages.CompletionItemKind.Text,
                        documentation: s.documentation,
                        insertText: s.insertText,
                        sortText: s.sortText,
                        detail: s.detail
                    }))
                };
            }
        });
    }

    async getAISuggestions(model, position, context) {
        const suggestions = [];


        if (context.language === 'javascript') {
            if (context.inFunction) {
                suggestions.push(
                    { label: 'return', kind: 'Keyword', insertText: 'return ', sortText: '0' },
                    { label: 'const', kind: 'Keyword', insertText: 'const ', sortText: '1' }
                );
            }

            if (context.inObject) {
                suggestions.push(
                    { label: 'key: value', kind: 'Property', insertText: 'key: value', sortText: '2' },
                    { label: 'method() {}', kind: 'Method', insertText: 'method() {\n\t$0\n}', sortText: '3' }
                );
            }
        }

        return suggestions;
    }


    setupContextAnalysis() {

    }
}

class ContextAnalyzer {
    analyze(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const character = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: Math.max(1, position.column - 1),
            endLineNumber: position.lineNumber,
            endColumn: position.column
        });

        const context = {
            language: model.getLanguageId(),
            inFunction: false,
            inObject: false,
            inArray: false,
            inString: false,
            inComment: false,
            inTag: false,
            inAttribute: false,
            inProperty: false,
            inValue: false,
            inDOM: false
        };


        const language = model.getLanguageId();

        if (language === 'javascript') {
            context.inFunction = this.isInFunction(model, position);
            context.inObject = this.isInObject(model, position);
            context.inArray = this.isInArray(model, position);
            context.inString = this.isInString(model, position);
            context.inComment = this.isInComment(model, position);
            context.inDOM = this.isInDOM(model, position);
        } else if (language === 'python') {
            context.inFunction = this.isInFunction(model, position);
            context.inString = this.isInString(model, position);
            context.inComment = this.isInComment(model, position);
        } else if (language === 'html') {
            context.inTag = this.isInTag(model, position);
            context.inAttribute = this.isInAttribute(model, position);
        } else if (language === 'css') {
            context.inProperty = this.isInProperty(model, position);
            context.inValue = this.isInValue(model, position);
        }

        return context;
    }

    isInFunction(model, position) {

        const line = model.getLineContent(position.lineNumber);
        return line.includes('function') || line.includes('=>') || line.includes('def ');
    }

    isInObject(model, position) {

        const text = model.getValue();
        const pos = model.getOffsetAt(position);
        let braceCount = 0;

        for (let i = 0; i < pos; i++) {
            if (text[i] === '{') braceCount++;
            if (text[i] === '}') braceCount--;
        }

        return braceCount > 0;
    }

    isInArray(model, position) {

        const text = model.getValue();
        const pos = model.getOffsetAt(position);
        let bracketCount = 0;

        for (let i = 0; i < pos; i++) {
            if (text[i] === '[') bracketCount++;
            if (text[i] === ']') bracketCount--;
        }

        return bracketCount > 0;
    }

    isInString(model, position) {

        const line = model.getLineContent(position.lineNumber);
        const before = line.substring(0, position.column - 1);
        const quoteCount = (before.match(/['"]/g) || []).length;
        return quoteCount % 2 === 1;
    }

    isInComment(model, position) {

        const line = model.getLineContent(position.lineNumber);
        return line.includes('
    }

    isInTag(model, position) {

        const line = model.getLineContent(position.lineNumber);
        const before = line.substring(0, position.column - 1);
        return before.includes('<') && !before.includes('>');
    }

    isInAttribute(model, position) {

        const line = model.getLineContent(position.lineNumber);
        return line.includes('=') && line.includes('"');
    }

    isInProperty(model, position) {

        const line = model.getLineContent(position.lineNumber);
        return line.includes(':') && !line.includes('{') && !line.includes('}');
    }

    isInValue(model, position) {

        const line = model.getLineContent(position.lineNumber);
        return line.includes(':') && line.includes(';');
    }

    isInDOM(model, position) {

        const text = model.getValue();
        return text.includes('document.') || text.includes('getElement');
    }
}


window.enhancedCompletion = new EnhancedCodeCompletion();


window.getAISuggestions = (model, position) => window.enhancedCompletion.getAISuggestions(model, position);
window.analyzeContext = (model, position) => window.enhancedCompletion.contextAnalyzer.analyze(model, position);

