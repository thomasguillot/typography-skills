---
name: typography-scale
description: Use when creating or redesigning a type scale, typographic hierarchy or text tokens (body, small, xs up to 5xl, h1 to h6, display) for a website, app, design system, book or print document, or when choosing a ratio such as major third, perfect fourth or golden ratio.
---

# Typography scale

Generates a type scale from a body size and a ratio: sizes, leading, tracking and heading roles, as CSS custom properties, JSON tokens, Tailwind theme values or a print spec sheet. The math is done by `scripts/scale.mjs`; the judgment is choosing the ratio for the context. Checked against the rules in the sibling `typography-check` skill.

## 1. Establish the context

Find out, from the request or the codebase, or ask in one round:

- **Medium**: web, print, or both. Print sizes are points with absolute leading; web sizes are rem, fluid where useful.
- **What it is for**: product UI, docs, editorial, marketing, display-led brand, book.
- **Body size**: existing body text if there is one. Defaults: web 16 to 18px, print 10.5pt.
- **Font**: the body face, if known. Large x-height faces can sit smaller.
- **Baseline grid**: wanted or not. If yes, the grid is the body leading.
- **Output**: CSS, JSON tokens, Tailwind, or a print spec.

## 2. Propose ratios, then let the person choose

Offer two or three ratios that fit the context, with one line of reasoning each, and show them side by side with `node scripts/scale.mjs --base 18 --compare major-third,perfect-fourth,golden`. Recommend one.

| Context | Ratio | Why |
|---|---|---|
| Dense product UI, dashboards, data tables | major-second 1.125 to minor-third 1.2 | Many levels in little space; weight and color carry hierarchy, so the hierarchy warning below 1.15 is expected |
| Docs, long-form reading, most websites | major-third 1.25 | Clear headings without shouting |
| Editorial, marketing, landing pages | perfect-fourth 1.333 | Strong contrast, room for display sizes |
| Posters, portfolios, display-led brand | perfect-fifth 1.5 or golden 1.618 | Dramatic jumps; use fewer steps (`--up 3` or `4`), they outgrow small screens fast |
| Books and long print documents | minor-third 1.2 | Text-led; headings stay near the body |

**Fixed or fluid ratio.** For product UI and docs, keep one ratio and let only the body grow (`--base 16 --base-max 17`). A wider ratio on large screens (`--ratio major-third --ratio-max perfect-fourth`) is for editorial and marketing pages, where display headings should grow more than text. It makes h1s large, so don't use it for docs.

## 3. Generate

```bash
node scripts/scale.mjs --medium web --base 16 --base-max 18 --ratio major-third --ratio-max perfect-fourth --format table
node scripts/scale.mjs --medium web --base 18 --ratio perfect-fourth --grid 27 --k 0.36 --format css
node scripts/scale.mjs --medium print --base 10.5 --ratio minor-third --format spec
```

Run `node scripts/scale.mjs --help` for every flag. `--down` and `--up` set how many steps below and above body (defaults 2 and 6 for web, 2 and 4 for print). With 6 or more steps up, the top step is `display` and h1 is the next one down; with fewer, h1 is the top step and missing heading levels fall back to body size. Steps below body use a gentler `--ratio-down` (1.125 web, 1.1 print) so small text stays readable. `--k` is the body face's (ascent − descent) ÷ 2 per em; with `--grid` it adds CSS that snaps each text block's baseline to the grid. Measure it with canvas `measureText` (`fontBoundingBoxAscent` and `fontBoundingBoxDescent` at 100px), or omit it.

The script prints checks to stderr. Lines starting `warning:` break a `typography-check` rule (body below 16px, xs below 12px, fluid growth over 2.5×, flat ratios) or flag loose snapped leading. Resolve each one, then run it again: change the size, the ratio or the step count, or, for `shared/hierarchy-levels`, separate the levels with weight or color and keep the ratio. Lines starting `note:` are informational (small steps on a full grid line are fine for one-line labels); pass them on, nothing to fix.

## 4. Deliver

- The table of steps and roles (h1 to h6, display, lede, body, small, label), then the requested format. The `css` and `tailwind` formats include the heading rules.
- Where leading says "half line", that heading's baselines land on half grid lines. Say so.
- One line on how to apply it: tokens on `:root`, heading rules, and for a grid the baseline-snapping block. Grid leading in `css` uses `--<prefix>-grid` (`--text-grid` by default), defined in the same `:root`; `tailwind` and `json` write the grid value into each line height, so they need nothing else. `json` is plain JSON with CSS values per step, not W3C design tokens (DTCG); convert it if a DTCG tool needs it.
- If a live page exists, run `typography-check` on it after the scale is applied.

## Gotchas

- **A scale is a starting point.** Keep the person's existing body size and font unless they ask to change them.
- **More steps is not more hierarchy.** Two or three heading levels in actual use beat a 5xl nobody needs; trim with `--up`.
- **Print is not small web.** Print sizes stay in points with absolute leading. Never output rem or `clamp()` for print.
- **Check the extremes.** Read the smallest step at the narrowest viewport and the largest at the widest before handing over.
