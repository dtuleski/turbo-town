# Amplify Automated Deployment Guide

## Option 1: Git-Based Auto Deploy (Recommended)

Connect your Amplify app to a Git repository (GitHub, GitLab, Bitbucket, or CodeCommit). Every push to your branch automatically triggers a build and deployment.

### Setup Steps:

1. **Push your code to a Git repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR-USERNAME/memory-game.git
   git push -u origin main
   ```

2. **Connect Amplify to Git**:
   - Go to: https://console.aws.amazon.com/amplify/
   - Click on your app: `memory-game`
   - Click **"App settings"** → **"General"**
   - Click **"Edit"** next to "Repository"
   - Choose your Git provider (GitHub, GitLab, etc.)
   - Authorize AWS Amplify to access your repository
   - Select your repository and branch (e.g., `main`)

3. **Configure Build Settings**:
   
   Amplify will auto-detect your build settings, but you can customize them:
   
   ```yaml
   version: 1
   applications:
     - frontend:
         phases:
           preBuild:
             commands:
               - cd apps/web
               - npm ci
           build:
             commands:
               - npm run build
         artifacts:
           baseDirectory: apps/web/dist
           files:
             - '**/*'
         cache:
           paths:
             - node_modules/**/*
   ```

4. **Save and Deploy**:
   - Click **"Save and deploy"**
   - Amplify will now automatically deploy on every push!

### How It Works:
- Push code → Amplify detects change → Runs build → Deploys automatically
- Build logs available in Amplify Console
- Automatic rollback on build failures
- Preview deployments for pull requests (optional)

---

## Option 2: AWS CLI Script (Manual Trigger)

For manual deployments via command line:

### Setup:

1. **Get your Amplify App ID**:
   ```bash
   aws amplify list-apps --query "apps[?name=='memory-game'].appId" --output text
   ```

2. **Create deployment script**:
   ```bash
   # Save as: deploy-to-amplify.sh
   #!/bin/bash
   
   APP_ID="d34tkjkm4o0zpa"
   BRANCH_NAME="main"
   
   echo "Building frontend..."
   cd apps/web
   npm run build
   
   echo "Creating deployment..."
   DEPLOYMENT=$(aws amplify create-deployment \
     --app-id $APP_ID \
     --branch-name $BRANCH_NAME \
     --query 'jobId' \
     --output text)
   
   echo "Deployment created: $DEPLOYMENT"
   
   echo "Uploading files..."
   cd dist
   zip -r ../deployment.zip .
   cd ..
   
   aws amplify start-deployment \
     --app-id $APP_ID \
     --branch-name $BRANCH_NAME \
     --job-id $DEPLOYMENT \
     --source-url deployment.zip
   
   echo "Deployment started!"
   echo "Check status at: https://console.aws.amazon.com/amplify/"
   ```

3. **Make it executable**:
   ```bash
   chmod +x deploy-to-amplify.sh
   ```

4. **Run it**:
   ```bash
   ./deploy-to-amplify.sh
   ```

---

## Option 3: GitHub Actions (CI/CD Pipeline)

Automate with GitHub Actions for more control:

### Setup:

1. **Create `.github/workflows/deploy.yml`**:
   ```yaml
   name: Deploy to Amplify
   
   on:
     push:
       branches: [main]
       paths:
         - 'apps/web/**'
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '20'
             cache: 'npm'
             cache-dependency-path: apps/web/package-lock.json
         
         - name: Install dependencies
           run: |
             cd apps/web
             npm ci
         
         - name: Build
           run: |
             cd apps/web
             npm run build
         
         - name: Configure AWS credentials
           uses: aws-actions/configure-aws-credentials@v2
           with:
             aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
             aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
             aws-region: us-east-1
         
         - name: Deploy to Amplify
           run: |
             cd apps/web/dist
             zip -r deployment.zip .
             aws amplify create-deployment \
               --app-id d34tkjkm4o0zpa \
               --branch-name main
   ```

2. **Add AWS credentials to GitHub Secrets**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add `AWS_ACCESS_KEY_ID`
   - Add `AWS_SECRET_ACCESS_KEY`

3. **Push to trigger deployment**:
   ```bash
   git add .
   git commit -m "Setup auto deploy"
   git push
   ```

---

## Option 4: Amplify Build Spec (In-Console)

If you're using Git integration, customize the build in Amplify Console:

1. Go to: https://console.aws.amazon.com/amplify/
2. Click your app → **"Build settings"**
3. Edit the `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd apps/web
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: apps/web/dist
    files:
      - '**/*'
  cache:
    paths:
      - apps/web/node_modules/**/*
```

---

## Comparison

| Method | Automation | Setup Complexity | Best For |
|--------|-----------|------------------|----------|
| **Git Integration** | ✅ Full | Easy | Most users |
| **AWS CLI Script** | ⚠️ Manual | Medium | Quick deploys |
| **GitHub Actions** | ✅ Full | Medium | Advanced CI/CD |
| **Build Spec** | ✅ Full | Easy | Git users |

---

## Recommended: Git Integration

For your use case, I recommend **Option 1 (Git Integration)**:

1. Push your code to GitHub/GitLab
2. Connect Amplify to your repository
3. Every push automatically deploys
4. No manual steps needed

### Quick Start:

```bash
# 1. Create GitHub repo (do this on github.com first)

# 2. Push your code
git init
git add .
git commit -m "Memory game - ready for auto deploy"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/memory-game.git
git push -u origin main

# 3. Connect in Amplify Console (web UI)
# 4. Done! Future pushes auto-deploy
```

---

## Testing Auto Deploy

After setup:
```bash
# Make a change
echo "// test" >> apps/web/src/App.tsx

# Commit and push
git add .
git commit -m "Test auto deploy"
git push

# Watch deployment in Amplify Console
# https://console.aws.amazon.com/amplify/
```

Your app will automatically rebuild and deploy in 2-3 minutes!
