import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useVaultData } from './use-vault-data'
import { useQueryClient } from '@tanstack/react-query'
import { FolderLock } from '@/lib/types'

export function useFolderLocks() {
  // const { user } = useAuth()
  const { data: vaultData, isLoading, refetch } = useVaultData()
  const queryClient = useQueryClient()
  const [folderLocks, setFolderLocks] = useState<FolderLock[]>([])
  const [loading, setLoading] = useState(true)
  const [lockingFolders, setLockingFolders] = useState<Set<string>>(new Set())

  // Update folder locks when vault data changes
  useEffect(() => {
    if (vaultData?.folderLocks) {
      setFolderLocks(vaultData.folderLocks)
      setLoading(false)
    } else if (!isLoading) {
      setFolderLocks([])
      setLoading(false)
    }
  }, [vaultData?.folderLocks, isLoading])

  const fetchFolderLocks = async () => {
    // This function is now handled by the vault data hook
    // Keep it for compatibility but it's no longer needed
  }

  const createFolderLock = async (categoryId: string, lockType: string, passcode: string) => {
    try {
      const response = await fetch('/api/folder-locks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          lock_type: lockType,
          passcode: passcode
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Invalidate cache and refetch to update UI immediately
        await queryClient.invalidateQueries({ queryKey: ['vault-data'] })
        await refetch()
        return { success: true, data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create folder lock' 
      }
    }
  }

  const unlockFolder = async (categoryId: string, passcode: string) => {
    try {
      const response = await fetch('/api/folder-locks/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId,
          passcode: passcode
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Invalidate cache and refetch to update UI immediately
        await queryClient.invalidateQueries({ queryKey: ['vault-data'] })
        await refetch()
        return { success: true, data }
      } else {
        return { 
          success: false, 
          error: data.error,
          lockoutUntil: data.lockout_until,
          remainingAttempts: data.remaining_attempts
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unlock folder' 
      }
    }
  }

  const lockFolder = async (categoryId: string) => {
    // Add to locking set to prevent multiple clicks
    setLockingFolders(prev => new Set(prev).add(categoryId))
    
    try {
      const response = await fetch('/api/folder-locks/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryId
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Invalidate cache and refetch to update UI immediately
        await queryClient.invalidateQueries({ queryKey: ['vault-data'] })
        await refetch()
        return { success: true, data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to lock folder' 
      }
    } finally {
      // Remove from locking set
      setLockingFolders(prev => {
        const newSet = new Set(prev)
        newSet.delete(categoryId)
        return newSet
      })
    }
  }

  const removeFolderLock = async (lockId: string) => {
    try {
      const response = await fetch(`/api/folder-locks/${lockId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (response.ok) {
        // Invalidate cache and refetch to update UI immediately
        await queryClient.invalidateQueries({ queryKey: ['vault-data'] })
        await refetch()
        return { success: true, data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove folder lock' 
      }
    }
  }

  const getFolderLock = (categoryId: string) => {
    return folderLocks.find(lock => lock.category_id === categoryId)
  }

  const isFolderLocked = (categoryId: string) => {
    const lock = getFolderLock(categoryId)
    return lock ? lock.is_locked : false
  }

  const isFolderLocking = (categoryId: string) => {
    return lockingFolders.has(categoryId)
  }

  // useEffect removed - folder locks are now handled by vault data

  return {
    folderLocks,
    loading,
    createFolderLock,
    unlockFolder,
    lockFolder,
    removeFolderLock,
    getFolderLock,
    isFolderLocked,
    isFolderLocking,
    refreshFolderLocks: fetchFolderLocks
  }
}
