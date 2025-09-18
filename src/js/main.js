// Main page functionality
document.addEventListener('DOMContentLoaded', async function() {
    await loadHomePage();
});

async function loadHomePage() {
    try {
        await Promise.all([
            loadNextPaper(),
            loadStats(),
            loadRecentPapers(),
            loadSchedulePreview()
        ]);
    } catch (error) {
        console.error('Error loading home page:', error);
    }
}

async function loadNextPaper() {
    const nextPaperContainer = document.getElementById('next-paper');
    if (!nextPaperContainer) return;

    try {
        const nextPaper = await window.api.getNextPaper();
        
        if (nextPaper) {
            const daysUntil = window.api.getDaysUntil(nextPaper.date);
            const formattedDate = window.api.formatDate(nextPaper.date);
            
            nextPaperContainer.innerHTML = `
                <div class="next-paper-info">
                    <h3>${nextPaper.title}</h3>
                    <p class="next-paper-authors">by ${nextPaper.authors}</p>
                    <div class="next-paper-meta">
                        <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                        <span><i class="fas fa-user"></i> Presenter: ${nextPaper.presenter}</span>
                        ${daysUntil > 0 ? `<span class="countdown"><i class="fas fa-clock"></i> ${daysUntil} days</span>` : ''}
                    </div>
                    ${nextPaper.description ? `<p class="next-paper-description">${nextPaper.description}</p>` : ''}
                </div>
                <div class="next-paper-actions">
                    <a href="${window.api.generatePaperUrl(nextPaper.track, nextPaper.filename)}" 
                       class="btn btn-success" target="_blank">
                        <i class="fas fa-download"></i> Download Paper
                    </a>
                    <a href="schedule.html" class="btn btn-secondary">
                        <i class="fas fa-calendar"></i> View Schedule
                    </a>
                </div>
            `;
        } else {
            nextPaperContainer.innerHTML = `
                <div class="next-paper-info text-center">
                    <h3>No Upcoming Papers</h3>
                    <p>No papers are currently scheduled for discussion.</p>
                </div>
                <div class="next-paper-actions">
                    <a href="upload.html" class="btn btn-primary">
                        <i class="fas fa-upload"></i> Upload Paper
                    </a>
                </div>
            `;
        }
    } catch (error) {
        nextPaperContainer.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading next paper</p>
            </div>
        `;
    }
}

async function loadStats() {
    try {
        const counts = await window.api.getPaperCounts();
        
        document.getElementById('discussion-count').textContent = counts.discussion;
        document.getElementById('reference-count').textContent = counts.reference;
        document.getElementById('archived-count').textContent = counts.archived;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentPapers() {
    const recentContainer = document.getElementById('recent-papers');
    if (!recentContainer) return;

    try {
        const papers = await window.api.getRecentPapers(3);
        
        if (papers.length > 0) {
            recentContainer.innerHTML = papers.map(paper => createPaperCard(paper)).join('');
        } else {
            recentContainer.innerHTML = `
                <div class="no-papers">
                    <i class="fas fa-file-pdf"></i>
                    <h3>No Papers Yet</h3>
                    <p>Upload your first paper to get started.</p>
                    <a href="upload.html" class="btn btn-primary">
                        <i class="fas fa-upload"></i> Upload Paper
                    </a>
                </div>
            `;
        }
    } catch (error) {
        recentContainer.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading recent papers</p>
            </div>
        `;
    }
}

async function loadSchedulePreview() {
    const scheduleContainer = document.getElementById('schedule-preview');
    if (!scheduleContainer) return;

    try {
        const schedule = await window.api.getSchedule();
        const upcomingPapers = schedule.schedule
            .filter(paper => paper.track === 'discussion' && paper.date >= new Date().toISOString().split('T')[0])
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 3);

        if (upcomingPapers.length > 0) {
            scheduleContainer.innerHTML = upcomingPapers.map(paper => `
                <div class="schedule-item upcoming">
                    <div class="schedule-date">
                        ${window.api.formatDate(paper.date)}
                        ${window.api.getDaysUntil(paper.date) > 0 ? 
                            `<span class="schedule-countdown">in ${window.api.getDaysUntil(paper.date)} days</span>` : 
                            ''}
                    </div>
                    <div class="schedule-paper">
                        <h4>${paper.title}</h4>
                        <p>by ${paper.authors}</p>
                        <p class="text-muted">Presenter: ${paper.presenter}</p>
                    </div>
                </div>
            `).join('');
        } else {
            scheduleContainer.innerHTML = `
                <div class="no-papers">
                    <i class="fas fa-calendar"></i>
                    <p>No upcoming discussions scheduled</p>
                </div>
            `;
        }
    } catch (error) {
        scheduleContainer.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading schedule</p>
            </div>
        `;
    }
}

function createPaperCard(paper) {
    const daysUntil = window.api.getDaysUntil(paper.date);
    const isUpcoming = paper.track === 'discussion' && daysUntil >= 0;
    
    // Like functionality - with fallback for when API functions aren't available yet
    const likeCount = (window.api && window.api.getLikeCount) ? window.api.getLikeCount(paper) : (paper.likes ? paper.likes.count : 0);
    const hasLiked = (window.api && window.api.hasUserLiked) ? window.api.hasUserLiked(paper) : false;
    const likeIcon = hasLiked ? 'fas fa-heart' : 'far fa-heart';
    const likeButtonClass = hasLiked ? 'btn-like liked' : 'btn-like';
    
    return `
        <div class="paper-item" data-paper-id="${paper.id}">
            <div class="paper-header">
                <div>
                    <h3 class="paper-title">${paper.title}</h3>
                    <p class="paper-authors">by ${paper.authors}</p>
                </div>
                <div class="paper-header-right">
                    <span class="paper-track track-${paper.track}">
                        ${getTrackIcon(paper.track)} ${getTrackName(paper.track)}
                    </span>
                    <div class="paper-likes">
                        <button onclick="toggleLike('${paper.id}')" class="${likeButtonClass}" title="${hasLiked ? 'Unlike' : 'Like'} this paper">
                            <i class="${likeIcon}"></i>
                        </button>
                        <span class="like-count">${likeCount}</span>
                    </div>
                </div>
            </div>
            
            <div class="paper-meta">
                <span><i class="fas fa-calendar"></i> ${window.api.formatDate(paper.date)}</span>
                ${paper.presenter ? `<span><i class="fas fa-user"></i> ${paper.presenter}</span>` : ''}
                ${isUpcoming && daysUntil > 0 ? `<span><i class="fas fa-clock"></i> ${daysUntil} days</span>` : ''}
            </div>
            
            ${paper.description ? `<p class="paper-description">${paper.description}</p>` : ''}
            
            <div class="paper-actions">
                <a href="${window.api.generatePaperUrl(paper.track, paper.filename)}" 
                   class="btn btn-primary" target="_blank">
                    <i class="fas fa-download"></i> Download
                </a>
                <a href="browse.html" class="btn btn-secondary">
                    <i class="fas fa-eye"></i> View Details
                </a>
            </div>
        </div>
    `;
}

function getTrackIcon(track) {
    const icons = {
        discussion: '💬',
        reference: '📚',
        archived: '📁'
    };
    return icons[track] || '📄';
}

function getTrackName(track) {
    const names = {
        discussion: 'Discussion',
        reference: 'Reference',
        archived: 'Archived'
    };
    return names[track] || track;
}

// Like/Unlike functionality (shared with browse.js)
async function toggleLike(paperId) {
    // Check authentication using the proper auth API
    if (!window.auth || typeof window.auth.isAuthenticated !== 'function' || !window.auth.isAuthenticated()) {
        alert('Please log in with GitHub to like papers');
        return;
    }

    // Check if like functions are available
    if (!window.api || !window.api.likePaper || !window.api.hasUserLiked) {
        alert('Like functionality is not available yet. Please refresh the page.');
        return;
    }

    try {
        // We need to get the current papers data first
        const schedule = await window.api.getSchedule();
        const paper = schedule.schedule.find(p => p.id === paperId);
        
        if (!paper) {
            throw new Error('Paper not found');
        }

        const hasLiked = window.api.hasUserLiked(paper);
        const action = hasLiked ? 'unlike' : 'like';
        
        // Show loading state
        const button = document.querySelector(`[data-paper-id="${paperId}"] .btn-like`);
        if (button) {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
        }

        // Perform the action
        if (action === 'like') {
            await window.api.likePaper(paperId);
        } else {
            await window.api.unlikePaper(paperId);
        }

        // Show success message
        showLikeMessage(`Paper ${action}d successfully! Changes will appear shortly.`, 'success');
        
        // Reload papers after a short delay to show updated counts
        setTimeout(async () => {
            await loadRecentPapers();
        }, 2000);

    } catch (error) {
        console.error('Error toggling like:', error);
        showLikeMessage('Failed to update like: ' + error.message, 'error');
        
        // Reset button state
        const button = document.querySelector(`[data-paper-id="${paperId}"] .btn-like`);
        if (button) {
            button.disabled = false;
        }
    }
}

function showLikeMessage(message, type) {
    // Create or update message element
    let messageDiv = document.querySelector('.like-message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.className = 'like-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 0.5rem;
            z-index: 1000;
            font-weight: 500;
            max-width: 300px;
        `;
        document.body.appendChild(messageDiv);
    }

    // Style based on type
    if (type === 'success') {
        messageDiv.style.backgroundColor = '#10b981';
        messageDiv.style.color = 'white';
    } else {
        messageDiv.style.backgroundColor = '#ef4444';
        messageDiv.style.color = 'white';
    }

    messageDiv.textContent = message;
    messageDiv.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}
