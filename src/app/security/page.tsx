"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { LoaderThree } from '@/components/ui/loader';
import { PasswordRiskAnalysis, analyzePasswordRisk, getRiskLevelColor, getRiskLevelText } from '@/lib/password-risk-analysis';
import { db } from '@/lib/database';
import { Credential } from '@/lib/types';
import { toast } from 'sonner';

export default function SecurityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [analysis, setAnalysis] = useState<PasswordRiskAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

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
      const data = await db.getCredentials();
      setCredentials(data);
      
      // Analyze password risk
      const riskAnalysis = analyzePasswordRisk(data);
      console.log('Security page - Credentials count:', data.length);
      console.log('Security page - Risk analysis:', riskAnalysis);
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

  // Helper function to get password for a specific credential ID
  const getPasswordForCredential = (credentialId: string): string => {
    const credential = credentials.find(cred => cred.id === credentialId);
    return credential ? credential.password : '';
  };

  const refreshAnalysis = async () => {
    try {
      setLoading(true);
      const data = await db.getCredentials();
      setCredentials(data);
      
      const riskAnalysis = analyzePasswordRisk(data);
      setAnalysis(riskAnalysis);
      toast.success('Security analysis refreshed');
    } catch (error) {
      console.error('Error refreshing analysis:', error);
      toast.error('Failed to refresh analysis');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center relative">
          <LoaderThree />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading security analysis...</p>
        </div>
      </div>
    );
  }


  return (
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
                Analyze your password security and identify potential risks
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
                    Password Risk Exposure
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

            {/* Weak Passwords Details */}
            {analysis.weakPasswords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    Weak Passwords ({analysis.weakPasswords.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.weakPasswords.map((weak, index) => (
                      <div key={index} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                            <div>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {weak.service_name}
                              </span>
                              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                ({weak.username})
                              </span>
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            {weak.strength.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        
                        {/* Password Issues */}
                        <div className="mt-2">
                          <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                            Issues found:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {weak.issues.map((issue, issueIndex) => (
                              <Badge key={issueIndex} variant="outline" className="text-xs border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 mr-1 mb-1">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reused Passwords Details */}
            {analysis.reusedPasswords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    Reused Passwords ({analysis.reusedPasswords.length} groups)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.reusedPasswords.map((reused, index) => (
                      <div key={index} className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              Password used {reused.count} times
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
                            {reused.services.map((service, serviceIndex) => (
                              <div key={serviceIndex} className="p-2 bg-white dark:bg-gray-800 rounded border">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="font-medium text-sm">{service.service_name}</span>
                                    <span className="ml-2 text-xs text-gray-500">({service.username})</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePasswordVisibility(service.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    {showPasswords[service.id] ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                {/* Password Display */}
                                <div className="mt-2">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Password:</div>
                                  <div className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm font-mono">
                                    {showPasswords[service.id] ? getPasswordForCredential(service.id) : '••••••••'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
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
                      All your passwords meet security standards. No weak or reused passwords detected.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
