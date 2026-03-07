# DNS Resolution Issue - SOLVED

## The Problem
Your custom domain `dev.turbo-town.com` is configured correctly in Route 53, but it's not resolving properly on your computer. The issue is with your ISP's DNS servers (AT&T DNS at 12.127.16.68).

## Root Cause
- Route 53 has the correct CNAME record: `dev.turbo-town.com` → `main.d20rx51iesg0zh.amplifyapp.com`
- AT&T's DNS servers are either:
  - Caching an old/incorrect record
  - Filtering/hijacking DNS queries
  - Returning `208.91.112.55` (a Fortinet IP) instead of following the CNAME

## Verification
Using Cloudflare's public DNS, the domain resolves correctly:
```bash
# Correct resolution via Cloudflare DNS
curl -H "accept: application/dns-json" \
  "https://cloudflare-dns.com/dns-query?name=dev.turbo-town.com&type=A"

# Returns: 18.64.236.73, 18.64.236.23, 18.64.236.80, 18.64.236.46 (AWS IPs) ✅
```

## Solution: Change Your DNS Settings

### Option 1: Use Cloudflare DNS (Recommended)
1. Open **System Settings** → **Network**
2. Select your active network connection (Wi-Fi or Ethernet)
3. Click **Details...**
4. Go to the **DNS** tab
5. Click the **+** button and add these DNS servers:
   - `1.1.1.1` (Cloudflare primary)
   - `1.0.0.1` (Cloudflare secondary)
6. Remove the AT&T DNS server (`12.127.16.68`)
7. Click **OK** and **Apply**

### Option 2: Use Google DNS
Same steps as above, but use:
- `8.8.8.8` (Google primary)
- `8.8.4.4` (Google secondary)

### After Changing DNS
1. Flush your DNS cache:
   ```bash
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   ```

2. Wait 30 seconds, then test:
   ```bash
   dig dev.turbo-town.com +short
   ```
   
   Should return AWS IPs like: `18.64.236.73`, `18.64.236.23`, etc.

3. Open your browser and visit:
   ```
   https://dev.turbo-town.com
   ```

## Current Status
- ✅ Route 53 DNS records are correct
- ✅ Domain is properly configured
- ✅ Cognito callbacks updated
- ✅ CORS configured for custom domain
- ❌ Your local DNS resolver is returning wrong IP
- 🔧 **Action needed**: Change DNS settings on your Mac

## Alternative: Use Amplify URL (Works Now)
While you fix DNS settings, the app is fully functional at:
**https://main.d20rx51iesg0zh.amplifyapp.com**

All features work perfectly with this URL!

## Why This Happened
ISP DNS servers (like AT&T) sometimes:
- Cache records for longer than the TTL specifies
- Filter certain domains for "security"
- Have stale data in their systems
- Hijack NXDOMAIN responses

Using public DNS resolvers (Cloudflare, Google) avoids these issues and provides faster, more reliable DNS resolution.
