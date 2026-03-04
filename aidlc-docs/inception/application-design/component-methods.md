# Component Methods

## Overview
This document defines method signatures for key components. Detailed business rules and implementation logic will be specified in Functional Design (CONSTRUCTION phase).

**Note**: Only public methods and key interfaces are documented here. Internal/private methods will be defined during implementation.

---

## Frontend Component Methods

### Authentication Module

#### AuthContainer
```typescript
// Authentication operations
login(email: string, password: string): Promise<AuthResult>
loginWithSocial(provider: 'google' | 'apple' | 'facebook'): Promise<AuthResult>
register(email: string, password: string, name: string): Promise<RegisterResult>
logout(): Promise<void>
resetPassword(email: string): Promise<void>
confirmPasswordReset(code: string, newPassword: string): Promise<void>
refreshSession(): Promise<void>
getCurrentUser(): User | null
isAuthenticated(): boolean
```

---

### Game Module

#### GameContainer
```typescript
// Game lifecycle
initializeGame(themeId: string, difficulty: number): void
startGame(): void
flipCard(cardId: string): void
checkMatch(card1Id: string, card2Id: string): boolean
completeGame(): Promise<GameResult>
abandonGame(): void

// Game state
getGameState(): GameState
getTimer(): number
getAttempts(): number
getMatchedPairs(): number
getRemainingPairs(): number

// Validation
canStartGame(): Promise<boolean> // Check rate limits
validateGameCompletion(): boolean
```

#### GameBoard
```typescript
// Rendering
renderCards(cards: Card[]): JSX.Element
handleCardClick(cardId: string): void
```

#### Card
```typescript
// Card state
flip(): void
unflip(): void
markAsMatched(): void
isFlipped(): boolean
isMatched(): boolean
```

---

### Leaderboard Module

#### LeaderboardContainer
```typescript
// Data fetching
fetchLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardEntry[]>
fetchUserRank(userId: string, filters: LeaderboardFilters): Promise<number>

// Filters
setThemeFilter(themeId: string): void
setDifficultyFilter(difficulty: number): void
setTimePeriodFilter(period: 'daily' | 'weekly' | 'monthly' | 'all-time'): void
clearFilters(): void

// Pagination
loadMore(): Promise<void>
```

---

### Profile Module

#### ProfileContainer
```typescript
// Profile management
fetchProfile(): Promise<UserProfile>
updateProfile(updates: ProfileUpdates): Promise<void>
uploadProfilePicture(file: File): Promise<string>

// Settings
updateSettings(settings: UserSettings): Promise<void>
getSettings(): UserSettings

// Game history
fetchGameHistory(filters: HistoryFilters): Promise<GameHistoryEntry[]>
fetchStatistics(): Promise<UserStatistics>

// Achievements
fetchAchievements(): Promise<Achievement[]>
```

---

### Subscription Module

#### SubscriptionContainer
```typescript
// Subscription management
fetchSubscriptionTiers(): Promise<SubscriptionTier[]>
getCurrentSubscription(): Promise<Subscription | null>
createSubscription(tierId: string, billingPeriod: 'monthly' | 'annual'): Promise<StripeCheckoutSession>
upgradeSubscription(newTierId: string): Promise<void>
downgradeSubscription(newTierId: string): Promise<void>
cancelSubscription(): Promise<void>
reactivateSubscription(): Promise<void>

// Billing
fetchBillingHistory(): Promise<Invoice[]>
updatePaymentMethod(): Promise<StripeCheckoutSession>
```

---

### Home/Dashboard Module

#### DashboardContainer
```typescript
// Dashboard data
fetchDashboardData(): Promise<DashboardData>
getGamesRemaining(): Promise<number>
getRecentScores(): Promise<GameResult[]>
getQuickStats(): Promise<QuickStats>
```

---

## Backend Component Methods

### Authentication Service

#### AuthHandler (GraphQL Resolvers)
```typescript
// Mutations
register(input: RegisterInput): Promise<AuthPayload>
login(input: LoginInput): Promise<AuthPayload>
loginWithSocial(input: SocialLoginInput): Promise<AuthPayload>
logout(userId: string): Promise<boolean>
requestPasswordReset(email: string): Promise<boolean>
confirmPasswordReset(input: PasswordResetInput): Promise<boolean>
refreshToken(refreshToken: string): Promise<AuthPayload>

// Queries
getCurrentUser(userId: string): Promise<User>
verifyEmail(token: string): Promise<boolean>
```

#### UserRepository
```typescript
// CRUD operations
createUser(user: CreateUserInput): Promise<User>
getUserById(userId: string): Promise<User | null>
getUserByEmail(email: string): Promise<User | null>
updateUser(userId: string, updates: UserUpdates): Promise<User>
deleteUser(userId: string): Promise<boolean>

// Queries
findUsers(filters: UserFilters): Promise<User[]>
```

---

### Game Service

#### GameHandler (GraphQL Resolvers)
```typescript
// Mutations
startGame(input: StartGameInput): Promise<Game>
completeGame(input: CompleteGameInput): Promise<GameResult>

// Queries
getGame(gameId: string): Promise<Game>
getGameHistory(userId: string, filters: HistoryFilters): Promise<Game[]>
getUserStatistics(userId: string): Promise<UserStatistics>
canStartGame(userId: string): Promise<RateLimitStatus>
```

#### GameRepository
```typescript
// CRUD operations
createGame(game: CreateGameInput): Promise<Game>
getGameById(gameId: string): Promise<Game | null>
updateGame(gameId: string, updates: GameUpdates): Promise<Game>

// Queries
getGamesByUser(userId: string, filters: HistoryFilters): Promise<Game[]>
getUserGameCount(userId: string, timeWindow: TimeWindow): Promise<number>
```

#### RateLimiter
```typescript
// Rate limiting
checkLimit(userId: string, tier: SubscriptionTier): Promise<RateLimitStatus>
incrementUsage(userId: string): Promise<void>
getRemainingGames(userId: string, tier: SubscriptionTier): Promise<number>
resetDailyLimit(userId: string): Promise<void>
```

---

### Leaderboard Service

#### LeaderboardHandler (GraphQL Resolvers)
```typescript
// Queries
getLeaderboard(filters: LeaderboardFilters, pagination: PaginationInput): Promise<LeaderboardPage>
getUserRank(userId: string, filters: LeaderboardFilters): Promise<number>
getTopPlayers(filters: LeaderboardFilters, limit: number): Promise<LeaderboardEntry[]>
```

#### LeaderboardRepository
```typescript
// Queries
getLeaderboardEntries(filters: LeaderboardFilters, pagination: PaginationInput): Promise<LeaderboardEntry[]>
getUserRankInLeaderboard(userId: string, filters: LeaderboardFilters): Promise<number>
updateLeaderboardEntry(entry: LeaderboardEntry): Promise<void>
```

---

### Payment Service

#### PaymentHandler (GraphQL Resolvers)
```typescript
// Mutations
createSubscription(input: CreateSubscriptionInput): Promise<StripeCheckoutSession>
upgradeSubscription(input: UpgradeSubscriptionInput): Promise<Subscription>
downgradeSubscription(input: DowngradeSubscriptionInput): Promise<Subscription>
cancelSubscription(userId: string): Promise<boolean>
reactivateSubscription(userId: string): Promise<Subscription>
updatePaymentMethod(userId: string): Promise<StripeCheckoutSession>

// Queries
getSubscription(userId: string): Promise<Subscription | null>
getSubscriptionTiers(): Promise<SubscriptionTier[]>
getBillingHistory(userId: string): Promise<Invoice[]>

// Webhooks
handleStripeWebhook(event: StripeEvent): Promise<void>
```

#### SubscriptionRepository
```typescript
// CRUD operations
createSubscription(subscription: CreateSubscriptionInput): Promise<Subscription>
getSubscriptionByUserId(userId: string): Promise<Subscription | null>
updateSubscription(subscriptionId: string, updates: SubscriptionUpdates): Promise<Subscription>
cancelSubscription(subscriptionId: string): Promise<boolean>

// Queries
getActiveSubscriptions(): Promise<Subscription[]>
getSubscriptionsByTier(tierId: string): Promise<Subscription[]>
```

#### StripeClient
```typescript
// Stripe operations
createCheckoutSession(input: CheckoutSessionInput): Promise<StripeCheckoutSession>
createCustomer(email: string, name: string): Promise<StripeCustomer>
createSubscription(customerId: string, priceId: string): Promise<StripeSubscription>
updateSubscription(subscriptionId: string, updates: SubscriptionUpdates): Promise<StripeSubscription>
cancelSubscription(subscriptionId: string): Promise<StripeSubscription>
retrieveSubscription(subscriptionId: string): Promise<StripeSubscription>
listInvoices(customerId: string): Promise<StripeInvoice[]>
verifyWebhookSignature(payload: string, signature: string): StripeEvent
```

---

### Admin Service

#### AdminHandler (GraphQL Resolvers)
```typescript
// User management mutations
suspendUser(userId: string, reason: string): Promise<boolean>
unsuspendUser(userId: string): Promise<boolean>
resetUserPassword(userId: string): Promise<string>
modifyUserSubscription(input: ModifySubscriptionInput): Promise<Subscription>
issueRefund(input: RefundInput): Promise<boolean>

// User management queries
searchUsers(query: string, filters: UserFilters): Promise<User[]>
getUserDetails(userId: string): Promise<UserDetails>
getUserGameHistory(userId: string): Promise<Game[]>
getUserPaymentHistory(userId: string): Promise<Invoice[]>

// Analytics queries
getDashboardMetrics(dateRange: DateRange): Promise<DashboardMetrics>
getUserMetrics(dateRange: DateRange): Promise<UserMetrics>
getRevenueMetrics(dateRange: DateRange): Promise<RevenueMetrics>
getEngagementMetrics(dateRange: DateRange): Promise<EngagementMetrics>
```

---

### CMS Service

#### CMSHandler (GraphQL Resolvers)
```typescript
// Theme mutations
createTheme(input: CreateThemeInput): Promise<Theme>
updateTheme(themeId: string, updates: ThemeUpdates): Promise<Theme>
deleteTheme(themeId: string): Promise<boolean>
publishTheme(themeId: string): Promise<Theme>
unpublishTheme(themeId: string): Promise<Theme>
uploadThemeImage(themeId: string, file: File): Promise<string>

// Theme queries
getTheme(themeId: string): Promise<Theme>
listThemes(filters: ThemeFilters): Promise<Theme[]>
getPublishedThemes(): Promise<Theme[]>
```

#### ThemeRepository
```typescript
// CRUD operations
createTheme(theme: CreateThemeInput): Promise<Theme>
getThemeById(themeId: string): Promise<Theme | null>
updateTheme(themeId: string, updates: ThemeUpdates): Promise<Theme>
deleteTheme(themeId: string): Promise<boolean>

// Queries
listThemes(filters: ThemeFilters): Promise<Theme[]>
getPublishedThemes(): Promise<Theme[]>
getThemesByCategory(category: string): Promise<Theme[]>
```

#### S3Manager
```typescript
// S3 operations
uploadImage(file: File, path: string): Promise<string>
deleteImage(path: string): Promise<boolean>
getImageUrl(path: string): Promise<string>
listImages(prefix: string): Promise<string[]>
invalidateCache(paths: string[]): Promise<void>
```

---

## Shared Component Methods

### AuthMiddleware
```typescript
// Authentication
validateToken(token: string): Promise<TokenPayload>
verifyUserPermissions(userId: string, requiredPermissions: string[]): Promise<boolean>
requireAuth(context: GraphQLContext): Promise<User>
requireAdmin(context: GraphQLContext): Promise<User>
```

### ErrorHandler
```typescript
// Error handling
handleError(error: Error, context: ErrorContext): void
formatError(error: Error): FormattedError
logError(error: Error, context: ErrorContext): void
```

### Logger
```typescript
// Logging
info(message: string, metadata?: object): void
warn(message: string, metadata?: object): void
error(message: string, error: Error, metadata?: object): void
debug(message: string, metadata?: object): void
```

### Validator
```typescript
// Validation
validateInput(input: any, schema: ValidationSchema): ValidationResult
sanitizeInput(input: string): string
validateEmail(email: string): boolean
validatePassword(password: string): PasswordValidationResult
```

---

## Admin Dashboard Component Methods

### User Management Module

#### UserManagementContainer
```typescript
// User search and management
searchUsers(query: string, filters: UserFilters): Promise<User[]>
getUserDetails(userId: string): Promise<UserDetails>
suspendUser(userId: string, reason: string): Promise<boolean>
unsuspendUser(userId: string): Promise<boolean>
resetUserPassword(userId: string): Promise<string>
modifySubscription(userId: string, updates: SubscriptionUpdates): Promise<Subscription>
issueRefund(userId: string, amount: number, reason: string): Promise<boolean>
```

---

### Content Management Module

#### ThemeManagementContainer
```typescript
// Theme management
fetchThemes(filters: ThemeFilters): Promise<Theme[]>
createTheme(input: CreateThemeInput): Promise<Theme>
updateTheme(themeId: string, updates: ThemeUpdates): Promise<Theme>
deleteTheme(themeId: string): Promise<boolean>
publishTheme(themeId: string): Promise<Theme>
unpublishTheme(themeId: string): Promise<Theme>
uploadImage(themeId: string, file: File): Promise<string>
previewTheme(themeId: string): Promise<ThemePreview>
```

---

### Analytics Module

#### AnalyticsDashboardContainer
```typescript
// Analytics data
fetchDashboardMetrics(dateRange: DateRange): Promise<DashboardMetrics>
fetchUserMetrics(dateRange: DateRange): Promise<UserMetrics>
fetchRevenueMetrics(dateRange: DateRange): Promise<RevenueMetrics>
fetchEngagementMetrics(dateRange: DateRange): Promise<EngagementMetrics>
exportReport(reportType: string, dateRange: DateRange): Promise<Blob>
```

---

## Method Summary

**Frontend Methods**: ~80 public methods across all feature modules
**Backend Methods**: ~90 public methods across all services
**Admin Methods**: ~25 public methods

**Total**: ~195 public methods defined

**Note**: Detailed business rules, validation logic, and error handling will be specified in Functional Design during the CONSTRUCTION phase.
