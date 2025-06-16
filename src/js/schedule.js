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
    
    // Load available papers
    try {
        const papers = await window.api.getPapersByTrack('reference');
        paperSelect.innerHTML = '<option value="">Select a paper...</option>' +
            papers.map(paper => 
                `<option value="${paper.id}">${paper.title} - ${paper.authors}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading papers:', error);
    }
    
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('add-schedule-modal');
    modal.classList.add('hidden');
    
    // Reset form
    const form = document.getElementById('add-schedule-form');
    form.reset();
}

async function handleAddToSchedule(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const paperId = formData.get('paper');
    const date = formData.get('date');
    const presenter = formData.get('presenter');
    
    try {
        await window.api.addToSchedule(paperId, date, presenter);
        alert('Successfully added to schedule!');
        closeModal();
        loadSchedule();
    } catch (error) {
        alert('Error adding to schedule: ' + error.message);
    }
}

function showEventDetails(event) {
    const details = `
        Title: ${event.title}
        Authors: ${event.authors}
        Date: ${window.api.formatDate(event.date)}
        Presenter: ${event.presenter || 'TBD'}
        ${event.description ? `\nDescription: ${event.description}` : ''}
    `;
    alert(details);
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
    const container = document.getElementById('schedule-list');
    container.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button onclick="loadSchedule()" class="btn btn-primary">Retry</button>
        </div>
    `;
}

// Export schedule functionality
document.getElementById('export-schedule')?.addEventListener('click', function() {
    if (currentSchedule.length === 0) {
        alert('No schedule items to export');
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
