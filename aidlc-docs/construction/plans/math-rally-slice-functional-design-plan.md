# MR1 Vertical Slice and Performance Gate - Functional Design Plan

**Unit**: MR1 Vertical Slice and Performance Gate (`apps/web`, dev-only route; mobile spike on branch `spike/math-rally-webview`, not merged), depth Minimal
**Basis**: `inception/application-design/math-rally-unit-of-work.md` (MR1), `math-rally-component-methods.md` Sections 1 and 2, `math-rally-services.md` Section 8, NFR-MK-1, NFR-MK-2, Q28, Q29
**Settles** (from the execution plan): track and speed constants for the slice, fork geometry, quality profiles, gate protocol and devices. The two inception review NITs are settled here too, since MR1 builds the fatal-error guard.

## Facts found at the start of Construction

- **Phaser**: npm `latest` is `4.2.1` (2026-07-09), MIT licence; the 4.x line has been stable since `4.0.0` (2026-04-10). MR1 pins `4.2.1` exactly. Gzip size and the literals of step 1 (local schemes, built-in texture keys, loop and sound stop methods) are confirmed in Code Generation (U1, U3, U19 to U21).
- **Machines**: MR1 now runs on the MacBook, which has Flutter, Xcode and the owner's paired iPhone (model id `iPhone18,3`). The Android emulator (AVD `turbo_pixel`) is available for the functional spike checks but is not valid for the frame-rate gate.

## Plan

- [x] 1. Answer the questions below (owner): Q2 to Q8 recommended options (A); Q1 open
- [x] 2. Resolve any ambiguous answer with a follow-up question: Q1 follow-up 1a answered D
- [x] 3. Write `construction/math-rally-slice/functional-design/business-logic-model.md` (slice race flow, track and speed constants (from MR2 v1 per Q3), fork geometry, quality profile rule)
- [x] 4. Write `construction/math-rally-slice/functional-design/business-rules.md` (gate protocol and pass rule, devices, guard filtering rule, error message rule)
- [x] 5. Write `construction/math-rally-slice/functional-design/domain-entities.md` (fixture race shape, quality profile, frame sample and CSV columns, gate report fields)
- [x] 6. Write `construction/math-rally-slice/functional-design/frontend-components.md` (slice page, HUD elements, joystick, frame overlay, Fault trigger)
- [ ] 7. Present for approval

## Questions

## Question 1
Which Android phone is the reference device for the frame-rate gate? It should be a mid-range phone 3 to 4 years old (Q28). The emulator cannot be used for the gate.

A) Samsung Galaxy A52 or A53 (2021 to 2022 mid-range, very common)
B) Google Pixel 6a (2022)
C) A phone the family already has (write the model after the tag)
D) Run the gate on the iPhone and desktop only for now, and add the Android gate before MR5
X) Other (please describe after [Answer]: tag below)

[Answer]: OPEN. The owner accepted the recommendations, but this question had none. Follow-up below.

## Question 2
The gate's iPhone is the one paired with this Mac (model id `iPhone18,3`, an iPhone 17 Pro). It is a top-end phone, so it proves little about slower iPhones. Is that enough?

A) Yes, the owner's iPhone is the only iPhone in the gate; the Android phone is the real test (Recommended)
B) Also run the gate on an older iPhone (write the model after the tag)
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "I am ok with the recommendations")

## Question 3
MR1 and MR2 both need the motion maths. The units allowed MR1 to keep its own copy until MR2 moves it. Both now run on this Mac. Which order?

A) MR2's motion and track constants first, then MR1 imports them from `packages/shared` (no copy to move later). The slice's question fixtures stay static, as planned. (Recommended)
B) As in the unit plan: MR1 writes `core/motion.ts`, MR2 later moves it
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "I am ok with the recommendations")

## Question 4
How does the game pick its quality profile (draw distance, render scale, level of detail)?

A) Start on High; after the countdown, if the median frame time over 2 s is above 20 ms (under 50 fps), step down one profile; at most two steps per race, never step back up during a race; the chosen profile is remembered on the device for the next race (Recommended)
B) Pick once from the device (screen size and pixel ratio) before the race, never change during it
C) Fixed High profile; the gate measures it as is
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "I am ok with the recommendations")

## Question 5
What does one gate run consist of?

A) The Hard fixture race (4 paths, 15 forks: the heaviest scene), played to the finish with a mix of right and wrong answers, 3 runs per device and Android composition mode; pass when every run meets median >= 50 fps and 1% low >= 30 fps; a lane change visible within 100 ms on slow-motion video (Recommended)
B) Same as A with 1 run per device and mode
C) Same as A, plus 3 runs of the Easy race
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "I am ok with the recommendations")

## Question 6
Inception review NIT 1: when a host sends `init` that the game refuses (`INIT_INVALID`), which message does the player see?

A) "Could not start the race." (it happens before the race starts; matches services 5.1) (Recommended)
B) "The race stopped unexpectedly." (matches the methods mapping and R-D9)
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "I am ok with the recommendations")

## Question 7
Inception review NIT 2: on the web, the fatal-error guard listens to every uncaught error on the page, so an error from a browser-extension script could end a race.

A) Only react to errors whose source file is on the page's own origin (or has no source but comes from a promise rejection inside the game); ignore the rest and record them in the dev recorder; MR4 adds a false-positive check with an injected foreign-script error (Recommended)
B) Keep reacting to every error (safest against a frozen race, may end races because of extensions)
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "I am ok with the recommendations")

## Question 8
Placeholder art and sound for the slice (each file listed in `CREDITS.json`):

A) Simple shapes drawn in code plus a few CC0 sprites and sounds (for example from Kenney), with no kart that resembles any existing game's kart (Recommended)
B) Simple shapes only, no external files (lowest IP risk, least realistic for the gate)
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "I am ok with the recommendations")

## Follow-up Question 1a
Question 1 (the reference Android phone) had no recommended option. It is needed only for the gate (MR1 step 9), so the slice can be built first. Which phone?

A) Samsung Galaxy A52 or A53
B) Google Pixel 6a
C) A phone the family already has (write the model after the tag)
D) Gate on the iPhone and desktop only for now; add the Android gate before MR5
X) Other (please describe after [Answer]: tag below)

[Answer]: D (owner: "Android will be for a later stage"). The gate runs on the iPhone and desktop in MR1; the Android gate is added before MR5.
