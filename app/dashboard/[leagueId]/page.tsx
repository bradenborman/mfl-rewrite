'use client'

/**
 * League Dashboard - The main dashboard for managing a specific league
 * Sleek design with MFL blue/red color scheme and subtle background patterns
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

export default function LeagueDashboard() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const leagueId = params.leagueId as string
  const host = searchParams.get('host') || 'api.myfantasyleague.com'
  const franchiseId = searchParams.get('franchiseId')
  
  const [leagueInfo, setLeagueInfo] = useState<LeagueInfo | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [players, setPlayers] = useState<RosterPlayer[]>([])
  const [rosterSections, setRosterSections] = useState<any[]>([])
  const [rosterTotals, setRosterTotals] = useState<{contractYears: number, salary: number, hasContracts: boolean, hasSalaries: boolean}>({contractYears: 0, salary: 0, hasContracts: false, hasSalaries: false})
  const [standings, setStandings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [dataLoadingKey, setDataLoadingKey] = useState(0) // Force re-render key

  useEffect(() => {
    if (!authLoading && user && leagueId && franchiseId) {
      console.log('Dashboard useEffect triggered with:', { user: !!user, leagueId, franchiseId, host })
      // Reset state before fetching new data
      setIsLoading(true)
      setError('')
      setLeagueInfo(null)
      setPlayers([])
      setRosterSections([])
      setStandings([])
      setDataLoadingKey(prev => prev + 1) // Increment key to force re-render
      
      // Fetch data
      fetchLeagueData()
      loadPlayerData()
    }
  }, [user, leagueId, host, franchiseId, authLoading])

  const loadPlayerData = async () => {
    try {
      console.log('Loading real roster data for franchise:', franchiseId)
      
      // Fetch the user's actual roster from MFL API
      const rosterResponse = await fetch(
        `/api/mfl?command=export&TYPE=rosters&L=${leagueId}&FRANCHISE=${franchiseId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!rosterResponse.ok) {
        throw new Error(`Failed to fetch roster: ${rosterResponse.status}`)
      }
      
      const rosterData = await rosterResponse.json()
      console.log('Raw roster response:', rosterData)
      
      // Load cached player database for cross-reference
      const playerDbResponse = await fetch('/data/players.json')
      const playerDb = await playerDbResponse.json()
      const playerDatabase = playerDb.data || []
      console.log('Player database loaded:', playerDatabase.length, 'players')
      
      // Process the roster data
      if (rosterData.rosters && rosterData.rosters.franchise) {
        const franchises = Array.isArray(rosterData.rosters.franchise) 
          ? rosterData.rosters.franchise 
          : [rosterData.rosters.franchise]
        
        const userFranchise = franchises.find((f: any) => f.id === franchiseId)
        console.log('User franchise roster:', userFranchise)
        
        if (userFranchise && userFranchise.player) {
          const rosterPlayers = Array.isArray(userFranchise.player) 
            ? userFranchise.player 
            : [userFranchise.player]
          
          console.log('Raw roster players:', rosterPlayers)
          
          // Cross-reference with player database and categorize by roster status
          const processedPlayers = rosterPlayers.map((rosterPlayer: any) => {
            const playerInfo = playerDatabase.find((p: any) => p.id === rosterPlayer.id)
            
            // Determine roster status from MFL data
            let rosterStatus: 'active' | 'ir' | 'taxi' = 'active'
            if (rosterPlayer.status === 'TAXI_SQUAD') {
              rosterStatus = 'taxi'
            } else if (rosterPlayer.status === 'INJURED_RESERVE' || rosterPlayer.status === 'IR') {
              rosterStatus = 'ir'
            }
            
            return {
              id: rosterPlayer.id,
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
          
          // Detect league type based on available data
          const hasContracts = processedPlayers.some((p: any) => p.contractYears || p.contractStatus)
          const hasSalaries = processedPlayers.some((p: any) => p.salary)
          
          console.log('League type detection:', { hasContracts, hasSalaries })
          
          // Group players by roster status and sort by position within each group
          const activeRoster = processedPlayers.filter((p: any) => p.rosterStatus === 'active')
          const irRoster = processedPlayers.filter((p: any) => p.rosterStatus === 'ir')
          const taxiRoster = processedPlayers.filter((p: any) => p.rosterStatus === 'taxi')
          
          // Sort each roster section by position
          const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
          const sortByPosition = (players: any[]) => {
            return players.sort((a: any, b: any) => {
              const aIndex = positionOrder.indexOf(a.position)
              const bIndex = positionOrder.indexOf(b.position)
              const aPos = aIndex === -1 ? 999 : aIndex
              const bPos = bIndex === -1 ? 999 : bIndex
              if (aPos !== bPos) return aPos - bPos
              return a.name.localeCompare(b.name) // Secondary sort by name
            })
          }
          
          const sortedActiveRoster = sortByPosition([...activeRoster])
          const sortedIrRoster = sortByPosition([...irRoster])
          const sortedTaxiRoster = sortByPosition([...taxiRoster])
          
          // Calculate totals for active roster only
          const totalContractYears = sortedActiveRoster.reduce((sum: number, player: any) => {
            return sum + (player.contractYears || 0)
          }, 0)
          
          const totalSalary = sortedActiveRoster.reduce((sum: number, player: any) => {
            return sum + (player.salary || 0)
          }, 0)
          
          console.log('Active roster contract years total:', totalContractYears)
          console.log('Active roster salary total:', totalSalary)
          
          // Combine all rosters in order: ACTIVE, IR, TAXI
          const allRosters = [
            { title: 'ACTIVE ROSTER', players: sortedActiveRoster, showTotals: true },
            { title: 'INJURED RESERVE', players: sortedIrRoster, showTotals: false },
            { title: 'TAXI SQUAD', players: sortedTaxiRoster, showTotals: false }
          ]
          
          // Store totals and league type info for display
          const rosterTotals = {
            contractYears: totalContractYears,
            salary: totalSalary,
            hasContracts,
            hasSalaries
          }
          
          setPlayers(processedPlayers) // Keep original for compatibility
          setRosterSections(allRosters)
          setRosterTotals(rosterTotals)
          
          console.log('Roster data loaded successfully:', {
            sections: allRosters.length,
            totalPlayers: processedPlayers.length,
            hasContracts: rosterTotals.hasContracts,
            hasSalaries: rosterTotals.hasSalaries
          })
        } else {
          console.log('No roster found for franchise')
          setPlayers([])
          setRosterSections([])
        }
      } else {
        console.log('No roster data in response')
        setPlayers([])
        setRosterSections([])
      }
      
    } catch (error) {
      console.error('Failed to load roster data:', error)
      // Set empty arrays on error to ensure component can render
      setPlayers([])
      setRosterSections([])
    }
  }

  const fetchLeagueData = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Clear any cached data for this league to ensure fresh data
      const cacheKey = `league_${leagueId}_${host}`
      localStorage.removeItem(cacheKey)

      console.log('Fetching fresh league data from API')
      
      // Make a direct API call to get league data with franchise info
      console.log('Fetching league data with franchise info...')
      const leagueResponse = await fetch(
        `/api/mfl?command=export&TYPE=league&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!leagueResponse.ok) {
        throw new Error(`Failed to fetch league data: ${leagueResponse.status}`)
      }
      
      const leagueData = await leagueResponse.json()
      console.log('League API Response:', JSON.stringify(leagueData, null, 2))
      
      // Extract franchise name and logo from the league data
      let franchiseName = 'My Team' // fallback
      let franchiseLogo = '' // fallback
      let leagueName = `League ${leagueId}` // fallback
      
      if (leagueData?.league) {
        // Get league name
        if (leagueData.league.name) {
          leagueName = leagueData.league.name
        }
        
        // Look for franchise data in the league response
        if (leagueData.league.franchises?.franchise) {
          const franchises = Array.isArray(leagueData.league.franchises.franchise) 
            ? leagueData.league.franchises.franchise 
            : [leagueData.league.franchises.franchise]
          
          console.log('Found franchises:', franchises)
          console.log('Looking for franchise ID:', franchiseId)
          
          // Find the current user's franchise
          const userFranchise = franchises.find((f: any) => f.id === franchiseId)
          console.log('User franchise found:', userFranchise)
          console.log('User franchise keys:', userFranchise ? Object.keys(userFranchise) : 'none')
          
          if (userFranchise?.name) {
            franchiseName = userFranchise.name
            console.log('Extracted franchise name:', franchiseName)
          } else {
            console.log('No name found for franchise, using fallback')
          }
          
          // Check for logo in different possible fields
          if (userFranchise?.logo) {
            franchiseLogo = userFranchise.logo
            console.log('Extracted franchise logo from logo field:', franchiseLogo)
          } else if (userFranchise?.icon) {
            franchiseLogo = userFranchise.icon
            console.log('Extracted franchise logo from icon field:', franchiseLogo)
          } else {
            console.log('No logo found for franchise. Available fields:', userFranchise ? Object.keys(userFranchise) : 'none')
          }
        } else {
          console.log('No franchise data found in league response')
        }
      }
      
      console.log('Final franchise name:', franchiseName)
      console.log('Final franchise logo:', franchiseLogo)
      console.log('Final league name:', leagueName)
      
      const leagueInfo = {
        id: leagueId,
        name: leagueName,
        year: 2025,
        host,
        franchiseId: franchiseId,
        franchiseName: franchiseName,
        franchiseLogo: franchiseLogo,
        totalFranchises: leagueData?.league?.franchises?.franchise ? 
          (Array.isArray(leagueData.league.franchises.franchise) ? 
            leagueData.league.franchises.franchise.length : 1) : 0,
        currentWeek: 1,
        status: 'active'
      }

      // Fetch real standings data
      let stats = {
        wins: 0,
        losses: 0,
        points: 0,
        rank: 0
      }
      
      try {
        console.log('Fetching standings data...')
        const standingsResponse = await fetch(
          `/api/mfl?command=export&TYPE=leagueStandings&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
        )
        
        if (standingsResponse.ok) {
          const standingsData = await standingsResponse.json()
          console.log('Raw standings response:', standingsData)
          
          if (standingsData?.leagueStandings?.franchise) {
            const franchises = Array.isArray(standingsData.leagueStandings.franchise) 
              ? standingsData.leagueStandings.franchise 
              : [standingsData.leagueStandings.franchise]
            
            console.log('Found franchises in standings:', franchises.length)
            console.log('Looking for franchise ID:', franchiseId)
            
            // Process all franchises for standings table
            const processedStandings = franchises.map((franchise: any, index: number) => {
              return {
                rank: index + 1, // We'll sort and re-rank later
                franchiseId: franchise.id,
                team: `Team ${franchise.id}`, // We'll get real names from league info later
                wins: parseInt(franchise.h2hw || '0'),
                losses: parseInt(franchise.h2hl || '0'),
                pf: parseFloat(franchise.pf || '0'),
                pa: parseFloat(franchise.pa || '0'),
                isUser: franchise.id === franchiseId
              }
            })
            
            // Sort by wins desc, then by points for desc
            processedStandings.sort((a: any, b: any) => {
              if (a.wins !== b.wins) return b.wins - a.wins
              return b.pf - a.pf
            })
            
            // Re-assign ranks after sorting
            processedStandings.forEach((team: any, index: number) => {
              team.rank = index + 1
            })
            
            console.log('Processed standings:', processedStandings)
            
            console.log('=== STANDINGS DEBUG ===')
            console.log('Raw standings franchises:', franchises)
            console.log('League data franchises:', leagueData?.league?.franchises?.franchise)
            console.log('Processed standings before team name update:', processedStandings)
            
            // Update standings with real team names immediately
            console.log('=== UPDATING STANDINGS WITH TEAM NAMES ===')
            const leagueFranchises = Array.isArray(leagueData.league.franchises.franchise) 
              ? leagueData.league.franchises.franchise 
              : [leagueData.league.franchises.franchise]
            
            console.log('Available league franchises:', leagueFranchises.map((f: any) => ({ id: f.id, name: f.name })))
            
            const standingsWithNames = processedStandings.map((team: any) => {
              let teamName = team.team // keep existing name as fallback
              console.log(`Processing team ${team.franchiseId}, current name: ${teamName}`)
              
              const franchiseInfo = leagueFranchises.find((f: any) => f.id === team.franchiseId)
              console.log(`Found franchise info for ${team.franchiseId}:`, franchiseInfo)
              
              if (franchiseInfo?.name) {
                teamName = franchiseInfo.name
                console.log(`Updated team name to: ${teamName}`)
              } else {
                console.log(`No name found for franchise ${team.franchiseId}`)
              }
              
              return { ...team, team: teamName }
            })
            
            console.log('Final standings with team names:', standingsWithNames)
            setStandings(standingsWithNames)
            
            // Find the current user's franchise in standings
            const userStandings = franchises.find((f: any) => f.id === franchiseId)
            console.log('User standings found:', userStandings)
            
            if (userStandings) {
              stats = {
                wins: parseInt(userStandings.h2hw || '0'), // head-to-head wins
                losses: parseInt(userStandings.h2hl || '0'), // head-to-head losses
                points: parseFloat(userStandings.pf || '0'), // points for
                rank: processedStandings.find((s: any) => s.franchiseId === franchiseId)?.rank || 0
              }
              console.log('Extracted stats:', stats)
            } else {
              console.log('No standings found for franchise ID:', franchiseId)
            }
          } else {
            console.log('No leagueStandings.franchise found in response')
          }
        } else {
          console.log('Failed to fetch standings:', standingsResponse.status)
        }
      } catch (error) {
        console.error('Error fetching standings:', error)
        // Set empty standings array on error
        setStandings([])
      }

      // Cache the data
      const cacheData = {
        data: { leagueInfo, stats },
        timestamp: Date.now()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))

      setLeagueInfo(leagueInfo)
      setStats(stats)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load league information'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToSection = (section: string) => {
    const url = `/league/${leagueId}/${section}?host=${encodeURIComponent(host)}&franchiseId=${franchiseId}`
    window.location.href = url
  }

  if (authLoading || !user) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
              <p style={{color: '#64748b', marginBottom: '24px'}}>Please log in to access the dashboard.</p>
              <a href="/login" className="btn-primary">Go to Login</a>
            </>
          )}
        </div>
      </div>
    )
  }

  // Don't render anything until we have the required parameters
  if (!franchiseId) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <h1 style={{fontSize: '2rem', fontWeight: '700', color: '#1e293b', marginBottom: '16px'}}>Missing Franchise ID</h1>
          <p style={{color: '#64748b', marginBottom: '24px'}}>
            Your franchise ID is required to load the dashboard. This should be automatically included when navigating from the leagues page.
          </p>
          <a href="/dashboard" className="btn-primary">Back to Leagues</a>
        </div>
      </div>
    )
  }

  // Show loading until ALL data is loaded - but be more lenient about roster data
  if (isLoading || !leagueInfo) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{
            width: '48px', 
            height: '48px', 
            border: '4px solid #e2e8f0', 
            borderTop: '4px solid #059669',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{color: '#64748b', fontSize: '16px'}}>Loading dashboard data...</p>
          <p style={{color: '#94a3b8', fontSize: '14px', marginTop: '8px'}}>
            {!leagueInfo ? 'Loading league info...' : 'Finalizing...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div key={`dashboard-${leagueId}-${franchiseId}-${dataLoadingKey}`} style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div className="container" style={{paddingTop: '12px', paddingBottom: '12px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <a
                href="/dashboard"
                style={{
                  color: '#0ea5e9',
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
                <h1 style={{fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '0'}}>
                  {isLoading ? 'Loading...' : leagueInfo?.name || `League ${leagueId}`}
                </h1>
                <p style={{color: '#64748b', fontSize: '13px', margin: '0'}}>
                  {leagueInfo?.year} Season
                </p>
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <p style={{color: '#1e293b', fontSize: '13px', fontWeight: '600', margin: '0'}}>{user.username}</p>
              <p style={{color: '#64748b', fontSize: '11px', margin: '0'}}>Team {leagueInfo?.franchiseId}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{paddingTop: '20px', paddingBottom: '32px'}}>
        
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
                  Error Loading Dashboard
                </h3>
                <p style={{color: '#7f1d1d', marginBottom: '16px'}}>{error}</p>
                <button onClick={() => {
                  setDataLoadingKey(prev => prev + 1) // Force complete re-render
                  fetchLeagueData()
                  loadPlayerData()
                }} className="btn-primary">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px', alignItems: 'start'}}>
            
            {/* Left Column - Main Content */}
            <div>
              
              {/* My Team Section */}
              <div className="mfl-card" style={{marginBottom: '32px', padding: '24px'}}>
                <div style={{marginBottom: '8px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                    {leagueInfo?.franchiseLogo && (
                      <img 
                        src={leagueInfo.franchiseLogo} 
                        alt={`${leagueInfo.franchiseName} logo`}
                        style={{
                          width: '40px',
                          height: '40px',
                          objectFit: 'contain',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0'
                        }}
                        onError={(e) => {
                          // Hide image if it fails to load
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <div style={{display: 'flex', alignItems: 'baseline', gap: '12px'}}>
                      <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: '0'}}>
                        {leagueInfo?.franchiseName || 'My Team'}
                      </h2>
                      <p style={{color: '#64748b', fontSize: '16px', fontWeight: '600', margin: '0'}}>
                        {stats?.wins || 0}-{stats?.losses || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full Roster */}
                <div>
                  <div style={{maxHeight: '500px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '8px'}}>
                    {rosterSections.length > 0 ? (
                      rosterSections.map((section, sectionIndex) => {
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
                            {section.players.map((player: any, playerIndex: number) => {
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
                                  {rosterTotals.hasSalaries && (
                                    <div style={{
                                      color: player.salary ? '#059669' : '#dc2626',
                                      fontSize: player.salary ? '12px' : '12px',
                                      fontWeight: '600',
                                      flexShrink: 0,
                                      width: '80px',
                                      textAlign: 'right'
                                    }}>
                                      {player.salary ? `${player.salary.toLocaleString()}` : '✗'}
                                    </div>
                                  )}
                                  
                                  {/* Contract Years - Only if league uses contracts */}
                                  {rosterTotals.hasContracts && (
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
                                  {rosterTotals.hasContracts && (
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
                            {section.title === 'ACTIVE ROSTER' && ((rosterTotals.hasContracts && rosterTotals.contractYears > 0) || (rosterTotals.hasSalaries && rosterTotals.salary > 0)) && (
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
                                <div style={{ flex: 1, color: '#64748b' }}>
                                  TOTALS:
                                </div>
                                <div style={{ width: '45px' }}></div>
                                
                                {rosterTotals.hasSalaries && (
                                  <div style={{
                                    color: '#059669',
                                    width: '80px',
                                    textAlign: 'right'
                                  }}>
                                    ${rosterTotals.salary.toLocaleString()}
                                  </div>
                                )}
                                
                                {rosterTotals.hasContracts && (
                                  <div style={{
                                    color: '#7c3aed',
                                    width: '40px',
                                    textAlign: 'center'
                                  }}>
                                    {rosterTotals.contractYears}yr
                                  </div>
                                )}
                                
                                {rosterTotals.hasContracts && (
                                  <div style={{ width: '70px' }}></div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div style={{padding: '32px', textAlign: 'center', color: '#64748b'}}>
                        <p style={{fontSize: '14px', marginBottom: '8px'}}>No roster data available</p>
                        <p style={{fontSize: '12px'}}>Unable to load your roster information</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* League Standings */}
              <div className="mfl-card" style={{padding: '32px'}}>
                <div style={{marginBottom: '24px'}}>
                  <h2 style={{fontSize: '1.5rem', fontWeight: '600', color: '#1e293b'}}>
                    League Standings
                  </h2>
                </div>

                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{borderBottom: '2px solid #e2e8f0'}}>
                        <th style={{textAlign: 'left', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#64748b'}}>Rank</th>
                        <th style={{textAlign: 'left', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#64748b'}}>Team</th>
                        <th style={{textAlign: 'center', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#64748b'}}>W-L</th>
                        <th style={{textAlign: 'right', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#64748b'}}>PF</th>
                        <th style={{textAlign: 'right', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#64748b'}}>PA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Real standings data */}
                      {standings.length > 0 ? standings.map((team, index) => (
                        <tr key={team.franchiseId} style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: team.isUser ? '#f0f9ff' : 'transparent'
                        }}>
                          <td style={{padding: '16px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b'}}>
                            {team.rank}
                          </td>
                          <td style={{padding: '16px 0', fontSize: '14px', fontWeight: team.isUser ? '600' : '500', color: team.isUser ? '#0ea5e9' : '#1e293b'}}>
                            {team.team}
                          </td>
                          <td style={{padding: '16px 0', fontSize: '14px', fontWeight: '500', color: '#1e293b', textAlign: 'center'}}>
                            {team.wins}-{team.losses}
                          </td>
                          <td style={{padding: '16px 0', fontSize: '14px', fontWeight: '500', color: '#1e293b', textAlign: 'right'}}>
                            {Math.round(team.pf)}
                          </td>
                          <td style={{padding: '16px 0', fontSize: '14px', fontWeight: '500', color: '#1e293b', textAlign: 'right'}}>
                            {Math.round(team.pa)}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} style={{padding: '32px', textAlign: 'center', color: '#64748b'}}>
                            Loading standings...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column - Quick Actions */}
            <div>
              <div className="mfl-card" style={{padding: '24px', marginBottom: '24px'}}>
                <h3 style={{fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '20px'}}>
                  Quick Actions
                </h3>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <button 
                    onClick={() => navigateToSection('lineup')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#1e40af',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '20px', height: '20px'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <p style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '2px'}}>Set Lineup</p>
                      <p style={{fontSize: '12px', color: '#64748b'}}>Manage your starting roster</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => navigateToSection('standings')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#7c3aed',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '20px', height: '20px'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '2px'}}>Full Standings</p>
                      <p style={{fontSize: '12px', color: '#64748b'}}>View complete league standings</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => navigateToSection('scoring')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#dc2626',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '20px', height: '20px'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '2px'}}>Live Scores</p>
                      <p style={{fontSize: '12px', color: '#64748b'}}>Track game results</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => navigateToSection('free-agents')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#f59e0b',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '20px', height: '20px'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '2px'}}>Free Agents</p>
                      <p style={{fontSize: '12px', color: '#64748b'}}>Find available players</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => navigateToSection('rosters')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#059669',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '20px', height: '20px'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '2px'}}>All Rosters</p>
                      <p style={{fontSize: '12px', color: '#64748b'}}>View league teams</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* This Week */}
              <div className="mfl-card" style={{padding: '24px'}}>
                <h3 style={{fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px'}}>
                  This Week
                </h3>
                <div style={{textAlign: 'center', padding: '20px 0'}}>
                  <p style={{fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '4px'}}>
                    Week {leagueInfo?.currentWeek || 1}
                  </p>
                  <p style={{fontSize: '14px', color: '#64748b', marginBottom: '16px'}}>
                    {leagueInfo?.year} Season
                  </p>
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    border: '1px solid #bae6fd'
                  }}>
                    <p style={{fontSize: '14px', fontWeight: '600', color: '#0369a1'}}>
                      Lineup locks Tuesday
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </main>
    </div>
  );
}