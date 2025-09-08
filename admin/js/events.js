// js/events.js - Complete Event Management

window.App.events = {
    // ========================================
    // CORE EVENT CRUD OPERATIONS
    // ========================================
    
    // Create a new event
    createEvent: async function(eventData) {
        try {
            const currentUser = window.App.state.currentUser;
            
            const { data: event, error: eventError } = await window.App.supabase
                .from('events')
                .insert({
                    organizer_id: currentUser.id,
                    name: eventData.name,
                    venue_name: eventData.venue_name,
                    venue_address: eventData.venue_address,
                    place_id: eventData.place_id,
                    lat: eventData.lat,
                    lng: eventData.lng,
                    venue_photo_url: eventData.venue_photo_url,
                    start_time: eventData.start_time,
                    end_time: eventData.end_time,
                    deck_size: eventData.deck_size,
                    max_matches_allowed: eventData.max_matches_allowed,
                    event_type: eventData.event_type,
                    status: 'scheduled'
                })
                .select()
                .single();
            
            if (eventError) throw eventError;
            
            // Create event deck
            const { error: deckError } = await window.App.supabase
                .from('event_decks')
                .insert({
                    event_id: event.id,
                    male_cards_drawn: 0,
                    female_cards_drawn: 0,
                    universal_cards_drawn: 0
                });
            
            if (deckError) throw deckError;
            
            // Create event stats
            const { error: statsError } = await window.App.supabase
                .from('event_stats')
                .insert({
                    event_id: event.id,
                    active_males: 0,
                    active_females: 0,
                    total_matches_completed: 0
                });
            
            if (statsError) console.error('Error creating event stats:', statsError);
            
            return event;
        } catch (error) {
            console.error('Error creating event:', error);
            
            // Handle specific error messages
            if (error.message?.includes('Free accounts cannot create events')) {
                window.App.ui.showError('Free accounts cannot create events. Please upgrade to continue.');
            } else if (error.message?.includes('Trial limit')) {
                window.App.ui.showError('You\'ve already used your trial event. Please upgrade to continue.');
            } else if (error.message?.includes('Premium tier limit')) {
                window.App.ui.showError('You\'ve reached your monthly limit of 4 events. Upgrade to Unlimited for as many events as you like.');
            } else {
                window.App.ui.showError('Failed to create event: ' + error.message);
            }
            return null;
        }
    },

    // Update an existing event
    updateEvent: async function(eventId, eventData) {
        try {
            const currentUser = window.App.state.currentUser;
            
            const { data: event, error } = await window.App.supabase
                .from('events')
                .update({
                    name: eventData.name,
                    venue_name: eventData.venue_name,
                    venue_address: eventData.venue_address,
                    place_id: eventData.place_id,
                    lat: eventData.lat,
                    lng: eventData.lng,
                    venue_photo_url: eventData.venue_photo_url,
                    start_time: eventData.start_time,
                    end_time: eventData.end_time,
                    deck_size: eventData.deck_size,
                    max_matches_allowed: eventData.max_matches_allowed,
                    event_type: eventData.event_type
                })
                .eq('id', eventId)
                .eq('organizer_id', currentUser.id)
                .select()
                .single();
            
            if (error) throw error;
            
            return event;
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    },

    // Delete/Cancel an event
    cancelEvent: async function(eventId) {
        if (!confirm('Are you sure you want to cancel this event? This will permanently delete the event and all associated data.')) return;
        
        try {
            // Delete in correct order to respect foreign key constraints
            
            // 1. Delete vouchers first
            const { error: vouchersError } = await window.App.supabase
                .from('vouchers')
                .delete()
                .eq('event_id', eventId);
            
            if (vouchersError) console.error('Error deleting vouchers:', vouchersError);
            
            // 2. Delete matches
            const { error: matchesError } = await window.App.supabase
                .from('matches')
                .delete()
                .eq('event_id', eventId);
            
            if (matchesError) console.error('Error deleting matches:', matchesError);
            
            // 3. Delete user_cards
            const { error: cardsError } = await window.App.supabase
                .from('user_cards')
                .delete()
                .eq('event_id', eventId);
            
            if (cardsError) console.error('Error deleting user cards:', cardsError);
            
            // 4. Delete event_stats
            const { error: statsError } = await window.App.supabase
                .from('event_stats')
                .delete()
                .eq('event_id', eventId);
            
            if (statsError) console.error('Error deleting event stats:', statsError);
            
            // 5. Delete event_decks
            const { error: decksError } = await window.App.supabase
                .from('event_decks')
                .delete()
                .eq('event_id', eventId);
            
            if (decksError) console.error('Error deleting event decks:', decksError);
            
            // 6. Finally delete the event itself
            const { error: eventError } = await window.App.supabase
                .from('events')
                .delete()
                .eq('id', eventId)
                .eq('organizer_id', window.App.state.currentUser.id);
            
            if (eventError) throw eventError;
            
            window.App.ui.showSuccess('Event deleted successfully');
            await this.loadUpcomingEvents();
            
        } catch (error) {
            console.error('Error cancelling event:', error);
            window.App.ui.showError('Failed to delete event: ' + error.message);
        }
    },

    // Edit event - load data into edit modal
    editEvent: async function(eventId) {
        try {
            const { data: event, error } = await window.App.supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            
            if (error) throw error;
            
            // Populate edit modal fields
            document.getElementById('edit-event-id').value = event.id;
            document.getElementById('edit-event-name').value = event.name;
            document.getElementById('edit-venue-name').value = event.venue_name;
            document.getElementById('edit-start-time').value = event.start_time.slice(0, 16);
            document.getElementById('edit-end-time').value = event.end_time.slice(0, 16);
            document.getElementById('edit-deck-size').value = event.deck_size;
            document.getElementById('edit-max-matches').value = event.max_matches_allowed;
            document.getElementById('edit-event-type').value = event.event_type;
            
            // Show modal
            document.getElementById('edit-modal').classList.add('active');
            
        } catch (error) {
            console.error('Error loading event for edit:', error);
            window.App.ui.showError('Failed to load event details');
        }
    },

    // Cancel edit mode
    cancelEdit: function() {
        window.App.state.editingEventId = null;
        const eventForm = document.getElementById('event-form');
        if (eventForm) {
            eventForm.reset();
        }
        
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.textContent = 'Create Event';
        }
        
        const cancelBtn = document.getElementById('cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        const eventTabTitle = document.querySelector('#events-tab h2');
        if (eventTabTitle) {
            eventTabTitle.textContent = 'Create New Event';
        }
        
        // Reset venue selection
        const savedVenues = window.App.state.savedVenues;
        if (savedVenues.length > 0) {
            const venueInput = document.getElementById('venue-input');
            if (venueInput) {
                venueInput.value = savedVenues[0].venue_name;
                venueInput.classList.add('has-value');
                window.App.state.selectedVenue = savedVenues[0];
            }
        }
        
        window.App.ui.setDefaultDateTimes();
    },

    // ========================================
    // EVENT LOADING FUNCTIONS
    // ========================================
    
    // Load upcoming events
    loadUpcomingEvents: async function() {
        const eventsList = document.getElementById('upcoming-events-list');
        if (!eventsList) return;
        
        eventsList.innerHTML = '<div class="loading">Loading upcoming events...</div>';
        
        try {
            const currentUser = window.App.state.currentUser;
            
            const { data: events, error } = await window.App.supabase
                .from('events')
                .select('*, event_stats(*)')
                .eq('organizer_id', currentUser.id)
                .eq('status', 'scheduled')
                .order('start_time', { ascending: true });
            
            if (error) throw error;
            
            if (events && events.length > 0) {
                eventsList.innerHTML = events.map(event => {
                    const startDate = new Date(event.start_time).toLocaleString();
                    const endDate = new Date(event.end_time).toLocaleString();
                    
                    // Calculate time until start
                    const now = new Date();
                    const startTime = new Date(event.start_time);
                    const timeUntilStart = startTime - now;
                    const daysUntil = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
                    const hoursUntil = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    
                    let timeUntilText = '';
                    if (daysUntil > 0) {
                        timeUntilText = `Starts in ${daysUntil} day${daysUntil > 1 ? 's' : ''}, ${hoursUntil}h`;
                    } else if (hoursUntil > 0) {
                        timeUntilText = `Starts in ${hoursUntil}h`;
                    } else {
                        const minutesUntil = Math.floor(timeUntilStart / (1000 * 60));
                        timeUntilText = `Starts in ${minutesUntil}m`;
                    }
                    
                    return `
                        <div class="upcoming-event-card">
                            <div class="event-name">
                                ${event.name}
                                <span class="event-status scheduled">SCHEDULED</span>
                            </div>
                            <div class="event-venue">📍 ${event.venue_name || event.venue_address}</div>
                            <div class="event-datetime">🕒 ${startDate} - ${endDate}</div>
                            <div class="event-time-remaining">⏰ ${timeUntilText}</div>
                            <div class="event-details">
                                <span class="event-detail">${event.event_type.toUpperCase()}</span>
                                <span class="event-detail">${event.deck_size} cards</span>
                                <span class="event-detail">Max ${event.max_matches_allowed} matches</span>
                            </div>
                            <div class="event-actions">
                                <button class="btn-edit" onclick="editEvent('${event.id}')">Edit</button>
                                <button class="btn-cancel" onclick="cancelEvent('${event.id}')">Cancel Event</button>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                eventsList.innerHTML = '<div class="loading">No upcoming events scheduled.</div>';
            }
        } catch (error) {
            console.error('Error loading upcoming events:', error);
            eventsList.innerHTML = '<div class="loading">Error loading events.</div>';
        }
    },

    // Load live events
    loadLiveEvents: async function() {
        const eventsList = document.getElementById('live-events-list');
        if (!eventsList) return;
        
        eventsList.innerHTML = '<div class="loading">Loading live events...</div>';
        
        try {
            const currentUser = window.App.state.currentUser;
            
            const { data: events, error } = await window.App.supabase
                .from('events')
                .select('*, event_stats(*)')
                .eq('organizer_id', currentUser.id)
                .eq('status', 'active')
                .order('start_time', { ascending: true });
            
            if (error) throw error;
            
            if (events && events.length > 0) {
                eventsList.innerHTML = events.map(event => {
                    const stats = event.event_stats?.[0] || {};
                    
                    // Calculate time remaining
                    const now = new Date();
                    const endTime = new Date(event.end_time);
                    const timeRemaining = endTime - now;
                    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
                    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                    
                    return `
                        <div class="upcoming-event-card live-event">
                            <div class="event-name">
                                ${event.name}
                                <span class="event-live-indicator">● LIVE</span>
                            </div>
                            <div class="event-venue">📍 ${event.venue_name || event.venue_address}</div>
                            <div class="event-datetime">🕒 Ends at ${new Date(event.end_time).toLocaleTimeString()}</div>
                            <div class="event-time-remaining">
                                ⏱️ ${hoursRemaining}h ${minutesRemaining}m remaining
                            </div>
                            <div class="event-details">
                                <span class="event-detail">${event.event_type.toUpperCase()}</span>
                                <span class="event-detail">${event.deck_size} cards</span>
                                <span class="event-detail">Max ${event.max_matches_allowed} matches</span>
                            </div>
                            <div class="event-stats-row">
                                <div class="event-stat">👥 ${(stats.active_males || 0) + (stats.active_females || 0)} active users</div>
                                <div class="event-stat">🎯 ${stats.total_matches_completed || 0}/${event.max_matches_allowed} matches</div>
                            </div>
                            <div class="event-actions">
                                <button class="btn-cancel" onclick="cancelEvent('${event.id}')">End Event</button>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                eventsList.innerHTML = '<div class="loading">No live events currently running.</div>';
            }
        } catch (error) {
            console.error('Error loading live events:', error);
            eventsList.innerHTML = '<div class="loading">Error loading live events.</div>';
        }
    },

    // Load event history with analytics
    loadEventHistory: async function() {
        const eventsList = document.getElementById('events-list');
        if (!eventsList) return;
        
        eventsList.innerHTML = '<div class="loading">Loading past events...</div>';
        
        try {
            const currentUser = window.App.state.currentUser;
            
            const { data: events, error } = await window.App.supabase
                .from('events')
                .select('*, event_stats(*)')
                .eq('organizer_id', currentUser.id)
                .in('status', ['completed', 'cancelled'])
                .order('start_time', { ascending: false });
            
            if (error) throw error;
            
            if (events && events.length > 0) {
                // Get user counts and match data for each event
                for (let event of events) {
                    const { data: participants } = await window.App.supabase
                        .from('user_cards')
                        .select('user_id')
                        .eq('event_id', event.id);
                    
                    if (participants) {
                        const uniqueUsers = new Set(participants.map(p => p.user_id));
                        event.totalParticipants = uniqueUsers.size;
                    } else {
                        event.totalParticipants = 0;
                    }
                    
                    const { data: matches } = await window.App.supabase
                        .from('matches')
                        .select('id')
                        .eq('event_id', event.id)
                        .not('match_completed_at', 'is', null);
                    
                    event.successfulMatches = matches ? matches.length : 0;
                }
                
                eventsList.innerHTML = events.map(event => {
                    const startDate = new Date(event.start_time).toLocaleString();
                    const endDate = new Date(event.end_time).toLocaleString();
                    
                    // Calculate match success rate
                    const matchRate = event.totalParticipants > 0 
                        ? Math.round((event.successfulMatches * 2 / event.totalParticipants) * 100) 
                        : 0;
                    
                    return `
                        <div class="analytics-event-card ${event.status === 'cancelled' ? 'cancelled-event' : ''}" onclick="${event.status === 'completed' ? `openEventAnalytics('${event.id}')` : ''}">
                            <div class="analytics-event-header">
                                <div>
                                    <div class="analytics-event-name">${event.name}</div>
                                    <div class="analytics-event-date">📍 ${event.venue_name || event.venue_address}</div>
                                    <div class="analytics-event-date">🕒 ${startDate}</div>
                                </div>
                                <span class="event-status ${event.status}">${event.status.toUpperCase()}</span>
                            </div>
                            ${event.status === 'completed' ? `
                                <div class="analytics-event-stats">
                                    <div class="mini-stat">
                                        <div class="mini-stat-value">${event.totalParticipants}</div>
                                        <div class="mini-stat-label">Users</div>
                                    </div>
                                    <div class="mini-stat">
                                        <div class="mini-stat-value">${event.successfulMatches}</div>
                                        <div class="mini-stat-label">Matches</div>
                                    </div>
                                    <div class="mini-stat">
                                        <div class="mini-stat-value">${matchRate}%</div>
                                        <div class="mini-stat-label">Match Rate</div>
                                    </div>
                                </div>
                            ` : `
                                <div class="event-cancelled-info">
                                    Event was cancelled before completion
                                </div>
                            `}
                        </div>
                    `;
                }).join('');
            } else {
                eventsList.innerHTML = '<div class="loading">No past events found.</div>';
            }
        } catch (error) {
            console.error('Error loading events:', error);
            eventsList.innerHTML = '<div class="loading">Error loading events.</div>';
        }
    },

    // ========================================
    // STATUS MANAGEMENT
    // ========================================
    
    // Update event statuses based on current time
    updateEventStatuses: async function() {
        try {
            const currentUser = window.App.state.currentUser;
            
            const { data: events, error: fetchError } = await window.App.supabase
                .from('events')
                .select('id, start_time, end_time, status')
                .eq('organizer_id', currentUser.id)
                .neq('status', 'cancelled');
            
            if (fetchError) throw fetchError;
            
            if (!events || events.length === 0) return;
            
            for (const event of events) {
                const startTime = new Date(event.start_time);
                const endTime = new Date(event.end_time);
                const now = new Date();
                
                let newStatus = event.status;
                
                if (now < startTime) {
                    newStatus = 'scheduled';
                } else if (now >= startTime && now <= endTime) {
                    newStatus = 'active';
                } else if (now > endTime) {
                    newStatus = 'completed';
                }
                
                if (newStatus !== event.status) {
                    const { error: updateError } = await window.App.supabase
                        .from('events')
                        .update({ status: newStatus })
                        .eq('id', event.id);
                    
                    if (updateError) {
                        console.error(`Error updating event ${event.id} status:`, updateError);
                    } else {
                        console.log(`Updated event ${event.id} status from ${event.status} to ${newStatus}`);
                    }
                }
            }
            
            await this.refreshCurrentView();
            
        } catch (error) {
            console.error('Error updating event statuses:', error);
        }
    },

    // Schedule smart status updates
    scheduleStatusUpdates: async function() {
        try {
            const statusUpdateTimeouts = window.App.state.statusUpdateTimeouts;
            
            // Clear existing timeouts
            statusUpdateTimeouts.forEach(timeout => clearTimeout(timeout));
            statusUpdateTimeouts.clear();
            
            const currentUser = window.App.state.currentUser;
            
            const { data: events, error } = await window.App.supabase
                .from('events')
                .select('id, start_time, end_time, status')
                .eq('organizer_id', currentUser.id)
                .neq('status', 'cancelled');
            
            if (error) throw error;
            if (!events || events.length === 0) return;
            
            const now = new Date();
            
            events.forEach(event => {
                const startTime = new Date(event.start_time);
                const endTime = new Date(event.end_time);
                
                // Schedule update for start time
                if (startTime > now) {
                    const msUntilStart = startTime - now;
                    if (msUntilStart < 2147483647) {
                        const startTimeout = setTimeout(async () => {
                            await this.updateSingleEventStatus(event.id, 'active');
                            await this.refreshCurrentView();
                        }, msUntilStart);
                        statusUpdateTimeouts.set(`${event.id}-start`, startTimeout);
                    }
                }
                
                // Schedule update for end time
                if (endTime > now) {
                    const msUntilEnd = endTime - now;
                    if (msUntilEnd < 2147483647) {
                        const endTimeout = setTimeout(async () => {
                            await this.updateSingleEventStatus(event.id, 'completed');
                            await this.refreshCurrentView();
                        }, msUntilEnd);
                        statusUpdateTimeouts.set(`${event.id}-end`, endTimeout);
                    }
                }
            });
            
            console.log(`Scheduled ${statusUpdateTimeouts.size} status updates`);
        } catch (error) {
            console.error('Error scheduling status updates:', error);
        }
    },

    // Update a single event's status
    updateSingleEventStatus: async function(eventId, newStatus) {
        try {
            const { error } = await window.App.supabase
                .from('events')
                .update({ status: newStatus })
                .eq('id', eventId);
            
            if (error) {
                console.error(`Error updating event ${eventId} status:`, error);
            } else {
                console.log(`Updated event ${eventId} status to ${newStatus}`);
            }
        } catch (error) {
            console.error('Error in updateSingleEventStatus:', error);
        }
    },

    // Refresh the current view
    refreshCurrentView: async function() {
        const activeTab = document.querySelector('.nav-tab.active');
        if (activeTab) {
            const tabText = activeTab.textContent.trim();
            if (tabText === 'Live Events') {
                await this.loadLiveEvents();
            } else if (tabText === 'Upcoming') {
                await this.loadUpcomingEvents();
            } else if (tabText === 'Past Events') {
                await this.loadEventHistory();
            }
        }
    }
};

// Make functions globally accessible for HTML onclick handlers
window.cancelEvent = window.App.events.cancelEvent;
window.editEvent = window.App.events.editEvent;
window.cancelEdit = window.App.events.cancelEdit;