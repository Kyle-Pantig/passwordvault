'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Folder, FolderOpen, MoreVertical, Edit2, Trash2, Check, X } from 'lucide-react'
import { LoaderThree } from '@/components/ui/loader'
import { Category } from '@/lib/types'

interface CategoryFolderProps {
  category: Category
  credentialCount: number
  onClick: () => void
  onRename: (id: string, newName: string) => void
  onDelete: (category: Category) => void
  isDeleting?: boolean
  isLastFolder?: boolean
}

export function CategoryFolder({ category, credentialCount, onClick, onRename, onDelete, isDeleting = false, isLastFolder = false }: CategoryFolderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(category.name)

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

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 group h-40 relative cursor-pointer"
      onClick={!isEditing ? onClick : undefined}
    >
      {/* Loading overlay */}
      {isDeleting && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
          <div className="flex flex-col items-center space-y-2">
            <LoaderThree />
            <span className="text-sm text-gray-600 dark:text-gray-400">Preparing delete...</span>
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
              <Edit2 className="w-4 h-4 mr-2" />
              Rename
            </DropdownMenuItem>
            {/* Only show delete option if it's not the General folder */}
            {category.name.toLowerCase() !== 'general' && (
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(category); }}
                className={isLastFolder ? "text-gray-400 cursor-not-allowed" : "text-red-600 focus:text-red-600"}
                disabled={isLastFolder}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isLastFolder ? "Delete (Last folder)" : "Delete"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="flex flex-col items-center space-y-3 w-full">
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center transition-colors duration-200 group-hover:bg-opacity-20"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <Folder 
              className="w-8 h-8 transition-all duration-200" 
              style={{ color: category.color }}
            />
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
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300">
                  {category.name}
                </h3>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:block hidden">
              {credentialCount} credential{credentialCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
