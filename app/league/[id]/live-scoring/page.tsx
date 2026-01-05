'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

interface LivePlayer {
  id: string
  status: 'starter' | 'nonstarter'
  score: string
  gameSecondsRemaining: string
  updatedStats: string
}

interface LiveFranchise {
  id: string
  score: string
  gameSecondsRemaining: string
  playersCurrentlyPlaying: string
  playersYetToPlay: string
  isHome?: string
  players: {
    player: LivePlayer[]
  }
}

interface LiveMatchup {
  franchise: LiveFranchise[]
}

interface LiveScoringData {
  week: string
  franchise?: LiveFranchise[]  // For non-matchup weeks (like week 18)
  matchup?: LiveMatchup[]      // For regular weeks with matchups
}

export default function LiveScoringPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const leagueId = params.id as string
  const host = searchParams.get('host') || 'api.myfantasyleague.com'
  
  const [liveScoringData, setLiveScoringData] = useState<LiveScoringData | null>(null)
  const [playersData, setPlayersData] = useState<{[key: string]: any}>({})
  const [franchisesData, setFranchisesData] = useState<{[key: string]: any}>({})
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [showBench, setShowBench] = useState(false)
  const [matchupBenchStates, setMatchupBenchStates] = useState<{[key: number]: boolean}>({})
  const [showToast, setShowToast] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Load player data
  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        const response = await fetch('/data/players.json')
        if (response.ok) {
          const data = await response.json()
          const playersLookup: {[key: string]: any} = {}
          if (data.data && Array.isArray(data.data)) {
            data.data.forEach((player: any) => {
              playersLookup[player.id] = player
            })
          }
          setPlayersData(playersLookup)
        }
      } catch (err) {
        console.error('Failed to load player data:', err)
      }
    }
    loadPlayerData()
  }, [])

  useEffect(() => {
    if (!authLoading && user && leagueId) {
      fetchScheduleAndSetup()
    }
  }, [user, leagueId, host, authLoading])

  useEffect(() => {
    if (selectedWeek !== null) {
      fetchLiveScoring()
      // Set up auto-refresh every 45 seconds for the selected week
      const interval = setInterval(() => {
        fetchLiveScoring(true) // Pass true to show toast
      }, 45000)
      return () => clearInterval(interval)
    }
  }, [selectedWeek])

  const fetchScheduleAndSetup = async () => {
    try {
      setIsLoading(true)
      setError('')

      // First fetch league data for franchise information
      const leagueResponse = await fetch(
        `/api/mfl?command=export&TYPE=league&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (leagueResponse.ok) {
        const leagueData = await leagueResponse.json()
        
        if (leagueData.league?.franchises?.franchise) {
          const franchises = Array.isArray(leagueData.league.franchises.franchise) 
            ? leagueData.league.franchises.franchise 
            : [leagueData.league.franchises.franchise]
          
          const franchisesLookup: {[key: string]: any} = {}
          franchises.forEach((franchise: any) => {
            franchisesLookup[franchise.id] = franchise
          })
          setFranchisesData(franchisesLookup)
        }
      }

      // Fetch schedule to get available weeks
      const scheduleResponse = await fetch(
        `/api/mfl?command=export&TYPE=schedule&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        if (scheduleData.schedule?.weeklySchedule) {
          const weeks = scheduleData.schedule.weeklySchedule.map((week: any) => parseInt(week.week))
          setAvailableWeeks(weeks.sort((a: number, b: number) => a - b))
          
          // Set default to current week or latest week
          const currentWeek = Math.max(...weeks)
          setSelectedWeek(currentWeek)
        } else {
          // Fallback to standard 1-18 weeks if no schedule data
          const standardWeeks = Array.from({length: 18}, (_, i) => i + 1)
          setAvailableWeeks(standardWeeks)
          setSelectedWeek(18) // Default to week 18
        }
      } else {
        // Fallback to standard 1-18 weeks
        const standardWeeks = Array.from({length: 18}, (_, i) => i + 1)
        setAvailableWeeks(standardWeeks)
        setSelectedWeek(18) // Default to week 18
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load schedule'
      setError(errorMessage)
      // Fallback to standard weeks even on error
      const standardWeeks = Array.from({length: 18}, (_, i) => i + 1)
      setAvailableWeeks(standardWeeks)
      setSelectedWeek(18)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLiveScoring = async (showToastOnUpdate = false) => {
    if (!selectedWeek) return
    
    try {
      setError('')

      // Fetch live scoring data for selected week
      const response = await fetch(
        `/api/mfl?command=export&TYPE=liveScoring&L=${leagueId}&W=${selectedWeek}&DETAILS=1&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch live scoring: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.liveScoring) {
        setLiveScoringData(data.liveScoring)
        setLastUpdated(new Date())
        
        // Show toast notification for auto-updates
        if (showToastOnUpdate) {
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000) // Hide after 3 seconds
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load live scoring'
      setError(errorMessage)
    }
  }

  const getPlayerName = (playerId: string): string => {
    const player = playersData[playerId]
    return player ? player.name : `Player ${playerId}`
  }

  const getFranchiseName = (franchiseId: string): string => {
    const franchise = franchisesData[franchiseId]
    return franchise ? franchise.name : `Team ${franchiseId}`
  }

  const formatGameTime = (seconds: string): string => {
    const secs = parseInt(seconds)
    if (secs === 0) return 'Final'
    if (secs >= 3600) return 'Not Started'
    
    const minutes = Math.floor(secs / 60)
    const remainingSeconds = secs % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Helper function to get all franchises regardless of format
  const toggleMatchupBench = (matchupIndex: number) => {
    setMatchupBenchStates(prev => ({
      ...prev,
      [matchupIndex]: !prev[matchupIndex]
    }))
  }

  const getAllFranchises = (): LiveFranchise[] => {
    if (!liveScoringData) return []
    
    // Format 1: Direct franchise array (non-matchup weeks like week 18)
    if (liveScoringData.franchise) {
      return Array.isArray(liveScoringData.franchise) 
        ? liveScoringData.franchise 
        : [liveScoringData.franchise]
    }
    
    // Format 2: Matchup format (regular weeks)
    if (liveScoringData.matchup) {
      const franchises: LiveFranchise[] = []
      const matchups = Array.isArray(liveScoringData.matchup) 
        ? liveScoringData.matchup 
        : [liveScoringData.matchup]
      
      matchups.forEach(matchup => {
        const matchupFranchises = Array.isArray(matchup.franchise) 
          ? matchup.franchise 
          : [matchup.franchise]
        franchises.push(...matchupFranchises)
      })
      
      return franchises
    }
    
    return []
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

  if (error) {
    return (
      <div style={{minHeight: '100vh', backgroundColor: '#f8fafc'}}>
        <header className="mfl-header">
          <div className="container" style={{paddingTop: '12px', paddingBottom: '12px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <a
                href={`/dashboard/${new Date().getFullYear()}/${leagueId}?host=${encodeURIComponent(host)}&franchiseId=${searchParams.get('franchiseId') || ''}`}
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
                Dashboard
              </a>
              <div>
                <h1 style={{fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '0'}}>
                  Live Scoring
                </h1>
              </div>
            </div>
          </div>
        </header>
        <main className="container" style={{paddingTop: '20px'}}>
          <div className="mfl-card" style={{padding: '24px', borderLeft: '4px solid #ef4444'}}>
            <h3 style={{fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px'}}>
              Error Loading Live Scoring
            </h3>
            <p style={{color: '#7f1d1d', marginBottom: '16px'}}>{error}</p>
            <button onClick={fetchLiveScoring} className="btn-primary">
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      <header className="mfl-header">
        <div className="container" style={{paddingTop: '12px', paddingBottom: '12px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <a
              href={`/dashboard/${new Date().getFullYear()}/${leagueId}?host=${encodeURIComponent(host)}&franchiseId=${searchParams.get('franchiseId') || ''}`}
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
              Dashboard
            </a>
            <div>
              <h1 style={{fontSize: '1.25rem', fontWeight: '600', color: 'white', marginBottom: '0'}}>
                Live Scoring
              </h1>
              <p style={{color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', margin: '0'}}>
                Week {selectedWeek || '?'} - League {leagueId}
                {lastUpdated && (
                  <span style={{marginLeft: '8px'}}>
                    • Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{paddingTop: '20px', paddingBottom: '32px'}}>
        {/* Week Selector */}
        {availableWeeks.length > 0 && (
          <div className="mfl-card" style={{marginBottom: '20px', padding: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
              <h3 style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '0'}}>
                Select Week
              </h3>
              <div style={{fontSize: '12px', color: '#64748b'}}>
                {availableWeeks.length} weeks available
              </div>
            </div>
            
            {/* Week buttons */}
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
              {availableWeeks.map(week => (
                <button
                  key={week}
                  onClick={() => setSelectedWeek(week)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: selectedWeek === week ? 'var(--mfl-primary)' : 'transparent',
                    color: selectedWeek === week ? 'white' : '#64748b',
                    border: `1px solid ${selectedWeek === week ? 'var(--mfl-primary)' : '#e2e8f0'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    minWidth: '40px'
                  }}
                  onMouseOver={(e) => {
                    if (selectedWeek !== week) {
                      e.currentTarget.style.backgroundColor = '#f1f5f9'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedWeek !== week) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                    }
                  }}
                >
                  {week}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{textAlign: 'center', padding: '64px 0'}}>
            <div style={{
              width: '48px', 
              height: '48px', 
              border: '4px solid #e2e8f0', 
              borderTop: '4px solid var(--mfl-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{color: '#64748b', fontSize: '16px'}}>Loading live scores...</p>
          </div>
        ) : liveScoringData ? (
          <div>
            {/* Render based on format */}
            {liveScoringData.matchup ? (
              // Matchup format - show head-to-head matchups
              <div style={{display: 'grid', gap: '24px'}}>
                {(Array.isArray(liveScoringData.matchup) ? liveScoringData.matchup : [liveScoringData.matchup])
                  .map((matchup, matchupIndex) => {
                    const franchises = Array.isArray(matchup.franchise) ? matchup.franchise : [matchup.franchise]
                    const homeTeam = franchises.find(f => f.isHome === '1')
                    const awayTeam = franchises.find(f => f.isHome === '0')
                    const showBenchForMatchup = matchupBenchStates[matchupIndex] || false
                    
                    return (
                      <div key={matchupIndex} className="mfl-card" style={{padding: '20px'}}>
                        <div style={{
                          display: 'grid', 
                          gridTemplateColumns: '1fr auto 1fr', 
                          gap: '20px', 
                          alignItems: 'center',
                          marginBottom: '16px'
                        }}>
                          {/* Away Team */}
                          <div style={{textAlign: 'right'}}>
                            <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0'}}>
                              {awayTeam ? getFranchiseName(awayTeam.id) : 'TBD'}
                            </h3>
                            <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--mfl-primary)', marginTop: '4px'}}>
                              {awayTeam ? parseFloat(awayTeam.score).toFixed(1) : '0.0'}
                            </div>
                          </div>

                          {/* VS */}
                          <div style={{
                            textAlign: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#64748b',
                            padding: '8px 16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '20px'
                          }}>
                            VS
                          </div>

                          {/* Home Team */}
                          <div style={{textAlign: 'left'}}>
                            <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: '0'}}>
                              {homeTeam ? getFranchiseName(homeTeam.id) : 'TBD'}
                            </h3>
                            <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--mfl-primary)', marginTop: '4px'}}>
                              {homeTeam ? parseFloat(homeTeam.score).toFixed(1) : '0.0'}
                            </div>
                          </div>
                        </div>

                        {/* Players for both teams */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                          {/* Away Team Players */}
                          <div>
                            <h4 style={{fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase'}}>
                              {awayTeam ? getFranchiseName(awayTeam.id) : 'Away'} Starters
                            </h4>
                            {awayTeam && (() => {
                              const players = Array.isArray(awayTeam.players.player) ? awayTeam.players.player : [awayTeam.players.player];
                              const starters = players.filter(player => player && player.status === 'starter');
                              const bench = players.filter(player => player && player.status === 'nonstarter');
                              
                              return (
                                <>
                                  {/* Starters */}
                                  {starters.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).map(player => (
                                    <div key={player.id} style={{
                                      padding: '6px 10px',
                                      backgroundColor: '#f8fafc',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      marginBottom: '4px'
                                    }}>
                                      <div style={{flex: 1}}>
                                        <div style={{fontSize: '12px', fontWeight: '500', color: '#1e293b'}}>
                                          {getPlayerName(player.id)}
                                        </div>
                                        <div style={{fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                          <span style={{
                                            backgroundColor: 'var(--mfl-primary)',
                                            color: 'white',
                                            padding: '1px 4px',
                                            borderRadius: '2px',
                                            fontSize: '9px',
                                            fontWeight: '600'
                                          }}>
                                            {playersData[player.id]?.position || 'N/A'}
                                          </span>
                                          {formatGameTime(player.gameSecondsRemaining)}
                                        </div>
                                      </div>
                                      <div style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: parseFloat(player.score) > 0 ? '#059669' : '#64748b'
                                      }}>
                                        {parseFloat(player.score).toFixed(1)}
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {/* Bench Players - Collapsible */}
                                  {bench.length > 0 && (
                                    <>
                                      {showBenchForMatchup && (
                                        <>
                                          <div style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            color: '#64748b',
                                            marginTop: '12px',
                                            marginBottom: '6px',
                                            textTransform: 'uppercase',
                                            borderTop: '1px solid #e2e8f0',
                                            paddingTop: '8px'
                                          }}>
                                            Bench ({bench.length})
                                          </div>
                                          {bench.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).map(player => (
                                            <div key={player.id} style={{
                                              padding: '6px 10px',
                                              backgroundColor: '#f1f5f9',
                                              borderRadius: '4px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              marginBottom: '4px',
                                              opacity: 0.7
                                            }}>
                                              <div style={{flex: 1}}>
                                                <div style={{fontSize: '12px', fontWeight: '500', color: '#1e293b'}}>
                                                  {getPlayerName(player.id)}
                                                  <span style={{
                                                    marginLeft: '4px',
                                                    fontSize: '9px',
                                                    color: '#64748b',
                                                    fontWeight: '400'
                                                  }}>
                                                    (Bench)
                                                  </span>
                                                </div>
                                                <div style={{fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                  <span style={{
                                                    backgroundColor: 'var(--mfl-primary)',
                                                    color: 'white',
                                                    padding: '1px 4px',
                                                    borderRadius: '2px',
                                                    fontSize: '9px',
                                                    fontWeight: '600'
                                                  }}>
                                                    {playersData[player.id]?.position || 'N/A'}
                                                  </span>
                                                  {formatGameTime(player.gameSecondsRemaining)}
                                                </div>
                                              </div>
                                              <div style={{
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: parseFloat(player.score) > 0 ? '#059669' : '#64748b'
                                              }}>
                                                {parseFloat(player.score).toFixed(1)}
                                              </div>
                                            </div>
                                          ))}
                                        </>
                                      )}
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {/* Home Team Players */}
                          <div>
                            <h4 style={{fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase'}}>
                              {homeTeam ? getFranchiseName(homeTeam.id) : 'Home'} Starters
                            </h4>
                            {homeTeam && (() => {
                              const players = Array.isArray(homeTeam.players.player) ? homeTeam.players.player : [homeTeam.players.player];
                              const starters = players.filter(player => player && player.status === 'starter');
                              const bench = players.filter(player => player && player.status === 'nonstarter');
                              
                              return (
                                <>
                                  {/* Starters */}
                                  {starters.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).map(player => (
                                    <div key={player.id} style={{
                                      padding: '6px 10px',
                                      backgroundColor: '#f8fafc',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      marginBottom: '4px'
                                    }}>
                                      <div style={{flex: 1}}>
                                        <div style={{fontSize: '12px', fontWeight: '500', color: '#1e293b'}}>
                                          {getPlayerName(player.id)}
                                        </div>
                                        <div style={{fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                          <span style={{
                                            backgroundColor: 'var(--mfl-primary)',
                                            color: 'white',
                                            padding: '1px 4px',
                                            borderRadius: '2px',
                                            fontSize: '9px',
                                            fontWeight: '600'
                                          }}>
                                            {playersData[player.id]?.position || 'N/A'}
                                          </span>
                                          {formatGameTime(player.gameSecondsRemaining)}
                                        </div>
                                      </div>
                                      <div style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: parseFloat(player.score) > 0 ? '#059669' : '#64748b'
                                      }}>
                                        {parseFloat(player.score).toFixed(1)}
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {/* Bench Players - Collapsible */}
                                  {bench.length > 0 && (
                                    <>
                                      {showBenchForMatchup && (
                                        <>
                                          <div style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            color: '#64748b',
                                            marginTop: '12px',
                                            marginBottom: '6px',
                                            textTransform: 'uppercase',
                                            borderTop: '1px solid #e2e8f0',
                                            paddingTop: '8px'
                                          }}>
                                            Bench ({bench.length})
                                          </div>
                                          {bench.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).map(player => (
                                            <div key={player.id} style={{
                                              padding: '6px 10px',
                                              backgroundColor: '#f1f5f9',
                                              borderRadius: '4px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              marginBottom: '4px',
                                              opacity: 0.7
                                            }}>
                                              <div style={{flex: 1}}>
                                                <div style={{fontSize: '12px', fontWeight: '500', color: '#1e293b'}}>
                                                  {getPlayerName(player.id)}
                                                  <span style={{
                                                    marginLeft: '4px',
                                                    fontSize: '9px',
                                                    color: '#64748b',
                                                    fontWeight: '400'
                                                  }}>
                                                    (Bench)
                                                  </span>
                                                </div>
                                                <div style={{fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                  <span style={{
                                                    backgroundColor: 'var(--mfl-primary)',
                                                    color: 'white',
                                                    padding: '1px 4px',
                                                    borderRadius: '2px',
                                                    fontSize: '9px',
                                                    fontWeight: '600'
                                                  }}>
                                                    {playersData[player.id]?.position || 'N/A'}
                                                  </span>
                                                  {formatGameTime(player.gameSecondsRemaining)}
                                                </div>
                                              </div>
                                              <div style={{
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: parseFloat(player.score) > 0 ? '#059669' : '#64748b'
                                              }}>
                                                {parseFloat(player.score).toFixed(1)}
                                              </div>
                                            </div>
                                          ))}
                                        </>
                                      )}
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Show Bench Toggle for this matchup - only show if there are bench players */}
                        {(() => {
                          const awayPlayers = awayTeam && awayTeam.players && awayTeam.players.player ? 
                            (Array.isArray(awayTeam.players.player) ? awayTeam.players.player : [awayTeam.players.player]) : [];
                          const homePlayers = homeTeam && homeTeam.players && homeTeam.players.player ? 
                            (Array.isArray(homeTeam.players.player) ? homeTeam.players.player : [homeTeam.players.player]) : [];
                          
                          const totalBench = awayPlayers.filter(p => p && p.status === 'nonstarter').length +
                                           homePlayers.filter(p => p && p.status === 'nonstarter').length;
                          
                          if (totalBench === 0) {
                            return (
                              <div style={{
                                display: 'flex', 
                                justifyContent: 'center', 
                                marginTop: '16px'
                              }}>
                                <div style={{
                                  fontSize: '11px', 
                                  color: '#94a3b8',
                                  fontStyle: 'italic'
                                }}>
                                  No bench players for this week
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div style={{
                              display: 'flex', 
                              justifyContent: 'center', 
                              marginTop: '16px'
                            }}>
                              <label style={{
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                fontSize: '12px', 
                                color: '#64748b',
                                cursor: 'pointer'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={showBenchForMatchup}
                                  onChange={(e) => {
                                    toggleMatchupBench(matchupIndex);
                                  }}
                                  style={{margin: '0'}}
                                />
                                Show Bench Players ({totalBench})
                              </label>
                            </div>
                          );
                        })()}
                      </div>
                    )
                  })}
              </div>
            ) : (
              // Non-matchup format - show all teams ranked
              <div style={{display: 'grid', gap: '16px'}}>
                {getAllFranchises()
                  .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
                  .map((franchise, index) => (
                  <div key={franchise.id} className="mfl-card" style={{padding: '20px'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '20px', alignItems: 'center', marginBottom: '16px'}}>
                      <div>
                        <h3 style={{fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0', marginBottom: '4px'}}>
                          #{index + 1} {getFranchiseName(franchise.id)}
                        </h3>
                        <div style={{fontSize: '12px', color: '#64748b'}}>
                          {franchise.playersCurrentlyPlaying} playing • {franchise.playersYetToPlay} yet to play
                        </div>
                      </div>
                      <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--mfl-primary)'}}>
                          {parseFloat(franchise.score).toFixed(1)}
                        </div>
                        <div style={{fontSize: '11px', color: '#64748b'}}>POINTS</div>
                      </div>
                      <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: '14px', fontWeight: '600', color: '#059669'}}>
                          {formatGameTime(franchise.gameSecondsRemaining)}
                        </div>
                        <div style={{fontSize: '11px', color: '#64748b'}}>TIME LEFT</div>
                      </div>
                    </div>

                    {/* Players */}
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px'}}>
                      {(() => {
                        const players = Array.isArray(franchise.players.player) ? franchise.players.player : [franchise.players.player];
                        const starters = players.filter(player => player && player.status === 'starter');
                        const bench = players.filter(player => player && player.status === 'nonstarter');
                        
                        return (
                          <>
                            {/* Starters */}
                            {starters.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).map(player => (
                              <div key={player.id} style={{
                                padding: '8px 12px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '6px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div style={{flex: 1}}>
                                  <div style={{fontSize: '13px', fontWeight: '500', color: '#1e293b'}}>
                                    {getPlayerName(player.id)}
                                  </div>
                                  <div style={{fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                    <span style={{
                                      backgroundColor: 'var(--mfl-primary)',
                                      color: 'white',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      fontSize: '10px',
                                      fontWeight: '600'
                                    }}>
                                      {playersData[player.id]?.position || 'N/A'}
                                    </span>
                                    {formatGameTime(player.gameSecondsRemaining)}
                                    {player.updatedStats && <span style={{marginLeft: '4px', color: '#059669'}}>●</span>}
                                  </div>
                                </div>
                                <div style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: parseFloat(player.score) > 0 ? '#059669' : '#64748b'
                                }}>
                                  {parseFloat(player.score).toFixed(1)}
                                </div>
                              </div>
                            ))}
                            
                            {/* Bench Players - Collapsible */}
                            {bench.length > 0 && showBench && (
                              <>
                                <div style={{
                                  gridColumn: '1 / -1',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: '#64748b',
                                  marginTop: '8px',
                                  marginBottom: '4px',
                                  textTransform: 'uppercase',
                                  borderTop: '1px solid #e2e8f0',
                                  paddingTop: '8px'
                                }}>
                                  Bench ({bench.length})
                                </div>
                                {bench.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)).map(player => (
                                  <div key={player.id} style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    opacity: 0.7
                                  }}>
                                    <div style={{flex: 1}}>
                                      <div style={{fontSize: '13px', fontWeight: '500', color: '#1e293b'}}>
                                        {getPlayerName(player.id)}
                                        <span style={{
                                          marginLeft: '6px',
                                          fontSize: '10px',
                                          color: '#64748b',
                                          fontWeight: '400'
                                        }}>
                                          (Bench)
                                        </span>
                                      </div>
                                      <div style={{fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                        <span style={{
                                          backgroundColor: 'var(--mfl-primary)',
                                          color: 'white',
                                          padding: '1px 5px',
                                          borderRadius: '3px',
                                          fontSize: '10px',
                                          fontWeight: '600'
                                        }}>
                                          {playersData[player.id]?.position || 'N/A'}
                                        </span>
                                        {formatGameTime(player.gameSecondsRemaining)}
                                        {player.updatedStats && <span style={{marginLeft: '4px', color: '#059669'}}>●</span>}
                                      </div>
                                    </div>
                                    <div style={{
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: parseFloat(player.score) > 0 ? '#059669' : '#64748b'
                                    }}>
                                      {parseFloat(player.score).toFixed(1)}
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '64px 0'}}>
            <h3 style={{fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px'}}>
              No Live Scoring Data
            </h3>
            <p style={{color: '#64748b', maxWidth: '400px', margin: '0 auto'}}>
              Live scoring data is not available at this time.
            </p>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#059669',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          Scores updated
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}