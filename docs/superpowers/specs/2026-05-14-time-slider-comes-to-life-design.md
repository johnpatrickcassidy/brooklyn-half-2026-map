# Time Slider Comes to Life — Design

**Status:** Approved (sections 1-5)
**Date:** 2026-05-14
**Branch:** `explore/time-slider-animation`
**Owner:** John Cassidy

## Goal

Make the time-of-day slider feel like the day is actually progressing from midnight through mid-afternoon, and surface the most actionable race-day milestones (race gun, first road reopening, all clear) directly on the slider.

The slider is the primary scrubbing affordance for the closures map. Today it's a generic black bar with a yellow native thumb and a text time display. The intent is to keep it the same control with the same interaction model, but make it visually communicate "what time of day this is" the moment a user looks at it — and reward scrubbing past key race-day moments.

## Non-goals

- No changes to the closures dataset, the runner-swarm simulation, the sidebar list, or the onboarding overlay.
- No new framework, no build-step changes, no new dependencies.
- No tooltip-on-hover for milestone ticks (mobile-first; v2 if needed).
- No multi-day timeline (slider range stays `-1` to `900` minutes — same as today).

## Approach

The chosen direction is the **Sundial**: the slider track becomes a real sky-color gradient, the thumb becomes a glowing sun, three small notches mark the actionable race milestones, and the upper edge of the map gets a faint sky-tinted overlay that shifts with the slider. A small play button next to the time label lets the user watch the whole race day animate in 60 seconds.

Selected over a louder "cinematic timeline with chyron" direction (too noisy against the existing restrained dark-map aesthetic) and a "sundial arc" curved-control direction (eats vertical space, scrubs worse on mobile).

## Architecture

Vanilla JS, no framework. Three coordinated pieces touching the existing four files:

1. **DOM additions** (`index.html`, ~10 lines)
   - Wrap the existing `<input id="time-slider">` in a positioned container so absolutely-positioned tick overlays can sit on top of it.
   - Add `<button id="time-play">` adjacent to the existing time label.
   - Add `<div id="sky-overlay">` inside `#map-container`.

2. **Styling** (`styles.css`, ~80 new lines)
   - `:root { --sky-gradient: linear-gradient(...); --sun-glow: 0.6; --sky-color-top: #87b8e8; }` — one source of truth for the sky palette.
   - `::-webkit-slider-runnable-track` + `::-moz-range-track` paint the gradient on the input.
   - `::-webkit-slider-thumb` + `::-moz-range-thumb` render the sun (radial gradient + dark border + box-shadow halo driven by `--sun-glow`).
   - `.time-tick` + `.time-tick-label` rules for milestone notches, absolutely positioned within the slider container.
   - `#sky-overlay` rule with vertical fade and `mix-blend-mode`.
   - Play-button styling (22px circular gold).

3. **Behavior** (`app.js`, ~60 new lines)
   - `updateTimeOfDayVisuals(currentMin)` — interpolates sky color from a 10-stop palette table and updates `--sky-color-top`, `--sun-glow`, sky overlay opacity, and the active-tick highlight class.
   - Called from the existing `slider.addEventListener('input', ...)` handler, alongside the existing `updateFilter()`.
   - `togglePlay()` — `requestAnimationFrame` loop that increments slider value and dispatches synthetic `input` events so the same code path runs for auto and manual scrubbing.
   - On startup, computes `firstReopenMin = Math.min(...closuresData.map(c => c.endMin))` and `allClearMin = Math.max(...closuresData.map(c => c.endMin))` and renders the three milestone ticks at `RACE_GUN_MIN = 420`, `firstReopenMin`, and `allClearMin`.

The slider's `min`/`max` (`-1` to `900`) is unchanged. All visual interpolation is keyed off `currentMin` directly.

## Components

### Slider track (sky gradient)

10-stop linear gradient applied to the slider track, mapped to actual hours:

| Time | Slider min | Slider % | Color | Phase |
|---|---|---|---|---|
| 12:00 AM | 0 | 0.1% | `#0b1026` | midnight |
| 4:00 AM | 240 | 26.6% | `#1a1f4a` | deep night |
| 5:30 AM | 330 | 36.6% | `#2a3270` | pre-dawn |
| 6:00 AM | 360 | 40.0% | `#c97f5e` | dawn coral |
| 6:45 AM | 405 | 45.0% | `#f4b860` | sunrise warmth |
| 7:30 AM | 450 | 50.0% | `#87b8e8` | morning sky |
| 10:00 AM | 600 | 66.7% | `#5fa6d9` | mid-morning blue |
| 12:00 PM | 720 | 80.0% | `#6fb3dd` | midday |
| 2:00 PM | 840 | 93.3% | `#e8a55a` | afternoon warm |
| 3:00 PM | 900 | 100% | `#c8743a` | late afternoon |

The same palette table lives in JS for color interpolation of the map sky overlay.

### Sun thumb

22px circle, `radial-gradient(circle at 30% 30%, #fff5d6, #FDB813 60%, #c98c00)`. 2px dark border (`#18181b`) for legibility against any track color. `box-shadow: 0 0 12px rgba(253,184,19, var(--sun-glow))` halo. `--sun-glow` driven by JS:

- `0.15` at night (currentMin < 300 or > 870)
- `0.5` during dawn/dusk (300–420 and 780–870)
- `0.9` at midday (420–780)

**Pre-dawn moon swap:** when `currentMin < 300`, a `.is-night` class on the slider container swaps the thumb's radial gradient to a cool palette (`#e8eef5`, `#9faec1`, `#5a6478`). Single conditional, single extra rule.

### Milestone ticks

Three absolutely-positioned overlays inside the slider container:

| Milestone | Source | Slider value |
|---|---|---|
| Race gun | `RACE_GUN_MIN = 420` constant | 420 |
| First reopening | `Math.min(...closuresData.map(c => c.endMin))` | derived |
| All clear | `Math.max(...closuresData.map(c => c.endMin))` | derived |

Computed once at startup from `closuresData` so future edits to `data.js` don't require touching the slider code.

Each tick is a 2px-wide white vertical line extending 3px above and below the track, opacity 0.85, with a 9px Inter uppercase label below (`GUN`, `REOPEN`, `ALL CLEAR`). `pointer-events: none`.

**Active-tick highlight:** when `Math.abs(currentMin - tick.value) <= 5`, the tick gains `.is-active` class — width grows to 3px, brighter glow, label color shifts to `#FDB813`.

**Mobile (`<480px`):** labels hidden, notches retained.

### Map sky overlay

Single `<div id="sky-overlay">` inside `#map-container`:

- `position: absolute; inset: 0; z-index: 5; pointer-events: none;`
- `background: linear-gradient(to bottom, var(--sky-color-top) 0%, transparent 60%);`
- `mix-blend-mode: multiply` for warm tones (currentMin < 390 or > 810); `mix-blend-mode: screen` for daylight tones (390–810). JS toggles a class to swap.
- Opacity capped at 0.18, scaled by time of day:
  - Peaks (~0.18) during dawn (360–450) and dusk-equivalent late afternoon (810–900) where the color shift is most expressive.
  - Drops to ~0.05 at midday — bright daylight reads as "no tint" rather than blue tint.
  - Rises to ~0.12 at night so the dark sky is visibly present.

Driven by the same `updateTimeOfDayVisuals(currentMin)` that handles the thumb halo. Single CSS-variable update on a single div per frame — no canvas, no map redraw.

### Play button & auto-play

- `<button id="time-play">` with `▶` / `⏸` glyphs, 22px circular, gold on dark, positioned immediately left of "Time:" in the existing slider label row.
- `aria-label` toggles "Play race day" / "Pause".
- Single sweep, slider value `-1` → `900`, **60 seconds total** wall-clock (≈15 simulated min/sec).
- Driven by `requestAnimationFrame`. Each frame: `slider.value += (901 / 60000) * deltaMs`, then `slider.dispatchEvent(new Event('input'))`. The existing `input` handler already calls `updateFilter()`; the new `updateTimeOfDayVisuals()` is wired into the same handler. No duplicated logic.
- **End behavior:** auto-pause at 900, button reverts to ▶, slider stays at end. Pressing play again from the end resets to 0.
- **User-scrub interrupt:** any `input` event with `event.isTrusted === true` cancels the rAF loop and reverts the button to ▶.
- **`prefers-reduced-motion`:** auto-play still works (explicit user opt-in via click), but the sky-overlay opacity is held constant instead of varying through the full range.

## Data flow

```
[user drags slider]    [user clicks play]
        │                       │
        │                       ▼
        │              requestAnimationFrame loop
        │              dispatches synthetic 'input'
        │                       │
        ▼                       ▼
        ────── 'input' event ───────
                    │
                    ▼
        ┌───────────┴───────────┐
        ▼                       ▼
   updateFilter(currentMin)   updateTimeOfDayVisuals(currentMin)
        │                       │
        │                       ├─ set --sky-color-top (interpolate from palette)
        │                       ├─ set --sun-glow
        │                       ├─ set sky-overlay opacity + blend mode
        │                       └─ toggle .is-active on milestone ticks
        │
        ├─ filter polylines on map
        └─ dim non-active items in sidebar list
```

Both functions read from `currentMin` only. They're pure with respect to slider state — no shared mutable state between them.

## Error handling & edge cases

- **Empty `closuresData`:** milestone derivation falls back to safe defaults (`firstReopenMin = 600`, `allClearMin = 750`). Should never happen in production, but prevents NaN ticks if the dataset is ever cleared during development.
- **Slider value out of palette range:** `interpolateSkyColor()` clamps to nearest stop. Specifically, `currentMin = -1` is treated as `0` for color lookup.
- **rAF loop running when tab is backgrounded:** browser already throttles rAF — no special handling needed.
- **Gradient unsupported (very old browser):** track falls back to existing `accent-color: #FDB813` solid via `@supports not (background: linear-gradient(...))`. App already requires modern browsers for Google Maps anyway.

## Testing

This codebase has no test framework. Verification is manual:

1. **Visual smoke test** — `npm run dev`, open in Chrome + Safari + Firefox, scrub slider end-to-end. Confirm: track gradient renders, sun thumb visible at all positions, three notches at correct percentages, labels legible.
2. **Auto-play smoke test** — press play, confirm 60s sweep, confirm pause/resume, confirm scrubbing during play cancels auto-play.
3. **Milestone derivation** — temporarily edit a `closuresData` entry's `endMin`, confirm the REOPEN/ALL CLEAR ticks shift accordingly.
4. **Mobile** — Chrome devtools mobile emulation at 375px and 480px. Confirm tick labels hide under 480px, play button stays tappable, sky overlay still renders.
5. **`prefers-reduced-motion`** — toggle in devtools, confirm auto-play still works but sky-overlay opacity stays constant.
6. **Map sky overlay** — confirm `pointer-events: none` actually passes clicks/drags through to the map (try clicking a closure with overlay at peak opacity).

## Files touched

- `index.html` — DOM additions for slider container wrapper, play button, sky overlay div
- `styles.css` — slider gradient + thumb + ticks + sky overlay + play button rules
- `app.js` — `updateTimeOfDayVisuals()`, `togglePlay()`, milestone derivation, palette interpolation
- `docs/superpowers/specs/2026-05-14-time-slider-comes-to-life-design.md` — this doc
