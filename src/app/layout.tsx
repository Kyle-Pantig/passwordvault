import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import NavbarLayout from "@/components/layout/navbar-layout";
import { Footer } from "@/components/layout/footer";
import { DarkModeProvider } from "@/contexts/dark-mode-context";
import { AuthProvider } from "@/contexts/auth-context";
import { LoadingWrapper } from "@/components/loading-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://digivault.vercel.app"),
  keywords: [
    "password manager",
    "secure passwords",
    "password vault",
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
    default: "DigiVault | Secure Password Manager & Digital Vault",
    template: `%s | DigiVault | Secure Password Manager & Digital Vault`,
  },
  description:
    "DigiVault is a secure password manager with encryption, 2FA protection, and advanced security features. Store, manage, and protect your passwords with our intuitive and secure digital vault.",
  openGraph: {
    title: "DigiVault | Secure Password Manager & Digital Vault",
    description:
      "DigiVault is a secure password manager with encryption, 2FA protection, and advanced security features. Store, manage, and protect your passwords with our intuitive and secure digital vault.",
    url: "https://digivault.vercel.app",
    siteName: "DigiVault",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DigiVault - Secure Password Manager & Digital Vault",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@digivault",
    title: "DigiVault | Secure Password Manager & Digital Vault",
    description:
      "DigiVault is a secure password manager with encryption, 2FA protection, and advanced security features. Store, manage, and protect your passwords with our intuitive and secure digital vault.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://digivault.vercel.app",
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
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="canonical" href="https://digivault.vercel.app" />
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
        <AuthProvider>
          <DarkModeProvider>
            <LoadingWrapper>
              <div className="min-h-screen flex flex-col">
                <NavbarLayout>
                  {children}
                </NavbarLayout>
                <Footer />
              </div>
            </LoadingWrapper>
          </DarkModeProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
