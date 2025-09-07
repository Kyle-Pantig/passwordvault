# Single Session Setup Instructions

## Overview
I've implemented a comprehensive single-session system that will automatically log out users from other devices when they log in from a new device. This ensures only one active session per user at any time.

## What Was Implemented

### 1. Database Table
- Created `user_sessions` table to track active sessions
- Includes user ID, session token, device info, and active status
- Automatic cleanup of old inactive sessions

### 2. API Endpoint (`/api/auth/single-session`)
- Tracks current session in database
- Marks other sessions as inactive when new login occurs
- Attempts to revoke other sessions using Supabase admin

### 3. Real-time Session Monitoring
- Added `SingleSessionProvider` component to monitor sessions
- Checks session validity every 30 seconds
- Automatically logs out if session is marked as inactive

### 4. Enhanced Auth Context
- Enforces single session on every login
- Shows notification when other sessions are revoked
- Better session state management

## Setup Steps

### 1. Run Database Migration
Execute the SQL in `create-user-sessions-table.sql` in your Supabase SQL editor:

```sql
-- Copy and paste the entire contents of create-user-sessions-table.sql
```

### 2. Deploy the Changes
The following files have been updated:
- `src/app/api/auth/single-session/route.ts` - Enhanced API endpoint
- `src/contexts/auth-context.tsx` - Added session enforcement on login
- `src/hooks/use-single-session.ts` - Real-time session monitoring
- `src/components/single-session-provider.tsx` - New component for session monitoring
- `src/app/layout.tsx` - Added SingleSessionProvider to layout

### 3. Test the Functionality

1. **Login from Device A** - Should work normally
2. **Login from Device B** - Device A should be automatically logged out
3. **Check Device A** - Should show logged out state within 30 seconds

## How It Works

1. **On Login**: 
   - New session is recorded in `user_sessions` table
   - All other active sessions for the user are marked as inactive
   - User gets notification about revoked sessions

2. **Session Monitoring**:
   - Every 30 seconds, each device checks if its session is still active
   - If session is marked as inactive, user is automatically logged out
   - This ensures immediate logout when logging in from another device

3. **Database Cleanup**:
   - Old inactive sessions are automatically cleaned up after 7 days
   - Only active sessions are kept in the database

## Troubleshooting

### If Single Session Isn't Working:

1. **Check Database**: Ensure `user_sessions` table exists and has proper permissions
2. **Check Console**: Look for errors in browser console
3. **Check Network**: Verify API calls to `/api/auth/single-session` are working
4. **Check Supabase**: Ensure RLS policies are properly set up

### Common Issues:

- **RLS Policy**: Make sure users can only see their own sessions
- **Service Role**: Admin signOut might not work without proper service role key
- **Timing**: Session checks happen every 30 seconds, so there might be a delay

## Security Features

- **Row Level Security**: Users can only access their own sessions
- **Automatic Cleanup**: Old sessions are automatically removed
- **Real-time Monitoring**: Continuous checking ensures immediate logout
- **Device Tracking**: Each session includes device information for debugging

## Next Steps

1. Run the database migration
2. Deploy the updated code
3. Test with multiple devices
4. Monitor the `user_sessions` table to verify it's working

The system should now properly enforce single-session login across all devices!
