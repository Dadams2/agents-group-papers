// GitHub OAuth and Authentication
class Auth {
    constructor() {
        this.clientId = 'Ov23liqY2bUCkabZtdJu'; // Replace with actual client ID
        this.user = null;
        this.init();
    }

    init() {
        console.log('Initializing authentication...');

        // Check for existing auth
        const token = localStorage.getItem('github_token');
        const user = localStorage.getItem('github_user');

        console.log('Stored token:', token);
        console.log('Stored user:', user);

        if (token && user) {
            this.user = JSON.parse(user);
            console.log('User authenticated:', this.user);
            this.updateUI();
        }

        // Handle OAuth callback
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const tokenFromHash = hashParams.get('access_token');
        console.log('Token from URL fragment:', tokenFromHash);

        if (tokenFromHash) {
            localStorage.setItem('github_token', tokenFromHash);
            this.fetchUserDetails(tokenFromHash);
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

    async fetchUserDetails(token) {
        console.log('Fetching user details with token:', token);

        try {
            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log('User response status:', userResponse.status);

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user details');
            }

            const user = await userResponse.json();
            console.log('Fetched user details:', user);

            localStorage.setItem('github_user', JSON.stringify(user));
            this.user = user;
            this.updateUI();
        } catch (error) {
            console.error('Error fetching user details:', error);
            alert('Authentication failed. Please try again.');
        }
    }

    login() {
        const redirectUri = window.location.href;

        if (redirectUri.includes('localhost') || redirectUri.includes('127.0.0.1')) {
            // Set dummy user for local hosting
            const dummyUser = {
                login: 'dummy_user',
                name: 'Localhost User',
                avatar_url: 'https://via.placeholder.com/150',
            };

            localStorage.setItem('github_token', 'dummy_token');
            localStorage.setItem('github_user', JSON.stringify(dummyUser));
            this.user = dummyUser;
            this.updateUI();
            console.log('Dummy user set for localhost or 127.0.0.1:', dummyUser);
        } else {
            // Redirect to GitHub OAuth using Implicit Grant Flow
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${this.clientId}&redirect_uri=${redirectUri}&response_type=token`;
            window.location.href = authUrl;
        }
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
        console.log('Updating UI...');
        console.log('Current user:', this.user);

        const loginBtn = document.getElementById('login-btn');
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (this.user) {
            console.log('User is logged in. Updating UI for authenticated state.');
            loginBtn?.classList.add('hidden');
            userInfo?.classList.remove('hidden');

            if (userAvatar) userAvatar.src = this.user.avatar_url;
            if (userName) userName.textContent = this.user.name || this.user.login;

            document.querySelectorAll('.auth-required').forEach(el => {
                el.classList.add('hidden');
            });

            document.querySelectorAll('[id$="-form"]').forEach(el => {
                el.classList.remove('hidden');
            });
        } else {
            console.log('User is not logged in. Updating UI for unauthenticated state.');
            loginBtn?.classList.remove('hidden');
            userInfo?.classList.add('hidden');

            document.querySelectorAll('.auth-required').forEach(el => {
                el.classList.remove('hidden');
            });

            document.querySelectorAll('[id$="-form"]').forEach(el => {
                el.classList.add('hidden');
            });
        }
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
