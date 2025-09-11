'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Eye, EyeOff, ExternalLink, Check, X, Shield } from 'lucide-react'
import { LoaderThree } from '@/components/ui/loader'
import { GoogleIcon } from '@/components/ui/google-icon'
import { HCaptchaComponent, HCaptchaRef } from '@/components/ui/hcaptcha'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [showLegalDialog, setShowLegalDialog] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | 'very-strong'>('weak')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  const captchaRef = useRef<HCaptchaRef>(null)
  const router = useRouter()
  const { user, loading: authLoading, signUp, signInWithGoogle, resendVerification } = useAuth()

  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/')
    }
  }, [user, authLoading, router])

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

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword)
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

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token)
    setCaptchaError(null)
  }

  const handleCaptchaExpire = () => {
    setCaptchaToken(null)
    setCaptchaError('Captcha expired. Please complete it again.')
  }

  const handleCaptchaError = (error: any) => {
    setCaptchaToken(null)
    setCaptchaError('Captcha verification failed. Please try again.')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
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

    // Check if captcha is required and completed
    if (process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY && !captchaToken) {
      setCaptchaError('Please complete the captcha verification.')
      return
    }

    // Show legal dialog instead of immediate signup
    setShowLegalDialog(true)
  }

  const handleLegalAgreement = async () => {
    if (!agreeToTerms) {
      toast.error('Please accept the Terms and Conditions and Privacy Policy to continue')
      return
    }

    setShowLegalDialog(false)
    setLoading(true)

    try {
      const result = await signUp(email, password, captchaToken || undefined)

      if (!result.success) {
        // Reset captcha on failed signup
        if (captchaRef.current) {
          captchaRef.current.reset()
        }
        setCaptchaToken(null)
        toast.error(result.error || 'Signup failed')
      } else {
        toast.success('Account created successfully! Please check your email to verify your account.')
        setSignupSuccess(true)
      }
    } catch (_error) {
      // Reset captcha on error
      if (captchaRef.current) {
        captchaRef.current.reset()
      }
      setCaptchaToken(null)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    try {
      const result = await resendVerification(email)

      if (!result.success) {
        toast.error(result.error || 'Failed to resend verification email')
      } else {
        toast.success('Verification email sent! Please check your inbox.')
      }
    } catch (_error) {
      toast.error('Failed to resend verification email')
    } finally {
      setResendLoading(false)
    }
  }

  const handleBackToSignup = () => {
    setSignupSuccess(false)
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setAgreeToTerms(false)
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)

    try {
      const result = await signInWithGoogle()

      if (!result.success) {
        toast.error(result.error || 'Google signup failed')
        return
      }

      // Google OAuth will redirect to 2FA verification page
      // The 2FA page will check if 2FA is enabled and redirect accordingly
    } catch (_error) {
      toast.error('An unexpected error occurred with Google signup')
    } finally {
      setGoogleLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your vault...</p>
        </div>
      </div>
    )
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link 
              href="/" 
              className="flex flex-col items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
            >
              <Shield className="h-8 w-8 text-blue-500" />
              <div className="text-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">DigiVault</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Secure your digital life</p>
              </div>
            </Link>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              Email verification sent to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>We've sent you a verification link to complete your registration.</p>
              <p className="mt-2">Please check your inbox and click the verification link to activate your account.</p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="w-full"
              >
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              <Button
                onClick={handleBackToSignup}
                variant="outline"
                className="w-full"
              >
                Back to Sign Up
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-blue-600 hover:underline">
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link 
            href="/" 
            className="flex flex-col items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          >
            <Shield className="h-8 w-8 text-blue-500" />
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">DigiVault</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Secure your digital life</p>
            </div>
          </Link>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Sign up to start managing your passwords securely
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Password Strength Indicator */}
            {password && (
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
                    const isValid = rule.test(password)
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
            
            {/* hCaptcha */}
            {process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY && (
              <div className="space-y-2">
                <HCaptchaComponent
                  ref={captchaRef}
                  onVerify={handleCaptchaVerify}
                  onExpire={handleCaptchaExpire}
                  onError={handleCaptchaError}
                  theme="light"
                  size="normal"
                  className="flex justify-center"
                />
                {captchaError && (
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    {captchaError}
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
          
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-card">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign Up Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <LoaderThree />
            ) : (
              <GoogleIcon className="h-4 w-4 mr-2" />
            )}
            {googleLoading ? 'Signing up with Google...' : 'Continue with Google'}
          </Button>
          
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Legal Agreement Dialog */}
      <Dialog open={showLegalDialog} onOpenChange={setShowLegalDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Terms and Conditions & Privacy Policy</DialogTitle>
            <DialogDescription>
              Please review and accept our terms before creating your account
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Terms and Conditions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Terms and Conditions</h3>
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <h4 className="font-medium mb-2">1. Acceptance of Terms</h4>
                  <p>
                    By accessing and using DigiVault ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">2. Description of Service</h4>
                  <p>
                    DigiVault is a secure password management service that allows users to store, organize, and manage their passwords and credentials in an encrypted format. The service provides features including:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Secure password storage with AES encryption</li>
                    <li>Two-factor authentication (2FA) support</li>
                    <li>Password generation and management</li>
                    <li>Secure credential sharing and access</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">3. Data Security and Privacy</h4>
                  <p>
                    We take data security seriously. Your passwords and sensitive information are encrypted using industry-standard AES encryption. We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">4. User Responsibilities</h4>
                  <p>As a user of DigiVault, you agree to:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Provide accurate and complete information during registration</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Use the service only for lawful purposes</li>
                    <li>Not attempt to gain unauthorized access to other accounts</li>
                    <li>Not share your account credentials with others</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy Policy</h3>
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <h4 className="font-medium mb-2">1. Information We Collect</h4>
                  <p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.</p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Email address</li>
                    <li>Password (encrypted and never stored in plain text)</li>
                    <li>Service names and URLs</li>
                    <li>Usernames and passwords (encrypted)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">2. Data Security</h4>
                  <p>We implement industry-standard security measures to protect your data:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li><strong>AES-256 Encryption:</strong> All sensitive data is encrypted using military-grade encryption</li>
                    <li><strong>Zero-Knowledge Architecture:</strong> We cannot access your encrypted data</li>
                    <li><strong>Secure Transmission:</strong> All data is transmitted over HTTPS</li>
                    <li><strong>Two-Factor Authentication:</strong> Additional security layer for account access</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">3. Your Rights</h4>
                  <p>You have the right to:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Access your personal data</li>
                    <li>Correct inaccurate or incomplete data</li>
                    <li>Delete your account and all associated data</li>
                    <li>Export your data in a portable format</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Full Document Links */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                For the complete terms and privacy policy, please visit:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/terms', '_blank')}
                  className="flex items-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Full Terms and Conditions</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/privacy', '_blank')}
                  className="flex items-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Full Privacy Policy</span>
                </Button>
              </div>
            </div>

            {/* Agreement Checkbox - Inside scrollable content */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="legal-terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked: boolean | 'indeterminate') => setAgreeToTerms(checked === true)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="legal-terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I have read and agree to the Terms and Conditions and Privacy Policy
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowLegalDialog(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLegalAgreement}
                disabled={loading || !agreeToTerms}
              >
                {loading ? 'Creating account...' : 'Accept and Create Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
