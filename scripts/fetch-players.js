#!/usr/bin/env node

/**
 * Player data refresh script
 * Fetches player database from MFL API and updates local cache
 */

const fs = require('fs');
const path = require('path');

// Import our MFL API client (we'll need to compile TypeScript or use a simple fetch implementation)
async function fetchPlayersFromMFL() {
  const currentYear = new Date().getFullYear();
  const apiUrl = `https://api.myfantasyleague.com/${currentYear}/export?TYPE=players&JSON=1&DETAILS=1`;
  
  console.log(`🔗 Fetching from: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'MFLREWRITE',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch from MFL API:', error.message);
    throw error;
  }
}

function transformMFLPlayers(mflData) {
  if (!mflData.players || !mflData.players.player) {
    console.warn('⚠️ No player data found in MFL response');
    return [];
  }

  const players = Array.isArray(mflData.players.player) 
    ? mflData.players.player 
    : [mflData.players.player];

  return players.map(player => ({
    id: player.id,
    name: player.name,
    position: player.position,
    team: player.team || 'FA',
    status: 'active', // Default status
    height: player.height,
    weight: player.weight,
    age: player.age ? parseInt(player.age) : undefined,
    experience: player.experience ? parseInt(player.experience) : undefined,
    jersey: player.jersey
  }));
}

async function main() {
  console.log('👥 Fetching player data from MFL API...');
  
  const dataPath = path.join(__dirname, '..', 'data', 'players.json');
  const dataDir = path.dirname(dataPath);

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    // Fetch data from MFL API
    const mflData = await fetchPlayersFromMFL();
    const players = transformMFLPlayers(mflData);
    
    if (players.length === 0) {
      console.warn('⚠️ No players found, keeping existing cache');
      return;
    }

    // Create cache structure with metadata
    const cacheData = {
      metadata: {
        lastUpdated: Math.floor(Date.now() / 1000), // Unix timestamp
        version: '1.0.0',
        source: 'MFL API - players endpoint'
      },
      data: players
    };

    // Save to cache
    fs.writeFileSync(dataPath, JSON.stringify(cacheData, null, 2));
    
    console.log(`✅ Player data saved to ${dataPath}`);
    console.log(`📊 Cached ${players.length} players`);
    console.log(`🕒 Last updated: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('❌ Failed to refresh player data:', error.message);
    
    // If we have existing cache, preserve it
    if (fs.existsSync(dataPath)) {
      console.log('📋 Existing cache preserved');
    } else {
      // Create minimal fallback cache
      const fallbackData = {
        metadata: {
          lastUpdated: Math.floor(Date.now() / 1000),
          version: '1.0.0',
          source: 'Fallback data - MFL API unavailable'
        },
        data: [
          {
            id: "0001",
            name: "Sample Player 1",
            position: "QB",
            team: "KC",
            status: "active"
          },
          {
            id: "0002", 
            name: "Sample Player 2",
            position: "RB",
            team: "BUF",
            status: "active"
          }
        ]
      };
      
      fs.writeFileSync(dataPath, JSON.stringify(fallbackData, null, 2));
      console.log('📋 Fallback cache created');
    }
    
    process.exit(1);
  }
}

// Add rate limiting delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}