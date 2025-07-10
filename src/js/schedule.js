// Schedule page functionality
document.addEventListener('DOMContentLoaded', function() {
    setupSchedulePage();
    loadSchedule();
});

let currentSchedule = [];
let currentView = 'list';
let currentMonth = new Date();

function setupSchedulePage() {
    setupViewToggle();
    setupFilters();
    setupModal();
    setupCalendarNavigation();
}

function setupViewToggle() {
    const listViewBtn = document.getElementById('list-view');
    const calendarViewBtn = document.getElementById('calendar-view');

    listViewBtn?.addEventListener('click', function() {
        switchView('list');
    });

    calendarViewBtn?.addEventListener('click', function() {
        switchView('calendar');
    });
}

function setupFilters() {
    const trackFilter = document.getElementById('schedule-track-filter');
    trackFilter?.addEventListener('change', renderSchedule);
}

function setupModal() {
    const modal = document.getElementById('add-schedule-modal');
    const addBtn = document.getElementById('add-to-schedule');
    const closeBtn = modal?.querySelector('.modal-close');
    const cancelBtn = modal?.querySelector('.modal-cancel');
    const form = document.getElementById('add-schedule-form');

    addBtn?.addEventListener('click', openAddModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    form?.addEventListener('submit', handleAddToSchedule);

    // Close modal on backdrop click
    modal?.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
}

function setupCalendarNavigation() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    prevBtn?.addEventListener('click', function() {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });

    nextBtn?.addEventListener('click', function() {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });
}

async function loadSchedule() {
    if (!window.auth.isAuthenticated()) {
        console.warn('User is not logged in. Schedule will not be loaded.');
        return;
    }

    try {
        const scheduleData = await window.api.getSchedule();
        currentSchedule = scheduleData.schedule || [];
        renderSchedule();
    } catch (error) {
        console.error('Error loading schedule:', error);
        showError('Failed to load schedule');
    }
}

function switchView(view) {
    currentView = view;
    
    const listView = document.getElementById('schedule-list');
    const calendarView = document.getElementById('schedule-calendar');
    const listBtn = document.getElementById('list-view');
    const calendarBtn = document.getElementById('calendar-view');

    if (view === 'list') {
        listView?.classList.remove('hidden');
        calendarView?.classList.add('hidden');
        listBtn?.classList.add('active');
        calendarBtn?.classList.remove('active');
        renderScheduleList();
    } else {
        listView?.classList.add('hidden');
        calendarView?.classList.remove('hidden');
        listBtn?.classList.remove('active');
        calendarBtn?.classList.add('active');
        renderCalendar();
    }
}

function renderSchedule() {
    if (currentView === 'list') {
        renderScheduleList();
    } else {
        renderCalendar();
    }
}

function renderScheduleList() {
    const container = document.getElementById('schedule-list');
    if (!container) return;

    const trackFilter = document.getElementById('schedule-track-filter').value;
    let filteredSchedule = currentSchedule;

    if (trackFilter) {
        filteredSchedule = currentSchedule.filter(item => item.track === trackFilter);
    }

    // Sort by date
    filteredSchedule.sort((a, b) => a.date.localeCompare(b.date));

    if (filteredSchedule.length === 0) {
        container.innerHTML = `
            <div class="no-papers">
                <i class="fas fa-calendar"></i>
                <h3>No Scheduled Items</h3>
                <p>No items match your current filter.</p>
            </div>
        `;
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    container.innerHTML = filteredSchedule.map(item => {
        const daysUntil = window.api.getDaysUntil(item.date);
        const isUpcoming = item.date >= today;
        const isPast = item.date < today;
        
        return `
            <div class="schedule-item ${isUpcoming ? 'upcoming' : 'past'}">
                <div class="schedule-date">
                    ${window.api.formatDate(item.date)}
                    ${isUpcoming && daysUntil > 0 ? 
                        `<span class="schedule-countdown">in ${daysUntil} days</span>` : ''}
                    ${daysUntil === 0 ? '<span class="schedule-countdown today">Today</span>' : ''}
                </div>
                
                <div class="schedule-content">
                    <div class="schedule-paper">
                        <h3>${escapeHtml(item.title)}</h3>
                        <p class="schedule-authors">by ${escapeHtml(item.authors)}</p>
                        ${item.description ? 
                            `<p class="schedule-description">${escapeHtml(item.description)}</p>` : ''}
                    </div>
                    
                    <div class="schedule-meta">
                        <span class="paper-track track-${item.track}">
                            ${getTrackIcon(item.track)} ${getTrackName(item.track)}
                        </span>
                        ${item.presenter && item.presenter !== 'TBD' ? 
                            `<span class="schedule-presenter">
                                <i class="fas fa-user"></i> ${escapeHtml(item.presenter)}
                            </span>` : ''}
                    </div>
                    
                    <div class="schedule-actions">
                        <a href="${window.api.generatePaperUrl(item.track, item.filename)}" 
                           class="btn btn-primary" target="_blank">
                            <i class="fas fa-download"></i> Download
                        </a>
                        
                        <button onclick="exportToCalendar('${item.id}')" class="btn btn-secondary">
                            <i class="fas fa-calendar-plus"></i> Add to Calendar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderCalendar() {
    const container = document.getElementById('calendar-grid');
    const monthHeader = document.getElementById('current-month');
    
    if (!container) return;

    // Update month header
    monthHeader.textContent = currentMonth.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });

    // Get calendar data
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // Clear container
    container.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-header-day';
        header.textContent = day;
        header.style.cssText = `
            background: #f3f4f6;
            padding: 0.5rem;
            text-align: center;
            font-weight: 600;
            color: #4b5563;
        `;
        container.appendChild(header);
    });

    // Generate calendar days
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dayElement = createCalendarDay(currentDate, month);
        container.appendChild(dayElement);
    }
}

function createCalendarDay(date, currentMonth) {
    const day = document.createElement('div');
    day.className = 'calendar-day';
    
    const isOtherMonth = date.getMonth() !== currentMonth;
    const isToday = date.toDateString() === new Date().toDateString();
    const dateString = date.toISOString().split('T')[0];
    
    if (isOtherMonth) {
        day.classList.add('other-month');
    }
    
    if (isToday) {
        day.classList.add('today');
    }
    
    // Add date number
    const dateNumber = document.createElement('div');
    dateNumber.className = 'calendar-date-number';
    dateNumber.textContent = date.getDate();
    dateNumber.style.cssText = 'font-weight: 600; margin-bottom: 0.25rem;';
    day.appendChild(dateNumber);
    
    // Add events for this date
    const dayEvents = currentSchedule.filter(item => item.date === dateString);
    dayEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'calendar-event';
        eventElement.textContent = event.title.length > 20 ? 
            event.title.substring(0, 20) + '...' : event.title;
        eventElement.title = `${event.title} - ${event.authors}`;
        eventElement.style.cursor = 'pointer';
        eventElement.onclick = () => showEventDetails(event);
        day.appendChild(eventElement);
    });
    
    return day;
}

async function openAddModal() {
    const modal = document.getElementById('add-schedule-modal');
    const paperSelect = document.getElementById('schedule-paper');
    const dateInput = document.getElementById('schedule-date');
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    
    // Clear any existing status messages
    hideScheduleStatus();
    
    // Show loading state while fetching papers
    showScheduleStatus('Loading papers...', 'loading');
    
    // Load available papers
    try {
        const papers = await window.api.getPapersByTrack('reference');
        
        if (papers.length === 0) {
            showScheduleStatus('No reference papers available to schedule', 'error');
            paperSelect.innerHTML = '<option value="">No papers available</option>';
        } else {
            paperSelect.innerHTML = '<option value="">Select a paper...</option>' +
                papers.map(paper => 
                    `<option value="${paper.id}">${paper.title} - ${paper.authors}</option>`
                ).join('');
            
            // Hide loading status
            hideScheduleStatus();
        }
    } catch (error) {
        console.error('Error loading papers:', error);
        showScheduleStatus('Failed to load papers. Please try again.', 'error');
        paperSelect.innerHTML = '<option value="">Error loading papers</option>';
    }
    
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('add-schedule-modal');
    modal.classList.add('hidden');
    
    // Reset form
    const form = document.getElementById('add-schedule-form');
    form.reset();
    
    // Clear any status messages
    hideScheduleStatus();
    
    // Clear any error messages
    const errorDiv = modal.querySelector('.schedule-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

async function handleAddToSchedule(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const paperId = formData.get('paper');
    const date = formData.get('date');
    const presenter = formData.get('presenter');
    
    // Validate form
    if (!paperId || !date) {
        showScheduleError('Please select a paper and date');
        return;
    }

    // Show loading state
    showScheduleStatus('Adding to schedule...', 'loading');

    try {
        const result = await window.api.addToSchedule(paperId, date, presenter);
        
        if (result.success) {
            showScheduleStatus('Successfully added to schedule!', 'success');
            
            // Show success message on page
            showScheduleMessage(`Paper added to schedule for ${date}${presenter ? ' with presenter ' + presenter : ''}`, 'success');
            
            // Close modal and refresh after successful addition
            setTimeout(() => {
                closeModal();
                loadSchedule();
            }, 1500);
        } else {
            showScheduleStatus('Failed to add to schedule', 'error');
        }

    } catch (error) {
        console.error('Schedule error:', error);
        showScheduleStatus('Error adding to schedule: ' + error.message, 'error');
    }
}

function showEventDetails(event) {
    // Create a modal or detailed view instead of alert
    const modal = document.getElementById('add-schedule-modal');
    const existingDetailsModal = document.getElementById('event-details-modal');
    
    if (existingDetailsModal) {
        existingDetailsModal.remove();
    }
    
    const detailsModal = document.createElement('div');
    detailsModal.id = 'event-details-modal';
    detailsModal.className = 'modal';
    detailsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Event Details</h3>
                <button class="modal-close" onclick="closeEventDetails()">&times;</button>
            </div>
            <div class="event-details">
                <h4>${escapeHtml(event.title)}</h4>
                <p><strong>Authors:</strong> ${escapeHtml(event.authors)}</p>
                <p><strong>Date:</strong> ${window.api.formatDate(event.date)}</p>
                <p><strong>Presenter:</strong> ${escapeHtml(event.presenter || 'TBD')}</p>
                ${event.description ? `<p><strong>Description:</strong> ${escapeHtml(event.description)}</p>` : ''}
                <div class="modal-actions">
                    <a href="${window.api.generatePaperUrl(event.track, event.filename)}" 
                       class="btn btn-primary" target="_blank">
                        <i class="fas fa-download"></i> Download PDF
                    </a>
                    <button onclick="closeEventDetails()" class="btn btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(detailsModal);
    detailsModal.classList.remove('hidden');
}

function closeEventDetails() {
    const modal = document.getElementById('event-details-modal');
    if (modal) {
        modal.remove();
    }
}

function exportToCalendar(itemId) {
    const item = currentSchedule.find(i => i.id === itemId);
    if (!item) return;
    
    // Create iCal event
    const startDate = new Date(item.date + 'T14:00:00');
    const endDate = new Date(item.date + 'T15:00:00');
    
    const icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AI Agents Research Group//Reading Group//EN',
        'BEGIN:VEVENT',
        `UID:${item.id}@reading-group`,
        `DTSTART:${formatICalDate(startDate)}`,
        `DTEND:${formatICalDate(endDate)}`,
        `SUMMARY:${item.title}`,
        `DESCRIPTION:Paper by ${item.authors}. Presenter: ${item.presenter || 'TBD'}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    // Download iCal file
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
}

function formatICalDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    // Show error message on page instead of replacing schedule content
    showScheduleMessage(message, 'error');
    
    // Also show a retry button in the schedule area if it's empty
    const container = document.getElementById('schedule-list');
    if (container && currentSchedule.length === 0) {
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button onclick="loadSchedule()" class="btn btn-primary">Retry</button>
            </div>
        `;
    }
}

// Export schedule functionality
document.getElementById('export-schedule')?.addEventListener('click', function() {
    if (currentSchedule.length === 0) {
        showScheduleMessage('No schedule items to export', 'error');
        return;
    }
    
    const icalContent = generateFullICalendar();
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reading-group-schedule.ics';
    a.click();
    URL.revokeObjectURL(url);
    
    showScheduleMessage('Schedule exported successfully!', 'success');
});

function generateFullICalendar() {
    const events = currentSchedule
        .filter(item => item.track === 'discussion')
        .map(item => {
            const startDate = new Date(item.date + 'T14:00:00');
            const endDate = new Date(item.date + 'T15:00:00');
            
            return [
                'BEGIN:VEVENT',
                `UID:${item.id}@reading-group`,
                `DTSTART:${formatICalDate(startDate)}`,
                `DTEND:${formatICalDate(endDate)}`,
                `SUMMARY:${item.title}`,
                `DESCRIPTION:Paper by ${item.authors}. Presenter: ${item.presenter || 'TBD'}`,
                'END:VEVENT'
            ].join('\r\n');
        });
    
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AI Agents Research Group//Reading Group//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:AI Agents Reading Group',
        'X-WR-CALDESC:Schedule for AI Agents Research Group paper discussions',
        ...events,
        'END:VCALENDAR'
    ].join('\r\n');
}

function showScheduleStatus(message, type) {
    const modal = document.getElementById('add-schedule-modal');
    let statusDiv = modal.querySelector('.schedule-status');
    
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.className = 'schedule-status';
        statusDiv.innerHTML = `
            <i class="fas fa-spinner"></i>
            <span></span>
        `;
        statusDiv.style.cssText = `
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        const form = modal.querySelector('#add-schedule-form');
        form.parentNode.insertBefore(statusDiv, form);
    }
    
    const messageSpan = statusDiv.querySelector('span');
    const icon = statusDiv.querySelector('i');
    
    statusDiv.classList.remove('hidden');
    messageSpan.textContent = message;
    
    // Update icon based on type
    icon.className = 'fas ' + getScheduleStatusIcon(type);
    
    // Update styling based on type
    if (type === 'loading') {
        statusDiv.style.backgroundColor = '#eff6ff';
        statusDiv.style.color = '#1d4ed8';
        statusDiv.style.border = '1px solid #bfdbfe';
    } else if (type === 'success') {
        statusDiv.style.backgroundColor = '#f0fdf4';
        statusDiv.style.color = '#15803d';
        statusDiv.style.border = '1px solid #bbf7d0';
    } else if (type === 'error') {
        statusDiv.style.backgroundColor = '#fef2f2';
        statusDiv.style.color = '#dc2626';
        statusDiv.style.border = '1px solid #fecaca';
    }
}

function hideScheduleStatus() {
    const modal = document.getElementById('add-schedule-modal');
    const statusDiv = modal.querySelector('.schedule-status');
    if (statusDiv) {
        statusDiv.classList.add('hidden');
    }
}

function getScheduleStatusIcon(type) {
    const icons = {
        loading: 'fa-spinner fa-spin',
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle'
    };
    return icons[type] || 'fa-info-circle';
}

function showScheduleError(message) {
    const modal = document.getElementById('add-schedule-modal');
    let errorDiv = modal.querySelector('.schedule-error');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'schedule-error';
        errorDiv.style.cssText = `
            background-color: #fef2f2;
            color: #dc2626;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border: 1px solid #fecaca;
        `;
        
        const form = modal.querySelector('#add-schedule-form');
        form.parentNode.insertBefore(errorDiv, form);
    }
    
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
    `;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function showScheduleMessage(message, type) {
    // Create or update message container
    let messageContainer = document.getElementById('schedule-message');
    
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'schedule-message';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(messageContainer);
    }
    
    // Update styling based on type
    if (type === 'success') {
        messageContainer.style.backgroundColor = '#f0fdf4';
        messageContainer.style.color = '#15803d';
        messageContainer.style.border = '1px solid #bbf7d0';
        messageContainer.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
    } else if (type === 'error') {
        messageContainer.style.backgroundColor = '#fef2f2';
        messageContainer.style.color = '#dc2626';
        messageContainer.style.border = '1px solid #fecaca';
        messageContainer.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
    } else if (type === 'info') {
        messageContainer.style.backgroundColor = '#eff6ff';
        messageContainer.style.color = '#1d4ed8';
        messageContainer.style.border = '1px solid #bfdbfe';
        messageContainer.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        `;
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (messageContainer && messageContainer.parentNode) {
            messageContainer.remove();
        }
    }, 5000);
}
