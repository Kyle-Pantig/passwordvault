"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useUnlockedFolders } from '@/contexts/unlocked-folders-context';
import { useFolderLocks } from '@/hooks/use-folder-locks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Shield, AlertCircle, CheckCircle, Eye, EyeOff, Info, ExternalLink, Lock } from 'lucide-react';
import { LoaderThree } from '@/components/ui/loader';
import { PasswordRiskAnalysis, analyzePasswordRisk, getRiskLevelColor, getRiskLevelText } from '@/lib/password-risk-analysis';
import { db } from '@/lib/database';
import { Credential } from '@/lib/types';
import { toast } from 'sonner';

export default function SecurityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isFolderUnlocked } = useUnlockedFolders();
  const { getFolderLock, loading: folderLocksLoading, folderLocks, refreshFolderLocks } = useFolderLocks();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [analysis, setAnalysis] = useState<PasswordRiskAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [visibleWeakCredentials, setVisibleWeakCredentials] = useState(5);
  const [visibleReusedCredentials, setVisibleReusedCredentials] = useState(3);

  useEffect(() => {
    if (user && !authLoading) {
      fetchCredentials();
    } else if (!user && !authLoading) {
      router.push('/login');
    }
  }, [user, authLoading, router]);


  const fetchCredentials = async () => {
    try {
      setLoading(true);
      // Refresh folder locks first to get the latest lock status
      await refreshFolderLocks();
      
      const data = await db.getCredentials();
      setCredentials(data);
      
      // Analyze password risk
      const riskAnalysis = analyzePasswordRisk(data);
      setAnalysis(riskAnalysis);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while loading credentials');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (credentialId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  // Helper function to mask usernames and emails
  const maskEmail = (username: string) => {
    if (!username) return username
    
    // Check if it's an email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(username)) {
      // It's an email - mask the local part but keep domain
      const [localPart, domain] = username.split('@')
      if (localPart.length <= 2) return username
      
      const firstChar = localPart[0]
      const lastChar = localPart[localPart.length - 1]
      const maskedMiddle = '*'.repeat(Math.max(1, localPart.length - 2))
      
      return `${firstChar}${maskedMiddle}${lastChar}@${domain}`
    } else {
      // It's a username - mask everything except first and last character
      if (username.length <= 2) return username
      
      const firstChar = username[0]
      const lastChar = username[username.length - 1]
      const maskedMiddle = '*'.repeat(Math.max(1, username.length - 2))
      
      return `${firstChar}${maskedMiddle}${lastChar}`
    }
  };

  // Helper function to get password for a specific credential ID
  const getPasswordForCredential = (credentialId: string): string => {
    const credential = credentials.find(cred => cred.id === credentialId);
    return credential?.password || '';
  };

  // Helper function to check if a credential is in a locked folder
  const isCredentialLocked = (credentialId: string): boolean => {
    // Handle composite IDs from advanced credentials (format: credentialId-fieldId)
    const actualCredentialId = credentialId.includes('-field-') 
      ? credentialId.split('-field-')[0] 
      : credentialId;
    
    const credential = credentials.find(cred => cred.id === actualCredentialId);
    if (credential && credential.category_id) {
      const folderLock = getFolderLock(credential.category_id);
      // Use the folder lock data directly instead of the context
      const isLocked = Boolean(folderLock && folderLock.is_locked);
      
      return isLocked;
    }
    return false;
  };

  const refreshAnalysis = async () => {
    try {
      setLoading(true);
      // Refresh folder locks first to get the latest lock status
      await refreshFolderLocks();
      
      const data = await db.getCredentials();
      setCredentials(data);
      
      const riskAnalysis = analyzePasswordRisk(data);
      setAnalysis(riskAnalysis);
      // Reset pagination when refreshing
      setVisibleWeakCredentials(5);
      setVisibleReusedCredentials(3);
      toast.success('Security analysis refreshed');
    } catch (error) {
      console.error('Error refreshing analysis:', error);
      toast.error('Failed to refresh analysis');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreWeakCredentials = () => {
    setVisibleWeakCredentials(prev => Math.min(prev + 5, analysis?.weakPasswords.length || 0));
  };

  const loadMoreReusedCredentials = () => {
    setVisibleReusedCredentials(prev => Math.min(prev + 3, analysis?.reusedPasswords.length || 0));
  };

  const navigateToCredential = (credentialId: string) => {
    // Find the credential to check its folder
    const credential = credentials.find(cred => cred.id === credentialId);
    if (credential && credential.category_id) {
      // Check if the folder is locked
      const folderLock = getFolderLock(credential.category_id);
      if (folderLock && !isFolderUnlocked(credential.category_id)) {
        toast.error('This credential is in a locked folder. Please unlock the folder first to view it.');
        return;
      }
    }
    
    // Navigate to vault with the specific credential ID as a URL parameter
    router.push(`/vault?credential=${credentialId}`);
  };

  if (authLoading || loading || folderLocksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
                        <p className="mt-4 text-gray-600 dark:text-gray-400">
                          Loading...
                        </p>
        </div>
      </div>
    );
  }


  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-black py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Security Analysis
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Analyze your credential security and identify potential risks
              </p>
            </div>
            <Button onClick={refreshAnalysis} variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>
        </div>

        {analysis && (
          <div className="space-y-8">
            {/* Risk Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weak Credentials Card */}
              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Credential Risk Exposure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {analysis.weakCredentials}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Weak credentials
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {analysis.reusedCredentials}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Reused credentials
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Score Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4" />
                    Security Risk Score
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-medium">How the Risk Score Works:</p>
                            <div className="text-sm space-y-1">
                              <p>• <strong>Weak credentials:</strong> 50 points each</p>
                              <p>• <strong>Reused credentials:</strong> 30 points each</p>
                              <p>• <strong>Total credentials:</strong> Affects overall calculation</p>
                            </div>
                            <div className="text-sm space-y-1 pt-2 border-t">
                              <p><strong>Score Ranges:</strong></p>
                              <p>• <span className="text-green-600">0-200:</span> Low Risk</p>
                              <p>• <span className="text-yellow-600">201-500:</span> Moderate Risk</p>
                              <p>• <span className="text-orange-600">501-800:</span> High Risk</p>
                              <p>• <span className="text-red-600">801-1000:</span> Critical Risk</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold">{analysis.riskScore}</span>
                      <Badge className={`${getRiskLevelColor(analysis.riskLevel)}`}>
                        {getRiskLevelText(analysis.riskLevel)}
                      </Badge>
                    </div>
                    
                    {/* Risk Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${
                            analysis.riskLevel === 'low' ? 'bg-green-500' :
                            analysis.riskLevel === 'moderate' ? 'bg-yellow-500' :
                            analysis.riskLevel === 'high' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (analysis.riskScore / 1000) * 100)}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Low</span>
                        <span>Moderate</span>
                        <span>High</span>
                        <span>Critical</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weak Credentials Details */}
            {analysis.weakPasswords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    Weak Credentials ({analysis.weakPasswords.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.weakPasswords.slice(0, visibleWeakCredentials).map((weak, index) => {
                      const isLocked = isCredentialLocked(weak.id);
                      return (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border transition-colors group ${
                          isLocked 
                            ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60' 
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30'
                        }`}
                        onClick={() => !isLocked && navigateToCredential(weak.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-300">
                                  {weak.service_name}
                                </span>
                              </div>
                              {!weak.isAdvanced && (
                                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                  ({maskEmail(weak.username)})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              {weak.strength.replace('-', ' ').toUpperCase()}
                            </Badge>
                            {isLocked ? (
                              <Lock className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                            )}
                          </div>
                        </div>
                        
                        {/* Security Issues or Locked Message */}
                        <div className="mt-2">
                          {isLocked ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <Lock className="h-4 w-4" />
                              This credential is in a locked folder. Unlock the folder to view it.
                            </div>
                          ) : (
                            <>
                              <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Security issues found:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {weak.issues.map((issue, issueIndex) => (
                                  <Badge key={issueIndex} variant="outline" className="text-xs border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 mr-1 mb-1">
                                    {issue}
                                  </Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      );
                    })}
                    
                    {/* Load More Button */}
                    {visibleWeakCredentials < analysis.weakPasswords.length && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={loadMoreWeakCredentials}
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Load More ({analysis.weakPasswords.length - visibleWeakCredentials} remaining)
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reused Credentials Details */}
            {analysis.reusedPasswords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    Reused Credentials ({analysis.reusedPasswords.length} groups)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.reusedPasswords.slice(0, visibleReusedCredentials).map((reused, index) => (
                      <div key={index} className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              Credential used {reused.count} times
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">
                            REUSED
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            Used in these services:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {reused.services.map((service, serviceIndex) => {
                              const isLocked = isCredentialLocked(service.id);
                              return (
                              <div 
                                key={serviceIndex} 
                                className={`p-2 rounded border transition-colors group ${
                                  isLocked 
                                    ? 'bg-gray-100 dark:bg-gray-900/50 cursor-not-allowed opacity-60' 
                                    : 'bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                onClick={() => !isLocked && navigateToCredential(service.id)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <div className="flex items-center gap-1">
                                        <span className="font-medium text-sm group-hover:text-orange-700 dark:group-hover:text-orange-300">{service.service_name}</span>
                                        {isLocked && (
                                          <Lock className="h-3 w-3 text-gray-500" />
                                        )}
                                      </div>
                                      {!service.isAdvanced && (
                                        <span className="ml-2 text-xs text-gray-500">({maskEmail(service.username)})</span>
                                      )}
                                    </div>
                                    {isLocked ? (
                                      <Lock className="h-3 w-3 text-gray-400" />
                                    ) : (
                                      <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isLocked) {
                                        togglePasswordVisibility(service.id);
                                      }
                                    }}
                                    className="h-6 w-6 p-0"
                                    disabled={isLocked}
                                  >
                                    {showPasswords[service.id] ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                {/* Credential Display */}
                                <div className="mt-2">
                                  {isLocked ? (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <Lock className="h-3 w-3" />
                                      Locked folder - credential hidden
                                    </div>
                                  ) : (
                                    <>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Credential:</div>
                                      <div className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm font-mono">
                                        {showPasswords[service.id] ? getPasswordForCredential(service.id) : '••••••••'}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Load More Button for Reused Credentials */}
                    {visibleReusedCredentials < analysis.reusedPasswords.length && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={loadMoreReusedCredentials}
                          className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                        >
                          Load More ({analysis.reusedPasswords.length - visibleReusedCredentials} remaining)
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Issues Found */}
            {analysis.weakPasswords.length === 0 && analysis.reusedPasswords.length === 0 && (
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
                      Excellent Security!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      All your credentials meet security standards. No weak or reused credentials detected.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        </div>
      </div>
    </TooltipProvider>
  );
}
