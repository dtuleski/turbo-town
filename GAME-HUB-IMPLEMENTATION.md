# Game Hub Implementation Plan

## Overview
Transform the app into a multi-game hub where users select which game to play after logging in. The Memory Game becomes one of many games available.

## Backend Changes

### 1. Database (✅ IN PROGRESS)
- [x] Add `GameCatalogTable` to DynamoDB
  - Partition Key: `gameId` (STRING)
  - GSI: `StatusIndex` (status + displayOrder)
  - Fields: gameId, title, description, icon, route, status, displayOrder, ageRange, category

### 2. GraphQL Schema
- [ ] Add `GameCatalogItem` type
- [ ] Add `listAvailableGames` query
- [ ] Update game service to handle catalog queries

### 3. Seed Data
- [ ] Create script to seed Memory Game into catalog
- [ ] Deploy new table and seed data

## Frontend Changes

### 1. New Pages
- [ ] Create `GameHubPage.tsx` - Main hub with game tiles
- [ ] Create `GameTile.tsx` component - Individual game card

### 2. Routing Updates
- [ ] Change `/` route to redirect to `/hub` after login
- [ ] Keep `/game/setup` and `/game` for Memory Game
- [ ] Add `/hub` route for game selection

### 3. Styling
- [ ] Kid-friendly colors and fonts
- [ ] Large, colorful tiles with icons
- [ ] Playful animations
- [ ] Responsive grid layout

### 4. API Integration
- [ ] Add `listGames()` function to fetch catalog
- [ ] Update types for game catalog

## Implementation Order
1. ✅ Add DynamoDB table
2. Deploy infrastructure
3. Add GraphQL schema and resolver
4. Seed initial data
5. Create frontend hub page
6. Update routing
7. Test and deploy

## Design Specs

### Game Tile
- Large square/rectangle cards
- Bright colors (primary colors for kids)
- Big emoji/icon for each game
- Game title in large, friendly font
- "Coming Soon" badge for unavailable games
- Hover effects and animations

### Hub Layout
- Grid: 2-3 columns on desktop, 1-2 on mobile
- Centered layout with padding
- Welcome message at top
- User's name/avatar in header

### Memory Game Tile
- Icon: 🎮 or 🧠
- Title: "Memory Match"
- Description: "Find matching pairs!"
- Color: Blue/Purple gradient
- Status: ACTIVE

## Next Steps
Continue with GraphQL schema and resolver implementation.
