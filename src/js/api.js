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
        console.log('🔍 Getting GitHub token...');
        
        const loginData = JSON.parse(localStorage.getItem("auth:login"));
        console.log('📦 Login data from localStorage:', loginData);
        
        if (!loginData || !loginData.user) {
            console.warn('⚠️ No login data or user found in localStorage');
            return null;
        }
        
        const user = loginData.user;
        console.log('👤 User object:', user);
        console.log('🔗 User metadata:', user.user_metadata);
        
        if (user.user_metadata && user.user_metadata.gh_token) {
            console.log('✅ GitHub token found in user_metadata');
            console.log('🔑 Token preview:', user.user_metadata.gh_token.substring(0, 10) + '...');
            return user.user_metadata.gh_token;
        } else {
            console.warn('⚠️ No gh_token found in user_metadata');
            console.log('🔍 User metadata details:', user.user_metadata);
        }
        
        console.error('❌ Failed to retrieve GitHub token');
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
            throw new Error("GitHub access token not found. Please log in again.");
        }

        const owner = 'DAADAMS';
        const repo = 'agents-group-papers';

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
