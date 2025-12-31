# Design Document

## Overview

This design implements real team data integration for the fantasy football dashboard by replacing mock data with authentic information from the MyFantasyLeague.com (MFL) API. The solution focuses on fetching franchise details, roster information, and league standings while maintaining performance through intelligent caching and robust error handling.

## Architecture

### High-Level Flow
```
User Authentication → League Dashboard → Parallel API Calls → Data Processing → UI Update
                                     ↓
                              Cache Check → Fresh Data or Cached Data
```

### API Integration Points
1. **MFL League API** (`TYPE=league`) - Franchise information and league metadata
2. **MFL Rosters API** (`TYPE=rosters`) - Player roster for user's franchise  
3. **MFL Standings API** (`TYPE=leagueStandings`) - League standings and team records

### Caching Strategy
- **Franchise Data**: 30-minute cache (relatively static)
- **Roster Data**: 15-minute cache (moderate changes)
- **Standings Data**: 10-minute cache (frequent updates)

## Components and Interfaces

### Enhanced Dashboard Component
```typescript
interface LeagueInfo {
  id: string
  name: string
  year: number
  host: string
  franchiseId: string
  franchiseName?: string
  ownerName?: string
  totalFranchises?: number
  currentWeek?: number
  status?: string
}

interface TeamStats {
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  rank: number
  isProjected?: boolean // true if calculated from standings
}

interface RosterPlayer {
  id: string
  name: string
  position: string
  team: string
  status: 'active' | 'injured' | 'inactive' | 'bye'
  isStarter?: boolean
}

interface StandingsTeam {
  franchiseId: string
  franchiseName: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  rank: number
  isCurrentUser: boolean
}
```

### MFL API Service Enhancement
```typescript
interface MFLApiService {
  // Existing methods...
  
  fetchFranchiseInfo(leagueId: string, host: string, cookie: string): Promise<FranchiseInfo[]>
  fetchRoster(leagueId: string, franchiseId: string, host: string, cookie: string): Promise<RosterPlayer[]>
  fetchStandings(leagueId: string, host: string, cookie: string): Promise<StandingsTeam[]>
}

interface FranchiseInfo {
  id: string
  name: string
  ownerName?: string
  logoUrl?: string
}
```

### Cache Manager Enhancement
```typescript
interface CacheManager {
  // Existing methods...
  
  getFranchiseData(leagueId: string, host: string): CachedData<FranchiseInfo[]> | null
  setFranchiseData(leagueId: string, host: string, data: FranchiseInfo[], ttl: number): void
  
  getRosterData(leagueId: string, franchiseId: string, host: string): CachedData<RosterPlayer[]> | null
  setRosterData(leagueId: string, franchiseId: string, host: string, data: RosterPlayer[], ttl: number): void
  
  getStandingsData(leagueId: string, host: string): CachedData<StandingsTeam[]> | null
  setStandingsData(leagueId: string, host: string, data: StandingsTeam[], ttl: number): void
}
```

## Data Models

### API Response Processing

#### Franchise Data Processing
```typescript
// MFL API Response: TYPE=league includes franchise information
interface MFLLeagueResponse {
  league: {
    franchises: {
      franchise: Array<{
        id: string
        name?: string
        owner_name?: string
        logo?: string
      }>
    }
  }
}

// Transform to internal format
function processFranchiseData(response: MFLLeagueResponse): FranchiseInfo[] {
  return response.league.franchises.franchise.map(f => ({
    id: f.id,
    name: f.name || `Team ${f.id}`,
    ownerName: f.owner_name,
    logoUrl: f.logo
  }))
}
```

#### Roster Data Processing
```typescript
// MFL API Response: TYPE=rosters
interface MFLRosterResponse {
  rosters: {
    franchise: Array<{
      id: string
      player: Array<{
        id: string
        status?: string
        salary?: string
        contract?: string
      }>
    }>
  }
}

// Cross-reference with cached player data
function processRosterData(
  response: MFLRosterResponse, 
  franchiseId: string,
  playerDatabase: Player[]
): RosterPlayer[] {
  const franchise = response.rosters.franchise.find(f => f.id === franchiseId)
  if (!franchise) return []
  
  return franchise.player.map(p => {
    const playerInfo = playerDatabase.find(player => player.id === p.id)
    return {
      id: p.id,
      name: playerInfo?.name || 'Unknown Player',
      position: playerInfo?.position || 'UNK',
      team: playerInfo?.team || 'FA',
      status: mapPlayerStatus(p.status),
      isStarter: false // Will be determined by lineup logic
    }
  })
}
```

#### Standings Data Processing
```typescript
// MFL API Response: TYPE=leagueStandings
interface MFLStandingsResponse {
  leagueStandings: {
    franchise: Array<{
      id: string
      h2hw?: string // head-to-head wins
      h2hl?: string // head-to-head losses  
      pf?: string   // points for
      pa?: string   // points against
    }>
  }
}

function processStandingsData(
  response: MFLStandingsResponse,
  franchiseData: FranchiseInfo[],
  currentUserId: string
): StandingsTeam[] {
  return response.leagueStandings.franchise
    .map((team, index) => {
      const franchise = franchiseData.find(f => f.id === team.id)
      return {
        franchiseId: team.id,
        franchiseName: franchise?.name || `Team ${team.id}`,
        wins: parseInt(team.h2hw || '0'),
        losses: parseInt(team.h2hl || '0'),
        pointsFor: parseFloat(team.pf || '0'),
        pointsAgainst: parseFloat(team.pa || '0'),
        rank: index + 1,
        isCurrentUser: team.id === currentUserId
      }
    })
    .sort((a, b) => {
      // Sort by wins desc, then by points for desc
      if (a.wins !== b.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
    .map((team, index) => ({ ...team, rank: index + 1 }))
}
```

## Data Flow Implementation

### Dashboard Loading Sequence
```typescript
async function loadDashboardData(leagueId: string, host: string, user: User) {
  setIsLoading(true)
  
  try {
    // Start all API calls in parallel for better performance
    const [franchiseData, rosterData, standingsData] = await Promise.allSettled([
      fetchFranchiseDataWithCache(leagueId, host, user.cookie),
      fetchRosterDataWithCache(leagueId, user.franchiseId, host, user.cookie),
      fetchStandingsDataWithCache(leagueId, host, user.cookie)
    ])
    
    // Process successful results
    if (franchiseData.status === 'fulfilled') {
      updateFranchiseInfo(franchiseData.value, user.franchiseId)
    }
    
    if (rosterData.status === 'fulfilled') {
      updateRosterDisplay(rosterData.value)
    }
    
    if (standingsData.status === 'fulfilled') {
      updateStandingsAndStats(standingsData.value, user.franchiseId)
    }
    
    // Handle any failures gracefully
    handleFailedRequests([franchiseData, rosterData, standingsData])
    
  } catch (error) {
    setError('Failed to load dashboard data')
  } finally {
    setIsLoading(false)
  }
}
```

### Cache-First Data Fetching
```typescript
async function fetchFranchiseDataWithCache(
  leagueId: string, 
  host: string, 
  cookie: string
): Promise<FranchiseInfo[]> {
  // Check cache first
  const cached = cacheManager.getFranchiseData(leagueId, host)
  if (cached && !cached.isExpired()) {
    console.log('Using cached franchise data')
    return cached.data
  }
  
  // Fetch fresh data
  console.log('Fetching fresh franchise data from MFL API')
  const response = await mflApi.fetchLeagueInfo(leagueId, host, cookie)
  const franchiseData = processFranchiseData(response)
  
  // Cache for 30 minutes
  cacheManager.setFranchiseData(leagueId, host, franchiseData, 30 * 60 * 1000)
  
  return franchiseData
}
```

## Error Handling

### Graceful Degradation Strategy
1. **Franchise Data Failure**: Fall back to "Team [FranchiseId]"
2. **Roster Data Failure**: Show "Unable to load roster" with retry button
3. **Standings Data Failure**: Show mock standings with warning indicator
4. **Partial Failures**: Display available data, mark missing sections

### Error Recovery
```typescript
function handleApiError(error: Error, dataType: 'franchise' | 'roster' | 'standings') {
  console.error(`Failed to fetch ${dataType} data:`, error)
  
  switch (dataType) {
    case 'franchise':
      return { name: `Team ${franchiseId}`, ownerName: user.username }
    case 'roster':
      return { error: 'Unable to load roster', canRetry: true }
    case 'standings':
      return { error: 'Using sample standings', showWarning: true }
  }
}
```

## Testing Strategy

### Unit Tests
- API response parsing functions
- Cache management logic
- Error handling scenarios
- Data transformation utilities

### Integration Tests  
- End-to-end dashboard loading with real API calls
- Cache expiration and refresh cycles
- Error recovery workflows
- Performance under various network conditions

### Property-Based Tests
- API response validation across different league configurations
- Cache consistency under concurrent access
- Data integrity during partial failures

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API Call Triggering
*For any* dashboard load with valid authentication, the system should make the appropriate MFL API calls (franchise, roster, standings) when the user accesses their league dashboard
**Validates: Requirements 1.1, 2.1, 3.1**

### Property 2: Real Data Display
*For any* successful API response containing team data, the system should display the actual team information instead of mock data in all relevant UI sections
**Validates: Requirements 1.2, 2.2, 3.2, 4.4**

### Property 3: Conditional Information Display
*For any* API response, when optional data fields (owner name, player status, points data) are present, the system should display them in the appropriate UI locations
**Validates: Requirements 1.3, 2.4, 3.4, 4.2**

### Property 4: Fallback Behavior
*For any* API failure or missing data, the system should display appropriate fallback content (Team [ID], error messages, mock data with warnings) without crashing
**Validates: Requirements 1.4, 2.5, 5.2, 5.3, 5.4**

### Property 5: Cache Duration Compliance
*For any* data type (franchise, roster, standings), the system should respect the specified cache duration (30min, 15min, 10min respectively) and not make unnecessary API calls within those windows
**Validates: Requirements 1.5, 2.6, 3.6, 6.1**

### Property 6: Cache Hit Optimization
*For any* request for cached data that is still valid, the system should return cached data without making API calls, and for expired cache, should fetch fresh data and update the cache
**Validates: Requirements 6.2, 6.3**

### Property 7: User Team Highlighting
*For any* standings display containing the current user's team, the system should visually highlight the user's team and propagate their record to the team header
**Validates: Requirements 3.3, 3.5**

### Property 8: Statistics Extraction
*For any* standings data containing the user's team, the system should correctly extract and display wins, losses, points for/against, and calculate the correct rank
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 9: Error Logging and Recovery
*For any* API failure, the system should log the error, continue operation with available data, and provide clear error messages to users
**Validates: Requirements 5.1, 5.5, 5.6**

### Property 10: Parallel API Performance
*For any* dashboard load, the system should make API calls in parallel when possible and show appropriate loading indicators during the requests
**Validates: Requirements 6.4, 6.5**

### Property 11: Response Validation
*For any* MFL API response, the system should validate the response structure before processing and handle malformed data gracefully with appropriate fallbacks
**Validates: Requirements 7.1, 7.2**

### Property 12: Data Filtering and Conversion
*For any* API response containing invalid or unexpected data (invalid player IDs, wrong data types), the system should filter invalid entries and convert data types appropriately
**Validates: Requirements 7.3, 7.6**

### Property 13: Partial Data Handling
*For any* incomplete API response, the system should display available data and appropriately mark or default missing fields without failing
**Validates: Requirements 4.5, 7.4**

### Property 14: Format Consistency
*For any* MFL API response format (XML or JSON), the system should process the data consistently and produce the same internal data structures
**Validates: Requirements 7.5**

### Property 15: Cache Monitoring
*For any* data request, the system should log whether the request was served from cache or required an API call for monitoring and performance analysis
**Validates: Requirements 6.6**