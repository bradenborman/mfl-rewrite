'use client'

/**
 * League Overview Page
 * Modern, clean design with proper SVG sizing and MFL-inspired styling
 */

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

interface LeagueInfo {
  id: string
  name: string
  year: number
  host: string
  franchiseId?: string
  totalFranchises?: number
  currentWeek?: number
  status?: string
}

export default function LeagueOverviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  const leagueId = params.id as string
  const host = searchParams.get('host') || 'api.myfantasyleague.com'
  const year = searchParams.get('year') || new Date().getFullYear().toString()
  
  const [leagueInfo, setLeagueInfo] = useState<LeagueInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && leagueId) {
      fetchLeagueInfo()
    }
  }, [user, leagueId, host, year])

  const fetchLeagueInfo = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch(
        `/api/mfl?command=export&TYPE=league&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch league info: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.league) {
        const league = data.league
        setLeagueInfo({
          id: leagueId,
          name: league.name || `League ${leagueId}`,
          year: parseInt(league.year) || 2025,
          host,
          franchiseId: league.franchiseId,
          totalFranchises: league.franchises ? parseInt(league.franchises) : undefined,
          currentWeek: league.currentWeek ? parseInt(league.currentWeek) : undefined,
          status: league.status || 'active'
        })
      } else {
        throw new Error('League information not found')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load league information'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToSection = (section: string) => {
    window.location.href = `/league/${leagueId}/${section}?host=${encodeURIComponent(host)}&year=${year}&franchiseId=${searchParams.get('franchiseId') || ''}`
  }

  const navigateBack = () => {
    window.location.href = `/dashboard/${year}/${leagueId}?host=${encodeURIComponent(host)}&franchiseId=${searchParams.get('franchiseId') || ''}`
  }

  if (!user) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <h1 style={{fontSize: '2rem', fontWeight: '700', color: '#1e293b', marginBottom: '16px'}}>Access Denied</h1>
          <p style={{color: '#64748b', marginBottom: '24px'}}>Please log in to access league information.</p>
          <a href="/login" className="btn-primary">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight: '100vh', backgroundColor: '#f8fafc'}}>
      {/* Header */}
      <header className="mfl-header">
        <div className="container" style={{paddingTop: '24px', paddingBottom: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <button
                onClick={navigateBack}
                className="btn-secondary"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <div>
                <h1 style={{fontSize: '2rem', fontWeight: '700', color: 'white', marginBottom: '4px'}}>
                  {isLoading ? 'Loading...' : leagueInfo?.name || `League ${leagueId}`}
                </h1>
                <p style={{color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px'}}>
                  {leagueInfo?.year} Season • League ID: {leagueId}
                </p>
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <p style={{color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px'}}>Logged in as {user.username}</p>
              <p style={{color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px'}}>Host: {host}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{paddingTop: '32px', paddingBottom: '32px'}}>
        
        {error && (
          <div className="mfl-card" style={{marginBottom: '24px', padding: '24px', borderLeft: '4px solid #ef4444'}}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
              <div className="icon-container icon-danger">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px'}}>
                  Error Loading League
                </h3>
                <p style={{color: '#7f1d1d', marginBottom: '16px'}}>{error}</p>
                <button onClick={fetchLeagueInfo} className="btn-primary">
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
            <p style={{color: '#64748b', fontSize: '16px'}}>Loading league information...</p>
          </div>
        ) : leagueInfo ? (
          <>
            {/* League Info Summary */}
            <div className="mfl-card" style={{marginBottom: '32px', padding: '32px'}}>
              <h2 className="text-xl" style={{marginBottom: '24px'}}>League Information</h2>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px'}}>
                <div>
                  <dt className="text-sm" style={{marginBottom: '4px'}}>League Name</dt>
                  <dd style={{fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>{leagueInfo.name}</dd>
                </div>
                <div>
                  <dt className="text-sm" style={{marginBottom: '4px'}}>Season</dt>
                  <dd style={{fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>{leagueInfo.year}</dd>
                </div>
                <div>
                  <dt className="text-sm" style={{marginBottom: '4px'}}>Status</dt>
                  <dd>
                    <span className="status-badge">
                      {leagueInfo.status || 'Active'}
                    </span>
                  </dd>
                </div>
                {leagueInfo.totalFranchises && (
                  <div>
                    <dt className="text-sm" style={{marginBottom: '4px'}}>Teams</dt>
                    <dd style={{fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>{leagueInfo.totalFranchises}</dd>
                  </div>
                )}
                {leagueInfo.currentWeek && (
                  <div>
                    <dt className="text-sm" style={{marginBottom: '4px'}}>Current Week</dt>
                    <dd style={{fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>Week {leagueInfo.currentWeek}</dd>
                  </div>
                )}
                {leagueInfo.franchiseId && (
                  <div>
                    <dt className="text-sm" style={{marginBottom: '4px'}}>Your Team ID</dt>
                    <dd style={{fontSize: '16px', fontWeight: '600', color: '#1e293b'}}>{leagueInfo.franchiseId}</dd>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Cards */}
            <div className="grid-cards">
              
              {/* Rosters */}
              <div 
                className="mfl-card"
                style={{padding: '24px', cursor: 'pointer'}}
                onClick={() => navigateToSection('rosters')}
              >
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px'}}>
                  <div className="icon-container icon-primary">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div style={{flex: 1}}>
                    <h3 className="text-lg" style={{marginBottom: '8px'}}>Team Rosters</h3>
                    <p className="text-sm" style={{marginBottom: '16px'}}>
                      View all team rosters and player assignments in the league
                    </p>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#0ea5e9', fontSize: '14px', fontWeight: '600'}}>
                      View Rosters
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Free Agents */}
              <div 
                className="mfl-card"
                style={{padding: '24px', cursor: 'pointer'}}
                onClick={() => navigateToSection('free-agents')}
              >
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px'}}>
                  <div className="icon-container icon-success">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div style={{flex: 1}}>
                    <h3 className="text-lg" style={{marginBottom: '8px'}}>Free Agents</h3>
                    <p className="text-sm" style={{marginBottom: '16px'}}>
                      Browse available players and manage waiver claims
                    </p>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#0ea5e9', fontSize: '14px', fontWeight: '600'}}>
                      View Free Agents
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lineup Management */}
              <div 
                className="mfl-card"
                style={{padding: '24px', cursor: 'pointer'}}
                onClick={() => navigateToSection('lineup')}
              >
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px'}}>
                  <div className="icon-container icon-secondary">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div style={{flex: 1}}>
                    <h3 className="text-lg" style={{marginBottom: '8px'}}>My Lineup</h3>
                    <p className="text-sm" style={{marginBottom: '16px'}}>
                      Set your starting lineup and manage your team
                    </p>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#0ea5e9', fontSize: '14px', fontWeight: '600'}}>
                      Manage Lineup
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Scoring */}
              <div 
                className="mfl-card"
                style={{padding: '24px', cursor: 'pointer'}}
                onClick={() => navigateToSection('scoring')}
              >
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px'}}>
                  <div className="icon-container icon-danger">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div style={{flex: 1}}>
                    <h3 className="text-lg" style={{marginBottom: '8px'}}>Live Scoring</h3>
                    <p className="text-sm" style={{marginBottom: '16px'}}>
                      Track real-time fantasy points and game results
                    </p>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#0ea5e9', fontSize: '14px', fontWeight: '600'}}>
                      View Scores
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Standings */}
              <div 
                className="mfl-card"
                style={{padding: '24px', cursor: 'pointer'}}
                onClick={() => navigateToSection('standings')}
              >
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px'}}>
                  <div className="icon-container icon-warning">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div style={{flex: 1}}>
                    <h3 className="text-lg" style={{marginBottom: '8px'}}>Standings</h3>
                    <p className="text-sm" style={{marginBottom: '16px'}}>
                      View league standings and team records
                    </p>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#0ea5e9', fontSize: '14px', fontWeight: '600'}}>
                      View Standings
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* League Settings */}
              <div className="mfl-card" style={{padding: '24px', opacity: '0.7'}}>
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px'}}>
                  <div className="icon-container" style={{backgroundColor: '#94a3b8', color: 'white'}}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div style={{flex: 1}}>
                    <h3 className="text-lg" style={{marginBottom: '8px'}}>League Settings</h3>
                    <p className="text-sm" style={{marginBottom: '16px'}}>
                      View league rules and scoring settings
                    </p>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b'
                    }}>
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </>
        ) : null}
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