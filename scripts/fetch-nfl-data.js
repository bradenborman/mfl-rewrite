#!/usr/bin/env node

/**
 * NFL data refresh script
 * Fetches NFL schedule and team data from MFL API and updates local cache
 */

const fs = require('fs');
const path = require('path');

// NFL team data mapping
const NFL_TEAMS = {
  'ARI': { name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
  'ATL': { name: 'Atlanta Falcons', conference: 'NFC', division: 'South' },
  'BAL': { name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
  'BUF': { name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
  'CAR': { name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
  'CHI': { name: 'Chicago Bears', conference: 'NFC', division: 'North' },
  'CIN': { name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
  'CLE': { name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
  'DAL': { name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
  'DEN': { name: 'Denver Broncos', conference: 'AFC', division: 'West' },
  'DET': { name: 'Detroit Lions', conference: 'NFC', division: 'North' },
  'GB': { name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
  'HOU': { name: 'Houston Texans', conference: 'AFC', division: 'South' },
  'IND': { name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
  'JAC': { name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South' },
  'KC': { name: 'Kansas City Chiefs', conference: 'AFC', division: 'West' },
  'LV': { name: 'Las Vegas Raiders', conference: 'AFC', division: 'West' },
  'LAC': { name: 'Los Angeles Chargers', conference: 'AFC', division: 'West' },
  'LAR': { name: 'Los Angeles Rams', conference: 'NFC', division: 'West' },
  'MIA': { name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
  'MIN': { name: 'Minnesota Vikings', conference: 'NFC', division: 'North' },
  'NE': { name: 'New England Patriots', conference: 'AFC', division: 'East' },
  'NO': { name: 'New Orleans Saints', conference: 'NFC', division: 'South' },
  'NYG': { name: 'New York Giants', conference: 'NFC', division: 'East' },
  'NYJ': { name: 'New York Jets', conference: 'AFC', division: 'East' },
  'PHI': { name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
  'PIT': { name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
  'SF': { name: 'San Francisco 49ers', conference: 'NFC', division: 'West' },
  'SEA': { name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
  'TB': { name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South' },
  'TEN': { name: 'Tennessee Titans', conference: 'AFC', division: 'South' },
  'WAS': { name: 'Washington Commanders', conference: 'NFC', division: 'East' }
};

async function fetchNFLScheduleFromMFL() {
  const currentYear = new Date().getFullYear();
  const apiUrl = `https://api.myfantasyleague.com/${currentYear}/export?TYPE=nflSchedule&W=ALL&JSON=1`;
  
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
    console.error('❌ Failed to fetch NFL schedule from MFL API:', error.message);
    throw error;
  }
}

function transformNFLSchedule(mflData) {
  if (!mflData.nflSchedule || !mflData.nflSchedule.matchup) {
    console.warn('⚠️ No NFL schedule data found in MFL response');
    return [];
  }

  const matchups = Array.isArray(mflData.nflSchedule.matchup) 
    ? mflData.nflSchedule.matchup 
    : [mflData.nflSchedule.matchup];

  return matchups.map(matchup => ({
    id: `${matchup.week}_${matchup.team[0].id}_${matchup.team[1].id}`,
    week: parseInt(matchup.week),
    homeTeam: matchup.team.find(t => t.isHome === '1')?.id || matchup.team[0].id,
    awayTeam: matchup.team.find(t => t.isHome !== '1')?.id || matchup.team[1].id,
    kickoff: parseInt(matchup.kickoff) || 0,
    homeScore: matchup.team.find(t => t.isHome === '1')?.score ? parseInt(matchup.team.find(t => t.isHome === '1').score) : null,
    awayScore: matchup.team.find(t => t.isHome !== '1')?.score ? parseInt(matchup.team.find(t => t.isHome !== '1').score) : null,
    gameStatus: matchup.gameSecondsRemaining === '0' ? 'final' : 
                matchup.gameSecondsRemaining ? 'in_progress' : 'not_started'
  }));
}

function generateNFLTeams() {
  return Object.entries(NFL_TEAMS).map(([id, info]) => ({
    id,
    name: info.name,
    abbreviation: id,
    conference: info.conference,
    division: info.division
  }));
}

async function main() {
  console.log('🏈 Fetching NFL data from MFL API...');
  
  const dataDir = path.join(__dirname, '..', 'data');
  const schedulePath = path.join(dataDir, 'nfl-schedule.json');
  const teamsPath = path.join(dataDir, 'nfl-teams.json');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    // Fetch schedule data from MFL API
    const mflData = await fetchNFLScheduleFromMFL();
    const schedule = transformNFLSchedule(mflData);
    
    // Generate teams data
    const teams = generateNFLTeams();

    // Create cache structures with metadata
    const scheduleCache = {
      metadata: {
        lastUpdated: Math.floor(Date.now() / 1000),
        version: '1.0.0',
        source: 'MFL API - nflSchedule endpoint'
      },
      data: schedule
    };

    const teamsCache = {
      metadata: {
        lastUpdated: Math.floor(Date.now() / 1000),
        version: '1.0.0',
        source: 'Static NFL team data'
      },
      data: teams
    };

    // Save to cache
    fs.writeFileSync(schedulePath, JSON.stringify(scheduleCache, null, 2));
    fs.writeFileSync(teamsPath, JSON.stringify(teamsCache, null, 2));
    
    console.log(`✅ NFL schedule saved to ${schedulePath}`);
    console.log(`✅ NFL teams saved to ${teamsPath}`);
    console.log(`📊 Cached ${schedule.length} games and ${teams.length} teams`);
    console.log(`🕒 Last updated: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('❌ Failed to refresh NFL data:', error.message);
    
    // Create fallback data if files don't exist
    if (!fs.existsSync(schedulePath) || !fs.existsSync(teamsPath)) {
      const fallbackSchedule = {
        metadata: {
          lastUpdated: Math.floor(Date.now() / 1000),
          version: '1.0.0',
          source: 'Fallback data - MFL API unavailable'
        },
        data: [
          {
            id: "1_KC_BUF",
            week: 1,
            homeTeam: "KC",
            awayTeam: "BUF", 
            kickoff: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
            gameStatus: "not_started"
          }
        ]
      };

      const fallbackTeams = {
        metadata: {
          lastUpdated: Math.floor(Date.now() / 1000),
          version: '1.0.0',
          source: 'Fallback data - Static team info'
        },
        data: generateNFLTeams()
      };
      
      fs.writeFileSync(schedulePath, JSON.stringify(fallbackSchedule, null, 2));
      fs.writeFileSync(teamsPath, JSON.stringify(fallbackTeams, null, 2));
      console.log('📋 Fallback cache created');
    } else {
      console.log('📋 Existing cache preserved');
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