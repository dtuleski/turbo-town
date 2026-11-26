# Daily Challenge and Push: Requirement to Unit Map

User Stories were skipped (workflow planning); requirements map directly to units.

| Requirement | DC2 | DC3 | DC1 | DC4 | DC5 |
|---|---|---|---|---|---|
| FR-DC-1 one toggle | | | sends only when on | rename | rename |
| FR-DC-2 new accounts on | (live, PR #41) | | | | |
| FR-DC-3 iPhone push, Android-ready backend | | | device model, SNS | | iOS bridge |
| FR-DC-4 soft-ask then iOS prompt | | | | | x |
| FR-DC-5 device list, removal | | | x | | sign-out call |
| FR-DC-6 language | | per-language content | push texts | locale save, texts | locale save, texts |
| FR-DC-7 save IANA zone, Eastern default | Eastern helpers | | default rule | x | x |
| FR-DC-8 digest email 8am local | | | x | | |
| FR-DC-9 digest push 8am local | | | x | | |
| FR-DC-10 at most once per local day | | | claims | | |
| FR-DC-11 one challenge, fixed settings, shared content | x | content | | | |
| FR-DC-12 Eastern challenge day | x | | | | |
| FR-DC-13 deterministic draw, no repeat | x | | pre-draw in tick | | |
| FR-DC-14 16-game rotation | x | | | | |
| FR-DC-15 join when repeatable | `enabled` flag | first batch | | | |
| FR-DC-16 everyone plays, normal play | x | | | | |
| FR-DC-17 best attempt | x | | | | |
| FR-DC-18 ties to earlier | x | | | | |
| FR-DC-19 server checks | x | expected totals | | | |
| FR-DC-20 normal leaderboards too | x (event unchanged) | | | | |
| FR-DC-21 card with leaderboard | API | | | x | x |
| FR-DC-22 noon push, skip if played | | | x | | |
| FR-DC-23 tap routing | | | payload route | results page | x |
| FR-DC-24 yesterday in digest | `getDayResults` | | x | results page | results screen |
| NFR-DC-1 security | x | x | x | x | x |
| NFR-DC-2 privacy, deletion | scores deleted | | devices deleted | privacy text | |
| NFR-DC-3 delivery within 15 min | | | x | | |
| NFR-DC-4 10,000 users | GSI ranking | | batched sends | | |
| NFR-DC-5 reliability | | | x | | |
| NFR-DC-6 cost | x | x | x | x | x |
| NFR-DC-7 compatibility | x | x | x | x | x |
