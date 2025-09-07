'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { useDarkMode } from '@/contexts/dark-mode-context'
import { 
  ArrowLeft, 
  Shield, 
  Moon, 
  Sun, 
  LogOut,
  Settings,
  HelpCircle,
  AlertTriangle
} from 'lucide-react'
import { LoaderThree } from '@/components/ui/loader'
import { 
  Navbar, 
  NavBody, 
  NavItems, 
  MobileNav, 
  MobileNavHeader, 
  MobileNavMenu, 
  MobileNavToggle, 
  NavbarButton 
} from '@/components/ui/resizable-navbar'

export default function NavbarLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { darkMode, toggleDarkMode } = useDarkMode()
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Navbar items
  const navItems = [
    { name: 'Vault', link: '/' },
    { name: 'Security', link: '/security' },
    { name: 'Settings', link: '/settings' },
    { name: 'Help', link: '/help' }
  ]

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const handleSignIn = () => {
    router.push('/login')
  }

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Password Vault'
      case '/security':
        return 'Security Analysis'
      case '/settings':
        return 'Settings'
      case '/help':
        return 'Help & Support'
      case '/setup-2fa':
        return 'Setup 2FA'
      case '/verify-2fa':
        return 'Verify 2FA'
      default:
        return 'Password Vault'
    }
  }

  const getPageIcon = () => {
    switch (pathname) {
      case '/':
        return <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      case '/security':
        return <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
      case '/settings':
        return <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      case '/help':
        return <HelpCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      case '/setup-2fa':
        return <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      case '/verify-2fa':
        return <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      default:
        return <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
    }
  }

  const shouldShowBackButton = () => {
    return pathname !== '/' && !pathname.startsWith('/login') && !pathname.startsWith('/signup') && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/reset-password') && !pathname.startsWith('/verify')
  }

  // Don't show navbar on auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password') || pathname.startsWith('/verify')) {
    return <>{children}</>
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't show navbar if user is not authenticated on protected pages
  if (!user && (pathname === '/' || pathname.startsWith('/settings') || pathname.startsWith('/setup-2fa'))) {
    return <>{children}</>
  }

  // Show navbar for authenticated users on all pages (except auth pages)
  // Show navbar for unauthenticated users only on public pages (help, privacy, terms)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Resizable Navbar */}
      <Navbar>
        <NavBody>
          <div className="flex items-center space-x-2">
            {shouldShowBackButton() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {getPageIcon()}
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {getPageTitle()}
            </span>
          </div>
          
          <NavItems items={navItems} />
          
          <div className="flex items-center space-x-2 relative z-50">
            <NavbarButton
              as="button"
              onClick={toggleDarkMode}
              variant="secondary"
              className="p-2 min-w-0 w-10 h-10 flex items-center justify-center"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </NavbarButton>
            <NavbarButton
              as="button"
              onClick={user ? handleLogout : handleSignIn}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              {user ? (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Sign in</span>
                </>
              )}
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <div className="flex items-center space-x-2">
              {shouldShowBackButton() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {getPageIcon()}
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {getPageTitle()}
              </span>
            </div>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>
          
          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            <div className="flex flex-col space-y-4 w-full">
              {navItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDarkMode}
                  className="flex items-center space-x-2"
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{darkMode ? 'Light' : 'Dark'} Mode</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={user ? handleLogout : handleSignIn}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{user ? 'Logout' : 'Sign in'}</span>
                </Button>
              </div>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* Main Content */}
      <main className="pt-24">
        {children}
      </main>
    </div>
  )
}
