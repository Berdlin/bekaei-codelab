


class EnhancedAuth {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.init();
    }

    async init() {

        await this.waitForSupabase();


        this.setupAuthListener();


        this.handleOAuthCallback();
    }

    async waitForSupabase() {
        return new Promise((resolve) => {
            const checkSupabase = () => {
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });
    }

    setupAuthListener() {
        if (!this.supabase) return;

        this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session);

            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                await this.handleSuccessfulLogin(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.handleLogout();
            } else if (event === 'PASSWORD_RECOVERY') {
                this.showPasswordRecovery();
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('Token refreshed');
            } else if (event === 'USER_UPDATED') {
                this.currentUser = session.user;
                this.updateUserProfile();
            }
        });
    }

    async handleSuccessfulLogin(user) {

        if (user.app_metadata?.provider === 'email' && !user.email_confirmed_at) {
            await this.supabase.auth.signOut();
            this.showEmailVerificationRequired(user.email);
            return;
        }


        await this.updateUserProfileOnLogin(user);


        this.showAuthSuccess(user);


        this.redirectToDashboard();
    }

    async updateUserProfileOnLogin(user) {
        try {
            // Save to the public profiles table for friend lookups
            await fetch('/api/profile/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    email: user.email,
                    username: user.user_metadata?.username || user.email.split('@')[0],
                    avatarUrl: user.user_metadata?.avatar_url || null
                })
            });
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    }

    async loginWithOAuth(provider) {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${(window.APP_BASE_URL && window.APP_BASE_URL.length > 0 ? window.APP_BASE_URL : window.location.origin)}/auth/${provider}/callback`
                }
            });

            if (error) throw error;


            this.showOAuthLoading(provider);

        } catch (error) {
            console.error('OAuth login error:', error);
            this.showAuthError('OAuth login failed: ' + error.message);
        }
    }

    async loginWithEmail(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (!data.user.email_confirmed_at) {
                await this.supabase.auth.signOut();
                this.showEmailVerificationRequired(email);
                return;
            }

            this.showAuthSuccess(data.user);
            this.redirectToDashboard();

        } catch (error) {
            console.error('Email login error:', error);
            this.showAuthError('Login failed: ' + error.message);
        }
    }

    async registerWithEmail(email, password, username) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username || email.split('@')[0]
                    },
                    emailRedirectTo: `${(window.APP_BASE_URL && window.APP_BASE_URL.length > 0 ? window.APP_BASE_URL : window.location.origin)}/auth/callback`
                }
            });

            if (error) throw error;

            if (data.user) {

                this.showRegistrationSuccess(email);
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showAuthError('Registration failed: ' + error.message);
        }
    }

    async logout() {
        try {
            await this.supabase.auth.signOut();
            this.handleLogout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    handleLogout() {

        this.currentUser = null;


        this.redirectToAuth();


        this.showToast('Logged out successfully', 'success');
    }

    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${(window.APP_BASE_URL && window.APP_BASE_URL.length > 0 ? window.APP_BASE_URL : window.location.origin)}/auth/reset-password`
            });

            if (error) throw error;

            this.showPasswordResetSuccess(email);
        } catch (error) {
            console.error('Password reset error:', error);
            this.showAuthError('Password reset failed: ' + error.message);
        }
    }

    async updatePassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            this.showPasswordUpdateSuccess();
        } catch (error) {
            console.error('Password update error:', error);
            this.showAuthError('Password update failed: ' + error.message);
        }
    }

    async updateProfile(updates) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                data: updates
            });

            if (error) throw error;

            this.showProfileUpdateSuccess();
        } catch (error) {
            console.error('Profile update error:', error);
            this.showAuthError('Profile update failed: ' + error.message);
        }
    }

    handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const token = urlParams.get('token');
        const provider = urlParams.get('provider');

        if (error) {
            this.showAuthError('OAuth authentication failed: ' + error);
            return;
        }


        if (window.location.pathname === '/auth/callback' ||
            window.location.pathname === '/auth/github/callback' ||
            window.location.pathname === '/auth/google/callback') {


            if (token) {
                this.handleOAuthToken(token, provider);
            } else {

                window.location.href = '/';
            }
        }
    }

    async handleOAuthToken(token, provider) {
        try {

            const { data, error } = await this.supabase.auth.setSession({
                access_token: token,
                refresh_token: ''
            });

            if (error) throw error;

            if (data.user) {
                this.showAuthSuccess(data.user);
                this.redirectToDashboard();
            }
        } catch (error) {
            console.error('OAuth token handling error:', error);
            this.showAuthError('OAuth authentication failed: ' + error.message);

            window.location.href = '/';
        }
    }


    showOAuthLoading(provider) {
        this.showToast(`Redirecting to ${provider}...`, 'info');
    }

    showAuthSuccess(user) {
        this.showToast(`Welcome back, ${user.user_metadata?.username || user.email}!`, 'success');
    }

    showAuthError(message) {
        this.showToast(message, 'error');
    }

    showRegistrationSuccess(email) {
        this.showToast(`Registration successful! Please check ${email} for verification link.`, 'success');
    }

    showEmailVerificationRequired(email) {
        this.showToast(`Please verify your email (${email}) before logging in.`, 'warning');
    }

    showPasswordResetSuccess(email) {
        this.showToast(`Password reset link sent to ${email}`, 'success');
    }

    showPasswordUpdateSuccess() {
        this.showToast('Password updated successfully', 'success');
    }

    showProfileUpdateSuccess() {
        this.showToast('Profile updated successfully', 'success');
    }

    redirectToDashboard() {
        if (window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard';
        }
    }

    redirectToAuth() {
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }

    showToast(message, type) {

        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}


window.enhancedAuth = new EnhancedAuth();


window.loginWithOAuth = (provider) => window.enhancedAuth.loginWithOAuth(provider);
window.loginWithEmail = (email, password) => window.enhancedAuth.loginWithEmail(email, password);
window.registerWithEmail = (email, password, username) => window.enhancedAuth.registerWithEmail(email, password, username);
window.logout = () => window.enhancedAuth.logout();
window.resetPassword = (email) => window.enhancedAuth.resetPassword(email);
window.updatePassword = (password) => window.enhancedAuth.updatePassword(password);
window.updateProfile = (updates) => window.enhancedAuth.updateProfile(updates);

