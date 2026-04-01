(function () {
    let initAttempts = 0;
    const maxAttempts = 10;

    function hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
        console.log('Loading overlay hidden');
    }

    function loadSupabaseScript() {
        if (window.supabase) {
            console.log('Supabase already initialized');
            hideLoadingOverlay();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

        script.onload = function () {
            console.log('Supabase library loaded');
            initializeSupabase();
        };

        script.onerror = function () {
            console.error('Failed to load Supabase library');
            window.supabaseLoadError = true;
            hideLoadingOverlay();
        };

        document.head.appendChild(script);
    }

    function initializeSupabase() {
        initAttempts++;

        if (typeof supabase === 'undefined' || typeof supabase.createClient === 'undefined') {
            if (initAttempts < maxAttempts) {
                console.log('Waiting for Supabase to be available... attempt', initAttempts);
                setTimeout(initializeSupabase, 100);
                return;
            } else {
                console.error('Supabase failed to load after', maxAttempts, 'attempts');
                window.supabaseLoadError = true;
                hideLoadingOverlay();
                return;
            }
        }

        try {
            const SUPABASE_URL = "https://vgyvqjmtkiospnkxctts.supabase.co";
            const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZneXZxam10a2lvc3Bua3hjdHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjk4ODUsImV4cCI6MjA4Mjg0NTg4NX0.IB9ohWQBqzZBCgjEr-rXW4YyKOkl3Hk313Kp1FPqsA0";

            window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });

            window.supabaseClientReady = true;
            console.log('✅ Supabase client initialized successfully');

            handleOAuthToken();

            hideLoadingOverlay();

            setTimeout(function () {
                window.dispatchEvent(new CustomEvent('supabaseReady'));
                console.log('supabaseReady event dispatched');
            }, 50);

        } catch (e) {
            console.error('❌ Failed to create Supabase client:', e);
            window.supabaseLoadError = true;
            hideLoadingOverlay();
        }
    }

    function handleOAuthToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const provider = urlParams.get('provider');

        if (token && provider) {
            console.log('OAuth token detected for provider:', provider);

            window.supabaseClient.auth.setSession({
                access_token: token,
                refresh_token: ''
            }).then(() => {
                console.log('OAuth session set successfully');

                window.location.href = '/dashboard';

                setTimeout(() => {
                    if (window.showToast) {
                        window.showToast(`Successfully logged in with ${provider}`, 'success');
                    }
                }, 1000);
            }).catch(error => {
                console.error('Failed to set OAuth session:', error);
                if (window.showToast) {
                    window.showToast('OAuth login failed: ' + error.message, 'error');
                }
            });
        }
    }

    loadSupabaseScript();

    setTimeout(hideLoadingOverlay, 5000);
})();
