// GitHub OAuth and Authentication
class Auth {
    constructor() {
        this.clientId = 'YOUR_GITHUB_CLIENT_ID'; // Replace with actual client ID
        this.user = null;
        this.init();
    }

    init() {
        // Check for existing auth
        const token = localStorage.getItem('github_token');
        const user = localStorage.getItem('github_user');
        
        if (token && user) {
            this.user = JSON.parse(user);
            this.updateUI();
        }

        // Handle OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            this.handleCallback(code);
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginBtns = document.querySelectorAll('#login-btn, #login-prompt');
        const logoutBtn = document.getElementById('logout-btn');

        loginBtns.forEach(btn => {
            btn?.addEventListener('click', () => this.login());
        });

        logoutBtn?.addEventListener('click', () => this.logout());
    }

    login() {
        // For demo purposes, we'll simulate GitHub login
        // In production, this would redirect to GitHub OAuth
        const demoUser = {
            login: 'demo-user',
            name: 'Demo User',
            avatar_url: 'https://github.com/github.png',
            id: 12345
        };
        
        this.user = demoUser;
        localStorage.setItem('github_token', 'demo-token');
        localStorage.setItem('github_user', JSON.stringify(demoUser));
        this.updateUI();
        
        // Remove any auth-required messages
        document.querySelectorAll('.auth-required').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show auth-protected content
        document.querySelectorAll('.hidden[id$="-form"]').forEach(el => {
            el.classList.remove('hidden');
        });
    }

    logout() {
        this.user = null;
        localStorage.removeItem('github_token');
        localStorage.removeItem('github_user');
        this.updateUI();
        
        // Show auth-required messages
        document.querySelectorAll('.auth-required').forEach(el => {
            el.classList.remove('hidden');
        });
        
        // Hide auth-protected content
        document.querySelectorAll('[id$="-form"]').forEach(el => {
            el.classList.add('hidden');
        });
    }

    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (this.user) {
            loginBtn?.classList.add('hidden');
            userInfo?.classList.remove('hidden');
            
            if (userAvatar) userAvatar.src = this.user.avatar_url;
            if (userName) userName.textContent = this.user.name || this.user.login;
            
            // Show auth-protected elements
            document.querySelectorAll('.auth-required').forEach(el => {
                el.classList.add('hidden');
            });
            
            document.querySelectorAll('[id$="-form"]').forEach(el => {
                el.classList.remove('hidden');
            });
        } else {
            loginBtn?.classList.remove('hidden');
            userInfo?.classList.add('hidden');
            
            // Hide auth-protected elements
            document.querySelectorAll('.auth-required').forEach(el => {
                el.classList.remove('hidden');
            });
            
            document.querySelectorAll('[id$="-form"]').forEach(el => {
                el.classList.add('hidden');
            });
        }
    }

    async handleCallback(code) {
        // In production, exchange code for token
        console.log('OAuth callback with code:', code);
        // For now, simulate successful auth
        this.login();
    }

    isAuthenticated() {
        return !!this.user;
    }

    getToken() {
        return localStorage.getItem('github_token');
    }

    getUser() {
        return this.user;
    }
}

// Global auth instance
window.auth = new Auth();
