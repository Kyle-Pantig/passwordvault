"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Folder, Smartphone, Key, Mail, Shield } from 'lucide-react'
import { LoaderThree } from './loader'
import { toast } from 'sonner'

interface LockedFolderExportVerificationDialogProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (verificationCode: string, verificationType: 'totp' | 'backup' | 'email') => Promise<boolean>
  lockedFolders: Array<{
    id: string
    name: string
    lockType: 'passcode_4' | 'passcode_6' | 'password'
  }>
  hasTwoFactor: boolean
  exportFormat?: string
  isLoading?: boolean
}

export function LockedFolderExportVerificationDialog({
  isOpen,
  onClose,
  onVerify,
  lockedFolders,
  hasTwoFactor,
  exportFormat,
  isLoading = false
}: LockedFolderExportVerificationDialogProps) {
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationType, setVerificationType] = useState<'totp' | 'backup' | 'email'>('totp')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showVerificationCode, setShowVerificationCode] = useState(false)

  // Set default verification type based on 2FA status
  useEffect(() => {
    if (!hasTwoFactor) {
      setVerificationType('email')
    }
  }, [hasTwoFactor])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verificationCode.trim()) {
      toast.error('Verification code is required')
      return
    }

    if (verificationType === 'totp' && verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit TOTP code')
      return
    }

    if (verificationType === 'email' && verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit email verification code')
      return
    }

    setIsSubmitting(true)
    try {
      const success = await onVerify(verificationCode, verificationType)
      if (success) {
        setVerificationCode('')
        onClose()
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendEmailCode = async () => {
    setIsSendingEmail(true)
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Verification code sent to your email')
      } else {
        toast.error(data.error || 'Failed to send verification code')
      }
    } catch (error) {
      toast.error('Failed to send verification code')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setVerificationCode('')
      onClose()
    }
  }

  const getPlaceholder = () => {
    switch (verificationType) {
      case 'totp':
        return 'Enter 6-digit TOTP code'
      case 'backup':
        return 'Enter backup code'
      case 'email':
        return 'Enter 6-digit email verification code'
      default:
        return 'Enter verification code'
    }
  }

  const getMaxLength = () => {
    switch (verificationType) {
      case 'totp':
      case 'email':
        return 6
      case 'backup':
        return 20
      default:
        return 6
    }
  }

  const lockedFoldersText = lockedFolders.length === 1 
    ? `"${lockedFolders[0].name}"` 
    : `${lockedFolders.length} folders`

  const isProtectedFormat = exportFormat && ['encrypted', 'password-protected-zip', 'encrypted-csv'].includes(exportFormat)
  const verificationReason = isProtectedFormat 
    ? 'This export format requires verification for security.'
    : `You have locked folders (${lockedFoldersText}) that need verification to continue with the export.`

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>Verify Identity for Export</span>
          </DialogTitle>
          <DialogDescription>
            {verificationReason}
            {hasTwoFactor 
              ? ' Use your 2FA method or email verification to proceed.'
              : ' Use email verification to proceed.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Verification Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Verification Method</Label>
            <div className="flex space-x-2">
              {hasTwoFactor && (
                <>
                  <Button
                    type="button"
                    variant={verificationType === 'totp' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVerificationType('totp')}
                    className="flex items-center space-x-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>TOTP</span>
                  </Button>
                  <Button
                    type="button"
                    variant={verificationType === 'backup' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVerificationType('backup')}
                    className="flex items-center space-x-2"
                  >
                    <Key className="h-4 w-4" />
                    <span>Backup</span>
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant={verificationType === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerificationType('email')}
                className="flex items-center space-x-2"
              >
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </Button>
            </div>
          </div>

          {/* Verification Code Input */}
          <div className="space-y-2">
            <Label htmlFor="verification-code">
              {verificationType === 'totp' ? 'TOTP Code' : 
               verificationType === 'backup' ? 'Backup Code' : 
               'Email Verification Code'}
            </Label>
            <div className="relative">
              <Input
                id="verification-code"
                type={showVerificationCode ? 'text' : (verificationType === 'backup' ? 'text' : 'text')}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder={getPlaceholder()}
                disabled={isSubmitting || isLoading}
                maxLength={getMaxLength()}
                className="pr-10 text-center text-lg tracking-widest"
              />
              
            </div>
            <p className="text-xs text-muted-foreground">
              {verificationType === 'totp' 
                ? 'Enter the 6-digit code from your authenticator app'
                : verificationType === 'backup'
                ? 'Enter one of your backup codes (single use)'
                : 'Enter the 6-digit code sent to your email'
              }
            </p>
          </div>
          {/* Send Email Code Button */}
          {verificationType === 'email' && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendEmailCode}
                disabled={isSendingEmail || isSubmitting || isLoading}
                className="w-full"
              >
                {isSendingEmail ? (
                  <>
                    <LoaderThree/>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Locked Folders Info */}
          {lockedFolders.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Locked Folders</p>
                  <p>
                    {lockedFolders.map(folder => folder.name).join(', ')} will be included in the export after verification.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading || !verificationCode.trim()}
            >
              {isSubmitting || isLoading ? (
                <>
                  <LoaderThree/>
                  Verifying...
                </>
              ) : (
                <>
                  <Folder className="h-4 w-4 mr-2" />
                  Verify & Continue Export
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
