// ============================================
// NEURAL TERMINAL ACCESS - LEGENDARY MODE
// Complete Terminal Logic with Intelligent Systems
// ============================================

class NeuralTerminal {
    constructor() {
        this.output = document.getElementById('terminal-output');
        this.inputPrompt = document.getElementById('input-prompt');
        this.inputDisplay = document.getElementById('input-display');
        this.hiddenInput = document.getElementById('hidden-input');
        this.latencyDisplay = document.getElementById('latency');
        
        this.currentInput = '';
        this.username = '';
        this.email = '';
        this.password = '';
        this.authMode = ''; // 'signup' or 'login'
        this.supabase = window.supabaseClient
        this.state = 'init'; // init, mode_select, username, password, confirm_password, authenticating, locked
        this.failedAttempts = 0;
        this.maxAttempts = 3;
        this.lockoutDuration = 30; // seconds
        
        // Latency controller
        this.latency = {
            current: 9,
            target: 9,
            state: 'idle' // idle, typing, auth
        };
        
        this.init();
    }
    
    async init() {
        // Check if user is already logged in
        await this.checkExistingSession();
        
        // Focus hidden input for keyboard capture
        this.hiddenInput.focus();
        document.addEventListener('click', () => this.hiddenInput.focus());
        
        // Setup keyboard handler
        this.hiddenInput.addEventListener('input', (e) => this.handleInput(e));
        this.hiddenInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Mobile keyboard detection
        this.hiddenInput.addEventListener('focus', () => document.body.classList.add('keyboard-open'));
        this.hiddenInput.addEventListener('blur', () => document.body.classList.remove('keyboard-open'));
        
        // Start latency controller
        this.startLatencyController();
        
        // Generate random IP
        this.generateSystemIP();
        
        // Start initialization sequence
        this.startInitSequence();
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
        
        // Idle detector
        let lastActivity = Date.now();
        document.addEventListener('keydown', () => {
            lastActivity = Date.now();
        });
        
        setInterval(() => {
            const idleTime = Date.now() - lastActivity;
            if (this.state === 'authenticating') {
                this.setLatencyState('auth');
            } else if (idleTime > 2000) {
                this.setLatencyState('idle');
            } else {
                this.setLatencyState('typing');
            }
        }, 500);
    }
    
    setLatencyState(state) {
        if (this.latency.state === state) return;
        
        this.latency.state = state;
        const targets = { idle: 9, typing: 18, auth: 25 };
        this.latency.target = targets[state];
    }
    
    // ==================== INITIALIZATION ====================
    async startInitSequence() {
        const messages = [
            'Initializing Secure Node...',
            'Establishing Encrypted Channel...',
            'Verifying Identity Protocol...',
            ''
        ];
        
        for (const msg of messages) {
            await this.typeMessage(msg, 40);
            await this.delay(msg === '' ? 500 : 300);
        }
        
        // Show authentication mode selection
        await this.showModeSelection();
    }
    
    async showModeSelection() {
        this.addLine('> SELECT AUTHENTICATION MODE:', 'success');
        await this.delay(200);
        this.addLine('  [1] SIGN UP - Create New Account', 'dim');
        await this.delay(200);
        this.addLine('  [2] LOG IN - Access Existing Account', 'dim');
        await this.delay(200);
        this.addLine('  [3] FORGOT PASSWORD - Reset Password', 'dim');
        this.addLine('');
        
        this.state = 'mode_select';
        this.showPrompt('> ENTER CHOICE [1.2.3]:');
    }
    
    // ==================== AUTO-TYPING SYSTEM ====================
    async typeMessage(message, speed = 40) {
        const line = document.createElement('div');
        line.className = 'terminal-line dim';
        this.output.appendChild(line);
        
        for (let i = 0; i < message.length; i++) {
            line.textContent += message[i];
            await this.delay(speed);
        }
        
        this.scrollToBottom();
    }
    
    addLine(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        line.textContent = text;
        this.output.appendChild(line);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        const screen = document.querySelector('.terminal-screen');
        screen.scrollTop = screen.scrollHeight;
    }
    
    // ==================== SESSION MANAGEMENT ====================
    async checkExistingSession() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                // User is already logged in, redirect to chat
                const { data: profile } = await this.supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile) {
                    this.addLine('> SESSION FOUND');
                    await this.delay(300);
                    this.addLine('> RESTORING CONNECTION...', 'success');
                    await this.delay(800);
                    window.location.href = `chat.html?user=${encodeURIComponent(profile.username)}`;
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }
    
    async handleForgotPassword() {
        this.addLine('');
        this.addLine('> PASSWORD RECOVERY MODE', 'success');
        await this.delay(500);
        this.state = 'forgot_password';
        this.showPrompt('> ENTER YOUR EMAIL:');
    }
    
    async sendPasswordReset(email) {
        if (!this.validateEmail(email)) {
            this.addLine('');
            this.addLine('> INVALID EMAIL FORMAT', 'error');
            await this.delay(800);
            this.showPrompt('> ENTER YOUR EMAIL:');
            return;
        }
        
        this.state = 'authenticating';
        await this.typeMessage('> Sending reset link...', 40);
        await this.delay(500);
        
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            
            if (error) {
                this.addLine('');
                this.addLine('> ERROR: ' + error.message.toUpperCase(), 'error');
                await this.delay(1000);
                await this.showModeSelection();
                return;
            }
            
            this.addLine('');
            this.addLine('> RESET LINK SENT TO YOUR EMAIL', 'success');
            await this.delay(800);
            this.addLine('> CHECK YOUR INBOX', 'success');
            await this.delay(1500);
            await this.showModeSelection();
        } catch (err) {
            this.addLine('');
            this.addLine('> ERROR: FAILED TO SEND RESET LINK', 'error');
            await this.delay(1000);
            await this.showModeSelection();
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ==================== INPUT HANDLING ====================
    showPrompt(prompt) {
        this.inputPrompt.textContent = prompt;
        this.currentInput = '';
        this.inputDisplay.textContent = '';
        this.hiddenInput.value = '';
    }
    
    handleInput(e) {
        if (this.state === 'locked' || this.state === 'authenticating') return;
        
        this.currentInput = e.target.value;
        
        if (this.state === 'password') {
            // Show █ blocks for password
            this.inputDisplay.textContent = '█'.repeat(this.currentInput.length);
        } else {
            // Show actual characters with glitch effect
            this.inputDisplay.textContent = this.currentInput;
            this.applyGlitch(this.inputDisplay, 1);
        }
    }
    
    handleKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.handleSubmit();
        }
    }
    
    async handleSubmit() {
        if (this.state === 'locked' || this.state === 'authenticating') return;
        
        const input = this.currentInput.trim();
        if (!input) return;
        
        // Display what user entered
        const displayText = (this.state === 'password' || this.state === 'confirm_password') 
            ? '█'.repeat(input.length) 
            : input;
        this.addLine(`${this.inputPrompt.textContent} ${displayText}`);
        
        if (this.state === 'mode_select') {
            await this.handleModeSelection(input);
        } else if (this.state === 'email') {
            if (!this.validateEmail(input)) {
                this.addLine('');
                this.addLine('> INVALID EMAIL FORMAT', 'error');
                await this.delay(800);
                this.showPrompt(this.authMode === 'signup' ? '> ENTER EMAIL:' : '> ENTER EMAIL:');
                return;
            }
            this.email = input;
            if (this.authMode === 'signup') {
                this.state = 'username';
                this.showPrompt('> CREATE USERNAME:');
            } else {
                this.state = 'password';
                this.showPrompt('> ENTER PASSWORD:');
            }
        } else if (this.state === 'username') {
            if (input.length < 3) {
                this.addLine('');
                this.addLine('> USERNAME MUST BE AT LEAST 3 CHARACTERS', 'error');
                await this.delay(800);
                this.showPrompt('> CREATE USERNAME:');
                return;
            }
            this.username = input;
            this.state = 'password';
            this.showPrompt('> CREATE PASSWORD:');
        } else if (this.state === 'password') {
            if (this.authMode === 'signup' && input.length < 6) {
                this.addLine('');
                this.addLine('> PASSWORD MUST BE AT LEAST 6 CHARACTERS', 'error');
                await this.delay(800);
                this.showPrompt('> CREATE PASSWORD:');
                return;
            }
            this.password = input;
            if (this.authMode === 'signup') {
                this.state = 'confirm_password';
                this.showPrompt('> CONFIRM PASSWORD:');
            } else {
                await this.authenticate();
            }
        } else if (this.state === 'confirm_password') {
            await this.handlePasswordConfirmation(input);
        } else if (this.state === 'forgot_password') {
            await this.sendPasswordReset(input);
        }
    }
    
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    async handleModeSelection(choice) {
        if (choice === '1') {
            this.authMode = 'signup';
            await this.delay(300);
            this.addLine('');
            this.addLine('> MODE: SIGN UP', 'success');
            await this.delay(500);
            this.state = 'email';
            this.showPrompt('> ENTER EMAIL:');
        } else if (choice === '2') {
            this.authMode = 'login';
            await this.delay(300);
            this.addLine('');
            this.addLine('> MODE: LOG IN', 'success');
            await this.delay(500);
            this.state = 'email';
            this.showPrompt('> ENTER EMAIL:');
        } else if (choice === '3') {
            await this.handleForgotPassword();
        } else {
            await this.delay(300);
            this.addLine('');
            this.addLine('> INVALID CHOICE', 'error');
            await this.delay(800);
            this.addLine('');
            await this.showModeSelection();
        }
    }
    
    async handlePasswordConfirmation(confirmPassword) {
        if (confirmPassword === this.password) {
            await this.delay(300);
            this.addLine('');
            this.addLine('> PASSWORD CONFIRMED', 'success');
            await this.registerUser();
        } else {
            await this.delay(300);
            this.addLine('');
            this.addLine('> PASSWORDS DO NOT MATCH', 'error');
            await this.delay(1000);
            this.addLine('> PLEASE TRY AGAIN', 'dim');
            await this.delay(500);
            this.addLine('');
            this.state = 'username';
            this.showPrompt('> CREATE USERNAME:');
        }
    }
    
    async registerUser() {
        this.state = 'authenticating';
        this.setLatencyState('auth');
        
        await this.delay(500);
        await this.typeMessage('> Creating Account...', 40);
        await this.delay(500);
        
        try {
            // Sign up with Supabase
            const { data, error } = await this.supabase.auth.signUp({
                email: this.email,
                password: this.password,
                options: {
                    data: {
                        username: this.username
                    }
                }
            });
            
            if (error) {
                await this.handleAuthError(error);
                return;
            }
            
            await this.typeMessage('> Generating Security Keys...', 40);
            await this.delay(500);
            await this.typeMessage('> Encrypting Credentials...', 40);
            await this.delay(500);
            
            await this.handleSuccess();
        } catch (err) {
            await this.handleAuthError(err);
        }
    }
    
    // ==================== AUTHENTICATION ====================
    async authenticate() {
        this.state = 'authenticating';
        this.setLatencyState('auth');
        
        await this.typeMessage('> Authenticating...', 40);
        await this.delay(500);
        
        try {
            // Sign in with Supabase
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: this.email,
                password: this.password
            });
            
            if (error) {
                await this.handleAuthError(error);
                await this.handleFailure();
                return;
            }
            
            // Get username from profile
            const { data: profile } = await this.supabase
                .from('profiles')
                .select('username')
                .eq('id', data.user.id)
                .single();
            
            if (profile) {
                this.username = profile.username;
            }
            
            await this.handleSuccess();
        } catch (err) {
            await this.handleAuthError(err);
            await this.handleFailure();
        }
    }
    
    async handleAuthError(error) {
        await this.delay(300);
        this.addLine('');
        this.addLine('> ERROR: ' + error.message.toUpperCase(), 'error');
    }
    
    async handleSuccess() {
        // Screen shake
        const container = document.querySelector('.terminal-container');
        container.classList.add('screen-shake');
        setTimeout(() => container.classList.remove('screen-shake'), 200);
        
        await this.delay(200);
        
        // Loading bar animation
        await this.showLoadingBar();
        
        // Level 3 glitch (phosphor burst)
        const screen = document.querySelector('.terminal-screen');
        screen.classList.add('glitch-level-3');
        setTimeout(() => screen.classList.remove('glitch-level-3'), 300);
        
        await this.delay(500);
        
        // Success messages
        this.addLine('');
        this.addLine('> ACCESS GRANTED', 'success');
        await this.delay(500);
        this.addLine(`> WELCOME BACK, ${this.username.toUpperCase() || 'BIG BOSS'}`, 'success');
        await this.delay(800);
        this.addLine('> REDIRECTING TO NEURAL NETWORK...', 'success');
        
        // Reset state
        this.failedAttempts = 0;
        this.state = 'authenticated';
        this.inputPrompt.textContent = '';
        this.inputDisplay.textContent = '';
        
        // Hide cursor
        document.querySelector('.cursor').style.display = 'none';
        
        // Redirect to chat page after delay
        await this.delay(1500);
        window.location.href = `chat.html?user=${encodeURIComponent(this.username)}`;
    }
    
    async handleFailure() {
        this.failedAttempts++;
        
        // Level 2 glitch (horizontal distortion)
        const screen = document.querySelector('.terminal-screen');
        screen.classList.add('glitch-level-2');
        setTimeout(() => screen.classList.remove('glitch-level-2'), 500);
        
        await this.delay(500);
        
        this.addLine('');
        this.addLine('> ACCESS DENIED', 'error');
        this.addLine('> SECURITY LOG UPDATED', 'dim');
        this.addLine('');
        
        if (this.failedAttempts >= this.maxAttempts) {
            await this.triggerLockout();
        } else {
            await this.delay(1000);
            this.addLine(`> ATTEMPTS REMAINING: ${this.maxAttempts - this.failedAttempts}`, 'warning');
            await this.delay(1000);
            
            // Return to mode selection
            await this.delay(500);
            this.addLine('');
            await this.showModeSelection();
        }
    }
    
    // ==================== LOADING SYSTEM ====================
    async showLoadingBar() {
        const messages = [
            'Decrypting Token...',
            'Validating Credentials...',
            'Establishing Session...'
        ];
        
        for (let progress = 0; progress <= 100; progress += 10) {
            const filled = '■'.repeat(progress / 10);
            const empty = '□'.repeat(10 - progress / 10);
            const percentage = `${progress}`.padStart(3, ' ');
            
            const messageIndex = Math.floor(progress / 33);
            const message = messages[Math.min(messageIndex, messages.length - 1)];
            
            // Clear previous loading lines
            const loadingLines = this.output.querySelectorAll('.loading-bar');
            loadingLines.forEach(line => line.remove());
            
            this.addLine(`[${filled}${empty}] ${percentage}%`, 'loading-bar');
            this.addLine(message, 'loading-bar dim');
            
            await this.delay(100);
        }
    }
    
    // ==================== LOCKOUT SYSTEM ====================
    async triggerLockout() {
        this.state = 'locked';
        
        await this.delay(500);
        this.addLine('');
        this.addLine('> TOO MANY ATTEMPTS', 'lockout-warning');
        this.addLine(`> TERMINAL LOCKED (${this.lockoutDuration}s)`, 'lockout-warning');
        this.addLine('');
        
        // Hide input
        this.inputPrompt.textContent = '';
        this.inputDisplay.textContent = '';
        
        // Countdown
        for (let i = this.lockoutDuration; i > 0; i--) {
            const countdownLine = document.createElement('div');
            countdownLine.className = 'terminal-line lockout-warning';
            countdownLine.textContent = `> LOCKED (${i}s)`;
            countdownLine.id = 'lockout-countdown';
            
            const existing = document.getElementById('lockout-countdown');
            if (existing) existing.remove();
            
            this.output.appendChild(countdownLine);
            this.scrollToBottom();
            
            await this.delay(1000);
        }
        
        // Remove countdown line
        document.getElementById('lockout-countdown')?.remove();
        
        // Reset
        this.addLine('> LOCKOUT EXPIRED', 'dim');
        this.addLine('> SYSTEM RESET', 'dim');
        this.addLine('');
        
        this.failedAttempts = 0;
        await this.showModeSelection();
    }
    
    // ==================== GLITCH EFFECTS ====================
    applyGlitch(element, level) {
        element.classList.add(`glitch-level-${level}`);
        setTimeout(() => {
            element.classList.remove(`glitch-level-${level}`);
        }, level === 1 ? 50 : level === 2 ? 500 : 300);
    }
    
    // ==================== SYSTEM INFO ====================
    generateSystemIP() {
        const randomIP = `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
        document.getElementById('sys-ip').textContent = randomIP;
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    window.terminal = new NeuralTerminal();
});

// Add CSS classes for success/error/warning dynamically
const style = document.createElement('style');
style.textContent = `
    .terminal-line.success {
        color: var(--primary-color);
        font-weight: bold;
        text-shadow: 0 0 10px var(--primary-color);
    }
    .terminal-line.error {
        color: var(--glitch-red);
        font-weight: bold;
        text-shadow: 0 0 10px var(--glitch-red);
    }
    .terminal-line.warning {
        color: #ffaa00;
        text-shadow: 0 0 5px #ffaa00;
    }
`;
document.head.appendChild(style);

/* ============================================
   MOBILE AUTHENTICATION MANAGER
   Handles the simplified mobile-only login/register interface
   ============================================ */
class MobileAuthManager {
    constructor() {
        // Initialize Supabase only if window.supabaseClient is ready
        this.supabase = window.supabaseClient; 
        
        this.statusEl = document.getElementById('mobile-status-msg');
        
        // Forms
        this.loginForm = document.getElementById('mobile-login-form');
        this.registerForm = document.getElementById('mobile-register-form');
        
        // Inputs
        this.emailInput = document.getElementById('m-login-email');
        this.passwordInput = document.getElementById('m-login-password');
        
        this.regUsernameInput = document.getElementById('m-reg-username');
        this.regEmailInput = document.getElementById('m-reg-email');
        this.regPasswordInput = document.getElementById('m-reg-password');
        
        if (this.loginForm) {
            this.bindEvents();
        }
    }

    bindEvents() {
        console.log('Mobile Auth: Binding events');
        
        // Switch between forms
        document.getElementById('m-link-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('register');
        });
        
        document.getElementById('m-link-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('login');
        });

        // Handle Login
        document.getElementById('m-btn-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Handle Register
        document.getElementById('m-btn-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    switchForm(formName) {
        if (this.statusEl) {
            this.statusEl.textContent = '';
            this.statusEl.className = 'mobile-status';
        }
        
        if (formName === 'register') {
            this.loginForm.classList.remove('active');
            this.registerForm.classList.add('active');
            // Hide login form
            this.loginForm.style.display = 'none';
            this.registerForm.style.display = 'flex';
        } else {
            this.registerForm.classList.remove('active');
            this.loginForm.classList.add('active');
            // Hide register form
            this.registerForm.style.display = 'none';
            this.loginForm.style.display = 'flex';
        }
    }

    async handleLogin() {
        const email = this.emailInput.value;
        const password = this.passwordInput.value;

        if (!email || !password) {
            this.showStatus('Please enter email and password', 'error');
            return;
        }

        this.showStatus('Authenticating...', 'success');

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.showStatus('Access Granted. Redirecting...', 'success');
            
            // Get username to redirect correctly
            const { data: profile } = await this.supabase
                .from('profiles')
                .select('username')
                .eq('id', data.user.id)
                .single();

            setTimeout(() => {
                const username = profile ? profile.username : 'User';
                window.location.href = `chat.html?user=${encodeURIComponent(username)}`;
            }, 1000);

        } catch (error) {
            this.showStatus(error.message, 'error');
        }
    }

    async handleRegister() {
        const username = this.regUsernameInput.value;
        const email = this.regEmailInput.value;
        const password = this.regPasswordInput.value;

        if (!username || !email || !password) {
            this.showStatus('All fields are required', 'error');
            return;
        }

        if (password.length < 6) {
            this.showStatus('Password must be at least 6 chars', 'error');
            return;
        }

        this.showStatus('Creating Account...', 'success');

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username }
                }
            });

            if (error) throw error;

            this.showStatus('Account Created! Signing in...', 'success');
            
            setTimeout(() => {
                // Auto login might be needed if email confirm is off
                window.location.href = `chat.html?user=${encodeURIComponent(username)}`;
            }, 1500);

        } catch (error) {
            this.showStatus(error.message, 'error');
        }
    }

    showStatus(msg, type) {
        if (!this.statusEl) return;
        this.statusEl.textContent = msg;
        this.statusEl.className = `mobile-status ${type}`;
    }
}

// Initialize Mobile Auth Logic
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are potentially on mobile based on elements existence
    const mobileContainer = document.querySelector('.mobile-auth-wrapper');
    if (mobileContainer) {
        console.log('Mobile Auth Initialized');
        window.mobileAuth = new MobileAuthManager();
    }
});
