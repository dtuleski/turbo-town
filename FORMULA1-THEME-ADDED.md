# Formula 1 Theme Added! 🏎️

## What Was Added

A new Formula 1 theme has been added to the memory game where players match drivers from the same team!

## Changes Made

### 1. Backend (DynamoDB)
Added new theme to the database:
- **Theme ID**: `FORMULA1`
- **Name**: Formula 1
- **Category**: Sports
- **Description**: F1 drivers from the same team - 2025 season
- **Pairs**: 10 (20 cards total)
- **Status**: PUBLISHED

### 2. Frontend Updates

#### Game Logic (`apps/web/src/utils/gameLogic.ts`)
Added F1 teams as card values:
- 🔴 Ferrari
- 🟢 Aston Martin
- 🔵 Williams
- ⚫ Mercedes
- 🟠 McLaren
- 🟡 RB
- ⚪ Haas
- 🟤 Kick Sauber
- 🟣 Alpine
- 🔷 Red Bull

Each team represents a pair - when you flip two cards with the same team, they match!

#### Type Definitions (`apps/web/src/types/game.ts`)
- Added `FORMULA1` to the `GameTheme` type

#### Theme Selection (`apps/web/src/config/constants.ts`)
- Added Formula 1 to the theme selection menu with 🏎️ emoji

#### Card Component (`apps/web/src/components/game/Card.tsx`)
- Updated to handle text-based cards (team names) with smaller font size
- Maintains emoji display for other themes

## How It Works

### Matching Logic
In the Formula 1 theme, each F1 team is represented by a colored emoji + team name:
- Example: 🔴 Ferrari

When playing:
1. You flip a card and see "🔴 Ferrari"
2. You flip another card
3. If it also says "🔴 Ferrari", it's a match! ✅
4. If it says something else like "🟠 McLaren", no match ❌

### Difficulty Levels
- **Easy**: 6 teams (12 cards)
- **Medium**: 8 teams (16 cards)
- **Hard**: 10 teams (20 cards)

## 2025 F1 Teams Included

1. **Ferrari** 🔴 - Leclerc & Hamilton
2. **Aston Martin** 🟢 - Alonso & Stroll
3. **Williams** 🔵 - Albon & Sainz
4. **Mercedes** ⚫ - Russell & Antonelli
5. **McLaren** 🟠 - Norris & Piastri
6. **RB** 🟡 - Tsunoda & Hadjar
7. **Haas** ⚪ - Ocon & Bearman
8. **Kick Sauber** 🟤 - Bortoleto & Hulkenberg
9. **Alpine** 🟣 - Gasly & Doohan
10. **Red Bull** 🔷 - Verstappen & Lawson

## Deployment

The changes have been:
1. ✅ Added to DynamoDB (theme is live in database)
2. ✅ Committed to Git
3. ✅ Pushed to GitHub
4. 🔄 Amplify is automatically deploying the frontend

The Formula 1 theme will be available in about 2-3 minutes at:
- **Amplify URL**: https://main.d20rx51iesg0zh.amplifyapp.com
- **Custom Domain** (when DNS works): https://dev.turbo-town.com

## Testing

To test the new theme:
1. Go to the app
2. Click "Play Game"
3. Select "Formula 1" theme (🏎️)
4. Choose difficulty
5. Start matching F1 teams!

## Future Enhancements

Possible improvements:
- Add actual driver names instead of just team names
- Add team logos/colors as backgrounds
- Create separate cards for each driver (e.g., "Leclerc" matches with "Hamilton" because both are Ferrari)
- Add more F1-specific achievements

## Notes

The theme uses text + emoji format which is different from the pure emoji themes. The Card component automatically adjusts font size for text-based cards to ensure readability.

Enjoy matching F1 teams! 🏁
