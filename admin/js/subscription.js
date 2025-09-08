// js/subscription.js - Subscription Management

window.App.subscription = {
    // Update tier badge display
    updateTierBadge: function() {
        const tierBadge = document.getElementById('user-tier');
        const currentOrganizer = window.App.state.currentOrganizer;
        const tier = currentOrganizer?.subscription_tier || 'free';
        
        if (tierBadge) {
            tierBadge.textContent = tier;
            tierBadge.className = `tier-badge ${tier}`;
        }
    },

    // Check if profile is complete
    checkProfileCompletion: function() {
        const currentOrganizer = window.App.state.currentOrganizer;
        
        if (!currentOrganizer?.contact_name || !currentOrganizer?.phone) {
            const alertContainer = document.getElementById('profile-alert-container');
            if (alertContainer) {
                alertContainer.innerHTML = `
                    <div class="profile-incomplete-alert">
                        <div class="alert-content">
                            <span>⚠️ Please complete your profile to unlock all features</span>
                            <button onclick="switchTab('user-details')" class="btn-complete-profile">Complete Profile</button>
                        </div>
                    </div>
                `;
            }
        }
    },

    // Check subscription status and update UI
    checkSubscriptionStatus: function() {
        const currentOrganizer = window.App.state.currentOrganizer;
        const tier = currentOrganizer?.subscription_tier || 'free';
        const createEventBtn = document.getElementById('submit-btn');
        const statusMessageDiv = document.getElementById('events-status-message');
        
        // Clear existing status messages
        if (statusMessageDiv) {
            statusMessageDiv.innerHTML = '';
        }
        
        switch(tier) {
            case 'free':
                this.disableEventCreation('Upgrade to Create Events');
                this.addStatusMessage(statusMessageDiv, 
                    'You have a free account. Upgrade to start creating events.',
                    'upgrade');
                break;
                
            case 'trial':
                const eventsUsed = currentOrganizer.events_used_this_period || 0;
                if (eventsUsed >= 1) {
                    this.disableEventCreation('Trial Event Used - Upgrade for More');
                    this.addStatusMessage(statusMessageDiv,
                        'You\'ve used your trial event. Upgrade to Premium for 4 events/month.',
                        'upgrade');
                } else {
                    this.addStatusMessage(statusMessageDiv,
                        'Trial Account: 1 event remaining',
                        'info');
                }
                break;
                
            case 'basic':
                const eventsThisMonth = currentOrganizer.events_used_this_period || 0;
                const remaining = 4 - eventsThisMonth;
                
                if (remaining <= 0) {
                    this.disableEventCreation('Monthly Limit Reached - Upgrade');
                    this.addStatusMessage(statusMessageDiv,
                        'You\'ve used all 4 events this month. Upgrade to Unlimited for all the events you need.',
                        'upgrade');
                } else {
                    this.addStatusMessage(statusMessageDiv,
                        `Basic Account: ${remaining} event${remaining > 1 ? 's' : ''} remaining this month`,
                        'info');
                }
                break;
                
            case 'premium':
                this.addStatusMessage(statusMessageDiv,
                    'Unlimited Account: Unlimited events and venues',
                    'success');
                break;
        }
        
        // Check subscription expiry for paid tiers
        if (['basic', 'premium'].includes(tier) && currentOrganizer.current_period_end) {
            const endDate = new Date(currentOrganizer.current_period_end);
            const today = new Date();
            const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysRemaining <= 0) {
                this.disableEventCreation('Subscription Expired - Renew');
                this.addStatusMessage(statusMessageDiv,
                    'Your subscription has expired. Please renew to continue creating events.',
                    'error');
            } else if (daysRemaining <= 7) {
                this.addStatusMessage(statusMessageDiv,
                    `⚠️ Subscription expires in ${daysRemaining} days. Please renew soon.`,
                    'warning');
            }
        }
    },

    // Disable event creation button
    disableEventCreation: function(buttonText) {
        const createEventBtn = document.getElementById('submit-btn');
        if (createEventBtn) {
            createEventBtn.disabled = true;
            createEventBtn.textContent = buttonText;
            createEventBtn.style.cursor = 'not-allowed';
            createEventBtn.style.opacity = '0.6';
        }
    },

    // Add status message to container
    addStatusMessage: function(container, message, type) {
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `tier-status-message ${type}`;
        
        if (type === 'upgrade') {
            messageDiv.innerHTML = `
                <span>${message}</span>
                <button onclick="handleUpgrade()" class="btn-upgrade-inline">Upgrade Now</button>
            `;
        } else {
            messageDiv.textContent = message;
        }
        
        container.appendChild(messageDiv);
    },

    // Handle upgrade click
    handleUpgrade: function() {
        // Redirect to website pricing page
        window.location.href = 'https://your-website.com/#pricing';
    }
};

// Make handleUpgrade globally accessible for onclick
window.handleUpgrade = window.App.subscription.handleUpgrade;