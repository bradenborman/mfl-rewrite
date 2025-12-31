#!/usr/bin/env node

/**
 * Cache validation script
 * Validates JSON file integrity and data quality
 */

const fs = require('fs');
const path = require('path');

console.log('✅ Validating cache integrity...');

const dataDir = path.join(__dirname, '..', 'data');
const requiredFiles = [
  'players.json',
  'nfl-schedule.json', 
  'nfl-teams.json'
];

let validationErrors = [];

// Check if data directory exists
if (!fs.existsSync(dataDir)) {
  validationErrors.push('Data directory does not exist');
} else {
  // Validate each required file
  for (const filename of requiredFiles) {
    const filePath = path.join(dataDir, filename);
    
    if (!fs.existsSync(filePath)) {
      validationErrors.push(`Missing file: ${filename}`);
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Basic validation - ensure it has metadata and data properties
      if (!data.metadata || !data.data) {
        validationErrors.push(`${filename}: Missing metadata or data properties`);
        continue;
      }
      
      if (!Array.isArray(data.data)) {
        validationErrors.push(`${filename}: Data property should be an array`);
        continue;
      }
      
      // File-specific validation
      if (filename === 'players.json') {
        for (const player of data.data) {
          if (!player.id || !player.name || !player.position) {
            validationErrors.push(`${filename}: Player missing required fields (id, name, position)`);
            break;
          }
        }
      }
      
      console.log(`✅ ${filename}: Valid (${data.data.length} items, updated: ${new Date(data.metadata.lastUpdated * 1000).toISOString()})`);
      
    } catch (error) {
      validationErrors.push(`${filename}: Invalid JSON - ${error.message}`);
    }
  }
}

// Report results
if (validationErrors.length === 0) {
  console.log('🎉 All cache files are valid!');
} else {
  console.error('❌ Validation errors found:');
  validationErrors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}