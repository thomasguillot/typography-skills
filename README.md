# Typography skills

Two agent skills for typography, with rules from the [Typography Handbook](https://typographyhandbook.com) web and print editions. Site: [typography-skills.view.fast](https://typography-skills.view.fast).

- **typography-check** reviews the typography of a web page, a stylesheet, a print layout or a PDF. It works out the medium first (web, print, a web page's print stylesheet, a press PDF or a screen PDF), loads only the rules that fit, measures what actually renders, and reports ranked findings, each with a rule ID, location, measured value and fix.
- **typography-scale** builds a type scale for what you are making. It proposes ratios for the context, compares them side by side, then generates sizes from xs to 5xl, leading snapped to a baseline grid, tracking and heading roles, as CSS custom properties, JSON tokens, Tailwind theme values or a print spec.

```
typography-check/
  SKILL.md                    workflow, medium detection, report format
  references/
    shared.md                 hierarchy, proximity, fonts, characters, micro-typography
    web.md                    units, measure, loading, contrast (WCAG 2 and APCA), dark mode, links, rhythm
    print.md                  page, grid, setting type, justification, print CSS, production
    pdf.md                    press PDF (PDF/X, boxes, embedding, Type3) and screen PDF (tagging)
  scripts/
    extract-web-type.js       run in the page (chrome-devtools evaluate_script, Playwright) to dump rendered type per role
    inspect-pdf.py            page boxes, fonts, color, body size, leading, measure from a PDF (needs qpdf and Ghostscript)
    contrast.mjs              WCAG 2 ratio and APCA Lc for a text/background pair

typography-scale/
  SKILL.md                    context questions, ratio guidance, output formats
  scripts/
    scale.mjs                 sizes, fluid clamp(), grid-snapped leading, tracking and roles as a table, CSS, JSON, Tailwind or a print spec
```

## Install

Clone the repository, then link both skills into your agent's skills directory:

```sh
git clone https://github.com/thomasguillot/typography-skills.git
ln -s "$PWD/typography-skills/typography-check" "$PWD/typography-skills/typography-scale" ~/.claude/skills/
```

The PDF inspector needs `qpdf` and Ghostscript (`brew install qpdf ghostscript`). The other scripts need only Node.

## Usage

Ask your agent:

- "Check the typography of https://example.com", or point it at a folder of CSS, a print stylesheet or a PDF.
- "Make a type scale for a docs site with an 18px body", or for a book, a dashboard or a landing page.

The scale script also runs on its own:

```sh
node typography-scale/scripts/scale.mjs --base 18 --compare major-third,perfect-fourth,golden
node typography-scale/scripts/scale.mjs --base 18 --ratio perfect-fourth --grid 27 --format css
node typography-scale/scripts/scale.mjs --medium print --base 10.5 --format spec
```

## Site

`site/` is the page at [typography-skills.view.fast](https://typography-skills.view.fast), built with Astro and set on a 27px baseline grid:

```sh
cd site
npm install
npm run build
```

## Credits

- Rules paraphrased from [Typography Handbook](https://typographyhandbook.com) (web and [print](https://typographyhandbook.com/print/) editions), based on Kenneth Wang's original [Typography Handbook](https://github.com/KennethWangDotDev/TypographyHandbook), MIT License.
- Report format and some gotchas adapted from [mblode/agent-skills](https://github.com/mblode/agent-skills) `typography-audit`, MIT License.
- APCA constants from the APCA-W3 0.0.98G reference by Myndex.

## License

MIT
