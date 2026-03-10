# Add DNS Records to Squarespace

## What You Need to Do

Click "Edit" or "Learn more" next to `dashden.app` in Vercel to see the DNS records.

Vercel will show you something like this:

---

## Expected DNS Records from Vercel

### For dashden.app (root domain):

**Option 1: A Record (Most Common)**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Option 2: CNAME Record**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### For www.dashden.app:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## How to Add Records in Squarespace

### Step 1: Go to Squarespace DNS

1. Go to: https://account.squarespace.com/domains
2. Click on `dashden.app`
3. Click "DNS Settings" (or "Advanced Settings")

### Step 2: Remove Conflicting Records

Look for existing records with:
- Host: `@` (root)
- Host: `www`

If you see any A or CNAME records for these, **delete them first**.

### Step 3: Add Vercel's Records

Click "Add Record" and add each record Vercel showed you.

**For Root Domain (@):**
```
Type: A (or CNAME, depending on what Vercel showed)
Host: @
Priority: 0
Data: <paste the value from Vercel>
TTL: 3600
```

**For WWW:**
```
Type: CNAME
Host: www
Priority: 0
Data: <paste the value from Vercel>
TTL: 3600
```

### Step 4: Save

Click "Save" in Squarespace.

---

## What to Do Right Now

1. **In Vercel**: Click "Edit" next to `dashden.app`
2. **Screenshot or write down** the DNS records Vercel shows
3. **Tell me** what records Vercel is asking for
4. **Then** I'll help you add them to Squarespace

---

## Common Vercel DNS Records

Vercel typically uses one of these patterns:

**Pattern 1: A Record for root**
```
dashden.app:
  Type: A
  Name: @
  Value: 76.76.21.21

www.dashden.app:
  Type: CNAME
  Name: www
  Value: cname.vercel-dns.com
```

**Pattern 2: CNAME for both**
```
dashden.app:
  Type: CNAME
  Name: @
  Value: cname.vercel-dns.com

www.dashden.app:
  Type: CNAME
  Name: www
  Value: cname.vercel-dns.com
```

---

## After Adding DNS Records

1. **Wait**: DNS propagation takes 5-60 minutes
2. **Check**: Go back to Vercel, click "Refresh" next to each domain
3. **Verify**: Once Vercel shows "Valid Configuration", your site is live!

---

## Quick Check

```bash
# After adding DNS records, check if they're propagating:
dig dashden.app
dig www.dashden.app

# You should see the IP or CNAME you added
```

---

## What About dev.dashden.app?

After you get `dashden.app` and `www.dashden.app` working:

1. Add `dev.dashden.app` in Vercel
2. Vercel will show DNS records for it
3. Add those to Squarespace too:
   ```
   Type: CNAME
   Host: dev
   Data: <value from Vercel>
   ```

---

## Need Help?

Click "Edit" next to `dashden.app` in Vercel and tell me:
1. What type of record does it ask for? (A or CNAME)
2. What value does it want you to use?

Then I'll give you exact instructions for Squarespace!
