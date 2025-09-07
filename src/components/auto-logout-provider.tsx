'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useAutoLogout } from '@/hooks/use-auto-logout'
import { AutoLogoutWarning } from './auto-logout-warning'

interface AutoLogoutProviderProps {
  children: React.ReactNode
}

export function AutoLogoutProvider({ children }: AutoLogoutProviderProps) {
  const { user } = useAuth()
  const [autoLogoutSettings, setAutoLogoutSettings] = useState({
    enabled: true,
    timeoutMinutes: 30 // Fixed at 30 minutes
  })

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('autoLogoutSettings')
    if (savedSettings) {
      try {
        setAutoLogoutSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Error loading auto-logout settings:', error)
      }
    }
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('autoLogoutSettings', JSON.stringify(autoLogoutSettings))
  }, [autoLogoutSettings])

  const {
    showWarning,
    timeLeft,
    extendSession,
    resetTimers
  } = useAutoLogout({
    timeoutMinutes: autoLogoutSettings.timeoutMinutes,
    warningMinutes: 5,
    enabled: autoLogoutSettings.enabled && !!user
  })

  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  // Listen for settings changes from other components
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent) => {
      if (event.detail.type === 'autoLogout') {
        setAutoLogoutSettings({
          enabled: event.detail.settings.enabled,
          timeoutMinutes: 30 // Always 30 minutes
        })
      }
    }

    window.addEventListener('autoLogoutSettingsChange', handleSettingsChange as EventListener)
    return () => {
      window.removeEventListener('autoLogoutSettingsChange', handleSettingsChange as EventListener)
    }
  }, [])

  return (
    <>
      {children}
      <AutoLogoutWarning
        isOpen={showWarning}
        timeLeft={timeLeft}
        onExtendSession={extendSession}
        onLogout={handleLogout}
      />
    </>
  )
}
