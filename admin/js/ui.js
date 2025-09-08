// js/ui.js - UI Helper Functions (FIXED)

window.App.ui = {
    // Show error message
    showError: function(message, containerId = 'events-tab') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const existingError = container.querySelector('.error');
        if (existingError) existingError.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        container.insertBefore(errorDiv, container.firstChild);
        
        setTimeout(() => errorDiv.remove(), 5000);
    },

    // Show success message
    showSuccess: function(message, containerId = 'events-tab') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const existingSuccess = container.querySelector('.success');
        if (existingSuccess) existingSuccess.remove();
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = message;
        container.insertBefore(successDiv, container.firstChild);
        
        setTimeout(() => successDiv.remove(), 5000);
    },

    // Switch tabs - FIXED INDICES
    switchTab: function(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to the specific tab - FIXED: Correct indices for 6 tabs
        const tabButtons = document.querySelectorAll('.nav-tab');
        tabButtons.forEach((tab, index) => {
            if ((index === 0 && tabName === 'events') ||
                (index === 1 && tabName === 'live') ||
                (index === 2 && tabName === 'upcoming') ||
                (index === 3 && tabName === 'history') ||
                (index === 4 && tabName === 'analytics') ||  // FIXED: Was missing
                (index === 5 && tabName === 'user-details')) { // FIXED: Was index 4
                tab.classList.add('active');
            }
        });
        
        // Show the corresponding content
        const contentId = tabName === 'user-details' ? 'user-details-tab' : 
                         tabName === 'analytics' ? 'analytics-tab' : 
                         tabName + '-tab';
        const contentTab = document.getElementById(contentId);
        if (contentTab) {
            contentTab.classList.add('active');
        }
        
        // Load content based on tab
        window.App.state.activeTab = tabName;
        
        if (tabName === 'live') {
            window.App.events.loadLiveEvents();
        } else if (tabName === 'upcoming') {
            window.App.events.loadUpcomingEvents();
        } else if (tabName === 'history') {
            window.App.events.loadEventHistory();
        } else if (tabName === 'user-details') {
            window.App.userDetails.loadUserDetails();
        } else if (tabName === 'analytics') {
            window.App.analytics.loadAnalyticsTab();
        } else if (tabName === 'events') {
            if (window.App.state.editingEventId) {
                window.App.events.cancelEdit();
            }
            window.App.subscription.checkSubscriptionStatus();
        }
    },

    // Set default date times for event form
    setDefaultDateTimes: function() {
        const now = new Date();
        const startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000);
        
        const startInput = document.getElementById('start-time');
        const endInput = document.getElementById('end-time');
        
        if (startInput) startInput.value = startTime.toISOString().slice(0, 16);
        if (endInput) endInput.value = endTime.toISOString().slice(0, 16);
        
        // Add click handlers for datetime inputs
        const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
        dateInputs.forEach(input => {
            input.addEventListener('click', function(e) {
                if (e.target === this) {
                    try {
                        this.showPicker();
                    } catch (error) {
                        this.focus();
                        this.click();
                    }
                }
            });
        });
    },

    // Update user email display
    updateUserDisplay: function() {
        const currentUser = window.App.state.currentUser;
        const currentOrganizer = window.App.state.currentOrganizer;
        
        if (currentUser) {
            const emailElement = document.getElementById('user-email');
            if (emailElement) {
                emailElement.textContent = currentUser.email;
            }
            
            if (currentOrganizer) {
                window.App.subscription.updateTierBadge();
                window.App.subscription.checkProfileCompletion();
                window.App.subscription.checkSubscriptionStatus();
            }
        }
    },

    // Close edit modal
    closeEditModal: function() {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // Close analytics modal
    closeAnalyticsModal: function() {
        const modal = document.getElementById('analytics-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
};

// Make switchTab globally accessible for onclick handlers
window.switchTab = window.App.ui.switchTab;
window.closeEditModal = window.App.ui.closeEditModal;
window.closeAnalyticsModal = window.App.ui.closeAnalyticsModal;
window.logout = window.App.auth.logout;