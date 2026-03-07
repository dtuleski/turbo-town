# Custom Domain SSL Certificate Fix

## Current Situation
- ✅ DNS is resolving correctly: `dev.turbo-town.com` → Amplify app
- ❌ SSL certificate error: Certificate is for `*.amplifyapp.com`, not `dev.turbo-town.com`
- ❌ Amplify Console shows IAM role error when trying to add custom domain

## Why This Happens
When you use a CNAME to point to Amplify, the SSL certificate doesn't match your custom domain. Amplify needs to:
1. Request an SSL certificate from AWS Certificate Manager (ACM) for your domain
2. Validate domain ownership
3. Attach the certificate to your app

This process requires the IAM role that's currently missing.

## Solution Options

### Option 1: Contact AWS Support (Best for Production)
This is the proper fix for the IAM role issue:

1. **Open AWS Support Case**:
   - Go to: https://console.aws.amazon.com/support/
   - Click **"Create case"**
   - Case type: **Technical Support**
   - Service: **AWS Amplify**
   - Category: **Domain Management**

2. **Case Details**:
   ```
   Subject: IAM role error when adding custom domain to Amplify app
   
   Description:
   I'm trying to add the custom domain "dev.turbo-town.com" to my Amplify app,
   but I'm getting this error:
   
   "The role with name AWSAmplifyDomainRole-Z09553671W8W9WKSUDBOR cannot be found"
   
   App URL: https://main.d20rx51iesg0zh.amplifyapp.com
   Region: us-east-1
   Domain: turbo-town.com
   Subdomain: dev.turbo-town.com
   Route 53 Hosted Zone ID: Z09553671W8W9WKSUDBOR
   
   The DNS records are configured correctly in Route 53, but I cannot complete
   the custom domain setup in Amplify Console due to this IAM role error.
   
   Please help resolve this issue so I can add SSL certificate for my custom domain.
   ```

3. **Expected Response Time**: 12-24 hours
4. **Resolution**: AWS Support will fix the IAM role issue on their end

### Option 2: Use Root Domain Instead (Quick Workaround)
Try using the root domain `turbo-town.com` instead of the subdomain:

1. **In Amplify Console**:
   - Go to: https://console.aws.amazon.com/amplify/
   - Find your app (search for `d20rx51iesg0zh`)
   - Click **"Domain management"**
   - Click **"Add domain"**
   - Enter: `turbo-town.com`
   - Select: **"Use Route 53 to configure DNS"**
   - Click **"Save"**

2. **If it works**:
   - Amplify will automatically create SSL certificate
   - DNS records will be updated
   - You'll have: `https://turbo-town.com` (with SSL)

3. **If it fails with same error**:
   - Proceed to Option 3 or contact AWS Support

### Option 3: Manual CloudFront + ACM Setup (Advanced)
Set up SSL certificate manually using CloudFront and ACM:

#### Step 1: Request SSL Certificate
```bash
# Request certificate for your domain
aws acm request-certificate \
  --domain-name dev.turbo-town.com \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text
```

Save the Certificate ARN that's returned.

#### Step 2: Get Validation Records
```bash
# Replace with your certificate ARN
CERT_ARN="arn:aws:acm:us-east-1:848403890404:certificate/YOUR-CERT-ID"

aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

#### Step 3: Add Validation Record to Route 53
```bash
# Create validation record (use values from previous command)
cat > /tmp/cert-validation.json << 'EOF'
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_VALIDATION_NAME_FROM_PREVIOUS_COMMAND",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "_VALIDATION_VALUE_FROM_PREVIOUS_COMMAND"
          }
        ]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id Z09553671W8W9WKSUDBOR \
  --change-batch file:///tmp/cert-validation.json
```

#### Step 4: Wait for Certificate Validation
```bash
# Check certificate status (wait until ISSUED)
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status'
```

This can take 5-30 minutes.

#### Step 5: Create CloudFront Distribution
This is complex and requires:
- Creating a CloudFront distribution
- Pointing it to your Amplify app
- Attaching the SSL certificate
- Updating DNS to point to CloudFront

**Note**: This is quite involved. I recommend Option 1 (AWS Support) instead.

### Option 4: Use Amplify URL (Current Working Solution)
Your app is fully functional with SSL at:
**https://main.d20rx51iesg0zh.amplifyapp.com**

This URL:
- ✅ Has valid SSL certificate
- ✅ Works on all devices
- ✅ All features working
- ✅ Automatic deployments
- ✅ No configuration needed

You can use this URL while waiting for AWS Support to fix the custom domain issue.

## Recommended Approach

**For immediate use**: Use the Amplify URL (https://main.d20rx51iesg0zh.amplifyapp.com)

**For custom domain**: Contact AWS Support (Option 1) - they can fix the IAM role issue in 12-24 hours

**Alternative**: Try Option 2 (root domain) - might work even if subdomain doesn't

## Why Not Just Use CNAME?
A CNAME alone doesn't provide SSL for your custom domain because:
- SSL certificates are domain-specific
- Amplify's certificate is for `*.amplifyapp.com`
- Your browser sees `dev.turbo-town.com` but gets a certificate for `*.amplifyapp.com`
- This is a security mismatch (hence the error)

To use a custom domain with SSL, you need:
1. A certificate for YOUR domain (`dev.turbo-town.com`)
2. That certificate attached to the service serving your app
3. This is what Amplify's "Add domain" feature does automatically

## Current Status Summary
- ✅ App is deployed and working
- ✅ DNS is configured correctly
- ✅ Cognito callbacks updated
- ✅ CORS configured
- ✅ SSL works on Amplify URL
- ❌ Custom domain SSL blocked by IAM role issue
- 🔧 **Action needed**: Contact AWS Support OR use Amplify URL

## Quick Decision Matrix

| Priority | Recommendation |
|----------|---------------|
| **Need it working NOW** | Use Amplify URL (https://main.d20rx51iesg0zh.amplifyapp.com) |
| **Want custom domain** | Contact AWS Support (12-24 hour fix) |
| **Can't wait for support** | Try root domain (turbo-town.com) instead of subdomain |
| **Advanced user** | Manual CloudFront + ACM setup (Option 3) |

The Amplify URL is production-ready and works perfectly - the custom domain is just a nice-to-have!
