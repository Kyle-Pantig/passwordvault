'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import { Eye, EyeOff, Copy, Edit, Trash2, MoreVertical, ExternalLink, AlertTriangle, AlertCircle } from 'lucide-react'
import { Credential, } from '@/lib/types'
import Image from 'next/image'

interface DynamicCredentialCardProps {
  credential: Credential
  onEdit: (credential: Credential) => void
  onDelete: (credential: Credential) => void
  visiblePasswords: Set<string>
  onTogglePasswordVisibility: (id: string) => void
  securityIssues?: {
    isWeak: boolean
    isReused: boolean
    strength: string | null
  }
}

// Define fallback services for favicon loading
const FAVICON_SERVICES: Array<'duckduckgo' | 'faviconio' | 'direct'> = ['duckduckgo', 'faviconio', 'direct']

export function DynamicCredentialCard({ 
  credential, 
  onEdit, 
  onDelete, 
  visiblePasswords, 
  onTogglePasswordVisibility,
  securityIssues = { isWeak: false, isReused: false, strength: null }
}: DynamicCredentialCardProps) {
  const [imageError, setImageError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState('')
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0)

  const getFaviconServiceUrl = (url: string, service: 'duckduckgo' | 'faviconio' | 'direct'): string => {
    try {
      if (!url || url.trim() === '') return ''
      const domain = new URL(url).hostname
      
      switch (service) {
        case 'duckduckgo':
          return `https://icons.duckduckgo.com/ip3/${domain}.ico`
        case 'faviconio':
          return `https://favicons.githubusercontent.com/${domain}`
        case 'direct':
          return `${new URL(url).origin}/favicon.ico`
        default:
          return `https://icons.duckduckgo.com/ip3/${domain}.ico`
      }
    } catch {
      return ''
    }
  }

  const ServiceIcon = () => {
    React.useEffect(() => {
      if (credential.service_url && credential.service_url.trim() !== '') {
        const faviconUrl = getFaviconServiceUrl(credential.service_url, FAVICON_SERVICES[currentServiceIndex])
        if (faviconUrl) {
          setCurrentSrc(faviconUrl)
          setImageError(false)
        } else {
          setImageError(true)
        }
      } else {
        setImageError(true)
      }
    }, [credential.service_url, currentServiceIndex])

    const handleImageError = () => {
      if (currentServiceIndex < FAVICON_SERVICES.length - 1) {
        const nextServiceIndex = currentServiceIndex + 1
        setCurrentServiceIndex(nextServiceIndex)
        const nextUrl = getFaviconServiceUrl(credential.service_url || '', FAVICON_SERVICES[nextServiceIndex])
        if (nextUrl) {
          setCurrentSrc(nextUrl)
          setImageError(false)
        } else {
          setImageError(true)
        }
      } else {
        setImageError(true)
      }
    }

    if (!credential.service_url || credential.service_url.trim() === '' || imageError || !currentSrc) {
      return (
        <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
          <span className="text-sm font-bold text-white">
            {credential.service_name.charAt(0).toUpperCase()}
          </span>
        </div>
      )
    }

    return (
      <div className="h-8 w-8 rounded overflow-hidden flex items-center justify-center bg-white dark:bg-gray-100 shadow-sm border border-gray-200 dark:border-gray-300">
        <Image
          src={currentSrc}
          alt={credential.service_name}
          width={24}
          height={24}
          className="h-6 w-6 object-contain"
          onError={handleImageError}
          unoptimized={true}
        />
      </div>
    )
  }

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(message)
    } catch (_error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const renderBasicCredentialFields = () => {
    if (credential.credential_type !== 'basic') return null

    return (
      <>
        {credential.username && (
          <div>
            <Label className="text-sm text-gray-500 dark:text-gray-400">Username/Email</Label>
            <div className="relative mt-1">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-mono px-3 py-2 flex-1 min-h-[40px] flex items-center truncate">
                  {credential.username}
                </p>
                <div className="flex items-center border-l border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none rounded-r"
                    onClick={() => copyToClipboard(credential.username!, 'Copied to clipboard!')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {credential.password && (
          <div>
            <Label className="text-sm text-gray-500 dark:text-gray-400">Password</Label>
            <div className="relative mt-1">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-mono px-3 py-2 flex-1 min-h-[40px] flex items-center truncate">
                  {visiblePasswords.has(credential.id) ? credential.password : '••••••••'}
                </p>
                <div className="flex items-center border-l border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none"
                    onClick={() => onTogglePasswordVisibility(credential.id)}
                  >
                    {visiblePasswords.has(credential.id) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none rounded-r"
                    onClick={() => copyToClipboard(credential.password!, 'Copied to clipboard!')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  const renderAdvancedCredentialFields = () => {
    if (credential.credential_type !== 'advanced' || !credential.custom_fields?.length) return null

    const visibleFields = credential.custom_fields.filter(field => field.isVisible && field.name.trim())

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Fields</h4>
        <div className="space-y-3">
          {visibleFields.map((field) => (
            <div key={field.id}>
              <Label className="text-sm text-gray-500 dark:text-gray-400">TEXT</Label>
              <div className="relative mt-1">
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-mono px-3 py-2 flex-1 min-h-[40px] flex items-center truncate">
                    {!field.showValue && !visiblePasswords.has(`${credential.id}-${field.id}`) 
                      ? '••••••••' 
                      : field.value || field.name
                    }
                  </p>
                  <div className="flex items-center border-l border-gray-200 dark:border-gray-700">
                    {!field.showValue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none"
                        onClick={() => onTogglePasswordVisibility(`${credential.id}-${field.id}`)}
                      >
                        {visiblePasswords.has(`${credential.id}-${field.id}`) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none rounded-r"
                      onClick={() => copyToClipboard(field.value || field.name, 'Copied to clipboard!')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow ${
      securityIssues.isWeak ? 'border-l-4 border-l-red-500' : 
      securityIssues.isReused ? 'border-l-4 border-l-orange-500' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ServiceIcon />
            <div className="flex-1">
              {credential.service_url && credential.service_url.trim() !== '' ? (
                <a
                  href={credential.service_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-all duration-200 cursor-pointer flex items-center gap-1 group hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded"
                  title={`Visit ${credential.service_name}`}
                >
                  {credential.service_name}
                  <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </a>
              ) : (
                <CardTitle className="text-lg">{credential.service_name}</CardTitle>
              )}
              
              {/* Security Indicators */}
              <div className="flex items-center gap-2 mt-1">
                {securityIssues.isWeak && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    {securityIssues.strength?.replace('-', ' ').toUpperCase() || 'WEAK'}
                  </span>
                )}
                {securityIssues.isReused && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                    <AlertCircle className="h-3 w-3" />
                    REUSED
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                  {credential.credential_type === 'basic' ? 'Basic' : 'Advanced'}
                </span>
              </div>
              
              {/* Last Updated */}
              <div className="mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {new Date(credential.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(credential)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(credential)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
       <CardContent>
         <Accordion type="single" collapsible className="w-full">
           <AccordionItem value={`credentials-${credential.id}`} className="border-none">
             <AccordionTrigger className="hover:no-underline py-2">
               <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                 View Credentials
               </span>
             </AccordionTrigger>
             <AccordionContent className="space-y-4 pt-2">
               {renderBasicCredentialFields()}
               {renderAdvancedCredentialFields()}

               {/* Notes Display */}
               {credential.notes && credential.notes.trim() && (
                 <div className="space-y-2">
                   <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</h4>
                   <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                     <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                       {credential.notes}
                     </p>
                   </div>
                 </div>
               )}
             </AccordionContent>
           </AccordionItem>
         </Accordion>
       </CardContent>
    </Card>
  )
}
