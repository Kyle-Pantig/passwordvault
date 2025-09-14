# Login Attempt Rate Limiting Implementation

This document describes the implementation of login attempt rate limiting for the digivault application.

## Overview

The rate limiting system provides multiple layers of protection against brute force attacks:

1. **IP-based rate limiting**: Tracks attempts per IP address
2. **Email-based rate limiting**: Tracks attempts per email address
3. **Progressive delays**: Increases delay between attempts
4. **Temporary lockouts**: Locks accounts after multiple failed attempts

## Database Schema

### Tables Created

1. **`login_attempts_ip`**: Tracks login attempts by IP address
2. **`login_attempts_email`**: Tracks login attempts by email address

### Key Features

- **Automatic cleanup**: Old attempts (24+ hours) are automatically cleaned up
- **Progressive delays**: Each failed attempt increases the delay before the next attempt
- **Temporary lockouts**: Accounts are locked for a specified duration after max attempts
- **Dual tracking**: Both IP and email are tracked independently

## Rate Limiting Rules

### IP Address Limits
- **Max attempts**: 5 attempts per 15-minute window
- **Lockout duration**: 15 minutes
- **Progressive delay**: 30 seconds per attempt

### Email Address Limits
- **Max attempts**: 3 attempts per 15-minute window
- **Lockout duration**: 30 minutes
- **Progressive delay**: 1 minute per attempt

## Implementation Files

### Database
- `rate-limiting-schema.sql`: Database schema and functions

### Backend
- `src/lib/rate-limiting.ts`: Rate limiting utility functions
- `src/app/api/auth/login/route.ts`: Rate-limited login API endpoint
- `src/app/api/cleanup-rate-limits/route.ts`: Cleanup endpoint for old attempts
- `src/app/api/admin/rate-limit-status/route.ts`: Admin endpoint for monitoring

### Frontend
- `src/contexts/auth-context.tsx`: Updated to use rate-limited login API
- `src/app/login/page.tsx`: Updated with rate limiting UI feedback

## Usage

### Setting Up the Database

1. Run the SQL schema in your Supabase database:
   ```sql
   -- Execute the contents of rate-limiting-schema.sql
   ```

2. Set up environment variables:
   ```env
   CLEANUP_SECRET=your_cleanup_secret
   ADMIN_SECRET=your_admin_secret
   ```

### API Endpoints

#### Login with Rate Limiting
```typescript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

// Response on rate limit
{
  "success": false,
  "error": "Too many login attempts. Please try again in 15 minutes.",
  "rateLimited": true,
  "remainingAttempts": 0
}
```

#### Cleanup Old Attempts
```typescript
POST /api/cleanup-rate-limits
Authorization: Bearer your_cleanup_secret
```

#### Admin Monitoring
```typescript
GET /api/admin/rate-limit-status
Authorization: Bearer your_admin_secret
```

## Frontend Integration

The login form now provides real-time feedback:

- **Warning messages**: Shows remaining attempts before lockout
- **Lockout notifications**: Displays when account is temporarily locked
- **Progressive delays**: Button is disabled during lockout periods
- **Visual indicators**: Color-coded alerts for different states

## Security Features

1. **Dual tracking**: Both IP and email are monitored independently
2. **Progressive delays**: Each failed attempt increases the delay
3. **Automatic cleanup**: Prevents database bloat from old attempts
4. **Graceful degradation**: System fails open if rate limiting fails
5. **Admin monitoring**: Tools to monitor and manage rate limiting

## Monitoring and Maintenance

### Regular Cleanup
Set up a cron job or scheduled function to call the cleanup endpoint:

```bash
# Example cron job (runs every hour)
0 * * * * curl -X POST -H "Authorization: Bearer $CLEANUP_SECRET" https://your-domain.com/api/cleanup-rate-limits
```

### Admin Dashboard
Use the admin endpoint to monitor:
- Current locked IPs and emails
- Attempt statistics
- System health

## Configuration

Rate limiting parameters can be adjusted in the database functions:

- `max_attempts`: Maximum attempts before lockout
- `lockout_duration`: How long accounts stay locked
- `progressive_delay`: Delay increase per attempt
- `cleanup_interval`: How often old attempts are cleaned up

## Testing

To test the rate limiting:

1. Attempt login with wrong credentials multiple times
2. Observe progressive delays and warnings
3. Verify lockout after max attempts
4. Check that successful login resets attempts
5. Verify cleanup removes old attempts

## Troubleshooting

### Common Issues

1. **Rate limiting not working**: Check database functions are created correctly
2. **Cleanup not running**: Verify cleanup endpoint is being called
3. **False positives**: Adjust rate limiting parameters if needed
4. **Database performance**: Ensure indexes are created on tracking tables

### Debugging

Enable detailed logging in the rate limiting functions to debug issues:

```sql
-- Add logging to functions for debugging
RAISE NOTICE 'Rate limit check: %', attempt_record;
```
