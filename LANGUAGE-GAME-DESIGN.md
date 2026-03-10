# Language Learning Game: Word & Image Match

## 🎯 Game Concept

**Name**: "Word & Image Match" or "Lingua Match"

**Objective**: Learn vocabulary in foreign languages by matching words with images

**Core Mechanic**: 
1. Player selects a language (cannot choose their country's official language)
2. Game shows a word in the selected language
3. Player chooses the correct image from 3 options
4. Progressive difficulty with scoring and achievements

## 🌍 Language & Country Mapping

### Supported Languages:
- **English** (EN) - Countries: US, UK, Canada, Australia, etc.
- **Spanish** (ES) - Countries: Spain, Mexico, Argentina, Colombia, etc.
- **French** (FR) - Countries: France, Canada (Quebec), Belgium, etc.
- **Italian** (IT) - Countries: Italy, San Marino, Vatican City
- **German** (DE) - Countries: Germany, Austria, Switzerland
- **Portuguese** (PT) - Countries: Brazil, Portugal, Angola, etc.
- **Greek** (EL) - Countries: Greece, Cyprus

### Country-Language Restrictions:
Players cannot select languages that are official in their country based on IP geolocation.

## 🎮 Game Flow

### 1. Language Selection Screen
- Show available languages (excluding player's native)
- Display language names in both English and native script
- Show difficulty indicators and unlock status

### 2. Game Setup
- Choose difficulty: Beginner (10 words), Intermediate (15 words), Advanced (20 words)
- Select category: Animals, Food, Objects, Colors, Numbers, etc.

### 3. Gameplay Loop
- Display word in selected language with pronunciation button
- Show 3 image options (1 correct, 2 distractors)
- Player selects image
- Immediate feedback with correct answer
- Progress to next word

### 4. Results & Scoring
- Final score based on correct answers and time
- XP points for language progress
- Achievements for streaks and milestones

## 📊 Scoring System

### Base Points:
- Correct answer: 100 points
- Time bonus: Up to 50 points (faster = more points)
- Streak bonus: +10 points per consecutive correct answer

### Difficulty Multipliers:
- Beginner: 1x
- Intermediate: 1.5x  
- Advanced: 2x

### Achievements:
- **First Steps**: Complete first game in any language
- **Polyglot**: Play games in 3 different languages
- **Perfect Round**: Get 100% correct in a game
- **Speed Learner**: Complete game under 2 minutes
- **Language Master**: Reach 1000 XP in a language

## 🗃️ Data Structure

### Word Database:
```json
{
  "wordId": "animal_dog_001",
  "category": "animals",
  "difficulty": "beginner",
  "translations": {
    "en": { "word": "dog", "pronunciation": "/dɔːɡ/" },
    "es": { "word": "perro", "pronunciation": "/ˈpe.ro/" },
    "fr": { "word": "chien", "pronunciation": "/ʃjɛ̃/" },
    "it": { "word": "cane", "pronunciation": "/ˈka.ne/" },
    "de": { "word": "hund", "pronunciation": "/hʊnt/" },
    "pt": { "word": "cão", "pronunciation": "/ˈkɐ̃w̃/" },
    "el": { "word": "σκύλος", "pronunciation": "/ˈsci.los/" }
  },
  "imageUrl": "https://images.dashden.app/animals/dog.jpg",
  "distractorImages": [
    "https://images.dashden.app/animals/cat.jpg",
    "https://images.dashden.app/animals/rabbit.jpg"
  ]
}
```

### User Progress:
```json
{
  "userId": "user123",
  "languageProgress": {
    "es": {
      "xp": 450,
      "level": 2,
      "wordsLearned": 45,
      "accuracy": 0.85,
      "lastPlayed": "2026-03-09T10:30:00Z"
    }
  }
}
```

## 🎨 UI/UX Design

### Language Selection Screen:
- Grid layout with language cards
- Each card shows: Flag, Language name, Progress bar, Lock icon (if restricted)
- Smooth animations and hover effects

### Game Screen:
- Clean, focused layout
- Large word display with pronunciation button
- 3 image options in a row
- Progress indicator at top
- Timer (optional, based on difficulty)

### Results Screen:
- Score breakdown with animations
- XP gained and level progress
- Achievements unlocked
- "Play Again" and "Try Another Language" buttons

## 🔧 Technical Implementation

### Frontend Components:
- `LanguageSelectionPage.tsx`
- `LanguageGamePage.tsx` 
- `LanguageGameSetup.tsx`
- `LanguageGameResults.tsx`
- `WordCard.tsx`
- `ImageOption.tsx`

### Backend Services:
- Language detection service (IP-based)
- Word/image content service
- Progress tracking service
- Achievement system integration

### Database Tables:
- `language_words` - Word translations and metadata
- `language_progress` - User progress per language
- `language_games` - Game session records

## 🚀 Implementation Phases

### Phase 1: Core Game (Week 1)
- Basic word-image matching
- 7 languages with 50 words each
- Simple scoring system
- Country-language restriction

### Phase 2: Enhanced Features (Week 2)
- Pronunciation audio
- Multiple categories
- Achievement system
- Progress tracking

### Phase 3: Advanced Features (Week 3)
- Adaptive difficulty
- Daily challenges
- Multiplayer mode
- Leaderboards per language

## 📈 Content Strategy

### Initial Word Set (50 words per language):
- **Animals** (15): dog, cat, bird, fish, horse, etc.
- **Food** (15): apple, bread, water, milk, cheese, etc.
- **Colors** (10): red, blue, green, yellow, black, etc.
- **Numbers** (10): one, two, three, four, five, etc.

### Image Requirements:
- High-quality, clear images
- Consistent style across categories
- Culturally neutral representations
- Optimized for web (WebP format)

## 🎯 Success Metrics

### Engagement:
- Games played per user per week
- Languages attempted per user
- Session duration
- Return rate after first game

### Learning:
- Accuracy improvement over time
- Words learned per session
- Language progression rates
- Achievement unlock rates

This game will be a fantastic addition to DashDen, combining education with engaging gameplay while encouraging users to explore new languages!