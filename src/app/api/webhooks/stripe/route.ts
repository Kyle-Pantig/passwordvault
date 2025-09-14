import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

// Map Stripe price IDs to our plan types
const PRICE_TO_PLAN_MAP: Record<string, { plan: string; credentialLimit: number }> = {
  'price_1S75W8Jx1m9YGIek0oOITRBT': { plan: 'PLUS', credentialLimit: 100 },
  'price_1S75WzJx1m9YGIeknlN8cpVP': { plan: 'PRO', credentialLimit: -1 }
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');


  // For local development, skip signature verification
  let event;
  
  // Check if Stripe is properly initialized
  if (!stripe) {
    console.error('Stripe is not initialized - STRIPE_SECRET_KEY is not set');
    return NextResponse.json(
      { error: 'Stripe configuration error' },
      { status: 500 }
    );
  }

  // Check if we have a webhook secret for production
  if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } else {
    // For local development without webhook secret, parse JSON directly
    try {
      event = JSON.parse(body);
    } catch (err) {
      console.error('Failed to parse webhook body:', err);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  }

  try {
    
    const supabase = await createClient();
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;

        // Get the price ID from the subscription
        const priceId = subscription.items?.data?.[0]?.price?.id;
        if (!priceId) {
          console.error('No price ID found in subscription');
          break;
        }

        // Map price ID to plan
        const planInfo = PRICE_TO_PLAN_MAP[priceId];
        if (!planInfo) {
          console.error('Unknown price ID:', priceId);
          break;
        }

        // Get user ID from subscription metadata
        const userId = subscription.metadata?.userId;
        if (!userId) {
          console.error('No user ID in subscription metadata');
          break;
        }

        // Upsert subscription in database
        const { error: upsertError } = await supabase.rpc('upsert_subscription', {
          p_user_id: userId,
          p_stripe_subscription_id: subscription.id,
          p_stripe_customer_id: subscription.customer,
          p_plan: planInfo.plan,
          p_status: subscription.status,
          p_credential_limit: planInfo.credentialLimit,
          p_current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : new Date().toISOString(),
          p_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          p_cancel_at_period_end: subscription.cancel_at_period_end || false
        });

        if (upsertError) {
          console.error('Error upserting subscription:', upsertError);
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;

        // If this is a subscription checkout, get the subscription details
        if (session.mode === 'subscription' && session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription) as any;

            // Get the price ID from the subscription
            const priceId = subscription.items?.data?.[0]?.price?.id;
            if (!priceId) {
              console.error('No price ID found in subscription');
              break;
            }

            // Map price ID to plan
            const planInfo = PRICE_TO_PLAN_MAP[priceId];
            if (!planInfo) {
              console.error('Unknown price ID:', priceId);
              break;
            }

            // Get user ID from session metadata
            const userId = session.metadata?.userId;
            if (!userId) {
              console.error('No user ID in session metadata');
              break;
            }

            // Upsert subscription in database
            const { error: upsertError } = await supabase.rpc('upsert_subscription', {
              p_user_id: userId,
              p_stripe_subscription_id: subscription.id,
              p_stripe_customer_id: subscription.customer,
              p_plan: planInfo.plan,
              p_status: subscription.status,
              p_credential_limit: planInfo.credentialLimit,
              p_current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : new Date().toISOString(),
              p_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              p_cancel_at_period_end: subscription.cancel_at_period_end || false
            });

            if (upsertError) {
              console.error('Error upserting subscription from checkout:', upsertError);
            }
          } catch (error) {
            console.error('Error retrieving subscription from checkout:', error);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        // Update subscription status to canceled
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('Error updating canceled subscription:', updateError);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        // If this is a subscription invoice, ensure the subscription is active
        if (invoice.subscription) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription);

          if (updateError) {
            console.error('Error updating subscription after payment:', updateError);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        // If this is a subscription invoice, update status to past_due
        if (invoice.subscription) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription);

          if (updateError) {
            console.error('Error updating subscription after failed payment:', updateError);
          }
        }
        break;
      }

      default:
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
