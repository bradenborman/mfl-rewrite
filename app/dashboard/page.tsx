'use client'

/**
 * League Picker Page
 * Simple, clean interface for selecting which league to manage
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { League } from '@/lib/types'

export default function LeaguePickerPage() {
  const { user, logout, isLoading: authLoading } = useAuth()
  const [leagues, setLeagues] = useState<League[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      fetchLeagues()
    }
  }, [user, authLoading])

  const fetchLeagues = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch(`/api/mfl?command=export&TYPE=myleagues&JSON=1&FRANCHISE_NAMES=1&cookie=${encodeURIComponent(user!.cookie)}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leagues: ${response.status}`)
      }

      const data = await response.json()
      
      let leagueList: League[] = []
      if (data.leagues?.league) {
        const rawLeagues = Array.isArray(data.leagues.league) ? data.leagues.league : [data.leagues.league]
        
        leagueList = rawLeagues.map((mflLeague: any) => {
          let host = 'api.myfantasyleague.com'
          if (mflLeague.url) {
            const urlMatch = mflLeague.url.match(/https?:\/\/([^\/]+)/)
            if (urlMatch) {
              host = urlMatch[1]
            }
          }

          return {
            id: mflLeague.league_id,
            name: mflLeague.name,
            year: parseInt(mflLeague.year) || 2025,
            host,
            franchiseId: mflLeague.franchise_id,
            franchiseName: mflLeague.franchise_name || `Team ${mflLeague.franchise_id}`
          }
        })
      }

      setLeagues(leagueList)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leagues'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const handleLeagueClick = (league: League) => {
    // Navigate to the actual dashboard for this league, including franchise ID
    const url = `/dashboard/${league.id}?host=${encodeURIComponent(league.host)}&franchiseId=${league.franchiseId}`
    window.location.href = url
  }

  if (authLoading || !user) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc'}}>
        <div style={{textAlign: 'center'}}>
          {authLoading ? (
            <>
              <div style={{
                width: '48px', 
                height: '48px', 
                border: '4px solid #e2e8f0', 
                borderTop: '4px solid #059669',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p style={{color: '#64748b', fontSize: '16px'}}>Loading...</p>
            </>
          ) : (
            <>
              <h1 style={{fontSize: '2rem', fontWeight: '700', color: '#1e293b', marginBottom: '16px'}}>Access Denied</h1>
              <p style={{color: '#64748b', marginBottom: '24px'}}>Please log in to access your leagues.</p>
              <a href="/login" className="btn-primary">Go to Login</a>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight: '100vh', backgroundColor: '#f8fafc'}}>
      {/* Header */}
      <header style={{backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'}}>
        <div className="container" style={{paddingTop: '24px', paddingBottom: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <h1 style={{fontSize: '2rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px'}}>
                Select Your League
              </h1>
              <p style={{color: '#64748b', fontSize: '14px'}}>Welcome back, {user.username}</p>
            </div>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{paddingTop: '48px', paddingBottom: '48px'}}>
        
        {error && (
          <div className="mfl-card" style={{marginBottom: '32px', padding: '24px', borderLeft: '4px solid #ef4444'}}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
              <div className="icon-container icon-danger">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px'}}>
                  Error Loading Leagues
                </h3>
                <p style={{color: '#7f1d1d', marginBottom: '16px'}}>{error}</p>
                <button onClick={fetchLeagues} className="btn-primary">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{textAlign: 'center', padding: '64px 0'}}>
            <div style={{
              width: '48px', 
              height: '48px', 
              border: '4px solid #e2e8f0', 
              borderTop: '4px solid #059669',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{color: '#64748b', fontSize: '16px'}}>Loading your leagues...</p>
          </div>
        ) : leagues.length > 0 ? (
          <div style={{maxWidth: '800px', margin: '0 auto'}}>
            <div className="grid-cards">
              {leagues.map((league) => (
                <div
                  key={`${league.host}-${league.id}`}
                  className="mfl-card"
                  style={{padding: '32px', cursor: 'pointer'}}
                  onClick={() => handleLeagueClick(league)}
                >
                  <div style={{textAlign: 'center'}}>
                    <h3 style={{fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px'}}>
                      {league.name}
                    </h3>
                    <p style={{color: '#64748b', marginBottom: '24px', fontSize: '14px'}}>
                      {league.year} Season
                    </p>
                    
                    <div style={{display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px'}}>
                      <div style={{textAlign: 'center'}}>
                        <dt style={{fontSize: '12px', color: '#64748b', marginBottom: '4px'}}>League ID</dt>
                        <dd style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px'}}>
                          {league.id}
                        </dd>
                      </div>
                      {league.franchiseId && (
                        <div style={{textAlign: 'center'}}>
                          <dt style={{fontSize: '12px', color: '#64748b', marginBottom: '4px'}}>Your Team</dt>
                          <dd style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', backgroundColor: '#f0f9ff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #bae6fd'}}>
                            {league.franchiseName || `Team ${league.franchiseId}`}
                          </dd>
                        </div>
                      )}
                    </div>

                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#0ea5e9', fontSize: '16px', fontWeight: '600'}}>
                      Enter Dashboard
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '64px 0'}}>
            <div style={{width: '64px', height: '64px', margin: '0 auto 24px', color: '#94a3b8'}}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 style={{fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px'}}>No leagues found</h3>
            <p style={{color: '#64748b', maxWidth: '400px', margin: '0 auto'}}>
              You don&apos;t appear to be in any fantasy leagues for this season. Check back later or contact your league commissioner.
            </p>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}