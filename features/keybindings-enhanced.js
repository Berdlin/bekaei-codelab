


class EnhancedKeybindings {
    constructor() {
        this.defaultKeybindings = {
            'formatDocument': { keys: 'Ctrl+Shift+F', command: 'formatDocument' },
            'lintDocument': { keys: 'Ctrl+Shift+L', command: 'lintDocument' },
            'toggleBreakpoint': { keys: 'F9', command: 'toggleBreakpoint' },
            'startDebugging': { keys: 'F5', command: 'startDebugging' },
            'showSnippetPalette': { keys: 'Ctrl+Shift+P', command: 'showSnippetPalette' },
            'expandEmmet': { keys: 'Tab', command: 'expandEmmet' },
            'addCursorAbove': { keys: 'Ctrl+Alt+Up', command: 'addCursorAbove' },
            'addCursorBelow': { keys: 'Ctrl+Alt+Down', command: 'addCursorBelow' },
            'toggleLinting': { keys: 'Ctrl+Alt+L', command: 'toggleLinting' },
            'toggleFormatOnSave': { keys: 'Ctrl+Alt+Shift+F', command: 'toggleFormatOnSave' }
        };

        this.customKeybindings = {};
        this.isKeybindingMode = false;
        this.waitingForKey = null;

        this.init();
    }

    init() {

        this.loadKeybindings();


        this.setupEventListeners();


        this.applyKeybindings();
    }

    setupEventListeners() {

        window.getKeybindings = () => this.getKeybindings();
        window.setKeybinding = (command, keys) => this.setKeybinding(command, keys);
        window.resetKeybinding = (command) => this.resetKeybinding(command);
        window.resetAllKeybindings = () => this.resetAllKeybindings();
        window.startKeybindingCapture = (command) => this.startKeybindingCapture(command);
        window.cancelKeybindingCapture = () => this.cancelKeybindingCapture();
        window.exportKeybindings = () => this.exportKeybindings();
        window.importKeybindings = (keybindings) => this.importKeybindings(keybindings);
    }

    loadKeybindings() {

        const savedKeybindings = localStorage.getItem('customKeybindings');
        if (savedKeybindings) {
            try {
                this.customKeybindings = JSON.parse(savedKeybindings);
            } catch (error) {
                console.error('Error loading keybindings:', error);
            }
        }
    }

    saveKeybindings() {

        try {
            localStorage.setItem('customKeybindings', JSON.stringify(this.customKeybindings));
        } catch (error) {
            console.error('Error saving keybindings:', error);
        }
    }

    applyKeybindings() {

        this.removeAllKeybindings();


        this.applyDefaultKeybindings();


        this.applyCustomKeybindings();
    }

    removeAllKeybindings() {
        if (!window.editor) return;


        const commands = window.editor.getSupportedActions();


        commands.forEach(command => {
            if (command.id && this.isOurCommand(command.id)) {
                window.editor.removeAction(command.id);
            }
        });
    }

    isOurCommand(commandId) {

        const ourCommands = [
            'formatDocument', 'lintDocument', 'toggleBreakpoint', 'startDebugging',
            'showSnippetPalette', 'expandEmmet', 'addCursorAbove', 'addCursorBelow',
            'toggleLinting', 'toggleFormatOnSave'
        ];

        return ourCommands.includes(commandId);
    }

    applyDefaultKeybindings() {
        if (!window.editor) return;

        Object.keys(this.defaultKeybindings).forEach(command => {
            const binding = this.defaultKeybindings[command];


            if (!this.customKeybindings[command]) {
                this.addKeybinding(command, binding.keys, binding.command);
            }
        });
    }

    applyCustomKeybindings() {
        if (!window.editor) return;

        Object.keys(this.customKeybindings).forEach(command => {
            const binding = this.customKeybindings[command];
            this.addKeybinding(command, binding.keys, binding.command);
        });
    }

    addKeybinding(command, keys, handler) {
        if (!window.editor || !command || !keys) return;

        try {

            const keyParts = keys.split('+');
            let keyCode, modifiers = 0;

            keyParts.forEach(part => {
                const upperPart = part.toUpperCase();

                if (upperPart === 'CTRL') {
                    modifiers |= monaco.KeyMod.CtrlCmd;
                } else if (upperPart === 'SHIFT') {
                    modifiers |= monaco.KeyMod.Shift;
                } else if (upperPart === 'ALT') {
                    modifiers |= monaco.KeyMod.Alt;
                } else if (upperPart === 'META' || upperPart === 'CMD') {
                    modifiers |= monaco.KeyMod.WinCtrl;
                } else {

                    const keyCodeValue = this.getKeyCodeFromString(part);
                    if (keyCodeValue !== null) {
                        keyCode = keyCodeValue;
                    }
                }
            });

            if (keyCode === null) {
                console.error('Invalid key in keybinding:', keys);
                return;
            }


            window.editor.removeAction(command);


            window.editor.addCommand(modifiers | keyCode, () => {
                if (window[handler]) {
                    window[handler]();
                } else {
                    console.warn('Handler not found for command:', handler);
                }
            });


            this.currentKeybindings = this.currentKeybindings || {};
            this.currentKeybindings[command] = { keys, command, modifiers, keyCode };

        } catch (error) {
            console.error('Error adding keybinding:', error);
        }
    }

    getKeyCodeFromString(keyStr) {
        if (!keyStr) return null;

        const keyMap = {

            'a': monaco.KeyCode.KEY_A, 'b': monaco.KeyCode.KEY_B, 'c': monaco.KeyCode.KEY_C,
            'd': monaco.KeyCode.KEY_D, 'e': monaco.KeyCode.KEY_E, 'f': monaco.KeyCode.KEY_F,
            'g': monaco.KeyCode.KEY_G, 'h': monaco.KeyCode.KEY_H, 'i': monaco.KeyCode.KEY_I,
            'j': monaco.KeyCode.KEY_J, 'k': monaco.KeyCode.KEY_K, 'l': monaco.KeyCode.KEY_L,
            'm': monaco.KeyCode.KEY_M, 'n': monaco.KeyCode.KEY_N, 'o': monaco.KeyCode.KEY_O,
            'p': monaco.KeyCode.KEY_P, 'q': monaco.KeyCode.KEY_Q, 'r': monaco.KeyCode.KEY_R,
            's': monaco.KeyCode.KEY_S, 't': monaco.KeyCode.KEY_T, 'u': monaco.KeyCode.KEY_U,
            'v': monaco.KeyCode.KEY_V, 'w': monaco.KeyCode.KEY_W, 'x': monaco.KeyCode.KEY_X,
            'y': monaco.KeyCode.KEY_Y, 'z': monaco.KeyCode.KEY_Z,


            '0': monaco.KeyCode.KEY_0, '1': monaco.KeyCode.KEY_1, '2': monaco.KeyCode.KEY_2,
            '3': monaco.KeyCode.KEY_3, '4': monaco.KeyCode.KEY_4, '5': monaco.KeyCode.KEY_5,
            '6': monaco.KeyCode.KEY_6, '7': monaco.KeyCode.KEY_7, '8': monaco.KeyCode.KEY_8,
            '9': monaco.KeyCode.KEY_9,


            'f1': monaco.KeyCode.F1, 'f2': monaco.KeyCode.F2, 'f3': monaco.KeyCode.F3,
            'f4': monaco.KeyCode.F4, 'f5': monaco.KeyCode.F5, 'f6': monaco.KeyCode.F6,
            'f7': monaco.KeyCode.F7, 'f8': monaco.KeyCode.F8, 'f9': monaco.KeyCode.F9,
            'f10': monaco.KeyCode.F10, 'f11': monaco.KeyCode.F11, 'f12': monaco.KeyCode.F12,


            'enter': monaco.KeyCode.Enter, 'escape': monaco.KeyCode.Escape,
            'space': monaco.KeyCode.Space, 'tab': monaco.KeyCode.Tab,
            'backspace': monaco.KeyCode.Backspace, 'delete': monaco.KeyCode.Delete,
            'up': monaco.KeyCode.UpArrow, 'down': monaco.KeyCode.DownArrow,
            'left': monaco.KeyCode.LeftArrow, 'right': monaco.KeyCode.RightArrow,
            'home': monaco.KeyCode.Home, 'end': monaco.KeyCode.End,
            'pageup': monaco.KeyCode.PageUp, 'pagedown': monaco.KeyCode.PageDown
        };

        const upperKeyStr = keyStr.toUpperCase();
        return keyMap[upperKeyStr] || null;
    }

    getKeybindings() {

        const allKeybindings = { ...this.defaultKeybindings, ...this.customKeybindings };


        return {
            default: this.defaultKeybindings,
            custom: this.customKeybindings,
            active: this.currentKeybindings || {},
            all: allKeybindings
        };
    }

    setKeybinding(command, keys) {
        if (!command || !keys) {
            this.showToast('Command and keys are required', 'error');
            return false;
        }


        if (!this.isValidKeyCombination(keys)) {
            this.showToast('Invalid key combination format', 'error');
            return false;
        }


        if (this.isKeyCombinationUsed(keys, command)) {
            this.showToast('Key combination already in use', 'warning');

        }


        this.customKeybindings[command] = {
            keys: keys,
            command: command
        };


        this.saveKeybindings();
        this.applyKeybindings();

        this.showToast(`Set keybinding: ${command} → ${keys}`, 'success');
        return true;
    }

    isValidKeyCombination(keys) {
        if (!keys || typeof keys !== 'string') return false;


        if (keys.trim() === '') return false;


        const parts = keys.split('+');
        if (parts.length === 0) return false;


        let hasValidKey = false;
        parts.forEach(part => {
            const key = part.trim().toUpperCase();
            if (key === 'CTRL' || key === 'SHIFT' || key === 'ALT' || key === 'META' || key === 'CMD') {

            } else {

                hasValidKey = true;
            }
        });

        return hasValidKey;
    }

    isKeyCombinationUsed(keys, excludeCommand) {
        const allKeybindings = { ...this.defaultKeybindings, ...this.customKeybindings };

        for (const command in allKeybindings) {
            if (command === excludeCommand) continue;

            if (allKeybindings[command].keys.toUpperCase() === keys.toUpperCase()) {
                return true;
            }
        }

        return false;
    }

    resetKeybinding(command) {
        if (!command) {
            this.showToast('Command is required', 'error');
            return false;
        }


        delete this.customKeybindings[command];


        this.saveKeybindings();
        this.applyKeybindings();

        this.showToast(`Reset keybinding for: ${command}`, 'success');
        return true;
    }

    resetAllKeybindings() {
        this.customKeybindings = {};
        this.saveKeybindings();
        this.applyKeybindings();

        this.showToast('All keybindings reset to defaults', 'success');
        return true;
    }

    startKeybindingCapture(command) {
        if (!command) {
            this.showToast('Command is required', 'error');
            return false;
        }

        if (this.isKeybindingMode) {
            this.showToast('Already in keybinding capture mode', 'warning');
            return false;
        }

        this.isKeybindingMode = true;
        this.waitingForKey = command;

        this.showToast(`Press key combination for ${command}...`, 'info');


        this.setupKeyCapture();

        return true;
    }

    setupKeyCapture() {

        if (this.keyCaptureListener) {
            document.removeEventListener('keydown', this.keyCaptureListener);
        }


        this.keyCaptureListener = (e) => {

            e.preventDefault();
            e.stopPropagation();


            const keys = this.getKeyCombinationFromEvent(e);
            this.completeKeybindingCapture(keys);


            document.removeEventListener('keydown', this.keyCaptureListener);
            this.keyCaptureListener = null;
        };

        document.addEventListener('keydown', this.keyCaptureListener, { capture: true });
    }

    getKeyCombinationFromEvent(e) {
        const parts = [];

        if (e.ctrlKey) parts.push('Ctrl');
        if (e.shiftKey) parts.push('Shift');
        if (e.altKey) parts.push('Alt');
        if (e.metaKey) parts.push('Meta');


        let keyName = this.getKeyNameFromEvent(e);
        if (keyName) {
            parts.push(keyName);
        }

        return parts.join('+');
    }

    getKeyNameFromEvent(e) {

        if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') {
            return null;
        }


        if (e.key.startsWith('F') && e.key.length === 2) {
            return e.key;
        }


        if (e.key === 'ArrowUp') return 'Up';
        if (e.key === 'ArrowDown') return 'Down';
        if (e.key === 'ArrowLeft') return 'Left';
        if (e.key === 'ArrowRight') return 'Right';


        if (e.key === 'Enter') return 'Enter';
        if (e.key === 'Escape') return 'Escape';
        if (e.key === 'Space') return 'Space';
        if (e.key === 'Tab') return 'Tab';
        if (e.key === 'Backspace') return 'Backspace';
        if (e.key === 'Delete') return 'Delete';


        if (e.key.length === 1) {
            return e.key.toUpperCase();
        }

        return e.key;
    }

    completeKeybindingCapture(keys) {
        if (!this.isKeybindingMode || !this.waitingForKey) {
            return;
        }


        if (!this.isValidKeyCombination(keys)) {
            this.showToast('Invalid key combination', 'error');
            this.cancelKeybindingCapture();
            return;
        }


        this.setKeybinding(this.waitingForKey, keys);


        this.cancelKeybindingCapture();
    }

    cancelKeybindingCapture() {
        this.isKeybindingMode = false;
        this.waitingForKey = null;


        if (this.keyCaptureListener) {
            document.removeEventListener('keydown', this.keyCaptureListener);
            this.keyCaptureListener = null;
        }
    }

    exportKeybindings() {

        return {
            default: this.defaultKeybindings,
            custom: this.customKeybindings,
            timestamp: new Date().toISOString()
        };
    }

    importKeybindings(keybindings) {
        if (!keybindings || !keybindings.custom) {
            this.showToast('Invalid keybindings data', 'error');
            return false;
        }


        this.customKeybindings = { ...this.customKeybindings, ...keybindings.custom };


        this.saveKeybindings();
        this.applyKeybindings();

        this.showToast('Keybindings imported successfully', 'success');
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


window.enhancedKeybindings = new EnhancedKeybindings();


window.getKeybindings = () => window.enhancedKeybindings.getKeybindings();
window.setKeybinding = (command, keys) => window.enhancedKeybindings.setKeybinding(command, keys);
window.resetKeybinding = (command) => window.enhancedKeybindings.resetKeybinding(command);
window.resetAllKeybindings = () => window.enhancedKeybindings.resetAllKeybindings();
window.startKeybindingCapture = (command) => window.enhancedKeybindings.startKeybindingCapture(command);
window.cancelKeybindingCapture = () => window.enhancedKeybindings.cancelKeybindingCapture();
window.exportKeybindings = () => window.enhancedKeybindings.exportKeybindings();
window.importKeybindings = (keybindings) => window.enhancedKeybindings.importKeybindings(keybindings);

