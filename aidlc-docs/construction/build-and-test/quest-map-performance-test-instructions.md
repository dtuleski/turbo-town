# Quest Map Performance Test Instructions

## Status
No load test was run. Quest Map v1 has no dedicated performance target beyond the NFR-QM list; this file records what to check and how.

## Cost and latency profile (from design, not measured)
- Quest progress is one item per user and world (`GetItem`/`Query`/`PutItem`, on-demand billing).
- Non-quest plays take no new I/O.
- Quest completion uses a versioned conditional write with retry; conflicts are rare for one player.

## Suggested checks (owner, after backend is live in dev)
| Check | Method | Target |
|---|---|---|
| `getQuestProgress` latency | 50 sequential calls, note p95 | p95 under 500 ms |
| Completion hook overhead | compare `completeGame` duration for quest vs non-quest play in CloudWatch | quest adds under 200 ms |
| Concurrent completions | two parallel completions of one node | no lowered result, no throttling errors |
| Web bundle | `npm run build` size | no new warning beyond the pre-existing 500 kB chunk notice (1.76 MB, 510 kB gzip) |

Targets above are proposed defaults, not approved requirements. Results location: record in CloudWatch metrics and the five quest metrics emitted by the Game Service.
