# Daily Challenge and Push: Unit of Work Plan

Inputs: `daily-challenge-workflow-planning.md` (units DC1 to DC5 and order) and the application design
(`daily-challenge-application-design-plan.md`, `../application-design/daily-challenge-*.md`).
Self-approved 2026-11-26 under the owner's delegation. Depth: minimal (units were named in workflow
planning; this stage fixes their boundaries, branches and acceptance criteria).

## Plan

- [x] Confirm the five units and their order from workflow planning
- [x] Assign every application design component to exactly one unit
- [x] Fix the DC3 scope for this run (first batch only, plan Q8 of the application design)
- [x] Define one branch and one pull request per unit (application design Q11)
- [x] Generate `application-design/daily-challenge-unit-of-work.md`
- [x] Generate `application-design/daily-challenge-unit-of-work-dependency.md`
- [x] Generate `application-design/daily-challenge-unit-of-work-story-map.md` (User Stories were skipped; requirements map to units)
- [x] Validate boundaries: each unit builds, tests and merges alone without breaking production

## Questions and answers

### Q1. Should DC3 (repeatable content) be split by platform across DC4 and DC5?
A) Keep DC3 as one unit (shared generators plus web and app given-content modes for the first batch), so
a game joins the rotation with all three parts in one pull request (recommended)
B) Move the web and app modes into DC4 and DC5

[Answer]: A. Matches FR-DC-15 (a game joins only when web and app both play the same content) and the
later one-game-per-pull-request increments. DC2 ships with Code-a-Bot only, which needs no new client
content code.

### Q2. Build order
[Answer]: DC2, DC3, DC1, DC4, DC5 (workflow planning). DC1 uses DC2's `getDayResults` for the digest and
challenge texts; DC4 and DC5 use all three backend units.

### Q3. Per-unit construction stages
[Answer]: As workflow planning decided: Functional Design for DC2 and DC3; NFR Requirements and NFR
Design for DC1; Infrastructure Design for DC2 and DC1; Code Generation and Build and Test for all. Docs go
under `aidlc-docs/construction/daily-challenge-<unit>/` with the `daily-challenge-*` prefix for plans in
`aidlc-docs/construction/plans/`.

## Approval

Self-approved 2026-11-26 under the owner's delegation; logged in `aidlc-docs/audit.md`.
