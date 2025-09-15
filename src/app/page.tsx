'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useSubscription } from '@/contexts/subscription-context'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Zap, Smartphone, BarChart3, Database, RefreshCw, HardDrive, Search, Star, Crown, Check } from 'lucide-react'
import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'
import { Safari } from '@/components/magicui/safari'
import { motion } from 'motion/react'
import { Iphone15Pro } from '@/components/magicui/iphone-15-pro'

// DigiVault features for the infinite moving cards
const DIGIVAULT_FEATURES = [
  {
    quote: "Advanced 256-bit AES encryption ensures your passwords are protected with military-grade security standards.",
    name: "Military-Grade Encryption",
    title: "256-bit AES Security",
    icon: Shield
  },
  {
    quote: "Two-factor authentication adds an extra layer of protection to your account and sensitive data.",
    name: "Two-Factor Authentication",
    title: "2FA Protection",
    icon: Smartphone
  },
  {
    quote: "Real-time password strength analysis helps you identify and strengthen weak passwords instantly.",
    name: "Password Risk Analysis",
    title: "Smart Security Monitoring",
    icon: BarChart3
  },
  {
    quote: "End-to-end encryption ensures your data is encrypted before it leaves your device and stays secure in transit.",
    name: "End-to-End Encryption",
    title: "Zero-Knowledge Architecture",
    icon: Database
  },
  {
    quote: "Secure password generation creates strong, unique passwords for all your accounts automatically.",
    name: "Password Generator",
    title: "Smart Password Creation",
    icon: Zap
  },
  {
    quote: "Cross-platform synchronization keeps your passwords accessible and secure across all your devices.",
    name: "Cross-Platform Sync",
    title: "Universal Access",
    icon: RefreshCw
  },
  {
    quote: "Secure backup and recovery options ensure you never lose access to your important credentials.",
    name: "Secure Backup",
    title: "Data Recovery Protection",
    icon: HardDrive
  },
  {
    quote: "Dark web monitoring alerts you if your credentials are compromised in data breaches.",
    name: "Dark Web Monitoring",
    title: "Breach Detection",
    icon: Search
  }
]

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { subscription } = useSubscription()
  const { theme } = useTheme()
  const darkMode = theme === 'dark'

  // Redirect authenticated users to vault
  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/vault')
    }
  }, [user, authLoading, router])

  // Helper function to get button text based on current plan
  const getButtonText = (planName: string) => {
    const currentPlan = subscription?.plan || null
    
    if (currentPlan === planName.toUpperCase()) {
      return 'Current Plan'
    }
    
    if (!currentPlan || currentPlan === 'FREE') {
      return `Get ${planName}`
    }
    
    // For authenticated users with paid plans
    const planHierarchy = { 'FREE': 0, 'PLUS': 1, 'PRO': 2 }
    const currentLevel = planHierarchy[currentPlan as keyof typeof planHierarchy] || 0
    const targetLevel = planHierarchy[planName.toUpperCase() as keyof typeof planHierarchy] || 0
    
    if (targetLevel > currentLevel) {
      return `Upgrade to ${planName}`
    } else {
      return `Downgrade to ${planName}`
    }
  }
  
  return (
    <div className={`min-h-screen w-full overflow-hidden ${
      darkMode 
        ? 'bg-gradient-to-br from-black via-gray-900 to-black' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
        <div className="relative w-full flex flex-col items-center justify-center min-h-screen overflow-hidden">
          <div className="w-full max-w-7xl px-4 pt-32 pb-16">
            <motion.h1 
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
                delay: 0.2,
              }}
              className="relative z-10 mx-auto max-w-6xl text-center text-4xl font-bold text-gray-900 dark:text-slate-100 md:text-5xl lg:text-8xl leading-tight"
            >
              {"Secure your passwords with DigiVault"}
            </motion.h1>
            <motion.p
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.3,
                delay: 0.8,
              }}
              className="relative z-10 mx-auto max-w-3xl py-8 text-center text-xl font-normal text-gray-600 dark:text-neutral-300 leading-relaxed"
            >
              Store, manage, and protect your passwords with our secure and intuitive password manager. 
              Never forget a password again with advanced security features.
            </motion.p>
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.3,
                delay: 1,
              }}
              className="relative z-10 mt-12 flex flex-wrap items-center justify-center gap-6 pb-20  sm:pb-32"
            >
              <Button
                size="lg"
                onClick={() => router.push('/signup')}
                className="w-full max-w-xs sm:max-w-sm md:w-80 h-12 sm:h-16 text-base sm:text-lg md:text-xl font-semibold transform rounded-xl bg-black px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-white transition-all duration-300 hover:-translate-y-1 hover:bg-gray-800 hover:shadow-2xl dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:hover:shadow-2xl"
              >
                Get Started Free
              </Button>
            </motion.div>
            
            {/* Interactive Demo Section */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.3,
                delay: 1.4,
              }}
              className="relative z-10 py-16"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  See DigiVault in Action
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
                  Experience the power of secure password management with our interactive demo
                </p>
              </div>
              
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.6 }}
                  className="flex flex-col md:flex-row justify-center items-center gap-8 relative max-w-7xl mx-auto"
                >
                  <Safari
                    url="https://digivault.app/vault"
                    mode="default"
                    className="size-full max-w-4xl mx-auto shadow-md rounded-lg"
                    imageSrcs={[
                      "/vault-demo.png",
                      "/vault-demo-1.png", // Using the existing og-image as a second image
                    ]}
                    texts={[
                      "Secure Your Digital Life",
                      "Advanced Password Management"
                    ]}
                    autoRotate={true}
                    rotationInterval={5000}
                    slideDirection="horizontal"
                    animationDuration={1200}
                    showText={true}
                    textPosition="bottom"
                  />
                  
                  {/* iPhone overlay positioned inside Safari on desktop */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 2.2 }}
                    className="md:block md:absolute md:-bottom-1/2 md:right-8 md:transform md:-translate-y-1/2 md:z-20"
                    style={{ width: '300px', height: '500px' }}
                  >
                    <Iphone15Pro
                      className="size-full"
                      imageSrcs={["/mobile-demo.png", "/mobile-demo-1.png"]}
                      autoRotate={true}
                      rotationInterval={5000}
                      slideDirection="horizontal"
                      animationDuration={1200}
                    />
                  </motion.div>
                </motion.div>
            </motion.div>
            
            {/* Features Section */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.3,
                delay: 1.2,
              }}
              className="relative z-10 py-20"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Why Choose DigiVault?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Advanced security features designed to protect your digital life with cutting-edge technology
                </p>
              </div>
              <InfiniteMovingCards
                items={DIGIVAULT_FEATURES}
                direction="left"
                speed="slow"
                className="max-w-7xl mx-auto"
              />
            </motion.div>

            {/* Pricing Section */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.3,
                delay: 1.4,
              }}
              className="relative z-10 py-20"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Choose Your Plan
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Upgrade to unlock more features and storage
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Free Plan */}
                <Card className="relative border-gray-200 dark:border-gray-700">
                  <CardHeader className="text-center pb-6">
                    <div className="mx-auto mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 w-fit">
                      <Star className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">Free</CardTitle>
                    <CardDescription className="text-base text-gray-600 dark:text-gray-400">Essential password management</CardDescription>
                    <div className="mt-6">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        ₱0
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-1">
                        /month
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
                      30 credentials
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">30 password storage</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">2FA protection</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Folder lock</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">256-bit encryption</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Password generator</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Basic support</span>
                      </li>
                    </ul>

                    <Button
                      className="w-full font-medium"
                      variant="secondary"
                      onClick={() => router.push('/signup')}
                    >
                      Get Started Free
                    </Button>
                  </CardContent>
                </Card>

                {/* Plus Plan */}
                <Card className="relative border-blue-500 shadow-lg scale-105">
                  <Badge 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-xs font-medium bg-blue-600 text-white"
                  >
                    Most Popular
                  </Badge>
                  <CardHeader className="text-center pb-6">
                    <div className="mx-auto mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 w-fit">
                      <Zap className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">Plus</CardTitle>
                    <CardDescription className="text-base text-gray-600 dark:text-gray-400">Advanced features for professionals</CardDescription>
                    <div className="mt-6">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        ₱49
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-1">
                        /month
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
                      100 credentials
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">100 password storage</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">All security features</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Priority support</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Advanced analytics</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Export/Import</span>
                      </li>
                    </ul>

                    <Button
                      className="w-full font-medium"
                      variant="default"
                      onClick={() => {
                        if (!user) {
                          router.push('/signup')
                        } else {
                          router.push('/pricing')
                        }
                      }}
                    >
                      {getButtonText('Plus')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className="relative border-gray-200 dark:border-gray-700">
                  <CardHeader className="text-center pb-6">
                    <div className="mx-auto mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 w-fit">
                      <Crown className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">Pro</CardTitle>
                    <CardDescription className="text-base text-gray-600 dark:text-gray-400">Complete solution for teams</CardDescription>
                    <div className="mt-6">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        ₱149
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-1">
                        /month
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
                      Unlimited
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Unlimited password storage</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Family sharing (up to 6 users)</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Advanced security features</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Enterprise features</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Priority support</span>
                      </li>
                    </ul>

                    <Button
                      className="w-full font-medium"
                      variant="default"
                      onClick={() => {
                        if (!user) {
                          router.push('/signup')
                        } else {
                          router.push('/pricing')
                        }
                      }}
                    >
                      {getButtonText('Pro')}
                    </Button>
                  </CardContent>
                </Card>
              </div>

            </motion.div>
            
            {/* Footer */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.3,
                delay: 1.5,
              }}
              className="relative z-10 pt-20"
            >
              <Card className='bg-transparent border-none shadow-none' >
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-6">
                    {/* Links Section */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/terms')}
                          className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 text-sm"
                        >
                          Terms of Service
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/privacy')}
                          className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 text-sm"
                        >
                          Privacy Policy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/help')}
                          className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 text-sm"
                        >
                          Help & Support
                        </Button>
                      </div>
                    </div>
                    
                    {/* Copyright */}
                    <div className="text-center border-t border-gray-700 dark:border-gray-600 pt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        © {new Date().getFullYear()} DigiVault. All rights reserved.
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                        Built with security in mind
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
  )
}