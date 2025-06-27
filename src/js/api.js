// Import auth functions
import { isAuthenticated, currentUser, accessToken } from '/auth/api.js';

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

    getGitHubToken() {
        if (!isAuthenticated()) {
            console.log('User not authenticated');
            return null;
        }

        const user = currentUser();
        if (!user) {
            console.log('No user data found');
            return null;
        }

        console.log('Looking for GitHub token in user identities...');
        
        if (user.identities && user.identities.length > 0) {
            const githubIdentity = user.identities.find(id => id.provider === 'github');
            if (githubIdentity) {
                console.log('Found GitHub identity:', githubIdentity);
                
                // Try different possible token fields
                const token = githubIdentity.access_token || 
                            githubIdentity.provider_access_token ||
                            githubIdentity.oauth_token;
                
                if (token) {
                    console.log('GitHub token found');
                    return token;
                }
            }
        }

        console.log('GitHub token not found in user identities');
        return null;
    }

    // Get GitHub token with fallback to Auth0 Management API
    async getGitHubTokenWithFallback() {
        // First try the simple method
        const token = this.getGitHubToken();
        if (token) {
            return token;
        }

        console.log('Trying to get fresh GitHub token via Auth0 Management API...');
        
        if (!isAuthenticated()) {
            throw new Error('User not authenticated');
        }

        const managementToken = accessToken();
        if (!managementToken) {
            throw new Error('No management token available');
        }

        const user = currentUser();
        if (!user || !user.user_id) {
            throw new Error('No user ID available');
        }

        try {
            const domain = 'dev-7vzqlirhh8j4rx4c.au.auth0.com';
            const response = await fetch(`https://${domain}/api/v2/users/${user.user_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${managementToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Management API request failed: ${response.status} ${response.statusText}`);
            }

            const userProfile = await response.json();
            console.log('Fresh user profile retrieved');

            // Look for GitHub identity token
            if (userProfile.identities) {
                const githubIdentity = userProfile.identities.find(id => id.provider === 'github');
                if (githubIdentity) {
                    const token = githubIdentity.access_token || 
                                githubIdentity.provider_access_token ||
                                githubIdentity.oauth_token;
                    
                    if (token) {
                        console.log('GitHub token found via Management API');
                        return token;
                    }
                }
            }

            throw new Error('GitHub token not found in fresh user profile');
        } catch (error) {
            console.error('Error getting GitHub token via Management API:', error);
            throw error;
        }
    }

    // Test GitHub token validity
    async testGitHubToken(token) {
        if (!token) {
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
                
                // Check token scopes
                const scopes = response.headers.get('x-oauth-scopes');
                console.log('GitHub token scopes:', scopes);
                
                if (!scopes || !scopes.includes('repo')) {
                    console.warn('GitHub token may not have required "repo" scope');
                    return false;
                }
                
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
        
        try {
            // Try to get GitHub token, with fallback to Management API
            let github_token = this.getGitHubToken();
            
            if (!github_token) {
                console.log('No GitHub token found locally, trying Management API...');
                github_token = await this.getGitHubTokenWithFallback();
            }
            
            // Test token validity and permissions
            console.log('Testing GitHub token validity...');
            const tokenValid = await this.testGitHubToken(github_token);
            if (!tokenValid) {
                throw new Error("GitHub token is invalid, expired, or lacks required permissions. Please log in again.");
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
            
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
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
}

// Global API instance
window.api = new API();
