import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a cron job or scheduled function
    // Check for API key or other authentication if needed
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'default-secret'}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current date and 3 days from now
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

    // Find subscriptions expiring in 3 days (for warning notifications)
    const { data: expiringSubscriptions, error: expiringError } = await serviceSupabase
      .from('subscriptions')
      .select('*')
      .in('plan', ['PLUS', 'PRO'])
      .eq('status', 'active')
      .not('current_period_end', 'is', null)
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', threeDaysFromNow.toISOString())
      .eq('cancel_at_period_end', false);

    if (expiringError) {
      console.error('Error fetching expiring subscriptions:', expiringError);
      return NextResponse.json({ error: 'Failed to fetch expiring subscriptions' }, { status: 500 });
    }

    // Find subscriptions that have expired (for expired notifications)
    const { data: expiredSubscriptions, error: expiredError } = await serviceSupabase
      .from('subscriptions')
      .select('*')
      .in('plan', ['PLUS', 'PRO'])
      .eq('status', 'active')
      .not('current_period_end', 'is', null)
      .lt('current_period_end', now.toISOString());

    if (expiredError) {
      console.error('Error fetching expired subscriptions:', expiredError);
      return NextResponse.json({ error: 'Failed to fetch expired subscriptions' }, { status: 500 });
    }

    const { createSubscriptionNotification } = await import('@/lib/notification-service');
    const results = {
      expiringNotifications: 0,
      expiredNotifications: 0,
      errors: [] as string[]
    };

    // Send expiring notifications
    if (expiringSubscriptions && expiringSubscriptions.length > 0) {
      for (const subscription of expiringSubscriptions) {
        try {
          // Check if we already sent a notification for this subscription in the last 24 hours
          const { data: recentNotification } = await serviceSupabase
            .from('notifications')
            .select('id')
            .eq('user_id', subscription.user_id)
            .eq('type', 'subscription_expiring')
            .gte('created_at', oneDayFromNow.toISOString())
            .limit(1);

          if (!recentNotification || recentNotification.length === 0) {
            await createSubscriptionNotification(subscription.user_id, subscription.plan, 'expiring');
            results.expiringNotifications++;
          }
        } catch (error) {
          console.error(`Error creating expiring notification for user ${subscription.user_id}:`, error);
          results.errors.push(`Failed to create expiring notification for user ${subscription.user_id}`);
        }
      }
    }

    // Handle expired subscriptions
    if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      for (const subscription of expiredSubscriptions) {
        try {
          // Update subscription to FREE plan
          const { error: updateError } = await serviceSupabase
            .from('subscriptions')
            .update({
              plan: 'FREE',
              status: 'active',
              credential_limit: 30,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', subscription.user_id);

          if (updateError) {
            console.error(`Error updating expired subscription for user ${subscription.user_id}:`, updateError);
            results.errors.push(`Failed to update expired subscription for user ${subscription.user_id}`);
            continue;
          }

          // Check if we already sent a notification for this subscription in the last 24 hours
          const { data: recentNotification } = await serviceSupabase
            .from('notifications')
            .select('id')
            .eq('user_id', subscription.user_id)
            .eq('type', 'subscription_expired')
            .gte('created_at', oneDayFromNow.toISOString())
            .limit(1);

          if (!recentNotification || recentNotification.length === 0) {
            await createSubscriptionNotification(subscription.user_id, subscription.plan, 'expired');
            results.expiredNotifications++;
          }
        } catch (error) {
          console.error(`Error handling expired subscription for user ${subscription.user_id}:`, error);
          results.errors.push(`Failed to handle expired subscription for user ${subscription.user_id}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription expiration check completed',
      results
    });

  } catch (error) {
    console.error('Error in subscription expiration check:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}
