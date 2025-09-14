import Stripe from 'stripe';

// Initialize Stripe only if the secret key is available
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    })
  : null;

// Stripe client for frontend
export const getStripe = () => {
  if (typeof window !== 'undefined') {
    return import('@stripe/stripe-js').then(({ loadStripe }) => 
      loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
    );
  }
  return null;
};

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'DigiVault Free',
    price: 0,
    currency: 'php',
    interval: 'month',
    credentialLimit: 30,
    features: [
      '30 password storage',
      '2FA protection',
      'Folder lock',
      '256-bit encryption',
      'Password generator'
    ]
  },
  PLUS: {
    name: 'DigiVault Plus',
    price: 4900, // ₱49.00 in cents
    currency: 'php',
    interval: 'month',
    credentialLimit: 100,
    features: [
      '100 password storage',
      'All security features',
      'Priority support',
      'Advanced analytics'
    ]
  },
  PRO: {
    name: 'DigiVault Pro',
    price: 14900, // ₱149.00 in cents
    currency: 'php',
    interval: 'month',
    credentialLimit: -1, // Unlimited
    features: [
      'Unlimited password storage',
      'Family sharing',
      'Advanced security',
      'Enterprise features',
      'Priority support'
    ]
  }
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
