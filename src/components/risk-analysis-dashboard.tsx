"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { PasswordRiskAnalysis, getRiskLevelColor, getRiskLevelText } from '@/lib/password-risk-analysis';

interface RiskAnalysisDashboardProps {
  analysis: PasswordRiskAnalysis;
  onViewDetails?: () => void;
}

export function RiskAnalysisDashboard({ analysis, onViewDetails }: RiskAnalysisDashboardProps) {
  const getRiskBarWidth = (score: number) => {
    return Math.min(100, (score / 1000) * 100);
  };

  const getRiskBarColor = (score: number) => {
    if (score <= 200) return 'bg-green-500';
    if (score <= 500) return 'bg-yellow-500';
    if (score <= 800) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {analysis.weakCredentials}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Weak credentials
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {analysis.reusedCredentials}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
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
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{analysis.riskScore}</span>
                <Badge className={`${getRiskLevelColor(analysis.riskLevel)}`}>
                  {getRiskLevelText(analysis.riskLevel)}
                </Badge>
              </div>
              
              {/* Risk Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getRiskBarColor(analysis.riskScore)}`}
                    style={{ width: `${getRiskBarWidth(analysis.riskScore)}%` }}
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

      {/* Detailed Analysis */}
      {(analysis.weakPasswords.length > 0 || analysis.reusedPasswords.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Issues Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Weak Passwords */}
            {analysis.weakPasswords.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Weak Passwords ({analysis.weakPasswords.length})
                </h4>
                <div className="space-y-2">
                  {analysis.weakPasswords.slice(0, 5).map((weak, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded border">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          <span className="font-medium">{weak.service_name}</span>
                          <span className="text-sm text-gray-500">({weak.username})</span>
                        </div>
                      <Badge variant="destructive" className="text-xs">
                        {weak.strength.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                  {analysis.weakPasswords.length > 5 && (
                    <div className="text-sm text-gray-500 text-center">
                      +{analysis.weakPasswords.length - 5} more weak passwords
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reused Passwords */}
            {analysis.reusedPasswords.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Reused Passwords ({analysis.reusedPasswords.length} groups)
                </h4>
                <div className="space-y-2">
                  {analysis.reusedPasswords.slice(0, 3).map((reused, index) => (
                    <div key={index} className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Used {reused.count} times</span>
                        <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">
                          REUSED
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Services: {reused.services.map(s => s.service_name).join(', ')}
                      </div>
                    </div>
                  ))}
                  {analysis.reusedPasswords.length > 3 && (
                    <div className="text-sm text-gray-500 text-center">
                      +{analysis.reusedPasswords.length - 3} more reused password groups
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            {onViewDetails && (
              <div className="pt-4 border-t">
                <button
                  onClick={onViewDetails}
                  className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  View All Security Issues →
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Issues Found */}
      {analysis.weakPasswords.length === 0 && analysis.reusedPasswords.length === 0 && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">No security issues found!</span>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
              All your passwords meet security standards.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
