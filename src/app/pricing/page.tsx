'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Star, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useSubscription } from '@/contexts/subscription-context'
import { toast } from 'sonner'

const getPlans = (currentPlan: string | null) => [
  {
    name: 'Free',
    price: '₱0',
    period: '/month',
    description: 'Essential password management',
    icon: Star,
    badge: null,
    credentialLimit: 30,
    features: [
      '30 password storage',
      '2FA protection',
      'Folder lock',
      '256-bit encryption',
      'Password generator',
      'Basic support'
    ],
    buttonText: currentPlan === 'FREE' ? 'Current Plan' : 'Downgrade to Free',
    buttonVariant: currentPlan === 'FREE' ? 'outline' as const : 'secondary' as const,
    disabled: currentPlan === 'FREE'
  },
  {
    name: 'Plus',
    price: '₱49',
    period: '/month',
    description: 'Advanced features for professionals',
    icon: Zap,
    badge: null,
    credentialLimit: 100,
    features: [
      '100 password storage',
      'All security features',
      'Priority support',
      'Advanced analytics',
      'Export/Import',
    ],
    buttonText: currentPlan === 'PLUS' ? 'Current Plan' : 'Upgrade to Plus',
    buttonVariant: currentPlan === 'PLUS' ? 'outline' as const : 'default' as const,
    disabled: currentPlan === 'PLUS'
  },
  {
    name: 'Pro',
    price: '₱149',
    period: '/month',
    description: 'Complete solution for teams',
    icon: Crown,
    badge: null,
    credentialLimit: 'Unlimited',
    features: [
      'Unlimited password storage',
      'Family sharing (up to 6 users)',
      'Advanced security features',
      'Enterprise features',
      'Priority support',
    ],
    buttonText: currentPlan === 'PRO' ? 'Current Plan' : 'Upgrade to Pro',
    buttonVariant: currentPlan === 'PRO' ? 'outline' as const : 'default' as const,
    disabled: currentPlan === 'PRO'
  }
]

export default function PricingPage() {
  const { user } = useAuth()
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpgrade = async (planName: string) => {
    if (!user) {
      toast.error('Please sign in to upgrade your plan')
      return
    }

    // Don't allow upgrading to the same plan
    if (subscription?.plan === planName.toUpperCase()) {
      toast.info('You are already on this plan')
      return
    }

    setLoading(planName)
    
    try {
      const priceIds = {
        'Plus': 'price_1S75W8Jx1m9YGIek0oOITRBT', 
        'Pro': 'price_1S75WzJx1m9YGIeknlN8cpVP'   
      }

      const priceId = priceIds[planName as keyof typeof priceIds]
      
      if (!priceId) {
        toast.error('Invalid plan selected')
        return
      }
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          userId: user.id,
        }),
      })

      const result = await response.json()
      
      const { sessionId } = result

      if (sessionId) {
        // Redirect to Stripe checkout
        const stripe = await import('@stripe/stripe-js').then(mod => mod.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!))
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId })
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error('Failed to start checkout process')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            Upgrade to unlock more features and storage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {getPlans(subscription?.plan || null).map((plan) => {
            const Icon = plan.icon
            return (
              <Card 
                key={plan.name} 
                className={`relative ${
                  plan.buttonText === 'Current Plan'
                    ? 'border-blue-500 shadow-lg scale-105 bg-blue-50 dark:bg-blue-900/20' 
                    : plan.badge === 'Most Popular' 
                    ? 'border-blue-500 shadow-lg scale-105' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.buttonText === 'Current Plan' && (
                  <Badge 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-xs font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  >
                    Current Plan
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 w-fit">
                    <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                  </div>
                  <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-base text-gray-600 dark:text-gray-400">{plan.description}</CardDescription>
                  <div className="mt-6">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                      {plan.period}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
                    {typeof plan.credentialLimit === 'number' 
                      ? `${plan.credentialLimit} credentials`
                      : plan.credentialLimit
                    }
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full font-medium"
                    variant={plan.buttonVariant}
                    disabled={plan.disabled || loading === plan.name}
                    onClick={() => handleUpgrade(plan.name)}
                  >
                    {loading === plan.name ? 'Processing...' : plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
