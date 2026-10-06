# Web rules (screen, reflowing text)

Applies to HTML/CSS/JSX, design tokens and live pages. Not to `@media print` blocks or `@page` rules: those use `print.md`.

## Units and sizing

| ID | Check | Fix | Sev |
|---|---|---|---|
| `web/zoom` | Viewport meta does not set `user-scalable=no` or `maximum-scale=1`. | `<meta name="viewport" content="width=device-width, initial-scale=1">`. | P0 |
| `web/relative-units` | `font-size` in `rem`/`em` (or `%` on `html`), not `px`; media queries in `em`. Root stays near `font-size: 100%` so the reader's browser setting is honored. | Convert px to rem (px ÷ 16). | P1 |
| `web/body-size` | Body copy renders at ≥ 16px (1rem) at default zoom; 17–20px suits long reading. UI labels and captions may go smaller, never below ~12px. | Raise the body size. | P1 |
| `web/fluid-type` | Fluid sizes use `clamp(min, preferred, max)` with a **rem** minimum (never a viewport-only minimum) and a preferred value with a rem term (`3vw + 1rem`). Max ≤ ~2.5× min. Body text is fixed or gently fluid at most (1rem → 1.25rem). App UI and dense dashboards use a fixed rem scale. | Rewrite as `clamp(2rem, 5vw + 1rem, 4rem)`; generate scales with Utopia. | P2 |

## Leading and vertical rhythm

| ID | Check | Fix | Sev |
|---|---|---|---|
| `web/leading-overlap` | No text role has a line-height below its font size (ratio < 1), which overlaps wrapped lines. The usual cause is a fixed `px`/`rem` line-height on a parent inherited as a length by large headings. | Unitless line-height on the parent; headings 1.05–1.25. | P0 |
| `web/leading-unitless` | `line-height` is unitless, so it scales with each element's size. One exception: on a baseline grid, leaf text elements may use a length snapped to the grid unit, e.g. `round(up, 1.05em, var(--unit))`, because it still scales with the element's own size and children inherit no larger text. | Unitless values: body 1.4–1.7, headings 1.05–1.25. | P2 |
| `web/leading-measure` | Longer lines get more leading: roughly +0.1 for every 10 characters above 65 per line. Narrow columns can be tighter. | Adjust `line-height` with the measure. | P2 |
| `web/margins-one-direction` | Text elements set vertical margins in one direction (preferably `margin-bottom`) so spacing does not collapse unpredictably. | Remove `margin-top` from paragraphs; control space before headings deliberately. | P3 |
| `web/rhythm` | Vertical spacing is in multiples of the body line-height (or half-steps). Not pixel-perfect; just related. `lh`/`rlh` units help. When a page claims a baseline grid, verify baselines, not boxes: insert a zero-height `inline-block` with `vertical-align: baseline` and compare its position with the grid. Line boxes can all sit on the grid while every baseline misses it, and inline elements in another font (code, badges) inflate line boxes so the error accumulates down the page. Check every text element at several widths, not one sample per style: a grid item spanning rows (a large numeral beside a heading and intro) shares its extra height between those rows and pushes only some instances off the grid. | Derive margins from the base leading (e.g. 1.75rem for 1.25rem × 1.4). For a true baseline grid: leading in whole grid lines, snap each text block's baseline with `round()` from the font's ascent and descent, and give inline code `line-height: 1`. | P3 |

## Measure and containers

| ID | Check | Fix | Sev |
|---|---|---|---|
| `web/measure` | Body text runs 45–75 characters per line (66 ideal); multi-column text 40–50; captions and UI text 35–50. Judge by measured characters (`approxCharsPerLine`), not by the `ch` value: `1ch` is the width of the zero, wider than the average letter in most proportional faces, so `65ch` often holds 75–90 characters. | Set the column width from the measured average character width (often about 30–34em for body text), with `padding-inline`. On narrow viewports let the measure shrink; never force horizontal scrolling. | P1 over ~90, P2 otherwise |
| `web/ragged-right` | Body text is ragged right. Browser justification without good hyphenation opens rivers; centered text is for short lines only (headings, a one- or two-line lede). | `text-align: start`. If justifying, require `hyphens: auto` with a correct `lang`, and only on generous measures. | P2 |

## Web fonts and loading

| ID | Check | Fix | Sev |
|---|---|---|---|
| `web/one-family-name` | All weights and styles of a family share one `font-family` name, distinguished by `font-weight` and `font-style`. Separate names per weight (`"Brand Bold"`) make the browser apply faux bold or regular to headings and break `<strong>`. | One family name; one `@font-face` per weight/style, or one rule with a weight range for a variable font. | P1 |
| `web/italic-face` | An italic `@font-face` (or `ital`/`slnt` axis) exists if italics are used. | Add it; otherwise the browser skews the roman. | P1 |
| `web/woff2-only` | `src` lists `woff2` only. EOT, TTF, SVG and WOFF fallbacks serve browsers that no longer exist. | Drop the extra formats. Subset (glyphhanger, fonttools) to the character ranges needed. | P3 |
| `web/font-display` | Every `@font-face` sets `font-display`. `swap` for body text (default choice); `optional` for non-critical or decorative faces, or with a preload for near-zero shift; `block` only when the font is essential. | Add `font-display: swap`. | P2 |
| `web/preload` | Only the 1–2 faces visible on first render are preloaded, and every font preload has `crossorigin` (required even for self-hosted fonts, otherwise the file downloads twice). | Trim the preload list; add `crossorigin`. | P2 |
| `web/fallback-metrics` | The fallback face is metric-matched (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) so the swap does not shift layout. | Add a fallback `@font-face` from Fallback Font Generator, Font Style Matcher or Fontaine. | P3 |
| `web/variable-fonts` | When a family ships a variable version and 3+ weights/styles are used, the variable file is used (one request, any weight). `font-variation-settings` only for custom axes. | Switch to the variable file with `font-weight: 100 900`. | P3 |
| `web/system-stack` | System stacks (`system-ui, sans-serif`) are a legitimate choice for UI and dashboards; for editorial and brand work a custom face carries more identity. Not a finding by itself. | – | – |
| `web/rendered-font` | The face that actually rendered is the one declared. A 404, CORS failure or missing `@font-face` silently falls back. Check `roles[].font.likely` and `fontsLoaded[].status` from the extractor: `error` means the file failed, while `unloaded` is normal for faces and `unicode-range` subsets the page never used. | Fix the path, CORS header or declaration. | P0 |

## OpenType and rendering

| ID | Check | Fix | Sev |
|---|---|---|---|
| `web/opentype-properties` | Uses `font-kerning` and `font-variant-*` in preference to `font-feature-settings` (they cascade and combine; `font-feature-settings` overrides wholesale). | Swap to the high-level properties. | P3 |
| `web/optical-sizing` | `font-optical-sizing: auto` is not disabled where the font has an `opsz` axis. | Remove `font-optical-sizing: none`. | P3 |
| `web/hanging-punctuation` | Opening quotes on blockquotes, pull quotes and display headings hang outside the text edge, so the letters align with the text around them. At body size the indent is slight; at display sizes it is obvious. | `hanging-punctuation: first` (Safari; check support elsewhere), plus a negative `text-indent` equal to the quote's width (about `-0.4em`, measure the face) on elements that start with a quote. | P2 at display sizes, P3 otherwise |
| `web/text-wrap` | `text-wrap: balance` on headings, captions and pull quotes only (it stops working past ~6 lines in Chromium, ~10 in Firefox, and is costly). `text-wrap: pretty` on paragraphs and list items. Balance on a paragraph is a misuse. | Move `balance` to headings; use `pretty` for body. | P3 |

## Color and contrast

| ID | Check | Fix | Sev |
|---|---|---|---|
| `web/contrast` | WCAG 2.x AA: 4.5:1 for normal text, 3:1 for large text (≥ 24px, or ≥ 18.66px bold). AAA: 7:1 / 4.5:1. Check every text role, in every color scheme the site supports, and on buttons. | Darken or lighten until it passes; re-check the other scheme. | P1 |
| `web/text-on-image` | Text over images has a scrim, overlay or shadow guaranteeing contrast at every crop. | Add a scrim. | P1 |
| `web/not-pure-black` | Long-form body text is a very dark gray (#161616–#333) rather than #000 on #fff. Comfort only, not a contrast failure. | Use a near-black token. | P3 |
| `web/color-tokens` | Text colors come from a small set of named custom properties, not scattered literals. | Define tokens on `:root`. | P3 |
| `web/not-color-alone` | Meaning (links, errors, states) is not carried by color alone. | Add underline, icon or text. | P1 |
| `web/apca` | APCA (Advanced Perceptual Contrast Algorithm, proposed for WCAG 3) agrees with WCAG 2.x. APCA accounts for size, weight and polarity, so it catches thin or small text and light-on-dark text that WCAG 2.x passes. See **APCA** below. | Raise contrast, size or weight until both pass. | P2 |

### APCA

The extractor reports `apca.lc` (signed: negative means light text on dark), `apca.required` and `apca.pass` for each role. The thresholds are a simplified version of APCA's Bronze level, judged on the absolute Lc:

| Text | Minimum \|Lc\| |
|---|---|
| Body text columns, ≥ 18px regular or ≥ 16px medium | 75 (90 preferred) |
| Body text smaller than that | 90 |
| Other content text, ≥ 24px regular or ≥ 16px bold | 60 |
| Other content text, 14–24px regular (labels, captions, UI) | 75 |
| Other content text smaller than 14px | 90 |
| Headlines, ≥ 36px regular or ≥ 24px bold | 45 |
| Placeholder, disabled, copyright lines (never body) | 30 |
| Any of the above at weight ≤ 300 | one tier stricter (+15, capped at 90) |

How to report the two together:

- **WCAG 2.x is the compliance check.** A WCAG AA failure is P1 (`web/contrast`) even when APCA passes, because WCAG 2.x is what audits and the law measure today. Say that APCA disagrees, since it often points to the better fix.
- **APCA failing while WCAG passes is P2 (`web/apca`).** This is common for light weights, small sizes and dark mode, where WCAG 2.x overstates light-on-dark contrast. Name both numbers: "4.6:1 passes WCAG AA, but Lc 52 is below the 75 APCA wants for 18px body text".
- **Use APCA to choose the fix.** It tells you whether more size, more weight or more contrast fixes the problem, because size and weight change the threshold.
- **Static review**: compute both by hand from the colors (WCAG relative luminance; APCA 0.0.98G constants as in `scripts/extract-web-type.js`), or say that you have not computed them.

## Dark mode

| ID | Check | Fix | Sev |
|---|---|---|---|
| `web/dark-halation` | Dark mode avoids pure #fff on pure #000 (halation). Background around #121212–#1a1a1a, text #e0e0e0–#f0f0f0, which gives about 13–16:1. | Soften both ends via the color tokens. | P2 |
| `web/dark-weight` | Light-on-dark text looks **thinner**, so dark mode keeps or slightly **increases** weight: +20 to +50 on a variable `wght` axis, or one step up. Never decrease it. Most visible at small sizes and light weights (300–350). | Add a `prefers-color-scheme: dark` weight bump. | P2 |
| `web/dark-leading` | Dark mode may want slightly more line-height (+0.05–0.1). Minor. | – | P3 |

## Links

| ID | Check | Fix | Sev |
|---|---|---|---|
| `web/link-underline` | Body-copy links have an underline tuned to the face: `text-decoration-thickness` in `em` (~0.07–0.08em), `text-underline-offset` ~0.12–0.16em, `text-decoration-skip-ink: auto`. A muted underline color with a full-strength hover is a good editorial default. These values are a recommendation, not a defect. | Add the three properties. | P3 |
