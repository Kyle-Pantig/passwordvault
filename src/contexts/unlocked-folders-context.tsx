"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

interface UnlockedFoldersContextType {
  unlockedFolders: Set<string>
  unlockFolder: (categoryId: string) => void
  lockFolder: (categoryId: string) => void
  isFolderUnlocked: (categoryId: string) => boolean
  clearAllUnlocked: () => void
}

const UnlockedFoldersContext = createContext<UnlockedFoldersContextType | undefined>(undefined)

export function UnlockedFoldersProvider({ children }: { children: React.ReactNode }) {
  const [unlockedFolders, setUnlockedFolders] = useState<Set<string>>(new Set())

  const unlockFolder = useCallback((categoryId: string) => {
    setUnlockedFolders(prev => new Set(prev).add(categoryId))
  }, [])

  const lockFolder = useCallback((categoryId: string) => {
    setUnlockedFolders(prev => {
      const newSet = new Set(prev)
      newSet.delete(categoryId)
      return newSet
    })
  }, [])

  const isFolderUnlocked = useCallback((categoryId: string) => {
    return unlockedFolders.has(categoryId)
  }, [unlockedFolders])

  const clearAllUnlocked = useCallback(() => {
    setUnlockedFolders(new Set())
  }, [])

  return (
    <UnlockedFoldersContext.Provider
      value={{
        unlockedFolders,
        unlockFolder,
        lockFolder,
        isFolderUnlocked,
        clearAllUnlocked
      }}
    >
      {children}
    </UnlockedFoldersContext.Provider>
  )
}

export function useUnlockedFolders() {
  const context = useContext(UnlockedFoldersContext)
  if (context === undefined) {
    throw new Error('useUnlockedFolders must be used within an UnlockedFoldersProvider')
  }
  return context
}
