'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Terms and Conditions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              By accessing and using Password Vault ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Password Vault is a comprehensive secure password management service that allows users to store, organize, and manage their passwords and credentials in an encrypted format. The service provides advanced features including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Secure password storage with AES-256 encryption</li>
              <li>Two-factor authentication (2FA) support</li>
              <li>Advanced password generation with strength validation</li>
              <li>Password security analysis and risk assessment</li>
              <li>Weak password detection and alerts</li>
              <li>Reused password identification across services</li>
              <li>Real-time security risk scoring</li>
              <li>Credential export functionality (CSV, JSON, encrypted formats)</li>
              <li>Secure credential sharing and access</li>
              <li>Password visibility controls and secure input fields</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>3. User Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              As a user of Password Vault, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the service only for lawful purposes</li>
              <li>Not attempt to gain unauthorized access to other accounts</li>
              <li>Not share your account credentials with others</li>
              <li>Immediately notify us of any unauthorized use of your account</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>4. Security Analysis Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Password Vault includes advanced security analysis features to help you maintain strong password hygiene:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Password Strength Analysis:</strong> Real-time evaluation of password strength based on length, complexity, and common patterns</li>
              <li><strong>Weak Password Detection:</strong> Identification of passwords that don't meet security standards</li>
              <li><strong>Reused Password Alerts:</strong> Detection of passwords used across multiple services</li>
              <li><strong>Risk Scoring:</strong> Comprehensive security risk assessment with visual indicators</li>
              <li><strong>Security Recommendations:</strong> Actionable advice to improve password security</li>
              <li><strong>Export Capabilities:</strong> Secure export of credentials in multiple formats for backup purposes</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              These security features are designed to help you maintain the highest level of password security. All analysis is performed locally on your device to ensure privacy.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>5. Data Security and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              We take data security seriously. Your passwords and sensitive information are encrypted using industry-standard AES-256 encryption. We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              For more detailed information about how we collect, use, and protect your data, please review our Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>6. Service Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              While we strive to maintain high service availability, we do not guarantee that the service will be uninterrupted or error-free. We reserve the right to modify, suspend, or discontinue the service at any time with or without notice.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>7. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              In no event shall Password Vault, its officers, directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>8. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the service. Your continued use of the service after such modifications constitutes acceptance of the updated terms.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>9. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              If you have any questions about these Terms and Conditions, please contact us at:
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Email: support@PasswordVault.app<br />
              Website: https://PasswordVault.app
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
