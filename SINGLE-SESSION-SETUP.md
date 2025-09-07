# Single Session Management Setup

This document explains how to set up the single session management feature for your application.

## What is Single Session Management?

Single session management ensures that only one active session is allowed per user at a time. When a user logs in from a new device or browser, all other active sessions are automatically terminated.

## Setup Instructions

### Option 1: Using Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `setup-user-sessions.sql`
4. Run the SQL script
5. Verify that the `user_sessions` table was created successfully

### Option 2: Using the Setup Script

1. Make sure you have the required environment variables in your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run the setup script:
   ```bash
   node setup-database.js
   ```

## How It Works

1. **Session Tracking**: When a user logs in, their session information is stored in the `user_sessions` table
2. **Session Validation**: The system periodically checks if the current session is still valid
3. **Session Enforcement**: When a new session is created, all other active sessions for that user are marked as inactive
4. **Automatic Cleanup**: Old inactive sessions are automatically cleaned up

## Troubleshooting

### Common Issues

1. **401 Unauthorized Errors**
   - This usually means the `user_sessions` table doesn't exist or RLS policies are too restrictive
   - Run the setup SQL script to create the table and policies

2. **Database Connection Issues**
   - Check your Supabase credentials
   - Verify your database is accessible
   - The system will continue to work even if database operations fail (with limited functionality)

3. **Session Not Being Stored**
   - Check the browser console for error messages
   - Verify the RLS policies allow the current user to insert records
   - Make sure the `user_sessions` table exists

### Debug Information

The system provides detailed logging in the browser console:
- `SingleSessionProvider: user = logged in/not logged in` - Shows authentication state
- `Session validity check completed` - Shows when session checks are performed
- `Database operations failed` - Indicates database connectivity issues

## Testing

1. Log in to your application
2. Open the browser console
3. Look for session-related log messages
4. Check the `user_sessions` table in your Supabase dashboard
5. Try logging in from another device/browser to test session enforcement

## Configuration

The session check interval can be modified in `src/hooks/use-single-session.ts`:
```typescript
// Set up periodic checking every 60 seconds
intervalRef.current = setInterval(checkSessionValidity, 60000)
```

## Security Notes

- The system uses Row Level Security (RLS) to ensure users can only access their own sessions
- Session tokens are used as unique identifiers
- Old sessions are automatically cleaned up to prevent database bloat
- The system gracefully handles database failures to maintain user experience