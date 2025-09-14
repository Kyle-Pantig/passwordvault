# Rate Limiting Setup Guide

This guide will help you set up login attempt rate limiting for your digivault application.

## Prerequisites

- Supabase project set up
- Next.js application running
- Database access to run SQL commands

## Step 1: Database Setup

1. **Run the database schema**:
   ```sql
   -- Copy and paste the contents of rate-limiting-schema.sql into your Supabase SQL editor
   -- This creates the necessary tables and functions
   ```

2. **Verify the tables were created**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('login_attempts_ip', 'login_attempts_email');
   ```

## Step 2: Environment Variables

Add these to your `.env.local` file:

```env
# Rate limiting cleanup secret (for scheduled cleanup)
CLEANUP_SECRET=your_secure_cleanup_secret_here

# Admin secret (for monitoring rate limiting status)
ADMIN_SECRET=your_secure_admin_secret_here
```

## Step 3: Test the Implementation

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Run the test script**:
   ```bash
   node test-rate-limiting.js
   ```

3. **Manual testing**:
   - Go to `/login` page
   - Try logging in with wrong credentials multiple times
   - Observe the rate limiting warnings and lockouts

## Step 4: Set Up Cleanup (Optional but Recommended)

To prevent the database from growing too large, set up automatic cleanup:

### Option A: Cron Job (if you have server access)
```bash
# Add to your crontab (runs every hour)
0 * * * * curl -X POST -H "Authorization: Bearer $CLEANUP_SECRET" https://your-domain.com/api/cleanup-rate-limits
```

### Option B: Vercel Cron (if using Vercel)
Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cleanup-rate-limits",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Option C: Supabase Edge Functions
Create a Supabase Edge Function that calls the cleanup endpoint.

## Step 5: Monitor Rate Limiting

Use the admin endpoint to monitor rate limiting:

```bash
curl -H "Authorization: Bearer your_admin_secret" \
  https://your-domain.com/api/admin/rate-limit-status
```

## Configuration

You can adjust rate limiting parameters by modifying the database functions:

### IP Rate Limiting
- **Max attempts**: 5 (in `is_ip_rate_limited` function)
- **Lockout duration**: 15 minutes
- **Progressive delay**: 30 seconds per attempt

### Email Rate Limiting
- **Max attempts**: 3 (in `is_email_rate_limited` function)
- **Lockout duration**: 30 minutes
- **Progressive delay**: 1 minute per attempt

### Cleanup
- **Retention period**: 24 hours (in `cleanup_old_login_attempts` function)

## Troubleshooting

### Common Issues

1. **"Function does not exist" error**:
   - Make sure you ran the complete SQL schema
   - Check that functions were created in the correct schema

2. **Rate limiting not working**:
   - Verify the API route is being called (`/api/auth/login`)
   - Check browser network tab for errors
   - Ensure database functions are working

3. **TypeScript errors**:
   - Restart your TypeScript server
   - Check that all interfaces are properly updated

### Debug Steps

1. **Check database functions**:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE '%rate%';
   ```

2. **Test functions directly**:
   ```sql
   SELECT * FROM is_ip_rate_limited('127.0.0.1');
   SELECT * FROM is_email_rate_limited('test@example.com');
   ```

3. **Check API logs**:
   - Look at browser console for errors
   - Check server logs for database errors

## Security Considerations

1. **Secrets**: Use strong, unique secrets for cleanup and admin endpoints
2. **IP tracking**: Be aware that IP addresses can change (mobile users, VPNs)
3. **Email tracking**: Consider legitimate users who might forget passwords
4. **Monitoring**: Regularly check rate limiting statistics for abuse patterns

## Performance

- The system uses indexed database queries for fast lookups
- Old attempts are automatically cleaned up to prevent database bloat
- Rate limiting checks are lightweight and cached where possible

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all database functions are created correctly
3. Test with the provided test script
4. Check browser network tab for API errors
5. Review server logs for detailed error messages
