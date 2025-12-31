/**
 * Property-based tests for cache data consistency
 * Feature: mfl-ui-rewrite, Property 1: Cache Data Consistency
 * Validates: Requirements 1.2, 1.4
 */

import * as fc from 'fast-check'
import { CacheManager } from '@/lib/cache-manager'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

// Test data directory
const testDataDir = join(__dirname, '..', '..', 'test-cache-data')

describe('Cache Manager - Property Tests', () => {
  let cacheManager: CacheManager
  let currentTestDir: string

  beforeEach(() => {
    // Create unique test directory for each test
    currentTestDir = join(testDataDir, `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    mkdirSync(currentTestDir, { recursive: true })
    
    // Create cache manager with test directory
    cacheManager = new CacheManager({ 
      dataDirectory: currentTestDir,
      maxAge: 3600 // 1 hour for testing
    })
    
    // Clear any existing memory cache
    cacheManager.clearMemoryCache()
  })

  afterEach(() => {
    // Clear cache manager memory before cleanup
    cacheManager.clearMemoryCache()
    
    // Clean up current test directory
    if (existsSync(currentTestDir)) {
      rmSync(currentTestDir, { recursive: true, force: true })
    }
  })

  afterAll(() => {
    // Clean up main test data directory
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true, force: true })
    }
  })

  /**
   * Property 1: Cache Data Consistency
   * For any request for cached data (players, NFL schedule, scoring rules), 
   * the system should serve data from local JSON files without making external API calls, 
   * and the data should be in the expected format.
   */
  test('Property 1: Cache Data Consistency - Players', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          id: fc.stringOf(fc.char().filter(c => /[0-9]/.test(c)), { minLength: 4, maxLength: 4 }),
          name: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          position: fc.constantFrom('QB', 'RB', 'WR', 'TE', 'K', 'DEF'),
          team: fc.stringOf(fc.char().filter(c => /[A-Z]/.test(c)), { minLength: 2, maxLength: 3 }),
          status: fc.constantFrom('active', 'injured', 'bye')
        }),
        { minLength: 1, maxLength: 20 }
      ),
      async (players) => {
        // Create cache file with valid structure
        const cacheData = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000),
            version: '1.0.0',
            source: 'Test data'
          },
          data: players
        }
        
        const filePath = join(currentTestDir, 'players.json')
        writeFileSync(filePath, JSON.stringify(cacheData, null, 2))

        // Clear cache before reading to ensure we get fresh data
        cacheManager.clearMemoryCache()

        // Request data from cache manager
        const cachedPlayers = await cacheManager.getPlayers()

        // Verify data consistency
        expect(Array.isArray(cachedPlayers)).toBe(true)
        expect(cachedPlayers.length).toBe(players.length)
        
        // Verify each player has expected structure
        cachedPlayers.forEach((player, index) => {
          expect(typeof player.id).toBe('string')
          expect(typeof player.name).toBe('string')
          expect(typeof player.position).toBe('string')
          expect(typeof player.team).toBe('string')
          expect(player.id.length).toBeGreaterThan(0)
          expect(player.name.length).toBeGreaterThan(0)
          expect(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']).toContain(player.position)
        })
      }
    ), { numRuns: 50 })
  })

  test('Property 1a: Cache Data Consistency - NFL Teams', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          id: fc.stringOf(fc.char().filter(c => /[A-Z]/.test(c)), { minLength: 2, maxLength: 3 }),
          name: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0),
          abbreviation: fc.stringOf(fc.char().filter(c => /[A-Z]/.test(c)), { minLength: 2, maxLength: 3 }),
          conference: fc.constantFrom('AFC', 'NFC'),
          division: fc.constantFrom('North', 'South', 'East', 'West')
        }),
        { minLength: 1, maxLength: 32 }
      ),
      async (teams) => {
        // Create cache file with valid structure
        const cacheData = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000),
            version: '1.0.0',
            source: 'Test NFL teams'
          },
          data: teams
        }
        
        const filePath = join(currentTestDir, 'nfl-teams.json')
        writeFileSync(filePath, JSON.stringify(cacheData, null, 2))

        // Clear cache before reading to ensure we get fresh data
        cacheManager.clearMemoryCache()

        // Request data from cache manager
        const cachedTeams = await cacheManager.getNFLTeams()

        // Verify data consistency
        expect(Array.isArray(cachedTeams)).toBe(true)
        expect(cachedTeams.length).toBe(teams.length)
        
        // Verify each team has expected structure
        cachedTeams.forEach((team) => {
          expect(typeof team.id).toBe('string')
          expect(typeof team.name).toBe('string')
          expect(typeof team.abbreviation).toBe('string')
          expect(typeof team.conference).toBe('string')
          expect(typeof team.division).toBe('string')
          expect(['AFC', 'NFC']).toContain(team.conference)
          expect(['North', 'South', 'East', 'West']).toContain(team.division)
        })
      }
    ), { numRuns: 30 })
  })

  test('Property 1b: Cache Data Consistency - NFL Schedule', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          week: fc.integer({ min: 1, max: 21 }),
          homeTeam: fc.stringOf(fc.char().filter(c => /[A-Z]/.test(c)), { minLength: 2, maxLength: 3 }),
          awayTeam: fc.stringOf(fc.char().filter(c => /[A-Z]/.test(c)), { minLength: 2, maxLength: 3 }),
          kickoff: fc.integer({ min: 1640995200, max: 1735689600 }), // 2022-2025 range
          gameStatus: fc.constantFrom('not_started', 'in_progress', 'final')
        }),
        { minLength: 1, maxLength: 50 }
      ),
      async (games) => {
        // Create cache file with valid structure
        const cacheData = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000),
            version: '1.0.0',
            source: 'Test NFL schedule'
          },
          data: games
        }
        
        const filePath = join(currentTestDir, 'nfl-schedule.json')
        writeFileSync(filePath, JSON.stringify(cacheData, null, 2))

        // Clear cache before reading to ensure we get fresh data
        cacheManager.clearMemoryCache()

        // Request data from cache manager
        const cachedGames = await cacheManager.getNFLSchedule()

        // Verify data consistency
        expect(Array.isArray(cachedGames)).toBe(true)
        expect(cachedGames.length).toBe(games.length)
        
        // Verify each game has expected structure
        cachedGames.forEach((game) => {
          expect(typeof game.id).toBe('string')
          expect(typeof game.week).toBe('number')
          expect(typeof game.homeTeam).toBe('string')
          expect(typeof game.awayTeam).toBe('string')
          expect(typeof game.kickoff).toBe('number')
          expect(game.week).toBeGreaterThanOrEqual(1)
          expect(game.week).toBeLessThanOrEqual(21)
          expect(game.kickoff).toBeGreaterThan(0)
        })
      }
    ), { numRuns: 30 })
  })

  test('Property 1c: Cache Data Consistency - Error Handling', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        fileName: fc.constantFrom('players.json', 'nfl-teams.json', 'nfl-schedule.json'),
        corruptData: fc.oneof(
          fc.constant('invalid json {'),
          fc.constant('{"data": "not an array"}'),
          fc.constant('{"metadata": null, "data": []}'),
          fc.constant('{}')
        )
      }),
      async ({ fileName, corruptData }) => {
        // Create corrupted cache file
        const filePath = join(currentTestDir, fileName)
        writeFileSync(filePath, corruptData)

        // Attempt to read data should throw appropriate error
        let errorThrown = false
        try {
          if (fileName === 'players.json') {
            await cacheManager.getPlayers()
          } else if (fileName === 'nfl-teams.json') {
            await cacheManager.getNFLTeams()
          } else if (fileName === 'nfl-schedule.json') {
            await cacheManager.getNFLSchedule()
          }
        } catch (error) {
          errorThrown = true
          expect(error.message).toContain('Failed to load cached data')
        }

        expect(errorThrown).toBe(true)
      }
    ), { numRuns: 20 })
  })

  test('Property 1d: Cache Data Consistency - Player Lookup', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          id: fc.stringOf(fc.char().filter(c => /[0-9]/.test(c)), { minLength: 4, maxLength: 4 }),
          name: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          position: fc.constantFrom('QB', 'RB', 'WR', 'TE', 'K', 'DEF'),
          team: fc.stringOf(fc.char().filter(c => /[A-Z]/.test(c)), { minLength: 2, maxLength: 3 })
        }),
        { minLength: 3, maxLength: 10 }
      ).filter(players => {
        // Ensure unique IDs
        const ids = new Set(players.map(p => p.id))
        return ids.size === players.length
      }),
      async (players) => {
        // Create cache file
        const cacheData = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000),
            version: '1.0.0',
            source: 'Test data'
          },
          data: players
        }
        
        const filePath = join(currentTestDir, 'players.json')
        writeFileSync(filePath, JSON.stringify(cacheData, null, 2))

        // Clear cache before reading to ensure we get fresh data
        cacheManager.clearMemoryCache()

        // Test player lookup by ID
        for (const player of players) {
          const foundPlayer = await cacheManager.getPlayerById(player.id)
          expect(foundPlayer).not.toBeNull()
          expect(foundPlayer?.id).toBe(player.id)
          expect(foundPlayer?.name).toBe(player.name)
          expect(foundPlayer?.position).toBe(player.position)
        }

        // Test lookup of non-existent player
        const nonExistentPlayer = await cacheManager.getPlayerById('9999')
        expect(nonExistentPlayer).toBeNull()
      }
    ), { numRuns: 20 })
  })

  test('Property 1e: Cache Data Consistency - Position Filtering', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          id: fc.stringOf(fc.char().filter(c => /[0-9]/.test(c)), { minLength: 4, maxLength: 4 }),
          name: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          position: fc.constantFrom('QB', 'RB', 'WR', 'TE', 'K', 'DEF'),
          team: fc.stringOf(fc.char().filter(c => /[A-Z]/.test(c)), { minLength: 2, maxLength: 3 })
        }),
        { minLength: 5, maxLength: 20 }
      ),
      async (players) => {
        // Create cache file
        const cacheData = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000),
            version: '1.0.0',
            source: 'Test data'
          },
          data: players
        }
        
        const filePath = join(currentTestDir, 'players.json')
        writeFileSync(filePath, JSON.stringify(cacheData, null, 2))

        // Clear cache before reading to ensure we get fresh data
        cacheManager.clearMemoryCache()

        // Test position filtering
        const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
        
        for (const position of positions) {
          const filteredPlayers = await cacheManager.getPlayersByPosition(position)
          const expectedCount = players.filter(p => p.position === position).length
          
          expect(filteredPlayers.length).toBe(expectedCount)
          filteredPlayers.forEach(player => {
            expect(player.position).toBe(position)
          })
        }
      }
    ), { numRuns: 20 })
  })
})