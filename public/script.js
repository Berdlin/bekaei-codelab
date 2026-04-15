var socket = null;
var currentUser = null;
var ADMIN_EMAIL = 'berekethabtamu2025@gmail.com';
var ADMIN_UNLOCK_TRIGGER = 'BerAmiLin123';
var ADMIN_UNLOCK_SECRET = 'BERDLIN!@#ABC@)!!HIMYNAMEISBEREKET';
var adminPanelUnlocked = false;
var teamTypingUsers = {};
var teamTypingEmitTimer = null;
var friendsTypingTimer = null;
var currentUsername = "Guest";
var currentRoomId = null;
var editor = null;
var localFiles = [];
var activeFileId = null;
var isDemoMode = false;
var demoTimerInterval = null;
var demoTimeRemaining = 60;
var pendingRoomToJoin = null;
var pendingRoomOwnerEmail = null;
var profileEditMode = false;
var authInitialized = false;
var initRetries = 0;
var maxInitRetries = 5;
var supabaseReady = false;
var openTabs = [];
var editorMaximized = false;
var panelsVisible = true;
var sidebarAutoHide = false;
var activeSidebarPanel = "explorer";
var LANGUAGE_MAP = {
    "js": "javascript", "javascript": "javascript", "ts": "typescript", "typescript": "typescript",
    "html": "html", "css": "css", "scss": "scss", "sass": "sass", "less": "less",
    "py": "python", "python": "python", "rb": "ruby", "ruby": "ruby",
    "php": "php", "java": "java", "c": "c", "cpp": "cpp", "c++": "cpp", "cs": "csharp", "c#": "csharp",
    "go": "go", "rs": "rust", "rust": "rust", "swift": "swift", "kt": "kotlin", "kotlin": "kotlin",
    "scala": "scala", "r": "r", "sh": "bash", "bash": "bash", "ps1": "powershell",
    "json": "json", "xml": "xml", "yaml": "yaml", "yml": "yaml", "toml": "toml",
    "md": "markdown", "markdown": "markdown", "txt": "plaintext",
    "sql": "sql", "mysql": "sql", "pgsql": "sql",
    "lua": "lua", "perl": "perl", "pl": "perl", "dart": "dart", "elm": "elm",
    "ex": "elixir", "exs": "elixir", "hs": "haskell",
    "ml": "ocaml", "mli": "ocaml", "fs": "fsharp", "fsi": "fsharp"
};
var config = {
    theme: "vs-dark", fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
    wordWrap: "on", lineNumbers: "on", tabSize: 4, minimap: { enabled: true },
    cursorStyle: "line", cursorBlinking: "blink", formatOnType: true, formatOnPaste: true,
    smoothScrolling: true, autoClosingBrackets: "always", autoClosingQuotes: "always",
    autoClosingTags: true, autoSurround: "languageDefined", autoIndent: "full",
    bracketPairColorization: { enabled: true }, lineHeight: 20, automaticLayout: true, autoSave: true,
    executionMode: "auto", maxOutputLines: 1000, timeout: 30000
};

var BandwidthOptimizer = {
    isLowBandwidth: function () {
        var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            return conn.effectiveType === "slow-2g" ||
                conn.downlink < 0.5;
        }
        return false;
    },
    mode: "normal",
    init: function () {
        this.mode = this.isLowBandwidth() ? "low" : "normal";
        console.log("Bandwidth mode:", this.mode);
        if (this.mode === "low") {
            config.minimap = { enabled: false };
            config.smoothScrolling = false;
            config.autoSave = false;
        }
    }
};

var WifiSpeedIndicator = {
    popupVisible: false,
    updateInterval: null,
    lastMeasuredMbps: null,
    lastMeasuredAt: 0,
    init: function () {
        this.updateSpeedDisplay();
        this.setupNetworkListener();
        this.updateInterval = setInterval(function () {
            WifiSpeedIndicator.updateSpeedDisplay();
        }, 5000);
        document.addEventListener("click", function (e) {
            if (WifiSpeedIndicator.popupVisible &&
                !e.target.closest("#wifi-indicator") &&
                !e.target.closest("#wifi-popup")) {
                WifiSpeedIndicator.hidePopup();
            }
        });
    },
    getConnectionInfo: function () {
        var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) {
            return {
                downlink: null,
                effectiveType: null,
                rtt: null,
                saveData: false,
                online: navigator.onLine
            };
        }
        return {
            downlink: conn.downlink,
            effectiveType: conn.effectiveType,
            rtt: conn.rtt,
            saveData: conn.saveData,
            online: navigator.onLine
        };
    },
    getSpeedQuality: function (downlink) {
        if (!downlink || downlink === 0) return "offline";
        if (downlink >= 10) return "excellent";
        if (downlink >= 5) return "good";
        if (downlink >= 1.5) return "fair";
        return "poor";
    },
    getSpeedLabel: function (quality) {
        var labels = {
            "excellent": "Excellent",
            "good": "Good",
            "fair": "Fair",
            "poor": "Poor",
            "offline": "Offline"
        };
        return labels[quality] || "Unknown";
    },
    updateSpeedDisplay: function () {
        var info = this.getConnectionInfo();
        var iconEl = document.getElementById("wifi-icon");
        var textEl = document.getElementById("wifi-speed-text");
        var speedEl = document.getElementById("current-speed");
        var labelEl = document.getElementById("speed-label");
        var barFill = document.getElementById("speed-bar-fill");
        if (!info.online) {
            if (iconEl) {
                iconEl.className = "fa-solid fa-wifi wifi-icon offline";
            }
            if (textEl) textEl.textContent = "Offline";
            this.updatePopupOffline();
            return;
        }
        var measuredAge = (Date.now() - (this.lastMeasuredAt || 0)) / 1000;
        var downlink = (this.lastMeasuredMbps && measuredAge < 20) ? this.lastMeasuredMbps : (info.downlink || 0);
        var quality = this.getSpeedQuality(downlink);
        var speedLabel = this.getSpeedLabel(quality);
        if (iconEl) {
            iconEl.className = "fa-solid fa-wifi wifi-icon " + quality;
        }
        if (textEl) {
            textEl.textContent = (downlink > 0 ? downlink.toFixed(1) : "--") + " Mbps";
        }
        if (speedEl) speedEl.textContent = downlink > 0 ? downlink.toFixed(1) : "--";
        if (labelEl) labelEl.textContent = speedLabel;
        var percentage = Math.min((downlink / 20) * 100, 100);
        if (barFill) {
            barFill.style.width = percentage + "%";
            var colors = {
                "excellent": "#10b981",
                "good": "#22c55e",
                "fair": "#f59e0b",
                "poor": "#ef4444"
            };
            barFill.style.background = colors[quality] || "#6b7280";
        }
        this.updateInfoRow("conn-status", speedLabel, quality);
        this.updateInfoRow("conn-type", info.effectiveType || "--", info.effectiveType ? "good" : "normal");
        this.updateInfoRow("conn-downlink", downlink > 0 ? (Number(downlink).toFixed(2) + " Mbps") : "--", "normal");
        this.updateInfoRow("conn-rtt", info.rtt ? info.rtt + " ms" : "--", info.rtt && info.rtt < 300 ? "good" : info.rtt && info.rtt < 500 ? "warning" : "danger");
        this.updateInfoRow("conn-savedata", info.saveData ? "Yes" : "No", info.saveData ? "warning" : "good");
        this.updateOptimizationStatus(downlink);
        var badgeEl = document.getElementById("bandwidth-mode-badge");
        if (badgeEl) {
            if (downlink < 1.5 || info.effectiveType === "2g" || info.effectiveType === "slow-2g" || info.saveData) {
                badgeEl.classList.add("visible");
            } else {
                badgeEl.classList.remove("visible");
            }
        }
    },
    updateInfoRow: function (id, value, status) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            el.className = "info-value " + status;
        }
    },
    updatePopupOffline: function () {
        document.getElementById("conn-status").textContent = "Offline";
        document.getElementById("conn-type").textContent = "--";
        document.getElementById("conn-downlink").textContent = "--";
        document.getElementById("conn-rtt").textContent = "--";
        document.getElementById("conn-savedata").textContent = "--";
    },
    updateOptimizationStatus: function (downlink) {
        var statusEl = document.getElementById("optimization-status");
        if (!statusEl) return;
        if (downlink < 0.5) {
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Basic mode - Limited features';
            statusEl.style.color = "#f59e0b";
            statusEl.style.background = "rgba(245, 158, 11, 0.1)";
            statusEl.style.borderColor = "rgba(245, 158, 11, 0.2)";
        } else if (downlink < 1) {
            statusEl.innerHTML = '<i class="fa-solid fa-bolt"></i> Lite mode - Some features reduced';
            statusEl.style.color = "#f59e0b";
            statusEl.style.background = "rgba(245, 158, 11, 0.1)";
            statusEl.style.borderColor = "rgba(245, 158, 11, 0.2)";
        } else if (downlink < 1.5) {
            statusEl.innerHTML = '<i class="fa-solid fa-check"></i> Optimized for slow connection';
            statusEl.style.color = "#10b981";
            statusEl.style.background = "rgba(16, 185, 129, 0.1)";
            statusEl.style.borderColor = "rgba(16, 185, 129, 0.2)";
        } else {
            statusEl.innerHTML = '<i class="fa-solid fa-bolt"></i> Full performance mode';
            statusEl.style.color = "#10b981";
            statusEl.style.background = "rgba(16, 185, 129, 0.1)";
            statusEl.style.borderColor = "rgba(16, 185, 129, 0.2)";
        }
    },
    setupNetworkListener: function () {
        var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            conn.addEventListener("change", function () {
                WifiSpeedIndicator.updateSpeedDisplay();
            });
        }
        window.addEventListener("online", function () {
            WifiSpeedIndicator.updateSpeedDisplay();
            showToast("We are back online!", "success");
        });
        window.addEventListener("offline", function () {
            WifiSpeedIndicator.updateSpeedDisplay();
        });
    },
    measureSpeed: async function () {
        try {
            var fastUrl = 'https://api.fast.com/netflix/speedtest/v2?https=true&token=YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm';
            var start = performance.now();
            var proxyUrl = '/api/fast-speed-test';
            var res = await fetch(proxyUrl + '?_cb=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) {
                console.log('Fast.com API failed, using local speed test');
                return await this.measureSpeedLocal();
            }
            var data = await res.json();
            var duration = (performance.now() - start) / 1000;
            var speedMbps = data ? (data.speed || data.downloadSpeed || 0) : 0;
            if (speedMbps > 0) {
                this.lastMeasuredMbps = Number(speedMbps.toFixed(2));
                this.lastMeasuredAt = Date.now();
                this.updateSpeedDisplay();
                return this.lastMeasuredMbps;
            } else {
                return await this.measureSpeedLocal();
            }
        } catch (e) {
            console.warn('Fast.com speed measurement failed:', e.message);
            return await this.measureSpeedLocal();
        }
    },
    measureSpeedLocal: async function () {
        var url = '/api/speed-test?size=200000';
        try {
            var start = performance.now();
            var res = await fetch(url + '&_cb=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) throw new Error('Speed test request failed');
            var blob = await res.blob();
            var duration = (performance.now() - start) / 1000;
            var bytes = blob.size || 0;
            if (duration > 0 && bytes > 0) {
                var mbps = (bytes * 8) / (duration * 1000 * 1000);
                this.lastMeasuredMbps = Number(mbps.toFixed(2));
                this.lastMeasuredAt = Date.now();
                this.updateSpeedDisplay();
                return this.lastMeasuredMbps;
            }
        } catch (e) {
            console.warn('Local speed measurement failed:', e.message);
        }
        return null;
    },
    showPopup: function () {
        var popup = document.getElementById("wifi-popup");
        if (popup) popup.classList.remove("hidden");
        this.popupVisible = true;
    },
    hidePopup: function () {
        var popup = document.getElementById("wifi-popup");
        if (popup) popup.classList.add("hidden");
        this.popupVisible = false;
    },
    togglePopup: function () {
        if (this.popupVisible) {
            this.hidePopup();
        } else {
            this.showPopup();
        }
    }
};

function toggleWifiPopup() {
    WifiSpeedIndicator.togglePopup();
}

var isLocalChange = false;
var lastLocalEditAt = 0;
var _pendingCloudSaveTimers = {};
var socketReconnectAttempts = 0;
var maxReconnectAttempts = 10;

function connectSocket() {
    if (socket && socket.connected) {
        console.log('Socket already connected');
        return;
    }

    socket = io({
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['websocket', 'polling']
    });

    socket.on('connect', function () {
        console.log('✓ Connected to collaboration server', socket.id);
        socketReconnectAttempts = 0;
        showToast("Connected to collaboration server", "success");
        if (currentRoomId) {
            joinRoomForCollaboration(currentRoomId);
        }
    });

    socket.on('connect_error', function (error) {
        console.error('Socket connection error:', error.message);
        socketReconnectAttempts++;
        if (socketReconnectAttempts >= maxReconnectAttempts) {
            showToast("WiFi connection problem. Please check your internet connection.", "error");
        }
    });

    socket.on('reconnect', function (attemptNumber) {
        console.log('Reconnected after', attemptNumber, 'attempts');
        showToast("Reconnected to collaboration server", "success");
        if (currentRoomId) {
            joinRoomForCollaboration(currentRoomId);
        }
    });

    socket.on('reconnect_attempt', function (attemptNumber) {
        console.log('Reconnection attempt:', attemptNumber);
        if (attemptNumber > 1) {
            showToast("Reconnecting to collaboration server...", "info");
        }
    });

    socket.on('reconnect_failed', function () {
        console.error('Reconnection failed after', maxReconnectAttempts, 'attempts');
        showToast("Connection lost. Please refresh the page.", "error");
    });

    socket.on('disconnect', function (reason) {
        console.log('Disconnected from server:', reason);
        if (reason === 'io server disconnect') {
            showToast("Disconnected from server", "warning");
        } else {
            showToast("Connection lost. Attempting to reconnect...", "warning");
        }
    });

    socket.on('init-state', function (data) {
        console.log('Initial state received:', data);
        try {
            if (data.files && data.files.length > 0) {
                loadRoomFiles(data.files);
            }
            if (data.users) {
                updateOnlineUsers(data.users);
            }
        } catch (e) {
            console.error('Error processing init-state:', e);
        }
    });

    // Apply streamed edits from collaborators without resetting cursor/undo.
    socket.on('remote-change', function (payload) {
        try {
            if (!payload || !payload.fileId || !payload.changes) return;
            var file = localFiles.find(function (f) { return f.remoteId === payload.fileId; });
            if (!file) return;

            if (editor && activeFileId === file.id && editor.getModel) {
                var model = editor.getModel();
                if (!model) return;
                isLocalChange = true;
                try {
                    var edits = (payload.changes || []).map(function (c) {
                        return { range: c.range, text: c.text };
                    });
                    model.applyEdits(edits);
                    file.content = model.getValue();
                } finally {
                    isLocalChange = false;
                }
            } else {
                file.content = applyTextEditsToString(file.content || "", payload.changes || []);
            }
        } catch (e) {
            console.error('Error applying remote-change:', e);
        }
    });

    socket.on('file-content-response', function (file) {
        console.log('File content received:', file.name);
        try {
            var existing = localFiles.find(function (f) { return f.name === file.name; });
            if (!existing) {
                var id = "remote-" + file.id;
                localFiles.push({
                    id: id,
                    name: file.name,
                    content: file.content,
                    lang: file.lang,
                    remoteId: file.id
                });
                renderExplorer();
            }
        } catch (e) {
            console.error('Error processing file content:', e);
        }
    });

    socket.on('file-created', function (file) {
        console.log('New file created:', file.name);
        try {
            var id = "remote-" + file.id;
            if (!localFiles.find(function (f) { return f.name === file.name; })) {
                localFiles.push({
                    id: id,
                    name: file.name,
                    content: file.content || '',
                    lang: file.lang,
                    remoteId: file.id
                });
                renderExplorer();
                showToast(file.name + " was added by collaborator", "info");
            }
        } catch (e) {
            console.error('Error processing file creation:', e);
        }
    });

    socket.on('file-updated', function (data) {
        console.log('File updated:', data.fileId);
        try {
            var file = localFiles.find(function (f) { return f.remoteId === data.fileId; });
            if (file) {
                if (activeFileId !== file.id) {
                    file.content = data.content;
                    if (editor && activeFileId === file.id) {
                        isLocalChange = true;
                        editor.setValue(data.content);
                        isLocalChange = false;
                    }
                }
            }
        } catch (e) {
            console.error('Error processing file update:', e);
        }
    });

    socket.on('file-deleted', function (fileId) {
        console.log('File deleted:', fileId);
        try {
            var file = localFiles.find(function (f) { return f.remoteId === fileId; });
            if (file) {
                var name = file.name;
                localFiles = localFiles.filter(function (f) { return f.remoteId !== fileId; });
                renderExplorer();
                showToast(name + " was deleted", "warning");
            }
        } catch (e) {
            console.error('Error processing file deletion:', e);
        }
    });

    socket.on('room-users-update', function (users) {
        try {
            updateOnlineUsers(users);
        } catch (e) {
            console.error('Error updating online users:', e);
        }
    });

    socket.on('chat-message', function (data) {
        try {
            if (data && data.user) delete teamTypingUsers[String(data.user)];
            renderTeamTypingIndicator();
            TeamChat.addMessage(data.user, data.text);
        } catch (e) {
            console.error('Error processing chat message:', e);
        }
    });

    socket.on('chat-typing', function (data) {
        try {
            if (!data || !data.username) return;
            var key = String(data.username);
            if (data.isTyping) teamTypingUsers[key] = Date.now() + 4000;
            else delete teamTypingUsers[key];
            renderTeamTypingIndicator();
        } catch (e) { }
    });

    socket.on('user-joined', function (data) {
        try {
            showToast(data.username + " joined the room", "info");
        } catch (e) {
            console.error('Error processing user joined:', e);
        }
    });

    socket.on('user-left', function (data) {
        try {
            showToast(data.username + " left the room", "info");
        } catch (e) {
            console.error('Error processing user left:', e);
        }
    });
}

function renderTeamTypingIndicator() {
    var chatArea = document.getElementById("team-chat-area");
    if (!chatArea) return;
    var existing = document.getElementById('team-chat-typing-indicator');
    var active = Object.keys(teamTypingUsers).filter(function (name) {
        return Number(teamTypingUsers[name] || 0) > Date.now() && String(name) !== String(currentUsername);
    });
    if (!active.length) {
        if (existing) existing.remove();
        return;
    }
    if (!existing) {
        existing = document.createElement('div');
        existing.id = 'team-chat-typing-indicator';
        existing.style.cssText = 'font-size:12px;color:var(--text-muted);padding:8px 10px;';
        chatArea.appendChild(existing);
    }
    existing.innerHTML = '<i class="fa-solid fa-ellipsis"></i> ' + escapeHtml(active[0]) + ' is typing...';
    chatArea.scrollTop = chatArea.scrollHeight;
}

function updateOnlineUsers(users) {
    console.log('Updating online users:', users);
    var countEl = document.getElementById('online-count');
    if (countEl) countEl.textContent = users ? users.length : 0;

    var usersList = document.getElementById('online-users-list');
    if (usersList) {
        usersList.innerHTML = '';
        if (users && users.length > 0) {
            users.forEach(function (u) {
                var div = document.createElement('div');
                div.className = 'file-item';

                var isMe = (u.id && socket && socket.id && u.id === socket.id) || (u.socketId && socket && socket.id && u.socketId === socket.id);
                var name = escapeHtml(u.username || 'Anon');
                var avatar = u.avatarUrl
                    ? '<span class="friends-avatar" style="width:22px;height:22px;margin-right:8px;"><img src="' + escapeHtml(u.avatarUrl) + '" alt="avatar"></span>'
                    : '<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;margin-right:8px;background:' + (isMe ? 'rgba(99,102,241,.22)' : 'rgba(16,185,129,.16)') + ';font-size:11px;font-weight:700;">' + name.charAt(0).toUpperCase() + '</span>';
                div.innerHTML = avatar + name + (isMe ? ' (you)' : '');
                usersList.appendChild(div);
            });
        } else {
            usersList.innerHTML = '<div class="file-item" style="color:#888;">No other users online</div>';
        }
    }
}

function applyTextEditsToString(content, changes) {
    var text = String(content || "");
    var list = Array.isArray(changes) ? changes.slice() : [];
    list.sort(function (a, b) { return (b.rangeOffset || 0) - (a.rangeOffset || 0); });
    list.forEach(function (c) {
        var start = Math.max(0, Number(c.rangeOffset || 0));
        var len = Math.max(0, Number(c.rangeLength || 0));
        var insert = String(c.text || "");
        text = text.slice(0, start) + insert + text.slice(start + len);
    });
    return text;
}

function broadcastFileChange(fileId, content) {
    if (!window.supabaseClient || !currentRoomId) return;
    try {
        var f = localFiles.find(function (x) { return x.id === fileId; });
        var remoteId = f && f.remoteId ? f.remoteId : null;

        if (remoteId) {
            window.supabaseClient
                .from('files')
                .update({ content: content })
                .eq('id', remoteId)
                .then(function (res) {
                    if (res.error) console.error('Supabase update file error', res.error);
                });
        } else {
            window.supabaseClient
                .from('files')
                .insert([{ room_id: currentRoomId, name: f ? f.name : 'untitled.txt', content: content, lang: (f && f.lang) || 'text' }])
                .then(function (res) {
                    if (res.error) return console.error('Supabase insert file error', res.error);
                    if (res.data && res.data[0]) {
                        if (f) f.remoteId = res.data[0].id;
                    }
                });
        }
    } catch (e) {
        console.error('broadcastFileChange error:', e);
    }
}

function broadcastFileCreated(file) {
    if (!window.supabaseClient || !currentRoomId) return;
    try {
        window.supabaseClient
            .from('files')
            .insert([{ room_id: currentRoomId, name: file.name, content: file.content || '', lang: file.lang || 'text' }])
            .then(function (res) {
                if (res.error) return console.error('Supabase create file error', res.error);
                if (res.data && res.data[0]) {
                    file.remoteId = res.data[0].id;
                    renderExplorer();
                }
            });
    } catch (e) {
        console.error('broadcastFileCreated error:', e);
    }
}

function broadcastFileDeleted(fileId) {
    if (!window.supabaseClient || !currentRoomId) return;
    try {
        var f = localFiles.find(function (x) { return x.id === fileId; });
        if (f && f.remoteId) {
            window.supabaseClient
                .from('files')
                .delete()
                .eq('id', f.remoteId)
                .then(function (res) {
                    if (res.error) console.error('Supabase delete file error', res.error);
                });
        }
        localFiles = localFiles.filter(function (x) { return x.id !== fileId; });
        renderExplorer();
    } catch (e) {
        console.error('broadcastFileDeleted error:', e);
    }
}

function loadRoomFiles(files) {
    if (!files || files.length === 0) return;
    files.forEach(function (fileData) {
        var id = "remote-" + fileData.id;
        if (!localFiles.find(function (f) { return f.remoteId === fileData.id; })) {
            localFiles.push({
                id: id,
                name: fileData.name,
                content: fileData.content || '',
                lang: fileData.lang,
                remoteId: fileData.id
            });
        } else {
            var existing = localFiles.find(function (f) { return f.remoteId === fileData.id; });
            if (existing && fileData.content) existing.content = fileData.content;
        }
    });
    renderExplorer();
}

function joinRoomForCollaboration(roomId) {
    if (!window.supabaseClient) return showToast('Supabase not ready', 'error');
    currentRoomId = roomId;
    if (socket && socket.connected) {
        socket.emit('join-room', {
            HZroomId: roomId,
            username: currentUsername || 'Guest',
            avatarUrl: currentUser && currentUser.user_metadata ? (currentUser.user_metadata.avatar_url || null) : null,
            userId: currentUser ? currentUser.id : null
        });
    }

    // Ensure team chat UI is enabled when joining a room.
    try {
        if (typeof TeamChat !== 'undefined' && !TeamChat.isChatEnabled && typeof TeamChat.init === 'function') {
            TeamChat.init();
        }
    } catch (e) { }

    window.supabaseClient
        .from('files')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .then(function (res) {
            if (res.error) {
                console.error('Error loading files:', res.error);
                return;
            }
            loadRoomFiles(res.data || []);
        });

    try {
        if (window._filesSubscription && window._filesSubscription.unsubscribe) {
            window._filesSubscription.unsubscribe();
        }
        window._filesSubscription = window.supabaseClient
            .from('files:room_id=eq.' + roomId)
            .on('INSERT', payload => {
                if (!payload || !payload.new) return;
                loadRoomFiles([payload.new]);
                showToast('File created: ' + payload.new.name, 'info');
            })
            .on('UPDATE', payload => {
                if (!payload || !payload.new) return;
                var existing = localFiles.find(function (f) { return f.remoteId === payload.new.id; });
                if (existing) {
                    existing.content = payload.new.content || existing.content;
                    // Fallback sync: avoid interrupting active typing; streaming edits arrive via Socket.IO.
                    if (activeFileId === existing.id && editor) {
                        var recentlyTyped = (Date.now() - lastLocalEditAt) < 1200;
                        if (!recentlyTyped) {
                            isLocalChange = true;
                            try {
                                if (editor.getValue && editor.getValue() !== (existing.content || '')) {
                                    editor.setValue(existing.content || '');
                                }
                            } finally {
                                isLocalChange = false;
                            }
                        }
                    }
                } else {
                    loadRoomFiles([payload.new]);
                }
            })
            .on('DELETE', payload => {
                if (!payload || !payload.old) return;
                localFiles = localFiles.filter(f => f.remoteId !== payload.old.id);
                renderExplorer();
                showToast('File deleted', 'warning');
            })
            .subscribe();
    } catch (e) {
        console.error('Failed to subscribe to files realtime:', e);
    }

    try {
        if (window._messagesSubscription && window._messagesSubscription.unsubscribe) {
            window._messagesSubscription.unsubscribe();
        }
        window._messagesSubscription = window.supabaseClient
            .from('messages:room_id=eq.' + roomId)
            .on('INSERT', payload => {
                if (!payload || !payload.new) return;
                var msg = payload.new;
                try { TeamChat.addMessage(msg.username || msg.user || 'Anon', msg.text || msg.message || ''); } catch (e) { console.error(e); }
            })
            .subscribe();
    } catch (e) {
        console.error('Failed to subscribe to messages realtime:', e);
    }
}

function openRoomPasswordModal(roomId, ownerEmail) {
    pendingRoomToJoin = roomId;
    pendingRoomOwnerEmail = ownerEmail || null;
    var modal = document.getElementById('room-password-modal');
    if (modal) modal.classList.remove('hidden');

    var projectIdInput = document.getElementById('room-project-id-input');
    if (projectIdInput) {
        projectIdInput.value = roomId || '';
    }

    var input = document.getElementById('room-password-input');
    if (input) { input.value = ''; input.focus(); }

    if (input) {
        input.onkeypress = function (e) {
            if (e.key === 'Enter') {
                submitRoomPassword();
            }
        };
    }
}

function closeRoomPasswordModal() {
    pendingRoomToJoin = null;
    pendingRoomOwnerEmail = null;
    var modal = document.getElementById('room-password-modal');
    if (modal) modal.classList.add('hidden');
}

function submitRoomPassword() {
    var projectIdInput = document.getElementById('room-project-id-input');
    var input = document.getElementById('room-password-input');
    var projectId = projectIdInput ? projectIdInput.value : pendingRoomToJoin;
    var pass = input ? input.value : null;

    closeRoomPasswordModal();

    if (projectId && pass) {
        enterRoom(projectId, pass, true, pendingRoomOwnerEmail);
    } else if (projectId) {
        enterRoom(projectId, pass, true, pendingRoomOwnerEmail);
    } else {
        showToast("Project ID is required", "error");
    }
    pendingRoomToJoin = null;
}

window.submitRoomPassword = submitRoomPassword;
window.openRoomPasswordModal = openRoomPasswordModal;
window.closeRoomPasswordModal = closeRoomPasswordModal;

var CodeExecutor = {
    executeJavaScript: function (code) {
        return new Promise(function (resolve) {
            var logs = [];
            var sandboxConsole = {
                log: function () {
                    logs.push(Array.prototype.slice.call(arguments).map(function (a) { return CodeExecutor.formatOutput(a); }).join(" "));
                },
                error: function () {
                    logs.push("[ERROR] " + Array.prototype.slice.call(arguments).map(function (a) { return CodeExecutor.formatOutput(a); }).join(" "));
                },
                warn: function () {
                    logs.push("[WARN] " + Array.prototype.slice.call(arguments).map(function (a) { return CodeExecutor.formatOutput(a); }).join(" "));
                },
                info: function () {
                    logs.push("[INFO] " + Array.prototype.slice.call(arguments).map(function (a) { return CodeExecutor.formatOutput(a); }).join(" "));
                },
                clear: function () { logs = []; }
            };
            try {
                var fn = new Function("console", code);
                fn(sandboxConsole);
                resolve({ success: true, output: logs.join("\n"), error: null });
            } catch (e) {
                resolve({ success: false, output: logs.join("\n"), error: e.message });
            }
        });
    },
    formatOutput: function (obj) {
        if (obj === null) return "null";
        if (obj === undefined) return "undefined";
        if (typeof obj === "object") {
            try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
        }
        return String(obj);
    },
    executeServer: async function (language, code) {
        try {
            var response = await fetch("/api/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language: language, code: code, timeout: config.timeout })
            });
            return await response.json();
        } catch (e) {
            return { success: false, output: null, error: "Server execution failed: " + e.message };
        }
    },
    execute: async function (language, code) {
        if (language === "javascript" || language === "typescript") {
            var clientResult = await this.executeJavaScript(code);
            if (clientResult.success || config.executionMode === "client") {
                return clientResult;
            }
        }
        return await this.executeServer(language, code);
    }
};

var TabManager = {
    closedFiles: [],
    createTabElement: function (file) {
        var tab = document.createElement("div");
        tab.className = "editor-tab" + (activeFileId === file.id ? " active" : "");
        tab.dataset.fileId = file.id;
        var icon = this.getFileIcon(file.name);
        tab.innerHTML = '<span class="tab-icon"><i class="' + icon + '"></i></span>' +
            '<span class="tab-name">' + file.name + '</span>' +
            '<span class="tab-close"><i class="fa-solid fa-xmark"></i></span>';
        tab.addEventListener("click", function (e) {
            if (!e.target.closest(".tab-close")) { TabManager.activateTab(file.id); }
        });
        tab.addEventListener("dblclick", function (e) {
            if (!e.target.closest(".tab-close")) { TabManager.closeTab(file.id); }
        });
        tab.querySelector(".tab-close").addEventListener("click", function (e) {
            e.stopPropagation();
            TabManager.closeTab(file.id);
        });
        tab.querySelector(".tab-icon").addEventListener("dblclick", function (e) {
            e.stopPropagation();
            TabManager.closeTab(file.id);
        });
        return tab;
    },
    renderActivityBarIcons: function () {
        var container = document.querySelector(".activity-bar > div:first-child");
        if (!container) return;

        var baseIcons = container.querySelectorAll(".icon:not(.closed-file-icon)");
        var baseCount = baseIcons.length;

        var existingIcons = container.querySelectorAll(".closed-file-icon");
        existingIcons.forEach(function (icon) {
            var fileId = icon.dataset.closedFile;
            var stillClosed = this.closedFiles.some(function (f) { return f.id === fileId; });
            if (!stillClosed) {
                icon.remove();
            }
        }.bind(this));

        var iconsToShow = this.closedFiles.slice(-5);
        iconsToShow.forEach(function (file) {
            var existing = container.querySelector('[data-closed-file="' + file.id + '"]');
            if (!existing) {
                var iconDiv = document.createElement("div");
                iconDiv.className = "icon closed-file-icon";
                iconDiv.dataset.closedFile = file.id;
                iconDiv.title = file.name + " (click to reopen)";
                var fileIcon = TabManager.getFileIcon(file.name);
                iconDiv.innerHTML = '<i class="' + fileIcon + '"></i>';
                iconDiv.onclick = function () {
                    TabManager.reopenTab(file.id);
                };

                var allIcons = container.querySelectorAll(".icon");
                if (allIcons.length > 0) {
                    var lastBaseIcon = allIcons[Math.min(baseCount - 1, allIcons.length - 1)];
                    if (lastBaseIcon.nextSibling) {
                        container.insertBefore(iconDiv, lastBaseIcon.nextSibling);
                    } else {
                        container.appendChild(iconDiv);
                    }
                } else {
                    container.insertBefore(iconDiv, container.firstChild);
                }
            }
        }.bind(this));
    },
    reopenTab: function (fileId) {
        var file = localFiles.find(function (f) { return f.id === fileId; });
        if (file) {
            var closedIndex = this.closedFiles.findIndex(function (f) { return f.id === fileId; });
            if (closedIndex > -1) {
                this.closedFiles.splice(closedIndex, 1);
            }
            this.activateTab(fileId);
            this.renderActivityBarIcons();
        }
    },
    getFileIcon: function (filename) {
        var ext = filename.split(".").pop().toLowerCase();
        var icons = {
            "html": "fa-brands fa-html5", "css": "fa-brands fa-css3-alt",
            "js": "fa-brands fa-js", "ts": "fa-brands fa-js",
            "py": "fa-brands fa-python", "rb": "fa-brands fa-ruby",
            "php": "fa-brands fa-php", "java": "fa-brands fa-java",
            "c": "fa-solid fa-c", "cpp": "fa-solid fa-c", "cs": "fa-brands fa-microsoft",
            "go": "fa-brands fa-golang", "rs": "fa-brands fa-rust",
            "swift": "fa-brands fa-swift", "kt": "fa-brands fa-kotlin",
            "json": "fa-solid fa-code", "md": "fa-brands fa-markdown",
            "sql": "fa-solid fa-database", "sh": "fa-solid fa-terminal", "bash": "fa-solid fa-terminal",
            "default": "fa-regular fa-file"
        };
        return icons[ext] || icons["default"];
    },
    renderTabs: function () {
        var container = document.getElementById("file-tabs");
        if (!container) return;
        container.innerHTML = "";
        openTabs.forEach(function (file) {
            if (localFiles.find(function (f) { return f.id === file.id; })) {
                container.appendChild(TabManager.createTabElement(file));
            }
        });
    },
    openTab: function (fileId) {
        var file = localFiles.find(function (f) { return f.id === fileId; });
        if (!file) return;
        if (!openTabs.find(function (t) { return t.id === fileId; })) {
            openTabs.push(file);
        }
        this.renderTabs();
    },
    closeTab: function (fileId) {
        var index = openTabs.findIndex(function (t) { return t.id === fileId; });
        if (index === -1) return;

        var file = localFiles.find(function (f) { return f.id === fileId; });
        if (file && this.closedFiles.findIndex(function (f) { return f.id === fileId; }) === -1) {
            this.closedFiles.push(file);
            if (this.closedFiles.length > 10) {
                this.closedFiles.shift();
            }
            this.renderActivityBarIcons();
        }

        openTabs.splice(index, 1);
        if (activeFileId === fileId) {
            if (openTabs.length > 0) {
                var newIndex = Math.min(index, openTabs.length - 1);
                this.activateTab(openTabs[newIndex].id);
            } else {
                activeFileId = null;
                if (editor) editor.setValue("");
                document.getElementById("breadcrumbs").innerText = "No file selected";
            }
        }
        this.renderTabs();
        if (openTabs.length === 0) {
            EditorManager.maximize();
            if (editor) editor.setValue("");
        }
    },
    activateTab: function (fileId) {
        var file = localFiles.find(function (f) { return f.id === fileId; });
        if (!file) return;
        activeFileId = fileId;
        this.openTab(fileId);
        if (editor && file) {
            var ext = file.name.split(".").pop().toLowerCase();
            monaco.editor.setModelLanguage(editor.getModel(), LANGUAGE_MAP[ext] || "plaintext");
            editor.setValue(file.content || "");
            document.getElementById("breadcrumbs").innerText = file.name;
        }
        this.renderTabs();
        renderExplorer();
    }
};

var EditorManager = {
    toggleFullscreen: function () {
        var editorArea = document.querySelector(".editor-area");
        if (!editorArea) return;
        editorMaximized = !editorMaximized;
        editorArea.classList.toggle("editor-maximized", editorMaximized);
        if (editor) editor.layout();
        showToast(editorMaximized ? "Editor maximized" : "Editor restored", "info");
    },
    maximize: function () {
        var editorArea = document.querySelector(".editor-area");
        if (!editorArea) return;
        editorMaximized = true;
        editorArea.classList.add("editor-maximized");
        if (editor) editor.layout();
    },
    restore: function () {
        var editorArea = document.querySelector(".editor-area");
        if (!editorArea) return;
        editorMaximized = false;
        editorArea.classList.remove("editor-maximized");
        if (editor) editor.layout();
    },
    togglePanels: function () {
        panelsVisible = !panelsVisible;
        var panels = document.querySelector(".panels-container");
        if (panels) panels.classList.toggle("hidden", !panelsVisible);
        if (editor) editor.layout();
        showToast(panelsVisible ? "Panels shown" : "Panels hidden", "info");
    }
};

function initMobileDetection() {
    var rotateOverlay = document.getElementById("rotate-overlay");
    if (rotateOverlay) {
        rotateOverlay.style.display = "none";
    }
}

function initMobileOptimizations() {
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    var viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }

    document.addEventListener('touchstart', function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    var editorContainer = document.getElementById('monaco-editor');
    if (editorContainer) {
        editorContainer.style.touchAction = 'pan-y';
    }

    var setupMobileEvents = function () {
        window.addEventListener('resize', function () {
            var monacoEl = document.getElementById('monaco-editor');
            if (monacoEl) monacoEl.style.height = '';
            if (editor) {
                requestAnimationFrame(function () { editor.layout(); });
            }
        });
        var editorTabs = document.getElementById('file-tabs');
        if (editorTabs) {
            editorTabs.addEventListener('touchstart', function (e) {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
            editorTabs.addEventListener('click', function (e) {
                var target = e.target.closest('.editor-tab');
                if (target) {
                    var fileId = target.dataset.fileId;
                    if (fileId) {
                        TabManager.activateTab(fileId);
                    }
                }
            });
        }

        var fileList = document.getElementById('file-list-container');
        if (fileList) {
            fileList.addEventListener('touchstart', function (e) {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
            fileList.addEventListener('click', function (e) {
                var target = e.target.closest('.file-item');
                if (target) {
                    var fileId = target.dataset.fileId;
                    if (fileId) {
                        switchFile(fileId);
                    }
                }
            });
        }

        var activityBar = document.querySelector('.activity-bar');
        if (activityBar) {
            activityBar.addEventListener('touchstart', function (e) {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
            activityBar.addEventListener('click', function (e) {
                var target = e.target.closest('.icon');
                if (target) {
                    var iconType = target.dataset.iconType;
                    if (iconType) {
                        if (iconType === 'explorer') {
                            togglePanel('explorer');
                        } else if (iconType === 'users') {
                            togglePanel('users');
                        } else if (iconType === 'chat') {
                            togglePanel('chat');
                        } else if (iconType === 'ai') {
                            togglePanel('ai');
                        } else if (iconType === 'settings') {
                            openSettings();
                        } else if (iconType === 'back') {
                            returnToDashboard();
                        }
                    }
                }
            });
        }

        var toolbarActions = document.querySelector('.toolbar-actions');
        if (toolbarActions) {
            toolbarActions.addEventListener('touchstart', function (e) {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
            toolbarActions.addEventListener('click', function (e) {
                var target = e.target.closest('.action-btn');
                if (target) {
                    var actionType = target.dataset.action;
                    if (actionType) {
                        if (actionType === 'run') {
                            executeCode();
                        } else if (actionType === 'terminal') {
                            switchBottomTab('terminal');
                        } else if (actionType === 'browser') {
                            switchBottomTab('browser');
                        }
                    }
                }
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupMobileEvents);
    } else {
        setupMobileEvents();
    }
}

function setupNetworkListeners() {
    window.addEventListener("offline", function () {
        var el = document.getElementById("offline-overlay");
        if (el) el.classList.remove("hidden");
    });
    window.addEventListener("online", function () {
        var el = document.getElementById("offline-overlay");
        if (el) el.classList.add("hidden");
        showToast("We are back online!", "success");
    });
}

function loadUserSettings() {
    var saved = localStorage.kg_bekaei_config;
    if (saved) {
        try { config = Object.assign(config, JSON.parse(saved)); } catch (e) { }
    }
    initSettingsInputs();
    applyLayoutSettings();
    applyEditorSettings();
}

function toggleLoading(show) {
    var overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.className = show ? "" : "hidden";
}

function showToast(msg, type) {
    type = type || "info";
    var t = document.createElement("div");
    var color = type === "error" ? "#f40202ff" : "#03f95dff";
    t.style.cssText = "position:fixed;bottom:20px;right:20px;background:#18181b;color:white;padding:12px 24px;border-radius:6px;border-left:4px solid " + color + ";z-index:9999;";
    t.innerText = msg;
    var container = document.getElementById("toast-container");
    if (container) container.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 300); }, 3000);
}

function switchAuthTab(mode) {
    var loginForm = document.getElementById("login-form");
    var registerForm = document.getElementById("register-form");
    var loginTab = document.getElementById("tab-login-btn");
    var registerTab = document.getElementById("tab-register-btn");
    if (mode === "login") {
        if (loginForm) loginForm.classList.remove("hidden");
        if (registerForm) registerForm.classList.add("hidden");
        if (loginTab) loginTab.classList.add("active");
        if (registerTab) registerTab.classList.remove("active");
    } else {
        if (loginForm) loginForm.classList.add("hidden");
        if (registerForm) registerForm.classList.remove("hidden");
        if (loginTab) loginTab.classList.remove("active");
        if (registerTab) registerTab.classList.add("active");
    }
}

function setProfileEditMode(enabled) {
    profileEditMode = !!enabled;

    var usernameInput = document.getElementById('profile-username-input');
    var bioInput = document.getElementById('profile-bio-input');
    var saveBtn = document.getElementById('save-profile-btn');
    var uploader = document.getElementById('profile-avatar-uploader');
    var avatarChangeBtn = document.getElementById('profile-avatar-change-btn');

    if (usernameInput) usernameInput.disabled = !profileEditMode;
    if (bioInput) bioInput.disabled = !profileEditMode;

    if (saveBtn) {
        saveBtn.disabled = !profileEditMode;
        // Hide the save button unless editing (keeps profile "view-only").
        saveBtn.classList.toggle('hidden', !profileEditMode);
    }

    if (uploader) uploader.classList.toggle('hidden', !profileEditMode);

    // When not editing, make sure the uploader is not open.
    if (!profileEditMode && uploader) uploader.classList.add('hidden');

    // Keep button state purely visual; no text changes required.
    if (avatarChangeBtn) {
        avatarChangeBtn.classList.toggle('is-editing', profileEditMode);
    }
}

async function saveProfileChanges() {
    if (!currentUser) return showToast('Please login first', 'error');
    if (!profileEditMode) {
        return showToast('Click Change to edit your profile.', 'info');
    }
    var username = (document.getElementById('profile-username-input') || {}).value || '';
    var bio = (document.getElementById('profile-bio-input') || {}).value || '';
    var avatarFile = (document.getElementById('profile-avatar-input') || {}).files ? document.getElementById('profile-avatar-input').files[0] : null;
    var updates = { username: username };

    if (window.supabaseClient) {
        try {
            if (avatarFile) {
                // Use the server-side upload function instead of direct Supabase storage
                await uploadProfileAvatarFile(avatarFile);
                // The upload function already updates the user metadata, so we can skip the avatar part here
                delete updates.avatar_url;
            }
            var { data, error } = await window.supabaseClient.auth.updateUser({ data: updates });
            if (error) throw error;
            
            // Save bio to profiles table
            if (bio !== undefined) {
                const { error: bioError } = await window.supabaseClient
                    .from('profiles')
                    .upsert({ 
                        id: currentUser.id, 
                        bio: bio,
                        username: username,
                        email: currentUser.email,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                if (bioError) console.error('Error saving bio:', bioError);
            }
            
            showToast('Profile updated', 'success');
            setProfileEditMode(false);
            try {
                var session = await window.supabaseClient.auth.getUser();
                if (session && session.data && session.data.user) handleUserLogin(session.data.user);
            } catch (e) { }
            closeModal('profile-modal');
            return;
        } catch (e) {
            console.error('Profile save failed', e.message);
            showToast('Profile update failed: ' + (e.message || ''), 'error');
        }
    }
    try {
        var stored = JSON.parse(localStorage.getItem('bekaei_user_' + currentUser.id) || '{}');
        stored.user_metadata = stored.user_metadata || {};
        stored.user_metadata.username = username;
        if (avatarFile) {
            var reader = new FileReader();
            reader.onload = function (ev) {
                var preview = document.getElementById('profile-avatar-preview');
                    if (preview) {
                        preview.src = ev.target.result;
                        preview.classList.remove('hidden');
                        var initialEl = document.getElementById('profile-avatar-initial');
                        if (initialEl) initialEl.classList.add('hidden');
                    }
                stored.user_metadata.avatar_url = ev.target.result;
                localStorage.setItem('bekaei_user_' + currentUser.id, JSON.stringify(stored));
            };
            reader.readAsDataURL(avatarFile);
        } else {
            localStorage.setItem('bekaei_user_' + currentUser.id, JSON.stringify(stored));
        }
        showToast('Profile updated (local)', 'success');
        closeModal('profile-modal');
    } catch (e) { showToast('Profile save failed', 'error'); }
}

async function uploadProfileAvatarFile(avatarFile) {
    if (!currentUser) return showToast('Please login first', 'error');
    if (!avatarFile) return;

    var uploaderEl = document.getElementById('profile-avatar-uploader');
    var avatarInputEl = document.getElementById('profile-avatar-input');

    toggleLoading(true);
    try {
        // Create FormData for file upload
        var formData = new FormData();
        formData.append('avatar', avatarFile);

        // Get auth token
        var session = await window.supabaseClient.auth.getSession();
        var token = session.data.session?.access_token;
        
        if (!token) {
            throw new Error('No authentication token available');
        }

        // Upload to server endpoint
        var uploadRes = await fetch('/api/avatar/upload', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });

        var uploadResult = await uploadRes.json();

        if (!uploadRes.ok) {
            throw new Error(uploadResult.error || 'Upload failed');
        }

        var publicUrl = uploadResult.avatar_url;

        // Reload user to refresh user_metadata (so other parts of the UI update consistently).
        var userRes = await window.supabaseClient.auth.getUser();
        if (userRes && userRes.data && userRes.data.user) handleUserLogin(userRes.data.user);

        if (uploaderEl) uploaderEl.classList.add('hidden');
        if (avatarInputEl) avatarInputEl.value = '';

        showToast('Profile picture updated', 'success');
        setProfileEditMode(false);
        
        // Refresh sidebar avatar
        var sidebarAvatarImg = document.getElementById("sidebar-avatar-img");
        var sidebarAvatarInitial = document.getElementById("sidebar-avatar-initial");
        if (sidebarAvatarImg && publicUrl) {
            sidebarAvatarImg.src = publicUrl;
            sidebarAvatarImg.style.display = 'block';
            if (sidebarAvatarInitial) sidebarAvatarInitial.style.display = 'none';
        }
    } catch (e) {
        console.error('Avatar upload failed:', e);
        showToast(e && e.message ? e.message : 'Avatar upload failed', 'error');
    } finally {
        toggleLoading(false);
    }
}

function startDeleteAccountFlow() {
    var modal = document.getElementById('account-delete-modal');
    if (!modal) {
        // Fallback for older markup (should not happen in the updated UI).
        var confirmText = prompt('To permanently delete your account, type your gmail or password (this cannot be undone).');
        if (confirmText === null) return;
        performAccountDeletion();
        return;
    }

    var emailInput = document.getElementById('account-delete-email-input');
    var passwordInput = document.getElementById('account-delete-password-input');

    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    modal.classList.remove('hidden');

    // Best-effort focus (avoid breaking older browsers).
    try { if (emailInput) emailInput.focus(); } catch (e) { }
}

function closeAccountDeleteModal() {
    var modal = document.getElementById('account-delete-modal');
    if (modal) modal.classList.add('hidden');
}

async function performAccountDeletion() {
    if (!currentUser) return showToast('No user logged in', 'error');
    var userId = currentUser.id;
    var userEmail = currentUser.email;
    var remoteDeleted = false;

    try {
        // Call server endpoint to delete account from Supabase
        var response = await safeFetch('/api/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        });
        
        if (response && response.success) {
            remoteDeleted = true;
            showToast('Account deleted from server', 'success');
        }
        
        // Sign out after deletion
        if (window.supabaseClient) {
            try { await window.supabaseClient.auth.signOut(); } catch (e) { }
        }
    } catch (e) {
        console.warn('Server account deletion failed:', e.message);
        showToast('Failed to delete from server: ' + (e.message || 'Unknown error'), 'error');
        // Still proceed with local cleanup even if server deletion failed
    }

    try {
        // Always remove locally cached data
        localStorage.removeItem('bekaei_user_' + userId);
        localStorage.removeItem('bekaei_friends_' + userId);
        localStorage.removeItem('bekaei_logged_in');
        localStorage.removeItem('bekaei_user');

        var dmsPrefix = 'bekaei_dms_' + userId + '_';
        for (var i = localStorage.length - 1; i >= 0; i--) {
            var k = localStorage.key(i);
            if (k && k.indexOf(dmsPrefix) === 0) localStorage.removeItem(k);
        }

        currentUser = null;

        if (!remoteDeleted) showToast('Account data cleared locally', 'info');
        window.location.reload();
    } catch (e) {
        showToast('Failed to clear local data', 'error');
    }
}

async function confirmAccountDeletion() {
    if (!currentUser) return showToast('No user logged in', 'error');

    var emailInput = document.getElementById('account-delete-email-input');
    var passwordInput = document.getElementById('account-delete-password-input');

    var typedEmail = (emailInput && emailInput.value) ? String(emailInput.value).trim().toLowerCase() : '';
    var typedPassword = (passwordInput && passwordInput.value) ? String(passwordInput.value) : '';
    var currentEmail = (currentUser.email) ? String(currentUser.email).trim().toLowerCase() : '';

    var gmailConfirmed = typedEmail.length > 0 && typedEmail === currentEmail;
    var passwordProvided = typedPassword.length > 0;

    if (!gmailConfirmed && !passwordProvided) {
        showToast('Confirm by typing your gmail OR your password', 'error');
        return;
    }

    toggleLoading(true);
    try {
        // If password was provided (gmail didn't match), verify it by re-auth.
        if (!gmailConfirmed && passwordProvided && window.supabaseClient) {
            var signInRes = await window.supabaseClient.auth.signInWithPassword({
                email: currentUser.email,
                password: typedPassword
            });
            if (signInRes && signInRes.error) {
                throw new Error(signInRes.error.message || 'Incorrect password');
            }
        } else if (!gmailConfirmed && passwordProvided && !window.supabaseClient) {
            throw new Error('Authentication system not ready.');
        }

        closeAccountDeleteModal();
        await performAccountDeletion();
    } catch (e) {
        console.warn('Account deletion confirmation failed:', e.message);
        showToast(e.message ? ('Deletion failed: ' + e.message) : 'Deletion failed', 'error');
    } finally {
        toggleLoading(false);
    }
}

// *** FULLY UPDATED handleUserLogin FUNCTION WITH SAFE DOM CHECKS ***
function handleUserLogin(user) {
    currentUser = user;
    currentUsername = (user.user_metadata && user.user_metadata.username) || user.email.split("@")[0];

    // Load API keys immediately after login
    loadApiKeys();

    // Safe UI Toggles
    var authScreen = document.getElementById("auth-screen");
    if (authScreen) authScreen.classList.add("hidden");

    var loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) loadingOverlay.classList.add("hidden");

    var sidebarDash = document.getElementById("sidebar-dashboard");
    if (sidebarDash) {
        sidebarDash.classList.remove("hidden");
        if (window.innerWidth <= 900) sidebarDash.classList.add("active"); else sidebarDash.classList.remove("active");
    }

    var dashScreen = document.getElementById("dashboard-screen");
    if (dashScreen) dashScreen.classList.remove("hidden");

    // Profile & Name Labels
    var dashUsername = document.getElementById("dash-username");
    if (dashUsername) dashUsername.innerText = currentUsername;

    var sidebarUser = document.getElementById("sidebar-username");
    if (sidebarUser) sidebarUser.innerText = currentUsername;

    var profileDisplayName = document.getElementById("profile-display-name");
    if (profileDisplayName) profileDisplayName.innerText = currentUsername;

    var profileDisplayEmail = document.getElementById("profile-display-email");
    if (profileDisplayEmail) profileDisplayEmail.innerText = user.email;

    var profileUsernameInput = document.getElementById("profile-username-input");
    if (profileUsernameInput) profileUsernameInput.value = currentUsername;

    var profileEmailDisplay = document.getElementById("profile-email-display");
    if (profileEmailDisplay) profileEmailDisplay.value = user.email;

    // Load bio and follower counts from profiles table
    if (window.supabaseClient && currentUser) {
        window.supabaseClient
            .from('profiles')
            .select('bio')
            .eq('id', currentUser.id)
            .single()
            .then(({ data, error }) => {
                if (!error && data) {
                    var bioInput = document.getElementById('profile-bio-input');
                    if (bioInput) bioInput.value = data.bio || '';
                }
            });

        // Load follower counts
        window.supabaseClient
            .from('followers')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', currentUser.id)
            .then(({ count }) => {
                var followersCountEl = document.getElementById('profile-followers-count');
                if (followersCountEl) followersCountEl.textContent = count || 0;
            });

        window.supabaseClient
            .from('followers')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', currentUser.id)
            .then(({ count }) => {
                var followingCountEl = document.getElementById('profile-following-count');
                if (followingCountEl) followingCountEl.textContent = count || 0;
            });
    }

    // Update profile avatar (image or fallback initial letter).
    var avatarUrl = user.user_metadata && user.user_metadata.avatar_url ? user.user_metadata.avatar_url : null;
    var profileAvatarPreview = document.getElementById("profile-avatar-preview");
    var profileAvatarInitial = document.getElementById("profile-avatar-initial");
    var sidebarAvatarImg = document.getElementById("sidebar-avatar-img");
    var sidebarAvatarInitial = document.getElementById("sidebar-avatar-initial");

    if (profileAvatarInitial) profileAvatarInitial.textContent = getInitialLetter(currentUsername);
    if (sidebarAvatarInitial) sidebarAvatarInitial.textContent = getInitialLetter(currentUsername);

    if (profileAvatarPreview) {
        if (avatarUrl) {
            profileAvatarPreview.src = avatarUrl;
            profileAvatarPreview.classList.remove('hidden');
            if (profileAvatarInitial) profileAvatarInitial.classList.add('hidden');
            profileAvatarPreview.onerror = function () {
                try {
                    profileAvatarPreview.classList.add('hidden');
                    if (profileAvatarInitial) profileAvatarInitial.classList.remove('hidden');
                } catch (e) { }
            };
        } else {
            profileAvatarPreview.classList.add('hidden');
            if (profileAvatarInitial) profileAvatarInitial.classList.remove('hidden');
        }
    }

    // Update sidebar avatar
    if (sidebarAvatarImg) {
        if (avatarUrl) {
            sidebarAvatarImg.src = avatarUrl;
            sidebarAvatarImg.style.display = 'block';
            if (sidebarAvatarInitial) sidebarAvatarInitial.style.display = 'none';
            sidebarAvatarImg.onerror = function () {
                try {
                    sidebarAvatarImg.style.display = 'none';
                    if (sidebarAvatarInitial) sidebarAvatarInitial.style.display = 'block';
                } catch (e) { }
            };
        } else {
            sidebarAvatarImg.style.display = 'none';
            if (sidebarAvatarInitial) sidebarAvatarInitial.style.display = 'block';
        }
    }

    // Profile is view-only unless user explicitly clicks "Change".
    setProfileEditMode(false);

    loadProjects();
    try { updateProfileStats(); } catch (e) { } // Protect against missing elements

    localStorage.setItem('bekaei_logged_in', 'true');
    localStorage.setItem('bekaei_user', JSON.stringify(user));
    updateAdminDashboardAccess();

    setTimeout(function () {
        toggleLoading(false);
        var overlay = document.getElementById("loading-overlay");
        if (overlay) overlay.classList.add("hidden");
    }, 1500);
}

function updateProfileStats() {
    var stats = {
        projects: localFiles.length,
        collaborators: 0,
        lastActive: new Date().toLocaleDateString()
    };
    var projectsEl = document.getElementById("stat-projects");
    var collaboratorsEl = document.getElementById("stat-collaborators");
    var lastActiveEl = document.getElementById("stat-last-active");

    if (projectsEl) projectsEl.textContent = stats.projects;
    if (collaboratorsEl) collaboratorsEl.textContent = stats.collaborators;
    if (lastActiveEl) lastActiveEl.textContent = stats.lastActive;
}

function switchDashboardTab(tabName) {
    var tabs = document.querySelectorAll('.dashboard-tab');
    tabs.forEach(function (tab) {
        tab.classList.remove('active');
    });

    var selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Clear chat polling when leaving friends tab
    if (tabName !== 'friends' && friendsDashboardState.chatPollInterval) {
        clearInterval(friendsDashboardState.chatPollInterval);
        friendsDashboardState.chatPollInterval = null;
        friendsDashboardState.selectedFriendUserId = null;
        friendsDashboardState.lastLoadedFriendUserId = null;
    }

    if (tabName === 'friends') {
        try { initFriendsDashboard(); } catch (e) { }
    }

    if (tabName === 'community') {
        try { 
            if (window.community && window.community.init) {
                window.community.init();
            }
        } catch (e) { 
            console.error('[Community] Error initializing:', e);
        }
    }

    if (tabName === 'settings') {
        try { loadApiKeys(); } catch (e) { console.error('Failed to load API keys:', e); }
    }
    if (tabName === 'deploy') {
        try { loadDeployDashboard(); } catch (e) { console.error('Failed to load deploy dashboard:', e); }
    }
    if (tabName === 'admin') {
        try { loadAdminPanelData(); } catch (e) { console.error('Failed to load admin panel:', e); }
    }

    try { closeDashboardSidebar(); } catch (e) { }
}

async function updateAdminDashboardAccess() {
    var adminNav = document.getElementById('admin-panel-nav-item');
    if (!adminNav) return;
    if (!adminPanelUnlocked) {
        adminNav.classList.add('hidden');
        return;
    }
    var currentEmail = String((currentUser && currentUser.email) || '').trim().toLowerCase();
    var adminEmail = String(ADMIN_EMAIL || '').trim().toLowerCase();
    if (currentEmail && currentEmail === adminEmail) {
        adminNav.classList.remove('hidden');
        return;
    }
    if (!window.supabaseClient || !window.supabaseClient.auth) {
        adminNav.classList.add('hidden');
        return;
    }
    try {
        var sessionRes = await window.supabaseClient.auth.getSession();
        var session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
        if (!session || !session.access_token) {
            adminNav.classList.add('hidden');
            return;
        }
        var data = await safeFetch('/api/admin/me', {
            headers: { Authorization: 'Bearer ' + session.access_token }
        });
        if (data && data.isAdmin) adminNav.classList.remove('hidden');
        else adminNav.classList.add('hidden');
    } catch (e) {
        adminNav.classList.add('hidden');
    }
}

function isCurrentUserAdmin() {
    var currentEmail = String((currentUser && currentUser.email) || '').trim().toLowerCase();
    var adminEmail = String(ADMIN_EMAIL || '').trim().toLowerCase();
    return !!currentEmail && !!adminEmail && currentEmail === adminEmail;
}

function canAccessAdminPanel() {
    return !!adminPanelUnlocked && isCurrentUserAdmin();
}

async function getCurrentAccessToken() {
    if (!window.supabaseClient || !window.supabaseClient.auth) return '';
    try {
        var sessionRes = await window.supabaseClient.auth.getSession();
        var session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
        if (session && session.access_token) return session.access_token;
    } catch (e) { }
    try {
        var refreshedRes = await window.supabaseClient.auth.refreshSession();
        var refreshedSession = refreshedRes && refreshedRes.data ? refreshedRes.data.session : null;
        if (refreshedSession && refreshedSession.access_token) return refreshedSession.access_token;
    } catch (e) { }
    return '';
}

async function openAdminAnnouncements() {
    if (!canAccessAdminPanel()) {
        showToast('Access denied. Admin account only.', 'error');
        return;
    }
    try {
        var token = await getCurrentAccessToken();
        var target = '/send.html' + (token ? ('?token=' + encodeURIComponent(token)) : '');
        window.location.href = target;
    } catch (e) {
        window.location.href = '/send.html';
    }
}

function switchAdminPanelSection(sectionName) {
    var items = document.querySelectorAll('[data-admin-section]');
    items.forEach(function (item) {
        if (item.getAttribute('data-admin-section') === sectionName) item.classList.add('active');
        else item.classList.remove('active');
    });
    var sections = ['announcements', 'users', 'deployments', 'analytics', 'security'];
    sections.forEach(function (name) {
        var el = document.getElementById('admin-section-' + name);
        if (!el) return;
        if (name === sectionName) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

async function getAdminHeaders() {
    var token = await getCurrentAccessToken();
    if (!token) throw new Error('Admin session token missing. Please log in again.');
    return { Authorization: 'Bearer ' + token };
}

async function loadAdminUsersSection() {
    var container = document.getElementById('admin-section-users');
    if (!container || !canAccessAdminPanel()) return;
    container.innerHTML = '<h4>User Controls</h4><div style="color:var(--text-muted);">Loading users...</div>';
    try {
        var headers = await getAdminHeaders();
        var query = document.getElementById('admin-user-search-input');
        var q = query ? String(query.value || '').trim() : '';
        var data = await safeFetch('/api/admin/users-list?q=' + encodeURIComponent(q), { headers: headers });
        var rows = (data && data.users) ? data.users : [];
        var html = '<h4>User Controls</h4>' +
            '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
            '<input id="admin-user-search-input" class="dark-input" placeholder="Search by email" value="' + escapeHtml(q) + '">' +
            '<button class="action-btn secondary" onclick="loadAdminUsersSection()">Search</button>' +
            '</div>';
        if (!rows.length) {
            html += '<div style="color:var(--text-muted);">No users found.</div>';
        } else {
            html += rows.map(function (u) {
                var banned = !!u.banned;
                return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--border-color);border-radius:8px;margin-bottom:8px;">' +
                    '<div><strong>' + escapeHtml(u.email || 'unknown') + '</strong><div style="color:var(--text-muted);font-size:12px;">' + escapeHtml(u.id || '') + '</div></div>' +
                    '<button class="action-btn secondary" onclick="toggleAdminUserBan(\'' + escapeHtml(u.id) + '\',' + (!banned) + ')">' + (banned ? 'Unban' : 'Ban') + '</button>' +
                    '</div>';
            }).join('');
        }
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<h4>User Controls</h4><div style="color:var(--danger);">' + escapeHtml(e.message || 'Failed to load') + '</div>';
    }
}

async function toggleAdminUserBan(userId, banned) {
    try {
        var headers = await getAdminHeaders();
        headers['Content-Type'] = 'application/json';
        await safeFetch('/api/admin/users/' + encodeURIComponent(userId) + '/ban-toggle', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ banned: !!banned })
        });
        showToast('User updated', 'success');
        loadAdminUsersSection();
    } catch (e) {
        showToast(e.message || 'Action failed', 'error');
    }
}

async function loadAdminDeploymentsSection() {
    var container = document.getElementById('admin-section-deployments');
    if (!container || !canAccessAdminPanel()) return;
    container.innerHTML = '<h4>Deploy Moderation</h4><div style="color:var(--text-muted);">Loading deployments...</div>';
    try {
        var headers = await getAdminHeaders();
        var data = await safeFetch('/api/admin/deployments-list', { headers: headers });
        var rows = data.deployments || [];
        var html = '<h4>Deploy Moderation</h4>';
        html += rows.map(function (d) {
            return '<div style="padding:10px;border:1px solid var(--border-color);border-radius:8px;margin-bottom:8px;">' +
                '<div><strong>' + escapeHtml(d.project_name || d.slug || d.id) + '</strong> <span style="color:var(--text-muted);font-size:12px;">/' + escapeHtml(d.slug || '') + '</span></div>' +
                '<div style="color:var(--text-muted);font-size:12px;margin:4px 0 8px;">Status: ' + escapeHtml(d.status || '') + ' | Opens: ' + escapeHtml(d.total_opens || 0) + ' / ' + escapeHtml(d.unique_opens || 0) + '</div>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                '<button class="action-btn secondary" onclick="adminUpdateDeploymentStatus(\'' + escapeHtml(d.id) + '\',\'active\')">Activate</button>' +
                '<button class="action-btn secondary" onclick="adminUpdateDeploymentStatus(\'' + escapeHtml(d.id) + '\',\'hidden\')">Hide</button>' +
                '<button class="action-btn secondary" onclick="adminUpdateDeploymentStatus(\'' + escapeHtml(d.id) + '\',\'undeployed\')">Undeploy</button>' +
                '</div>' +
                '</div>';
        }).join('');
        if (!rows.length) html += '<div style="color:var(--text-muted);">No deployments found.</div>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<h4>Deploy Moderation</h4><div style="color:var(--danger);">' + escapeHtml(e.message || 'Failed to load') + '</div>';
    }
}

async function adminUpdateDeploymentStatus(id, status) {
    try {
        var headers = await getAdminHeaders();
        headers['Content-Type'] = 'application/json';
        await safeFetch('/api/admin/deployments/' + encodeURIComponent(id) + '/status', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ status: status })
        });
        showToast('Deployment updated', 'success');
        loadAdminDeploymentsSection();
        loadDeployDashboard();
    } catch (e) {
        showToast(e.message || 'Update failed', 'error');
    }
}

async function loadAdminAnalyticsSection() {
    var container = document.getElementById('admin-section-analytics');
    if (!container || !canAccessAdminPanel()) return;
    container.innerHTML = '<h4>Platform Analytics</h4><div style="color:var(--text-muted);">Loading metrics...</div>';
    try {
        var headers = await getAdminHeaders();
        var data = await safeFetch('/api/admin/platform-metrics', { headers: headers });
        container.innerHTML = '<h4>Platform Analytics</h4>' +
            '<div class="projects-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr));">' +
            '<div class="stat-item"><span class="stat-label">Users</span><div class="stat-value">' + escapeHtml(data.users || 0) + '</div></div>' +
            '<div class="stat-item"><span class="stat-label">Rooms</span><div class="stat-value">' + escapeHtml(data.rooms || 0) + '</div></div>' +
            '<div class="stat-item"><span class="stat-label">Deployments</span><div class="stat-value">' + escapeHtml(data.deployments || 0) + '</div></div>' +
            '<div class="stat-item"><span class="stat-label">Deploy Likes</span><div class="stat-value">' + escapeHtml(data.deploymentLikes || 0) + '</div></div>' +
            '<div class="stat-item"><span class="stat-label">Deploy Comments</span><div class="stat-value">' + escapeHtml(data.deploymentComments || 0) + '</div></div>' +
            '<div class="stat-item"><span class="stat-label">Community Posts</span><div class="stat-value">' + escapeHtml(data.posts || 0) + '</div></div>' +
            '</div>';
    } catch (e) {
        container.innerHTML = '<h4>Platform Analytics</h4><div style="color:var(--danger);">' + escapeHtml(e.message || 'Failed') + '</div>';
    }
}

async function loadAdminSecuritySection() {
    var container = document.getElementById('admin-section-security');
    if (!container || !canAccessAdminPanel()) return;
    container.innerHTML = '<h4>Security Controls</h4><div style="color:var(--text-muted);">Loading security state...</div>';
    try {
        var headers = await getAdminHeaders();
        var data = await safeFetch('/api/admin/security-state', { headers: headers });
        container.innerHTML = '<h4>Security Controls</h4>' +
            '<div style="line-height:1.8;color:var(--text-muted);">' +
            '<div>Service role configured: <strong style="color:var(--text-main);">' + escapeHtml(data.serviceRoleConfigured ? 'Yes' : 'No') + '</strong></div>' +
            '<div>SMTP configured: <strong style="color:var(--text-main);">' + escapeHtml(data.smtpConfigured ? 'Yes' : 'No') + '</strong></div>' +
            '<div>TLS strict verify: <strong style="color:var(--text-main);">' + escapeHtml(data.rejectUnauthorizedTls ? 'Enabled' : 'Disabled') + '</strong></div>' +
            '<div>Server time: <strong style="color:var(--text-main);">' + escapeHtml(data.serverTime || '') + '</strong></div>' +
            '</div>';
    } catch (e) {
        container.innerHTML = '<h4>Security Controls</h4><div style="color:var(--danger);">' + escapeHtml(e.message || 'Failed') + '</div>';
    }
}

function loadAdminPanelData() {
    if (!canAccessAdminPanel()) return;
    loadAdminUsersSection();
    loadAdminDeploymentsSection();
    loadAdminAnalyticsSection();
    loadAdminSecuritySection();
}

function initAdminUnlockFlow() {
    var passwordInput = document.getElementById('password-input');
    var unlockFlow = document.getElementById('admin-unlock-flow');
    var unlockSecretInput = document.getElementById('admin-unlock-secret-input');
    var unlockSecretBtn = document.getElementById('admin-unlock-secret-btn');
    var adminLoginFields = document.getElementById('admin-login-fields');
    var adminLoginBtn = document.getElementById('admin-login-btn');
    var adminLoginEmailInput = document.getElementById('admin-login-email-input');
    var adminLoginPasswordInput = document.getElementById('admin-login-password-input');
    var toggleAdminUnlockSecret = document.getElementById('toggle-admin-unlock-secret');
    var toggleAdminLoginEmail = document.getElementById('toggle-admin-login-email');
    var toggleAdminLoginPassword = document.getElementById('toggle-admin-login-password');
    if (!passwordInput || !unlockFlow) return;

    var checkTrigger = function () {
        var value = String(passwordInput.value || '').trim();
        if (value === ADMIN_UNLOCK_TRIGGER) {
            unlockFlow.classList.remove('hidden');
            if (unlockSecretInput) unlockSecretInput.focus();
        }
    };
    passwordInput.addEventListener('blur', checkTrigger);
    passwordInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') checkTrigger();
    });

    if (unlockSecretBtn && unlockSecretInput && adminLoginFields) {
        unlockSecretBtn.addEventListener('click', function () {
            var secret = String(unlockSecretInput.value || '').trim();
            if (secret !== ADMIN_UNLOCK_SECRET) {
                showToast('Invalid admin access password', 'error');
                return;
            }
            adminLoginFields.classList.remove('hidden');
            showToast('Admin step unlocked. Continue with admin login.', 'success');
        });
    }

    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', function () {
            var emailInput = document.getElementById('email-input');
            var passInput = document.getElementById('password-input');
            if (!emailInput || !passInput) return;
            emailInput.value = String((adminLoginEmailInput && adminLoginEmailInput.value) || '').trim();
            passInput.value = String((adminLoginPasswordInput && adminLoginPasswordInput.value) || '').trim();
            adminPanelUnlocked = true;
            performAuth('login');
        });
    }

    if (toggleAdminUnlockSecret) {
        toggleAdminUnlockSecret.style.cursor = 'pointer';
        toggleAdminUnlockSecret.addEventListener('click', function () {
            togglePasswordVisibility('admin-unlock-secret-input', 'toggle-admin-unlock-secret');
        });
    }
    if (toggleAdminLoginEmail) {
        toggleAdminLoginEmail.style.cursor = 'pointer';
        toggleAdminLoginEmail.addEventListener('click', function () {
            togglePasswordVisibility('admin-login-email-input', 'toggle-admin-login-email');
        });
    }
    if (toggleAdminLoginPassword) {
        toggleAdminLoginPassword.style.cursor = 'pointer';
        toggleAdminLoginPassword.addEventListener('click', function () {
            togglePasswordVisibility('admin-login-password-input', 'toggle-admin-login-password');
        });
    }
}

function closeDashboardSidebar() {
    var sidebar = document.getElementById("sidebar-dashboard");
    var backdrop = document.getElementById("dashboard-sidebar-backdrop");
    if (sidebar) sidebar.classList.remove("active");
    if (backdrop) backdrop.classList.add("hidden");
    document.body.classList.remove("dashboard-sidebar-open");
}

function toggleDashboardSidebar() {
    var sidebar = document.getElementById("sidebar-dashboard");
    if (!sidebar) return;
    sidebar.classList.toggle("active");
    var open = sidebar.classList.contains("active");
    var backdrop = document.getElementById("dashboard-sidebar-backdrop");
    if (backdrop) {
        if (open) backdrop.classList.remove("hidden");
        else backdrop.classList.add("hidden");
    }
    if (open) document.body.classList.add("dashboard-sidebar-open");
    else document.body.classList.remove("dashboard-sidebar-open");
}

var friendsDashboardState = {
    initialized: false,
    selectedFriendUserId: null,
    lastLoadedFriendUserId: null,
    chatPollInterval: null
};

function escapeHtml(str) {
    str = String(str || '');
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getInitialLetter(name) {
    var s = String(name || '').trim();
    if (!s) return '?';
    return s.charAt(0).toUpperCase();
}

function friendsAvatarHtml(avatarUrl, displayName) {
    var initial = escapeHtml(getInitialLetter(displayName));
    if (avatarUrl) {
        return '' +
            '<div class="friends-avatar friends-avatar--has-image">' +
            '  <img src="' + escapeHtml(avatarUrl) + '" alt="avatar" />' +
            '</div>';
    }
    return '<div class="friends-avatar friends-avatar--initial">' + initial + '</div>';
}

async function initFriendsDashboard() {
    if (!currentUser) return;
    if (friendsDashboardState.initialized) return;

    var bellBtn = document.getElementById('friends-notifications-bell-btn');
    var bellDropdown = document.getElementById('friends-notifications-dropdown');
    var sendRequestBtn = document.getElementById('friends-send-request-btn');
    var chatSendBtn = document.getElementById('friends-chat-send-btn');

    if (bellBtn && bellDropdown) {
        bellBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            bellDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', function (e) {
            if (!bellDropdown || !bellBtn) return;
            if (bellDropdown.classList.contains('hidden')) return;
            if (e && e.target && (e.target.closest('#friends-notifications-dropdown') || e.target.closest('#friends-notifications-bell-btn'))) return;
            bellDropdown.classList.add('hidden');
        });
    }

    if (sendRequestBtn) {
        sendRequestBtn.addEventListener('click', function () { sendFriendRequestByEmail(); });
    }

    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', function () { sendFriendsChatMessage(); });
    }

    friendsDashboardState.initialized = true;
    await refreshFriendsDashboard();
}

async function refreshFriendsDashboard() {
    if (!currentUser) return;

    var incomingListEl = document.getElementById('friends-incoming-requests-list');
    var acceptedListEl = document.getElementById('friends-accepted-list');
    var bellDropdown = document.getElementById('friends-notifications-dropdown');

    if (incomingListEl) incomingListEl.innerHTML = '<div style="color:var(--text-muted);">Loading...</div>';
    if (acceptedListEl) acceptedListEl.innerHTML = '<div style="color:var(--text-muted);">Loading...</div>';
    if (bellDropdown) bellDropdown.innerHTML = '<div style="color:var(--text-muted); padding:8px 6px;">Loading...</div>';

    try {
        var _a = await Promise.all([
            safeFetch('/api/friends/incoming-requests?userId=' + encodeURIComponent(currentUser.id)),
            safeFetch('/api/friends/accepted?userId=' + encodeURIComponent(currentUser.id))
        ]), incomingRes = _a[0], acceptedRes = _a[1];

        var incoming = (incomingRes && incomingRes.requests) ? incomingRes.requests : (incomingRes || []);
        var friends = (acceptedRes && acceptedRes.friends) ? acceptedRes.friends : (acceptedRes || []);

        renderIncomingRequests(incoming || []);
        renderFriendsList(friends || []);

        if (friendsDashboardState.selectedFriendUserId) {
            await loadFriendsChat(friendsDashboardState.selectedFriendUserId);
        }
    } catch (e) {
        console.error('Friends dashboard load failed:', e);
        var msg = e && e.message ? e.message : 'Failed to load';
        if (incomingListEl) incomingListEl.innerHTML = '<div style="color:var(--danger);">Failed to load requests: ' + escapeHtml(msg) + '</div>';
        if (acceptedListEl) acceptedListEl.innerHTML = '<div style="color:var(--danger);">Failed to load friends: ' + escapeHtml(msg) + '</div>';
        if (bellDropdown) bellDropdown.innerHTML = '<div style="color:var(--danger);">Failed to load: ' + escapeHtml(msg) + '</div>';
    }
}

function setFriendsNotifCount(count) {
    var badge = document.getElementById('friends-notif-count');
    if (!badge) return;
    badge.textContent = String(count || 0);
    if (count > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
}

function renderIncomingRequests(requests) {
    var incomingListEl = document.getElementById('friends-incoming-requests-list');
    var bellDropdown = document.getElementById('friends-notifications-dropdown');
    if (!incomingListEl) return;

    setFriendsNotifCount((requests || []).length);

    if (!requests || requests.length === 0) {
        incomingListEl.innerHTML = '<div style="color:var(--text-muted);">No notifications.</div>';
        if (bellDropdown) bellDropdown.innerHTML = '<div style="color:var(--text-muted); padding:8px 6px;">No notifications.</div>';
        return;
    }

    var listHtml = '';
    var dropdownHtml = '';
    requests.forEach(function (r) {
        var fromName = escapeHtml(r.from_username || r.from_email || 'Unknown');
        var fromEmail = escapeHtml(r.from_email || '');
        var requestId = escapeHtml(r.id || '');
        var fromAvatarUrl = r.from_avatar_url || null;

        var row = '' +
            '<div class="friends-notif-row" data-request-id="' + requestId + '">' +
            '  <div class="notif-left">' +
            '    ' + friendsAvatarHtml(fromAvatarUrl, fromName) +
            '    <div class="notif-meta">' +
            '      <div class="notif-text">Message from "' + fromName + '" has been unread</div>' +
            '      ' + (fromEmail ? '<div class="notif-email">' + fromEmail + '</div>' : '') +
            '    </div>' +
            '  </div>' +
            '  <div class="friends-notif-actions">' +
            '    <button class="action-btn secondary" data-action="accept" data-request-id="' + requestId + '">Accept</button>' +
            '    <button class="action-btn secondary" data-action="decline" data-request-id="' + requestId + '">Decline</button>' +
            '  </div>' +
            '</div>';

        listHtml += '<div style="margin-bottom:10px;">' + row + '</div>';
        dropdownHtml += row;
    });

    incomingListEl.innerHTML = listHtml;
    if (bellDropdown) bellDropdown.innerHTML = dropdownHtml;

    [incomingListEl, bellDropdown].forEach(function (root) {
        if (!root) return;
        root.querySelectorAll('button[data-action]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var action = btn.getAttribute('data-action');
                var requestId = btn.getAttribute('data-request-id');
                if (action === 'accept') acceptFriendRequest(requestId);
                if (action === 'decline') declineFriendRequest(requestId);
            });
        });
    });
}

function renderFriendsList(friends) {
    var acceptedListEl = document.getElementById('friends-accepted-list');
    if (!acceptedListEl) return;

    if (!friends || friends.length === 0) {
        acceptedListEl.innerHTML = '<div style="color:var(--text-muted);">No friends yet.</div>';
        return;
    }

    acceptedListEl.innerHTML = '';
    friends.forEach(function (f) {
        var friendUserId = String(f.friend_user_id || '');
        var name = escapeHtml(f.friend_username || f.friend_email || 'Friend');
        var email = escapeHtml(f.friend_email || '');
        var avatarUrl = f.friend_avatar_url || null;

        var item = document.createElement('div');
        item.className = 'friends-list-item';
        item.setAttribute('data-friend-user-id', friendUserId);
        if (friendsDashboardState.selectedFriendUserId === friendUserId) item.classList.add('active');

        item.innerHTML =
            '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;cursor:pointer;">' +
            friendsAvatarHtml(avatarUrl, name) +
            '<div class="item-meta">' +
            '  <div class="item-name">' + name + '</div>' +
            (email ? '  <div class="item-sub">' + email + '</div>' : '') +
            '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<i class="fa-solid fa-user" style="color:var(--primary);cursor:pointer;" title="View Profile" data-action="view-profile" data-friend-id="' + friendUserId + '"></i>' +
            '<i class="fa-solid fa-comment-dots" style="color:var(--primary);cursor:pointer;" title="Chat" data-action="chat" data-friend-id="' + friendUserId + '"></i>' +
            '<i class="fa-solid fa-user-minus" style="color:#ef4444;cursor:pointer;" title="Unfriend" data-action="unfriend" data-friend-id="' + friendUserId + '"></i>' +
            '</div>';

        item.addEventListener('click', function (e) {
            var action = e.target && e.target.getAttribute('data-action');
            // Don't trigger chat if clicking action buttons
            if (action === 'unfriend') {
                e.stopPropagation();
                unfriendFriend(friendUserId, name);
                return;
            }
            if (action === 'view-profile') {
                e.stopPropagation();
                viewFriendProfile(friendUserId, name, email, avatarUrl);
                return;
            }
            if (action === 'chat') {
                e.stopPropagation();
                selectFriendForChat(friendUserId, f.friend_username || f.friend_email);
                return;
            }
            selectFriendForChat(friendUserId, f.friend_username || f.friend_email);
        });
        acceptedListEl.appendChild(item);
    });
}

function selectFriendForChat(friendUserId, friendDisplayName) {
    friendsDashboardState.selectedFriendUserId = friendUserId;
    friendsDashboardState.lastLoadedFriendUserId = friendUserId;

    // Clear any existing poll interval
    if (friendsDashboardState.chatPollInterval) {
        clearInterval(friendsDashboardState.chatPollInterval);
        friendsDashboardState.chatPollInterval = null;
    }

    var titleEl = document.getElementById('friends-chat-title');
    var subtitleEl = document.getElementById('friends-chat-subtitle');
    if (titleEl) titleEl.textContent = 'Chat with ' + (friendDisplayName || 'friend');
    if (subtitleEl) subtitleEl.textContent = 'Connected — say hi!';

    var chatInput = document.getElementById('friends-chat-input');
    if (chatInput) chatInput.focus();

    loadFriendsChat(friendUserId);
    refreshFriendsTypingIndicator(friendUserId);

    // Start auto-refresh for new messages every 2 seconds
    friendsDashboardState.chatPollInterval = setInterval(function() {
        if (friendsDashboardState.selectedFriendUserId === friendUserId) {
            loadFriendsChat(friendUserId, true);
            refreshFriendsTypingIndicator(friendUserId);
        }
    }, 2000);

    document.querySelectorAll('#friends-accepted-list .friends-list-item').forEach(function (el) {
        var id = el.getAttribute('data-friend-user-id');
        if (String(id) === String(friendUserId)) el.classList.add('active');
        else el.classList.remove('active');
    });
}

async function loadFriendsChat(friendUserId, isBackgroundRefresh = false) {
    if (!friendUserId || !currentUser) return;
    if (friendsDashboardState.lastLoadedFriendUserId !== friendUserId) return;

    var messagesEl = document.getElementById('friends-chat-messages');
    if (!messagesEl) return;

    // Only show loading on initial load, not on background refresh
    if (!isBackgroundRefresh) {
        messagesEl.innerHTML = '<div style="color:var(--text-muted);">Loading messages...</div>';
    }

    try {
        var res = await safeFetch('/api/friends/messages?userId=' + encodeURIComponent(currentUser.id) +
            '&friendUserId=' + encodeURIComponent(friendUserId));

        var messages = (res && res.messages) ? res.messages : (res || []);
        
        // Check if we have new messages by comparing count or last message
        var currentMessages = messagesEl.querySelectorAll('.friends-chat-message');
        var hasNewMessages = messages.length !== currentMessages.length;
        if (!hasNewMessages && messages.length > 0) {
            var lastMsg = messages[messages.length - 1];
            var lastEl = messagesEl.lastElementChild;
            if (lastEl && lastEl.querySelector('.msg-text')) {
                hasNewMessages = lastEl.querySelector('.msg-text').textContent !== lastMsg.message;
            }
        }
        
        // Only update DOM if there are changes
        if (!hasNewMessages && isBackgroundRefresh) {
            return;
        }

        messagesEl.innerHTML = '';

        if (!messages || messages.length === 0) {
            messagesEl.innerHTML = '<div style="color:var(--text-muted);">No messages yet. Start the conversation!</div>';
            return;
        }

        messages.forEach(function (m) {
            var isMe = String(m.sender_id) === String(currentUser.id);
            var msgEl = document.createElement('div');
            msgEl.className = 'friends-chat-message' + (isMe ? ' me' : '');
            msgEl.setAttribute('data-message-id', m.id);

            var t = '';
            try {
                if (m.created_at) {
                    t = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) { }

            // Add hide button (only visible on hover)
            var hideBtn = '<i class="fa-solid fa-eye-slash msg-hide-btn" title="Hide this message" style="cursor:pointer;opacity:0.5;font-size:11px;margin-left:6px;" onclick="hideMessage(\'' + m.id + '\', \'' + friendUserId + '\')"></i>';

            msgEl.innerHTML =
                '<div class="msg-text">' + escapeHtml(m.message || '') + hideBtn + '</div>' +
                (t ? '<div class="msg-time">' + escapeHtml(t) + '</div>' : '');
            messagesEl.appendChild(msgEl);
        });

        // Smooth scroll to bottom
        messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    } catch (e) {
        if (!isBackgroundRefresh) {
            console.error('Failed to load friend chat:', e);
            messagesEl.innerHTML = '<div style="color:var(--danger);">Failed to load messages.</div>';
        }
    }
}

async function sendFriendRequestByEmail() {
    if (!currentUser) return showToast('Please login first', 'error');

    var input = document.getElementById('friends-email-input');
    var toEmail = input ? input.value : '';
    toEmail = String(toEmail || '').trim().toLowerCase();
    if (!toEmail || !toEmail.includes('@')) return showToast('Enter a valid Gmail/email', 'error');

    try {
        toggleLoading(true);
        await safeFetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromUserId: currentUser.id, toEmail: toEmail })
        });

        if (input) input.value = '';
        showToast('Friend request sent', 'success');
        await refreshFriendsDashboard();
    } catch (e) {
        console.error('Send friend request failed:', e);
        showToast(e && e.message ? e.message : 'Failed to send friend request', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function acceptFriendRequest(requestId) {
    if (!currentUser || !requestId) return;
    try {
        toggleLoading(true);
        await safeFetch('/api/friends/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: requestId, userId: currentUser.id })
        });
        showToast('Friend request accepted', 'success');
        await refreshFriendsDashboard();
    } catch (e) {
        console.error('Accept friend request failed:', e);
        showToast('Failed to accept request', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function declineFriendRequest(requestId) {
    if (!currentUser || !requestId) return;
    try {
        toggleLoading(true);
        await safeFetch('/api/friends/decline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: requestId, userId: currentUser.id })
        });
        showToast('Friend request declined', 'info');
        await refreshFriendsDashboard();
    } catch (e) {
        console.error('Decline friend request failed:', e);
        showToast('Failed to decline request', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function unfriendFriend(friendUserId, friendName) {
    if (!currentUser || !friendUserId) return;
    
    var confirmed = confirm('Are you sure you want to unfriend ' + friendName + '?');
    if (!confirmed) return;
    
    try {
        toggleLoading(true);
        await safeFetch('/api/friends/unfriend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, friendUserId: friendUserId })
        });
        showToast('Unfriended ' + friendName, 'info');
        
        // Clear selected friend if we just unfriended them
        if (friendsDashboardState.selectedFriendUserId === friendUserId) {
            friendsDashboardState.selectedFriendUserId = null;
            friendsDashboardState.lastLoadedFriendUserId = null;
            var titleEl = document.getElementById('friends-chat-title');
            var subtitleEl = document.getElementById('friends-chat-subtitle');
            var messagesEl = document.getElementById('friends-chat-messages');
            if (titleEl) titleEl.textContent = 'Chat with friends';
            if (subtitleEl) subtitleEl.textContent = 'Select a friend to start chatting.';
            if (messagesEl) messagesEl.innerHTML = '';
        }
        
        await refreshFriendsDashboard();
    } catch (e) {
        console.error('Unfriend failed:', e);
        showToast(e && e.message ? e.message : 'Failed to unfriend', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function viewFriendProfile(friendUserId, friendName, friendEmail, avatarUrl) {
    if (!friendUserId) return;
    
    // Try to fetch additional profile info from API
    var profileData = { username: friendName, email: friendEmail, avatar_url: avatarUrl };
    try {
        var res = await safeFetch('/api/user/profile?userId=' + encodeURIComponent(friendUserId));
        if (res && res.user) {
            profileData = res.user;
        }
    } catch (e) {
        // Use the data we already have from friends list
    }
    
    // Build and show the profile modal
    var modal = document.getElementById('friend-profile-modal');
    if (!modal) {
        // Create modal if it doesn't exist
        modal = document.createElement('div');
        modal.id = 'friend-profile-modal';
        modal.className = 'modal hidden';
        modal.innerHTML =
            '<div class="modal-box" style="max-width:400px;">' +
            '  <h3>Friend Profile</h3>' +
            '  <div id="friend-profile-content" style="text-align:center;padding:20px 0;">' +
            '  </div>' +
            '  <div class="modal-actions">' +
            '    <button class="action-btn" onclick="closeFriendProfileModal()">Close</button>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(modal);
    }
    
    var contentEl = document.getElementById('friend-profile-content');
    var avatarHtml = avatarUrl ?
        '<img src="' + escapeHtml(avatarUrl) + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:15px;">' :
        '<div style="width:80px;height:80px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 15px;">' +
        '  <span style="color:white;font-size:32px;font-weight:600;">' + (friendName ? friendName[0].toUpperCase() : '?') + '</span>' +
        '</div>';
    
    contentEl.innerHTML =
        avatarHtml +
        '<h4 style="margin:0 0 8px 0;font-size:1.2rem;">' + escapeHtml(profileData.username || friendName || 'Unknown') + '</h4>' +
        '<p style="color:var(--text-muted);margin:0;font-size:0.95rem;">' + escapeHtml(profileData.email || friendEmail || '') + '</p>';
    
    modal.classList.remove('hidden');
}

function closeFriendProfileModal() {
    var modal = document.getElementById('friend-profile-modal');
    if (modal) modal.classList.add('hidden');
}

async function sendFriendsChatMessage() {
    if (!currentUser) return;
    var friendUserId = friendsDashboardState.selectedFriendUserId;
    if (!friendUserId) return showToast('Select a friend to chat', 'error');

    var input = document.getElementById('friends-chat-input');
    var text = input ? String(input.value || '').trim() : '';
    if (!text) return;

    // Clear input immediately for better UX
    if (input) input.value = '';
    
    // Optimistically add message to UI
    var messagesEl = document.getElementById('friends-chat-messages');
    if (messagesEl) {
        var msgEl = document.createElement('div');
        msgEl.className = 'friends-chat-message me pending';
        var t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msgEl.innerHTML =
            '<div class="msg-text">' + escapeHtml(text) + '</div>' +
            '<div class="msg-time">' + escapeHtml(t) + ' <i class="fa-solid fa-clock" style="font-size:10px;opacity:0.5;"></i></div>';
        messagesEl.appendChild(msgEl);
        messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    }

    try {
        await safeFetch('/api/friends/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromUserId: currentUser.id, toUserId: friendUserId, message: text })
        });
        
        // Refresh chat to show confirmed message
        await loadFriendsChat(friendUserId);
        await emitFriendsTyping(false);
    } catch (e) {
        console.error('Send message failed:', e);
        showToast('Failed to send message', 'error');
        // Remove pending message on error
        if (messagesEl) {
            var pending = messagesEl.querySelector('.friends-chat-message.pending');
            if (pending) pending.remove();
        }
    }
}

async function emitFriendsTyping(isTyping) {
    if (!currentUser || !friendsDashboardState.selectedFriendUserId) return;
    try {
        await safeFetch('/api/friends/typing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromUserId: currentUser.id,
                toUserId: friendsDashboardState.selectedFriendUserId,
                isTyping: !!isTyping
            })
        });
    } catch (e) { }
}

async function refreshFriendsTypingIndicator(friendUserId) {
    if (!currentUser || !friendUserId) return;
    var subtitleEl = document.getElementById('friends-chat-subtitle');
    if (!subtitleEl) return;
    try {
        var res = await safeFetch('/api/friends/typing?userId=' + encodeURIComponent(currentUser.id) + '&friendUserId=' + encodeURIComponent(friendUserId));
        if (res && res.typing) {
            subtitleEl.innerHTML = '<i class="fa-solid fa-ellipsis"></i> Typing...';
        } else {
            subtitleEl.textContent = 'Connected - say hi!';
        }
    } catch (e) { }
}

function handleFriendsChatInput(event) {
    if (friendsTypingTimer) clearTimeout(friendsTypingTimer);
    emitFriendsTyping(true);
    friendsTypingTimer = setTimeout(function () { emitFriendsTyping(false); }, 1200);
    if (!event) return;
    if (event.key === 'Enter') {
        event.preventDefault();
        sendFriendsChatMessage();
    }
}

async function hideMessage(messageId, friendUserId) {
    if (!currentUser || !messageId || !friendUserId) return;
    
    try {
        await safeFetch('/api/friends/messages/hide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, messageId: messageId, friendUserId: friendUserId })
        });
        
        // Remove the message element from the DOM immediately
        var msgEl = document.querySelector('.friends-chat-message[data-message-id="' + messageId + '"]');
        if (msgEl) {
            msgEl.style.opacity = '0.3';
            msgEl.style.textDecoration = 'line-through';
            showToast('Message hidden', 'info');
        }
        
        // Refresh chat after a short delay
        setTimeout(function() {
            loadFriendsChat(friendUserId);
        }, 500);
    } catch (e) {
        console.error('Hide message failed:', e);
        showToast('Failed to hide message', 'error');
    }
}

async function unhideMessage(messageId, friendUserId) {
    if (!currentUser || !messageId || !friendUserId) return;
    
    try {
        await safeFetch('/api/friends/messages/unhide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, messageId: messageId, friendUserId: friendUserId })
        });
        
        showToast('Message restored', 'success');
        
        // Refresh chat to show the message again
        await loadFriendsChat(friendUserId);
    } catch (e) {
        console.error('Unhide message failed:', e);
        showToast('Failed to restore message', 'error');
    }
}

function openFriendsClearChatModal() {
    if (!currentUser) return showToast('Please login first', 'error');
    if (!friendsDashboardState.selectedFriendUserId) {
        showToast('Select a friend to manage this chat', 'warning');
        return;
    }
    openModal('friends-clear-chat-modal');
}

async function confirmFriendsClearChat(mode) {
    if (!currentUser) return showToast('Please login first', 'error');
    var friendUserId = friendsDashboardState.selectedFriendUserId;
    if (!friendUserId) return showToast('Select a friend first', 'warning');

    var m = String(mode || 'me').toLowerCase();
    if (m === 'both') {
        var ok = confirm('Delete this chat for BOTH of you? This cannot be undone.');
        if (!ok) return;
    }

    try {
        toggleLoading(true);
        await safeFetch('/api/friends/messages/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                friendUserId: friendUserId,
                mode: m
            })
        });
        closeModal('friends-clear-chat-modal');
        showToast(m === 'both' ? 'Chat deleted for both users' : 'Chat deleted for you', 'success');
        await loadFriendsChat(friendUserId);
    } catch (e) {
        console.error('Clear chat failed:', e);
        showToast('Failed to delete chat: ' + (e && e.message ? e.message : ''), 'error');
    } finally {
        toggleLoading(false);
    }
}

function openProfileModal() {
    var modal = document.getElementById('profile-modal');
    if (modal) {
        var usernameInput = document.getElementById('profile-username-input');
        var emailDisplay = document.getElementById('profile-display-email');
        var nameDisplay = document.getElementById('profile-display-name');

        if (usernameInput && currentUser) {
            usernameInput.value = (currentUser.user_metadata && currentUser.user_metadata.username) || '';
        }
        if (emailDisplay && currentUser) {
            emailDisplay.textContent = currentUser.email; // Note: if it's an input it sets textContent rather than value, but we handle value earlier too.
            if (emailDisplay.tagName === 'INPUT') emailDisplay.value = currentUser.email;
        }
        if (nameDisplay && currentUser) {
            nameDisplay.textContent = (currentUser.user_metadata && currentUser.user_metadata.username) || currentUser.email.split('@')[0];
        }

        modal.classList.remove('hidden');
    }
}

function closeProfileModal() {
    var modal = document.getElementById('profile-modal');
    if (modal) modal.classList.add('hidden');
}

function openFriendsModal() {
    var modal = document.getElementById('friends-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeFriendsModal() {
    var modal = document.getElementById('friends-modal');
    if (modal) modal.classList.add('hidden');
}

// *** FULLY UPDATED logoutUser FUNCTION WITH SAFE DOM CHECKS ***
async function logoutUser() {
    if (window.supabaseClient) {
        try { await window.supabaseClient.auth.signOut(); } catch (e) { }
    }

    // Clear all localStorage session data to prevent auto-login on refresh
    var userId = currentUser ? currentUser.id : null;
    localStorage.removeItem('bekaei_logged_in');
    localStorage.removeItem('bekaei_user');
    if (userId) {
        localStorage.removeItem('bekaei_user_' + userId);
        localStorage.removeItem('bekaei_friends_' + userId);
        // Clear any DM conversations for this user
        var dmsPrefix = 'bekaei_dms_' + userId + '_';
        for (var i = localStorage.length - 1; i >= 0; i--) {
            var k = localStorage.key(i);
            if (k && k.indexOf(dmsPrefix) === 0) localStorage.removeItem(k);
        }
    }

    currentUser = null;
    currentUsername = "Guest";
    adminPanelUnlocked = false;

    var sidebarDash = document.getElementById("sidebar-dashboard");
    if (sidebarDash) {
        sidebarDash.classList.add("hidden");
        sidebarDash.classList.remove("active");
    }

    var dashScreen = document.getElementById("dashboard-screen");
    if (dashScreen) dashScreen.classList.add("hidden");

    var mainApp = document.getElementById("main-app");
    if (mainApp) mainApp.classList.add("hidden");

    var authScreen = document.getElementById("auth-screen");
    if (authScreen) authScreen.classList.remove("hidden");

    showToast("Logged out successfully", "success");
}

function returnToDashboard() {
    if (isDemoMode) {
        endDemo();
        return;
    }

    if (currentRoomId && localFiles.length > 0) {
        var canContinue = confirm("Save changes before leaving?");
        if (canContinue) {
            ProjectStorage.saveProject();
        }
    }

    currentRoomId = null;
    localFiles = [];
    openTabs = [];
    activeFileId = null;

    if (socket) socket.disconnect();

    var sidebarDash = document.getElementById("sidebar-dashboard");
    if (sidebarDash) {
        sidebarDash.classList.remove("hidden");
        if (window.innerWidth <= 900) sidebarDash.classList.add("active"); else sidebarDash.classList.remove("active");
    }

    var dashScreen = document.getElementById("dashboard-screen");
    if (dashScreen) dashScreen.classList.remove("hidden");

    var mainApp = document.getElementById("main-app");
    if (mainApp) mainApp.classList.add("hidden");
}

function initEnhancedFeatures() {
    if (window.supabaseClientReady) {
        initEnhancedAuth();
        initEnhancedStorage();
        initEnhancedEditor();
    } else {
        window.addEventListener('supabaseReady', function () {
            initEnhancedAuth();
            initEnhancedStorage();
            initEnhancedEditor();
        });
    }
}

function initEnhancedAuth() {
    if (window.enhancedAuth) return;
    var script = document.createElement('script');
    script.src = 'features/auth-enhanced.js';
    script.onload = function () { console.log('Enhanced Auth loaded'); };
    document.head.appendChild(script);
}

function initEnhancedStorage() {
    if (window.enhancedStorage) return;
    var script = document.createElement('script');
    script.src = 'features/storage-enhanced.js';
    script.onload = function () { console.log('Enhanced Storage loaded'); };
    document.head.appendChild(script);
}

function initEnhancedEditor() {
    if (window.enhancedEditor) return;
    var script = document.createElement('script');
    script.src = 'features/editor-enhanced.js';
    script.onload = function () { console.log('Enhanced Editor loaded'); };
    document.head.appendChild(script);
}

async function loadProjects() {
    var grid = document.getElementById("projects-grid");
    if (!grid) return;
    grid.innerHTML = '<div style="color:#666">Loading projects...</div>';
    try {
        var res = await fetch("/api/my-rooms?uid=" + currentUser.id);
        var rooms = await res.json();
        grid.innerHTML = "";
        if (rooms.length === 0) {
            grid.innerHTML = '<p style="color:#666;width:100%;">No projects found. Create one!</p>';
            return;
        }
        rooms.forEach(function (room) {
            grid.appendChild(createOwnedProjectCard(room));
        });
    } catch (e) { grid.innerHTML = '<p style="color:red">Error loading projects.</p>'; }
}

function formatDeployDate(ts) {
    if (!ts) return 'Never';
    try { return new Date(ts).toLocaleString(); } catch (e) { return String(ts); }
}

function deploymentStatusBadge(status) {
    var s = String(status || 'active').toLowerCase();
    var color = s === 'active' ? '#10b981' : (s === 'hidden' ? '#f59e0b' : '#ef4444');
    return '<span class="deploy-badge" style="background:' + color + ';color:#fff;padding:2px 8px;border-radius:999px;font-size:11px;margin-left:8px;">' + escapeHtml(s) + '</span>';
}

function createOwnedProjectCard(room) {
    var div = document.createElement("div");
    div.className = "project-card";
    div.dataset.roomId = room.id;
    var lock = (room.is_public === false) ? '<i class="fa-solid fa-lock" title="Private"></i> ' : '';
    div.innerHTML = "<h4>" + lock + room.id + "</h4><p>" + (room.description || "No description") + "</p>";

    try {
        var deployBtn = document.createElement("button");
        deployBtn.className = "deploy-btn";
        deployBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Deploy';
        deployBtn.title = 'Deploy this project to Online Projects';
        deployBtn.onclick = function (e) {
            e.stopPropagation();
            deployProject(room);
        };
        div.appendChild(deployBtn);

        var deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete';
        deleteBtn.title = 'Delete project — type project name to confirm (undo available for 5s)';
        deleteBtn.onclick = function (e) {
            e.stopPropagation();
            handleDeleteClick(room, div);
        };
        div.appendChild(deleteBtn);
    } catch (e) { }

    div.onclick = function () {
        if (room.is_public === false) {
            enterRoom(room.id, null, true);
        } else {
            enterRoom(room.id);
        }
    };
    return div;
}

var pendingDeployRoom = null;
var pendingRollbackDeploymentId = null;
var currentDeploymentCommentsId = null;
var currentDeploymentCommentsSlug = null;
var lastOpenedDeploymentSlug = '';
var activeDeploySubtab = 'online';
var deploymentCommentsOffset = 0;
var deploymentCommentsLimit = 20;
var deploymentCommentsHasMore = false;
var deploymentReplyToCommentId = null;

function buildDefaultSlug(name) {
    return String(name || 'project').toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function openDeployProjectModal(room) {
    pendingDeployRoom = room || null;
    var slugInput = document.getElementById('deploy-slug-input');
    var isPublicInput = document.getElementById('deploy-public-checkbox');
    var roomDisplay = document.getElementById('deploy-project-name-display');
    if (!pendingDeployRoom || !slugInput || !isPublicInput || !roomDisplay) return;
    roomDisplay.value = String(pendingDeployRoom.id || '');
    slugInput.value = buildDefaultSlug(pendingDeployRoom.id);
    isPublicInput.checked = true;
    openModal('deploy-project-modal');
}

async function deployProject(room) {
    if (!currentUser) return showToast("Please login first", "error");
    openDeployProjectModal(room);
}

async function submitDeployProjectModal() {
    if (!currentUser) return showToast("Please login first", "error");
    if (!pendingDeployRoom) return showToast('No project selected', 'error');
    var slugInput = document.getElementById('deploy-slug-input');
    var isPublicInput = document.getElementById('deploy-public-checkbox');
    if (!slugInput || !isPublicInput) return;
    var slug = String(slugInput.value || '').trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    if (!slug) return showToast('Slug is required', 'error');
    try {
        toggleLoading(true);
        await safeFetch('/api/deploy-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: pendingDeployRoom.id,
                userId: currentUser.id,
                slug: slug,
                isPublic: !!isPublicInput.checked
            })
        });
        closeModal('deploy-project-modal');
        showToast('Project deployed successfully', 'success');
        loadDeployDashboard();
    } catch (e) {
        showToast('Deploy failed: ' + (e.message || 'Unknown error'), 'error');
    } finally {
        toggleLoading(false);
    }
}

async function rollbackDeployment(deploymentId) {
    if (!currentUser) return showToast("Please login first", "error");
    var versions = [];
    try {
        versions = await safeFetch('/api/deployments/' + encodeURIComponent(deploymentId) + '/versions?uid=' + encodeURIComponent(currentUser.id));
    } catch (e) {
        showToast('Could not load deployment history', 'error');
        return;
    }
    if (!versions || !versions.length) return showToast('No version history found for this deployment', 'error');
    var select = document.getElementById('rollback-version-select');
    if (!select) return;
    select.innerHTML = '';
    versions.forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = String(v.id);
        opt.textContent = 'v' + v.version_number + ' - ' + formatDeployDate(v.created_at);
        select.appendChild(opt);
    });
    pendingRollbackDeploymentId = deploymentId;
    openModal('rollback-deployment-modal');
}

async function submitRollbackDeploymentModal() {
    if (!currentUser) return showToast("Please login first", "error");
    if (!pendingRollbackDeploymentId) return;
    var select = document.getElementById('rollback-version-select');
    var versionId = select ? String(select.value || '') : '';
    if (!versionId) return showToast('Select a version', 'error');
    try {
        await safeFetch('/api/deployments/' + encodeURIComponent(pendingRollbackDeploymentId) + '/rollback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, versionId: versionId })
        });
        closeModal('rollback-deployment-modal');
        showToast('Rollback successful', 'success');
        loadDeployDashboard();
    } catch (e) {
        showToast('Rollback failed: ' + (e.message || 'Unknown error'), 'error');
    }
}

async function setDeploymentVisibility(deploymentId, isPublic) {
    if (!currentUser) return showToast("Please login first", "error");
    try {
        await safeFetch('/api/deployments/' + encodeURIComponent(deploymentId) + '/visibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, isPublic: !!isPublic })
        });
        showToast('Visibility updated', 'success');
        loadDeployDashboard();
    } catch (e) {
        showToast('Update failed: ' + (e.message || 'Unknown error'), 'error');
    }
}

async function setDeploymentStatus(deploymentId, status) {
    if (!currentUser) return showToast("Please login first", "error");
    try {
        await safeFetch('/api/deployments/' + encodeURIComponent(deploymentId) + '/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, status: status })
        });
        showToast('Status updated', 'success');
        loadDeployDashboard();
    } catch (e) {
        showToast('Status update failed: ' + (e.message || 'Unknown error'), 'error');
    }
}

function openDeploymentSlug(slug) {
    if (!slug) return;
    lastOpenedDeploymentSlug = String(slug);
    var titleEl = document.getElementById('deployment-browser-title');
    var frame = document.getElementById('deployment-browser-frame');
    if (!frame) return;
    if (titleEl) titleEl.textContent = 'Deployment Browser - /p/' + String(slug);
    frame.src = '/p/' + encodeURIComponent(slug);
    openModal('deployment-browser-modal');
}

function openDeploymentBrowserFromToolbar() {
    if (!lastOpenedDeploymentSlug) return showToast('Open a deployment first', 'warning');
    openDeploymentSlug(lastOpenedDeploymentSlug);
}

function switchDeploySubtab(subtab) {
    var target = (subtab === 'settings') ? 'settings' : 'online';
    activeDeploySubtab = target;
    var buttons = document.querySelectorAll('.deploy-subtab-btn');
    buttons.forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.deploySubtab === target);
    });
    var onlinePanel = document.getElementById('deploy-online-subtab');
    var settingsPanel = document.getElementById('deploy-settings-subtab');
    if (onlinePanel) onlinePanel.classList.toggle('active', target === 'online');
    if (settingsPanel) settingsPanel.classList.toggle('active', target === 'settings');
}

async function loadDeployDashboard() {
    var myGrid = document.getElementById("my-deployments-grid");
    var publicGrid = document.getElementById("public-deployments-grid");
    if (!myGrid || !publicGrid) return;
    switchDeploySubtab(activeDeploySubtab);
    myGrid.innerHTML = '<div style="color:#666">Loading my deployments...</div>';
    publicGrid.innerHTML = '<div style="color:#666">Loading online projects...</div>';

    try {
        var deploySortEl = document.getElementById('deploy-sort-select');
        var deploySort = deploySortEl ? String(deploySortEl.value || 'newest') : 'newest';
        var responses = await Promise.all([
            safeFetch('/api/deployments/mine?uid=' + encodeURIComponent(currentUser.id)),
            safeFetch('/api/deployments/public?sort=' + encodeURIComponent(deploySort))
        ]);
        var myProjects = responses[0] || [];
        var projects = responses[1] || [];

        myGrid.innerHTML = '';
        if (!myProjects || !myProjects.length) {
            myGrid.innerHTML = '<p style="color:#666;width:100%;">No deployments yet.</p>';
        } else {
            myProjects.forEach(function (project) {
                var div = document.createElement("div");
                div.className = "project-card deployment-card";
                var status = deploymentStatusBadge(project.status);
                var visibility = project.is_public ? 'Public' : 'Private';
                div.innerHTML =
                    "<h4><i class='fa-solid fa-rocket'></i> " + escapeHtml(project.project_name || project.room_id || 'Untitled') + status + "</h4>" +
                    "<p>" + escapeHtml(project.description || "No description") + "</p>" +
                    "<p style='margin-top:8px;font-size:12px;color:#64748b;'>Slug: /p/" + escapeHtml(project.slug || '') + "</p>" +
                    "<p style='margin-top:4px;font-size:12px;color:#64748b;'>Version: " + escapeHtml(project.current_version || 1) + " | " + visibility + "</p>" +
                    "<p style='margin-top:4px;font-size:12px;color:#64748b;'>Last deployed: " + escapeHtml(formatDeployDate(project.last_deployed_at)) + "</p>" +
                    "<p style='margin-top:4px;font-size:12px;color:#64748b;'>Opens: " + escapeHtml(project.total_opens || 0) + " | Unique: " + escapeHtml(project.unique_opens || 0) + "</p>" +
                    "<div class='deployment-engagement' id='deployment-settings-engagement-" + escapeHtml(project.id) + "' style='margin-top:10px;font-size:12px;color:#64748b;'>Loading likes/comments...</div>";

                var actions = document.createElement("div");
                actions.className = "deployment-actions";

                var openBtn = document.createElement("button");
                openBtn.className = "action-btn secondary deployment-action-btn";
                openBtn.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i> Open';
                openBtn.onclick = function (e) { e.stopPropagation(); openDeploymentSlug(project.slug); };
                actions.appendChild(openBtn);

                var rollbackBtn = document.createElement("button");
                rollbackBtn.className = "action-btn secondary deployment-action-btn";
                rollbackBtn.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Rollback';
                rollbackBtn.onclick = function (e) { e.stopPropagation(); rollbackDeployment(project.id); };
                actions.appendChild(rollbackBtn);

                var visibilityBtn = document.createElement("button");
                visibilityBtn.className = "action-btn secondary deployment-action-btn";
                visibilityBtn.innerHTML = project.is_public ? '<i class="fa-solid fa-eye-slash"></i> Private' : '<i class="fa-solid fa-eye"></i> Public';
                visibilityBtn.onclick = function (e) { e.stopPropagation(); setDeploymentVisibility(project.id, !project.is_public); };
                actions.appendChild(visibilityBtn);

                var hideBtn = document.createElement("button");
                hideBtn.className = "action-btn secondary deployment-action-btn";
                hideBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Undeploy';
                hideBtn.onclick = function (e) { e.stopPropagation(); setDeploymentStatus(project.id, 'undeployed'); };
                actions.appendChild(hideBtn);

                var commentsBtn = document.createElement("button");
                commentsBtn.className = "action-btn secondary deployment-action-btn";
                commentsBtn.innerHTML = '<i class="fa-regular fa-comments"></i> View Comments';
                commentsBtn.onclick = function (e) { openDeploymentComments(e, project.id); };
                actions.appendChild(commentsBtn);

                div.appendChild(actions);

                div.onclick = function () { openDeploymentSlug(project.slug); };
                myGrid.appendChild(div);
                loadDeploymentEngagement(project.id, 'deployment-settings-engagement-' + project.id, 'settings');
            });
        }

        publicGrid.innerHTML = '';
        if (!projects || !projects.length) {
            publicGrid.innerHTML = '<p style="color:#666;width:100%;">No online projects yet.</p>';
            return;
        }
        projects.forEach(function (project) {
            var div = document.createElement("div");
            div.className = "project-card online-project-card deployment-card community-post";
            div.dataset.deploymentId = project.id;
            var ownerProfile = project.owner_profile || null;
            var ownerAvatar = ownerProfile && ownerProfile.avatar_url ? ownerProfile.avatar_url : '';
            var ownerInitial = ((ownerProfile && ownerProfile.username) || 'U').charAt(0).toUpperCase();
            div.innerHTML =
                "<div style='display:flex;align-items:center;gap:10px;'>" +
                "<div class='deploy-owner-avatar' title='Click for full owner detail' onclick=\"openUserProfileCard(event,'" + escapeHtml(project.owner_id || '') + "')\">" +
                (ownerAvatar ? "<img src='" + escapeHtml(ownerAvatar) + "' alt='owner avatar' style='width:34px;height:34px;border-radius:50%;object-fit:cover;' />" : "<span style='width:34px;height:34px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--primary);color:#fff;font-weight:700;'>" + escapeHtml(ownerInitial) + "</span>") +
                "</div>" +
                "<h4 style='margin:0;'><i class='fa-solid fa-globe'></i> " + escapeHtml(project.project_name || project.room_id || 'Untitled') + "</h4>" +
                "</div>" +
                "<p>" + escapeHtml(project.description || "No description") + "</p>" +
                "<p class='deployment-owner'><i class='fa-regular fa-user'></i> " + escapeHtml(project.owner_username || project.owner_email || 'Project owner') + "</p>" +
                "<p style='margin-top:8px;font-size:12px;color:#64748b;'>/" + "p/" + escapeHtml(project.slug || '') + "</p>" +
                "<p style='margin-top:4px;font-size:12px;color:#64748b;'>Version: " + escapeHtml(project.current_version || 1) + " | Last deployed: " + escapeHtml(formatDeployDate(project.last_deployed_at)) + "</p>" +
                "<p style='margin-top:4px;font-size:12px;color:#64748b;'>Opens: " + escapeHtml(project.total_opens || 0) + " | Unique: " + escapeHtml(project.unique_opens || 0) + "</p>" +
                "<div class='deployment-engagement' id='deployment-engagement-" + escapeHtml(project.id) + "' style='margin-top:10px;font-size:12px;color:#64748b;'>Loading likes/comments...</div>" +
                "<div class='deployment-comments-dropdown' id='deployment-comments-dropdown-" + escapeHtml(project.id) + "' style='display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);'>" +
                "<div id='deployment-comments-list-" + escapeHtml(project.id) + "' style='max-height:300px;overflow-y:auto;padding:8px 0;'><div style='color:var(--text-muted);text-align:center;'>Loading comments...</div></div>" +
                "<div style='display:flex;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-color);'>" +
                "<input type='text' id='deployment-comment-input-" + escapeHtml(project.id) + "' class='dark-input' placeholder='Add a comment...' style='flex:1;padding:8px;font-size:13px;' onkeypress='if(event.key===\"Enter\")sendDeploymentComment(event,\"" + escapeHtml(project.id) + "\")' />" +
                "<button class='action-btn secondary' style='padding:8px 12px;font-size:12px;' onclick='sendDeploymentComment(event,\"" + escapeHtml(project.id) + "\")'><i class='fa-solid fa-paper-plane'></i></button>" +
                "</div></div>";
            var openBtn = document.createElement("button");
            openBtn.className = "action-btn secondary deployment-action-btn";
            openBtn.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i> Open Browser';
            openBtn.title = 'Open browser-only preview';
            openBtn.onclick = function (e) {
                e.stopPropagation();
                openDeploymentSlug(project.slug);
            };
            var actions = document.createElement('div');
            actions.className = 'deployment-actions';
            actions.appendChild(openBtn);
            var openCommentsBtn = document.createElement("button");
            openCommentsBtn.className = "action-btn secondary deployment-action-btn";
            openCommentsBtn.innerHTML = '<i class="fa-solid fa-chevron-down" id="deployment-comments-arrow-' + escapeHtml(project.id) + '" style="transition:transform 0.3s;"></i> Comments';
            openCommentsBtn.onclick = function (e) { toggleDeploymentCommentsDropdown(e, project.id); };
            actions.appendChild(openCommentsBtn);

            div.appendChild(actions);

            div.onclick = function () {
                openDeploymentSlug(project.slug);
            };
            publicGrid.appendChild(div);
            try { loadDeploymentEngagement(project.id); } catch (engErr) { }
        });
    } catch (e) {
        myGrid.innerHTML = '<p style="color:red">Failed to load deployments.</p>';
        publicGrid.innerHTML = '<p style="color:red">Failed to load online projects.</p>';
    }
}

async function loadDeploymentEngagement(deploymentId, targetElementId, mode) {
    var el = targetElementId
        ? document.getElementById(targetElementId)
        : document.getElementById('deployment-engagement-' + deploymentId);
    if (!el) return;
    try {
        var uid = currentUser && currentUser.id ? String(currentUser.id) : '';
        var data = await safeFetch('/api/deployments/' + encodeURIComponent(deploymentId) + '/engagement?uid=' + encodeURIComponent(uid));
        var liked = !!data.likedByCurrentUser;
        if (mode === 'settings') {
            el.innerHTML = '' +
                '<div class="deployment-setting-stats">' +
                '<div class="deployment-setting-stat"><div class="stat-label">Likes</div><div class="stat-value">' + escapeHtml(data.likes || 0) + '</div></div>' +
                '<div class="deployment-setting-stat"><div class="stat-label">Comments</div><div class="stat-value">' + escapeHtml(data.comments || 0) + '</div></div>' +
                '</div>';
            return;
        }
        el.innerHTML = '' +
            '<button class="action-btn secondary" style="padding:6px 10px;font-size:12px;" onclick="toggleDeploymentLike(event,\'' + escapeHtml(deploymentId) + '\')">' +
            (liked ? '<i class="fa-solid fa-heart"></i> Liked' : '<i class="fa-regular fa-heart"></i> Like') +
            '</button> ' +
            '<span style="margin-left:8px;">Likes: ' + escapeHtml(data.likes || 0) + ' | Comments: ' + escapeHtml(data.comments || 0) + '</span>';
    } catch (e) {
        el.innerHTML = 'Likes/comments unavailable';
    }
}

async function refreshDeploymentEngagementViews(deploymentId) {
    await Promise.allSettled([
        loadDeploymentEngagement(deploymentId),
        loadDeploymentEngagement(deploymentId, 'deployment-settings-engagement-' + deploymentId, 'settings')
    ]);
}

async function toggleDeploymentLike(event, deploymentId) {
    if (event) event.stopPropagation();
    if (!currentUser) return showToast('Please login first', 'error');
    try {
        await safeFetch('/api/deployments/' + encodeURIComponent(deploymentId) + '/like-toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });
        await refreshDeploymentEngagementViews(deploymentId);
    } catch (e) {
        showToast('Like action failed', 'error');
    }
}

async function openDeploymentComments(event, deploymentId) {
    if (event) event.stopPropagation();
    if (!currentUser) return showToast('Please login first', 'error');
    currentDeploymentCommentsId = deploymentId;
    deploymentCommentsOffset = 0;
    deploymentReplyToCommentId = null;
    try {
        var data = await safeFetch('/api/deployments/' + encodeURIComponent(deploymentId) + '/comments?limit=' + deploymentCommentsLimit + '&offset=0');
        var comments = data && data.comments ? data.comments : [];
        deploymentCommentsHasMore = !!(data && data.pagination && data.pagination.hasMore);
        renderDeploymentComments(comments || [], true);
        openModal('deployment-comments-modal');
    } catch (e) {
        showToast('Comment action failed', 'error');
    }
}

function renderDeploymentComments(comments, reset) {
    var list = document.getElementById('deployment-comments-list');
    if (!list) return;
    if (!comments || !comments.length) {
        if (!reset) return;
        list.innerHTML = '<div style="color:var(--text-muted);padding:8px;">No comments yet.</div>';
        return;
    }
    var grouped = {};
    (comments || []).forEach(function (c) {
        var key = c.reply_to_comment_id ? String(c.reply_to_comment_id) : 'root';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
    });
    var roots = grouped.root || [];
    var html = roots.map(function (c) {
        var replies = grouped[String(c.id)] || [];
        return '<div style="border-bottom:1px solid var(--border-color);padding:8px 4px;" oncontextmenu="setDeploymentReplyTarget(\'' + escapeHtml(c.id) + '\');return false;">' +
            '<div style="font-weight:600;font-size:12px;">' + escapeHtml(c.username || 'User') + ' <span style="color:var(--text-muted);font-weight:400;">' + escapeHtml(formatDeployDate(c.created_at)) + '</span></div>' +
            '<div style="font-size:13px;margin-top:4px;">' + escapeHtml(c.comment || '') + '</div>' +
            '<div style="display:flex;gap:8px;margin-top:6px;">' +
            '<button class="action-btn secondary" style="padding:4px 8px;font-size:11px;" onclick="setDeploymentReplyTarget(\'' + escapeHtml(c.id) + '\')">Reply</button>' +
            '<button class="action-btn secondary" style="padding:4px 8px;font-size:11px;" onclick="deleteDeploymentComment(\'' + escapeHtml(c.id) + '\',\'' + escapeHtml(c.user_id || '') + '\')">Delete</button>' +
            '</div>' +
            (replies.length ? '<details style="margin-top:6px;"><summary style="cursor:pointer;color:var(--text-muted);font-size:12px;">Replies (' + replies.length + ')</summary>' +
                replies.map(function (r) {
                    return '<div style="margin-top:6px;margin-left:14px;padding-left:10px;border-left:2px solid var(--border-color);" oncontextmenu="setDeploymentReplyTarget(\'' + escapeHtml(r.id) + '\');return false;">' +
                        '<div style="font-weight:600;font-size:12px;">' + escapeHtml(r.username || 'User') + ' <span style="color:var(--text-muted);font-weight:400;">' + escapeHtml(formatDeployDate(r.created_at)) + '</span></div>' +
                        '<div style="font-size:13px;margin-top:4px;">' + escapeHtml(r.comment || '') + '</div>' +
                        '<div style="display:flex;gap:8px;margin-top:6px;">' +
                        '<button class="action-btn secondary" style="padding:4px 8px;font-size:11px;" onclick="setDeploymentReplyTarget(\'' + escapeHtml(r.id) + '\')">Reply</button>' +
                        '<button class="action-btn secondary" style="padding:4px 8px;font-size:11px;" onclick="deleteDeploymentComment(\'' + escapeHtml(r.id) + '\',\'' + escapeHtml(r.user_id || '') + '\')">Delete</button>' +
                        '</div>' +
                        '</div>';
                }).join('') +
                '</details>' : '') +
            '</div>';
    }).join('');
    if (reset) list.innerHTML = html;
    else list.innerHTML += html;
    if (deploymentCommentsHasMore) {
        list.innerHTML += '<div style="padding:8px;text-align:center;"><button class="action-btn secondary" style="font-size:12px;" onclick="loadMoreDeploymentComments()">Load more comments</button></div>';
    }
}

function setDeploymentReplyTarget(commentId) {
    deploymentReplyToCommentId = commentId ? String(commentId) : null;
    var input = document.getElementById('deployment-comment-input');
    if (input) {
        input.placeholder = deploymentReplyToCommentId ? ('Replying to comment #' + deploymentReplyToCommentId + ' (right click any comment in thread to reply quickly)') : 'Write a comment...';
        try { input.focus(); } catch (e) { }
    }
}

async function loadMoreDeploymentComments() {
    if (!currentDeploymentCommentsId || !deploymentCommentsHasMore) return;
    deploymentCommentsOffset += deploymentCommentsLimit;
    try {
        var data = await safeFetch('/api/deployments/' + encodeURIComponent(currentDeploymentCommentsId) + '/comments?limit=' + deploymentCommentsLimit + '&offset=' + deploymentCommentsOffset);
        var comments = data && data.comments ? data.comments : [];
        deploymentCommentsHasMore = !!(data && data.pagination && data.pagination.hasMore);
        var list = document.getElementById('deployment-comments-list');
        if (list) {
            list.querySelectorAll('button').forEach(function (btn) {
                if (String(btn.textContent || '').toLowerCase().indexOf('load more comments') >= 0) {
                    btn.parentElement.remove();
                }
            });
        }
        renderDeploymentComments(comments || [], false);
    } catch (e) {
        showToast('Failed to load more comments', 'error');
    }
}

async function deleteDeploymentComment(commentId, commentOwnerId) {
    if (!currentUser || !commentId) return;
    if (String(commentOwnerId || '') !== String(currentUser.id || '')) {
        if (!confirm('Delete this comment as deployment owner/moderator?')) return;
    } else if (!confirm('Delete this comment?')) return;
    try {
        await safeFetch('/api/deployments/' + encodeURIComponent(currentDeploymentCommentsId) + '/comments/' + encodeURIComponent(commentId) + '?userId=' + encodeURIComponent(currentUser.id), {
            method: 'DELETE'
        });
        deploymentCommentsOffset = 0;
        var data = await safeFetch('/api/deployments/' + encodeURIComponent(currentDeploymentCommentsId) + '/comments?limit=' + deploymentCommentsLimit + '&offset=0');
        deploymentCommentsHasMore = !!(data && data.pagination && data.pagination.hasMore);
        renderDeploymentComments((data && data.comments) || [], true);
        await refreshDeploymentEngagementViews(currentDeploymentCommentsId);
    } catch (e) {
        showToast('Failed to delete comment', 'error');
    }
}

async function submitDeploymentComment() {
    if (!currentDeploymentCommentsId || !currentUser) return;
    var input = document.getElementById('deployment-comment-input');
    var text = input ? String(input.value || '').trim() : '';
    if (!text) return showToast('Write a comment first', 'warning');
    try {
        await safeFetch('/api/deployments/' + encodeURIComponent(currentDeploymentCommentsId) + '/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                username: currentUser.username || currentUser.email || 'User',
                comment: text,
                replyToCommentId: deploymentReplyToCommentId
            })
        });
        if (input) input.value = '';
        deploymentReplyToCommentId = null;
        setDeploymentReplyTarget(null);
        deploymentCommentsOffset = 0;
        var commentsData = await safeFetch('/api/deployments/' + encodeURIComponent(currentDeploymentCommentsId) + '/comments?limit=' + deploymentCommentsLimit + '&offset=0');
        deploymentCommentsHasMore = !!(commentsData && commentsData.pagination && commentsData.pagination.hasMore);
        renderDeploymentComments((commentsData && commentsData.comments) || [], true);
        await refreshDeploymentEngagementViews(currentDeploymentCommentsId);
    } catch (e) {
        showToast('Comment action failed', 'error');
    }
}

function toggleDeploymentCommentsDropdown(event, deploymentId) {
    if (event) event.stopPropagation();
    var dropdown = document.getElementById('deployment-comments-dropdown-' + deploymentId);
    var arrow = document.getElementById('deployment-comments-arrow-' + deploymentId);
    if (!dropdown || !arrow) return;
    
    var isVisible = dropdown.style.display !== 'none';
    dropdown.style.display = isVisible ? 'none' : 'block';
    arrow.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    
    if (!isVisible) {
        loadDeploymentCommentsInline(deploymentId);
    }
}

async function loadDeploymentCommentsInline(deploymentId) {
    var commentsList = document.getElementById('deployment-comments-list-' + deploymentId);
    if (!commentsList) return;
    
    try {
        var data = await safeFetch('/api/deployments/' + encodeURIComponent(deploymentId) + '/comments?limit=10&offset=0');
        var comments = data && data.comments ? data.comments : [];
        renderDeploymentCommentsInline(comments, deploymentId);
    } catch (e) {
        if (commentsList) commentsList.innerHTML = '<div style="color:var(--text-muted);text-align:center;">Failed to load comments</div>';
    }
}

function renderDeploymentCommentsInline(comments, deploymentId) {
    var commentsList = document.getElementById('deployment-comments-list-' + deploymentId);
    if (!commentsList) return;
    
    if (!comments || !comments.length) {
        commentsList.innerHTML = '<div style="color:var(--text-muted);text-align:center;">No comments yet</div>';
        return;
    }
    
    commentsList.innerHTML = comments.map(function(comment) {
        var timeAgo = formatDeployDate(comment.created_at);
        return '<div style="padding:8px;border-bottom:1px solid var(--border-color);" id="deployment-comment-' + escapeHtml(comment.id) + '">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<strong style="font-size:13px;">' + escapeHtml(comment.username || 'Anonymous') + '</strong>' +
            '<span style="font-size:11px;color:#64748b;">' + escapeHtml(timeAgo) + '</span>' +
            '</div>' +
            '<button class="action-btn secondary" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();setInlineDeploymentReply(\'' + escapeHtml(deploymentId) + '\',\'' + escapeHtml(comment.id) + '\',\'' + escapeHtml(comment.username || 'Anonymous') + '\')">Reply</button>' +
            '</div>' +
            '<div style="font-size:13px;">' + escapeHtml(comment.comment || '') + '</div>' +
            '</div>';
    }).join('');
}

function setInlineDeploymentReply(deploymentId, commentId, username) {
    var input = document.getElementById('deployment-comment-input-' + deploymentId);
    if (!input) return;
    input.dataset.replyToCommentId = commentId;
    input.placeholder = 'Replying to ' + escapeHtml(username) + '...';
    input.focus();
}

async function sendDeploymentComment(event, deploymentId) {
    if (event) event.stopPropagation();
    if (!currentUser) return showToast('Please login first', 'error');
    
    var input = document.getElementById('deployment-comment-input-' + deploymentId);
    var text = input ? String(input.value || '').trim() : '';
    if (!text) return showToast('Write a comment first', 'warning');
    
    var replyToCommentId = input ? (input.dataset.replyToCommentId || null) : null;
    
    try {
        await safeFetch('/api/deployments/' + encodeURIComponent(deploymentId) + '/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                username: currentUser.username || currentUser.email || 'User',
                comment: text,
                replyToCommentId: replyToCommentId
            })
        });
        if (input) {
            input.value = '';
            input.placeholder = 'Add a comment...';
            delete input.dataset.replyToCommentId;
        }
        loadDeploymentCommentsInline(deploymentId);
        loadDeploymentEngagement(deploymentId);
        showToast('Comment added', 'success');
    } catch (e) {
        showToast('Failed to add comment', 'error');
    }
}

async function openUserProfileCard(event, userId) {
    if (event) event.stopPropagation();
    if (!userId) return;
    // Use the enhanced community profile modal if available
    if (window.community && window.community.viewUserProfile) {
        window.community.viewUserProfile(userId);
        return;
    }
    // Fallback to simple profile view
    try {
        var data = await safeFetch('/api/user/profile?userId=' + encodeURIComponent(userId));
        var content = document.getElementById('thread-view-content');
        var title = document.getElementById('thread-view-title');
        if (!content || !title) return;
        title.textContent = 'User Profile';
        var avatar = data.avatar_url
            ? "<img src='" + escapeHtml(data.avatar_url) + "' alt='avatar' style='width:72px;height:72px;border-radius:50%;object-fit:cover;' />"
            : "<div style='width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--primary);color:#fff;font-weight:700;font-size:28px;'>" + escapeHtml((data.username || 'U').charAt(0).toUpperCase()) + "</div>";
        content.innerHTML = "<div style='display:flex;align-items:center;gap:12px;'>" + avatar +
            "<div><div><strong>" + escapeHtml(data.username || 'Unknown') + "</strong></div>" +
            "<div style='color:var(--text-muted);font-size:13px;'>" + escapeHtml(data.email || '') + "</div>" +
            "<div style='color:var(--text-muted);font-size:12px;'>User ID: " + escapeHtml(data.id || '') + "</div></div></div>";
        openModal('thread-view-modal');
    } catch (e) {
        showToast('Could not load user profile', 'error');
    }
}

async function openDeploymentThreadView() {
    try {
        var data = await safeFetch('/api/deployments/public?sort=' + encodeURIComponent((document.getElementById('deploy-sort-select') || {}).value || 'newest') + '&limit=50&offset=0');
        var title = document.getElementById('thread-view-title');
        var content = document.getElementById('thread-view-content');
        if (!title || !content) return;
        title.textContent = 'Deployment Community Threads';
        if (!data || !data.length) {
            content.innerHTML = '<div style="color:var(--text-muted);">No deployments yet.</div>';
            return openModal('thread-view-modal');
        }
        content.innerHTML = data.map(function (d) {
            return "<div style='padding:10px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:10px;'>" +
                "<div style='display:flex;align-items:center;justify-content:space-between;gap:8px;'>" +
                "<strong>" + escapeHtml(d.project_name || d.room_id || 'Untitled') + "</strong>" +
                "<button class='action-btn secondary' style='font-size:12px;padding:4px 8px;' onclick=\"openDeploymentComments(event,'" + escapeHtml(d.id) + "')\">Open Comments</button>" +
                "</div>" +
                "<div style='color:var(--text-muted);font-size:12px;margin-top:6px;'>Likes: " + escapeHtml(d.likes_count || 0) + " | Comments: " + escapeHtml(d.comments_count || 0) + "</div>" +
                "</div>";
        }).join('');
        openModal('thread-view-modal');
    } catch (e) {
        showToast('Failed to load deployment thread view', 'error');
    }
}

async function deleteProject(roomId, isPrivate, skipConfirm = false, confirmationName) {
    if (!currentUser) return showToast("Please login first", "error");
    toggleLoading(true);
    try {
        var res = await fetch("/api/delete-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: roomId, userId: currentUser.id, confirmationName: confirmationName || null })
        });
        var data = await res.json();
        if (res.ok && data.success) {
            showToast("Project deleted successfully", "success");
            if (!skipConfirm) loadProjects();
        } else {
            showToast(data.error || "Error deleting project", "error");
        }
    } catch (e) {
        showToast("Network error: " + e.message, "error");
    } finally {
        toggleLoading(false);
    }
}

var pendingDeleteTimers = {};

function isProjectOwner(room) {
    if (!currentUser || !room) return false;
    var ownerChecks = ["owner_id", "ownerId", "user_id", "userId", "owner"];
    for (var i = 0; i < ownerChecks.length; i++) {
        var key = ownerChecks[i];
        if (room.hasOwnProperty(key) && room[key]) {
            return String(room[key]) === String(currentUser.id);
        }
    }
    return false;
}

function handleDeleteClick(room, cardEl) {
    var parent = cardEl.parentNode;
    if (!parent) return;
    openDeleteConfirmModal(room, cardEl);
}

function openDeleteConfirmModal(room, cardEl) {
    var modal = document.getElementById('delete-confirm-modal');
    var projectNameEl = document.getElementById('delete-confirm-project-name');
    var input = document.getElementById('delete-confirm-input');
    var btn = document.getElementById('delete-confirm-btn');
    var cancel = document.getElementById('delete-confirm-cancel');

    if (!modal || !projectNameEl || !input || !btn || !cancel) {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
        var confirmName = prompt('Type the project name to confirm deletion:');
        if (confirmName === null) return;
        if (String(confirmName).trim().toLowerCase() !== String(room.id).trim().toLowerCase()) {
            showToast('Project name did not match. Deletion cancelled.', 'error');
            return;
        }
        proceedWithOptimisticDelete(room, cardEl, confirmName);
        return;
    }

    projectNameEl.innerText = room.id;
    input.value = '';
    modal.classList.remove('hidden');

    setTimeout(function () { try { input.focus(); } catch (e) { } }, 100);

    function cleanup() {
        btn.removeEventListener('click', onConfirm);
        cancel.removeEventListener('click', onCancel);
        modal.classList.add('hidden');
    }

    function onCancel(e) {
        e.preventDefault();
        cleanup();
    }

    function onConfirm(e) {
        e.preventDefault();
        var val = String(input.value || '');
        if (val.trim().toLowerCase() !== String(room.id).trim().toLowerCase()) {
            showToast('Project name did not match. Deletion cancelled.', 'error');
            return;
        }
        cleanup();
        proceedWithOptimisticDelete(room, cardEl, room.id);
    }

    cancel.addEventListener('click', onCancel);
    btn.addEventListener('click', onConfirm);
}

function proceedWithOptimisticDelete(room, cardEl, confirmationName) {
    var parent = cardEl.parentNode;
    if (!parent) return;

    var children = Array.from(parent.children);
    var index = children.indexOf(cardEl);

    var placeholder = document.createElement('div');
    placeholder.className = 'undo-placeholder';

    placeholder.innerHTML = '<div style="padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;"><div style="display:flex;align-items:center;gap:12px;flex:1;color:#bbb;"><span>Project "' + room.id + '" deleted.</span><span class="delete-status" style="font-size:12px;color:#f59e0b;margin-left:6px;"></span></div><div style="display:flex;gap:8px;"><button class="action-btn secondary undo-btn">Undo</button></div></div>';
    parent.replaceChild(placeholder, cardEl);

    var undoBtn = placeholder.querySelector('.undo-btn');
    var undone = false;
    undoBtn.addEventListener('click', function () {
        if (undone) return;
        undone = true;
        var pending = pendingDeleteTimers[room.id];
        if (pending && pending.timer) clearTimeout(pending.timer);
        if (parent && cardEl) parent.replaceChild(cardEl, placeholder);
        delete pendingDeleteTimers[room.id];
        showToast('Deletion undone', 'info');
    });

    var timer = setTimeout(function () {
        delete pendingDeleteTimers[room.id];
        try {
            var statusSpan = placeholder.querySelector('.delete-status');
            if (statusSpan) statusSpan.innerText = 'Deleting...';
        } catch (e) { }

        deleteProject(room.id, room.is_public, true, confirmationName).then(function () {
            safeFetch('/api/my-rooms?uid=' + (currentUser ? currentUser.id : '')).then(function (rooms) {
                if (!rooms || !Array.isArray(rooms)) {
                    if (parent && placeholder) parent.removeChild(placeholder);
                    return;
                }
                var replacementRoom = rooms[index];
                if (replacementRoom) {
                    var newCard = createOwnedProjectCard(replacementRoom);
                    parent.replaceChild(newCard, placeholder);
                } else {
                    if (parent && placeholder) parent.removeChild(placeholder);
                }
            }).catch(function () {
                if (parent && placeholder) parent.removeChild(placeholder);
            });
        }).catch(function (e) {
            if (parent && cardEl) parent.replaceChild(cardEl, placeholder);
        });
    }, 5000);

    pendingDeleteTimers[room.id] = { timer: timer, placeholder: placeholder, card: cardEl };
}

async function joinRoomViaId() {
    var idInput = document.getElementById("join-room-id-input");
    if (!idInput) return;
    var id = idInput.value.trim();
    if (!id) {
        showToast("Please enter a Project ID", "error");
        return;
    }
    var ownerEmailInput = document.getElementById("join-owner-email-input");
    var ownerEmail = ownerEmailInput ? String(ownerEmailInput.value || '').trim().toLowerCase() : '';
    
    // Owner email is now optional - only validate format if provided
    if (ownerEmail && !/@gmail\.com$/i.test(ownerEmail)) {
        showToast("Please enter a valid Gmail address or leave empty.", "error");
        return;
    }

    enterRoom(id, null, false, ownerEmail || null);
}

async function loadProjectFilesFromSupabase(roomId) {
    try {
        var response = await fetch("/api/get-room-files?roomId=" + roomId);
        if (response.ok) {
            var contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                var data = await response.json();
                if (data.files && data.files.length > 0) {
                    localFiles = [];
                    openTabs = [];
                    data.files.forEach(function (fileData) {
                        var id = "remote-" + fileData.id;
                        localFiles.push({
                            id: id,
                            name: fileData.name,
                            content: fileData.content,
                            lang: fileData.lang,
                            remoteId: fileData.id
                        });
                    });
                    renderExplorer();
                    if (localFiles.length > 0) {
                        switchFile(localFiles[0].id);
                    }
                    showToast("Project loaded from cloud!", "success");
                }
            }
        }
    } catch (e) {
        console.log("Could not load project files from cloud:", e.message);
    }
}

var monacoLoaded = false;

function loadMonacoAsync() {
    return new Promise(function (resolve, reject) {
        if (monacoLoaded) { resolve(); return; }
        if (typeof require === "undefined") {
            var script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs/loader.min.js";
            script.onload = function () {
                require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs" } });
                require(["vs/editor/editor.main"], function () {
                    monacoLoaded = true;
                    resolve();
                });
            };
            script.onerror = reject;
            document.head.appendChild(script);
        } else {
            require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs" } });
            require(["vs/editor/editor.main"], function () {
                monacoLoaded = true;
                resolve();
            });
        }
    });
}

async function initMonaco() {
    if (editor) { editor.layout(); return; }
    var container = document.getElementById("monaco-editor");
    if (!container) return;
    try {
        await loadMonacoAsync();
    } catch (e) {
        console.error("Monaco loader failed:", e);
        return;
    }
    require(["vs/editor/editor.main"], function () {
        monaco.languages.html.htmlDefaults.setOptions({ format: { tabSize: config.tabSize } });
        editor = monaco.editor.create(container, {
            value: "// Welcome to Bekaei Ultimate\n// Click Run to execute your code",
            language: "javascript",
            theme: config.theme,
            automaticLayout: true,
            fontSize: config.fontSize,
            fontFamily: config.fontFamily,
            lineHeight: config.lineHeight,
            wordWrap: config.wordWrap,
            lineNumbers: config.lineNumbers,
            minimap: config.minimap,
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingTags: true,
            autoSurround: "languageDefined",
            autoIndent: "full"
        });
        editor.getModel().updateOptions({ tabSize: config.tabSize });
        applyEditorSettings();
        applyLayoutSettings();
    });
}

function renderExplorer() {
    var list = document.getElementById("file-list-container");
    if (!list) return;
    list.innerHTML = "";
    
    // Add drag-and-drop styling and event listeners
    list.style.minHeight = "100px";
    setupFileDropZone(list);
    
    localFiles.forEach(function (f) {
        var div = document.createElement("div");
        div.className = "file-item " + (activeFileId === f.id ? "active" : "");
        div.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
            '  <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">' +
            '    <i class="fa-regular fa-file"></i>' +
            '    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(f.name) + '</span>' +
            '  </div>' +
            '  <i class="fa-solid fa-trash" title="Delete file" data-action="delete-file" style="color:#ef4444;cursor:pointer;"></i>' +
            '</div>';
        div.addEventListener('click', function (e) {
            var action = e && e.target && e.target.getAttribute ? e.target.getAttribute('data-action') : null;
            if (action === 'delete-file') {
                e.preventDefault();
                e.stopPropagation();
                deleteFileFromEditor(f.id);
                return;
            }
            switchFile(f.id);
        });
        list.appendChild(div);
    });
}

async function deleteFileFromEditor(fileId) {
    var file = localFiles.find(function (f) { return f.id === fileId; });
    if (!file) return;
    var ok = confirm('Delete file "' + file.name + '"? This cannot be undone.');
    if (!ok) return;

    try {
        // If file is open, switch away before deleting
        if (activeFileId === fileId) {
            var other = localFiles.find(function (f) { return f.id !== fileId; });
            if (other) switchFile(other.id);
            else {
                activeFileId = null;
                if (editor) editor.setValue('');
            }
        }

        // Collaboration + cloud delete if in a room
        if (!isDemoMode && currentRoomId) {
            if (socket && socket.connected) {
                socket.emit('file-deleted', { roomId: currentRoomId, fileId: file.remoteId });
            }
            broadcastFileDeleted(fileId);
        } else {
            // Local-only
            localFiles = localFiles.filter(function (f) { return f.id !== fileId; });
            renderExplorer();
        }

        showToast('File deleted', 'success');
    } catch (e) {
        console.error('Delete file failed:', e);
        showToast('Failed to delete file', 'error');
    }
}

function setupFileDropZone(element) {
    if (!element) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        element.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when dragging over
    element.addEventListener('dragenter', function(e) {
        element.classList.add('drag-over');
    }, false);
    
    element.addEventListener('dragleave', function(e) {
        element.classList.remove('drag-over');
    }, false);
    
    // Handle dropped files
    element.addEventListener('drop', handleFileDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleFileDrop(e) {
    var dt = e.dataTransfer;
    var files = dt.files;
    
    if (files && files.length > 0) {
        Array.from(files).forEach(function(file) {
            readAndAddFile(file);
        });
    }
    
    var list = document.getElementById("file-list-container");
    if (list) list.classList.remove('drag-over');
}

function readAndAddFile(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var content = e.target.result;
        var filename = file.name;
        
        // Check if file already exists
        var existingFile = localFiles.find(function(f) { return f.name === filename; });
        if (existingFile) {
            existingFile.content = content;
            if (activeFileId === existingFile.id && editor) {
                editor.setValue(content);
            }
            showToast("Updated: " + filename, "success");
        } else {
            var id = "local-" + Math.random().toString(36).substr(2, 9);
            var ext = filename.split(".").pop() || "txt";
            localFiles.push({ id: id, name: filename, content: content, lang: ext });
            showToast("Added: " + filename, "success");
        }
        renderExplorer();
        
        // Switch to the newly added/updated file
        var targetFile = localFiles.find(function(f) { return f.name === filename; });
        if (targetFile) {
            switchFile(targetFile.id);
        }
        
        // Save project if in a room
        if (!isDemoMode && currentRoomId) {
            ProjectStorage.saveProject();
        }
    };
    reader.onerror = function() {
        showToast("Failed to read: " + file.name, "error");
    };
    reader.readAsText(file);
}

// Initialize file dropzone in the new-file-modal
function initFileDropzone() {
    var dropzone = document.getElementById('file-dropzone');
    var fileInput = document.getElementById('file-drop-input');
    
    if (!dropzone || !fileInput) return;
    
    // Prevent default drag behaviors on the dropzone
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        dropzone.addEventListener(eventName, function(e) {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });
    
    // Highlight dropzone on drag enter/over
    dropzone.addEventListener('dragenter', function() {
        dropzone.classList.add('dragover');
    }, false);
    
    dropzone.addEventListener('dragover', function() {
        dropzone.classList.add('dragover');
    }, false);
    
    // Remove highlight on drag leave
    dropzone.addEventListener('dragleave', function(e) {
        if (e.target === dropzone) {
            dropzone.classList.remove('dragover');
        }
    }, false);
    
    // Handle dropped files
    dropzone.addEventListener('drop', function(e) {
        dropzone.classList.remove('dragover');
        var dt = e.dataTransfer;
        var files = dt.files;
        
        if (files && files.length > 0) {
            Array.from(files).forEach(function(file) {
                readAndAddFile(file);
            });
            closeModal('new-file-modal');
        }
    }, false);
    
    // Handle click to select files
    dropzone.addEventListener('click', function(e) {
        // Don't trigger if clicking the file input itself
        if (e.target !== fileInput) {
            fileInput.click();
        }
    }, false);
    
    // Handle file selection via input
    fileInput.addEventListener('change', function() {
        var files = fileInput.files;
        if (files && files.length > 0) {
            Array.from(files).forEach(function(file) {
                readAndAddFile(file);
            });
            closeModal('new-file-modal');
            fileInput.value = ''; // Reset input
        }
    }, false);
}

// Initialize dropzone when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initFileDropzone();
});

function switchFile(id) {
    activeFileId = id;
    var f = localFiles.find(function (x) { return x.id === id; });
    if (editor && f) {
        var ext = f.name.split(".").pop().toLowerCase();
        monaco.editor.setModelLanguage(editor.getModel(), LANGUAGE_MAP[ext] || "plaintext");
        editor.setValue(f.content || "");
        var bc = document.getElementById("breadcrumbs");
        if (bc) bc.innerText = f.name;
    }
    TabManager.activateTab(id);
    renderExplorer();
    refreshFixFileDropdown();
    try { closeIdePanelsIfMobile(); } catch (e) { }
}

function createNewFile() {
    var nameInput = document.getElementById("new-filename");
    if (!nameInput) return;
    var name = nameInput.value;
    if (name) {
        var id = "local-" + Math.random().toString(36).substr(2, 9);
        localFiles.push({ id: id, name: name, content: "", lang: name.split(".").pop() || "text" });
        renderExplorer();
        closeModal("new-file-modal");
        nameInput.value = "";
        switchFile(id);
        refreshFixFileDropdown();
    } else {
        showToast("Please enter a file name", "error");
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function executeCode() {
    var f = localFiles.find(function (x) { return x.id === activeFileId; });
    if (!f) return showToast("Select a file first", "error");
    var bottomPanel = document.getElementById("bottom-panel");
    if (bottomPanel && bottomPanel.offsetHeight < 50) {
        bottomPanel.classList.remove("bottom-panel--maximized");
        bottomPanel.style.height = "200px";
    }
    if (f.name.endsWith(".html")) {
        switchBottomTab("browser");
        var iframe = document.getElementById("browser-preview");
        if (iframe) iframe.srcdoc = buildLinkedHTML(f.content);
        return;
    }
    var ext = f.name.split(".").pop().toLowerCase();
    var language = LANGUAGE_MAP[ext];
    if (!language) {
        switchBottomTab("terminal");
        var logs = document.getElementById("terminal-logs");
        if (logs) {
            logs.innerHTML += "<div>$ Running " + f.name + "...</div>";
            logs.innerHTML += "<div style='color:#fbbf24;'>Preview not available for ." + ext + "</div>";
        }
        return;
    }
    switchBottomTab("terminal");
    var logs = document.getElementById("terminal-logs");
    if (logs) {
        logs.innerHTML += "<div>$ Running " + f.name + " (" + language + ")...</div>";
        logs.scrollTop = logs.scrollHeight;
    }
    CodeExecutor.execute(language, f.content).then(function (result) {
        if (result.output && logs) {
            logs.innerHTML += "<div>" + escapeHtml(result.output).replace(/\n/g, "<br>") + "</div>";
        }
        if (result.error && logs) {
            logs.innerHTML += "<div style='color:#ef4444;'>" + escapeHtml(result.error).replace(/\n/g, "<br>") + "</div>";
        }
        if (logs) logs.scrollTop = logs.scrollHeight;
    });
}

function exportCurrentFile() {
    var f = localFiles.find(function (x) { return x.id === activeFileId; });
    if (!f) return showToast("Select a file first", "error");
    
    var content = editor ? editor.getValue() : (f.content || "");
    var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Exported: " + f.name, "success");
}

function switchBottomTab(name) {
    var panel = document.getElementById("bottom-panel");
    var term = document.getElementById("terminal-output");
    var browser = document.getElementById("browser-content");
    var tabTerminal = document.getElementById("tab-terminal");
    var tabBrowser = document.getElementById("tab-browser");

    if (panel && panel.classList.contains("hidden")) {
        panel.classList.remove("hidden");
        panel.classList.remove("bottom-panel--maximized");
        panel.style.height = "200px";
    }

    if (name === "browser") {
        if (term) term.classList.add("hidden");
        if (browser) browser.classList.remove("hidden");
        if (tabTerminal) tabTerminal.classList.remove("active");
        if (tabBrowser) tabBrowser.classList.add("active");
    } else {
        if (browser) browser.classList.add("hidden");
        if (term) term.classList.remove("hidden");
        if (tabBrowser) tabBrowser.classList.remove("active");
        if (tabTerminal) tabTerminal.classList.add("active");
    }
}

function clearTerminal() {
    var logs = document.getElementById("terminal-logs");
    if (logs) logs.innerHTML = "";
}

function handleTerminalInput(event) {
    if (!event || event.key !== "Enter") return;
    var input = document.getElementById("terminal-input");
    var logs = document.getElementById("terminal-logs");
    if (!input || !logs) return;

    var raw = String(input.value || "").trim();
    if (!raw) return;
    input.value = "";
    logs.innerHTML += "<div><span style='color:#22c55e;'>$</span> " + escapeHtml(raw) + "</div>";

    var command = raw.toLowerCase();
    if (command === "clear") {
        logs.innerHTML = "";
        return;
    }
    if (command === "help") {
        logs.innerHTML += "<div>Commands: help, clear, run, files, open &lt;filename&gt;</div>";
        logs.scrollTop = logs.scrollHeight;
        return;
    }
    if (command === "run") {
        executeCode();
        return;
    }
    if (command === "files" || command === "ls") {
        var names = (localFiles || []).map(function (f) { return f.name; });
        logs.innerHTML += "<div>" + (names.length ? escapeHtml(names.join(", ")) : "No files available") + "</div>";
        logs.scrollTop = logs.scrollHeight;
        return;
    }
    if (command.indexOf("open ") === 0) {
        var requested = raw.slice(5).trim().toLowerCase();
        var target = (localFiles || []).find(function (f) { return String(f.name || "").toLowerCase() === requested; });
        if (target) {
            switchFile(target.id);
            logs.innerHTML += "<div>Opened " + escapeHtml(target.name) + "</div>";
        } else {
            logs.innerHTML += "<div style='color:#ef4444;'>File not found: " + escapeHtml(raw.slice(5).trim()) + "</div>";
        }
        logs.scrollTop = logs.scrollHeight;
        return;
    }

    logs.innerHTML += "<div style='color:#fbbf24;'>Unknown command. Type <strong>help</strong>.</div>";
    logs.scrollTop = logs.scrollHeight;
}

function closeTerminal() {
    var panel = document.getElementById("bottom-panel");
    if (panel) {
        panel.classList.remove("bottom-panel--maximized");
        panel.style.height = "0px";
        panel.classList.add("hidden");
    }
    if (editor) setTimeout(function () { editor.layout(); }, 50);
}

function minimizeTerminal() {
    var panel = document.getElementById("bottom-panel");
    if (panel) {
        panel.classList.remove("hidden");
        panel.classList.remove("bottom-panel--maximized");
        panel.style.height = "150px";
    }
    if (editor) setTimeout(function () { editor.layout(); }, 50);
}

function maximizeTerminal() {
    var panel = document.getElementById("bottom-panel");
    if (panel) {
        panel.classList.remove("hidden");
        panel.classList.add("bottom-panel--maximized");
        panel.style.height = "";
    }
    if (editor) setTimeout(function () { editor.layout(); }, 50);
}

function openModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
}

function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add("hidden");
}

var IDE_PANEL_TITLES = { explorer: "Explorer", users: "Online Users", chat: "Team Chat", ai: "AI Assistant" };

function isIdeMobileLayout() {
    try {
        return typeof window.matchMedia === "function" && window.matchMedia("(max-width: 900px)").matches;
    } catch (e) {
        return false;
    }
}

function setIdePanelsOpen(open) {
    var backdrop = document.getElementById("panels-backdrop");
    var container = document.querySelector(".panels-container");
    if (open) {
        document.body.classList.add("ide-panels-open");
        if (backdrop) backdrop.classList.remove("hidden");
        if (container) container.classList.add("active");
    } else {
        document.body.classList.remove("ide-panels-open");
        if (backdrop) backdrop.classList.add("hidden");
        if (container) container.classList.remove("active");
    }
}

function closeIdePanels() {
    var mapping = { explorer: "panel-explorer", users: "panel-users", chat: "panel-chat", ai: "panel-ai" };
    var container = document.querySelector(".panels-container");
    if (container) {
        container.classList.add("hidden");
        container.classList.remove("active");
    }
    setIdePanelsOpen(false);
    activeSidebarPanel = null;
    Object.keys(mapping).forEach(function (k) {
        var pnl = document.getElementById(mapping[k]);
        if (pnl) pnl.classList.add("hidden");
    });
    if (editor) {
        setTimeout(function () { editor.layout(); }, 50);
    }
}

function closeIdePanelsIfMobile() {
    if (isIdeMobileLayout()) closeIdePanels();
}

function initIdeMobileShell() {
    var container = document.querySelector(".panels-container");
    if (container && isIdeMobileLayout()) {
        container.classList.add("hidden");
    }

    var backdrop = document.getElementById("panels-backdrop");
    if (backdrop) {
        backdrop.addEventListener("click", function () {
            closeIdePanels();
        });
    }
    var closeBtn = document.getElementById("panels-close-btn");
    if (closeBtn) {
        closeBtn.addEventListener("click", function (e) {
            e.preventDefault();
            closeIdePanels();
        });
    }

    var dbBackdrop = document.getElementById("dashboard-sidebar-backdrop");
    if (dbBackdrop) {
        dbBackdrop.addEventListener("click", function () {
            closeDashboardSidebar();
        });
    }
    var dbClose = document.getElementById("dashboard-sidebar-close-btn");
    if (dbClose) {
        dbClose.addEventListener("click", function (e) {
            e.preventDefault();
            closeDashboardSidebar();
        });
    }

    function layoutEditorSoon() {
        if (editor) {
            requestAnimationFrame(function () {
                editor.layout();
            });
        }
    }

    var lastWide = window.innerWidth > 900;
    window.addEventListener("resize", function () {
        var wide = window.innerWidth > 900;
        if (wide !== lastWide) {
            lastWide = wide;
            if (wide) {
                setIdePanelsOpen(false);
                var c = document.querySelector(".panels-container");
                if (c) {
                    c.classList.remove("hidden");
                    c.classList.remove("active");
                }
                activeSidebarPanel = "explorer";
                var mapping = { explorer: "panel-explorer", users: "panel-users", chat: "panel-chat", ai: "panel-ai" };
                Object.keys(mapping).forEach(function (k) {
                    var el = document.getElementById(mapping[k]);
                    if (!el) return;
                    if (k === "explorer") el.classList.remove("hidden"); else el.classList.add("hidden");
                });
            } else {
                closeIdePanels();
            }
        }
        var monacoEl = document.getElementById("monaco-editor");
        if (monacoEl) monacoEl.style.height = "";
        applyLayoutSettings();
        layoutEditorSoon();
    });
    window.addEventListener("orientationchange", function () {
        setTimeout(function () {
            var monacoEl = document.getElementById("monaco-editor");
            if (monacoEl) monacoEl.style.height = "";
            layoutEditorSoon();
        }, 250);
    });
}

function togglePanel(name) {
    var mapping = { explorer: "panel-explorer", users: "panel-users", chat: "panel-chat", ai: "panel-ai" };
    var container = document.querySelector(".panels-container");
    if (activeSidebarPanel === name && container && !container.classList.contains("hidden")) {
        closeIdePanels();
        return;
    }

    if (container) container.classList.remove("hidden");
    if (isIdeMobileLayout()) {
        setIdePanelsOpen(true);
    } else {
        setIdePanelsOpen(false);
    }

    activeSidebarPanel = name;
    var titleEl = document.getElementById("panels-sheet-title");
    if (titleEl && IDE_PANEL_TITLES[name]) titleEl.textContent = IDE_PANEL_TITLES[name];

    Object.keys(mapping).forEach(function (k) {
        var el = document.getElementById(mapping[k]);
        if (!el) return;
        if (k === name) el.classList.remove("hidden"); else el.classList.add("hidden");
    });

    if (editor) {
        setTimeout(function () { editor.layout(); }, 80);
    }
}

function initSettingsInputs() {
    var setVal = function (id, val) { var el = document.getElementById(id); if (el) el.value = val; };
    setVal("set-theme", config.theme);
    setVal("set-fontSize", config.fontSize);
    setVal("set-fontFamily", config.fontFamily);
    setVal("set-lineHeight", config.lineHeight);
    setVal("set-wordWrap", config.wordWrap);
    setVal("set-lineNumbers", config.lineNumbers);
    setVal("set-tabSize", config.tabSize);
    setVal("set-autoSave", String(config.autoSave));
    setVal("set-autoFormat", String(!!config.formatOnType));
    setVal("set-minimap", String(config.minimap && config.minimap.enabled !== false));
    setVal("set-smoothScrolling", String(!!config.smoothScrolling));
    setVal("set-executionMode", config.executionMode || "auto");
    setVal("set-timeout", config.timeout || 30000);
    setVal("set-maxOutputLines", config.maxOutputLines || 1000);
    setVal("set-sidebarAutoHide", String(!!config.sidebarAutoHide));
    setVal("set-panelWidth", config.panelWidth || 280);
}

function applyEditorSettings() {
    if (!editor || typeof monaco === "undefined" || !monaco.editor) return;
    monaco.editor.setTheme(config.theme || "vs-dark");
    editor.updateOptions({
        fontSize: Number(config.fontSize) || 14,
        fontFamily: config.fontFamily || "'JetBrains Mono', monospace",
        lineHeight: Number(config.lineHeight) || 20,
        wordWrap: config.wordWrap || "on",
        lineNumbers: config.lineNumbers || "on",
        minimap: { enabled: !!(config.minimap && config.minimap.enabled) },
        tabSize: Number(config.tabSize) || 4,
        smoothScrolling: !!config.smoothScrolling,
        formatOnType: !!config.formatOnType,
        formatOnPaste: !!config.formatOnPaste
    });
}

function applyLayoutSettings() {
    var panelWidth = Number(config.panelWidth) || 280;
    var container = document.querySelector(".panels-container");
    if (container) {
        if (isIdeMobileLayout()) {
            container.style.width = "";
        } else {
            container.style.width = panelWidth + "px";
        }
    }
    if (isIdeMobileLayout()) {
        resetSidebarAutoHide();
    } else if (config.sidebarAutoHide) {
        setupSidebarAutoHide();
    } else {
        resetSidebarAutoHide();
    }
}

function saveSettings() {
    var getVal = function (id) {
        var el = document.getElementById(id);
        return el ? el.value : null;
    };
    config.theme = getVal("set-theme") || config.theme;
    config.fontSize = parseInt(getVal("set-fontSize") || config.fontSize, 10);
    config.fontFamily = getVal("set-fontFamily") || config.fontFamily;
    config.lineHeight = parseInt(getVal("set-lineHeight") || config.lineHeight, 10);
    config.wordWrap = getVal("set-wordWrap") || config.wordWrap;
    config.lineNumbers = getVal("set-lineNumbers") || config.lineNumbers;
    config.tabSize = parseInt(getVal("set-tabSize") || config.tabSize, 10);
    config.autoSave = getVal("set-autoSave") === "true";
    config.formatOnType = getVal("set-autoFormat") === "true";
    config.formatOnPaste = config.formatOnType;
    config.minimap = { enabled: getVal("set-minimap") === "true" };
    config.smoothScrolling = getVal("set-smoothScrolling") === "true";
    config.executionMode = getVal("set-executionMode") || "auto";
    config.timeout = parseInt(getVal("set-timeout") || config.timeout, 10);
    config.maxOutputLines = parseInt(getVal("set-maxOutputLines") || config.maxOutputLines, 10);
    config.sidebarAutoHide = getVal("set-sidebarAutoHide") === "true";
    config.panelWidth = parseInt(getVal("set-panelWidth") || config.panelWidth || 280, 10);

    localStorage.kg_bekaei_config = JSON.stringify(config);
    applyEditorSettings();
    applyLayoutSettings();
    closeModal("settings-modal");
    showToast("Settings Saved", "success");
}

function openSettings() {
    initSettingsInputs();
    openModal("settings-modal");
}

function togglePasswordVisibility(inputId, iconId) {
    var input = document.getElementById(inputId);
    var icon = document.getElementById(iconId);
    if (input && icon) {
        if (input.type === "password") {
            input.type = "text";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        } else {
            input.type = "password";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    }
}

async function performAuth(type) {
    var email, password, username;
    var emailInput = document.getElementById("email-input");
    var passInput = document.getElementById("password-input");
    var regUsernameInput = document.getElementById("username-input");
    var regEmailInput = document.getElementById("reg-email-input");
    var regPassInput = document.getElementById("reg-password-input");

    if (type === "login") {
        email = emailInput ? emailInput.value : '';
        password = passInput ? passInput.value : '';
    } else {
        username = regUsernameInput ? regUsernameInput.value : '';
        email = regEmailInput ? regEmailInput.value : '';
        password = regPassInput ? regPassInput.value : '';
    }

    if (!email || !password) {
        showToast("Please fill in all fields", "error");
        return;
    }

    if (type === "register" && !username) {
        showToast("Please enter a username", "error");
        return;
    }

    var authClient = window.supabaseClient;
    if (!authClient) {
        showToast("Auth system not loaded. Please refresh the page.", "error");
        return;
    }

    toggleLoading(true);

    try {
        if (type === "login") {
            const { data, error } = await authClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // Re-fetch the user to avoid stale/missing `email_confirmed_at` in the signIn response.
            const userRes = await authClient.auth.getUser();
            const user = userRes && userRes.data ? userRes.data.user : data.user;
            if (!user || ('email_confirmed_at' in user && !user.email_confirmed_at)) {
                await authClient.auth.signOut();
                showToast("Please verify your email before logging in. Check your inbox for the verification link.", "error");
                toggleLoading(false);
                return;
            }

            handleUserLogin(user);
            showToast("Login successful! Welcome back.", "success");
        } else {
            const { data, error } = await authClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username || email.split('@')[0]
                    },
                    emailRedirectTo: (window.APP_BASE_URL && window.APP_BASE_URL.length > 0 ? window.APP_BASE_URL : window.location.origin)
                }
            });

            if (error) throw error;
            // Supabase may either require email confirmation or auto-confirm the account depending on your Auth settings.
            // Only show the "check your email" message when the user is not confirmed.
            const isConfirmed = !!(data && data.user && data.user.email_confirmed_at);
            if (isConfirmed) {
                showToast("Registration successful! You can now log in.", "success");
            } else {
                showToast("Registration successful! Please check your email to verify your account.", "success");
            }
            setTimeout(function () {
                switchAuthTab('login');
            }, 2000);
        }
    } catch (e) {
        console.error("Auth error:", e);
        showToast("Error: " + e.message, "error");
    } finally {
        toggleLoading(false);
    }
}

async function performOAuth(provider) {
    toggleLoading(true);
    var authClient = window.supabaseClient;
    if (!authClient) {
        showToast("Auth system not loaded. Please refresh the page.", "error");
        toggleLoading(false);
        return;
    }

    try {
        const { data, error } = await authClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: (window.APP_BASE_URL && window.APP_BASE_URL.length > 0 ? window.APP_BASE_URL : window.location.origin) + "/auth/callback",
                skipBrowserRedirect: false
            }
        });

        if (error) throw error;
        console.log('OAuth redirect initiated for', provider);
        showToast("Redirecting to " + provider + "...", "info");
    } catch (e) {
        console.error("OAuth error:", e);
        showToast("OAuth failed: " + e.message, "error");
        toggleLoading(false);
    }
}

var authListenerInstalled = false;

function setupAuthListener() {
    if (!window.supabaseClient || !window.supabaseClient.auth || typeof window.supabaseClient.auth.onAuthStateChange !== 'function') {
        console.warn('Supabase client not ready for auth listener');
        return;
    }
    if (authListenerInstalled) return;
    authListenerInstalled = true;

    window.supabaseClient.auth.onAuthStateChange(function (event, session) {
        console.log('Auth state changed:', event);
        if (event === 'PASSWORD_RECOVERY') {
            var authScreen = document.getElementById('auth-screen');
            var dash = document.getElementById('dashboard-screen');
            var mainApp = document.getElementById('main-app');
            if (authScreen) authScreen.classList.remove('hidden');
            if (dash) dash.classList.add('hidden');
            if (mainApp) mainApp.classList.add('hidden');
            switchAuthTab('login');
            openModal('update-password-modal');
            showToast('Choose a new password to finish resetting your account.', 'info');
            return;
        }
        if (event === 'SIGNED_IN' && session) {
            var updateModal = document.getElementById('update-password-modal');
            if (updateModal && !updateModal.classList.contains('hidden')) {
                return;
            }
            // Re-fetch user to avoid stale session.user without `email_confirmed_at`.
            window.supabaseClient.auth.getUser().then(function (userRes) {
                var user = userRes && userRes.data ? userRes.data.user : session.user;
                if (user && (!('email_confirmed_at' in user) || user.email_confirmed_at)) {
                    handleUserLogin(user);
                } else {
                    console.log('User email not verified yet');
                }
            }).catch(function () {
                // If getUser fails, fall back to existing session data.
                if (session.user && session.user.email_confirmed_at) handleUserLogin(session.user);
            });
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentUsername = "Guest";
        }
    });
}

function getAuthSiteUrl() {
    try {
        if (window.APP_BASE_URL && String(window.APP_BASE_URL).length > 0) {
            return String(window.APP_BASE_URL).replace(/\/$/, '');
        }
    } catch (e) { }
    return (window.location && window.location.origin) ? window.location.origin : '';
}

async function sendPasswordResetRequest() {
    var emailEl = document.getElementById('forgot-password-email');
    var email = emailEl ? String(emailEl.value || '').trim() : '';
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    var authClient = window.supabaseClient;
    if (!authClient || !authClient.auth || typeof authClient.auth.resetPasswordForEmail !== 'function') {
        showToast('Auth is not ready. Please refresh the page.', 'error');
        return;
    }
    toggleLoading(true);
    try {
        var redirectTo = 'https://bekaei-codelab-production.up.railway.app/';
        var res = await authClient.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
        if (res && res.error) throw res.error;
        showToast('If an account exists for that email, you will receive a reset link shortly.', 'success');
        closeModal('forgot-password-modal');
    } catch (e) {
        console.error('resetPasswordForEmail', e);
        showToast('Error: ' + (e && e.message ? e.message : 'Could not send reset email'), 'error');
    } finally {
        toggleLoading(false);
    }
}

async function submitRecoveryPassword() {
    var p1 = document.getElementById('recovery-password-input');
    var p2 = document.getElementById('recovery-password-confirm');
    var a = p1 ? String(p1.value || '') : '';
    var b = p2 ? String(p2.value || '') : '';
    if (a.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    if (a !== b) {
        showToast('Passwords do not match', 'error');
        return;
    }
    var authClient = window.supabaseClient;
    if (!authClient || !authClient.auth || typeof authClient.auth.updateUser !== 'function') {
        showToast('Auth is not ready. Please refresh the page.', 'error');
        return;
    }
    toggleLoading(true);
    try {
        var res = await authClient.auth.updateUser({ password: a });
        if (res && res.error) throw res.error;
        showToast('Password updated. You can log in with your new password.', 'success');
        closeModal('update-password-modal');
        if (p1) p1.value = '';
        if (p2) p2.value = '';
        try { await authClient.auth.signOut(); } catch (e2) { }
        switchAuthTab('login');
    } catch (e) {
        console.error('updateUser password', e);
        showToast('Error: ' + (e && e.message ? e.message : 'Could not update password'), 'error');
    } finally {
        toggleLoading(false);
    }
}

async function startDemo() {
    try {
        isDemoMode = true;
        demoTimeRemaining = 60;

        var timerOverlay = document.getElementById("demo-timer-overlay");
        if (timerOverlay) timerOverlay.classList.remove("hidden");

        var timerDisplay = document.getElementById("demo-timer");
        if (timerDisplay) timerDisplay.innerText = "1:00";

        var authScreen = document.getElementById("auth-screen");
        if (authScreen) authScreen.classList.add("hidden");

        var mainApp = document.getElementById("main-app");
        if (mainApp) mainApp.classList.remove("hidden");

        localFiles = [
            { id: "demo-1", name: "index.html", content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>Demo Project</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n    <h1>Welcome to Bekaei!</h1>\n    <p>This is a demo project.</p>\n    <script src=\"script.js\"><\/script>\n</body>\n</html>", lang: "html" },
            { id: "demo-2", name: "style.css", content: "body {\n    font-family: sans-serif;\n    background: #0a0a0c;\n    color: #fff;\n    padding: 20px;\n}\nh1 {\n    color: #6366f1;\n}", lang: "css" },
            { id: "demo-3", name: "script.js", content: "// Demo JavaScript\nconsole.log(\"Hello from Bekaei Demo!\");\n\nfunction greet(name) {\n    return \"Hello, \" + name + \"!\";\n}\n\nconsole.log(greet(\"User\"));\n\n// Try some array operations\nvar nums = [1, 2, 3, 4, 5];\nvar doubled = nums.map(n => n * 2);\nconsole.log(\"Doubled:\", doubled);", lang: "javascript" }
        ];

        demoTimerInterval = setInterval(function () {
            demoTimeRemaining--;
            var mins = Math.floor(demoTimeRemaining / 60);
            var secs = demoTimeRemaining % 60;
            var dt = document.getElementById("demo-timer");
            if (dt) dt.innerText = mins + ":" + (secs < 10 ? "0" : "") + secs;

            if (demoTimeRemaining <= 0) {
                endDemo();
            }
        }, 1000);

        toggleLoading(true);
        await loadMonacoAsync();
        initMonaco();
        renderExplorer();
        switchFile("demo-1");
        showToast("Demo mode started! You have 1 minute.", "info");
    } catch (e) {
        console.error("Demo mode error:", e);
        showToast("Demo mode failed to start: " + e.message, "error");
        endDemo();
    } finally {
        toggleLoading(false);
    }
}

function endDemo() {
    clearInterval(demoTimerInterval);
    isDemoMode = false;

    var overlay = document.getElementById("demo-timer-overlay");
    if (overlay) overlay.classList.add("hidden");

    var mainApp = document.getElementById("main-app");
    if (mainApp) mainApp.classList.add("hidden");

    var authScreen = document.getElementById("auth-screen");
    if (authScreen) authScreen.classList.remove("hidden");

    localFiles = [];
    openTabs = [];
    editor = null;
    showToast("Demo ended! Sign up to save your work.", "warning");
}

function apiUrl(url) {
    if (!url) return url;

    // If it's already an absolute URL (e.g. https://...), don't modify it.
    if (/^https?:\/\//i.test(String(url))) return url;

    // Allow deployments to point API calls at a different origin/port.
    var base = '';
    try {
        if (window.API_BASE_URL && String(window.API_BASE_URL).length > 0) base = window.API_BASE_URL;
        else if (window.APP_BASE_URL && String(window.APP_BASE_URL).length > 0) base = window.APP_BASE_URL;
        else base = (window.location && window.location.origin) ? window.location.origin : '';
    } catch (e) {
        base = '';
    }

    // Browsers can use the literal string "null" for origin in some contexts (e.g. file://).
    if (base === 'null') base = '';

    base = String(base || '').replace(/\/$/, '');

    var path = String(url);
    if (!path.startsWith('/')) path = '/' + path;

    return base + path;
}

async function safeFetch(url, options) {
    try {
        const response = await fetch(apiUrl(url), options);
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `Request failed (${response.status})`;
                throw new Error(msg);
            }
            return data;
        }

        // Non-JSON responses are always treated as an error (the app expects JSON).
        const text = await response.text();
        if ((text || '').toLowerCase().includes('<!doctype html')) {
            throw new Error('API endpoint not available. Restart the server and try again.');
        }
        throw new Error('Invalid response: ' + (text.substring(0, 50) || 'Not JSON'));
    } catch (e) {
        // Browser fetch failures are commonly surfaced as TypeError: Failed to fetch
        // (offline / DNS / WiFi / captive portal / blocked request).
        if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
            throw new Error('WiFi connection problem: you appear to be offline');
        }
        if (e instanceof TypeError && String(e.message || '').toLowerCase().includes('fetch')) {
            throw new Error('WiFi connection problem: please check your internet connection');
        }
        throw e;
    }
}

async function sendHelpRequest() {
    if (!currentUser) {
        showToast("Please login first", "error");
        return;
    }
    var subjectInput = document.getElementById('help-subject-input');
    var messageInput = document.getElementById('help-message-input');
    var subject = (subjectInput ? subjectInput.value : '').trim();
    var message = (messageInput ? messageInput.value : '').trim();
    if (!message) {
        showToast("Please write your help message", "error");
        return;
    }

    try {
        var data = await safeFetch('/api/help-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: subject || 'User help request',
                message: message,
                email: currentUser.email || '',
                username: currentUsername || 'User',
                userId: currentUser.id || ''
            })
        });
        if (subjectInput) subjectInput.value = '';
        if (messageInput) messageInput.value = '';
        if (data && data.delivery === 'log') {
            showToast('Help request saved. SMTP is not configured yet.', 'success');
        } else {
            showToast('Help request sent to admin.', 'success');
        }
    } catch (e) {
        showToast('Failed to send help request: ' + (e.message || 'unknown error'), 'error');
    }
}

async function createRoom() {
    if (!currentUser) return showToast('Please login first', 'error');
    var idInput = document.getElementById("new-room-id");
    var id = (idInput && idInput.value) ? idInput.value : Math.random().toString(36).substr(2, 6).toUpperCase();

    var typeSelector = document.querySelector('input[name="proj-type"]:checked');
    var type = typeSelector ? typeSelector.value : "public";

    var descInput = document.getElementById("new-room-desc");
    var desc = descInput ? descInput.value : "";

    var passInput = document.getElementById("new-room-pass");
    var pass = passInput ? passInput.value : "";

    if (type === "private" && !pass) return showToast("Private rooms need a password.", "error");
    if (!id) return showToast("Please enter a project name.", "error");

    toggleLoading(true);
    try {
        var res = await fetch("/api/create-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: id, userId: currentUser.id, type: type, password: pass, desc: desc })
        });
        var data = await res.json();
        if (res.ok && data.success) {
            closeModal("create-project-modal");
            showToast("Project created successfully!", "success");

            if (idInput) idInput.value = "";
            if (descInput) descInput.value = "";
            if (passInput) passInput.value = "";

            setTimeout(function () { enterRoom(id, pass); }, 500);
        } else {
            showToast(data.error || "Error creating project", "error");
            toggleLoading(false);
        }
    } catch (e) {
        showToast("Network error: " + e.message, "error");
        toggleLoading(false);
    }
}

async function enterRoom(roomId, password, isPrivateRoom, ownerEmail) {
    if (currentRoomId && localFiles.length > 0 && !isDemoMode) {
        var canContinue = await ProjectStorage.saveProjectWithConfirmation();
        if (!canContinue) {
            return;
        }
    }

    if (!currentUser) return showToast("Please login first", "error");
    
    // CRITICAL: Clear local files before entering new room to prevent duplication
    localFiles = [];
    openTabs = [];
    activeFileId = null;
    
    toggleLoading(true);
    try {
        var res = await fetch("/api/check-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: roomId, userId: currentUser.id, password: password, ownerEmail: ownerEmail })
        });
        var data = await res.json();

        if (res.status === 401 && data.requirePass) {
            toggleLoading(false);
            openRoomPasswordModal(roomId, ownerEmail);
            return;
        }

        if (isPrivateRoom && !password) {
            toggleLoading(false);
            openRoomPasswordModal(roomId, ownerEmail);
            return;
        }

        if (!res.ok) {
            if (res.status === 401 && data.requirePass) {
                toggleLoading(false);
                openRoomPasswordModal(roomId, ownerEmail);
                return;
            }
            if (res.status === 403) {
                toggleLoading(false);
                showToast("Password incorrect. Please try again.", "error");
                openRoomPasswordModal(roomId, ownerEmail);
                return;
            }
            throw new Error(data.error || "Access Denied");
        }

        currentRoomId = roomId;

        var dashScreen = document.getElementById("dashboard-screen");
        if (dashScreen) dashScreen.classList.add("hidden");

        var mainApp = document.getElementById("main-app");
        if (mainApp) mainApp.classList.remove("hidden");

        connectSocket();
        joinRoomForCollaboration(roomId);

        // Ensure online users + team chat are visible after joining.
        var panelUsers = document.getElementById('panel-users');
        if (panelUsers) panelUsers.classList.remove('hidden');
        var panelChat = document.getElementById('panel-chat');
        if (panelChat) panelChat.classList.remove('hidden');

        // Load files from server - localFiles was already cleared above
        await loadProjectFilesFromSupabase(roomId);

        initMonaco();
    } catch (e) {
        showToast(e.message, "error");
    } finally {
        toggleLoading(false);
    }
}

window.performAuth = function (type) {
    var email, password, username;
    var emailInput = document.getElementById("email-input");
    var passInput = document.getElementById("password-input");
    var regUsernameInput = document.getElementById("username-input");
    var regEmailInput = document.getElementById("reg-email-input");
    var regPassInput = document.getElementById("reg-password-input");

    if (type === "login") {
        email = emailInput ? emailInput.value : '';
        password = passInput ? passInput.value : '';
    } else {
        username = regUsernameInput ? regUsernameInput.value : '';
        email = regEmailInput ? regEmailInput.value : '';
        password = regPassInput ? regPassInput.value : '';
    }

    if (!email || !password) {
        showToast("Please fill in all fields", "error");
        return;
    }

    if (type === "register" && !username) {
        showToast("Please enter a username", "error");
        return;
    }

    if (!window.supabaseClientReady) {
        showToast('Auth system loading...', 'info');
        window.pendingAuthRequest = { type: type, email: email, password: password, username: username };
        window.addEventListener('supabaseReady', function handleSupabaseReady() {
            window.removeEventListener('supabaseReady', handleSupabaseReady);
            if (window.pendingAuthRequest) {
                var pending = window.pendingAuthRequest;
                window.pendingAuthRequest = null;
                var authClient = window.supabaseClient;
                if (!authClient) return;

                toggleLoading(true);

                if (pending.type === "login") {
                    authClient.auth.signInWithPassword({
                        email: pending.email,
                        password: pending.password,
                    }).then(function (result) {
                        toggleLoading(false);
                        if (result.error) throw result.error;
                        // Re-fetch user to avoid stale/missing `email_confirmed_at`.
                        authClient.auth.getUser().then(function (userRes) {
                            var user = userRes && userRes.data ? userRes.data.user : (result && result.data ? result.data.user : null);
                            if (!user || ('email_confirmed_at' in user && !user.email_confirmed_at)) {
                                authClient.auth.signOut();
                                showToast("Please verify your email before logging in. Check your inbox for the verification link.", "error");
                                return;
                            }
                            handleUserLogin(user);
                            showToast("Login successful! Welcome back.", "success");
                        });
                    }).catch(function (e) {
                        showToast("Error: " + e.message, "error");
                        toggleLoading(false);
                    });
                } else {
                    authClient.auth.signUp({
                        email: pending.email,
                        password: pending.password,
                        options: {
                            data: {
                                username: pending.username || pending.email.split('@')[0]
                            },
                            emailRedirectTo: (window.APP_BASE_URL && window.APP_BASE_URL.length > 0 ? window.APP_BASE_URL : window.location.origin)
                        }
                    }).then(function (result) {
                        toggleLoading(false);
                        if (result.error) throw result.error;
                        const isConfirmed = !!(result && result.data && result.data.user && result.data.user.email_confirmed_at);
                        if (isConfirmed) {
                            showToast("Registration successful! You can now log in.", "success");
                        } else {
                            showToast("Registration successful! Please check your email to verify your account.", "success");
                        }
                        setTimeout(function () {
                            switchAuthTab('login');
                        }, 2000);
                    }).catch(function (e) {
                        showToast("Error: " + e.message, "error");
                        toggleLoading(false);
                    });
                }
            }
        });
        return;
    }

    var authClient = window.supabaseClient;
    if (!authClient) {
        showToast("Auth system not loaded. Please refresh the page.", "error");
        return;
    }

    toggleLoading(true);

    if (type === "login") {
        authClient.auth.signInWithPassword({
            email: email,
            password: password,
        }).then(function (result) {
            toggleLoading(false);
            if (result.error) throw result.error;

                // Re-fetch user to avoid stale/missing `email_confirmed_at`.
                authClient.auth.getUser().then(function (userRes) {
                    var user = userRes && userRes.data ? userRes.data.user : (result && result.data ? result.data.user : null);
                    if (!user || ('email_confirmed_at' in user && !user.email_confirmed_at)) {
                        authClient.auth.signOut();
                        showToast("Please verify your email before logging in. Check your inbox for the verification link.", "error");
                        return;
                    }
                    handleUserLogin(user);
                });
            showToast("Login successful! Welcome back.", "success");
        }).catch(function (e) {
            showToast("Error: " + e.message, "error");
            toggleLoading(false);
        });
    } else {
        authClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username || email.split('@')[0]
                },
                emailRedirectTo: (window.APP_BASE_URL && window.APP_BASE_URL.length > 0 ? window.APP_BASE_URL : window.location.origin)
            }
        }).then(function (result) {
            toggleLoading(false);
            if (result.error) throw result.error;
            const isConfirmed = !!(result && result.data && result.data.user && result.data.user.email_confirmed_at);
            if (isConfirmed) {
                showToast("Registration successful! You can now log in.", "success");
            } else {
                showToast("Registration successful! Please check your email to verify your account.", "success");
            }
            setTimeout(function () {
                switchAuthTab('login');
            }, 2000);
        }).catch(function (e) {
            showToast("Error: " + e.message, "error");
            toggleLoading(false);
        });
    }
};

window.performOAuth = function (provider) {
    if (!window.supabaseClientReady) {
        showToast('OAuth system loading...', 'info');
        window.pendingOAuthRequest = { provider: provider };
        window.addEventListener('supabaseReady', function handleSupabaseReady() {
            window.removeEventListener('supabaseReady', handleSupabaseReady);
            if (window.pendingOAuthRequest) {
                var pending = window.pendingOAuthRequest;
                window.pendingOAuthRequest = null;
                var authClient = window.supabaseClient;
                if (!authClient) return;

                toggleLoading(true);
                authClient.auth.signInWithOAuth({
                    provider: pending.provider,
                    options: {
                        redirectTo: (window.APP_BASE_URL && window.APP_BASE_URL.length > 0 ? window.APP_BASE_URL : window.location.origin) + "/auth/callback",
                        skipBrowserRedirect: false
                    }
                }).then(function (result) {
                    if (result.error) throw result.error;
                    showToast("Redirecting to " + pending.provider + "...", "info");
                }).catch(function (e) {
                    showToast("OAuth failed: " + e.message, "error");
                    toggleLoading(false);
                });
            }
        });
        return;
    }

    toggleLoading(true);
    var authClient = window.supabaseClient;
    if (!authClient) {
        showToast("Auth system not loaded. Please refresh the page.", "error");
        toggleLoading(false);
        return;
    }

    authClient.auth.signInWithOAuth({
        provider: provider,
        options: {
            redirectTo: (window.APP_BASE_URL && window.APP_BASE_URL.length > 0 ? window.APP_BASE_URL : window.location.origin) + "/auth/callback",
            skipBrowserRedirect: false
        }
    }).then(function (result) {
        if (result.error) throw result.error;
        showToast("Redirecting to " + provider + "...", "info");
    }).catch(function (e) {
        showToast("OAuth failed: " + e.message, "error");
        toggleLoading(false);
    });
};

window.startDemo = function () {
    if (window.isDemoMode) {
        showToast("Demo mode is already running!", "info");
        return;
    }

    var authScreen = document.getElementById("auth-screen");
    if (authScreen) authScreen.classList.add("hidden");
    var mainApp = document.getElementById("main-app");
    if (mainApp) mainApp.classList.remove("hidden");

    window.isDemoMode = true;

    window.localFiles = [
        { id: "demo-1", name: "index.html", content: "<!DOCTYPE html>\n<html>\n<head>\n    <title>Demo Project</title>\n</head>\n<body>\n    <h1>Welcome to Bekaei Demo!</h1>\n    <p>This is a demo project that will last 1 minute.</p>\n</body>\n</html>", lang: "html" },
        { id: "demo-2", name: "style.css", content: "body {\n    font-family: Arial, sans-serif;\n    background: #f5f5f5;\n    color: #333;\n    padding: 20px;\n}\nh1 {\n    color: #6366f1;\n}", lang: "css" },
        { id: "demo-3", name: "script.js", content: "// Demo JavaScript\nconsole.log(\"Hello from Bekaei Demo!\");\n\nfunction greet(name) {\n    return \"Hello, \" + name + \"!\";\n}\n\nconsole.log(greet(\"User\"));", lang: "javascript" }
    ];

    window.demoTimeRemaining = 60;
    var timerOverlay = document.getElementById("demo-timer-overlay");
    if (timerOverlay) timerOverlay.classList.remove("hidden");

    var demoTimer = document.getElementById("demo-timer");
    if (demoTimer) demoTimer.innerText = "1:00";

    window.demoTimerInterval = setInterval(function () {
        window.demoTimeRemaining--;
        var mins = Math.floor(window.demoTimeRemaining / 60);
        var secs = window.demoTimeRemaining % 60;
        var dt = document.getElementById("demo-timer");
        if (dt) dt.innerText = mins + ":" + (secs < 10 ? "0" : "") + secs;

        if (window.demoTimeRemaining <= 0) {
            endDemo();
        }
    }, 1000);

    if (!window.editor) {
        initMonaco().then(function () {
            renderExplorer();
            switchFile("demo-1");
            showToast("Demo mode started! You have 1 minute.", "info");
        });
    } else {
        renderExplorer();
        switchFile("demo-1");
        showToast("Demo mode started! You have 1 minute.", "info");
    }
};

window.logoutUser = logoutUser;
window.toggleDashboardSidebar = toggleDashboardSidebar;
window.closeDashboardSidebar = closeDashboardSidebar;
window.closeIdePanels = closeIdePanels;
window.sendPasswordResetRequest = sendPasswordResetRequest;
window.submitRecoveryPassword = submitRecoveryPassword;
window.switchAuthTab = switchAuthTab;
window.togglePasswordVisibility = togglePasswordVisibility;
window.endDemo = endDemo;
window.returnToDashboard = returnToDashboard;
window.loadProjects = loadProjects;
window.loadDeployDashboard = loadDeployDashboard;
window.createRoom = createRoom;
window.joinRoomViaId = joinRoomViaId;
window.enterRoom = enterRoom;
window.initMonaco = initMonaco;
window.renderExplorer = renderExplorer;
window.switchFile = switchFile;
window.createNewFile = createNewFile;
window.exportCurrentFile = exportCurrentFile;
window.executeCode = executeCode;
window.switchBottomTab = switchBottomTab;
window.clearTerminal = clearTerminal;
window.closeTerminal = closeTerminal;
window.minimizeTerminal = minimizeTerminal;
window.maximizeTerminal = maximizeTerminal;
window.openModal = openModal;
window.closeModal = closeModal;
window.togglePanel = togglePanel;
window.initSettingsInputs = initSettingsInputs;
window.saveSettings = saveSettings;
window.openSettings = openSettings;
window.closeFriendProfileModal = closeFriendProfileModal;
window.hideMessage = hideMessage;
window.unhideMessage = unhideMessage;
window.TabManager = TabManager;
window.EditorManager = EditorManager;
window.toggleSidebarAutoHide = toggleSidebarAutoHide;
window.updateAIModels = updateAIModels;
window.toggleAIMode = toggleAIMode;
window.sendAIMessage = sendAIMessage;
window.sendChatMessage = sendChatMessage;
window.handleAIInput = handleAIInput;
window.handleChatInput = handleChatInput;
window.handleFriendsChatInput = handleFriendsChatInput;

window.supabaseClientReady = !!(window.supabaseClient && typeof window.supabaseClient.from === 'function');
// Only install a stub if Supabase client isn't ready yet.
// IMPORTANT: never overwrite a real Supabase client, otherwise .from() breaks.
if (!window.supabaseClientReady) {
    window.supabaseClient = window.supabaseClient || {};
    window.supabaseClient.auth = window.supabaseClient.auth || {
        signInWithPassword: function () { return Promise.reject(new Error('Supabase client not ready')); },
        signUp: function () { return Promise.reject(new Error('Supabase client not ready')); },
        signInWithOAuth: function () { return Promise.reject(new Error('Supabase client not ready')); },
        signOut: function () { return Promise.reject(new Error('Supabase client not ready')); },
        resetPasswordForEmail: function () { return Promise.reject(new Error('Supabase client not ready')); },
        updateUser: function () { return Promise.reject(new Error('Supabase client not ready')); },
        onAuthStateChange: function () { return { unsubscribe: function () { } }; }
    };
}

function checkLoginState() {
    var loggedIn = localStorage.getItem('bekaei_logged_in');
    var userData = localStorage.getItem('bekaei_user');

    if (loggedIn === 'true' && userData) {
        try {
            var user = JSON.parse(userData);
            if (user && user.id) {
                handleUserLogin(user);
                return true;
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    return false;
}

function initApp() {
    var isLoggedIn = checkLoginState();
    if (!isLoggedIn) {
        var authScreen = document.getElementById("auth-screen");
        if (authScreen) authScreen.classList.remove("hidden");

        var dashScreen = document.getElementById("dashboard-screen");
        if (dashScreen) dashScreen.classList.add("hidden");

        var mainApp = document.getElementById("main-app");
        if (mainApp) mainApp.classList.add("hidden");
    }
    initMobileDetection();
    setupNetworkListeners();
    loadUserSettings();
    initEnhancedFeatures();
    setupButtonEventListeners();
    try {
        if (window.supabaseClientReady) setupAuthListener();
    } catch (e) { }
}

function setupButtonEventListeners() {
    var demoBtn = document.getElementById('demo-btn');
    if (demoBtn) {
        demoBtn.onclick = function () {
            if (typeof window.startDemo === 'function') {
                window.startDemo();
            } else {
                alert('Demo function not available yet.');
            }
        };
    }

    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = function () {
            if (typeof window.performAuth === 'function') {
                window.performAuth('login');
            } else {
                alert('Authentication system not ready.');
            }
        };
    }

    var registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.onclick = function () {
            if (typeof window.performAuth === 'function') {
                window.performAuth('register');
            } else {
                alert('Authentication system not ready.');
            }
        };
    }

    var togglePassLogin = document.getElementById('toggle-pass-login');
    if (togglePassLogin) {
        togglePassLogin.style.cursor = 'pointer';
        togglePassLogin.onclick = function () {
            window.togglePasswordVisibility('password-input', 'toggle-pass-login');
        };
    }

    var togglePassReg = document.getElementById('toggle-pass-reg');
    if (togglePassReg) {
        togglePassReg.style.cursor = 'pointer';
        togglePassReg.onclick = function () {
            window.togglePasswordVisibility('reg-password-input', 'toggle-pass-reg');
        };
    }

    var loginTabBtn = document.getElementById('tab-login-btn');
    var registerTabBtn = document.getElementById('tab-register-btn');
    if (loginTabBtn && registerTabBtn) {
        loginTabBtn.onclick = function () {
            var loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.classList.remove('hidden');
            var registerForm = document.getElementById('register-form');
            if (registerForm) registerForm.classList.add('hidden');
            loginTabBtn.classList.add('active');
            registerTabBtn.classList.remove('active');
        };

        registerTabBtn.onclick = function () {
            var loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.classList.add('hidden');
            var registerForm = document.getElementById('register-form');
            if (registerForm) registerForm.classList.remove('hidden');
            registerTabBtn.classList.add('active');
            loginTabBtn.classList.remove('active');
        };
    }

    var signupLink = document.getElementById('signup-link');
    if (signupLink) {
        signupLink.onclick = function (e) {
            e.preventDefault();
            var loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.classList.add('hidden');
            var registerForm = document.getElementById('register-form');
            if (registerForm) registerForm.classList.remove('hidden');
            var tabReg = document.getElementById('tab-register-btn');
            if (tabReg) tabReg.classList.add('active');
            var tabLog = document.getElementById('tab-login-btn');
            if (tabLog) tabLog.classList.remove('active');
        };
    }

    var forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
        forgotLink.onclick = function (e) {
            e.preventDefault();
            var loginEmail = document.getElementById('email-input');
            var forgotEmail = document.getElementById('forgot-password-email');
            if (loginEmail && forgotEmail) forgotEmail.value = loginEmail.value || '';
            openModal('forgot-password-modal');
        };
    }
    var forgotSubmit = document.getElementById('forgot-password-submit-btn');
    if (forgotSubmit) {
        forgotSubmit.onclick = function () {
            if (typeof sendPasswordResetRequest === 'function') sendPasswordResetRequest();
        };
    }
    var updatePwSubmit = document.getElementById('update-password-submit-btn');
    if (updatePwSubmit) {
        updatePwSubmit.onclick = function () {
            if (typeof submitRecoveryPassword === 'function') submitRecoveryPassword();
        };
    }
    var updatePwCancel = document.getElementById('update-password-cancel-btn');
    if (updatePwCancel) {
        updatePwCancel.onclick = function () {
            closeModal('update-password-modal');
            if (window.supabaseClient && window.supabaseClient.auth && typeof window.supabaseClient.auth.signOut === 'function') {
                window.supabaseClient.auth.signOut().catch(function () { });
            }
        };
    }
}

window.addEventListener('supabaseReady', function () {
    window.supabaseClientReady = true;
    try { setupAuthListener(); } catch (e) { console.warn(e); }
});

var TeamChat = {
    messages: [],
    isChatEnabled: false,

    init: function () {
        this.isChatEnabled = true;
        var chatArea = document.getElementById("team-chat-area");
        if (chatArea) {
            chatArea.innerHTML = '<div style="color:#888;text-align:center;padding:20px;font-size:12px;">Team chat is ready. Start chatting with your collaborators!</div>';
        }
        showToast("Team chat enabled", "info");
    },

    addMessage: function (user, text) {
        if (!this.isChatEnabled) return;
        this.messages.push({ user: user, text: text, time: Date.now() });
        var chatArea = document.getElementById("team-chat-area");
        if (!chatArea) return;

        if (chatArea.children.length === 1 && chatArea.children[0].style.textAlign === "center") {
            chatArea.innerHTML = "";
        }

        var msgDiv = document.createElement("div");
        msgDiv.className = "chat-message";
        msgDiv.style.cssText = "margin-bottom:10px;padding:10px;border-radius:12px;max-width:80%;word-wrap:break-word;animation:fadeIn 0.3s ease;";

        var isSelf = user === currentUsername;
        if (isSelf) {
            msgDiv.style.marginLeft = "auto";
            msgDiv.style.background = "linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(167, 139, 250, 0.2))";
            msgDiv.style.border = "1px solid rgba(99, 102, 241, 0.4)";
        } else {
            msgDiv.style.background = "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 197, 253, 0.1))";
            msgDiv.style.border = "1px solid rgba(59, 130, 246, 0.3)";
        }

        var time = new Date();
        var timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
            '<strong style="color:#6366f1;font-size:12px;">' + escapeHtml(user) + '</strong>' +
            '<span style="color:#94a3b8;font-size:10px;">' + timeStr + '</span>' +
            '</div>' +
            '<div style="color:#0f172a;font-size:13px;line-height:1.4;">' + escapeHtml(text) + '</div>';

        chatArea.appendChild(msgDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        this.updateBadge();
    },

    updateBadge: function () {
        var badge = document.getElementById("chat-badge");
        if (badge) {
            var unreadCount = this.messages.filter(function (msg) {
                return msg.user !== currentUsername;
            }).length;

            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove("hidden");
            } else {
                badge.classList.add("hidden");
            }
        }
    },

    sendMessage: function (text) {
        if (!text || !text.trim()) return;
        if (!currentRoomId) {
            showToast("Join a project first to use team chat", "error");
            return;
        }

        var trimmedText = text.trim();

        if (socket && socket.connected) {
            socket.emit('chat-message', {
                roomId: currentRoomId,
                message: trimmedText,
                username: currentUsername
            });
        } else if (window.supabaseClient) {
            // When Supabase realtime is enabled (see joinRoomForCollaboration),
            // the INSERT event will add the message to the UI for everyone (including us).
            // Avoid optimistic duplicate add.
            window.supabaseClient
                .from('messages')
                .insert([{ room_id: currentRoomId, user_id: currentUser ? currentUser.id : null, username: currentUsername, text: trimmedText }])
                .then(function (res) {
                    if (res && res.error) showToast('Message failed to send', 'error');
                });
        } else {
            showToast("Not connected to chat. Message sent locally.", "warning");
            this.addMessage(currentUsername, trimmedText);
        }

        var input = document.getElementById("team-chat-input");
        if (input) {
            input.value = "";
            input.focus();
        }
        if (socket && socket.connected && currentRoomId) {
            socket.emit('chat-typing', { roomId: currentRoomId, username: currentUsername, isTyping: false });
        }
    },

    clearMessages: function () {
        this.messages = [];
        var chatArea = document.getElementById("team-chat-area");
        if (chatArea) {
            chatArea.innerHTML = '<div style="color:#888;text-align:center;padding:20px;font-size:12px;">Chat cleared. Start a new conversation!</div>';
        }
        this.updateBadge();
    }
};

function handleChatInput(event) {
    if (socket && socket.connected && currentRoomId) {
        socket.emit('chat-typing', { roomId: currentRoomId, username: currentUsername, isTyping: true });
        if (teamTypingEmitTimer) clearTimeout(teamTypingEmitTimer);
        teamTypingEmitTimer = setTimeout(function () {
            if (socket && socket.connected && currentRoomId) {
                socket.emit('chat-typing', { roomId: currentRoomId, username: currentUsername, isTyping: false });
            }
        }, 1200);
    }
    if (event.key === "Enter") {
        var input = document.getElementById("team-chat-input");
        if (input) {
            TeamChat.sendMessage(input.value);
        }
    }
}

function sendChatMessage() {
    var input = document.getElementById("team-chat-input");
    if (input) {
        TeamChat.sendMessage(input.value);
    }
}

function addChatStyles() {
    var style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .chat-message {
            animation: fadeIn 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}
addChatStyles();

function formatMarkdown(text) {
    if (!text) return "";
    // Escape HTML first
    var safe = escapeHtml(text);
    // Convert markdown bold
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert markdown italic
    safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convert code blocks with copy button
    safe = safe.replace(/```([\w]*)\n?([\s\S]*?)```/g, function(match, lang, code) {
        var codeId = 'code-' + Math.random().toString(36).substr(2, 9);
        return '<div style="position:relative;margin:8px 0;"><button onclick="copyCodeBlock(\'' + codeId + '\')" style="position:absolute;top:4px;right:4px;padding:4px 8px;font-size:11px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#fff;cursor:pointer;z-index:1;"><i class="fa-solid fa-copy"></i> Copy</button><pre id="' + codeId + '" style="background:#1e293b;padding:8px;border-radius:4px;overflow-x:auto;margin:0;"><code>' + code + '</code></pre></div>';
    });
    // Convert inline code
    safe = safe.replace(/`([^`]+)`/g, '<code style="background:#1e293b;padding:2px 4px;border-radius:3px;font-family:monospace;">$1</code>');
    // Convert bullet points
    safe = safe.replace(/^[•\-] (.*)$/gm, '<li style="margin-left:16px;">$1</li>');
    // Convert headers
    safe = safe.replace(/^#{1,6} (.*)$/gm, '<strong style="font-size:1.1em;display:block;margin-top:8px;">$1</strong>');
    // Convert newlines to breaks (only outside of pre tags)
    safe = safe.replace(/\n/g, '<br>');
    return safe;
}

function copyCodeBlock(codeId) {
    var preElement = document.getElementById(codeId);
    if (!preElement) return;
    var code = preElement.textContent || preElement.innerText;
    navigator.clipboard.writeText(code).then(function() {
        showToast('Code copied to clipboard', 'success');
    }).catch(function(err) {
        showToast('Failed to copy code', 'error');
    });
}

var AIAssistant = {
    chatHistory: [],
    addMessage: function (role, content) {
        this.chatHistory.push({ role: role, content: content });
        var chatArea = document.getElementById("ai-chat-area");
        if (!chatArea) return;

        var msgDiv = document.createElement("div");
        msgDiv.style.cssText = "margin-bottom:12px;padding:12px;border-radius:8px;max-width:90%;word-wrap:break-word;font-size:13px;line-height:1.5;";
        msgDiv.style.color = "#0f172a";

        if (role === "user") {
            msgDiv.style.background = "rgba(99, 102, 241, 0.2)";
            msgDiv.style.marginLeft = "auto";
            msgDiv.style.textAlign = "right";
            msgDiv.innerHTML = "<strong>You:</strong><br>" + escapeHtml(content);
        } else {
            msgDiv.style.background = "rgba(34, 197, 94, 0.1)";
            msgDiv.innerHTML = "<strong>AI:</strong><br>" + formatMarkdown(content);
        }

        chatArea.appendChild(msgDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    },
    callAPI: async function (model, message, userApiKey, provider) {
        try {
            var response = await fetch("/api/ai-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: model,
                    message: message,
                    userApiKey: userApiKey,
                    provider: provider || "openrouter",
                    history: this.chatHistory.slice(-10)
                })
            });
            var data = await response.json();
            if (data && data.error) {
                return "Error: " + data.error;
            }
            return data.response || "Error: Unknown error";
        } catch (e) {
            return "Error: " + e.message;
        }
    },
    callAPIThinking: async function (prompt, model, userApiKey, provider) {
        try {
            var response = await fetch("/api/ai-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: model || "openai/gpt-3.5-turbo",
                    message: prompt,
                    userApiKey: userApiKey,
                    provider: provider || "openrouter",
                    history: []
                })
            });
            var data = await response.json();
            return data.response || "Error: " + (data.error || "Unknown error");
        } catch (e) {
            return "Error: " + e.message;
        }
    }
};

function handleAIInput(event) {
    if (event.key === "Enter") {
        sendAIMessage();
    }
}

function toggleAIConfig() {
    var config = document.getElementById("ai-config");
    if (config) {
        config.style.display = config.style.display === "none" ? "block" : "none";
    }
}

function toggleAIMode() {
    var modeInput = document.getElementById("ai-mode");
    if (!modeInput) return;
    var mode = modeInput.value;
    var chatArea = document.getElementById("ai-chat-area");
    var input = document.getElementById("ai-chat-input");
    var fixControls = document.getElementById("ai-fix-controls");
    var fixInstruction = document.getElementById("ai-fix-instruction");

    // Clear any pending discussion modes
    window.autoActDiscussionMode = false;
    window.thinkingDiscussionMode = false;
    window.autoActContext = null;
    window.thinkingContext = null;

    if (fixControls) fixControls.classList.add("hidden");

    if (mode === "auto") {
        if (chatArea) {
            chatArea.innerHTML = '<div style="padding:10px;color:#888;text-align:center;font-size:12px;"><i class="fa-solid fa-magic"></i> Auto Act Mode<br><span style="font-size:10px;">Describe what you want and I\'ll implement it</span></div>';
        }
        if (input) input.placeholder = "Describe what to build (e.g., 'add a red button')...";
        showToast("Auto Act mode enabled", "info");
    } else if (mode === "fix") {
        if (fixControls) {
            fixControls.classList.remove("hidden");
            refreshFixFileDropdown();
        }
        if (chatArea) {
            chatArea.innerHTML = '<div style="padding:10px;color:#888;text-align:center;font-size:12px;"><i class="fa-solid fa-wrench"></i> Fix Mode<br><span style="font-size:10px;">Select file and line range, then click send.</span></div>';
        }
        if (input) input.placeholder = "Optional extra instruction...";
        if (fixInstruction) fixInstruction.placeholder = "Describe what should be fixed in the selected lines";
        showToast("Fix mode enabled", "info");
    } else if (mode === "thinking") {
        if (chatArea) {
            chatArea.innerHTML = '<div style="padding:10px;color:#888;text-align:center;font-size:12px;"><i class="fa-solid fa-brain"></i> Thinking Mode<br><span style="font-size:10px;">I\'ll understand deeply and implement properly</span></div>';
        }
        if (input) input.placeholder = "Describe what to build in detail...";
        showToast("Thinking mode enabled - Deep analysis", "info");
    } else {
        if (chatArea) chatArea.innerHTML = "";
        if (input) input.placeholder = "Ask AI anything...";
        showToast("Chat mode enabled", "info");
    }
}

function refreshFixFileDropdown() {
    var select = document.getElementById("ai-fix-file-select");
    if (!select) return;
    select.innerHTML = "";
    (localFiles || []).forEach(function (f) {
        var opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = f.name;
        if (f.id === activeFileId) opt.selected = true;
        select.appendChild(opt);
    });
}

async function implementWithAIThinking(message, model, userApiKey, provider) {
    var chatArea = document.getElementById("ai-chat-area");
    
    // Step 1: Deep Analysis
    var analysisPrompt = "You are an expert full-stack developer. Perform a DEEP ANALYSIS of this request:\n\n" +
        "Request: " + message + "\n\n" +
        "Provide a comprehensive analysis including:\n" +
        "1. 🔍 **Problem Understanding** - What exactly needs to be built\n" +
        "2. 🏗️ **Architecture & Approach** - Best technical approach\n" +
        "3. 📁 **File Structure** - Which files to create and their purposes\n" +
        "4. 🎨 **Design Considerations** - UI/UX approach\n" +
        "5. ⚡ **Key Features** - Main functionality to implement\n" +
        "6. 🔧 **Technical Details** - Important implementation notes\n\n" +
        "This is the ANALYSIS phase only - do not write code yet.";
    
    var loading = document.getElementById("ai-loading");
    if (loading) loading.innerHTML = "<strong>AI:</strong> Performing deep analysis...";
    
    var analysisResponse = await AIAssistant.callAPIThinking(analysisPrompt, model, userApiKey, provider);
    
    // Show the deep analysis
    AIAssistant.addMessage("assistant", "🧠 **Deep Analysis Mode**\n\n" + analysisResponse);
    
    if (chatArea) {
        var continueDiv = document.createElement("div");
        continueDiv.id = "ai-thinking-continue";
        continueDiv.style.cssText = "margin:12px 0;padding:12px;background:rgba(34,197,94,0.1);border-radius:8px;text-align:center;";
        continueDiv.innerHTML = 
            '<div style="color:#64748b;font-size:12px;margin-bottom:8px;">Analysis complete. Choose what to do next:</div>' +
            '<button onclick="continueThinkingImplementation()" class="action-btn" style="margin-right:8px;">' +
            '<i class="fa-solid fa-wand-magic-sparkles"></i> Implement</button>' +
            '<button onclick="generateThinkingCodeExplanation()" class="action-btn secondary">' +
            '<i class="fa-solid fa-code"></i> Code</button>';
        chatArea.appendChild(continueDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    // Store context
    window.thinkingContext = {
        message: message,
        model: model,
        userApiKey: userApiKey,
        provider: provider,
        analysis: analysisResponse
    };
}

async function generateThinkingCodeExplanation() {
    var context = window.thinkingContext;
    if (!context) return showToast("No pending prompt", "warning");
    var continueDiv = document.getElementById("ai-thinking-continue");
    if (continueDiv) continueDiv.remove();
    var prompt = "Based on this analysis:\n" + context.analysis + "\n\n" +
        "For this request:\n" + context.message + "\n\n" +
        "Return:\n1) concise explanation\n2) complete code blocks with filenames. " +
        "Do not say you implemented files.";
    var response = await AIAssistant.callAPIThinking(prompt, context.model, context.userApiKey, context.provider);
    AIAssistant.addMessage("assistant", "### Code + Explanation\n\n" + response);
    window.thinkingContext = null;
}

async function continueThinkingImplementation() {
    var context = window.thinkingContext;
    if (!context) {
        showToast("No pending implementation", "warning");
        return;
    }
    
    var continueDiv = document.getElementById("ai-thinking-continue");
    if (continueDiv) continueDiv.remove();
    
    var chatArea = document.getElementById("ai-chat-area");
    var loadingDiv = document.createElement("div");
    loadingDiv.id = "ai-loading";
    loadingDiv.style.cssText = "margin-bottom:12px;color:#888;font-style:italic;";
    loadingDiv.innerHTML = "<strong>AI:</strong> Generating complete implementation...";
    if (chatArea) {
        chatArea.appendChild(loadingDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    var codePrompt = "Based on this deep analysis:\n" + context.analysis + "\n\n" +
        "Now generate the COMPLETE, PRODUCTION-READY implementation for:\n" + context.message + "\n\n" +
        "Requirements:\n" +
        "1. HTML: semantic, accessible, well-structured\n" +
        "2. CSS: modern, responsive, beautiful design with smooth effects\n" +
        "3. JavaScript: clean, functional, properly linked\n" +
        "4. Return code blocks with filenames like: ```html index.html\n...\n```\n\n" +
        "Create a complete, working implementation that matches the analysis.";
    
    var response = await AIAssistant.callAPIThinking(codePrompt, context.model, context.userApiKey, context.provider);
    
    var loading = document.getElementById("ai-loading");
    if (loading) loading.remove();

    var codeBlocks = response.match(/(?:^|\n)```[^\n]*\n([\s\S]*?)\n```/g) || [];

    if (codeBlocks.length === 0) {
        AIAssistant.addMessage("assistant", response);
        showToast("No code blocks found in response", "warning");
        window.thinkingContext = null;
        return;
    }

    var actions = [];
    var filesCreated = [];

    console.log("[Thinking] Processing " + codeBlocks.length + " code blocks...");

    codeBlocks.forEach(function (codeBlock) {
        var lang = extractLanguageFromCodeBlock(codeBlock);
        var explicitFilename = extractFilenameFromCodeBlock(codeBlock);
        var code = extractCodeFromCodeBlock(codeBlock);
        if (!lang) {
            console.warn("[Thinking] Skipping code block - no language detected");
            return;
        }

        var ext = getExtensionForLanguage(lang);
        var filename = null;

        if (explicitFilename) {
            filename = explicitFilename;
        } else if (lang === "html") {
            filename = "index.html";
        } else if (lang === "css") {
            filename = "style.css";
        } else if (lang === "javascript") {
            filename = "script.js";
        } else if (localFiles.length > 0) {
            var existingFile = localFiles.find(function (f) { return f.name.endsWith("." + ext); });
            if (existingFile) {
                filename = existingFile.name;
            } else {
                filename = "file." + ext;
            }
        } else {
            filename = "file." + ext;
        }

        console.log("[Thinking] Processing file: " + filename + " (lang: " + lang + ")");

        var existingFile = localFiles.find(function (f) { return f.name === filename; });

        if (existingFile) {
            console.log("[Thinking] Updating existing file: " + filename);
            existingFile.content = code;
            actions.push("Updated " + filename);
            if (activeFileId === existingFile.id && editor) {
                console.log("[Thinking] Updating editor for active file: " + filename);
                editor.setValue(code);
            } else {
                console.log("[Thinking] File not active in editor, content updated in memory: " + filename);
            }
        } else {
            console.log("[Thinking] Creating new file: " + filename);
            var id = "local-" + Math.random().toString(36).substr(2, 9);
            localFiles.push({ id: id, name: filename, content: code, lang: lang });
            filesCreated.push(filename);
            actions.push("Created " + filename);
        }
    });

    console.log("[Thinking] Actions: " + actions.join(", "));
    renderExplorer();

    if (filesCreated.length > 0) {
        var newFile = localFiles.find(function (f) { return f.name === filesCreated[0]; });
        if (newFile) {
            switchFile(newFile.id);
        }
    }

    if (localFiles.find(function (f) { return f.name === "index.html"; })) {
        updateBrowserPreview();
    }

    // Save to server if in a room
    var saveSuccess = true;
    if (!isDemoMode && currentRoomId) {
        try {
            var saved = await ProjectStorage.saveProject();
            if (!saved) {
                saveSuccess = false;
                showToast("Files updated in memory but failed to save to cloud", "warning");
            }
        } catch (e) {
            console.error("Error saving project:", e);
            saveSuccess = false;
            showToast("Error saving to cloud: " + e.message, "error");
        }
    }

    if (actions.length > 0) {
        var actionSummary = actions.join(", ");
        AIAssistant.addMessage("assistant", "✅ **Implementation Generated**\n\n" + actionSummary + (saveSuccess ? "\n\nChanges have been saved to your project." : "\n\nChanges applied in memory (cloud save failed)."));
        showToast("✓ " + actionSummary, "success");
    } else {
        AIAssistant.addMessage("assistant", "⚠️ **No Changes Made**\n\nCode blocks were found but no files were updated.");
        showToast("No files were updated", "warning");
    }
    
    // Clear context
    window.thinkingContext = null;
}

function chatWithAIAboutThinking() {
    var continueDiv = document.getElementById("ai-thinking-continue");
    if (continueDiv) continueDiv.remove();
    
    var chatArea = document.getElementById("ai-chat-area");
    
    AIAssistant.addMessage("assistant", "💬 Let's discuss the analysis. What questions do you have?\n\n" +
        "You can:\n" +
        "• Ask for clarification on any section\n" +
        "• Request changes to the approach\n" +
        "• Add or remove features\n" +
        "• Discuss alternatives\n\n" +
        "Type 'generate' or 'code' when ready to proceed.");
    
    window.thinkingDiscussionMode = true;
    
    var input = document.getElementById("ai-chat-input");
    if (input) input.placeholder = "Discuss the analysis or type 'generate' to proceed...";
    
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

async function handleThinkingDiscussion(message) {
    var context = window.thinkingContext;
    if (!context) return false;
    
    var proceedKeywords = ['generate', 'code', 'proceed', 'continue', 'do it', 'create it', 'build it', 'make it', 'go'];
    var wantsToProceed = proceedKeywords.some(function(keyword) {
        return message.toLowerCase().includes(keyword);
    });
    
    if (wantsToProceed) {
        await continueThinkingImplementation();
        window.thinkingDiscussionMode = false;
        var input = document.getElementById("ai-chat-input");
        if (input) input.placeholder = "Describe what to build in detail...";
        return true;
    }
    
    var discussionPrompt =
        "You are discussing a deep technical analysis with the user.\n\n" +
        "Original Request: " + context.message + "\n\n" +
        "Analysis: " + context.analysis + "\n\n" +
        "User's Question: " + message + "\n\n" +
        "Provide a detailed, technical response. If they want changes, explain the implications. " +
        "Remind them to type 'generate' when ready.";
    
    var response = await AIAssistant.callAPIThinking(discussionPrompt, context.model, context.userApiKey, context.provider);
    AIAssistant.addMessage("assistant", response);
    
    var chatArea = document.getElementById("ai-chat-area");
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
    
    return true;
}

function extractLanguageFromCodeBlock(codeBlock) {
    // Supports:
    // ```html
    // ```html index.html
    // ```index.html
    var firstLine = String(codeBlock || '').split('\n')[0] || '';
    var m = firstLine.match(/^```([^\s]+)/);
    if (!m) return null;
    var token = String(m[1] || '').toLowerCase();
    if (token.includes('.') && !/^[a-z0-9_+-]+$/.test(token)) return null;
    if (token.includes('.')) {
        // filename provided instead of language
        var ext = token.split('.').pop();
        return (LANGUAGE_MAP && LANGUAGE_MAP[ext]) ? LANGUAGE_MAP[ext] : ext;
    }
    return token;
}

function extractFilenameFromCodeBlock(codeBlock) {
    // Accepts first line formats like:
    // ```html index.html
    // ```css style.css
    // ```index.html
    var firstLine = String(codeBlock || '').split('\n')[0] || '';
    var m = firstLine.match(/^```([^\s]+)(?:\s+([^\s]+))?/);
    if (!m) return null;
    var a = (m[1] || '').trim();
    var b = (m[2] || '').trim();
    var candidate = null;
    if (b && b.includes('.')) candidate = b;
    else if (a && a.includes('.')) candidate = a;
    if (!candidate) return null;
    // Basic sanitization: keep simple filenames only
    if (!/^[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$/i.test(candidate)) return null;
    return candidate;
}

function extractCodeFromCodeBlock(codeBlock) {
    var contentMatch = codeBlock.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
    return contentMatch ? contentMatch[1] : codeBlock;
}

function getExtensionForLanguage(lang) {
    var extMap = {
        "javascript": "js", "typescript": "ts", "html": "html", "css": "css",
        "python": "py", "ruby": "rb", "php": "php", "java": "java",
        "c": "c", "cpp": "cpp", "csharp": "cs", "go": "go",
        "rust": "rs", "swift": "swift", "kotlin": "kt", "scala": "scala",
        "sql": "sql", "bash": "sh", "shell": "sh", "json": "json",
        "xml": "xml", "yaml": "yaml", "markdown": "md"
    };
    return extMap[lang.toLowerCase()] || lang;
}

async function sendAIMessage() {
    var input = document.getElementById("ai-chat-input");
    var modelSelect = document.getElementById("ai-model-select");
    var modeSelect = document.getElementById("ai-mode");
    var providerSelect = document.getElementById("ai-provider");
    if (!input || !input.value.trim()) return;

    var message = input.value.trim();
    var model = modelSelect ? modelSelect.value : "openai/gpt-3.5-turbo";
    var mode = modeSelect ? modeSelect.value : "chat";
    var provider = providerSelect ? providerSelect.value : "openrouter";

    // Handle fix mode instruction input
    var fixInstructionInput = document.getElementById("ai-fix-instruction");
    if (mode === "fix") {
        message = (fixInstructionInput && fixInstructionInput.value ? fixInstructionInput.value.trim() : "") || message;
    }
    if (!message) return;

    // Try to get API key from SavedApiKeys first, then fallback to getApiKeyForProvider
    var userApiKey = "";
    if (window.SavedApiKeys && window.SavedApiKeys[provider]) {
        userApiKey = window.SavedApiKeys[provider];
    }
    // Fallback to fetching from database if not in memory
    if (!userApiKey) {
        userApiKey = await getApiKeyForProvider(provider);
    }

    if (!userApiKey) {
        showToast("Please add your API key for " + provider + " in the Dashboard Settings first.", "warning");
        returnToDashboard();
        setTimeout(function() {
            switchDashboardTab('settings');
        }, 100);
        return;
    }

    var chatArea = document.getElementById("ai-chat-area");
    var loadingDiv = document.createElement("div");
    loadingDiv.id = "ai-loading";
    loadingDiv.style.cssText = "margin-bottom:12px;color:#888;font-style:italic;";
    loadingDiv.innerHTML = "<strong>AI:</strong> " + (mode === "thinking" ? "Deep analysis..." : "Thinking...");
    if (chatArea) {
        chatArea.appendChild(loadingDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    if (mode === "auto") {
        // Check if we're in discussion mode
        if (window.autoActDiscussionMode && window.autoActContext) {
            AIAssistant.addMessage("user", message);
            input.value = "";
            await handleAutoActDiscussion(message);
        } else {
            input.value = "";
            await implementWithAI(message, model, userApiKey, provider);
        }
    } else if (mode === "fix") {
        input.value = "";
        await fixWithAI(message, model, userApiKey, provider);
    } else if (mode === "thinking") {
        // Check if we're in discussion mode
        if (window.thinkingDiscussionMode && window.thinkingContext) {
            AIAssistant.addMessage("user", message);
            input.value = "";
            await handleThinkingDiscussion(message);
        } else {
            input.value = "";
            await implementWithAIThinking(message, model, userApiKey, provider);
        }
    } else {
        AIAssistant.addMessage("user", message);
        input.value = "";
        var response = await AIAssistant.callAPI(model, message, userApiKey, provider);
        // If Gemini quota/billing blocks requests, auto-fallback to another provider if available.
        if (provider === "google" && typeof response === "string" && response.toLowerCase().includes("quota exceeded")) {
            var fallbackProviders = ["openrouter", "groq", "openai", "anthropic"];
            var fallbackProvider = null;
            var fallbackKey = null;
            for (var i = 0; i < fallbackProviders.length; i++) {
                var p = fallbackProviders[i];
                try {
                    var k = await getApiKeyForProvider(p);
                    if (k) { fallbackProvider = p; fallbackKey = k; break; }
                } catch (e) { }
            }
            if (fallbackProvider && fallbackKey) {
                response = await AIAssistant.callAPI("openai/gpt-3.5-turbo", message, fallbackKey, fallbackProvider);
                showToast("Google quota exceeded. Fell back to " + fallbackProvider + ".", "info");
            } else {
                response =
                    response +
                    "\n\nGoogle Gemini quota/billing is blocking this key. Add billing to your Google AI project or switch provider in AI settings.";
            }
        }
        var loading = document.getElementById("ai-loading");
        if (loading) loading.remove();
        AIAssistant.addMessage("assistant", response);
    }
}

async function getApiKeyForProvider(provider) {
    // Try to get user from currentUser or from Supabase session
    var userId = null;
    
    if (currentUser && currentUser.id) {
        userId = currentUser.id;
    } else if (window.supabaseClient) {
        try {
            var { data: sessionData } = await window.supabaseClient.auth.getSession();
            if (sessionData && sessionData.session && sessionData.session.user) {
                userId = sessionData.session.user.id;
                currentUser = sessionData.session.user; // Update currentUser
            }
        } catch (e) {
            console.error('Failed to get session:', e);
        }
    }
    
    if (!userId) {
        console.log('No user ID available for API key fetch');
        return null;
    }
    
    try {
        var { data, error } = await window.supabaseClient
            .from('api_keys')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', provider)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) {
            console.error('API key query error:', error);
            throw error;
        }
        
        if (data && data.length > 0) {
            console.log('Found API key for provider:', provider);
            return data[0].api_key;
        }
        
        // If no key found for specific provider, try to get any key
        var { data: anyData, error: anyError } = await window.supabaseClient
            .from('api_keys')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (anyError) {
            console.error('Any API key query error:', anyError);
            throw anyError;
        }
        
        if (anyData && anyData.length > 0) {
            console.log('Found any API key, provider:', anyData[0].provider);
            return anyData[0].api_key;
        }
        
        console.log('No API keys found for user:', userId);
        return null;
    } catch (e) {
        console.error('Failed to fetch API key:', e);
        return null;
    }
}

function updateAIModels() {
    var providerSelect = document.getElementById("ai-provider");
    var provider = providerSelect ? providerSelect.value : "openrouter";
    var modelSelect = document.getElementById("ai-model-select");
    if (!modelSelect) return;

    var models = {
        "openrouter": [
            { value: "openai/gpt-3.5-turbo", label: "GPT-3.5 Turbo (Fast)" },
            { value: "openai/gpt-4o", label: "GPT-4o (Omni)" },
            { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku (Fast)" },
            { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" }
        ],
        "groq": [
            { value: "llama3-8b-8192", label: "Llama 3 8B (Ultra Fast)" },
            { value: "llama3.1-70b-versatile", label: "Llama 3.1 70B Versatile" }
        ],
        "anthropic": [
            { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet v2" },
            { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" }
        ],
        "openai": [
            { value: "gpt-4o", label: "GPT-4o" },
            { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" }
        ],
        "google": [
            { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
            { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
            { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
            { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" }
        ],
        "custom": [
            { value: "custom", label: "Custom model" }
        ]
    };

    modelSelect.innerHTML = "";
    if (models[provider]) {
        models[provider].forEach(function (m) {
            var opt = document.createElement("option");
            opt.value = m.value;
            opt.textContent = m.label;
            modelSelect.appendChild(opt);
        });
    }
}

function setupLiveServer() {
    if (editor) {
        editor.onDidChangeModelContent(function () {
            var f = localFiles.find(function (x) { return x.id === activeFileId; });
            if (f) {
                f.content = editor.getValue();
            }
            if (f && (f.name.endsWith(".html") || f.name.endsWith(".css") || f.name.endsWith(".js"))) {
                var iframe = document.getElementById("browser-preview");
                if (iframe) {
                    if (window.liveServerTimeout) {
                        clearTimeout(window.liveServerTimeout);
                    }
                    window.liveServerTimeout = setTimeout(function () {
                        updateBrowserPreview();
                        var urlInput = document.getElementById("browser-url");
                        if (urlInput) urlInput.value = f.name;
                    }, 500);
                }
            }
        });
    }
}

function toggleSidebarAutoHide(value) {
    sidebarAutoHide = (value === "true");
    config.sidebarAutoHide = sidebarAutoHide;
    localStorage.kg_bekaei_config = JSON.stringify(config);

    if (sidebarAutoHide) {
        setupSidebarAutoHide();
    } else {
        resetSidebarAutoHide();
    }
    showToast(sidebarAutoHide ? "Auto-hide sidebar enabled" : "Auto-hide sidebar disabled", "info");
}

function setupSidebar() {
    var toggleBtn = document.getElementById('sidebar-toggle-btn');
    var sidebar = document.getElementById('sidebar-menu');
    var closeBtn = document.getElementById('sidebar-close-btn');

    if (!toggleBtn || !sidebar || !closeBtn) return;

    toggleBtn.addEventListener('click', function () {
        sidebar.classList.toggle('active');
        if (window.innerWidth <= 768) {
            toggleBtn.style.display = 'none';
        }
    });

    closeBtn.addEventListener('click', function () {
        sidebar.classList.remove('active');
        if (window.innerWidth <= 768) {
            toggleBtn.style.display = 'block';
        }
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            sidebar.classList.add('active');
            toggleBtn.style.display = 'block';
        } else {
            toggleBtn.style.display = 'block';
        }
    });

    if (window.innerWidth <= 768) {
        toggleBtn.style.display = 'block';
    } else {
        sidebar.classList.add('active');
        toggleBtn.style.display = 'block';
    }
}

function setupSidebarAutoHide() {
    var activityBar = document.querySelector(".activity-bar");
    var panelsContainer = document.querySelector(".panels-container");
    var timeout;

    if (activityBar) {
        activityBar.style.transition = "margin-left 0.2s ease";
        activityBar.addEventListener("mouseenter", function () {
            clearTimeout(timeout);
            activityBar.style.marginLeft = "0px";
        });
        activityBar.addEventListener("mouseleave", function () {
            timeout = setTimeout(function () {
                activityBar.style.marginLeft = "-48px";
            }, 300);
        });
    }

    if (panelsContainer) {
        panelsContainer.style.transition = "margin-left 0.2s ease";
        panelsContainer.addEventListener("mouseenter", function () {
            clearTimeout(timeout);
            panelsContainer.style.marginLeft = "0px";
        });
        panelsContainer.addEventListener("mouseleave", function () {
            timeout = setTimeout(function () {
                panelsContainer.style.marginLeft = "-250px";
            }, 300);
        });
    }
}

function resetSidebarAutoHide() {
    var activityBar = document.querySelector(".activity-bar");
    var panelsContainer = document.querySelector(".panels-container");

    if (activityBar) {
        activityBar.style.marginLeft = "";
        activityBar.style.transition = "";
    }

    if (panelsContainer) {
        panelsContainer.style.marginLeft = "";
        panelsContainer.style.transition = "";
    }
}

function browserBack() {
    var iframe = document.getElementById("browser-preview");
    if (iframe && iframe.contentWindow.history.length > 1) {
        iframe.contentWindow.history.back();
    }
}

function browserForward() {
    var iframe = document.getElementById("browser-preview");
    if (iframe && iframe.contentWindow.history.length > 1) {
        iframe.contentWindow.history.forward();
    }
}

function browserRefresh() {
    var iframe = document.getElementById("browser-preview");
    if (iframe && iframe.srcdoc) {
        var f = localFiles.find(function (x) { return x.id === activeFileId; });
        if (f) iframe.srcdoc = f.content;
    }
}

function refreshBrowser() {
    var iframe = document.getElementById("browser-preview");
    if (iframe) {
        iframe.src = "";
        setTimeout(function () {
            var htmlFile = localFiles.find(function (f) { return f.name === "index.html"; });
            if (htmlFile) {
                iframe.srcdoc = htmlFile.content;
            }
        }, 100);
    }
    showToast("Browser refreshed", "info");
}

function buildLinkedHTML(htmlContent) {
    if (!htmlContent || typeof htmlContent !== "string") return htmlContent;

    var linkedHTML = htmlContent;

    // Helper to find file content by name (case-insensitive)
    function getFileContent(name) {
        var f = localFiles.find(function (file) {
            return file.name.toLowerCase() === name.toLowerCase();
        });
        return f ? f.content : null;
    }

    // Replace CSS links
    var cssFiles = localFiles.filter(function (f) { return f.name.endsWith(".css"); });
    cssFiles.forEach(function (cssFile) {
        // Match both absolute and relative-looking paths (e.g., "style.css", "./style.css")
        var nameEscaped = cssFile.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var cssLinkPattern = '<link[^>]*href=["\'"]?(?:\\.\\/)?' + nameEscaped + '["\']?[^>]*>';
        var cssTag = '<style data-filename="' + cssFile.name + '">\n' + cssFile.content + '\n</style>';
        
        if (new RegExp(cssLinkPattern, 'i').test(linkedHTML)) {
            linkedHTML = linkedHTML.replace(new RegExp(cssLinkPattern, 'gi'), cssTag);
        }
    });

    // Inject missing CSS if not linked but exists (fallback)
    cssFiles.forEach(function (cssFile) {
        if (!linkedHTML.includes(cssFile.name) && !linkedHTML.toLowerCase().includes('<style data-filename="' + cssFile.name + '"')) {
            var cssTag = '<style data-filename="' + cssFile.name + '">\n' + cssFile.content + '\n</style>';
            if (linkedHTML.includes('<head>')) {
                linkedHTML = linkedHTML.replace('<head>', '<head>\n' + cssTag);
            } else if (linkedHTML.includes('<head ')) {
                linkedHTML = linkedHTML.replace(/<head[^>]*>/, '$&' + cssTag);
            }
        }
    });

    // Replace JS scripts
    var jsFiles = localFiles.filter(function (f) { return f.name.endsWith(".js"); });
    jsFiles.forEach(function (jsFile) {
        var nameEscaped = jsFile.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var scriptPattern = '<script[^>]*src=["\'"]?(?:\\.\\/)?' + nameEscaped + '["\']?[^>]*>';
        var scriptTag = '<script data-filename="' + jsFile.name + '">\n' + jsFile.content + '\n<\/script>';
        
        if (new RegExp(scriptPattern, 'i').test(linkedHTML)) {
            linkedHTML = linkedHTML.replace(new RegExp(scriptPattern, 'gi'), scriptTag);
        }
    });

    // Inject missing JS if not linked but exists (fallback for index.js/script.js)
    jsFiles.forEach(function (jsFile) {
        if ((jsFile.name === "script.js" || jsFile.name === "index.js") && 
            !linkedHTML.includes(jsFile.name) && 
            !linkedHTML.toLowerCase().includes('<script data-filename="' + jsFile.name + '"')) {
            var scriptTag = '<script data-filename="' + jsFile.name + '">\n' + jsFile.content + '\n<\/script>';
            if (linkedHTML.includes('</body>')) {
                linkedHTML = linkedHTML.replace('</body>', scriptTag + '\n</body>');
            } else {
                linkedHTML = linkedHTML + '\n' + scriptTag;
            }
        }
    });

    // Handle <img> tags relative links
    linkedHTML = linkedHTML.replace(/<img([^>]*)\ssrc=["']?(?:\.\/)?([^"'\s>]+)["']?([^>]*)>/gi, function(match, p1, src, p3) {
        var fileContent = getFileContent(src);
        if (fileContent && fileContent.startsWith('data:image')) {
            return '<img' + p1 + ' src="' + fileContent + '"' + p3 + '>';
        }
        return match;
    });

    return linkedHTML;
}

function browserHome() {
    var f = localFiles.find(function (x) { return x.name === "index.html"; });
    if (f) {
        switchFile(f.id);
        var iframe = document.getElementById("browser-preview");
        if (iframe) {
            var linkedContent = buildLinkedHTML(f.content);
            iframe.srcdoc = linkedContent;
        }
    }
}

function updateBrowserPreview() {
    var iframe = document.getElementById("browser-preview");
    if (!iframe) return;

    if (activeFileId) {
        var active = localFiles.find(function (f) { return f.id === activeFileId; });
        if (active && editor) active.content = editor.getValue();
    }

    var htmlFile = localFiles.find(function (f) { return f.name === "index.html"; });
    if (htmlFile) {
        var linkedContent = buildLinkedHTML(htmlFile.content);
        iframe.srcdoc = linkedContent;
    }
}

var ProjectStorage = {
    saveProject: async function () {
        if (!currentRoomId || !currentUser || isDemoMode) return false;

        try {
            var filesData = localFiles.map(function (f) {
                return { name: f.name, content: f.content, lang: f.lang };
            });

            var response = await fetch("/api/save-project", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId: currentRoomId, userId: currentUser.id, files: filesData })
            });

            if (!response.ok) return false;

            var contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                var data = await response.json();
                if (data.success) return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    },
    loadProject: async function (roomId) {
        if (!roomId || !currentUser) return false;

        try {
            var response = await fetch("/api/load-project?roomId=" + roomId + "&userId=" + currentUser.id);
            if (!response.ok) return false;

            var contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) return false;

            var data = await response.json();

            if (data.files && data.files.length > 0) {
                localFiles = [];
                openTabs = [];
                data.files.forEach(function (fileData) {
                    var id = "local-" + Math.random().toString(36).substr(2, 9);
                    localFiles.push({ id: id, name: fileData.name, content: fileData.content, lang: fileData.lang });
                });
                renderExplorer();
                if (localFiles.length > 0) switchFile(localFiles[0].id);
                showToast("Project loaded from cloud!", "success");
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    },
    saveProjectWithConfirmation: async function () {
        if (!currentRoomId || !currentUser || isDemoMode) return true;

        try {
            var success = await this.saveProject();
            if (success) {
                showToast("Project saved successfully", "success");
                return true;
            } else {
                return confirm("Unable to save your changes to the cloud. Continue anyway?");
            }
        } catch (e) {
            return confirm("Error saving your changes. Continue anyway?");
        }
    }
};

setInterval(function () {
    if (currentRoomId && localFiles.length > 0 && !isDemoMode) {
        ProjectStorage.saveProject();
    }
}, 30000);

window.addEventListener("beforeunload", function (e) {
    if (currentRoomId && localFiles.length > 0 && !isDemoMode) {
        ProjectStorage.saveProject();
    }
});

if (editor) {
    editor.onDidChangeModelContent(function (e) {
        // When we update the editor from a remote collaborator (setValue),
        // Monaco triggers change events too. Guard so we don't re-broadcast.
        if (isLocalChange) return;
        lastLocalEditAt = Date.now();

        if (activeFileId) {
            var file = localFiles.find(function (f) { return f.id === activeFileId; });
            if (file) {
                file.content = editor.getValue();
                if (socket && socket.connected && currentRoomId && file.remoteId && e && e.changes && e.changes.length) {
                    socket.emit('local-change', {
                        roomId: currentRoomId,
                        fileId: file.remoteId,
                        changes: e.changes
                    });
                }

                if (!isDemoMode && currentRoomId) {
                    var key = String(file.remoteId || file.id);
                    if (_pendingCloudSaveTimers[key]) clearTimeout(_pendingCloudSaveTimers[key]);
                    _pendingCloudSaveTimers[key] = setTimeout(function () {
                        broadcastFileChange(activeFileId, file.content);
                    }, 800);
                }
            }
        }
    });
}

async function fixWithAI(message, model, userApiKey, provider) {
    var selectedFileId = null;
    var fileSelect = document.getElementById("ai-fix-file-select");
    if (fileSelect && fileSelect.value) selectedFileId = fileSelect.value;
    var targetFile = localFiles.find(function (f) { return f.id === selectedFileId; }) ||
        localFiles.find(function (f) { return f.id === activeFileId; });
    if (!targetFile) {
        showToast("Please open a file first", "warning");
        return;
    }

    var fromLineInput = document.getElementById("ai-fix-from-line");
    var toLineInput = document.getElementById("ai-fix-to-line");
    var fromLine = fromLineInput ? parseInt(fromLineInput.value, 10) : NaN;
    var toLine = toLineInput ? parseInt(toLineInput.value, 10) : NaN;
    var fileContent = targetFile.id === activeFileId && editor ? editor.getValue() : targetFile.content;
    var lines = String(fileContent || "").split("\n");
    var hasRange = Number.isFinite(fromLine) && Number.isFinite(toLine) && fromLine > 0 && toLine >= fromLine;

    var rangeFrom = hasRange ? fromLine : 1;
    var rangeTo = hasRange ? Math.min(toLine, lines.length) : lines.length;
    var contextStart = Math.max(1, rangeFrom - 8);
    var contextEnd = Math.min(lines.length, rangeTo + 8);
    var snippet = lines.slice(contextStart - 1, contextEnd).map(function (line, i) {
        return (contextStart + i) + ": " + line;
    }).join("\n");

    var fixPrompt = "You are an expert code fixer. Fix the following code based on the user's instruction.\n\n" +
        "File: " + targetFile.name + "\n" +
        "Target range: lines " + rangeFrom + " to " + rangeTo + "\n" +
        "Instruction: " + message + "\n\n" +
        "Relevant context with line numbers:\n" + snippet + "\n\n" +
        "Current full code:\n" + fileContent + "\n\n" +
        "Return the ENTIRE fixed file content within a single code block. Do not include any explanations.";

    var response = await AIAssistant.callAPI(model, fixPrompt, userApiKey, provider);
    var loading = document.getElementById("ai-loading");
    if (loading) loading.remove();

    var codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/) || [null, response];
    var fixedCode = codeMatch[1].trim();

    if (fixedCode) {
        targetFile.content = fixedCode;
        if (targetFile.id === activeFileId && editor) editor.setValue(fixedCode);
        showToast("✓ File fixed", "success");
        if (targetFile.name.endsWith(".html")) updateBrowserPreview();
        if (!isDemoMode && currentRoomId) ProjectStorage.saveProject();
    } else {
        showToast("AI failed to provide a fix", "error");
    }
}

async function implementWithAI(message, model, userApiKey, provider) {
    var chatArea = document.getElementById("ai-chat-area");
    
    // Step 1: Deep Analysis
    var analysisPrompt =
        "You are an expert code analyst. Analyze the following request deeply and provide:\n" +
        "1. A clear understanding of what needs to be built\n" +
        "2. Technical approach and best practices to use\n" +
        "3. File structure needed (which files to create/modify)\n" +
        "4. Key implementation details\n\n" +
        "Request: " + message + "\n\n" +
        "Provide your analysis in a clear, structured format. Do NOT write code yet - only analysis.";
    
    var analysisLoading = document.getElementById("ai-loading");
    if (analysisLoading) {
        analysisLoading.innerHTML = "<strong>AI:</strong> Performing deep analysis...";
    }
    
    var analysisResponse = await AIAssistant.callAPI(model, analysisPrompt, userApiKey, provider);
    
    // Show the analysis in chat
    AIAssistant.addMessage("assistant", "🔍 **Deep Analysis**\n\n" + analysisResponse);
    
    // Add continue message
    if (chatArea) {
        var continueDiv = document.createElement("div");
        continueDiv.id = "ai-continue-prompt";
        continueDiv.style.cssText = "margin:12px 0;padding:12px;background:rgba(99,102,241,0.1);border-radius:8px;text-align:center;";
        continueDiv.innerHTML = 
            '<div style="color:#64748b;font-size:12px;margin-bottom:8px;">Analysis complete. Choose what to do next:</div>' +
            '<button onclick="continueAutoActImplementation()" class="action-btn" style="margin-right:8px;">' +
            '<i class="fa-solid fa-wand-magic-sparkles"></i> Implement</button>' +
            '<button onclick="generateAutoActCodeExplanation()" class="action-btn secondary">' +
            '<i class="fa-solid fa-code"></i> Code</button>';
        chatArea.appendChild(continueDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    // Store the context for continuation
    window.autoActContext = {
        message: message,
        model: model,
        userApiKey: userApiKey,
        provider: provider,
        analysis: analysisResponse
    };
}

async function generateAutoActCodeExplanation() {
    var context = window.autoActContext;
    if (!context) return showToast("No pending prompt", "warning");
    var continuePrompt = document.getElementById("ai-continue-prompt");
    if (continuePrompt) continuePrompt.remove();
    var prompt =
        "Based on this analysis:\n" + context.analysis + "\n\n" +
        "Request:\n" + context.message + "\n\n" +
        "Return a concise explanation and complete code blocks with filenames. " +
        "Do not apply files automatically.";
    var response = await AIAssistant.callAPI(context.model, prompt, context.userApiKey, context.provider);
    AIAssistant.addMessage("assistant", "### Code + Explanation\n\n" + response);
    window.autoActContext = null;
}

async function continueAutoActImplementation() {
    var context = window.autoActContext;
    if (!context) {
        showToast("No pending implementation", "warning");
        return;
    }
    
    // Remove continue prompt
    var continuePrompt = document.getElementById("ai-continue-prompt");
    if (continuePrompt) continuePrompt.remove();
    
    var chatArea = document.getElementById("ai-chat-area");
    var loadingDiv = document.createElement("div");
    loadingDiv.id = "ai-loading";
    loadingDiv.style.cssText = "margin-bottom:12px;color:#888;font-style:italic;";
    loadingDiv.innerHTML = "<strong>AI:</strong> Implementing code...";
    if (chatArea) {
        chatArea.appendChild(loadingDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    var prompt =
        "You are a coding assistant inside a multi-file editor.\n" +
        "Based on this analysis:\n" + context.analysis + "\n\n" +
        "Implement the following request:\n" + context.message + "\n\n" +
        "If you output code, ALWAYS use separate fenced code blocks per file and include the filename after the language.\n" +
        "Example:\n```html index.html\n...\n```\n```css style.css\n...\n```\n```javascript script.js\n...\n```\n\n" +
        "Create complete, working, production-ready code.";
    
    var response = await AIAssistant.callAPI(context.model, prompt, context.userApiKey, context.provider);
    
    var loading = document.getElementById("ai-loading");
    if (loading) loading.remove();

    var codeBlocks = response.match(/```[^\n]*\n[\s\S]*?```/g) || [];

    if (codeBlocks.length === 0) {
        AIAssistant.addMessage("assistant", response);
        showToast("No code blocks found in response", "warning");
        window.autoActContext = null;
        return;
    }

    var actions = [];
    var filesCreated = [];

    console.log("[AutoAct] Processing " + codeBlocks.length + " code blocks...");

    codeBlocks.forEach(function (codeBlock) {
        var lang = extractLanguageFromCodeBlock(codeBlock);
        var explicitFilename = extractFilenameFromCodeBlock(codeBlock);
        var code = extractCodeFromCodeBlock(codeBlock);
        if (!lang) {
            console.warn("[AutoAct] Skipping code block - no language detected");
            return;
        }

        var ext = getExtensionForLanguage(lang);
        var filename = null;

        if (explicitFilename) {
            filename = explicitFilename;
        } else if (lang === "html") {
            filename = "index.html";
        } else if (lang === "css") {
            filename = "style.css";
        } else if (lang === "javascript") {
            filename = "script.js";
        } else if (localFiles.length > 0) {
            var existingFile = localFiles.find(function (f) { return f.name.endsWith("." + ext); });
            if (existingFile) {
                filename = existingFile.name;
            } else {
                filename = "file." + ext;
            }
        } else {
            filename = "file." + ext;
        }

        console.log("[AutoAct] Processing file: " + filename + " (lang: " + lang + ")");

        var existingFile = localFiles.find(function (f) { return f.name === filename; });

        if (existingFile) {
            console.log("[AutoAct] Updating existing file: " + filename);
            existingFile.content = code;
            actions.push("Updated " + filename);
            if (activeFileId === existingFile.id && editor) {
                console.log("[AutoAct] Updating editor for active file: " + filename);
                editor.setValue(code);
            } else {
                console.log("[AutoAct] File not active in editor, content updated in memory: " + filename);
            }
        } else {
            console.log("[AutoAct] Creating new file: " + filename);
            var id = "local-" + Math.random().toString(36).substr(2, 9);
            localFiles.push({ id: id, name: filename, content: code, lang: lang });
            filesCreated.push(filename);
            actions.push("Created " + filename);
        }
    });

    console.log("[AutoAct] Actions: " + actions.join(", "));
    renderExplorer();

    if (filesCreated.length > 0) {
        var newFile = localFiles.find(function (f) { return f.name === filesCreated[0]; });
        if (newFile) {
            switchFile(newFile.id);
        }
    }

    if (localFiles.find(function (f) { return f.name === "index.html"; })) {
        updateBrowserPreview();
    }

    // Save to server if in a room
    var saveSuccess = true;
    if (!isDemoMode && currentRoomId) {
        try {
            var saved = await ProjectStorage.saveProject();
            if (!saved) {
                saveSuccess = false;
                showToast("Files updated in memory but failed to save to cloud", "warning");
            }
        } catch (e) {
            console.error("Error saving project:", e);
            saveSuccess = false;
            showToast("Error saving to cloud: " + e.message, "error");
        }
    }

    if (actions.length > 0) {
        var actionSummary = actions.join(", ");
        AIAssistant.addMessage("assistant", "✅ **Implementation Complete**\n\n" + actionSummary + (saveSuccess ? "\n\nChanges have been saved to your project." : "\n\nChanges applied in memory (cloud save failed)."));
        showToast("✓ " + actionSummary, "success");
    } else {
        AIAssistant.addMessage("assistant", "⚠️ **No Changes Made**\n\nCode blocks were found but no files were updated.");
        showToast("No files were updated", "warning");
    }
    
    // Clear the context
    window.autoActContext = null;
}

function chatWithAIAboutImplementation() {
    var continuePrompt = document.getElementById("ai-continue-prompt");
    if (continuePrompt) continuePrompt.remove();
    
    var chatArea = document.getElementById("ai-chat-area");
    
    AIAssistant.addMessage("assistant", "💬 Let's discuss the implementation. What would you like to know or change?\n\n" +
        "You can ask me to:\n" +
        "• Explain any part of the analysis\n" +
        "• Modify the approach\n" +
        "• Add specific features\n" +
        "• Change the file structure\n\n" +
        "Type your message and I'll respond. When you're ready, just say 'implement' or 'go' and I'll proceed.");
    
    // Enable discussion mode
    window.autoActDiscussionMode = true;
    
    // Change input placeholder
    var input = document.getElementById("ai-chat-input");
    if (input) input.placeholder = "Ask about the implementation or type 'implement' to proceed...";
    
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

async function handleAutoActDiscussion(message) {
    var context = window.autoActContext;
    if (!context) return false;
    
    // Check if user wants to proceed with implementation
    var proceedKeywords = ['implement', 'go', 'proceed', 'continue', 'do it', 'create it', 'build it', 'make it'];
    var wantsToProceed = proceedKeywords.some(function(keyword) {
        return message.toLowerCase().includes(keyword);
    });
    
    if (wantsToProceed) {
        await continueAutoActImplementation();
        window.autoActDiscussionMode = false;
        var input = document.getElementById("ai-chat-input");
        if (input) input.placeholder = "Describe what to build...";
        return true;
    }
    
    // Otherwise, continue the discussion
    var discussionPrompt =
        "You are discussing the implementation of a feature with the user.\n\n" +
        "Original Request: " + context.message + "\n\n" +
        "Previous Analysis: " + context.analysis + "\n\n" +
        "User's Question/Comment: " + message + "\n\n" +
        "Provide a helpful, detailed response. If they ask to change something, acknowledge it and explain how it would affect the implementation. " +
        "Keep your response conversational but informative. At the end, remind them they can type 'implement' when ready to proceed.";
    
    var response = await AIAssistant.callAPI(context.model, discussionPrompt, context.userApiKey, context.provider);
    AIAssistant.addMessage("assistant", response);
    
    var chatArea = document.getElementById("ai-chat-area");
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
    
    return true;
}

var originalInitMonaco = initMonaco;
initMonaco = async function () {
    await originalInitMonaco();
    setupLiveServer();
};

document.addEventListener('DOMContentLoaded', function () {
    initEnhancedFeatures();
    setupSidebar();
    setupSidebarNavigation();
    initAdminUnlockFlow();
    initIdeMobileShell();
});

window.addEventListener('supabaseReady', function () {
    initEnhancedFeatures();
});

function setupSidebarNavigation() {
    var profileNavItem = document.querySelector('.nav-item[data-tab="profile"]');
    if (profileNavItem) profileNavItem.addEventListener('click', function () { switchDashboardTab('profile'); });

    var friendsNavItem = document.querySelector('.nav-item[data-tab="friends"]');
    if (friendsNavItem) friendsNavItem.addEventListener('click', function () { switchDashboardTab('friends'); });

    var projectsNavItem = document.querySelector('.nav-item[data-tab="projects"]');
    if (projectsNavItem) projectsNavItem.addEventListener('click', function () { switchDashboardTab('projects'); });

    var deployNavItem = document.querySelector('.nav-item[data-tab="deploy"]');
    if (deployNavItem) deployNavItem.addEventListener('click', function () { switchDashboardTab('deploy'); });

    var settingsNavItem = document.querySelector('.nav-item[data-tab="settings"]');
    if (settingsNavItem) settingsNavItem.addEventListener('click', function () { switchDashboardTab('settings'); });

    var helpNavItem = document.querySelector('.nav-item[data-tab="help"]');
    if (helpNavItem) helpNavItem.addEventListener('click', function () { switchDashboardTab('help'); });

    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            performAuth('login');
        });
    }

    var registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            performAuth('register');
        });
    }

    // Tab switching for auth
    var tabLoginBtn = document.getElementById('tab-login-btn');
    var tabRegisterBtn = document.getElementById('tab-register-btn');
    
    if (tabLoginBtn) {
        tabLoginBtn.addEventListener('click', function() {
            switchAuthTab('login');
        });
    }
    
    if (tabRegisterBtn) {
        tabRegisterBtn.addEventListener('click', function() {
            switchAuthTab('register');
        });
    }

    // Demo button
    var demoBtn = document.getElementById('demo-btn');
    if (demoBtn) {
        demoBtn.addEventListener('click', function() {
            startDemo();
        });
    }

    // Signup link
    var signupLink = document.getElementById('signup-link');
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            switchAuthTab('register');
        });
    }

    // Password visibility toggles
    var togglePassLogin = document.getElementById('toggle-pass-login');
    if (togglePassLogin) {
        togglePassLogin.addEventListener('click', function() {
            togglePasswordVisibility('password-input', 'toggle-pass-login');
        });
    }

    var togglePassReg = document.getElementById('toggle-pass-reg');
    if (togglePassReg) {
        togglePassReg.addEventListener('click', function() {
            togglePasswordVisibility('reg-password-input', 'toggle-pass-reg');
        });
    }

    var communityNavItem = document.querySelector('.nav-item[data-tab="community"]');
    if (communityNavItem) communityNavItem.addEventListener('click', function () { switchDashboardTab('community'); });

    var settingsNavItem = document.querySelector('.nav-item[data-tab="settings"]');
    if (settingsNavItem) settingsNavItem.addEventListener('click', function () { switchDashboardTab('settings'); });

    var logoutNavItem = document.querySelector('.nav-item.danger-item');
    if (logoutNavItem) logoutNavItem.addEventListener('click', function () { logoutUser(); });

    var adminNavItem = document.getElementById('admin-panel-nav-item');
    if (adminNavItem) {
        adminNavItem.addEventListener('click', async function () {
            if (!canAccessAdminPanel()) {
                showToast('Access denied. Admin account only.', 'error');
                return;
            }
            switchDashboardTab('admin');
        });
    }

    var adminAnnouncementBtn = document.getElementById('open-admin-announcements-btn');
    if (adminAnnouncementBtn) {
        adminAnnouncementBtn.addEventListener('click', function () { openAdminAnnouncements(); });
    }

    var adminSectionItems = document.querySelectorAll('[data-admin-section]');
    adminSectionItems.forEach(function (item) {
        item.addEventListener('click', function () {
            var section = item.getAttribute('data-admin-section');
            if (section) {
                switchAdminPanelSection(section);
                if (section === 'users') loadAdminUsersSection();
                if (section === 'deployments') loadAdminDeploymentsSection();
                if (section === 'analytics') loadAdminAnalyticsSection();
                if (section === 'security') loadAdminSecuritySection();
            }
        });
    });

    var deploySubmitBtn = document.getElementById('deploy-project-submit-btn');
    if (deploySubmitBtn) deploySubmitBtn.addEventListener('click', submitDeployProjectModal);

    var rollbackSubmitBtn = document.getElementById('rollback-version-submit-btn');
    if (rollbackSubmitBtn) rollbackSubmitBtn.addEventListener('click', submitRollbackDeploymentModal);

    var deploymentCommentSubmitBtn = document.getElementById('deployment-comment-submit-btn');
    if (deploymentCommentSubmitBtn) deploymentCommentSubmitBtn.addEventListener('click', submitDeploymentComment);

    var profileBtn = document.getElementById('profile-btn');
    if (profileBtn) profileBtn.addEventListener('click', function () { openProfileModal(); });

    var closeProfileBtn = document.getElementById('close-profile-modal');
    if (closeProfileBtn) closeProfileBtn.addEventListener('click', function () { closeProfileModal(); });

    var saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', function () { saveProfileChanges(); });

    // Profile avatar uploader (Change + drag/drop).
    var profileAvatarChangeBtn = document.getElementById('profile-avatar-change-btn');
    var profileAvatarUploaderEl = document.getElementById('profile-avatar-uploader');
    var profileAvatarDropzoneEl = document.getElementById('profile-avatar-dropzone');
    var profileAvatarInputEl = document.getElementById('profile-avatar-input');

    if (profileAvatarChangeBtn && profileAvatarUploaderEl) {
        profileAvatarChangeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var newMode = !profileEditMode;
            setProfileEditMode(newMode);
            if (newMode && profileAvatarDropzoneEl) {
                // Visual cue for the user that the drop zone is ready.
                profileAvatarDropzoneEl.classList.remove('dragover');
                try {
                    var usernameInput = document.getElementById('profile-username-input');
                    if (usernameInput) usernameInput.focus();
                } catch (e2) { }
            }
        });
    }

    if (profileAvatarDropzoneEl && profileAvatarInputEl) {
        profileAvatarDropzoneEl.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            profileAvatarInputEl.click();
        });

        var setDragOver = function (isOver) {
            profileAvatarDropzoneEl.classList.toggle('dragover', !!isOver);
        };

        ['dragenter', 'dragover'].forEach(function (evtName) {
            profileAvatarDropzoneEl.addEventListener(evtName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
            });
        });

        ['dragleave'].forEach(function (evtName) {
            profileAvatarDropzoneEl.addEventListener(evtName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
            });
        });

        profileAvatarDropzoneEl.addEventListener('drop', function (e) {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);

            if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
            var file = e.dataTransfer.files[0];
            uploadProfileAvatarFile(file);
        });
    }

    if (profileAvatarInputEl) {
        profileAvatarInputEl.addEventListener('change', function () {
            if (!profileAvatarInputEl.files || profileAvatarInputEl.files.length === 0) return;
            uploadProfileAvatarFile(profileAvatarInputEl.files[0]);
        });
    }

    var deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) deleteAccountBtn.addEventListener('click', function () { startDeleteAccountFlow(); });

    var sendHelpBtn = document.getElementById('send-help-btn');
    if (sendHelpBtn) sendHelpBtn.addEventListener('click', function () { sendHelpRequest(); });

    var accountDeleteCancelBtn = document.getElementById('account-delete-cancel-btn');
    if (accountDeleteCancelBtn) accountDeleteCancelBtn.addEventListener('click', function () { closeAccountDeleteModal(); });

    var accountDeleteConfirmBtn = document.getElementById('account-delete-confirm-btn');
    if (accountDeleteConfirmBtn) accountDeleteConfirmBtn.addEventListener('click', function () { confirmAccountDeletion(); });

    var friendsBtn = document.getElementById('friends-btn');
    if (friendsBtn) friendsBtn.addEventListener('click', function () { openFriendsModal(); });

    var closeFriendsBtn = document.getElementById('close-friends-modal');
    if (closeFriendsBtn) closeFriendsBtn.addEventListener('click', function () { closeFriendsModal(); });

    var settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', function () { openSettings(); });

    updateAdminDashboardAccess();
}

// ================= API Key Management Functions =================

async function loadApiKeys() {
    if (!currentUser) {
        document.getElementById('api-keys-list').innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center;">Please login to manage API keys.</p>';
        return;
    }
    
    try {
        var listEl = document.getElementById('api-keys-list');
        listEl.innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p>';
        
        var { data, error } = await window.supabaseClient
            .from('api_keys')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Cache API keys for quick access in AIAssistant
        window.SavedApiKeys = {};
        if (data) {
            data.forEach(function(k) {
                // If multiple keys for same provider, the most recent one (first in ordered data) wins
                if (!window.SavedApiKeys[k.provider]) {
                    window.SavedApiKeys[k.provider] = k.api_key;
                }
            });
        }
        
        renderApiKeys(data || []);
    } catch (e) {
        console.error('Failed to load API keys:', e);
        document.getElementById('api-keys-list').innerHTML = '<p style="color:var(--danger);padding:20px;text-align:center;">Failed to load API keys. ' + escapeHtml(e.message || '') + '</p>';
    }
}

function renderApiKeys(keys) {
    var listEl = document.getElementById('api-keys-list');
    if (!keys || keys.length === 0) {
        listEl.innerHTML = '<p style="color:var(--text-muted);padding:20px;text-align:center;">No API keys saved yet.</p>';
        return;
    }
    
    var html = '<div class="api-keys-grid">';
    keys.forEach(function(key) {
        var providerLabel = getProviderLabel(key.provider);
        var displayKey = maskApiKey(key.api_key);
        var label = key.label || 'Unnamed Key';
        
        html += 
            '<div class="api-key-card" data-key-id="' + key.id + '">' +
            '  <div class="api-key-header">' +
            '    <div class="api-key-provider">' +
            '      <i class="fa-solid fa-key"></i> ' + escapeHtml(providerLabel) +
            '    </div>' +
            '    <div class="api-key-actions">' +
            '      <button class="action-btn icon-only small" onclick="deleteApiKey(\'' + key.id + '\')" title="Delete">' +
            '        <i class="fa-solid fa-trash"></i>' +
            '      </button>' +
            '    </div>' +
            '  </div>' +
            '  <div class="api-key-label">' + escapeHtml(label) + '</div>' +
            '  <div class="api-key-value">' + escapeHtml(displayKey) + '</div>' +
            '  <div class="api-key-date">Added: ' + new Date(key.created_at).toLocaleDateString() + '</div>' +
            '</div>';
    });
    html += '</div>';
    listEl.innerHTML = html;
}

function getProviderLabel(provider) {
    var labels = {
        'openai': 'OpenAI',
        'anthropic': 'Anthropic',
        'google': 'Google',
        'openrouter': 'OpenRouter',
        'groq': 'Groq',
        'custom': 'Custom'
    };
    return labels[provider] || provider || 'Unknown';
}

function maskApiKey(key) {
    if (!key || key.length < 8) return '••••••••';
    return key.substring(0, 4) + '••••••••••••••••' + key.substring(key.length - 4);
}

async function saveApiKey() {
    if (!currentUser) {
        showToast('Please login first', 'error');
        return;
    }
    
    var provider = document.getElementById('api-key-provider').value;
    var label = document.getElementById('api-key-label').value.trim();
    var apiKey = document.getElementById('api-key-input').value.trim();
    
    if (!apiKey) {
        showToast('Please enter an API key', 'error');
        return;
    }
    
    try {
        toggleLoading(true);
        
        var { data, error } = await window.supabaseClient
            .from('api_keys')
            .insert([{
                user_id: currentUser.id,
                provider: provider,
                label: label || null,
                api_key: apiKey
            }])
            .select();
        
        if (error) throw error;
        
        showToast('API key saved successfully', 'success');
        
        // Clear form
        document.getElementById('api-key-label').value = '';
        document.getElementById('api-key-input').value = '';
        
        // Reload list
        loadApiKeys();
    } catch (e) {
        console.error('Failed to save API key:', e);
        showToast('Failed to save API key: ' + (e.message || 'Unknown error'), 'error');
    } finally {
        toggleLoading(false);
    }
}

async function deleteApiKey(keyId) {
    if (!currentUser || !keyId) return;
    
    var confirmed = confirm('Are you sure you want to delete this API key? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
        toggleLoading(true);
        
        var { error } = await window.supabaseClient
            .from('api_keys')
            .delete()
            .eq('id', keyId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        showToast('API key deleted', 'success');
        loadApiKeys();
    } catch (e) {
        console.error('Failed to delete API key:', e);
        showToast('Failed to delete API key: ' + (e.message || 'Unknown error'), 'error');
    } finally {
        toggleLoading(false);
    }
}

// Expose functions to global scope for onclick handlers
window.saveApiKey = saveApiKey;
window.deleteApiKey = deleteApiKey;
window.loadApiKeys = loadApiKeys;