


class EnhancedMultiCursor {
    constructor() {
        this.cursorPositions = [];
        this.maxCursors = 20;
        this.cursorMode = 'normal'; 

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

        this.addMultiCursorCommands();


        this.setupCursorManagement();
    }

    setupEventListeners() {

        window.addCursorAtPosition = (line, column) => this.addCursorAtPosition(line, column);
        window.addCursorAbove = () => this.addCursorAbove();
        window.addCursorBelow = () => this.addCursorBelow();
        window.addCursorsToLineEnds = () => this.addCursorsToLineEnds();
        window.addCursorsToPattern = (pattern) => this.addCursorsToPattern(pattern);
        window.clearExtraCursors = () => this.clearExtraCursors();
        window.toggleCursorMode = (mode) => this.toggleCursorMode(mode);
        window.getCursorCount = () => this.getCursorCount();
    }

    addMultiCursorCommands() {
        if (window.editor) {

            window.editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow,
                () => this.addCursorAbove()
            );


            window.editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow,
                () => this.addCursorBelow()
            );


            window.editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.DownArrow,
                () => this.addCursorsToLineEnds()
            );


            window.editor.addCommand(
                monaco.KeyCode.Escape,
                () => this.clearExtraCursors()
            );


            if (window.editor._contextMenu) {
                window.editor._contextMenu.addAction({
                    id: 'add-cursor-above',
                    label: 'Add Cursor Above',
                    contextMenuGroupId: 'navigation',
                    run: () => this.addCursorAbove()
                });

                window.editor._contextMenu.addAction({
                    id: 'add-cursor-below',
                    label: 'Add Cursor Below',
                    contextMenuGroupId: 'navigation',
                    run: () => this.addCursorBelow()
                });

                window.editor._contextMenu.addAction({
                    id: 'clear-cursors',
                    label: 'Clear Extra Cursors',
                    contextMenuGroupId: 'navigation',
                    run: () => this.clearExtraCursors()
                });
            }
        }
    }

    setupCursorManagement() {

        if (window.editor) {
            window.editor.onDidChangeCursorPosition((e) => {

                this.updateCursorTracking();
            });


            this.updateCursorTracking();
        }
    }

    updateCursorTracking() {
        if (!window.editor) return;

        const selections = window.editor.getSelections();
        if (!selections || selections.length === 0) return;


        const primarySelection = selections[0];
        this.primaryCursor = {
            lineNumber: primarySelection.positionLineNumber,
            column: primarySelection.positionColumn
        };


        this.cursorPositions = selections.map(sel => ({
            lineNumber: sel.positionLineNumber,
            column: sel.positionColumn
        }));
    }

    addCursorAtPosition(lineNumber, column) {
        if (!window.editor) {
            this.showToast('Editor not ready', 'error');
            return false;
        }

        if (this.cursorPositions.length >= this.maxCursors) {
            this.showToast(`Maximum ${this.maxCursors} cursors reached`, 'warning');
            return false;
        }


        const currentSelections = window.editor.getSelections();
        const newSelections = [...currentSelections];

        newSelections.push({
            selectionStartLineNumber: lineNumber,
            selectionStartColumn: column,
            positionLineNumber: lineNumber,
            positionColumn: column
        });

        window.editor.setSelections(newSelections);
        this.updateCursorTracking();

        this.showToast(`Added cursor at line ${lineNumber}, column ${column}`, 'success');
        return true;
    }

    addCursorAbove() {
        if (!window.editor || !this.primaryCursor) {
            this.showToast('No active cursor position', 'error');
            return false;
        }

        if (this.cursorPositions.length >= this.maxCursors) {
            this.showToast(`Maximum ${this.maxCursors} cursors reached`, 'warning');
            return false;
        }

        const lineAbove = Math.max(1, this.primaryCursor.lineNumber - 1);
        return this.addCursorAtPosition(lineAbove, this.primaryCursor.column);
    }

    addCursorBelow() {
        if (!window.editor || !this.primaryCursor) {
            this.showToast('No active cursor position', 'error');
            return false;
        }

        if (this.cursorPositions.length >= this.maxCursors) {
            this.showToast(`Maximum ${this.maxCursors} cursors reached`, 'warning');
            return false;
        }

        const lineBelow = this.primaryCursor.lineNumber + 1;
        const totalLines = window.editor.getModel().getLineCount();

        if (lineBelow > totalLines) {
            this.showToast('Cannot add cursor below last line', 'warning');
            return false;
        }

        return this.addCursorAtPosition(lineBelow, this.primaryCursor.column);
    }

    addCursorsToLineEnds() {
        if (!window.editor) {
            this.showToast('Editor not ready', 'error');
            return false;
        }

        const model = window.editor.getModel();
        if (!model) {
            this.showToast('No active document', 'error');
            return false;
        }

        const totalLines = model.getLineCount();
        if (totalLines >= this.maxCursors) {
            this.showToast(`Cannot add ${totalLines} cursors (max ${this.maxCursors})`, 'warning');
            return false;
        }

        const selections = [];
        for (let line = 1; line <= totalLines; line++) {
            const lineContent = model.getLineContent(line);
            const lineLength = lineContent.length;

            selections.push({
                selectionStartLineNumber: line,
                selectionStartColumn: lineLength + 1,
                positionLineNumber: line,
                positionColumn: lineLength + 1
            });
        }

        window.editor.setSelections(selections);
        this.updateCursorTracking();

        this.showToast(`Added ${totalLines} cursors at line ends`, 'success');
        return true;
    }

    addCursorsToPattern(pattern) {
        if (!window.editor || !pattern) {
            this.showToast('Editor not ready or no pattern provided', 'error');
            return false;
        }

        const model = window.editor.getModel();
        if (!model) {
            this.showToast('No active document', 'error');
            return false;
        }

        try {

            const matches = [];
            const totalLines = model.getLineCount();

            for (let line = 1; line <= totalLines; line++) {
                const lineContent = model.getLineContent(line);
                const regex = new RegExp(pattern, 'g');
                let match;

                while ((match = regex.exec(lineContent)) !== null) {
                    matches.push({
                        lineNumber: line,
                        column: match.index + 1
                    });

                    if (matches.length >= this.maxCursors) {
                        break;
                    }
                }

                if (matches.length >= this.maxCursors) {
                    break;
                }
            }

            if (matches.length === 0) {
                this.showToast(`No matches found for pattern: ${pattern}`, 'info');
                return false;
            }

            const selections = matches.map(match => ({
                selectionStartLineNumber: match.lineNumber,
                selectionStartColumn: match.column,
                positionLineNumber: match.lineNumber,
                positionColumn: match.column
            }));

            window.editor.setSelections(selections);
            this.updateCursorTracking();

            this.showToast(`Added ${matches.length} cursors matching pattern: ${pattern}`, 'success');
            return true;

        } catch (error) {
            this.showToast(`Invalid pattern: ${error.message}`, 'error');
            return false;
        }
    }

    clearExtraCursors() {
        if (!window.editor) {
            this.showToast('Editor not ready', 'error');
            return false;
        }


        if (this.primaryCursor) {
            window.editor.setPosition({
                lineNumber: this.primaryCursor.lineNumber,
                column: this.primaryCursor.column
            });
        }

        this.cursorPositions = [this.primaryCursor];
        this.showToast('Cleared extra cursors', 'success');
        return true;
    }

    toggleCursorMode(mode) {
        if (!mode || !['normal', 'column', 'pattern'].includes(mode)) {
            this.showToast('Invalid cursor mode', 'error');
            return false;
        }

        this.cursorMode = mode;
        this.showToast(`Cursor mode set to: ${mode}`, 'success');
        return true;
    }

    getCursorCount() {
        return this.cursorPositions ? this.cursorPositions.length : 0;
    }


    alignCursors() {
        if (!window.editor || this.cursorPositions.length <= 1) {
            this.showToast('Need at least 2 cursors to align', 'info');
            return false;
        }


        const maxColumn = Math.max(...this.cursorPositions.map(c => c.column));


        const selections = this.cursorPositions.map(cursor => ({
            selectionStartLineNumber: cursor.lineNumber,
            selectionStartColumn: maxColumn,
            positionLineNumber: cursor.lineNumber,
            positionColumn: maxColumn
        }));

        window.editor.setSelections(selections);
        this.updateCursorTracking();

        this.showToast(`Aligned ${this.cursorPositions.length} cursors`, 'success');
        return true;
    }

    distributeCursorsEvenly() {
        if (!window.editor) {
            this.showToast('Editor not ready', 'error');
            return false;
        }

        const model = window.editor.getModel();
        if (!model) {
            this.showToast('No active document', 'error');
            return false;
        }

        const totalLines = model.getLineCount();
        if (totalLines < 2) {
            this.showToast('Document needs at least 2 lines', 'info');
            return false;
        }


        const cursorCount = Math.min(this.maxCursors, totalLines);
        const step = Math.floor(totalLines / cursorCount);

        const selections = [];
        for (let i = 0; i < cursorCount; i++) {
            const lineNumber = (i * step) + 1;
            selections.push({
                selectionStartLineNumber: lineNumber,
                selectionStartColumn: 1,
                positionLineNumber: lineNumber,
                positionColumn: 1
            });
        }

        window.editor.setSelections(selections);
        this.updateCursorTracking();

        this.showToast(`Distributed ${cursorCount} cursors evenly`, 'success');
        return true;
    }


    showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}


window.enhancedMultiCursor = new EnhancedMultiCursor();


window.addCursorAtPosition = (line, column) => window.enhancedMultiCursor.addCursorAtPosition(line, column);
window.addCursorAbove = () => window.enhancedMultiCursor.addCursorAbove();
window.addCursorBelow = () => window.enhancedMultiCursor.addCursorBelow();
window.addCursorsToLineEnds = () => window.enhancedMultiCursor.addCursorsToLineEnds();
window.addCursorsToPattern = (pattern) => window.enhancedMultiCursor.addCursorsToPattern(pattern);
window.clearExtraCursors = () => window.enhancedMultiCursor.clearExtraCursors();
window.toggleCursorMode = (mode) => window.enhancedMultiCursor.toggleCursorMode(mode);
window.getCursorCount = () => window.enhancedMultiCursor.getCursorCount();
window.alignCursors = () => window.enhancedMultiCursor.alignCursors();
window.distributeCursorsEvenly = () => window.enhancedMultiCursor.distributeCursorsEvenly();

