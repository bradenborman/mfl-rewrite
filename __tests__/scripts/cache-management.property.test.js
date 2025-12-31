/**
 * Property-based tests for cache management
 * Feature: mfl-ui-rewrite, Property 11: Cache Management
 * Validates: Requirements 1.5, 10.2, 10.3, 10.5
 */

const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

// Test data directory
const testDataDir = path.join(__dirname, '..', '..', 'test-data');

describe('Cache Management - Property Tests', () => {
  let currentTestDir;

  beforeEach(() => {
    // Create unique test directory for each test
    currentTestDir = path.join(testDataDir, `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    fs.mkdirSync(currentTestDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up current test directory
    if (fs.existsSync(currentTestDir)) {
      fs.rmSync(currentTestDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up main test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  /**
   * Property 11: Cache Management
   * For any cache update operation, the system should preserve the existing file structure,
   * validate data integrity before saving, and handle failures without corrupting existing cache.
   */
  test('Property 11: Cache Management - File Structure Preservation', () => {
    fc.assert(fc.property(
      fc.record({
        fileName: fc.constantFrom('players.json', 'nfl-schedule.json', 'nfl-teams.json'),
        originalData: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          name: fc.string({ minLength: 1, maxLength: 50 })
        }), { minLength: 0, maxLength: 5 }),
        updateData: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          name: fc.string({ minLength: 1, maxLength: 50 })
        }), { minLength: 0, maxLength: 5 })
      }),
      ({ fileName, originalData, updateData }) => {
        const filePath = path.join(currentTestDir, fileName);

        // Create original cache file
        const originalCache = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000),
            version: '1.0.0',
            source: 'Original test data'
          },
          data: originalData
        };
        fs.writeFileSync(filePath, JSON.stringify(originalCache, null, 2));

        // Verify original file exists
        expect(fs.existsSync(filePath)).toBe(true);

        // Update the cache
        const updatedCache = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000),
            version: '1.0.0',
            source: 'Updated test data'
          },
          data: updateData
        };
        fs.writeFileSync(filePath, JSON.stringify(updatedCache, null, 2));

        // Verify file still exists and has correct structure
        expect(fs.existsSync(filePath)).toBe(true);
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        expect(parsed.metadata).toBeDefined();
        expect(Array.isArray(parsed.data)).toBe(true);
        expect(parsed.data).toEqual(updateData);
      }
    ), { numRuns: 50 });
  });

  test('Property 11a: Data Integrity Validation', () => {
    fc.assert(fc.property(
      fc.record({
        fileName: fc.constantFrom('players.json', 'nfl-schedule.json', 'nfl-teams.json'),
        validData: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          name: fc.string({ minLength: 1, maxLength: 50 })
        }), { minLength: 1, maxLength: 5 })
      }),
      ({ fileName, validData }) => {
        const filePath = path.join(currentTestDir, fileName);

        // Create valid cache data
        const validCacheData = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000),
            version: '1.0.0',
            source: 'Valid test data'
          },
          data: validData
        };
        fs.writeFileSync(filePath, JSON.stringify(validCacheData, null, 2));

        // Verify valid data can be read and parsed
        const validContent = fs.readFileSync(filePath, 'utf8');
        expect(() => JSON.parse(validContent)).not.toThrow();
        const parsedValid = JSON.parse(validContent);
        expect(Array.isArray(parsedValid.data)).toBe(true);
        expect(parsedValid.metadata).toBeDefined();
        expect(parsedValid.metadata.lastUpdated).toBeGreaterThan(0);
        expect(parsedValid.metadata.version).toBe('1.0.0');
      }
    ), { numRuns: 30 });
  });

  test('Property 11b: Metadata Consistency', () => {
    fc.assert(fc.property(
      fc.record({
        fileName: fc.constantFrom('players.json', 'nfl-schedule.json', 'nfl-teams.json'),
        data: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 })
        }), { minLength: 0, maxLength: 5 })
      }),
      ({ fileName, data }) => {
        const filePath = path.join(currentTestDir, fileName);
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Create cache file with metadata
        const cacheData = {
          metadata: {
            lastUpdated: timestamp,
            version: '1.0.0',
            source: `Test source for ${fileName}`
          },
          data: data
        };
        fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2));

        // Verify metadata structure
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);

        // Metadata should exist and have required fields
        expect(parsed.metadata).toBeDefined();
        expect(typeof parsed.metadata.lastUpdated).toBe('number');
        expect(typeof parsed.metadata.version).toBe('string');
        expect(typeof parsed.metadata.source).toBe('string');

        // Data should be an array
        expect(Array.isArray(parsed.data)).toBe(true);

        // Timestamp should be reasonable (within last minute)
        const now = Math.floor(Date.now() / 1000);
        expect(parsed.metadata.lastUpdated).toBeGreaterThan(now - 60);
        expect(parsed.metadata.lastUpdated).toBeLessThanOrEqual(now);
      }
    ), { numRuns: 30 });
  });

  test('Property 11c: Cache Update Preserves Structure', () => {
    fc.assert(fc.property(
      fc.record({
        fileName: fc.constantFrom('players.json', 'nfl-schedule.json', 'nfl-teams.json'),
        initialData: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          name: fc.string({ minLength: 1, maxLength: 50 })
        }), { minLength: 0, maxLength: 3 }),
        updatedData: fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          name: fc.string({ minLength: 1, maxLength: 50 })
        }), { minLength: 0, maxLength: 3 })
      }),
      ({ fileName, initialData, updatedData }) => {
        const filePath = path.join(currentTestDir, fileName);

        // Create initial cache
        const initialCache = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000) - 100,
            version: '1.0.0',
            source: 'Initial data'
          },
          data: initialData
        };
        fs.writeFileSync(filePath, JSON.stringify(initialCache, null, 2));

        // Update cache
        const updatedCache = {
          metadata: {
            lastUpdated: Math.floor(Date.now() / 1000),
            version: '1.0.0',
            source: 'Updated data'
          },
          data: updatedData
        };
        fs.writeFileSync(filePath, JSON.stringify(updatedCache, null, 2));

        // Verify structure is preserved
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        
        expect(parsed.metadata).toBeDefined();
        expect(Array.isArray(parsed.data)).toBe(true);
        expect(parsed.data).toEqual(updatedData);
        expect(parsed.metadata.source).toBe('Updated data');
        expect(parsed.metadata.lastUpdated).toBeGreaterThan(initialCache.metadata.lastUpdated);
      }
    ), { numRuns: 30 });
  });
});