# Subscription Notifications

This document explains the subscription notification system that has been implemented to notify users about subscription events.

## Features

### 1. Subscription Upgrade Notifications
- **When**: Users successfully subscribe to Plus or Pro plans
- **Trigger**: Stripe webhook events (`customer.subscription.created`, `customer.subscription.updated`, `checkout.session.completed`)
- **Notification**: "Subscription Upgraded! 🎉" with plan details

### 2. Subscription Downgrade Notifications
- **When**: Users downgrade to Free plan
- **Trigger**: Manual downgrade via pricing page
- **Notification**: "Subscription Downgraded" with plan details

### 3. Subscription Expiration Warnings
- **When**: Subscriptions are expiring in 3 days
- **Trigger**: Scheduled check (cron job)
- **Notification**: "Subscription Expiring Soon ⚠️" with renewal reminder

### 4. Subscription Expired Notifications
- **When**: Subscriptions have expired
- **Trigger**: Scheduled check (cron job)
- **Notification**: "Subscription Expired" and automatic downgrade to Free plan

## Implementation Details

### Notification Service
The notification system is implemented in `src/lib/notification-service.ts` with the following function:

```typescript
createSubscriptionNotification(
  userId: string,
  plan: string,
  action: 'upgraded' | 'downgraded' | 'expiring' | 'expired'
)
```

### API Endpoints

#### 1. Subscription Expiration Check
- **Endpoint**: `POST /api/subscription/check-expiring`
- **Purpose**: Check for expiring/expired subscriptions and send notifications
- **Authentication**: Bearer token (CRON_SECRET)
- **Usage**: Should be called by a cron job

#### 2. Subscription Downgrade
- **Endpoint**: `POST /api/subscription/downgrade`
- **Purpose**: Downgrade user to Free plan
- **Authentication**: User session
- **Notification**: Automatically creates downgrade notification

### Stripe Webhook Integration
The Stripe webhook (`src/app/api/webhooks/stripe/route.ts`) has been updated to create notifications when:
- Users successfully subscribe to paid plans
- Subscription status changes

## Setting Up Automated Expiration Checks

### Option 1: Cron Job (Recommended for Production)

Set up a cron job to run the expiration check daily:

```bash
# Add to crontab (run daily at 9 AM)
0 9 * * * cd /path/to/your/app && node scripts/check-subscription-expiration.js
```

### Option 2: Manual Execution

Run the script manually for testing:

```bash
node scripts/check-subscription-expiration.js
```

### Option 3: External Cron Service

Use services like:
- **Vercel Cron Jobs** (if deployed on Vercel)
- **GitHub Actions** (for scheduled tasks)
- **Railway Cron** (if deployed on Railway)
- **AWS Lambda with EventBridge**

Example Vercel cron configuration in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/subscription/check-expiring",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## Environment Variables

Add these environment variables to your `.env.local`:

```env
# Required for cron job authentication
CRON_SECRET=your-secure-secret-key

# Required for API URL (used by the script)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Notification Types

The system creates notifications with the following types:
- `subscription_upgraded` - When user upgrades to paid plan
- `subscription_downgraded` - When user downgrades to Free plan
- `subscription_expiring` - When subscription expires in 3 days
- `subscription_expired` - When subscription has expired

## Database Schema

Notifications are stored in the `notifications` table with the following structure:
- `type`: Notification type (e.g., 'subscription_upgraded')
- `title`: Notification title
- `message`: Notification message
- `data`: Additional data (plan info, action type)
- `user_id`: Target user ID
- `is_read`: Read status
- `created_at`: Creation timestamp

## Testing

### Test Subscription Notifications
1. Subscribe to a Plus or Pro plan
2. Check the notification bell for upgrade notification

### Test Downgrade Notifications
1. Go to pricing page
2. Click "Downgrade to Free"
3. Check the notification bell for downgrade notification

### Test Expiration Notifications
1. Manually run the expiration check script:
   ```bash
   node scripts/check-subscription-expiration.js
   ```
2. Or call the API directly:
   ```bash
   curl -X POST https://your-domain.com/api/subscription/check-expiring \
     -H "Authorization: Bearer your-cron-secret"
   ```

## Monitoring

The system logs all notification creation attempts and errors. Check your application logs for:
- Successful notification creation
- Failed notification attempts
- Subscription expiration check results

## Security Considerations

1. **Cron Secret**: Use a strong, random secret for `CRON_SECRET`
2. **Rate Limiting**: The expiration check prevents duplicate notifications within 24 hours
3. **Error Handling**: Failed notifications don't break the subscription process
4. **Authentication**: All endpoints require proper authentication

## Troubleshooting

### Common Issues

1. **Notifications not being created**
   - Check if the notification service is properly imported
   - Verify database connection and permissions
   - Check application logs for errors

2. **Expiration check not working**
   - Verify `CRON_SECRET` environment variable
   - Check if the script has proper permissions
   - Ensure the API endpoint is accessible

3. **Duplicate notifications**
   - The system prevents duplicates within 24 hours
   - Check if multiple cron jobs are running
   - Verify the duplicate prevention logic

### Debug Mode

Set `NODE_ENV=development` to get more detailed error messages in API responses.
