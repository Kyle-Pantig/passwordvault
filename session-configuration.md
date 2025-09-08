# Session Configuration - 1 Hour Timeout

## Overview
This document explains how to configure your password vault to have 1-hour session timeouts.

## Supabase Configuration Required

To set the session duration to 1 hour, you need to configure this in your Supabase project dashboard:

### Steps:
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Find the **JWT Settings** section
4. Set **JWT expiry limit** to `3600` seconds (1 hour)
5. Save the changes

### Alternative: Using Supabase CLI
You can also set this via the Supabase CLI:

```bash
supabase projects update --project-ref YOUR_PROJECT_REF --jwt-expiry 3600
```

## Code Implementation

The application code has been updated to:

1. **Auto-refresh tokens** before they expire
2. **Check session expiry** every minute
3. **Automatically sign out** users when sessions expire
4. **Handle session refresh failures** gracefully

### Key Features:
- Sessions automatically refresh 5 minutes before expiry
- Users are signed out immediately when sessions expire
- Session state is properly managed across browser refreshes
- Middleware handles session validation on protected routes

## Testing

To test the 1-hour session timeout:

1. Log in to your application
2. Wait for 1 hour (or temporarily set a shorter timeout for testing)
3. Try to access a protected page
4. You should be automatically redirected to the login page

## Security Benefits

- **Reduced attack window**: Shorter sessions limit exposure if credentials are compromised
- **Automatic cleanup**: Expired sessions are automatically invalidated
- **Better security posture**: Follows security best practices for session management

## Notes

- The session duration is controlled by Supabase, not the client code
- Users will need to re-authenticate after 1 hour of inactivity
- Active users will have their sessions automatically refreshed
- All session management is handled securely by Supabase
