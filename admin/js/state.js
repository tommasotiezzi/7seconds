// js/state.js - Global State Management

window.App.state = {
    // User and auth state
    currentUser: null,
    currentOrganizer: null,
    
    // Venue state
    selectedVenue: null,
    savedVenues: [],
    searchTimeout: null,
    
    // Event state
    editingEventId: null,
    statusUpdateTimeouts: new Map(),
    
    // UI state
    activeTab: 'events'
};

// State helper functions
window.App.setState = function(key, value) {
    window.App.state[key] = value;
};

window.App.getState = function(key) {
    return window.App.state[key];
};