# Test Plan — Native calculator embed on /tool/calculator

**Preview**: https://dist-dmafjtqx.devinapps.com
**PR/CI**: none (preview deploy only).

## What changed (user-visible)
- Previously the calculator was rendered inside an `<iframe>` → "сайт в сайте" with a second scrollbar and a duplicate visual frame.
- Now it is injected **natively** into the React page (`CalculatorPage.tsx` fetches `/calculator.html`, transplants `<link>`/`<style>`/`<script>` from its `<head>` into `document.head`, sets body HTML into a wrapper `<div ref="host">`, and re-creates inline `<script>` nodes so they execute in order).
- `VoxelDrop` footer button removed from `public/calculator.html`.
- Footer / currency switch / tab / drop-zone / primary CTA re-styled to site soft-UI (shadow-soft + `.calc-root` overrides).
- Tailwind CDN dropped; `public/calculator.html` is included in `tailwind.config.js` content list so classes compile into our bundle.

## Primary flow (single recorded pass)
1. **Open** `/` → verify `Калькулятор себестоимости` card is the first tile with green-dot `Готово` badge.
2. **Click** the tile → verify URL = `/tool/calculator` and breadcrumb `← Все утилиты` is visible above the calculator.
3. **Verify native embed (not iframe)** via console:
   - `document.querySelectorAll('iframe').length` → expected `0`.
   - `document.querySelector('.calc-root')` → expected not null; `parentElement` climbs up to a div with class `calc-host` (our React wrapper), not an iframe document.
   - **Pass**: both conditions true. **Fail**: iframe present or `.calc-root` missing.
4. **Verify VoxelDrop removed**:
   - `document.body.innerHTML.includes('VoxelDrop')` → expected `false`.
   - Visually scroll to footer → no `📦 Открыть VoxelDrop` button.
   - **Pass**: string absent + button not visible.
5. **Verify soft-UI skin applied** (would fail if style injection broke):
   - `getComputedStyle(document.querySelector('.glass')).backgroundColor` → expected `rgb(230, 232, 240)` (i.e. `#e6e8f0`), NOT `rgb(15, 23, 42)` (old dark `#0f172a`).
   - Tabs `Себестоимость / Цена / Файл` visually light-on-light with the active tab sunken (inset shadow).
   - **Pass**: bg is light AND tabs render correctly.
6. **Verify JS logic preserved** (would fail if script re-execution broke):
   - In `Себестоимость` tab: set `#weight` to `100`, set `#plasticPrice` to `1500` (via UI, typing).
   - Observe `#costResult` — expected text NOT equal to `"0 ₽"` (default). Any positive number is pass; exact value doesn't matter because we didn't touch logic.
   - **Pass**: `#costResult` becomes a non-zero value.
   - **Fail**: stays `"0 ₽"` or console shows ReferenceError / TypeError.
7. **Verify tab switch still works** (would fail if event handlers didn't re-attach):
   - Click tab `Цена`. Expected: `#panel-cost` gains `hidden` class, `#panel-price` loses `hidden` class. Visible `#priceResult` span appears.
   - **Pass**: panels swap.
8. **Verify back-link**: click `← Все утилиты` → URL back to `/`, home grid visible.

## Adversarial design
- If scripts weren't re-executed after `innerHTML`: step 6 fails — typing does nothing because event listeners were never attached.
- If `<style>` wasn't transplanted from calculator `<head>`: step 5 fails — page looks like raw un-styled HTML (or falls back to dark original if only soft-UI skin missing).
- If Tailwind content path didn't include calculator.html: classes like `flex`, `gap-1`, `p-5`, `hidden` wouldn't exist → layout collapses → step 5 & 7 fail.
- If VoxelDrop wasn't removed or HTML wasn't re-fetched from the new deploy: step 4 fails.
- If iframe-wrapping wasn't replaced: step 3 fails on `iframe count > 0`.

## Evidence
Screenshots at steps 2, 4 (footer), 5 (whole calc), 7 (after tab switch).
One continuous recording from step 1 to step 8.

## Regression (not focus)
- Theme toggle in site header. Allowed state: calculator stays light even when dark mode is on — skin is hard-coded soft-UI light. Note in report, not a failure.
