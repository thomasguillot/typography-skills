# Print rules (fixed page, ink on paper)

Applies to InDesign/Affinity/Word/LaTeX/Typst output, press PDFs, Paged.js/WeasyPrint/Prince books, and the `@media print` / `@page` part of a stylesheet.

## Web habits that are wrong in print

Check every finding against this table before reporting it. These are the commonest mistakes when web rules leak into a print review.

| Web habit | In print |
|---|---|
| Body ≥ 16px; "use rem, never px" | Points and millimeters are correct. Body 9.5–11.5pt for books, 8–9pt is routine for editorial with a large x-height. 16px ≈ 12pt is large for print body. |
| Unitless `line-height` | Leading is specified absolutely: 10.5/14pt. It sets the baseline grid. Absolute leading in pt is correct in print CSS. |
| Avoid justified text | Justified **with hyphenation** is the book default. Flag justification only when hyphenation is off or unconstrained, or on narrow measures. |
| Soft near-black (#333, #1a1a1a) for comfort | Body text is 100% K (single black ink, `#000` in print CSS). Any gray or near-black prints as a tint or four-color mix and fringes on misregistration. |
| A good fallback font stack | There is no fallback. A missing font means the job prints in the wrong face (or Courier). Verify the font is installed, licensed for print/embedding and embedded in the PDF. |
| `clamp()`, `vw`, breakpoints | Meaningless on a fixed page. Use fixed pt sizes. |
| Contrast ratio math (WCAG on RGB) | Still useful for PDFs read on screen; for press, check reversed type size/weight, stock and ink instead. |
| `text-wrap: balance/pretty`, accept imperfect breaks | Every break can be fixed by hand. Widows, orphans and runts are findings, not tolerances. |
| `font-display`, preload, woff2, subsetting for speed | Not relevant. Embedding and licensing replace them. |

## The page

| ID | Check | Fix | Sev |
|---|---|---|---|
| `print/format` | Page format chosen deliberately and confirmed with the printer (A-series for documents, B-format 129×198mm or demy 135×216mm for trade books, US Letter in North America). | Name the format; confirm press sheet fit for commercial jobs. | P3 |
| `print/margin-hierarchy` | Margins are not residual: **bottom is the largest**, and on bound spreads the order is inner < top < outer < bottom (Van de Graaf canon 2:3:4:6). A bottom margin smaller than the top makes the block look like it is sliding off the page. | Increase the bottom margin past the top. | P2 |
| `print/mirrored-margins` | Bound work (books, magazines, brochures) uses mirrored left/right pages with an inner margin plus a binding allowance (perfect binding loses 5–10mm into the gutter). Single-sided documents may be symmetric left/right. | CSS: `@page :left { margin-left: OUTER; margin-right: INNER }` and `@page :right { … }`; DTP: facing pages on. | P2 |
| `print/baseline-grid` | Body text locks to a baseline grid equal to the body leading; heading, caption and image heights and the spaces around them are whole multiples (or clean halves) of it. Paragraph spacing that is not a multiple pushes lines off the grid, and lines stop backing up through thin paper. | Set spaces in multiples of the leading; derive the grid from the type, never the reverse. | P2 |
| `print/text-block-lines` | The text block height holds a whole number of body lines. | Adjust the top or bottom margin until (block height ÷ leading) is an integer. | P3 |
| `print/columns` | Column gutters are about one baseline unit (or one em); multi-column grids divide cleanly (12 for magazines and catalogs). | – | P3 |

## Setting type

| ID | Check | Fix | Sev |
|---|---|---|---|
| `print/body-size` | Body 9.5–11.5pt (10–10.5pt workhorse) for books; 8–9pt acceptable for editorial on short measures with a large x-height. Judge by x-height, not the number. | Adjust size with the measure and leading as one decision. | P1 outside 8–12pt, P2 otherwise |
| `print/small-sizes` | Captions 7.5–8.5pt; footnotes ~8pt; nothing that must be read below 6pt. | Raise sizes. | P1 below 6pt, P3 otherwise |
| `print/leading` | Text leading 2–4pt above the size (120–135%); more for long measures and large x-heights. Display sizes tighten toward solid (100%) or below. Solid leading at text sizes (13/13 subhead) collides when it wraps. | e.g. 10.5/14, 8/10.5, display 24/26. | P2 |
| `print/measure` | 45–75 characters per line (66 ideal); 40–50 per column in multi-column work. | Change the text block width, size or columns. | P1 over ~85, P2 otherwise |
| `print/print-faces` | Faces suited to print at the sizes used; optical sizes where the family has them (text cut ~8–14pt, display cut 24pt+). A display cut at 9pt is spidery; a text cut at 60pt is coarse. | Use the right optical size. | P2 |
| `print/charset` | The face covers every glyph the job needs (small caps, oldstyle and tabular figures, fractions, language coverage). There is no fallback on paper. | Check the character set before committing. | P1 if glyphs are missing |
| `print/rendered-font` | The face in the output is the one specified. A font file missing from the project, not installed or failing to load is silently replaced (Times, Helvetica, DejaVu). Confirm with `inspect-pdf.py` (`structure.fonts`) on the exported PDF. | Supply the font files, then re-export and re-inspect. | P0 |
| `print/license` | The font license covers desktop/print use and PDF embedding. A clearly web-only license blocks the print run. | Check the EULA. | P3, P1 if the license is web-only |

## Justification and hyphenation

| ID | Check | Fix | Sev |
|---|---|---|---|
| `print/justify-needs-hyphens` | Justified text has hyphenation on (and a correct language). Without it, word spaces stretch into rivers. | Turn hyphenation on (CSS: `hyphens: auto` with the right `lang`). | P1 |
| `print/hyphen-limits` | Hyphenation is constrained: at most 2 consecutive hyphenated lines; no hyphen in the last word of a paragraph or across a page turn; minimum word length ~6 and 3 characters either side. | CSS: `hyphenate-limit-chars: 6 3 3; hyphenate-limit-lines: 2; hyphenate-limit-last: always` (Paged.js/Prince/WeasyPrint support varies). DTP: paragraph composer settings. | P2 |
| `print/word-spacing` | Word spacing constrained tightly (about 85% min / 100% desired / 115% max) with little or no letterspacing. | Set in the paragraph composer (InDesign) or engine settings. | P3 |
| `print/ragged-where-narrow` | Narrow measures and captions are ragged right, with the rag controlled (no shapes, no lone short words, minimal hyphenation). | Switch to ragged. | P2 |
| `print/no-hyphenate-display` | Headings, titles, labels and tables are never hyphenated or justified. | `hyphens: manual` and `text-align: left/center` on them. | P2 |
| `print/widows-orphans` | No paragraph's last line strands at the top of a page (widow) and no first line at the foot (orphan); no runt (single short word) on a paragraph's last line. | Edit tracking, copy or breaks by hand. In CSS, `orphans` and `widows` already default to 2 in Chromium and WebKit, and Firefox ignores them, so check the PDF rather than the stylesheet. | P2 |
| `print/keep-with-next` | Headings never strand at the foot of a page or column; tables and figures do not split. | CSS: `break-after: avoid` on headings, `break-inside: avoid` on figures, tables and code. DTP: keep options. | P1 |
| `print/hanging-punctuation` | Quotes, hyphens and commas at line edges hang into the margin (optical margin alignment) in carefully set work. | InDesign Optical Margin Alignment; CSS `hanging-punctuation` where the engine supports it. | P3 |

## Print stylesheets (`@media print`, `@page`, Paged.js)

| ID | Check | Fix | Sev |
|---|---|---|---|
| `print/page-rule` | A print stylesheet defines `@page` with `size` and `margin` (bottom largest). Without it the browser's defaults decide the page. | `@page { size: A4; margin: 20mm 18mm 28mm; }`. | P1 |
| `print/absolute-units` | Print styles use pt and mm; not px, rem, vw or `clamp()`. | `body { font-size: 10.5pt; line-height: 14pt; }`. | P2 |
| `print/black-text` | Print body text is `#000` (or the K-only black of the press profile), not a muted token inherited from the screen theme. | Override color in `@media print`. | P1 |
| `print/hide-chrome` | Navigation, headers, footers, buttons and back-to-top links are hidden. | `display: none` in `@media print`. | P3 |
| `print/link-urls` | Where the document will be read on paper, link destinations print after the anchor text. | `a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.85em; }`. | P3 |
| `print/paged-media` | Serious paginated output (running heads, folios, generated contents) uses Paged.js or a Paged Media engine, with margin boxes for running heads and page numbers and `@page :first` for chapter openers. | Add margin-box content. | P3 |

## Production (press only)

Skip this section for office printing and PDFs that will only be read on screen.

| ID | Check | Fix | Sev |
|---|---|---|---|
| `print/text-100k` | Body text and small type are 100% K only. Four-color black or gray text (e.g. `CMYK 68 63 63 58` from an RGB `#333` conversion) misregisters into colored fringes. Registration black (100/100/100/100) is never used for design. | Set text to 0/0/0/100. | P0 |
| `print/overprint` | Small black type overprints (no knockout hairline). | Verify overprint settings in the export or prepress. | P2 |
| `print/rich-black` | Rich black (e.g. 60/40/40/100) only on large solids, within the printer's total ink limit (~300% coated, less uncoated). | Restrict rich black to solids. | P2 |
| `print/rgb-gamut` | Brand colors were proofed in CMYK or specified as spot (Pantone). Saturated RGB blues, greens and oranges dull on press. | Convert and proof; use a spot color for brand work. | P2 |
| `print/stock` | Type suits the stock: on uncoated paper and newsprint use sturdier faces, open counters, slightly larger sizes and no hairlines (dot gain fattens). | Adjust face or size for the stock; proof on the real paper. | P2 |
| `print/reversed-type` | Reversed-out (white on color) text is ≥ 8pt, medium rather than light weight, without fine serifs, and never reversed out of four-color black on uncoated stock. | Increase size or weight; reverse out of a single ink. | P1 |
| `print/bleed` | Anything that touches the page edge extends 3mm (1/8in in the US) past the trim. | Extend artwork; CSS Paged Media `bleed: 3mm; marks: crop`. | P1 |
| `print/safety` | Text and critical elements sit ≥ 3–5mm inside the trim. | Pull them in. | P1 |
| `print/resolution` | Raster images ~300ppi at printed size; type and logos stay vector, never rasterised. | Replace low-res images; re-export text as text. | P1 |
