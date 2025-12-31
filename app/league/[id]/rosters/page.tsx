'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

interface FranchiseRoster {
  franchiseId: string
  franchiseName: string
  ownerName: string
  franchiseLogo?: string
  players: RosterPlayer[]
  totals: {
    contractYears: number
    salary: number
    hasContracts: boolean
    hasSalaries: boolean
  }
}

interface RosterPlayer {
  id: string
  name: string
  position: string
  team: string
  status: 'active' | 'injured' | 'bye'
  rosterStatus: 'active' | 'ir' | 'taxi'
  salary?: number
  contractYears?: number
  contractStatus?: string
}

export default function AllRostersPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const leagueId = params.id as string
  const host = searchParams.get('host') || 'api.myfantasyleague.com'
  
  const [rosters, setRosters] = useState<FranchiseRoster[]>([])
  const [leagueInfo, setLeagueInfo] = useState<any>(null)
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && user && leagueId) {
      fetchAllRosters()
    }
  }, [user, leagueId, host, authLoading])

  const fetchAllRosters = async () => {
    try {
      setIsLoading(true)
      setError('')

      const leagueResponse = await fetch(
        `/api/mfl?command=export&TYPE=league&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!leagueResponse.ok) {
        throw new Error(`Failed to fetch league data: ${leagueResponse.status}`)
      }
      
      const leagueData = await leagueResponse.json()
      setLeagueInfo(leagueData.league)

      const rostersResponse = await fetch(
        `/api/mfl?command=export&TYPE=rosters&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!rostersResponse.ok) {
        throw new Error(`Failed to fetch rosters: ${rostersResponse.status}`)
      }
      
      const rostersData = await rostersResponse.json()

      const playerDbResponse = await fetch('/data/players.json')
      const playerDb = await playerDbResponse.json()
      const playerDatabase = playerDb.data || []

      if (rostersData.rosters?.franchise && leagueData.league?.franchises?.franchise) {
        const rosterFranchises = Array.isArray(rostersData.rosters.franchise) 
          ? rostersData.rosters.franchise 
          : [rostersData.rosters.franchise]

        const leagueFranchises = Array.isArray(leagueData.league.franchises.franchise) 
          ? leagueData.league.franchises.franchise 
          : [leagueData.league.franchises.franchise]

        const processedRosters: FranchiseRoster[] = rosterFranchises.map((rosterFranchise: any) => {
          const franchiseInfo = leagueFranchises.find((f: any) => f.id === rosterFranchise.id)
          
          const rosterPlayers = rosterFranchise.player ? 
            (Array.isArray(rosterFranchise.player) ? rosterFranchise.player : [rosterFranchise.player]) : []

          const processedPlayers: RosterPlayer[] = rosterPlayers.map((rosterPlayer: any) => {
            const playerInfo = playerDatabase.find((p: any) => p.id === rosterPlayer.id)
            
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

          const activeRoster = processedPlayers.filter(p => p.rosterStatus === 'active')
          const irRoster = processedPlayers.filter(p => p.rosterStatus === 'ir')
          const taxiRoster = processedPlayers.filter(p => p.rosterStatus === 'taxi')

          const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
          const sortByPosition = (players: RosterPlayer[]) => {
            return players.sort((a, b) => {
              const aIndex = positionOrder.indexOf(a.position)
              const bIndex = positionOrder.indexOf(b.position)
              const aPos = aIndex === -1 ? 999 : aIndex
              const bPos = bIndex === -1 ? 999 : bIndex
              if (aPos !== bPos) return aPos - bPos
              return a.name.localeCompare(b.name)
            })
          }

          const allPlayers = [
            ...sortByPosition([...activeRoster]),
            ...sortByPosition([...irRoster]),
            ...sortByPosition([...taxiRoster])
          ]

          const hasContracts = activeRoster.some(p => p.contractYears || p.contractStatus)
          const hasSalaries = activeRoster.some(p => p.salary)

          const totalContractYears = activeRoster.reduce((sum, player) => sum + (player.contractYears || 0), 0)
          const totalSalary = activeRoster.reduce((sum, player) => sum + (player.salary || 0), 0)

          return {
            franchiseId: rosterFranchise.id,
            franchiseName: franchiseInfo?.name || `Team ${rosterFranchise.id}`,
            ownerName: franchiseInfo?.owner_name || 'Unknown Owner',
            franchiseLogo: franchiseInfo?.logo || franchiseInfo?.icon,
            players: allPlayers,
            totals: {
              contractYears: totalContractYears,
              salary: totalSalary,
              hasContracts,
              hasSalaries
            }
          }
        })

        processedRosters.sort((a, b) => a.franchiseName.localeCompare(b.franchiseName))
        setRosters(processedRosters)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load rosters'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const selectTeam = (index: number) => {
    setSelectedTeamIndex(index)
  }

  const nextTeam = () => {
    setSelectedTeamIndex((prev) => (prev + 1) % rosters.length)
  }

  const prevTeam = () => {
    setSelectedTeamIndex((prev) => (prev - 1 + rosters.length) % rosters.length)
  }

  const selectedRoster = rosters[selectedTeamIndex]

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
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div className="container" style={{paddingTop: '12px', paddingBottom: '12px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <a
                href={`/dashboard/${leagueId}?host=${encodeURIComponent(host)}&franchiseId=${searchParams.get('franchiseId') || ''}`}
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
                  All Rosters
                </h1>
                <p style={{color: '#64748b', fontSize: '13px', margin: '0'}}>
                  {leagueInfo?.name || `League ${leagueId}`} - {rosters.length} Teams
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
                  Error Loading Rosters
                </h3>
                <p style={{color: '#7f1d1d', marginBottom: '16px'}}>{error}</p>
                <button onClick={fetchAllRosters} className="btn-primary">
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
            <p style={{color: '#64748b', fontSize: '16px'}}>Loading all rosters...</p>
          </div>
        ) : rosters.length > 0 ? (
          <div style={{
            display: 'grid', 
            gridTemplateColumns: '300px 1fr', 
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Left Side - Team Selector */}
            <div className="mfl-card" style={{padding: '16px', height: 'fit-content'}}>
              <h3 style={{fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px'}}>
                Select Team
              </h3>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                {rosters.map((roster, index) => (
                  <div
                    key={roster.franchiseId}
                    onClick={() => selectTeam(index)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: index === selectedTeamIndex ? '2px solid #059669' : '1px solid #e2e8f0',
                      backgroundColor: index === selectedTeamIndex ? '#f0fdf4' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      if (index !== selectedTeamIndex) {
                        e.currentTarget.style.backgroundColor = '#f8fafc'
                        e.currentTarget.style.borderColor = '#cbd5e1'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (index !== selectedTeamIndex) {
                        e.currentTarget.style.backgroundColor = 'white'
                        e.currentTarget.style.borderColor = '#e2e8f0'
                      }
                    }}
                  >
                    {roster.franchiseLogo && (
                      <img 
                        src={roster.franchiseLogo} 
                        alt={`${roster.franchiseName} logo`}
                        style={{
                          width: '24px',
                          height: '24px',
                          objectFit: 'contain',
                          borderRadius: '3px',
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: index === selectedTeamIndex ? '#059669' : '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.2'
                      }}>
                        {roster.franchiseName}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.2'
                      }}>
                        {roster.ownerName}
                      </div>
                    </div>
                    
                    {/* Quick stats */}
                    <div style={{
                      fontSize: '10px',
                      color: '#64748b',
                      textAlign: 'right',
                      flexShrink: 0
                    }}>
                      {roster.players.length}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Navigation buttons at bottom */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <button
                  onClick={prevTeam}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '12px', height: '12px'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </button>
                
                <div style={{
                  fontSize: '11px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {selectedTeamIndex + 1} of {rosters.length}
                </div>
                
                <button
                  onClick={nextTeam}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  Next
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '12px', height: '12px'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Side - Selected Team Roster */}
            {selectedRoster && (
              <div className="mfl-card" style={{padding: '0', overflow: 'hidden'}}>
                {/* Team Header */}
                <div style={{
                  padding: '24px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                    {selectedRoster.franchiseLogo && (
                      <img 
                        src={selectedRoster.franchiseLogo} 
                        alt={`${selectedRoster.franchiseName} logo`}
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
                      <h2 style={{fontSize: '1.75rem', fontWeight: '600', color: '#1e293b', margin: '0'}}>
                        {selectedRoster.franchiseName}
                      </h2>
                      <p style={{color: '#64748b', fontSize: '16px', margin: '0'}}>
                        {selectedRoster.ownerName} • {selectedRoster.players.length} players
                      </p>
                    </div>
                  </div>
                  
                  {/* Totals Summary */}
                  <div style={{display: 'flex', gap: '24px', fontSize: '14px'}}>
                    {selectedRoster.totals.hasSalaries && (
                      <div style={{textAlign: 'right'}}>
                        <div style={{color: '#64748b', fontSize: '12px'}}>Total Salary</div>
                        <div style={{color: '#059669', fontWeight: '600', fontSize: '18px'}}>
                          ${selectedRoster.totals.salary.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedRoster.totals.hasContracts && (
                      <div style={{textAlign: 'right'}}>
                        <div style={{color: '#64748b', fontSize: '12px'}}>Contract Years</div>
                        <div style={{color: '#7c3aed', fontWeight: '600', fontSize: '18px'}}>
                          {selectedRoster.totals.contractYears}yr
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Roster Table */}
                <div style={{maxHeight: '700px', overflowY: 'auto'}}>
                  {selectedRoster.players.length > 0 ? (
                    selectedRoster.players.map((player, index) => {
                      const currentPos = player.position
                      const currentStatus = player.rosterStatus
                      const prevPlayer = index > 0 ? selectedRoster.players[index - 1] : null
                      const prevPos = prevPlayer ? prevPlayer.position : null
                      const prevStatus = prevPlayer ? prevPlayer.rosterStatus : null
                      const isNewPosition = currentPos !== prevPos
                      const isNewStatus = currentStatus !== prevStatus
                      
                      const elements = []
                      
                      if (isNewStatus && index > 0) {
                        let statusLabel = ''
                        let statusColor = ''
                        if (currentStatus === 'ir') {
                          statusLabel = 'INJURED RESERVE'
                          statusColor = '#ef4444'
                        } else if (currentStatus === 'taxi') {
                          statusLabel = 'TAXI SQUAD'
                          statusColor = '#f59e0b'
                        }
                        
                        if (statusLabel) {
                          elements.push(
                            <div key={`status-${index}`} style={{
                              backgroundColor: '#f8fafc',
                              padding: '12px 20px',
                              borderBottom: '1px solid #e2e8f0',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: statusColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {statusLabel}
                            </div>
                          )
                        }
                      }
                      
                      if (isNewPosition && index > 0 && !isNewStatus) {
                        elements.push(
                          <div key={`separator-${index}`} style={{
                            height: '2px',
                            backgroundColor: '#e2e8f0',
                            margin: '0'
                          }} />
                        )
                      }
                      
                      elements.push(
                        <div key={player.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 20px',
                          backgroundColor: player.rosterStatus === 'taxi' ? '#fef3c7' : 
                                        player.rosterStatus === 'ir' ? '#fef2f2' : 'white',
                          borderBottom: '1px solid #f8fafc',
                          borderLeft: player.rosterStatus === 'taxi' ? '4px solid #f59e0b' : 
                                    player.rosterStatus === 'ir' ? '4px solid #ef4444' : '4px solid transparent',
                          fontSize: '14px'
                        }}>
                          <div style={{
                            color: '#64748b',
                            fontSize: '12px',
                            fontWeight: '600',
                            flexShrink: 0,
                            width: '40px',
                            textAlign: 'center'
                          }}>
                            {player.position}
                          </div>
                          
                          <div style={{
                            fontWeight: '600', 
                            color: '#1e293b',
                            flex: 1,
                            minWidth: '150px'
                          }}>
                            {player.name}
                          </div>
                          
                          <div style={{
                            color: '#64748b',
                            fontSize: '13px',
                            fontWeight: '500',
                            flexShrink: 0,
                            width: '50px',
                            textAlign: 'center'
                          }}>
                            {player.team}
                          </div>
                          
                          {selectedRoster.totals.hasSalaries && (
                            <div style={{
                              color: player.salary ? '#059669' : '#dc2626',
                              fontSize: '13px',
                              fontWeight: '600',
                              flexShrink: 0,
                              width: '100px',
                              textAlign: 'right'
                            }}>
                              {player.salary ? `$${player.salary.toLocaleString()}` : '✗'}
                            </div>
                          )}
                          
                          {selectedRoster.totals.hasContracts && (
                            <div style={{
                              color: player.contractYears ? '#7c3aed' : '#dc2626',
                              fontSize: '12px',
                              fontWeight: player.contractYears ? '500' : '600',
                              flexShrink: 0,
                              width: '50px',
                              textAlign: 'center'
                            }}>
                              {player.contractYears ? `${player.contractYears}yr` : '✗'}
                            </div>
                          )}
                          
                          {selectedRoster.totals.hasContracts && (
                            <div style={{
                              color: player.contractStatus ? '#64748b' : '#dc2626',
                              fontSize: '12px',
                              fontWeight: player.contractStatus ? '500' : '600',
                              flexShrink: 0,
                              width: '80px',
                              textAlign: 'center'
                            }}>
                              {player.contractStatus || '✗'}
                            </div>
                          )}
                        </div>
                      )
                      
                      return elements
                    }).flat()
                  ) : (
                    <div style={{padding: '48px', textAlign: 'center', color: '#64748b'}}>
                      No players found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '64px 0'}}>
            <p style={{color: '#64748b', fontSize: '16px'}}>No rosters found</p>
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