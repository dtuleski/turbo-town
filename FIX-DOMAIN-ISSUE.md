# Fix Amplify Domain IAM Role Issue

## The Problem
Amplify is looking for an IAM role `AWSAmplifyDomainRole-Z09553671W8W9WKSUDBOR` that doesn't exist. This is a known Amplify bug that happens when domain setup fails partway through.

## Solution Options

### Option 1: Contact AWS Support (Recommended)
This is an AWS service issue that requires AWS Support to fix:

1. Go to AWS Support Center: https://console.aws.amazon.com/support/
2. Create a case:
   - Type: **Technical Support**
   - Service: **AWS Amplify**
   - Category: **Domain Management**
   - Subject: "IAM role error when adding custom domain"
   - Description:
     ```
     I'm trying to add the custom domain turbo-town.com to my Amplify app,
     but I'm getting this error:
     
     "The role with name AWSAmplifyDomainRole-Z09553671W8W9WKSUDBOR cannot be found"
     
     App ID: [your app ID]
     Region: us-east-1
     Domain: turbo-town.com
     
     Please help resolve this IAM role issue.
     ```

AWS Support typically responds within 24 hours and can fix this on their end.

### Option 2: Manual DNS Configuration (Workaround)
Instead of using Amplify's automatic domain setup, configure DNS manually:

1. **Remove domain from Amplify** (if not already done)

2. **Get CloudFront distribution domain**:
   - In Amplify Console, note your app URL: `main.d20rx51iesg0zh.amplifyapp.com`
   - This is backed by CloudFront

3. **Update Route 53 DNS manually**:
   ```bash
   # Get your hosted zone ID
   aws route53 list-hosted-zones --query "HostedZones[?Name=='turbo-town.com.'].Id" --output text
   
   # Create DNS records pointing to Amplify
   # (You'll need to create a JSON file with the record configuration)
   ```

4. **Create CNAME record**:
   - Go to Route 53: https://console.aws.amazon.com/route53/
   - Click on `turbo-town.com` hosted zone
   - Click **"Create record"**
   - Record name: `www`
   - Record type: `CNAME`
   - Value: `main.d20rx51iesg0zh.amplifyapp.com`
   - Click **"Create records"**

5. **Create ALIAS record for root domain**:
   - Click **"Create record"**
   - Record name: (leave empty for root)
   - Record type: `A`
   - Toggle **"Alias"** to ON
   - Route traffic to: **Alias to CloudFront distribution**
   - Choose the distribution (should auto-populate)
   - Click **"Create records"**

**Note**: This workaround won't give you an SSL certificate automatically. You'd need to:
- Request a certificate in AWS Certificate Manager
- Attach it to the CloudFront distribution

### Option 3: Use Amplify URL (Current Working Solution)
Your app is fully functional at:
**https://main.d20rx51iesg0zh.amplifyapp.com**

This URL:
- ✅ Has HTTPS/SSL
- ✅ Works on all devices
- ✅ Has automatic deployments
- ✅ All features working

You can use this URL while waiting for AWS Support to fix the domain issue.

## Recommended Approach

**For now**: Use the Amplify URL (https://main.d20rx51iesg0zh.amplifyapp.com)

**Later**: Contact AWS Support to fix the IAM role issue properly

The custom domain is nice to have, but your app is production-ready and fully functional with the Amplify URL!

## Alternative: Use a Different Domain
If you have another domain or want to try a subdomain:
- Try `app.turbo-town.com` instead of the root domain
- Or use a completely different domain

Sometimes subdomains work when root domains have issues.
