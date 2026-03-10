# Quick Test Guide - Frontend Backend Integration

## 🚀 Start the Frontend

Run this command from the project root:

```bash
./start-frontend.sh
```

Or manually:

```bash
cd apps/web
npm run dev
```

The frontend will start at: **http://localhost:3000**

## ✅ What to Verify

### 1. Environment Variables Loaded (Bottom-Right Corner)

You should see a black debug panel showing:

```json
{
  "apiUrl": "https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/auth/graphql",
  "cognito": {
    "userPoolId": "us-east-1_jPkMWmBup",
    "userPoolClientId": "XXXXXXXXXXXXXXXXXXXXXXX",
    "region": "us-east-1"
  }
}
```

✅ **If you see this**: Environment is configured correctly
❌ **If values are empty**: Restart the dev server

### 2. Test Registration (Real Backend)

1. Go to: http://localhost:3000/register
2. Use a **REAL email address** (you'll receive a code)
3. Fill in:
   - Email: your-real-email@example.com
   - Username: testuser
   - Password: Test1234 (min 8 chars, uppercase, lowercase, numbers)
   - Confirm Password: Test1234

4. Click "Create Account"
5. **Expected**: "Please check your email for a confirmation code"
6. Check your email inbox
7. Enter the 6-digit code
8. Click "Confirm Email"
9. **Expected**: Redirected to login page

### 3. Test Login (Real Backend)

1. Go to: http://localhost:3000/login
2. Enter your email and password
3. Click "Login"
4. **Expected**: Redirected to game setup page
5. Open browser console (F12)
6. **Expected**: See real Cognito user ID (not "1" or "mock")

### 4. Test Game Data Persistence (Real DynamoDB)

1. Click "Start Game"
2. Play and complete a game
3. Go to Dashboard
4. **Expected**: See your game stats
5. Refresh the page (F5)
6. **Expected**: Stats still there (saved to DynamoDB)

### 5. Verify API Calls (Real AWS)

Open DevTools (F12) → Network tab:

1. Filter by "graphql"
2. Play a game
3. **Expected**: See requests to:
   - `https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com`
4. Click on a request → Headers tab
5. **Expected**: See `Authorization: Bearer eyJ...` (JWT token)

## 🐛 Common Issues

### Issue: "Attributes did not conform to the schema: name.givenName/name.familyName required"

**Cause**: Cognito User Pool requires name attributes
**Solution**: Already fixed! The registration now automatically:
- Splits username into first and last name
- If username is single word (e.g., "dtuleski"), uses it for both given and family name
- You can use any username format - it will work

### Issue: White Screen

**Solution**: Clear Vite cache and restart

```bash
rm -rf apps/web/node_modules/.vite
cd apps/web && npm run dev
```

### Issue: "Cannot use import.meta outside a module"

**Cause**: Trying to use `import.meta.env` in browser console
**Solution**: Use the debug panel in the UI instead

### Issue: Environment Variables Empty

**Solution**: Make sure `.env.local` exists and restart dev server

```bash
ls -la apps/web/.env.local  # Should exist
cd apps/web && npm run dev   # Restart
```

### Issue: "User does not exist" on Login

**Cause**: Email not confirmed
**Solution**: 
1. Check email for confirmation code
2. Or check AWS Console → Cognito → Users
3. Manually confirm user if needed

### Issue: No Authorization Header in Requests

**Cause**: Login didn't complete successfully
**Solution**: 
1. Check browser console for errors
2. Try logging out and back in
3. Clear localStorage and try again

## 🎯 Success Criteria

You'll know the integration is working when:

- ✅ Debug panel shows real AWS configuration
- ✅ Registration sends real email with confirmation code
- ✅ Login returns real Cognito JWT token
- ✅ API requests include Authorization header
- ✅ Game stats persist after page refresh
- ✅ No "mock" or "TODO" messages in console

## 🧹 Clean Up

Once everything works, remove the debug component:

1. Open `apps/web/src/App.tsx`
2. Remove line: `import { EnvDebug } from './components/EnvDebug'`
3. Remove line: `<EnvDebug />`
4. Save and the debug panel will disappear

## 📚 More Details

See `FRONTEND-BACKEND-INTEGRATION.md` for:
- Complete implementation details
- Troubleshooting guide
- API endpoints
- AWS resource IDs
