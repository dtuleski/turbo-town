# Frontend Troubleshooting - White Page Issue

## Quick Diagnosis

You're seeing a white page, which typically means JavaScript is failing to load or execute.

## Step 1: Check Browser Console

1. Open your browser's Developer Tools:
   - **Chrome/Edge**: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - **Firefox**: Press `F12` or `Cmd+Option+K` (Mac) / `Ctrl+Shift+K` (Windows)
   - **Safari**: Enable Developer menu first (Preferences → Advanced → Show Develop menu), then press `Cmd+Option+C`

2. Click on the **Console** tab

3. Look for any red error messages

4. **Take a screenshot or copy the error messages** - this will tell us exactly what's wrong

## Common Errors and Solutions

### Error: "Failed to fetch" or "Network Error"
**Cause**: Can't connect to API  
**Solution**: The backend might not be responding. This is actually OK for now - the frontend should still load with mock data.

### Error: "Cannot read property of undefined"
**Cause**: Missing environment variable or configuration  
**Solution**: Check that `.env.local` file exists and has correct values

### Error: "Module not found" or "Cannot find module"
**Cause**: Missing dependencies  
**Solution**: Run `npm install` in the `apps/web` directory

### Error: "Unexpected token" or "Syntax error"
**Cause**: Code compilation issue  
**Solution**: There might be a TypeScript error

## Step 2: Try Mock Data Mode

Let's temporarily use mock data to see if the frontend loads:

1. Stop the dev server (Ctrl+C in terminal)

2. Edit `apps/web/.env.local` and comment out the API URL:
   ```
   # VITE_API_URL=https://ooihrv63q8.execute-api.us-east-1.amazonaws.com/auth/graphql
   ```

3. Restart: `npm run dev`

4. Try loading http://localhost:3000 again

If it loads now, the issue is with the API connection. If it still doesn't load, the issue is with the frontend code itself.

## Step 3: Check Network Tab

1. In Developer Tools, click the **Network** tab
2. Refresh the page
3. Look for any failed requests (shown in red)
4. Check if `main.tsx` or other JavaScript files are loading

## Step 4: Clear Browser Cache

Sometimes cached files cause issues:

1. Hard refresh the page:
   - **Mac**: `Cmd+Shift+R`
   - **Windows/Linux**: `Ctrl+Shift+R` or `Ctrl+F5`

2. Or clear cache completely:
   - **Chrome**: Settings → Privacy → Clear browsing data → Cached images and files
   - **Firefox**: Preferences → Privacy → Clear Data → Cached Web Content
   - **Safari**: Develop → Empty Caches

## Step 5: Check if Vite is Running

In your terminal where you ran `npm run dev`, you should see:
```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:3000/
```

If you see errors instead, that's the problem.

## What to Tell Me

Please share:
1. **Any error messages from the browser console** (most important!)
2. Whether the page loads with API URL commented out
3. Any failed requests in the Network tab
4. Any errors in the terminal where Vite is running

## Quick Test

Try this in your browser console (F12 → Console tab):
```javascript
console.log('Test:', import.meta.env)
```

This will show if environment variables are loading correctly.

## Emergency: Use Mock Data

If you want to see the app working right now with mock data:

1. Edit `apps/web/.env.local`:
   ```
   # Comment out all API URLs
   # VITE_API_URL=...
   # VITE_AUTH_ENDPOINT=...
   # VITE_GAME_ENDPOINT=...
   
   # Keep Cognito config
   VITE_COGNITO_REGION=us-east-1
   VITE_COGNITO_USER_POOL_ID=us-east-1_jPkMWmBup
   VITE_COGNITO_CLIENT_ID=282nlnkslo1ttfsg1qfj5r2a54
   ```

2. Restart dev server

3. The app should load with mock data (authentication won't work, but you can see the UI)

---

**Next: Please check the browser console and share any error messages you see!**
