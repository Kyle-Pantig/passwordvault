'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/database'
import { Credential, CredentialType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Eye, EyeOff, Trash2, Shield, Download, FileText, Lock, AlertTriangle, AlertCircle, Zap, Smartphone, BarChart3, Database, RefreshCw, HardDrive, Search } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { LoaderThree } from '@/components/ui/loader'
import { analyzePasswordRisk, PasswordRiskAnalysis } from '@/lib/password-risk-analysis'
import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'
import { motion } from 'motion/react'
import Image from 'next/image'
import { DynamicCredentialCard } from '@/components/ui/dynamic-credential-card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

// Predefined service options with URLs
const SERVICE_OPTIONS = [
  { name: 'Custom', url: '' },
  { name: 'Facebook', url: 'https://www.facebook.com/' },
  { name: 'Messenger', url: 'https://www.messenger.com/' },
  { name: 'Google', url: 'https://www.google.com/' },
  { name: 'Gmail', url: 'https://mail.google.com/' },
  { name: 'GitHub', url: 'https://github.com/' },
  { name: 'Twitter', url: 'https://twitter.com/' },
  { name: 'Instagram', url: 'https://www.instagram.com/' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/' },
  { name: 'Microsoft', url: 'https://www.microsoft.com/' },
  { name: 'Apple', url: 'https://www.apple.com/' },
  { name: 'Amazon', url: 'https://www.amazon.com/' },
  { name: 'Netflix', url: 'https://www.netflix.com/' },
  { name: 'Spotify', url: 'https://www.spotify.com/' },
  { name: 'Discord', url: 'https://discord.com/' },
  { name: 'Slack', url: 'https://slack.com/' },
  { name: 'Zoom', url: 'https://zoom.us/' },
  { name: 'Dropbox', url: 'https://www.dropbox.com/' },
  { name: 'PayPal', url: 'https://www.paypal.com/' },
  { name: 'Stripe', url: 'https://stripe.com/' },
  { name: 'Shopify', url: 'https://www.shopify.com/' },
  { name: 'WordPress', url: 'https://wordpress.com/' },
  
]

// Define fallback services for favicon loading
const FAVICON_SERVICES: Array<'duckduckgo' | 'faviconio' | 'direct'> = ['duckduckgo', 'faviconio', 'direct']

// DigiVault features for the infinite moving cards
const DIGIVAULT_FEATURES = [
  {
    quote: "Advanced 256-bit AES encryption ensures your passwords are protected with military-grade security standards.",
    name: "Military-Grade Encryption",
    title: "256-bit AES Security",
    icon: Shield
  },
  {
    quote: "Two-factor authentication adds an extra layer of protection to your account and sensitive data.",
    name: "Two-Factor Authentication",
    title: "2FA Protection",
    icon: Smartphone
  },
  {
    quote: "Real-time password strength analysis helps you identify and strengthen weak passwords instantly.",
    name: "Password Risk Analysis",
    title: "Smart Security Monitoring",
    icon: BarChart3
  },
  {
    quote: "End-to-end encryption ensures your data is encrypted before it leaves your device and stays secure in transit.",
    name: "End-to-End Encryption",
    title: "Zero-Knowledge Architecture",
    icon: Database
  },
  {
    quote: "Secure password generation creates strong, unique passwords for all your accounts automatically.",
    name: "Password Generator",
    title: "Smart Password Creation",
    icon: Zap
  },
  {
    quote: "Cross-platform synchronization keeps your passwords accessible and secure across all your devices.",
    name: "Cross-Platform Sync",
    title: "Universal Access",
    icon: RefreshCw
  },
  {
    quote: "Secure backup and recovery options ensure you never lose access to your important credentials.",
    name: "Secure Backup",
    title: "Data Recovery Protection",
    icon: HardDrive
  },
  {
    quote: "Dark web monitoring alerts you if your credentials are compromised in data breaches.",
    name: "Dark Web Monitoring",
    title: "Breach Detection",
    icon: Search
  }
]

export default function VaultPage() {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [riskAnalysis, setRiskAnalysis] = useState<PasswordRiskAnalysis | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null)
  const [deletingCredential, setDeletingCredential] = useState<Credential | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCustomService, setIsCustomService] = useState(false)
  const [customServiceName, setCustomServiceName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'encrypted'>('csv')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // Form states
  const [formData, setFormData] = useState({
    service_name: '',
    service_url: '',
    credential_type: 'basic' as CredentialType,
    username: '',
    password: '',
    custom_fields: [] as any[],
    notes: ''
  })

  // Validation states
  const [validationErrors, setValidationErrors] = useState({
    serviceName: false,
    customFields: false
  })

  // Individual masking state for each custom field is now stored in the field object

  // Validation function for custom fields
  const validateCustomFields = () => {
    const errors = {
      serviceName: false,
      customFields: false
    }

    // Check if service name is selected
    if (!formData.service_name || formData.service_name === '') {
      errors.serviceName = true
    }

    // Check custom fields validation
    if (formData.credential_type === 'advanced') {
      if (formData.custom_fields.length === 0) {
        errors.customFields = true
      } else {
        // Check if any custom field has no value
        const hasEmptyField = formData.custom_fields.some(field => 
          !field.name || field.name.trim() === '' || !field.value || field.value.trim() === ''
        )
        if (hasEmptyField) {
          errors.customFields = true
        }
      }
    }

    setValidationErrors(errors)
    return !errors.serviceName && !errors.customFields
  }

  useEffect(() => {
    if (user && !authLoading) {
      check2FAAndLoadCredentials()
    }
  }, [user, authLoading, router])

  const check2FAAndLoadCredentials = async () => {
    try {
      // Check if user has 2FA enabled
      const response = await fetch('/api/2fa/status')
      const { twoFactorEnabled } = await response.json()
      
      if (twoFactorEnabled) {
        // User has 2FA enabled, redirect to verification
        router.push('/verify-2fa')
        return
      }
      
      // User doesn't have 2FA enabled, load credentials normally
      loadCredentials()
    } catch (error) {
      console.error('Error checking 2FA status:', error)
      // If there's an error checking 2FA status, load credentials normally
      loadCredentials()
    }
  }

  const loadCredentials = async () => {
    try {
      const data = await db.getCredentials()
      setCredentials(data)
      
      // Analyze password risk
      const analysis = analyzePasswordRisk(data)
      setRiskAnalysis(analysis)
    } catch (_error) {
      toast.error('Failed to load credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form before submission
    if (!validateCustomFields()) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      await db.createCredential(formData)
      toast.success('Credential added successfully!')
      setIsAddDialogOpen(false)
      // Clear form data and validation errors
      setFormData({ service_name: '', service_url: '', credential_type: 'basic', username: '', password: '', custom_fields: [], notes: '' })
      setValidationErrors({ serviceName: false, customFields: false })
      loadCredentials()
    } catch (_error) {
      toast.error('Failed to add credential')
    }
  }

  const handleServiceSelect = (value: string) => {
    const selectedService = SERVICE_OPTIONS.find(service => service.name === value)
    if (value === 'Custom') {
      setIsCustomService(true)
      setCustomServiceName('')
      setFormData({ ...formData, service_name: '', service_url: '' })
    } else if (selectedService) {
      setIsCustomService(false)
      setCustomServiceName('')
      setFormData({ ...formData, service_name: selectedService.name, service_url: selectedService.url })
    }
    // Clear validation errors when service is selected
    setValidationErrors(prev => ({ ...prev, serviceName: false }))
  }

  const handleCredentialTypeChange = (type: CredentialType) => {
    setFormData({ 
      ...formData, 
      credential_type: type,
      // Clear fields when switching types
      username: type === 'basic' ? formData.username : '',
      password: type === 'basic' ? formData.password : '',
      custom_fields: type === 'advanced' ? formData.custom_fields : []
    })
    // Clear validation errors when credential type changes
    setValidationErrors({ serviceName: false, customFields: false })
  }

  const handleCustomServiceChange = (value: string) => {
    setCustomServiceName(value)
    setFormData({ ...formData, service_name: value })
  }


  // const getFaviconUrl = (url: string): string => {
  //   try {
  //     if (!url || url.trim() === '') return ''
  //     const domain = new URL(url).origin
  //     return `${domain}/favicon.ico`
  //   } catch {
  //     return ''
  //   }
  // }

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

  // const getGoogleFaviconUrl = (url: string): string => {
  //   try {
  //     if (!url || url.trim() === '') return ''
  //     const domain = new URL(url).hostname
  //     
  //     // Special handling for Gmail - use a more reliable service
  //     if (domain === 'mail.google.com' || domain === 'gmail.com') {
  //       return 'https://icons.duckduckgo.com/ip3/gmail.com.ico'
  //     }
  //     
  //     // Use DuckDuckGo's favicon service as primary (more reliable than Google's)
  //     return `https://icons.duckduckgo.com/ip3/${domain}.ico`
  //   } catch {
  //     return ''
  //   }
  // }

  const ServiceIcon = ({ credential }: { credential: Credential }) => {
    const [imageError, setImageError] = useState(false)
    const [currentSrc, setCurrentSrc] = useState('')
    const [currentServiceIndex, setCurrentServiceIndex] = useState(0)

    useEffect(() => {
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
        // Try next service
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
        // All services failed
        setImageError(true)
      }
    }

    // Show fallback if no URL, error, or still loading with empty src
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

  const handleOpenAddDialog = () => {
    // Clear form data when opening the dialog
    setFormData({ service_name: '', service_url: '', credential_type: 'basic', username: '', password: '', custom_fields: [], notes: '' })
    setIsCustomService(false)
    setCustomServiceName('')
    setShowAddPassword(false)
    setIsAddDialogOpen(true)
  }

  const handleEditCredential = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCredential) return

    try {
      await db.updateCredential(editingCredential.id, formData)
      toast.success('Credential updated successfully!')
      setIsEditDialogOpen(false)
      setEditingCredential(null)
      setFormData({ service_name: '', service_url: '', credential_type: 'basic', username: '', password: '', custom_fields: [], notes: '' })
      loadCredentials()
    } catch (_error) {
      toast.error('Failed to update credential')
    }
  }

  const openDeleteDialog = (credential: Credential) => {
    setDeletingCredential(credential)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteCredential = async () => {
    if (!deletingCredential) return

    setIsDeleting(true)
    try {
      await db.deleteCredential(deletingCredential.id)
      toast.success('Credential deleted successfully!')
      loadCredentials()
      setIsDeleteDialogOpen(false)
      setDeletingCredential(null)
    } catch (_error) {
      toast.error('Failed to delete credential')
    } finally {
      setIsDeleting(false)
    }
  }

  // Export functions
  const exportToCSV = (credentials: Credential[]) => {
    const headers = ['Service Name', 'Service URL', 'Username', 'Password', 'Created At']
    const csvContent = [
      headers.join(','),
      ...credentials.map(cred => [
        `"${cred.service_name}"`,
        `"${cred.service_url || ''}"`,
        `"${cred.username}"`,
        `"${cred.password}"`,
        `"${new Date(cred.created_at).toLocaleString()}"`
      ].join(','))
    ].join('\n')
    
    return csvContent
  }

  const exportToJSON = (credentials: Credential[]) => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      credentials: credentials.map(cred => ({
        service_name: cred.service_name,
        service_url: cred.service_url,
        username: cred.username,
        password: cred.password,
        created_at: cred.created_at
      }))
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  const exportToEncrypted = async (credentials: Credential[]) => {
    // Simple base64 encoding for demonstration - in production, use proper encryption
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      credentials: credentials.map(cred => ({
        service_name: cred.service_name,
        service_url: cred.service_url,
        username: cred.username,
        password: cred.password,
        created_at: cred.created_at
      }))
    }
    
    const jsonString = JSON.stringify(exportData, null, 2)
    const encrypted = btoa(jsonString) // Base64 encoding as simple encryption
    
    return `DIGIVAULT_EXPORT:${encrypted}`
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    if (credentials.length === 0) {
      toast.error('No credentials to export')
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      let content: string
      let filename: string
      let mimeType: string

      switch (exportFormat) {
        case 'csv':
          content = exportToCSV(credentials)
          filename = `digivault-export-${timestamp}.csv`
          mimeType = 'text/csv'
          break
        case 'json':
          content = exportToJSON(credentials)
          filename = `digivault-export-${timestamp}.json`
          mimeType = 'application/json'
          break
        case 'encrypted':
          content = await exportToEncrypted(credentials)
          filename = `digivault-export-${timestamp}.txt`
          mimeType = 'text/plain'
          break
        default:
          throw new Error('Invalid export format')
      }

      downloadFile(content, filename, mimeType)
      toast.success(`Credentials exported successfully as ${exportFormat.toUpperCase()}`)
      setIsExportDialogOpen(false)
    } catch (_error) {
      console.error('Export error:', _error)
      toast.error('Failed to export credentials')
    } finally {
      setIsExporting(false)
    }
  }



  const togglePasswordVisibility = (id: string) => {
    const newVisible = new Set(visiblePasswords)
    if (newVisible.has(id)) {
      newVisible.delete(id)
    } else {
      newVisible.add(id)
    }
    setVisiblePasswords(newVisible)
  }

  const openEditDialog = (credential: Credential) => {
    setEditingCredential(credential)
    setFormData({
      service_name: credential.service_name,
      service_url: credential.service_url || '',
      credential_type: credential.credential_type,
      username: credential.username || '',
      password: credential.password || '',
      custom_fields: credential.custom_fields || [],
      notes: credential.notes || ''
    })
    // Check if the service name is in our predefined list
    const isPredefinedService = SERVICE_OPTIONS.slice(0, -1).some(service => service.name === credential.service_name)
    setIsCustomService(!isPredefinedService)
    setCustomServiceName(isPredefinedService ? '' : credential.service_name)
    setShowEditPassword(false)
    setIsEditDialogOpen(true)
  }

  // Helper function to mask email addresses
  const maskEmail = (email: string) => {
    if (!email || !email.includes('@')) return email
    
    const [localPart, domain] = email.split('@')
    if (localPart.length <= 2) return email
    
    const firstChar = localPart[0]
    const lastChar = localPart[localPart.length - 1]
    const maskedMiddle = '*'.repeat(Math.max(1, localPart.length - 2))
    
    return `${firstChar}${maskedMiddle}${lastChar}@${domain}`
  }

  // Helper function to check if a credential has security issues
  const getCredentialSecurityIssues = (credential: Credential) => {
    if (!riskAnalysis) return { isWeak: false, isReused: false, strength: null }
    
    const weakPassword = riskAnalysis.weakPasswords.find(w => w.id === credential.id)
    const reusedPassword = riskAnalysis.reusedPasswords.find(r => 
      r.services.some(s => s.id === credential.id)
    )
    
    return {
      isWeak: !!weakPassword,
      isReused: !!reusedPassword,
      strength: weakPassword?.strength || null
    }
  }

  const filteredCredentials = credentials
    .filter(cred =>
      cred.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cred.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Prioritize credentials with security issues
      const aIssues = getCredentialSecurityIssues(a)
      const bIssues = getCredentialSecurityIssues(b)
      
      // Sort by: weak passwords first, then reused passwords, then alphabetically
      if (aIssues.isWeak && !bIssues.isWeak) return -1
      if (!aIssues.isWeak && bIssues.isWeak) return 1
      if (aIssues.isReused && !bIssues.isReused) return -1
      if (!aIssues.isReused && bIssues.isReused) return 1
      
      return a.service_name.localeCompare(b.service_name)
    })

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black w-full overflow-hidden">
        <div className="relative w-full flex flex-col items-center justify-center min-h-screen overflow-hidden">
          <div className="w-full max-w-7xl px-4 py-20">
            <motion.h1 
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
                delay: 0.2,
              }}
              className="relative z-10 mx-auto max-w-4xl text-center text-2xl font-bold text-slate-300 md:text-4xl lg:text-7xl dark:text-slate-300"
            >
              {"Secure your passwords with DigiVault"}
            </motion.h1>
            <motion.p
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.3,
                delay: 0.8,
              }}
              className="relative z-10 mx-auto max-w-xl py-4 text-center text-lg font-normal text-neutral-400 dark:text-neutral-400"
            >
              Store, manage, and protect your passwords with our secure and intuitive password manager. 
              Never forget a password again with advanced security features.
            </motion.p>
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.3,
                delay: 1,
              }}
              className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              <Button
                size="lg"
                onClick={() => router.push('/signup')}
                className="w-60 transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/login')}
                className="w-60 transform rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-900"
              >
                Sign In
              </Button>
            </motion.div>
            
            {/* Features Section */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.3,
                delay: 1.2,
              }}
              className="relative z-10 mt-16 mb-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Why Choose DigiVault?
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Advanced security features designed to protect your digital life with cutting-edge technology
                </p>
              </div>
              <InfiniteMovingCards
                items={DIGIVAULT_FEATURES}
                direction="left"
                speed="slow"
                className="max-w-7xl mx-auto"
                style={{ '--animation-duration': '200s' } as React.CSSProperties}
              />
            </motion.div>
            
            {/* Footer */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.3,
                delay: 1.5,
              }}
              className="relative z-10 mt-20"
            >
              <Card className='bg-transparent border-none' >
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-6">
                    {/* Links Section */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/terms')}
                          className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 text-sm"
                        >
                          Terms of Service
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/privacy')}
                          className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 text-sm"
                        >
                          Privacy Policy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/help')}
                          className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 text-sm"
                        >
                          Help & Support
                        </Button>
                      </div>
                    </div>
                    
                    {/* Copyright */}
                    <div className="text-center border-t border-gray-700 dark:border-gray-600 pt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        © {new Date().getFullYear()} DigiVault. All rights reserved.
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                        Built with security in mind
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your vault...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Search and Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-8 space-y-3 sm:space-y-0 gap-3 sm:gap-4">
          <div className="flex-1 w-full sm:max-w-md">
            <Input
              placeholder="Search credentials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(true)}
              className="w-full sm:w-auto whitespace-nowrap"
              disabled={credentials.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (open) {
                // Clear form when dialog opens
                setFormData({ service_name: '', service_url: '', credential_type: 'basic', username: '', password: '', custom_fields: [], notes: '' })
                setIsCustomService(false)
                setCustomServiceName('')
                setShowAddPassword(false)
              }
            }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credential
                </Button>
              </DialogTrigger>
            <DialogContent className="max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Add New Credential</DialogTitle>
                <DialogDescription>
                  Add a new service credential to your vault
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className={`max-h-[60vh] ${formData.custom_fields.length > 0 ? 'pr-4' : ''}`}>
                <form id="add-credential-form" onSubmit={handleAddCredential} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="credential_type">Credential Type</Label>
                      <Select value={formData.credential_type} onValueChange={handleCredentialTypeChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select credential type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic (Username/Password)</SelectItem>
                          <SelectItem value="advanced">Advanced (Custom Fields)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service_name">Service Name</Label>
                      <Select onValueChange={handleServiceSelect} value={isCustomService ? 'Custom' : formData.service_name}>
                        <SelectTrigger className={validationErrors.serviceName ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-500' : ''}>
                          <SelectValue placeholder="Select a service or choose Custom" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto z-50" position="popper" side="bottom" align="start">
                          {SERVICE_OPTIONS.map((service) => (
                            <SelectItem key={service.name} value={service.name}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isCustomService && (
                        <Input
                          placeholder="Enter custom service name"
                          value={customServiceName}
                          onChange={(e) => handleCustomServiceChange(e.target.value)}
                          required
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service_url">Service URL (optional)</Label>
                      <Input
                        id="service_url"
                        placeholder="https://www.messenger.com/"
                        value={formData.service_url}
                        onChange={(e) => setFormData({ ...formData, service_url: e.target.value })}
                      />
                    </div>

                    {formData.credential_type === 'basic' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="username">Username/Email</Label>
                          <Input
                            id="username"
                            placeholder="Enter username or email"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showAddPassword ? "text" : "password"}
                              placeholder="Enter password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              required
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowAddPassword(!showAddPassword)}
                            >
                              {showAddPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {formData.credential_type === 'advanced' && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-lg font-semibold">Custom Fields</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Add custom fields for your advanced credentials (API keys, tokens, etc.)
                          </p>
                        </div>
                        <div className="space-y-3">
                          {formData.custom_fields.map((field, index) => (
                            <div key={field.id || index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                  <Label htmlFor={`mask-toggle-${index}`} className="text-xs text-gray-600">
                                    Mask
                                  </Label>
                                  <Switch
                                    id={`mask-toggle-${index}`}
                                    checked={field.isMasked}
                                    onCheckedChange={(checked) => {
                                      const newFields = [...formData.custom_fields]
                                      newFields[index] = { ...field, isMasked: checked, showValue: checked ? field.showValue : true }
                                      setFormData({ ...formData, custom_fields: newFields })
                                    }}
                                    className="scale-75"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newFields = formData.custom_fields.filter((_, i) => i !== index)
                                    setFormData({ ...formData, custom_fields: newFields })
                                    // Clear validation errors when field is removed
                                    setValidationErrors(prev => ({ ...prev, customFields: false }))
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="relative">
                                <Input
                                  placeholder="(e.g., API Key, Token)"
                                  value={field.isMasked ? (field.showValue ? field.name : '•'.repeat(Math.max(field.name.length, 1))) : field.name}
                                  onChange={(e) => {
                                    const newFields = [...formData.custom_fields]
                                    if (field.isMasked) {
                                      if (field.showValue) {
                                        // When visible, update normally
                                        newFields[index] = { ...field, name: e.target.value, value: e.target.value }
                                      } else {
                                        // When hidden, we need to handle this differently
                                        // The input shows dots, but we need to track the actual changes
                                        const currentLength = field.name.length
                                        const inputLength = e.target.value.length
                                        
                                        if (inputLength > currentLength) {
                                          // User is adding characters
                                          const newChar = e.target.value.slice(-1)
                                          newFields[index] = { ...field, name: field.name + newChar, value: field.name + newChar }
                                        } else if (inputLength < currentLength) {
                                          // User is deleting characters
                                          const newValue = field.name.slice(0, inputLength)
                                          newFields[index] = { ...field, name: newValue, value: newValue }
                                        }
                                      }
                                    } else {
                                      // When masking is disabled, update normally
                                      newFields[index] = { ...field, name: e.target.value, value: e.target.value }
                                    }
                                    setFormData({ ...formData, custom_fields: newFields })
                                    // Clear validation errors when field is updated
                                    setValidationErrors(prev => ({ ...prev, customFields: false }))
                                  }}
                                  className={`${field.isMasked ? 'pr-20' : 'pr-10'} ${validationErrors.customFields ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-500' : ''}`}
                                />
                                {field.isMasked && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newFields = [...formData.custom_fields]
                                      newFields[index] = { ...field, showValue: !field.showValue }
                                      setFormData({ ...formData, custom_fields: newFields })
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                                  >
                                    {field.showValue ? (
                                      <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newField = {
                                id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                name: '',
                                value: '',
                                isVisible: true,
                                showValue: true,
                                isMasked: true
                              }
                              setFormData({ ...formData, custom_fields: [...formData.custom_fields, newField] })
                            }}
                            className={`w-full ${validationErrors.customFields && formData.custom_fields.length === 0 ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-500' : ''}`}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Field
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Add any additional notes about this credential
                        </p>
                      </div>
                      <Textarea
                        id="notes"
                        placeholder="Add any additional notes about this credential..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="overflow-y-auto whitespace-pre-wrap break-words"
                        rows={3}
                        style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                      />
                    </div>
                  </div>

                </form>
              </ScrollArea>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="add-credential-form">Add Credential</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Quick Security Overview */}
        {riskAnalysis && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Security Overview
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Monitor your password security at a glance
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/security')}
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Risk Score */}
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {riskAnalysis.riskScore}
                  </div>
                  <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                    riskAnalysis.riskLevel === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    riskAnalysis.riskLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    riskAnalysis.riskLevel === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {riskAnalysis.riskLevel === 'low' ? 'Low Risk' :
                     riskAnalysis.riskLevel === 'moderate' ? 'Moderate Risk' :
                     riskAnalysis.riskLevel === 'high' ? 'High Risk' : 'Critical Risk'}
                  </div>
                </div>
                
                {/* Weak Credentials */}
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {riskAnalysis.weakCredentials}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Weak Passwords
                  </div>
                </div>
                
                {/* Reused Credentials */}
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                    {riskAnalysis.reusedCredentials}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Reused Passwords
                  </div>
                </div>
              </div>
              
              {/* Quick Issues Preview */}
              {(riskAnalysis.weakPasswords.length > 0 || riskAnalysis.reusedPasswords.length > 0) && (
                <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Issues Found
                    </span>
                  </div>
                  <div className="space-y-1">
                    {riskAnalysis.weakPasswords.slice(0, 2).map((weak, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {weak.service_name} ({maskEmail(weak.username)})
                        </span>
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs">
                          {weak.strength.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {riskAnalysis.weakPasswords.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{riskAnalysis.weakPasswords.length - 2} more weak passwords
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Credentials Grid */}
        {filteredCredentials.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No matching credentials found' : 'No credentials yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Add your first credential to get started'}
            </p>
            {!searchTerm && (
              <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Credential
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
            {filteredCredentials.map((credential) => {
              const securityIssues = getCredentialSecurityIssues(credential)
              return (
                <DynamicCredentialCard
                  key={credential.id}
                  credential={credential}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  visiblePasswords={visiblePasswords}
                  onTogglePasswordVisibility={togglePasswordVisibility}
                  securityIssues={securityIssues}
                />
              )
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            // Reset custom service state when dialog closes
            setIsCustomService(false)
            setCustomServiceName('')
            setShowEditPassword(false)
          }
        }}>
          <DialogContent className="max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Edit Credential</DialogTitle>
              <DialogDescription>
                Update the credential information
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className={`max-h-[60vh] ${formData.custom_fields.length > 0 ? 'pr-4' : ''}`}>
              <form id="edit-credential-form" onSubmit={handleEditCredential} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_credential_type">Credential Type</Label>
                    <Select value={formData.credential_type} onValueChange={handleCredentialTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select credential type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (Username/Password)</SelectItem>
                        <SelectItem value="advanced">Advanced (Custom Fields)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_service_name">Service Name</Label>
                    <Select onValueChange={handleServiceSelect} value={isCustomService ? 'Custom' : formData.service_name}>
                      <SelectTrigger className={validationErrors.serviceName ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-500' : ''}>
                        <SelectValue placeholder="Select a service or choose Custom" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto z-50" position="popper" side="bottom" align="start">
                        {SERVICE_OPTIONS.map((service) => (
                          <SelectItem key={service.name} value={service.name}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isCustomService && (
                      <Input
                        placeholder="Enter custom service name"
                        value={customServiceName}
                        onChange={(e) => handleCustomServiceChange(e.target.value)}
                        required
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_service_url">Service URL (optional)</Label>
                    <Input
                      id="edit_service_url"
                      placeholder="https://www.messenger.com/"
                      value={formData.service_url}
                      onChange={(e) => setFormData({ ...formData, service_url: e.target.value })}
                    />
                  </div>

                  {formData.credential_type === 'basic' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="edit_username">Username/Email</Label>
                        <Input
                          id="edit_username"
                          placeholder="Enter username or email"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_password">Password</Label>
                        <div className="relative">
                          <Input
                            id="edit_password"
                            type={showEditPassword ? "text" : "password"}
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowEditPassword(!showEditPassword)}
                          >
                            {showEditPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {formData.credential_type === 'advanced' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-lg font-semibold">Custom Fields</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Add custom fields for your advanced credentials (API keys, tokens, etc.)
                        </p>
                      </div>
                      <div className="space-y-3">
                        {formData.custom_fields.map((field, index) => (
                          <div key={field.id || index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                <Label htmlFor={`edit-mask-toggle-${index}`} className="text-xs text-gray-600">
                                  Mask
                                </Label>
                                <Switch
                                  id={`edit-mask-toggle-${index}`}
                                  checked={field.isMasked}
                                  onCheckedChange={(checked) => {
                                    const newFields = [...formData.custom_fields]
                                    newFields[index] = { ...field, isMasked: checked, showValue: checked ? field.showValue : true }
                                    setFormData({ ...formData, custom_fields: newFields })
                                  }}
                                  className="scale-75"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newFields = formData.custom_fields.filter((_, i) => i !== index)
                                  setFormData({ ...formData, custom_fields: newFields })
                                  // Clear validation errors when field is removed
                                  setValidationErrors(prev => ({ ...prev, customFields: false }))
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="relative">
                              <Input
                                placeholder="(e.g., API Key, Token)"
                                value={field.isMasked ? (field.showValue ? field.name : '•'.repeat(Math.max(field.name.length, 1))) : field.name}
                                onChange={(e) => {
                                  const newFields = [...formData.custom_fields]
                                  if (field.isMasked) {
                                    if (field.showValue) {
                                      // When visible, update normally
                                      newFields[index] = { ...field, name: e.target.value, value: e.target.value }
                                    } else {
                                      // When hidden, we need to handle this differently
                                      // The input shows dots, but we need to track the actual changes
                                      const currentLength = field.name.length
                                      const inputLength = e.target.value.length
                                      
                                      if (inputLength > currentLength) {
                                        // User is adding characters
                                        const newChar = e.target.value.slice(-1)
                                        newFields[index] = { ...field, name: field.name + newChar, value: field.name + newChar }
                                      } else if (inputLength < currentLength) {
                                        // User is deleting characters
                                        const newValue = field.name.slice(0, inputLength)
                                        newFields[index] = { ...field, name: newValue, value: newValue }
                                      }
                                    }
                                  } else {
                                    // When masking is disabled, update normally
                                    newFields[index] = { ...field, name: e.target.value, value: e.target.value }
                                  }
                                  setFormData({ ...formData, custom_fields: newFields })
                                  // Clear validation errors when field is updated
                                  setValidationErrors(prev => ({ ...prev, customFields: false }))
                                }}
                                className={`${field.isMasked ? 'pr-20' : 'pr-10'} ${validationErrors.customFields ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-500' : ''}`}
                              />
                              {field.isMasked && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newFields = [...formData.custom_fields]
                                    newFields[index] = { ...field, showValue: !field.showValue }
                                    setFormData({ ...formData, custom_fields: newFields })
                                  }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                                >
                                  {field.showValue ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newField = {
                              id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                              name: '',
                              value: '',
                              isVisible: true,
                              showValue: true,
                              isMasked: true
                            }
                            setFormData({ ...formData, custom_fields: [...formData.custom_fields, newField] })
                            // Clear validation errors when field is added
                            setValidationErrors(prev => ({ ...prev, customFields: false }))
                          }}
                          className={`w-full ${validationErrors.customFields && formData.custom_fields.length === 0 ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-500' : ''}`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Field
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="edit_notes" className="text-sm font-medium">Notes</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Add any additional notes about this credential
                      </p>
                    </div>
                    <Textarea
                      id="edit_notes"
                      placeholder="Add any additional notes about this credential..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="overflow-y-auto whitespace-pre-wrap break-words"
                      rows={3}
                      style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                    />
                  </div>
                </div>

              </form>
            </ScrollArea>
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="edit-credential-form">Update Credential</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating Action Button */}
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 cursor-pointer"
          size="lg"
          onClick={handleOpenAddDialog}
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Credential</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this credential? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {deletingCredential && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {deletingCredential.service_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {deletingCredential.service_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {deletingCredential.username}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setDeletingCredential(null)
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteCredential}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <LoaderThree />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Credential
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Credentials</DialogTitle>
              <DialogDescription>
                Choose a format to export your credentials. You can export {credentials.length} credential{credentials.length !== 1 ? 's' : ''}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Export Format</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="csv-format"
                      name="export-format"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as 'csv')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="csv-format" className="flex items-center space-x-2 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      <span>CSV (Comma Separated Values)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="json-format"
                      name="export-format"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={(e) => setExportFormat(e.target.value as 'json')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="json-format" className="flex items-center space-x-2 cursor-pointer">
                      <FileText className="h-4 w-4" />
                      <span>JSON (JavaScript Object Notation)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="encrypted-format"
                      name="export-format"
                      value="encrypted"
                      checked={exportFormat === 'encrypted'}
                      onChange={(e) => setExportFormat(e.target.value as 'encrypted')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="encrypted-format" className="flex items-center space-x-2 cursor-pointer">
                      <Lock className="h-4 w-4" />
                      <span>Encrypted (Base64 encoded)</span>
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">Security Notice</p>
                    <p>Exported files contain sensitive information. Store them securely and delete them when no longer needed.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExportDialogOpen(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleExport}
                disabled={isExporting || credentials.length === 0}
              >
                {isExporting ? (
                  <>
                    <LoaderThree />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Credentials
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </main>
  )
}