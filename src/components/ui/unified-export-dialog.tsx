"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { FileText, Shield, Download } from 'lucide-react'
import { LoaderThree } from './loader'

interface UnifiedExportDialogProps {
  isOpen: boolean
  onClose: () => void
  onExport: (format: string) => Promise<void>
  folderName?: string
  isExporting?: boolean
  credentialCount: number
  exportScope: 'all' | 'current' | 'specific'
  selectedExportFolder: string
  categories: Array<{ id: string; name: string }>
}

const EXPORT_FORMATS = [
  {
    id: 'csv',
    name: 'CSV',
    description: 'Comma-separated values - readable by Excel and Google Sheets',
    icon: FileText,
    requiresVerification: false,
    category: 'basic'
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'JavaScript Object Notation - structured data format',
    icon: FileText,
    requiresVerification: false,
    category: 'basic'
  },
  {
    id: 'txt',
    name: 'Plain Text',
    description: 'Simple text format - easy to read and edit',
    icon: FileText,
    requiresVerification: false,
    category: 'basic'
  }
]

export function UnifiedExportDialog({
  isOpen,
  onClose,
  onExport,
  folderName,
  isExporting = false,
  credentialCount,
  exportScope,
  selectedExportFolder,
  categories
}: UnifiedExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState('csv')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedFormatInfo = EXPORT_FORMATS.find(f => f.id === selectedFormat)


  const handleExport = async () => {
    setIsSubmitting(true)
    try {
      await onExport(selectedFormat)
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Credentials</span>
          </DialogTitle>
          <DialogDescription>
            Export {credentialCount} credential{credentialCount !== 1 ? 's' : ''} from {folderName || 'All Vaults'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">

          {/* Export Formats */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EXPORT_FORMATS.map((format) => {
                const Icon = format.icon
                return (
                  <div
                    key={format.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFormat === format.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedFormat(format.id)}
                  >
                    <input
                      type="radio"
                      id={format.id}
                      name="export-format"
                      value={format.id}
                      checked={selectedFormat === format.id}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <Label htmlFor={format.id} className="font-medium cursor-pointer">
                          {format.name}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          
          {/* Security Notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Security Notice</p>
                <p>
                  Exported files contain sensitive information. Store them securely and delete them when no longer needed.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || isExporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isSubmitting || isExporting}
          >
            {isSubmitting || isExporting ? (
              <>
                <LoaderThree />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedFormatInfo?.name || 'Credentials'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
