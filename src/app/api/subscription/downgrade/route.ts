import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, newPlan } = await request.json();

    // Verify the user is making the request for themselves
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!newPlan || newPlan !== 'FREE') {
      return NextResponse.json({ error: 'Invalid plan specified' }, { status: 400 });
    }

    // Create service client for database operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current subscription
    const { data: currentSubscription, error: subscriptionError } = await serviceSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subscriptionError) {
      console.error('Error fetching current subscription:', subscriptionError);
      return NextResponse.json({ error: 'Failed to fetch current subscription' }, { status: 500 });
    }

    // If already on FREE plan, return success
    if (currentSubscription?.plan === 'FREE') {
      return NextResponse.json({ 
        message: 'Already on Free plan',
        plan: 'FREE',
        credentialLimit: 30
      });
    }

    // Check if user has more credentials than the Free plan allows
    const { data: credentials, error: credentialsError } = await serviceSupabase
      .from('credentials')
      .select('id')
      .eq('user_id', user.id);

    if (credentialsError) {
      console.error('Error fetching credentials count:', credentialsError);
      return NextResponse.json({ error: 'Failed to check credentials count' }, { status: 500 });
    }

    const credentialCount = credentials?.length || 0;
    const freePlanLimit = 30;

    if (credentialCount > freePlanLimit) {
      return NextResponse.json({ 
        error: `Cannot downgrade to Free plan. You have ${credentialCount} credentials, but the Free plan only allows ${freePlanLimit}. Please delete some credentials first.`,
        credentialCount,
        freePlanLimit
      }, { status: 400 });
    }

    // Update subscription to FREE plan
    const { error: updateError } = await serviceSupabase
      .from('subscriptions')
      .update({
        plan: 'FREE',
        status: 'active',
        credential_limit: 30,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json({ error: 'Failed to downgrade subscription' }, { status: 500 });
    }

    // Create notification for successful downgrade
    try {
      const { createSubscriptionNotification } = await import('@/lib/notification-service');
      await createSubscriptionNotification(user.id, 'FREE', 'downgraded');
    } catch (notificationError) {
      console.error('Error creating downgrade notification:', notificationError);
      // Don't fail the downgrade if notification creation fails
    }

    // If user was on a paid plan, we should also cancel their Stripe subscription
    if (currentSubscription?.stripe_subscription_id) {
      try {
        // Note: In a production environment, you would want to cancel the Stripe subscription here
        // For now, we'll just log it since we don't have Stripe configured in this context
        console.log(`Should cancel Stripe subscription: ${currentSubscription.stripe_subscription_id}`);
        
        // TODO: Implement Stripe subscription cancellation
        // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        // await stripe.subscriptions.cancel(currentSubscription.stripe_subscription_id);
      } catch (stripeError) {
        console.error('Error canceling Stripe subscription:', stripeError);
        // Don't fail the downgrade if Stripe cancellation fails
      }
    }

    return NextResponse.json({ 
      message: 'Successfully downgraded to Free plan',
      plan: 'FREE',
      credentialLimit: 30
    });

  } catch (error) {
    console.error('Error in subscription downgrade API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
