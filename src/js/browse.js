// Browse page functionality
document.addEventListener('DOMContentLoaded', function() {
    setupBrowsePage();
    loadPapers();
});

let currentPapers = [];
let filteredPapers = [];

function setupBrowsePage() {
    setupSearch();
    setupFilters();
    setupTrackTabs();
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterPapers();
        }, 300);
    });
}

function setupFilters() {
    const trackFilter = document.getElementById('track-filter');
    const sortOptions = document.getElementById('sort-options');

    trackFilter?.addEventListener('change', filterPapers);
    sortOptions?.addEventListener('change', filterPapers);
}

function setupTrackTabs() {
    const trackTabs = document.querySelectorAll('.track-tab');
    
    trackTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            trackTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update filter and reload
            const track = this.dataset.track;
            document.getElementById('track-filter').value = track;
            filterPapers();
        });
    });
}

async function loadPapers() {
    const container = document.getElementById('papers-container');
    if (!container) return;

    try {
        // Show loading state
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading papers...</div>';
        
        // Load all papers
        currentPapers = await window.api.getPapersByTrack();
        filteredPapers = [...currentPapers];
        
        // Apply initial filters
        filterPapers();
        
    } catch (error) {
        console.error('Error loading papers:', error);
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading papers. Please try again.</p>
                <button onclick="loadPapers()" class="btn btn-primary">Retry</button>
            </div>
        `;
    }
}

function filterPapers() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
    const trackFilter = document.getElementById('track-filter').value;
    const sortOption = document.getElementById('sort-options').value;

    // Start with all papers
    filteredPapers = [...currentPapers];

    // Apply track filter
    if (trackFilter) {
        filteredPapers = filteredPapers.filter(paper => paper.track === trackFilter);
    }

    // Apply search filter
    if (searchQuery) {
        filteredPapers = filteredPapers.filter(paper => 
            paper.title.toLowerCase().includes(searchQuery) ||
            paper.authors.toLowerCase().includes(searchQuery) ||
            (paper.description && paper.description.toLowerCase().includes(searchQuery))
        );
    }

    // Apply sorting
    sortPapers(sortOption);

    // Render papers
    renderPapers();
}

function sortPapers(sortOption) {
    switch (sortOption) {
        case 'date-desc':
            filteredPapers.sort((a, b) => b.date.localeCompare(a.date));
            break;
        case 'date-asc':
            filteredPapers.sort((a, b) => a.date.localeCompare(b.date));
            break;
        case 'title-asc':
            filteredPapers.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'title-desc':
            filteredPapers.sort((a, b) => b.title.localeCompare(a.title));
            break;
        default:
            filteredPapers.sort((a, b) => b.date.localeCompare(a.date));
    }
}

function renderPapers() {
    const container = document.getElementById('papers-container');
    const noPapersDiv = document.getElementById('no-papers');

    if (filteredPapers.length === 0) {
        container.innerHTML = '';
        noPapersDiv.classList.remove('hidden');
    } else {
        noPapersDiv.classList.add('hidden');
        container.innerHTML = filteredPapers.map(paper => createPaperCard(paper)).join('');
    }
}

function createPaperCard(paper) {
    const daysUntil = window.api.getDaysUntil(paper.date);
    const isUpcoming = paper.track === 'discussion' && daysUntil >= 0;
    const formattedDate = window.api.formatDate(paper.date);
    
    // Like functionality - with fallback for when API functions aren't available yet
    const likeCount = (window.api && window.api.getLikeCount) ? window.api.getLikeCount(paper) : (paper.likes ? paper.likes.count : 0);
    const hasLiked = (window.api && window.api.hasUserLiked) ? window.api.hasUserLiked(paper) : false;
    const likeIcon = hasLiked ? 'fas fa-heart' : 'far fa-heart';
    const likeButtonClass = hasLiked ? 'btn-like liked' : 'btn-like';
    
    return `
        <div class="paper-item" data-paper-id="${paper.id}">
            <div class="paper-header">
                <div>
                    <h3 class="paper-title">${escapeHtml(paper.title)}</h3>
                    <p class="paper-authors">by ${escapeHtml(paper.authors)}</p>
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
                <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                ${paper.presenter && paper.presenter !== 'TBD' ? 
                    `<span><i class="fas fa-user"></i> ${escapeHtml(paper.presenter)}</span>` : ''}
                ${isUpcoming && daysUntil > 0 ? 
                    `<span class="upcoming-badge"><i class="fas fa-clock"></i> ${daysUntil} days</span>` : ''}
                ${paper.uploadedBy ? 
                    `<span><i class="fas fa-upload"></i> ${escapeHtml(paper.uploadedBy)}</span>` : ''}
            </div>
            
            ${paper.description ? 
                `<p class="paper-description">${escapeHtml(paper.description)}</p>` : ''}
            
            <div class="paper-actions">
                <a href="${window.api.generatePaperUrl(paper.track, paper.filename)}" 
                   class="btn btn-primary" target="_blank" rel="noopener">
                    <i class="fas fa-download"></i> Download PDF
                </a>
                
                ${paper.track === 'reference' ? 
                    `<button onclick="addToDiscussion('${paper.id}')" class="btn btn-success">
                        <i class="fas fa-calendar-plus"></i> Schedule Discussion
                    </button>` : ''}
                
                <button onclick="sharePaper('${paper.id}')" class="btn btn-secondary">
                    <i class="fas fa-share"></i> Share
                </button>
                
                ${canEditPaper(paper) ? 
                    `<button onclick="editPaper('${paper.id}')" class="btn btn-secondary">
                        <i class="fas fa-edit"></i> Edit
                    </button>` : ''}
            </div>
            
            ${isUpcoming ? '<div class="upcoming-indicator">Upcoming Discussion</div>' : ''}
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

function canEditPaper(paper) {
    return true;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Action handlers
async function addToDiscussion(paperId) {
    const paper = currentPapers.find(p => p.id === paperId);
    if (!paper) {
        alert('Paper not found!');
        return;
    }

    // Create a more user-friendly date input
    const today = new Date().toISOString().split('T')[0];
    const date = prompt(`Enter discussion date for "${paper.title}" (YYYY-MM-DD):`, today);
    if (!date) return;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        alert('Please enter a valid date in YYYY-MM-DD format');
        return;
    }

    // Check if date is not in the past
    if (date < today) {
        if (!confirm('The selected date is in the past. Are you sure you want to schedule this?')) {
            return;
        }
    }

    const presenter = prompt('Enter presenter name (optional):') || 'TBD';

    try {
        const result = await window.api.addToSchedule(paperId, date, presenter);
        
        if (result.success) {
            alert(`✅ ${result.message}\n\nPaper: ${paper.title}\nDate: ${date}\nPresenter: ${presenter}`);
            
            // Refresh papers to show updated status
            loadPapers();
        } else {
            alert('Failed to add paper to schedule. Please try again.');
        }
    } catch (error) {
        console.error('Error scheduling discussion:', error);
        alert(`❌ Error scheduling discussion: ${error.message}`);
    }
}

function sharePaper(paperId) {
    const paper = currentPapers.find(p => p.id === paperId);
    if (!paper) return;

    const url = `${window.location.origin}/browse.html?paper=${paperId}`;
    
    if (navigator.share) {
        navigator.share({
            title: paper.title,
            text: `Check out this paper: ${paper.title} by ${paper.authors}`,
            url: url
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            prompt('Copy this link:', url);
        });
    }
}

function editPaper(paperId) {
    // This would open an edit modal or redirect to edit page
    alert('Edit functionality coming soon!');
}

// Like/Unlike functionality
async function toggleLike(paperId) {
    if (!window.auth || !window.auth.isAuthenticated()) {
        alert('Please log in to like papers');
        return;
    }

    // Check if like functions are available
    if (!window.api || !window.api.likePaper || !window.api.hasUserLiked) {
        alert('Like functionality is not available yet. Please refresh the page.');
        return;
    }

    try {
        const paper = currentPapers.find(p => p.id === paperId);
        if (!paper) {
            throw new Error('Paper not found');
        }

        const hasLiked = window.api.hasUserLiked(paper);
        const action = hasLiked ? 'unlike' : 'like';
        
        // Show loading state
        const button = document.querySelector(`[data-paper-id="${paperId}"] .btn-like`);
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;

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
            await loadPapers();
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

// Handle direct paper links
function handleDirectPaperLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const paperId = urlParams.get('paper');
    
    if (paperId) {
        // Highlight the specific paper when papers are loaded
        setTimeout(() => {
            const paperElement = document.querySelector(`[data-paper-id="${paperId}"]`);
            if (paperElement) {
                paperElement.scrollIntoView({ behavior: 'smooth' });
                paperElement.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
            }
        }, 1000);
    }
}

// Initialize direct paper link handling
handleDirectPaperLink();
