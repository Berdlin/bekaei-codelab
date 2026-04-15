/**
 * Community Module - Posts, Comments, and Real-time Updates
 * Handles the community feed with Supabase
 */

(function () {
    'use strict';

    // Community state
    const communityState = {
        posts: [],
        currentUser: null,
        realtimeChannel: null,
        loading: false,
        hasMore: true,
        limit: 20,
        offset: 0,
        sort: 'newest',
        currentAttachment: null,  // Store selected file for upload
        commentsState: {}
    };

    /**
     * Initialize the community module
     */
    function initCommunity() {
        console.log('[Community] Initializing...');
        
        // Load current user
        loadCurrentUser().then(() => {
            // Load posts
            loadPosts(true);
            // Setup real-time subscriptions
            setupRealtimeSubscriptions();
        });

        // Setup event listeners
        setupCommunityEventListeners();
    }

    /**
     * Load current authenticated user
     */
    async function loadCurrentUser() {
        try {
            if (!window.supabaseClient) {
                console.warn('[Community] Supabase client not available');
                return;
            }

            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            if (error) throw error;
            
            communityState.currentUser = user;
            
            // Load user profile
            if (user) {
                const { data: profile } = await window.supabaseClient
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', user.id)
                    .single();
                
                if (profile) {
                    communityState.currentUser.profile = profile;
                }
            }
        } catch (err) {
            console.error('[Community] Error loading user:', err);
        }
    }

    /**
     * Load posts from Supabase with user profiles
     */
    async function loadPosts(reset) {
        if (communityState.loading) return;
        if (reset) {
            communityState.offset = 0;
            communityState.hasMore = true;
        }
        communityState.loading = true;
        updateLoadingState(true);

        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase client not available');
            }

            const { data: posts, error } = await window.supabaseClient
                .from('posts')
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    attachment_url,
                    attachment_name,
                    attachment_type,
                    profiles:user_id (username, avatar_url),
                    likes:likes(user_id)
                `)
                .order('created_at', { ascending: false })
                .range(communityState.offset, communityState.offset + communityState.limit - 1);

            if (error) throw error;

            const rows = posts || [];
            const withCounts = await Promise.all(rows.map(async (post) => {
                let commentCount = 0;
                try {
                    const { count } = await window.supabaseClient
                        .from('comments')
                        .select('*', { count: 'exact', head: true })
                        .eq('post_id', post.id);
                    commentCount = count || 0;
                } catch (e) { }
                return { ...post, __commentCount: commentCount };
            }));
            if (communityState.sort === 'most-liked') {
                withCounts.sort((a, b) => (b.likes || []).length - (a.likes || []).length);
            } else if (communityState.sort === 'most-commented') {
                withCounts.sort((a, b) => Number(b.__commentCount || 0) - Number(a.__commentCount || 0));
            }
            if (reset) communityState.posts = withCounts;
            else communityState.posts = communityState.posts.concat(withCounts);
            communityState.hasMore = rows.length >= communityState.limit;
            communityState.offset += rows.length;
            renderPosts();
        } catch (err) {
            console.error('[Community] Error loading posts:', err);
            showCommunityError('Failed to load posts. Please try again.');
        } finally {
            communityState.loading = false;
            updateLoadingState(false);
        }
    }

    /**
     * Refresh posts only (no full re-init)
     */
    async function refresh() {
        try {
            await loadPosts(true);
        } catch (err) {
            console.error('[Community] Refresh failed:', err);
            showCommunityError('Failed to refresh posts. Please try again.');
        }
    }

    /**
     * Create a new post with optional file attachment
     */
    async function createPost(content) {
        if (!content.trim() && !communityState.currentAttachment) {
            showCommunityError('Please enter some content or attach a file');
            return;
        }

        if (!communityState.currentUser) {
            showCommunityError('Please sign in to post');
            return;
        }

        try {
            console.log('[Community] Creating post with user_id:', communityState.currentUser?.id);
            
            // Ensure user profile exists before creating post
            const { data: existingProfile } = await window.supabaseClient
                .from('profiles')
                .select('id')
                .eq('id', communityState.currentUser.id)
                .maybeSingle();
            
            if (!existingProfile) {
                console.log('[Community] Profile not found, creating profile...');
                const { error: profileError } = await window.supabaseClient
                    .from('profiles')
                    .upsert({
                        id: communityState.currentUser.id,
                        email: communityState.currentUser.email || '',
                        username: communityState.currentUser.user_metadata?.username || communityState.currentUser.email?.split('@')[0] || 'User',
                        avatar_url: communityState.currentUser.user_metadata?.avatar_url || null,
                        bio: communityState.currentUser.user_metadata?.bio || null,
                        created_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                
                if (profileError) {
                    console.error('[Community] Failed to create profile:', profileError);
                    showCommunityError('Failed to create profile. Please try again.');
                    return;
                }
            }
            
            let attachmentData = null;
            
            // Upload file if present
            if (communityState.currentAttachment) {
                console.log('[Community] Uploading attachment...');
                attachmentData = await uploadFileToStorage(communityState.currentAttachment, communityState.currentUser.id);
                console.log('[Community] File uploaded:', attachmentData);
            }

            // Build insert data
            const insertData = {
                user_id: communityState.currentUser.id,
                content: content.trim() || ''
            };
            
            if (attachmentData) {
                insertData.attachment_url = attachmentData.url;
                insertData.attachment_path = attachmentData.path;
                insertData.attachment_name = attachmentData.name;
                insertData.attachment_type = attachmentData.type;
            }

            const { data: post, error } = await window.supabaseClient
                .from('posts')
                .insert(insertData)
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    attachment_url,
                    attachment_name,
                    attachment_type,
                    profiles:user_id (username, avatar_url)
                `)
                .single();

            if (error) {
                console.error('[Community] Supabase error creating post:', error);
                throw error;
            }

            console.log('[Community] Post created successfully:', post);

            // Add to beginning of posts array
            communityState.posts.unshift(post);
            
            // Clear input and attachment
            const input = document.getElementById('community-post-input');
            if (input) input.value = '';
            removeAttachment();
            
            renderPosts();
            showCommunitySuccess('Post created!');
        } catch (err) {
            console.error('[Community] Error creating post:', err);
            console.error('[Community] Error details:', err.message, err.code, err.details);
            showCommunityError('Failed to create post: ' + (err.message || 'Unknown error'));
        }
    }

    /**
     * Delete a post
     */
    async function deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const { error } = await window.supabaseClient
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', communityState.currentUser?.id);

            if (error) throw error;

            // Remove from posts array
            communityState.posts = communityState.posts.filter(p => p.id !== postId);
            renderPosts();
            showCommunitySuccess('Post deleted');
        } catch (err) {
            console.error('[Community] Error deleting post:', err);
            showCommunityError('Failed to delete post');
        }
    }

    /**
     * Load comments for a specific post
     */
    async function loadComments(postId, reset) {
        try {
            if (!communityState.commentsState[postId]) {
                communityState.commentsState[postId] = { offset: 0, limit: 15, hasMore: true, items: [], replyTo: null };
            }
            const state = communityState.commentsState[postId];
            if (reset) {
                state.offset = 0;
                state.hasMore = true;
                state.items = [];
            }
            const { data: comments, error } = await window.supabaseClient
                .from('comments')
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    profiles:user_id (username, avatar_url)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: false })
                .range(state.offset, state.offset + state.limit - 1);

            if (error) throw error;
            const rows = comments || [];
            state.items = reset ? rows : state.items.concat(rows);
            state.hasMore = rows.length >= state.limit;
            state.offset += rows.length;
            renderComments(postId, state.items || []);
        } catch (err) {
            console.error('[Community] Error loading comments:', err);
        }
    }

    /**
     * Create a comment on a post
     */
    async function createComment(postId, content) {
        if (!content.trim()) return;

        if (!communityState.currentUser) {
            showCommunityError('Please sign in to comment');
            return;
        }

        try {
            const replyTo = communityState.commentsState[postId] && communityState.commentsState[postId].replyTo
                ? String(communityState.commentsState[postId].replyTo)
                : null;
            const text = replyTo ? (`[reply:${replyTo}] ` + content.trim()) : content.trim();
            const { data: comment, error } = await window.supabaseClient
                .from('comments')
                .insert({
                    post_id: postId,
                    user_id: communityState.currentUser.id,
                    content: text
                })
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    profiles:user_id (username, avatar_url)
                `)
                .single();

            if (error) throw error;

            // Clear input
            const input = document.getElementById(`comment-input-${postId}`);
            if (input) input.value = '';
            if (communityState.commentsState[postId]) communityState.commentsState[postId].replyTo = null;

            // Reload comments for this post
            loadComments(postId, true);
        } catch (err) {
            console.error('[Community] Error creating comment:', err);
            showCommunityError('Failed to add comment');
        }
    }

    /**
     * Setup real-time subscriptions for posts and comments
     */
    function setupRealtimeSubscriptions() {
        if (!window.supabaseClient) return;

        // Subscribe to new posts
        communityState.realtimeChannel = window.supabaseClient
            .channel('community-posts')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'posts' },
                async (payload) => {
                    // Fetch the complete post with profile data, attachments, AND likes
                    const { data: post } = await window.supabaseClient
                        .from('posts')
                        .select(`
                            id,
                            content,
                            created_at,
                            user_id,
                            attachment_url,
                            attachment_name,
                            attachment_type,
                            profiles:user_id (username, avatar_url),
                            likes:likes(user_id)
                        `)
                        .eq('id', payload.new.id)
                        .single();

                    if (post) {
                        // Don't add if it's our own post (already added optimistically)
                        if (post.user_id !== communityState.currentUser?.id) {
                            communityState.posts.unshift(post);
                            renderPosts();
                        }
                    }
                }
            )
            .on('postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'posts' },
                (payload) => {
                    communityState.posts = communityState.posts.filter(p => p.id !== payload.old.id);
                    renderPosts();
                }
            )
            .subscribe();

        console.log('[Community] Real-time subscriptions setup');
    }

    /**
     * Render posts to the DOM
     */
    function renderPosts() {
        const container = document.getElementById('community-posts-feed');
        if (!container) return;

        if (communityState.posts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:var(--text-muted);">
                    <i class="fa-solid fa-inbox" style="font-size:2rem;margin-bottom:12px;"></i>
                    <p>No posts yet. Be the first to share!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = communityState.posts.map(post => createPostHTML(post)).join('');
        if (communityState.hasMore) {
            container.innerHTML += `
                <div style="padding:12px;text-align:center;">
                    <button class="action-btn secondary" onclick="window.community.loadPostsMore()">
                        <i class="fa-solid fa-angle-down"></i> Load more posts
                    </button>
                </div>
            `;
        }

        // Setup comment toggles
        setupCommentToggles();
    }

    /**
     * Handle file selection for post attachment
     */
    function handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showCommunityError('File too large. Max size is 10MB.');
            input.value = '';
            return;
        }

        communityState.currentAttachment = file;
        showAttachmentPreview(file);
    }

    /**
     * Show attachment preview
     */
    function showAttachmentPreview(file) {
        const preview = document.getElementById('community-attachment-preview');
        if (!preview) return;

        const isImage = file.type.startsWith('image/');
        const fileSize = formatFileSize(file.size);

        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <div class="file-info">
                        <div class="file-name">${escapeHtml(file.name)}</div>
                        <div class="file-size">${fileSize}</div>
                    </div>
                    <button class="remove-attachment" onclick="window.community.removeAttachment()" title="Remove">
                        <i class="fa-solid fa-times"></i>
                    </button>
                `;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = `
                <div class="file-info" style="margin-left:0;">
                    <div class="file-name"><i class="fa-solid fa-file" style="margin-right:8px;"></i>${escapeHtml(file.name)}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <button class="remove-attachment" onclick="window.community.removeAttachment()" title="Remove">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
            preview.classList.remove('hidden');
        }
    }

    /**
     * Remove selected attachment
     */
    function removeAttachment() {
        communityState.currentAttachment = null;
        const preview = document.getElementById('community-attachment-preview');
        const fileInput = document.getElementById('community-file-input');
        if (preview) {
            preview.innerHTML = '';
            preview.classList.add('hidden');
        }
        if (fileInput) fileInput.value = '';
    }

    /**
     * Upload file to Supabase Storage
     * Creates a globally accessible URL via server proxy
     */
    async function uploadFileToStorage(file, userId) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `community/${userId}/${fileName}`;

        const { data, error } = await window.supabaseClient.storage
            .from('uploads')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('[Community] Upload error:', error);
            throw error;
        }

        // Use server proxy URL for persistent global access
        const proxyUrl = `/api/community/image/${userId}/${fileName}`;

        return { url: proxyUrl, path: filePath, name: file.name, type: file.type };
    }

    /**
     * Format file size
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Create post HTML with attachment support
     */
    function createPostHTML(post) {
        const isOwner = communityState.currentUser?.id === post.user_id;
        const username = post.profiles?.username || 'Anonymous';
        const avatar = post.profiles?.avatar_url;
        const timeAgo = formatTimeAgo(post.created_at);
        
        // Handle likes
        const likes = post.likes || [];
        const likeCount = likes.length;
        const isLiked = likes.some(l => l.user_id === communityState.currentUser?.id);
        
        // Handle attachment if present
        let attachmentHTML = '';
        if (post.attachment_url) {
            const isImage = post.attachment_type?.startsWith('image/') || 
                           post.attachment_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            
            if (isImage) {
                attachmentHTML = `
                    <div class="post-attachment">
                        <img src="${escapeHtml(post.attachment_url)}" alt="Attachment" onclick="window.open('${escapeHtml(post.attachment_url)}', '_blank')">
                    </div>
                `;
            } else {
                attachmentHTML = `
                    <div class="post-attachment">
                        <a href="${escapeHtml(post.attachment_url)}" target="_blank" class="file-link">
                            <i class="fa-solid fa-file-download"></i>
                            <span>${escapeHtml(post.attachment_name || 'Download file')}</span>
                        </a>
                    </div>
                `;
            }
        }

        return `
            <div class="community-post" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar" style="cursor:pointer;" onclick="window.community.viewUserProfile('${post.user_id}')" title="View profile">
                        ${avatar 
                            ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(username)}">`
                            : `<div class="avatar-initial">${escapeHtml(username.charAt(0).toUpperCase())}</div>`
                        }
                    </div>
                    <div class="post-meta">
                        <div class="post-author" style="cursor:pointer;color:var(--primary);" onclick="window.community.viewUserProfile('${post.user_id}')" title="View profile">${escapeHtml(username)}</div>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                    ${isOwner ? `
                        <button class="post-delete-btn" onclick="window.community.deletePost(${post.id})" title="Delete post">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="post-content">${formatContent(post.content)}</div>
                ${attachmentHTML}
                <div class="post-actions">
                    <button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="window.community.toggleLike(${post.id})">
                        <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart" style="color: ${isLiked ? '#ef4444' : 'inherit'}"></i>
                        <span>${likeCount} ${likeCount === 1 ? 'Like' : 'Likes'}</span>
                    </button>
                    <button class="post-action-btn" onclick="window.community.toggleComments(${post.id})">
                        <i class="fa-regular fa-comment"></i>
                        <span>Comments (${Number(post.__commentCount || 0)})</span>
                    </button>
                </div>
                <div class="post-comments" id="comments-${post.id}" style="display:none;">
                    <div class="comments-list" id="comments-list-${post.id}"></div>
                    ${communityState.currentUser ? `
                        <div class="comment-input-area">
                            <input type="text" 
                                   id="comment-input-${post.id}" 
                                   class="dark-input comment-input" 
                                   placeholder="Add a comment..."
                                   onkeypress="if(event.key==='Enter') window.community.createComment(${post.id})">
                            <button class="action-btn icon-only" onclick="window.community.createComment(${post.id})">
                                <i class="fa-solid fa-paper-plane"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render comments for a post
     */
    function renderComments(postId, comments) {
        const container = document.getElementById(`comments-list-${postId}`);
        if (!container) return;

        if (comments.length === 0) {
            container.innerHTML = '<p class="no-comments">No comments yet</p>';
            return;
        }

        const grouped = {};
        comments.forEach(comment => {
            const meta = parseReplyMeta(comment.content);
            const key = meta.replyTo || 'root';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push({ ...comment, __cleanContent: meta.cleanContent, __replyTo: meta.replyTo });
        });
        const roots = grouped.root || [];
        container.innerHTML = roots.map(comment => `
            <div class="comment" oncontextmenu="window.community.setReplyTarget(event, ${postId}, '${comment.id}')">
                <div class="comment-header">
                    <span class="comment-author" style="cursor:pointer;color:var(--primary);" onclick="window.community.viewUserProfile('${comment.user_id}')" title="View profile">${escapeHtml(comment.profiles?.username || 'Anonymous')}</span>
                    <span class="comment-time">${formatTimeAgo(comment.created_at)}</span>
                </div>
                <div class="comment-content">${formatContent(comment.__cleanContent || comment.content)}</div>
                <div style="display:flex;gap:8px;margin-top:6px;">
                    <button class="action-btn secondary" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();window.community.setReplyTarget(event, ${postId}, '${comment.id}')">Reply</button>
                    ${(communityState.currentUser && String(communityState.currentUser.id) === String(comment.user_id)) ? `<button class="action-btn secondary" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();window.community.deleteComment(${postId}, '${comment.id}')">Delete</button>` : ''}
                </div>
                ${(grouped[String(comment.id)] || []).length ? `
                    <details style="margin-top:6px;">
                        <summary style="cursor:pointer;font-size:12px;color:var(--text-muted);">Replies (${(grouped[String(comment.id)] || []).length})</summary>
                        ${(grouped[String(comment.id)] || []).map(reply => `
                            <div class="comment" style="margin-left:12px;border-left:2px solid var(--border-color);padding-left:10px;" oncontextmenu="window.community.setReplyTarget(event, ${postId}, '${reply.id}')">
                                <div class="comment-header">
                                    <span class="comment-author" style="cursor:pointer;color:var(--primary);" onclick="window.community.viewUserProfile('${reply.user_id}')" title="View profile">${escapeHtml(reply.profiles?.username || 'Anonymous')}</span>
                                    <span class="comment-time">${formatTimeAgo(reply.created_at)}</span>
                                </div>
                                <div class="comment-content">${formatContent(reply.__cleanContent || reply.content)}</div>
                                <div style="display:flex;gap:8px;margin-top:6px;">
                                    <button class="action-btn secondary" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();window.community.setReplyTarget(event, ${postId}, '${reply.id}')">Reply</button>
                                    ${(communityState.currentUser && String(communityState.currentUser.id) === String(reply.user_id)) ? `<button class="action-btn secondary" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();window.community.deleteComment(${postId}, '${reply.id}')">Delete</button>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </details>
                ` : ''}
            </div>
        `).join('');
        const state = communityState.commentsState[postId];
        if (state && state.hasMore) {
            container.innerHTML += `<div style="padding:8px;text-align:center;"><button class="action-btn secondary" style="font-size:12px;" onclick="window.community.loadMoreComments(${postId})">Load more comments</button></div>`;
        }
    }

    /**
     * Toggle comments section visibility
     */
    function toggleComments(postId) {
        const commentsSection = document.getElementById(`comments-${postId}`);
        if (!commentsSection) return;

        const isVisible = commentsSection.style.display !== 'none';
        commentsSection.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            // Load comments when opening
            loadComments(postId, true);
        }
    }

    async function loadMoreComments(postId) {
        await loadComments(postId, false);
    }

    async function deleteComment(postId, commentId) {
        if (!confirm('Delete this comment?')) return;
        try {
            const { error } = await window.supabaseClient
                .from('comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', communityState.currentUser?.id);
            if (error) throw error;
            await loadComments(postId, true);
            showCommunitySuccess('Comment deleted');
        } catch (err) {
            console.error('[Community] Error deleting comment:', err);
            showCommunityError('Failed to delete comment');
        }
    }

    function setReplyTarget(event, postId, commentId) {
        if (event) event.preventDefault();
        if (!communityState.commentsState[postId]) {
            communityState.commentsState[postId] = { offset: 0, limit: 15, hasMore: true, items: [], replyTo: null };
        }
        communityState.commentsState[postId].replyTo = commentId;
        const input = document.getElementById(`comment-input-${postId}`);
        if (input) {
            input.placeholder = `Replying to #${commentId} (right click to switch target)`;
            input.focus();
        }
    }

    function parseReplyMeta(content) {
        const raw = String(content || '');
        const m = raw.match(/^\[reply:([a-zA-Z0-9_\-]+)\]\s*/);
        if (!m) return { replyTo: null, cleanContent: raw };
        return { replyTo: m[1], cleanContent: raw.replace(/^\[reply:[a-zA-Z0-9_\-]+\]\s*/, '') };
    }

    function setSort(value) {
        communityState.sort = String(value || 'newest');
        loadPosts(true);
    }

    function openThreadView() {
        const title = document.getElementById('thread-view-title');
        const content = document.getElementById('thread-view-content');
        if (!title || !content) return;
        title.textContent = 'Community Threads';
        if (!communityState.posts.length) {
            content.innerHTML = '<div style="color:var(--text-muted);">No posts available.</div>';
        } else {
            content.innerHTML = communityState.posts.map(post => {
                return `<div style="padding:10px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <strong>${escapeHtml(post.profiles?.username || 'Anonymous')}</strong>
                        <button class="action-btn secondary" style="padding:4px 8px;font-size:12px;" onclick="window.community.toggleComments(${post.id})">Open Thread</button>
                    </div>
                    <div style="margin-top:6px;">${formatContent(String(post.content || '').slice(0, 180))}</div>
                    <div style="color:var(--text-muted);font-size:12px;margin-top:6px;">Likes: ${(post.likes || []).length} | Comments: ${Number(post.__commentCount || 0)}</div>
                </div>`;
            }).join('');
        }
        if (window.openModal) window.openModal('thread-view-modal');
    }

    /**
     * Setup comment toggle event listeners
     */
    function setupCommentToggles() {
        // Event listeners are attached inline in HTML
    }

    /**
     * Setup community event listeners
     */
    function setupCommunityEventListeners() {
        // Create post form
        const createPostBtn = document.getElementById('community-create-post-btn');
        const postInput = document.getElementById('community-post-input');

        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => {
                if (postInput) {
                    createPost(postInput.value);
                }
            });
        }

        if (postInput) {
            postInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    createPost(postInput.value);
                }
            });
        }
    }

    /**
     * Update loading state UI
     */
    function updateLoadingState(isLoading) {
        const loader = document.getElementById('community-loader');
        if (loader) {
            loader.style.display = isLoading ? 'block' : 'none';
        }
    }

    /**
     * Show error message
     */
    function showCommunityError(message) {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * Show success message
     */
    function showCommunitySuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        }
    }

    /**
     * Format timestamp to relative time
     */
    function formatTimeAgo(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        return `${Math.floor(months / 12)}y ago`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Convert URLs in text to clickable links
     * Must be called after escapeHtml to prevent XSS
     */
    function linkifyText(text) {
        if (!text) return text;
        // URL regex pattern matching http/https URLs
        const urlPattern = /(https?:\/\/[^\s<]+[^\s<.,;:?!\)\]\}"'])/gi;
        return text.replace(urlPattern, function(url) {
            // Ensure URL doesn't end with punctuation that was captured by regex
            let cleanUrl = url.replace(/[.,;:?!\)\]\}"']+$/, '');
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="community-link">${cleanUrl}</a>`;
        });
    }

    /**
     * Format content with links - escapes HTML then linkifies URLs
     */
    function formatContent(text) {
        return linkifyText(escapeHtml(text));
    }

    /**
     * Toggle like status for a post
     */
    async function toggleLike(postId) {
        if (!communityState.currentUser) {
            showCommunityError('Please sign in to like posts');
            return;
        }

        const post = communityState.posts.find(p => p.id === postId);
        if (!post) return;

        const userId = communityState.currentUser.id;
        const likes = post.likes || [];
        const existingLike = likes.find(l => l.user_id === userId);

        try {
            if (existingLike) {
                // Unlike
                const { error } = await window.supabaseClient
                    .from('likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', userId);

                if (error) throw error;

                // Update local state
                post.likes = likes.filter(l => l.user_id !== userId);
            } else {
                // Like
                const { error } = await window.supabaseClient
                    .from('likes')
                    .insert({ post_id: postId, user_id: userId });

                if (error) throw error;

                // Update local state
                if (!post.likes) post.likes = [];
                post.likes.push({ user_id: userId });
            }

            renderPosts();
        } catch (err) {
            console.error('[Community] Error toggling like:', err);
            showCommunityError('Failed to update like status');
        }
    }

    /**
     * View a user's public profile
     */
    async function viewUserProfile(userId) {
        if (!userId) return;
        try {
            let profile = null;
            
            // Try to get profile from profiles table
            const { data: profileData, error: profileError } = await window.supabaseClient
                .from('profiles')
                .select('id, username, email, avatar_url, bio, created_at')
                .eq('id', userId)
                .maybeSingle();
            
            if (profileError) {
                console.error('[Community] Profile query error:', profileError);
            }
            
            if (profileData) {
                profile = profileData;
            } else {
                // Profile doesn't exist, try to create it from current user metadata
                console.log('[Community] Profile not found, attempting to create...');
                if (communityState.currentUser && communityState.currentUser.id === userId) {
                    // Create profile from current user's metadata
                    const { data: newProfile, error: insertError } = await window.supabaseClient
                        .from('profiles')
                        .upsert({
                            id: userId,
                            email: communityState.currentUser.email || '',
                            username: communityState.currentUser.user_metadata?.username || communityState.currentUser.email?.split('@')[0] || 'User',
                            avatar_url: communityState.currentUser.user_metadata?.avatar_url || null,
                            bio: communityState.currentUser.user_metadata?.bio || null,
                            created_at: new Date().toISOString()
                        }, { onConflict: 'id' })
                        .select('id, username, email, avatar_url, bio, created_at')
                        .single();
                    
                    if (insertError) {
                        console.error('[Community] Failed to create profile:', insertError);
                        showCommunityError('Failed to view profile: Profile not found');
                        return;
                    }
                    profile = newProfile;
                } else {
                    // For other users, show a minimal profile with what we can infer
                    profile = {
                        id: userId,
                        username: 'User',
                        email: '',
                        avatar_url: null,
                        bio: null,
                        created_at: new Date().toISOString()
                    };
                }
            }
            
            // Get follower counts
            const { count: followersCount } = await window.supabaseClient
                .from('followers')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', userId);
            
            const { count: followingCount } = await window.supabaseClient
                .from('followers')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', userId);
            
            // Check if current user is following this user
            let isFollowing = false;
            if (communityState.currentUser && communityState.currentUser.id !== userId) {
                const { data: followCheck } = await window.supabaseClient
                    .from('followers')
                    .select('*')
                    .eq('follower_id', communityState.currentUser.id)
                    .eq('following_id', userId)
                    .single();
                isFollowing = !!followCheck;
            }
            
            showUserProfileModal(profile, followersCount || 0, followingCount || 0, isFollowing);
        } catch (err) {
            console.error('[Community] Error viewing profile:', err);
            showCommunityError('Failed to view profile');
        }
    }

    /**
     * Show user profile modal
     */
    function showUserProfileModal(profile, followersCount = 0, followingCount = 0, isFollowing = false) {
        const modalId = 'user-profile-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal hidden';
            document.body.appendChild(modal);
        }
        const avatarHtml = profile.avatar_url
            ? `<img src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(profile.username)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:80px;height:80px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-size:32px;font-weight:600;">${escapeHtml(profile.username?.charAt(0).toUpperCase() || '?')}</div>`;
        
        const bioHtml = profile.bio 
            ? `<p style="color:var(--text-muted);font-size:14px;margin-bottom:16px;line-height:1.5;">${escapeHtml(profile.bio)}</p>`
            : `<p style="color:var(--text-muted);font-size:14px;margin-bottom:16px;font-style:italic;">No bio yet</p>`;
        
        const isOwnProfile = communityState.currentUser && communityState.currentUser.id === profile.id;
        
        const followBtnHtml = !isOwnProfile
            ? `<button class="action-btn ${isFollowing ? 'secondary' : ''}" id="profile-follow-btn" onclick="window.community.toggleFollow('${profile.id}')" style="margin-right:8px;">
                <i class="fa-solid ${isFollowing ? 'fa-user-minus' : 'fa-user-plus'}"></i> ${isFollowing ? 'Unfollow' : 'Follow'}
               </button>`
            : '';
        
        const friendRequestBtnHtml = !isOwnProfile
            ? `<button class="action-btn secondary" onclick="window.community.sendFriendRequest('${profile.id}')">
                <i class="fa-solid fa-user-group"></i> Friend Request
               </button>`
            : '';
        
        modal.innerHTML = `
            <div class="modal-box" style="max-width:450px;text-align:center;">
                <div style="margin-bottom:16px;">${avatarHtml}</div>
                <h3 style="margin-bottom:4px;">${escapeHtml(profile.username || 'Anonymous')}</h3>
                <p style="color:var(--text-muted);font-size:12px;margin-bottom:12px;">${escapeHtml(profile.email || '')}</p>
                ${bioHtml}
                <div style="display:flex;gap:20px;justify-content:center;margin-bottom:16px;">
                    <div>
                        <div style="font-size:18px;font-weight:600;">${followingCount}</div>
                        <div style="color:var(--text-muted);font-size:12px;">Following</div>
                    </div>
                    <div>
                        <div style="font-size:18px;font-weight:600;">${followersCount}</div>
                        <div style="color:var(--text-muted);font-size:12px;">Followers</div>
                    </div>
                </div>
                ${!isOwnProfile ? `<div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
                    ${followBtnHtml}
                    ${friendRequestBtnHtml}
                </div>` : ''}
                <button class="action-btn secondary" onclick="document.getElementById('${modalId}').classList.add('hidden')">Close</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }

    /**
     * Toggle follow status for a user
     */
    async function toggleFollow(userId) {
        if (!communityState.currentUser) {
            showCommunityError('Please sign in to follow users');
            return;
        }
        
        try {
            // Check if already following
            const { data: existingFollow } = await window.supabaseClient
                .from('followers')
                .select('*')
                .eq('follower_id', communityState.currentUser.id)
                .eq('following_id', userId)
                .single();
            
            if (existingFollow) {
                // Unfollow
                const { error } = await window.supabaseClient
                    .from('followers')
                    .delete()
                    .eq('follower_id', communityState.currentUser.id)
                    .eq('following_id', userId);
                if (error) throw error;
                showCommunitySuccess('Unfollowed successfully');
            } else {
                // Follow
                const { error } = await window.supabaseClient
                    .from('followers')
                    .insert({
                        follower_id: communityState.currentUser.id,
                        following_id: userId
                    });
                if (error) throw error;
                showCommunitySuccess('Followed successfully');
            }
            
            // Refresh the modal
            viewUserProfile(userId);
        } catch (err) {
            console.error('[Community] Error toggling follow:', err);
            showCommunityError('Failed to update follow status');
        }
    }

    /**
     * Send friend request to a user
     */
    async function sendFriendRequest(userId) {
        if (!communityState.currentUser) {
            showCommunityError('Please sign in to send friend requests');
            return;
        }
        
        try {
            // Get the target user's email from profiles
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .maybeSingle();
            
            if (!profile || !profile.email) {
                showCommunityError('User email not found');
                return;
            }
            
            // Send friend request using the friends API
            const response = await fetch('/api/friends/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fromUserId: communityState.currentUser.id,
                    toEmail: profile.email
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Community] Friend request error response:', errorText);
                throw new Error('Failed to send friend request');
            }
            
            showCommunitySuccess('Friend request sent!');
        } catch (err) {
            console.error('[Community] Error sending friend request:', err);
            showCommunityError(err.message || 'Failed to send friend request');
        }
    }

    /**
     * Cleanup when leaving community tab
     */
    function cleanup() {
        if (communityState.realtimeChannel) {
            communityState.realtimeChannel.unsubscribe();
            communityState.realtimeChannel = null;
        }
    }

    // Expose community functions globally
    window.community = {
        init: initCommunity,
        refresh,
        setSort,
        openThreadView,
        createPost: () => {
            const input = document.getElementById('community-post-input');
            createPost(input ? input.value : '');
        },
        deletePost,
        toggleComments,
        toggleLike,
        loadMoreComments,
        deleteComment,
        setReplyTarget,
        createComment: (postId) => {
            const input = document.getElementById(`comment-input-${postId}`);
            if (input) {
                createComment(postId, input.value);
            }
        },
        handleFileSelect,
        removeAttachment,
        cleanup,
        loadPosts,
        loadPostsMore: () => loadPosts(false),
        viewUserProfile,
        toggleFollow,
        sendFriendRequest
    };

    // Auto-initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for supabase to be ready
        window.addEventListener('supabaseReady', () => {
            console.log('[Community] Supabase ready, module loaded');
        });
    });

})();
