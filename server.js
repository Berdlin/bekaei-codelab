require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const fsPromises = require('fs/promises');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

const SUPABASE_URL = process.env.SUPABASE_URL || "https://vgyvqjmtkiospnkxctts.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZneXZxam10a2lvc3Bua3hjdHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjk4ODUsImV4cCI6MjA4Mjg0NTg4NX0.IB9ohWQBqzZBCgjEr-rXW4YyKOkl3Hk313Kp1FPqsA0";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

console.log("Supabase URL:", SUPABASE_URL.substring(0, 30) + "...");
console.log("OAuth Configured:", !!GITHUB_CLIENT_ID || !!GOOGLE_CLIENT_ID);

const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefresh: true,
        persistSession: false
    }
});

// Used for admin/identity queries (auth.users) in friends + OAuth flows.
// Set `SUPABASE_SERVICE_ROLE_KEY` in your environment to the service_role JWT
// (needed to query `auth.users` by email).
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL || 'berekethabtamu2025@gmail.com');
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM_NAME = process.env.SENDER_NAME || process.env.SMTP_FROM_NAME || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || ADMIN_EMAIL;
const SMTP_FROM_ADDRESS = SMTP_FROM_NAME
    ? `"${String(SMTP_FROM_NAME).replace(/"/g, '\\"')}" <${SMTP_FROM}>`
    : SMTP_FROM;
const SMTP_REJECT_UNAUTHORIZED = String(process.env.SMTP_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';
const HELP_REQUESTS_LOG_PATH = path.join(__dirname, 'data', 'help-requests.jsonl');
console.log("Supabase service role key loaded:", !!SUPABASE_SERVICE_ROLE_KEY);
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefresh: true,
        persistSession: false
    }
}) : null;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/speed-test', (req, res) => {
    try {
        let size = parseInt(req.query.size, 10) || 200000;
        size = Math.max(50000, Math.min(size, 2 * 1024 * 1024));
        const buf = Buffer.alloc(size, 'a');
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Length': buf.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
        });
        res.send(buf);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/fast-speed-test', async (req, res) => {
    try {
        const fastUrl = 'https://api.fast.com/netflix/speedtest/v2?https=true&token=YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm';

        const response = await fetch(fastUrl);

        if (!response.ok) {
            console.log('Fast.com API request failed, status:', response.status);
            return res.json({
                speed: 20,
                downloadSpeed: 20,
                uploadSpeed: 10,
                latency: 50,
                source: 'fallback'
            });
        }

        const data = await response.json();

        const speedMbps = data ? (data.speed || data.downloadSpeed || 0) : 0;

        res.json({
            speed: speedMbps,
            downloadSpeed: speedMbps,
            uploadSpeed: data.uploadSpeed || (speedMbps * 0.5),
            latency: data.latency || 50,
            source: 'fast.com'
        });

    } catch (error) {
        console.error('Fast.com proxy error:', error.message);
        res.json({
            speed: 20,
            downloadSpeed: 20,
            uploadSpeed: 10,
            latency: 50,
            source: 'fallback',
            error: 'Fast.com API unavailable'
        });
    }
});

// -----------------------------------------------------------------------------
// Friends (Supabase-backed)
// -----------------------------------------------------------------------------
// Expected tables (create these in your Supabase project):
// - friend_requests(id, from_user_id uuid, to_user_id uuid, created_at timestamptz)
// - friends(user_id uuid, friend_user_id uuid, created_at timestamptz)
// - dm_messages(id, conversation_id text, sender_id uuid, recipient_id uuid, message text, is_visible boolean DEFAULT true, hidden_by uuid[], created_at timestamptz)
// - users(id uuid primary key, email text, username text, avatar_url text, created_at timestamptz, updated_at timestamptz)
//
// IMPORTANT: The friends table requires a foreign key constraint referencing the 
// public.users table. Run this SQL in Supabase SQL Editor:
//
// CREATE TABLE IF NOT EXISTS users (
//   id UUID PRIMARY KEY,
//   email TEXT,
//   username TEXT,
//   avatar_url TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// ALTER TABLE friends 
//   ADD CONSTRAINT friends_user_id_fkey 
//   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
//
// ALTER TABLE friends 
//   ADD CONSTRAINT friends_friend_user_id_fkey 
//   FOREIGN KEY (friend_user_id) REFERENCES users(id) ON DELETE CASCADE;
//
// ALTER TABLE friends 
//   ADD CONSTRAINT friends_unique_pair 
//   UNIQUE (user_id, friend_user_id);
//
// Notes:
// - This uses the server-side Supabase client, so it should work even if RLS is strict.
// - The ensureUserInPublicTable function automatically creates users in the public 
//   users table before adding friendship records to satisfy foreign key constraints.
// -----------------------------------------------------------------------------

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

async function requireAuthenticatedUser(req, res, next) {
    try {
        const authHeader = String(req.headers.authorization || '');
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing bearer token' });
        }
        const token = authHeader.slice(7).trim();
        if (!token) {
            return res.status(401).json({ error: 'Missing access token' });
        }

        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data || !data.user) {
            return res.status(401).json({ error: 'Invalid access token' });
        }

        req.authUser = data.user;
        next();
    } catch (e) {
        return res.status(500).json({ error: e.message || 'Authentication failed' });
    }
}

async function requireAdminUser(req, res, next) {
    const user = req.authUser;
    const email = normalizeEmail(user && user.email);
    if (email !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Only admin can use this endpoint' });
    }
    next();
}

function createSmtpTransporter() {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        throw new Error('SMTP configuration is missing in server environment');
    }
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: {
            // Set SMTP_REJECT_UNAUTHORIZED=false in .env for self-signed SMTP cert chains.
            rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED
        }
    });
}

function hasSmtpConfig() {
    return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

async function storeHelpRequestFallback(payload) {
    await fsPromises.mkdir(path.dirname(HELP_REQUESTS_LOG_PATH), { recursive: true });
    const line = JSON.stringify({
        savedAt: new Date().toISOString(),
        adminEmail: ADMIN_EMAIL,
        ...payload
    }) + '\n';
    await fsPromises.appendFile(HELP_REQUESTS_LOG_PATH, line, 'utf8');
}

app.get('/api/admin/me', requireAuthenticatedUser, (req, res) => {
    const email = normalizeEmail(req.authUser && req.authUser.email);
    res.json({
        isAdmin: email === ADMIN_EMAIL,
        adminEmail: ADMIN_EMAIL
    });
});

app.post('/api/admin/send-announcement', requireAuthenticatedUser, requireAdminUser, async (req, res) => {
    try {
        const subject = String((req.body && req.body.subject) || '').trim();
        const message = String((req.body && req.body.message) || '').trim();

        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required' });
        }

        const recipients = [];
        const perPage = 200;
        let page = 1;
        for (let i = 0; i < 30; i++) {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
            if (error) return res.status(500).json({ error: error.message });
            const users = (data && data.users) ? data.users : [];
            users.forEach((u) => {
                if (u && u.email) {
                    const em = normalizeEmail(u.email);
                    if (em && !recipients.includes(em)) recipients.push(em);
                }
            });
            if (!data || data.nextPage === null || typeof data.nextPage === 'undefined') break;
            page = data.nextPage;
        }

        if (recipients.length === 0) {
            return res.status(404).json({ error: 'No recipients found' });
        }

        const transporter = createSmtpTransporter();

        await transporter.sendMail({
            from: SMTP_FROM_ADDRESS,
            bcc: recipients,
            subject,
            text: message
        });

        res.json({ success: true, sentTo: recipients.length });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Failed to send announcement' });
    }
});

// Bypass endpoint for admin email - allows sending without authentication token
app.post('/api/admin/send-announcement-bypass', async (req, res) => {
    try {
        const bypassEmail = 'berkethabtamu2025@gmail.com';
        const headerEmail = req.headers['x-admin-email'];
        
        // Verify the request is from the admin email
        if (!headerEmail || normalizeEmail(headerEmail) !== bypassEmail) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const subject = String((req.body && req.body.subject) || '').trim();
        const message = String((req.body && req.body.message) || '').trim();

        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required' });
        }

        const recipients = [];
        const perPage = 200;
        let page = 1;
        for (let i = 0; i < 30; i++) {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
            if (error) return res.status(500).json({ error: error.message });
            const users = (data && data.users) ? data.users : [];
            users.forEach((u) => {
                if (u && u.email) {
                    const em = normalizeEmail(u.email);
                    if (em && !recipients.includes(em)) recipients.push(em);
                }
            });
            if (!data || data.nextPage === null || typeof data.nextPage === 'undefined') break;
            page = data.nextPage;
        }

        if (recipients.length === 0) {
            return res.status(404).json({ error: 'No recipients found' });
        }

        const transporter = createSmtpTransporter();

        await transporter.sendMail({
            from: SMTP_FROM_ADDRESS,
            bcc: recipients,
            subject,
            text: message
        });

        res.json({ success: true, sentTo: recipients.length });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Failed to send announcement' });
    }
});

app.post('/api/help-request', async (req, res) => {
    try {
        const email = normalizeEmail(req.body && req.body.email);
        const username = String((req.body && req.body.username) || 'User').trim();
        const message = String((req.body && req.body.message) || '').trim();
        const userId = String((req.body && req.body.userId) || '').trim();
        const subject = String((req.body && req.body.subject) || 'User help request').trim();

        if (!email || !message) {
            return res.status(400).json({ error: 'email and message are required' });
        }

        const mailText =
            `User help request\n\n` +
            `Username: ${username || 'Unknown'}\n` +
            `Email: ${email}\n` +
            `User ID: ${userId || 'N/A'}\n\n` +
            `Message:\n${message}`;

        if (hasSmtpConfig()) {
            const sendWithTransporter = async (transporter) => {
                await transporter.sendMail({
                    from: SMTP_FROM_ADDRESS,
                    to: ADMIN_EMAIL,
                    replyTo: email,
                    subject: `[Help] ${subject}`,
                    text: mailText
                });
            };

            try {
                const transporter = createSmtpTransporter();
                await sendWithTransporter(transporter);
                return res.json({ success: true, delivery: 'smtp' });
            } catch (smtpError) {
                const message = String(smtpError && smtpError.message || '');
                const certError = /self[-\s]?signed certificate|certificate chain|unable to verify/i.test(message);
                if (!certError || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
                    throw smtpError;
                }

                const insecureTransporter = nodemailer.createTransport({
                    host: SMTP_HOST,
                    port: SMTP_PORT,
                    secure: SMTP_SECURE,
                    auth: { user: SMTP_USER, pass: SMTP_PASS },
                    tls: { rejectUnauthorized: false }
                });
                await sendWithTransporter(insecureTransporter);
                return res.json({ success: true, delivery: 'smtp', tlsWarning: 'self-signed certificate accepted' });
            }
        }

        await storeHelpRequestFallback({
            subject: `[Help] ${subject}`,
            email,
            username,
            userId: userId || null,
            message
        });
        res.json({
            success: true,
            delivery: 'log',
            note: 'SMTP is not configured. Request was saved to server log.'
        });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Failed to send help request' });
    }
});

function conversationId(a, b) {
    const aa = String(a);
    const bb = String(b);
    return [aa, bb].sort().join('_');
}

async function fetchAdminUserById(supabaseAdmin, uid) {
    if (!supabaseAdmin || !uid) return null;
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(String(uid));
    if (error) throw new Error(error.message || 'Failed to load user by id');
    const u = data && data.user ? data.user : null;
    if (!u) return null;
    return {
        id: u.id,
        email: u.email,
        user_metadata: u.user_metadata || {}
    };
}

async function fetchAdminUserByEmail(supabaseAdmin, email) {
    if (!supabaseAdmin || !email) return null;
    const target = normalizeEmail(email);

    // No direct "get by email" admin API exists in this SDK;
    // we page through admin users until we find a matching email.
    const perPage = 100;
    let page = 0;
    const maxPages = 25;

    for (let i = 0; i < maxPages; i++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) throw new Error(error.message || 'Failed to list users');

        const users = (data && data.users) ? data.users : [];
        const match = (users || []).find(u => normalizeEmail(u.email) === target);
        if (match) {
            return {
                id: match.id,
                email: match.email,
                user_metadata: match.user_metadata || {}
            };
        }

        // Pagination: stop if Supabase tells us there's no next page.
        if (!data || data.nextPage === null || typeof data.nextPage === 'undefined') break;
        page = data.nextPage;
    }

    return null;
}

async function fetchProfilesFromPublicTable(db, userIds) {
    const userMap = {};
    const list = Array.isArray(userIds) ? userIds : [];
    if (list.length === 0 || !db) return userMap;

    try {
        const { data, error } = await db
            .from('profiles')
            .select('id, username, email, avatar_url')
            .in('id', list);

        if (error) {
            console.warn('Failed to fetch from profiles table:', error.message);
            return userMap;
        }

        (data || []).forEach(p => {
            if (p && p.id) {
                userMap[String(p.id)] = {
                    id: p.id,
                    email: p.email || '',
                    user_metadata: {
                        username: p.username || '',
                        avatar_url: p.avatar_url || null
                    }
                };
            }
        });
    } catch (e) {
        console.warn('Error fetching profiles:', e.message);
    }
    return userMap;
}

async function saveProfileToPublicTable(db, userId, email, username, avatarUrl) {
    if (!db || !userId) return;
    try {
        await db.from('profiles').upsert({
            id: userId,
            email: email || '',
            username: username || '',
            avatar_url: avatarUrl || null,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
    } catch (e) {
        console.warn('Failed to save profile:', e.message);
    }
}

// Ensure a user exists in the public 'users' table (required for friends table foreign key)
// Returns { success: boolean, userData: object|null, error: string|null }
async function ensureUserInPublicTable(db, supabaseAdminClient, userId) {
    if (!db || !userId) return { success: false, userData: null, error: 'Missing db or userId' };
    try {
        // First check if user exists in public users table
        const { data: existingUser, error: checkError } = await db
            .from('users')
            .select('id, email, username, avatar_url')
            .eq('id', userId)
            .maybeSingle();

        if (checkError && !checkError.message.includes('no rows')) {
            console.warn('Error checking users table:', checkError.message);
        }

        // User already exists
        if (existingUser) {
            return { success: true, userData: existingUser, error: null };
        }

        // Fetch user from auth.users via admin API
        let userData = null;
        let authFetchError = null;
        
        if (supabaseAdminClient) {
            try {
                const authUser = await fetchAdminUserById(supabaseAdminClient, userId);
                if (authUser) {
                    userData = {
                        id: authUser.id,
                        email: authUser.email || '',
                        username: authUser.user_metadata?.username || (authUser.email ? authUser.email.split('@')[0] : 'User'),
                        avatar_url: authUser.user_metadata?.avatar_url || null
                    };
                }
            } catch (e) {
                authFetchError = e.message;
                console.warn('Failed to fetch user from auth:', e.message);
            }
        } else {
            authFetchError = 'Supabase admin client not configured - set SUPABASE_SERVICE_ROLE_KEY in .env';
            console.warn(authFetchError);
        }

        // If we couldn't get user data from auth, we cannot proceed
        // We need at least email to create a valid user record
        if (!userData) {
            const errorMsg = authFetchError || 'User not found in auth system';
            console.error(`Cannot create user ${userId} in public.users: ${errorMsg}`);
            return { success: false, userData: null, error: errorMsg };
        }

        // Insert into users table
        const { error: insertError } = await db
            .from('users')
            .upsert({
                id: userData.id,
                email: userData.email,
                username: userData.username,
                avatar_url: userData.avatar_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (insertError) {
            console.error('Failed to insert user into users table:', insertError.message);
            return { success: false, userData: null, error: insertError.message };
        }

        console.log(`Successfully created user ${userId} in public.users table`);
        return { success: true, userData, error: null };
    } catch (e) {
        console.error('Error in ensureUserInPublicTable:', e.message);
        return { success: false, userData: null, error: e.message };
    }
}

async function fetchAdminUsersByIdsMap(supabaseAdmin, ids, fallbackDb) {
    const userMap = {};
    const list = Array.isArray(ids) ? ids : [];
    if (list.length === 0) return userMap;

    // Try admin API first if available
    if (supabaseAdmin) {
        const users = await Promise.all(list.map(async (id) => {
            try {
                return await fetchAdminUserById(supabaseAdmin, id);
            } catch (e) {
                return null;
            }
        }));
        users.forEach(u => {
            if (u && u.id) userMap[String(u.id)] = u;
        });
    }

    // Fallback to public profiles table for any missing users
    const missingIds = list.filter(id => !userMap[String(id)]);
    if (missingIds.length > 0 && fallbackDb) {
        const publicProfiles = await fetchProfilesFromPublicTable(fallbackDb, missingIds);
        Object.assign(userMap, publicProfiles);
    }

    return userMap;
}

app.get('/api/friends/incoming-requests', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    try {
        const db = supabaseAdmin || supabase;
        const { data: requests, error } = await db
            .from('friend_requests')
            .select('id, from_user_id, to_user_id, created_at')
            .eq('to_user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        const fromIds = [...new Set((requests || []).map(r => r.from_user_id))];
        const userMap = {};

        if (fromIds.length > 0) {
            Object.assign(userMap, await fetchAdminUsersByIdsMap(supabaseAdmin, fromIds, supabase));
        }

        const enriched = (requests || []).map(r => {
            const from = userMap[String(r.from_user_id)] || null;
            const username = from && from.user_metadata && from.user_metadata.username
                ? from.user_metadata.username
                : (from && from.email ? from.email.split('@')[0] : 'Unknown');

            return {
                id: r.id,
                from_user_id: r.from_user_id,
                from_email: from ? from.email : null,
                from_username: username,
                from_avatar_url: from && from.user_metadata ? from.user_metadata.avatar_url : null,
                created_at: r.created_at
            };
        });

        res.json({ requests: enriched });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/friends/accepted', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    try {
        const db = supabaseAdmin || supabase;
        const { data: rows, error } = await db
            .from('friends')
            .select('friend_user_id, user_id, created_at')
            .eq('user_id', userId);

        if (error) return res.status(500).json({ error: error.message });

        const friendIds = [...new Set((rows || []).map(r => r.friend_user_id))];
        const userMap = {};

        if (friendIds.length > 0) {
            Object.assign(userMap, await fetchAdminUsersByIdsMap(supabaseAdmin, friendIds, supabase));
        }

        const friends = (rows || []).map(r => {
            const u = userMap[String(r.friend_user_id)] || null;
            return {
                user_id: r.user_id,
                friend_user_id: r.friend_user_id,
                friend_email: u ? u.email : null,
                friend_username: u && u.user_metadata && u.user_metadata.username
                    ? u.user_metadata.username
                    : (u && u.email ? u.email.split('@')[0] : 'Friend'),
                friend_avatar_url: u && u.user_metadata ? u.user_metadata.avatar_url : null,
                created_at: r.created_at
            };
        });

        res.json({ friends });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/friends/request', async (req, res) => {
    const { fromUserId, toEmail } = req.body || {};
    const email = normalizeEmail(toEmail);
    if (!fromUserId || !email) return res.status(400).json({ error: "fromUserId and toEmail are required" });

    if (!email.includes('@')) return res.status(400).json({ error: "Invalid email" });

    try {
        if (!supabaseAdmin) {
            return res.status(500).json({
                error: "SUPABASE_SERVICE_ROLE_KEY is required for admin email lookups. Add it to your .env and restart the server."
            });
        }

        const db = supabaseAdmin;
        let toUser = await fetchAdminUserByEmail(supabaseAdmin, email);
        let inviteSent = false;
        if (!toUser) {
            // Recipient doesn't exist yet: send them a Supabase invite email link.
            const baseUrl =
                (process.env.APP_BASE_URL && String(process.env.APP_BASE_URL).trim())
                    ? String(process.env.APP_BASE_URL).trim().replace(/\/+$/, '')
                    : `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');

            const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                // For magiclink/invite, redirect back to the app origin so the JS client can detect the session.
                redirectTo: baseUrl,
                data: { invited_by: fromUserId }
            });

            if (inviteErr) return res.status(500).json({ error: inviteErr.message });

            inviteSent = true;

            // Re-fetch to get the invited user's id for our friend_requests row.
            toUser = await fetchAdminUserByEmail(supabaseAdmin, email);
            if (!toUser) return res.status(404).json({ error: "User not found for this email after invite" });
        }

        if (String(toUser.id) === String(fromUserId)) {
            return res.status(400).json({ error: "You cannot friend yourself" });
        }

        // Already friends?
        const [a1, a2] = await Promise.all([
            db.from('friends').select('user_id').eq('user_id', fromUserId).eq('friend_user_id', toUser.id).limit(1),
            db.from('friends').select('user_id').eq('user_id', toUser.id).eq('friend_user_id', fromUserId).limit(1)
        ]);

        if ((a1 && a1.data && a1.data.length > 0) || (a2 && a2.data && a2.data.length > 0)) {
            return res.status(409).json({ error: "Already friends" });
        }

        // Existing pending request in either direction?
        const [r1, r2] = await Promise.all([
            db.from('friend_requests').select('id').eq('from_user_id', fromUserId).eq('to_user_id', toUser.id).limit(1),
            db.from('friend_requests').select('id').eq('from_user_id', toUser.id).eq('to_user_id', fromUserId).limit(1)
        ]);

        if ((r1 && r1.data && r1.data.length > 0) || (r2 && r2.data && r2.data.length > 0)) {
            return res.status(409).json({ error: "Friend request already pending" });
        }

        const { error: insertErr } = await db
            .from('friend_requests')
            .insert([{ from_user_id: fromUserId, to_user_id: toUser.id }]);

        if (insertErr) return res.status(500).json({ error: insertErr.message });

        res.json({ success: true, invited: inviteSent });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/friends/accept', async (req, res) => {
    const { requestId, userId } = req.body || {};
    if (!requestId || !userId) return res.status(400).json({ error: "requestId and userId are required" });

    try {
        const db = supabaseAdmin || supabase;
        const { data: requestRow, error: reqErr } = await db
            .from('friend_requests')
            .select('id, from_user_id, to_user_id')
            .eq('id', requestId)
            .maybeSingle();

        if (reqErr) return res.status(500).json({ error: reqErr.message });
        if (!requestRow) return res.status(404).json({ error: "Request not found" });

        // Only the recipient can accept.
        if (String(requestRow.to_user_id) !== String(userId)) {
            return res.status(403).json({ error: "Not authorized to accept this request" });
        }

        const userA = String(requestRow.from_user_id);
        const userB = String(requestRow.to_user_id);

        // Ensure both users exist in the public users table (required for friends table foreign key)
        const [userAResult, userBResult] = await Promise.all([
            ensureUserInPublicTable(db, supabaseAdmin, userA),
            ensureUserInPublicTable(db, supabaseAdmin, userB)
        ]);

        if (!userAResult.success || !userBResult.success) {
            console.error('Failed to ensure users exist in public table:', { 
                userA, userAError: userAResult.error, 
                userB, userBError: userBResult.error 
            });
            return res.status(500).json({ 
                error: 'Failed to create user records required for friendship. Please ensure SUPABASE_SERVICE_ROLE_KEY is configured.' 
            });
        }

        // Insert both directions so querying "accepted" for either user works.
        const { error: upsertErr } = await db
            .from('friends')
            .upsert(
                [
                    { user_id: userA, friend_user_id: userB },
                    { user_id: userB, friend_user_id: userA }
                ],
                { onConflict: 'user_id,friend_user_id' }
            );

        if (upsertErr) {
            console.error('Friends upsert error:', upsertErr);
            return res.status(500).json({ error: upsertErr.message });
        }

        await db.from('friend_requests').delete().eq('id', requestId);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/friends/decline', async (req, res) => {
    const { requestId, userId } = req.body || {};
    if (!requestId || !userId) return res.status(400).json({ error: "requestId and userId are required" });

    try {
        const db = supabaseAdmin || supabase;
        const { data: requestRow, error: reqErr } = await db
            .from('friend_requests')
            .select('id, from_user_id, to_user_id')
            .eq('id', requestId)
            .maybeSingle();

        if (reqErr) return res.status(500).json({ error: reqErr.message });
        if (!requestRow) return res.status(404).json({ error: "Request not found" });

        if (String(requestRow.to_user_id) !== String(userId)) {
            return res.status(403).json({ error: "Not authorized to decline this request" });
        }

        await db.from('friend_requests').delete().eq('id', requestId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/profile/save', async (req, res) => {
    const { userId, email, username, avatarUrl } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
        await saveProfileToPublicTable(supabase, userId, email, username, avatarUrl);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/friends/unfriend', async (req, res) => {
    const { userId, friendUserId } = req.body || {};
    if (!userId || !friendUserId) return res.status(400).json({ error: "userId and friendUserId are required" });

    try {
        const db = supabaseAdmin || supabase;
        
        // Delete friendship in both directions (A->B and B->A)
        await db.from('friends')
            .delete()
            .or(`and(user_id.eq.${userId},friend_user_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_user_id.eq.${userId})`);
        
        // Also delete any pending friend requests between these users
        await db.from('friend_requests')
            .delete()
            .or(`and(from_user_id.eq.${userId},to_user_id.eq.${friendUserId}),and(from_user_id.eq.${friendUserId},to_user_id.eq.${userId})`);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/friends/messages', async (req, res) => {
    const userId = req.query.userId;
    const friendUserId = req.query.friendUserId;

    if (!userId || !friendUserId) return res.status(400).json({ error: "userId and friendUserId are required" });

    try {
        const db = supabaseAdmin || supabase;
        const conversation = conversationId(userId, friendUserId);

        const { data: messages, error } = await db
            .from('dm_messages')
            .select('id, conversation_id, sender_id, recipient_id, message, is_visible, hidden_by, created_at')
            .eq('conversation_id', conversation)
            .order('created_at', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });

        // Filter out messages that are hidden for this user
        const visibleMessages = (messages || []).filter(m => {
            // If message is marked invisible globally
            if (m.is_visible === false) return false;
            // If user is in the hidden_by array, don't show it to them
            if (m.hidden_by && Array.isArray(m.hidden_by) && m.hidden_by.includes(userId)) return false;
            return true;
        });

        res.json({ messages: visibleMessages });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/friends/messages/send', async (req, res) => {
    const { fromUserId, toUserId, message } = req.body || {};
    if (!fromUserId || !toUserId || !message) return res.status(400).json({ error: "fromUserId, toUserId, message are required" });

    const msgText = String(message || '').trim();
    if (!msgText) return res.status(400).json({ error: "Message cannot be empty" });

    try {
        const db = supabaseAdmin || supabase;
        const conversation = conversationId(fromUserId, toUserId);

        // Optional best-effort validation: ensure they are friends
        const [f1, f2] = await Promise.all([
            db.from('friends').select('user_id').eq('user_id', fromUserId).eq('friend_user_id', toUserId).limit(1),
            db.from('friends').select('user_id').eq('user_id', toUserId).eq('friend_user_id', fromUserId).limit(1)
        ]);

        if ((f1 && f1.error) || (f2 && f2.error)) {
            console.error('Friend validation error:', (f1 && f1.error) || (f2 && f2.error));
            return res.status(500).json({ error: ((f1 && f1.error) || (f2 && f2.error)).message || 'Friend validation failed' });
        }

        const isAllowed = (f1 && f1.data && f1.data.length > 0) || (f2 && f2.data && f2.data.length > 0);
        if (!isAllowed) return res.status(403).json({ error: "You can only message accepted friends" });

        const { error: insertErr } = await db
            .from('dm_messages')
            .insert([{
                conversation_id: conversation,
                sender_id: fromUserId,
                recipient_id: toUserId,
                message: msgText
            }]);

        if (insertErr) return res.status(500).json({ error: insertErr.message });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/friends/messages/hide', async (req, res) => {
    const { userId, messageId, friendUserId } = req.body || {};
    if (!userId || !messageId || !friendUserId) return res.status(400).json({ error: "userId, messageId, and friendUserId are required" });

    try {
        const db = supabaseAdmin || supabase;
        const conversation = conversationId(userId, friendUserId);

        // First, get the current message to check if user can hide it
        const { data: message, error: fetchError } = await db
            .from('dm_messages')
            .select('id, hidden_by, sender_id, recipient_id, conversation_id')
            .eq('id', messageId)
            .eq('conversation_id', conversation)
            .single();

        if (fetchError || !message) return res.status(404).json({ error: "Message not found" });

        // Users can only hide messages in their conversations
        const isParticipant = String(message.sender_id) === String(userId) || String(message.recipient_id) === String(userId);
        if (!isParticipant) return res.status(403).json({ error: "Not authorized to hide this message" });

        // Add user to hidden_by array
        const currentHidden = message.hidden_by || [];
        if (!currentHidden.includes(userId)) {
            currentHidden.push(userId);
        }

        const { error: updateError } = await db
            .from('dm_messages')
            .update({ hidden_by: currentHidden })
            .eq('id', messageId);

        if (updateError) return res.status(500).json({ error: updateError.message });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/friends/messages/unhide', async (req, res) => {
    const { userId, messageId, friendUserId } = req.body || {};
    if (!userId || !messageId || !friendUserId) return res.status(400).json({ error: "userId, messageId, and friendUserId are required" });

    try {
        const db = supabaseAdmin || supabase;
        const conversation = conversationId(userId, friendUserId);

        // First, get the current message
        const { data: message, error: fetchError } = await db
            .from('dm_messages')
            .select('id, hidden_by, conversation_id')
            .eq('id', messageId)
            .eq('conversation_id', conversation)
            .single();

        if (fetchError || !message) return res.status(404).json({ error: "Message not found" });

        // Remove user from hidden_by array
        const currentHidden = message.hidden_by || [];
        const updatedHidden = currentHidden.filter(id => id !== userId);

        const { error: updateError } = await db
            .from('dm_messages')
            .update({ hidden_by: updatedHidden })
            .eq('id', messageId);

        if (updateError) return res.status(500).json({ error: updateError.message });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete / hide all messages in a conversation.
// mode:
// - "me": hide for requesting user only (adds userId to hidden_by for all messages)
// - "both": delete for both participants (marks is_visible=false for all messages)
app.post('/api/friends/messages/clear', async (req, res) => {
    const { userId, friendUserId, mode } = req.body || {};
    if (!userId || !friendUserId) return res.status(400).json({ error: "userId and friendUserId are required" });

    const clearMode = String(mode || 'me').toLowerCase();
    if (clearMode !== 'me' && clearMode !== 'both') {
        return res.status(400).json({ error: "mode must be 'me' or 'both'" });
    }

    try {
        const db = supabaseAdmin || supabase;
        const conversation = conversationId(userId, friendUserId);

        const { data: rows, error } = await db
            .from('dm_messages')
            .select('id, sender_id, recipient_id, conversation_id, hidden_by, is_visible')
            .eq('conversation_id', conversation);

        if (error) return res.status(500).json({ error: error.message });

        const messages = rows || [];
        if (messages.length === 0) {
            return res.json({ success: true, affected: 0 });
        }

        // Verify requester is participant in this conversation
        const isParticipant = messages.some(m =>
            String(m.sender_id) === String(userId) || String(m.recipient_id) === String(userId)
        );
        if (!isParticipant) return res.status(403).json({ error: "Not authorized to clear this conversation" });

        if (clearMode === 'both') {
            // Mark invisible globally (keeps audit trail; avoids hard deletes).
            const ids = messages.map(m => m.id);
            const { error: updErr } = await db
                .from('dm_messages')
                .update({ is_visible: false })
                .in('id', ids);
            if (updErr) return res.status(500).json({ error: updErr.message });
            return res.json({ success: true, affected: ids.length, mode: 'both' });
        }

        // Hide for me: update hidden_by arrays
        const updates = messages.map(m => {
            const currentHidden = Array.isArray(m.hidden_by) ? m.hidden_by.slice() : [];
            if (!currentHidden.includes(userId)) currentHidden.push(userId);
            return { id: m.id, hidden_by: currentHidden };
        });

        // Upsert each row's hidden_by
        // (bulk update with different arrays is not supported; do best-effort in parallel)
        await Promise.all(updates.map(u =>
            db.from('dm_messages').update({ hidden_by: u.hidden_by }).eq('id', u.id)
        ));

        return res.json({ success: true, affected: updates.length, mode: 'me' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

app.post('/api/ai-chat', async (req, res) => {
    const { model, message, history, userApiKey, provider, mode } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    if (!userApiKey) {
        return res.json({ response: "Please add your API key in Settings first." });
    }

    // Determine system prompt based on mode
    let systemPrompt = 'You are a helpful coding assistant in a code editor. Help users write code, debug issues, and answer programming questions.';
    if (mode === 'fix') {
        systemPrompt = 'You are an expert code fixer. Your job is to fix bugs and errors in code. Return ONLY the fixed code without any explanations, comments, or markdown formatting. Just return the corrected code that should replace the problematic code.';
    }

    try {
        let responseText = "";
        let usedModel = model || 'openai/gpt-3.5-turbo';
        const selectedProvider = provider || 'openrouter';

        // OpenRouter
        if (selectedProvider === 'openrouter') {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userApiKey}`,
                    'HTTP-Referer': req.headers.origin || 'http://localhost:3000',
                    'X-Title': 'Bekaei IDE'
                },
                body: JSON.stringify({
                    model: usedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...(history || []).map(msg => ({
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        })),
                        { role: 'user', content: message }
                    ],
                    temperature: 0.3,
                    max_tokens: 2000
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                responseText = data.choices[0].message.content;
            } else if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            } else {
                throw new Error('Invalid OpenRouter response: ' + JSON.stringify(data));
            }
        }
        // Groq
        else if (selectedProvider === 'groq') {
            const groqModel = model.includes('llama') ? model : 'llama3-8b-8192';
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userApiKey}`
                },
                body: JSON.stringify({
                    model: groqModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...(history || []).map(msg => ({
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        })),
                        { role: 'user', content: message }
                    ],
                    temperature: 0.3,
                    max_tokens: 2000
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                responseText = data.choices[0].message.content;
            } else if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            } else {
                throw new Error('Invalid Groq response');
            }
        }
        // Anthropic
        else if (selectedProvider === 'anthropic') {
            const claudeModel = model.includes('claude') ? model : 'claude-3-haiku-20240307';
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': userApiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: claudeModel,
                    max_tokens: 2000,
                    system: systemPrompt,
                    messages: [
                        ...(history || []).map(msg => ({
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        })),
                        { role: 'user', content: message }
                    ]
                })
            });

            const data = await response.json();
            if (data.content && data.content[0]) {
                responseText = data.content[0].text;
            } else if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            } else {
                throw new Error('Invalid Anthropic response');
            }
        }
        // OpenAI
        else if (selectedProvider === 'openai') {
            const openaiModel = model.includes('gpt') ? model : 'gpt-3.5-turbo';
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userApiKey}`
                },
                body: JSON.stringify({
                    model: openaiModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...(history || []).map(msg => ({
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        })),
                        { role: 'user', content: message }
                    ],
                    temperature: 0.3,
                    max_tokens: 2000
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                responseText = data.choices[0].message.content;
            } else if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            } else {
                throw new Error('Invalid OpenAI response');
            }
        }
        // Google
        else if (selectedProvider === 'google') {
            // Gemini API model IDs change over time; do not hardcode deprecated ones.
            // Accept model like "gemini-2.0-flash", "gemini-1.5-pro", etc.
            let googleModel = String(usedModel || '').trim();
            if (!googleModel) googleModel = 'gemini-2.0-flash';
            if (googleModel.startsWith('google/')) googleModel = googleModel.slice('google/'.length);
            if (googleModel.startsWith('models/')) googleModel = googleModel.slice('models/'.length);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(googleModel)}:generateContent?key=${userApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: systemPrompt + '\n\nUser: ' + message
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2000
                    }
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                responseText = data.candidates[0].content.parts[0].text;
            } else if (data.error) {
                const msg = data.error.message || JSON.stringify(data.error);
                if (/quota exceeded|exceeded your current quota|rate limit/i.test(msg)) {
                    throw new Error(
                        'Google Gemini quota exceeded for this API key/project. ' +
                        'Enable billing or use a key with available quota. ' +
                        'Details: ' + msg
                    );
                }
                throw new Error(msg);
            } else {
                throw new Error('Invalid Google response');
            }
        }
        else {
            throw new Error('Unknown provider: ' + selectedProvider);
        }

        res.json({ response: responseText, model: usedModel, provider: selectedProvider });
    } catch (error) {
        console.error('AI API error:', error.message);
        res.json({ error: error.message });
    }
});

app.get('/api/my-rooms', async (req, res) => {
    const userId = req.query.uid;
    if (!userId) return res.json([]);

    try {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('owner_id', userId)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/check-room', async (req, res) => {
    const { roomId, userId, password, ownerEmail } = req.body;

    if (!roomId) {
        return res.status(400).json({ error: "Project ID is required" });
    }
    const providedOwnerEmail = ownerEmail ? String(ownerEmail).trim().toLowerCase() : '';

    try {
        const { data: room, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error || !room) {
            return res.status(404).json({ error: "Project not found" });
        }

        // If ownerEmail is provided, validate ownership
        if (providedOwnerEmail) {
            if (!supabaseAdmin) {
                return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to validate ownerEmail." });
            }

            const ownerUser = await fetchAdminUserByEmail(supabaseAdmin, providedOwnerEmail);
            if (!ownerUser) {
                return res.status(404).json({ error: "Project owner not found for this email" });
            }

            if (String(room.owner_id) !== String(ownerUser.id)) {
                return res.status(403).json({ error: "Access Denied - Owner email does not match" });
            }
        }

        if (room.is_public) {
            return res.json({ success: true, room });
        }

        if (!password || password.trim() === "") {
            return res.status(401).json({ error: "Password Required", requirePass: true });
        }

        if (String(room.password) !== String(password)) {
            return res.status(403).json({ error: "❌ Incorrect Password" });
        }

        res.json({ success: true, room });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/create-room', async (req, res) => {
    const { roomId, userId, type, password, desc } = req.body;

    if (!roomId || roomId.trim() === "") {
        return res.status(400).json({ error: "Project Name (ID) is required." });
    }

    const isPublic = (type === 'public');

    if (!isPublic && (!password || password.trim() === "")) {
        return res.status(400).json({ error: "Private rooms MUST have a password." });
    }

    try {
        const { error: roomError } = await supabase
            .from('rooms')
            .upsert([{
                id: roomId.trim(),
                owner_id: userId,
                is_public: isPublic,
                password: password || "",
                description: desc || ""
            }], { onConflict: 'id' });

        if (roomError) return res.status(500).json({ error: roomError.message });

        const { data: existingFiles } = await supabase.from('files').select('id').eq('room_id', roomId.trim());
        if (!existingFiles || existingFiles.length === 0) {
            const content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${roomId}</title>
    <style>
        body {
            background: #0b0b0d;
            color: #ffffff;
            font-family: 'Inter', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 20px;
        }
        h1 { color: #6366f1; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to ${roomId}</h1>
        <p>Edit this file to start building!</p>
        <p style="color: #888; margin-top: 20px;">Your code goes here...</p>
    </div>
</body>
</html>`;
            await supabase.from('files').insert([{
                room_id: roomId.trim(),
                name: 'index.html',
                content: content,
                lang: 'html'
            }]);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/delete-room', async (req, res) => {
    const { roomId, userId } = req.body;

    try {
        const { data: room } = await supabase.from('rooms').select('owner_id,id').eq('id', roomId).single();

        
        const confirmationName = req.body && req.body.confirmationName ? String(req.body.confirmationName).trim().toLowerCase() : null;
        const isOwner = room && String(room.owner_id) === String(userId);
        const nameMatches = room && confirmationName && String(room.id).trim().toLowerCase() === confirmationName;

        if (!room || (!isOwner && !nameMatches)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await supabase.from('files').delete().eq('room_id', roomId);
        await supabase.from('rooms').delete().eq('id', roomId);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

app.post('/api/execute', (req, res) => {
    const { language, code, timeout } = req.body;

    if (!code) {
        return res.status(400).json({ error: "No code provided." });
    }

    const normalizedLanguage = String(language || '').toLowerCase();
    const tempDir = path.join(os.tmpdir(), 'bekaei-codelab-runner');
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const safeTimeout = Math.min(Math.max(parseInt(timeout, 10) || 10000, 1000), 60000);

    const runtimes = {
        javascript: { ext: 'js', command: 'node', args: (p) => [p] },
        typescript: { ext: 'ts', command: 'npx', args: (p) => ['-y', 'ts-node', p] },
        python: { ext: 'py', command: 'python', args: (p) => [p] },
        r: { ext: 'r', command: 'Rscript', args: (p) => [p] },
        ruby: { ext: 'rb', command: 'ruby', args: (p) => [p] },
        php: { ext: 'php', command: 'php', args: (p) => [p] },
        perl: { ext: 'pl', command: 'perl', args: (p) => [p] },
        bash: { ext: 'sh', command: 'bash', args: (p) => [p] },
        powershell: { ext: 'ps1', command: 'powershell', args: (p) => ['-ExecutionPolicy', 'Bypass', '-File', p] }
    };

    const runtime = runtimes[normalizedLanguage];
    if (!runtime) {
        return res.status(400).json({
            error: `Unsupported language: ${normalizedLanguage || 'unknown'}. Supported: ${Object.keys(runtimes).join(', ')}.`
        });
    }

    fs.mkdir(tempDir, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
            console.error("Error creating temp directory:", mkdirErr);
            return res.status(500).json({ error: "Failed to initialize temporary directory." });
        }

        const filePath = path.join(tempDir, `${fileName}.${runtime.ext}`);
        fs.writeFile(filePath, code, (writeErr) => {
            if (writeErr) {
                console.error("Error writing temp file:", writeErr);
                return res.status(500).json({ error: "Failed to write temporary file." });
            }

            let stdout = '';
            let stderr = '';
            let timedOut = false;
            let finished = false;
            const child = spawn(runtime.command, runtime.args(filePath), { windowsHide: true });

            const cleanupAndReply = (payload) => {
                if (finished) return;
                finished = true;
                clearTimeout(killTimer);
                fs.unlink(filePath, () => res.json(payload));
            };

            child.stdout.on('data', (chunk) => { stdout += String(chunk || ''); });
            child.stderr.on('data', (chunk) => { stderr += String(chunk || ''); });

            child.on('error', (err) => {
                cleanupAndReply({
                    error: `Runtime '${runtime.command}' is not available on this server. ${err.message}`
                });
            });

            child.on('close', (code) => {
                if (timedOut) {
                    return cleanupAndReply({ error: `Execution timed out after ${safeTimeout}ms.` });
                }
                if (code !== 0) {
                    return cleanupAndReply({ error: stderr || `Process exited with code ${code}` });
                }
                cleanupAndReply({ output: stdout, error: stderr || null });
            });

            const killTimer = setTimeout(() => {
                timedOut = true;
                child.kill();
            }, safeTimeout);
        });
    });
});

app.post('/api/save-project', async (req, res) => {
    const { roomId, userId, files } = req.body;

    if (!roomId || !userId || !files) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        await supabase.from('files').delete().eq('room_id', roomId);

        const fileData = files.map(file => ({
            room_id: roomId,
            name: file.name,
            content: file.content,
            lang: file.lang
        }));

        const { error } = await supabase.from('files').insert(fileData);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/get-room-files', async (req, res) => {
    const { roomId } = req.query;

    if (!roomId) {
        return res.status(400).json({ error: "Room ID required" });
    }

    try {
        const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at');

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ files: data || [] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/load-project', async (req, res) => {
    const { roomId, userId } = req.query;

    if (!roomId || !userId) {
        return res.status(400).json({ error: "Room ID and User ID required" });
    }

    try {
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (roomError || !room) {
            return res.status(404).json({ error: "Room not found" });
        }

        if (room.owner_id !== userId && !room.is_public) {
            return res.status(403).json({ error: "Access denied" });
        }

        const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at');

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ files: data || [] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/auth/github', (req, res) => {
    if (!GITHUB_CLIENT_ID) {
        return res.status(500).json({ error: "GitHub OAuth not configured" });
    }

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}&scope=user:email`;
    res.redirect(authUrl);
});

app.get('/auth/google', (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: "Google OAuth not configured" });
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL)}&response_type=code&scope=openid%20email%20profile&access_type=offline`;
    res.redirect(authUrl);
});

app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: "Authorization code missing" });
    }

    try {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: GITHUB_CALLBACK_URL
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        const accessToken = tokenData.access_token;

        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${accessToken}`,
                'User-Agent': 'Bekaei-IDE'
            }
        });

        const userData = await userResponse.json();

        const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
                'Authorization': `token ${accessToken}`,
                'User-Agent': 'Bekaei-IDE'
            }
        });

        const emails = await emailResponse.json();
        const primaryEmail = emails.find(email => email.primary)?.email || `${userData.id}+${userData.login}@github.com`;

        const { data: supabaseUser, error: supabaseError } = await supabase.auth.admin.createUser({
            email: primaryEmail,
            email_confirm: true,
            user_metadata: {
                provider: 'github',
                github_id: userData.id,
                username: userData.login,
                avatar_url: userData.avatar_url
            }
        });

        if (supabaseError) {
            console.error('Supabase user creation error:', supabaseError);
            const { data: existingUser, error: existingError } = await supabase
                .from('auth.users')
                .select('*')
                .eq('email', primaryEmail)
                .single();

            if (existingError || !existingUser) {
                throw new Error('Failed to create or find user');
            }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: tokenData.refresh_token || '',
            user: {
                id: supabaseUser?.id || userData.id,
                email: primaryEmail,
                app_metadata: { provider: 'github' },
                user_metadata: {
                    provider: 'github',
                    github_id: userData.id,
                    username: userData.login,
                    avatar_url: userData.avatar_url
                }
            }
        });

        if (sessionError) {
            throw new Error(sessionError.message);
        }

        res.redirect(`/?token=${session.access_token}&provider=github`);

    } catch (error) {
        console.error('GitHub OAuth error:', error);
        res.status(500).json({ error: 'GitHub authentication failed: ' + error.message });
    }
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: "Authorization code missing" });
    }

    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code: code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_CALLBACK_URL,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        const accessToken = tokenData.access_token;

        const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const userData = await userResponse.json();

        const { data: supabaseUser, error: supabaseError } = await supabase.auth.admin.createUser({
            email: userData.email,
            email_confirm: true,
            user_metadata: {
                provider: 'google',
                google_id: userData.id,
                username: userData.name,
                avatar_url: userData.picture
            }
        });

        if (supabaseError) {
            console.error('Supabase user creation error:', supabaseError);
            const { data: existingUser, error: existingError } = await supabase
                .from('auth.users')
                .select('*')
                .eq('email', userData.email)
                .single();

            if (existingError || !existingUser) {
                throw new Error('Failed to create or find user');
            }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: tokenData.refresh_token || '',
            user: {
                id: supabaseUser?.id || userData.id,
                email: userData.email,
                app_metadata: { provider: 'google' },
                user_metadata: {
                    provider: 'google',
                    google_id: userData.id,
                    username: userData.name,
                    avatar_url: userData.picture
                }
            }
        });

        if (sessionError) {
            throw new Error(sessionError.message);
        }

        res.redirect(`/?token=${session.access_token}&provider=google`);

    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(500).json({ error: 'Google authentication failed: ' + error.message });
    }
});

app.get('/auth/callback', async (req, res) => {
    const { code, provider } = req.query;

    if (!code) {
        return res.status(400).json({ error: "Authorization code missing" });
    }

    if (!provider) {
        return res.status(400).json({ error: "Provider not specified" });
    }

    try {
        let userData, accessToken, providerId, username, email, avatarUrl;

        if (provider === 'github') {
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: GITHUB_CLIENT_ID,
                    client_secret: GITHUB_CLIENT_SECRET,
                    code: code,
                    redirect_uri: GITHUB_CALLBACK_URL
                })
            });

            const tokenData = await tokenResponse.json();

            if (tokenData.error) {
                throw new Error(tokenData.error_description || tokenData.error);
            }

            accessToken = tokenData.access_token;

            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'User-Agent': 'Bekaei-IDE'
                }
            });

            userData = await userResponse.json();

            const emailResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'User-Agent': 'Bekaei-IDE'
                }
            });

            const emails = await emailResponse.json();
            email = emails.find(email => email.primary)?.email || `${userData.id}+${userData.login}@github.com`;

            providerId = userData.id;
            username = userData.login;
            avatarUrl = userData.avatar_url;

        } else if (provider === 'google') {
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    code: code,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    redirect_uri: GOOGLE_CALLBACK_URL,
                    grant_type: 'authorization_code'
                })
            });

            const tokenData = await tokenResponse.json();

            if (tokenData.error) {
                throw new Error(tokenData.error_description || tokenData.error);
            }

            accessToken = tokenData.access_token;

            const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            userData = await userResponse.json();

            providerId = userData.id;
            username = userData.name;
            email = userData.email;
            avatarUrl = userData.picture;

        } else {
            return res.status(400).json({ error: "Unsupported provider" });
        }

        const { data: supabaseUser, error: supabaseError } = await supabase.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: {
                provider: provider,
                [provider + '_id']: providerId,
                username: username,
                avatar_url: avatarUrl
            }
        });

        if (supabaseError) {
            console.error('Supabase user creation error:', supabaseError);
            const { data: existingUser, error: existingError } = await supabase
                .from('auth.users')
                .select('*')
                .eq('email', email)
                .single();

            if (existingError || !existingUser) {
                throw new Error('Failed to create or find user');
            }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '',
            user: {
                id: supabaseUser?.id || providerId,
                email: email,
                app_metadata: { provider: provider },
                user_metadata: {
                    provider: provider,
                    [provider + '_id']: providerId,
                    username: username,
                    avatar_url: avatarUrl
                }
            }
        });

        if (sessionError) {
            throw new Error(sessionError.message);
        }

        res.redirect(`/?token=${session.access_token}&provider=${provider}`);

    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).json({ error: 'Authentication failed: ' + error.message });
    }
});

app.get('/api/oauth-status', (req, res) => {
    res.json({
        githubConfigured: !!GITHUB_CLIENT_ID,
        googleConfigured: !!GOOGLE_CLIENT_ID,
        githubCallbackUrl: GITHUB_CALLBACK_URL,
        googleCallbackUrl: GOOGLE_CALLBACK_URL
    });
});

app.post('/api/delete-account', async (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId is required" });

    try {
        // Check if service role is available (required for deleting users)
        if (!supabaseAdmin) {
            return res.status(500).json({ error: "Admin access not available. Cannot delete account." });
        }

        // Delete user's rooms and files first (to clean up related data)
        const { data: rooms } = await supabaseAdmin.from('rooms').select('id').eq('owner_id', userId);
        if (rooms && rooms.length > 0) {
            const roomIds = rooms.map(r => r.id);
            await supabaseAdmin.from('files').delete().in('room_id', roomIds);
            await supabaseAdmin.from('rooms').delete().eq('owner_id', userId);
        }

        // Delete friend requests and friendships
        await supabaseAdmin.from('friend_requests').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
        await supabaseAdmin.from('friends').delete().or(`user_id.eq.${userId},friend_user_id.eq.${userId}`);
        await supabaseAdmin.from('dm_messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

        // Finally delete the user from auth.users using admin API
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;

        res.json({ success: true, message: "Account deleted successfully" });
    } catch (e) {
        console.error('Delete account error:', e);
        res.status(500).json({ error: e.message || "Failed to delete account" });
    }
});

const roomUsers = {};
const pendingFileSaves = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', async ({ HZroomId, username, avatarUrl, userId }) => {
        const roomId = HZroomId;
        if (!roomId) return;

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.username = username || 'Anon';
        socket.data.avatarUrl = avatarUrl || null;
        socket.data.userId = userId || null;

        if (!roomUsers[roomId]) roomUsers[roomId] = [];

        const existingUser = roomUsers[roomId].find(u => u.id === socket.id);
        if (!existingUser) {
            roomUsers[roomId].push({
                id: socket.id,
                username: socket.data.username,
                avatarUrl: socket.data.avatarUrl,
                userId: socket.data.userId
            });
            socket.to(roomId).emit('user-joined', { username: socket.data.username, id: socket.id });
        }

        try {
            const { data: files } = await supabase.from('files').select('id, name').eq('room_id', roomId).order('created_at');
            socket.emit('init-state', { files: files || [] });
        } catch (e) {
            console.error('Error fetching files:', e);
            socket.emit('init-state', { files: [] });
        }

        socket.emit('room-users-update', roomUsers[roomId]);
        socket.to(roomId).emit('room-users-update', roomUsers[roomId]);
    });

    socket.on('request-file-content', async ({ roomId, fileId }) => {
        if (!roomId || !fileId) return;
        try {
            const { data: file } = await supabase.from('files').select('*').eq('id', fileId).single();
            if (file) {
                socket.emit('file-content-response', file);
            }
        } catch (e) {
            console.error('Error fetching file content:', e);
        }
    });

    socket.on('chat-message', ({ roomId, message, username }) => {
        if (!roomId) return;
        io.to(roomId).emit('chat-message', { user: username, text: message });
    });

    // Stream Monaco text changes for interruption-free collaboration.
    // Client sends { roomId, fileId, changes } where changes are Monaco IModelContentChange[].
    socket.on('local-change', ({ roomId, fileId, changes }) => {
        if (!roomId || !fileId || !Array.isArray(changes) || changes.length === 0) return;

        // Broadcast to other peers in room (do not echo to sender).
        socket.to(roomId).emit('remote-change', {
            fileId,
            changes,
            fromSocketId: socket.id,
            fromUserId: socket.data.userId || null,
            at: Date.now()
        });

        // Debounced persistence: ask clients to also persist via Supabase, but keep a server-side
        // safety net to persist the latest full content if clients send it later via file-updated.
    });

    socket.on('file-updated', async ({ roomId, fileId, content }) => {
        if (!roomId || !fileId) return;
        socket.to(roomId).emit('file-updated', { fileId, content });
        try {
            // Debounce writes to reduce churn when multiple users type.
            const key = String(fileId);
            const existing = pendingFileSaves.get(key);
            if (existing) clearTimeout(existing);
            pendingFileSaves.set(key, setTimeout(async () => {
                pendingFileSaves.delete(key);
                try {
                    await supabase.from('files').update({ content }).eq('id', fileId);
                } catch (e) {
                    console.error('Error updating file (debounced):', e);
                }
            }, 600));
        } catch (e) {
            console.error('Error updating file:', e);
        }
    });

    socket.on('file-created', async ({ roomId, file }) => {
        if (!roomId || !file) return;
        try {
            const { data } = await supabase.from('files').insert([{
                room_id: roomId,
                name: file.name,
                content: file.content || '',
                lang: file.lang || 'text'
            }]).select().single();

            if (data) {
                io.to(roomId).emit('file-created', data);
            }
        } catch (e) {
            console.error('Error creating file:', e);
        }
    });

    socket.on('file-deleted', async ({ roomId, fileId }) => {
        if (!roomId || !fileId) return;
        try {
            await supabase.from('files').delete().eq('id', fileId);
            io.to(roomId).emit('file-deleted', fileId);
        } catch (e) {
            console.error('Error deleting file:', e);
        }
    });

    socket.on('disconnect', () => {
        const roomId = socket.data.roomId;
        if (roomId && roomUsers[roomId]) {
            roomUsers[roomId] = roomUsers[roomId].filter(u => u.id !== socket.id);
            io.to(roomId).emit('room-users-update', roomUsers[roomId]);

            if (roomUsers[roomId].length === 0) {
                delete roomUsers[roomId];
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

// -----------------------------------------------------------------------------
// Avatar Upload (Supabase Storage)
// -----------------------------------------------------------------------------

const multer = require('multer');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
        }
    }
});

app.post('/api/avatar/upload', requireAuthenticatedUser, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ 
                error: 'SUPABASE_SERVICE_ROLE_KEY is required for avatar uploads' 
            });
        }

        const userId = req.authUser.id;
        const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-z0-9\.\-_]/gi, '')}`;
        const filePath = `avatars/${userId}/${fileName}`;

        // Upload to Supabase Storage using service role key
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return res.status(500).json({ error: uploadError.message });
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update user's avatar_url in auth.users metadata
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { user_metadata: { 
                ...req.authUser.user_metadata,
                avatar_url: publicUrl 
            }}
        );

        if (updateError) {
            console.error('User metadata update error:', updateError);
            return res.status(500).json({ error: updateError.message });
        }

        res.json({ 
            success: true, 
            avatar_url: publicUrl 
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// -----------------------------------------------------------------------------
// Public Image Proxy for Community Posts (No Authentication Required)
// -----------------------------------------------------------------------------
// This endpoint serves community images without requiring authentication,
// making them globally accessible while keeping Supabase storage protected.
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Community Likes
// -----------------------------------------------------------------------------

app.get('/api/community/likes/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { count, error } = await (supabaseAdmin || supabase)
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/community/liked/:postId/:userId', async (req, res) => {
    try {
        const { postId, userId } = req.params;
        const { data, error } = await (supabaseAdmin || supabase)
            .from('likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        res.json({ liked: !!data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/community/like', async (req, res) => {
    try {
        const { postId, userId } = req.body;
        if (!postId || !userId) return res.status(400).json({ error: 'Missing postId or userId' });

        const { error } = await (supabaseAdmin || supabase)
            .from('likes')
            .insert({ post_id: postId, user_id: userId });

        if (error && error.code !== '23505') throw error; // Ignore unique constraint violation
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/community/unlike', async (req, res) => {
    try {
        const { postId, userId } = req.body;
        if (!postId || !userId) return res.status(400).json({ error: 'Missing postId or userId' });

        const { error } = await (supabaseAdmin || supabase)
            .from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/community/image/:userId/:filename', async (req, res) => {
    try {
        const { userId, filename } = req.params;
        const filePath = `community/${userId}/${filename}`;
        
        // Use supabaseAdmin if available, otherwise fall back to regular supabase
        const client = supabaseAdmin || supabase;
        
        // Download the file from Supabase Storage
        const { data, error } = await client.storage
            .from('uploads')
            .download(filePath);
        
        if (error) {
            console.error('[Image Proxy] Download error:', error);
            return res.status(404).json({ error: 'Image not found' });
        }
        
        if (!data) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        // Determine content type based on file extension
        const ext = filename.split('.').pop().toLowerCase();
        const contentTypeMap = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        
        // Convert data to buffer and send
        let buffer;
        if (data.arrayBuffer) {
            const arrayBuffer = await data.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else {
            buffer = Buffer.from(data);
        }
        
        res.set({
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            'Content-Length': buffer.length
        });
        
        res.send(buffer);
        
    } catch (error) {
        console.error('[Image Proxy] Error:', error);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

// -----------------------------------------------------------------------------
// Community Likes API
// -----------------------------------------------------------------------------

// Like a post
app.post('/api/community/like', async (req, res) => {
    try {
        const { postId, userId } = req.body;

        if (!postId || !userId) {
            return res.status(400).json({ error: 'postId and userId are required' });
        }

        const client = supabaseAdmin || supabase;

        // Check if already liked
        const { data: existingLike } = await client
            .from('likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existingLike) {
            return res.status(409).json({ error: 'Already liked' });
        }

        // Add like
        const { data: like, error } = await client
            .from('likes')
            .insert([{ post_id: postId, user_id: userId }])
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, like });
    } catch (error) {
        console.error('[Like] Error:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// Unlike a post
app.post('/api/community/unlike', async (req, res) => {
    try {
        const { postId, userId } = req.body;

        if (!postId || !userId) {
            return res.status(400).json({ error: 'postId and userId are required' });
        }

        const client = supabaseAdmin || supabase;

        const { error } = await client
            .from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('[Unlike] Error:', error);
        res.status(500).json({ error: 'Failed to unlike post' });
    }
});

// Get like count for a post
app.get('/api/community/likes/:postId', async (req, res) => {
    try {
        const { postId } = req.params;

        const client = supabaseAdmin || supabase;

        const { count, error } = await client
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (error) throw error;

        res.json({ count: count || 0 });
    } catch (error) {
        console.error('[Get Likes] Error:', error);
        res.status(500).json({ error: 'Failed to get likes' });
    }
});

// Check if user has liked a post
app.get('/api/community/liked/:postId/:userId', async (req, res) => {
    try {
        const { postId, userId } = req.params;

        const client = supabaseAdmin || supabase;

        const { data, error } = await client
            .from('likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        res.json({ liked: !!data });
    } catch (error) {
        console.error('[Check Like] Error:', error);
        res.status(500).json({ error: 'Failed to check like status' });
    }
});

app.get('/auth/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -----------------------------------------------------------------------------
// Community Likes API
// -----------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bekaei IDE Running on Port ${PORT}`);
    console.log(`📝 Server URL: http://localhost:${PORT}`);
});
