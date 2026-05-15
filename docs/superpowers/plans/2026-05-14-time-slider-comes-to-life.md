# Time Slider Comes to Life — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the time-of-day slider from a generic black bar into a "Sundial" that paints the sky's color across the day, glows like the sun on a thumb, marks three race-day milestones, and tints the map with a faint sky overlay — with a play button that animates the whole race day in 60 seconds.

**Architecture:** Pure additive changes to four existing files (`index.html`, `styles.css`, `app.js`, plus this plan). One source-of-truth sky palette in JS drives a CSS variable consumed by both the slider track gradient and the map sky overlay. The existing `slider.addEventListener('input', …)` handler remains the single entry point — auto-play just dispatches synthetic input events into it. No new framework, no build-step changes, no new dependencies.

**Tech Stack:** Vanilla HTML/CSS/JS, Google Maps JS API. CSS variables, vendor-prefixed `::-*-slider-thumb`/`::-*-slider-track` pseudo-elements, `requestAnimationFrame`, `mix-blend-mode`.

**Testing approach:** This project has no test framework (per spec). Each task ends with a manual browser-verification step run against `npm run dev` (which serves the static files via `npx serve`). Verification is in Chrome unless otherwise noted; cross-browser pass happens in the final task.

**Reference spec:** `docs/superpowers/specs/2026-05-14-time-slider-comes-to-life-design.md`

---

## File Structure

All changes are additive into existing files. No new source files.

| File | What changes |
|---|---|
| `index.html` | Wrap `#time-slider` in a positioned container; add `#time-play` button; add `#sky-overlay` div inside `#map-container` |
| `styles.css` | New `:root` CSS variables; slider track + thumb pseudo-element rules; tick + label rules; sky-overlay rules; play-button rules; mobile media-query polish |
| `app.js` | New constants (`SKY_PALETTE`, `RACE_GUN_MIN`); helper functions (`interpolateSkyColor`, `lerpHex`, `mapRange`); milestone derivation; `updateTimeOfDayVisuals(currentMin)`; `togglePlay()`; tick render-on-startup; play button + slider input wiring |

App.js currently keeps all the slider logic in one IIFE inside `initMap()`. New code lives in the same scope so it can use the existing `slider`/`timeDisplay` references and the existing `closuresData` global.

---

## Task 1: Sky palette + CSS variables, paint slider track gradient

**Files:**
- Modify: `styles.css` (add `:root` block near top; replace `#time-slider` rule at ~343)
- Modify: `app.js` (add palette constant near top of `initMap()`)

- [ ] **Step 1: Add CSS variables and gradient to `:root`**

In `styles.css`, add a `:root` block at the very top of the file (line 1, before any other rule). If a `:root` block already exists, merge into it.

```css
:root {
    --sky-gradient: linear-gradient(
        to right,
        #0b1026 0%,
        #1a1f4a 26.6%,
        #2a3270 36.6%,
        #c97f5e 40%,
        #f4b860 45%,
        #87b8e8 50%,
        #5fa6d9 66.7%,
        #6fb3dd 80%,
        #e8a55a 93.3%,
        #c8743a 100%
    );
    --sky-color-top: #87b8e8;
    --sun-glow: 0.6;
    --sky-overlay-opacity: 0.05;
}
```

- [ ] **Step 2: Replace the existing `#time-slider` rule with track-gradient styling**

In `styles.css`, find the existing rule (around line 343):

```css
#time-slider {
    width: 100%;
    accent-color: #FDB813;
    cursor: pointer;
}
```

Replace it with:

```css
#time-slider {
    width: 100%;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    height: 22px;
    margin: 0;
    padding: 0;
}

/* Sky-gradient track — Chrome/Safari */
#time-slider::-webkit-slider-runnable-track {
    height: 12px;
    border-radius: 6px;
    background: var(--sky-gradient);
    border: 1px solid rgba(0, 0, 0, 0.3);
}

/* Sky-gradient track — Firefox */
#time-slider::-moz-range-track {
    height: 12px;
    border-radius: 6px;
    background: var(--sky-gradient);
    border: 1px solid rgba(0, 0, 0, 0.3);
}

/* Fallback if linear-gradient unsupported */
@supports not (background: linear-gradient(to right, #000, #fff)) {
    #time-slider {
        accent-color: #FDB813;
        height: auto;
    }
}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev` (serves on http://localhost:3000 by default)

Open http://localhost:3000 in Chrome. Inspect the time slider in the sidebar.

Expected: Track is no longer a solid black bar — it shows a horizontal gradient from deep midnight blue on the left through dawn orange, daylight blue, to warm afternoon orange on the right. Thumb is still the default browser style (we'll style it next).

If the track is still black: hard-reload (Cmd+Shift+R) to bypass cache.

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "feat(slider): paint sky-gradient on time slider track"
```

---

## Task 2: Sun thumb (radial gradient + halo)

**Files:**
- Modify: `styles.css` (add thumb pseudo-element rules below the track rules from Task 1)

- [ ] **Step 1: Add sun thumb styling**

In `styles.css`, immediately after the `@supports not` block from Task 1, add:

```css
/* Sun thumb — Chrome/Safari */
#time-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #fff5d6, #FDB813 60%, #c98c00);
    border: 2px solid #18181b;
    box-shadow: 0 0 12px rgba(253, 184, 19, var(--sun-glow));
    cursor: grab;
    margin-top: -7px; /* center 22px thumb on 12px track (1px border each side) */
}

#time-slider::-webkit-slider-thumb:active {
    cursor: grabbing;
}

/* Sun thumb — Firefox */
#time-slider::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #fff5d6, #FDB813 60%, #c98c00);
    border: 2px solid #18181b;
    box-shadow: 0 0 12px rgba(253, 184, 19, var(--sun-glow));
    cursor: grab;
}
```

- [ ] **Step 2: Verify in browser**

Reload http://localhost:3000.

Expected: The slider thumb is now a small (~22px) glowing yellow-orange circle with a dark border, sitting centered on the gradient track. A soft yellow halo surrounds it. Drag the thumb — it stays glowing and smooth.

Verify the thumb stays vertically centered on the track at all positions (the `margin-top: -7px` does this in Chrome).

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat(slider): replace native thumb with glowing sun"
```

---

## Task 3: Wrap slider in positioned container

**Files:**
- Modify: `index.html` (lines 56-59: wrap the `<input>` in a positioned div for tick overlays)
- Modify: `styles.css` (`.slider-container` and a new `.slider-track-wrap` rule)

- [ ] **Step 1: Wrap the slider input in a positioning container**

In `index.html`, replace lines 56-59:

```html
                <div class="slider-container">
                    <label for="time-slider">Time: <span id="time-display">7:00 AM</span></label>
                    <input type="range" id="time-slider" min="-1" max="900" value="420" step="1">
                </div>
```

with:

```html
                <div class="slider-container">
                    <label for="time-slider">Time: <span id="time-display">7:00 AM</span></label>
                    <div class="slider-track-wrap">
                        <input type="range" id="time-slider" min="-1" max="900" value="420" step="1">
                    </div>
                </div>
```

- [ ] **Step 2: Add `.slider-track-wrap` styling**

In `styles.css`, immediately after the existing `.slider-container span` rule (around line 339-341), add:

```css
.slider-track-wrap {
    position: relative;
    padding: 14px 0; /* room above for tick labels (added in Task 5) */
}
```

- [ ] **Step 3: Verify in browser**

Reload http://localhost:3000.

Expected: Slider is unchanged visually except for slightly more vertical padding around it. Drag still works. Inspect element — slider is now nested inside `<div class="slider-track-wrap">`.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat(slider): wrap input in positioned container for tick overlays"
```

---

## Task 4: Sky palette in JS + interpolation helpers

**Files:**
- Modify: `app.js` (add constants + helpers near top of `initMap()`, before "Time Slider Logic" comment around line 230)

- [ ] **Step 1: Add palette and helper functions inside `initMap()`**

In `app.js`, immediately before the line `// Time Slider Logic` (around line 230), insert:

```js
    // ===== Sundial: sky palette and interpolation =====
    const RACE_GUN_MIN = 420; // 7:00 AM, when the first wave goes off

    // Hour-keyed sky palette. Each stop: [sliderMin, hexColor].
    // Mirrors the CSS gradient stops in :root --sky-gradient.
    const SKY_PALETTE = [
        [0,   '#0b1026'], // 12:00 AM midnight
        [240, '#1a1f4a'], // 4:00 AM deep night
        [330, '#2a3270'], // 5:30 AM pre-dawn
        [360, '#c97f5e'], // 6:00 AM dawn coral
        [405, '#f4b860'], // 6:45 AM sunrise
        [450, '#87b8e8'], // 7:30 AM morning sky
        [600, '#5fa6d9'], // 10:00 AM mid-morning
        [720, '#6fb3dd'], // 12:00 PM midday
        [840, '#e8a55a'], // 2:00 PM afternoon warm
        [900, '#c8743a'], // 3:00 PM late afternoon
    ];

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function rgbToHex([r, g, b]) {
        const h = (v) => Math.round(v).toString(16).padStart(2, '0');
        return `#${h(r)}${h(g)}${h(b)}`;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function interpolateSkyColor(currentMin) {
        // Clamp to palette range
        if (currentMin <= SKY_PALETTE[0][0]) return SKY_PALETTE[0][1];
        if (currentMin >= SKY_PALETTE[SKY_PALETTE.length - 1][0]) {
            return SKY_PALETTE[SKY_PALETTE.length - 1][1];
        }
        // Find bracketing stops
        for (let i = 0; i < SKY_PALETTE.length - 1; i++) {
            const [m1, c1] = SKY_PALETTE[i];
            const [m2, c2] = SKY_PALETTE[i + 1];
            if (currentMin >= m1 && currentMin <= m2) {
                const t = (currentMin - m1) / (m2 - m1);
                const rgb1 = hexToRgb(c1);
                const rgb2 = hexToRgb(c2);
                return rgbToHex([
                    lerp(rgb1[0], rgb2[0], t),
                    lerp(rgb1[1], rgb2[1], t),
                    lerp(rgb1[2], rgb2[2], t),
                ]);
            }
        }
        return SKY_PALETTE[0][1]; // unreachable
    }
```

- [ ] **Step 2: Verify the interpolation works in the console**

Reload http://localhost:3000. Open Chrome DevTools → Console. The helpers are inside `initMap()`'s closure so they're not directly accessible — instead, paste this one-off probe into the console to validate the math by recreating the function inline:

```js
// Quick console sanity check — paste and run
(function check() {
    const stops = [[0,'#0b1026'],[450,'#87b8e8'],[900,'#c8743a']];
    function h2r(h){const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]}
    function lerp(a,b,t){return a+(b-a)*t}
    // At t=0.5 between #87b8e8 and #c8743a, expect a midpoint blend
    const a = h2r('#87b8e8'), b = h2r('#c8743a');
    console.log('midpoint:', [
        Math.round(lerp(a[0],b[0],0.5)),
        Math.round(lerp(a[1],b[1],0.5)),
        Math.round(lerp(a[2],b[2],0.5)),
    ]);
    // Expected: approx [167, 150, 145]
})();
```

Expected console output: `midpoint: (3) [167, 150, 145]` (or values within ±1).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat(slider): add sky palette and color interpolation helpers"
```

---

## Task 5: `updateTimeOfDayVisuals` driving sun glow + pre-dawn moon

**Files:**
- Modify: `app.js` (add function below `interpolateSkyColor`; call it from existing input listener and initial setTimeout)
- Modify: `styles.css` (add `.is-night` thumb override)

- [ ] **Step 1: Add the `updateTimeOfDayVisuals` function**

In `app.js`, immediately after the `interpolateSkyColor` function from Task 4, add:

```js
    function updateTimeOfDayVisuals(currentMin) {
        const root = document.documentElement;
        const wrap = document.querySelector('.slider-track-wrap');

        // Sun glow intensity by phase
        let glow;
        if (currentMin < 300 || currentMin > 870) {
            glow = 0.15; // night
        } else if (currentMin < 420 || currentMin > 780) {
            glow = 0.5;  // dawn / late afternoon
        } else {
            glow = 0.9;  // midday
        }
        root.style.setProperty('--sun-glow', glow.toFixed(2));

        // Moon swap — cool-palette thumb before 5:00 AM
        if (wrap) {
            wrap.classList.toggle('is-night', currentMin < 300);
        }
    }
```

- [ ] **Step 2: Wire it into the existing slider input handler and startup**

In `app.js`, find the existing block (around line 286-292):

```js
    slider.addEventListener('input', (e) => {
        updateFilter(parseInt(e.target.value, 10));
    });

    setTimeout(() => {
        updateFilter(parseInt(slider.value, 10));
    }, 6000);
```

Replace it with:

```js
    slider.addEventListener('input', (e) => {
        const currentMin = parseInt(e.target.value, 10);
        updateFilter(currentMin);
        updateTimeOfDayVisuals(currentMin);
    });

    // Initial paint — visuals can fire immediately, filter waits for map
    updateTimeOfDayVisuals(parseInt(slider.value, 10));
    setTimeout(() => {
        updateFilter(parseInt(slider.value, 10));
    }, 6000);
```

- [ ] **Step 3: Add `.is-night` thumb override to CSS**

In `styles.css`, immediately after the `#time-slider::-moz-range-thumb` rule from Task 2, add:

```css
/* Pre-dawn moon swap — cool palette */
.slider-track-wrap.is-night #time-slider::-webkit-slider-thumb {
    background: radial-gradient(circle at 30% 30%, #e8eef5, #9faec1 60%, #5a6478);
    box-shadow: 0 0 8px rgba(159, 174, 193, var(--sun-glow));
}
.slider-track-wrap.is-night #time-slider::-moz-range-thumb {
    background: radial-gradient(circle at 30% 30%, #e8eef5, #9faec1 60%, #5a6478);
    box-shadow: 0 0 8px rgba(159, 174, 193, var(--sun-glow));
}
```

- [ ] **Step 4: Verify in browser**

Reload http://localhost:3000.

Expected at default (slider at 420 = 7:00 AM): thumb is the bright sun with strong halo (`--sun-glow: 0.9`).

Drag the slider all the way left (to ~0 = 12:00 AM): thumb becomes a cool-palette circle (the moon) with a softer cool halo. The `--sun-glow` CSS variable in DevTools shows `0.15`.

Drag back to 7:00 AM: returns to bright sun.

Drag to 2:30 PM (840): thumb is sun-colored, halo dims (glow `0.5`).

- [ ] **Step 5: Commit**

```bash
git add app.js styles.css
git commit -m "feat(slider): drive sun glow + pre-dawn moon swap from time"
```

---

## Task 6: Milestone tick markers (DOM + CSS + JS rendering)

**Files:**
- Modify: `app.js` (compute milestones at startup; render ticks into `.slider-track-wrap`)
- Modify: `styles.css` (`.time-tick`, `.time-tick-label` rules)

- [ ] **Step 1: Add tick CSS rules**

In `styles.css`, after the `.is-night` rules from Task 5, add:

```css
.time-tick {
    position: absolute;
    top: 8px; /* matches .slider-track-wrap padding-top: 14px minus 6px to sit on track */
    bottom: 8px;
    width: 2px;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 1px;
    transform: translateX(-50%);
    pointer-events: none;
    transition: width 120ms ease-out, background-color 120ms ease-out;
}

.time-tick-label {
    position: absolute;
    top: 100%;
    left: 0;
    transform: translateX(-50%);
    margin-top: 2px;
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #a1a1aa;
    white-space: nowrap;
    pointer-events: none;
    transition: color 120ms ease-out;
}
```

- [ ] **Step 2: Add milestone derivation + rendering in `app.js`**

In `app.js`, immediately AFTER the existing `slider.addEventListener('input', …)` block (the one you replaced in Task 5 Step 2 — so directly after the `setTimeout(...)` block), add:

```js
    // ===== Milestone ticks =====
    function deriveMilestones() {
        const validEnds = closuresData
            .map(c => c.endMin)
            .filter(m => Number.isFinite(m));
        const firstReopen = validEnds.length ? Math.min(...validEnds) : 600;
        const allClear = validEnds.length ? Math.max(...validEnds) : 750;
        return [
            { id: 'gun',     value: RACE_GUN_MIN, label: 'GUN' },
            { id: 'reopen',  value: firstReopen,  label: 'REOPEN' },
            { id: 'allclear',value: allClear,     label: 'ALL CLEAR' },
        ];
    }

    function renderMilestoneTicks() {
        const wrap = document.querySelector('.slider-track-wrap');
        if (!wrap) return;
        const sliderMin = parseInt(slider.min, 10);
        const sliderMax = parseInt(slider.max, 10);
        const range = sliderMax - sliderMin;

        deriveMilestones().forEach(ms => {
            const pct = ((ms.value - sliderMin) / range) * 100;

            const tick = document.createElement('div');
            tick.className = 'time-tick';
            tick.dataset.milestone = ms.id;
            tick.dataset.value = String(ms.value);
            tick.style.left = `${pct}%`;

            const label = document.createElement('div');
            label.className = 'time-tick-label';
            label.dataset.milestone = ms.id;
            label.style.left = `${pct}%`;
            label.textContent = ms.label;

            wrap.appendChild(tick);
            wrap.appendChild(label);
        });
    }

    renderMilestoneTicks();
```

- [ ] **Step 3: Verify in browser**

Reload http://localhost:3000.

Expected: Three thin white vertical notches now appear on the slider track. Below each notch, small uppercase grey labels: `GUN` (around the middle, at 7:00 AM = ~46.7%), `REOPEN` (further right), and `ALL CLEAR` (further right still). The thumb still drags freely past them — they don't block interaction.

Open DevTools → inspect a tick — confirm `pointer-events: none`.

In the console, run `document.querySelectorAll('.time-tick').length` — expected: `3`.

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "feat(slider): add three milestone notches (gun, reopen, all clear)"
```

---

## Task 7: Active-tick highlight when scrubbing past milestone

**Files:**
- Modify: `app.js` (extend `updateTimeOfDayVisuals` to set `.is-active` on the nearest tick)
- Modify: `styles.css` (`.is-active` rules for tick + label)

- [ ] **Step 1: Add active-state CSS**

In `styles.css`, immediately after the `.time-tick-label` rule from Task 6, add:

```css
.time-tick.is-active {
    width: 3px;
    background: #FDB813;
    box-shadow: 0 0 6px rgba(253, 184, 19, 0.8);
}

.time-tick-label.is-active {
    color: #FDB813;
}
```

- [ ] **Step 2: Update `updateTimeOfDayVisuals` to drive the active state**

In `app.js`, replace the entire `updateTimeOfDayVisuals` function from Task 5 with this expanded version:

```js
    function updateTimeOfDayVisuals(currentMin) {
        const root = document.documentElement;
        const wrap = document.querySelector('.slider-track-wrap');

        // Sun glow intensity by phase
        let glow;
        if (currentMin < 300 || currentMin > 870) {
            glow = 0.15;
        } else if (currentMin < 420 || currentMin > 780) {
            glow = 0.5;
        } else {
            glow = 0.9;
        }
        root.style.setProperty('--sun-glow', glow.toFixed(2));

        // Moon swap — cool-palette thumb before 5:00 AM
        if (wrap) {
            wrap.classList.toggle('is-night', currentMin < 300);
        }

        // Active milestone tick (within ±5 min of value)
        document.querySelectorAll('.time-tick, .time-tick-label').forEach(el => {
            const tickEl = el.classList.contains('time-tick') ? el : null;
            const valueEl = tickEl || document.querySelector(
                `.time-tick[data-milestone="${el.dataset.milestone}"]`
            );
            if (!valueEl) return;
            const tickValue = parseInt(valueEl.dataset.value, 10);
            const isActive = Math.abs(currentMin - tickValue) <= 5;
            el.classList.toggle('is-active', isActive);
        });
    }
```

- [ ] **Step 3: Verify in browser**

Reload http://localhost:3000.

Default position is 420 (7:00 AM) which is exactly the `GUN` milestone. Expected: the GUN tick is **gold and slightly thicker**, label color is gold (`#FDB813`).

Drag slider one minute earlier or later — within ±5 min the GUN tick stays gold. Drag further away (e.g. to 7:30 AM) — GUN reverts to white/grey.

Drag past the REOPEN tick — it should glow gold briefly as you pass within ±5 min, then revert. Same for ALL CLEAR.

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "feat(slider): highlight milestone tick when scrubbing past it"
```

---

## Task 8: Map sky overlay div + base styling

**Files:**
- Modify: `index.html` (add `<div id="sky-overlay">` inside `#map-container`, just below `<div id="map">`)
- Modify: `styles.css` (add `#sky-overlay` rule)

- [ ] **Step 1: Add the sky-overlay element to the DOM**

In `index.html`, find the existing `#map-container` block (around lines 65-67):

```html
        <main id="map-container" style="position: relative;">
            <div id="map"></div>
            <!-- Floating Persistent Map Legend -->
```

Add `<div id="sky-overlay" aria-hidden="true"></div>` between `<div id="map"></div>` and the legend comment:

```html
        <main id="map-container" style="position: relative;">
            <div id="map"></div>
            <div id="sky-overlay" aria-hidden="true"></div>
            <!-- Floating Persistent Map Legend -->
```

- [ ] **Step 2: Add `#sky-overlay` CSS**

In `styles.css`, at the end of the file (after the existing `.solid-trace.glowing` rule around line 368), add:

```css
/* Map sky overlay — tints the upper portion of the map by time of day */
#sky-overlay {
    position: absolute;
    inset: 0;
    z-index: 1; /* above map tiles, below all UI overlays (legend, popups, etc. all use z-index >= 10) */
    pointer-events: none;
    background: linear-gradient(to bottom, var(--sky-color-top) 0%, transparent 60%);
    opacity: var(--sky-overlay-opacity);
    mix-blend-mode: multiply;
    transition: opacity 200ms ease-out;
}

#sky-overlay.is-daylight {
    mix-blend-mode: screen;
}
```

- [ ] **Step 3: Verify in browser**

Reload http://localhost:3000.

Expected: A very faint blue tint appears at the top of the map, fading to transparent as you look down. Drag and click on the map — interactions still work (overlay does not block clicks). Click on a closure polyline — popup still opens. The overlay opacity is whatever `--sky-overlay-opacity` is set to (currently `0.05` from Task 1) — quite subtle.

In DevTools console, confirm: `getComputedStyle(document.getElementById('sky-overlay')).pointerEvents` returns `"none"`.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat(map): add sky-overlay element above map tiles"
```

---

## Task 9: Drive sky overlay color, opacity, and blend mode from time

**Files:**
- Modify: `app.js` (extend `updateTimeOfDayVisuals` to update overlay)

- [ ] **Step 1: Extend `updateTimeOfDayVisuals` to update the overlay**

In `app.js`, replace the entire `updateTimeOfDayVisuals` function from Task 7 with:

```js
    function updateTimeOfDayVisuals(currentMin) {
        const root = document.documentElement;
        const wrap = document.querySelector('.slider-track-wrap');
        const overlay = document.getElementById('sky-overlay');

        // Sun glow intensity by phase
        let glow;
        if (currentMin < 300 || currentMin > 870) {
            glow = 0.15;
        } else if (currentMin < 420 || currentMin > 780) {
            glow = 0.5;
        } else {
            glow = 0.9;
        }
        root.style.setProperty('--sun-glow', glow.toFixed(2));

        // Moon swap
        if (wrap) {
            wrap.classList.toggle('is-night', currentMin < 300);
        }

        // Active milestone tick (within ±5 min)
        document.querySelectorAll('.time-tick, .time-tick-label').forEach(el => {
            const tickEl = el.classList.contains('time-tick') ? el : null;
            const valueEl = tickEl || document.querySelector(
                `.time-tick[data-milestone="${el.dataset.milestone}"]`
            );
            if (!valueEl) return;
            const tickValue = parseInt(valueEl.dataset.value, 10);
            const isActive = Math.abs(currentMin - tickValue) <= 5;
            el.classList.toggle('is-active', isActive);
        });

        // Map sky overlay: color, opacity, blend mode
        const skyColor = interpolateSkyColor(currentMin);
        root.style.setProperty('--sky-color-top', skyColor);

        // Opacity by phase: peaks at dawn (360-450) and late afternoon (810-900),
        // dips at midday (~0.05), held at ~0.12 at night so dark sky reads.
        let overlayOpacity;
        if (currentMin < 300) {
            overlayOpacity = 0.12; // night
        } else if (currentMin < 360) {
            // pre-dawn ramp 0.12 -> 0.18
            overlayOpacity = 0.12 + (currentMin - 300) / 60 * 0.06;
        } else if (currentMin < 450) {
            // dawn peak 0.18 -> tapering to 0.10 by 7:30 AM
            overlayOpacity = 0.18 - (currentMin - 360) / 90 * 0.08;
        } else if (currentMin < 600) {
            // morning 0.10 -> 0.05
            overlayOpacity = 0.10 - (currentMin - 450) / 150 * 0.05;
        } else if (currentMin < 810) {
            overlayOpacity = 0.05; // midday floor
        } else if (currentMin < 900) {
            // late-afternoon ramp 0.05 -> 0.18
            overlayOpacity = 0.05 + (currentMin - 810) / 90 * 0.13;
        } else {
            overlayOpacity = 0.18;
        }
        root.style.setProperty('--sky-overlay-opacity', overlayOpacity.toFixed(3));

        // Blend mode: screen for daylight (390-810), multiply otherwise
        if (overlay) {
            const isDaylight = currentMin >= 390 && currentMin <= 810;
            overlay.classList.toggle('is-daylight', isDaylight);
        }
    }
```

- [ ] **Step 2: Verify in browser**

Reload http://localhost:3000.

Drag slider through the full range. Expected:
- **0 AM:** map gets a noticeable cool dark-blue tint at the top (~12% opacity, multiply blend).
- **6:00 AM:** tint becomes warm coral/orange — the dawn moment is the most visually pronounced (~18% opacity, multiply).
- **7:30 AM onward:** sky shifts to blue, opacity drops, blend switches to `screen` (brighter, lighter feel).
- **12:00 PM:** sky is bright blue but very subtle (5% opacity).
- **2:30 PM:** sky warms back to orange and intensifies (~16% opacity).

Watch DevTools → Elements → `<html>` `style` attribute — `--sky-color-top` and `--sky-overlay-opacity` should update on every drag.

Confirm map is still interactive at peak overlay opacity (drag, zoom, click a closure).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat(map): drive sky overlay color/opacity/blend from time of day"
```

---

## Task 10: Play button DOM + styling

**Files:**
- Modify: `index.html` (add `<button id="time-play">` inside the slider label)
- Modify: `styles.css` (`#time-play` rule)

- [ ] **Step 1: Add the button to the slider container**

In `index.html`, find the slider container (lines 56-61 from Task 3 changes):

```html
                <div class="slider-container">
                    <label for="time-slider">Time: <span id="time-display">7:00 AM</span></label>
                    <div class="slider-track-wrap">
                        <input type="range" id="time-slider" min="-1" max="900" value="420" step="1">
                    </div>
                </div>
```

Replace with:

```html
                <div class="slider-container">
                    <label for="time-slider">
                        <button id="time-play" type="button" aria-label="Play race day">▶</button>
                        Time: <span id="time-display">7:00 AM</span>
                    </label>
                    <div class="slider-track-wrap">
                        <input type="range" id="time-slider" min="-1" max="900" value="420" step="1">
                    </div>
                </div>
```

- [ ] **Step 2: Add `#time-play` CSS**

In `styles.css`, immediately after the `.slider-container span` rule (around line 339-341), add:

```css
#time-play {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #FDB813;
    color: #0a0a0c;
    border: none;
    cursor: pointer;
    font-size: 10px;
    line-height: 1;
    padding: 0 0 0 1px; /* nudge play glyph optically center */
    margin-right: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    transition: background-color 120ms ease-out, transform 80ms ease-out;
}

#time-play:hover {
    background: #ffc83a;
}

#time-play:active {
    transform: scale(0.92);
}

#time-play.is-playing {
    padding: 0; /* pause glyph centers natively */
}
```

- [ ] **Step 3: Verify in browser**

Reload http://localhost:3000.

Expected: A small gold circular play button (22px) sits to the left of "Time:" in the slider label. The `▶` glyph is roughly centered. Hover — slightly brighter gold. Click — small scale-down animation but no behavior yet (we wire it next).

Tab into the page — the play button should be focusable via keyboard.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat(slider): add play button to slider label"
```

---

## Task 11: Auto-play loop with scrub interrupt + reduced motion

**Files:**
- Modify: `app.js` (add `togglePlay`, rAF loop, button wiring; modify input listener for trusted-event interrupt)

- [ ] **Step 1: Add play state, rAF loop, and button wiring**

In `app.js`, immediately AFTER `renderMilestoneTicks();` (added in Task 6 Step 2), add:

```js
    // ===== Auto-play loop =====
    const playBtn = document.getElementById('time-play');
    const PLAY_DURATION_MS = 60000; // 60s for full midnight -> 3 PM sweep
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = null;
    let lastFrameTs = null;
    let isPlaying = false;

    function setPlayingState(playing) {
        isPlaying = playing;
        if (!playBtn) return;
        playBtn.textContent = playing ? '❚❚' : '▶';
        playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play race day');
        playBtn.classList.toggle('is-playing', playing);
    }

    function stopPlay() {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
        lastFrameTs = null;
        setPlayingState(false);
    }

    function startPlay() {
        const sliderMin = parseInt(slider.min, 10);
        const sliderMax = parseInt(slider.max, 10);
        const range = sliderMax - sliderMin;
        const minsPerMs = range / PLAY_DURATION_MS;

        // If at the end, reset to start
        if (parseInt(slider.value, 10) >= sliderMax) {
            slider.value = String(sliderMin);
            slider.dispatchEvent(new Event('input')); // synthetic — not isTrusted
        }

        setPlayingState(true);
        lastFrameTs = null;

        function frame(ts) {
            if (!isPlaying) return;
            if (lastFrameTs === null) lastFrameTs = ts;
            const dt = ts - lastFrameTs;
            lastFrameTs = ts;

            const next = parseInt(slider.value, 10) + minsPerMs * dt;
            if (next >= sliderMax) {
                slider.value = String(sliderMax);
                slider.dispatchEvent(new Event('input'));
                stopPlay();
                return;
            }
            slider.value = String(Math.round(next));
            slider.dispatchEvent(new Event('input'));
            rafId = requestAnimationFrame(frame);
        }
        rafId = requestAnimationFrame(frame);
    }

    function togglePlay() {
        if (isPlaying) {
            stopPlay();
        } else {
            startPlay();
        }
    }

    if (playBtn) {
        playBtn.addEventListener('click', togglePlay);
    }
```

- [ ] **Step 2: Add the trusted-event interrupt to the input listener**

In `app.js`, find the slider input listener that you updated in Task 5 Step 2:

```js
    slider.addEventListener('input', (e) => {
        const currentMin = parseInt(e.target.value, 10);
        updateFilter(currentMin);
        updateTimeOfDayVisuals(currentMin);
    });
```

Replace it with:

```js
    slider.addEventListener('input', (e) => {
        const currentMin = parseInt(e.target.value, 10);
        // User scrub interrupts auto-play; synthetic events from rAF loop don't
        if (e.isTrusted && isPlaying) {
            stopPlay();
        }
        updateFilter(currentMin);
        updateTimeOfDayVisuals(currentMin);
    });
```

Note on ordering: this listener references `isPlaying` and `stopPlay`, which are declared in Step 1. Since both Step 1 and Step 2 execute inside the same `initMap()` IIFE and Step 1's code is added BEFORE this listener in execution order... wait, no. Step 1's code is added AFTER `renderMilestoneTicks();`, which is itself AFTER the listener. So the listener fires before `isPlaying`/`stopPlay` are declared at parse time, but JavaScript `let` declarations are scoped to the whole block — the listener callback closes over them lazily, so by the time the event fires they exist. **This is fine** — but only because the variable references are inside a callback, not at the top level.

If you prefer to be explicit, hoist the declarations: move `let rafId = null; let lastFrameTs = null; let isPlaying = false;` to the very top of the auto-play block (immediately before `setPlayingState`), which they already are. No change needed.

- [ ] **Step 3: Reduced-motion handling for sky overlay**

In `app.js`, find the sky overlay opacity logic inside `updateTimeOfDayVisuals` (the `let overlayOpacity` block from Task 9). Wrap it so reduced-motion users see a flat opacity:

Replace this section in `updateTimeOfDayVisuals`:

```js
        // Opacity by phase: peaks at dawn (360-450) and late afternoon (810-900),
        // dips at midday (~0.05), held at ~0.12 at night so dark sky reads.
        let overlayOpacity;
        if (currentMin < 300) {
            overlayOpacity = 0.12;
        } else if (currentMin < 360) {
            overlayOpacity = 0.12 + (currentMin - 300) / 60 * 0.06;
        } else if (currentMin < 450) {
            overlayOpacity = 0.18 - (currentMin - 360) / 90 * 0.08;
        } else if (currentMin < 600) {
            overlayOpacity = 0.10 - (currentMin - 450) / 150 * 0.05;
        } else if (currentMin < 810) {
            overlayOpacity = 0.05;
        } else if (currentMin < 900) {
            overlayOpacity = 0.05 + (currentMin - 810) / 90 * 0.13;
        } else {
            overlayOpacity = 0.18;
        }
```

with:

```js
        // Opacity by phase: peaks at dawn (360-450) and late afternoon (810-900),
        // dips at midday (~0.05), held at ~0.12 at night so dark sky reads.
        // Reduced-motion users get a flat opacity to avoid pulsing during auto-play.
        let overlayOpacity;
        if (reducedMotion) {
            overlayOpacity = 0.08;
        } else if (currentMin < 300) {
            overlayOpacity = 0.12;
        } else if (currentMin < 360) {
            overlayOpacity = 0.12 + (currentMin - 300) / 60 * 0.06;
        } else if (currentMin < 450) {
            overlayOpacity = 0.18 - (currentMin - 360) / 90 * 0.08;
        } else if (currentMin < 600) {
            overlayOpacity = 0.10 - (currentMin - 450) / 150 * 0.05;
        } else if (currentMin < 810) {
            overlayOpacity = 0.05;
        } else if (currentMin < 900) {
            overlayOpacity = 0.05 + (currentMin - 810) / 90 * 0.13;
        } else {
            overlayOpacity = 0.18;
        }
```

- [ ] **Step 4: Verify auto-play in browser**

Reload http://localhost:3000.

1. Click the play button (`▶`). Expected:
   - Glyph swaps to `❚❚` (pause).
   - Slider thumb begins moving smoothly from its current position toward the right.
   - Sky gradient sweep is visible: track gradient appears to "scroll" under the thumb (the thumb traverses the full range over ~60 seconds).
   - Map sky overlay fades through the day's colors.
   - Closure list items fade in/out as their windows pass.
2. Mid-play, drag the slider with the mouse. Expected:
   - Auto-play stops immediately (button reverts to `▶`).
   - Slider stays where you released it.
3. Click play again from the right edge. Expected:
   - Slider snaps back to start (-1) and replays.
4. Let the play complete naturally. Expected:
   - Slider parks at 900 (3:00 PM), button reverts to `▶`.
5. DevTools → Rendering → enable "Emulate CSS media feature `prefers-reduced-motion: reduce`". Reload and click play. Expected:
   - Auto-play still works (explicit user action).
   - Sky overlay opacity stays flat at ~0.08 instead of varying — track and thumb still change color/glow normally.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat(slider): auto-play race day in 60s with scrub interrupt"
```

---

## Task 12: Mobile polish — hide tick labels under 480px

**Files:**
- Modify: `styles.css` (extend the existing `@media (max-width: 480px)` block, or add new media query)

- [ ] **Step 1: Find the existing mobile media query**

The mobile styles live around `styles.css:179-234` (the existing `@media (max-width: 480px)` block — search for `(max-width: 480px)` to find it). Inside that block, after the existing `.slider-container` rule near line 216, add:

```css
    .time-tick-label {
        display: none;
    }

    .slider-track-wrap {
        padding: 8px 0; /* less vertical room needed without labels */
    }
```

- [ ] **Step 2: Verify in browser**

Reload http://localhost:3000. Open DevTools → toggle device toolbar (Cmd+Shift+M) → choose iPhone 12 Pro (390px) or set width to 375px.

Expected: Tick notches are still visible on the slider, but the `GUN`/`REOPEN`/`ALL CLEAR` labels are gone. The slider is more compact vertically.

Resize back to desktop width — labels reappear.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat(slider): hide tick labels on mobile to save vertical space"
```

---

## Task 13: Cross-browser verification + final cleanup

**Files:** None modified unless verification reveals issues.

- [ ] **Step 1: Chrome verification (full pass)**

Open http://localhost:3000 in Chrome.

Run through this checklist:
- Slider track shows the sky gradient.
- Sun thumb has glow, drags smoothly, halo intensity changes by time.
- Pre-5 AM: thumb becomes moon (cool palette).
- Three milestone notches (GUN/REOPEN/ALL CLEAR) at expected positions, labels readable.
- Scrubbing within 5 min of a milestone makes that tick gold.
- Map sky overlay is faint but visible, shifts color through the day.
- Play button works, auto-play sweeps over ~60s, scrub interrupts, end pauses.
- Map clicks/drags pass through overlay (click a closure polyline at peak overlay opacity).
- Onboarding overlay still appears on first visit (clear localStorage `onboarding-completed` and reload to check).

- [ ] **Step 2: Safari verification**

Open http://localhost:3000 in Safari. Repeat the checklist from Step 1, paying attention to:
- Track gradient renders (uses `::-webkit-slider-runnable-track`).
- Thumb renders (uses `::-webkit-slider-thumb`).
- `mix-blend-mode` on sky overlay works.
- Auto-play frame rate is smooth.

- [ ] **Step 3: Firefox verification**

Open http://localhost:3000 in Firefox. Repeat the checklist, paying attention to:
- Track gradient renders via `::-moz-range-track`.
- Thumb renders via `::-moz-range-thumb` — vertical centering may differ slightly from Chrome (Firefox doesn't need `margin-top: -7px`); confirm thumb still sits on the track.
- Pre-dawn moon swap works.

- [ ] **Step 4: Milestone derivation regression check**

Temporarily edit `data.js`: find any closure entry, change its `endMin` value to something obviously different (e.g., add `1`). Reload. Expected: the `ALL CLEAR` tick (or `REOPEN` if you bumped the lowest one down) shifts to the new position.

Revert the edit.

- [ ] **Step 5: Verification commit (if any tweaks)**

If verification revealed any small fixes, commit them with descriptive messages. If everything passed, no commit needed.

```bash
# Only if changes were made:
git add -A
git commit -m "fix(slider): <specific issue from cross-browser verification>"
```

- [ ] **Step 6: Final summary**

Branch `explore/time-slider-animation` should now have ~12 commits on top of the spec commits. Confirm with:

```bash
git log --oneline main..HEAD
```

Plan complete.

---

## Self-review (already performed by author)

- **Spec coverage:** All five spec sections (architecture, slider track, sun thumb, milestone ticks, sky overlay, play button) map to tasks. Pre-dawn moon swap (spec component "Sun thumb") covered in Task 5. Reduced-motion (spec section "Play button & auto-play") covered in Task 11 Step 3. Mobile (spec component "Milestone ticks") covered in Task 12. Cross-browser (spec section "Testing") covered in Task 13.
- **No placeholders:** Every code step shows actual code; every verification step describes specific expected behavior.
- **Type/name consistency:** `updateTimeOfDayVisuals`, `interpolateSkyColor`, `RACE_GUN_MIN`, `SKY_PALETTE`, `togglePlay`, `startPlay`, `stopPlay`, `setPlayingState`, `renderMilestoneTicks`, `deriveMilestones`, `--sky-gradient`, `--sky-color-top`, `--sun-glow`, `--sky-overlay-opacity`, `.time-tick`, `.time-tick-label`, `.is-night`, `.is-active`, `.is-daylight`, `.is-playing`, `#time-play`, `#sky-overlay`, `.slider-track-wrap` — all referenced consistently across tasks.
