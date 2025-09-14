"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Shield, AlertTriangle, HelpCircle } from 'lucide-react'
import { FolderLockType } from '@/lib/types'
import { toast } from 'sonner'

interface FolderRemoveLockDialogProps {
  isOpen: boolean
  onClose: () => void
  categoryId: string
  categoryName: string
  lockType: FolderLockType
  onSuccess: () => void
  remainingAttempts?: number
  lockoutUntil?: string
}

export function FolderRemoveLockDialog({ 
  isOpen, 
  onClose, 
  categoryId, 
  categoryName, 
  lockType,
  onSuccess,
  remainingAttempts,
  lockoutUntil
}: FolderRemoveLockDialogProps) {
  const [passcode, setPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPasscode, setShowForgotPasscode] = useState(false)
  const [recoveryMethod, setRecoveryMethod] = useState<'2fa' | 'email' | null>(null)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setPasscode('')
      setError('')
      setShowForgotPasscode(false)
      setRecoveryMethod(null)
      setRecoveryCode('')
      setSendingEmail(false)
      setRecoveryLoading(false)
      check2FAStatus()
    }
  }, [isOpen])

  // Check if 2FA is enabled
  const check2FAStatus = async () => {
    try {
      const response = await fetch('/api/2fa/status')
      const data = await response.json()
      setIs2FAEnabled(data.twoFactorEnabled || false)
    } catch (error) {
      setIs2FAEnabled(false)
    }
  }

  // Clear error when user starts typing
  const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasscode(e.target.value)
    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // First verify the passcode by attempting to unlock
      const verifyResponse = await fetch('/api/folder-locks/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          passcode: passcode
        })
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok) {
        if (verifyResponse.status === 423) {
          setError(`Folder locked until ${new Date(verifyData.lockout_until).toLocaleString()}`)
        } else {
          setError(verifyData.error || 'Invalid passcode')
        }
        setLoading(false)
        return
      }

      // If verification successful, proceed with lock removal
      const removeResponse = await fetch('/api/folder-locks/remove-with-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          passcode: passcode
        })
      })

      const removeData = await removeResponse.json()

      if (!removeResponse.ok) {
        setError(removeData.error || 'Failed to remove folder lock')
        setLoading(false)
        return
      }

      toast.success('Folder lock removed successfully')
      handleClose()
      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove folder lock')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasscode = () => {
    setShowForgotPasscode(true)
  }

  const handleAccountRecovery = () => {
    if (is2FAEnabled) {
      setRecoveryMethod('2fa')
    } else {
      setRecoveryMethod('email')
    }
  }

  const handleSendRecoveryEmail = async () => {
    setSendingEmail(true)
    setError('')
    
    try {
      const response = await fetch('/api/folder-locks/send-recovery-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send recovery email')
      }

      toast.success('Recovery code sent to your email')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send recovery email')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setRecoveryLoading(true)

    try {
      const response = await fetch('/api/folder-locks/recover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          recovery_method: recoveryMethod,
          recovery_data: recoveryCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Recovery failed')
        setRecoveryLoading(false)
        return
      }

      toast.success('Folder lock removed successfully via recovery')
      handleClose()
      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Recovery failed')
    } finally {
      setRecoveryLoading(false)
    }
  }

  const handleClose = () => {
    setPasscode('')
    setError('')
    setShowForgotPasscode(false)
    setRecoveryMethod(null)
    setRecoveryCode('')
    setSendingEmail(false)
    setRecoveryLoading(false)
    onClose()
  }

  const getPlaceholder = () => {
    switch (lockType) {
      case 'passcode_4':
        return 'Enter 4-digit passcode'
      case 'passcode_6':
        return 'Enter 6-digit passcode'
      case 'password':
        return 'Enter password'
      default:
        return 'Enter passcode'
    }
  }

  const getDescription = () => {
    switch (lockType) {
      case 'passcode_4':
        return 'Enter the 4-digit passcode to remove the lock'
      case 'passcode_6':
        return 'Enter the 6-digit passcode to remove the lock'
      case 'password':
        return 'Enter the password to remove the lock'
      default:
        return 'Enter the passcode to remove the lock'
    }
  }

  if (showForgotPasscode) {
    // Show recovery method selection
    if (!recoveryMethod) {
      return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-orange-600" />
                Forgot Passcode?
              </DialogTitle>
              <DialogDescription>
                We understand you've forgotten your passcode for the "{categoryName}" folder.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> For security reasons, we cannot recover your passcode. 
                  However, you have the following recovery options:
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {is2FAEnabled && (
                  <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Option 1: 2FA Code
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Use your authenticator app code or one of your backup codes to remove the folder lock.
                    </p>
                    <Button 
                      onClick={() => setRecoveryMethod('2fa')}
                      className="w-full"
                      variant="outline"
                    >
                      Use 2FA Code
                    </Button>
                  </div>
                )}

                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    {is2FAEnabled ? 'Option 2: Email Verification' : 'Option 1: Email Verification'}
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Receive a verification code via email to remove the folder lock.
                  </p>
                  <Button 
                    onClick={() => setRecoveryMethod('email')}
                    className="w-full"
                    variant="outline"
                  >
                    Use Email Verification
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowForgotPasscode(false)}>
                Back to Verification
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )
    }

    // Show recovery form
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              {recoveryMethod === '2fa' ? '2FA Recovery' : 'Email Verification Recovery'}
            </DialogTitle>
            <DialogDescription>
              {recoveryMethod === '2fa' 
                ? 'Enter your 2FA authenticator code or one of your backup codes to remove the folder lock.'
                : 'Enter the verification code sent to your email to remove the folder lock.'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            {recoveryMethod === 'email' && (
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleSendRecoveryEmail}
                  disabled={sendingEmail}
                  className="w-full"
                  variant="outline"
                >
                  {sendingEmail ? 'Sending...' : 'Send Recovery Code to Email'}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Click to send a verification code to your registered email address
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recoveryCode">
                {recoveryMethod === '2fa' ? '2FA Code' : 'Verification Code'}
              </Label>
              <Input
                id="recoveryCode"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder={recoveryMethod === '2fa' ? 'Enter 6-digit code or 6-character backup code' : 'Enter 6-digit code'}
                className="text-center text-lg tracking-widest"
                maxLength={6}
                required
              />
              {recoveryMethod === '2fa' && (
                <p className="text-xs text-gray-500 text-center">
                  Enter your authenticator app code (6 digits) or backup code (6 characters)
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setRecoveryMethod(null)}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={recoveryLoading || !recoveryCode}
              >
                {recoveryLoading ? 'Processing...' : 'Remove Lock'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Remove Folder Lock
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passcode">
              {lockType === 'password' ? 'Password' : 'Passcode'}
            </Label>
            <div className="relative">
              <Input
                id="passcode"
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={handlePasscodeChange}
                placeholder={getPlaceholder()}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="pr-10"
                maxLength={lockType === 'password' ? undefined : lockType === 'passcode_6' ? 6 : 4}
                disabled={loading}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasscode(!showPasscode)}
                disabled={loading}
              >
                {showPasscode ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {remainingAttempts !== undefined && remainingAttempts > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Remaining attempts: {remainingAttempts}
            </div>
          )}

          {lockoutUntil && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Folder locked until {new Date(lockoutUntil).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="default"
              onClick={handleForgotPasscode}
              className="text-sm bg-!none hover:bg-!none dark:text-white text-black p-0"
            >
              Forgot {lockType === 'password' ? 'Password' : 'Passcode'}?
            </Button>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !passcode}>
              {loading ? 'Removing...' : 'Remove Lock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
