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

        const owner = 'Dadams2';
        const repo = 'agents-group-papers';

        // First, check if we have access to the repository
        try {
            const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: {
                    'Authorization': `Bearer ${github_token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!repoResponse.ok) {
                const repoError = await repoResponse.json();
                console.error('Repository access error:', repoError);
                throw new Error(`Cannot access repository: ${repoError.message}`);
            }
            
            const repoData = await repoResponse.json();
            console.log('Repository permissions:', repoData.permissions);
        } catch (error) {
            console.error('Error checking repository access:', error);
            throw new Error(`Repository access check failed: ${error.message}`);
        }

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

    // Alternative upload method using direct file upload
    async uploadPaperDirect(paperData, file) {
        const github_token = this.getGitHubToken();
        if (!github_token) {
            throw new Error("GitHub access token not found. Please log in again.");
        }

        const owner = 'Dadams2';
        const repo = 'agents-group-papers';
        const branch = 'main';
        
        try {
            const fileContent = await this.toBase64(file);
            const path = `papers/${paperData.track}/${file.name}`;
            
            // Check if file already exists
            let sha = null;
            try {
                const existingFileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                    headers: {
                        'Authorization': `Bearer ${github_token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (existingFileResponse.ok) {
                    const existingFile = await existingFileResponse.json();
                    sha = existingFile.sha;
                }
            } catch (error) {
                // File doesn't exist, which is fine
                console.log('File does not exist yet, will create new file');
            }
            
            // Upload the file
            const uploadData = {
                message: `Add paper: ${paperData.title}`,
                content: fileContent,
                branch: branch
            };
            
            if (sha) {
                uploadData.sha = sha; // Required for updating existing files
            }
            
            const uploadResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${github_token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(uploadData)
            });
            
            if (!uploadResponse.ok) {
                const uploadError = await uploadResponse.json();
                console.error('File upload error:', uploadError);
                throw new Error(`File upload failed: ${uploadError.message}`);
            }
            
            // Now update the schedule
            await this.updateScheduleFile(paperData, file, owner, repo, github_token);
            
            // Invalidate cache so new data is fetched next time
            this.clearCache();
            
            return { success: true, message: "Paper uploaded successfully!" };
            
        } catch (error) {
            console.error('Direct upload error:', error);
            throw error;
        }
    }
    
    // Helper method to update schedule.json
    async updateScheduleFile(paperData, file, owner, repo, github_token) {
        const schedulePath = 'schedule/schedule.json';
        
        try {
            // Get current schedule
            const scheduleResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${schedulePath}`, {
                headers: {
                    'Authorization': `Bearer ${github_token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!scheduleResponse.ok) {
                throw new Error('Could not fetch current schedule');
            }
            
            const scheduleFile = await scheduleResponse.json();
            const currentSchedule = JSON.parse(atob(scheduleFile.content));
            
            // Add new paper entry
            const newEntry = {
                id: `${Date.now()}`, // Simple ID generation
                date: paperData.discussionDate || '',
                title: paperData.title,
                authors: paperData.authors,
                track: paperData.track,
                presenter: paperData.presenter || 'TBD',
                filename: file.name,
                status: paperData.discussionDate ? 'scheduled' : 'uploaded',
                description: paperData.description || ''
            };
            
            currentSchedule.schedule.push(newEntry);
            currentSchedule.lastUpdated = new Date().toISOString().split('T')[0];
            
            // Update the schedule file
            const updateScheduleData = {
                message: `Update schedule: Add ${paperData.title}`,
                content: btoa(JSON.stringify(currentSchedule, null, 2)),
                sha: scheduleFile.sha,
                branch: 'main'
            };
            
            const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${schedulePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${github_token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateScheduleData)
            });
            
            if (!updateResponse.ok) {
                const updateError = await updateResponse.json();
                console.warn('Schedule update failed:', updateError);
                // Don't throw error here - file upload was successful
            }
            
        } catch (error) {
            console.warn('Could not update schedule automatically:', error);
            // Don't throw error - file upload was successful
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

    // Diagnostic method to check token permissions
    async checkTokenPermissions() {
        const github_token = this.getGitHubToken();
        if (!github_token) {
            console.error('No GitHub token available');
            return;
        }

        try {
            // Check user info and scopes
            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${github_token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log('GitHub user:', userData.login);
                
                // Check scopes from headers
                const scopes = userResponse.headers.get('X-OAuth-Scopes');
                console.log('Token scopes:', scopes);
                
                // Check specific repo access
                const owner = 'Dadams2';
                const repo = 'agents-group-papers';
                const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                    headers: {
                        'Authorization': `Bearer ${github_token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (repoResponse.ok) {
                    const repoData = await repoResponse.json();
                    console.log('Repository permissions:', repoData.permissions);
                } else {
                    console.error('Cannot access repository');
                }
            } else {
                console.error('Cannot verify user with token');
            }
        } catch (error) {
            console.error('Error checking token permissions:', error);
        }
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
