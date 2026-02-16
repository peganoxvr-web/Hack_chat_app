// ============================================
// NEURAL CHAT INTERFACE - JAVASCRIPT
// Real Supabase Integration
// ============================================

class NeuralChat {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUser = null;
        this.currentUserId = null;
        this.activeChat = 'global';
        this.users = [];
        this.messages = {};
        this.messageSubscription = null;
        this.profileSubscription = null;
        this.unreadMessages = {}; // Track unread messages per chat
        
        this.latency = {
            current: 9,
            target: 9
        };
        
        this.init();
    }
    
    async init() {
        // Get elements
        this.messagesContainer = document.getElementById('messages-content');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.friendsList = document.getElementById('friends-list');
        this.currentUserDisplay = document.getElementById('current-user');
        this.activeChatName = document.getElementById('active-chat-name');
        this.activeChatStatus = document.getElementById('active-chat-status');
        this.activeUserInitial = document.getElementById('active-user-initial');
        this.onlineCountDisplay = document.getElementById('online-count');
        this.logoutBtn = document.getElementById('logout-btn');
        this.latencyDisplay = document.getElementById('latency');
        
        // Check authentication
        const { data: { session } } = await this.supabase.auth.getSession();
        
        if (!session) {
            window.location.href = 'index.html';
            return;
        }
        
        this.currentUserId = session.user.id;
        
        // Get current user profile
        const { data: profile } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', this.currentUserId)
            .single();
        
        if (profile) {
            this.currentUser = profile.username;
            this.currentUserDisplay.textContent = this.currentUser.toUpperCase();
        }
        
        // Update user status to online
        await this.updateStatus('online');
        
        // Setup event listeners
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.updateStatus('offline');
        });
        
        // Initialize UI
        await this.loadUsers();
        await this.loadMessages('global');
        this.startLatencyController();
        this.setupRealtimeSubscriptions();
        this.setupPresence();
        this.setupInteractiveFeatures();
        this.setupMobileSidebar();
        
        // Load and apply saved settings
        this.loadAndApplySettings();
        
        // Add welcome message
        this.addSystemMessage(`Welcome to the Neural Network, ${this.currentUser.toUpperCase()}`);
        this.addSystemMessage('Secure connection established');
    }
    
    // ==================== INTERACTIVE FEATURES ====================
    setupInteractiveFeatures() {
        // Search button
        const searchBtn = document.querySelector('[title="Search"]');
        const searchModal = document.getElementById('search-modal');
        const searchClose = document.getElementById('search-close');
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        searchBtn.addEventListener('click', () => {
            searchModal.classList.add('active');
            searchInput.focus();
        });
        
        searchClose.addEventListener('click', () => {
            searchModal.classList.remove('active');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });
        
        searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });
        
        // Settings button
        const settingsBtn = document.querySelector('[title="Settings"]');
        const settingsModal = document.getElementById('settings-modal');
        const settingsClose = document.getElementById('settings-close');
        
        settingsBtn.addEventListener('click', () => {
            this.loadSettings();
            settingsModal.classList.add('active');
        });
        
        settingsClose.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
        
        // Settings changes
        document.getElementById('setting-notifications').addEventListener('change', (e) => {
            localStorage.setItem('chat-notifications', e.target.checked);
        });
        
        document.getElementById('setting-sound').addEventListener('change', (e) => {
            localStorage.setItem('chat-sound', e.target.checked);
        });
        
        document.getElementById('setting-timestamp').addEventListener('change', (e) => {
            localStorage.setItem('chat-timestamp', e.target.checked);
        });
        
        document.getElementById('setting-theme').addEventListener('change', (e) => {
            this.changeTheme(e.target.value);
        });
        
        // Emoji button
        const emojiBtn = document.querySelector('[title="Emoji"]');
        const emojiModal = document.getElementById('emoji-modal');
        const emojiClose = document.getElementById('emoji-close');
        const emojiGrid = document.getElementById('emoji-grid');
        
        emojiBtn.addEventListener('click', () => {
            this.loadEmojis();
            emojiModal.classList.add('active');
        });
        
        emojiClose.addEventListener('click', () => {
            emojiModal.classList.remove('active');
        });
        
        // File attachment button
        const attachBtn = document.querySelector('[title="Attach File"]');
        const fileInput = document.getElementById('file-input');
        
        attachBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFileAttachment(e.target.files[0]);
        });
        
        // Close modals when clicking outside
        [searchModal, settingsModal, emojiModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Image preview modal
        const imagePreviewModal = document.getElementById('image-preview-modal');
        const imagePreviewClose = document.getElementById('image-preview-close');
        const imagePreviewImg = document.getElementById('image-preview-img');
        
        imagePreviewClose.addEventListener('click', () => {
            imagePreviewModal.classList.remove('active');
        });
        
        imagePreviewModal.addEventListener('click', (e) => {
            if (e.target === imagePreviewModal) {
                imagePreviewModal.classList.remove('active');
            }
        });
        
        // Image click handler (delegated)
        this.messagesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-image-preview')) {
                const imageUrl = e.target.dataset.imageUrl;
                imagePreviewImg.src = imageUrl;
                imagePreviewModal.classList.add('active');
            }
        });
    }
    
    performSearch(query) {
        const searchResults = document.getElementById('search-results');
        
        if (!query.trim()) {
            searchResults.innerHTML = '';
            return;
        }
        
        // Search in current chat messages
        const allMessages = this.messagesContainer.querySelectorAll('.message:not(.system)');
        const results = [];
        
        allMessages.forEach(msg => {
            const bubble = msg.querySelector('.message-bubble');
            const sender = msg.querySelector('.message-sender');
            if (bubble && bubble.textContent.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    sender: sender?.textContent || 'Unknown',
                    text: bubble.textContent
                });
            }
        });
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px;">No results found</div>';
            return;
        }
        
        searchResults.innerHTML = results.map(result => {
            const highlighted = result.text.replace(
                new RegExp(query, 'gi'),
                match => `<span class="search-highlight">${match}</span>`
            );
            return `
                <div class="search-result-item">
                    <div class="search-result-sender">${result.sender}</div>
                    <div class="search-result-text">${highlighted}</div>
                </div>
            `;
        }).join('');
    }
    
    loadSettings() {
        document.getElementById('setting-notifications').checked = 
            localStorage.getItem('chat-notifications') === 'true';
        document.getElementById('setting-sound').checked = 
            localStorage.getItem('chat-sound') === 'true';
        document.getElementById('setting-timestamp').checked = 
            localStorage.getItem('chat-timestamp') === 'true';
        document.getElementById('setting-theme').value = 
            localStorage.getItem('chat-theme') || 'green';
    }
    
    changeTheme(theme) {
        localStorage.setItem('chat-theme', theme);
        const root = document.documentElement;
        
        const themes = {
            green: '#00ff41',
            blue: '#00f0ff',
            red: '#ff0033'
        };
        
        root.style.setProperty('--primary-color', themes[theme]);
    }
    
    loadAndApplySettings() {
        // Load theme
        const savedTheme = localStorage.getItem('chat-theme') || 'green';
        if (savedTheme !== 'green') {
            this.changeTheme(savedTheme);
        }
        
        // Load other settings (optional - for future use)
        // Notifications, sound, etc. can be checked here when needed
    }
    
    loadEmojis() {
        const emojiGrid = document.getElementById('emoji-grid');
        const emojis = [
            '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
            '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
            '😗', '😙', '😚', '🤗', '🤩', '🤔', '🤨', '😐',
            '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐',
            '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜',
            '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑',
            '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢',
            '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰',
            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
            '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐',
            '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
            '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
            '⭐', '🌟', '✨', '💫', '🔥', '💥', '💯', '✅'
        ];
        
        emojiGrid.innerHTML = emojis.map(emoji => 
            `<div class="emoji-item" data-emoji="${emoji}">${emoji}</div>`
        ).join('');
        
        // Add click handlers
        emojiGrid.querySelectorAll('.emoji-item').forEach(item => {
            item.addEventListener('click', () => {
                const emoji = item.dataset.emoji;
                this.messageInput.value += emoji;
                this.messageInput.focus();
                document.getElementById('emoji-modal').classList.remove('active');
            });
        });
    }
    
    handleFileAttachment(file) {
        if (!file) return;
        
        // Determine if it's an image or file
        const isImage = file.type.startsWith('image/');
        const maxSize = isImage ? 5 * 1024 * 1024 : 20 * 1024 * 1024; // 5MB for images, 20MB for files
        const fileType = isImage ? 'image' : 'file';
        
        // Check file size
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            this.addSystemMessage(`File too large. Maximum size for ${fileType}s is ${maxSizeMB}MB`);
            return;
        }
        
        // Show uploading message
        this.addSystemMessage(`Uploading ${file.name}...`);
        
        // Upload to Supabase Storage
        this.uploadFile(file, fileType);
        
        // Clear file input
        document.getElementById('file-input').value = '';
    }
    
    async uploadFile(file, fileType) {
        try {
            const isImage = fileType === 'image';
            const bucket = isImage ? 'chat-images' : 'chat-files';
            
            // Create unique file path: userId/timestamp_filename
            const timestamp = Date.now();
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `${this.currentUserId}/${timestamp}_${sanitizedName}`;
            
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) {
                console.error('Upload error:', uploadError);
                this.addSystemMessage('Failed to upload file');
                return;
            }
            
            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);
            
            // Send message with attachment
            await this.sendMessageWithAttachment({
                fileName: file.name,
                fileType: fileType,
                fileSize: file.size,
                fileUrl: publicUrl,
                storagePath: filePath,
                mimeType: file.type,
                bucket: bucket
            });
            
        } catch (error) {
            console.error('Error uploading file:', error);
            this.addSystemMessage('Error uploading file');
        }
    }
    
    async sendMessageWithAttachment(attachment) {
        // Send empty content for images so only the image shows
        // For other files, keep the filename as a caption
        let content = '';
        if (attachment.fileType !== 'image') {
            content = `📎 ${attachment.fileName}`;
        }
        
        // Create message
        const messageData = {
            sender_id: this.currentUserId,
            content: content,
            chat_type: this.activeChat === 'global' ? 'global' : 'private',
            receiver_id: this.activeChat === 'global' ? null : this.activeChat
        };
        
        const { data: messageResult, error: messageError } = await this.supabase
            .from('messages')
            .insert([messageData])
            .select()
            .single();
        
        if (messageError) {
            console.error('Error sending message:', messageError);
            this.addSystemMessage('Error sending message with attachment');
            return;
        }
        
        // Create attachment record
        const attachmentData = {
            message_id: messageResult.id,
            file_name: attachment.fileName,
            file_type: attachment.fileType,
            file_size: attachment.fileSize,
            file_url: attachment.fileUrl,
            storage_path: attachment.storagePath,
            mime_type: attachment.mimeType
        };
        
        const { error: attachmentError } = await this.supabase
            .from('attachments')
            .insert([attachmentData]);
        
        if (attachmentError) {
            console.error('Error saving attachment:', attachmentError);
        }
    }
    
    // ==================== USER MANAGEMENT ====================
    async updateStatus(status) {
        await this.supabase
            .from('profiles')
            .update({ 
                status, 
                last_seen: new Date().toISOString() 
            })
            .eq('id', this.currentUserId);
    }
    
    async logout() {
        await this.updateStatus('offline');
        await this.supabase.auth.signOut();
        window.location.href = 'index.html';
    }
    
    async loadUsers() {
        const { data: users } = await this.supabase
            .from('profiles')
            .select('*')
            .neq('id', this.currentUserId)
            .order('status', { ascending: false });
        
        this.users = users || [];
        this.renderFriends();
        this.updateOnlineCount();
    }
    
    // ==================== FRIENDS LIST ====================
    renderFriends() {
        this.friendsList.innerHTML = '';
        
        // Add global chat
        const globalItem = this.createFriendItem({
            id: 'global',
            username: 'GLOBAL NETWORK',
            status: 'online',
            last_seen: 'Always active'
        }, true);
        this.friendsList.appendChild(globalItem);
        
        // Add separator
        const separator = document.createElement('div');
        separator.style.cssText = 'height: 1px; background: rgba(0,255,65,0.2); margin: 10px 0;';
        this.friendsList.appendChild(separator);
        
        // Add users
        this.users.forEach(user => {
            const item = this.createFriendItem(user);
            this.friendsList.appendChild(item);
        });
    }
    
    createFriendItem(user, isActive = false) {
        const item = document.createElement('div');
        item.className = `friend-item ${isActive ? 'active' : ''}`;
        item.dataset.userId = user.id;
        
        const initial = user.username.charAt(0).toUpperCase();
        const lastSeen = user.status === 'online' ? 'Active now' : this.formatLastSeen(user.last_seen);
        const unreadCount = this.unreadMessages[user.id] || 0;
        
        item.innerHTML = `
            <div class="friend-avatar">
                ${initial}
                <span class="status-badge status-indicator ${user.status}"></span>
            </div>
            <div class="friend-info">
                <div class="friend-name">
                    ${user.username.toUpperCase()}
                    ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                </div>
                <div class="friend-status">${lastSeen}</div>
            </div>
        `;
        
        item.addEventListener('click', () => this.switchChat(user));
        
        return item;
    }
    
    formatLastSeen(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000 / 60); // minutes
        
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff} min ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
        return `${Math.floor(diff / 1440)} days ago`;
    }
    
    updateOnlineCount() {
        const onlineCount = this.users.filter(u => u.status === 'online').length;
        this.onlineCountDisplay.textContent = onlineCount;
    }
    
    switchChat(user) {
        this.activeChat = user.id;
        
        // Mark messages as read for this chat
        this.markAsRead(user.id);
        
        // Update active state
        document.querySelectorAll('.friend-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`.friend-item[data-user-id="${user.id}"]`);
        if (activeItem) activeItem.classList.add('active');
        
        // Get real-time status from DOM element instead of old user object
        let currentStatus = user.status;
        if (activeItem) {
            const indicator = activeItem.querySelector('.status-indicator');
            if (indicator) {
                currentStatus = indicator.classList.contains('online') ? 'online' : 'offline';
            }
        }
        
        // Update chat header
        this.activeChatName.textContent = user.username.toUpperCase();
        let statusText = 'Offline';
        if (currentStatus === 'online') {
            statusText = 'Active';
        } else {
            // If offline, try to show last seen if available in user object
            // For now, simple Offline is fine
            statusText = 'Offline';
        }

        this.activeChatStatus.innerHTML = `
            <span class="status-indicator ${currentStatus}"></span> ${statusText}
        `;
        this.activeUserInitial.textContent = user.username.charAt(0).toUpperCase();
        
        // Load messages for this chat
        this.loadMessages(user.id);
    }
    
    // ==================== MESSAGES ====================
    async loadMessages(chatId) {
        this.messagesContainer.innerHTML = '';
        
        if (chatId === 'global') {
            // Load global messages with attachments
            const { data: messages } = await this.supabase
                .from('messages')
                .select(`
                    *,
                    sender:sender_id(username),
                    attachments(*)
                `)
                .eq('chat_type', 'global')
                .order('created_at', { ascending: true })
                .limit(50);
            
            if (messages && messages.length > 0) {
                messages.forEach(msg => this.renderMessage(msg));
            } else {
                this.addSystemMessage('Global Network Chat - Start broadcasting');
            }
        } else {
            // Load private messages with attachments
            const { data: messages } = await this.supabase
                .from('messages')
                .select(`
                    *,
                    sender:sender_id(username),
                    attachments(*)
                `)
                .eq('chat_type', 'private')
                .or(`sender_id.eq.${this.currentUserId},receiver_id.eq.${this.currentUserId}`)
                .or(`sender_id.eq.${chatId},receiver_id.eq.${chatId}`)
                .order('created_at', { ascending: true })
                .limit(50);
            
            if (messages && messages.length > 0) {
                messages.forEach(msg => this.renderMessage(msg));
            } else {
                this.addSystemMessage('Private chat started');
            }
        }
        
        this.scrollToBottom();
    }
    
    async sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;
        
        const messageData = {
            sender_id: this.currentUserId,
            content: text,
            chat_type: this.activeChat === 'global' ? 'global' : 'private',
            receiver_id: this.activeChat === 'global' ? null : this.activeChat
        };
        
        const { error } = await this.supabase
            .from('messages')
            .insert([messageData]);
        
        if (error) {
            console.error('Error sending message:', error);
            this.addSystemMessage('Error sending message');
            return;
        }
        
        // Clear input
        this.messageInput.value = '';
    }
    
    renderMessage(message) {
        const isSent = message.sender_id === this.currentUserId;
        const senderName = message.sender?.username || 'Unknown';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const initial = senderName.charAt(0).toUpperCase();
        const time = this.formatMessageTime(message.created_at);
        
        // Build attachment HTML if exists
        let attachmentHTML = '';
        if (message.attachments && message.attachments.length > 0) {
            message.attachments.forEach(att => {
                if (att.file_type === 'image') {
                    attachmentHTML += `
                        <div class="message-attachment message-image">
                            <img src="${att.file_url}" alt="${this.escapeHtml(att.file_name)}" 
                                 data-image-url="${att.file_url}"
                                 class="chat-image-preview"
                                 style="cursor: pointer;">
                        </div>
                    `;
                } else {
                    const fileSize = (att.file_size / 1024).toFixed(2);
                    attachmentHTML += `
                        <div class="message-attachment message-file">
                            <a href="${att.file_url}" target="_blank" download="${att.file_name}">
                                <i class="fas fa-file"></i>
                                <div class="file-info">
                                    <div class="file-name">${this.escapeHtml(att.file_name)}</div>
                                    <div class="file-size">${fileSize} KB</div>
                                </div>
                                <i class="fas fa-download"></i>
                            </a>
                        </div>
                    `;
                }
            });
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${initial}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${senderName.toUpperCase()}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-bubble"></div>
                ${attachmentHTML}
            </div>
        `;
        
        // Set text using textContent to prevent parsing issues
        const bubble = messageDiv.querySelector('.message-bubble');
        if (bubble) bubble.textContent = message.content;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-bubble">${this.escapeHtml(text)}</div>
            </div>
        `;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    // ==================== REALTIME SUBSCRIPTIONS ====================
    setupRealtimeSubscriptions() {
        // Subscribe to new messages
        this.messageSubscription = this.supabase
            .channel('messages')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'messages' },
                async (payload) => {
                    const message = payload.new;
                    
                    // Get sender info and attachments
                    const { data: fullMessage } = await this.supabase
                        .from('messages')
                        .select(`
                            *,
                            sender:sender_id(username),
                            attachments(*)
                        `)
                        .eq('id', message.id)
                        .single();
                    
                    if (!fullMessage) return;
                    
                    // Only show if relevant to current chat
                    if (fullMessage.chat_type === 'global' && this.activeChat === 'global') {
                        this.renderMessage(fullMessage);
                    } else if (fullMessage.chat_type === 'private') {
                        const isCurrentChat = (fullMessage.sender_id === this.activeChat || fullMessage.receiver_id === this.activeChat);
                        const isForMe = (fullMessage.sender_id === this.currentUserId || fullMessage.receiver_id === this.currentUserId);
                        
                        if (isForMe && isCurrentChat) {
                            this.renderMessage(fullMessage);
                        } else if (isForMe && !isCurrentChat && fullMessage.sender_id !== this.currentUserId) {
                            // Message is for me but in a different chat - increment unread count
                            const senderId = fullMessage.sender_id;
                            this.unreadMessages[senderId] = (this.unreadMessages[senderId] || 0) + 1;
                            this.updateUnreadBadge(senderId);
                        }
                    }
                }
            )
            .subscribe();
        
        // ==================== REALTIME PRESENCE (ONLINE STATUS) ====================
    } // This closes setupRealtimeSubscriptions

    async setupPresence() {
        // Create a channel for tracking presence
        this.presenceChannel = this.supabase.channel('online-users', {
            config: {
                presence: {
                    key: this.currentUserId,
                },
            },
        });

        this.presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = this.presenceChannel.presenceState();
                console.log('Online users sync:', newState);
                
                // Get list of online user IDs
                const onlineUserIds = Object.keys(newState);
                
                // Update UI for all friends
                this.users.forEach(user => {
                    const isOnline = onlineUserIds.includes(user.id);
                    const status = isOnline ? 'online' : 'offline';
                    this.updateUserStatusUI(user.id, status);
                });
                
                // Update online count
                this.updateOnlineCount(onlineUserIds.length);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('User joined:', key);
                this.updateUserStatusUI(key, 'online');
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('User left:', key);
                this.updateUserStatusUI(key, 'offline');
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track current user as online
                    await this.presenceChannel.track({
                        online_at: new Date().toISOString(),
                        user_id: this.currentUserId,
                        username: this.currentUser
                    });
                }
            });
            
        // Still listen to profile updates for changes like username or avatar
        this.profileSubscription = this.supabase
            .channel('profiles')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    // If update isn't just status, reload
                    if (payload.new.username !== payload.old.username) {
                        this.loadUsers();
                    }
                }
            )
            .subscribe();
    }

    updateUserStatusUI(userId, status) {
        // Find friend item
        const friendItem = document.querySelector(`.friend-item[data-user-id="${userId}"]`);
        if (friendItem) {
            const indicator = friendItem.querySelector('.status-indicator');
            const statusText = friendItem.querySelector('.friend-status');
            
            if (indicator) {
                indicator.className = `status-badge status-indicator ${status}`;
            }
            if (statusText) {
                statusText.textContent = status === 'online' ? 'Active now' : 'Offline';
                // If offline, maybe show last seen if available (from profile)
                if (status === 'offline') {
                    // Ideally fetch last_seen from DB, but for now 'Offline' is fine
                }
            }
        }
        
        // Update active chat header if this user is open
        if (this.activeChat === userId) {
            const headerStatus = document.getElementById('active-chat-status');
            if (headerStatus) {
                headerStatus.innerHTML = `
                    <span class="status-indicator ${status}"></span> ${status === 'online' ? 'Active' : 'Offline'}
                `;
            }
        }
    }
    
    // ==================== NOTIFICATION HELPERS ====================
    markAsRead(chatId) {
        // Clear unread count for this chat
        if (this.unreadMessages[chatId]) {
            this.unreadMessages[chatId] = 0;
            this.updateUnreadBadge(chatId);
        }
    }
    
    updateUnreadBadge(userId) {
        // Find the friend item and update the badge
        const friendItem = document.querySelector(`[data-user-id="${userId}"]`);
        if (!friendItem) return;
        
        const friendName = friendItem.querySelector('.friend-name');
        if (!friendName) return;
        
        // Remove existing badge
        const existingBadge = friendName.querySelector('.unread-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Add new badge if there are unread messages
        const unreadCount = this.unreadMessages[userId] || 0;
        if (unreadCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'unread-badge';
            badge.textContent = unreadCount;
            friendName.appendChild(badge);
        }
    }
    
    // ==================== HELPERS ====================
    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom() {
        const container = document.getElementById('messages-container');
        container.scrollTop = container.scrollHeight;
    }
    
    // ==================== LATENCY SYSTEM ====================
    startLatencyController() {
        setInterval(() => {
            if (this.latency.current < this.latency.target) {
                this.latency.current++;
            } else if (this.latency.current > this.latency.target) {
                this.latency.current--;
            }
            this.latencyDisplay.textContent = this.latency.current;
        }, 100);
        
        // Random latency fluctuations
        setInterval(() => {
            this.latency.target = 8 + Math.floor(Math.random() * 6);
        }, 3000);
    }

    // ==================== MOBILE SIDEBAR ====================
    setupMobileSidebar() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        
        if (!menuBtn || !sidebar) return;
        
        // Create overlay backdrop - Insert before sidebar to ensure correct z-index stacking
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    // Insert inside the container but before the sidebar so sidebar sits on top
    if (sidebar.parentNode) {
        sidebar.parentNode.insertBefore(overlay, sidebar);
    } else {
        document.body.appendChild(overlay);
    }
        
        // Toggle sidebar
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
        });
        
        // Close on overlay click
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        });
        
        // Close sidebar when selecting a friend on mobile
        sidebar.addEventListener('click', (e) => {
            if (e.target.closest('.friend-item')) {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('mobile-open');
                    overlay.classList.remove('active');
                }
            }
        });
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    window.chat = new NeuralChat();
});
