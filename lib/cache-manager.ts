/**
 * Cache Manager for MFL Express
 * Handles reading cached data with validation and integrity checking
 */

import { readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { Player, NFLTeam, NFLGame, ScoringRule, CachedData, CacheMetadata } from './types'

export interface CacheManagerConfig {
  dataDirectory: string
  maxAge: number // Maximum age in seconds before cache is considered stale
}

export class CacheManager {
  private config: CacheManagerConfig
  private cache: Map<string, any> = new Map()

  constructor(config?: Partial<CacheManagerConfig>) {
    this.config = {
      dataDirectory: join(process.cwd(), 'data'),
      maxAge: 24 * 60 * 60, // 24 hours default
      ...config
    }
  }

  /**
   * Gets players from cache with validation
   */
  async getPlayers(): Promise<Player[]> {
    return this.getCachedData<Player>('players.json', this.validatePlayer)
  }

  /**
   * Gets NFL teams from cache with validation
   */
  async getNFLTeams(): Promise<NFLTeam[]> {
    return this.getCachedData<NFLTeam>('nfl-teams.json', this.validateNFLTeam)
  }

  /**
   * Gets NFL schedule from cache with validation
   */
  async getNFLSchedule(): Promise<NFLGame[]> {
    return this.getCachedData<NFLGame>('nfl-schedule.json', this.validateNFLGame)
  }

  /**
   * Gets scoring rules from cache with validation
   */
  async getScoringRules(): Promise<ScoringRule[]> {
    return this.getCachedData<ScoringRule>('scoring-rules.json', this.validateScoringRule)
  }

  /**
   * Gets a player by ID
   */
  async getPlayerById(id: string): Promise<Player | null> {
    const players = await this.getPlayers()
    return players.find(player => player.id === id) || null
  }

  /**
   * Gets players by position
   */
  async getPlayersByPosition(position: string): Promise<Player[]> {
    const players = await this.getPlayers()
    return players.filter(player => player.position === position)
  }

  /**
   * Gets NFL team by abbreviation
   */
  async getNFLTeamByAbbreviation(abbreviation: string): Promise<NFLTeam | null> {
    const teams = await this.getNFLTeams()
    return teams.find(team => team.abbreviation === abbreviation) || null
  }

  /**
   * Checks if cache is stale based on last updated timestamp
   */
  isCacheStale(fileName: string): boolean {
    try {
      const filePath = join(this.config.dataDirectory, fileName)
      
      if (!existsSync(filePath)) {
        return true
      }

      const cachedData = this.readCacheFile(filePath)
      if (!cachedData.metadata?.lastUpdated) {
        return true
      }

      const now = Math.floor(Date.now() / 1000)
      const age = now - cachedData.metadata.lastUpdated
      
      return age > this.config.maxAge
    } catch (error) {
      console.warn(`Error checking cache staleness for ${fileName}:`, error instanceof Error ? error.message : String(error))
      return true
    }
  }

  /**
   * Validates cache integrity for all cache files
   */
  async validateCacheIntegrity(): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const requiredFiles = ['players.json', 'nfl-teams.json', 'nfl-schedule.json']

    for (const fileName of requiredFiles) {
      try {
        const filePath = join(this.config.dataDirectory, fileName)
        
        if (!existsSync(filePath)) {
          errors.push(`Missing required cache file: ${fileName}`)
          continue
        }

        const cachedData = this.readCacheFile(filePath)
        
        // Validate structure
        if (!cachedData.metadata) {
          errors.push(`${fileName}: Missing metadata`)
          continue
        }

        if (!Array.isArray(cachedData.data)) {
          errors.push(`${fileName}: Data is not an array`)
          continue
        }

        // Check if stale
        if (this.isCacheStale(fileName)) {
          warnings.push(`${fileName}: Cache is stale (age: ${this.getCacheAge(fileName)} seconds)`)
        }

        // File-specific validation
        if (fileName === 'players.json') {
          const invalidPlayers = cachedData.data.filter((player: any) => 
            !this.validatePlayer(player)
          )
          if (invalidPlayers.length > 0) {
            errors.push(`${fileName}: ${invalidPlayers.length} invalid player records`)
          }
        }

      } catch (error) {
        errors.push(`${fileName}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Gets cache statistics
   */
  async getCacheStats(): Promise<{
    files: Array<{
      name: string
      exists: boolean
      size: number
      lastModified: Date
      recordCount: number
      isStale: boolean
    }>
  }> {
    const files = ['players.json', 'nfl-teams.json', 'nfl-schedule.json', 'scoring-rules.json']
    const stats = []

    for (const fileName of files) {
      const filePath = join(this.config.dataDirectory, fileName)
      const exists = existsSync(filePath)
      
      let size = 0
      let lastModified = new Date(0)
      let recordCount = 0
      let isStale = true

      if (exists) {
        try {
          const stat = statSync(filePath)
          size = stat.size
          lastModified = stat.mtime
          
          const cachedData = this.readCacheFile(filePath)
          recordCount = Array.isArray(cachedData.data) ? cachedData.data.length : 0
          isStale = this.isCacheStale(fileName)
        } catch (error) {
          console.warn(`Error reading stats for ${fileName}:`, error instanceof Error ? error.message : String(error))
        }
      }

      stats.push({
        name: fileName,
        exists,
        size,
        lastModified,
        recordCount,
        isStale
      })
    }

    return { files: stats }
  }

  /**
   * Clears in-memory cache
   */
  clearMemoryCache(): void {
    this.cache.clear()
  }

  /**
   * Generic method to get cached data with validation
   */
  private async getCachedData<T>(
    fileName: string, 
    validator: (item: any) => boolean
  ): Promise<T[]> {
    // Use full file path as cache key to avoid conflicts between different directories
    const filePath = join(this.config.dataDirectory, fileName)
    const cacheKey = filePath
    
    // Check memory cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      if (!existsSync(filePath)) {
        throw new Error(`Cache file not found: ${fileName}`)
      }

      const cachedData = this.readCacheFile(filePath)
      
      if (!Array.isArray(cachedData.data)) {
        throw new Error(`Invalid cache structure in ${fileName}: data is not an array`)
      }

      // Validate each item
      const validItems = cachedData.data.filter(validator)
      
      if (validItems.length !== cachedData.data.length) {
        console.warn(`${fileName}: ${cachedData.data.length - validItems.length} invalid records filtered out`)
      }

      // Store in memory cache with full path as key
      this.cache.set(cacheKey, validItems)
      
      return validItems
    } catch (error) {
      console.error(`Error reading cache file ${fileName}:`, error instanceof Error ? error.message : String(error))
      throw new Error(`Failed to load cached data from ${fileName}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Reads and parses cache file with error handling
   */
  private readCacheFile(filePath: string): CachedData<any> {
    try {
      const content = readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(content)
      
      if (!parsed.metadata || !parsed.data) {
        throw new Error('Invalid cache file structure: missing metadata or data')
      }
      
      return parsed
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in cache file: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Gets cache age in seconds
   */
  private getCacheAge(fileName: string): number {
    try {
      const filePath = join(this.config.dataDirectory, fileName)
      const cachedData = this.readCacheFile(filePath)
      const now = Math.floor(Date.now() / 1000)
      return now - (cachedData.metadata?.lastUpdated || 0)
    } catch {
      return Infinity
    }
  }

  /**
   * Validates player data structure
   */
  private validatePlayer(player: any): boolean {
    return (
      typeof player === 'object' &&
      typeof player.id === 'string' &&
      typeof player.name === 'string' &&
      typeof player.position === 'string' &&
      typeof player.team === 'string' &&
      player.id.trim().length > 0 &&
      player.name.trim().length > 0 &&
      player.position.trim().length > 0 &&
      player.team.trim().length > 0
    )
  }

  /**
   * Validates NFL team data structure
   */
  private validateNFLTeam(team: any): boolean {
    return (
      typeof team === 'object' &&
      typeof team.id === 'string' &&
      typeof team.name === 'string' &&
      typeof team.abbreviation === 'string' &&
      typeof team.conference === 'string' &&
      typeof team.division === 'string' &&
      team.id.trim().length > 0 &&
      team.name.trim().length > 0 &&
      team.abbreviation.trim().length > 0 &&
      ['AFC', 'NFC'].includes(team.conference) &&
      ['North', 'South', 'East', 'West'].includes(team.division)
    )
  }

  /**
   * Validates NFL game data structure
   */
  private validateNFLGame(game: any): boolean {
    return (
      typeof game === 'object' &&
      typeof game.id === 'string' &&
      typeof game.week === 'number' &&
      typeof game.homeTeam === 'string' &&
      typeof game.awayTeam === 'string' &&
      typeof game.kickoff === 'number' &&
      game.id.trim().length > 0 &&
      game.homeTeam.trim().length > 0 &&
      game.awayTeam.trim().length > 0 &&
      game.week >= 1 && game.week <= 21 &&
      game.kickoff > 0
    )
  }

  /**
   * Validates scoring rule data structure
   */
  private validateScoringRule(rule: any): boolean {
    return (
      typeof rule === 'object' &&
      typeof rule.id === 'string' &&
      typeof rule.abbreviation === 'string' &&
      typeof rule.description === 'string' &&
      typeof rule.points === 'number' &&
      typeof rule.isPlayerRule === 'boolean' &&
      rule.id.length > 0
    )
  }
}

// Export singleton instance
export const cacheManager = new CacheManager()