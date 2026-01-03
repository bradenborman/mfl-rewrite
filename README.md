# MFL Express

A lightweight, sleek Next.js interface for MyFantasyLeague.com that provides a streamlined user experience.

## Features

- 🔐 Secure authentication with MFL credentials
- 🏈 League management and navigation
- 👥 Roster viewing for all teams
- 🆓 Free agent browsing and filtering
- 📋 Lineup management with validation
- ⚡ Live scoring with real-time updates
- 📊 Local data caching for performance
- 🎨 Official MFL branding and colors

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the data cache:
   ```bash
   npm run refresh-cache
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run refresh-cache` - Refresh all cached data
- `npm run refresh-players` - Refresh player data only
- `npm run refresh-nfl` - Refresh NFL data only
- `npm run validate-cache` - Validate cache integrity

## Project Structure

```
├── app/                 # Next.js App Router pages
├── components/          # Reusable React components
├── lib/                 # Utility functions and API clients
├── scripts/             # Data refresh and maintenance scripts
├── data/                # Cached JSON data files
└── __tests__/           # Test files
```

## API Integration

This application uses the MyFantasyLeague.com API with the registered client "MFLREWRITE". All API requests include proper rate limiting and authentication handling.

## Development

The project follows Next.js 14+ best practices with:
- TypeScript for type safety
- App Router for modern routing
- Property-based testing with fast-check
- ESLint for code quality

## License

Private project for personal use with MyFantasyLeague.com API.