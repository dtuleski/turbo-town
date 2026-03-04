# Troubleshooting Guide

## Common Issues and Solutions

### 1. Installation Issues

#### Problem: `npm install` fails
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Problem: Node version mismatch
**Solution:**
```bash
# Check your Node version
node --version

# Should be 20.x or higher
# If not, install Node 20.x from nodejs.org
```

### 2. Development Server Issues

#### Problem: Port 3000 already in use
**Solution:**
Vite will automatically use the next available port (3001, 3002, etc.)
Or manually specify a port:
```bash
npm run dev -- --port 3001
```

#### Problem: Hot reload not working
**Solution:**
```bash
# Restart the dev server
# Press Ctrl+C to stop
npm run dev
```

### 3. TypeScript Errors

#### Problem: Type errors in IDE
**Solution:**
```bash
# Run type check
npm run type-check

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

#### Problem: Cannot find module '@/...'
**Solution:**
- Check that `tsconfig.json` has the path mapping
- Restart your IDE
- Run `npm run type-check`

### 4. Styling Issues

#### Problem: Tailwind classes not working
**Solution:**
```bash
# Make sure Tailwind is configured
# Check tailwind.config.js exists
# Restart dev server
npm run dev
```

#### Problem: Custom colors not showing
**Solution:**
- Check `tailwind.config.js` has the color definitions
- Use correct class names: `bg-primary-blue` not `bg-blue-primary`
- Restart dev server after config changes

### 5. Game Issues

#### Problem: Cards not flipping
**Solution:**
- Check browser console for errors
- Make sure Framer Motion is installed: `npm list framer-motion`
- Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)

#### Problem: Timer not working
**Solution:**
- Check that game status is 'IN_PROGRESS'
- Look for console errors
- Try restarting the game

#### Problem: Achievements not showing
**Solution:**
- Check browser console for errors
- Make sure you meet achievement criteria
- Try completing a game again

### 6. Build Issues

#### Problem: Build fails
**Solution:**
```bash
# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint

# Try building again
npm run build
```

#### Problem: Build succeeds but app doesn't work
**Solution:**
```bash
# Preview the build locally
npm run preview

# Check browser console for errors
# Check that environment variables are set
```

### 7. Browser Issues

#### Problem: App not loading
**Solution:**
- Clear browser cache
- Try incognito/private mode
- Check browser console for errors
- Try a different browser

#### Problem: Animations laggy
**Solution:**
- Close other browser tabs
- Check CPU usage
- Try a different browser
- Reduce number of cards (play Easy mode)

### 8. Authentication Issues

#### Problem: Can't login
**Solution:**
- Remember: Auth is currently using mock data
- Any email/password will work
- Check browser console for errors
- Clear localStorage: `localStorage.clear()` in console

#### Problem: Redirected to login after refresh
**Solution:**
- This is expected with mock auth
- Login again (any credentials work)
- In production, this will be fixed with real auth

### 9. Performance Issues

#### Problem: App is slow
**Solution:**
- Check browser console for errors
- Close other applications
- Try a different browser
- Reduce animation complexity (edit Framer Motion settings)

#### Problem: High memory usage
**Solution:**
- Restart browser
- Close other tabs
- Check for memory leaks in console
- Restart dev server

### 10. Import Errors

#### Problem: Module not found
**Solution:**
```bash
# Make sure all dependencies are installed
npm install

# Check that the file exists
# Check import path is correct
# Use @/ for src imports
```

#### Problem: Circular dependency warning
**Solution:**
- Check import statements
- Avoid importing from index files that re-export
- Import directly from component files

## Debug Tips

### Check Browser Console
Always check the browser console (F12) for errors:
- Red errors = something is broken
- Yellow warnings = might cause issues
- Blue info = just information

### Check Network Tab
If API calls fail:
- Open Network tab (F12)
- Look for failed requests (red)
- Check request/response details

### Check React DevTools
Install React DevTools extension:
- View component tree
- Inspect props and state
- Track re-renders

### Check TypeScript
Run type checking:
```bash
npm run type-check
```

### Check Linting
Run ESLint:
```bash
npm run lint
```

## Still Having Issues?

### 1. Check the logs
Look for error messages in:
- Browser console (F12)
- Terminal where dev server is running
- Network tab in browser

### 2. Search for the error
Copy the error message and search:
- Google
- Stack Overflow
- GitHub Issues

### 3. Start fresh
```bash
# Stop dev server (Ctrl+C)
# Delete everything
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Start again
npm run dev
```

### 4. Check versions
```bash
# Check Node version
node --version  # Should be 20.x+

# Check npm version
npm --version   # Should be 10.x+

# Check package versions
npm list
```

## Quick Fixes

### Reset Everything
```bash
# Stop server
# Clear cache
npm cache clean --force

# Remove dependencies
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Start fresh
npm run dev
```

### Clear Browser Data
1. Open browser settings
2. Clear browsing data
3. Select "Cached images and files"
4. Clear data
5. Refresh page

### Restart Everything
1. Stop dev server (Ctrl+C)
2. Close browser
3. Close terminal
4. Close IDE
5. Restart everything
6. Run `npm run dev`

## Environment Variables

If you need to configure environment variables:

1. Copy `.env.example` to `.env`
2. Update values
3. Restart dev server
4. Variables must start with `VITE_`

Example:
```env
VITE_API_URL=http://localhost:4000/graphql
```

Access in code:
```typescript
import.meta.env.VITE_API_URL
```

## Getting Help

If you're still stuck:
1. Check the error message carefully
2. Search online for the specific error
3. Check if it's a known issue
4. Try the solutions above
5. Ask for help with specific error details

---

**Most issues can be solved by:**
1. Checking the console for errors
2. Restarting the dev server
3. Clearing cache
4. Reinstalling dependencies

Good luck! 🚀
