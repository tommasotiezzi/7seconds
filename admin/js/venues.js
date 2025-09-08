// js/venues.js - Venue Management and Google Places

window.App.venues = {
    // Load saved venues from database
    loadSavedVenues: async function() {
        try {
            const currentUser = window.App.state.currentUser;
            const { data: venues, error } = await window.App.supabase
                .from('organizer_venues')
                .select('*')
                .eq('organizer_id', currentUser.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            window.App.state.savedVenues = venues || [];
            console.log('Loaded venues:', window.App.state.savedVenues);
        } catch (error) {
            console.error('Error loading venues:', error);
            window.App.state.savedVenues = [];
        }
    },

    // Save a new venue
    saveVenue: async function(venueData) {
        try {
            const currentOrganizer = window.App.state.currentOrganizer;
            const savedVenues = window.App.state.savedVenues;
            const tier = currentOrganizer?.subscription_tier || 'free';
            
            if (tier === 'free') {
                window.App.ui.showError('Free accounts cannot save venues. Please upgrade to continue.');
                return null;
            }
            
            if (tier === 'basic' && savedVenues.length >= 1) {
                window.App.ui.showError('Premium tier limit: You can only save 1 venue. Upgrade to Unlimited for as many venues as you like.');
                return null;
            }
            
            const { data, error } = await window.App.supabase
                .from('organizer_venues')
                .insert({
                    organizer_id: window.App.state.currentUser.id,
                    venue_name: venueData.name,
                    venue_address: venueData.address,
                    place_id: venueData.place_id,
                    lat: venueData.lat,
                    lng: venueData.lng,
                    venue_photo_url: venueData.photo_url
                })
                .select()
                .single();
            
            if (error) throw error;
            
            window.App.state.savedVenues.unshift(data);
            return data;
        } catch (error) {
            console.error('Error saving venue:', error);
            if (error.message?.includes('Basic tier')) {
                window.App.ui.showError(error.message);
            } else {
                window.App.ui.showError('Failed to save venue');
            }
            return null;
        }
    },

    // Remove venue from saved list
    removeVenue: async function(venueId) {
        if (!confirm('Are you sure you want to remove this venue?')) return;
        
        try {
            const { error } = await window.App.supabase
                .from('organizer_venues')
                .delete()
                .eq('id', venueId)
                .eq('organizer_id', window.App.state.currentUser.id);
            
            if (error) throw error;
            
            window.App.ui.showSuccess('Venue removed successfully', 'user-details-tab');
            await window.App.userDetails.loadSavedVenuesList();
        } catch (error) {
            console.error('Error removing venue:', error);
            window.App.ui.showError('Failed to remove venue', 'user-details-tab');
        }
    },

    // Search Google Places
    searchGooglePlaces: async function(query) {
        console.log('Starting Google Places search for:', query);
        
        try {
            const response = await fetch('https://bvdqbzdiwcrlqmqdcvmv.supabase.co/functions/v1/google-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.App.config.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ query })
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Places API error:', errorData);
                return [];
            }
            
            const data = await response.json();
            console.log('Places found:', data.places?.length || 0);
            
            return data.places || [];
        } catch (error) {
            console.error('Network error fetching places:', error);
            return [];
        }
    },

    // Initialize venue input with autocomplete
    initializeVenueInput: function() {
        const venueInput = document.getElementById('venue-input');
        const placesSuggestions = document.getElementById('places-suggestions');
        
        if (!venueInput) return;
        
        console.log('Venue input initialized');
        
        // Set default venue if available
        const savedVenues = window.App.state.savedVenues;
        if (savedVenues.length > 0) {
            venueInput.value = savedVenues[0].venue_name;
            venueInput.classList.add('has-value');
            window.App.state.selectedVenue = savedVenues[0];
        }
        
        // Input event listener
        venueInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            window.App.state.selectedVenue = null;
            
            if (window.App.state.searchTimeout) {
                clearTimeout(window.App.state.searchTimeout);
            }
            
            if (query.length === 0) {
                venueInput.classList.remove('has-value');
                window.App.venues.showSavedVenues();
            } else {
                venueInput.classList.add('has-value');
                
                if (query.length > 1) {
                    placesSuggestions.innerHTML = `
                        <div class="place-suggestion">
                            <div class="place-name">Searching...</div>
                        </div>
                    `;
                    placesSuggestions.classList.add('active');
                    
                    window.App.state.searchTimeout = setTimeout(async () => {
                        console.log('Searching for:', query);
                        const places = await window.App.venues.searchGooglePlaces(query);
                        window.App.venues.displaySearchResults(places, query);
                    }, 300);
                }
            }
        });
        
        // Focus event listener
        venueInput.addEventListener('focus', function() {
            if (!this.value) {
                window.App.venues.showSavedVenues();
            }
        });
        
        // Click event listener
        venueInput.addEventListener('click', function(e) {
            if (this.value && savedVenues.length > 0) {
                e.stopPropagation();
                window.App.venues.showSavedVenues();
            }
        });
        
        // Document click to close dropdown
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.venue-dropdown-container')) {
                placesSuggestions.classList.remove('active');
            }
        });
    },

    // Display search results
    displaySearchResults: function(places, query) {
        const placesSuggestions = document.getElementById('places-suggestions');
        const savedVenues = window.App.state.savedVenues;
        let html = '';
        
        // Show matching saved venues
        const matchingSaved = savedVenues.filter(venue => 
            venue.venue_name.toLowerCase().includes(query.toLowerCase())
        );
        
        if (matchingSaved.length > 0) {
            html += '<div class="saved-venues-section">';
            html += '<div class="suggestion-header">Saved Venues</div>';
            matchingSaved.forEach(venue => {
                html += `
                    <div class="venue-suggestion" onclick="selectSavedVenue('${venue.id}')">
                        <div class="venue-name">📍 ${venue.venue_name}</div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Show Google Places results
        if (places.length > 0) {
            if (matchingSaved.length > 0) {
                html += '<div class="suggestion-header">Search Results</div>';
            }
            places.forEach(place => {
                const name = place.displayName?.text || 'Unknown Venue';
                const address = place.formattedAddress || '';
                const lat = place.location?.latitude || 0;
                const lng = place.location?.longitude || 0;
                const placeId = place.id || '';
                const photoUrl = place.photoUrl || '';
                
                const escapedName = name.replace(/'/g, "\\'");
                const escapedAddress = address.replace(/'/g, "\\'");
                const escapedPhotoUrl = photoUrl.replace(/'/g, "\\'");
                
                html += `
                    <div class="place-suggestion" onclick="selectGooglePlace('${placeId}', '${escapedName}', '${escapedAddress}', ${lat}, ${lng}, '${escapedPhotoUrl}')">
                        <div class="place-name">${name}</div>
                        <div class="place-address">${address}</div>
                    </div>
                `;
            });
        } else if (matchingSaved.length === 0) {
            html = `
                <div class="place-suggestion">
                    <div class="place-name">No venues found</div>
                    <div class="place-address">Try a different search term</div>
                </div>
            `;
        }
        
        placesSuggestions.innerHTML = html;
        placesSuggestions.classList.add('active');
    },

    // Show saved venues dropdown
    showSavedVenues: function() {
        const placesSuggestions = document.getElementById('places-suggestions');
        const venueInput = document.getElementById('venue-input');
        const savedVenues = window.App.state.savedVenues;
        
        let html = '';
        
        if (savedVenues.length > 0) {
            html += '<div class="saved-venues-section">';
            html += '<div class="suggestion-header">Saved Venues</div>';
            savedVenues.forEach(venue => {
                html += `
                    <div class="venue-suggestion" onclick="selectSavedVenue('${venue.id}')">
                        <div class="venue-name">📍 ${venue.venue_name}</div>
                    </div>
                `;
            });
            html += '</div>';
            html += `
                <div class="add-new-venue-option" onclick="startNewVenueSearch()">
                    ➕  Add new venue
                </div>
            `;
        } else if (!venueInput.value) {
            html = `
                <div class="place-suggestion">
                    <div class="place-name">Start typing to search for venues...</div>
                </div>
            `;
        }
        
        if (html) {
            placesSuggestions.innerHTML = html;
            placesSuggestions.classList.add('active');
        }
    },

    // Select a saved venue
    selectSavedVenue: function(venueId) {
        const venue = window.App.state.savedVenues.find(v => v.id === venueId);
        if (venue) {
            const venueInput = document.getElementById('venue-input');
            const placesSuggestions = document.getElementById('places-suggestions');
            
            venueInput.value = venue.venue_name;
            venueInput.classList.add('has-value');
            window.App.state.selectedVenue = venue;
            placesSuggestions.classList.remove('active');
        }
    },

    // Select a Google Place
    selectGooglePlace: function(placeId, name, address, lat, lng, photoUrl) {
        const venueInput = document.getElementById('venue-input');
        const placesSuggestions = document.getElementById('places-suggestions');
        const savedVenues = window.App.state.savedVenues;
        
        venueInput.value = name;
        venueInput.classList.add('has-value');
        
        const existingVenue = savedVenues.find(v => v.place_id === placeId);
        
        if (existingVenue) {
            window.App.state.selectedVenue = existingVenue;
        } else {
            window.App.state.selectedVenue = {
                id: null,
                venue_name: name,
                venue_address: address,
                lat: lat,
                lng: lng,
                place_id: placeId,
                photo_url: photoUrl,
                isNew: true
            };
        }
        
        placesSuggestions.classList.remove('active');
        console.log('Selected venue with photo:', window.App.state.selectedVenue);
    },

    // Start new venue search
    startNewVenueSearch: function() {
        const venueInput = document.getElementById('venue-input');
        const placesSuggestions = document.getElementById('places-suggestions');
        
        venueInput.value = '';
        venueInput.classList.remove('has-value');
        venueInput.focus();
        placesSuggestions.classList.remove('active');
    }
};

// Make functions globally accessible for HTML onclick handlers
window.selectSavedVenue = window.App.venues.selectSavedVenue;
window.selectGooglePlace = window.App.venues.selectGooglePlace;
window.startNewVenueSearch = window.App.venues.startNewVenueSearch;
window.removeVenue = window.App.venues.removeVenue;