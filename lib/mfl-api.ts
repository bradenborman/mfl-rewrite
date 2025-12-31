/**
 * MyFantasyLeague.com API Client
 * Handles all communication with the MFL API following their specifications
 */

import { APIError, AuthResult, League, Player, Roster, RosterPlayer, LiveScore, FranchiseInfo, StandingsTeam, MFLLeagueResponse, MFLRosterResponse, MFLStandingsResponse } from './types'

export interface MFLApiConfig {
  userAgent: string
  currentYear: number
  apiHost: string
  protocol: 'http' | 'https'
}

export interface MFLRequestOptions {
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string
  timeout?: number
}

export class MFLApiClient {
  private config: MFLApiConfig
  private cookie?: string

  constructor(config?: Partial<MFLApiConfig>) {
    this.config = {
      userAgent: 'MFLREWRITE',
      currentYear: 2025,
      apiHost: 'api.myfantasyleague.com',
      protocol: 'https',
      ...config
    }
  }

  /**
   * Constructs MFL API URL following the format: protocol://host/year/command?args
   */
  private buildUrl(
    command: string, 
    args: Record<string, string | number> = {},
    host?: string
  ): string {
    const baseHost = host || this.config.apiHost
    const baseUrl = `${this.config.protocol}://${baseHost}/${this.config.currentYear}/${command}`
    
    const queryParams = new URLSearchParams()
    Object.entries(args).forEach(([key, value]) => {
      queryParams.append(key, String(value))
    })
    
    const queryString = queryParams.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  /**
   * Makes HTTP request to MFL API via Next.js API proxy to avoid CORS issues
   */
  private async makeRequest(
    url: string, 
    options: MFLRequestOptions = {}
  ): Promise<any> {
    try {
      // Parse the MFL URL to extract components for the proxy
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/')
      const year = pathParts[1]
      const command = pathParts[2]
      
      // Build proxy URL
      const proxyUrl = new URL('/api/mfl', window.location.origin)
      proxyUrl.searchParams.set('host', urlObj.hostname)
      proxyUrl.searchParams.set('year', year)
      proxyUrl.searchParams.set('command', command)
      
      // Add cookie if available
      if (this.cookie) {
        proxyUrl.searchParams.set('cookie', this.cookie)
      }
      
      // Add query parameters from original URL
      urlObj.searchParams.forEach((value, key) => {
        proxyUrl.searchParams.set(key, value)
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000)

      const response = await fetch(proxyUrl.toString(), {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 429) {
          throw new MFLAPIError('RATE_LIMITED', 'API rate limit exceeded')
        }
        throw new MFLAPIError('SERVER_ERROR', `HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json()
      } else {
        return await response.text()
      }

    } catch (error) {
      if (error instanceof MFLAPIError) {
        throw error
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new MFLAPIError('NETWORK_ERROR', 'Request timeout')
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new MFLAPIError('NETWORK_ERROR', `Network error: ${errorMessage}`)
    }
  }

  /**
   * Authenticates user with MFL and stores cookie
   * Uses HTTPS and api.myfantasyleague.com for security
   */
  async login(username: string, password: string): Promise<AuthResult> {
    // Use api.myfantasyleague.com for login requests as per MFL documentation
    const url = this.buildUrl('login', {
      USERNAME: username,
      PASSWORD: password,
      XML: 1
    }, 'api.myfantasyleague.com')

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        body: `USERNAME=${encodeURIComponent(username)}&PASSWORD=${encodeURIComponent(password)}&XML=1`
      })

      // Parse XML response from MFL
      if (typeof response === 'string') {
        // Check for successful login: <status cookie_name="cookie_value"...>OK</status>
        const successMatch = response.match(/<status[^>]*MFL_USER_ID="([^"]*)"[^>]*>OK<\/status>/)
        if (successMatch) {
          const cookieValue = successMatch[1]
          // Store the cookie value (may need URL encoding for special characters)
          this.cookie = cookieValue
          return { success: true, cookie: cookieValue }
        }

        // Check for error response: <error>error message</error>
        const errorMatch = response.match(/<error[^>]*>([^<]*)<\/error>/)
        if (errorMatch) {
          return { success: false, error: errorMatch[1] }
        }

        // Check for alternative error format
        const statusErrorMatch = response.match(/<status[^>]*>([^<]*)<\/status>/)
        if (statusErrorMatch && statusErrorMatch[1] !== 'OK') {
          return { success: false, error: statusErrorMatch[1] }
        }
      }

      return { success: false, error: 'Invalid response from server' }
    } catch (error) {
      if (error instanceof MFLAPIError) {
        return { success: false, error: error.message }
      }
      return { success: false, error: 'Login failed: Network error' }
    }
  }

  /**
   * Fetches all players from MFL database
   */
  async getPlayers(options: { 
    details?: boolean
    since?: number
    players?: string[]
  } = {}): Promise<Player[]> {
    const args: Record<string, string | number> = {
      TYPE: 'players',
      JSON: 1
    }

    if (options.details) args.DETAILS = 1
    if (options.since) args.SINCE = options.since
    if (options.players?.length) args.PLAYERS = options.players.join(',')

    const url = this.buildUrl('export', args)
    const response = await this.makeRequest(url)
    
    // Transform MFL response to our Player interface
    if (response.players?.player) {
      return Array.isArray(response.players.player) 
        ? response.players.player.map(this.transformPlayer)
        : [this.transformPlayer(response.players.player)]
    }
    
    return []
  }

  /**
   * Fetches user's leagues
   * Supports multi-host leagues and franchise information
   */
  async getLeagues(year?: number, includeFranchiseNames = false): Promise<League[]> {
    const args: Record<string, string | number> = {
      TYPE: 'myleagues',
      JSON: 1
    }

    if (year) args.YEAR = year
    if (includeFranchiseNames) args.FRANCHISE_NAMES = 1

    const url = this.buildUrl('export', args)
    const response = await this.makeRequest(url)
    
    // Transform MFL response to our League interface
    if (response.leagues?.league) {
      return Array.isArray(response.leagues.league)
        ? response.leagues.league.map(this.transformLeague)
        : [this.transformLeague(response.leagues.league)]
    }
    
    return []
  }

  /**
   * Fetches detailed league information
   */
  async getLeagueInfo(leagueId: string, host?: string): Promise<any> {
    const args: Record<string, string | number> = {
      TYPE: 'league',
      L: leagueId,
      JSON: 1
    }

    const url = this.buildUrl('export', args, host)
    const response = await this.makeRequest(url)
    return response.league || null
  }

  /**
   * Fetches league standings
   */
  async getStandings(leagueId: string, week?: number, host?: string): Promise<any[]> {
    const args: Record<string, string | number> = {
      TYPE: 'standings',
      L: leagueId,
      JSON: 1
    }

    if (week) args.W = week

    const url = this.buildUrl('export', args, host)
    const response = await this.makeRequest(url)
    return response.standings?.franchise || []
  }

  /**
   * Fetches league rosters
   */
  async getRosters(leagueId: string, week?: number, host?: string): Promise<Roster[]> {
    const args: Record<string, string | number> = {
      TYPE: 'rosters',
      L: leagueId,
      JSON: 1
    }

    if (week) args.W = week

    const url = this.buildUrl('export', args, host)
    const response = await this.makeRequest(url)
    
    // Transform MFL response to our Roster interface
    if (response.rosters?.franchise) {
      return Array.isArray(response.rosters.franchise)
        ? response.rosters.franchise.map(this.transformRoster)
        : [this.transformRoster(response.rosters.franchise)]
    }
    
    return []
  }

  /**
   * Fetches free agents for a league
   */
  async getFreeAgents(leagueId: string, position?: string, host?: string): Promise<Player[]> {
    const args: Record<string, string | number> = {
      TYPE: 'freeAgents',
      L: leagueId,
      JSON: 1
    }

    if (position) args.POSITION = position

    const url = this.buildUrl('export', args, host)
    const response = await this.makeRequest(url)
    
    // Transform MFL response to our Player interface
    if (response.freeAgents?.leagueUnit?.player) {
      const players = response.freeAgents.leagueUnit.player
      return Array.isArray(players) 
        ? players.map(this.transformPlayer)
        : [this.transformPlayer(players)]
    }
    
    return []
  }

  /**
   * Fetches NFL schedule
   */
  async getNFLSchedule(week?: number | 'ALL'): Promise<any[]> {
    const args: Record<string, string | number> = {
      TYPE: 'nflSchedule',
      JSON: 1
    }

    if (week) args.W = week

    const url = this.buildUrl('export', args)
    const response = await this.makeRequest(url)
    
    return response.nflSchedule?.matchup || []
  }

  /**
   * Fetches scoring rules
   */
  async getScoringRules(): Promise<any[]> {
    const url = this.buildUrl('export', {
      TYPE: 'allRules',
      JSON: 1
    })
    
    const response = await this.makeRequest(url)
    return response.allRules?.rule || []
  }

  /**
   * Fetches franchise information from league data
   * Returns array of all franchises in the league with names and owner info
   */
  async fetchFranchiseInfo(leagueId: string, host: string, cookie: string): Promise<FranchiseInfo[]> {
    // Temporarily set cookie for this request
    const originalCookie = this.cookie
    this.cookie = cookie

    try {
      const args: Record<string, string | number> = {
        TYPE: 'league',
        L: leagueId,
        JSON: 1
      }

      const url = this.buildUrl('export', args, host)
      const response = await this.makeRequest(url)
      
      return this.processFranchiseData(response)
    } finally {
      // Restore original cookie
      this.cookie = originalCookie
    }
  }

  /**
   * Fetches roster data for a specific franchise
   * Returns array of players owned by the franchise
   */
  async fetchRoster(leagueId: string, franchiseId: string, host: string, cookie: string): Promise<RosterPlayer[]> {
    // Temporarily set cookie for this request
    const originalCookie = this.cookie
    this.cookie = cookie

    try {
      const args: Record<string, string | number> = {
        TYPE: 'rosters',
        L: leagueId,
        FRANCHISE: franchiseId,
        JSON: 1
      }

      const url = this.buildUrl('export', args, host)
      const response = await this.makeRequest(url)
      
      return this.processRosterData(response, franchiseId)
    } finally {
      // Restore original cookie
      this.cookie = originalCookie
    }
  }

  /**
   * Fetches league standings data
   * Returns array of all teams with their records and stats
   */
  async fetchStandings(leagueId: string, host: string, cookie: string): Promise<StandingsTeam[]> {
    // Temporarily set cookie for this request
    const originalCookie = this.cookie
    this.cookie = cookie

    try {
      const args: Record<string, string | number> = {
        TYPE: 'leagueStandings',
        L: leagueId,
        JSON: 1
      }

      const url = this.buildUrl('export', args, host)
      const response = await this.makeRequest(url)
      
      return this.processStandingsData(response)
    } finally {
      // Restore original cookie
      this.cookie = originalCookie
    }
  }

  /**
   * Transforms MFL player data to our Player interface
   */
  private transformPlayer(mflPlayer: any): Player {
    return {
      id: mflPlayer.id,
      name: mflPlayer.name,
      position: mflPlayer.position,
      team: mflPlayer.team || 'FA',
      status: 'active', // Default status
      height: mflPlayer.height,
      weight: mflPlayer.weight,
      age: mflPlayer.age ? parseInt(mflPlayer.age) : undefined,
      experience: mflPlayer.experience ? parseInt(mflPlayer.experience) : undefined,
      jersey: mflPlayer.jersey
    }
  }

  /**
   * Transforms MFL league data to our League interface
   * Handles multi-host leagues by extracting host from URL
   */
  private transformLeague(mflLeague: any): League {
    // Extract host from URL if available
    let host = this.config.apiHost
    if (mflLeague.url) {
      const urlMatch = mflLeague.url.match(/https?:\/\/([^\/]+)/)
      if (urlMatch) {
        host = urlMatch[1]
      }
    }

    return {
      id: mflLeague.league_id,
      name: mflLeague.name,
      year: parseInt(mflLeague.year) || this.config.currentYear,
      host,
      franchiseId: mflLeague.franchise_id
    }
  }

  /**
   * Transforms MFL roster data to our Roster interface
   */
  private transformRoster(mflRoster: any): Roster {
    const players: RosterPlayer[] = []
    
    // MFL roster format can have players in different sections
    if (mflRoster.player) {
      const rosterPlayers = Array.isArray(mflRoster.player) ? mflRoster.player : [mflRoster.player]
      
      rosterPlayers.forEach((player: any) => {
        players.push({
          ...this.transformPlayer(player),
          rosterStatus: this.determinePlayerStatus(player.status),
          salary: player.salary ? parseFloat(player.salary) : undefined
        })
      })
    }

    return {
      franchiseId: mflRoster.id,
      franchiseName: mflRoster.name || `Team ${mflRoster.id}`,
      players
    }
  }

  /**
   * Determines player roster status from MFL data
   */
  private determinePlayerStatus(mflStatus?: string): 'starter' | 'bench' | 'ir' | 'taxi' {
    if (!mflStatus) return 'bench'
    
    const status = mflStatus.toLowerCase()
    if (status.includes('starter') || status.includes('active')) return 'starter'
    if (status.includes('ir') || status.includes('injured')) return 'ir'
    if (status.includes('taxi')) return 'taxi'
    return 'bench'
  }

  /**
   * Processes franchise data from MFL league API response
   */
  private processFranchiseData(response: any): FranchiseInfo[] {
    try {
      if (!response?.league?.franchises?.franchise) {
        console.warn('No franchise data found in league response')
        return []
      }

      const franchises = Array.isArray(response.league.franchises.franchise) 
        ? response.league.franchises.franchise 
        : [response.league.franchises.franchise]

      return franchises.map((franchise: any) => ({
        id: franchise.id,
        name: franchise.name || `Team ${franchise.id}`,
        ownerName: franchise.owner_name,
        logoUrl: franchise.logo
      }))
    } catch (error) {
      console.error('Error processing franchise data:', error)
      return []
    }
  }

  /**
   * Processes roster data from MFL rosters API response
   * Cross-references with cached player data for complete player information
   */
  private async processRosterData(response: any, franchiseId: string): Promise<RosterPlayer[]> {
    try {
      if (!response?.rosters?.franchise) {
        console.warn('No roster data found in response')
        return []
      }

      const franchises = Array.isArray(response.rosters.franchise) 
        ? response.rosters.franchise 
        : [response.rosters.franchise]

      const franchise = franchises.find(f => f.id === franchiseId)
      if (!franchise) {
        console.warn(`Franchise ${franchiseId} not found in roster data`)
        return []
      }

      if (!franchise.player) {
        console.warn(`No players found for franchise ${franchiseId}`)
        return []
      }

      const players = Array.isArray(franchise.player) ? franchise.player : [franchise.player]

      // Load cached player database for cross-reference
      let playerDatabase: Player[] = []
      try {
        const response = await fetch('/data/players.json')
        const data = await response.json()
        if (data.data && Array.isArray(data.data)) {
          playerDatabase = data.data
        }
      } catch (error) {
        console.warn('Could not load player database for roster processing:', error)
      }

      return players.map((player: any) => {
        const playerInfo = playerDatabase.find(p => p.id === player.id)
        return {
          id: player.id,
          name: playerInfo?.name || 'Unknown Player',
          position: playerInfo?.position || 'UNK',
          team: playerInfo?.team || 'FA',
          status: this.mapPlayerStatus(player.status),
          rosterStatus: player.status === 'TAXI_SQUAD' ? 'taxi' : this.determinePlayerStatus(player.status),
          salary: player.salary ? parseFloat(player.salary) : undefined,
          contractYears: player.contractYear && player.contractYear !== '' ? parseInt(player.contractYear) : undefined,
          contractStatus: player.contractStatus && player.contractStatus !== '' ? player.contractStatus : undefined
        }
      })
    } catch (error) {
      console.error('Error processing roster data:', error)
      return []
    }
  }

  /**
   * Processes standings data from MFL leagueStandings API response
   */
  private processStandingsData(response: any): StandingsTeam[] {
    try {
      if (!response?.leagueStandings?.franchise) {
        console.warn('No standings data found in response')
        return []
      }

      const franchises = Array.isArray(response.leagueStandings.franchise) 
        ? response.leagueStandings.franchise 
        : [response.leagueStandings.franchise]

      // Process and sort standings
      const standings = franchises.map((team: any) => ({
        franchiseId: team.id,
        franchiseName: `Team ${team.id}`, // Will be updated with real names later
        wins: parseInt(team.h2hw || '0'),
        losses: parseInt(team.h2hl || '0'),
        pointsFor: parseFloat(team.pf || '0'),
        pointsAgainst: parseFloat(team.pa || '0'),
        rank: 0, // Will be calculated after sorting
        isCurrentUser: false // Will be set by caller
      }))

      // Sort by wins desc, then by points for desc
      standings.sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins
        return b.pointsFor - a.pointsFor
      })

      // Assign ranks
      standings.forEach((team, index) => {
        team.rank = index + 1
      })

      return standings
    } catch (error) {
      console.error('Error processing standings data:', error)
      return []
    }
  }

  /**
   * Maps MFL player status to our status enum
   */
  private mapPlayerStatus(mflStatus?: string): 'active' | 'injured' | 'bye' {
    if (!mflStatus) return 'active'
    
    const status = mflStatus.toLowerCase()
    if (status.includes('injured') || status.includes('ir') || status.includes('out')) {
      return 'injured'
    }
    if (status.includes('bye')) {
      return 'bye'
    }
    return 'active'
  }

  /**
   * Sets authentication cookie manually
   * Handles URL encoding of special characters in Base64 cookies
   */
  setCookie(cookie: string): void {
    this.cookie = cookie
  }

  /**
   * Clears authentication cookie
   */
  clearCookie(): void {
    this.cookie = undefined
  }

  /**
   * URL encodes cookie value for HTTP headers
   * MFL cookies are Base64 and may contain +, /, = characters
   */
  private encodeCookieValue(cookieValue: string): string {
    return encodeURIComponent(cookieValue)
  }

  /**
   * Gets current configuration
   */
  getConfig(): MFLApiConfig {
    return { ...this.config }
  }
}

/**
 * Custom error class for API errors
 */
class MFLAPIError extends Error {
  constructor(
    public code: APIError['code'],
    message: string,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'MFLAPIError'
  }
}

// Export singleton instance
export const mflApi = new MFLApiClient()