'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import { 
  HelpCircle, 
  Shield, 
  Plus, 
  Search, 
  Settings, 
  Lock, 
  Smartphone, 
  Mail, 
  Key,
  ExternalLink,
  Folder,
  RefreshCw
} from 'lucide-react'

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <HelpCircle className="h-5 w-5" />,
      content: [
        {
          question: 'How do I add my first credential?',
          answer: 'Click the "Add Credential" button in the top right corner or use the floating + button on mobile. Fill in the service name, URL (optional), username/email, and password. You can choose from predefined services or create a custom one. You can also organize credentials into folders for better management.'
        },
        {
          question: 'What services are supported?',
          answer: 'We support all major services including Google, Gmail, Facebook, Instagram, LinkedIn, GitHub, Microsoft, Apple, Amazon, Netflix, Spotify, Discord, Slack, Zoom, Dropbox, PayPal, Stripe, Shopify, WordPress, and custom services.'
        },
        {
          question: 'How do I search for credentials?',
          answer: 'Use the search bar at the top of the vault page. You can search by service name or username/email. The search is case-insensitive and updates in real-time.'
        },
        {
          question: 'How do I create folders to organize my credentials?',
          answer: 'Click the "New Folder" button in the vault to create a new folder. Give it a name and optional color. You can then move credentials into folders by editing them and selecting the desired folder from the dropdown.'
        }
      ]
    },
    {
      id: 'managing-credentials',
      title: 'Managing Credentials',
      icon: <Key className="h-5 w-5" />,
      content: [
        {
          question: 'How do I edit a credential?',
          answer: 'Click the three-dot menu (⋮) on any credential card and select "Edit". Make your changes and click "Update Credential" to save.'
        },
        {
          question: 'How do I delete a credential?',
          answer: 'Click the three-dot menu (⋮) on any credential card and select "Delete". This action cannot be undone, so make sure you want to delete the credential.'
        },
        {
          question: 'How do I copy my password?',
          answer: 'Click the copy icon (📋) next to your password. The password will be copied to your clipboard and you\'ll see a confirmation message.'
        },
        {
          question: 'How do I view my password?',
          answer: 'Click the eye icon (👁️) next to your password to toggle visibility. Click it again to hide the password.'
        },
        {
          question: 'How do I generate a strong password?',
          answer: 'Click the "Generate" button next to any password field. Choose from different strength levels (Strong, Very Strong, API Key) and the system will create a secure password for you. You can then apply it to replace your current password.'
        },
        {
          question: 'What types of credentials can I store?',
          answer: 'You can store two types of credentials: Basic (username/password) and Advanced (custom fields like API keys, tokens, etc.). Advanced credentials allow you to store any type of sensitive information with custom field names.'
        }
      ]
    },
    {
      id: 'folders-organization',
      title: 'Folders & Organization',
      icon: <Folder className="h-5 w-5" />,
      content: [
        {
          question: 'How do I create a new folder?',
          answer: 'In the vault, click the "New Folder" button. Enter a name for your folder and optionally choose a color. Click "Create Folder" to save it.'
        },
        {
          question: 'How do I move credentials to a folder?',
          answer: 'Edit any credential and select a folder from the "Category" dropdown. Save the changes to move the credential to that folder.'
        },
        {
          question: 'How do I rename or delete a folder?',
          answer: 'Click the three-dot menu (⋮) on any folder and select "Rename" or "Delete". When deleting a folder, you can choose to move credentials to another folder or delete them entirely.'
        },
        {
          question: 'Can I have credentials without a folder?',
          answer: 'Yes! Credentials without a folder are shown in the "Uncategorized" section. You can organize them into folders later or leave them uncategorized.'
        },
        {
          question: 'How do I view all credentials in a folder?',
          answer: 'Click on any folder to view only the credentials in that folder. Use the back button or click "All Credentials" to return to the full view.'
        }
      ]
    },
    {
      id: 'password-generation',
      title: 'Password Generation',
      icon: <RefreshCw className="h-5 w-5" />,
      content: [
        {
          question: 'How does password generation work?',
          answer: 'Our built-in password generator creates cryptographically secure passwords using industry-standard algorithms. You can generate passwords for any credential type including basic passwords and API keys.'
        },
        {
          question: 'What password strength options are available?',
          answer: 'We offer three strength levels: Strong (12-16 chars), Very Strong (20+ chars), and API Key (32+ chars with specific character sets). Each level is optimized for different use cases.'
        },
        {
          question: 'How do I generate a password for an existing credential?',
          answer: 'Click the "Generate" button next to any password field. Review the generated password and click "Replace Credential" to apply it, or "Cancel" to keep your current password.'
        },
        {
          question: 'Can I generate passwords for API keys and tokens?',
          answer: 'Yes! For advanced credentials, you can generate secure API keys and tokens. The generator creates appropriate character sets for different credential types.'
        },
        {
          question: 'Are generated passwords secure?',
          answer: 'Absolutely! All generated passwords use cryptographically secure random number generation and include a mix of uppercase, lowercase, numbers, and special characters.'
        }
      ]
    },
    {
      id: 'security-features',
      title: 'Security Features',
      icon: <Shield className="h-5 w-5" />,
      content: [
        {
          question: 'How secure is my data?',
          answer: 'Your passwords are encrypted using industry-standard AES-256 encryption before being stored. Only you can decrypt and view your passwords with your account credentials.'
        },
        {
          question: 'What is Two-Factor Authentication (2FA)?',
          answer: '2FA adds an extra layer of security to your account. When enabled, you\'ll need both your password and a code from your authenticator app to sign in. Enable it in Settings > Preferences.'
        },
        {
          question: 'How do I enable 2FA?',
          answer: 'Go to Settings > Preferences and toggle on "Two-Factor Authentication". Follow the setup process to configure your authenticator app.'
        },
        {
          question: 'Can I change my master password?',
          answer: 'Yes, go to Settings > Security and use the "Update Password" form to change your account password.'
        },
        {
          question: 'How do I check my password security?',
          answer: 'Visit the Security page to see a comprehensive analysis of your password strength, including weak passwords, reused passwords, and security recommendations. The analysis is performed locally on your device for privacy.'
        },
        {
          question: 'What are the password strength requirements?',
          answer: 'Strong passwords should be at least 8 characters long, include uppercase and lowercase letters, numbers, special characters, avoid common patterns, and not be found in common password lists.'
        }
      ]
    },
    {
      id: 'security-analysis',
      title: 'Security Analysis',
      icon: <Shield className="h-5 w-5" />,
      content: [
        {
          question: 'What is password security analysis?',
          answer: 'Our security analysis feature automatically checks your passwords for strength, detects weak passwords, identifies reused passwords across services, and provides a comprehensive risk score to help you maintain strong password hygiene.'
        },
        {
          question: 'How does the risk scoring work?',
          answer: 'The risk score (0-1000) is calculated based on weak passwords (50 points each), reused passwords (30 points each), and total credentials. Scores are categorized as Low (0-200), Moderate (201-500), High (501-800), or Critical (801-1000).'
        },
        {
          question: 'What makes a password "weak"?',
          answer: 'Weak passwords are those that are too short (less than 8 characters), lack character variety (no uppercase, lowercase, numbers, or special characters), contain common patterns, or are found in common password lists.'
        },
        {
          question: 'How do I view my security analysis?',
          answer: 'Visit the Security page from the navigation menu to see detailed analysis of your password security, including weak passwords, reused passwords, and specific recommendations for improvement.'
        },
        {
          question: 'Is my password data sent to servers for analysis?',
          answer: 'No! All security analysis is performed locally on your device. Your passwords are never sent to our servers, ensuring complete privacy and security.'
        },
        {
          question: 'How do I export my credentials?',
          answer: 'Click the "Export" button in the vault and choose your preferred format: CSV (spreadsheet), JSON (structured data), or Encrypted (secure backup). All formats include your service names, usernames, and encrypted passwords.'
        }
      ]
    },
    {
      id: 'mobile-app',
      title: 'Mobile Experience',
      icon: <Smartphone className="h-5 w-5" />,
      content: [
        {
          question: 'Is there a mobile app?',
          answer: 'This is a web application that works great on mobile devices. Simply open it in your mobile browser and add it to your home screen for an app-like experience.'
        },
        {
          question: 'How do I add to home screen?',
          answer: 'On iOS: Tap the share button and select "Add to Home Screen". On Android: Tap the menu button and select "Add to Home Screen" or "Install App".'
        },
        {
          question: 'Does it work offline?',
          answer: 'No, you need an internet connection to access your vault. This ensures your data is always synced and secure.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <Settings className="h-5 w-5" />,
      content: [
        {
          question: 'I forgot my password, what do I do?',
          answer: 'Click "Forgot Password" on the login page. Enter your email address and check your inbox for a password reset link.'
        },
        {
          question: 'I\'m not receiving password reset emails',
          answer: 'Check your spam folder first. If you still don\'t receive it, try again in a few minutes. Make sure you\'re using the correct email address.'
        },
        {
          question: 'The app is loading slowly',
          answer: 'Try refreshing the page. If the problem persists, check your internet connection or try again later.'
        },
        {
          question: 'I can\'t see my credentials',
          answer: 'Make sure you\'re logged in with the correct account. Check if you have any search filters applied. If the problem persists, try logging out and back in.'
        }
      ]
    },
    {
      id: 'account-management',
      title: 'Account Management',
      icon: <Mail className="h-5 w-5" />,
      content: [
        {
          question: 'How do I change my email?',
          answer: 'Email addresses cannot be changed for security reasons. If you need to use a different email, you\'ll need to create a new account and transfer your credentials.'
        },
        {
          question: 'How do I delete my account?',
          answer: 'Go to Settings > Danger Zone and click "Delete Account". You\'ll need to confirm by typing your email address. This action cannot be undone.'
        },
        {
          question: 'Can I export my data?',
          answer: 'Yes! Click the "Export" button in the vault to download your credentials in CSV, JSON, or encrypted format. This is perfect for creating backups or migrating to another password manager.'
        }
      ]
    }
  ]

  const filteredSections = helpSections.map(section => ({
    ...section,
    content: section.content.filter(item =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.content.length > 0)

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <HelpCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Help & Support
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Find answers to common questions and learn how to use your digivault effectively.
            </p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search help articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks you might need help with
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => {
                    setSearchTerm('add credential')
                    document.querySelector('[data-value="getting-started"]')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <Plus className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Add Credential</div>
                    <div className="text-sm text-gray-500">Learn how to add passwords</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => {
                    setSearchTerm('folder')
                    document.querySelector('[data-value="folders-organization"]')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <Folder className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Create Folders</div>
                    <div className="text-sm text-gray-500">Organize your credentials</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => {
                    setSearchTerm('generate password')
                    document.querySelector('[data-value="password-generation"]')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <RefreshCw className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Generate Password</div>
                    <div className="text-sm text-gray-500">Create strong passwords</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => {
                    setSearchTerm('2FA')
                    document.querySelector('[data-value="security-features"]')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <Shield className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Enable 2FA</div>
                    <div className="text-sm text-gray-500">Secure your account</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => {
                    setSearchTerm('security analysis')
                    document.querySelector('[data-value="security-analysis"]')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <Shield className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Security Analysis</div>
                    <div className="text-sm text-gray-500">Check password strength</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => {
                    setSearchTerm('password')
                    document.querySelector('[data-value="troubleshooting"]')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <Lock className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Reset Password</div>
                    <div className="text-sm text-gray-500">Forgot your password?</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help Sections */}
          <Accordion type="multiple" defaultValue={['getting-started']} className="space-y-4">
            {filteredSections.map((section) => (
              <AccordionItem key={section.id} value={section.id} className="border rounded-lg bg-card text-card-foreground">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center space-x-3">
                    {section.icon}
                    <span className="text-lg font-semibold">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-4">
                    {section.content.map((item, index) => (
                      <div key={index} className="border-l-4 border-blue-200 dark:border-blue-800 pl-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          {item.question}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Legal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Legal Information</span>
              </CardTitle>
              <CardDescription>
                Important legal documents and policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  For your reference, here are our important legal documents that govern the use of our service.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center justify-center space-x-2 h-auto p-4"
                    onClick={() => window.open('/terms', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">Terms and Conditions</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        User agreement and service terms
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center justify-center space-x-2 h-auto p-4"
                    onClick={() => window.open('/privacy', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">Privacy Policy</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        How we protect your data
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <Mail className="h-5 w-5" />
                <span>Still Need Help?</span>
              </CardTitle>
              <CardDescription>
                Can't find what you're looking for? We're here to help.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  If you're experiencing issues or have questions not covered in this help section, 
                  please contact our support team.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2"
                    onClick={() => {
                      toast.info('Support email: support@digivault.com')
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Support</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2"
                    onClick={() => {
                      toast.info('Check our documentation for more detailed guides')
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Documentation</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </main>
  )
}
