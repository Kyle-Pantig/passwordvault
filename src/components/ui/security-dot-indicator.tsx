import React from 'react'
import { cn } from '@/lib/utils'

interface SecurityDotIndicatorProps {
  hasIssues: boolean
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  className?: string
}

export function SecurityDotIndicator({ 
  hasIssues, 
  riskLevel, 
  className 
}: SecurityDotIndicatorProps) {
  if (!hasIssues) return null

  const getDotColor = () => {
    switch (riskLevel) {
      case 'low':
        return 'bg-yellow-500'
      case 'moderate':
        return 'bg-orange-500'
      case 'high':
        return 'bg-red-500'
      case 'critical':
        return 'bg-red-600 animate-pulse'
      default:
        return 'bg-yellow-500'
    }
  }

  return (
    <div
      className={cn(
        'absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900',
        getDotColor(),
        className
      )}
      title={`Security issues detected: ${riskLevel} risk level`}
    />
  )
}
