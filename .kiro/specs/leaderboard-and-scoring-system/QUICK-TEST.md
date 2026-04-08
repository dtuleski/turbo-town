# Quick Test Reference

## 🚀 Fastest Way to Test

### Option 1: Use the Test Script (Recommended)

```bash
# Make script executable (first time only)
chmod +x test-leaderboard.sh

# Run the script
./test-leaderboard.sh

# Choose from menu:
# 1 - Backend unit tests
# 2 - Start frontend dev server
# 3 - Verify infrastructure
# 4 - Test API endpoints
# 5 - Full test suite
```

### Option 2: Manual Testing

#### Backend Tests (5 minutes)

```bash
# Test Leaderboard Service
cd services/leaderboard
npm install
npm test

# Test Game Service
cd ../game
npm install
npm test
```

#### Frontend Testing (2 minutes)

```bash
# Start dev server
cd apps/web
npm install
npm run dev

# Open browser to http://localhost:3000
# Login and navigate to /leaderboard
```

## 🎯 Key Test Scenarios

### 1. Leaderboard Page (2 min)
- Navigate to `/leaderboard`
- Change timeframe (Daily → Weekly → Monthly → All Time)
- Change game type (Overall → Memory Match)
- Verify table displays with your rank highlighted

### 2. Dashboard Widgets (1 min)
- Go to `/dashboard`
- Scroll to "Your Performance" section
- Verify 3 widgets display:
  - Your Rank
  - Score Trends
  - Recent Improvements

### 3. Game Completion (3 min)
- Play Memory Match game
- Complete the game
- Verify Score Breakdown Modal appears
- Check rank badge displays
- Click "View Leaderboard" button

## 🔍 Quick Verification Checklist

### Frontend
- [ ] Leaderboard page loads
- [ ] Filters work (timeframe, game type)
- [ ] Current user highlighted in table
- [ ] Dashboard widgets display
- [ ] Score breakdown modal shows after game
- [ ] Navigation links work

### Backend
- [ ] All unit tests pass
- [ ] DynamoDB tables exist
- [ ] EventBridge event bus exists
- [ ] Lambda functions deployed
- [ ] API Gateway endpoints respond

### Integration
- [ ] Game completion triggers event
- [ ] Event processed by Leaderboard Service
- [ ] Data stored in DynamoDB
- [ ] Frontend fetches and displays data

## 🐛 Quick Troubleshooting

### "Leaderboard not loading"
```bash
# Check API endpoint
echo $VITE_LEADERBOARD_ENDPOINT

# Test API directly
curl -X POST $VITE_LEADERBOARD_ENDPOINT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { getLeaderboard(gameType: OVERALL, timeframe: ALL_TIME) { totalEntries } }"}'
```

### "Score breakdown not showing"
```bash
# Check Lambda logs
aws logs tail /aws/lambda/leaderboard-service-dev --follow

# Check EventBridge
aws events list-rules --event-bus-name game-events
```

### "Tests failing"
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

## 📊 Expected Results

### Unit Tests
- ✅ All tests pass (green)
- ✅ No errors or warnings
- ✅ Coverage > 80%

### Frontend
- ✅ No console errors
- ✅ Data loads within 2 seconds
- ✅ Responsive on mobile/tablet/desktop
- ✅ Smooth animations

### API
- ✅ Response time < 200ms (p95)
- ✅ No 4xx/5xx errors
- ✅ Valid JSON responses
- ✅ Correct data structure

## 🎓 Testing Tips

1. **Start Simple**: Test backend first, then frontend
2. **Use Real Data**: Play actual games to generate data
3. **Check Logs**: Always check CloudWatch logs for errors
4. **Test Edge Cases**: Empty states, no data, errors
5. **Mobile Testing**: Test on actual mobile devices
6. **Performance**: Use browser DevTools to check load times

## 📞 Need Help?

1. Check the full [TESTING-GUIDE.md](./TESTING-GUIDE.md)
2. Review CloudWatch logs
3. Check browser console for errors
4. Verify environment variables
5. Ensure AWS credentials are configured

## ⚡ One-Line Tests

```bash
# Backend tests
cd services/leaderboard && npm test && cd ../game && npm test

# Frontend dev server
cd apps/web && npm run dev

# Infrastructure check
aws dynamodb list-tables | grep -E "Leaderboard|Aggregates"

# API test (replace TOKEN)
curl -X POST $API_URL -H "Authorization: Bearer TOKEN" -d '{"query":"query{getLeaderboard(gameType:OVERALL,timeframe:ALL_TIME){totalEntries}}"}'
```

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Tests are green
- ✅ Leaderboard page shows data
- ✅ Your rank appears in the table
- ✅ Dashboard widgets display
- ✅ Score breakdown appears after games
- ✅ No errors in console or logs
