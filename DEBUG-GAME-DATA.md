# Debug Game Data Integration

## Quick Debug Steps

### 1. Refresh Browser
Make sure you've refreshed the page after the code changes:
```
Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

### 2. Check Debug Panels
You should now see TWO debug panels:
- **Bottom-right**: Environment variables
- **Bottom-left**: API Status

The API Status panel will show:
- Game API: connected ✅ or error ❌
- Has Stats: Yes/No
- Any error messages

### 3. Open Browser Console
Press F12 and look for these messages:

**When starting a game**:
```
Starting game... {themeId: "ANIMALS", difficulty: 1}
Game started successfully! {id: "...", ...}
```

**When completing a game**:
```
Saving game to backend... {gameId: "...", completionTime: 45, attempts: 12}
Game saved successfully! {id: "...", score: 850, ...}
```

**When opening Dashboard**:
```
Fetching user statistics...
Statistics received: {totalGames: 1, bestScore: 850, ...}
```

## Common Issues & Solutions

### Issue 1: API Status shows "error ❌"

**Check the error message in the debug panel**

**Possible causes**:
1. Game service not deployed
2. Wrong API endpoint
3. CORS issue
4. Authentication token issue

**Solutions**:

**A. Verify game service is deployed**:
```bash
aws lambda list-functions --query 'Functions[?contains(FunctionName, `game`)].FunctionName'
```

Should show functions like:
- `MemoryGameLambdaStack-dev-GameHandler...`

**B. Check .env.local**:
```bash
cat apps/web/.env.local
```

Should have:
```
VITE_GAME_ENDPOINT=https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql
```

**C. Redeploy game service if needed**:
```bash
cd infrastructure
npm run build
npx cdk deploy MemoryGameLambdaStack-dev --require-approval never
```

### Issue 2: Console shows "Failed to start game"

**Check the error details in console**

**Common errors**:

**"Network error"**:
- API Gateway not accessible
- Check if URL is correct in .env.local
- Verify API Gateway is deployed

**"Unauthorized" or "Token expired"**:
- JWT token issue
- Try logging out and back in
- Check that Authorization header is included

**"GraphQL error"**:
- Backend Lambda function error
- Check CloudWatch logs:
```bash
aws logs tail /aws/lambda/MemoryGameLambdaStack-dev-GameHandler --follow
```

### Issue 3: Game starts but doesn't save

**Check console when game completes**

**If you see "Saving game to backend..." but no "Game saved successfully!"**:
- There's an error in the completeGame API call
- Check the error message in console
- Verify gameId is not null

**If you don't see "Saving game to backend..." at all**:
- Game completion effect not triggering
- Check that gameId was set when game started
- Look for "Game started successfully!" message

### Issue 4: Dashboard shows 0 for everything

**Check console when Dashboard loads**

**If you see "Fetching user statistics..." but no "Statistics received:"**:
- API call is failing
- Check error message in console
- Verify you're logged in (check Authorization header)

**If you see "Statistics received: {totalGames: 0, ...}"**:
- No games saved yet
- Play a complete game first
- Check that "Game saved successfully!" appeared

**If you don't see any console messages**:
- Dashboard component not loading
- Hard refresh the page (Ctrl+Shift+R)

## Network Tab Debugging

Open DevTools → Network tab → Filter by "graphql"

### When Starting Game
Look for POST request to `/game/graphql`:
- **Request Headers**: Should have `Authorization: Bearer eyJ...`
- **Request Payload**: 
  ```json
  {
    "operationName": "StartGame",
    "variables": {
      "input": {
        "themeId": "ANIMALS",
        "difficulty": 1
      }
    }
  }
  ```
- **Response**: Should return gameId

### When Completing Game
Look for POST request to `/game/graphql`:
- **Request Payload**:
  ```json
  {
    "operationName": "CompleteGame",
    "variables": {
      "input": {
        "gameId": "...",
        "completionTime": 45,
        "attempts": 12
      }
    }
  }
  ```
- **Response**: Should return score and achievements

### When Loading Dashboard
Look for POST request to `/game/graphql`:
- **Request Payload**:
  ```json
  {
    "operationName": "GetUserStatistics"
  }
  ```
- **Response**: Should return statistics

## Check DynamoDB Directly

Verify data is actually being saved:

```bash
# Check Games table
aws dynamodb scan \
  --table-name MemoryGame-Games-dev \
  --limit 5

# Check UserStatistics table
aws dynamodb scan \
  --table-name MemoryGame-UserStatistics-dev \
  --limit 5
```

## Still Not Working?

### Collect Debug Info

1. **Console logs**: Copy all console messages
2. **Network tab**: Screenshot of failed requests
3. **Debug panels**: Screenshot of both panels
4. **Error messages**: Copy exact error text

### Check Backend Logs

```bash
# Game service logs
aws logs tail /aws/lambda/MemoryGameLambdaStack-dev-GameHandler --follow

# In another terminal, play a game and watch for errors
```

### Verify API Gateway

```bash
# List API Gateways
aws apigatewayv2 get-apis --query 'Items[?Name==`MemoryGameAPI-dev`]'

# Should show your API with endpoints
```

## Quick Test Script

Run this in browser console to test API directly:

```javascript
// Test game API
fetch('https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  },
  body: JSON.stringify({
    query: `query { canStartGame { canPlay message } }`
  })
})
.then(r => r.json())
.then(d => console.log('API Response:', d))
.catch(e => console.error('API Error:', e))
```

## Next Steps

Once you see the debug info:
1. Share the console logs
2. Share what the API Status panel shows
3. Share any error messages
4. I'll help identify the exact issue
