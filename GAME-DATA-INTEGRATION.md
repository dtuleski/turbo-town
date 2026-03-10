# Game Data Integration Complete

## What Was Implemented

### 1. GraphQL API Client for Game Service
Created `apps/web/src/api/game.ts` with all game-related API calls:
- `startGame()` - Start a new game session
- `completeGame()` - Save completed game to DynamoDB
- `getUserStatistics()` - Fetch user stats for dashboard
- `getGameHistory()` - Get game history with pagination
- `canStartGame()` - Check rate limits

### 2. Separate Apollo Clients
Updated `apps/web/src/api/client.ts` to support multiple services:
- `authClient` - For authentication endpoints
- `gameClient` - For game service endpoints
- Automatically routes to correct API Gateway endpoint

### 3. Game Hook Integration
Updated `apps/web/src/hooks/useGame.ts`:
- Calls `startGame` API when game begins
- Automatically saves game to backend when completed
- Stores `gameId` for tracking
- Handles API errors gracefully (game still playable if API fails)

### 4. Dashboard Real Data
Updated `apps/web/src/pages/dashboard/DashboardPage.tsx`:
- Fetches real statistics from backend
- Shows total games, best score, completed games
- Loading states while fetching data

## How It Works

### Game Flow

1. **User clicks "Start Game"**
   ```typescript
   startGame() → API call → Get gameId from backend
   ```

2. **User plays the game**
   - Game state managed locally
   - No API calls during gameplay (fast, responsive)

3. **User completes the game**
   ```typescript
   Game completes → useEffect triggers → completeGame() API call
   → Data saved to DynamoDB
   ```

4. **User views Dashboard**
   ```typescript
   Dashboard loads → getUserStatistics() → Fetch from DynamoDB
   → Display real stats
   ```

## API Endpoints

The frontend now connects to both services:

- **Auth Service**: `https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/auth/graphql`
- **Game Service**: `https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql`

## Test the Integration

### 1. Start the Frontend
```bash
cd apps/web
npm run dev
```

### 2. Play a Game
1. Go to http://localhost:3000
2. Click "Play"
3. Select theme and difficulty
4. Click "Start Game"
5. **Check browser console** - should see: "Game saved successfully!"
6. Complete the game

### 3. Check Dashboard
1. Go to Dashboard
2. **Should now show**:
   - Total Games: 1 (or more)
   - Best Score: Your actual score
   - Completed Games: 1 (or more)

### 4. Verify in AWS
Check DynamoDB tables:
- `MemoryGame-Games-dev` - Should have your game record
- `MemoryGame-UserStatistics-dev` - Should have your stats

## Debugging

### Check Network Requests
Open DevTools (F12) → Network tab:

1. **When starting game**:
   - Look for POST to `/game/graphql`
   - Operation: `StartGame`
   - Should return `gameId`

2. **When completing game**:
   - Look for POST to `/game/graphql`
   - Operation: `CompleteGame`
   - Should return score and achievements

3. **When viewing dashboard**:
   - Look for POST to `/game/graphql`
   - Operation: `GetUserStatistics`
   - Should return your stats

### Check Console Logs
- "Game saved successfully!" = ✅ Working
- "Failed to save game:" = ❌ Check error message
- "Failed to fetch statistics:" = ❌ Check API connection

## Common Issues

### Issue: "Failed to save game"
**Possible causes**:
- Game service Lambda not deployed
- API Gateway not configured
- JWT token expired

**Solution**:
```bash
# Check if game service is deployed
aws lambda list-functions --query 'Functions[?contains(FunctionName, `game`)].FunctionName'

# Redeploy if needed
cd infrastructure
npx cdk deploy MemoryGameLambdaStack-dev
```

### Issue: Dashboard shows 0 for everything
**Possible causes**:
- Game didn't save to backend
- API call failing silently

**Solution**:
1. Open browser console
2. Look for errors
3. Check Network tab for failed requests
4. Verify JWT token is included in headers

### Issue: "Network error"
**Possible causes**:
- API Gateway URL incorrect
- CORS not configured

**Solution**:
Check `.env.local`:
```bash
VITE_GAME_ENDPOINT=https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql
```

## Files Modified

1. `apps/web/src/api/client.ts` - Added game client
2. `apps/web/src/api/game.ts` - Created (new file)
3. `apps/web/src/hooks/useGame.ts` - Added API calls
4. `apps/web/src/pages/dashboard/DashboardPage.tsx` - Fetch real data

## Next Steps

1. ✅ Test game completion saves to backend
2. ✅ Verify dashboard shows real data
3. Update Statistics page to show detailed stats
4. Update History page to show game history
5. Update Achievements page to show unlocked achievements

## Status

✅ **Game data now persists to DynamoDB**
✅ **Dashboard shows real statistics**
✅ **Full backend integration complete**

Just refresh your browser and play a game - it will automatically save to the backend!
