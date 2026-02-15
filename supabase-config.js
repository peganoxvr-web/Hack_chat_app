// ============================================
// SUPABASE CONFIGURATION
// ============================================

(function() {
    // Prevent duplicate initialization
    if (window.supabaseClient) {
        return;
    }

    const SUPABASE_CONFIG = {
        url: 'https://uilippkpfchikxboeosy.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbGlwcGtwZmNoaWt4Ym9lb3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTc3MTYsImV4cCI6MjA4NjU5MzcxNn0.HNKjeghyzBb18rXEB04vF3C7W9Wl5A53DBUjR8zqUJ4'
    };

    // Initialize Supabase client
    const supabase = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
    );

    // Export for use in other files
    window.supabaseClient = supabase;
})();
