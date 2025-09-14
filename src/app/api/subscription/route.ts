import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription from database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      
      // If table doesn't exist (PGRST116) or no rows found (PGRST116), return FREE plan
      if (subscriptionError.code === 'PGRST116') {
        return NextResponse.json({
          plan: 'FREE',
          status: 'active',
          credentialLimit: 30,
          currentPeriodEnd: null
        });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch subscription',
        details: subscriptionError.message 
      }, { status: 500 });
    }

    // If no subscription found, return default FREE plan
    if (!subscription) {
      return NextResponse.json({
        plan: 'FREE',
        status: 'active',
        credentialLimit: 30,
        currentPeriodEnd: null
      });
    }

    // Return the subscription data
    return NextResponse.json({
      plan: subscription.plan,
      status: subscription.status,
      credentialLimit: subscription.credential_limit,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

  } catch (error) {
    console.error('Error in subscription API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'refresh') {
      // This endpoint can be used to manually refresh subscription data
      // Useful for testing or manual updates
      return NextResponse.json({ message: 'Subscription refresh requested' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in subscription POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
