# AWS Support Ticket - Custom Domain IAM Role Error

Copy and paste this into your AWS Support case:

---

## Case Type
**Technical Support**

## Service
**AWS Amplify**

## Category
**Domain Management**

## Severity
**General guidance** (or choose based on your urgency)

---

## Subject
IAM role error when adding custom domain to Amplify app

---

## Description

Hello AWS Support Team,

I'm experiencing an issue when trying to add a custom domain to my AWS Amplify application. When I attempt to add the domain through the Amplify Console, I receive the following error:

**Error Message:**
```
The role with name AWSAmplifyDomainRole-Z09553671W8W9WKSUDBOR cannot be found.
```

### Environment Details:
- **AWS Account ID:** 848403890404
- **Region:** us-east-1
- **Amplify App URL:** https://main.d20rx51iesg0zh.amplifyapp.com
- **Custom Domain:** turbo-town.com
- **Subdomain Attempting to Add:** dev.turbo-town.com
- **Route 53 Hosted Zone ID:** Z09553671W8W9WKSUDBOR

### What I've Tried:
1. Removed and re-added the domain through Amplify Console - same error persists
2. Verified DNS records are correctly configured in Route 53
3. Confirmed the domain is registered in Route 53 and nameservers are properly configured
4. Attempted to add both the root domain and subdomain - both fail with the same IAM role error

### Current Status:
- The DNS CNAME record is correctly pointing to the Amplify app
- The domain resolves to the correct IP addresses
- However, I cannot complete the SSL certificate provisioning due to this IAM role error
- The app works perfectly on the default Amplify URL with SSL

### What I Need:
I need assistance resolving this IAM role issue so I can:
1. Successfully add my custom domain to the Amplify app
2. Have AWS Certificate Manager automatically provision an SSL certificate for the custom domain
3. Complete the domain configuration through Amplify's managed service

### Additional Context:
The IAM role name in the error message (`AWSAmplifyDomainRole-Z09553671W8W9WKSUDBOR`) appears to be auto-generated and matches my Route 53 Hosted Zone ID, but the role doesn't exist in my account. This seems to be a service-side issue that requires AWS intervention.

Could you please help resolve this IAM role issue so I can complete my custom domain setup?

Thank you for your assistance!

---

## Optional: Attachments
If you have screenshots of the error, attach them to the support case.

---

## After Submitting
1. You should receive a case number via email
2. AWS Support typically responds within 12-24 hours for general guidance cases
3. They may ask for additional information or provide a solution
4. Once resolved, you'll be able to add your custom domain with SSL through the Amplify Console

---

## Support Case URL
Create your case here: https://console.aws.amazon.com/support/home#/case/create

---

## Expected Resolution
AWS Support will either:
1. Create the missing IAM role in your account
2. Fix the service-side configuration that's causing the role lookup to fail
3. Provide alternative steps to manually configure the domain with SSL

After resolution, you should be able to add `dev.turbo-town.com` through the Amplify Console, and it will automatically:
- Request an SSL certificate from ACM
- Validate domain ownership via DNS
- Configure the certificate on your Amplify app
- Update DNS records as needed

Your custom domain will then work with HTTPS! 🎉
