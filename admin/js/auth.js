// js/auth.js - Authentication Functions

window.App.auth = {
    // Check authentication on page load
    checkSession: async function() {
        const { data: { session } } = await window.App.supabase.auth.getSession();
        
        if (!session) {
            window.location.href = 'login.html';
            return false;
        }
        
        window.App.state.currentUser = session.user;
        console.log('Logged in as:', session.user.email);
        return true;
    },

    // Get organizer profile
    getOrganizerProfile: async function() {
        try {
            const currentUser = window.App.state.currentUser;
            
            // Check if this is a regular user (not allowed)
            const { data: regularUser } = await window.App.supabase
                .from('users')
                .select('id')
                .eq('id', currentUser.id)
                .maybeSingle();
            
            if (regularUser) {
                console.error('Access denied: This is a regular app user, not an organizer');
                window.App.ui.showError('Access Denied: This account is for the mobile app, not the admin panel.');
                
                await window.App.supabase.auth.signOut();
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }
            
            // Get or create organizer profile
            let { data: organizer, error } = await window.App.supabase
                .from('organizers')
                .select('*')
                .eq('id', currentUser.id)
                .single();
            
            if (error && error.code === 'PGRST116') {
                // Create new organizer
                const { data: newOrganizer, error: insertError } = await window.App.supabase
                    .from('organizers')
                    .insert({
                        id: currentUser.id,
                        subscription_tier: 'free',
                        max_venues: 0
                    })
                    .select()
                    .single();
                
                if (insertError) throw insertError;
                window.App.state.currentOrganizer = newOrganizer;
            } else if (error) {
                throw error;
            } else {
                window.App.state.currentOrganizer = organizer;
            }
            
            console.log('Organizer profile:', window.App.state.currentOrganizer);
        } catch (error) {
            console.error('Error getting organizer profile:', error);
            window.App.ui.showError('Failed to load organizer profile');
        }
    },

    // Logout function
    logout: async function() {
        await window.App.supabase.auth.signOut();
        window.location.href = 'login.html';
    },

    // Setup auth state change listener
    setupAuthListener: function() {
        window.App.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                window.location.href = 'login.html';
            }
        });
    }
};