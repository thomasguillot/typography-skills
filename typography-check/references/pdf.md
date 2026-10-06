# PDF rules

Run `python3 -I scripts/inspect-pdf.py FILE.pdf` first. It reports page boxes, fonts (embedded, subset), PDF/X intent, tagging, color operators, body size, leading, characters per line, size scale, approximate margins and character checks. Then apply `print.md` for press PDFs, plus the screen rules below for PDFs read on screen.

## Reading the inspector output

| Output | What it tells you |
|---|---|
| `medium_hint` | `press` when trim/bleed boxes, PDF/X or CMYK are present. `office/screen` otherwise. An office/screen PDF of a book or magazine page size is probably a proof that is not yet press-ready: ask. |
| `structure.fonts[].embedded` | `false` is P0: the PDF will substitute fonts on other machines (the classic "printed in Courier"). |
| `structure.fonts[].name` | Compare with the intended faces. Times, Helvetica, Arial or DejaVu where a different face was specified means the source font never loaded and the renderer substituted: `print/rendered-font`, P0, and invisible in a code review. If you can't see the source, ask which face was intended rather than guess. |
| `structure.color_operators` | RGB color, `(four-color gray/black)` or `(registration black)` in a press PDF is a production finding (`print/text-100k`) when it colors text. The counts cover fills and strokes, not only text, so confirm on a rendered page which ones set type. |
| `text.body_size_pt`, `body_leading_pt`, `body_chars_per_line_median_full_lines` | Check against `print/body-size`, `print/leading`, `print/measure`. These are measured, not guessed: prefer them to visual estimates. |
| `text.sizes_pt_by_share`, `scale_ratios` | Check the scale and the smallest size (`print/small-sizes`). |
| `text.text_block_margins_mm_approx` | Check `print/margin-hierarchy` (bottom largest). Approximate: derived from text extremes. |
| `text.character_checks` | Straight quotes, `--`, digit-hyphen-digit ranges: `shared/quotes`, `shared/dashes`. |
| `text.error: no extractable text` | Text was outlined or rasterised: P1 (not searchable, not accessible, rendering of fine strokes changed) unless it is a logo. |

## Press PDF

| ID | Check | Fix | Sev |
|---|---|---|---|
| `pdf/pdfx` | Press files are PDF/X: PDF/X-4 by default (live transparency, color-managed), PDF/X-1a only if the printer asks. A generic "Save as PDF" is not print-ready. | Export with the printer's preset; validate with Acrobat preflight or veraPDF. | P1 |
| `pdf/boxes` | TrimBox and BleedBox are present and the bleed survived export (3mm). | Re-export with bleed and marks. | P1 |
| `pdf/embedded` | All fonts embedded (subsetting is fine for final output; full embedding only if the file will be edited). | Re-export; PDF/X makes embedding mandatory. | P0 |
| `pdf/no-type3` | Text fonts are embedded as TrueType/OpenType/CFF, not Type3 (`structure.fonts[].type`). Chrome prints variable-font instances as Type3: fine on screen, a prepress risk for press. | For press, export with static font instances, or produce the PDF from a DTP or Paged Media engine that embeds the font program. | P2 |
| `pdf/no-outlined-text` | Text is not converted to outlines except as a last resort for a license that forbids embedding. | Embed instead. | P2 |

## Screen PDF (reports, decks, documents read on screen)

| ID | Check | Fix | Sev |
|---|---|---|---|
| `pdf/tagged` | Tagged PDF with a real heading structure, reading order, alt text and a document language (`structure.tagged`, `structure.lang`). PDF/UA is the standard; EU public-sector documents increasingly require it. | Export tagged from paragraph styles mapped to tags. | P1 |
| `pdf/title` | Document title set (shows in the viewer tab instead of the file name). | Set it in document properties. | P3 |
| `pdf/screen-contrast` | Text contrast meets WCAG AA (screen readers of the PDF are on screens). | As `web/contrast`. | P1 |
| `pdf/screen-size` | Body text is legible on a laptop at fit-width: for A4/Letter, ~10.5–12pt body. Smaller print sizes force zooming. | Raise the size for the screen edition. | P2 |
