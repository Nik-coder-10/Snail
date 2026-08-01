# Feed & Pet Interaction Redesign Changelog

## Overview
Redesigned the snail's Feed and Pet interactions into completely distinct, believable living-creature animation sequences. Feeding is now an excitement/curiosity/hunger/satisfaction journey with per-food behaviors; petting is a gentle, calm, warm multi-stage interaction with 10 random body-language variations. No existing functionality was changed — only the interaction quality was redesigned.

---

## 1. WebAudio Sound Kit (`src/renderer/audio/interactionSounds.ts`)

### New
- **Zero-asset synthesized sound engine** using WebAudio (`tone()` / `noise()` oscillators with ADSR envelopes, lazy `AudioContext`).
- 10 named interaction sounds: `squish`, `chirp`, `sparkle`, `munch`, `crunch`, `softMunch`, `gulp`, `sigh`, `burp`, `sniff`.
- Respects the existing `preferences.soundEnabled` setting (read from `useStore.getState()` at call time).
- Fully silent when disabled; AudioContext resumes on first user interaction.

---

## 2. Feeding Redesign (`SnailEngine.ts`)

### Before
- Eating was a simple loop: food scaled in, mouth opened, a generic particle burst, done. No personality, no per-food variation, no sequence.

### After
- **8-phase cinematic sequence** with anticipation, follow-through, and easing:
  1. **Notice** (650ms) — food appears with a pop, eyes lock on, pupils dilate, eye stalks extend, head stretches toward it
  2. **Approach** (1250ms) — leans forward, neck stretches, crawls closer with excited stalk bobbing
  3. **Inspect/Smell** (per-food) — mushroom: curious head-tilt + stalks wave near it; flower: leans in and takes gentle sniffs (`sniff` sound)
  4. **Bite** (320ms) — mouth snaps wide open, forward lunge, food nudges back
  5. **Chew** (per-food duration) — rhythmic mouth pulses, body wiggles, shell bounces on every chew, crumbs fall, food visibly shrinks bite-by-bite, blush grows
  6. **Swallow** (450ms) — mouth closes, gulp sound, satisfied blush
  7. **Content** (900ms) — happy curved eyes, strong smile, slow satisfied blink, rare tiny burp (`burp` sound + burst)
  8. **Finish** — licks mouth clean, yawning if very full, then resumes exploring
- **5 real pet-snail foods**, each with distinct reaction:
  - Leaf — long slow chew (`munch`)
  - Carrot — quick crunchy chew (`crunch`)
  - Fruit — highest excitement, sparkles while eating (`softMunch`)
  - Mushroom — inspects first, curious head-tilt
  - Flower — smells first, gentle sniffs
- **Distinct food rendering**: leaf (vein), carrot (green top), fruit (stem/leaf/shine), mushroom (stem + spotted cap), flower (6 petals + center), each with per-food colors.
- **Distinct facial expression**: wide curious eyes, focused dilated pupils, excited antennae, chewing open mouth.
- Fullness system (capped 100) triggers a rare yawn-after-meal at ≥70.

---

## 3. Petting Redesign (`SnailEngine.ts`)

### Before
- Petting was a single repeated "reaction" timer — same animation every time, robotic.

### After
- **7-phase gentle sequence**:
  1. **Notice hand** (550ms) — head turns, stalks rotate toward the touch, single blink as the hand arrives
  2. **Tiny caution retract** (820ms) — brief wary pull-back (natural snail behavior)
  3. **Realises it's safe** (1250ms) — relaxes, leans into the hand, shell settles
  4. **Enjoyment** (2900ms) — variation-specific body language + repeated strokes (`squish` sound, sparkles, hearts every 3rd stroke, shell bounces)
  5. **Slow contented blink** (3500ms) — warm winding-down
  6. **Affectionate follow-up** — stays close, keeps smiling, occasionally follows the cursor with a tiny creep, sporadic hearts, and the occasional gentle happy wave of the eye stalks
  7. **Natural return to idle**
- **10 random variations**, never replaying the same one twice in a row: `happyWiggle`, `closeEyes`, `stretchNeck`, `spinShell`, `tinyBounce`, `raiseStalks`, `blush`, `tinyLaugh`, `hidePeek`, `rollToward` — each with unique body language applied during the enjoyment phase.
- **Distinct facial expression**: half-closed happy curved (∩) eyes, gentle smile, relaxed antennae, blush.
- Soft rounded fingertip hand with pad + nail highlight that strokes gently and withdraws.

---

## 4. Expression Rendering (`SnailEngine.ts` `drawEye` / `drawMouth`)

- `eyeHappy` → curved happy lids (soft downward arc) instead of open eyes during contentment.
- `eyeWide` → enlarged eyes + larger pupils for focused feeding excitement.
- `smileStrength` → wider, softer smile arc.
- `mouthOpenness` → fully rendered open mouth (chewing/bite/yawn) with dark inner fill.
- Blush, stalks, head rotation all drive off the same damped state for smooth, non-robotic transitions.

---

## 5. Interaction Guards & Direction Fixes

- `updateHead` / `updateEyeStalks` now yield to the interaction states (`eating`/`petting`) so the sequenced animation isn't overridden by idle physics — no fighting between systems.
- Food and petting hand are now drawn in world space with correct `direction` flip, so they appear on the correct side when the snail faces left.

---

## 6. Context Menu (`ContextMenu.tsx` + `SnailContainer.tsx`)

- Added per-food feed options: `Feed: Leaf / Carrot / Fruit / Mushroom / Flower`, dispatching `snail:feed` with a `foodType` payload.
- `Feed Snail` (no payload) still picks a random food, avoiding the last one eaten.

---

## Files Changed
| File | Change |
|------|--------|
| `src/renderer/audio/interactionSounds.ts` | New — WebAudio synthesized sound kit (10 sounds) |
| `src/renderer/components/shell/SnailEngine.ts` | Phased eating/petting sequences, 10 pet variations, per-food configs, expression rendering, direction-fixed food/hand, interaction guards |
| `src/renderer/components/ui/ContextMenu.tsx` | Per-food feed options |
| `src/renderer/components/shell/SnailContainer.tsx` | Reads `foodType` payload from feed event |

## Verification
- `npm run build` (tsc + vite) passes with no type errors.
- Playwright headless verification: zero console/page errors.
- Feed and pet are visually distinct (food colors render only while eating; hand renders only while petting and withdraws at the end).
- All 5 food types produce distinct color signatures (leaf green, carrot orange, fruit red, mushroom tan, flower purple).
- 60 FPS sustained during chewing (120 frames over 2s, avg 16.6ms/frame, max gap 33ms).
- Petting variations produce different frame signatures across repeated calls; never replays the same variant twice.
