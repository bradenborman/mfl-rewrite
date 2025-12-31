# Requirements Document

## Introduction

The fantasy football dashboard currently displays mock data instead of the user's actual team information from MyFantasyLeague.com (MFL). This feature will integrate real MFL API data to show the user's authentic team name, roster, standings, and statistics when they access their league dashboard.

## Glossary

- **MFL_API**: MyFantasyLeague.com API for fetching league and team data
- **Dashboard**: The league-specific dashboard at `/dashboard/[leagueId]`
- **Franchise**: A team within a fantasy league (user's team)
- **Roster**: List of players owned by a franchise
- **Standings**: League rankings showing wins, losses, and points
- **Cache_Manager**: System for storing API responses to reduce API calls

## Requirements

### Requirement 1: Fetch Real Franchise Information

**User Story:** As a logged-in user, I want to see my actual team name and franchise details on the dashboard, so that I can identify my team clearly.

#### Acceptance Criteria

1. WHEN a user accesses their league dashboard, THE System SHALL fetch franchise information from the MFL API
2. WHEN franchise data is retrieved, THE System SHALL display the user's actual team name instead of "My Team"
3. WHEN franchise data includes owner information, THE System SHALL display the owner name in the header
4. WHEN franchise data is unavailable, THE System SHALL fall back to displaying "Team [FranchiseId]"
5. THE System SHALL cache franchise data for 30 minutes to reduce API calls

### Requirement 2: Display Real Team Roster

**User Story:** As a team owner, I want to see my actual roster of players on the dashboard, so that I can review my current team composition.

#### Acceptance Criteria

1. WHEN a user views their team section, THE System SHALL fetch roster data from the MFL rosters endpoint
2. WHEN roster data is retrieved, THE System SHALL display the user's actual players instead of sample players
3. WHEN displaying roster players, THE System SHALL show player names, positions, and NFL teams
4. WHEN roster includes player status information, THE System SHALL indicate injured or inactive players
5. WHEN roster data is unavailable, THE System SHALL display a "Unable to load roster" message
6. THE System SHALL cache roster data for 15 minutes to balance freshness with performance

### Requirement 3: Show Real League Standings

**User Story:** As a league participant, I want to see the actual league standings including my team's record, so that I can track my performance against other teams.

#### Acceptance Criteria

1. WHEN a user views the standings section, THE System SHALL fetch standings data from the MFL leagueStandings endpoint
2. WHEN standings data is retrieved, THE System SHALL display actual team records instead of mock data
3. WHEN displaying standings, THE System SHALL highlight the user's team in the standings table
4. WHEN standings include points for/against data, THE System SHALL display PF and PA columns
5. WHEN the user's team is found in standings, THE System SHALL display their actual W-L record in the team header
6. THE System SHALL cache standings data for 10 minutes to ensure relatively fresh data

### Requirement 4: Integrate Real Team Statistics

**User Story:** As a team owner, I want to see my actual team statistics derived from league data, so that I can understand my team's performance metrics.

#### Acceptance Criteria

1. WHEN standings data is available, THE System SHALL extract the user's wins and losses from the standings
2. WHEN standings data includes points, THE System SHALL display the user's actual points for and against
3. WHEN calculating team rank, THE System SHALL use the user's position in the actual standings
4. WHEN team statistics are displayed, THE System SHALL show real data instead of random numbers
5. THE System SHALL handle missing statistics gracefully by showing "N/A" or appropriate defaults

### Requirement 5: Error Handling and Fallbacks

**User Story:** As a user, I want the dashboard to work reliably even when some API calls fail, so that I can still access basic functionality.

#### Acceptance Criteria

1. WHEN any MFL API call fails, THE System SHALL log the error and continue with available data
2. WHEN franchise data fails to load, THE System SHALL display "Team [FranchiseId]" as fallback
3. WHEN roster data fails to load, THE System SHALL display a "Unable to load roster" message with retry option
4. WHEN standings data fails to load, THE System SHALL display mock standings with a warning indicator
5. WHEN multiple API calls fail, THE System SHALL display a general error message with retry functionality
6. THE System SHALL provide clear error messages that help users understand what data is unavailable

### Requirement 6: Performance and Caching

**User Story:** As a user, I want the dashboard to load quickly and not make excessive API calls, so that I have a responsive experience.

#### Acceptance Criteria

1. THE System SHALL implement different cache durations based on data volatility (franchise: 30min, roster: 15min, standings: 10min)
2. WHEN cached data is available and not expired, THE System SHALL use cached data instead of making API calls
3. WHEN cache is expired, THE System SHALL fetch fresh data and update the cache
4. THE System SHALL make API calls in parallel when possible to reduce total loading time
5. WHEN API calls are in progress, THE System SHALL show appropriate loading indicators for each section
6. THE System SHALL log cache hits vs API calls for monitoring purposes

### Requirement 7: Data Validation and Parsing

**User Story:** As a system administrator, I want the application to handle MFL API responses reliably, so that users get consistent and accurate data.

#### Acceptance Criteria

1. WHEN parsing MFL API responses, THE System SHALL validate the response structure before processing
2. WHEN franchise data is malformed, THE System SHALL handle the error gracefully and use fallback values
3. WHEN roster data contains invalid player IDs, THE System SHALL filter out invalid entries
4. WHEN standings data is incomplete, THE System SHALL display available data and mark missing fields
5. THE System SHALL handle different MFL API response formats (XML/JSON) consistently
6. WHEN API responses contain unexpected data types, THE System SHALL convert or default appropriately