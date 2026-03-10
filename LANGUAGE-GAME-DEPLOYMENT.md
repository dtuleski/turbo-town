# Language Learning Game - Deployment Guide

## 🚀 Complete Implementation Status

✅ **Frontend Components Created:**
- Language selection page with country restrictions
- Game setup page with difficulty/category selection  
- Interactive gameplay page with scoring
- Results page with detailed analytics
- Updated hub page with language game tile

✅ **Backend Services Created:**
- Language handler with GraphQL resolvers
- Language service with business logic
- Language repository with DynamoDB integration
- Updated game handler to route language operations

✅ **Database Schema Updated:**
- Added 3 new DynamoDB tables for language learning
- Updated infrastructure stack with proper indexes
- Created data seeding script with sample vocabulary

✅ **API Integration:**
- Updated GraphQL schema with language types
- Created frontend API client functions
- Integrated real API calls in components

## 🔧 Deployment Steps

### Step 1: Deploy Updated Infrastructure

The database stack has been updated with new language learning tables. Deploy the changes:

```bash
cd infrastructure

# Deploy the updated database stack
npm run deploy:dev

# This will create:
# - memory-game-language-words-dev
# - memory-game-language-progress-dev  
# - memory-game-language-results-dev
```

### Step 2: Seed Language Data

After the tables are created, populate them with initial vocabulary:

```bash
# Set the table name environment variable
export LANGUAGE_WORDS_TABLE_NAME=memory-game-language-words-dev

# Run the seeding script
cd scripts
npx ts-node seed-language-data.ts

# This will insert sample vocabulary for:
# - Animals (5 words)
# - Food (2 words)  
# - Colors (2 words)
# - All 7 languages (EN, ES, FR, IT, DE, PT, EL)
```

### Step 3: Update Lambda Environment Variables

The language repository needs access to the new table names. Update your Lambda deployment to include:

```bash
# In your Lambda environment variables:
LANGUAGE_WORDS_TABLE_NAME=memory-game-language-words-dev
LANGUAGE_PROGRESS_TABLE_NAME=memory-game-language-progress-dev
LANGUAGE_RESULTS_TABLE_NAME=memory-game-language-results-dev
```

### Step 4: Deploy Updated Game Service

The game service now includes language learning resolvers:

```bash
cd services/game

# Build the updated service
npm run build

# Deploy to AWS Lambda (your existing deployment process)
# The service now handles these new GraphQL operations:
# - getLanguageWords
# - saveLanguageGameResult  
# - getUserLanguageProgress
# - getLanguageProgressByCode
```

### Step 5: Deploy Frontend

The frontend has been updated with new routes and components:

```bash
cd apps/web

# Build the updated frontend
npm run build

# Deploy to Vercel (automatic via git push)
git add .
git commit -m "Add language learning game"
git push origin main

# New routes available:
# - /language (language selection)
# - /language/setup/:languageCode (game setup)
# - /language/game/:languageCode (gameplay)
# - /language/results/:languageCode (results)
```

## 🧪 Testing the Implementation

### Test 1: Language Selection
1. Navigate to `/language`
2. Verify country detection works (restricted languages are disabled)
3. Click on an available language
4. Should navigate to setup page

### Test 2: Game Setup  
1. Select difficulty (Beginner/Intermediate/Advanced)
2. Select category (Animals/Food/Colors)
3. Verify game summary shows correct settings
4. Click "Start Learning"

### Test 3: Gameplay
1. Verify word displays in selected language
2. Test pronunciation button (uses browser speech synthesis)
3. Click correct/incorrect images
4. Verify scoring and feedback work
5. Complete full game

### Test 4: Results & Progress
1. Verify results page shows accurate stats
2. Check XP and achievement calculations
3. Test "Play Again" and "Try Another Language" buttons
4. Verify progress is saved (check database)

### Test 5: Backend Integration
1. Check CloudWatch logs for GraphQL operations
2. Verify DynamoDB tables are populated
3. Test error handling (invalid language codes, etc.)

## 📊 Monitoring & Analytics

### Key Metrics to Track:
- **Language Popularity**: Which languages are most played
- **Completion Rates**: By difficulty and language
- **User Progression**: XP gains and level advancement  
- **Geographic Distribution**: Country restrictions effectiveness
- **Performance**: API response times and error rates

### CloudWatch Dashboards:
Create dashboards to monitor:
- Language game API calls
- Database read/write operations
- User progression metrics
- Error rates by operation

## 🔍 Troubleshooting

### Common Issues:

**1. Country Detection Not Working**
- Check if ipapi.co is accessible
- Verify CORS settings allow external API calls
- Test with VPN to simulate different countries

**2. No Words Returned**
- Verify language data was seeded correctly
- Check DynamoDB table permissions
- Ensure Lambda has read access to language tables

**3. Progress Not Saving**
- Check Lambda environment variables
- Verify DynamoDB write permissions
- Check CloudWatch logs for errors

**4. Images Not Loading**
- Currently using placeholder images
- Replace with real image URLs when ready
- Ensure CDN/S3 bucket is accessible

### Debug Commands:

```bash
# Check DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `language`)]'

# Check table contents
aws dynamodb scan --table-name memory-game-language-words-dev --max-items 5

# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/MemoryGame"

# Test GraphQL endpoint
curl -X POST https://your-api-gateway-url/game/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "query { getLanguageWords(languageCode: \"es\", category: \"animals\", difficulty: \"beginner\", count: 5) { id word } }"}'
```

## 🎯 Next Steps

### Immediate (Week 1):
- [ ] Deploy infrastructure updates
- [ ] Seed initial vocabulary data
- [ ] Test basic functionality
- [ ] Monitor for errors

### Short Term (Week 2-3):
- [ ] Add more vocabulary words (target: 50+ per category)
- [ ] Replace placeholder images with real photos
- [ ] Implement audio pronunciation files
- [ ] Add more categories (Numbers, Objects, Nature)

### Medium Term (Month 2):
- [ ] Add adaptive difficulty based on performance
- [ ] Implement spaced repetition algorithm
- [ ] Add daily challenges and streaks
- [ ] Create leaderboards per language

### Long Term (Month 3+):
- [ ] Add sentence construction games
- [ ] Implement voice recognition for pronunciation
- [ ] Add cultural context and facts
- [ ] Create multiplayer language challenges

## 🎉 Success Criteria

The language learning game will be considered successfully deployed when:

✅ **Functional Requirements:**
- Users can select from 7 languages (excluding native)
- Games run smoothly with real-time scoring
- Progress is saved and tracked across sessions
- All CRUD operations work correctly

✅ **Performance Requirements:**
- Page load times < 3 seconds
- API response times < 500ms
- 99.9% uptime for game functionality
- Handles 100+ concurrent users

✅ **User Experience Requirements:**
- Intuitive navigation between game screens
- Responsive design works on mobile/desktop
- Clear feedback on correct/incorrect answers
- Engaging animations and visual feedback

The language learning game is now ready for deployment and will be a fantastic addition to your DashDen educational gaming platform! 🌍🎮