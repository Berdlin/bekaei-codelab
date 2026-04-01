


class EnhancedGitIntegration {
    constructor() {
        this.gitStatus = null;
        this.branches = [];
        this.commits = [];
        this.remotes = [];
        this.init();
    }

    async init() {
        this.setupGitCommands();
        this.setupGitStatus();
        this.setupBranchManagement();
        this.setupCommitHistory();
        this.setupGitHubIntegration();
    }


    setupGitCommands() {

        this.gitCommands = {
            init: async () => {
                return await this.executeGitCommand('git init');
            },
            status: async () => {
                const result = await this.executeGitCommand('git status --porcelain');
                this.parseGitStatus(result);
                return result;
            },
            add: async (files = '.') => {
                return await this.executeGitCommand(`git add ${files}`);
            },
            commit: async (message) => {
                return await this.executeGitCommand(`git commit -m "${message}"`);
            },
            push: async (remote = 'origin', branch = 'main') => {
                return await this.executeGitCommand(`git push ${remote} ${branch}`);
            },
            pull: async (remote = 'origin', branch = 'main') => {
                return await this.executeGitCommand(`git pull ${remote} ${branch}`);
            },
            clone: async (url, path = '.') => {
                return await this.executeGitCommand(`git clone ${url} ${path}`);
            },
            branch: async (name = null) => {
                if (name) {
                    return await this.executeGitCommand(`git branch ${name}`);
                } else {
                    return await this.executeGitCommand('git branch');
                }
            },
            checkout: async (branch) => {
                return await this.executeGitCommand(`git checkout ${branch}`);
            },
            merge: async (branch) => {
                return await this.executeGitCommand(`git merge ${branch}`);
            },
            log: async (limit = 10) => {
                return await this.executeGitCommand(`git log --oneline -${limit}`);
            },
            diff: async (file = null) => {
                if (file) {
                    return await this.executeGitCommand(`git diff ${file}`);
                } else {
                    return await this.executeGitCommand('git diff');
                }
            },
            reset: async (commit) => {
                return await this.executeGitCommand(`git reset ${commit}`);
            },
            stash: async (action = 'save') => {
                return await this.executeGitCommand(`git stash ${action}`);
            }
        };
    }


    setupGitStatus() {
        this.gitStatus = {
            staged: [],
            untracked: [],
            modified: [],
            deleted: [],
            renamed: []
        };
    }

    parseGitStatus(output) {
        if (!output) return;

        const lines = output.split('\n');
        lines.forEach(line => {
            if (!line.trim()) return;

            const status = line.substring(0, 2).trim();
            const file = line.substring(3).trim();

            if (status === '??') {
                this.gitStatus.untracked.push(file);
            } else if (status === 'M') {
                this.gitStatus.modified.push(file);
            } else if (status === 'D') {
                this.gitStatus.deleted.push(file);
            } else if (status === 'A') {
                this.gitStatus.staged.push(file);
            } else if (status === 'R') {
                this.gitStatus.renamed.push(file);
            }
        });
    }


    setupBranchManagement() {
        this.branches = [];
        this.currentBranch = null;
    }

    async loadBranches() {
        try {
            const result = await this.executeGitCommand('git branch --list');
            this.branches = result.split('\n').map(line => {
                const branch = line.replace('*', '').trim();
                if (line.includes('*')) {
                    this.currentBranch = branch;
                }
                return branch;
            }).filter(b => b);
            return this.branches;
        } catch (error) {
            console.error('Error loading branches:', error);
            return [];
        }
    }

    async createBranch(name) {
        try {
            const result = await this.executeGitCommand(`git branch ${name}`);
            await this.loadBranches();
            return result;
        } catch (error) {
            console.error('Error creating branch:', error);
            throw error;
        }
    }

    async switchBranch(name) {
        try {
            const result = await this.executeGitCommand(`git checkout ${name}`);
            await this.loadBranches();
            return result;
        } catch (error) {
            console.error('Error switching branch:', error);
            throw error;
        }
    }

    async deleteBranch(name) {
        try {
            const result = await this.executeGitCommand(`git branch -D ${name}`);
            await this.loadBranches();
            return result;
        } catch (error) {
            console.error('Error deleting branch:', error);
            throw error;
        }
    }


    setupCommitHistory() {
        this.commits = [];
    }

    async loadCommits(limit = 50) {
        try {
            const result = await this.executeGitCommand(`git log --pretty=format:"%H|%an|%ad|%s" --date=short -${limit}`);
            this.commits = result.split('\n').map(line => {
                const parts = line.split('|');
                return {
                    hash: parts[0],
                    author: parts[1],
                    date: parts[2],
                    message: parts[3]
                };
            }).filter(c => c.hash);
            return this.commits;
        } catch (error) {
            console.error('Error loading commits:', error);
            return [];
        }
    }

    async createCommit(message, files = []) {
        try {

            if (files.length > 0) {
                await this.gitCommands.add(files.join(' '));
            }


            const result = await this.gitCommands.commit(message);
            await this.loadCommits();
            return result;
        } catch (error) {
            console.error('Error creating commit:', error);
            throw error;
        }
    }


    setupGitHubIntegration() {
        this.githubToken = localStorage.getItem('github_token');
        this.githubRepo = null;
    }

    async setGitHubToken(token) {
        this.githubToken = token;
        localStorage.setItem('github_token', token);
        await this.detectGitHubRepo();
    }

    async detectGitHubRepo() {
        try {
            const result = await this.executeGitCommand('git remote -v');
            const originLine = result.split('\n').find(line => line.includes('origin') && line.includes('github.com'));

            if (originLine) {
                const url = originLine.split('\t')[1].split(' ')[0];
                const match = url.match(/github\.com[/:]([^/]+)\/([^\.]+)/);

                if (match) {
                    this.githubRepo = {
                        owner: match[1],
                        name: match[2],
                        url: url
                    };
                }
            }
        } catch (error) {
            console.error('Error detecting GitHub repo:', error);
        }
    }

    async createPullRequest(title, body, head, base = 'main') {
        if (!this.githubToken || !this.githubRepo) {
            throw new Error('GitHub token or repository not configured');
        }

        try {
            const response = await fetch(`https://api.github.com/repos/${this.githubRepo.owner}/${this.githubRepo.name}/pulls`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    body: body,
                    head: head,
                    base: base
                })
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const pr = await response.json();
            return pr;
        } catch (error) {
            console.error('Error creating pull request:', error);
            throw error;
        }
    }

    async getPullRequests(state = 'open') {
        if (!this.githubToken || !this.githubRepo) {
            throw new Error('GitHub token or repository not configured');
        }

        try {
            const response = await fetch(`https://api.github.com/repos/${this.githubRepo.owner}/${this.githubRepo.name}/pulls?state=${state}`, {
                headers: {
                    'Authorization': `token ${this.githubToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const prs = await response.json();
            return prs;
        } catch (error) {
            console.error('Error getting pull requests:', error);
            throw error;
        }
    }


    setupRemoteManagement() {
        this.remotes = [];
    }

    async loadRemotes() {
        try {
            const result = await this.executeGitCommand('git remote -v');
            this.remotes = result.split('\n').map(line => {
                const parts = line.split('\t');
                return {
                    name: parts[0],
                    url: parts[1].split(' ')[0],
                    type: parts[1].split(' ')[1]
                };
            }).filter(r => r.name);
            return this.remotes;
        } catch (error) {
            console.error('Error loading remotes:', error);
            return [];
        }
    }

    async addRemote(name, url) {
        try {
            const result = await this.executeGitCommand(`git remote add ${name} ${url}`);
            await this.loadRemotes();
            return result;
        } catch (error) {
            console.error('Error adding remote:', error);
            throw error;
        }
    }

    async removeRemote(name) {
        try {
            const result = await this.executeGitCommand(`git remote remove ${name}`);
            await this.loadRemotes();
            return result;
        } catch (error) {
            console.error('Error removing remote:', error);
            throw error;
        }
    }


    async executeGitCommand(command) {
        try {



            console.log(`Executing: ${command}`);


            if (command.includes('git status')) {
                return '?? new-file.js\nM  existing-file.js';
            } else if (command.includes('git branch')) {
                return '* main\n  feature-branch\n  develop';
            } else if (command.includes('git log')) {
                return 'abc1234 John Doe 2023-10-01 Initial commit\ndef5678 Jane Smith 2023-10-02 Add features';
            } else if (command.includes('git add')) {
                return 'File added to staging area';
            } else if (command.includes('git commit')) {
                return 'Commit successful';
            } else {
                return 'Command executed successfully';
            }
        } catch (error) {
            console.error('Git command error:', error);
            throw error;
        }
    }


    createGitPanel() {
        const panel = document.createElement('div');
        panel.className = 'git-panel';
        panel.innerHTML = `
            <div class="git-header">
                <h3>Git</h3>
                <div class="git-actions">
                    <button onclick="window.enhancedGit.refreshStatus()">Refresh</button>
                    <button onclick="window.enhancedGit.openGitModal()">Git Commands</button>
                </div>
            </div>
            <div class="git-content">
                <div class="git-status">
                    <h4>Status</h4>
                    <div id="git-status-list"></div>
                </div>
                <div class="git-branches">
                    <h4>Branches</h4>
                    <div id="git-branches-list"></div>
                </div>
                <div class="git-commits">
                    <h4>Recent Commits</h4>
                    <div id="git-commits-list"></div>
                </div>
            </div>
        `;
        return panel;
    }

    refreshStatus() {
        this.gitCommands.status();
        this.loadBranches();
        this.loadCommits();
        this.renderGitStatus();
    }

    renderGitStatus() {
        const statusList = document.getElementById('git-status-list');
        const branchesList = document.getElementById('git-branches-list');
        const commitsList = document.getElementById('git-commits-list');

        if (statusList) {
            statusList.innerHTML = `
                <div class="status-item"><strong>Untracked:</strong> ${this.gitStatus.untracked.length}</div>
                <div class="status-item"><strong>Modified:</strong> ${this.gitStatus.modified.length}</div>
                <div class="status-item"><strong>Staged:</strong> ${this.gitStatus.staged.length}</div>
            `;
        }

        if (branchesList) {
            branchesList.innerHTML = this.branches.map(branch => `
                <div class="branch-item ${branch === this.currentBranch ? 'active' : ''}">
                    <span>${branch}</span>
                    <button onclick="window.enhancedGit.switchBranch('${branch}')">Checkout</button>
                </div>
            `).join('');
        }

        if (commitsList) {
            commitsList.innerHTML = this.commits.slice(0, 10).map(commit => `
                <div class="commit-item">
                    <div class="commit-hash">${commit.hash.substring(0, 7)}</div>
                    <div class="commit-info">
                        <div class="commit-message">${commit.message}</div>
                        <div class="commit-meta">${commit.author} - ${commit.date}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    openGitModal() {
        const modal = document.createElement('div');
        modal.className = 'git-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Git Commands</h3>
                <div class="git-command-form">
                    <input type="text" id="git-command-input" placeholder="Enter git command...">
                    <button onclick="window.enhancedGit.executeCommand()">Execute</button>
                </div>
                <div class="git-output" id="git-output"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async executeCommand() {
        const input = document.getElementById('git-command-input');
        const output = document.getElementById('git-output');

        if (!input || !output) return;

        const command = input.value.trim();
        if (!command) return;

        try {
            const result = await this.executeGitCommand(command);
            output.innerHTML += `<div class="command-result">${result}</div>`;
            input.value = '';
        } catch (error) {
            output.innerHTML += `<div class="command-error">Error: ${error.message}</div>`;
        }
    }
}


window.enhancedGit = new EnhancedGitIntegration();


window.gitInit = () => window.enhancedGit.gitCommands.init();
window.gitStatus = () => window.enhancedGit.gitCommands.status();
window.gitAdd = (files) => window.enhancedGit.gitCommands.add(files);
window.gitCommit = (message) => window.enhancedGit.gitCommands.commit(message);
window.gitPush = (remote, branch) => window.enhancedGit.gitCommands.push(remote, branch);
window.gitPull = (remote, branch) => window.enhancedGit.gitCommands.pull(remote, branch);
window.gitBranch = (name) => window.enhancedGit.gitCommands.branch(name);
window.gitCheckout = (branch) => window.enhancedGit.gitCommands.checkout(branch);
window.gitLog = (limit) => window.enhancedGit.gitCommands.log(limit);
window.gitDiff = (file) => window.enhancedGit.gitCommands.diff(file);
window.gitReset = (commit) => window.enhancedGit.gitCommands.reset(commit);
window.gitStash = (action) => window.enhancedGit.gitCommands.stash(action);
window.createBranch = (name) => window.enhancedGit.createBranch(name);
window.switchBranch = (name) => window.enhancedGit.switchBranch(name);
window.deleteBranch = (name) => window.enhancedGit.deleteBranch(name);
window.createCommit = (message, files) => window.enhancedGit.createCommit(message, files);
window.setGitHubToken = (token) => window.enhancedGit.setGitHubToken(token);
window.createPullRequest = (title, body, head, base) => window.enhancedGit.createPullRequest(title, body, head, base);
window.getPullRequests = (state) => window.enhancedGit.getPullRequests(state);
window.loadRemotes = () => window.enhancedGit.loadRemotes();
window.addRemote = (name, url) => window.enhancedGit.addRemote(name, url);
window.removeRemote = (name) => window.enhancedGit.removeRemote(name);

