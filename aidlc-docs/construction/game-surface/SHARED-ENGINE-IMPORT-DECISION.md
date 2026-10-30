# Decision: How `apps/web` imports the shared circuit engine

**Status**: DECIDED (Option A). Repo-side change is **deliberately deferred** until the Vercel setting is in place — see Ordering.
**Decided**: 2026-10-29, by Kiro at the owner's instruction to decide on its recommendation.
**Blocks**: frontend deployment of Circuit Builder.

---

## The problem

`apps/web` has no dependency on `@memory-game/shared`. Verified: zero references to either `@memory-game/shared` or `packages/shared` exist anywhere under `apps/web`. The frontend has never consumed the shared package.

U3 made the engine reachable with a relative source import, funnelled through the single module `apps/web/src/utils/circuitEngine.ts`. That resolves locally because a dev machine holds the whole monorepo. Production probably does not:

- The deploy procedure runs `vercel --prod` **from `apps/web/`**, which uploads only that directory as the deployment root.
- There is no root `vercel.json`, no `.vercelignore`, no `turbo.json`, and no npm `workspaces` field in the root `package.json`.
- `apps/web/vercel.json` sets `buildCommand`, so Vercel **builds from source** rather than receiving a prebuilt `dist`.

So `packages/shared` is very likely absent from the Vercel build context, and the import would fail there while passing every local gate.

**This originated as a gap in the approved Application Design.** `circuit-builder-component-dependency.md` asserts an `apps/web -> packages/shared` contract and its validation table records `FR-CB-16` as "Pass". The engine's *placement* was verified; the frontend's *ability to consume it* was not.

---

## Decision

**Option A: configure the Vercel projects as a monorepo build so the whole repository is present at build time, then replace the relative import with a proper package dependency.**

### Why

- It preserves the single-engine guarantee that the whole result-integrity design rests on. `FR-CB-21` makes the server authoritative by re-evaluating the submitted layout with the *same* code the browser ran. Any option that lets browser and server run different copies can make them disagree about whether a circuit is valid, which defeats the purpose.
- It is the standard, well-supported Vercel monorepo pattern, not a workaround.
- It is reversible. It changes project configuration, not architecture.
- The repo-side follow-up is a one-file edit, because U3 correctly funnelled every engine import through `circuitEngine.ts`.

### Why not the alternatives

| Option | Rejected because |
|---|---|
| **B. Publish `packages/shared` to a registry** | Real versioning and release work, and it reintroduces the failure mode the architecture avoids: browser and Lambda could resolve different published versions and disagree about circuit validity. |
| **C. Build-time staging step** | Cannot work under the current model. If `packages/shared` is not in the upload, there is nothing to stage from. It also adds a step that can silently go stale. |
| **D. Vendor a copy into `apps/web`** | Directly violates `FR-CB-16`. Two implementations will drift, and the drift surfaces as the server rejecting a circuit the browser accepted — the worst possible failure for a child who just solved a puzzle. |
| **Adding `file:../../packages/shared` alone** | Does **not** fix anything by itself. The directory is still missing from the build context and `npm install` would fail there. |

---

## Ordering (this matters more than the choice)

Doing these in the wrong order **breaks the currently working production frontend**. The repo change is safe only once the build context includes the monorepo.

### Step 1 — Vercel settings (owner action; cannot be done from this repo)

For the **dev** project `web` first:
1. Project Settings → General → **Root Directory** = `apps/web`
2. Enable **"Include source files outside of the Root Directory in the Build Step"** ← this is the setting that actually fixes the problem
3. Confirm the project builds from Git integration, or that CLI deploys are run from the **repository root** rather than from `apps/web/`

### Step 2 — Verify on dev before touching prod

Deploy `web` and confirm `dev.dashden.app` still builds and loads. This is the key risk control: the project already has separate dev (`web`) and prod (`web-prod`) Vercel projects, so the configuration change can be proven on dev while production stays untouched.

### Step 3 — Repo-side change (one file plus manifest)

Only after Step 2 passes:
1. Add `"@memory-game/shared": "file:../../packages/shared"` to `apps/web/package.json`
2. Add the matching Vite alias in `apps/web/vite.config.ts`
3. Collapse the relative import in `apps/web/src/utils/circuitEngine.ts` to the package name
4. Remove the `BLOCKING DEPLOYMENT RISK` comment block from that file, since it will no longer apply
5. Re-run type-check, tests, and build

### Step 4 — Apply to prod

Repeat Step 1 for `web-prod`, then deploy.

### Step 5 — Update the deployment steering rule

`.kiro/steering/deployment.md` currently says to deploy "from `apps/web/`". If CLI deploys move to the repository root, that instruction becomes wrong and must be corrected, or a future session will follow it and produce a broken build.

---

## Why the repo change is not being made now

Making it before Step 1 would take a frontend that currently builds and deploys correctly and break it, in exchange for no benefit, because the frontend is not deploying Circuit Builder yet anyway. The relative import keeps local development and all local verification working in the meantime.

Until Step 2 passes, the standing constraint remains: **do not deploy the frontend.**

---

## What is safe to do right now

- All local development, type-checking, testing, and building. Every unit's local gates pass with the relative import.
- All backend work. `services/game` is unaffected: the Lambda bundler already includes `@memory-game/shared`, which is why U6 consumed the engine with no equivalent problem.
- Units U4, U5, and U7 can complete without this being resolved. Only the frontend *deployment* is blocked.
