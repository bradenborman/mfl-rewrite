'use client'

/**
 * Authentication Provider for MFL UI
 * Handles user authentication, session management, and secure cookie storage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { mflApi } from './mfl-api'
import { AuthResult } from './types'

export interface User {
  username: string
  cookie: string
  loginTime: number
}

export interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_STORAGE_KEY = 'mfl_user_session'
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user session from localStorage on mount
  useEffect(() => {
    loadUserSession()
  }, [])

  // Update MFL API client cookie when user changes
  useEffect(() => {
    if (user?.cookie) {
      mflApi.setCookie(user.cookie)
    } else {
      mflApi.clearCookie()
    }
  }, [user])

  const loadUserSession = () => {
    try {
      const storedSession = localStorage.getItem(SESSION_STORAGE_KEY)
      if (storedSession) {
        const parsedUser: User = JSON.parse(storedSession)
        
        // Check if session is still valid (not expired)
        const now = Date.now()
        const sessionAge = now - parsedUser.loginTime
        
        if (sessionAge < SESSION_TIMEOUT) {
          setUser(parsedUser)
        } else {
          // Session expired, clear it
          localStorage.removeItem(SESSION_STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Error loading user session:', error)
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } finally {
      setIsLoading(false)
    }
  }

  const saveUserSession = (userData: User) => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userData))
    } catch (error) {
      console.error('Error saving user session:', error)
    }
  }

  const login = async (username: string, password: string): Promise<void> => {
    if (!username.trim() || !password.trim()) {
      throw new Error('Username and password are required')
    }

    try {
      // Call our Next.js API route instead of MFL API directly (avoids CORS)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      })

      const result = await response.json()
      
      if (result.success && result.cookie) {
        const userData: User = {
          username: username.trim(),
          cookie: result.cookie,
          loginTime: Date.now()
        }
        
        setUser(userData)
        saveUserSession(userData)
      } else {
        throw new Error(result.error || 'Login failed')
      }
    } catch (error) {
      // Clear any existing session on login failure
      logout()
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(SESSION_STORAGE_KEY)
    mflApi.clearCookie()
  }

  const contextValue: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      )
    }

    if (!isAuthenticated) {
      // In a real app, you might redirect to login page here
      // For now, we'll just show a message
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-red-600">Please log in to access this page</div>
        </div>
      )
    }

    return <Component {...props} />
  }
}