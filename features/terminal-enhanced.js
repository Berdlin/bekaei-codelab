


class EnhancedTerminal {
    constructor() {
        this.commands = new Map();
        this.history = [];
        this.currentDirectory = '/';
        this.environment = {};
        this.init();
    }

    async init() {
        this.setupCommands();
        this.setupTerminalUI();
        this.setupKeyboardShortcuts();
        this.loadEnvironment();
    }


    setupCommands() {

        this.commands.set('ls', {
            description: 'List files and directories',
            execute: (args) => this.listDirectory(args),
            usage: 'ls [path]'
        });

        this.commands.set('cd', {
            description: 'Change directory',
            execute: (args) => this.changeDirectory(args),
            usage: 'cd [path]'
        });

        this.commands.set('pwd', {
            description: 'Print working directory',
            execute: () => this.printWorkingDirectory(),
            usage: 'pwd'
        });

        this.commands.set('cat', {
            description: 'Display file contents',
            execute: (args) => this.displayFile(args),
            usage: 'cat <filename>'
        });

        this.commands.set('echo', {
            description: 'Display text',
            execute: (args) => this.echoText(args),
            usage: 'echo <text>'
        });

        this.commands.set('clear', {
            description: 'Clear terminal',
            execute: () => this.clearTerminal(),
            usage: 'clear'
        });

        this.commands.set('help', {
            description: 'Show available commands',
            execute: () => this.showHelp(),
            usage: 'help [command]'
        });


        this.commands.set('git', {
            description: 'Git version control',
            execute: (args) => this.executeGitCommand(args),
            usage: 'git <command>'
        });


        this.commands.set('mkdir', {
            description: 'Create directory',
            execute: (args) => this.createDirectory(args),
            usage: 'mkdir <dirname>'
        });

        this.commands.set('touch', {
            description: 'Create file',
            execute: (args) => this.createFile(args),
            usage: 'touch <filename>'
        });

        this.commands.set('rm', {
            description: 'Remove file or directory',
            execute: (args) => this.removeFile(args),
            usage: 'rm <filename>'
        });

        this.commands.set('cp', {
            description: 'Copy file',
            execute: (args) => this.copyFile(args),
            usage: 'cp <source> <destination>'
        });

        this.commands.set('mv', {
            description: 'Move file',
            execute: (args) => this.moveFile(args),
            usage: 'mv <source> <destination>'
        });


        this.commands.set('run', {
            description: 'Execute current file',
            execute: () => this.runCurrentFile(),
            usage: 'run'
        });

        this.commands.set('format', {
            description: 'Format current file',
            execute: () => this.formatCurrentFile(),
            usage: 'format'
        });

        this.commands.set('lint', {
            description: 'Lint current file',
            execute: () => this.lintCurrentFile(),
            usage: 'lint'
        });
    }


    setupTerminalUI() {
        const terminal = document.getElementById('terminal-output');
        if (!terminal) return;


        const inputLine = document.createElement('div');
        inputLine.className = 'terminal-input-line';
        inputLine.innerHTML = `
            <span class="terminal-prompt">${this.getPrompt()}</span>
            <input type="text" id="terminal-input-enhanced" class="terminal-input" placeholder="Type command..." onkeypress="window.enhancedTerminal.handleKeyPress(event)">
        `;

        terminal.appendChild(inputLine);


        this.setupTerminalStyling();
    }

    setupTerminalStyling() {
        const style = document.createElement('style');
        style.textContent = `
            .terminal-output {
                background: #0d1117;
                color: #c9d1d9;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.4;
                padding: 10px;
                height: 100%;
                overflow-y: auto;
            }
            
            .terminal-input-line {
                display: flex;
                align-items: center;
                margin-top: 10px;
            }
            
            .terminal-prompt {
                color: #79c0ff;
                margin-right: 10px;
                user-select: none;
            }
            
            .terminal-input {
                flex: 1;
                background: transparent;
                border: none;
                color: #c9d1d9;
                outline: none;
                font-family: inherit;
                font-size: 14px;
            }
            
            .terminal-output-line {
                margin: 2px 0;
            }
            
            .terminal-command {
                color: #79c0ff;
                font-weight: bold;
            }
            
            .terminal-result {
                color: #c9d1d9;
                margin-left: 20px;
            }
            
            .terminal-error {
                color: #f85149;
                margin-left: 20px;
            }
            
            .terminal-success {
                color: #2ea043;
                margin-left: 20px;
            }
            
            .terminal-warning {
                color: #d29922;
                margin-left: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {

            if ((e.ctrlKey || e.metaKey) && e.key === '`') {
                e.preventDefault();
                this.focusTerminal();
            }


            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (document.activeElement.classList.contains('terminal-input')) {
                    e.preventDefault();
                    this.clearTerminal();
                }
            }
        });
    }


    async executeCommand(command) {
        if (!command || !command.trim()) return;


        this.addToHistory(command);


        const parts = command.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);


        this.displayCommand(command);


        const commandObj = this.commands.get(cmd);
        if (commandObj) {
            try {
                const result = await commandObj.execute(args);
                this.displayResult(result);
            } catch (error) {
                this.displayError(error.message);
            }
        } else {
            this.displayError(`Command not found: ${cmd}`);
        }


        this.updatePrompt();
    }


    listDirectory(args) {
        const path = args[0] || this.currentDirectory;


        const files = window.localFiles || [];

        if (files.length === 0) {
            return 'No files found';
        }

        const fileList = files.map(file => {
            const size = file.content ? file.content.length : 0;
            const date = new Date().toLocaleString();
            return `${file.name.padEnd(20)} ${size.toString().padStart(8)} ${date}`;
        }).join('\n');

        return `Directory: ${path}\n\n${fileList}`;
    }

    changeDirectory(args) {
        const path = args[0];
        if (!path) {
            this.currentDirectory = '/';
            return 'Changed to root directory';
        }


        this.currentDirectory = path;
        return `Changed to: ${path}`;
    }

    printWorkingDirectory() {
        return this.currentDirectory;
    }

    displayFile(args) {
        const filename = args[0];
        if (!filename) {
            return 'Usage: cat <filename>';
        }

        const file = window.localFiles?.find(f => f.name === filename);
        if (!file) {
            return `File not found: ${filename}`;
        }

        return file.content || '(empty file)';
    }

    echoText(args) {
        return args.join(' ');
    }

    clearTerminal() {
        const terminal = document.getElementById('terminal-output');
        if (terminal) {

            const inputLine = terminal.querySelector('.terminal-input-line');
            terminal.innerHTML = '';
            if (inputLine) {
                terminal.appendChild(inputLine);
            }
        }
        return '';
    }

    showHelp(args) {
        if (args.length > 0) {
            const cmd = this.commands.get(args[0]);
            if (cmd) {
                return `Command: ${args[0]}\nDescription: ${cmd.description}\nUsage: ${cmd.usage}`;
            } else {
                return `Command not found: ${args[0]}`;
            }
        }

        const helpText = Array.from(this.commands.entries()).map(([name, cmd]) => {
            return `${name.padEnd(12)} ${cmd.description}`;
        }).join('\n');

        return `Available commands:\n\n${helpText}\n\nUse 'help <command>' for more information.`;
    }

    async executeGitCommand(args) {
        if (args.length === 0) {
            return 'Usage: git <command>';
        }

        const subcommand = args[0];
        const subargs = args.slice(1);

        switch (subcommand) {
            case 'status':
                return await this.gitStatus();
            case 'add':
                return await this.gitAdd(subargs);
            case 'commit':
                return await this.gitCommit(subargs);
            case 'push':
                return await this.gitPush();
            case 'pull':
                return await this.gitPull();
            case 'log':
                return await this.gitLog();
            default:
                return `Unknown git command: ${subcommand}`;
        }
    }

    async gitStatus() {

        const files = window.localFiles || [];
        const untracked = files.filter(f => !f.tracked).length;
        const modified = files.filter(f => f.modified).length;

        return `On branch main\n\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n\n\t${untracked} untracked files\n\n${modified} modified files`;
    }

    async gitAdd(args) {
        if (args.length === 0) {
            return 'Usage: git add <file>';
        }
        return `Added ${args.join(', ')} to staging area`;
    }

    async gitCommit(args) {
        const message = args.join(' ');
        if (!message) {
            return 'Usage: git commit -m "message"';
        }
        return `Committed: ${message}`;
    }

    async gitPush() {
        return 'Pushed to origin/main';
    }

    async gitPull() {
        return 'Pulled from origin/main';
    }

    async gitLog() {
        return `commit abc1234567890\nAuthor: User <user@example.com>\nDate:   ${new Date().toLocaleString()}\n\n    Initial commit\n\ncommit def9876543210\nAuthor: User <user@example.com>\nDate:   ${new Date(Date.now() - 86400000).toLocaleString()}\n\n    Previous commit`;
    }

    createDirectory(args) {
        if (args.length === 0) {
            return 'Usage: mkdir <dirname>';
        }
        return `Created directory: ${args[0]}`;
    }

    createFile(args) {
        if (args.length === 0) {
            return 'Usage: touch <filename>';
        }
        return `Created file: ${args[0]}`;
    }

    removeFile(args) {
        if (args.length === 0) {
            return 'Usage: rm <filename>';
        }
        return `Removed: ${args[0]}`;
    }

    copyFile(args) {
        if (args.length < 2) {
            return 'Usage: cp <source> <destination>';
        }
        return `Copied ${args[0]} to ${args[1]}`;
    }

    moveFile(args) {
        if (args.length < 2) {
            return 'Usage: mv <source> <destination>';
        }
        return `Moved ${args[0]} to ${args[1]}`;
    }

    runCurrentFile() {
        if (!window.activeFileId) {
            return 'No file selected';
        }

        const file = window.localFiles?.find(f => f.id === window.activeFileId);
        if (!file) {
            return 'File not found';
        }


        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'js') {
            return this.executeJavaScript(file.content);
        } else if (ext === 'py') {
            return this.executePython(file.content);
        } else {
            return `Execution not supported for .${ext} files`;
        }
    }

    executeJavaScript(code) {
        try {
            const logs = [];
            const sandboxConsole = {
                log: (...args) => logs.push(args.join(' ')),
                error: (...args) => logs.push('ERROR: ' + args.join(' ')),
                warn: (...args) => logs.push('WARN: ' + args.join(' '))
            };

            const fn = new Function('console', code);
            fn(sandboxConsole);

            return logs.join('\n');
        } catch (error) {
            return `JavaScript Error: ${error.message}`;
        }
    }

    executePython(code) {
        return 'Python execution requires server-side processing';
    }

    formatCurrentFile() {
        if (!window.activeFileId || !window.editor) {
            return 'No file selected';
        }

        const file = window.localFiles?.find(f => f.id === window.activeFileId);
        if (!file) {
            return 'File not found';
        }


        const ext = file.name.split('.').pop().toLowerCase();
        let formatted = file.content;

        if (ext === 'js' || ext === 'ts') {
            formatted = this.formatJavaScript(file.content);
        } else if (ext === 'html') {
            formatted = this.formatHTML(file.content);
        } else if (ext === 'css') {
            formatted = this.formatCSS(file.content);
        }


        file.content = formatted;


        if (window.editor && window.activeFileId === file.id) {
            window.editor.setValue(formatted);
        }

        return 'File formatted successfully';
    }

    formatJavaScript(code) {

        return code
            .replace(/;/g, ';\n')
            .replace(/{/g, '{\n')
            .replace(/}/g, '\n}')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }

    formatHTML(code) {

        return code
            .replace(/>/g, '>\n')
            .replace(/</g, '\n<')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }

    formatCSS(code) {

        return code
            .replace(/{/g, '{\n')
            .replace(/}/g, '\n}\n')
            .replace(/;/g, ';\n')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }

    lintCurrentFile() {
        if (!window.activeFileId) {
            return 'No file selected';
        }

        const file = window.localFiles?.find(f => f.id === window.activeFileId);
        if (!file) {
            return 'File not found';
        }

        const ext = file.name.split('.').pop().toLowerCase();
        let issues = [];

        if (ext === 'js' || ext === 'ts') {
            issues = this.lintJavaScript(file.content);
        } else if (ext === 'html') {
            issues = this.lintHTML(file.content);
        } else if (ext === 'css') {
            issues = this.lintCSS(file.content);
        }

        if (issues.length === 0) {
            return 'No linting issues found';
        }

        return issues.join('\n');
    }

    lintJavaScript(code) {
        const issues = [];
        const lines = code.split('\n');

        lines.forEach((line, index) => {
            const lineNumber = index + 1;


            if (line.trim() && !line.trim().endsWith(';') && !line.includes('{') && !line.includes('}') && !line.includes('//')) {
                issues.push(`Line ${lineNumber}: Missing semicolon`);
            }


            if (line.includes('console.log')) {
                issues.push(`Line ${lineNumber}: Console.log found (remove before production)`);
            }


            if (line.includes('var ') && !line.includes('=')) {
                issues.push(`Line ${lineNumber}: Possible unused variable`);
            }
        });

        return issues;
    }

    lintHTML(code) {
        const issues = [];


        if ((code.match(/<[^/].*?>/g) || []).length !== (code.match(/<\/.*?>/g) || []).length) {
            issues.push('Unclosed HTML tags detected');
        }


        if (!code.includes('<!DOCTYPE')) {
            issues.push('Missing DOCTYPE declaration');
        }

        return issues;
    }

    lintCSS(code) {
        const issues = [];
        const lines = code.split('\n');

        lines.forEach((line, index) => {
            const lineNumber = index + 1;


            if (line.includes(':') && !line.endsWith(';') && !line.includes('{') && !line.includes('}')) {
                issues.push(`Line ${lineNumber}: Missing semicolon`);
            }


            if (line.includes('transform') && !line.includes('-webkit-')) {
                issues.push(`Line ${lineNumber}: Consider adding -webkit- prefix for transform`);
            }
        });

        return issues;
    }


    displayCommand(command) {
        const terminal = document.getElementById('terminal-output');
        if (!terminal) return;

        const commandDiv = document.createElement('div');
        commandDiv.className = 'terminal-output-line';
        commandDiv.innerHTML = `<span class="terminal-command">${this.getPrompt()} ${command}</span>`;
        terminal.appendChild(commandDiv);
    }

    displayResult(result) {
        if (!result || result.trim() === '') return;

        const terminal = document.getElementById('terminal-output');
        if (!terminal) return;

        const resultDiv = document.createElement('div');
        resultDiv.className = 'terminal-output-line terminal-result';
        resultDiv.textContent = result;
        terminal.appendChild(resultDiv);
    }

    displayError(error) {
        const terminal = document.getElementById('terminal-output');
        if (!terminal) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'terminal-output-line terminal-error';
        errorDiv.textContent = `Error: ${error}`;
        terminal.appendChild(errorDiv);
    }

    displaySuccess(message) {
        const terminal = document.getElementById('terminal-output');
        if (!terminal) return;

        const successDiv = document.createElement('div');
        successDiv.className = 'terminal-output-line terminal-success';
        successDiv.textContent = message;
        terminal.appendChild(successDiv);
    }

    displayWarning(message) {
        const terminal = document.getElementById('terminal-output');
        if (!terminal) return;

        const warningDiv = document.createElement('div');
        warningDiv.className = 'terminal-output-line terminal-warning';
        warningDiv.textContent = message;
        terminal.appendChild(warningDiv);
    }

    getPrompt() {
        return `${this.currentDirectory} $`;
    }

    updatePrompt() {
        const prompt = document.querySelector('.terminal-prompt');
        if (prompt) {
            prompt.textContent = this.getPrompt();
        }
    }

    addToHistory(command) {
        this.history.push(command);
        if (this.history.length > 100) {
            this.history = this.history.slice(-50);
        }
    }

    handleKeyPress(event) {
        if (event.key === 'Enter') {
            const input = event.target;
            const command = input.value;
            input.value = '';

            window.enhancedTerminal.executeCommand(command);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            window.enhancedTerminal.navigateHistory(-1);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            window.enhancedTerminal.navigateHistory(1);
        }
    }

    navigateHistory(direction) {
        const input = document.getElementById('terminal-input-enhanced');
        if (!input) return;

        if (!this.historyIndex) {
            this.historyIndex = this.history.length - 1;
        } else {
            this.historyIndex += direction;
            if (this.historyIndex < 0) this.historyIndex = 0;
            if (this.historyIndex >= this.history.length) this.historyIndex = this.history.length - 1;
        }

        input.value = this.history[this.historyIndex] || '';
    }

    focusTerminal() {
        const input = document.getElementById('terminal-input-enhanced');
        if (input) {
            input.focus();
        }
    }

    loadEnvironment() {

        this.environment = {
            PATH: '/usr/bin:/bin',
            HOME: '/home/user',
            USER: 'user',
            SHELL: '/bin/bash'
        };
    }
}


window.enhancedTerminal = new EnhancedTerminal();


window.executeCommand = (command) => window.enhancedTerminal.executeCommand(command);
window.focusTerminal = () => window.enhancedTerminal.focusTerminal();
window.clearTerminal = () => window.enhancedTerminal.clearTerminal();
window.showHelp = () => window.enhancedTerminal.showHelp();

