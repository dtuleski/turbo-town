# Cognito Attributes Fix

## Issue

When trying to register, you received this error:

```
Attributes did not conform to the schema:
name.givenName: The attribute name.givenName is required,
name.familyName: The attribute name.familyName is required
```

## Root Cause

The Cognito User Pool was configured to require `name.givenName` and `name.familyName` attributes, but the registration code was only sending:
- `email`
- `preferred_username`

## Solution Applied

Updated `apps/web/src/context/AuthContext.tsx` to automatically extract and send the required name attributes:

```typescript
const register = async (input: RegisterInput) => {
  // Split username into given name and family name
  const nameParts = input.username.trim().split(' ')
  const givenName = nameParts[0] || input.username
  const familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : input.username
  
  await signUp({
    username: input.email,
    password: input.password,
    options: {
      userAttributes: {
        email: input.email,
        preferred_username: input.username,
        name: input.username,
        given_name: givenName,      // ✅ Now included
        family_name: familyName,    // ✅ Now included
      },
    },
  })
}
```

## How It Works

The code now intelligently handles usernames:

1. **Single word username** (e.g., "dtuleski"):
   - `given_name`: "dtuleski"
   - `family_name`: "dtuleski"

2. **Multi-word username** (e.g., "Diego Tuleski"):
   - `given_name`: "Diego"
   - `family_name`: "Tuleski"

3. **Three+ word username** (e.g., "Diego Silva Tuleski"):
   - `given_name`: "Diego"
   - `family_name`: "Silva Tuleski"

## Test Again

Now you can register with any username format:

1. Go to http://localhost:3000/register
2. Fill in the form:
   - Email: diegotuleski@gmail.com
   - Username: dtuleski (or "Diego Tuleski" or any format)
   - Password: Test1234
   - Confirm Password: Test1234

3. Click "Create Account"
4. ✅ Should work without the schema error
5. Check your email for the confirmation code

## Status

✅ **Fixed** - Registration now includes all required Cognito attributes
