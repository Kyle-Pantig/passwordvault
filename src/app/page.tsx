'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/database'
import { Credential, CredentialType, Category } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Eye, EyeOff, Trash2, Shield, Download, FileText, Lock, Zap, Smartphone, BarChart3, Database, RefreshCw, HardDrive, Search, Folder, FolderPlus, KeyIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { LoaderThree } from '@/components/ui/loader'
import { analyzePasswordRisk, PasswordRiskAnalysis } from '@/lib/password-risk-analysis'
import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'
import { motion } from 'motion/react'
import Image from 'next/image'
import { DynamicCredentialCard } from '@/components/ui/dynamic-credential-card'
import { CategoryFolder } from '@/components/ui/category-folder'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LayoutGrid, List, ChevronDown, Filter } from 'lucide-react'

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
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [riskAnalysis, setRiskAnalysis] = useState<PasswordRiskAnalysis | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null)
  const [deletingCredential, setDeletingCredential] = useState<Credential | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedService, setSelectedService] = useState<string>('all')
  const [isIconOnlyMode, setIsIconOnlyMode] = useState(false)
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false)
  const [isCustomService, setIsCustomService] = useState(false)
  const [isMediumScreen, setIsMediumScreen] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const [customServiceName, setCustomServiceName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'encrypted'>('csv')
  const [exportScope, setExportScope] = useState<'all' | 'current' | 'specific'>('all')
  const [selectedExportFolder, setSelectedExportFolder] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'categories' | 'credentials'>('categories')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [isDeleteFolderDialogOpen, setIsDeleteFolderDialogOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [folderCredentials, setFolderCredentials] = useState<Credential[]>([])
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)
  const [isPreparingDelete, setIsPreparingDelete] = useState(false)
  const [moveCredentialsTo, setMoveCredentialsTo] = useState<string>('')
  const [deleteCredentials, setDeleteCredentials] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  // Form states
  const [formData, setFormData] = useState({
    service_name: '',
    service_url: '',
    credential_type: 'basic' as CredentialType,
    username: '',
    password: '',
    custom_fields: [] as any[],
    notes: '',
    category_id: ''
  })

  // Category form state
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    color: '#3B82F6',
    icon: 'folder'
  })

  // Validation states
  const [validationErrors, setValidationErrors] = useState({
    serviceName: false,
    customFields: false,
    category: false
  })

  // Individual masking state for each custom field is now stored in the field object

  // Validation function for custom fields
  const validateCustomFields = () => {
    const errors = {
      serviceName: false,
      customFields: false,
      category: false
    }

    // Check if service name is selected
    if (!formData.service_name || formData.service_name === '') {
      errors.serviceName = true
    }

    // Check if category is selected
    if (!formData.category_id || formData.category_id === '') {
      errors.category = true
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
    return !errors.serviceName && !errors.customFields && !errors.category
  }

  useEffect(() => {
    if (user && !authLoading) {
      // Check if user is already verified (either in metadata or session storage)
      const isVerified = user?.user_metadata?.two_factor_verified || 
                        sessionStorage.getItem('2fa_verified') === 'true'
      
      if (isVerified) {
        // User is already verified, load credentials directly
        loadCredentials()
      } else {
        // Check if user needs 2FA verification (only on fresh login)
        check2FAAndLoadCredentials()
      }
    }
  }, [user, authLoading, router])

  // Set default category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !formData.category_id) {
      const defaultCategory = categories.find(cat => cat.name.toLowerCase() === 'general') || categories[0]
      setFormData(prev => ({ ...prev, category_id: defaultCategory.id }))
    }
  }, [categories, formData.category_id])

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const isMedium = width >= 640 && width < 1024 // md breakpoint
      const isLarge = width >= 1024 // lg breakpoint
      setIsMediumScreen(isMedium)
      setIsLargeScreen(isLarge)
      
      // Auto-toggle based on screen size
      if (isMedium && !isIconOnlyMode) {
        // Medium screens: icon-only mode
        setIsIconOnlyMode(true)
      }
      // Large screens: allow manual control, don't auto-toggle
    }

    // Set initial state
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [isIconOnlyMode])

  const check2FAAndLoadCredentials = async () => {
    try {
      // Check if user has 2FA enabled
      const response = await fetch('/api/2fa/status')
      const { twoFactorEnabled } = await response.json()
      
      if (twoFactorEnabled) {
        // Check if user has already been verified (via backup code or TOTP)
        const { data: { user } } = await supabase.auth.getUser()
        const isVerified = user?.user_metadata?.two_factor_verified || 
                          sessionStorage.getItem('2fa_verified') === 'true'
        
        if (isVerified) {
          // User has been verified, load credentials normally
          loadCredentials()
          return
        }
        
        // User has 2FA enabled but not verified, redirect to verification
        // This should only happen during fresh login, not on every page reload
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
      const [credentialsData, categoriesData] = await Promise.all([
        db.getCredentials(),
        db.getCategories()
      ])
      
      setCredentials(credentialsData)
      
      // If no categories exist, create a default General folder
      if (categoriesData.length === 0) {
        try {
          const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'General',
              color: '#3B82F6',
              icon: 'folder'
            })
          })
          
          if (response.ok) {
            const generalCategory = await response.json()
            setCategories([generalCategory])
            toast.success('Created default General folder for you!')
          } else {
            // Fallback: create a temporary category for UI purposes
            const fallbackCategory = {
              id: 'temp-general',
              user_id: 'temp',
              name: 'General',
              color: '#3B82F6',
              icon: 'folder',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            setCategories([fallbackCategory])
          }
        } catch (error) {
          console.error('Failed to create default General folder:', error)
          // Fallback: create a temporary category for UI purposes
          const fallbackCategory = {
            id: 'temp-general',
            user_id: 'temp',
            name: 'General',
            color: '#3B82F6',
            icon: 'folder',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setCategories([fallbackCategory])
        }
      } else {
        setCategories(categoriesData)
      }
      
      // Analyze password risk
      const analysis = analyzePasswordRisk(credentialsData)
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
      // Format the service URL before submission
      const formattedUrl = formatServiceUrl(formData.service_url)
      
      // If using temporary General folder, create a real one first
      let categoryId = formData.category_id
      if (categoryId === 'temp-general') {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'General',
            color: '#3B82F6',
            icon: 'folder'
          })
        })
        
        if (response.ok) {
          const generalCategory = await response.json()
          categoryId = generalCategory.id
          // Update the categories list
          setCategories([generalCategory])
        } else {
          throw new Error('Failed to create General folder')
        }
      }

      const credentialData = {
        ...formData,
        service_url: formattedUrl,
        category_id: categoryId
      }
      
      await db.createCredential(credentialData)
      toast.success('Credential added successfully!')
      setIsAddDialogOpen(false)
      // Clear form data and validation errors
      setFormData({ service_name: '', service_url: '', credential_type: 'basic', username: '', password: '', custom_fields: [], notes: '', category_id: '' })
      setValidationErrors({ serviceName: false, customFields: false, category: false })
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
      const autoDetectedUrl = autoDetectServiceUrl(selectedService.name)
      setFormData({ ...formData, service_name: selectedService.name, service_url: autoDetectedUrl })
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
    setValidationErrors({ serviceName: false, customFields: false, category: false })
  }

  const handleCustomServiceChange = (value: string) => {
    setCustomServiceName(value)
    const autoDetectedUrl = autoDetectServiceUrl(value)
    setFormData({ ...formData, service_name: value, service_url: autoDetectedUrl })
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

  const CredentialServiceIcon = ({ credential }: { credential: Credential }) => {
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
    // Clear form data when opening the dialog, but auto-select current category if in credentials view
    let defaultCategoryId = 'none'
    if (viewMode === 'credentials' && selectedCategoryId) {
      // If we're in uncategorized or all vaults view, don't pre-select any category
      defaultCategoryId = (selectedCategoryId === 'uncategorized' || selectedCategoryId === 'all') ? 'none' : selectedCategoryId
    }
    setFormData({ 
      service_name: '', 
      service_url: '', 
      credential_type: 'basic', 
      username: '', 
      password: '', 
      custom_fields: [], 
      notes: '', 
      category_id: defaultCategoryId 
    })
      setIsCustomService(false)
      setCustomServiceName('')
      setShowAddPassword(false)
      setIsAddDialogOpen(true)
  }

  const handleEditCredential = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCredential) return

    try {
      // Format the service URL before submission
      const formattedUrl = formatServiceUrl(formData.service_url)
      
      // Convert "none" to empty string for category_id
      const credentialData = {
        ...formData,
        service_url: formattedUrl,
        category_id: formData.category_id
      }
      
      await db.updateCredential(editingCredential.id, credentialData)
      toast.success('Credential updated successfully!')
      setIsEditDialogOpen(false)
      setEditingCredential(null)
      setFormData({ service_name: '', service_url: '', credential_type: 'basic', username: '', password: '', custom_fields: [], notes: '', category_id: '' })
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

  // Folder management functions
  const handleRenameFolder = async (categoryId: string, newName: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })

      if (!response.ok) {
        throw new Error('Failed to rename folder')
      }

      toast.success('Folder renamed successfully!')
      loadCredentials()
    } catch (error) {
      toast.error('Failed to rename folder')
    }
  }

  const handleDeleteFolder = async (category: Category) => {
    // Prevent deleting the General folder
    if (category.name.toLowerCase() === 'general') {
      toast.error('Cannot delete the General folder. This is a default folder that must always be available.')
      return
    }

    // Prevent deleting the last folder
    if (categories.length <= 1) {
      toast.error('Cannot delete the last folder. You must have at least one folder to organize your credentials.')
      return
    }

    setDeletingCategory(category)
    setIsPreparingDelete(true)
    
    try {
      // Get credentials in this category
      const response = await fetch(`/api/categories/${category.id}/credentials`)
      if (response.ok) {
        const credentials = await response.json()
        setFolderCredentials(credentials)
      }
    } catch (error) {
      console.error('Failed to fetch folder credentials:', error)
    } finally {
      setIsPreparingDelete(false)
    }
    
    setIsDeleteFolderDialogOpen(true)
  }

  const confirmDeleteFolder = async () => {
    if (!deletingCategory) return

    // Validate that either delete credentials is selected or a folder is chosen for moving
    if (!deleteCredentials && (!moveCredentialsTo || moveCredentialsTo === '')) {
      toast.error('Please select a folder to move credentials to or choose to delete all credentials.')
      return
    }

    setIsDeletingFolder(true)
    try {
      const params = new URLSearchParams()
      if (deleteCredentials) {
        params.append('deleteCredentials', 'true')
      } else if (moveCredentialsTo && moveCredentialsTo !== '') {
        params.append('moveTo', moveCredentialsTo)
      }

      const response = await fetch(`/api/categories/${deletingCategory.id}?${params.toString()}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete folder')
      }

      toast.success('Folder deleted successfully!')
      loadCredentials()
      setIsDeleteFolderDialogOpen(false)
      setDeletingCategory(null)
      setFolderCredentials([])
      setMoveCredentialsTo('')
      setDeleteCredentials(false)
      setIsPreparingDelete(false)
    } catch (error) {
      toast.error('Failed to delete folder')
    } finally {
      setIsDeletingFolder(false)
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
    const credentialsToExport = getCredentialsForExport()
    
    if (credentialsToExport.length === 0) {
      toast.error('No credentials to export')
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      let content: string
      let filename: string
      let mimeType: string
      
      // Get folder name for filename
      let folderName = 'all-vaults'
      if (exportScope === 'current' && selectedCategoryId) {
        if (selectedCategoryId === 'all') {
          folderName = 'all-vaults'
        } else if (selectedCategoryId === 'uncategorized') {
          folderName = 'uncategorized'
        } else {
          const category = categories.find(cat => cat.id === selectedCategoryId)
          folderName = category ? category.name.toLowerCase().replace(/\s+/g, '-') : 'folder'
        }
      } else if (exportScope === 'specific') {
        if (selectedExportFolder === 'all') {
          folderName = 'all-vaults'
        } else if (selectedExportFolder === 'uncategorized') {
          folderName = 'uncategorized'
        } else {
          const category = categories.find(cat => cat.id === selectedExportFolder)
          folderName = category ? category.name.toLowerCase().replace(/\s+/g, '-') : 'folder'
        }
      }

      switch (exportFormat) {
        case 'csv':
          content = exportToCSV(credentialsToExport)
          filename = `digivault-${folderName}-export-${timestamp}.csv`
          mimeType = 'text/csv'
          break
        case 'json':
          content = exportToJSON(credentialsToExport)
          filename = `digivault-${folderName}-export-${timestamp}.json`
          mimeType = 'application/json'
          break
        case 'encrypted':
          content = await exportToEncrypted(credentialsToExport)
          filename = `digivault-${folderName}-export-${timestamp}.txt`
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

  // Category management functions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryFormData),
      })

      if (response.ok) {
        toast.success('Category created successfully!')
        setIsCategoryDialogOpen(false)
        setCategoryFormData({ name: '', color: '#3B82F6', icon: 'folder' })
        loadCredentials() // Reload to get updated categories
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create category')
      }
    } catch (_error) {
      toast.error('Failed to create category')
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setViewMode('credentials')
    setSelectedCategory(categoryId)
    setSelectedService('all')
  }

  const handleBackToCategories = () => {
    setViewMode('categories')
    setSelectedCategoryId(null)
    setSelectedCategory('all')
    setSelectedService('all')
    setSearchTerm('')
  }

  const getCredentialCountForCategory = (categoryId: string) => {
    return credentials.filter(cred => cred.category_id === categoryId).length
  }

  const getUncategorizedCount = () => {
    return credentials.filter(cred => !cred.category_id).length
  }

  const getCurrentFolderCredentials = () => {
    if (selectedCategoryId === 'all') {
      return credentials
    } else if (selectedCategoryId === 'uncategorized') {
      return credentials.filter(cred => !cred.category_id)
    } else {
      return credentials.filter(cred => cred.category_id === selectedCategoryId)
    }
  }

  const getUniqueServices = () => {
    const currentCredentials = getCurrentFolderCredentials()
    const services = currentCredentials.map(cred => cred.service_name)
    const uniqueServices = Array.from(new Set(services)).sort()
    return uniqueServices
  }

  const isServiceMatchingSearch = (serviceName: string) => {
    if (!searchTerm || searchTerm.trim() === '') return false
    return serviceName.toLowerCase().includes(searchTerm.toLowerCase())
  }

  const getServiceUrl = (serviceName: string) => {
    const currentCredentials = getCurrentFolderCredentials()
    const credential = currentCredentials.find(cred => cred.service_name === serviceName)
    return credential?.service_url || ''
  }

  // Service URL mapping for common services
  const SERVICE_URL_MAPPING: Record<string, string> = {
    'facebook': 'https://www.facebook.com',
    'google': 'https://www.google.com',
    'gmail': 'https://mail.google.com',
    'youtube': 'https://www.youtube.com',
    'instagram': 'https://www.instagram.com',
    'twitter': 'https://twitter.com',
    'x': 'https://x.com',
    'linkedin': 'https://www.linkedin.com',
    'github': 'https://github.com',
    'netflix': 'https://www.netflix.com',
    'spotify': 'https://www.spotify.com',
    'amazon': 'https://www.amazon.com',
    'microsoft': 'https://www.microsoft.com',
    'apple': 'https://www.apple.com',
    'discord': 'https://discord.com',
    'slack': 'https://slack.com',
    'zoom': 'https://zoom.us',
    'dropbox': 'https://www.dropbox.com',
    'onedrive': 'https://onedrive.live.com',
    'icloud': 'https://www.icloud.com',
    'paypal': 'https://www.paypal.com',
    'stripe': 'https://stripe.com',
    'shopify': 'https://www.shopify.com',
    'wordpress': 'https://wordpress.com',
    'medium': 'https://medium.com',
    'reddit': 'https://www.reddit.com',
    'pinterest': 'https://www.pinterest.com',
    'tiktok': 'https://www.tiktok.com',
    'snapchat': 'https://www.snapchat.com',
    'telegram': 'https://web.telegram.org',
    'whatsapp': 'https://web.whatsapp.com',
    'messenger': 'https://www.messenger.com',
    'skype': 'https://web.skype.com',
    'teams': 'https://teams.microsoft.com',
    'notion': 'https://www.notion.so',
    'trello': 'https://trello.com',
    'asana': 'https://app.asana.com',
    'jira': 'https://www.atlassian.com/software/jira',
    'confluence': 'https://www.atlassian.com/software/confluence',
    'figma': 'https://www.figma.com',
    'canva': 'https://www.canva.com',
    'adobe': 'https://www.adobe.com',
    'salesforce': 'https://www.salesforce.com',
    'hubspot': 'https://www.hubspot.com',
    'mailchimp': 'https://mailchimp.com',
    'zendesk': 'https://www.zendesk.com',
    'intercom': 'https://www.intercom.com',
    'twilio': 'https://www.twilio.com',
    'square': 'https://squareup.com',
    'quickbooks': 'https://quickbooks.intuit.com',
    'xero': 'https://www.xero.com',
    'freshbooks': 'https://www.freshbooks.com',
    'mint': 'https://mint.intuit.com',
    'turbotax': 'https://turbotax.intuit.com',
    'hulu': 'https://www.hulu.com',
    'disney': 'https://www.disneyplus.com',
    'hbo': 'https://www.hbomax.com',
    'prime': 'https://www.amazon.com/prime',
    'twitch': 'https://www.twitch.tv',
    'steam': 'https://store.steampowered.com',
    'epic': 'https://www.epicgames.com',
    'battle': 'https://www.battle.net',
    'origin': 'https://www.origin.com',
    'uplay': 'https://store.ubi.com',
    'gog': 'https://www.gog.com',
    'itch': 'https://itch.io',
    'humble': 'https://www.humblebundle.com',
    'green': 'https://www.greenmangaming.com',
    'fanatical': 'https://www.fanatical.com',
    'indiegala': 'https://www.indiegala.com',
    'bundle': 'https://www.bundlestars.com',
    'gamesplanet': 'https://www.gamesplanet.com',
    'wingamestore': 'https://www.wingamestore.com',
    'gamersgate': 'https://www.gamersgate.com',
    'gamesload': 'https://www.gamesload.com',
    'gamesrepublic': 'https://www.gamesrepublic.com',
    'gamesrocket': 'https://www.gamesrocket.com',
    'gamesdeal': 'https://www.gamesdeal.com',
    'gamesbillet': 'https://www.gamesbillet.com',
    'kyle': 'https://www.kyle.com',
  }

  // Auto-detect service URL for custom service names
  const autoDetectServiceUrl = (serviceName: string): string => {
    if (!serviceName || serviceName.trim() === '') return ''
    
    const normalizedName = serviceName.toLowerCase().trim()
    
    // Only return URL if service is in our mapping
    if (SERVICE_URL_MAPPING[normalizedName]) {
      return SERVICE_URL_MAPPING[normalizedName]
    }
    
    // For unknown services, return empty string (no auto-detection)
    return ''
  }

  // URL validation and formatting function
  const formatServiceUrl = (url: string): string => {
    if (!url || url.trim() === '') return ''
    
    const trimmedUrl = url.trim()
    
    // If it already has a protocol, return as is
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl
    }
    
    // If it starts with www., add https://
    if (trimmedUrl.startsWith('www.')) {
      return `https://${trimmedUrl}`
    }
    
    // If it looks like a domain (contains a dot but no protocol), add https://
    if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
      return `https://${trimmedUrl}`
    }
    
    // If it doesn't look like a valid URL, return as is (let user handle it)
    return trimmedUrl
  }

  // Service icon component for sidebar
  const SidebarServiceIcon = ({ serviceName, serviceUrl }: { serviceName: string, serviceUrl?: string }) => {
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

    const FAVICON_SERVICES: Array<'duckduckgo' | 'faviconio' | 'direct'> = ['duckduckgo', 'faviconio', 'direct']

    React.useEffect(() => {
      if (serviceUrl && serviceUrl.trim() !== '') {
        const faviconUrl = getFaviconServiceUrl(serviceUrl, FAVICON_SERVICES[currentServiceIndex])
        if (faviconUrl) {
          setCurrentSrc(faviconUrl)
          setImageError(false)
        } else {
          setImageError(true)
        }
      } else {
        setImageError(true)
      }
    }, [serviceUrl, currentServiceIndex])

    const handleImageError = () => {
      if (currentServiceIndex < FAVICON_SERVICES.length - 1) {
        const nextServiceIndex = currentServiceIndex + 1
        setCurrentServiceIndex(nextServiceIndex)
        const nextUrl = getFaviconServiceUrl(serviceUrl || '', FAVICON_SERVICES[nextServiceIndex])
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

    if (!serviceUrl || serviceUrl.trim() === '' || imageError || !currentSrc) {
      return (
        <div className="h-6 w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-white">
            {serviceName.charAt(0).toUpperCase()}
          </span>
        </div>
      )
    }

    return (
      <div className="h-6 w-6 rounded overflow-hidden flex items-center justify-center bg-white dark:bg-gray-100 shadow-sm border border-gray-200 dark:border-gray-300 flex-shrink-0">
        <Image
          src={currentSrc}
          alt={serviceName}
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
          onError={handleImageError}
          unoptimized={true}
        />
      </div>
    )
  }

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCredentialsForExport = () => {
    switch (exportScope) {
      case 'all':
        return credentials
      case 'current':
        // If not in credentials view or no folder selected, fallback to all
        if (viewMode !== 'credentials' || !selectedCategoryId) {
          return credentials
        }
        if (selectedCategoryId === 'all') {
          return credentials
        } else if (selectedCategoryId === 'uncategorized') {
          return credentials.filter(cred => !cred.category_id)
        } else {
          return credentials.filter(cred => cred.category_id === selectedCategoryId)
        }
      case 'specific':
        if (selectedExportFolder === 'all') {
          return credentials
        } else if (selectedExportFolder === 'uncategorized') {
          return credentials.filter(cred => !cred.category_id)
        } else {
          return credentials.filter(cred => cred.category_id === selectedExportFolder)
        }
      default:
        return credentials
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
      notes: credential.notes || '',
      category_id: credential.category_id || ''
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
    .filter(cred => {
      const matchesSearch = cred.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cred.username || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === 'all' || 
        (selectedCategory === 'uncategorized' && !cred.category_id) ||
        cred.category_id === selectedCategory
      
      const matchesService = selectedService === 'all' || 
        cred.service_name === selectedService
      
      return matchesSearch && matchesCategory && matchesService
    })
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
              placeholder={viewMode === 'categories' ? "Search folders..." : "Search credentials..."}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                // Reset service filter when searching
                if (e.target.value && selectedService !== 'all') {
                  setSelectedService('all')
                }
              }}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            {/* Category filter removed - now handled by folder navigation */}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {viewMode === 'categories' && (
            <Button
              variant="outline"
              onClick={() => setIsCategoryDialogOpen(true)}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
            </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(true)}
              className="w-full sm:w-auto whitespace-nowrap"
              disabled={credentials.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {viewMode === 'credentials' && (
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (open) {
                  // Clear form when dialog opens, but auto-select current category
                  let defaultCategoryId = 'none'
                  if (selectedCategoryId) {
                    // If we're in uncategorized or all vaults view, don't pre-select any category
                    defaultCategoryId = (selectedCategoryId === 'uncategorized' || selectedCategoryId === 'all') ? 'none' : selectedCategoryId
                  }
                  setFormData({ 
                    service_name: '', 
                    service_url: '', 
                    credential_type: 'basic', 
                    username: '', 
                    password: '', 
                    custom_fields: [], 
                    notes: '', 
                    category_id: defaultCategoryId 
                  })
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
              <ScrollArea className={`max-h-[60vh] pr-0 sm:pr-4`}>
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
                        placeholder="facebook.com or https://www.facebook.com/"
                        value={formData.service_url}
                        onChange={(e) => setFormData({ ...formData, service_url: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formData.service_url && formData.service_url === autoDetectServiceUrl(formData.service_name) 
                          ? "✓ URL auto-detected from service name" 
                          : "Enter domain like \"facebook.com\" or full URL like \"https://www.facebook.com/\""}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Folder *</Label>
                      <Select 
                        value={formData.category_id} 
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger className={validationErrors.category ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select a folder" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.category && (
                        <p className="text-sm text-red-500">Please select a folder</p>
                      )}
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
            )}
          </div>
        </div>


        {/* Categories or Credentials Grid */}
        {viewMode === 'categories' ? (
          // Categories View
          <>            {categories.length === 0 && getUncategorizedCount() === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-600 mb-4">
                  <Folder className="mx-auto h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No folders yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your first folder to organize your credentials
                </p>
                <Button onClick={() => setIsCategoryDialogOpen(true)} className="w-full sm:w-auto">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Your First Folder
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-start">
                {/* All Vaults folder - only show if it matches search or no search */}
                {(!searchTerm || 'all vaults'.includes(searchTerm.toLowerCase())) && (
                  <Card 
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer group h-40"
                    onClick={() => handleCategoryClick('all')}
                  >
                  <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 rounded-lg flex items-center justify-center transition-colors duration-200 group-hover:bg-opacity-20 bg-gray-500 dark:bg-gray-100">
                        <KeyIcon className="w-8 h-8 transition-all duration-200 dark:text-black text-white" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300">
                          All Vaults
                        </h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}

                {/* Uncategorized folder - only show if it matches search or no search */}
                {getUncategorizedCount() > 0 && (!searchTerm || 'uncategorized'.includes(searchTerm.toLowerCase())) && (
                  <Card 
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer group h-40"
                    onClick={() => handleCategoryClick('uncategorized')}
                  >
                    <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center transition-colors duration-200 group-hover:bg-opacity-20 bg-gray-100 dark:bg-gray-800">
                          <Folder className="w-8 h-8 transition-all duration-200 text-gray-500" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300">
                            Uncategorized
                          </h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Category folders */}
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => {
                    const credentialCount = credentials.filter(cred => cred.category_id === category.id).length
                    const isLastFolder = filteredCategories.length <= 1
                    return (
                      <CategoryFolder
                        key={category.id}
                        category={category}
                        credentialCount={credentialCount}
                        onClick={() => handleCategoryClick(category.id)}
                        onRename={handleRenameFolder}
                        onDelete={handleDeleteFolder}
                        isDeleting={isPreparingDelete && deletingCategory?.id === category.id}
                        isLastFolder={isLastFolder}
                      />
                    )
                  })
                ) : searchTerm ? (
                  <div className="col-span-full">
                    <div className="text-center py-12">
                      <div className="text-gray-400 dark:text-gray-600 mb-4">
                        <Search className="mx-auto h-12 w-12" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No folders found
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        No folders match your search for "{searchTerm}"
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Helpful message when only one folder */}
                {categories.length === 1 && (
                  <div className="col-span-full">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 <strong>Tip:</strong> Create more folders to better organize your credentials. 
                        The General folder cannot be deleted and will always be available for your credentials.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Credentials View
          <>
            {/* Back button and category info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={handleBackToCategories}
                  className="flex items-center space-x-2"
                >
                  <Folder className="h-4 w-4" />
                  <span>Back to Folders</span>
                </Button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedCategoryId === 'all' ? 'All Vaults' :
                   selectedCategoryId === 'uncategorized' ? 'Uncategorized' : 
                   selectedCategoryId === 'search' ? 'Search' :
                   categories.find(cat => cat.id === selectedCategoryId)?.name || 'Folder'}
                </div>
              </div>
              
              {/* Mobile Service Filter Dropdown - Only show when there are credentials */}
              {getCurrentFolderCredentials().length > 0 && (
                <div className="block sm:hidden">
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {getUniqueServices().map((service) => (
                        <SelectItem key={service} value={service}>
                          <div className="flex items-center gap-2">
                            <SidebarServiceIcon serviceName={service} serviceUrl={getServiceUrl(service)} />
                            {service}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

        {/* Sidebar Layout for Credentials View */}
        <div className="flex gap-6">
          {/* Services Sidebar - Hidden on mobile, auto icon-only on medium, hidden when no credentials */}
          {getCurrentFolderCredentials().length > 0 && (
            <div className={`${isIconOnlyMode ? 'w-20' : 'w-64'} flex-shrink-0 transition-all duration-200 hidden sm:block`}>
            <div className="bg-white dark:bg-card rounded-lg border p-4 h-full flex flex-col">
              <div className={`flex items-center mb-3 flex-shrink-0 ${isIconOnlyMode ? 'justify-center' : 'justify-between'}`}>
                {!isIconOnlyMode && (
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Services</h3>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsIconOnlyMode(!isIconOnlyMode)}
                  className="h-8 w-8 p-0"
                  disabled={isMediumScreen}
                  title={
                    isMediumScreen ? 'Auto-managed on medium screens' : 
                    (isIconOnlyMode ? 'Show text' : 'Show icons only')
                  }
                >
                  {isIconOnlyMode ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                </Button>
              </div>
              <ScrollArea className={`flex-1 ${getUniqueServices().length > 6 ? 'pr-2' : ''}`}>
                <div className="space-y-1">
                <button
                  onClick={() => setSelectedService('all')}
                  className={`w-full ${isIconOnlyMode ? 'flex justify-center px-1 py-1' : 'text-left px-3 py-2'} rounded-md text-sm transition-colors ${
                    selectedService === 'all' && (!searchTerm || searchTerm.trim() === '')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={isIconOnlyMode ? 'All Services' : undefined}
                >
                  {isIconOnlyMode ? (
                    <div className="h-6 w-6 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">A</span>
                    </div>
                  ) : (
                    'All Services'
                  )}
                </button>
                {getUniqueServices().map((service) => {
                  const isMatchingSearch = isServiceMatchingSearch(service)
                  return (
                    <button
                      key={service}
                      onClick={() => setSelectedService(service)}
                      className={`w-full ${isIconOnlyMode ? 'flex justify-center px-2 py-2' : 'text-left px-3 py-2'} rounded-md text-sm transition-colors ${
                        selectedService === service
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : isMatchingSearch
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={isIconOnlyMode ? service : undefined}
                    >
                    {isIconOnlyMode ? (
                      <SidebarServiceIcon serviceName={service} serviceUrl={getServiceUrl(service)} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <SidebarServiceIcon serviceName={service} serviceUrl={getServiceUrl(service)} />
                        <span className="truncate">{service}</span>
                      </div>
                    )}
                    </button>
                  )
                })}
                </div>
              </ScrollArea>
            </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 w-full sm:w-auto h-[calc(100vh-200px)]">
            {filteredCredentials.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-600 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {searchTerm ? 'No matching credentials found' : 
                       selectedCategoryId === 'all' ? 'No credentials yet' :
                       selectedCategoryId === 'search' ? 'No credentials to search' :
                       'No credentials in this folder'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {searchTerm ? 'Try adjusting your search terms' : 
                       selectedCategoryId === 'all' ? 'Add your first credential to get started' :
                       selectedCategoryId === 'search' ? 'Add some credentials first to search through them' :
                       'Add your first credential to this folder'}
                </p>
                {!searchTerm && (
                  <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Credential
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-start p-1">
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
              </ScrollArea>
            )}
          </div>
        </div>
          </>
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
            <ScrollArea className={`max-h-[60vh] pr-0 sm:pr-4 `}>
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
                      placeholder="facebook.com or https://www.facebook.com/"
                      value={formData.service_url}
                      onChange={(e) => setFormData({ ...formData, service_url: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.service_url && formData.service_url === autoDetectServiceUrl(formData.service_name) 
                        ? "✓ URL auto-detected from service name" 
                        : "Enter domain like \"facebook.com\" or full URL like \"https://www.facebook.com/\""}
                    </p>
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

        {/* Create Category Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Create a new folder to organize your credentials
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category_name">Folder Name</Label>
                <Input
                  id="category_name"
                  placeholder="e.g., Work, Personal, Social Media"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="category_color"
                    type="color"
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Folder</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Floating Action Button */}
        {viewMode === 'credentials' && (
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 cursor-pointer"
          size="lg"
          onClick={handleOpenAddDialog}
        >
          <Plus className="h-6 w-6" />
        </Button>
        )}

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

        {/* Delete Folder Dialog */}
        <Dialog open={isDeleteFolderDialogOpen} onOpenChange={setIsDeleteFolderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Folder</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the folder "{deletingCategory?.name}"? 
                {folderCredentials.length > 0 && (
                  <span className="block mt-2 text-red-600 dark:text-red-400">
                    This folder contains {folderCredentials.length} credential{folderCredentials.length !== 1 ? 's' : ''}.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {folderCredentials.length > 0 && (
              <div className="py-4 space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        What would you like to do with the credentials?
                      </h3>
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="moveCredentials"
                            name="credentialAction"
                            checked={!deleteCredentials}
                            onChange={() => setDeleteCredentials(false)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <label htmlFor="moveCredentials" className="text-sm text-yellow-700 dark:text-yellow-300">
                            Move credentials to another folder
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="deleteCredentials"
                            name="credentialAction"
                            checked={deleteCredentials}
                            onChange={() => setDeleteCredentials(true)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                          />
                          <label htmlFor="deleteCredentials" className="text-sm text-red-700 dark:text-red-300">
                            Delete all credentials in this folder
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {!deleteCredentials && (
                  <div className="space-y-2">
                    <Label htmlFor="moveToFolder">Move to folder:</Label>
                    <Select value={moveCredentialsTo} onValueChange={setMoveCredentialsTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter(cat => cat.id !== deletingCategory?.id)
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {folderCredentials.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border max-h-40 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Credentials in this folder:
                    </h4>
                    <div className="space-y-2">
                      {folderCredentials.map((cred) => (
                        <div key={cred.id} className="flex items-center space-x-3 text-sm">
                          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              {cred.service_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-gray-900 dark:text-white">{cred.service_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteFolderDialogOpen(false)
                  setDeletingCategory(null)
                  setFolderCredentials([])
                  setMoveCredentialsTo('')
                  setDeleteCredentials(false)
                  setIsPreparingDelete(false)
                }}
                disabled={isDeletingFolder}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteFolder}
                disabled={isDeletingFolder}
              >
                {isDeletingFolder ? (
                  <>
                    <LoaderThree />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Folder
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={(open) => {
          setIsExportDialogOpen(open)
          // Reset export scope to 'all' if current is selected but no current folder
          if (open && exportScope === 'current' && (viewMode !== 'credentials' || !selectedCategoryId)) {
            setExportScope('all')
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Credentials</DialogTitle>
              <DialogDescription>
                Choose what to export and the format. You can export {getCredentialsForExport().length} credential{getCredentialsForExport().length !== 1 ? 's' : ''}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
              {/* Export Scope */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">What to Export</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="export-all"
                      name="export-scope"
                      value="all"
                      checked={exportScope === 'all'}
                      onChange={(e) => setExportScope(e.target.value as 'all')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="export-all" className="flex items-center space-x-2 cursor-pointer">
                      <Database className="h-4 w-4" />
                      <span>All Vaults ({credentials.length} credentials)</span>
                    </Label>
                  </div>
                  {viewMode === 'credentials' && selectedCategoryId && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="export-current"
                        name="export-scope"
                        value="current"
                        checked={exportScope === 'current'}
                        onChange={(e) => setExportScope(e.target.value as 'current')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="export-current" className="flex items-center space-x-2 cursor-pointer">
                        <Folder className="h-4 w-4" />
                        <span>Current Folder ({getCredentialsForExport().length} credentials)</span>
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="export-specific"
                      name="export-scope"
                      value="specific"
                      checked={exportScope === 'specific'}
                      onChange={(e) => setExportScope(e.target.value as 'specific')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="export-specific" className="flex items-center space-x-2 cursor-pointer">
                      <Folder className="h-4 w-4" />
                      <span>Specific Folder</span>
                    </Label>
                  </div>
                </div>
              </div>

              {/* Specific Folder Selection */}
              {exportScope === 'specific' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select Folder</Label>
                  <Select value={selectedExportFolder} onValueChange={setSelectedExportFolder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vaults ({credentials.length})</SelectItem>
                      {getUncategorizedCount() > 0 && (
                        <SelectItem value="uncategorized">Uncategorized ({getUncategorizedCount()})</SelectItem>
                      )}
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name} ({getCredentialCountForCategory(category.id)})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Export Format */}
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
                disabled={isExporting || getCredentialsForExport().length === 0}
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