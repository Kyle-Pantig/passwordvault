'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Folder, MoreVertical, Edit2, Trash2, Check, X, Lock, Unlock, Shield, Users } from 'lucide-react'
import { LoaderThree } from '@/components/ui/loader'
import { Category, FolderLock } from '@/lib/types'
import { useTheme } from 'next-themes'
import { useUnlockedFolders } from '@/contexts/unlocked-folders-context'
import { useAutoLock } from '@/hooks/use-auto-lock'
import { useSubscription } from '@/contexts/subscription-context'
import { FolderLockDialog } from './folder-lock-dialog'
import { FolderUnlockDialog } from './folder-unlock-dialog'
import { FolderSharingDialog } from './folder-sharing-dialog'
import { toast } from 'sonner'

interface CategoryFolderProps {
  category: Category
  credentialCount: number
  onClick: () => void
  onRename: (id: string, newName: string) => void
  onDelete: (category: Category) => void
  isDeleting?: boolean
  isLastFolder?: boolean
  folderLock?: FolderLock
  onLockFolder?: (categoryId: string) => void
  onUnlockFolder?: (categoryId: string) => void
  onRemoveLock?: (categoryId: string) => void
  isFolderLocksLoading?: boolean
  isFolderLocking?: boolean
  isReadOnly?: boolean
  isShared?: boolean
  isOwner?: boolean
  isUpdating?: boolean
}

export function CategoryFolder({ 
  category, 
  credentialCount, 
  onClick, 
  onRename, 
  onDelete, 
  isDeleting = false, 
  isLastFolder = false,
  folderLock,
  onLockFolder,
  onUnlockFolder,
  onRemoveLock,
  isFolderLocksLoading = false,
  isFolderLocking = false,
  isReadOnly = false,
  isShared = false,
  isOwner = true,
  isUpdating = false
}: CategoryFolderProps) {
  
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(category.name)
  const [showLockDialog, setShowLockDialog] = useState(false)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [showSharingDialog, setShowSharingDialog] = useState(false)
  const { theme } = useTheme()
  const { subscription } = useSubscription()
  const { isFolderUnlocked, unlockFolder, lockFolder: contextLockFolder } = useUnlockedFolders()
  const darkMode = theme === 'dark'
  
  // Check if folder is actually unlocked (has lock AND is unlocked in context)
  const isActuallyUnlocked = folderLock && !folderLock.is_locked && isFolderUnlocked(category.id)
  
  // Auto-lock functionality
  useAutoLock({
    isUnlocked: isActuallyUnlocked || false,
    timeoutMinutes: 5, // 5 minutes auto-lock
    onAutoLock: () => {
      contextLockFolder(category.id)
      toast.info(`"${category.name}" folder has been automatically locked due to inactivity`)
    },
    categoryId: category.id
  })

  // Function to determine if a color is too light for the current theme
  const isColorTooLight = (color: string) => {
    // Remove # if present and convert to RGB
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    // In light mode, colors with luminance > 0.8 are too light
    // In dark mode, colors with luminance < 0.3 are too dark
    return darkMode ? luminance < 0.3 : luminance > 0.8
  }

  // Get appropriate icon color based on theme and folder color
  const getIconColor = () => {
    if (isColorTooLight(category.color)) {
      return darkMode ? '#ffffff' : '#000000'
    }
    return category.color
  }

  // Get appropriate background color for better contrast
  const getBackgroundColor = () => {
    if (isColorTooLight(category.color)) {
      return darkMode ? `${category.color}40` : `${category.color}60`
    }
    return `${category.color}20`
  }

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== category.name) {
      onRename(category.id, editName.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditName(category.name)
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleLockClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Prevent clicks while locking is in progress
    if (isFolderLocking) {
      return
    }
    
    if (!folderLock) {
      // No lock exists, show lock dialog to create one
      // For shared folders, only owners can create locks
      if (isShared && !isOwner) {
        toast.info("Only the folder owner can create locks on shared folders")
        return
      }
      setShowLockDialog(true)
    } else if (isActuallyUnlocked) {
      // Lock exists but is unlocked, lock it in context
      // For shared folders, only owners can lock
      if (isShared && !isOwner) {
        toast.info("Only the folder owner can lock shared folders")
        return
      }
      contextLockFolder(category.id)
      if (onLockFolder) {
        onLockFolder(category.id)
      }
    } else {
      // Lock exists and is locked, show unlock dialog
      // Both owners and shared users can unlock (shared users use owner's passcode)
      setShowUnlockDialog(true)
    }
  }

  const handleLockSuccess = () => {
    // Unlock the folder in context after successful unlock
    unlockFolder(category.id)
    if (onLockFolder) {
      onLockFolder(category.id)
    }
    // Automatically open the folder after successful unlock
    onClick()
  }

  const handleLockCreated = () => {
    // Just close the dialog after successful lock creation
    setShowLockDialog(false)
    if (onLockFolder) {
      onLockFolder(category.id)
    }
  }

  const handleRemoveLock = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemoveLock) {
      onRemoveLock(category.id)
    }
  }

  const handleFolderClick = () => {
    // If folder has a lock and is not unlocked in context, show unlock dialog
    if (folderLock && !isActuallyUnlocked) {
      setShowUnlockDialog(true)
      return
    }
    // Otherwise, proceed with normal folder opening
    onClick()
  }

  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-200 group h-40 relative ${isFolderLocking || isUpdating ? 'cursor-wait' : 'cursor-pointer'}`}
      onClick={!isEditing && !isFolderLocking && !isUpdating ? handleFolderClick : undefined}
    >
      {/* Loading overlay for deleting */}
      {isDeleting && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
          <div className="flex flex-col items-center space-y-2">
            <LoaderThree />
            <span className="text-sm text-gray-600 dark:text-gray-400">Preparing delete...</span>
          </div>
        </div>
      )}
      
      {/* Loading overlay for locking */}
      {isFolderLocking && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
          <div className="flex flex-col items-center space-y-2">
            <LoaderThree />
            <span className="text-sm text-gray-600 dark:text-gray-400">Locking folder...</span>
          </div>
        </div>
      )}

      {/* Loading overlay for updating */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
          <div className="flex flex-col items-center space-y-2">
            <LoaderThree />
            <span className="text-sm text-gray-600 dark:text-gray-400">Updating folder...</span>
          </div>
        </div>
      )}

      {/* Three-dot menu positioned in top right corner */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1 h-8 w-8 opacity-70 hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
              disabled={isDeleting}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              disabled={isReadOnly}
              className={isReadOnly ? "text-gray-400 cursor-not-allowed" : ""}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isReadOnly ? "Rename (Read-only)" : "Rename"}
            </DropdownMenuItem>
            
            {/* Sharing option for Pro users */}
            {subscription?.plan === 'PRO' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowSharingDialog(true); }}>
                <Users className="w-4 h-4 mr-2" />
                Share Folder
              </DropdownMenuItem>
            )}
            
            {/* Lock/Unlock options */}
            {folderLock ? (
              <>
                <DropdownMenuItem 
                  onClick={handleLockClick}
                  disabled={isFolderLocking || (isShared && !isOwner && isActuallyUnlocked)}
                  className={(isShared && !isOwner && isActuallyUnlocked) ? "text-gray-400 cursor-not-allowed" : ""}
                >
                  {isFolderLocking ? (
                    <>
                      <LoaderThree />
                      {!isActuallyUnlocked ? "Unlocking..." : "Locking..."}
                    </>
                  ) : !isActuallyUnlocked ? (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Unlock Folder
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {isShared && !isOwner ? "Lock Folder (Owner Only)" : "Lock Folder"}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleRemoveLock}
                  disabled={isShared && !isOwner}
                  className={`text-red-600 focus:text-red-600 ${isShared && !isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {isShared && !isOwner ? "Remove Lock (Owner Only)" : "Remove Lock"}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem 
                onClick={handleLockClick}
                disabled={isFolderLocking || (isShared && !isOwner)}
                className={isShared && !isOwner ? "text-gray-400 cursor-not-allowed" : ""}
              >
                {isFolderLocking ? (
                  <>
                    <LoaderThree />
                    Adding Lock...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    {isShared && !isOwner ? "Add Lock (Owner Only)" : "Add Lock"}
                  </>
                )}
              </DropdownMenuItem>
            )}
            
            {/* Only show delete option if it's not the General folder and not a shared folder */}
            {category.name.toLowerCase() !== 'general' && !isShared && (
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(category); }}
                className={isLastFolder || isReadOnly ? "text-gray-400 cursor-not-allowed" : "text-red-600 focus:text-red-600"}
                disabled={isLastFolder || isReadOnly}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isLastFolder ? "Delete (Last folder)" : isReadOnly ? "Delete (Read-only)" : "Delete"}
              </DropdownMenuItem>
            )}
            
            {/* Show delete option for shared folders only for owners */}
            {category.name.toLowerCase() !== 'general' && isShared && isOwner && (
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(category); }}
                className={isLastFolder || isReadOnly ? "text-gray-400 cursor-not-allowed" : "text-red-600 focus:text-red-600"}
                disabled={isLastFolder || isReadOnly}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isLastFolder ? "Delete (Last folder)" : isReadOnly ? "Delete (Read-only)" : "Delete"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="flex flex-col items-center space-y-3 w-full">
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center transition-colors duration-200 group-hover:bg-opacity-20 relative"
            style={{ backgroundColor: getBackgroundColor() }}
          >
            {folderLock && !isActuallyUnlocked ? (
              <Lock 
                className="w-8 h-8 transition-all duration-200" 
                style={{ color: getIconColor() }}
              />
            ) : (
              <Folder 
                className="w-8 h-8 transition-all duration-200" 
                style={{ color: getIconColor() }}
              />
            )}
            {/* Lock indicator */}
            {isFolderLocksLoading ? (
              <div className="absolute -top-1 -right-1">
                <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center">
                  <LoaderThree />
                </div>
              </div>
            ) : folderLock ? (
              <div className="absolute -top-1 -right-1">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  {!isActuallyUnlocked ? (
                    <Lock className="w-3 h-3 text-white" />
                  ) : (
                    <Unlock className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
            ) : null}
            
            {/* Shared folder indicator */}
            {isShared && (
              <div className="absolute -top-1 -left-1">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <Users className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-1 w-full">
            {isEditing ? (
              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="text-center text-lg font-semibold"
                  autoFocus
                />
                <Button size="sm" onClick={handleRename} className="p-1 h-8 w-8">
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} className="p-1 h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 flex items-center gap-2">
                  {category.name}
                </h3>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:block hidden">
              {isShared && !isOwner && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  Shared by {(category as any)?.owner_email || 'Unknown'}
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>

      {/* Lock Dialog */}
      <FolderLockDialog
        isOpen={showLockDialog}
        onClose={() => setShowLockDialog(false)}
        categoryId={category.id}
        categoryName={category.name}
        onSuccess={handleLockCreated}
        isShared={isShared}
      />

      {/* Unlock Dialog */}
      {folderLock && (
        <FolderUnlockDialog
          isOpen={showUnlockDialog}
          onClose={() => setShowUnlockDialog(false)}
          categoryId={category.id}
          categoryName={category.name}
          lockType={folderLock.lock_type}
          onSuccess={handleLockSuccess}
          lockoutUntil={folderLock.lockout_until}
          remainingAttempts={folderLock.max_attempts - folderLock.failed_attempts}
        />
      )}

      {/* Sharing Dialog */}
      <FolderSharingDialog
        isOpen={showSharingDialog}
        onClose={() => setShowSharingDialog(false)}
        folderId={category.id}
        folderName={category.name}
      />
    </Card>
  )
}
