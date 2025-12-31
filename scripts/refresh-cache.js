#!/usr/bin/env node

/**
 * Main cache refresh script
 * Orchestrates all data refresh operations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Starting cache refresh...');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created data directory');
}

try {
  // Run player data refresh
  console.log('👥 Refreshing player data...');
  execSync('node scripts/fetch-players.js', { stdio: 'inherit' });
  
  // Run NFL data refresh
  console.log('🏈 Refreshing NFL data...');
  execSync('node scripts/fetch-nfl-data.js', { stdio: 'inherit' });
  
  // Validate cache
  console.log('✅ Validating cache...');
  execSync('node scripts/validate-cache.js', { stdio: 'inherit' });
  
  console.log('🎉 Cache refresh completed successfully!');
} catch (error) {
  console.error('❌ Cache refresh failed:', error.message);
  process.exit(1);
}