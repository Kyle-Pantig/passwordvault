'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { Loader2 } from 'lucide-react'

interface HCaptchaComponentProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (error: any) => void
  onLoad?: () => void
  theme?: 'light' | 'dark'
  size?: 'normal' | 'compact'
  className?: string
}

export interface HCaptchaRef {
  reset: () => void
  execute: () => void
}

export const HCaptchaComponent = forwardRef<HCaptchaRef, HCaptchaComponentProps>(
  ({ onVerify, onExpire, onError, onLoad, theme = 'light', size = 'normal', className }, ref) => {
    const captchaRef = useRef<HCaptcha>(null)

    useImperativeHandle(ref, () => ({
      reset: () => {
        captchaRef.current?.resetCaptcha()
      },
      execute: () => {
        captchaRef.current?.execute()
      }
    }))

    const handleVerify = (token: string) => {
      onVerify(token)
    }

    const handleExpire = () => {
      onExpire?.()
    }

    const handleError = (error: any) => {
      onError?.(error)
    }

    const handleLoad = () => {
      onLoad?.()
    }

    if (!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY) {
      return (
        <div className={`flex items-center justify-center p-4 border border-gray-300 dark:border-gray-600 rounded-md ${className}`}>
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading captcha...</span>
          </div>
        </div>
      )
    }

    return (
      <div className={className}>
        <HCaptcha
          ref={captchaRef}
          sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
          onVerify={handleVerify}
          onExpire={handleExpire}
          onError={handleError}
          onLoad={handleLoad}
          theme={theme}
          size={size}
        />
      </div>
    )
  }
)

HCaptchaComponent.displayName = 'HCaptchaComponent'
