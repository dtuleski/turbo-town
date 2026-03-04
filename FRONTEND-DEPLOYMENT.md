# Frontend Deployment to AWS Amplify

## Prerequisites
- AWS CLI configured (already done ✓)
- Frontend working locally (already done ✓)
- Backend deployed to AWS (already done ✓)

## Step 1: Build the Frontend

```bash
cd apps/web
npm run build
```

This creates an optimized production build in `apps/web/dist/`.

## Step 2: Deploy to AWS Amplify

### Option A: Using Amplify CLI (Recommended)

1. Install Amplify CLI globally:
```bash
npm install -g @aws-amplify/cli
```

2. Initialize Amplify in your project:
```bash
cd apps/web
amplify init
```

Follow the prompts:
- Enter a name for the project: `memory-game`
- Enter a name for the environment: `prod`
- Choose your default editor: (your choice)
- Choose the type of app: `javascript`
- What javascript framework: `react`
- Source Directory Path: `src`
- Distribution Directory Path: `dist`
- Build Command: `npm run build`
- Start Command: `npm run dev`
- Do you want to use an AWS profile? `Yes`
- Please choose the profile you want to use: `default`

3. Add hosting:
```bash
amplify add hosting
```

Choose:
- Select the plugin module: `Hosting with Amplify Console`
- Choose a type: `Manual deployment`

4. Publish your app:
```bash
amplify publish
```

This will:
- Build your app
- Upload to Amplify
- Provide you with a public URL (e.g., `https://main.d1234abcd.amplifyapp.com`)

### Option B: Using AWS Console (Alternative)

1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/
2. Click "New app" → "Host web app"
3. Choose "Deploy without Git provider"
4. Drag and drop your `apps/web/dist` folder (after running `npm run build`)
5. Click "Save and deploy"

## Step 3: Update Cognito Redirect URLs

After deployment, you'll get a URL like `https://main.d1234abcd.amplifyapp.com`. You need to add this to Cognito:

```bash
# Get your Cognito User Pool ID
aws cognito-idp describe-user-pool --user-pool-id us-east-1_jPkMWmBup

# Update the app client with the new URL
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_jPkMWmBup \
  --client-id 282nlnkslo1ttfsg1qfj5r2a54 \
  --callback-urls "http://localhost:3000,https://YOUR-AMPLIFY-URL" \
  --logout-urls "http://localhost:3000,https://YOUR-AMPLIFY-URL" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "email" "openid" "profile" \
  --allowed-o-auth-flows-user-pool-client
```

Replace `YOUR-AMPLIFY-URL` with your actual Amplify URL.

## Step 4: Access Your App

Visit your Amplify URL from any device! Your app is now:
- ✅ Hosted on AWS with HTTPS
- ✅ Accessible from any device
- ✅ Connected to your backend APIs
- ✅ Using Cognito authentication

## Updating Your App

Whenever you make changes:

```bash
cd apps/web
npm run build
amplify publish
```

## Custom Domain (Optional)

To use your own domain (e.g., `memorygame.com`):

1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Follow the instructions to configure DNS

## Cost Estimate

AWS Amplify Hosting pricing:
- Build & deploy: $0.01 per build minute
- Hosting: $0.15 per GB served
- Free tier: 1000 build minutes/month, 15 GB served/month

For a small game like this, you'll likely stay within the free tier!
