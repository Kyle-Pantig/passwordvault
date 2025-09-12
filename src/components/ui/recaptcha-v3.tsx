'use client'

import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { useEffect, useState } from 'react'

interface ReCaptchaV3Props {
  onTokenGenerated: (token: string) => void
  action: string
  children: React.ReactNode
}

export const ReCaptchaV3Provider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

export const ReCaptchaV3 = ({ onTokenGenerated, action, children }: ReCaptchaV3Props) => {
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (executeRecaptcha) {
      setIsReady(true)
    }
  }, [executeRecaptcha])

  const handleAction = async () => {
    if (!executeRecaptcha) {
      console.warn('reCAPTCHA not available')
      return
    }

    try {
      const token = await executeRecaptcha(action)
      onTokenGenerated(token)
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error)
    }
  }

  return (
    <div onClick={handleAction} style={{ cursor: 'pointer' }}>
      {children}
    </div>
  )
}

// Hook for programmatic token generation
export const useReCaptcha = () => {
  const { executeRecaptcha } = useGoogleReCaptcha()

  const generateToken = async (action: string): Promise<string | null> => {
    if (!executeRecaptcha) {
      console.warn('reCAPTCHA not available - this is normal if reCAPTCHA is not configured')
      return null
    }

    try {
      const token = await executeRecaptcha(action)
      if (!token) {
        console.warn('reCAPTCHA returned empty token')
        return null
      }
      return token
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error)
      return null
    }
  }

  return { generateToken }
}
