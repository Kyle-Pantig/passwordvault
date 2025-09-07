'use client'

import { useAuth } from '@/contexts/auth-context'
import { useState } from 'react'

export default function DebugSessionPage() {
  const { user, session } = useAuth()
  const [apiResult, setApiResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Note: useSingleSession is already called in SingleSessionProvider
  // No need to call it again here

  const testAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/single-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      setApiResult(data)
    } catch (error) {
      setApiResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session Debug Page</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Auth Status:</h2>
          <p>User: {user ? 'Logged in' : 'Not logged in'}</p>
          <p>User ID: {user?.id || 'N/A'}</p>
          <p>Session: {session ? 'Active' : 'No session'}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Test API Call:</h2>
          <button 
            onClick={testAPI}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Single Session API'}
          </button>
        </div>

        {apiResult && (
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-semibold mb-2">API Result:</h2>
            <pre className="bg-white p-2 rounded text-sm overflow-auto">
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Make sure you're logged in</li>
            <li>Click "Test Single Session API" button</li>
            <li>Check the browser console for debug logs</li>
            <li>Check your Supabase user_sessions table</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
