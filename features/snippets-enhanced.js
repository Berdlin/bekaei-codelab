


class EnhancedSnippetsManager {
    constructor() {
        this.snippets = {
            javascript: this.getJavaScriptSnippets(),
            typescript: this.getTypeScriptSnippets(),
            html: this.getHTMLSnippets(),
            css: this.getCSSSnippets(),
            python: this.getPythonSnippets(),
            java: this.getJavaSnippets(),
            c: this.getCSnippets(),
            cpp: this.getCPlusPlusSnippets(),
            csharp: this.getCSharpSnippets(),
            php: this.getPHPSnippets(),
            ruby: this.getRubySnippets(),
            go: this.getGoSnippets(),
            rust: this.getRustSnippets(),
            swift: this.getSwiftSnippets(),
            kotlin: this.getKotlinSnippets(),
            sql: this.getSQLSnippets(),
            markdown: this.getMarkdownSnippets(),
            yaml: this.getYAMLSnippets(),
            xml: this.getXMLSnippets(),
            react: this.getReactSnippets(),
            vue: this.getVueSnippets(),
            angular: this.getAngularSnippets()
        };

        this.customSnippets = {};
        this.snippetCategories = ['basic', 'functions', 'classes', 'loops', 'conditions', 'ui', 'api', 'database'];

        this.init();
    }

    init() {

        this.waitForEditor();


        this.loadCustomSnippets();


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

        this.addSnippetCommands();


        this.setupSnippetSuggestions();
    }

    setupEventListeners() {

        window.insertSnippet = (snippetName, language) => this.insertSnippet(snippetName, language);
        window.showSnippetPalette = () => this.showSnippetPalette();
        window.addCustomSnippet = (snippet) => this.addCustomSnippet(snippet);
        window.removeCustomSnippet = (snippetName, language) => this.removeCustomSnippet(snippetName, language);
        window.getSnippetsForLanguage = (language) => this.getSnippetsForLanguage(language);
        window.getSnippetCategories = () => this.getSnippetCategories();
    }

    addSnippetCommands() {
        if (window.editor) {

            window.editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_P,
                () => this.showSnippetPalette()
            );


            if (window.editor._contextMenu) {
                window.editor._contextMenu.addAction({
                    id: 'insert-snippet',
                    label: 'Insert Snippet...',
                    contextMenuGroupId: 'navigation',
                    run: () => this.showSnippetPalette()
                });
            }
        }
    }

    setupSnippetSuggestions() {

        if (window.monaco && window.monaco.languages) {
            window.monaco.languages.registerCompletionItemProvider('javascript', {
                provideCompletionItems: (model, position) => {
                    return this.provideSnippetSuggestions(model, position, 'javascript');
                }
            });


            Object.keys(this.snippets).forEach(lang => {
                window.monaco.languages.registerCompletionItemProvider(lang, {
                    provideCompletionItems: (model, position) => {
                        return this.provideSnippetSuggestions(model, position, lang);
                    }
                });
            });
        }
    }

    provideSnippetSuggestions(model, position, language) {
        const suggestions = [];
        const allSnippets = { ...this.snippets[language], ...this.customSnippets[language] };

        if (!allSnippets) return { suggestions: [] };

        Object.keys(allSnippets).forEach(snippetName => {
            const snippet = allSnippets[snippetName];

            suggestions.push({
                label: snippetName,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: snippet.body,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: snippet.description,
                detail: snippet.category || 'snippet',
                range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endColumn: position.column
                }
            });
        });

        return { suggestions: suggestions };
    }

    loadCustomSnippets() {

        const savedSnippets = localStorage.getItem('customSnippets');
        if (savedSnippets) {
            try {
                this.customSnippets = JSON.parse(savedSnippets);
            } catch (error) {
                console.error('Error loading custom snippets:', error);
            }
        }
    }

    saveCustomSnippets() {

        try {
            localStorage.setItem('customSnippets', JSON.stringify(this.customSnippets));
        } catch (error) {
            console.error('Error saving custom snippets:', error);
        }
    }

    showSnippetPalette() {
        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file', 'error');
            return;
        }


        const ext = file.name.split('.').pop().toLowerCase();
        const language = window.LANGUAGE_MAP[ext] || 'javascript';

        const snippets = this.getSnippetsForLanguage(language);
        const categories = this.getSnippetCategories();



        console.log('Available snippets for ' + language + ':', Object.keys(snippets));

        this.showToast(`Snippet palette opened for ${language}. ${Object.keys(snippets).length} snippets available.`, 'info');


        return {
            language: language,
            snippets: snippets,
            categories: categories
        };
    }

    insertSnippet(snippetName, language) {
        if (!snippetName) {
            this.showToast('Snippet name is required', 'error');
            return false;
        }

        if (!window.editor) {
            this.showToast('Editor not ready', 'error');
            return false;
        }


        const snippet = this.snippets[language]?.[snippetName] || this.customSnippets[language]?.[snippetName];

        if (!snippet) {
            this.showToast(`Snippet '${snippetName}' not found for ${language}`, 'error');
            return false;
        }


        const position = window.editor.getPosition();
        if (!position) {
            this.showToast('No cursor position', 'error');
            return false;
        }

        window.editor.executeEdits('insert-snippet', [{
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: snippet.body
        }]);

        this.showToast(`Inserted snippet: ${snippetName}`, 'success');
        return true;
    }

    addCustomSnippet(snippet) {
        if (!snippet || !snippet.name || !snippet.body || !snippet.language) {
            this.showToast('Invalid snippet data', 'error');
            return false;
        }

        if (!this.customSnippets[snippet.language]) {
            this.customSnippets[snippet.language] = {};
        }

        this.customSnippets[snippet.language][snippet.name] = {
            body: snippet.body,
            description: snippet.description || '',
            category: snippet.category || 'custom'
        };

        this.saveCustomSnippets();
        this.showToast(`Added custom snippet: ${snippet.name}`, 'success');

        return true;
    }

    removeCustomSnippet(snippetName, language) {
        if (!snippetName || !language) {
            this.showToast('Snippet name and language are required', 'error');
            return false;
        }

        if (!this.customSnippets[language] || !this.customSnippets[language][snippetName]) {
            this.showToast(`Custom snippet '${snippetName}' not found for ${language}`, 'error');
            return false;
        }

        delete this.customSnippets[language][snippetName];
        this.saveCustomSnippets();
        this.showToast(`Removed custom snippet: ${snippetName}`, 'success');

        return true;
    }

    getSnippetsForLanguage(language) {

        const builtIn = this.snippets[language] || {};
        const custom = this.customSnippets[language] || {};

        return { ...builtIn, ...custom };
    }

    getSnippetCategories() {
        return this.snippetCategories;
    }


    getJavaScriptSnippets() {
        return {
            'console-log': {
                body: 'console.log($1);',
                description: 'Log to console',
                category: 'basic'
            },
            'function': {
                body: 'function $1($2) {\n\t$3\n}',
                description: 'Function declaration',
                category: 'functions'
            },
            'arrow-function': {
                body: 'const $1 = ($2) => {\n\t$3\n};',
                description: 'Arrow function',
                category: 'functions'
            },
            'for-loop': {
                body: 'for (let $1 = 0; $1 < $2; $1++) {\n\t$3\n}',
                description: 'For loop',
                category: 'loops'
            },
            'for-each': {
                body: '$1.forEach(($2) => {\n\t$3\n});',
                description: 'For each loop',
                category: 'loops'
            },
            'if-statement': {
                body: 'if ($1) {\n\t$2\n}',
                description: 'If statement',
                category: 'conditions'
            },
            'if-else': {
                body: 'if ($1) {\n\t$2\n} else {\n\t$3\n}',
                description: 'If-else statement',
                category: 'conditions'
            },
            'try-catch': {
                body: 'try {\n\t$1\n} catch (error) {\n\tconsole.error(\'Error:\', error);\n\t$2\n}',
                description: 'Try-catch block',
                category: 'basic'
            },
            'fetch-api': {
                body: 'fetch(\'$1\')\n\t.then(response => response.json())\n\t.then(data => {\n\t\t$2\n\t})\n\t.catch(error => {\n\t\tconsole.error(\'Error:\', error);\n\t});',
                description: 'Fetch API call',
                category: 'api'
            },
            'async-function': {
                body: 'async function $1($2) {\n\ttry {\n\t\t$3\n\t} catch (error) {\n\t\tconsole.error(\'Error:\', error);\n\t}\n}',
                description: 'Async function',
                category: 'functions'
            },
            'class': {
                body: 'class $1 {\n\tconstructor($2) {\n\t\t$3\n\t}\n\n\t$4() {\n\t\t$5\n\t}\n}',
                description: 'Class declaration',
                category: 'classes'
            },
            'promise': {
                body: 'new Promise((resolve, reject) => {\n\ttry {\n\t\t$1\n\t\tresolve($2);\n\t} catch (error) {\n\t\treject(error);\n\t}\n})',
                description: 'Promise',
                category: 'basic'
            }
        };
    }

    getTypeScriptSnippets() {
        return {
            ...this.getJavaScriptSnippets(),
            'interface': {
                body: 'interface $1 {\n\t$2: $3;\n}',
                description: 'TypeScript interface',
                category: 'classes'
            },
            'type-alias': {
                body: 'type $1 = $2;',
                description: 'Type alias',
                category: 'basic'
            },
            'generic-function': {
                body: 'function $1<T>($2: T): $3 {\n\t$4\n}',
                description: 'Generic function',
                category: 'functions'
            }
        };
    }

    getHTMLSnippets() {
        return {
            'html5-template': {
                body: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>$1</title>\n</head>\n<body>\n\t$2\n</body>\n</html>',
                description: 'HTML5 template',
                category: 'basic'
            },
            'div': {
                body: '<div class="$1">\n\t$2\n</div>',
                description: 'Div element',
                category: 'ui'
            },
            'button': {
                body: '<button class="$1" onclick="$2">\n\t$3\n</button>',
                description: 'Button element',
                category: 'ui'
            },
            'form': {
                body: '<form action="$1" method="$2">\n\t$3\n</form>',
                description: 'Form element',
                category: 'ui'
            },
            'input-text': {
                body: '<input type="text" name="$1" id="$1" class="$2" placeholder="$3">',
                description: 'Text input',
                category: 'ui'
            },
            'table': {
                body: '<table class="$1">\n\t<thead>\n\t\t<tr>\n\t\t\t<th>$2</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td>$3</td>\n\t\t</tr>\n\t</tbody>\n</table>',
                description: 'Table',
                category: 'ui'
            },
            'link-css': {
                body: '<link rel="stylesheet" href="$1">',
                description: 'CSS link',
                category: 'basic'
            },
            'script-js': {
                body: '<script src="$1"></script>',
                description: 'JavaScript script',
                category: 'basic'
            },
            'meta-viewport': {
                body: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                description: 'Viewport meta tag',
                category: 'basic'
            }
        };
    }

    getCSSSnippets() {
        return {
            'flex-container': {
                body: '.container {\n\tdisplay: flex;\n\tflex-direction: $1;\n\tjustify-content: $2;\n\talign-items: $3;\n\tgap: $4;\n}',
                description: 'Flex container',
                category: 'ui'
            },
            'grid-container': {
                body: '.container {\n\tdisplay: grid;\n\tgrid-template-columns: $1;\n\tgrid-gap: $2;\n\tjustify-items: $3;\n\talign-items: $4;\n}',
                description: 'Grid container',
                category: 'ui'
            },
            'media-query': {
                body: '@media screen and (max-width: $1px) {\n\t$2\n}',
                description: 'Media query',
                category: 'basic'
            },
            'keyframes': {
                body: '@keyframes $1 {\n\t0% {\n\t\t$2\n\t}\n\t100% {\n\t\t$3\n\t}\n}',
                description: 'CSS keyframes',
                category: 'basic'
            },
            'transition': {
                body: 'transition: $1 $2 $3;',
                description: 'CSS transition',
                category: 'basic'
            },
            'box-shadow': {
                body: 'box-shadow: $1 $2 $3 $4;',
                description: 'Box shadow',
                category: 'ui'
            },
            'gradient': {
                body: 'background: linear-gradient($1, $2, $3);',
                description: 'Linear gradient',
                category: 'ui'
            },
            'flex-item': {
                body: '.item {\n\tflex: $1;\n\torder: $2;\n\talign-self: $3;\n}',
                description: 'Flex item',
                category: 'ui'
            }
        };
    }

    getPythonSnippets() {
        return {
            'function': {
                body: 'def $1($2):\n\t$3\n\treturn $4',
                description: 'Function definition',
                category: 'functions'
            },
            'class': {
                body: 'class $1:\n\tdef __init__(self, $2):\n\t\tself.$2 = $2\n\n\tdef $3(self, $4):\n\t\t$5\n\t\treturn $6',
                description: 'Class definition',
                category: 'classes'
            },
            'for-loop': {
                body: 'for $1 in $2:\n\t$3',
                description: 'For loop',
                category: 'loops'
            },
            'if-statement': {
                body: 'if $1:\n\t$2\nelif $3:\n\t$4\nelse:\n\t$5',
                description: 'If-elif-else statement',
                category: 'conditions'
            },
            'try-except': {
                body: 'try:\n\t$1\nexcept $2 as $3:\n\tprint(f"Error: {e}")\n\t$4',
                description: 'Try-except block',
                category: 'basic'
            },
            'list-comprehension': {
                body: '[$1 for $2 in $3 if $4]',
                description: 'List comprehension',
                category: 'basic'
            },
            'dictionary': {
                body: '$1 = {\n\t"$2": $3,\n\t"$4": $5\n}',
                description: 'Dictionary',
                category: 'basic'
            },
            'import': {
                body: 'import $1\nfrom $2 import $3',
                description: 'Import statement',
                category: 'basic'
            },
            'main-function': {
                body: 'if __name__ == "__main__":\n\t$1',
                description: 'Main function',
                category: 'basic'
            }
        };
    }




    getJavaSnippets() {
        return {
            'main-method': {
                body: 'public static void main(String[] args) {\n\t$1\n}',
                description: 'Main method',
                category: 'basic'
            },
            'class': {
                body: 'public class $1 {\n\t$2\n}',
                description: 'Class definition',
                category: 'classes'
            },
            'for-loop': {
                body: 'for (int $1 = 0; $1 < $2; $1++) {\n\t$3\n}',
                description: 'For loop',
                category: 'loops'
            }
        };
    }

    getCSnippets() {
        return {
            'include': {
                body: '#include <$1>',
                description: 'Include directive',
                category: 'basic'
            },
            'main-function': {
                body: 'int main() {\n\t$1\n\treturn 0;\n}',
                description: 'Main function',
                category: 'basic'
            }
        };
    }

    getCPlusPlusSnippets() {
        return {
            ...this.getCSnippets(),
            'class': {
                body: 'class $1 {\npublic:\n\t$2\nprivate:\n\t$3\n};',
                description: 'Class definition',
                category: 'classes'
            }
        };
    }

    getCSharpSnippets() {
        return {
            'namespace': {
                body: 'namespace $1 {\n\t$2\n}',
                description: 'Namespace',
                category: 'basic'
            },
            'class': {
                body: 'public class $1 {\n\t$2\n}',
                description: 'Class definition',
                category: 'classes'
            }
        };
    }

    getPHPSnippets() {
        return {
            'php-tag': {
                body: '<?php\n\t$1\n?>',
                description: 'PHP tags',
                category: 'basic'
            },
            'echo': {
                body: 'echo $1;',
                description: 'Echo statement',
                category: 'basic'
            }
        };
    }

    getRubySnippets() {
        return {
            'class': {
                body: 'class $1\n\t$2\nend',
                description: 'Class definition',
                category: 'classes'
            },
            'method': {
                body: 'def $1($2)\n\t$3\nend',
                description: 'Method definition',
                category: 'functions'
            }
        };
    }

    getGoSnippets() {
        return {
            'package': {
                body: 'package $1\n\nimport (\n\t"$2"\n)',
                description: 'Package declaration',
                category: 'basic'
            },
            'function': {
                body: 'func $1($2) $3 {\n\t$4\n\treturn $5\n}',
                description: 'Function definition',
                category: 'functions'
            }
        };
    }

    getRustSnippets() {
        return {
            'main-function': {
                body: 'fn main() {\n\t$1\n}',
                description: 'Main function',
                category: 'basic'
            },
            'struct': {
                body: 'struct $1 {\n\t$2: $3,\n}',
                description: 'Struct definition',
                category: 'classes'
            }
        };
    }

    getSwiftSnippets() {
        return {
            'class': {
                body: 'class $1 {\n\t$2\n}',
                description: 'Class definition',
                category: 'classes'
            },
            'function': {
                body: 'func $1($2) -> $3 {\n\t$4\n\treturn $5\n}',
                description: 'Function definition',
                category: 'functions'
            }
        };
    }

    getKotlinSnippets() {
        return {
            'main-function': {
                body: 'fun main() {\n\t$1\n}',
                description: 'Main function',
                category: 'basic'
            },
            'class': {
                body: 'class $1 {\n\t$2\n}',
                description: 'Class definition',
                category: 'classes'
            }
        };
    }

    getSQLSnippets() {
        return {
            'select': {
                body: 'SELECT $1 FROM $2 WHERE $3;',
                description: 'SELECT query',
                category: 'database'
            },
            'insert': {
                body: 'INSERT INTO $1 ($2) VALUES ($3);',
                description: 'INSERT query',
                category: 'database'
            },
            'create-table': {
                body: 'CREATE TABLE $1 (\n\t$2 $3,\n\tPRIMARY KEY ($4)\n);',
                description: 'CREATE TABLE',
                category: 'database'
            }
        };
    }

    getMarkdownSnippets() {
        return {
            'header': {
                body: '# $1\n\n## $2\n\n### $3',
                description: 'Markdown headers',
                category: 'basic'
            },
            'link': {
                body: '[$1]($2)',
                description: 'Markdown link',
                category: 'basic'
            },
            'image': {
                body: '![$1]($2)',
                description: 'Markdown image',
                category: 'basic'
            },
            'code-block': {
                body: '```$1\n$2\n```',
                description: 'Code block',
                category: 'basic'
            }
        };
    }

    getYAMLSnippets() {
        return {
            'key-value': {
                body: '$1: $2',
                description: 'Key-value pair',
                category: 'basic'
            },
            'list': {
                body: '$1:\n  - $2\n  - $3',
                description: 'List',
                category: 'basic'
            }
        };
    }

    getXMLSnippets() {
        return {
            'element': {
                body: '<$1>$2</$1>',
                description: 'XML element',
                category: 'basic'
            },
            'self-closing': {
                body: '<$1/>',
                description: 'Self-closing element',
                category: 'basic'
            }
        };
    }

    getReactSnippets() {
        return {
            'component-class': {
                body: 'class $1 extends React.Component {\n\tconstructor(props) {\n\t\tsuper(props);\n\t\tthis.state = {\n\t\t\t$2\n\t\t};\n\t}\n\n\trender() {\n\t\treturn (\n\t\t\t<div className="$3">\n\t\t\t\t$4\n\t\t\t</div>\n\t\t);\n\t}\n}',
                description: 'React class component',
                category: 'classes'
            },
            'component-function': {
                body: 'const $1 = ({ $2 }) => {\n\treturn (\n\t\t<div className="$3">\n\t\t\t$4\n\t\t</div>\n\t);\n};',
                description: 'React function component',
                category: 'functions'
            },
            'use-state': {
                body: 'const [$1, set$1] = useState($2);',
                description: 'useState hook',
                category: 'basic'
            },
            'use-effect': {
                body: 'useEffect(() => {\n\t$1\n\treturn () => {\n\t\t$2\n\t};\n}, [$3]);',
                description: 'useEffect hook',
                category: 'basic'
            }
        };
    }

    getVueSnippets() {
        return {
            'template': {
                body: '<template>\n\t<div class="$1">\n\t\t$2\n\t</div>\n</template>',
                description: 'Vue template',
                category: 'basic'
            },
            'script': {
                body: '<script>\nexport default {\n\tname: \'$1\',\n\tdata() {\n\t\treturn {\n\t\t\t$2\n\t\t};\n\t},\n\tmethods: {\n\t\t$3() {\n\t\t\t$4\n\t\t}\n\t}\n};\n</script>',
                description: 'Vue script',
                category: 'basic'
            }
        };
    }

    getAngularSnippets() {
        return {
            'component': {
                body: '@Component({\n\tselector: \'$1\',\n\ttemplateUrl: \'$2.html\',\n\tstyleUrls: [\'$2.scss\']\n})\nexport class $1Component {\n\t$3\n}',
                description: 'Angular component',
                category: 'classes'
            },
            'service': {
                body: '@Injectable({\n\tprovidedIn: \'root\'\n})\nexport class $1Service {\n\t$2\n}',
                description: 'Angular service',
                category: 'classes'
            }
        };
    }


    showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}


window.enhancedSnippetsManager = new EnhancedSnippetsManager();


window.insertSnippet = (snippetName, language) => window.enhancedSnippetsManager.insertSnippet(snippetName, language);
window.showSnippetPalette = () => window.enhancedSnippetsManager.showSnippetPalette();
window.addCustomSnippet = (snippet) => window.enhancedSnippetsManager.addCustomSnippet(snippet);
window.removeCustomSnippet = (snippetName, language) => window.enhancedSnippetsManager.removeCustomSnippet(snippetName, language);
window.getSnippetsForLanguage = (language) => window.enhancedSnippetsManager.getSnippetsForLanguage(language);
window.getSnippetCategories = () => window.enhancedSnippetsManager.getSnippetCategories();

