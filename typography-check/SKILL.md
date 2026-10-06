---
name: typography-check
description: Use when checking, auditing or reviewing the typography of a design (a web page, CSS or design tokens, a print layout, book or magazine pages, a print stylesheet, or a PDF), or when asked whether type, fonts, leading, measure, hierarchy or contrast are right, or whether a PDF is ready for screen or press.
---

# Typography check

Rules from the [Typography Handbook](https://typographyhandbook.com) web edition and its [print edition](https://typographyhandbook.com/print/), with thresholds and fixes. **The medium decides the rules**: 10pt justified text in absolute leading is correct in a book and wrong on a web page. Identify the medium before judging anything.

## 1. Identify the medium

| Medium | Signals |
|---|---|
| **Web** | HTML/CSS/JSX/SCSS, design tokens, a URL; `rem`/`px`/`vw`/`clamp()`; viewport meta; `prefers-color-scheme`; `@font-face` with woff2 |
| **Print** | `.indd`/`.idml`/`.tex`/`.typ`/`.docx`; sizes in `pt`/`mm`/picas; leading as size/leading; page formats (A4, 129×198mm); bleed, trim, CMYK, Pantone; Paged.js/WeasyPrint/Prince |
| **Web + print stylesheet** | Web CSS that also has `@media print`, `@page` or a `media="print"` sheet |
| **PDF** | Run `scripts/inspect-pdf.py`. `medium_hint` says press (trim/bleed boxes, PDF/X, CMYK) or office/screen |

- **Mixed file**: split it by context. Rules inside `@media print` and `@page` get the print rules; everything else gets the web rules. Report the two as separate sections.
- **Office/screen PDF at a book or magazine size**: it is probably a proof heading to press. Ask.
- **No signals, or conflicting ones**: ask one question before reviewing: "Where will this be read: in a browser, printed (press or office printer), or as a PDF on screen?"

Write the medium and the evidence for it on the first line of the report.

## 2. Measure, don't guess

| Input | How to get the facts |
|---|---|
| Code only | Read the CSS, markup and tokens. Run `node scripts/contrast.mjs TEXT BG --size PX --weight N [--body]` for each text/background pair you report on. Pass `--body` only for paragraphs of running text, not for bylines, captions, labels or buttons. Label the review **static**, because the rendered font is unverified. |
| Live page or local build | Paste `scripts/extract-web-type.js` as the `function` of `chrome-devtools` `evaluate_script`. With Playwright, use `page.evaluate(\`(${source})()\`)`, setting `colorScheme` on the context. Run it at 1280px and 375px wide. If `darkModeRules` is true, run it again with `emulate colorScheme: dark` and also `light`. It returns the rendered font, sizes, leading ratios, characters per line (`approxCharsPerLine` is what the container holds; `lines` says whether the text actually wraps, so judge measure only where `lines` > 1), WCAG and APCA contrast, where the first glyph's ink starts and how a label sits in its box (`optical`), `@font-face` rules, preloads and print rules for each text role. |
| PDF | Run `python3 -I scripts/inspect-pdf.py FILE.pdf`. For a visual pass, render pages with `gs -q -dNOPAUSE -dBATCH -sDEVICE=png16m -r100 -sOutputFile=page-%d.png FILE.pdf` and read the PNGs. |
| Print stylesheet or HTML-to-PDF | Print it to PDF (headless Chrome `--print-to-pdf`, Paged.js, WeasyPrint) and inspect the PDF. That is the only way to see substituted fonts and real pagination. |
| Screenshot or image | Visual review only. Mark every size, leading or measure as an estimate. |
| Figma | Read the text styles and variables through the Figma MCP if it is connected (load its skill first). Otherwise ask for an export. |

Then look. Numbers find candidates; the eye decides alignment. An optical correction (display type pulled left of the column edge, a label set off its box's geometric centre, a round icon drawn larger) departs from the measurement on purpose, and it is right when the result looks aligned.

- Don't report a measured offset as a fault when it is an optical correction. Signals: a negative margin or indent in `em` on display type, `text-box` trimming, asymmetric padding repeated across a component, a token or comment naming the nudge. Name it under "Already right".
- Report an offset that looks accidental with its measured value and what it looks like on the render.
- Optical judgement overrides geometry (positions, alignment, relative sizes), never accessibility thresholds. Contrast, minimum sizes and zoom stay numeric.
- The optical rules in `shared.md` need a render. In a static review, say they were not checked.

## 3. Load the rules

- Always: `references/shared.md` (hierarchy, proximity, paragraphs, fonts, characters, micro-typography).
- Web: `references/web.md`, including its APCA section.
- Print, print stylesheet or press PDF: `references/print.md`. Read its **"Web habits that are wrong in print"** table before reporting any print finding.
- PDF: `references/pdf.md`, plus `print.md` for press PDFs.

## 4. Report

Use this shape:

```markdown
## Typography check: <target>
Medium: <web | print | web + print stylesheet | press PDF | screen PDF> (<evidence>)
Basis: <measured with extract-web-type / inspect-pdf | static review, rendered font not verified | visual estimate>

### P0 broken
- `rule-id` <location: file:line, page, or role>: <issue, with the measured value>. Fix: <the concrete change>.
### P1 readability / accessibility
### P2 craft
1. `rule-id` <location>: <issue>. Fix: <change>.
2. …
### P3 polish
3. … (numbering continues from P2 and stops at 10)
Also worth a look: `rule-id` (location), `rule-id` (location), …

Already right: <one line naming what is correct, deliberate optical corrections included, so nobody "fixes" it>
```

- Every finding has a rule ID, a location, the measured or declared value, and a concrete fix (CSS, a setting, or a corrected character).
- Write out every P0 and P1 finding in full.
- Number the written-out P2 and P3 findings 1 to 10 across both headings, choosing the most visible ones. Finding 11 and beyond go on the single "Also worth a look" line as a rule ID and location only.
- Each finding takes the severity given in its rule table. Don't move one down to tidy the list.
- Leave out empty severity headings.
- The check covers typography only: type, fonts, spacing of text, colour of text, page and production as they affect type. Anything else gets at most one closing line, "Outside typography: …", or nothing.

## Gotchas

- **Character rules apply only to rendered copy.** Never "fix" quotes or `--` inside `<code>`, `<pre>`, string literals or CLI flags.
- **Check the font before flagging an OpenType feature.** A `font-variant-*` or `font-feature-settings` fix does nothing if the face lacks the feature.
- **Declared is not rendered.** A web font that 404s, or a print font that isn't installed, silently becomes the browser default or Times. Check `roles[].font.likely` or `structure.fonts`, and report a substitution as P0.
- **Dark-mode weight goes up, not down.** Light-on-dark text looks thinner, so dark mode needs `web/dark-weight`.
- **Check every colour scheme and every button.** A grey that passes on white can fail on the dark background, and the reverse.
- **WCAG 2.x is the compliance check; APCA is a second opinion.** Report both numbers when they disagree, following `web.md`.
- **Use fewer thresholds and more evidence.** "116 characters per line at 22px (`web/measure`, 45–75)" is a finding. "The lede feels long" is not.
- **An audit is not a redesign.** Propose fixes inside the existing type system. A new pairing or scale only if the user asks.

## Sources and credits

- Rules paraphrased from Typography Handbook (2026 edition, based on Kenneth Wang's original, MIT).
- Report shape and the code-literal and OpenType cautions follow mblode/agent-skills `typography-audit` (MIT).
- APCA constants are from the APCA-W3 0.0.98G reference.
