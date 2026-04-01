


class EnhancedLinter {
    constructor() {
        this.linters = {
            javascript: this.lintJavaScript,
            typescript: this.lintTypeScript,
            html: this.lintHTML,
            css: this.lintCSS,
            json: this.lintJSON,
            python: this.lintPython,
            java: this.lintJava,
            c: this.lintC,
            cpp: this.lintCPlusPlus,
            csharp: this.lintCSharp,
            php: this.lintPHP,
            ruby: this.lintRuby,
            go: this.lintGo,
            rust: this.lintRust,
            swift: this.lintSwift,
            kotlin: this.lintKotlin,
            sql: this.lintSQL,
            markdown: this.lintMarkdown,
            yaml: this.lintYAML,
            xml: this.lintXML
        };

        this.lintingRules = {
            javascript: {
                noUnusedVars: true,
                noConsole: false,
                noDebugger: true,
                noUndefined: true,
                noExtraSemi: true,
                noExtraBind: true,
                noImplicitGlobals: true,
                noImplicitReturns: true,
                noInvalidThis: true,
                noLoopFunc: true,
                noMagicNumbers: false,
                noNewWrappers: true,
                noParamReassign: true,
                noProto: true,
                noReturnAssign: true,
                noScriptUrl: true,
                noSelfCompare: true,
                noSequences: true,
                noShadow: true,
                noThrowLiteral: true,
                noUnmodifiedLoopCondition: true,
                noUnusedExpressions: true,
                noUnusedLabels: true,
                noUselessCall: true,
                noUselessCatch: true,
                noUselessConcat: true,
                noUselessEscape: true,
                noUselessReturn: true,
                noVoid: true,
                noWith: true,
                preferConst: true,
                preferTemplate: true,
                preferSpread: true,
                preferRestParams: true,
                preferArrowFunctions: true,
                preferDestructuring: true,
                preferPromiseRejectErrors: true
            },

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

        this.setupLintingDecorations();


        this.addLintingCommands();


        this.setupRealTimeLinting();
    }

    setupEventListeners() {

        window.lintDocument = () => this.lintCurrentDocument();
        window.toggleLinting = (enabled) => this.toggleLinting(enabled);
        window.applyQuickFix = (fix) => this.applyQuickFix(fix);
    }

    setupLintingDecorations() {
        if (!window.editor) return;


        this.lintDecorations = window.editor.createDecorationsCollection();


        if (window.editor._contextMenu) {
            window.editor._contextMenu.addAction({
                id: 'lint-document',
                label: 'Lint Document',
                contextMenuGroupId: 'navigation',
                run: () => this.lintCurrentDocument()
            });
        }
    }

    addLintingCommands() {
        if (window.editor) {

            window.editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_L,
                () => this.lintCurrentDocument()
            );


            window.editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KEY_L,
                () => this.toggleLinting(!this.isLintingEnabled)
            );
        }
    }

    setupRealTimeLinting() {
        this.isLintingEnabled = true;
        this.lintTimeout = null;

        if (window.editor) {
            window.editor.onDidChangeModelContent((e) => {
                if (!this.isLintingEnabled) return;


                clearTimeout(this.lintTimeout);
                this.lintTimeout = setTimeout(() => {
                    this.lintCurrentDocument();
                }, 1000);
            });


            window.editor.onDidChangeModel(() => {
                if (this.isLintingEnabled) {
                    this.lintCurrentDocument();
                }
            });
        }
    }

    toggleLinting(enabled) {
        this.isLintingEnabled = enabled;
        this.showToast(enabled ? 'Real-time linting enabled' : 'Real-time linting disabled', enabled ? 'success' : 'info');

        if (enabled) {
            this.lintCurrentDocument();
        } else {
            this.clearLintingMarkers();
        }
    }

    lintCurrentDocument() {
        if (!this.isLintingEnabled) {
            this.showToast('Linting is disabled', 'warning');
            return;
        }

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file to lint', 'error');
            return;
        }

        this.showToast('Linting document...', 'info');

        this.lintDocumentContent(file.content, file.lang)
            .then(problems => {
                this.displayLintingResults(problems, file);
            })
            .catch(error => {
                console.error('Linting error:', error);
                this.showToast('Linting failed: ' + error.message, 'error');
            });
    }

    async lintDocumentContent(content, language) {
        if (!content || typeof content !== 'string') {
            return [];
        }

        try {

            const linter = this.linters[language.toLowerCase()] || this.linters['javascript'];
            return await linter.call(this, content);
        } catch (error) {
            console.error('Lint error for ' + language + ':', error);
            return [];
        }
    }

    displayLintingResults(problems, file) {

        this.clearLintingMarkers();

        if (!problems || problems.length === 0) {
            this.showToast('No linting issues found', 'success');
            return;
        }


        const problemsByLine = {};
        problems.forEach(problem => {
            if (!problemsByLine[problem.line]) {
                problemsByLine[problem.line] = [];
            }
            problemsByLine[problem.line].push(problem);
        });


        const decorations = [];

        problems.forEach(problem => {
            const lineNumber = problem.line;
            const column = problem.column || 1;
            const endColumn = problem.endColumn || column + 10;


            let color;
            switch (problem.severity) {
                case 'error': color = 'rgba(239, 68, 68, 0.3)'; break;
                case 'warning': color = 'rgba(245, 158, 11, 0.3)'; break;
                case 'info': color = 'rgba(59, 130, 246, 0.3)'; break;
                default: color = 'rgba(16, 185, 129, 0.3)';
            }

            decorations.push({
                range: new monaco.Range(lineNumber, column, lineNumber, endColumn),
                options: {
                    isWholeLine: false,
                    inlineClassName: 'lint-marker',
                    overviewRuler: {
                        color: color,
                        position: monaco.OverviewRulerLane.Right
                    },
                    glyphMarginClassName: 'lint-glyph',
                    glyphMarginHoverMessage: {
                        value: `[${problem.severity.toUpperCase()}] ${problem.message}`
                    },
                    hoverMessage: {
                        value: `[${problem.severity.toUpperCase()}] ${problem.message}\n\n**Rule:** ${problem.ruleId}\n**Quick Fix:** ${problem.fix || 'None available'}`
                    }
                }
            });
        });


        if (window.editor && this.lintDecorations) {
            this.lintDecorations.set(decorations);
        }


        const errorCount = problems.filter(p => p.severity === 'error').length;
        const warningCount = problems.filter(p => p.severity === 'warning').length;
        const infoCount = problems.filter(p => p.severity === 'info').length;

        let summary = `Linting complete: ${problems.length} issue`;
        if (problems.length !== 1) summary += 's';
        summary += ` (${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}, ${infoCount} info${infoCount !== 1 ? 's' : ''})`;

        this.showToast(summary, errorCount > 0 ? 'warning' : 'success');


        this.currentProblems = problems;
    }

    clearLintingMarkers() {
        if (this.lintDecorations) {
            this.lintDecorations.clear();
        }
        this.currentProblems = [];
    }

    applyQuickFix(fix) {
        if (!fix || !this.currentProblems) {
            this.showToast('No quick fix available', 'error');
            return;
        }

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file', 'error');
            return;
        }


        const problem = this.currentProblems.find(p => p.fix === fix);
        if (!problem) {
            this.showToast('Quick fix not found', 'error');
            return;
        }


        const lines = file.content.split('\n');
        if (problem.line <= lines.length) {

            const fixedLine = this.applyFixToLine(lines[problem.line - 1], problem);
            lines[problem.line - 1] = fixedLine;

            const newContent = lines.join('\n');
            file.content = newContent;

            if (window.editor) {
                window.editor.setValue(newContent);
            }

            this.showToast('Quick fix applied', 'success');


            setTimeout(() => {
                this.lintCurrentDocument();
            }, 500);
        }
    }

    applyFixToLine(line, problem) {

        switch (problem.ruleId) {
            case 'no-console':
                return line.replace(/console\.log\(.*?\);/g, '// Removed console.log');
            case 'no-debugger':
                return line.replace(/debugger;/g, '// Removed debugger');
            case 'prefer-const':
                return line.replace(/let\s+/g, 'const ');
            case 'no-unused-vars':
                return line.replace(new RegExp(`\\b${problem.variable}\\b`, 'g'), ` ${problem.variable}`);
            default:
                return line;
        }
    }


    async lintJavaScript(content) {
        return this.lintWithESLint(content, 'javascript');
    }

    async lintTypeScript(content) {
        return this.lintWithESLint(content, 'typescript');
    }

    async lintHTML(content) {
        return this.lintHTMLContent(content);
    }

    async lintCSS(content) {
        return this.lintCSSContent(content);
    }

    async lintJSON(content) {
        return this.lintJSONContent(content);
    }

    async lintPython(content) {
        return this.lintPythonContent(content);
    }

    async lintJava(content) {
        return this.lintJavaContent(content);
    }

    async lintC(content) {
        return this.lintCContent(content);
    }

    async lintCPlusPlus(content) {
        return this.lintCPlusPlusContent(content);
    }

    async lintCSharp(content) {
        return this.lintCSharpContent(content);
    }

    async lintPHP(content) {
        return this.lintPHPContent(content);
    }

    async lintRuby(content) {
        return this.lintRubyContent(content);
    }

    async lintGo(content) {
        return this.lintGoContent(content);
    }

    async lintRust(content) {
        return this.lintRustContent(content);
    }

    async lintSwift(content) {
        return this.lintSwiftContent(content);
    }

    async lintKotlin(content) {
        return this.lintKotlinContent(content);
    }

    async lintSQL(content) {
        return this.lintSQLContent(content);
    }

    async lintMarkdown(content) {
        return this.lintMarkdownContent(content);
    }

    async lintYAML(content) {
        return this.lintYAMLContent(content);
    }

    async lintXML(content) {
        return this.lintXMLContent(content);
    }

    async lintWithESLint(content, language) {
        try {

            await this.loadESLint();

            if (window.ESLint) {
                const lintResults = [];


                const lines = content.split('\n');

                lines.forEach((line, index) => {
                    const lineNumber = index + 1;


                    if (line.includes('console.log') && this.lintingRules.javascript.noConsole) {
                        lintResults.push({
                            line: lineNumber,
                            column: line.indexOf('console.log') + 1,
                            endColumn: line.indexOf('console.log') + 12,
                            severity: 'warning',
                            message: 'Unexpected console statement',
                            ruleId: 'no-console',
                            fix: 'Remove console.log statement'
                        });
                    }


                    if (line.includes('debugger') && this.lintingRules.javascript.noDebugger) {
                        lintResults.push({
                            line: lineNumber,
                            column: line.indexOf('debugger') + 1,
                            endColumn: line.indexOf('debugger') + 9,
                            severity: 'error',
                            message: 'Unexpected debugger statement',
                            ruleId: 'no-debugger',
                            fix: 'Remove debugger statement'
                        });
                    }


                    const varMatch = line.match(/let\s+(\w+)\s*=/);
                    if (varMatch && this.lintingRules.javascript.noUnusedVars) {
                        const varName = varMatch[1];

                        const varUsage = content.match(new RegExp(`\\b${varName}\\b`, 'g'));
                        if (varUsage && varUsage.length === 1) {
                            lintResults.push({
                                line: lineNumber,
                                column: varMatch.index + 4,
                                endColumn: varMatch.index + 4 + varName.length,
                                severity: 'warning',
                                message: `'${varName}' is defined but never used`,
                                ruleId: 'no-unused-vars',
                                fix: `Remove unused variable '${varName}'`,
                                variable: varName
                            });
                        }
                    }


                    if (line.match(/let\s+\w+\s*=\s*[^=]/) && !line.includes('=') && this.lintingRules.javascript.preferConst) {
                        lintResults.push({
                            line: lineNumber,
                            column: line.indexOf('let') + 1,
                            endColumn: line.indexOf('let') + 4,
                            severity: 'info',
                            message: 'Prefer const over let for variables that are never reassigned',
                            ruleId: 'prefer-const',
                            fix: 'Change let to const'
                        });
                    }
                });

                return lintResults;
            } else {
                return this.basicLinting(content, language);
            }
        } catch (error) {
            console.error('ESLint error:', error);
            return this.basicLinting(content, language);
        }
    }

    async loadESLint() {
        if (window.ESLint) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/eslint@8.0.0/eslint.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    basicLinting(content, language) {
        const problems = [];


        try {
            if (language === 'javascript' || language === 'typescript') {

                const stack = [];
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const lineNumber = i + 1;

                    for (let j = 0; j < line.length; j++) {
                        const char = line[j];

                        if (char === '{' || char === '[' || char === '(') {
                            stack.push({ char, line: lineNumber, column: j + 1 });
                        } else if (char === '}' || char === ']' || char === ')') {
                            if (stack.length === 0) {
                                problems.push({
                                    line: lineNumber,
                                    column: j + 1,
                                    severity: 'error',
                                    message: `Unmatched '${char}'`,
                                    ruleId: 'unmatched-brace'
                                });
                            } else {
                                const last = stack.pop();
                                const expected = last.char === '{' ? '}' : last.char === '[' ? ']' : ')';

                                if (char !== expected) {
                                    problems.push({
                                        line: lineNumber,
                                        column: j + 1,
                                        severity: 'error',
                                        message: `Expected '${expected}' but found '${char}'`,
                                        ruleId: 'mismatched-brace'
                                    });
                                }
                            }
                        }
                    }
                }


                while (stack.length > 0) {
                    const unclosed = stack.pop();
                    problems.push({
                        line: unclosed.line,
                        column: unclosed.column,
                        severity: 'error',
                        message: `Unclosed '${unclosed.char}'`,
                        ruleId: 'unclosed-brace'
                    });
                }
            }
        } catch (error) {
            console.error('Basic linting error:', error);
        }

        return problems;
    }

    lintHTMLContent(content) {
        const problems = [];


        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNumber = index + 1;


            if (line.includes('<') && !line.includes('</') && !line.includes('/>') && !line.includes('<!')) {
                const tagMatch = line.match(/<(\w+)/);
                if (tagMatch) {
                    const tagName = tagMatch[1];

                    const closingTag = new RegExp(`</${tagName}>`, 'i');
                    if (!content.match(closingTag)) {
                        problems.push({
                            line: lineNumber,
                            column: tagMatch.index + 1,
                            severity: 'warning',
                            message: `Unclosed HTML tag: <${tagName}>`,
                            ruleId: 'unclosed-tag'
                        });
                    }
                }
            }


            const deprecatedTags = ['<font', '<center', '<big', '<strike', '<tt', '<frame', '<frameset'];
            deprecatedTags.forEach(tag => {
                if (line.includes(tag)) {
                    problems.push({
                        line: lineNumber,
                        column: line.indexOf(tag) + 1,
                        severity: 'warning',
                        message: `Deprecated HTML tag: ${tag}`,
                        ruleId: 'deprecated-tag',
                        fix: `Replace with modern CSS equivalent`
                    });
                }
            });
        });

        return problems;
    }

    lintCSSContent(content) {
        const problems = [];


        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNumber = index + 1;


            if (line.includes('!important')) {
                problems.push({
                    line: lineNumber,
                    column: line.indexOf('!important') + 1,
                    severity: 'warning',
                    message: 'Avoid using !important as it can make CSS harder to maintain',
                    ruleId: 'no-important',
                    fix: 'Refactor CSS to use proper specificity'
                });
            }


            const deprecatedProps = ['text-align-last', 'text-justify', 'text-kashida-space', 'text-underline-position'];
            deprecatedProps.forEach(prop => {
                if (line.includes(prop)) {
                    problems.push({
                        line: lineNumber,
                        column: line.indexOf(prop) + 1,
                        severity: 'warning',
                        message: `Deprecated CSS property: ${prop}`,
                        ruleId: 'deprecated-property'
                    });
                }
            });
        });

        return problems;
    }

    lintJSONContent(content) {
        const problems = [];

        try {
            JSON.parse(content);
        } catch (error) {

            const match = error.message.match(/position\s+(\d+)/);
            if (match) {
                const position = parseInt(match[1]);
                const lines = content.substring(0, position).split('\n');
                const lineNumber = lines.length;
                const column = lines[lines.length - 1].length + 1;

                problems.push({
                    line: lineNumber,
                    column: column,
                    severity: 'error',
                    message: 'Invalid JSON: ' + error.message,
                    ruleId: 'invalid-json'
                });
            } else {
                problems.push({
                    line: 1,
                    column: 1,
                    severity: 'error',
                    message: 'Invalid JSON: ' + error.message,
                    ruleId: 'invalid-json'
                });
            }
        }

        return problems;
    }


    showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}


window.enhancedLinter = new EnhancedLinter();


window.lintDocument = () => window.enhancedLinter.lintCurrentDocument();
window.toggleLinting = (enabled) => window.enhancedLinter.toggleLinting(enabled);
window.applyQuickFix = (fix) => window.enhancedLinter.applyQuickFix(fix);

