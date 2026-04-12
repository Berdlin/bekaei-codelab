// Application config
// Set APP_BASE_URL to your deployed site origin (e.g. https://app.example.com)
// If left empty, the app will fall back to window.location.origin.
(function () {
    // You can update this value during deployment or via server-side templating.
    window.APP_BASE_URL = '';
    
    // Auto-detect production URL
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        window.APP_BASE_URL = window.location.origin;
    }
    
    // Where API routes (e.g. /api/friends/*) should be sent.
    // If your API is on a different origin/port than the frontend, set this to that origin.
    window.API_BASE_URL = window.APP_BASE_URL;
})();
