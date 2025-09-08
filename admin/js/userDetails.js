// js/userDetails.js - User Details Tab Management

window.App.userDetails = {
    // Load all user details
    loadUserDetails: async function() {
        await this.loadAccountInfo();
        await this.loadSubscriptionInfo();
        await this.loadUsageStats();
        await this.loadSavedVenuesList();
    },

    // Load account information
    loadAccountInfo: async function() {
        const accountInfoDiv = document.getElementById('account-info');
        if (!accountInfoDiv) return;
        
        const currentOrganizer = window.App.state.currentOrganizer;
        const currentUser = window.App.state.currentUser;
        
        if (!currentOrganizer) {
            accountInfoDiv.innerHTML = '<div class="loading">No account information available</div>';
            return;
        }
        
        const createdDate = new Date(currentOrganizer.created_at).toLocaleDateString();
        
        // Check if profile is incomplete
        const needsCompletion = !currentOrganizer.contact_name || !currentOrganizer.phone;
        
        accountInfoDiv.innerHTML = `
            <div class="info-item">
                <span class="info-label">Account ID</span>
                <span class="info-value">${currentOrganizer.id.substring(0, 8)}...</span>
            </div>
            <div class="info-item">
                <span class="info-label">Email</span>
                <span class="info-value">${currentUser.email}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Company Name</span>
                <span class="info-value">${currentOrganizer.company_name || 'Not set'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Contact Name</span>
                <span class="info-value">${currentOrganizer.contact_name || 'Not set'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Phone</span>
                <span class="info-value">${currentOrganizer.phone || 'Not set'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Account Created</span>
                <span class="info-value">${createdDate}</span>
            </div>
        `;
        
        // Show profile completion form if needed
        const completionForm = document.getElementById('profile-completion-form');
        if (completionForm && needsCompletion) {
            completionForm.style.display = 'block';
            
            // Pre-fill if we have values
            const nameInput = document.getElementById('update-contact-name');
            const phoneInput = document.getElementById('update-phone');
            
            if (nameInput && currentOrganizer.contact_name) {
                nameInput.value = currentOrganizer.contact_name;
            }
            if (phoneInput && currentOrganizer.phone) {
                phoneInput.value = currentOrganizer.phone;
            }
        }
    },

    // Load subscription information
    loadSubscriptionInfo: async function() {
        const subscriptionInfoDiv = document.getElementById('subscription-info');
        if (!subscriptionInfoDiv) return;
        
        const currentOrganizer = window.App.state.currentOrganizer;
        
        if (!currentOrganizer) {
            subscriptionInfoDiv.innerHTML = '<div class="loading">No subscription information available</div>';
            return;
        }
        
        const tier = currentOrganizer.subscription_tier || 'free';
        const startDate = currentOrganizer.subscription_start_date 
            ? new Date(currentOrganizer.subscription_start_date).toLocaleDateString() 
            : 'N/A';
        const endDate = currentOrganizer.subscription_end_date 
            ? new Date(currentOrganizer.subscription_end_date).toLocaleDateString() 
            : 'N/A';
        
        const daysRemaining = currentOrganizer.subscription_end_date 
            ? Math.ceil((new Date(currentOrganizer.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24))
            : null;
        
        const isExpiringSoon = daysRemaining && daysRemaining <= 7;
        
        let tierSpecificInfo = '';
        
        switch(tier) {
            case 'free':
                tierSpecificInfo = `
                    <div class="info-item">
                        <span class="info-label">Events Allowed</span>
                        <span class="info-value">0 (Upgrade to create events)</span>
                    </div>
                `;
                break;
            case 'trial':
                tierSpecificInfo = `
                    <div class="info-item">
                        <span class="info-label">Trial Events Remaining</span>
                        <span class="info-value">${1 - (currentOrganizer.events_used_this_period || 0)}</span>
                    </div>
                `;
                break;
            case 'basic':
                tierSpecificInfo = `
                    <div class="info-item">
                        <span class="info-label">Events This Month</span>
                        <span class="info-value">${currentOrganizer.events_used_this_period || 0} / 4</span>
                    </div>
                `;
                break;
            case 'premium':
                tierSpecificInfo = `
                    <div class="info-item">
                        <span class="info-label">Events Allowed</span>
                        <span class="info-value">Unlimited</span>
                    </div>
                `;
                break;
        }
        
        subscriptionInfoDiv.innerHTML = `
            <div class="subscription-badge ${tier}">${tier}</div>
            
            <div class="subscription-details">
                <div class="info-item">
                    <span class="info-label">Subscription Start</span>
                    <span class="info-value">${startDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Subscription End</span>
                    <span class="info-value">${endDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Max Venues Allowed</span>
                    <span class="info-value">${currentOrganizer.max_venues || (tier === 'premium' ? 'Unlimited' : '1')}</span>
                </div>
                ${tierSpecificInfo}
                <div class="info-item">
                    <span class="info-label">Status</span>
                    <span class="info-value">${daysRemaining && daysRemaining > 0 ? `Active (${daysRemaining} days remaining)` : 'Active'}</span>
                </div>
            </div>
            
            ${isExpiringSoon ? `
                <div class="warning-text">
                    ⚠️ Your subscription expires in ${daysRemaining} days. Please renew to continue using the service.
                </div>
            ` : ''}
            
            ${tier !== 'premium' ? `
                <div class="upgrade-prompt">
                    <h4>Upgrade to ${tier === 'free' ? 'Trial' : 'Unlimited'}</h4>
                    <p>${tier === 'free' ? 'Try one event for €29' : 'Unlock unlimited events and venues'}</p>
                    <button class="btn-upgrade" onclick="handleUpgrade()">Upgrade Now</button>
                </div>
            ` : ''}
        `;
    },

    // Load usage statistics
    loadUsageStats: async function() {
        const usageStatsDiv = document.getElementById('usage-stats');
        if (!usageStatsDiv) return;
        
        try {
            const currentUser = window.App.state.currentUser;
            const savedVenues = window.App.state.savedVenues;
            
            // Get total events count
            const { data: allEvents, error: eventsError } = await window.App.supabase
                .from('events')
                .select('id, status')
                .eq('organizer_id', currentUser.id);
            
            if (eventsError) throw eventsError;
            
            const totalEvents = allEvents ? allEvents.length : 0;
            const activeEvents = allEvents ? allEvents.filter(e => e.status === 'active').length : 0;
            const completedEvents = allEvents ? allEvents.filter(e => e.status === 'completed').length : 0;
            
            // Get total matches from completed events
            const { data: matchStats, error: matchError } = await window.App.supabase
                .from('event_stats')
                .select('total_matches_completed')
                .in('event_id', allEvents ? allEvents.map(e => e.id) : []);
            
            const totalMatches = matchStats 
                ? matchStats.reduce((sum, stat) => sum + (stat.total_matches_completed || 0), 0)
                : 0;
            
            const venuesCount = savedVenues.length;
            
            usageStatsDiv.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${totalEvents}</div>
                    <div class="stat-label">Total Events</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${activeEvents}</div>
                    <div class="stat-label">Active Events</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${completedEvents}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalMatches}</div>
                    <div class="stat-label">Total Matches</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${venuesCount}</div>
                    <div class="stat-label">Saved Venues</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalMatches * 2}</div>
                    <div class="stat-label">Users Connected</div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading usage stats:', error);
            usageStatsDiv.innerHTML = '<div class="loading">Error loading statistics</div>';
        }
    },

    // Load saved venues list
    loadSavedVenuesList: async function() {
        const venuesListDiv = document.getElementById('saved-venues-list');
        if (!venuesListDiv) return;
        
        try {
            await window.App.venues.loadSavedVenues();
            const savedVenues = window.App.state.savedVenues;
            
            if (savedVenues.length > 0) {
                venuesListDiv.innerHTML = savedVenues.map(venue => {
                    const createdDate = new Date(venue.created_at).toLocaleDateString();
                    return `
                        <div class="venue-detail-card">
                            <div class="venue-detail-info">
                                <div class="venue-detail-name">📍 ${venue.venue_name}</div>
                                <div class="venue-detail-address">${venue.venue_address || 'No address'}</div>
                                <div class="venue-detail-date">Added on ${createdDate}</div>
                            </div>
                            <button class="btn-remove-venue" onclick="removeVenue('${venue.id}')">Remove</button>
                        </div>
                    `;
                }).join('');
            } else {
                venuesListDiv.innerHTML = `
                    <div class="loading">
                        No venues saved yet. Add venues when creating events.
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading venues list:', error);
            venuesListDiv.innerHTML = '<div class="loading">Error loading venues</div>';
        }
    },

    // Update profile
    updateProfile: async function() {
        const contactName = document.getElementById('update-contact-name').value;
        const phone = document.getElementById('update-phone').value;
        
        if (!contactName || !phone) {
            window.App.ui.showError('Please fill in all fields', 'user-details-tab');
            return;
        }
        
        try {
            const currentUser = window.App.state.currentUser;
            
            const { error } = await window.App.supabase
                .from('organizers')
                .update({
                    contact_name: contactName,
                    phone: phone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentUser.id);
            
            if (error) throw error;
            
            // Update local state
            window.App.state.currentOrganizer.contact_name = contactName;
            window.App.state.currentOrganizer.phone = phone;
            
            window.App.ui.showSuccess('Profile updated successfully!', 'user-details-tab');
            
            // Hide profile completion form
            const completionForm = document.getElementById('profile-completion-form');
            if (completionForm) {
                completionForm.style.display = 'none';
            }
            
            // Remove profile alert if exists
            const alertContainer = document.getElementById('profile-alert-container');
            if (alertContainer) {
                alertContainer.innerHTML = '';
            }
            
            // Reload account info
            await this.loadAccountInfo();
            
        } catch (error) {
            console.error('Error updating profile:', error);
            window.App.ui.showError('Failed to update profile', 'user-details-tab');
        }
    }
};

// Make updateProfile globally accessible for HTML onclick
window.updateProfile = window.App.userDetails.updateProfile;