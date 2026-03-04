# Testing Guide

## Quick Test Checklist

Use this guide to test all features of the Memory Game.

## 🚀 Setup

```bash
cd apps/web
npm install
npm run dev
```

Visit `http://localhost:3000`

## ✅ Test Checklist

### 1. Authentication Flow

#### Login Page
- [ ] Navigate to `/login`
- [ ] See login form
- [ ] Enter invalid email → See error
- [ ] Enter short password → See error
- [ ] Enter valid credentials → Login successful
- [ ] Redirected to game setup page

#### Register Page
- [ ] Click "Sign up" link
- [ ] See registration form
- [ ] Enter invalid email → See error
- [ ] Enter short username → See error
- [ ] Enter weak password → See error
- [ ] Passwords don't match → See error
- [ ] Enter valid data → Registration successful
- [ ] Redirected to game setup page

#### Forgot Password
- [ ] Click "Forgot password?" link
- [ ] Enter email
- [ ] See success message
- [ ] Click "Back to Login"

#### Protected Routes
- [ ] Logout
- [ ] Try to visit `/game` → Redirected to login
- [ ] Try to visit `/dashboard` → Redirected to login
- [ ] Login → Can access protected routes

### 2. Game Setup

#### Theme Selection
- [ ] See 5 theme options
- [ ] Click Animals → Selected (blue ring)
- [ ] Click Fruits → Selected
- [ ] Click Vehicles → Selected
- [ ] Click Space → Selected
- [ ] Click Ocean → Selected

#### Difficulty Selection
- [ ] See 3 difficulty options
- [ ] Click Easy → Selected (blue ring)
- [ ] Click Medium → Selected
- [ ] Click Hard → Selected
- [ ] See description for each level

#### Start Game
- [ ] Click "Start Game" button
- [ ] Redirected to game page
- [ ] See start modal with theme and difficulty

### 3. Game Play

#### Start Modal
- [ ] See theme emoji
- [ ] See theme name
- [ ] See difficulty name and description
- [ ] Click "Start Game"
- [ ] Modal closes
- [ ] Game board appears

#### Game Board
- [ ] See correct number of cards (Easy: 12, Medium: 16, Hard: 20)
- [ ] Cards arranged in grid
- [ ] All cards face down (blue/purple gradient)
- [ ] Cards have question mark emoji

#### Card Flipping
- [ ] Click first card → Flips over
- [ ] See emoji on front
- [ ] Click second card → Flips over
- [ ] If match → Both stay flipped, turn green
- [ ] If no match → Both flip back after 1 second
- [ ] Can't click same card twice
- [ ] Can't click more than 2 cards at once

#### Game Header
- [ ] Timer starts at 0:00
- [ ] Timer counts up (0:01, 0:02, etc.)
- [ ] Attempts counter increases with each pair flip
- [ ] Matches counter shows X / Y format
- [ ] See Pause button

#### Pause/Resume
- [ ] Click Pause → Game pauses
- [ ] See pause overlay
- [ ] Timer stops
- [ ] Can't flip cards
- [ ] Click Resume → Game continues
- [ ] Timer resumes
- [ ] Can flip cards again

#### Restart
- [ ] Click Restart
- [ ] Game resets
- [ ] New card positions
- [ ] Timer resets to 0:00
- [ ] Attempts reset to 0
- [ ] Matches reset to 0 / X

### 4. Game Completion

#### Win Condition
- [ ] Match all pairs
- [ ] See confetti animation
- [ ] See game over modal
- [ ] Timer stops
- [ ] Can't flip cards anymore

#### Game Over Modal
- [ ] See celebration emoji (🎉)
- [ ] See "Game Complete!" title
- [ ] See performance message
- [ ] See score
- [ ] See time
- [ ] See attempts
- [ ] See matches
- [ ] See "Play Again" button
- [ ] See "Change Settings" button
- [ ] See "View Dashboard" button

#### Modal Actions
- [ ] Click "Play Again" → New game, same settings
- [ ] Click "Change Settings" → Go to game setup
- [ ] Click "View Dashboard" → Go to dashboard
- [ ] Click outside modal → Modal closes

### 5. Achievements

#### Perfect Game
- [ ] Play Easy mode
- [ ] Match all pairs on first try (6 attempts)
- [ ] See achievement toast
- [ ] Toast shows "Perfect Game!" title
- [ ] Toast auto-dismisses after 4 seconds

#### Speed Demon
- [ ] Play Easy mode
- [ ] Complete in under 30 seconds
- [ ] See achievement toast
- [ ] Toast shows "Speed Demon!" title

#### First Win
- [ ] Complete any game
- [ ] See achievement toast
- [ ] Toast shows "First Win!" title

### 6. Navigation

#### Header
- [ ] See "Memory Game 🎮" logo
- [ ] Click logo → Go to home (game setup)
- [ ] See "Play" link → Go to game setup
- [ ] See "Dashboard" link → Go to dashboard
- [ ] See "Achievements" link → Go to achievements
- [ ] See username
- [ ] Click username → Go to profile
- [ ] See "Logout" button
- [ ] Click Logout → Redirected to login

#### Footer
- [ ] See copyright text
- [ ] See current year

### 7. Dashboard

#### Overview
- [ ] See "Total Games" card (shows 0)
- [ ] See "Best Score" card (shows 0)
- [ ] See "Achievements" card (shows 0)
- [ ] See 4 navigation cards
- [ ] Click Statistics → Go to statistics page
- [ ] Click Game History → Go to history page
- [ ] Click Achievements → Go to achievements page
- [ ] Click Profile → Go to profile page

#### Placeholder Pages
- [ ] Statistics page shows "Coming Soon"
- [ ] History page shows "Coming Soon"
- [ ] Achievements page shows "Coming Soon"

### 8. Profile

#### Profile Page
- [ ] See user icon
- [ ] See username
- [ ] See email
- [ ] See account tier (FREE)
- [ ] See member since date

### 9. Responsive Design

#### Desktop (1024px+)
- [ ] Header shows all links
- [ ] Game board shows 4-5 columns
- [ ] Cards are large and easy to click
- [ ] Modals are centered

#### Tablet (768px - 1023px)
- [ ] Header shows all links
- [ ] Game board shows 4 columns
- [ ] Cards are medium size
- [ ] Modals are centered

#### Mobile (320px - 767px)
- [ ] Header shows mobile menu (if implemented)
- [ ] Game board shows 3-4 columns
- [ ] Cards are touch-friendly
- [ ] Modals are full-width
- [ ] Text is readable
- [ ] Buttons are easy to tap

### 10. Animations

#### Card Animations
- [ ] Cards flip smoothly (3D rotation)
- [ ] Matched cards pulse and turn green
- [ ] Cards have hover effect (desktop)
- [ ] Cards have tap feedback (mobile)

#### Modal Animations
- [ ] Start modal scales in
- [ ] Game over modal scales in
- [ ] Pause overlay fades in
- [ ] Modals scale out when closed

#### Achievement Toast
- [ ] Slides in from right
- [ ] Icon rotates and scales
- [ ] Slides out to right
- [ ] Auto-dismisses after 4 seconds

#### Confetti
- [ ] 50 colorful pieces
- [ ] Falls from top to bottom
- [ ] Rotates while falling
- [ ] Fades out at bottom

### 11. Performance

#### Load Time
- [ ] App loads in < 2 seconds
- [ ] No visible lag
- [ ] Smooth animations

#### Gameplay
- [ ] Card flips are instant
- [ ] No lag when clicking cards
- [ ] Timer updates smoothly
- [ ] Animations are smooth (60fps)

#### Memory
- [ ] No memory leaks
- [ ] Browser doesn't slow down
- [ ] Can play multiple games without issues

### 12. Error Handling

#### Form Validation
- [ ] Email validation works
- [ ] Password validation works
- [ ] Username validation works
- [ ] Error messages are clear

#### Navigation
- [ ] Invalid routes show 404 page
- [ ] 404 page has "Go Home" button
- [ ] Protected routes redirect to login

#### Game State
- [ ] Can't break game by clicking fast
- [ ] Can't flip more than 2 cards
- [ ] Can't click matched cards
- [ ] Pause/resume works correctly

## 🎯 Test Scenarios

### Scenario 1: First Time User
1. Open app
2. Register new account
3. Choose theme and difficulty
4. Play first game
5. Complete game
6. See achievement
7. Play again

### Scenario 2: Returning User
1. Open app
2. Login
3. Go to dashboard
4. View profile
5. Start new game
6. Pause game
7. Resume game
8. Complete game

### Scenario 3: Power User
1. Login
2. Play Easy mode → Complete in < 30 seconds
3. Play Medium mode → Get perfect score
4. Play Hard mode → Complete game
5. Try all 5 themes
6. Check achievements
7. View dashboard

### Scenario 4: Mobile User
1. Open on mobile device
2. Register
3. Play game with touch
4. Complete game
5. Navigate dashboard
6. Logout

## 🐛 Bug Reporting

If you find a bug, note:
1. What you were doing
2. What you expected
3. What actually happened
4. Browser and device
5. Console errors (F12)

## ✅ Success Criteria

The app passes testing if:
- [ ] All authentication flows work
- [ ] Game is fully playable
- [ ] All animations are smooth
- [ ] Responsive on all devices
- [ ] No console errors
- [ ] No broken links
- [ ] All features work as expected

## 🎉 Testing Complete!

If all tests pass, your Memory Game is ready to use!

Next steps:
1. Connect to backend API
2. Add more features
3. Deploy to production

---

**Happy Testing! 🧪**
