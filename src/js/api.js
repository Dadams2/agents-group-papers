// API for handling data operations
class API {
    constructor() {
        this.baseURL = window.location.origin;
        this.scheduleCache = null;
        this.tracksCache = null;
    }

    // Schedule operations
    async getSchedule() {
        if (this.scheduleCache) return this.scheduleCache;

        try {
            const href = window.location.href;
            let response;

            if (href.includes('localhost')) {
                // Fetch files natively when hosting locally
                response = await fetch('/schedule/schedule.json');
            } else {
                const urlParts = href.split('/');
                const owner = urlParts[2].split('.')[0];
                const repo = urlParts[3];
                response = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/schedule/schedule.json`);
            }

            if (!response.ok) throw new Error('Failed to fetch schedule');
            this.scheduleCache = await response.json();
            return this.scheduleCache;
        } catch (error) {
            console.error('Error fetching schedule:', error);
            // Return demo data if fetch fails
            return {
                schedule: [
                    {
                        id: "2025-06-20",
                        date: "2025-06-20",
                        title: "Attention Is All You Need",
                        authors: "Vaswani et al.",
                        track: "discussion",
                        presenter: "TBD",
                        filename: "attention_is_all_you_need.pdf",
                        status: "upcoming",
                        description: "Foundational paper on the Transformer architecture"
                    }
                ],
                lastUpdated: "2025-06-13"
            };
        }
    }

    async getTracks() {
        if (this.tracksCache) return this.tracksCache;

        try {
            const href = window.location.href;
            let response;

            if (href.includes('localhost')) {
                // Fetch files natively when hosting locally
                response = await fetch('/tracks/config.json');
            } else {
                const urlParts = href.split('/');
                const owner = urlParts[2].split('.')[0];
                const repo = urlParts[3];
                response = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/tracks/config.json`);
            }

            if (!response.ok) throw new Error('Failed to fetch tracks');
            this.tracksCache = await response.json();
            return this.tracksCache;
        } catch (error) {
            console.error('Error fetching tracks:', error);
            // Return demo data if fetch fails
            return {
                tracks: {
                    discussion: {
                        name: "Discussion Papers",
                        description: "Papers scheduled for group discussion",
                        color: "#3b82f6",
                        icon: "💬"
                    },
                    reference: {
                        name: "Reference Papers",
                        description: "Background and reference materials",
                        color: "#10b981",
                        icon: "📚"
                    },
                    archived: {
                        name: "Archived Papers",
                        description: "Previously discussed papers", 
                        color: "#6b7280",
                        icon: "📁"
                    }
                }
            };
        }
    }

    // Get papers by track
    async getPapersByTrack(track = null) {
        const schedule = await this.getSchedule();
        let papers = schedule.schedule || [];
        
        if (track) {
            papers = papers.filter(paper => paper.track === track);
        }
        
        return papers;
    }

    // Get next paper
    async getNextPaper() {
        const schedule = await this.getSchedule();
        const papers = schedule.schedule || [];
        const today = new Date().toISOString().split('T')[0];
        
        const upcomingPapers = papers
            .filter(paper => paper.date >= today && paper.track === 'discussion')
            .sort((a, b) => a.date.localeCompare(b.date));
        
        return upcomingPapers[0] || null;
    }

    // Get recent papers
    async getRecentPapers(limit = 5) {
        const schedule = await this.getSchedule();
        const papers = schedule.schedule || [];
        
        return papers
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, limit);
    }

    async getGitHubToken() {
        const loginData = localStorage.getItem("auth:login");
        if (!loginData) {
            console.log('No login data found');
            return null;
        }
        
        const authData = JSON.parse(loginData);
        const user = authData.user;
        
        if (!user) {
            console.log('No user data found');
            return null;
        }

        console.log('Attempting to retrieve GitHub token...');

        // Method 1: Check if GitHub token is directly available in identities
        if (user.identities && user.identities.length > 0) {
            const githubIdentity = user.identities.find(id => id.provider === 'github');
            if (githubIdentity) {
                console.log('Found GitHub identity:', githubIdentity);
                // Try different token fields
                if (githubIdentity.access_token) {
                    console.log('Found GitHub token in access_token field');
                    return githubIdentity.access_token;
                }
                if (githubIdentity.provider_access_token) {
                    console.log('Found GitHub token in provider_access_token field');
                    return githubIdentity.provider_access_token;
                }
            }
        }

        // Method 2: Try to get it from Auth0 Management API
        try {
            const managementToken = authData.access_token;
            if (!managementToken) {
                console.log('No management token available');
                return await this.getGitHubTokenAlternative();
            }

            const domain = 'dev-7vzqlirhh8j4rx4c.au.auth0.com';
            console.log('Fetching fresh user profile from Auth0...');
            
            const response = await fetch(`https://${domain}/api/v2/users/${user.user_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${managementToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch user profile from Auth0:', response.status, response.statusText);
                return await this.getGitHubTokenAlternative();
            }

            const userProfile = await response.json();
            console.log('Fresh user profile:', userProfile);
            
            // Look for GitHub identity in the fresh user profile
            if (userProfile.identities) {
                const githubIdentity = userProfile.identities.find(id => id.provider === 'github');
                if (githubIdentity) {
                    if (githubIdentity.access_token) {
                        console.log('Found GitHub token in fresh profile access_token');
                        return githubIdentity.access_token;
                    }
                    if (githubIdentity.provider_access_token) {
                        console.log('Found GitHub token in fresh profile provider_access_token');
                        return githubIdentity.provider_access_token;
                    }
                }
            }

            console.log('GitHub token not found in fresh user profile');
            return await this.getGitHubTokenAlternative();
        } catch (error) {
            console.error('Error fetching GitHub token from Management API:', error);
            return await this.getGitHubTokenAlternative();
        }
    }

    // Debug method to check what's stored in localStorage
    debugAuthData() {
        const loginData = localStorage.getItem("auth:login");
        if (loginData) {
            console.log('Auth data:', JSON.parse(loginData));
        } else {
            console.log('No auth data found');
        }
    }

    // Alternative method to get GitHub token from Auth0
    async getGitHubTokenAlternative() {
        const loginData = localStorage.getItem("auth:login");
        if (!loginData) {
            console.log('No login data found');
            return null;
        }
        
        const authData = JSON.parse(loginData);
        const user = authData.user;
        
        if (!user) {
            console.log('No user data found');
            return null;
        }

        console.log('User data structure:', user);

        // Try different possible locations for the GitHub token
        const possiblePaths = [
            // Standard identity structure
            () => {
                if (user.identities) {
                    const githubIdentity = user.identities.find(id => id.provider === 'github');
                    return githubIdentity?.access_token;
                }
                return null;
            },
            // Direct access token
            () => user.access_token,
            // Auth0 user metadata
            () => user.user_metadata?.github_token,
            () => user.app_metadata?.github_token,
            // Social connections
            () => {
                if (user.identities) {
                    const githubIdentity = user.identities.find(id => id.provider === 'github');
                    return githubIdentity?.provider_access_token;
                }
                return null;
            }
        ];

        for (const getToken of possiblePaths) {
            const token = getToken();
            if (token) {
                console.log('Found GitHub token via alternative method');
                return token;
            }
        }

        console.log('No GitHub token found in any expected location');
        return null;
    }

    toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

    // Upload paper
    async uploadPaper(paperData, file) {
        console.log('Starting paper upload process...');
        
        const github_token = await this.getGitHubToken();
        if (!github_token) {
            throw new Error("GitHub access token not found. Please log in again and ensure GitHub integration is properly configured.");
        }

        console.log('GitHub token retrieved, testing validity...');
        const tokenValid = await this.testGitHubToken(github_token);
        if (!tokenValid) {
            throw new Error("GitHub token is invalid or expired. Please log in again.");
        }

        const scopes = await this.checkGitHubTokenPermissions(github_token);
        console.log('Token scopes:', scopes);
        
        if (!scopes || !scopes.includes('repo')) {
            console.warn('GitHub token may not have required repo permissions');
        }

        const owner = 'DAADAMS';
        const repo = 'agents-group-papers';

        console.log('Converting file to base64...');
        const fileContent = await this.toBase64(file);

        const inputs = {
            title: paperData.title,
            authors: paperData.authors,
            track: paperData.track,
            description: paperData.description,
            discussion_date: paperData.discussionDate || '',
            presenter: paperData.presenter || 'TBD',
            file_content: fileContent,
            filename: file.name
        };

        console.log('Triggering GitHub workflow...');
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/upload-paper.yml/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${github_token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: 'main',
                inputs: inputs
            })
        });

        console.log('GitHub API response status:', response.status);

        if (response.status !== 204) {
            let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                console.error('GitHub API Error Details:', errorData);
                errorMessage = `GitHub API error: ${errorData.message || errorMessage}`;
            } catch (e) {
                console.error('Failed to parse error response');
            }
            throw new Error(errorMessage);
        }

        console.log('Paper upload workflow triggered successfully');

        // Invalidate cache so new data is fetched next time
        this.clearCache();

        return { success: true, message: "Paper upload started. It may take a moment to appear." };
    }

    // Add to schedule
    async addToSchedule(paperId, date, presenter) {

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Adding to schedule:', { paperId, date, presenter });
        
        // In production, this would update the schedule via GitHub API
        return true;
    }

    // Search papers
    async searchPapers(query, track = null) {
        const papers = await this.getPapersByTrack(track);
        
        if (!query) return papers;
        
        const searchTerm = query.toLowerCase();
        return papers.filter(paper => 
            paper.title.toLowerCase().includes(searchTerm) ||
            paper.authors.toLowerCase().includes(searchTerm) ||
            (paper.description && paper.description.toLowerCase().includes(searchTerm))
        );
    }

    // Get paper counts by track
    async getPaperCounts() {
        const schedule = await this.getSchedule();
        const papers = schedule.schedule || [];
        
        const counts = {
            discussion: 0,
            reference: 0,
            archived: 0
        };
        
        papers.forEach(paper => {
            if (counts.hasOwnProperty(paper.track)) {
                counts[paper.track]++;
            }
        });
        
        return counts;
    }

    // Clear cache (for refreshing data)
    clearCache() {
        this.scheduleCache = null;
        this.tracksCache = null;
    }

    // Utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getDaysUntil(dateString) {
        const today = new Date();
        const target = new Date(dateString);
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    generatePaperUrl(track, filename) {
        const { hostname, pathname } = window.location;

        // If running locally, use relative path
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `/papers/${track}/${filename}`;
        }

        // Otherwise, assume GitHub Pages and construct GitHub URL
        const githubUser = hostname.split('.')[0];
        const pathParts = pathname.split('/').filter(Boolean);
        const repoName = pathParts[0];
        const branch = 'main'; // change to 'master' if needed

        return `https://github.com/${githubUser}/${repoName}/blob/${branch}/papers/${track}/${filename}`;
    }

    // Test method to verify GitHub token works
    async testGitHubToken(token) {
        if (!token) {
            console.log('No token provided for testing');
            return false;
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const user = await response.json();
                console.log('GitHub token is valid for user:', user.login);
                return true;
            } else {
                console.error('GitHub token test failed:', response.status, response.statusText);
                return false;
            }
        } catch (error) {
            console.error('Error testing GitHub token:', error);
            return false;
        }
    }

    // Method to check token permissions
    async checkGitHubTokenPermissions(token) {
        if (!token) {
            console.log('No token provided for permission check');
            return null;
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const scopes = response.headers.get('x-oauth-scopes');
                console.log('GitHub token scopes:', scopes);
                return scopes;
            } else {
                console.error('Failed to check GitHub token permissions:', response.status);
                return null;
            }
        } catch (error) {
            console.error('Error checking GitHub token permissions:', error);
            return null;
        }
    }
}

// Global API instance
window.api = new API();
