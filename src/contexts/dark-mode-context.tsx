// 'use client'

// import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// interface DarkModeContextType {
//   darkMode: boolean
//   setDarkMode: (darkMode: boolean) => void
//   setDarkModeWithTransition: (darkMode: boolean) => void
//   toggleDarkMode: () => void
//   isInitialized: boolean
// }

// const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

// export function DarkModeProvider({ children }: { children: ReactNode }) {
//   const [darkMode, setDarkMode] = useState(false)
//   const [isInitialized, setIsInitialized] = useState(false)

//   useEffect(() => {
//     const initializeDarkMode = () => {
//       try {
//         const savedDarkMode = localStorage.getItem('darkMode') === 'true'
//         setDarkMode(savedDarkMode)
//         setIsInitialized(true)
        
//         // Apply dark mode immediately (script already handled this, but ensure consistency)
//         if (savedDarkMode) {
//           document.documentElement.classList.add('dark')
//         } else {
//           document.documentElement.classList.remove('dark')
//         }
//       } catch (error) {
//         // If localStorage is not available, default to light mode
//         setDarkMode(false)
//         setIsInitialized(true)
//         document.documentElement.classList.remove('dark')
//       }
//     }
    
//     initializeDarkMode()
//   }, [])

//   useEffect(() => {
//     // Only update localStorage and apply changes after initialization
//     if (!isInitialized) return
    
//     try {
//       localStorage.setItem('darkMode', darkMode.toString())
//     } catch (error) {
//       // Ignore localStorage errors
//     }
    
//     // Apply dark mode to document
//     if (darkMode) {
//       document.documentElement.classList.add('dark')
//     } else {
//       document.documentElement.classList.remove('dark')
//     }
//   }, [darkMode, isInitialized])

//   const toggleDarkMode = () => {
//     // Add transition class for smooth animation
//     document.documentElement.classList.add('theme-transitioning')
    
//     setDarkMode(!darkMode)
    
//     // Remove transition class after animation completes
//     setTimeout(() => {
//       document.documentElement.classList.remove('theme-transitioning')
//     }, 400)
//   }

//   const setDarkModeWithTransition = (newDarkMode: boolean) => {
//     // Add transition class for smooth animation
//     document.documentElement.classList.add('theme-transitioning')
    
//     setDarkMode(newDarkMode)
    
//     // Remove transition class after animation completes
//     setTimeout(() => {
//       document.documentElement.classList.remove('theme-transitioning')
//     }, 400)
//   }

//   return (
//     <DarkModeContext.Provider value={{ darkMode, setDarkMode, setDarkModeWithTransition, toggleDarkMode, isInitialized }}>
//       {children}
//     </DarkModeContext.Provider>
//   )
// }

// export function useDarkMode() {
//   const context = useContext(DarkModeContext)
//   if (context === undefined) {
//     throw new Error('useDarkMode must be used within a DarkModeProvider')
//   }
//   return context
// }
