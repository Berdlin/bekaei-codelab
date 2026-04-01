# Fixes for Friend Requests and Avatar Upload Issues

This document outlines the fixes applied to resolve the two main issues:
1. Friend requests not appearing in incoming requests
2. Avatar upload failing with "new row may violate row level security" error

## Issues Fixed

### 1. Friend Request System

**Problem**: Friend requests were being sent successfully but not appearing in the recipient's incoming requests.

**Root Cause**: Missing or incorrect Row Level Security (RLS) policies on the `friend_requests` table, and potentially missing `SUPABASE_SERVICE_ROLE_KEY` environment variable.

**Solution**: 
- Created proper RLS policies for friend_requests, friends, and dm_messages tables
- Added server-side avatar upload endpoint that uses service role key
- Updated client-side code to use new server endpoint

### 2. Avatar Upload RLS Violation

**Problem**: Profile picture uploads were failing with "new row may violate row level security" error.

**Root Cause**: Client-side uploads to Supabase Storage were being blocked by RLS policies that didn't properly handle the storage bucket access patterns.

**Solution**:
- Created server-side upload endpoint (`/api/avatar/upload`) that uses the service role key
- Updated client-side code to use FormData and server endpoint instead of direct Supabase storage uploads
- Added proper storage bucket policies for avatars

## Required Actions

### 1. Install New Dependency

Run this command to install the required multer package:

```bash
npm install multer@1.4.5-lts.1
```

### 2. Run SQL Commands in Supabase

Execute all SQL commands in the `supabase-fixes.sql` file in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-fixes.sql`
4. Run the SQL commands

### 3. Update Environment Variables

Make sure your `.env` file includes:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find the service role key in your Supabase project settings under API keys.

## What the SQL Fixes Do

### Friend Request Tables
- **friend_requests**: Proper RLS policies allowing users to see requests sent to them or by them
- **friends**: Proper RLS policies for friend relationships
- **dm_messages**: Proper RLS policies for direct messages

### Storage Bucket
- Creates `avatars` bucket with 5MB file size limit
- Allows image types: JPEG, PNG, GIF, WebP
- Proper RLS policies allowing users to upload to their own folder and public access to view avatars

### Helper Function
- Creates `storage.foldername()` function to extract folder paths from storage paths

## Code Changes Made

### Server-side (server.js)
- Added multer dependency for file uploads
- Created `/api/avatar/upload` endpoint with proper authentication
- Uses service role key to bypass RLS restrictions for uploads
- Updates user metadata with avatar URL

### Client-side (script.js)
- Modified `uploadProfileAvatarFile()` to use server endpoint
- Modified `saveProfileChanges()` to use new upload method
- Added proper error handling and token authentication

### Dependencies (package.json)
- Added multer package for file upload handling

## Testing the Fixes

1. **Friend Requests**:
   - Send a friend request from one account to another
   - Login to the recipient account
   - Check the friends dashboard - the request should appear in incoming requests

2. **Avatar Upload**:
   - Go to profile settings
   - Click "Change" to edit profile
   - Upload a profile picture
   - Should upload successfully without RLS errors

## Troubleshooting

If issues persist:

1. **Check Environment Variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is properly set
2. **Verify SQL Execution**: Make sure all SQL commands ran successfully in Supabase
3. **Check Console**: Look for error messages in browser console and server logs
4. **Restart Server**: After installing multer and updating environment variables, restart the server

## Security Notes

- The server-side upload endpoint uses the service role key, which bypasses RLS
- File uploads are restricted to 5MB and only image file types
- Users can only upload to their own folder (avatars/{userId}/)
- The endpoint requires proper authentication via Bearer token
