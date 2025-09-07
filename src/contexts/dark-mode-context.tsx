'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DarkModeContextType {
  darkMode: boolean
  setDarkMode: (darkMode: boolean) => void
  toggleDarkMode: () => void
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const initializeDarkMode = () => {
      const savedDarkMode = localStorage.getItem('darkMode') === 'true'
      setDarkMode(savedDarkMode)
      
      // Apply dark mode immediately
      if (savedDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    
    initializeDarkMode()
  }, [])

  useEffect(() => {
    // Only update localStorage when darkMode actually changes
    localStorage.setItem('darkMode', darkMode.toString())
    
    // Apply dark mode to document
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkMode() {
  const context = useContext(DarkModeContext)
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider')
  }
  return context
}
