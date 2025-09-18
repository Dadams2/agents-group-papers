// API for handling data operations
class API {
    constructor() {
        this.baseURL = window.location.origin;
        this.scheduleCache = null;
        this.tracksCache = null;
        // Remove hardcoded token - will be retrieved from Auth0
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
        console.log('🔍 Getting GitHub token from Auth0...');
        
        const loginData = JSON.parse(localStorage.getItem("auth:login"));
        console.log('📦 Login data from localStorage:', loginData ? 'Found' : 'Not found');
        
        if (!loginData || !loginData.user) {
            console.warn('⚠️ No login data or user found. User needs to authenticate first.');
            return null;
        }
        
        const user = loginData.user;
        console.log('👤 User authenticated:', user.email || user.nickname);
        
        if (user.user_metadata && user.user_metadata.pat) {
            console.log('✅ GitHub PAT found in user metadata');
            return user.user_metadata.pat;
        } else {
            console.warn('⚠️ No GitHub PAT found in user metadata. User may not have repository access.');
            console.log('🔍 Available metadata keys:', Object.keys(user.user_metadata || {}));
            return null;
        }
    }

    // Alternative: Get GitHub token from identity provider (for GitHub OAuth)
    getGitHubTokenFromIdp() {
        console.log('🔍 Getting GitHub token from identity provider...');
        
        const loginData = JSON.parse(localStorage.getItem("auth:login"));
        
        if (!loginData || !loginData.user) {
            console.warn('⚠️ No login data found');
            return null;
        }
        
        const user = loginData.user;
        
        // Look for GitHub identity in identities array
        if (user.identities) {
            const githubIdentity = user.identities.find(identity => identity.provider === 'github');
            if (githubIdentity && githubIdentity.access_token) {
                console.log('✅ GitHub token found in identity provider');
                return githubIdentity.access_token;
            }
        }
        
        console.warn('⚠️ No GitHub token found in identity provider');
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
        const github_token = this.getGitHubToken();
        if (!github_token) {
            throw new Error("GitHub access token not found. Please log in first.");
        }

        const owner = 'Dadams2';
        const repo = 'agents-group-papers';

        const fileContent = await this.toBase64(file);

        const filePath = `papers/${paperData.track}/${file.name}`;
        
        const fileUploadResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${github_token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Add paper: ${paperData.title}`,
                content: fileContent,
                branch: 'main'
            })
        });

        if (!fileUploadResponse.ok) {
            const errorData = await fileUploadResponse.json();
            throw new Error(`File upload failed: ${errorData.message}`);
        }

        const inputs = {
            title: paperData.title,
            authors: paperData.authors,
            track: paperData.track,
            description: paperData.description,
            discussion_date: paperData.discussionDate || '',
            presenter: paperData.presenter || 'TBD',
            filename: file.name
        };

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/upload-paper.yml/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${github_token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                ref: 'main',
                inputs: inputs
            })
        });

        if (response.status !== 204) {
            const errorData = await response.json();
            console.error('GitHub API Error:', errorData);
            throw new Error(`GitHub API error: ${errorData.message}`);
        }

        // Invalidate cache so new data is fetched next time
        this.clearCache();

        return { success: true, message: "Paper upload started. It may take a moment to appear." };
    }

    // Add to schedule
    async addToSchedule(paperId, date, presenter) {
        const github_token = this.getGitHubToken();
        if (!github_token) {
            throw new Error("GitHub access token not found. Please log in first.");
        }

        const owner = 'Dadams2';
        const repo = 'agents-group-papers';

        console.log('Adding to schedule:', { paperId, date, presenter });

        const inputs = {
            paper_id: paperId,
            discussion_date: date,
            presenter: presenter || 'TBD',
            action: 'add_to_schedule'
        };

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/update-schedule.yml/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${github_token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                ref: 'main',
                inputs: inputs
            })
        });

        if (response.status !== 204) {
            const errorData = await response.json();
            console.error('GitHub API Error:', errorData);
            throw new Error(`GitHub API error: ${errorData.message}`);
        }

        // Invalidate cache so new data is fetched next time
        this.clearCache();

        return { success: true, message: "Paper added to schedule. It may take a moment to appear." };
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

    // Like/unlike paper functionality
    async likePaper(paperId) {
        const github_token = this.getGitHubToken();
        if (!github_token) {
            throw new Error('GitHub token required to like papers');
        }

        // Get current user info
        const loginData = JSON.parse(localStorage.getItem("auth:login"));
        if (!loginData || !loginData.user) {
            throw new Error('User must be logged in to like papers');
        }

        const username = loginData.user.nickname || loginData.user.email || 'anonymous';
        
        return await this.updatePaperLikes(paperId, username, 'like');
    }

    async unlikePaper(paperId) {
        const github_token = this.getGitHubToken();
        if (!github_token) {
            throw new Error('GitHub token required to unlike papers');
        }

        // Get current user info
        const loginData = JSON.parse(localStorage.getItem("auth:login"));
        if (!loginData || !loginData.user) {
            throw new Error('User must be logged in to unlike papers');
        }

        const username = loginData.user.nickname || loginData.user.email || 'anonymous';
        
        return await this.updatePaperLikes(paperId, username, 'unlike');
    }

    async updatePaperLikes(paperId, username, action) {
        const github_token = this.getGitHubToken();
        const owner = 'Dadams2';
        const repo = 'agents-group-papers';

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/update-likes.yml/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${github_token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                ref: 'main',
                inputs: {
                    paper_id: paperId,
                    username: username,
                    action: action
                }
            })
        });

        if (response.status !== 204) {
            const errorData = await response.text();
            throw new Error(`Failed to ${action} paper: ${errorData}`);
        }

        // Invalidate cache so updated likes are fetched next time
        this.clearCache();

        return { success: true, message: `Paper ${action}d successfully!` };
    }

    // Check if current user has liked a paper
    hasUserLiked(paper) {
        const loginData = JSON.parse(localStorage.getItem("auth:login"));
        if (!loginData || !loginData.user || !paper.likes) {
            return false;
        }

        const username = loginData.user.nickname || loginData.user.email || 'anonymous';
        return paper.likes.users && paper.likes.users.includes(username);
    }

    // Get like count for a paper
    getLikeCount(paper) {
        return paper.likes ? paper.likes.count : 0;
    }
}

// Global API instance
window.api = new API();

// Debug: Log that API functions are available
console.log('API initialized with like functions:', {
    hasLikeCount: typeof window.api.getLikeCount === 'function',
    hasUserLiked: typeof window.api.hasUserLiked === 'function',
    likePaper: typeof window.api.likePaper === 'function'
});
