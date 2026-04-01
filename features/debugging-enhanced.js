


class EnhancedDebugger {
    constructor() {
        this.breakpoints = [];
        this.watchExpressions = [];
        this.callStack = [];
        this.currentVariables = {};
        this.isDebugging = false;
        this.currentLine = null;
        this.debugSessionId = null;

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

        this.setupDebuggingDecorations();


        this.addDebuggingCommands();


        this.loadBreakpoints();
    }

    setupEventListeners() {

        window.toggleBreakpoint = (lineNumber) => this.toggleBreakpoint(lineNumber);
        window.startDebugging = () => this.startDebugging();
        window.stopDebugging = () => this.stopDebugging();
        window.stepOver = () => this.stepOver();
        window.stepInto = () => this.stepInto();
        window.stepOut = () => this.stepOut();
        window.continueDebugging = () => this.continueDebugging();
        window.addWatchExpression = (expression) => this.addWatchExpression(expression);
        window.removeWatchExpression = (index) => this.removeWatchExpression(index);
        window.getCurrentVariables = () => this.getCurrentVariables();
        window.getCallStack = () => this.getCallStack();
        window.getBreakpoints = () => this.getBreakpoints();
    }

    setupDebuggingDecorations() {
        if (!window.editor) return;


        this.breakpointDecorations = window.editor.createDecorationsCollection();


        this.currentLineDecorations = window.editor.createDecorationsCollection();


        if (window.editor._contextMenu) {
            window.editor._contextMenu.addAction({
                id: 'toggle-breakpoint',
                label: 'Toggle Breakpoint',
                contextMenuGroupId: 'navigation',
                run: (editor, action) => {
                    const position = editor.getPosition();
                    if (position) {
                        this.toggleBreakpoint(position.lineNumber);
                    }
                }
            });
        }
    }

    addDebuggingCommands() {
        if (window.editor) {

            window.editor.addCommand(
                monaco.KeyCode.F9,
                () => {
                    const position = window.editor.getPosition();
                    if (position) {
                        this.toggleBreakpoint(position.lineNumber);
                    }
                }
            );


            window.editor.addCommand(
                monaco.KeyCode.F5,
                () => this.startDebugging()
            );


            window.editor.addCommand(
                monaco.KeyCode.F10,
                () => this.stepOver()
            );


            window.editor.addCommand(
                monaco.KeyCode.F11,
                () => this.stepInto()
            );


            window.editor.addCommand(
                monaco.KeyMod.Shift | monaco.KeyCode.F11,
                () => this.stepOut()
            );


            window.editor.addCommand(
                monaco.KeyCode.F8,
                () => this.continueDebugging()
            );
        }
    }

    loadBreakpoints() {

        const savedBreakpoints = localStorage.getItem('debugBreakpoints');
        if (savedBreakpoints) {
            try {
                this.breakpoints = JSON.parse(savedBreakpoints);
                this.updateBreakpointDecorations();
            } catch (error) {
                console.error('Error loading breakpoints:', error);
            }
        }
    }

    saveBreakpoints() {

        try {
            localStorage.setItem('debugBreakpoints', JSON.stringify(this.breakpoints));
        } catch (error) {
            console.error('Error saving breakpoints:', error);
        }
    }

    toggleBreakpoint(lineNumber) {
        if (!lineNumber || lineNumber < 1) {
            this.showToast('Invalid line number', 'error');
            return;
        }

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file', 'error');
            return;
        }

        const breakpointKey = `${file.id}:${lineNumber}`;
        const existingIndex = this.breakpoints.findIndex(bp => bp.key === breakpointKey);

        if (existingIndex >= 0) {

            this.breakpoints.splice(existingIndex, 1);
            this.showToast(`Breakpoint removed at line ${lineNumber}`, 'info');
        } else {

            this.breakpoints.push({
                key: breakpointKey,
                fileId: file.id,
                lineNumber: lineNumber,
                enabled: true,
                condition: '',
                hitCount: 0
            });
            this.showToast(`Breakpoint set at line ${lineNumber}`, 'success');
        }

        this.updateBreakpointDecorations();
        this.saveBreakpoints();
    }

    updateBreakpointDecorations() {
        if (!window.editor || !this.breakpointDecorations) return;

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) return;

        const decorations = this.breakpoints
            .filter(bp => bp.fileId === file.id)
            .map(bp => ({
                range: new monaco.Range(bp.lineNumber, 1, bp.lineNumber, 1),
                options: {
                    isWholeLine: true,
                    className: 'debug-breakpoint',
                    glyphMarginClassName: 'debug-breakpoint-glyph',
                    glyphMarginHoverMessage: {
                        value: `Breakpoint at line ${bp.lineNumber}`
                    },
                    marginClassName: 'debug-breakpoint-margin'
                }
            }));

        this.breakpointDecorations.set(decorations);
    }

    updateCurrentLineDecoration(lineNumber) {
        if (!window.editor || !this.currentLineDecorations) return;

        if (lineNumber) {
            this.currentLine = lineNumber;
            const decorations = [{
                range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                options: {
                    isWholeLine: true,
                    className: 'debug-current-line',
                    glyphMarginClassName: 'debug-current-line-glyph',
                    marginClassName: 'debug-current-line-margin'
                }
            }];
            this.currentLineDecorations.set(decorations);


            window.editor.revealLineInCenter(lineNumber);
        } else {
            this.currentLineDecorations.clear();
            this.currentLine = null;
        }
    }

    startDebugging() {
        if (this.isDebugging) {
            this.showToast('Debugging already in progress', 'warning');
            return;
        }

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file to debug', 'error');
            return;
        }

        this.isDebugging = true;
        this.debugSessionId = 'debug-' + Date.now();
        this.currentLine = null;
        this.callStack = [];
        this.currentVariables = {};

        this.showToast('Debugging started', 'success');


        this.executeDebugSession(file);
    }

    async executeDebugSession(file) {
        try {

            const lines = file.content.split('\n');
            let currentLine = 1;


            const firstBreakpoint = this.breakpoints
                .filter(bp => bp.fileId === file.id && bp.enabled)
                .sort((a, b) => a.lineNumber - b.lineNumber)[0];

            if (firstBreakpoint) {
                currentLine = firstBreakpoint.lineNumber;
            }


            this.updateCurrentLineDecoration(currentLine);


            this.inspectVariablesAtLine(lines[currentLine - 1], currentLine);


            this.showDebugControls(true);

            this.showToast(`Paused at line ${currentLine}`, 'info');

        } catch (error) {
            console.error('Debug execution error:', error);
            this.showToast('Debug error: ' + error.message, 'error');
            this.stopDebugging();
        }
    }

    inspectVariablesAtLine(lineContent, lineNumber) {

        const variables = {};


        const varMatches = lineContent.match(/(\w+)\s*=\s*([^;]+)/);
        if (varMatches) {
            variables[varMatches[1]] = {
                value: varMatches[2].trim(),
                type: this.inferType(varMatches[2]),
                line: lineNumber
            };
        }


        const funcMatches = lineContent.match(/function\s+\w+\s*\(([^)]*)\)/);
        if (funcMatches && funcMatches[1]) {
            const params = funcMatches[1].split(',').map(p => p.trim());
            params.forEach(param => {
                if (param) {
                    variables[param] = {
                        value: '<uninitialized>',
                        type: 'unknown',
                        line: lineNumber
                    };
                }
            });
        }

        this.currentVariables = variables;


        if (window.updateDebugVariables) {
            window.updateDebugVariables(variables);
        }
    }

    inferType(value) {
        if (!value) return 'unknown';

        value = value.trim();

        if (value.startsWith('"') && value.endsWith('"') ||
            value.startsWith("'") && value.endsWith("'") ||
            value.startsWith('`') && value.endsWith('`')) {
            return 'string';
        }

        if (!isNaN(value) && !isNaN(parseFloat(value))) {
            return 'number';
        }

        if (value === 'true' || value === 'false') {
            return 'boolean';
        }

        if (value === 'null') {
            return 'null';
        }

        if (value === 'undefined') {
            return 'undefined';
        }

        if (value.startsWith('[') && value.endsWith(']')) {
            return 'array';
        }

        if (value.startsWith('{') && value.endsWith('}')) {
            return 'object';
        }

        if (value.startsWith('/') && value.endsWith('/')) {
            return 'regexp';
        }

        if (value === 'function' || value.includes('=>')) {
            return 'function';
        }

        return 'unknown';
    }

    stepOver() {
        if (!this.isDebugging) {
            this.showToast('Not in debugging mode', 'error');
            return;
        }

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file', 'error');
            return;
        }

        if (!this.currentLine) {
            this.showToast('No current execution line', 'error');
            return;
        }


        const lines = file.content.split('\n');
        let nextLine = this.currentLine + 1;


        const breakpointsOnFile = this.breakpoints.filter(bp => bp.fileId === file.id && bp.enabled);
        const nextBreakpoint = breakpointsOnFile.find(bp => bp.lineNumber > this.currentLine);

        if (nextBreakpoint) {
            nextLine = nextBreakpoint.lineNumber;
        } else {

            nextLine = Math.min(nextLine, lines.length);
        }

        this.updateCurrentLineDecoration(nextLine);
        this.inspectVariablesAtLine(lines[nextLine - 1], nextLine);

        this.showToast(`Stepped to line ${nextLine}`, 'info');
    }

    stepInto() {
        if (!this.isDebugging) {
            this.showToast('Not in debugging mode', 'error');
            return;
        }

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file', 'error');
            return;
        }

        if (!this.currentLine) {
            this.showToast('No current execution line', 'error');
            return;
        }



        this.stepOver();
    }

    stepOut() {
        if (!this.isDebugging) {
            this.showToast('Not in debugging mode', 'error');
            return;
        }

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file', 'error');
            return;
        }

        if (!this.currentLine) {
            this.showToast('No current execution line', 'error');
            return;
        }



        const lines = file.content.split('\n');
        let nextLine = this.currentLine;


        for (let i = this.currentLine; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('}') || line.includes(');')) {
                nextLine = i + 1;
                break;
            }
        }

        this.updateCurrentLineDecoration(nextLine);
        this.inspectVariablesAtLine(lines[nextLine - 1], nextLine);

        this.showToast(`Stepped out to line ${nextLine}`, 'info');
    }

    continueDebugging() {
        if (!this.isDebugging) {
            this.showToast('Not in debugging mode', 'error');
            return;
        }

        const file = window.localFiles.find(f => f.id === window.activeFileId);
        if (!file) {
            this.showToast('No active file', 'error');
            return;
        }

        if (!this.currentLine) {
            this.showToast('No current execution line', 'error');
            return;
        }


        const breakpointsOnFile = this.breakpoints.filter(bp => bp.fileId === file.id && bp.enabled);
        const nextBreakpoint = breakpointsOnFile.find(bp => bp.lineNumber > this.currentLine);

        if (nextBreakpoint) {
            this.updateCurrentLineDecoration(nextBreakpoint.lineNumber);
            this.inspectVariablesAtLine(
                file.content.split('\n')[nextBreakpoint.lineNumber - 1],
                nextBreakpoint.lineNumber
            );
            this.showToast(`Continued to breakpoint at line ${nextBreakpoint.lineNumber}`, 'info');
        } else {

            this.showToast('No more breakpoints - ending debug session', 'info');
            this.stopDebugging();
        }
    }

    stopDebugging() {
        this.isDebugging = false;
        this.debugSessionId = null;
        this.updateCurrentLineDecoration(null);
        this.callStack = [];
        this.currentVariables = {};


        this.showDebugControls(false);

        this.showToast('Debugging stopped', 'success');
    }

    addWatchExpression(expression) {
        if (!expression || typeof expression !== 'string') {
            this.showToast('Invalid watch expression', 'error');
            return;
        }

        this.watchExpressions.push({
            expression: expression,
            value: '<evaluating>',
            type: 'unknown'
        });



        this.showToast(`Added watch expression: ${expression}`, 'success');

        return this.watchExpressions.length - 1;
    }

    removeWatchExpression(index) {
        if (index < 0 || index >= this.watchExpressions.length) {
            this.showToast('Invalid watch expression index', 'error');
            return;
        }

        this.watchExpressions.splice(index, 1);
        this.showToast('Removed watch expression', 'success');
    }

    getCurrentVariables() {
        return this.currentVariables;
    }

    getCallStack() {
        return this.callStack;
    }

    getBreakpoints() {
        return this.breakpoints;
    }

    showDebugControls(show) {

        if (window.showDebugControls) {
            window.showDebugControls(show);
        }
    }


    showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}


window.enhancedDebugger = new EnhancedDebugger();


window.toggleBreakpoint = (lineNumber) => window.enhancedDebugger.toggleBreakpoint(lineNumber);
window.startDebugging = () => window.enhancedDebugger.startDebugging();
window.stopDebugging = () => window.enhancedDebugger.stopDebugging();
window.stepOver = () => window.enhancedDebugger.stepOver();
window.stepInto = () => window.enhancedDebugger.stepInto();
window.stepOut = () => window.enhancedDebugger.stepOut();
window.continueDebugging = () => window.enhancedDebugger.continueDebugging();
window.addWatchExpression = (expression) => window.enhancedDebugger.addWatchExpression(expression);
window.removeWatchExpression = (index) => window.enhancedDebugger.removeWatchExpression(index);
window.getCurrentVariables = () => window.enhancedDebugger.getCurrentVariables();
window.getCallStack = () => window.enhancedDebugger.getCallStack();
window.getBreakpoints = () => window.enhancedDebugger.getBreakpoints();

