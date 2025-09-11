'use client'

import React from 'react'

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} DigiVault. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Built with security in mind
          </p>
        </div>
      </div>
    </footer>
  )
}
