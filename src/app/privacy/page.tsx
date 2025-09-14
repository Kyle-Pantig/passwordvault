'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
            </p>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">Account Information:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Email address</li>
                <li>Password (encrypted and never stored in plain text)</li>
                <li>Two-factor authentication settings</li>
              </ul>
              
              <h4 className="font-semibold text-gray-900 dark:text-white">Basic Credential Data:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Service names and URLs</li>
                <li>Usernames or email addresses (encrypted)</li>
                <li>Passwords (encrypted)</li>
                <li>Notes and additional information</li>
                <li>Creation and modification timestamps</li>
              </ul>
              
              <h4 className="font-semibold text-gray-900 dark:text-white">Advanced Credential Data:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Custom field names and values (encrypted)</li>
                <li>Field-specific masking and visibility settings</li>
                <li>API keys, tokens, and certificates (encrypted)</li>
                <li>OAuth tokens and authentication codes (encrypted)</li>
                <li>SSH keys and other complex credentials (encrypted)</li>
              </ul>
              
              <h4 className="font-semibold text-gray-900 dark:text-white">Folder/Category Data:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Folder names, colors, and icons</li>
                <li>Category descriptions and metadata</li>
                <li>Credential-to-folder associations</li>
                <li>Hierarchical organization structure</li>
                <li>Bulk operation preferences and settings</li>
              </ul>
              
              <h4 className="font-semibold text-gray-900 dark:text-white">Security Analysis Data:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Password strength assessments (computed locally)</li>
                <li>Security risk scores and analysis results</li>
                <li>Weak password identification data</li>
                <li>Reused password detection information</li>
                <li>Security recommendations and alerts</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>2. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze usage and trends</li>
              <li>Detect, investigate, and prevent security incidents</li>
              <li>Perform password security analysis and risk assessment</li>
              <li>Generate security recommendations and alerts</li>
              <li>Provide credential export functionality</li>
              <li>Enable password strength validation and weak password detection</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>3. Credential Management and Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              DigiVault processes different types of credential data with specific purposes and security measures:
            </p>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Basic Credential Processing:</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li><strong>Authentication Storage:</strong> Secure storage of username/password combinations for web services</li>
                <li><strong>Service Integration:</strong> Automatic URL detection and service icon fetching for better organization</li>
                <li><strong>Password Generation:</strong> Creation of strong passwords using configurable presets and algorithms</li>
                <li><strong>Security Analysis:</strong> Real-time password strength assessment and security recommendations</li>
                <li><strong>Access Control:</strong> Secure credential access with visibility controls and copy-to-clipboard functionality</li>
              </ul>

              <h4 className="font-semibold text-gray-900 dark:text-white">Advanced Credential Processing:</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li><strong>Custom Field Management:</strong> Flexible storage and organization of complex authentication data</li>
                <li><strong>Field-Level Security:</strong> Individual encryption and masking controls for each custom field</li>
                <li><strong>Multi-Format Support:</strong> Processing of various credential types (API keys, tokens, certificates, etc.)</li>
                <li><strong>Dynamic Generation:</strong> Field-specific password and value generation based on credential type</li>
                <li><strong>Complex Authentication:</strong> Support for OAuth flows, API authentication, and multi-step login processes</li>
              </ul>

              <h4 className="font-semibold text-gray-900 dark:text-white">Folder/Category Processing:</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li><strong>Organization Management:</strong> Creation and maintenance of hierarchical folder structures</li>
                <li><strong>Credential Grouping:</strong> Association and management of credentials within specific categories</li>
                <li><strong>Bulk Operations:</strong> Mass management of credentials within folders (export, delete, move)</li>
                <li><strong>Visual Organization:</strong> Color-coding and icon management for improved user experience</li>
                <li><strong>Search and Filtering:</strong> Category-based search and filtering functionality</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>4. Security Analysis and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Our security analysis features are designed with privacy in mind:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Local Processing:</strong> All password analysis is performed locally on your device</li>
              <li><strong>No Data Transmission:</strong> Your passwords are never sent to our servers for analysis</li>
              <li><strong>Encrypted Storage:</strong> Security analysis results are stored encrypted alongside your credentials</li>
              <li><strong>Zero-Knowledge Analysis:</strong> We cannot see or access your password analysis data</li>
              <li><strong>Real-time Processing:</strong> Security assessments happen instantly without external communication</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              The security analysis features help you maintain strong password hygiene while ensuring your sensitive data remains completely private and secure.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>5. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>AES-256 Encryption:</strong> All sensitive data is encrypted using military-grade encryption</li>
              <li><strong>Zero-Knowledge Architecture:</strong> We cannot access your encrypted data</li>
              <li><strong>Secure Transmission:</strong> All data is transmitted over HTTPS</li>
              <li><strong>Regular Security Audits:</strong> We regularly audit our security practices</li>
              <li><strong>Two-Factor Authentication:</strong> Additional security layer for account access</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>6. Data Storage and Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Your data is stored securely on our servers and is retained for as long as your account is active. When you delete your account, all associated data is permanently removed from our systems within 30 days.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this privacy policy.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>7. Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              We use essential cookies to maintain your session and provide core functionality. We do not use tracking cookies or third-party analytics that compromise your privacy.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>8. Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Delete your account and all associated data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
              <li>Object to certain types of data processing</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>9. Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              We use the following third-party services to provide our functionality:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Supabase:</strong> For authentication and database services</li>
              <li><strong>Vercel:</strong> For hosting and deployment</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              These services are bound by their own privacy policies and security standards.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>10. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>11. Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date. We encourage you to review this privacy policy periodically.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>12. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Email: privacy@digivault.app<br />
              Website: https://digivault.app<br />
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
