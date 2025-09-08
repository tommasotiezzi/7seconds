// js/main.js - Main Application Initialization

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const isAuthenticated = await window.App.auth.checkSession();
    if (!isAuthenticated) {
        return; // Stop if not authenticated
    }
    
    // Initialize the application
    await initializeApp();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup auth state listener
    window.App.auth.setupAuthListener();
});

// Main initialization function
async function initializeApp() {
    try {
        // Get organizer profile
        await window.App.auth.getOrganizerProfile();
        
        // Load saved venues
        await window.App.venues.loadSavedVenues();
        
        // Initialize venue input
        window.App.venues.initializeVenueInput();
        
        // Set default date times
        window.App.ui.setDefaultDateTimes();
        
        // Update user display
        window.App.ui.updateUserDisplay();
        
        // Initial status update and schedule future updates
        await window.App.events.updateEventStatuses();
        await window.App.events.scheduleStatusUpdates();
        
        // Fallback check every 10 minutes
        setInterval(async () => {
            await window.App.events.updateEventStatuses();
            await window.App.events.scheduleStatusUpdates();
        }, 600000); // 10 minutes
        
    } catch (error) {
        console.error('Error initializing app:', error);
        window.App.ui.showError('Failed to initialize app. Please refresh the page.');
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Event form submission
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventFormSubmit);
    }
    
    // Edit event form submission
    const editEventForm = document.getElementById('edit-event-form');
    if (editEventForm) {
        editEventForm.addEventListener('submit', handleEditEventFormSubmit);
    }
    
    // Window click for modal closing
    window.onclick = function(event) {
        const editModal = document.getElementById('edit-modal');
        const analyticsModal = document.getElementById('analytics-modal');
        
        if (event.target == editModal) {
            window.App.ui.closeEditModal();
        }
        if (event.target == analyticsModal) {
            window.App.ui.closeAnalyticsModal();
        }
    };
}

// Handle main event form submission
async function handleEventFormSubmit(e) {
    e.preventDefault();
    
    const submitButton = document.getElementById('submit-btn');
    const selectedVenue = window.App.state.selectedVenue;
    const editingEventId = window.App.state.editingEventId;
    
    if (!selectedVenue) {
        window.App.ui.showError('Please select or add a venue first');
        return;
    }
    
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = editingEventId ? 'Updating...' : 'Creating...';
    
    try {
        // Save new venue if needed
        let venueToUse = selectedVenue;
        if (!editingEventId && selectedVenue.isNew) {
            const savedVenue = await window.App.venues.saveVenue({
                name: selectedVenue.venue_name,
                address: selectedVenue.venue_address,
                place_id: selectedVenue.place_id,
                lat: selectedVenue.lat,
                lng: selectedVenue.lng,
                photo_url: selectedVenue.photo_url
            });
            
            if (savedVenue) {
                venueToUse = savedVenue;
                window.App.state.selectedVenue = savedVenue;
                window.App.ui.showSuccess(`Venue "${savedVenue.venue_name}" saved!`);
            }
        }
        
        // Prepare event data
        const eventData = {
            name: document.getElementById('event-name').value,
            venue_name: venueToUse.venue_name,
            venue_address: venueToUse.venue_address,
            place_id: venueToUse.place_id,
            lat: venueToUse.lat,
            lng: venueToUse.lng,
            venue_photo_url: venueToUse.photo_url || venueToUse.venue_photo_url,
            start_time: document.getElementById('start-time').value,
            end_time: document.getElementById('end-time').value,
            deck_size: parseInt(document.getElementById('deck-size').value),
            max_matches_allowed: parseInt(document.getElementById('max-matches').value),
            event_type: document.getElementById('event-type').value
        };
        
        let event;
        if (editingEventId) {
            event = await window.App.events.updateEvent(editingEventId, eventData);
            window.App.ui.showSuccess('Event updated successfully!');
            window.App.events.cancelEdit();
        } else {
            event = await window.App.events.createEvent(eventData);
            if (event) {
                window.App.ui.showSuccess('Event created successfully!');
                document.getElementById('event-form').reset();
                
                // Reset venue input
                const venueInput = document.getElementById('venue-input');
                venueInput.value = venueToUse.venue_name;
                venueInput.classList.add('has-value');
                
                window.App.ui.setDefaultDateTimes();
                
                // Re-schedule status updates for the new event
                await window.App.events.scheduleStatusUpdates();
                
                // Refresh organizer profile and subscription status
                await window.App.auth.getOrganizerProfile();
                window.App.subscription.checkSubscriptionStatus();
            }
        }
        
        await window.App.events.loadUpcomingEvents();
        
    } catch (error) {
        console.error('Error submitting event:', error);
        window.App.ui.showError('Failed to ' + (editingEventId ? 'update' : 'create') + ' event: ' + error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

// Handle edit event form submission
async function handleEditEventFormSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const eventId = document.getElementById('edit-event-id').value;
    
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    try {
        const eventData = {
            name: document.getElementById('edit-event-name').value,
            venue_name: document.getElementById('edit-venue-name').value,
            start_time: document.getElementById('edit-start-time').value,
            end_time: document.getElementById('edit-end-time').value,
            deck_size: parseInt(document.getElementById('edit-deck-size').value),
            max_matches_allowed: parseInt(document.getElementById('edit-max-matches').value),
            event_type: document.getElementById('edit-event-type').value
        };
        
        const currentUser = window.App.state.currentUser;
        const { error } = await window.App.supabase
            .from('events')
            .update(eventData)
            .eq('id', eventId)
            .eq('organizer_id', currentUser.id);
        
        if (error) throw error;
        
        window.App.ui.showSuccess('Event updated successfully!');
        window.App.ui.closeEditModal();
        await window.App.events.loadUpcomingEvents();
        
    } catch (error) {
        console.error('Error updating event:', error);
        window.App.ui.showError('Failed to update event: ' + error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Update Event';
    }
}