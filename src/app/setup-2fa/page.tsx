'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Shield, Copy, Check, AlertTriangle } from 'lucide-react'
import { LoaderThree } from '@/components/ui/loader'

export default function Setup2FAPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [qrCode, setQrCode] = useState('')
  const [manualKey, setManualKey] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: QR Code, 2: Verification, 3: Backup Codes
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  useEffect(() => {
    if (user && !authLoading) {
      setup2FA()
    } else if (!user && !authLoading) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const setup2FA = async () => {
    try {
      setLoading(true)
      
      // Add a small delay to ensure any previous operations are complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const response = await fetch('/api/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setQrCode(data.qrCode)
        setManualKey(data.manualEntryKey)
      } else {
        toast.error(data.error || 'Failed to setup 2FA')
      }
    } catch (error) {
      toast.error('Failed to setup 2FA')
    } finally {
      setLoading(false)
    }
  }

  const verifyToken = async () => {
    if (!token) {
      toast.error('Please enter the verification code')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, enable: true }),
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        toast.error('Invalid response from server')
        return
      }

      if (response.ok) {
        setBackupCodes(data.backupCodes)
        setStep(3)
        toast.success('2FA enabled successfully!')
      } else {
        // Handle different error response formats
        let errorMessage = 'Invalid verification code'
        
        if (data && typeof data === 'object') {
          if (data.error) {
            errorMessage = data.error
          } else if (data.message) {
            errorMessage = data.message
          }
        } else if (typeof data === 'string' && data.trim()) {
          errorMessage = data
        }
        
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error('Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
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

  const finishSetup = () => {
    router.push('/settings')
  }

  if (authLoading || (loading && step === 1)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {authLoading ? 'Loading...' : 'Setting up 2FA...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <span>Setup Two-Factor Authentication</span>
              </CardTitle>
              <CardDescription>
                Scan the QR code with your authenticator app to enable 2FA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                {qrCode ? (
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg inline-block">
                    <div className="w-48 h-48 flex items-center justify-center relative">
                      <LoaderThree />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Manual Entry Key (if you can't scan QR code)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={manualKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(manualKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Popular Authenticator Apps:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Google Authenticator</li>
                  <li>• Microsoft Authenticator</li>
                  <li>• Authy</li>
                  <li>• 1Password</li>
                </ul>
              </div>

              <Button 
                onClick={() => setStep(2)} 
                disabled={!qrCode}
                className="w-full"
              >
                I've added the account to my authenticator app
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Setup</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="token">Verification Code</Label>
                 <Input
                   id="token"
                   value={token}
                   onChange={(e) => setToken(e.target.value)}
                   onKeyPress={(e) => {
                     if (e.key === 'Enter' && token.length === 6 && !loading) {
                       verifyToken()
                     }
                   }}
                   placeholder="123456"
                   maxLength={6}
                   className="text-center text-lg font-mono"
                 />
               </div>

              <Button 
                onClick={verifyToken} 
                disabled={loading || token.length !== 6}
                className="w-full"
              >
                {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="w-full"
              >
                Back to QR Code
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Check className="h-6 w-6 text-green-600" />
                <span>2FA Enabled Successfully!</span>
              </CardTitle>
              <CardDescription>
                Save these backup codes in a safe place
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                      Important: Save These Backup Codes
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Each backup code can only be used once. Store them in a safe place.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Backup Codes</Label>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="p-2 bg-white dark:bg-gray-700 rounded">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(backupCodes.join('\n'))}
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

              <Button onClick={finishSetup} className="w-full">
                Finish Setup
              </Button>
            </CardContent>
          </Card>
        )}
    </main>
  )
}
