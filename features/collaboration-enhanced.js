


class EnhancedCollaboration {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.userId = null;
        this.username = 'Guest';
        this.cursors = new Map();
        this.presenceTimer = null;
        this.conflictResolver = new ConflictResolver();
        this.init();
    }

    async init() {
        this.setupSocket();
        this.setupPresence();
        this.setupConflictResolution();
    }

    setupSocket() {
        if (typeof io === 'undefined') {
            console.error('Socket.IO not loaded');
            return;
        }

        this.socket = io({
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 5000
        });

        this.socket.on('connect', () => {
            console.log('Collaboration socket connected');
            this.showCollaborationStatus('connected', 'Connected to collaboration server');
        });

        this.socket.on('disconnect', () => {
            console.log('Collaboration socket disconnected');
            this.showCollaborationStatus('disconnected', 'Disconnected from collaboration server');
        });

        this.socket.on('user-joined', (data) => {
            this.addUserToPresence(data);
            this.showNotification(`${data.username} joined`, 'info');
        });

        this.socket.on('user-left', (data) => {
            this.removeUserFromPresence(data.userId);
            this.showNotification(`${data.username} left`, 'info');
        });

        this.socket.on('cursor-update', (data) => {
            this.updateRemoteCursor(data);
        });

        this.socket.on('selection-update', (data) => {
            this.updateRemoteSelection(data);
        });

        this.socket.on('typing-indicator', (data) => {
            this.showTypingIndicator(data);
        });

        this.socket.on('conflict-detected', (data) => {
            this.handleConflict(data);
        });
    }

    setupPresence() {

        this.presenceTimer = setInterval(() => {
            if (this.socket && this.socket.connected && this.roomId) {
                this.socket.emit('presence-heartbeat', {
                    roomId: this.roomId,
                    userId: this.userId,
                    username: this.username
                });
            }
        }, 30000);
    }

    setupConflictResolution() {

        if (window.editor) {
            window.editor.onDidChangeModelContent((event) => {
                if (this.roomId && this.userId) {

                    this.socket.emit('local-change', {
                        roomId: this.roomId,
                        userId: this.userId,
                        changes: event.changes,
                        version: event.versionId
                    });
                }
            });
        }
    }

    joinRoom(roomId, userId, username) {
        this.roomId = roomId;
        this.userId = userId;
        this.username = username || 'Guest';

        if (this.socket) {
            this.socket.emit('join-room', {
                roomId: roomId,
                userId: userId,
                username: username
            });
        }
    }

    leaveRoom() {
        if (this.socket) {
            this.socket.emit('leave-room', { roomId: this.roomId, userId: this.userId });
        }
        this.roomId = null;
        this.userId = null;
        this.username = 'Guest';
    }


    updateLocalCursor(position, selection) {
        if (!this.socket || !this.roomId) return;

        this.socket.emit('cursor-update', {
            roomId: this.roomId,
            userId: this.userId,
            username: this.username,
            position: position,
            selection: selection,
            timestamp: Date.now()
        });
    }

    updateRemoteCursor(data) {
        if (data.userId === this.userId) return; 


        let cursor = this.cursors.get(data.userId);
        if (!cursor) {
            cursor = this.createCursorElement(data.userId, data.username);
            this.cursors.set(data.userId, cursor);
        }


        this.moveCursor(cursor, data.position);


        if (data.selection) {
            this.updateCursorSelection(cursor, data.selection);
        }


        this.showTypingIndicator({ userId: data.userId, username: data.username });
    }

    createCursorElement(userId, username) {
        const container = document.querySelector('.editor-area') || document.body;
        const cursor = document.createElement('div');
        cursor.className = 'remote-cursor';
        cursor.style.cssText = `
            position: absolute;
            pointer-events: none;
            z-index: 1000;
            transition: top 0.1s, left 0.1s;
        `;


        const line = document.createElement('div');
        line.className = 'cursor-line';
        line.style.cssText = `
            width: 2px;
            background: #6366f1;
            height: 20px;
            position: absolute;
            top: 0;
            left: 0;
        `;


        const label = document.createElement('div');
        label.className = 'cursor-label';
        label.textContent = username;
        label.style.cssText = `
            background: #6366f1;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            position: absolute;
            top: -20px;
            left: 0;
            white-space: nowrap;
            pointer-events: none;
        `;

        cursor.appendChild(line);
        cursor.appendChild(label);
        container.appendChild(cursor);

        return cursor;
    }

    moveCursor(cursor, position) {
        if (!window.editor) return;

        try {
            const editor = window.editor;
            const pos = editor.getPosition();

            if (pos) {
                const coords = editor.getScrolledVisiblePosition(pos);
                if (coords) {
                    cursor.style.top = (coords.top + 2) + 'px';
                    cursor.style.left = (coords.left + 2) + 'px';
                }
            }
        } catch (error) {
            console.warn('Error updating cursor position:', error);
        }
    }

    updateCursorSelection(cursor, selection) {

        if (!cursor.selectionHighlight) {
            cursor.selectionHighlight = document.createElement('div');
            cursor.selectionHighlight.className = 'cursor-selection';
            cursor.selectionHighlight.style.cssText = `
                position: absolute;
                background: rgba(99, 102, 241, 0.2);
                border: 1px solid rgba(99, 102, 241, 0.5);
                pointer-events: none;
            `;
            cursor.appendChild(cursor.selectionHighlight);
        }


        cursor.selectionHighlight.style.display = 'block';
    }


    showTypingIndicator(data) {
        const indicator = document.getElementById('typing-indicator');
        if (!indicator) return;

        const existing = indicator.querySelector(`[data-user="${data.userId}"]`);
        if (!existing) {
            const badge = document.createElement('span');
            badge.className = 'typing-badge';
            badge.dataset.user = data.userId;
            badge.innerHTML = `<i class="fa-solid fa-circle" style="color:#6366f1;margin-right:4px;"></i>${data.username} is typing...`;
            indicator.appendChild(badge);


            setTimeout(() => {
                if (badge.parentNode) {
                    badge.parentNode.removeChild(badge);
                }
            }, 3000);
        } else {

            existing.style.opacity = '1';
            setTimeout(() => {
                existing.style.opacity = '0.5';
            }, 2000);
        }
    }


    handleConflict(data) {
        this.conflictResolver.resolve(data, (resolvedContent) => {
            if (window.editor) {
                window.editor.setValue(resolvedContent);
            }
        });
    }


    setupVoiceChat() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showNotification('Voice chat not supported in this browser', 'error');
            return;
        }

        this.socket.emit('request-voice-permission', { roomId: this.roomId, userId: this.userId });
    }

    startVoiceChat() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                this.localStream = stream;
                this.socket.emit('voice-stream-ready', { roomId: this.roomId, userId: this.userId });


                this.setupAudioProcessing(stream);
            })
            .catch((error) => {
                console.error('Voice chat error:', error);
                this.showNotification('Microphone access denied', 'error');
            });
    }

    setupAudioProcessing(stream) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(1024, 1, 1);

        processor.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);

            this.socket.emit('audio-data', {
                roomId: this.roomId,
                userId: this.userId,
                data: input
            });
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
    }


    addUserToPresence(user) {
        const presenceList = document.getElementById('online-users-list');
        if (!presenceList) return;

        const userElement = document.createElement('div');
        userElement.className = 'presence-user';
        userElement.innerHTML = `
            <i class="fa-solid fa-circle" style="color:#10b981;margin-right:8px;"></i>
            <span>${user.username}</span>
            <span class="user-status">Online</span>
        `;
        presenceList.appendChild(userElement);
    }

    removeUserFromPresence(userId) {
        const presenceList = document.getElementById('online-users-list');
        if (!presenceList) return;

        const userElement = presenceList.querySelector(`[data-user="${userId}"]`);
        if (userElement) {
            userElement.remove();
        }
    }

    showCollaborationStatus(status, message) {
        const statusEl = document.getElementById('collaboration-status');
        if (!statusEl) return;

        statusEl.className = `collaboration-status ${status}`;
        statusEl.textContent = message;
    }

    showNotification(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        }
    }


    destroy() {
        if (this.presenceTimer) {
            clearInterval(this.presenceTimer);
        }


        this.cursors.forEach((cursor) => {
            if (cursor.parentNode) {
                cursor.parentNode.removeChild(cursor);
            }
        });
        this.cursors.clear();

        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

class ConflictResolver {
    resolve(conflictData, callback) {



        const strategy = localStorage.getItem('conflict-resolution-strategy') || 'latest-wins';

        switch (strategy) {
            case 'latest-wins':
                callback(conflictData.latestContent);
                break;
            case 'merge':
                this.mergeChanges(conflictData, callback);
                break;
            case 'manual':
                this.showConflictDialog(conflictData, callback);
                break;
            default:
                callback(conflictData.latestContent);
        }
    }

    mergeChanges(conflictData, callback) {

        const merged = conflictData.latestContent;
        callback(merged);
    }

    showConflictDialog(conflictData, callback) {
        const modal = document.createElement('div');
        modal.className = 'conflict-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Conflict Detected</h3>
                <p>Multiple users edited the same content. Please choose how to resolve:</p>
                <div class="conflict-options">
                    <button onclick="window.enhancedCollaboration.conflictResolver.chooseLatest()">Use Latest Changes</button>
                    <button onclick="window.enhancedCollaboration.conflictResolver.chooseOriginal()">Keep Original</button>
                    <button onclick="window.enhancedCollaboration.conflictResolver.chooseMerge()">Try to Merge</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);


        this.pendingCallback = callback;
        this.conflictData = conflictData;
    }

    chooseLatest() {
        this.pendingCallback(this.conflictData.latestContent);
        this.cleanupConflictDialog();
    }

    chooseOriginal() {
        this.pendingCallback(this.conflictData.originalContent);
        this.cleanupConflictDialog();
    }

    chooseMerge() {
        this.mergeChanges(this.conflictData, this.pendingCallback);
        this.cleanupConflictDialog();
    }

    cleanupConflictDialog() {
        const modal = document.querySelector('.conflict-modal');
        if (modal) {
            modal.remove();
        }
        this.pendingCallback = null;
        this.conflictData = null;
    }
}


window.enhancedCollaboration = new EnhancedCollaboration();


window.joinCollaborationRoom = (roomId, userId, username) => window.enhancedCollaboration.joinRoom(roomId, userId, username);
window.leaveCollaborationRoom = () => window.enhancedCollaboration.leaveRoom();
window.updateCursor = (position, selection) => window.enhancedCollaboration.updateLocalCursor(position, selection);
window.setupVoiceChat = () => window.enhancedCollaboration.setupVoiceChat();
window.startVoiceChat = () => window.enhancedCollaboration.startVoiceChat();

