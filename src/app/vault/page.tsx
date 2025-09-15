"use client"
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CategoryFolder } from '@/components/ui/category-folder'
import { FolderRemoveLockDialog } from '@/components/ui/folder-remove-lock-dialog'
import { LockedFolderExportVerificationDialog } from '@/components/ui/locked-folder-export-verification-dialog'
import { UnifiedExportDialog } from '@/components/ui/unified-export-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DynamicCredentialCard } from '@/components/ui/dynamic-credential-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderThree } from '@/components/ui/loader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { useUnlockedFolders } from '@/contexts/unlocked-folders-context'
import { useSubscription } from '@/contexts/subscription-context'
import { useSocket } from '@/contexts/socket-context'
import { useVaultData } from '@/hooks/use-vault-data'
import { useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/database'
import { analyzePasswordRisk, PasswordRiskAnalysis } from '@/lib/password-risk-analysis'
import { generateStrongPassword, PASSWORD_PRESETS, GeneratedPassword } from '@/lib/password-generator'
import { createClient } from '@/lib/supabase/client'
import { Category, CredentialType, Credential } from '@/lib/types'
import { useFolderLocks } from '@/hooks/use-folder-locks'
import { BarChart3, Database, Download, Eye, EyeOff, Filter, Folder, FolderPlus, HardDrive, KeyIcon, LayoutGrid, List, Plus, RefreshCw, Search, Shield, Smartphone, Trash2, Zap, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

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


const VaultPage = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { subscription, canAddCredential, getRemainingCredits } = useSubscription()
    
    // Use cached vault data
    const { data: vaultData, isLoading, error, refetch } = useVaultData()
    const queryClient = useQueryClient()
    const { socket, isConnected } = useSocket()
    const credentials = vaultData?.credentials || []
    const [categories, setCategories] = useState<any[]>([])
    const loading = isLoading

    // Merge regular categories with shared folders
    useEffect(() => {
      if (vaultData) {
        const regularCategories = vaultData.categories || []
        const sharedFolders = vaultData.sharedFolders || []
        const mergedCategories = [...regularCategories, ...sharedFolders]
        setCategories(mergedCategories)
      }
    }, [vaultData])
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [isUpdatingCredential, setIsUpdatingCredential] = useState(false)
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
    const [isCustomService, setIsCustomService] = useState(false)
    const [isMediumScreen, setIsMediumScreen] = useState(false)
    const [customServiceName, setCustomServiceName] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [updatingFolderId, setUpdatingFolderId] = useState<string | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [exportScope, setExportScope] = useState<'all' | 'current' | 'specific'>('all')
    const [selectedExportFolder, setSelectedExportFolder] = useState<string>('all')
    const [isUnifiedExportDialogOpen, setIsUnifiedExportDialogOpen] = useState(false)
  const [pendingExportAction, setPendingExportAction] = useState<(() => void) | null>(null)
  const [isLockedFolderVerificationDialogOpen, setIsLockedFolderVerificationDialogOpen] = useState(false)
  const [lockedFoldersForExport, setLockedFoldersForExport] = useState<Array<{id: string, name: string, lockType: 'passcode_4' | 'passcode_6' | 'password'}>>([])
  const [hasTwoFactor, setHasTwoFactor] = useState(false)
  const [pendingExportFormat, setPendingExportFormat] = useState<string>('')
    const [viewMode, setViewMode] = useState<'categories' | 'credentials'>('categories')
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
    const [isDeleteFolderDialogOpen, setIsDeleteFolderDialogOpen] = useState(false)
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
    const [folderCredentials, setFolderCredentials] = useState<Credential[]>([])
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)
  const [isPreparingDelete, setIsPreparingDelete] = useState(false)
  const [moveCredentialsTo, setMoveCredentialsTo] = useState<string>('')
  const [deleteCredentials, setDeleteCredentials] = useState(false)
  const [isCheckingCredentialAccess, setIsCheckingCredentialAccess] = useState(false)
  const [hasProcessedCredentialParam, setHasProcessedCredentialParam] = useState(false)
  const [isRemoveLockDialogOpen, setIsRemoveLockDialogOpen] = useState(false)
  const [removingLockCategoryId, setRemovingLockCategoryId] = useState<string | null>(null)
  const [removingLockCategoryName, setRemovingLockCategoryName] = useState<string>('')
  const [removingLockType, setRemovingLockType] = useState<'passcode_4' | 'passcode_6' | 'password'>('passcode_4')
  
  // Password generation state for edit dialog
    const [generatedPassword, setGeneratedPassword] = useState<GeneratedPassword | null>(null)
    const [showPasswordDialog, setShowPasswordDialog] = useState(false)
    const [targetFieldId, setTargetFieldId] = useState<string | null>(null)
    
    // Local state for field visibility (eye button)
    const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({})
    
    const { user, loading: authLoading } = useAuth()
    const { isFolderUnlocked } = useUnlockedFolders()
    const { 
      folderLocks, 
      loading: folderLocksLoading,
      createFolderLock, 
      unlockFolder, 
      lockFolder, 
      removeFolderLock, 
      getFolderLock, 
      isFolderLocked,
      isFolderLocking,
      refreshFolderLocks
    } = useFolderLocks()
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
          !field.value || field.value.trim() === ''
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
    if (!authLoading) {
      if (user) {
        // Check if user is already verified (either in metadata or session storage)
        const isVerified = user?.user_metadata?.two_factor_verified || 
                          sessionStorage.getItem('2fa_verified') === 'true'
        
        if (isVerified) {
          // User is already verified, data will be loaded by useVaultData hook
          // No need to call loadCredentials() as it's handled by React Query
        } else {
          // Check if user needs 2FA verification (only on fresh login)
          check2FAAndLoadCredentials()
        }
      } else {
        // No user and auth loading is complete, redirect to login
        router.push('/login')
      }
    }
  }, [user, authLoading, router])

  // Update categories when vaultData changes
  useEffect(() => {
    if (vaultData?.categories) {
      setCategories(vaultData.categories)
    }
  }, [vaultData?.categories])

  // Process vault data when it changes
  useEffect(() => {
    if (vaultData) {
      // Process shared credentials and merge with regular credentials
      const sharedFoldersData = vaultData.sharedFolders || []
      const credentialsData = vaultData.credentials || []
      const categoriesData = vaultData.categories || []
      
      // Add shared folders to categories list for display
      const sharedCategories = sharedFoldersData.map((folder: any) => ({
        id: `shared-${folder.folder_id}`,
        user_id: 'shared',
        name: folder.name || 'Unknown Folder',
        color: folder.color || '#3B82F6',
        icon: folder.icon || 'folder',
        created_at: folder.shared_at,
        updated_at: folder.shared_at,
        is_shared: true,
        shared_permission: folder.permission_level,
        original_folder_id: folder.folder_id,
        folder_id: folder.folder_id,
        owner_email: folder.owner_email
      }))
      
      // Combine regular categories with shared folders
      const allCategories = [...categoriesData, ...sharedCategories]
      
      // Update the categories state to include shared folders
      setCategories(allCategories)
      
      // Analyze password risk
      const analysis = analyzePasswordRisk(credentialsData)
      setRiskAnalysis(analysis)
    }
  }, [vaultData])

  // Update folder locks when vault data changes
  useEffect(() => {
    if (vaultData?.folderLocks) {
      // Update the folder locks context if it has a method to set locks directly
      // This is a temporary solution - ideally the folder locks context should use the vault data
    }
  }, [vaultData?.folderLocks])

  // Set default category when categories are loaded (only if not in All Vaults view)
  useEffect(() => {
    if (categories.length > 0 && !formData.category_id && selectedCategoryId && selectedCategoryId !== 'all' && selectedCategoryId !== 'uncategorized' && selectedCategoryId !== 'search') {
      // Only auto-select if we're in a specific category view, not in All Vaults
      const defaultCategory = categories.find(cat => cat.name.toLowerCase() === 'general') || categories[0]
      setFormData(prev => ({ ...prev, category_id: defaultCategory.id }))
    }
  }, [categories, formData.category_id, selectedCategoryId])

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const isMedium = width >= 640 && width < 1024 // md breakpoint
      setIsMediumScreen(isMedium)
      
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

  // Reset credential processing flag when search params change
  useEffect(() => {
    setHasProcessedCredentialParam(false)
  }, [searchParams])

  // Check 2FA status
  useEffect(() => {
    const check2FAStatus = async () => {
      if (user) {
        try {
          const response = await fetch('/api/2fa/status')
          if (response.ok) {
            const data = await response.json()
            setHasTwoFactor(data.twoFactorEnabled)
          }
        } catch (error) {
        }
      }
    }
    check2FAStatus()
  }, [user])

  // Listen for vault refresh events (e.g., when access is revoked)
  useEffect(() => {
    if (socket && isConnected) {
      const handleVaultRefresh = (data: any) => {
        // Invalidate and refetch vault data
        queryClient.invalidateQueries({ queryKey: ['vault-data'] })
        refetch()
        
        // Show a toast notification if it's an access revocation
        if (data.type === 'access_revoked') {
          toast.info('Your access to a shared folder has been revoked')
        }
      }

      socket.on('vault:refresh', handleVaultRefresh)
      
      return () => {
        socket.off('vault:refresh', handleVaultRefresh)
      }
    }
  }, [socket, isConnected, queryClient, refetch])

  // Handle credential parameter from security page
  useEffect(() => {
    const credentialParam = searchParams.get('credential')
    if (credentialParam && credentials.length > 0 && !hasProcessedCredentialParam) {
      setIsCheckingCredentialAccess(true)
      setHasProcessedCredentialParam(true)
      
      // Extract main credential ID from field ID if it's a field
      let credentialId = credentialParam
      if (credentialParam.includes('-field-')) {
        // Extract the main credential ID before the field part
        credentialId = credentialParam.split('-field-')[0]
      }
      
      // Find the credential
      const credential = credentials.find(cred => cred.id === credentialId)
      if (credential) {
        // Check if the credential is in a locked folder
        if (credential.category_id) {
          const folderLock = getFolderLock(credential.category_id)
          if (folderLock && !isFolderUnlocked(credential.category_id)) {
            // Show error message and redirect to All Vaults view
            toast.error('This credential is in a locked folder. Please unlock the folder first to view it.')
            
            // Reset to All Vaults view
            setViewMode('categories')
            setSelectedCategory('all')
            setSelectedCategoryId('all')
            
            // Clear the URL parameter
            const url = new URL(window.location.href)
            url.searchParams.delete('credential')
            router.replace(url.pathname + url.search, { scroll: false })
            setIsCheckingCredentialAccess(false)
            return
          }
        }
        
        // Switch to credentials view
        setViewMode('credentials')
        
        // Set the appropriate category/folder
        if (credential.category_id) {
          setSelectedCategoryId(credential.category_id)
          setSelectedCategory(credential.category_id)
        } else {
          // If no category, show uncategorized
          setSelectedCategoryId('uncategorized')
          setSelectedCategory('uncategorized')
        }
        
        // Wait for the view to update, then scroll to the credential
        setTimeout(() => {
          const credentialElement = document.getElementById(`credential-${credentialId}`)
          if (credentialElement) {
            // Scroll to the credential with smooth behavior
            credentialElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            })
            
            // Add a temporary highlight effect with matching border radius
            credentialElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50', 'rounded-xl')
            setTimeout(() => {
              credentialElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50', 'rounded-xl')
            }, 3000)
          }
          setIsCheckingCredentialAccess(false)
        }, 100)
        
        // Clear the URL parameter
        const url = new URL(window.location.href)
        url.searchParams.delete('credential')
        router.replace(url.pathname + url.search, { scroll: false })
      } else {
        setIsCheckingCredentialAccess(false)
      }
    }
  }, [credentials, searchParams, router, getFolderLock, isFolderUnlocked, hasProcessedCredentialParam])


  const check2FAAndLoadCredentials = async () => {
    try {
      // Check if user has 2FA enabled using the cached data
      const twoFactorEnabled = vaultData?.twoFactorEnabled || false
      
      if (twoFactorEnabled) {
        // Check if user has already been verified (via backup code or TOTP)
        const { data: { user } } = await supabase.auth.getUser()
        const isVerified = user?.user_metadata?.two_factor_verified || 
                          sessionStorage.getItem('2fa_verified') === 'true'
        
        if (isVerified) {
          // User has been verified, data will be loaded by useVaultData hook
          return
        }
        
        // User has 2FA enabled but not verified, redirect to verification
        // This should only happen during fresh login, not on every page reload
        router.push('/verify-2fa')
        return
      }
      
      // User doesn't have 2FA enabled, data will be loaded by useVaultData hook
    } catch (error) {
      // If there's an error checking 2FA status, data will be loaded by useVaultData hook
    }
  }

  // Refetch function for manual updates
  const loadCredentials = () => {
    refetch()
  }

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check subscription limits
    const canAdd = await canAddCredential()
    if (!canAdd) {
      const remainingCredits = await getRemainingCredits()
      if (remainingCredits === 0) {
        toast.error(`You've reached your credential limit! Upgrade to add more credentials.`)
        // Optionally redirect to pricing page
        setTimeout(() => {
          router.push('/pricing')
        }, 2000)
        return
      }
    }
    
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
          // Refetch data to get the new category
          refetch()
        } else {
          throw new Error('Failed to create General folder')
        }
      }

      const credentialData = {
        ...formData,
        service_url: formattedUrl,
        category_id: categoryId
      }
      
      // Check if this is a shared folder by looking at the category data
      const selectedCategory = categories.find((cat: any) => cat.id === categoryId)
      const isSharedFolder = selectedCategory && (selectedCategory as any).is_shared && (selectedCategory as any).shared_permission === 'write'
      
      let response
      if (isSharedFolder) {
        // Use shared credential API
        response = await fetch('/api/credentials/shared/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credentialData,
            sharedFolderId: categoryId // categoryId is already the original folder ID
          })
        })
      } else {
        // Use regular credential API
        response = await fetch('/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentialData)
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 403) {
          toast.error(`Credential limit reached! You have ${errorData.current}/${errorData.limit} credentials on your ${errorData.plan} plan.`)
          setTimeout(() => {
            router.push('/pricing')
          }, 2000)
          return
        }
        throw new Error(errorData.error || 'Failed to create credential')
      }

      toast.success(isSharedFolder ? 'Credential added to shared folder successfully!' : 'Credential added successfully!')
      setIsAddDialogOpen(false)
      // Clear form data and validation errors, but keep the credential type
      setFormData({ service_name: '', service_url: '', credential_type: formData.credential_type, username: '', password: '', custom_fields: [], notes: '', category_id: '' })
      setValidationErrors({ serviceName: false, customFields: false, category: false })
      
      // Invalidate and refetch to ensure data is updated immediately
      await queryClient.invalidateQueries({ queryKey: ['vault-data'] })
      await refetch()
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


  const handleOpenAddDialog = () => {
    // Clear form data when opening the dialog, but auto-select current category if in credentials view
    let defaultCategoryId = ''
    if (viewMode === 'credentials' && selectedCategoryId) {
      // If we're in uncategorized or all vaults view, don't pre-select any category
      defaultCategoryId = (selectedCategoryId === 'uncategorized' || selectedCategoryId === 'all') ? '' : selectedCategoryId
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

    setIsUpdatingCredential(true)
    try {
      // Format the service URL before submission
      const formattedUrl = formatServiceUrl(formData.service_url)
      
      // Convert "none" to empty string for category_id
      const credentialData = {
        ...formData,
        service_url: formattedUrl,
        category_id: formData.category_id
      }
      
      // Create updated credential object with all properties
      const updatedCredential = {
        ...editingCredential,
        ...credentialData
      }
      
      // Use our updateCredential function which handles shared credentials
      await updateCredential(updatedCredential)
      
      setIsEditDialogOpen(false)
      setEditingCredential(null)
      setFormData({ service_name: '', service_url: '', credential_type: 'basic', username: '', password: '', custom_fields: [], notes: '', category_id: '' })
      await queryClient.invalidateQueries({ queryKey: ['vault-data'] })
      await refetch()
    } catch (_error) {
      toast.error('Failed to update credential')
    } finally {
      setIsUpdatingCredential(false)
    }
  }

  const updateCredential = async (credential: Credential) => {
    try {
      
      // Check if this is a shared credential
      if (credential.is_shared) {
        // Use the shared credential API
        const response = await fetch('/api/credentials/shared', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credentialId: credential.id,
            credentialData: {
              service_name: credential.service_name,
              service_url: credential.service_url,
              credential_type: credential.credential_type,
              username: credential.username,
              password: credential.password,
              custom_fields: credential.custom_fields,
              notes: credential.notes,
              category_id: credential.category_id
            }
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update shared credential')
        }

        const updatedCredential = await response.json()
        toast.success('Shared credential updated successfully!')
      } else {
        // Use the regular database service for non-shared credentials
        await db.updateCredential(credential.id, {
          service_name: credential.service_name,
          service_url: credential.service_url,
          credential_type: credential.credential_type,
          username: credential.username,
          password: credential.password,
          custom_fields: credential.custom_fields,
          notes: credential.notes,
          category_id: credential.category_id
        })
        
        toast.success('Credential updated successfully!')
      }
      
      // Update the editingCredential state if this credential is currently being edited
      if (editingCredential && editingCredential.id === credential.id) {
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
      }
      
      await queryClient.invalidateQueries({ queryKey: ['vault-data'] })
      await refetch()
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
      await queryClient.invalidateQueries({ queryKey: ['vault-data'] })
      await refetch()
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
      setIsUpdating(true)
      setUpdatingFolderId(categoryId)
      
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
    } finally {
      setIsUpdating(false)
      setUpdatingFolderId(null)
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
      toast.error('Failed to fetch folder credentials')
    } finally {
      setIsPreparingDelete(false)
    }
    
    setIsDeleteFolderDialogOpen(true)
  }

  // Folder lock handlers
  const handleLockFolder = async (categoryId: string) => {
    await lockFolder(categoryId)
  }

  const handleUnlockFolder = async (categoryId: string) => {
    // Refresh folder locks to get updated status
    await refreshFolderLocks()
  }

  const handleRemoveLock = async (categoryId: string) => {
    const folderLock = getFolderLock(categoryId)
    if (folderLock) {
      // Find the category name
      const category = categories.find(cat => cat.id === categoryId)
      setRemovingLockCategoryId(categoryId)
      setRemovingLockCategoryName(category?.name || 'Unknown Folder')
      setRemovingLockType(folderLock.lock_type)
      setIsRemoveLockDialogOpen(true)
    }
  }

  const handleRemoveLockSuccess = async () => {
    // Refresh folder locks and credentials after successful removal
    await refreshFolderLocks()
    await loadCredentials()
    setIsRemoveLockDialogOpen(false)
    setRemovingLockCategoryId(null)
    setRemovingLockCategoryName('')
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
    const headers = [
      'Service Name', 
      'Service URL', 
      'Credential Type', 
      'Username', 
      'Password', 
      'Category', 
      'Notes', 
      'Custom Fields', 
      'Created At', 
      'Updated At'
    ]
    const csvContent = [
      headers.join(','),
      ...credentials.map(cred => [
        `"${cred.service_name}"`,
        `"${cred.service_url || ''}"`,
        `"${cred.credential_type}"`,
        `"${cred.username || ''}"`,
        `"${cred.password || ''}"`,
        `"${cred.category?.name || 'Uncategorized'}"`,
        `"${cred.notes || ''}"`,
        `"${cred.custom_fields?.length ? JSON.stringify(cred.custom_fields) : ''}"`,
        `"${new Date(cred.created_at).toLocaleString()}"`,
        `"${new Date(cred.updated_at).toLocaleString()}"`
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
        credential_type: cred.credential_type,
        username: cred.username,
        password: cred.password,
        category: cred.category?.name || 'Uncategorized',
        notes: cred.notes,
        custom_fields: cred.custom_fields,
        created_at: cred.created_at,
        updated_at: cred.updated_at
      }))
    }
    
    return JSON.stringify(exportData, null, 2)
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

  const handleLockedFolderVerification = async (verificationCode: string, verificationType: 'totp' | 'backup' | 'email') => {
    try {
      const response = await fetch('/api/export/verify-locked-folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationCode,
          verificationType,
          exportFormat: pendingExportFormat
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Invalid verification code')
        return false
      }

      toast.success('Verification successful')
      return true
    } catch (error) {
      toast.error('Verification failed')
      return false
    }
  }

  const handleAdvancedExport = async (format: string) => {
    // This function is called when user selects a format in the unified dialog
    // No verification needed here - just proceed with export
    await performActualExport(format)
  }

  const performActualExport = async (format: string) => {
    const credentialsToExport = getCredentialsForExport()
    
    if (credentialsToExport.length === 0) {
      toast.error('No credentials to export')
      return
    }

    // Check for locked folders
    const lockedFolderIds = checkForLockedFolders()
    
    if (lockedFolderIds.length > 0) {
      // Prepare locked folders data for verification dialog
      const lockedFoldersData = lockedFolderIds.map(folderId => {
        const folderLock = getFolderLock(folderId)
        const category = categories.find(cat => cat.id === folderId)
        return {
          id: folderId,
          name: category?.name || 'Unknown Folder',
          lockType: folderLock?.lock_type || 'passcode_6'
        }
      }).filter(folder => folder.name !== 'Unknown Folder')
      
      setLockedFoldersForExport(lockedFoldersData)
      setPendingExportFormat(format)
      setPendingExportAction(() => () => performActualExportAfterVerification(format))
      setIsLockedFolderVerificationDialogOpen(true)
      return
    }

    // Proceed with export without verification
    await performActualExportAfterVerification(format)
  }

  const performActualExportAfterVerification = async (format: string) => {
    const credentialsToExport = getCredentialsForExport()

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

      switch (format) {
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
        case 'txt':
          content = exportToJSON(credentialsToExport)
          filename = `digivault-${folderName}-export-${timestamp}.txt`
          mimeType = 'text/plain'
          break
        default:
          throw new Error('Invalid export format')
      }

      downloadFile(content, filename, mimeType)
      toast.success(`Credentials exported successfully as ${format.toUpperCase()}`)
      setIsUnifiedExportDialogOpen(false)
    } catch (error) {
      toast.error('Failed to export credentials')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExport = async () => {
    const credentialsToExport = getCredentialsForExport()
    
    if (credentialsToExport.length === 0) {
      toast.error('No credentials to export')
      return
    }

    // Open unified export dialog directly - no verification needed here
    setIsUnifiedExportDialogOpen(true)
  }

  // Category management functions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    setIsCreatingCategory(true)

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
        
        // Handle specific error cases
        if (response.status === 409) {
          toast.error(error.error || 'A folder with this name already exists. Please choose a different name.')
        } else if (response.status === 400) {
          toast.error(error.error || 'Please provide a valid category name.')
        } else {
          toast.error(error.error || 'Failed to create category')
        }
      }
    } catch (error) {
      toast.error('Failed to create category. Please try again.')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleCategoryClick = async (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setViewMode('credentials')
    setSelectedCategory(categoryId)
    setSelectedService('all')
    
    // Shared credentials are now loaded in the main loadCredentials function
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

  // Check if a folder is read-only (shared with read permission)
  const isFolderReadOnly = (categoryId: string) => {
    if (!categoryId.startsWith('shared-')) return false
    
    // Get the most up-to-date categories from vaultData if available
    const currentCategories = vaultData ? [...(vaultData.categories || []), ...(vaultData.sharedFolders || [])] : categories
    const category = currentCategories.find(cat => cat.id === categoryId)
    const isReadOnly = (category as any)?.shared_permission === 'read'
    return isReadOnly
  }

  // Check if a credential is read-only (shared with read permission)
  const isCredentialReadOnly = (credential: any) => {
    const isReadOnly = credential.is_shared && credential.shared_permission === 'read'
    return isReadOnly
  }

  // Check if the current user is the owner of a shared credential
  const isCredentialOwner = (credential: any) => {
    if (!credential.is_shared) return true // Regular credentials are owned by the current user
    
    // For shared credentials, check if the current user is the owner of the shared folder
    const category = categories.find(cat => cat.id === credential.category_id)
    return category ? !(category as any)?.is_shared || (category as any)?.user_id !== 'shared' : false
  }

  const getCurrentFolderCredentials = () => {
    let currentCredentials
    if (selectedCategoryId === 'all') {
      currentCredentials = credentials
    } else if (selectedCategoryId === 'uncategorized') {
      currentCredentials = credentials.filter(cred => !cred.category_id)
    } else {
      // Handle shared folders
      if (selectedCategoryId && selectedCategoryId.startsWith('shared-')) {
        // For shared folders, filter by the shared category ID directly
        currentCredentials = credentials.filter(cred => cred.category_id === selectedCategoryId)
      } else {
        currentCredentials = credentials.filter(cred => cred.category_id === selectedCategoryId)
      }
    }
    
    // Only filter out credentials from locked folders when viewing "All Vaults"
    // When viewing a specific folder, show all credentials (user can unlock to see them)
    if (selectedCategoryId === 'all') {
      return currentCredentials.filter(cred => {
        if (!cred.category_id) return true // Uncategorized credentials are always shown
        
        const folderLock = getFolderLock(cred.category_id)
        // Use the folder lock data directly instead of the context
        return !folderLock || !folderLock.is_locked
      })
    }
    
    // For specific folders, return all credentials (locked or not)
    return currentCredentials
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

  const checkForLockedFolders = () => {
    const credentialsToExport = getCredentialsForExport()
    const lockedFolders = new Set<string>()
    
    // Check if any credentials belong to locked folders
    credentialsToExport.forEach(cred => {
      if (cred.category_id && isFolderLocked(cred.category_id)) {
        lockedFolders.add(cred.category_id)
      }
    })
    
    return Array.from(lockedFolders)
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

  const generatePassword = (fieldId?: string) => {
    try {
      // Choose preset based on credential type
      const preset = formData.credential_type === 'advanced' ? PASSWORD_PRESETS.api : PASSWORD_PRESETS.strong
      const password = generateStrongPassword(preset)
      
      setGeneratedPassword(password)
      setTargetFieldId(fieldId || null)
      setShowPasswordDialog(true)
    } catch (error) {
      toast.error('Failed to generate password')
    }
  }

  const applyGeneratedPassword = () => {
    if (!generatedPassword) return

    if (formData.credential_type === 'basic') {
      // Update basic credential password
      setFormData({ ...formData, password: generatedPassword.password })
    } else if (formData.credential_type === 'advanced' && targetFieldId) {
      // Update advanced credential field
      const newFields = formData.custom_fields.map(field => 
        field.id === targetFieldId 
          ? { ...field, value: generatedPassword.password }
          : field
      )
      setFormData({ ...formData, custom_fields: newFields })
    }

    setShowPasswordDialog(false)
    setGeneratedPassword(null)
    setTargetFieldId(null)
    toast.success('Password generated successfully')
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

  // Helper function to check if a credential has security issues
  const getCredentialSecurityIssues = (credential: Credential) => {
    if (!riskAnalysis) return { isWeak: false, isReused: false, strength: null }
    
    // Check for exact match or field-specific IDs that start with the credential ID
    const weakPassword = riskAnalysis.weakPasswords.find(w => 
      w.id === credential.id || w.id.startsWith(`${credential.id}-`)
    )
    const reusedPassword = riskAnalysis.reusedPasswords.find(r => 
      r.services.some(s => s.id === credential.id || s.id.startsWith(`${credential.id}-`))
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
        cred.category_id === selectedCategory ||
        (selectedCategory.startsWith('shared-') && cred.category_id === selectedCategory)
      const matchesService = selectedService === 'all' || 
        cred.service_name === selectedService
      
      // Hide credentials from locked folders only when viewing "All Vaults"
      const isFromLockedFolder = selectedCategory === 'all' && cred.category_id && (() => {
        const folderLock = getFolderLock(cred.category_id)
        return folderLock && folderLock.is_locked
      })()
      
      return matchesSearch && matchesCategory && matchesService && !isFromLockedFolder
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

  if (loading || isCheckingCredentialAccess || folderLocksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
                        <p className="mt-4 text-gray-600 dark:text-gray-400">
                          Loading...
                        </p>
        </div>
      </div>
    )
  }


  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 sm:pt-32 py-20 ">
        {/* Subscription Status Banner */}
        {subscription && subscription.plan !== 'PRO' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    {subscription.plan === 'FREE' ? 'Free Plan' : 'Plus Plan'}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {subscription.credentialLimit === -1 
                      ? 'Unlimited credentials' 
                      : `${credentials.length} / ${subscription.credentialLimit} credentials used`
                    }
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => router.push('/pricing')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Upgrade
              </Button>
            </div>
          </div>
        )}

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
                          {categories
                            .filter((category: any) => !category.is_shared) // Only show regular categories
                            .map((category) => (
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
                          {/* Add shared folders with write permission */}
                          {categories
                            .filter((category: any) => category.is_shared && category.shared_permission === 'write')
                            .map((category: any) => (
                              <SelectItem key={`shared-${category.id}`} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: category.color }}
                                  />
                                  {category.name} (Shared)
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.category && (
                        <p className="text-sm text-red-500 font-medium">⚠️ Please select a folder to organize your credential</p>
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
                                      newFields[index] = { ...field, isMasked: checked }
                                      setFormData({ ...formData, custom_fields: newFields })
                                    }}
                                    className="scale-75"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  {field.isMasked && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generatePassword(field.id)}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Generate
                                    </Button>
                                  )}
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
                              </div>
                              <div className="relative">
                                <Input
                                  type={field.isMasked ? (fieldVisibility[field.id] ? "text" : "password") : "text"}
                                  placeholder={field.isMasked ? "(e.g., API Key, Token, Password)" : "(e.g., Service Name, Username, Email)"}
                                  value={field.value}
                                  onFocus={() => {
                                    const inputType = field.isMasked ? (fieldVisibility[field.id] ? "text" : "password") : "text";
                                  }}
                                  onChange={(e) => {
                                    const newFields = [...formData.custom_fields]
                                    newFields[index] = { ...field, value: e.target.value }
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
                                      setFieldVisibility(prev => ({
                                        ...prev,
                                        [field.id]: !prev[field.id]
                                      }));
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                                  >
                                    {fieldVisibility[field.id] ? (
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
                                id: `field-${crypto.randomUUID()}`,
                                name: '',
                                value: '',
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
                        folderLock={getFolderLock(category.id)}
                        onLockFolder={handleLockFolder}
                        onUnlockFolder={handleUnlockFolder}
                        onRemoveLock={handleRemoveLock}
                        isFolderLocksLoading={folderLocksLoading}
                        isFolderLocking={isFolderLocking(category.id)}
                        isReadOnly={isFolderReadOnly(category.id)}
                        isShared={(category as any)?.is_shared || false}
                        isOwner={!(category as any)?.is_shared || (category as any)?.user_id !== 'shared'}
                        isUpdating={isUpdating && updatingFolderId === category.id}
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
            {/* Back button and folder name */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={handleBackToCategories}
                  className="flex items-center space-x-2"
                >
                  <Folder className="h-4 w-4" />
                  <span>Back to Folders</span>
                </Button>
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
              
              {/* Folder name below back button */}
              <div className="text-md text-gray-500 dark:text-gray-400 text-center">
                {selectedCategoryId === 'all' ? 'All Vaults' :
                 selectedCategoryId === 'uncategorized' ? 'Uncategorized' : 
                 selectedCategoryId === 'search' ? 'Search Results' :
                 categories.find(cat => cat.id === selectedCategoryId)?.name || 'Folder'}
              </div>
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
                      <div key={credential.id} id={`credential-${credential.id}`}>
                        <DynamicCredentialCard
                          credential={credential}
                          onEdit={openEditDialog}
                          onDelete={openDeleteDialog}
                          onUpdate={updateCredential}
                          visiblePasswords={visiblePasswords}
                          onTogglePasswordVisibility={togglePasswordVisibility}
                          securityIssues={securityIssues}
                          isReadOnly={isCredentialReadOnly(credential)}
                          isShared={credential.is_shared || false}
                          isOwner={isCredentialOwner(credential)}
                        />
                      </div>
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
                        <div className="flex items-center justify-between">
                          <Label htmlFor="edit_password">Password</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => generatePassword()}
                            className="h-6 px-2 text-xs"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Generate
                          </Button>
                        </div>
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
                                      newFields[index] = { ...field, isMasked: checked }
                                      setFormData({ ...formData, custom_fields: newFields })
                                      
                                    }}
                                    className="scale-75"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  {field.isMasked && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generatePassword(field.id)}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Generate
                                    </Button>
                                  )}
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
                              </div>
                            <div className="relative">
                               <Input
                                 type={field.isMasked ? (fieldVisibility[field.id] ? "text" : "password") : "text"}
                                 placeholder={field.isMasked ? "(e.g., API Key, Token, Password)" : "(e.g., Service Name, Username, Email)"}
                                 value={field.value}
                                 onFocus={() => {
                                   const inputType = field.isMasked ? (fieldVisibility[field.id] ? "text" : "password") : "text";
                                 }}
                                 onChange={(e) => {
                                   const newFields = [...formData.custom_fields]
                                   newFields[index] = { ...field, value: e.target.value }
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
                                     setFieldVisibility(prev => ({
                                       ...prev,
                                       [field.id]: !prev[field.id]
                                     }));
                                   }}
                                   className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                                 >
                                   {fieldVisibility[field.id] ? (
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdatingCredential}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="edit-credential-form"
                disabled={isUpdatingCredential}
              >
                {isUpdatingCredential ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Credential'
                )}
              </Button>
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
                  disabled={isCreatingCategory}
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
                    disabled={isCreatingCategory}
                    className="w-16 h-10"
                  />
                  <Input
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    placeholder="#3B82F6"
                    disabled={isCreatingCategory}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCategoryDialogOpen(false)}
                  disabled={isCreatingCategory}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingCategory}>
                  {isCreatingCategory ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Folder'
                  )}
                </Button>
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
            Choose what to export. You can export {getCredentialsForExport().length} credential{getCredentialsForExport().length !== 1 ? 's' : ''}. Format options will be available in the next step.
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
                    Choose Format & Export
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Password Generation Confirmation Dialog */}
        <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {formData.credential_type === 'advanced' ? 'Generated Strong Value' : 'Generated Strong Password'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {formData.credential_type === 'advanced' 
                  ? 'A new strong value has been generated. Do you want to replace the current value with this one?'
                  : 'A new strong password has been generated. Do you want to replace the current password with this one?'
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {generatedPassword && (
              <div className="my-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formData.credential_type === 'advanced' ? 'Generated Value:' : 'Generated Password:'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    generatedPassword?.strength === 'very-strong' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    generatedPassword?.strength === 'strong' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                    generatedPassword?.strength === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {generatedPassword?.strength?.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-sm bg-white dark:bg-gray-900 p-2 rounded border break-all">
                  {generatedPassword?.password}
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Length: {generatedPassword?.password?.length} characters
                </div>
              </div>
            )}
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={applyGeneratedPassword}>
                {formData.credential_type === 'advanced' ? 'Replace Value' : 'Replace Password'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Folder Lock Dialog */}
        {removingLockCategoryId && (
          <FolderRemoveLockDialog
            isOpen={isRemoveLockDialogOpen}
            onClose={() => {
              setIsRemoveLockDialogOpen(false)
              setRemovingLockCategoryId(null)
              setRemovingLockCategoryName('')
            }}
            categoryId={removingLockCategoryId}
            categoryName={removingLockCategoryName}
            lockType={removingLockType}
            onSuccess={handleRemoveLockSuccess}
          />
        )}

        {/* Unified Export Dialog */}
        <UnifiedExportDialog
          isOpen={isUnifiedExportDialogOpen}
          onClose={() => setIsUnifiedExportDialogOpen(false)}
          onExport={handleAdvancedExport}
          folderName={
            exportScope === 'specific' && selectedExportFolder !== 'all' && selectedExportFolder !== 'uncategorized'
              ? categories.find(cat => cat.id === selectedExportFolder)?.name || 'folder'
              : exportScope === 'all' || (exportScope === 'specific' && selectedExportFolder === 'all')
              ? 'All Vaults'
              : 'Current Folder'
          }
          isExporting={isExporting}
          credentialCount={getCredentialsForExport().length}
          exportScope={exportScope}
          selectedExportFolder={selectedExportFolder}
          categories={categories}
        />


        {/* Locked Folder Export Verification Dialog */}
        <LockedFolderExportVerificationDialog
          isOpen={isLockedFolderVerificationDialogOpen}
          onClose={() => {
            setIsLockedFolderVerificationDialogOpen(false)
            setLockedFoldersForExport([])
            setPendingExportAction(null)
            setPendingExportFormat('')
          }}
          onVerify={async (verificationCode, verificationType) => {
            const success = await handleLockedFolderVerification(verificationCode, verificationType)
            if (success && pendingExportAction) {
              await pendingExportAction()
            }
            return success
          }}
          lockedFolders={lockedFoldersForExport}
          hasTwoFactor={hasTwoFactor}
          exportFormat={pendingExportFormat}
          isLoading={isExporting}
        />
    </main>
  )
}

export default VaultPage