# Security headers

Response headers for this app are set in [`vercel.json`](./vercel.json) under `headers`, applied to
every path (`source: "/(.*)"`). This file documents the Content-Security-Policy, which is deliberately
**not yet enforcing**.

JSON has no comment syntax and Vercel validates each header entry against a `{ key, value }` schema,
so this note lives beside `vercel.json` rather than inside it.

## Current state

| Header | Mode |
|---|---|
| `Strict-Transport-Security: max-age=31536000; includeSubDomains` | enforcing |
| `X-Content-Type-Options: nosniff` | enforcing |
| `X-Frame-Options: DENY` | enforcing |
| `Referrer-Policy: strict-origin-when-cross-origin` | enforcing |
| `Content-Security-Policy-Report-Only` | **report-only** |

The four enforcing headers carry no breakage risk and protect the app now. The CSP is staged in
report-only mode because a CSP cannot be proven correct without loading the app in a browser, and a
wrong directive here takes the whole application offline. In report-only mode the browser applies
nothing and logs every would-be violation to the console.

There is no `report-uri` or `report-to` directive, so violations are **console-only** and nothing is
collected server-side. Verification is therefore manual: open the console and walk the checklist below.

`X-Frame-Options: DENY` is enforcing, so framing is blocked today regardless of the report-only
`frame-ancestors 'none'`.

## Flipping to enforcement

One-line change in `vercel.json`: rename the header key

```
"key": "Content-Security-Policy-Report-Only"   ->   "key": "Content-Security-Policy"
```

Leave the `value` exactly as it is. Do this only after the checklist below is clean.

The policy being staged:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https://upload.wikimedia.org;
connect-src 'self' https://*.execute-api.us-east-1.amazonaws.com https://api.dashden.com
            https://cognito-idp.us-east-1.amazonaws.com https://*.auth.us-east-1.amazoncognito.com
            https://ipapi.co;
frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Per-directive rationale, including why `'unsafe-inline'` is present for styles only and why two
`connect-src` entries are wildcards, is in
`aidlc-docs/construction/prerequisite-enablement/functional-design/functional-design.md` section 2.

## Browser verification checklist

Open the browser console and watch for
`[Report Only] Refused to ... because it violates the following Content Security Policy directive`.
Every line below must produce **zero** reports before flipping the header name.

| # | Page or flow | Directive at risk |
|---|---|---|
| 1 | Email/password sign-in and sign-up, including the confirmation code step | `connect-src https://cognito-idp.us-east-1.amazonaws.com` |
| 2 | Google sign-in via the Cognito hosted UI, through to landing back on the app signed in | `connect-src https://*.auth.us-east-1.amazoncognito.com`, `frame-src 'none'` |
| 3 | Any GraphQL call: load the hub, start a game, complete a game | `connect-src https://*.execute-api.us-east-1.amazonaws.com` |
| 4 | Leaderboard page, History, Achievements, Recent Improvements | same as 3, plus the `https://api.dashden.com` fallback |
| 5 | Stripe upgrade: the redirect out to Checkout **and** the return to the success page | `form-action 'self'` (expected not to apply - the redirect is `window.location.href`) |
| 6 | Poppins actually renders rather than a system fallback | `style-src https://fonts.googleapis.com`, `font-src https://fonts.gstatic.com` |
| 7 | Vercel Analytics and Speed Insights still report | `script-src 'self'`, `connect-src 'self'` |
| 8 | Framer Motion animations, especially `AnimatePresence` exit transitions | `style-src 'unsafe-inline'` - the reason that keyword is present |
| 9 | Jigsaw Puzzle pieces render; Language Maintenance image fallback renders | `img-src data:` |
| 10 | History Quiz portrait images load | `img-src https://upload.wikimedia.org` |
| 11 | Admin dashboard and Subscriptions page load their data | `connect-src` as 3 |
| 12 | Language game country/locale lookup | `connect-src https://ipapi.co` |
| 13 | Confirm no page of the app is framed anywhere | `X-Frame-Options`, `frame-ancestors` |
| 14 | `/traffic-sim.html` - **expected to report violations**, see below | `script-src 'self'` |

Check both deployments, because their API Gateway host and Cognito domain differ: `dev.dashden.app`
(Vercel project `web`) and `dashden.app` (project `web-prod`). If either reports a blocked
`connect-src` host, add that exact host before flipping.

## Known intentional breakage

`public/traffic-sim.html` loads `https://cdn.tailwindcss.com`, an inline `<script>`, and inline
`onclick` handlers. All three violate `script-src 'self'`, so once the policy enforces, that page
renders unstyled and non-functional.

`git grep -i traffic-sim` finds no reference to it anywhere in the repository - no route, no link, no
documentation - so it is an orphan standalone prototype of what became the React Traffic Lab game, and
no application flow depends on it. It is being left in place rather than deleted or carved out: a
loose-CSP exception for an unreferenced file would weaken a security control permanently. Deleting the
file is recommended as separate, deliberate cleanup.
