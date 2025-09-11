'use client'

import React from 'react'
import { motion } from 'motion/react'
import { Shield, Lock } from 'lucide-react'

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Background Circles */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.6, 0.3, 0.6],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center"
        >
          <motion.div
            className="relative mb-6"
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <motion.div
              className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Lock className="w-3 h-3 text-white" />
            </motion.div>
          </motion.div>
          
          <motion.h1
            className="text-4xl md:text-6xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            DigiVault
          </motion.h1>
          
          <motion.p
            className="text-md md:text-lg text-gray-300 mt-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Secure Password Manager
          </motion.p>
        </motion.div>
        {/* Progress Bar */}
        <motion.div
          className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 3,
              ease: "easeInOut",
              delay: 1.6
            }}
          />
        </motion.div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { left: 10, top: 20, delay: 0, duration: 3 },
          { left: 25, top: 15, delay: 0.5, duration: 4 },
          { left: 40, top: 30, delay: 1, duration: 3.5 },
          { left: 60, top: 10, delay: 1.5, duration: 4.5 },
          { left: 80, top: 25, delay: 2, duration: 3.2 },
          { left: 15, top: 45, delay: 0.3, duration: 4.2 },
          { left: 35, top: 50, delay: 0.8, duration: 3.8 },
          { left: 55, top: 40, delay: 1.3, duration: 4.1 },
          { left: 75, top: 55, delay: 1.8, duration: 3.6 },
          { left: 90, top: 35, delay: 2.3, duration: 4.3 },
          { left: 5, top: 70, delay: 0.2, duration: 3.9 },
          { left: 30, top: 75, delay: 0.7, duration: 4.4 },
          { left: 50, top: 65, delay: 1.2, duration: 3.7 },
          { left: 70, top: 80, delay: 1.7, duration: 4.6 },
          { left: 85, top: 60, delay: 2.2, duration: 3.4 },
          { left: 20, top: 90, delay: 0.4, duration: 4.7 },
          { left: 45, top: 85, delay: 0.9, duration: 3.3 },
          { left: 65, top: 95, delay: 1.4, duration: 4.8 },
          { left: 95, top: 75, delay: 1.9, duration: 3.1 },
          { left: 12, top: 5, delay: 0.1, duration: 4.9 }
        ].map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  )
}
