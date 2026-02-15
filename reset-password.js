// ============================================
// PASSWORD RESET TERMINAL
// ============================================

class PasswordResetTerminal {
    constructor() {
        this.output = document.getElementById('terminal-output');
        this.inputPrompt = document.getElementById('input-prompt');
        this.inputDisplay = document.getElementById('input-display');
        this.hiddenInput = document.getElementById('hidden-input');
        this.latencyDisplay = document.getElementById('latency');
        
        this.currentInput = '';
        this.newPassword = '';
        this.state = 'init'; // init, new_password, confirm_password, processing
        this.supabase = window.supabaseClient;
        
        // Latency controller
        this.latency = {
            current: 9,
            target: 9
        };
        
        this.init();
    }
    
    async init() {
        // Focus hidden input
        this.hiddenInput.focus();
        document.addEventListener('click', () => this.hiddenInput.focus());
        
        // Setup keyboard handler
        this.hiddenInput.addEventListener('input', (e) => this.handleInput(e));
        this.hiddenInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Start latency controller
        this.startLatencyController();
        
        // Generate random IP
        this.generateSystemIP();
        
        // Check if this is a password reset request
        await this.checkPasswordResetToken();
    }
    
    async checkPasswordResetToken() {
        await this.delay(500);
        this.addLine('> NEURAL TERMINAL v2.0.47', 'success');
        await this.delay(300);
        this.addLine('> Initializing secure connection...');
        await this.delay(800);
        
        // Check for password recovery token
        const { data: { session } } = await this.supabase.auth.getSession();
        
        if (!session) {
            this.addLine('');
            this.addLine('> ERROR: INVALID OR EXPIRED RESET LINK', 'error');
            await this.delay(1000);
            this.addLine('> REDIRECTING TO LOGIN...', 'dim');
            await this.delay(2000);
            window.location.href = 'index.html';
            return;
        }
        
        // Valid session from password reset
        this.addLine('');
        this.addLine('> PASSWORD RESET SESSION VERIFIED', 'success');
        await this.delay(500);
        this.addLine('> ENTER NEW PASSWORD', 'success');
        await this.delay(300);
        this.addLine('');
        
        this.state = 'new_password';
        this.showPrompt('> NEW PASSWORD:');
    }
    
    handleInput(e) {
        this.currentInput = this.hiddenInput.value;
        
        // Show asterisks for password
        this.inputDisplay.textContent = '*'.repeat(this.currentInput.length);
    }
    
    handleKeydown(e) {
        if (e.key === 'Enter' && this.currentInput.trim()) {
            e.preventDefault();
            this.processInput(this.currentInput.trim());
            this.hiddenInput.value = '';
        } else if (e.key === 'Escape') {
            this.currentInput = '';
            this.inputDisplay.textContent = '';
            this.hiddenInput.value = '';
        }
    }
    
    async processInput(input) {
        const displayText = '*'.repeat(input.length);
        this.addLine(`${this.inputPrompt.textContent} ${displayText}`);
        
        if (this.state === 'new_password') {
            if (input.length < 6) {
                this.addLine('');
                this.addLine('> PASSWORD MUST BE AT LEAST 6 CHARACTERS', 'error');
                await this.delay(800);
                this.showPrompt('> NEW PASSWORD:');
                return;
            }
            
            this.newPassword = input;
            this.state = 'confirm_password';
            this.showPrompt('> CONFIRM PASSWORD:');
        } else if (this.state === 'confirm_password') {
            if (input !== this.newPassword) {
                this.addLine('');
                this.addLine('> PASSWORDS DO NOT MATCH', 'error');
                await this.delay(800);
                this.addLine('');
                this.newPassword = '';
                this.state = 'new_password';
                this.showPrompt('> NEW PASSWORD:');
                return;
            }
            
            await this.updatePassword(input);
        }
    }
    
    async updatePassword(password) {
        this.state = 'processing';
        
        await this.delay(300);
        this.addLine('');
        this.addLine('> PASSWORD CONFIRMED', 'success');
        await this.delay(500);
        await this.typeMessage('> Updating password...', 40);
        await this.delay(500);
        
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: password
            });
            
            if (error) {
                this.addLine('');
                
                // Check if it's a "same password" error
                if (error.message.toLowerCase().includes('same') || 
                    error.message.toLowerCase().includes('password')) {
                    this.addLine('> ERROR: CANNOT USE OLD PASSWORD', 'error');
                } else {
                    this.addLine('> ERROR: ' + error.message.toUpperCase(), 'error');
                }
                
                await this.delay(1000);
                this.addLine('> PLEASE TRY A DIFFERENT PASSWORD', 'dim');
                await this.delay(800);
                this.addLine('');
                
                // Reset and ask for new password again
                this.newPassword = '';
                this.state = 'new_password';
                this.showPrompt('> NEW PASSWORD:');
                return;
            }
            
            await this.typeMessage('> Encrypting new credentials...', 40);
            await this.delay(500);
            this.addLine('');
            this.addLine('> PASSWORD SUCCESSFULLY UPDATED', 'success');
            await this.delay(800);
            this.addLine('> SIGNING OUT...', 'dim');
            
            // Sign out and redirect to login
            await this.delay(1500);
            await this.supabase.auth.signOut();
            
            this.addLine('> REDIRECTING TO LOGIN...', 'dim');
            await this.delay(2000);
            window.location.href = 'index.html';
            
        } catch (err) {
            this.addLine('');
            this.addLine('> ERROR: FAILED TO UPDATE PASSWORD', 'error');
            await this.delay(1000);
            this.addLine('> PLEASE TRY AGAIN', 'dim');
            await this.delay(800);
            this.addLine('');
            
            // Reset and ask for new password again
            this.newPassword = '';
            this.state = 'new_password';
            this.showPrompt('> NEW PASSWORD:');
        }
    }
    
    // ==================== UI HELPERS ====================
    showPrompt(prompt) {
        this.inputPrompt.textContent = prompt;
        this.currentInput = '';
        this.inputDisplay.textContent = '';
        this.hiddenInput.value = '';
    }
    
    addLine(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        line.textContent = text;
        this.output.appendChild(line);
        
        const screen = document.querySelector('.terminal-screen');
        screen.scrollTop = screen.scrollHeight;
    }
    
    async typeMessage(message, speed = 40) {
        const line = document.createElement('div');
        line.className = 'terminal-line dim';
        this.output.appendChild(line);
        
        for (let i = 0; i < message.length; i++) {
            line.textContent += message[i];
            await this.delay(speed);
        }
        
        const screen = document.querySelector('.terminal-screen');
        screen.scrollTop = screen.scrollHeight;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ==================== SYSTEM UTILITIES ====================
    generateSystemIP() {
        const ip = Array(4).fill(0).map(() => Math.floor(Math.random() * 256)).join('.');
        document.getElementById('ip-address').textContent = ip;
    }
    
    startLatencyController() {
        setInterval(() => {
            if (this.latency.current < this.latency.target) {
                this.latency.current++;
            } else if (this.latency.current > this.latency.target) {
                this.latency.current--;
            }
            this.latencyDisplay.textContent = this.latency.current;
        }, 100);
        
        setInterval(() => {
            this.latency.target = 8 + Math.floor(Math.random() * 6);
        }, 3000);
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    new PasswordResetTerminal();
});
