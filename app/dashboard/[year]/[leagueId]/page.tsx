'use client'

/**
 * League Dashboard - The main dashboard for managing a specific league
 * Updated to handle year as a path parameter
 */

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Player, RosterPlayer } from '@/lib/types'

interface LeagueInfo {
  id: string
  name: string
  year: number
  host: string
  franchiseId?: string | null
  franchiseName?: string
  franchiseLogo?: string
  totalFranchises?: number
  currentWeek?: number
  status?: string
}

interface DashboardStats {
  wins: number
  losses: number
  points: number
  rank: number
}

interface StandingsTeam {
  id: string
  name: string
  logo?: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  rank: number
}

export default function LeagueDashboard() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const year = params.year as string
  const leagueId = params.leagueId as string
  const host = searchParams.get('host') || 'api.myfantasyleague.com'
  const franchiseId = searchParams.get('franchiseId')
  
  const [leagueInfo, setLeagueInfo] = useState<LeagueInfo | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [players, setPlayers] = useState<RosterPlayer[]>([])
  const [standings, setStandings] = useState<StandingsTeam[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && user && leagueId && franchiseId && year) {
      console.log('Dashboard useEffect triggered with:', { user: !!user, year, leagueId, franchiseId, host })
      fetchLeagueData()
    }
  }, [user, year, leagueId, host, franchiseId, authLoading])

  const fetchLeagueData = async () => {
    try {
      setIsLoading(true)
      setError('')

      console.log('Fetching league data for year:', year)
      
      // Make API call (year parameter not supported by MFL API)
      const leagueResponse = await fetch(
        `/api/mfl?command=export&TYPE=league&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!leagueResponse.ok) {
        throw new Error(`Failed to fetch league data: ${leagueResponse.status}`)
      }
      
      const leagueData = await leagueResponse.json()
      console.log('League API Response:', leagueData)
      
      // Extract franchise and league info
      let franchiseName = 'My Team'
      let franchiseLogo = ''
      let leagueName = `League ${leagueId}`
      
      if (leagueData?.league) {
        if (leagueData.league.name) {
          leagueName = leagueData.league.name
        }
        
        if (leagueData.league.franchises?.franchise) {
          const franchises = Array.isArray(leagueData.league.franchises.franchise) 
            ? leagueData.league.franchises.franchise 
            : [leagueData.league.franchises.franchise]
          
          const userFranchise = franchises.find((f: any) => f.id === franchiseId)
          
          if (userFranchise?.name) {
            franchiseName = userFranchise.name
          }
          
          if (userFranchise?.logo) {
            franchiseLogo = userFranchise.logo
          }
        }
      }
      
      const leagueInfo = {
        id: leagueId,
        name: leagueName,
        year: parseInt(year),
        host,
        franchiseId: franchiseId,
        franchiseName: franchiseName,
        franchiseLogo: franchiseLogo,
        totalFranchises: 0,
        currentWeek: 1,
        status: 'active'
      }

      // Fetch standings data
      let stats = {
        wins: 0,
        losses: 0,
        points: 0,
        rank: 0
      }
      
      let standingsTeams: StandingsTeam[] = []
      
      try {
        const standingsResponse = await fetch(
          `/api/mfl?command=export&TYPE=leagueStandings&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
        )
        
        if (standingsResponse.ok) {
          const standingsData = await standingsResponse.json()
          
          if (standingsData?.leagueStandings?.franchise) {
            const franchises = Array.isArray(standingsData.leagueStandings.franchise) 
              ? standingsData.leagueStandings.franchise 
              : [standingsData.leagueStandings.franchise]
            
            const userStandings = franchises.find((f: any) => f.id === franchiseId)
            
            if (userStandings) {
              stats = {
                wins: parseInt(userStandings.h2hw || '0'),
                losses: parseInt(userStandings.h2hl || '0'),
                points: parseFloat(userStandings.pf || '0'),
                rank: parseInt(userStandings.rank || '1')
              }
            }

            // Process all standings for the standings table
            standingsTeams = franchises.map((franchise: any, index: number) => {
              const franchiseInfo = leagueData?.league?.franchises?.franchise ? 
                (Array.isArray(leagueData.league.franchises.franchise) 
                  ? leagueData.league.franchises.franchise 
                  : [leagueData.league.franchises.franchise]
                ).find((f: any) => f.id === franchise.id) : null

              return {
                id: franchise.id,
                name: franchiseInfo?.name || `Team ${franchise.id}`,
                logo: franchiseInfo?.logo,
                wins: parseInt(franchise.h2hw || '0'),
                losses: parseInt(franchise.h2hl || '0'),
                pointsFor: parseFloat(franchise.pf || '0'),
                pointsAgainst: parseFloat(franchise.pa || '0'),
                rank: index + 1
              }
            }).sort((a: StandingsTeam, b: StandingsTeam) => {
              // Sort by wins (descending), then by points for (descending)
              if (b.wins !== a.wins) return b.wins - a.wins
              return b.pointsFor - a.pointsFor
            }).map((team: StandingsTeam, index: number) => ({ ...team, rank: index + 1 }))
          }
        }
      } catch (error) {
        console.error('Error fetching standings:', error)
      }

      // Fetch roster data
      let rosterPlayers: RosterPlayer[] = []
      
      try {
        const rosterResponse = await fetch(
          `/api/mfl?command=export&TYPE=rosters&L=${leagueId}&FRANCHISE=${franchiseId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
        )
        
        if (rosterResponse.ok) {
          const rosterData = await rosterResponse.json()
          
          // Load player database for cross-reference
          const playerDbResponse = await fetch('/data/players.json')
          const playerDb = await playerDbResponse.json()
          const playerDatabase = playerDb.data || []
          
          if (rosterData.rosters?.franchise?.player) {
            const playerIds = Array.isArray(rosterData.rosters.franchise.player) 
              ? rosterData.rosters.franchise.player 
              : [rosterData.rosters.franchise.player]
            
            rosterPlayers = playerIds.map((rosterPlayer: any) => {
              const playerId = rosterPlayer.id
              const playerInfo = playerDatabase.find((p: any) => p.id === playerId)
              
              let rosterStatus: 'active' | 'ir' | 'taxi' = 'active'
              if (rosterPlayer.status === 'TAXI_SQUAD') {
                rosterStatus = 'taxi'
              } else if (rosterPlayer.status === 'INJURED_RESERVE' || rosterPlayer.status === 'IR') {
                rosterStatus = 'ir'
              }
              
              return {
                id: playerId,
                name: playerInfo?.name || 'Unknown Player',
                position: playerInfo?.position || 'UNK',
                team: playerInfo?.team || 'FA',
                status: 'active' as const,
                rosterStatus,
                salary: rosterPlayer.salary ? parseFloat(rosterPlayer.salary) : undefined,
                contractYears: rosterPlayer.contractYear && rosterPlayer.contractYear !== '' ? parseInt(rosterPlayer.contractYear) : undefined,
                contractStatus: rosterPlayer.contractStatus && rosterPlayer.contractStatus !== '' ? rosterPlayer.contractStatus : undefined
              }
            })

            // Sort by position, then by name
            const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
            rosterPlayers.sort((a, b) => {
              const aIndex = positionOrder.indexOf(a.position)
              const bIndex = positionOrder.indexOf(b.position)
              const aPos = aIndex === -1 ? 999 : aIndex
              const bPos = bIndex === -1 ? 999 : bIndex
              if (aPos !== bPos) return aPos - bPos
              return a.name.localeCompare(b.name)
            })
          }
        }
      } catch (error) {
        console.error('Error fetching roster:', error)
      }

      setLeagueInfo(leagueInfo)
      setStats(stats)
      setStandings(standingsTeams)
      setPlayers(rosterPlayers)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load league information'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToSection = (section: string) => {
    const url = `/league/${leagueId}/${section}?host=${encodeURIComponent(host)}&franchiseId=${franchiseId}&year=${year}`
    window.location.href = url
  }

  if (authLoading || !user) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{
            width: '48px', 
            height: '48px', 
            border: '4px solid #e2e8f0', 
            borderTop: '4px solid var(--mfl-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{color: '#64748b', fontSize: '16px'}}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!franchiseId) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <h1 style={{fontSize: '2rem', fontWeight: '700', color: '#1e293b', marginBottom: '16px'}}>Missing Franchise ID</h1>
          <p style={{color: '#64748b', marginBottom: '24px'}}>
            Franchise ID is required to load the dashboard.
          </p>
          <a href="/dashboard" className="btn-primary">Back to Leagues</a>
        </div>
      </div>
    )
  }

  if (isLoading || !leagueInfo) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{
            width: '48px', 
            height: '48px', 
            border: '4px solid #e2e8f0', 
            borderTop: '4px solid var(--mfl-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{color: '#64748b', fontSize: '16px'}}>Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <header className="mfl-header">
        <div className="container" style={{paddingTop: '12px', paddingBottom: '12px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <a
                href="/dashboard"
                className="mfl-nav-link"
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 0'
                }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '14px', height: '14px'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Leagues
              </a>
              <div>
                <h1 style={{fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '0'}}>
                  {leagueInfo?.name || `League ${leagueId}`}
                </h1>
                <p style={{color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', margin: '0'}}>
                  {leagueInfo?.year} Season
                </p>
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <p style={{color: 'white', fontSize: '13px', fontWeight: '600', margin: '0'}}>{user.username}</p>
              <p style={{color: 'rgba(255, 255, 255, 0.7)', fontSize: '11px', margin: '0'}}>Team {leagueInfo?.franchiseId}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{paddingTop: '20px', paddingBottom: '32px'}}>
        
        {error && (
          <div className="mfl-card" style={{marginBottom: '32px', padding: '24px', borderLeft: '4px solid #ef4444'}}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px'}}>
                  Error Loading Dashboard
                </h3>
                <p style={{color: '#7f1d1d', marginBottom: '16px'}}>{error}</p>
                <button onClick={fetchLeagueData} className="btn-primary">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Header Section - Full Width */}
        <div className="mfl-card" style={{marginBottom: '32px', padding: '24px'}}>
          <div style={{display: 'flex', alignItems: 'flex-start', gap: '24px'}}>
            {/* Team Info */}
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              {leagueInfo?.franchiseLogo && (
                <img 
                  src={leagueInfo.franchiseLogo} 
                  alt={`${leagueInfo.franchiseName} logo`}
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div>
                <h2 style={{fontSize: '1.75rem', fontWeight: '600', color: '#1e293b', margin: '0', marginBottom: '4px'}}>
                  {leagueInfo?.franchiseName || 'My Team'}
                </h2>
                <p style={{color: '#64748b', fontSize: '18px', fontWeight: '600', margin: '0'}}>
                  {stats?.wins || 0}-{stats?.losses || 0} Record
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{flex: 1, marginLeft: '32px'}}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px'}}>
                <button
                  onClick={() => navigateToSection('rosters')}
                  className="mfl-card"
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                    e.currentTarget.style.borderColor = 'var(--mfl-primary)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <p style={{fontSize: '14px', fontWeight: '600', color: 'var(--mfl-primary)', margin: '0'}}>
                    Rosters
                  </p>
                </button>

                <button
                  onClick={() => navigateToSection('lineup')}
                  className="mfl-card"
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                    e.currentTarget.style.borderColor = 'var(--mfl-primary)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <p style={{fontSize: '14px', fontWeight: '600', color: 'var(--mfl-primary)', margin: '0'}}>
                    Submit Lineup
                  </p>
                </button>

                <button
                  onClick={() => navigateToSection('free-agents')}
                  className="mfl-card"
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                    e.currentTarget.style.borderColor = 'var(--mfl-primary)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <p style={{fontSize: '14px', fontWeight: '600', color: 'var(--mfl-primary)', margin: '0'}}>
                    Add/Drops
                  </p>
                </button>

                <button
                  onClick={() => navigateToSection('trades')}
                  className="mfl-card"
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                    e.currentTarget.style.borderColor = 'var(--mfl-primary)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <p style={{fontSize: '14px', fontWeight: '600', color: 'var(--mfl-primary)', margin: '0'}}>
                    Trades
                  </p>
                </button>

                <button
                  onClick={() => navigateToSection('standings')}
                  className="mfl-card"
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                    e.currentTarget.style.borderColor = 'var(--mfl-primary)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <p style={{fontSize: '14px', fontWeight: '600', color: 'var(--mfl-primary)', margin: '0'}}>
                    Standings
                  </p>
                </button>

                <button
                  onClick={() => navigateToSection('transactions')}
                  className="mfl-card"
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                    e.currentTarget.style.borderColor = 'var(--mfl-primary)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <p style={{fontSize: '14px', fontWeight: '600', color: 'var(--mfl-primary)', margin: '0'}}>
                    Transactions
                  </p>
                </button>

                <button
                  onClick={() => navigateToSection('live-scoring')}
                  className="mfl-card"
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                    e.currentTarget.style.borderColor = 'var(--mfl-primary)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <p style={{fontSize: '14px', fontWeight: '600', color: 'var(--mfl-primary)', margin: '0'}}>
                    Live Scoring
                  </p>
                </button>

                <button
                  onClick={() => navigateToSection('schedule')}
                  className="mfl-card"
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                    e.currentTarget.style.borderColor = 'var(--mfl-primary)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <p style={{fontSize: '14px', fontWeight: '600', color: 'var(--mfl-primary)', margin: '0'}}>
                    Schedule
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px', alignItems: 'start'}}>
            
          {/* Left Column - Main Content */}
          <div>

            {/* My Roster Preview */}
            {players.length > 0 && (
              <div className="mfl-card" style={{marginBottom: '32px', padding: '0', overflow: 'hidden'}}>
                <div style={{
                  padding: '20px 24px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: '0'}}>My Roster</h2>
                </div>

                <div style={{maxHeight: '500px', overflowY: 'auto'}}>
                  {/* Detect league type */}
                  {(() => {
                    const activeRoster = players.filter(p => p.rosterStatus === 'active')
                    const irRoster = players.filter(p => p.rosterStatus === 'ir')
                    const taxiRoster = players.filter(p => p.rosterStatus === 'taxi')
                    
                    const hasContracts = activeRoster.some(p => p.contractYears || p.contractStatus)
                    const hasSalaries = activeRoster.some(p => p.salary)
                    
                    const rosterSections = [
                      { title: 'ACTIVE ROSTER', players: activeRoster, showTotals: true },
                      { title: 'INJURED RESERVE', players: irRoster, showTotals: false },
                      { title: 'TAXI SQUAD', players: taxiRoster, showTotals: false }
                    ]

                    const totalContractYears = activeRoster.reduce((sum, player) => sum + (player.contractYears || 0), 0)
                    const totalSalary = activeRoster.reduce((sum, player) => sum + (player.salary || 0), 0)

                    return rosterSections.map((section, sectionIndex) => {
                      if (section.players.length === 0) return null

                      return (
                        <div key={section.title}>
                          {/* Section Header */}
                          <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '8px 16px',
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {section.title} ({section.players.length})
                          </div>

                          {/* Players in this section */}
                          {section.players.map((player, playerIndex) => {
                            // Group by position within each section
                            const currentPos = player.position
                            const prevPlayer = playerIndex > 0 ? section.players[playerIndex - 1] : null
                            const prevPos = prevPlayer ? prevPlayer.position : null
                            const isNewPosition = currentPos !== prevPos

                            const elements = []

                            // Add position separator within section
                            if (isNewPosition && playerIndex > 0) {
                              elements.push(
                                <div key={`separator-${section.title}-${currentPos}`} style={{
                                  height: '3px',
                                  backgroundColor: '#cbd5e1',
                                  margin: '0'
                                }} />
                              )
                            }

                            // Player row
                            elements.push(
                              <div key={player.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: section.title === 'TAXI SQUAD' ? '#fef3c7' : 
                                              section.title === 'INJURED RESERVE' ? '#fef2f2' : 'white',
                                borderBottom: '1px solid #f8fafc',
                                borderLeft: section.title === 'TAXI SQUAD' ? '3px solid #f59e0b' : 
                                          section.title === 'INJURED RESERVE' ? '3px solid #ef4444' : '3px solid transparent',
                                fontSize: '13px'
                              }}>
                                {/* Position - Fixed width */}
                                <div style={{
                                  color: '#64748b',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  flexShrink: 0,
                                  width: '35px',
                                  textAlign: 'center'
                                }}>
                                  {player.position}
                                </div>

                                {/* Player Name - Flexible */}
                                <div style={{
                                  fontWeight: '600', 
                                  color: '#1e293b',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  flex: 1,
                                  minWidth: '120px'
                                }}>
                                  {player.name}
                                </div>

                                {/* Team - Fixed width */}
                                <div style={{
                                  color: '#64748b',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  flexShrink: 0,
                                  width: '45px',
                                  textAlign: 'center'
                                }}>
                                  {player.team}
                                </div>

                                {/* Salary - Only if league uses salaries */}
                                {hasSalaries && (
                                  <div style={{
                                    color: player.salary ? '#059669' : '#dc2626',
                                    fontSize: player.salary ? '12px' : '12px',
                                    fontWeight: '600',
                                    flexShrink: 0,
                                    width: '80px',
                                    textAlign: 'right'
                                  }}>
                                    {player.salary ? `$${player.salary.toLocaleString()}` : '✗'}
                                  </div>
                                )}

                                {/* Contract Years - Only if league uses contracts */}
                                {hasContracts && (
                                  <div style={{
                                    color: player.contractYears ? '#7c3aed' : '#dc2626',
                                    fontSize: '11px',
                                    fontWeight: player.contractYears ? '500' : '600',
                                    flexShrink: 0,
                                    width: '40px',
                                    textAlign: 'center'
                                  }}>
                                    {player.contractYears ? `${player.contractYears}yr` : '✗'}
                                  </div>
                                )}

                                {/* Contract Status - Only if league uses contracts */}
                                {hasContracts && (
                                  <div style={{
                                    color: player.contractStatus ? '#64748b' : '#dc2626',
                                    fontSize: '11px',
                                    fontWeight: player.contractStatus ? '500' : '600',
                                    flexShrink: 0,
                                    width: '70px',
                                    textAlign: 'center'
                                  }}>
                                    {player.contractStatus || '✗'}
                                  </div>
                                )}
                              </div>
                            )

                            return elements
                          }).flat()}

                          {/* Summary row for ACTIVE ROSTER section */}
                          {section.title === 'ACTIVE ROSTER' && 
                           ((hasContracts && totalContractYears > 0) || (hasSalaries && totalSalary > 0)) && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '12px 16px',
                              backgroundColor: '#f8fafc',
                              borderTop: '2px solid #e2e8f0',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              <div style={{ width: '35px' }}></div>
                              <div style={{ flex: 1, color: '#64748b' }}>TOTALS:</div>
                              <div style={{ width: '45px' }}></div>
                              {hasSalaries && (
                                <div style={{
                                  color: '#059669',
                                  width: '80px',
                                  textAlign: 'right'
                                }}>
                                  ${totalSalary.toLocaleString()}
                                </div>
                              )}
                              {hasContracts && (
                                <div style={{
                                  color: '#7c3aed',
                                  width: '40px',
                                  textAlign: 'center'
                                }}>
                                  {totalContractYears}yr
                                </div>
                              )}
                              {hasContracts && (
                                <div style={{ width: '70px' }}></div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Stats and Standings */}
          <div>

            {/* League Standings */}
            {standings.length > 0 && (
              <div className="mfl-card" style={{padding: '0', overflow: 'hidden'}}>
                <div style={{
                  padding: '20px 24px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <h3 style={{fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0'}}>
                    League Standings
                  </h3>
                </div>

                <div style={{maxHeight: '500px', overflowY: 'auto'}}>
                  {/* Header */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '12px 16px',
                    borderBottom: '2px solid #e2e8f0',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <div style={{width: '30px', textAlign: 'center'}}>#</div>
                      <div style={{flex: 1}}>Team</div>
                      <div style={{width: '40px', textAlign: 'center'}}>W-L</div>
                      <div style={{width: '50px', textAlign: 'center'}}>PF</div>
                    </div>
                  </div>

                  {/* Teams */}
                  {standings.map((team, index) => (
                    <div key={team.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: team.id === franchiseId ? '#f0f4ff' : 'white',
                      borderBottom: '1px solid #f8fafc',
                      borderLeft: team.id === franchiseId ? '3px solid var(--mfl-primary)' : '3px solid transparent',
                      fontSize: '13px'
                    }}>
                      <div style={{
                        color: '#64748b',
                        fontSize: '12px',
                        fontWeight: '600',
                        flexShrink: 0,
                        width: '30px',
                        textAlign: 'center'
                      }}>
                        {team.rank}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flex: 1,
                        minWidth: 0
                      }}>
                        {team.logo && (
                          <img 
                            src={team.logo} 
                            alt={`${team.name} logo`}
                            style={{
                              width: '20px',
                              height: '20px',
                              objectFit: 'contain',
                              borderRadius: '2px',
                              flexShrink: 0
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <div style={{
                          fontWeight: team.id === franchiseId ? '600' : '500',
                          color: team.id === franchiseId ? 'var(--mfl-primary)' : '#1e293b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {team.name}
                        </div>
                      </div>
                      
                      <div style={{
                        color: '#64748b',
                        fontSize: '12px',
                        fontWeight: '600',
                        flexShrink: 0,
                        width: '40px',
                        textAlign: 'center'
                      }}>
                        {team.wins}-{team.losses}
                      </div>

                      <div style={{
                        color: '#1e293b',
                        fontSize: '12px',
                        fontWeight: '600',
                        flexShrink: 0,
                        width: '50px',
                        textAlign: 'center'
                      }}>
                        {team.pointsFor.toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
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