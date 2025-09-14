import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import NavbarLayout from "@/components/layout/navbar-layout";
import { AuthProvider } from "@/contexts/auth-context";
import { UnlockedFoldersProvider } from "@/contexts/unlocked-folders-context";
import { SubscriptionProvider } from "@/contexts/subscription-context";
import { SocketProvider } from "@/contexts/socket-context";
import { LoadingWrapper } from "@/components/loading-wrapper";
import { ReCaptchaProvider } from '@/components/providers/recaptcha-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://digivault-sand.vercel.app"),
  keywords: [
    "digivault",
    "digivault password manager",
    "digivault secure passwords",
    "digivault secure vault",
    "digivault encrypted passwords",
    "digivault password security",
    "digivault 2FA authentication",
    "digivault-sand",
    "digivault vercel",
    "password manager",
    "secure passwords",
    "secure vault",
    "encrypted passwords",
    "password security",
    "2FA authentication",
    "password generator",
    "secure storage",
    "digital security",
    "password protection",
    "cybersecurity",
    "password safety",
    "encrypted vault",
    "password management",
    "secure credentials",
    "password organizer",
    "digital vault",
    "password keeper",
    "secure login",
    "password encryption",
  ],
  title: {
    default: "DigiVault",
    template: `%s | DigiVault`,
  },
  description:
    "DigiVault is a secure password manager with encryption, 2FA protection, and advanced security features. Store, manage, and protect your passwords.",
  openGraph: {
    title: "DigiVault",
    description:
      "DigiVault is a secure password manager with encryption, 2FA protection, and advanced security features. Store, manage, and protect your passwords.",
    url: "https://digivault-sand.vercel.app",
    siteName: "DigiVault",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 600,
        alt: "DigiVault - Secure Password Manager & Digital Vault",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@digivault",
    title: "DigiVault | Secure Password Manager & Digital Vault",
    description:
      "DigiVault is a secure password manager with encryption, 2FA protection, and advanced security features. Store, manage, and protect your passwords.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
        />
        <meta name="google-adsense-account" content="ca-pub-3057643117380889" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="canonical" href="https://digivault-sand.vercel.app" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const darkMode = localStorage.getItem('darkMode') === 'true';
                  if (darkMode) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Ignore errors if localStorage is not available
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReCaptchaProvider>
          <QueryProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <SocketProvider>
                  <UnlockedFoldersProvider>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
                      <LoadingWrapper>
                        <div className="min-h-screen flex flex-col">
                          <NavbarLayout>
                            <div className="mt-16">
                              {children}
                            </div>
                          </NavbarLayout>
                        </div>
                      </LoadingWrapper>
                    </ThemeProvider>
                  </UnlockedFoldersProvider>
                </SocketProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </QueryProvider>
        </ReCaptchaProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
