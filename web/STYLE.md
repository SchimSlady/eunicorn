# EUnicorn style guide

How EUnicorn looks, sounds and moves. Decisions come from [DESIGN-RESEARCH.md](DESIGN-RESEARCH.md).
Tokens live in [`src/app/globals.css`](src/app/globals.css); use them via Tailwind classes, never hard-coded hex values.

## Brand
- **Name:** EUnicorn, written with "EU" in the primary color (`<span className="text-primary">EU</span>nicorn`). No logo for now, text only.
- **Line:** "Go build in Europe." It closes every "Built in Europe" card.

## Color
| Token | Light | Dark | Use |
|---|---|---|---|
| `eu-blue` | `#003399` | same | Brand, illustrations, "Built in Europe" card |
| `eu-yellow` | `#FFCC00` | same | Brand accent, hints background (`bg-eu-yellow/20`) |
| `primary` | EU blue | EU yellow | Buttons, links, focus, selected state |
| `correct` | `#4C9A2A` | `#7CC35A` | Right answers (matches 🟩 in the share text) |
| `wrong` | `#D62F43` | `#F0566A` | Wrong answers (matches 🟥) |
| `background` / `surface` / `border` / `muted` / `foreground` | | | Page, cards, lines, secondary text, text |

Rules:
- **Yellow is brand only.** Never use it to mean "almost right" (the way Wordle does).
- **Never color alone.** Right and wrong always come with an icon (`Check` / `X`) or a text label, for colorblind players.
- The colors are called `correct` / `wrong`, not `right`, because Tailwind already has `text-right` (alignment).

## Type
- **Headings:** Space Grotesk 500/700 (Florian Karsten, Prague) → `font-display`, applied to `h1–h3` automatically.
- **Text:** Inter (Rasmus Andersson, Sweden) → default `font-sans`.
- **Numbers:** tabular figures everywhere (`font-variant-numeric: tabular-nums` on `body`), so amounts line up.
- Money: `$13.7B`, `$850M`. One decimal below 100, so close values never look tied (`lib/format.ts`).

## Icons and flags
- **Icons:** [Lucide](https://lucide.dev), outline, 16–20 px, `aria-hidden` unless the icon is the only label. No emojis in the UI.
- **Flags:** [circle-flags](https://github.com/HatScripts/circle-flags) via the `Flag` component (SVG, pinned version). Emoji flags show as letters on Windows.
- **Difficulty:** signal bars (`DifficultyBars`), 1 to 3. Not 🟢🟡🔴, because yellow isn't a rating.

## Company logos
- Rounded square (22% radius), **white tile**, padding of ~14% of its size, thin `black/10` border (`CompanyLogo`).
- No round crops: they cut off wordmarks.
- Until real logos exist: initials in EU blue on the white tile.

## Motion
| Moment | Animation | Class |
|---|---|---|
| Wrong answer | Short horizontal shake | `animate-shake` |
| Something revealed (clue, value, hint, end card) | Flip in from above | `animate-flip-in` |
| Result / the impostor | Small pop | `animate-pop` |
| **Perfect round only** | Confetti in blue, yellow and white | `ResultHeader` (canvas-confetti) |

All motion is switched off under `prefers-reduced-motion` (globals.css, and `disableForReducedMotion` for confetti).

## Score and tone
- **Score = money raised:** points are shown as `€8M raised` (out of `€10M`). Hints cost €M off the score, but the button just says "Hint"; the cost shows up in the result.
  - ⚠️ To test: in Higher or Lower, the answers are also amounts ($B), which could be confusing.
- **Verdicts** (`lib/scoring.ts`): Unicorn status 🦄 (perfect) · Series A material (≥70%) · Seed stage (≥40%) · Pre-seed vibes (>0) · Back to the garage (0).
- **Language:** English only. Short, slightly ironic, insider terms welcome ("Pre-seed vibes", "Series A material"). Don't explain jokes.
- **Keep it short.** No rule lists, no helper subheadings. One line of description; the game explains itself.

## Share text
Wordle pattern, built by `shareText()` in `lib/scoring.ts`:
```
EUnicorn #12 · Who Raised This? · Hard · 💡1
🟥🟩⬜⬜ €9M raised
eunicorn.eu
```
No flag emojis (Windows). Later: an OG image (Next `ImageResponse`) so the link unfurls as a card.

## Layout
- Mobile first, content max 28rem (`max-w-md`) in games, 42rem on the home page.
- **Home:** one card per mode: illustration (`ModePreview`) → PLAY / RESULTS / SOON → title → tagline or score. Streak above the cards. No bottom nav.
- **Before a game:** an intro screen (`GameIntro`): illustration, one-line description, three level buttons (Easy · Medium · Hard), Start. Nothing more.
- **During a game:** `GameHeader` (back link, title, level, puzzle number).
- **After a game:** `ResultHeader` → mode-specific review → "Built in Europe" card → `GameFooter` (share, countdown, back).

## Difficulty
One shared puzzle per day for everyone. The level only changes help and options (clues at start, guesses, hints, timer), so shared results stay comparable. It is picked on the intro screen and fixed once the game starts.
