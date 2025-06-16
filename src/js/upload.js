// Upload page functionality
document.addEventListener('DOMContentLoaded', function() {
    setupUploadForm();
    setupFileUpload();
});

function setupUploadForm() {
    const form = document.getElementById('upload-form');
    if (!form) return;

    form.addEventListener('submit', handleUpload);
    
    // Set minimum date to today
    const dateInput = document.getElementById('discussion-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
}

function setupFileUpload() {
    const fileInput = document.getElementById('paper-file');
    const uploadDisplay = document.querySelector('.file-upload-display');
    
    if (!fileInput || !uploadDisplay) return;

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                showError('Please select a PDF file');
                fileInput.value = '';
                return;
            }
            
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
                showError('File size must be less than 50MB');
                fileInput.value = '';
                return;
            }

            uploadDisplay.innerHTML = `
                <i class="fas fa-file-pdf"></i>
                <span>${file.name} (${formatFileSize(file.size)})</span>
            `;
            uploadDisplay.style.color = '#10b981';
        }
    });

    // Drag and drop functionality
    const fileUpload = document.querySelector('.file-upload');
    if (fileUpload) {
        fileUpload.addEventListener('dragover', function(e) {
            e.preventDefault();
            fileUpload.style.borderColor = '#3b82f6';
            fileUpload.style.backgroundColor = '#eff6ff';
        });

        fileUpload.addEventListener('dragleave', function(e) {
            e.preventDefault();
            fileUpload.style.borderColor = '#d1d5db';
            fileUpload.style.backgroundColor = 'transparent';
        });

        fileUpload.addEventListener('drop', function(e) {
            e.preventDefault();
            fileUpload.style.borderColor = '#d1d5db';
            fileUpload.style.backgroundColor = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
    }
}

async function handleUpload(e) {
    e.preventDefault();
    
    if (!window.auth.isAuthenticated()) {
        showError('Please log in to upload papers');
        return;
    }

    const form = e.target;
    const formData = new FormData(form);
    const fileInput = document.getElementById('paper-file');
    
    // Validate form
    const title = formData.get('title').trim();
    const authors = formData.get('authors').trim();
    const track = formData.get('track');
    const file = fileInput.files[0];

    if (!title || !authors || !track || !file) {
        showError('Please fill in all required fields');
        return;
    }

    // Show loading state
    showUploadStatus('Uploading paper...', 'loading');

    try {
        const paperData = {
            title,
            authors,
            track,
            description: formData.get('description').trim(),
            discussionDate: formData.get('discussionDate'),
            presenter: ''
        };

        const result = await window.api.uploadPaper(paperData, file);
        
        showUploadStatus('Paper uploaded successfully!', 'success');
        
        // Reset form after successful upload
        setTimeout(() => {
            form.reset();
            resetFileUpload();
            hideUploadStatus();
            
            // Optionally redirect to browse page
            if (confirm('Paper uploaded successfully! Would you like to view all papers?')) {
                window.location.href = 'browse.html';
            }
        }, 2000);

    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('Upload failed: ' + error.message, 'error');
        
        setTimeout(() => {
            hideUploadStatus();
        }, 5000);
    }
}

function showUploadStatus(message, type) {
    const statusDiv = document.getElementById('upload-status');
    const messageSpan = statusDiv.querySelector('span');
    const icon = statusDiv.querySelector('i');
    
    statusDiv.classList.remove('hidden');
    messageSpan.textContent = message;
    
    // Update icon based on type
    icon.className = 'fas ' + getStatusIcon(type);
    
    // Update styling based on type
    statusDiv.className = `upload-status ${type}`;
}

function hideUploadStatus() {
    const statusDiv = document.getElementById('upload-status');
    statusDiv.classList.add('hidden');
}

function getStatusIcon(type) {
    const icons = {
        loading: 'fa-spinner fa-spin',
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle'
    };
    return icons[type] || 'fa-info-circle';
}

function showError(message) {
    // Create or update error message
    let errorDiv = document.querySelector('.upload-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'upload-error';
        errorDiv.style.cssText = `
            background-color: #fef2f2;
            color: #dc2626;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border: 1px solid #fecaca;
        `;
        
        const form = document.getElementById('upload-form');
        form.insertBefore(errorDiv, form.firstChild);
    }
    
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
    `;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function resetFileUpload() {
    const uploadDisplay = document.querySelector('.file-upload-display');
    if (uploadDisplay) {
        uploadDisplay.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <span>Choose PDF file or drag & drop</span>
        `;
        uploadDisplay.style.color = '#6b7280';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Auto-generate filename from title
document.getElementById('paper-title')?.addEventListener('input', function(e) {
    const title = e.target.value.trim();
    if (title) {
        // This could be used to suggest a filename
        console.log('Title entered:', title);
    }
});

// Track selection handler
document.getElementById('paper-track')?.addEventListener('change', function(e) {
    const track = e.target.value;
    const dateGroup = document.getElementById('discussion-date').closest('.form-group');
    
    if (track === 'reference') {
        dateGroup.style.display = 'none';
        document.getElementById('discussion-date').removeAttribute('required');
    } else {
        dateGroup.style.display = 'block';
        if (track === 'discussion') {
            document.getElementById('discussion-date').setAttribute('required', 'required');
        }
    }
});
