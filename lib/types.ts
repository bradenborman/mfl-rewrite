// Core data types for the MFL UI application

export interface Player {
  id: string
  name: string
  position: string
  team: string
  status?: 'active' | 'injured' | 'bye'
  // Additional MFL player fields
  height?: string
  weight?: string
  age?: number
  experience?: number
  jersey?: string
  // Contract and salary information
  salary?: number
  contractYears?: number
  contractStatus?: string
}

export interface League {
  id: string
  name: string
  year: number
  host: string
  franchiseId?: string
  franchiseName?: string
}

export interface Roster {
  franchiseId: string
  franchiseName: string
  players: RosterPlayer[]
}

export interface RosterPlayer extends Player {
  rosterStatus: 'starter' | 'bench' | 'ir' | 'taxi'
  salary?: number
}

export interface LiveScore {
  playerId: string
  points: number
  gameStatus: 'not_started' | 'in_progress' | 'final'
  projectedPoints?: number
}

export interface User {
  username: string
  cookie: string
  leagues: League[]
}

export interface NFLTeam {
  id: string
  name: string
  abbreviation: string
  conference: string
  division: string
}

export interface NFLGame {
  id: string
  week: number
  homeTeam: string
  awayTeam: string
  kickoff: number // Unix timestamp
  homeScore?: number
  awayScore?: number
  gameStatus: 'not_started' | 'in_progress' | 'final'
}

export interface APIError {
  code: 'AUTHENTICATION_FAILED' | 'RATE_LIMITED' | 'SERVER_ERROR' | 'NETWORK_ERROR'
  message: string
  retryAfter?: number
}

export interface AuthResult {
  success: boolean
  cookie?: string
  error?: string
}

// Cache-specific types
export interface CacheMetadata {
  lastUpdated: number // Unix timestamp
  version: string
  source: string
}

export interface CachedData<T> {
  metadata: CacheMetadata
  data: T[]
}

export interface ScoringRule {
  id: string
  abbreviation: string
  description: string
  points: number
  isPlayerRule: boolean
  isTeamRule: boolean
  isCoachRule: boolean
}

export interface InjuryReport {
  playerId: string
  status: 'IR' | 'Out' | 'Doubtful' | 'Questionable' | 'Inactive'
  details: string
  lastUpdated: number
}

// New interfaces for real team data integration
export interface FranchiseInfo {
  id: string
  name: string
  ownerName?: string
  logoUrl?: string
}

export interface StandingsTeam {
  franchiseId: string
  franchiseName: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  rank: number
  isCurrentUser: boolean
}

export interface TeamStats {
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  rank: number
  isProjected?: boolean // true if calculated from standings
}

// Enhanced LeagueInfo interface for dashboard
export interface LeagueInfo {
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

// MFL API Response interfaces
export interface MFLLeagueResponse {
  league: {
    name?: string
    year?: string
    currentWeek?: string
    franchises?: {
      franchise: Array<{
        id: string
        name?: string
        owner_name?: string
        logo?: string
      }>
    }
  }
}

export interface MFLRosterResponse {
  rosters: {
    franchise: Array<{
      id: string
      player: Array<{
        id: string
        status?: string
        salary?: string
        contractYear?: string
        contractStatus?: string
      }>
    }>
  }
}

export interface MFLStandingsResponse {
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