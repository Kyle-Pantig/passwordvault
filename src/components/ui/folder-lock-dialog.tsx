"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { FolderLockType } from '@/lib/types'
import { toast } from 'sonner'

interface FolderLockDialogProps {
  isOpen: boolean
  onClose: () => void
  categoryId: string
  categoryName: string
  onSuccess: () => void
  isShared?: boolean
}

export function FolderLockDialog({ 
  isOpen, 
  onClose, 
  categoryId, 
  categoryName, 
  onSuccess,
  isShared = false
}: FolderLockDialogProps) {
  const [lockType, setLockType] = useState<FolderLockType>('passcode_4')
  const [passcode, setPasscode] = useState('')
  const [confirmPasscode, setConfirmPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [showConfirmPasscode, setShowConfirmPasscode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate passcode
    if (passcode !== confirmPasscode) {
      setError('Passcodes do not match')
      setLoading(false)
      return
    }

    // Validate format based on lock type
    const formatRegex = {
      passcode_4: /^\d{4}$/,
      passcode_6: /^\d{6}$/,
      password: /^.{4,}$/
    }

    if (!formatRegex[lockType].test(passcode)) {
      setError(`Invalid format for ${lockType.replace('_', ' ')}`)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/folder-locks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          lock_type: lockType,
          passcode: passcode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create folder lock')
      }

      toast.success('Folder locked successfully')
      onSuccess()
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create folder lock')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPasscode('')
    setConfirmPasscode('')
    setError('')
    setLockType('passcode_4')
    onClose()
  }

  const getPlaceholder = () => {
    switch (lockType) {
      case 'passcode_4':
        return 'Enter 4-digit passcode'
      case 'passcode_6':
        return 'Enter 6-digit passcode'
      case 'password':
        return 'Enter password (min 4 characters)'
      default:
        return 'Enter passcode'
    }
  }

  const getDescription = () => {
    switch (lockType) {
      case 'passcode_4':
        return 'Use a 4-digit numeric passcode (e.g., 1234)'
      case 'passcode_6':
        return 'Use a 6-digit numeric passcode (e.g., 123456)'
      case 'password':
        return 'Use a password with at least 4 characters'
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md" 
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Lock Folder
          </DialogTitle>
          <DialogDescription>
            Secure the "{categoryName}" folder with a passcode or password
          </DialogDescription>
        </DialogHeader>

        {isShared && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Warning:</strong> This folder is shared with other users. Locking it will prevent shared users from accessing the folder contents. Consider revoking sharing access first if you need to lock this folder.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <Label htmlFor="lockType">Lock Type</Label>
            <Select value={lockType} onValueChange={(value: FolderLockType) => setLockType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passcode_4">4-Digit Passcode</SelectItem>
                <SelectItem value="passcode_6">6-Digit Passcode</SelectItem>
                <SelectItem value="password">Password</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">{getDescription()}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passcode">Passcode</Label>
              <div className="relative">
                <Input
                  id="passcode"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  placeholder={getPlaceholder()}
                  className="pr-10"
                  maxLength={lockType === 'password' ? undefined : lockType === 'passcode_6' ? 6 : 4}
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

          <div className="space-y-2">
            <Label htmlFor="confirmPasscode">Confirm Passcode</Label>
              <div className="relative">
                <Input
                  id="confirmPasscode"
                  type={showConfirmPasscode ? 'text' : 'password'}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  placeholder="Confirm your passcode"
                  className="pr-10"
                  maxLength={lockType === 'password' ? undefined : lockType === 'passcode_6' ? 6 : 4}
                />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowConfirmPasscode(!showConfirmPasscode)
                }}
              >
                {showConfirmPasscode ? (
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
            <Button type="submit" disabled={loading || !passcode || !confirmPasscode}>
              {loading ? 'Creating...' : 'Lock Folder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
