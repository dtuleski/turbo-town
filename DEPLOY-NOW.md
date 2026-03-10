# Deploy Frontend to AWS - Quick Guide

## ✅ Build Complete!

Your frontend has been built successfully and is ready to deploy.
The production files are in: `apps/web/dist/`

## 🚀 Deploy to AWS Amplify (5 minutes)

### Step 1: Go to AWS Amplify Console
Open this link: https://console.aws.amazon.com/amplify/

### Step 2: Create New App
1. Click **"New app"** button (top right)
2. Select **"Host web app"**
3. Choose **"Deploy without Git provider"**
4. Click **"Continue"**

### Step 3: Upload Your Build
1. Give your app a name: `memory-game`
2. For environment name: `production`
3. Drag and drop the entire `apps/web/dist` folder
   - Or click "Choose files" and select all files in `apps/web/dist/`
4. Click **"Save and deploy"**

### Step 4: Wait for Deployment (2-3 minutes)
AWS will:
- Upload your files
- Deploy to CloudFront CDN
- Generate a public URL

You'll get a URL like: `https://main.d1234abcd.amplifyapp.com`

### Step 5: Update Cognito with Your New URL

Once you have your Amplify URL, run this command (replace YOUR-AMPLIFY-URL):

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_jPkMWmBup \
  --client-id XXXXXXXXXXXXXXXXXXXXXXX \
  --callback-urls "http://localhost:3000,https://YOUR-AMPLIFY-URL" \
  --logout-urls "http://localhost:3000,https://YOUR-AMPLIFY-URL" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "email" "openid" "profile" \
  --allowed-o-auth-flows-user-pool-client
```

Example:
```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_jPkMWmBup \
  --client-id XXXXXXXXXXXXXXXXXXXXXXX \
  --callback-urls "http://localhost:3000,https://main.d1234abcd.amplifyapp.com" \
  --logout-urls "http://localhost:3000,https://main.d1234abcd.amplifyapp.com" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "email" "openid" "profile" \
  --allowed-o-auth-flows-user-pool-client
```

### Step 6: Test Your App! 🎉

Visit your Amplify URL from any device:
- ✅ Your phone
- ✅ Your tablet
- ✅ Another computer
- ✅ Share with friends!

## 🔄 Updating Your App Later

When you make changes to your frontend:

```bash
cd apps/web
npm run build
```

Then go back to Amplify Console → Your App → Click "Deploy updates" → Upload new `dist` folder

## 💰 Cost

AWS Amplify Free Tier includes:
- 1000 build minutes per month
- 15 GB served per month
- 5 GB storage

Your memory game will easily stay within the free tier!

## 🎮 Your Deployed App

- Frontend: (Your Amplify URL)
- Backend API: https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com
- Authentication: AWS Cognito (us-east-1_jPkMWmBup)
- Database: DynamoDB (8 tables)

## Need Help?

If you encounter any issues:
1. Check the Amplify Console logs
2. Verify Cognito callback URLs are correct
3. Check browser console for errors
4. Make sure you're using HTTPS (not HTTP) for the Amplify URL
