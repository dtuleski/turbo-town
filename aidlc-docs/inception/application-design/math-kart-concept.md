# Math Rally - Visual Concept

**Created**: 2026-11-25
**Stage**: INCEPTION - Application Design (concept page)
**Purpose**: one page that shows what the race screen looks like and how it behaves, so the owner can judge the "cool scene" and the controls before Construction. It is a layout sketch, not final art.
**Basis**: FR-MK-1 to FR-MK-24, NFR-MK-6 to NFR-MK-8, NFR-MK-20, Q1, Q2, Q6, Q12; components G3, G4, G9 in `math-kart-components.md`

---

## 1. Race Screen on a Phone (portrait, Medium, 3 paths)

```text
+--------------------------------------------------+
| [II]   FORK 3/10    COINS 2     TIME 0:41.2   [1]|
| +----------------------------------------------+ |
| |            What is  7 x 8 ?               [2]| |
| +----------------------------------------------+ |
|    .        *         sky        *        .      |
|  /\/\/\/\      /\/\/\/\/\/\      /\/\/\/\/\      |
|        +------+     +------+     +------+     [3]|
|        |  54  |     |  56  |     |  15  |        |
|        +------+     +------+     +------+        |
|           ||           ||           ||           |
|         /    \       /    \       /    \      [4]|
|        /      \_____/      \_____/      \        |
|       /  - - - - - - - - - - - - - - - - \    [5]|
|      /           :            :           \      |
|     /            :            :            \     |
|    +--------+    +==========+    +--------+   [6]|
|    |   54   |    |>>  56  <<|    |   15   |      |
|    +--------+    +==========+    +--------+      |
|                     .----.                       |
|                  .-|      |-.                 [7]|
|                  |  '----'  |                    |
|                 [O]========[O]                   |
| +----------------------------------------------+ |
| |  <   [=========(  O  )=========]   >      [8]| |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

| Marker | Element | Rule |
|---|---|---|
| [1] | Top bar: pause button (left, at least 44 x 44 px), fork progress "3/10", coins, race time | Pause sits far from the joystick so a thumb on the joystick cannot hit it (FR-MK-21, FR-MK-23) |
| [2] | Question banner | At least 28 CSS px, high contrast; shown from the merge of the previous fork until the decision line (FR-MK-6, NFR-MK-6) |
| [3] | Answer signs, one per branch | White boards with dark bold text, at most 4 characters; same colour for every sign, so no lane is singled out by colour |
| [4] | The fork: the road splits into real branches with grass between them | Branches merge again before the next question (FR-MK-7, FR-MK-12) |
| [5] | Decision line (painted dashes across the road) | The lane the kart is in here is the answer (FR-MK-9) |
| [6] | Lane answer chips near the kart | Same answers at a fixed readable size (at least 20 px bold); the kart's lane has a double border and arrows, so it is marked by shape, not colour (NFR-MK-6, NFR-MK-7) |
| [7] | Benji's kart from behind | Original cartoon driver with a round helmet and no letter emblem; leans into lane changes; flame puffs during a boost |
| [8] | Horizontal joystick at the bottom centre | One thumb, either hand; push past the threshold for one lane, hold to repeat, release to re-centre (FR-MK-21) |

**Text alternative:** The phone screen is in portrait. At the very top is a bar with a pause button on the left, then "Fork 3/10", the coin count and the race time. Below it a wide banner shows the question "What is 7 x 8 ?". Under a sky with clouds and green hills, the road ahead splits into three branches, each with a white sign on a post showing one answer: 54, 56 and 15. Grass separates the branches. A dashed line across the road marks where the choice counts. Closer to the viewer the road has three lanes, and just above the kart a row of three chips repeats the answers in large text; the chip for the kart's lane (56) has a double border and arrows. Benji's kart is seen from behind at the bottom centre. At the very bottom is a wide horizontal joystick with a knob in the middle and arrows to the left and right.

## 2. Feedback at the Fork

```text
+----------------------------------------+
|  [ OK ]  Great!  +1 coin   >> BOOST    |
|  shape: check mark, green, chime       |
+----------------------------------------+

+----------------------------------------+
|  [ X ]  Almost!   7 x 8 = 56           |
|  shape: cross, red, soft buzz          |
+----------------------------------------+
```

- **Right answer**: check mark icon, "Great!", chime, +1 coin, about 1 s boost with flame puffs (FR-MK-10).
- **Wrong answer**: cross icon, a friendly word ("Almost!"), the correct sum in the banner for at least 1.5 s, a soft buzz, and the branch turns bumpy: rumble strips, small camera shake, kart at about 60% speed for about 1.5 s. No spin-out, no lives (FR-MK-11, Q3).
- Icon shape and text carry the meaning; colour and sound only add to it (NFR-MK-7).

**Text alternative:** Two small banners. The first shows a check mark with "Great! +1 coin" and "BOOST", and notes it uses a check-mark shape, green and a chime. The second shows a cross with "Almost! 7 x 8 = 56", and notes it uses a cross shape, red and a soft buzz.

## 3. Other Layouts and States

| Situation | Layout |
|---|---|
| Landscape phone and desktop (1280 x 720) | Same scene, wider; HUD bar and banner span the top; joystick hidden when no touch input has been seen; keyboard hint "Left/Right or A/D, P to pause" in the corner for the first fork |
| Easy (2 paths) and Hard or Super Hard (4 paths) | Two or four branches, signs and chips; with 4 chips on a 320 px screen each chip is about 70 px wide, which leaves room for 4 characters at 20 px bold (to confirm on the reference phone, MK-17) |
| Countdown | Large "3, 2, 1, Go!" over the road; no input accepted (FR-MK-3) |
| Pause menu | Dimmed scene, three large buttons: Resume, Sound on/off, Quit (asks to confirm) (FR-MK-22) |
| Finish | Finish arch, short confetti burst (a static "Finish!" card with reduced motion), then the host's result screen (FR-MK-24) |
| Reduced motion | No camera shake, no speed lines, no flashing, static celebration; road still scrolls because driving is the game (NFR-MK-7, NFR-MK-8) |

## 4. Art and Sound Direction

- **Mood**: bright countryside at midday: blue sky, soft clouds, rounded green hills, a few trees and fences along the road, a striped finish arch. Flat colours, thick outlines, toy-like shapes.
- **Sources**: CC0 packs (for example Kenney.nl) for roadside objects, sounds and UI icons; original simple art for Benji, his kart and the signs. Every file goes into `CREDITS.json` with source, licence and URL (NFR-MK-20).
- **Sound**: short, soft effects: countdown beeps, chime, soft buzz, coin, whoosh for the boost, cheer at the finish. Music only if it fits the asset budget.
- **Font**: Fredoka (SIL OFL 1.1), bundled; numbers must be easy to tell apart (1 and 7, 6 and 9).

## 5. Inspiration Limits (IP safety)

"Mario-Kart style" means the camera behind the kart, a bright cartoon world, speed and a joyful finish. It does **not** allow, anywhere in art, sound, text or metadata:
- Nintendo characters, karts, logos, item boxes, power-up items (shells, bananas, mushrooms), coins in Nintendo's style, track names or layouts, music or sound effects, or a title in the "<Name> Kart" pattern.
- A capped mascot with a letter emblem, a red-and-blue plumber look, or any other recognisable trade dress.
- The real child: Benji is a fictional cartoon with no photo, likeness, voice, surname, age or location of the owner's son (NFR-MK-19).

Coins in Math Rally are plain round gold discs with a simple plus sign, counted only for correct answers. Every asset is reviewed against this list before launch (pre-launch check PL2).