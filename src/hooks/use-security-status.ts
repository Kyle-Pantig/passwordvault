import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/database'
import { analyzePasswordRisk } from '@/lib/password-risk-analysis'

export interface SecurityStatus {
  hasIssues: boolean
  weakCount: number
  reusedCount: number
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  loading: boolean
}

export function useSecurityStatus(): SecurityStatus {
  const { user } = useAuth()
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    hasIssues: false,
    weakCount: 0,
    reusedCount: 0,
    riskLevel: 'low',
    loading: true
  })

  useEffect(() => {
    const checkSecurityStatus = async () => {
      if (!user) {
        setSecurityStatus({
          hasIssues: false,
          weakCount: 0,
          reusedCount: 0,
          riskLevel: 'low',
          loading: false
        })
        return
      }

      try {
        // Load credentials
        const credentials = await db.getCredentials()
        
        // Analyze password risk
        const analysis = analyzePasswordRisk(credentials)
        
        setSecurityStatus({
          hasIssues: analysis.weakCredentials > 0 || analysis.reusedCredentials > 0,
          weakCount: analysis.weakCredentials,
          reusedCount: analysis.reusedCredentials,
          riskLevel: analysis.riskLevel,
          loading: false
        })
      } catch (error) {
        setSecurityStatus({
          hasIssues: false,
          weakCount: 0,
          reusedCount: 0,
          riskLevel: 'low',
          loading: false
        })
      }
    }

    checkSecurityStatus()
  }, [user])

  return securityStatus
}
