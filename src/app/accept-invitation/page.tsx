'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoaderThree } from '@/components/ui/loader'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Shield, Users } from 'lucide-react'

interface InvitationData {
  id: string
  folder_id: string
  folder_name: string
  folder_color: string
  folder_icon: string
  owner_email: string
  permission_level: string
  expires_at: string
  status: string
}

export default function AcceptInvitationPage() {
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setIsLoading(false)
      return
    }

    fetchInvitationDetails()
  }, [token])

  const fetchInvitationDetails = async () => {
    try {
      const response = await fetch(`/api/folder-sharing/invitation-details?token=${token}`)
      const data = await response.json()

      if (data.success) {
        setInvitation(data.invitation)
      } else {
        setError(data.error || 'Failed to load invitation')
      }
    } catch (error) {
      console.error('Error fetching invitation:', error)
      setError('Failed to load invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!invitation) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/folder-sharing/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
          action: 'accept'
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Invitation accepted! You can now access the shared folder.')
        router.push('/vault')
      } else {
        toast.error(data.error || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('Failed to accept invitation')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!invitation) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/folder-sharing/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
          action: 'decline'
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Invitation declined')
        router.push('/vault')
      } else {
        toast.error(data.error || 'Failed to decline invitation')
      }
    } catch (error) {
      console.error('Error declining invitation:', error)
      toast.error('Failed to decline invitation')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoaderThree />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>
              {error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/vault')} className="w-full">
              Go to Vault
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = new Date(invitation.expires_at) < new Date()
  const isAlreadyProcessed = invitation.status !== 'pending'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div 
              className="h-16 w-16 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: invitation.folder_color }}
            >
              <Shield className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">Folder Sharing Invitation</CardTitle>
          <CardDescription>
            You've been invited to access a shared folder
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {invitation.folder_name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Shared by <strong>{invitation.owner_email}</strong>
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Permission Level</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {invitation.permission_level === 'read' ? 'Read Only' : 'Read & Write'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expires</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(invitation.expires_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
              <span className={`text-sm font-medium ${
                invitation.status === 'pending' ? 'text-yellow-600' : 
                invitation.status === 'accepted' ? 'text-green-600' : 'text-red-600'
              }`}>
                {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
              </span>
            </div>
          </div>

          {isExpired && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm text-red-700 dark:text-red-400">
                  This invitation has expired
                </span>
              </div>
            </div>
          )}

          {isAlreadyProcessed && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm text-yellow-700 dark:text-yellow-400">
                  This invitation has already been {invitation.status}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">What happens next?</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                You'll be able to view and {invitation.permission_level === 'read' ? 'view' : 'edit'} credentials in this folder
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Access the shared folder from your DigiVault dashboard
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                The folder owner can revoke your access at any time
              </li>
            </ul>
          </div>

          {!isExpired && !isAlreadyProcessed && (
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={isProcessing}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <div className="h-4 w-4 mr-2 flex items-center justify-center">
                    <LoaderThree />
                  </div>
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Accept
              </Button>
            </div>
          )}

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/vault')}
              className="text-sm"
            >
              Go to Vault
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
