# Requirements Verification Questions

Please answer the following questions to help clarify and complete the requirements for your memory game application. Fill in your answer after each [Answer]: tag using the letter choice provided.

---

## Question 1: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2: User Authentication
How should users authenticate in the application?

A) Email and password
B) Social login only (Google, Apple, Facebook)
C) Both email/password and social login
D) Anonymous for free tier, authentication required for paid tier
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 3: Backend Architecture
What backend architecture do you prefer?

A) Serverless (AWS Lambda, API Gateway, DynamoDB)
B) Traditional server (Node.js/Express, PostgreSQL/MySQL)
C) Firebase/Supabase (Backend-as-a-Service)
D) Hybrid (serverless for some services, traditional for others)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4: Mobile App Technology
How should the iOS and Android apps be built?

A) Native (Swift for iOS, Kotlin for Android)
B) React Native (single codebase for both platforms)
C) Flutter (single codebase for both platforms)
D) Progressive Web App (PWA) that works on mobile browsers
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 5: Web Frontend Framework
What web frontend framework should be used?

A) React
B) Vue.js
C) Angular
D) Svelte
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 6: Free Tier Rate Limiting
How should the "3 games every 24 hours" limit be enforced for free users?

A) IP-based tracking (no authentication required)
B) Device fingerprinting
C) Require account creation to track usage
D) Browser local storage (honor system, easily bypassed)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 7: Game State Persistence
Should game progress be saved if a user closes the app mid-game?

A) Yes, save game state and allow resume
B) No, game is lost if closed mid-game
C) Yes for paid users only, no for free users
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 8: Leaderboard Scope
What should the leaderboard structure be?

A) Single global leaderboard for all game types
B) Separate leaderboards per theme (F1 drivers, F1 tracks, etc.)
C) Separate leaderboards per difficulty level (12 pairs, 24 pairs, etc.)
D) Multiple leaderboards (by theme AND difficulty)
X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question 9: Leaderboard Time Period
Should leaderboards show all-time rankings or time-based rankings?

A) All-time only
B) Daily, weekly, monthly, and all-time
C) Weekly and all-time
D) Monthly and all-time
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 10: Subscription Management
How should users manage their paid subscriptions?

A) Through Stripe Customer Portal (Stripe-hosted)
B) Custom in-app subscription management UI
C) Both Stripe portal and in-app UI
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 11: Payment Model
Should the paid tiers be subscription-based or one-time purchase?

A) Monthly subscription only (as specified: $1.99, $5.99, $9.99/month)
B) Offer both monthly and annual subscriptions (with annual discount)
C) One-time lifetime purchase option
D) Monthly subscription with option to upgrade to lifetime
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 12: Card Matching Logic
For the F1 drivers theme, you mentioned matching drivers from the same team. Should this be:

A) Exact team matching (both drivers must be from same team)
B) Any two drivers from the same team can match (if team has 2+ drivers)
C) Pre-defined pairs only (specific driver pairs)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 13: Theme Content Management
How should theme content (images, data) be managed?

A) Hardcoded in the application
B) Content Management System (CMS) for easy updates
C) JSON configuration files that can be updated without app redeployment
D) Mix of hardcoded free themes and CMS-managed paid themes
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 14: Offline Functionality
Should the app work offline?

A) Yes, full offline support with sync when online
B) Partial offline (can play games offline, but no leaderboard/stats)
C) No, requires internet connection
D) Offline for free tier only, online required for paid features
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 15: Accessibility Requirements
What accessibility features should be included?

A) Basic accessibility (screen reader support, keyboard navigation)
B) Comprehensive accessibility (WCAG 2.1 AA compliance)
C) Enhanced accessibility (colorblind modes, adjustable text sizes, audio cues)
D) Minimal accessibility (focus on core functionality first)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 16: Analytics and Tracking
What analytics should be tracked?

A) Basic usage analytics (games played, completion rates)
B) Comprehensive analytics (user behavior, theme popularity, conversion tracking)
C) Minimal analytics (privacy-focused, aggregate data only)
D) No analytics
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 17: Multiplayer Features
Should the game support multiplayer or competitive features?

A) No, single-player only
B) Yes, real-time multiplayer (race against another player)
C) Yes, asynchronous challenges (challenge a friend, they play later)
D) Future consideration, not in initial release
X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question 18: Age Verification
Since the app is targeted at kids, should there be age verification or parental controls?

A) Yes, require parental consent for users under 13 (COPPA compliance)
B) Yes, age gate but no parental consent required
C) No age verification needed
D) Age verification for payment only
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 19: Data Privacy and GDPR
What data privacy compliance is required?

A) Full GDPR compliance (EU users)
B) CCPA compliance (California users)
C) Both GDPR and CCPA
D) Basic privacy policy, no specific regional compliance
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 20: Hosting and Infrastructure
Where should the application be hosted?

A) AWS (Amazon Web Services)
B) Google Cloud Platform
C) Microsoft Azure
D) Vercel/Netlify for web, Firebase for backend
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 21: Additional Sports Themes
You requested suggestions for sports themes appealing to kids. Which of these should be included?

A) Soccer/Football (match players to their club teams)
B) Basketball (match NBA players to teams)
C) Baseball (match MLB players to teams)
D) All of the above
E) Let me suggest specific themes after [Answer]: tag
X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Question 22: Game Difficulty Progression
Should the game difficulty increase as players progress?

A) Yes, automatically increase difficulty based on performance
B) Yes, but let users choose difficulty level
C) No, difficulty is based solely on number of pairs selected
D) Yes for paid tier, fixed difficulty for free tier
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 23: Sound and Music
Should the game include sound effects and background music?

A) Yes, both sound effects and background music
B) Sound effects only
C) Optional (user can enable/disable)
D) No audio
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 24: Rewards and Achievements
Should the game include rewards, badges, or achievement systems?

A) Yes, comprehensive achievement system with badges
B) Yes, simple achievements for paid users only
C) No, leaderboard is sufficient motivation
D) Future consideration, not in initial release
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 25: Admin Dashboard
Do you need an admin dashboard to manage users, themes, and analytics?

A) Yes, comprehensive admin dashboard
B) Yes, basic admin panel for content management
C) No, use third-party tools (Stripe dashboard, analytics tools)
D) Future consideration, not in initial release
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

**Instructions**: Please fill in your answer choice (A, B, C, D, E, or X) after each [Answer]: tag. If you choose X (Other), please provide a brief description of your preference. Let me know when you've completed all questions.
