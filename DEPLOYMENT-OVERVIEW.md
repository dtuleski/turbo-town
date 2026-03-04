# Deployment Overview

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR COMPUTER                            │
│                                                              │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │   Frontend       │              │   Backend        │    │
│  │   (React App)    │              │   (Not Deployed) │    │
│  │                  │              │                  │    │
│  │  localhost:3000  │─────X────────│  Mock Data       │    │
│  │                  │              │                  │    │
│  └──────────────────┘              └──────────────────┘    │
│         ✅ Working                        ❌ Local Only      │
└─────────────────────────────────────────────────────────────┘
```

## Target Architecture (After Deployment)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          YOUR COMPUTER                                   │
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │   Frontend       │                                                   │
│  │   (React App)    │                                                   │
│  │                  │                                                   │
│  │  localhost:3000  │───────────────────┐                              │
│  │                  │                   │                              │
│  └──────────────────┘                   │                              │
│         ✅ Working                        │                              │
└──────────────────────────────────────────┼──────────────────────────────┘
                                          │
                                          │ HTTPS
                                          │
┌──────────────────────────────────────────┼──────────────────────────────┐
│                         AWS CLOUD        ▼                               │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │                    AppSync GraphQL API                      │        │
│  │              (Single endpoint for all operations)           │        │
│  └────────────────────────────────────────────────────────────┘        │
│                          │                    │                         │
│                          │                    │                         │
│              ┌───────────┴──────┐   ┌────────┴──────────┐             │
│              │                  │   │                   │             │
│  ┌───────────▼──────────┐  ┌───▼────────────┐  ┌──────▼──────────┐  │
│  │   AWS Cognito        │  │  Auth Lambda   │  │  Game Lambda    │  │
│  │   (Authentication)   │  │  (User Mgmt)   │  │  (Gameplay)     │  │
│  │                      │  │                │  │                 │  │
│  │  • User Pool         │  │  • Login       │  │  • Start Game   │  │
│  │  • Email Verify      │  │  • Register    │  │  • Complete     │  │
│  │  • Password Reset    │  │  • Profile     │  │  • History      │  │
│  └──────────────────────┘  └────────────────┘  └─────────────────┘  │
│                                     │                    │             │
│                                     │                    │             │
│                          ┌──────────┴────────────────────┘             │
│                          │                                             │
│  ┌───────────────────────▼─────────────────────────────────────────┐ │
│  │                    DynamoDB Tables                               │ │
│  │                                                                  │ │
│  │  • Users          • Games         • Leaderboards                │ │
│  │  • Subscriptions  • Themes        • Achievements                │ │
│  │  • RateLimits     • UserSettings                                │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    CloudWatch Monitoring                          │ │
│  │  • Logs  • Metrics  • Alarms  • Dashboards                       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PROCESS                            │
└─────────────────────────────────────────────────────────────────┘

Step 1: Build Services
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Shared     │───▶│     Auth     │───▶│     Game     │
│   Package    │    │   Service    │    │   Service    │
└──────────────┘    └──────────────┘    └──────────────┘
   TypeScript          TypeScript          TypeScript
      ↓                    ↓                    ↓
   JavaScript          JavaScript          JavaScript
   (compiled)          (compiled)          (compiled)

Step 2: Deploy Infrastructure (CDK)
┌──────────────┐
│   Database   │  ← Creates 8 DynamoDB tables
└──────┬───────┘
       │
┌──────▼───────┐
│   Cognito    │  ← Creates User Pool + Client
└──────┬───────┘
       │
┌──────▼───────┐
│  EventBridge │  ← Creates Event Bus
└──────┬───────┘
       │
┌──────▼───────┐
│    Lambda    │  ← Deploys Auth + Game functions
└──────┬───────┘
       │
┌──────▼───────┐
│     API      │  ← Creates AppSync GraphQL API
└──────┬───────┘
       │
┌──────▼───────┐
│  Monitoring  │  ← Sets up CloudWatch alarms
└──────────────┘

Step 3: Configure Frontend
┌──────────────────┐
│  CDK Outputs     │  ← API URL, Cognito IDs, Region
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  .env.local      │  ← Frontend environment variables
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Restart Dev     │  ← Frontend now uses real backend
│  Server          │
└──────────────────┘
```

## Data Flow (After Deployment)

### User Registration Flow
```
Frontend                AppSync              Cognito           DynamoDB
   │                       │                    │                 │
   │  Register Request     │                    │                 │
   ├──────────────────────▶│                    │                 │
   │                       │  Create User       │                 │
   │                       ├───────────────────▶│                 │
   │                       │                    │                 │
   │                       │  User Created      │                 │
   │                       │◀───────────────────┤                 │
   │                       │                    │                 │
   │                       │  Save User Data    │                 │
   │                       ├────────────────────┼────────────────▶│
   │                       │                    │                 │
   │  Success Response     │                    │                 │
   │◀──────────────────────┤                    │                 │
   │                       │                    │                 │
   │  Verification Email   │                    │                 │
   │◀──────────────────────┼────────────────────┤                 │
```

### Game Play Flow
```
Frontend                AppSync              Lambda            DynamoDB
   │                       │                    │                 │
   │  Start Game           │                    │                 │
   ├──────────────────────▶│                    │                 │
   │                       │  Invoke Game       │                 │
   │                       │  Lambda            │                 │
   │                       ├───────────────────▶│                 │
   │                       │                    │  Check Rate     │
   │                       │                    │  Limit          │
   │                       │                    ├────────────────▶│
   │                       │                    │                 │
   │                       │                    │  Create Game    │
   │                       │                    ├────────────────▶│
   │                       │                    │                 │
   │                       │  Game Data         │                 │
   │                       │◀───────────────────┤                 │
   │  Game Started         │                    │                 │
   │◀──────────────────────┤                    │                 │
   │                       │                    │                 │
   │  [User plays game]    │                    │                 │
   │                       │                    │                 │
   │  Complete Game        │                    │                 │
   ├──────────────────────▶│                    │                 │
   │                       │  Invoke Game       │                 │
   │                       │  Lambda            │                 │
   │                       ├───────────────────▶│                 │
   │                       │                    │  Calculate      │
   │                       │                    │  Score          │
   │                       │                    │                 │
   │                       │                    │  Save Result    │
   │                       │                    ├────────────────▶│
   │                       │                    │                 │
   │                       │                    │  Update         │
   │                       │                    │  Achievements   │
   │                       │                    ├────────────────▶│
   │                       │                    │                 │
   │                       │  Result + Score    │                 │
   │                       │◀───────────────────┤                 │
   │  Game Complete        │                    │                 │
   │◀──────────────────────┤                    │                 │
```

## What Changes in Your Frontend

### Before Deployment (Mock Data)
```typescript
// apps/web/src/context/AuthContext.tsx
const login = async (input: LoginInput) => {
  // Mock user - works offline
  const mockUser = {
    id: '1',
    email: input.email,
    username: input.email.split('@')[0],
    tier: 'FREE',
  }
  setUser(mockUser)
}
```

### After Deployment (Real Backend)
```typescript
// apps/web/src/context/AuthContext.tsx
import { Auth } from 'aws-amplify'

const login = async (input: LoginInput) => {
  // Real authentication with Cognito
  const user = await Auth.signIn(input.email, input.password)
  setUser(user)
}
```

## Deployment Scripts

### Main Deployment Script
```bash
./deploy-backend.sh dev
```

**What it does:**
1. ✅ Checks prerequisites (AWS CLI, CDK, Node.js)
2. ✅ Builds shared package
3. ✅ Builds auth service
4. ✅ Builds game service
5. ✅ Bootstraps CDK (if needed)
6. ✅ Deploys all infrastructure stacks
7. ✅ Saves outputs to `infrastructure/cdk-outputs.json`

**Time:** 15-20 minutes

### Frontend Configuration Script
```bash
./configure-frontend.sh
```

**What it does:**
1. ✅ Reads `infrastructure/cdk-outputs.json`
2. ✅ Creates `apps/web/.env.local`
3. ✅ Populates with API URL, Cognito IDs, Region

**Time:** 30 seconds

## File Structure

```
project-root/
├── START-HERE.md                    ← 👈 Start here!
├── QUICK-DEPLOY.md                  ← Quick reference
├── BACKEND-DEPLOYMENT-QUICKSTART.md ← Detailed guide
├── DEPLOYMENT-CHECKLIST.md          ← Track progress
├── DEPLOYMENT-OVERVIEW.md           ← This file
├── deploy-backend.sh                ← Main deployment script
├── configure-frontend.sh            ← Frontend config script
│
├── apps/web/                        ← Frontend (React)
│   ├── .env.local                   ← Created by configure-frontend.sh
│   └── src/
│
├── services/                        ← Backend services
│   ├── auth/                        ← Authentication service
│   └── game/                        ← Game service
│
├── infrastructure/                  ← AWS CDK
│   ├── lib/stacks/                  ← Infrastructure stacks
│   └── cdk-outputs.json             ← Created by deployment
│
└── packages/shared/                 ← Shared code
```

## Success Metrics

After deployment, you should see:

### In AWS Console
- ✅ 8 DynamoDB tables
- ✅ 1 Cognito User Pool
- ✅ 2 Lambda functions
- ✅ 1 AppSync API
- ✅ CloudWatch log groups

### In Your Frontend
- ✅ Real user registration
- ✅ Email verification
- ✅ Real authentication
- ✅ Games saved to database
- ✅ Game history persisted

### In Browser DevTools
- ✅ API calls to AppSync (not mock)
- ✅ JWT tokens in requests
- ✅ No CORS errors
- ✅ Successful GraphQL responses

## Cost Breakdown

| Service | Free Tier | Expected Cost (Dev) |
|---------|-----------|---------------------|
| DynamoDB | 25 GB storage | $1-3/month |
| Lambda | 1M requests/month | $0-1/month |
| AppSync | 250k queries/month | $0-2/month |
| Cognito | 50k MAU | $0/month |
| CloudWatch | 5 GB logs | $0-2/month |
| **Total** | | **$1-8/month** |

## Next Steps

1. **Deploy**: Run `./deploy-backend.sh dev`
2. **Configure**: Run `./configure-frontend.sh`
3. **Test**: Register, login, play games
4. **Build More**: Add remaining services (leaderboard, payment, etc.)
5. **Production**: Deploy with `./deploy-backend.sh prod`

---

**Ready to deploy? Start with `START-HERE.md`**
