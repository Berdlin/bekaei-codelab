


class EnhancedFileSearch {
    constructor() {
        this.searchHistory = [];
        this.recentSearches = [];
        this.init();
    }

    async init() {
        this.loadSearchHistory();
        this.setupSearchPanel();
        this.setupSearchCommands();
    }


    loadSearchHistory() {
        const saved = localStorage.getItem('bekaei-search-history');
        if (saved) {
            try {
                this.searchHistory = JSON.parse(saved);
            } catch (error) {
                console.error('Error loading search history:', error);
                this.searchHistory = [];
            }
        }
    }

    saveSearchHistory() {
        localStorage.setItem('bekaei-search-history', JSON.stringify(this.searchHistory));
    }

    addToSearchHistory(searchTerm, options) {
        const entry = {
            term: searchTerm,
            options: options,
            timestamp: Date.now(),
            id: Date.now() + Math.random().toString(36).substr(2, 9)
        };


        this.searchHistory = this.searchHistory.filter(item => item.term !== searchTerm);


        this.searchHistory.unshift(entry);


        if (this.searchHistory.length > 50) {
            this.searchHistory = this.searchHistory.slice(0, 50);
        }

        this.saveSearchHistory();
        this.updateSearchHistoryUI();
    }


    setupSearchPanel() {
        const panel = document.createElement('div');
        panel.className = 'search-panel';
        panel.innerHTML = `
            <div class="search-header">
                <h3>Search</h3>
                <div class="search-actions">
                    <button onclick="window.enhancedSearch.toggleAdvancedOptions()">Advanced</button>
                    <button onclick="window.enhancedSearch.clearSearch()">Clear</button>
                </div>
            </div>
            <div class="search-input-group">
                <div class="search-field">
                    <input type="text" id="search-input" placeholder="Search files..." onkeyup="window.enhancedSearch.handleSearchInput(event)">
                    <div class="search-options">
                        <label><input type="checkbox" id="search-regex"> Regex</label>
                        <label><input type="checkbox" id="search-case"> Case Sensitive</label>
                        <label><input type="checkbox" id="search-whole"> Whole Word</label>
                    </div>
                </div>
                <div class="search-field">
                    <input type="text" id="search-files" placeholder="File pattern (e.g., *.js, *.ts)" onkeyup="window.enhancedSearch.handleFilePatternInput(event)">
                    <div class="search-scope">
                        <label><input type="radio" name="search-scope" value="all" checked> All Files</label>
                        <label><input type="radio" name="search-scope" value="open"> Open Files</label>
                        <label><input type="radio" name="search-scope" value="folder"> Current Folder</label>
                    </div>
                </div>
            </div>
            <div class="search-results" id="search-results">
                <div class="search-stats" id="search-stats"></div>
                <div class="search-items" id="search-items"></div>
            </div>
            <div class="search-history" id="search-history">
                <h4>Recent Searches</h4>
                <div class="history-list" id="history-list"></div>
            </div>
        `;


        const sidebarPanel = document.getElementById('panel-explorer');
        if (sidebarPanel) {
            sidebarPanel.appendChild(panel);
        }
    }

    setupSearchCommands() {

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.focusSearchInput();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.openReplaceDialog();
            }
        });
    }


    async performSearch(searchTerm, options = {}) {
        if (!searchTerm.trim()) return;

        const startTime = Date.now();
        const results = [];


        const files = this.getFilesToSearch(options.scope);


        const useRegex = options.regex || document.getElementById('search-regex')?.checked;
        const caseSensitive = options.caseSensitive || document.getElementById('search-case')?.checked;
        const wholeWord = options.wholeWord || document.getElementById('search-whole')?.checked;
        const filePattern = options.filePattern || document.getElementById('search-files')?.value;


        let searchRegex;
        try {
            let flags = caseSensitive ? 'g' : 'gi';
            let pattern = searchTerm;

            if (useRegex) {
                pattern = searchTerm;
            } else {

                pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (wholeWord) {
                    pattern = '\\b' + pattern + '\\b';
                }
            }

            searchRegex = new RegExp(pattern, flags);
        } catch (error) {
            this.showError('Invalid regex pattern: ' + error.message);
            return;
        }


        const filteredFiles = this.filterFilesByPattern(files, filePattern);


        for (const file of filteredFiles) {
            const content = file.content || '';
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const matches = line.match(searchRegex);

                if (matches) {
                    results.push({
                        fileId: file.id,
                        fileName: file.name,
                        lineNumber: i + 1,
                        lineContent: line,
                        matches: matches.length,
                        matchPositions: this.getMatchPositions(line, searchRegex)
                    });
                }
            }
        }

        const duration = Date.now() - startTime;
        this.displaySearchResults(results, searchTerm, duration);
        this.addToSearchHistory(searchTerm, options);
    }

    getFilesToSearch(scope) {
        let files = window.localFiles || [];

        switch (scope) {
            case 'open':

                const openFileIds = (window.openTabs || []).map(tab => tab.id);
                files = files.filter(file => openFileIds.includes(file.id));
                break;
            case 'folder':

                break;
            default:

                break;
        }

        return files;
    }

    filterFilesByPattern(files, pattern) {
        if (!pattern || !pattern.trim()) return files;

        const regex = this.buildFilePatternRegex(pattern);
        return files.filter(file => regex.test(file.name));
    }

    buildFilePatternRegex(pattern) {

        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp('^' + escaped + '$', 'i');
    }

    getMatchPositions(line, regex) {
        const positions = [];
        let match;
        const re = new RegExp(regex.source, regex.flags);

        while ((match = re.exec(line)) !== null) {
            positions.push({
                start: match.index,
                end: match.index + match[0].length,
                text: match[0]
            });
        }

        return positions;
    }

    displaySearchResults(results, searchTerm, duration) {
        const statsEl = document.getElementById('search-stats');
        const itemsEl = document.getElementById('search-items');

        if (statsEl) {
            statsEl.innerHTML = `
                <span>Found ${results.length} results in ${duration}ms</span>
                <button onclick="window.enhancedSearch.replaceAll('${searchTerm}')">Replace All</button>
            `;
        }

        if (itemsEl) {
            if (results.length === 0) {
                itemsEl.innerHTML = '<div class="no-results">No results found</div>';
                return;
            }

            itemsEl.innerHTML = results.map(result => `
                <div class="search-result-item" onclick="window.enhancedSearch.navigateToResult('${result.fileId}', ${result.lineNumber})">
                    <div class="result-header">
                        <span class="file-name">${result.fileName}</span>
                        <span class="line-number">Line ${result.lineNumber}</span>
                        <span class="match-count">${result.matches} matches</span>
                    </div>
                    <div class="result-content">
                        ${this.highlightMatches(result.lineContent, result.matchPositions)}
                    </div>
                </div>
            `).join('');
        }
    }

    highlightMatches(lineContent, matchPositions) {
        if (!matchPositions || matchPositions.length === 0) {
            return lineContent;
        }

        let highlighted = '';
        let lastIndex = 0;

        matchPositions.forEach(match => {
            highlighted += lineContent.substring(lastIndex, match.start);
            highlighted += `<span class="search-highlight">${lineContent.substring(match.start, match.end)}</span>`;
            lastIndex = match.end;
        });

        highlighted += lineContent.substring(lastIndex);
        return highlighted;
    }

    navigateToResult(fileId, lineNumber) {

        if (window.switchFile) {
            window.switchFile(fileId);
        }


        if (window.editor) {
            const position = { lineNumber: lineNumber, column: 1 };
            window.editor.setPosition(position);
            window.editor.revealLine(lineNumber);
        }
    }


    async replaceAll(searchTerm, replaceTerm, options = {}) {
        if (!searchTerm || !replaceTerm) {
            this.showError('Please provide both search and replace terms');
            return;
        }

        const files = this.getFilesToSearch(options.scope);
        let totalReplacements = 0;

        for (const file of files) {
            const content = file.content || '';
            const useRegex = options.regex || document.getElementById('search-regex')?.checked;
            const caseSensitive = options.caseSensitive || document.getElementById('search-case')?.checked;
            const wholeWord = options.wholeWord || document.getElementById('search-whole')?.checked;

            let searchRegex;
            try {
                let flags = caseSensitive ? 'g' : 'gi';
                let pattern = searchTerm;

                if (useRegex) {
                    pattern = searchTerm;
                } else {
                    pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    if (wholeWord) {
                        pattern = '\\b' + pattern + '\\b';
                    }
                }

                searchRegex = new RegExp(pattern, flags);
            } catch (error) {
                this.showError('Invalid regex pattern: ' + error.message);
                return;
            }

            const newContent = content.replace(searchRegex, replaceTerm);
            const replacements = (content.match(searchRegex) || []).length;

            if (replacements > 0) {
                file.content = newContent;
                totalReplacements += replacements;


                if (window.editor && window.activeFileId === file.id) {
                    window.editor.setValue(newContent);
                }
            }
        }


        if (window.renderExplorer) {
            window.renderExplorer();
        }

        this.showSuccess(`Replaced ${totalReplacements} occurrences`);


        this.performSearch(searchTerm, options);
    }

    openReplaceDialog() {
        const searchTerm = document.getElementById('search-input')?.value || '';

        const modal = document.createElement('div');
        modal.className = 'replace-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Replace</h3>
                <div class="replace-form">
                    <div class="form-group">
                        <label>Find</label>
                        <input type="text" id="replace-find" value="${searchTerm}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Replace with</label>
                        <input type="text" id="replace-with" placeholder="Enter replacement text">
                    </div>
                    <div class="replace-options">
                        <label><input type="checkbox" id="replace-regex"> Use Regex</label>
                        <label><input type="checkbox" id="replace-case"> Case Sensitive</label>
                        <label><input type="checkbox" id="replace-whole"> Whole Word</label>
                    </div>
                    <div class="replace-actions">
                        <button onclick="window.enhancedSearch.replaceAllFromDialog()">Replace All</button>
                        <button onclick="window.enhancedSearch.closeReplaceDialog()">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    closeReplaceDialog() {
        const modal = document.querySelector('.replace-modal');
        if (modal) {
            modal.remove();
        }
    }

    replaceAllFromDialog() {
        const searchTerm = document.getElementById('replace-find')?.value || '';
        const replaceTerm = document.getElementById('replace-with')?.value || '';

        const options = {
            regex: document.getElementById('replace-regex')?.checked || false,
            caseSensitive: document.getElementById('replace-case')?.checked || false,
            wholeWord: document.getElementById('replace-whole')?.checked || false,
            scope: document.querySelector('input[name="search-scope"]:checked')?.value || 'all'
        };

        this.closeReplaceDialog();
        this.replaceAll(searchTerm, replaceTerm, options);
    }


    focusSearchInput() {
        const input = document.getElementById('search-input');
        if (input) {
            input.focus();
            input.select();
        }
    }

    handleSearchInput(event) {
        if (event.key === 'Enter') {
            this.performSearch(event.target.value);
        }
    }

    handleFilePatternInput(event) {
        if (event.key === 'Enter') {
            const searchTerm = document.getElementById('search-input')?.value || '';
            this.performSearch(searchTerm);
        }
    }

    toggleAdvancedOptions() {
        const options = document.querySelector('.search-options');
        if (options) {
            options.style.display = options.style.display === 'none' ? 'block' : 'none';
        }
    }

    clearSearch() {
        const input = document.getElementById('search-input');
        const filesInput = document.getElementById('search-files');
        const resultsEl = document.getElementById('search-items');
        const statsEl = document.getElementById('search-stats');

        if (input) input.value = '';
        if (filesInput) filesInput.value = '';
        if (resultsEl) resultsEl.innerHTML = '';
        if (statsEl) statsEl.innerHTML = '';
    }

    updateSearchHistoryUI() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        historyList.innerHTML = this.searchHistory.slice(0, 10).map(item => `
            <div class="history-item" onclick="window.enhancedSearch.loadHistoryItem('${item.id}')">
                <span class="history-term">${item.term}</span>
                <span class="history-time">${new Date(item.timestamp).toLocaleString()}</span>
            </div>
        `).join('');
    }

    loadHistoryItem(id) {
        const item = this.searchHistory.find(h => h.id === id);
        if (item) {
            const input = document.getElementById('search-input');
            if (input) {
                input.value = item.term;
                this.performSearch(item.term, item.options);
            }
        }
    }


    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            console.error(message);
        }
    }

    showSuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            console.log(message);
        }
    }
}


window.enhancedSearch = new EnhancedFileSearch();


window.performSearch = (searchTerm, options) => window.enhancedSearch.performSearch(searchTerm, options);
window.replaceAll = (searchTerm, replaceTerm, options) => window.enhancedSearch.replaceAll(searchTerm, replaceTerm, options);
window.openReplaceDialog = () => window.enhancedSearch.openReplaceDialog();
window.focusSearchInput = () => window.enhancedSearch.focusSearchInput();
window.clearSearch = () => window.enhancedSearch.clearSearch();
window.toggleAdvancedOptions = () => window.enhancedSearch.toggleAdvancedOptions();

