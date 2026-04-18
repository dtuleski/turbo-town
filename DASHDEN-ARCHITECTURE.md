# DashDen Architecture — Complete Service Map

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USERS (Browser/Mobile)                             │
└──────────────────────────────────┬──────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌──────────────┐ ┌─────────┐ ┌──────────────┐
            │  dashden.app │ │  dev.   │ │ Squarespace  │
            │   (Vercel)   │ │dashden. │ │    (DNS)     │
            │  web-prod    │ │app      │ │  dashden.app │
            └──────┬───────┘ │(Vercel) │ └──────────────┘
                   │         │  web    │
                   │         └────┬────┘
                   └──────┬───────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AWS (Account: dashden-new / 342278407349)                │
│                                  us-east-1                                      │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                     API Gateway (HTTP API)                                │  │
│  │                     MemoryGame-API-prod                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐                 │  │
│  │  │ /auth/      │  │ /game/      │  │ /leaderboard/    │                 │  │
│  │  │ graphql     │  │ graphql     │  │ graphql          │                 │  │
│  │  │ (public)    │  │ (JWT auth)  │  │ (JWT auth)       │                 │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘                 │  │
│  └─────────┼────────────────┼──────────────────┼───────────────────────────┘  │
│            │                │                  │                               │
│            │         ┌──────┴──────┐           │                               │
│            │         │  Cognito    │           │                               │
│            │         │  JWT Auth   │           │                               │
│            │         │  User Pool  │           │                               │
│            │         │ us-east-1_  │           │                               │
│            │         │ FoWLQ5lmI   │           │                               │
│            │         └─────────────┘           │                               │
│            ▼                ▼                   ▼                               │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────┐                     │
│  │ Auth Service │ │ Game Service   │ │ Leaderboard Svc  │                     │
│  │   Lambda     │ │   Lambda       │ │   Lambda         │                     │
│  │MemoryGame-   │ │MemoryGame-     │ │MemoryGame-       │                     │
│  │AuthService-  │ │GameService-    │ │LeaderboardSvc-   │                     │
│  │prod          │ │prod            │ │prod               │                     │
│  │              │ │                │ │                    │                     │
│  │ • Register   │ │ • startGame   │ │ • getLeaderboard  │                     │
│  │ • Login      │ │ • completeGame│ │ • getUserRank     │                     │
│  │ • Profile    │ │ • Game catalog│ │ • Score history   │                     │
│  │              │ │ • Reviews     │ │ • clearRecords    │                     │
│  │              │ │ • Contact form│ │                    │                     │
│  │              │ │ • Stripe sub  │ │                    │                     │
│  └──────┬───────┘ └───┬──────┬───┘ └────────┬───────────┘                     │
│         │             │      │               │                                 │
│         │             │      │    ┌──────────┘                                 │
│         │             │      │    │                                             │
│         ▼             ▼      │    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        DynamoDB (16 tables)                             │   │
│  │                                                                         │   │
│  │  User Data          Game Data           Leaderboard        Other        │   │
│  │  ─────────          ─────────           ───────────        ─────        │   │
│  │  • users            • games             • leaderboard-     • email-     │   │
│  │  • user-settings    • catalog             entries            prefs      │   │
│  │                     • themes            • user-aggregates  • rate-      │   │
│  │  Language           • achievements      • leaderboards       limits    │   │
│  │  ────────                                 (legacy)         • rate-      │   │
│  │  • language-words   Subscriptions                            limit-    │   │
│  │  • language-        ─────────────                            buckets   │   │
│  │    progress         • subscriptions                                    │   │
│  │  • language-                                                           │   │
│  │    results                                                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│         ┌──────────────────────────────────────────────┐                       │
│         │              EventBridge                      │                       │
│         │                                               │                       │
│         │  MemoryGame-prod        game-events-prod      │                       │
│         │  (general events)       (GameCompleted →      │                       │
│         │                          Leaderboard Lambda)  │                       │
│         │                                               │                       │
│         │  DashDen-DailyDigest-Schedule                 │                       │
│         │  cron(0 12 * * ? *) → Daily Email Lambda      │                       │
│         └──────────────────────────────────────────────┘                       │
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐             │
│  │ Daily Email       │  │ Email Sender     │  │ SQS Dead Letter  │             │
│  │ Lambda            │  │ Lambda           │  │ Queue             │             │
│  │ DashDen-          │  │ DashDen-         │  │ leaderboard-dlq  │             │
│  │ DailyEmail-prod   │  │ EmailSender      │  │ MemoryGame-      │             │
│  └────────┬──────────┘  └────────┬─────────┘  │ EventDLQ         │             │
│           │                      │             └──────────────────┘             │
│           │                      │                                              │
│  ┌────────┴──────────────────────┴──────────────────────────────────────┐      │
│  │                     Other AWS Services                               │      │
│  │  • Secrets Manager — Stripe keys                                     │      │
│  │  • SES — Contact form emails (no-reply@dashden.app)                  │      │
│  │  • CloudWatch — Logs, Alarms, X-Ray tracing                         │      │
│  │  • S3 — CDK assets (cdk-hnb659fds-assets-342278407349-us-east-1)    │      │
│  └──────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                    │                │                │
                    ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          THIRD-PARTY SERVICES                                   │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Stripe     │  │   Resend     │  │  Zoho Mail   │  │   Google     │       │
│  │              │  │              │  │              │  │   OAuth      │       │
│  │ • Checkout   │  │ • Daily      │  │ • Business   │  │              │       │
│  │   sessions   │  │   digest     │  │   email      │  │ • Social     │       │
│  │ • Subscript- │  │   emails     │  │   hosting    │  │   login      │       │
│  │   ion mgmt   │  │ • From:      │  │ • @dashden   │  │   (planned)  │       │
│  │ • Webhooks   │  │   no-reply@  │  │   .app       │  │              │       │
│  │ • Customer   │  │   dashden.   │  │   mailboxes  │  │              │       │
│  │   portal     │  │   app        │  │              │  │              │       │
│  │              │  │              │  │              │  │              │       │
│  │ Tiers:       │  │              │  │              │  │              │       │
│  │ LIGHT        │  │              │  │              │  │              │       │
│  │ STANDARD     │  │              │  │              │  │              │       │
│  │ PREMIUM      │  │              │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐                                            │
│  │   GitHub     │  │   Vercel     │                                            │
│  │              │  │              │                                            │
│  │ • Source     │  │ • Frontend   │                                            │
│  │   control    │  │   hosting    │                                            │
│  │ • dtuleski/  │  │ • CDN        │                                            │
│  │   turbo-town │  │ • SSL        │                                            │
│  │              │  │ • Deploys    │                                            │
│  └──────────────┘  └──────────────┘                                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Service Inventory

### Hosting & DNS
| Service | Purpose | Account/Details |
|---------|---------|-----------------|
| Vercel | Frontend hosting (React/Vite) | Projects: `web` (dev), `web-prod` (prod) |
| Squarespace | Domain registrar & DNS | `dashden.app` |
| Zoho Mail | Business email hosting | `@dashden.app` mailboxes |

### AWS Services (Account: `dashden-new` / 342278407349)
| Service | Resource | Purpose |
|---------|----------|---------|
| Cognito | User Pool `us-east-1_FoWLQ5lmI` | User authentication, JWT tokens |
| API Gateway | `MemoryGame-API-prod` | HTTP API with JWT auth, CORS |
| Lambda | `MemoryGame-AuthService-prod` | Registration, login, profile |
| Lambda | `MemoryGame-GameService-prod` | Game sessions, scoring, catalog, reviews, contact, Stripe |
| Lambda | `MemoryGame-LeaderboardService-prod` | Leaderboard queries, rankings |
| Lambda | `DashDen-DailyEmail-prod` | Daily digest emails (8am EST) |
| Lambda | `DashDen-EmailSender` | Transactional emails |
| DynamoDB | 16 tables (`memory-game-*-prod`) | All application data |
| EventBridge | `MemoryGame-prod` | General event bus |
| EventBridge | `game-events-prod` | GameCompleted → Leaderboard |
| EventBridge | `DashDen-DailyDigest-Schedule` | Cron trigger for daily email |
| SQS | `leaderboard-dlq-prod` | Dead letter queue for failed events |
| SES | `no-reply@dashden.app` | Contact form emails |
| Secrets Manager | `prod/stripe/secret-key`, `prod/stripe/webhook-secret` | Stripe API credentials |
| CloudWatch | Logs, Alarms, X-Ray | Monitoring & observability |
| S3 | CDK assets bucket | Infrastructure deployment artifacts |

### Third-Party Services
| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| Stripe | Subscription billing | Game Service Lambda → Stripe API, Webhooks |
| Resend | Email delivery | Daily Email Lambda → Resend API |
| Google OAuth | Social login (planned) | Cognito identity provider |
| GitHub | Source control | `dtuleski/turbo-town` |

### DynamoDB Tables (16 total)
| Table | Primary Key | Purpose |
|-------|-------------|---------|
| `memory-game-users-prod` | userId | User profiles |
| `memory-game-user-settings-prod` | userId | User preferences |
| `memory-game-games-prod` | userId + gameId | Game sessions |
| `memory-game-catalog-prod` | gameId | Available games in hub |
| `memory-game-themes-prod` | themeId | Game themes/configs |
| `memory-game-achievements-prod` | userId | User achievements |
| `memory-game-leaderboards-prod` | composite | Legacy leaderboard |
| `memory-game-leaderboard-entries-prod` | composite | Score entries |
| `memory-game-user-aggregates-prod` | userId + gameType | Aggregate scores |
| `memory-game-subscriptions-prod` | userId | Stripe subscriptions |
| `memory-game-rate-limits-prod` | composite | Game rate limiting |
| `memory-game-rate-limit-buckets-prod` | composite | Leaderboard rate limiting |
| `memory-game-email-prefs-prod` | userId | Email opt-in preferences |
| `memory-game-language-words-prod` | composite | Language game word bank |
| `memory-game-language-progress-prod` | composite | Language learning progress |
| `memory-game-language-results-prod` | composite | Language game results |

### Key Data Flows
1. **User Auth**: Browser → Cognito → JWT → API Gateway → Auth Lambda → DynamoDB
2. **Game Play**: Browser → API Gateway → Game Lambda → DynamoDB + EventBridge
3. **Leaderboard**: EventBridge (GameCompleted) → Leaderboard Lambda → DynamoDB
4. **Subscriptions**: Browser → Stripe Checkout → Webhook → Game Lambda → DynamoDB
5. **Daily Email**: EventBridge Schedule → Daily Email Lambda → DynamoDB (scan) → Resend API
6. **Contact Form**: Browser → Game Lambda → AWS SES → Admin inbox

### Billing Summary
| Service | Billing Model |
|---------|---------------|
| AWS | Pay-per-use (Lambda, DynamoDB, API Gateway, etc.) |
| Vercel | Free tier / Pro plan |
| Stripe | 2.9% + $0.30 per transaction |
| Resend | Free tier (100 emails/day) or paid |
| Squarespace | Annual domain registration |
| Zoho Mail | Free tier or paid plan |
| GitHub | Free (public) or Pro |
