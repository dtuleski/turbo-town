# Game Hub Implementation Plan

## Overview
Transform the app into a multi-game hub where users select which game to play after logging in. The Memory Game becomes one of many games available.

## Backend Changes

### 1. Database (✅ COMPLETE)
- [x] Add `GameCatalogTable` to DynamoDB
  - Partition Key: `gameId` (STRING)
  - GSI: `StatusIndex` (status + displayOrder)
  - Fields: gameId, title, description, icon, route, status, displayOrder, ageRange, category
- [x] Deploy table to AWS

### 2. GraphQL Schema (✅ COMPLETE)
- [x] Add `GameCatalogItem` type
- [x] Add `CatalogStatus` enum
- [x] Add `listAvailableGames` query
- [x] Create `GameCatalogRepository` with query methods
- [x] Update game handler to handle catalog queries

### 3. Seed Data (✅ COMPLETE)
- [x] Create script to seed Memory Game into catalog
- [x] Add example "Coming Soon" games (Math Challenge, Word Puzzle)
- [x] Deploy Lambda with catalog table environment variable
- [x] Seed data into DynamoDB

## Frontend Changes (✅ COMPLETE)

### 1. New Pages
- [x] Create `GameHubPage.tsx` - Main hub with game tiles
- [x] Create `GameTile.tsx` component - Individual game card

### 2. Routing Updates
- [x] Add `HUB` route constant
- [x] Change `/` route to redirect to `/hub` after login
- [x] Keep `/game/setup` and `/game` for Memory Game
- [x] Add `/hub` route for game selection

### 3. Styling
- [x] Kid-friendly colors and fonts (purple, pink, blue gradients)
- [x] Large, colorful tiles with emoji icons
- [x] Playful animations (hover effects, scale transforms)
- [x] Responsive grid layout (1-3 columns)
- [x] "Coming Soon" badges for unavailable games

### 4. API Integration
- [x] Add `listAvailableGames()` function to fetch catalog
- [x] Add `GameCatalogItem` type
- [x] Add GraphQL query for catalog

## Implementation Status: ✅ COMPLETE

All features have been implemented and deployed:
- Backend infrastructure deployed with game catalog table
- GraphQL schema updated with catalog queries
- Lambda function updated and deployed
- Game catalog seeded with Memory Game (active) and 2 coming soon games
- Frontend hub page created with kid-friendly design
- Routing updated to show hub after login
- Changes pushed to GitHub and deploying via Amplify

## Testing

To test the implementation:
1. Visit https://turbo-town.com
2. Log in with your account
3. You should see the Game Hub with 3 tiles:
   - Memory Match (active - clickable)
   - Math Challenge (coming soon)
   - Word Puzzle (coming soon)
4. Click "Memory Match" to go to the game setup page

## Future Enhancements

When adding new games:
1. Create the game pages/components
2. Add a new entry to the game catalog table via seed script
3. The game will automatically appear in the hub
