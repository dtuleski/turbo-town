# Daily Challenge and Push: Requirement Verification Questions

Feature scope (from the chat on 2026-11-26): the daily digest also as a push notification for app users; a daily challenge with its own leaderboard, a push at 12pm local time, and yesterday's results in the next morning's digest; one toggle for the digest email and all pushes. Phase 1 (digest on by default for new accounts) is handled separately in PR #41.

## Decisions already made by the owner

| # | Decision | Owner's words |
|---|---|---|
| D1 | The daily digest email is sent at 8am in each user's local time | "let's start sending the daily email at 8am local time always" |
| D2 | The challenge leaderboard ranks each player's best attempt | "best attempt" |
| D3 | Challenge plays count as normal plays; free users keep 3 plays a day | "free users are still limited to 3 plays" |
| D4 | One toggle controls the digest email and every push | "the toggle for daily diget must apply for all push notifications" |
| D5 | New accounts start with the toggle on | "When a new user is setup, daily diggest toggle must be on by default" |
| D6 | Push for the digest, and a challenge push at 12pm local time | first request |

Game rotation as written by the owner, mapped to game ids (please check the mapping):

| Owner's name | Game id |
|---|---|
| Memory Match | memory-match |
| Math Challenge | math-challenge |
| Word Puzzle | word-puzzle |
| Sudoku | sudoku |
| Sequence Memory | sequence-memory |
| Code-a-Bot | code-a-bot |
| Geo Quiz | geo-quiz |
| History Quiz | history-quiz |
| Civics Quiz | civics-quiz |
| Hangman | hangman |
| Space Coder | scratch-coding |
| Math Maze | math-maze |
| Pattern Recall ("PAttern, Recall" read as one game) | pattern-recall |
| Space Entry | space-entry |
| Bond & Burn | bond-and-burn |
| Mini Golf | mini-golf |

That is 16 games. Not in the rotation: Language Learning, Jigsaw Puzzle, Bubble Pop, Tic-Tac-Toe, Circuit Builder (and the two COMING_SOON games).

Please answer each question by writing the letter after `[Answer]:`. My recommendation is marked.

## Question 1
Is the game mapping above right, including "Space Coder" = scratch-coding and "PAttern, Recall" = one game (Pattern Recall)?

A) Yes, the 16 games above (recommended)
B) No (please describe after [Answer]: tag below)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 2
A fair challenge leaderboard needs everyone to play the same puzzle. Some games pick their content at random on the device today. What should happen with a game in the list that cannot repeat the exact same puzzle yet?

A) Make it repeatable (a shared daily seed) as part of this feature, game by game; a game joins the rotation once it is repeatable (recommended)
B) Leave it out of the rotation for now; only games that are already repeatable are used
C) Use it anyway; players get different puzzles and scores are compared as they are
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 3
Which day does a challenge belong to? One shared day is needed for one leaderboard.

A) US Eastern time: the challenge runs from midnight to 11:59pm Eastern; results are final at midnight Eastern (recommended, since the launch is US only)
B) UTC midnight to midnight
C) Each player's local day, with separate leaderboards per time zone
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 4
How are ties on the challenge leaderboard broken (same best score)?

A) The player who reached that score first ranks higher (recommended)
B) Shorter game time ranks higher
C) Tied players share the rank
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 5
When does the digest push arrive?

A) At 8am local time, together with the email (recommended)
B) At a different time (please give it after [Answer]: tag below)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 6
Many users have never shared a time zone (web users today, and app users before the update). Which time is used for them until their time zone is known?

A) US Eastern; the web and the app save the user's time zone at their next visit (recommended)
B) Skip the digest and pushes until the time zone is known
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 7
When does the app ask for permission to send notifications? iOS shows its prompt only once; a short explanation first improves the yes rate, and Apple requires clear opt-in wording for non-essential pushes.

A) After the first finished game, with a short explanation screen before the iOS prompt (recommended)
B) At first launch, before the first game
C) Only when the user turns on the toggle in Profile
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 8
Android has no app release yet. Should push support for Android be built now?

A) No, iOS only now; the backend is built so Android can be added later (recommended)
B) Yes, Android too (adds Firebase Cloud Messaging)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 9
Where can users see and play the challenge?

A) In the app and on the website, as a card at the top of the game list with today's leaderboard (recommended)
B) In the app only
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 10
What does the next morning's digest show about yesterday's challenge for a user who did not play it?

A) The winner and the top 3, plus an invitation to play today's challenge (recommended)
B) Nothing about the challenge
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 11
In which language are the pushes and the challenge texts?

A) The user's app or site language (English, Spanish or Portuguese), English when unknown (recommended)
B) English only
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 12
Should the challenge push go to a user who already played today's challenge before noon?

A) No, skip the push for users who already played (recommended)
B) Yes, send it anyway, with their current rank
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 13
Who picks each day's challenge?

A) The backend picks at random from the rotation, never the same game two days in a row, with fixed settings per game (difficulty and length) that you approve once (recommended)
B) The backend picks at random, and the admin page lets you override any upcoming day
X) Other (please describe after [Answer]: tag below)

[Answer]: 

## Security Baseline

The Security Baseline extension is enabled for this project (aidlc-state.md, Extension Configuration) and applies to this feature; no question needed.
