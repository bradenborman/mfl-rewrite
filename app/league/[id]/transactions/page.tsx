'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'

enum TransactionType {
  WAIVER = 'WAIVER',
  BBID_WAIVER = 'BBID_WAIVER',
  FREE_AGENT = 'FREE_AGENT',
  WAIVER_REQUEST = 'WAIVER_REQUEST',
  BBID_WAIVER_REQUEST = 'BBID_WAIVER_REQUEST',
  TRADE = 'TRADE',
  IR = 'IR',
  TAXI = 'TAXI',
  AUCTION_INIT = 'AUCTION_INIT',
  AUCTION_BID = 'AUCTION_BID',
  AUCTION_WON = 'AUCTION_WON',
  SURVIVOR_PICK = 'SURVIVOR_PICK',
  POOL_PICK = 'POOL_PICK'
}

export default function TransactionsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const leagueId = params.id as string
  const host = searchParams.get('host') || 'api.myfantasyleague.com'
  
  const [transactionData, setTransactionData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>(Object.values(TransactionType))
  const [playersData, setPlayersData] = useState<{[key: string]: any}>({})
  const [franchisesData, setFranchisesData] = useState<{[key: string]: any}>({})

  // Load player data
  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        const response = await fetch('/data/players.json')
        if (response.ok) {
          const data = await response.json()
          // Convert array to lookup object by player ID
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

  // Helper function to get player name
  const getPlayerName = (playerId: string): string => {
    const player = playersData[playerId]
    return player ? player.name : `Player ${playerId}`
  }

  // Helper function to get franchise name
  const getFranchiseName = (franchiseId: string): string => {
    const franchise = franchisesData[franchiseId]
    return franchise ? franchise.name : `Team ${franchiseId}`
  }

  // Helper function to get display name for transaction types
  const getTransactionDisplayName = (type: string): string => {
    switch (type) {
      case 'BBID_WAIVER':
        return 'Blind Bid Waiver'
      case 'WAIVER':
        return 'Waiver'
      case 'FREE_AGENT':
        return 'Free Agent'
      case 'TRADE':
        return 'Trade'
      case 'IR':
        return 'Injured Reserve'
      case 'TAXI':
        return 'Taxi Squad'
      case 'WAIVER_REQUEST':
        return 'Waiver Request'
      case 'BBID_WAIVER_REQUEST':
        return 'Blind Bid Waiver Request'
      case 'AUCTION_INIT':
        return 'Auction Init'
      case 'AUCTION_BID':
        return 'Auction Bid'
      case 'AUCTION_WON':
        return 'Auction Won'
      case 'SURVIVOR_PICK':
        return 'Survivor Pick'
      case 'POOL_PICK':
        return 'Pool Pick'
      default:
        return type.replace(/_/g, ' ')
    }
  }

  useEffect(() => {
    if (!authLoading && user && leagueId) {
      fetchTransactions()
    }
  }, [user, leagueId, host, authLoading, selectedTypes])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      setError('')

      // First fetch league data for franchise information
      const leagueResponse = await fetch(
        `/api/mfl?command=export&TYPE=league&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!leagueResponse.ok) {
        throw new Error(`Failed to fetch league data: ${leagueResponse.status}`)
      }
      
      const leagueData = await leagueResponse.json()
      
      // Process franchise data into lookup object
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

      // Then fetch transactions
      const response = await fetch(
        `/api/mfl?command=export&TYPE=transactions&L=${leagueId}&JSON=1&host=${encodeURIComponent(host)}&cookie=${encodeURIComponent(user!.cookie)}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`)
      }
      
      const data = await response.json()
      setTransactionData(data)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTypeChange = (type: TransactionType, checked: boolean) => {
    if (checked) {
      setSelectedTypes(prev => [...prev, type])
    } else {
      setSelectedTypes(prev => prev.filter(t => t !== type))
    }
  }

  const handleSelectAll = () => {
    setSelectedTypes(Object.values(TransactionType))
  }

  const handleSelectNone = () => {
    setSelectedTypes([])
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
                  Transactions
                </h1>
              </div>
            </div>
          </div>
        </header>
        <main className="container" style={{paddingTop: '20px'}}>
          <div className="mfl-card" style={{padding: '24px', borderLeft: '4px solid #ef4444'}}>
            <h3 style={{fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px'}}>
              Error Loading Transactions
            </h3>
            <p style={{color: '#7f1d1d', marginBottom: '16px'}}>{error}</p>
            <button onClick={fetchTransactions} className="btn-primary">
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (isLoading) {
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
                  Transactions
                </h1>
              </div>
            </div>
          </div>
        </header>
        <main className="container" style={{paddingTop: '20px'}}>
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
            <p style={{color: '#64748b', fontSize: '16px'}}>Loading transactions...</p>
          </div>
        </main>
      </div>
    )
  }

  // Group transactions by date
  const groupTransactionsByDate = (transactions: any[]) => {
    const groups: { [key: string]: any[] } = {}
    const today = new Date().toDateString()

    transactions.forEach(transaction => {
      const date = new Date(parseInt(transaction.timestamp) * 1000)
      const dateKey = date.toDateString()
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(transaction)
    })

    // Convert to array and sort by date (newest first)
    return Object.entries(groups)
      .map(([dateKey, transactions]) => {
        const date = new Date(dateKey)
        const isToday = dateKey === today
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const isYesterday = dateKey === yesterday.toDateString()
        
        let displayDate = ''
        if (isToday) {
          displayDate = 'Today'
        } else if (isYesterday) {
          displayDate = 'Yesterday'
        } else {
          const daysDiff = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
          if (daysDiff < 7) {
            displayDate = date.toLocaleDateString('en-US', { weekday: 'long' })
          } else {
            displayDate = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            })
          }
        }
        
        return {
          date: dateKey,
          displayDate,
          transactions: transactions.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp)),
          isToday
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const filteredTransactions = transactionData && transactionData.transactions 
    ? (Array.isArray(transactionData.transactions.transaction) 
        ? transactionData.transactions.transaction
            .filter((trans: any) => {
              // First filter: Only include specific transaction types we want to display
              const includedTypes = ['WAIVER', 'BBID_WAIVER', 'FREE_AGENT', 'TRADE', 'IR', 'TAXI'];
              if (!includedTypes.includes(trans.type)) {
                return false;
              }
              
              // Second filter: Exclude transaction types that don't involve actual player movements
              const excludedTypes = [
                'BBID_AUTO_PROCESS_WAIVERS',
                'BBID_WAIVER_REQUEST',
                'WAIVER_REQUEST'
              ];
              return !excludedTypes.includes(trans.type);
            })
        : [])
    : []

  const groupedTransactions = groupTransactionsByDate(filteredTransactions)

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
                Transactions
              </h1>
              <p style={{color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', margin: '0'}}>
                League {leagueId} - {filteredTransactions.length} transactions
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{paddingTop: '20px', paddingBottom: '32px'}}>
        {groupedTransactions.length > 0 ? (
          <div>
            {groupedTransactions.map((group) => (
              <div key={group.date} className="mfl-card" style={{marginBottom: '24px', padding: '0', overflow: 'hidden'}}>
                {/* Date Header */}
                <div style={{
                  padding: '16px 20px',
                  backgroundColor: group.isToday ? 'var(--mfl-primary)' : '#f8fafc',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <h3 style={{
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: group.isToday ? 'white' : '#1e293b', 
                    margin: '0',
                    marginBottom: '2px'
                  }}>
                    {group.displayDate}
                  </h3>
                  <p style={{
                    fontSize: '13px', 
                    color: group.isToday ? 'rgba(255, 255, 255, 0.8)' : '#64748b', 
                    margin: '0'
                  }}>
                    {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Transactions List */}
                <div>
                  {group.transactions.map((trans: any, index: number) => (
                    <div key={index} style={{
                      padding: '16px 20px',
                      borderBottom: index < group.transactions.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}>
                      <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                        <div style={{
                          fontSize: '16px',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}>
                          {trans.type === 'TRADE' ? '🔄' : 
                           trans.type === 'BBID_WAIVER' ? '💰' :
                           trans.type === 'WAIVER' ? '📋' :
                           trans.type === 'FREE_AGENT' ? '✍️' :
                           trans.type === 'IR' ? '🏥' :
                           trans.type === 'TAXI' ? '🚕' : '📝'}
                        </div>
                        <div style={{flex: 1}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: 'var(--mfl-primary)',
                              backgroundColor: 'rgba(38, 62, 104, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {getTransactionDisplayName(trans.type)}
                            </span>
                            <span style={{fontSize: '12px', color: '#64748b'}}>
                              {new Date(parseInt(trans.timestamp) * 1000).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </span>
                          </div>
                          
                          <div style={{fontSize: '14px', fontWeight: '500', color: '#1e293b', lineHeight: '1.4'}}>
                            <span style={{color: '#64748b'}}>{getFranchiseName(trans.franchise)}:</span>
                            
                            {trans.type === 'TRADE' && (
                              <div style={{marginTop: '8px'}}>
                                <div><strong>Trade with {getFranchiseName(trans.franchise2)}:</strong></div>
                                <div style={{marginLeft: '16px', marginTop: '4px'}}>
                                  <div>{getFranchiseName(trans.franchise)} gave up: {
                                    trans.franchise1_gave_up ? 
                                      trans.franchise1_gave_up.split(',').filter((id: string) => id.trim()).map((playerId: string) => getPlayerName(playerId.trim())).join(', ')
                                      : 'None'
                                  }</div>
                                  <div>{getFranchiseName(trans.franchise2)} gave up: {
                                    trans.franchise2_gave_up ? 
                                      trans.franchise2_gave_up.split(',').filter((id: string) => id.trim()).map((playerId: string) => getPlayerName(playerId.trim())).join(', ')
                                      : 'None'
                                  }</div>
                                </div>
                              </div>
                            )}
                            
                            {trans.type === 'TAXI' && (
                              <div style={{marginTop: '4px'}}>
                                {trans.promoted && trans.promoted !== '' && (
                                  <span>Promoted <strong>{getPlayerName(trans.promoted.replace(',', ''))}</strong> from taxi squad</span>
                                )}
                                {trans.demoted && trans.demoted !== '' && (
                                  <span>Moved <strong>{getPlayerName(trans.demoted.replace(',', ''))}</strong> to taxi squad</span>
                                )}
                              </div>
                            )}

                            {trans.type === 'IR' && (
                              <div style={{marginTop: '4px'}}>
                                {trans.activated && (
                                  <span>Activated <strong>{getPlayerName(trans.activated.replace(',', ''))}</strong> from IR</span>
                                )}
                                {trans.deactivated && (
                                  <span>Moved <strong>{getPlayerName(trans.deactivated.replace(',', ''))}</strong> to IR</span>
                                )}
                              </div>
                            )}

                            {(trans.type === 'BBID_WAIVER' || trans.type === 'WAIVER' || trans.type === 'FREE_AGENT') && trans.transaction && (
                              <div style={{marginTop: '4px'}}>
                                {(() => {
                                  if (trans.type === 'FREE_AGENT') {
                                    const playerAdded = trans.transaction.replace(/[|,]/g, '');
                                    return <span>Signed <strong>{getPlayerName(playerAdded)}</strong></span>;
                                  } else {
                                    const parts = trans.transaction.split('|');
                                    if (parts.length >= 2) {
                                      const playerAdded = parts[0].replace(',', '');
                                      const bidAmount = parts[1];
                                      const playerDropped = parts[2] ? parts[2].replace(',', '') : null;
                                      
                                      return (
                                        <span>
                                          {trans.type === 'BBID_WAIVER' ? 'Won' : 'Claimed'} <strong>{getPlayerName(playerAdded)}</strong>
                                          {trans.type === 'BBID_WAIVER' && bidAmount && <span> for ${bidAmount}</span>}
                                          {playerDropped && <span>, dropped <strong>{getPlayerName(playerDropped)}</strong></span>}
                                        </span>
                                      );
                                    } else {
                                      return <span>{trans.transaction}</span>;
                                    }
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '64px 0'}}>
            <div style={{marginBottom: '16px', fontSize: '48px'}}>📝</div>
            <h3 style={{fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px'}}>
              No Recent Transactions
            </h3>
            <p style={{color: '#64748b', maxWidth: '400px', margin: '0 auto'}}>
              There haven't been any transactions in this league recently.
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