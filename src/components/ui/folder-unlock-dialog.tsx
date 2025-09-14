"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Eye, EyeOff, Clock } from 'lucide-react'
import { FolderLockType } from '@/lib/types'
import { toast } from 'sonner'

interface FolderUnlockDialogProps {
  isOpen: boolean
  onClose: () => void
  categoryId: string
  categoryName: string
  lockType: FolderLockType
  onSuccess: () => void
  onAutoLock?: () => void
  lockoutUntil?: string
  remainingAttempts?: number
  autoLockTimeout?: number // in minutes
}

export function FolderUnlockDialog({ 
  isOpen, 
  onClose, 
  categoryId, 
  categoryName, 
  lockType,
  onSuccess,
  onAutoLock,
  lockoutUntil,
  remainingAttempts,
  autoLockTimeout = 5 // Default 5 minutes
}: FolderUnlockDialogProps) {
  const [passcode, setPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setPasscode('')
      setError('')
    }
  }, [isOpen])

  // Clear error when user starts typing
  const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasscode(e.target.value)
    // Clear error when user starts typing
    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/folder-locks/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          passcode: passcode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 423) {
          setError(`Folder locked until ${new Date(data.lockout_until).toLocaleString()}`)
        } else {
          setError(data.error || 'Failed to unlock folder')
        }
        setLoading(false)
        return
      }

      handleClose()
      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to unlock folder')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPasscode('')
    setError('')
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

  const isLockedOut = lockoutUntil && new Date(lockoutUntil) > new Date()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md" 
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-orange-600" />
            Unlock Folder
          </DialogTitle>
          <DialogDescription>
            Enter your passcode to access the "{categoryName}" folder
          </DialogDescription>
        </DialogHeader>

        {isLockedOut ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                This folder is locked until {new Date(lockoutUntil!).toLocaleString()}
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <Label htmlFor="passcode">Passcode</Label>
              <div className="relative">
                <Input
                  id="passcode"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={handlePasscodeChange}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={getPlaceholder()}
                  className="pr-10"
                  maxLength={lockType === 'password' ? undefined : lockType === 'passcode_6' ? 6 : 4}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPasscode(!showPasscode)
                  }}
                >
                  {showPasscode ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !passcode}>
                {loading ? 'Unlocking...' : 'Unlock Folder'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
