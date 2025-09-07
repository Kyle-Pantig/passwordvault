'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock } from 'lucide-react'

interface AutoLogoutWarningProps {
  isOpen: boolean
  timeLeft: string | null
  onExtendSession: () => void
  onLogout: () => void
}

export function AutoLogoutWarning({ 
  isOpen, 
  timeLeft, 
  onExtendSession, 
  onLogout 
}: AutoLogoutWarningProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-5 w-5" />
            <span>Session Timeout Warning</span>
          </DialogTitle>
          <DialogDescription>
            You will be automatically logged out due to inactivity for security purposes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Clock className="h-6 w-6 text-orange-600" />
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-orange-600 dark:text-orange-400">
                {timeLeft}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400">
                Time remaining
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              For security reasons, you will be automatically logged out to protect your password vault.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
              Click "Stay Logged In" to extend your session, or "Logout Now" to end it immediately.
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex-1"
            >
              Logout Now
            </Button>
            <Button
              onClick={onExtendSession}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Stay Logged In
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
