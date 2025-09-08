// js/config.js - Configuration and Constants

// Create global App namespace
window.App = window.App || {};

// Configuration constants
window.App.config = {
    SUPABASE_URL: 'https://bvdqbzdiwcrlqmqdcvmv.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2ZHFiemRpd2NybHFtcWRjdm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODc3MTcsImV4cCI6MjA3MTI2MzcxN30.aN-6AoFZWr07lmPcIdh-vc-DgFNNL3luXQJw4C18T_g',
    PLACES_API_BASE: 'https://places.googleapis.com/v1/places:searchText',
    PLACES_PHOTO_BASE: 'https://places.googleapis.com/v1'
};

// Initialize Supabase client
window.App.supabase = window.supabase.createClient(
    window.App.config.SUPABASE_URL,
    window.App.config.SUPABASE_ANON_KEY
);