/**
 * Basic setup test to ensure the project infrastructure is working
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

describe('Project Setup', () => {
  test('should have required configuration files', () => {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.js',
      'jest.config.js'
    ]
    
    requiredFiles.forEach(file => {
      expect(existsSync(file)).toBe(true)
    })
  })
  
  test('should have data directory with cache files', () => {
    const dataDir = join(process.cwd(), 'data')
    const requiredDataFiles = [
      'players.json',
      'nfl-schedule.json',
      'nfl-teams.json'
    ]
    
    expect(existsSync(dataDir)).toBe(true)
    
    requiredDataFiles.forEach(file => {
      const filePath = join(dataDir, file)
      expect(existsSync(filePath)).toBe(true)
      
      // Verify it's valid JSON
      const content = readFileSync(filePath, 'utf8')
      expect(() => JSON.parse(content)).not.toThrow()
    })
  })
  
  test('should have proper directory structure', () => {
    const requiredDirs = [
      'app',
      'components',
      'lib', 
      'scripts',
      'data'
    ]
    
    requiredDirs.forEach(dir => {
      expect(existsSync(dir)).toBe(true)
    })
  })
  
  test('package.json should have required scripts', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const requiredScripts = [
      'dev',
      'build',
      'start',
      'test',
      'refresh-cache',
      'refresh-players',
      'refresh-nfl',
      'validate-cache'
    ]
    
    requiredScripts.forEach(script => {
      expect(packageJson.scripts).toHaveProperty(script)
    })
  })
})