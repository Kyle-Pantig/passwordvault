'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useDarkMode } from '@/contexts/dark-mode-context'
import { Eye, EyeOff, Save, User, Shield, Bell, Trash2, ExternalLink } from 'lucide-react'
import { LoaderThree } from '@/components/ui/loader'

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [_emailNotifications, setEmailNotifications] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { darkMode, setDarkMode } = useDarkMode()
  const { user, loading: authLoading, updatePassword, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !authLoading) {
      loadUserSettings()
    } else if (!user && !authLoading) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const loadUserSettings = async () => {
    // Load user settings from localStorage or database
    const savedEmailNotifications = localStorage.getItem('emailNotifications') !== 'false'
    setEmailNotifications(savedEmailNotifications)
    
    // Load 2FA status from database
    try {
      const response = await fetch('/api/2fa/status')
      if (response.ok) {
        const { twoFactorEnabled } = await response.json()
        setTwoFactorEnabled(twoFactorEnabled)
      }
    } catch (_error) {
      console.error('Failed to load 2FA status:', _error)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setIsLoading(true)

    try {
      const result = await updatePassword(newPassword)

      if (!result.success) {
        toast.error(result.error || 'Failed to update password')
      } else {
        toast.success('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (_error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FAToggle = async (enabled: boolean) => {
    if (enabled) {
      // Redirect to 2FA setup
      router.push('/setup-2fa')
    } else {
      // Disable 2FA
      try {
        const response = await fetch('/api/2fa/disable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          setTwoFactorEnabled(false)
          toast.success('Two-factor authentication disabled')
        } else {
          const data = await response.json()
          toast.error(data.error || 'Failed to disable 2FA')
        }
      } catch (_error) {
        toast.error('Failed to disable 2FA')
      }
    }
  }

  const handleDeleteAccount = () => {
    setShowDeleteDialog(true)
  }

  const confirmDeleteAccount = async () => {
    if (deleteConfirmationEmail !== user?.email) {
      toast.error('Email does not match. Please enter your exact email address.')
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      toast.success(data.message || 'Account deleted successfully')
      await signOut()
      router.push('/login')
    } catch (_error) {
      toast.error('Failed to delete account. Please try again or contact support.')
      console.error('Delete account error:', _error)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeleteConfirmationEmail('')
    }
  }

  const cancelDeleteAccount = () => {
    setShowDeleteDialog(false)
    setDeleteConfirmationEmail('')
  }


  const togglePasswordVisibility = (field: string) => {
    switch (field) {
      case 'current':
        setShowCurrentPassword(!showCurrentPassword)
        break
      case 'new':
        setShowNewPassword(!showNewPassword)
        break
      case 'confirm':
        setShowConfirmPassword(!showConfirmPassword)
        break
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile</span>
              </CardTitle>
              <CardDescription>
                Manage your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Email cannot be changed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security</span>
              </CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Preferences</span>
              </CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  className="cursor-pointer"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handle2FAToggle}
                  className="cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Legal */}
          <Card>
            <CardHeader>
              <CardTitle>Legal</CardTitle>
              <CardDescription>
                Important legal information and policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Terms and Conditions</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Read our terms of service and user agreement
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/terms', '_blank')}
                  className="p-2 hover:!bg-transparent dark:text-gray-400 text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Privacy Policy</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Learn how we protect and handle your data
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/privacy', '_blank')}
                  className="p-2 hover:!bg-transparent dark:text-gray-400 text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-red-600 dark:text-red-400">Delete Account</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              <span>Delete Account</span>
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                To confirm, please type your email address:
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 font-mono">
                {user?.email}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delete-email">Email Address</Label>
              <Input
                id="delete-email"
                type="email"
                placeholder="Enter your email address"
                value={deleteConfirmationEmail}
                onChange={(e) => setDeleteConfirmationEmail(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={cancelDeleteAccount}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAccount}
              disabled={isDeleting || deleteConfirmationEmail !== user?.email}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <LoaderThree />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
