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
    
    return `
        <div class="paper-item">
            <div class="paper-header">
                <div>
                    <h3 class="paper-title">${paper.title}</h3>
                    <p class="paper-authors">by ${paper.authors}</p>
                </div>
                <span class="paper-track track-${paper.track}">
                    ${getTrackIcon(paper.track)} ${getTrackName(paper.track)}
                </span>
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
