# Implementation Plan: MFL UI Rewrite

## Overview

This implementation plan breaks down the MFL UI Rewrite into discrete coding tasks that build incrementally. The approach focuses on establishing core infrastructure first, then implementing data caching scripts, followed by authentication and core features. Each task builds on previous work to create a fully functional fantasy football management application.

## Tasks

- [x] 1. Set up project structure and core infrastructure
  - Initialize Next.js 14+ project with TypeScript and App Router
  - Configure project dependencies (React, TypeScript, testing frameworks)
  - Set up directory structure for components, lib, scripts, and data folders
  - Create basic configuration files (tsconfig.json, package.json scripts)
  - _Requirements: 9.1, 9.2_

- [x] 2. Implement data caching system and refresh scripts
  - [x] 2.1 Create data cache directory structure and JSON file templates
    - Create data/ folder with placeholder JSON files (players.json, nfl-schedule.json, etc.)
    - Define TypeScript interfaces for cached data structures
    - _Requirements: 1.4, 1.1_

  - [x] 2.2 Implement MFL API client for data fetching
    - Create lib/mfl-api.ts with basic HTTP client functionality
    - Implement proper URL construction following MFL API format
    - Add User-Agent header "MFLREWRITE" to all requests
    - _Requirements: 2.1, 2.2_

  - [x] 2.3 Write property test for API client
    - **Property 2: API Request Format Compliance**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 2.4 Create player data refresh script
    - Implement scripts/fetch-players.js to fetch player database from MFL API
    - Process and format player data for local storage
    - Update data/players.json with fetched data
    - _Requirements: 10.1, 10.2_

  - [x] 2.5 Create NFL data refresh script
    - Implement scripts/fetch-nfl-data.js for NFL schedule and team data
    - Fetch and process NFL schedule information
    - Update data/nfl-schedule.json and related files
    - _Requirements: 10.1, 10.2_

  - [x] 2.6 Write property test for cache management
    - **Property 11: Cache Management**
    - **Validates: Requirements 1.5, 10.2, 10.3, 10.5**

  - [x] 2.7 Implement cache manager and validation
    - Create lib/cache-manager.ts for reading cached data
    - Implement data validation and integrity checking
    - Add error handling for corrupted or missing cache files
    - _Requirements: 1.2, 10.5_

  - [x] 2.8 Write property test for cache data consistency
    - **Property 1: Cache Data Consistency**
    - **Validates: Requirements 1.2, 1.4**

- [x] 3. Checkpoint - Ensure caching system works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement authentication system
  - [x] 4.1 Create authentication provider and context
    - Implement lib/auth-provider.tsx with React context
    - Create session management for MFL cookies
    - Add secure cookie storage and retrieval
    - _Requirements: 3.2, 3.4_

  - [x] 4.2 Implement MFL login integration
    - Add login functionality to MFL API client
    - Handle authentication cookie extraction and storage
    - Implement HTTPS-only authentication requests
    - _Requirements: 3.1, 3.5_

  - [x]* 4.3 Write property test for authentication flow
    - **Property 3: Authentication Flow Consistency**
    - **Validates: Requirements 3.1, 3.2, 4.1**

  - [x] 4.4 Create login page and form
    - Implement app/login/page.tsx with username/password form
    - Add form validation and error handling
    - Integrate with authentication provider
    - _Requirements: 3.1, 3.3_

  - [ ]* 4.5 Write property test for error handling
    - **Property 10: Error Handling Gracefully**
    - **Validates: Requirements 2.4, 3.3, 4.5, 5.5, 7.5, 8.5**

- [x] 5. Implement league management features
  - [x] 5.1 Create league data fetching functionality
    - Add league-related methods to MFL API client
    - Implement multi-host league support
    - Handle league data parsing and formatting
    - _Requirements: 4.1, 4.4_

  - [ ]* 5.2 Write property test for multi-host support
    - **Property 12: Multi-host League Support**
    - **Validates: Requirements 4.4**

  - [x] 5.3 Implement dashboard and league selection
    - Create app/dashboard/page.tsx for league overview
    - Display user's leagues with name, year, and status
    - Add navigation to individual league pages
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 5.4 Write property test for navigation consistency
    - **Property 5: Navigation Consistency**
    - **Validates: Requirements 4.3, 7.1**

  - [x] 5.5 Create league overview page
    - Implement app/league/[id]/page.tsx for individual league view
    - Display league information and navigation options
    - Add routing to rosters, free agents, and scoring pages
    - _Requirements: 4.3_

  - [ ]* 5.6 Write property test for data display completeness
    - **Property 4: Data Display Completeness**
    - **Validates: Requirements 4.2, 5.2, 6.2, 8.2**

- [ ] 6. Implement roster management
  - [ ] 6.1 Create roster data fetching and display
    - Add roster-related methods to MFL API client
    - Implement app/league/[id]/rosters/page.tsx
    - Display all team rosters with player information
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 6.2 Add roster organization and filtering
    - Organize players by position for easy viewing
    - Handle missing or incomplete player data gracefully
    - Add sorting and filtering capabilities
    - _Requirements: 5.4, 5.5_

  - [ ]* 6.3 Write property test for data organization
    - **Property 6: Data Organization and Filtering**
    - **Validates: Requirements 5.4, 6.3**

- [ ] 7. Implement free agent management
  - [ ] 7.1 Create free agent data fetching and display
    - Add free agent methods to MFL API client
    - Implement app/league/[id]/free-agents/page.tsx
    - Display available players with stats and status
    - _Requirements: 6.1, 6.2_

  - [ ] 7.2 Add free agent filtering and status indication
    - Implement position-based filtering
    - Show waiver vs immediately available status
    - Handle data refresh for stale information
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 8. Implement lineup management
  - [ ] 8.1 Create lineup display and editing interface
    - Implement app/league/[id]/lineup/page.tsx
    - Display current roster with position requirements
    - Add drag-and-drop or selection interface for lineup setting
    - _Requirements: 7.1_

  - [ ] 8.2 Add lineup validation and saving
    - Implement position eligibility validation
    - Prevent invalid lineup configurations
    - Save lineup changes via MFL import API
    - Add error handling for failed saves
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [ ]* 8.3 Write property test for lineup validation
    - **Property 7: Lineup Validation**
    - **Validates: Requirements 7.2, 7.4**

  - [ ]* 8.4 Write property test for data persistence
    - **Property 8: Data Persistence**
    - **Validates: Requirements 7.3**

- [ ] 9. Implement live scoring
  - [ ] 9.1 Create live scoring data fetching
    - Add live scoring methods to MFL API client
    - Implement automatic data refresh functionality
    - Handle real-time score updates
    - _Requirements: 8.1, 8.3_

  - [ ] 9.2 Create live scoring display page
    - Implement app/league/[id]/scoring/page.tsx
    - Display individual player scores and team totals
    - Show game status indicators (not started, in progress, final)
    - Handle fallback to recent scores when live data unavailable
    - _Requirements: 8.2, 8.4, 8.5_

  - [ ]* 9.3 Write property test for real-time updates
    - **Property 9: Real-time Data Updates**
    - **Validates: Requirements 8.1, 8.3, 8.4**

- [ ] 10. Integration and final testing
  - [ ] 10.1 Wire all components together
    - Ensure proper navigation between all pages
    - Test authentication flow across all features
    - Verify data consistency across components
    - _Requirements: All requirements_

  - [ ]* 10.2 Write integration tests
    - Test end-to-end user workflows
    - Verify API integration across all features
    - Test error handling in complete user scenarios

  - [ ] 10.3 Add performance optimizations
    - Implement Next.js static generation where appropriate
    - Add request deduplication and caching
    - Optimize component rendering and data loading
    - _Requirements: 9.4_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Scripts should be runnable independently of the main application
- All authentication requests must use HTTPS
- API requests must include proper rate limiting and error handling