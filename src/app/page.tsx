'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Zap, Smartphone, BarChart3, Database, RefreshCw, HardDrive, Search } from 'lucide-react'
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
  const { theme } = useTheme()
  const darkMode = theme === 'dark'

  // Redirect authenticated users to vault
  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/vault')
    }
  }, [user, authLoading, router])
  
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
              className="relative z-10 mx-auto max-w-4xl text-center text-2xl font-bold text-gray-900 dark:text-slate-300 md:text-4xl lg:text-7xl"
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
              className="relative z-10 mx-auto max-w-xl py-4 text-center text-lg font-normal text-gray-600 dark:text-neutral-400"
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
              className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              <Button
                size="lg"
                onClick={() => router.push('/signup')}
                className="w-60 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/login')}
                className="w-60 transform rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-900"
              >
                Sign In
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
              className="relative z-10 mt-20 mb-16"
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
              className="relative z-10 mt-16 mb-8"
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
              className="relative z-10 mt-20"
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