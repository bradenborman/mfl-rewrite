'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

interface FreeAgent {
  id: string
  name: string
  position: string
  team: string
  avgScore: number
  isAvailable: boolean
}

interface LeagueWaiverInfo {
  currentWaiverType?: string
  maxWaiverRounds?: number
  bbidMinimum?: number
  bbidIncrement?: number
  bbidConditional?: string
  bbidSeasonLimit?: number
  bbidFCFSCharge?: number
}

export default function FreeAgentsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const leagueId = params.id as string
  const host = searchParams.get('host') || 'api.myfantasyleague.com'
  const franchiseId = searchParams.get('franchiseId')
  
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([])
  const [leagueInfo, setLeagueInfo] = useState<any>(null)
  const [waiverInfo, setWaiverInfo] = useState<LeagueWaiverInfo>({})
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<FreeAgent | null>(null)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [rosterPlayers, setRosterPlayers] = useState<any[]>([])
  const [bidAmount, setBidAmount] = useState('')
  const [playerToDrop, setPlayerToDrop] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [blindBidBalance, setBlindBidBalance] = useState<number | null>(null)

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

  useEffect(() => {
    if (!authLoading && user && leagueId) {
      fetchFreeAgents()
      fetchLeagueInfo()
      fetchRosterPlayers()
      fetchBlindBidBalance()
    }
  }, [user, leagueId, host, authLoading])

  const fetchRosterPlayers = async () => {
    if (!franchiseId) {
      console.log('No franchiseId available, skipping roster fetch')
      return
    }
    
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
          
          const processedPlayers = playerIds.map((rosterPlayer: any) => {
            const playerId = rosterPlayer.id
            const playerInfo = playerDatabase.find((p: any) => p.id === playerId)
            
            return {
              id: playerId,
              name: playerInfo?.name || 'Unknown Player',
              position: playerInfo?.position || 'UNK',
              team: playerInfo?.team || 'FA',
              status: rosterPlayer.status
            }
          })
          
          setRosterPlayers(processedPlayers)
        }
      }
    } catch (error) {
      console.error('Failed to fetch roster players:', error)
    }
  }

  const fetchBlindBidBalance = async () => {
    if (!franchiseId) {
      console.log('No franchiseId available, skipping blind bid balance fetch')
      return
    }
    
    try {
      // Fetch franchise info which includes blind bid balance
      const franchiseResponse = await fetch(
        `/api/mfl?command=export&TYPE=league&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (franchiseResponse.ok) {
        const franchiseData = await franchiseResponse.json()
        
        // Look for the current franchise's blind bid balance
        if (franchiseData.league?.franchises?.franchise) {
          const franchises = Array.isArray(franchiseData.league.franchises.franchise) 
            ? franchiseData.league.franchises.franchise 
            : [franchiseData.league.franchises.franchise]
          
          const currentFranchise = franchises.find((f: any) => f.id === franchiseId)
          
          if (currentFranchise?.bbidAvailableBalance) {
            const balance = parseFloat(currentFranchise.bbidAvailableBalance)
            console.log('Blind bid balance:', balance)
            setBlindBidBalance(balance)
          } else {
            console.log('No blind bid balance found for franchise')
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch blind bid balance:', error)
    }
  }

  const fetchLeagueInfo = async () => {
    try {
      const leagueResponse = await fetch(
        `/api/mfl?command=export&TYPE=league&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (leagueResponse.ok) {
        const leagueData = await leagueResponse.json()
        setLeagueInfo(leagueData.league)
        
        // Extract waiver information
        const waiver: LeagueWaiverInfo = {
          currentWaiverType: leagueData.league?.currentWaiverType,
          maxWaiverRounds: leagueData.league?.maxWaiverRounds ? parseInt(leagueData.league.maxWaiverRounds) : undefined,
          bbidMinimum: leagueData.league?.bbidMinimum ? parseFloat(leagueData.league.bbidMinimum) : undefined,
          bbidIncrement: leagueData.league?.bbidIncrement ? parseFloat(leagueData.league.bbidIncrement) : undefined,
          bbidConditional: leagueData.league?.bbidConditional,
          bbidSeasonLimit: leagueData.league?.bbidSeasonLimit ? parseInt(leagueData.league.bbidSeasonLimit) : undefined,
          bbidFCFSCharge: leagueData.league?.bbidFCFSCharge ? parseFloat(leagueData.league.bbidFCFSCharge) : undefined
        }
        
        console.log('League waiver info:', waiver)
        setWaiverInfo(waiver)
      }
    } catch (error) {
      console.error('Failed to fetch league info:', error)
    }
  }

  const fetchFreeAgents = async () => {
    try {
      setIsLoading(true)
      setError('')

      console.log('Fetching free agents with scoring data...')
      
      // Use playerScores endpoint with AVG and freeagent status
      const freeAgentsResponse = await fetch(
        `/api/mfl?command=export&TYPE=playerScores&L=${leagueId}&W=AVG&STATUS=freeagent&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!freeAgentsResponse.ok) {
        throw new Error(`Failed to fetch free agents: ${freeAgentsResponse.status}`)
      }
      
      const freeAgentsData = await freeAgentsResponse.json()
      console.log('Raw free agents response:', freeAgentsData)

      // Load cached player database for cross-reference
      const playerDbResponse = await fetch('/data/players.json')
      const playerDb = await playerDbResponse.json()
      const playerDatabase = playerDb.data || []
      console.log('Player database loaded:', playerDatabase.length, 'players')

      if (freeAgentsData.playerScores?.playerScore) {
        const playerScores = Array.isArray(freeAgentsData.playerScores.playerScore) 
          ? freeAgentsData.playerScores.playerScore 
          : [freeAgentsData.playerScores.playerScore]

        console.log('Free agent player scores:', playerScores.length)
        console.log('Sample player scores:', playerScores.slice(0, 3))

        // Cross-reference with player database
        const processedFreeAgents: FreeAgent[] = playerScores.map((playerScore: any) => {
          const playerId = playerScore.id
          const playerInfo = playerDatabase.find((p: any) => p.id === playerId)
          
          return {
            id: playerId,
            name: playerInfo?.name || 'Unknown Player',
            position: playerInfo?.position || 'UNK',
            team: playerInfo?.team || 'FA',
            avgScore: parseFloat(playerScore.score) || 0,
            isAvailable: playerScore.isAvailable === '1'
          }
        })

        // Filter only available players and sort by average score (descending), then by position
        const availableFreeAgents = processedFreeAgents
          .filter(player => player.isAvailable)
          .sort((a, b) => {
            // First sort by position
            const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
            const aIndex = positionOrder.indexOf(a.position)
            const bIndex = positionOrder.indexOf(b.position)
            const aPos = aIndex === -1 ? 999 : aIndex
            const bPos = bIndex === -1 ? 999 : bIndex
            
            if (aPos !== bPos) return aPos - bPos
            
            // Then sort by average score (descending)
            return b.avgScore - a.avgScore
          })

        console.log('Processed available free agents:', availableFreeAgents.length)
        setFreeAgents(availableFreeAgents)
      } else {
        console.log('No free agents found in response')
        setFreeAgents([])
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load free agents'
      setError(errorMessage)
      console.error('Free agents fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter free agents based on position and search term
  const filteredFreeAgents = freeAgents.filter(player => {
    const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition
    const matchesSearch = searchTerm === '' || 
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesPosition && matchesSearch
  })

  const handlePlayerClick = (player: FreeAgent) => {
    if (!franchiseId) {
      alert('Franchise ID is required to submit waiver claims. Please navigate from the dashboard.')
      return
    }
    setSelectedPlayer(player)
    setShowClaimModal(true)
  }

  const getWaiverTypeDisplay = () => {
    switch (waiverInfo.currentWaiverType) {
      case 'BBID':
        return 'Blind Bid'
      case 'BBID_FCFS':
        return 'Blind Bid + FCFS'
      case 'WAIVERS':
        return 'Standard Waivers'
      case 'WAIVERS_FCFS':
        return 'Waivers + FCFS'
      case 'FCFS':
        return 'First Come First Serve'
      case 'None':
        return 'No Waivers'
      default:
        return waiverInfo.currentWaiverType || 'Unknown'
    }
  }

  if (authLoading || !user) {
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
          <p style={{color: '#64748b', fontSize: '16px'}}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
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
                href={`/dashboard/${leagueId}?host=${encodeURIComponent(host)}&franchiseId=${franchiseId || ''}`}
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
                Dashboard
              </a>
              <div>
                <h1 style={{fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '0'}}>
                  Free Agents
                </h1>
                <p style={{color: '#64748b', fontSize: '13px', margin: '0'}}>
                  {leagueInfo?.name || `League ${leagueId}`} - {filteredFreeAgents.length} available players
                  {waiverInfo.currentWaiverType && (
                    <span style={{marginLeft: '8px', color: '#059669', fontWeight: '500'}}>
                      • {getWaiverTypeDisplay()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{paddingTop: '20px', paddingBottom: '32px'}}>
        {error && (
          <div className="mfl-card" style={{marginBottom: '32px', padding: '24px', borderLeft: '4px solid #ef4444'}}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px'}}>
                  Error Loading Free Agents
                </h3>
                <p style={{color: '#7f1d1d', marginBottom: '16px'}}>{error}</p>
                <button onClick={fetchFreeAgents} className="btn-primary">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Waiver Info */}
        {waiverInfo.currentWaiverType && (
          <div className="mfl-card" style={{marginBottom: '24px', padding: '20px'}}>
            <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '12px'}}>
              Waiver System: {getWaiverTypeDisplay()}
            </h3>
            {!franchiseId && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{fontSize: '14px', color: '#92400e'}}>
                  ⚠️ Franchise ID required to submit waiver claims. Please navigate from the dashboard.
                </div>
              </div>
            )}
            <div style={{display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '14px'}}>
              {waiverInfo.currentWaiverType?.includes('BBID') && blindBidBalance !== null && (
                <div>
                  <span style={{color: '#64748b'}}>Available Balance:</span>
                  <span style={{color: '#059669', fontWeight: '600', marginLeft: '4px'}}>
                    ${blindBidBalance.toFixed(2)}
                  </span>
                </div>
              )}
              {waiverInfo.bbidMinimum && (
                <div>
                  <span style={{color: '#64748b'}}>Min Bid:</span>
                  <span style={{color: '#1e293b', fontWeight: '600', marginLeft: '4px'}}>
                    ${waiverInfo.bbidMinimum}
                  </span>
                </div>
              )}
              {waiverInfo.bbidIncrement && (
                <div>
                  <span style={{color: '#64748b'}}>Increment:</span>
                  <span style={{color: '#1e293b', fontWeight: '600', marginLeft: '4px'}}>
                    ${waiverInfo.bbidIncrement}
                  </span>
                </div>
              )}
              {waiverInfo.bbidSeasonLimit && (
                <div>
                  <span style={{color: '#64748b'}}>Season Limit:</span>
                  <span style={{color: '#1e293b', fontWeight: '600', marginLeft: '4px'}}>
                    {waiverInfo.bbidSeasonLimit} claims
                  </span>
                </div>
              )}
              {waiverInfo.bbidFCFSCharge && (
                <div>
                  <span style={{color: '#64748b'}}>FCFS Charge:</span>
                  <span style={{color: '#1e293b', fontWeight: '600', marginLeft: '4px'}}>
                    ${waiverInfo.bbidFCFSCharge}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mfl-card" style={{marginBottom: '24px', padding: '20px'}}>
          <div style={{display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap'}}>
            {/* Position Filter */}
            <div>
              <label style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px', display: 'block'}}>
                Position
              </label>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minWidth: '100px'
                }}
              >
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div style={{flex: 1, minWidth: '200px'}}>
              <label style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px', display: 'block'}}>
                Search Players
              </label>
              <input
                type="text"
                placeholder="Search by name or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Results Count */}
            <div style={{fontSize: '14px', color: '#64748b', fontWeight: '500'}}>
              {filteredFreeAgents.length} of {freeAgents.length} players
            </div>
          </div>
        </div>

        {/* Free Agents List */}
        <div className="mfl-card" style={{padding: '0', overflow: 'hidden', maxWidth: '900px', margin: '0 auto'}}>
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
              <p style={{color: '#64748b', fontSize: '16px'}}>Loading free agents...</p>
            </div>
          ) : filteredFreeAgents.length > 0 ? (
            <div style={{maxHeight: '700px', overflowY: 'auto'}}>
              {/* Header */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '12px 20px',
                borderBottom: '2px solid #e2e8f0',
                fontSize: '12px',
                fontWeight: '600',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                  <div style={{width: '50px', textAlign: 'center'}}>Pos</div>
                  <div style={{flex: 1}}>Player Name</div>
                  <div style={{width: '80px', textAlign: 'center'}}>Team</div>
                  <div style={{width: '80px', textAlign: 'center'}}>Avg Pts</div>
                </div>
              </div>

              {/* Players */}
              {filteredFreeAgents.map((player, index) => {
                const currentPos = player.position
                const prevPlayer = index > 0 ? filteredFreeAgents[index - 1] : null
                const prevPos = prevPlayer ? prevPlayer.position : null
                const isNewPosition = currentPos !== prevPos

                const elements = []

                // Add position separator
                if (isNewPosition && index > 0) {
                  elements.push(
                    <div key={`separator-${currentPos}`} style={{
                      height: '2px',
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
                    gap: '16px',
                    padding: '12px 20px',
                    backgroundColor: 'white',
                    borderBottom: '1px solid #f8fafc',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0fdf4'
                    e.currentTarget.style.borderLeft = '3px solid #059669'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderLeft = 'none'
                  }}
                  onClick={() => handlePlayerClick(player)}
                  >
                    {/* Position */}
                    <div style={{
                      color: '#64748b',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0,
                      width: '50px',
                      textAlign: 'center'
                    }}>
                      {player.position}
                    </div>
                    
                    {/* Player Name */}
                    <div style={{
                      fontWeight: '600', 
                      color: '#1e293b',
                      flex: 1
                    }}>
                      {player.name}
                    </div>
                    
                    {/* Team */}
                    <div style={{
                      color: '#64748b',
                      fontSize: '13px',
                      fontWeight: '500',
                      flexShrink: 0,
                      width: '80px',
                      textAlign: 'center'
                    }}>
                      {player.team}
                    </div>

                    {/* Average Score */}
                    <div style={{
                      color: '#059669',
                      fontSize: '13px',
                      fontWeight: '600',
                      flexShrink: 0,
                      width: '80px',
                      textAlign: 'center'
                    }}>
                      {player.avgScore.toFixed(1)}
                    </div>
                  </div>
                )

                return elements
              }).flat()}
            </div>
          ) : (
            <div style={{padding: '64px', textAlign: 'center', color: '#64748b'}}>
              <div style={{marginBottom: '16px'}}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '48px', height: '48px', margin: '0 auto', color: '#cbd5e1'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 style={{fontSize: '18px', fontWeight: '600', color: '#64748b', marginBottom: '8px'}}>
                No Free Agents Found
              </h3>
              <p style={{fontSize: '14px'}}>
                {searchTerm || selectedPosition !== 'ALL' 
                  ? 'Try adjusting your filters to see more players.'
                  : 'There are no available free agents in this league.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}