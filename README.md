# Typography skills

Agent skills for checking typography.

## typography-check

Reviews the typography of a web page, a stylesheet, a print layout or a PDF, and reports ranked findings with a rule ID, location, measured value and fix for each.

It works out the medium first (web, print, a web page's print stylesheet, a press PDF or a screen PDF) and loads only the rules that fit. Print and web disagree on a lot: 10pt justified text with absolute leading is right in a book and wrong on a web page.

```
typography-check/
  SKILL.md                    workflow, medium detection, report format
  references/
    shared.md                 hierarchy, proximity, fonts, characters, micro-typography
    web.md                    units, measure, loading, contrast (WCAG 2.x and APCA), dark mode, links
    print.md                  page, grid, setting type, justification, print CSS, production
    pdf.md                    press PDF (PDF/X, boxes, embedding) and screen PDF (tagging)
  scripts/
    extract-web-type.js       run in the page (chrome-devtools evaluate_script, Playwright) to dump rendered type per role
    inspect-pdf.py            page boxes, fonts, colour, body size, leading, measure from a PDF (needs qpdf and Ghostscript)
    contrast.mjs              WCAG 2.x ratio and APCA Lc for a text/background pair
```

### Install

Symlink the skill into your agent's skills directory:

```sh
ln -s "$PWD/typography-check" ~/.claude/skills/typography-check
```

The PDF inspector needs `qpdf` and Ghostscript (`brew install qpdf ghostscript`). The other scripts need only Node.

### Usage

Ask your agent to "check the typography" of a URL, a folder of HTML/CSS, a print stylesheet or a PDF.

## Site

`site/` is the marketing page at [typography-check.view.fast](https://typography-check.view.fast), built with Astro:

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
