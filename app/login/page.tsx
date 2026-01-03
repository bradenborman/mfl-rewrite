'use client'

/**
 * Login Page for MFL UI
 * Modern design with MFL branding and styling
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

export default function LoginPage() {
  const [username, setUsername] = useState('beborma')
  const [password, setPassword] = useState('Borm0000$$')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<{
    username?: string
    password?: string
  }>({})

  const { login } = useAuth()
  const router = useRouter()

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {}

    if (!username.trim()) {
      errors.username = 'Username is required'
    }

    if (!password) {
      errors.password = 'Password is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setError('')
    setValidationErrors({})

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      await login(username.trim(), password)
      router.push('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value)
    if (validationErrors.username) {
      setValidationErrors(prev => ({ ...prev, username: undefined }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (validationErrors.password) {
      setValidationErrors(prev => ({ ...prev, password: undefined }))
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px'
      }}>
        {/* Header */}
        <div style={{textAlign: 'center', marginBottom: '32px'}}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <img 
              src="/mfl-logo.png" 
              alt="MyFantasyLeague.com" 
              style={{
                height: '80px',
                width: 'auto'
              }}
            />
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: 'var(--mfl-primary)',
            marginBottom: '8px'
          }}>
            MFL Express
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#64748b'
          }}>
            Sign in with your MyFantasyLeague.com credentials
          </p>
        </div>

        {/* Login Form */}
        <div className="mfl-card" style={{padding: '32px'}}>
          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            
            {/* Username Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: validationErrors.username ? '2px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: isLoading ? '#f9fafb' : 'white',
                  color: '#1f2937',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!validationErrors.username) {
                    e.target.style.borderColor = 'var(--mfl-primary)'
                  }
                }}
                onBlur={(e) => {
                  if (!validationErrors.username) {
                    e.target.style.borderColor = '#d1d5db'
                  }
                }}
                placeholder="Enter your MFL username"
              />
              {validationErrors.username && (
                <p style={{
                  marginTop: '6px',
                  fontSize: '14px',
                  color: '#ef4444'
                }}>
                  {validationErrors.username}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: validationErrors.password ? '2px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: isLoading ? '#f9fafb' : 'white',
                  color: '#1f2937',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!validationErrors.password) {
                    e.target.style.borderColor = 'var(--mfl-primary)'
                  }
                }}
                onBlur={(e) => {
                  if (!validationErrors.password) {
                    e.target.style.borderColor = '#d1d5db'
                  }
                }}
                placeholder="Enter your MFL password"
              />
              {validationErrors.password && (
                <p style={{
                  marginTop: '6px',
                  fontSize: '14px',
                  color: '#ef4444'
                }}>
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                borderLeft: '4px solid #ef4444'
              }}>
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                  <svg fill="none" stroke="#ef4444" viewBox="0 0 24 24" style={{width: '20px', height: '20px', flexShrink: 0, marginTop: '2px'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#dc2626',
                      marginBottom: '4px'
                    }}>
                      Login Failed
                    </h4>
                    <p style={{
                      fontSize: '14px',
                      color: '#7f1d1d'
                    }}>
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                backgroundColor: isLoading ? '#9ca3af' : 'var(--mfl-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = 'var(--mfl-primary-light)'
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = 'var(--mfl-primary)'
                }
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #ffffff40',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Signing in...
                </>
              ) : (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '20px', height: '20px'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign in to MFL
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '12px'
          }}>
            Don't have an account?{' '}
            <a
              href="https://www.myfantasyleague.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--mfl-primary)',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              Sign up at MyFantasyLeague.com
            </a>
          </p>
          
          <div style={{
            padding: '16px',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <svg fill="none" stroke="var(--mfl-primary)" viewBox="0 0 24 24" style={{width: '16px', height: '16px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--mfl-primary)'
              }}>
                Secure Connection
              </span>
            </div>
            <p style={{
              fontSize: '11px',
              color: '#64748b',
              lineHeight: '1.4'
            }}>
              Your credentials are sent securely via HTTPS to MyFantasyLeague.com.<br />
              We only store a secure session token, never your password.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}