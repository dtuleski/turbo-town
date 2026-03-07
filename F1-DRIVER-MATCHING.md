# Formula 1 Driver Matching System 🏎️

## What Changed

The Formula 1 theme now matches **individual drivers from the same team** instead of matching identical team names!

## How It Works

### Before (Team Matching)
- Card 1: "🔴 Ferrari"
- Card 2: "🔴 Ferrari"
- ✅ Match!

### Now (Driver Matching)
- Card 1: "🔴 Leclerc"
- Card 2: "🔴 Hamilton"
- ✅ Match! (Both are Ferrari drivers)

## 2025 F1 Driver Pairs

Each pair represents teammates from the same team:

1. **Ferrari** 🔴
   - Leclerc ↔️ Hamilton

2. **Mercedes** ⚫
   - Russell ↔️ Antonelli

3. **McLaren** 🟠
   - Norris ↔️ Piastri

4. **Red Bull** 🔷
   - Verstappen ↔️ Lawson

5. **Aston Martin** 🟢
   - Alonso ↔️ Stroll

6. **RB** 🟡
   - Tsunoda ↔️ Hadjar

7. **Williams** 🔵
   - Albon ↔️ Sainz

8. **Haas** ⚪
   - Ocon ↔️ Bearman

9. **Kick Sauber** 🟤
   - Bortoleto ↔️ Hulkenberg

10. **Alpine** 🟣
    - Gasly ↔️ Doohan

## Game Mechanics

### Matching Logic
- When you flip "🔴 Leclerc" and "🔴 Hamilton", they match! ✅
- When you flip "🔴 Leclerc" and "🟠 Norris", no match ❌
- The colored emoji indicates the team
- You need to remember which drivers are on which team

### Difficulty Levels
- **Easy**: 6 teams (12 cards, 6 driver pairs)
- **Medium**: 8 teams (16 cards, 8 driver pairs)
- **Hard**: 10 teams (20 cards, 10 driver pairs)

## Technical Implementation

### Special Matching System
The F1 theme uses a custom matching algorithm:

```typescript
// F1 Driver pairs stored as arrays
const F1_DRIVER_PAIRS = [
  ['🔴 Leclerc', '🔴 Hamilton'],  // Ferrari
  ['⚫ Russell', '⚫ Antonelli'],  // Mercedes
  // ... etc
]

// Teammate map for quick lookups
F1_TEAMMATE_MAP = {
  '🔴 Leclerc': '🔴 Hamilton',
  '🔴 Hamilton': '🔴 Leclerc',
  // ... etc
}
```

### Card Generation
- For F1 theme: Creates one card per driver (not duplicates)
- For other themes: Creates two identical cards per value

### Match Checking
- For F1 theme: Checks if drivers are teammates using the map
- For other themes: Checks if card values are identical

## Why This Is Better

1. **More Challenging**: You need to know F1 teams and their drivers
2. **Educational**: Learn which drivers race for which teams
3. **Unique Gameplay**: Different from standard memory games
4. **Realistic**: Reflects actual F1 team structure

## Example Game Flow

1. Flip card: "🔴 Leclerc"
2. Flip card: "🟠 Norris"
3. ❌ No match (different teams)
4. Cards flip back

5. Flip card: "🔴 Hamilton"
6. Flip card: "🔴 Leclerc"
7. ✅ Match! (Both Ferrari)
8. Cards stay revealed

## Deployment

The changes are deployed! After Amplify finishes building (2-3 minutes), you'll see:
- Driver names instead of team names
- Teammates match with each other
- More challenging and fun gameplay!

**Test it at**: https://main.d20rx51iesg0zh.amplifyapp.com

## Future Enhancements

Possible improvements:
- Add driver photos/avatars
- Show team logos
- Add driver numbers
- Include driver statistics
- Create F1-specific achievements (e.g., "Match all Mercedes drivers")

Enjoy the new F1 driver matching game! 🏁
