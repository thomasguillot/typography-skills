# Shared rules (every medium)

These hold on screen and on paper. Thresholds that differ by medium live in `web.md` and `print.md`.

Severity: **P0** broken or unreadable, **P1** readability or accessibility failure, **P2** craft (visible to a careful reader), **P3** polish.

## Hierarchy

| ID | Check | Fix | Sev |
|---|---|---|---|
| `shared/hierarchy-levels` | Each level (title, heading, subhead, body, caption) is distinguishable at a glance by size, weight, typeface, colour or position. Two levels that differ by less than ~1.15× in size *and* nothing else read as one. | Separate adjacent levels by a step on one scale, or by weight or face, not by 1–2px/pt. | P1 |
| `shared/scale` | Sizes come from one ratio (modular scale) instead of a scatter of near-identical values. Count distinct sizes: more than ~6–7 for a single document is a smell. | Pick a base and one ratio (1.2, 1.25, 1.333, 1.5) and snap sizes to it. | P2 |
| `shared/colour-sparingly` | Colour used for hierarchy or emphasis is rare enough to stay distinct. | One accent, used sparingly. | P3 |

## Gestalt: proximity and similarity

| ID | Check | Fix | Sev |
|---|---|---|---|
| `shared/proximity-headings` | A heading sits closer to the text it introduces than to the text above it. Equal space above and below (or more below) detaches it. | Space above a heading ≥ 2× space below. | P1 |
| `shared/proximity-sections` | Sections are separated by noticeably more space than paragraphs inside them. | Add a clear extra gap between sections, not between every block. | P2 |
| `shared/similarity` | Elements with the same function share one style; elements with different functions do not look alike. | Collapse near-duplicate styles; differentiate look-alikes with different roles. | P2 |

## Paragraphs

| ID | Check | Fix | Sev |
|---|---|---|---|
| `shared/indent-or-space` | Paragraphs are separated by *either* a first-line indent *or* vertical space, never both. | Pick one. Books and long-form: indent (~1em) with no space. Screens and documents: space with no indent. | P2 |
| `shared/no-indent-after-break` | When using indents, the first paragraph after a heading, break, table or figure is set flush. | `h1 + p, h2 + p, table + p, figure + p { text-indent: 0 }` or the layout equivalent. | P3 |

## Fonts

| ID | Check | Fix | Sev |
|---|---|---|---|
| `shared/true-styles` | Every italic and bold in use has a real face (an italic file or axis, a bold weight). A synthesised italic is a slanted roman; a synthesised bold is smeared. | Supply the italic and bold faces (web: `@font-face` per style under one family name; print: install and embed them). | P1 |
| `shared/role-fit` | Faces are used in the role they were designed for: text faces for body, display faces large. A display or decorative face set as body text is a P1. | Swap the body to a text face; keep display cuts for large sizes. Use optical sizes where the family has them. | P1 |
| `shared/family-count` | Body face chosen first; others chosen to suit it. More than 2–3 families, or two similar-but-different faces (two geometric sans), is a smell. | Reduce to one family in several weights, or two with real contrast (structure, proportion). | P2 |

## Characters (rendered copy only, never inside code)

| ID | Check | Fix | Sev |
|---|---|---|---|
| `shared/quotes` | Curly quotes and apostrophes, not straight `"` and `'`. Year and elision apostrophes point the right way: `’87`, `rock ’n’ roll`. | Use `“ ” ‘ ’` (or a smart-quote step in the build). | P2 |
| `shared/dashes` | Hyphen joins words; en dash for ranges (`1961–2024`, `pp. 4–9`); em dash, or spaced en dash in British style, for breaks in thought. `--` in copy is wrong. | Replace with the right dash; keep one convention per document. | P2 |
| `shared/primes` | Feet/inches and minutes/seconds use primes `′ ″`, not quotes. | Use the prime characters. | P3 |
| `shared/one-space` | One space after a full stop. | Collapse double spaces. | P3 |
| `shared/no-break` | Numbers stay with their units and short times (`9:40 PM`, `5.8 m`, `14 March`). | Non-breaking space (`&nbsp;`, U+00A0) or narrow no-break space (U+202F). | P3 |
| `shared/ellipsis` | `…` rather than three full stops, where the face draws a good one. | Use U+2026. | P3 |

## Micro-typography

| ID | Check | Fix | Sev |
|---|---|---|---|
| `shared/caps-tracking` | Runs of capitals and small caps (labels, eyebrows, running heads) have added tracking of roughly 5–12% of the size. | Web: `letter-spacing: 0.05em`–`0.12em`. Print: +50 to +100 units. | P2 |
| `shared/no-lowercase-tracking` | Lowercase body text is not letterspaced (positive tracking on lowercase hurts reading). Large display sizes may track slightly *tighter*. | Remove tracking from lowercase text. | P2 |
| `shared/small-caps` | Acronyms in running text (NATO, BBC) use true small caps if the face has them, not scaled capitals. | `font-variant-caps: all-small-caps` (web) or the face's small caps (print), tracked slightly. | P3 |
| `shared/figures` | Oldstyle figures in running text where the face has them; lining figures with capitals; tabular figures wherever numbers align vertically (tables, prices, data). | `font-variant-numeric: oldstyle-nums` / `lining-nums` / `tabular-nums` (web) or the equivalent OpenType setting (print). Only flag after confirming the font ships the feature. | P2 |
| `shared/ligatures-kerning` | Kerning and standard ligatures (fi, fl) are on for text. Off only in code. | Web: leave `font-kerning` and `font-variant-ligatures` at their defaults or set them explicitly. Print: enable in the paragraph styles. | P3 |
| `shared/heading-wrap` | Multi-line headings break at sense, with no single stranded word on the last line. | Web: `text-wrap: balance`. Print: manual breaks. | P3 |

## Optical alignment

Geometry puts edges and centres where the numbers say; these rules put them where the eye sees them. Check them on a render (a screenshot, the live page or rendered PDF pages), never from code alone. `extract-web-type.js` reports `optical` per role: `inkLeftPx` and `inkInsetEm` for where the first glyph's ink starts, and `capCentreOffsetPx` for single-line text in a drawn box.

| ID | Check | Fix | Sev |
|---|---|---|---|
| `shared/optical-margin` | Display type that shares an edge with text aligns by its ink, not its box. Side bearings grow with size, so a heading or numeral at 3× the body size looks indented next to the text under it, and round or diagonal first letters (O, C, G, A, V, W, T) more so. Compare `optical.inkLeftPx` of the display role with the text it lines up with: more than about 2px apart on screen, or 0.5pt in print, is visible. Round and diagonal letters may sit a hair past the edge, as they overshoot the baseline. | Web: pull the display role back by its first glyph's inset, `margin-inline-start: -<inkInsetEm>em`; use the exact glyph for fixed strings (numerals, wordmarks) and a typical value for headings whose first letter varies. Print: InDesign Optical Margin Alignment (Story panel, set to the body size), or a negative indent on display lines. | P2 |
| `shared/optical-centre` | Text in a drawn box (button, badge, tag, tab, pill) looks vertically centred. Centre on the cap height (x-height for all-lowercase labels), not the line box: font metrics leave caps above or below the line box centre by a different amount in every face. `optical.capCentreOffsetPx` is negative when the caps sit high; more than about 1px off in a box under 48px tall is visible. An icon beside a label centres on the same cap-height middle. | Web: `text-box: trim-both cap alphabetic` with equal block padding where supported; otherwise offset the padding by the measured amount. Print: first baseline offset at cap height, with equal top and bottom insets. | P2 |
| `shared/overshoot` | Round and pointed marks set with type (bullets, circular icons, play and arrow triangles) look the same size and position as flat ones. A circle drawn at a square's size looks smaller; a triangle centred on its bounding box looks shifted toward its flat side. There is no measured threshold: judge on the render. | Draw or scale round shapes a few percent larger than flat ones; nudge triangles toward their point until they look centred, often by about a tenth of their width. | P3 |

## Underlining

| ID | Check | Fix | Sev |
|---|---|---|---|
| `shared/no-decorative-underline` | Underline is used only for links on screen, and not at all for emphasis in print. | Emphasise with italic or weight instead. | P2 |
