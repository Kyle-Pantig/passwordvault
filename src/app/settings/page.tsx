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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import { useDarkMode } from '@/contexts/dark-mode-context'
import { Eye, EyeOff, Save, User, Shield, Bell, Trash2, ExternalLink, Check, X, Copy, AlertTriangle } from 'lucide-react'
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
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | 'very-strong'>('weak')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [regeneratingCodes, setRegeneratingCodes] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [verificationPassword, setVerificationPassword] = useState('')
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showViewCodesDialog, setShowViewCodesDialog] = useState(false)
  const [viewCodesPassword, setViewCodesPassword] = useState('')
  const [verifyingViewPassword, setVerifyingViewPassword] = useState(false)
  const [showViewPassword, setShowViewPassword] = useState(false)
  const [currentBackupCodes, setCurrentBackupCodes] = useState<string[]>([])
  const [showCurrentCodes, setShowCurrentCodes] = useState(false)
  const [passwordAccordionOpen, setPasswordAccordionOpen] = useState(false)
  const [singleSessionEnabled, setSingleSessionEnabled] = useState(false)
  
  const { darkMode, setDarkMode } = useDarkMode()
  const { user, loading: authLoading, updatePassword, signOut } = useAuth()
  const router = useRouter()

  // Password validation rules
  const passwordRules = [
    { text: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { text: 'At least 1 uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { text: 'At least 1 lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { text: 'At least 1 number', test: (pwd: string) => /\d/.test(pwd) },
    { text: 'At least 1 special character', test: (pwd: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) },
    { text: 'No common patterns', test: (pwd: string) => !/(.)\1{2,}/.test(pwd) && !/123|abc|qwe|asd|zxc/i.test(pwd) }
  ]

  const calculatePasswordStrength = (pwd: string) => {
    const errors: string[] = []
    let score = 0

    passwordRules.forEach(rule => {
      if (rule.test(pwd)) {
        score++
      } else {
        errors.push(rule.text)
      }
    })

    // Additional scoring based on length and complexity
    if (pwd.length >= 12) score += 1
    if (pwd.length >= 16) score += 1
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{2,}/.test(pwd)) score += 1
    if (/\d{2,}/.test(pwd)) score += 1

    setPasswordErrors(errors)

    if (score <= 2) return 'weak'
    if (score <= 4) return 'medium'
    if (score <= 6) return 'strong'
    return 'very-strong'
  }

  const handleNewPasswordChange = (newPassword: string) => {
    setNewPassword(newPassword)
    const strength = calculatePasswordStrength(newPassword)
    setPasswordStrength(strength)
  }

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'text-red-500 bg-red-50 dark:bg-red-900/20'
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'strong': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'very-strong': return 'text-green-500 bg-green-50 dark:bg-green-900/20'
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak': return 'Too Weak'
      case 'medium': return 'Medium'
      case 'strong': return 'Strong'
      case 'very-strong': return 'Very Strong'
      default: return 'Unknown'
    }
  }

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

    // Check password strength
    if (passwordStrength === 'weak') {
      toast.error('Password is too weak. Please meet all requirements.')
      return
    }

    if (passwordErrors.length > 0) {
      toast.error('Please fix all password requirements before continuing.')
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
          setBackupCodes([])
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

  const regenerateBackupCodes = async () => {
    try {
      setRegeneratingCodes(true)
      const response = await fetch('/api/2fa/regenerate-backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setBackupCodes(data.backupCodes)
        setShowBackupCodes(true)
        toast.success('New backup codes generated!')
      } else {
        toast.error(data.error || 'Failed to regenerate backup codes')
      }
    } catch (_error) {
      toast.error('Failed to regenerate backup codes')
    } finally {
      setRegeneratingCodes(false)
    }
  }

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      toast.success('Backup codes copied to clipboard!')
    } catch (_error) {
      toast.error('Failed to copy backup codes')
    }
  }

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    const blob = new Blob([`Password Vault - 2FA Backup Codes\n\n${codesText}\n\nKeep these codes safe! Each can only be used once.`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '2fa-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const verifyPasswordForBackupCodes = async () => {
    if (!verificationPassword) {
      toast.error('Please enter your password')
      return
    }

    try {
      setVerifyingPassword(true)
      
      // Verify password by attempting to sign in
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: verificationPassword,
      })

      if (error) {
        toast.error('Incorrect password. Please try again.')
        setVerificationPassword('')
        return
      }

      // Password is correct, proceed with backup code generation
      await regenerateBackupCodes()
      setShowPasswordDialog(false)
      setVerificationPassword('')
      
    } catch (_error) {
      toast.error('Failed to verify password')
    } finally {
      setVerifyingPassword(false)
    }
  }

  const handleShowBackupCodes = () => {
    setShowPasswordDialog(true)
  }

  const handleViewCurrentCodes = () => {
    setShowViewCodesDialog(true)
  }

  const verifyPasswordForViewCodes = async () => {
    if (!viewCodesPassword) {
      toast.error('Please enter your password')
      return
    }

    try {
      setVerifyingViewPassword(true)
      
      // Verify password by attempting to sign in
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: viewCodesPassword,
      })

      if (error) {
        toast.error('Incorrect password. Please try again.')
        setViewCodesPassword('')
        return
      }

      // Password is correct, fetch current backup codes
      const response = await fetch('/api/2fa/get-backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentBackupCodes(data.backupCodes)
        setShowCurrentCodes(true)
        setShowViewCodesDialog(false)
        setViewCodesPassword('')
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Failed to fetch backup codes')
      }
      
    } catch (_error) {
      toast.error('Failed to verify password')
    } finally {
      setVerifyingViewPassword(false)
    }
  }

  const copyCurrentBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(currentBackupCodes.join('\n'))
      toast.success('Backup codes copied to clipboard!')
    } catch (_error) {
      toast.error('Failed to copy backup codes')
    }
  }

  const downloadCurrentBackupCodes = () => {
    const codesText = currentBackupCodes.join('\n')
    const blob = new Blob([`Password Vault - Current 2FA Backup Codes\n\n${codesText}\n\nKeep these codes safe! Each can only be used once.`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'current-2fa-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyIndividualCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(`Copied: ${code}`)
    } catch (_error) {
      toast.error('Failed to copy code')
    }
  }

  const handlePasswordKeyPress = (e: React.KeyboardEvent, isViewCodes: boolean = false) => {
    if (e.key === 'Enter') {
      if (isViewCodes) {
        verifyPasswordForViewCodes()
      } else {
        verifyPasswordForBackupCodes()
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
              <Accordion 
                type="single" 
                collapsible 
                value={passwordAccordionOpen ? "password" : ""}
                onValueChange={(value) => setPasswordAccordionOpen(value === "password")}
              >
                <AccordionItem value="password">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>Change Password</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative mt-1">
                          <Input
                            id="current-password"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            autoComplete="current-password"
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
                            onChange={(e) => handleNewPasswordChange(e.target.value)}
                            placeholder="Enter new password"
                            autoComplete="new-password"
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
                            autoComplete="new-password"
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

                      {/* Password Strength Indicator */}
                      {newPassword && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Password Strength:</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${getStrengthColor(passwordStrength)}`}>
                              {getStrengthText(passwordStrength)}
                            </span>
                          </div>
                          
                          {/* Strength Bar */}
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                passwordStrength === 'weak' ? 'bg-red-500 w-1/4' :
                                passwordStrength === 'medium' ? 'bg-yellow-500 w-1/2' :
                                passwordStrength === 'strong' ? 'bg-blue-500 w-3/4' :
                                'bg-green-500 w-full'
                              }`}
                            />
                          </div>
                          
                          {/* Password Rules */}
                          <div className="space-y-1">
                            {passwordRules.map((rule, index) => {
                              const isValid = rule.test(newPassword)
                              return (
                                <div key={index} className="flex items-center space-x-1.5 text-xs">
                                  {isValid ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <X className="h-3 w-3 text-red-500" />
                                  )}
                                  <span className={isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    {rule.text}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <Button type="submit" disabled={isLoading} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Updating...' : 'Update Password'}
                      </Button>
                    </form>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Single Session Mode</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Logout from other devices when signing in from a new browser
                  </p>
                </div>
                <Switch
                  checked={singleSessionEnabled}
                  onCheckedChange={setSingleSessionEnabled}
                  className="cursor-pointer"
                />
              </div>
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

              {/* Backup Codes Management */}
              {twoFactorEnabled && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Backup Codes</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Generate new backup codes for emergency access
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Button
                        onClick={handleViewCurrentCodes}
                        variant="outline"
                        className="w-full"
                      >
                        View Current Backup Codes
                      </Button>
                      
                      <Button
                        onClick={handleShowBackupCodes}
                        disabled={regeneratingCodes}
                        variant="outline"
                        className="w-full"
                      >
                        {regeneratingCodes ? 'Generating...' : 'Generate New Backup Codes'}
                      </Button>
                    </div>

                    {showCurrentCodes && currentBackupCodes.length > 0 && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                Current Backup Codes
                              </h4>
                              <p className="text-sm text-blue-800 dark:text-blue-200">
                                You have {currentBackupCodes.length} backup codes remaining. Each can only be used once.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Your Backup Codes</Label>
                          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                              {currentBackupCodes.map((code, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded">
                                  <span className="flex-1">{code}</span>
                                  <button
                                    onClick={() => copyIndividualCode(code)}
                                    className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                    title="Copy this code"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={copyCurrentBackupCodes}
                            className="flex-1"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy All
                          </Button>
                          <Button
                            variant="outline"
                            onClick={downloadCurrentBackupCodes}
                            className="flex-1"
                          >
                            Download
                          </Button>
                        </div>

                        <Button
                          onClick={() => setShowCurrentCodes(false)}
                          variant="ghost"
                          className="w-full"
                        >
                          Close
                        </Button>
                      </div>
                    )}

                    {showBackupCodes && backupCodes.length > 0 && (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                Save These Backup Codes
                              </h4>
                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Each backup code can only be used once. Store them in a safe place.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>New Backup Codes</Label>
                          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                              {backupCodes.map((code, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded">
                                  <span className="flex-1">{code}</span>
                                  <button
                                    onClick={() => copyIndividualCode(code)}
                                    className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                    title="Copy this code"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={copyBackupCodes}
                            className="flex-1"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy All
                          </Button>
                          <Button
                            variant="outline"
                            onClick={downloadBackupCodes}
                            className="flex-1"
                          >
                            Download
                          </Button>
                        </div>

                        <Button
                          onClick={() => setShowBackupCodes(false)}
                          variant="ghost"
                          className="w-full"
                        >
                          Close
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
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
                autoComplete="email"
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

      {/* Password Verification Dialog for Backup Codes */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Verify Password</span>
            </DialogTitle>
            <DialogDescription>
              Enter your password to generate new backup codes. This adds an extra layer of security.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="verification-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  value={verificationPassword}
                  onChange={(e) => setVerificationPassword(e.target.value)}
                  onKeyPress={(e) => handlePasswordKeyPress(e, false)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false)
                  setVerificationPassword('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={verifyPasswordForBackupCodes}
                disabled={verifyingPassword || !verificationPassword}
                className="flex-1"
              >
                {verifyingPassword ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Generate'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Verification Dialog for Viewing Current Backup Codes */}
      <Dialog open={showViewCodesDialog} onOpenChange={setShowViewCodesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Verify Password</span>
            </DialogTitle>
            <DialogDescription>
              Enter your password to view your current backup codes. This adds an extra layer of security.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="view-codes-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="view-codes-password"
                  type={showViewPassword ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  value={viewCodesPassword}
                  onChange={(e) => setViewCodesPassword(e.target.value)}
                  onKeyPress={(e) => handlePasswordKeyPress(e, true)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowViewPassword(!showViewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showViewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowViewCodesDialog(false)
                  setViewCodesPassword('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={verifyPasswordForViewCodes}
                disabled={verifyingViewPassword || !viewCodesPassword}
                className="flex-1"
              >
                {verifyingViewPassword ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify & View'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
