async () => {
  await document.fonts.ready;
  const MAX_ROLES = 60;
  const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

  const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const parseColour = (str) => {
    const m = str.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    if (!str || str === 'transparent') return null;
    pixel.clearRect(0, 0, 1, 1);
    pixel.fillStyle = str;
    pixel.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
    return a === 0 ? null : { r, g, b, a: a / 255 };
  };
  const luminance = ({ r, g, b }) => {
    const c = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const blend = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
  });
  const backgroundOf = (el) => {
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    const stack = [];
    let imageBehind = false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') imageBehind = true;
      const c = parseColour(cs.backgroundColor);
      if (c && c.a > 0) {
        stack.push(c);
        if (c.a === 1) break;
      }
    }
    for (const c of stack.reverse()) bg = blend(c, bg);
    return { bg, imageBehind };
  };
  const contrast = (fg, bg) => {
    const a = luminance(blend(fg, bg)) + 0.05;
    const b = luminance(bg) + 0.05;
    return round(Math.max(a, b) / Math.min(a, b), 2);
  };
  const apcaY = ({ r, g, b }) => {
    const y = 0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4;
    return y > 0.022 ? y : y + (0.022 - y) ** 1.414;
  };
  const apcaLc = (fg, bg) => {
    const yt = apcaY(blend(fg, bg));
    const yb = apcaY(bg);
    if (Math.abs(yb - yt) < 0.0005) return 0;
    if (yb > yt) {
      const s = (yb ** 0.56 - yt ** 0.57) * 1.14;
      return s < 0.1 ? 0 : round((s - 0.027) * 100, 1);
    }
    const s = (yb ** 0.65 - yt ** 0.62) * 1.14;
    return s > -0.1 ? 0 : round((s + 0.027) * 100, 1);
  };
  const apcaRequired = (px, weight, isBody) => Math.min(90, apcaBase(px, weight, isBody) + (weight <= 300 ? 15 : 0));
  const apcaBase = (px, weight, isBody) => {
    const bold = weight >= 600;
    if (isBody) return px >= 18 || (px >= 16 && weight >= 500) ? 75 : 90;
    if (px >= 36 || (px >= 24 && bold)) return 45;
    if (px >= 24 || (px >= 16 && bold)) return 60;
    if (px >= 14) return 75;
    return 90;
  };
  const hex = ({ r, g, b }) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  const canvas = document.createElement('canvas').getContext('2d');
  const avgCharWidth = (cs, text) => {
    canvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const sample = text.slice(0, 400) || 'The quick brown fox jumps over the lazy dog';
    return canvas.measureText(sample).width / sample.length;
  };

  const loadedFaces = [...document.fonts].map((f) => ({
    family: f.family.replace(/["']/g, ''),
    weight: f.weight,
    style: f.style,
    display: f.display,
    status: f.status,
  }));
  const loadedFamilies = new Set(loadedFaces.filter((f) => f.status === 'loaded').map((f) => f.family.toLowerCase()));
  const declaredFamilies = new Set(loadedFaces.map((f) => f.family.toLowerCase()));
  const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong', '-apple-system', 'blinkmacsystemfont']);
  const likelyRendered = (stack, cs) => {
    const families = stack.split(',').map((s) => s.trim().replace(/["']/g, ''));
    const failed = [];
    for (const fam of families) {
      const key = fam.toLowerCase();
      if (GENERIC.has(key)) return { family: fam, how: failed.length ? `web font ${failed.join(', ')} failed or pending, so the generic ${fam} is rendering` : 'generic or system keyword' };
      if (declaredFamilies.has(key) && !loadedFamilies.has(key)) failed.push(fam);
      if (declaredFamilies.has(key)) {
        if (loadedFamilies.has(key)) {
          const faces = [...document.fonts].filter((f) => f.family.replace(/["']/g, '').toLowerCase() === key && f.status === 'loaded');
          const styleOk = faces.some((f) => (f.style !== 'normal') === (cs.fontStyle !== 'normal'));
          const want = Number(cs.fontWeight);
          const maxWeight = Math.max(...faces.map((f) => Math.max(...String(f.weight).split(/\s+/).map((w) => (w === 'bold' ? 700 : w === 'normal' ? 400 : Number(w) || 400)))));
          const problems = [];
          if (!styleOk) problems.push(`no ${cs.fontStyle} face: synthesised italic`);
          if (want >= 600 && maxWeight < 600) problems.push(`weight ${want} requested but the heaviest loaded face is ${maxWeight}: synthesised bold`);
          return { family: fam, how: problems.length ? `web font loaded, but ${problems.join('; ')}` : 'web font loaded' };
        }
        continue;
      }
      if (document.fonts.check(`16px "${fam}"`)) return { family: fam, how: 'local/system font (not declared with @font-face)' };
    }
    return { family: 'browser default', how: `nothing in the stack loaded (web fonts: ${families.filter((f) => declaredFamilies.has(f.toLowerCase())).join(', ') || 'none'} failed or pending), so the browser default face is rendering` };
  };

  const sheets = { fontFaces: [], hasPrintMedia: false, pageRules: [], darkModeRules: false, inaccessible: [] };
  const walkRules = (rules, media = '') => {
    for (const r of rules) {
      if (r.type === CSSRule.FONT_FACE_RULE) {
        const s = r.style;
        sheets.fontFaces.push({
          family: s.getPropertyValue('font-family').replace(/["']/g, ''),
          weight: s.getPropertyValue('font-weight') || '(unset)',
          style: s.getPropertyValue('font-style') || '(unset)',
          display: s.getPropertyValue('font-display') || '(unset: defaults to auto/block)',
          formats: [...s.getPropertyValue('src').matchAll(/format\(["']?([^"')]+)/g)].map((m) => m[1]),
          urls: [...s.getPropertyValue('src').matchAll(/url\(["']?([^"')]+)/g)].map((m) => new URL(m[1], r.parentStyleSheet?.href || location.href).href),
        });
      } else if (r.type === CSSRule.PAGE_RULE) {
        sheets.pageRules.push(r.cssText.slice(0, 300));
      } else if (r.type === CSSRule.MEDIA_RULE) {
        if (/print/.test(r.conditionText)) sheets.hasPrintMedia = true;
        if (/prefers-color-scheme:\s*dark/.test(r.conditionText)) sheets.darkModeRules = true;
        walkRules(r.cssRules, r.conditionText);
      } else if (r.cssRules) {
        walkRules(r.cssRules, media);
      }
    }
  };
  for (const sheet of document.styleSheets) {
    if (sheet.media && /^print$/.test(sheet.media.mediaText)) sheets.hasPrintMedia = true;
    try {
      walkRules(sheet.cssRules);
    } catch {
      sheets.inaccessible.push(sheet.href);
    }
  }

  const ROLE_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,caption,small,a,button,label,th,td,dt,dd,code,pre,input,textarea,[class*="eyebrow"],[class*="kicker"],[class*="lede"],[class*="caption"],[class*="byline"],[class*="meta"]';
  const roles = new Map();
  for (const el of document.querySelectorAll(ROLE_SELECTOR)) {
    const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!ownText && !['INPUT', 'TEXTAREA'].includes(el.tagName)) continue;
    const text = (el.innerText || el.value || '').trim().replace(/\s+/g, ' ');
    if (!text) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const tag = el.tagName.toLowerCase();
    const ownCls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    let context = '';
    if (!ownCls) {
      const anc = el.parentElement?.closest('[class], article, aside, nav, header, footer, main, section, table, form');
      if (anc && anc !== document.body) {
        const ac = typeof anc.className === 'string' && anc.className.trim() ? '.' + anc.className.trim().split(/\s+/)[0] : '';
        context = (ac || anc.tagName.toLowerCase()) + ' ';
      }
    }
    const cls = ownCls;
    const key = [context + tag + cls, cs.fontFamily, cs.fontSize, cs.fontWeight, cs.fontStyle, cs.lineHeight, cs.letterSpacing, cs.color, cs.textTransform, cs.textAlign].join('|');
    if (roles.has(key)) {
      roles.get(key).count += 1;
      continue;
    }
    if (roles.size >= MAX_ROLES) continue;

    const size = parseFloat(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight);
    const fg = parseColour(cs.color);
    const { bg, imageBehind } = backgroundOf(el);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const isBlockText = ['p', 'li', 'blockquote', 'dd', 'figcaption'].includes(tag) || /lede/.test(cls);
    const entry = {
      role: context + tag + cls,
      sample: text.slice(0, 60),
      count: 1,
      font: { declared: cs.fontFamily, likely: likelyRendered(cs.fontFamily, cs) },
      sizePx: size,
      sizeRem: round(size / parseFloat(getComputedStyle(document.documentElement).fontSize), 3),
      lineHeight: lh ? { px: round(lh, 1), ratio: round(lh / size, 2) } : 'normal',
      weight: cs.fontWeight,
      style: cs.fontStyle,
      letterSpacingEm: cs.letterSpacing === 'normal' ? 0 : round(parseFloat(cs.letterSpacing) / size, 3),
      textTransform: cs.textTransform,
      textAlign: cs.textAlign,
      hyphens: cs.hyphens,
      textWrap: cs.textWrapStyle || cs.textWrap || 'unsupported',
      numeric: cs.fontVariantNumeric,
      features: cs.fontFeatureSettings,
      kerning: cs.fontKerning,
      opticalSizing: cs.fontOpticalSizing,
      colour: fg ? hex(fg) : cs.color,
      background: hex(bg),
      contrast: fg ? contrast(fg, bg) : null,
      wcagAA: fg ? contrast(fg, bg) >= (size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700) ? 3 : 4.5) : null,
      apca: fg ? (() => {
        const lc = apcaLc(fg, bg);
        const required = apcaRequired(size, Number(cs.fontWeight), isBlockText && text.length >= 120);
        return { lc, required, pass: Math.abs(lc) >= required };
      })() : null,
      textOverImage: imageBehind,
      margins: { top: cs.marginTop, bottom: cs.marginBottom },
    };
    if (isBlockText) {
      const width = rect.width - padX;
      entry.measure = { widthPx: round(width, 0), approxCharsPerLine: Math.round(width / avgCharWidth(cs, text)), lines: lh ? Math.round((rect.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh) : null };
    }
    if (tag === 'a') {
      entry.link = {
        decoration: cs.textDecorationLine,
        thickness: cs.textDecorationThickness,
        offset: cs.textUnderlineOffset,
        skipInk: cs.textDecorationSkipInk,
        decorationColour: cs.textDecorationColor,
      };
    }
    roles.set(key, entry);
  }

  const sizes = [...new Set([...roles.values()].map((r) => r.sizePx))].sort((a, b) => a - b);
  const viewport = document.querySelector('meta[name="viewport"]');
  return {
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight, meta: viewport ? viewport.content : null },
    rootFontSizePx: parseFloat(getComputedStyle(document.documentElement).fontSize),
    colourScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    fontsLoaded: loadedFaces,
    fontFaceRules: sheets.fontFaces,
    fontPreloads: [...document.querySelectorAll('link[rel="preload"][as="font"]')].map((l) => ({ href: l.getAttribute('href'), crossorigin: l.hasAttribute('crossorigin') })),
    printStyles: { hasPrintMedia: sheets.hasPrintMedia, pageRules: sheets.pageRules },
    darkModeRules: sheets.darkModeRules,
    stylesheetsNotReadable: sheets.inaccessible,
    sizeScalePx: sizes,
    scaleRatios: sizes.slice(1).map((s, i) => round(s / sizes[i], 3)),
    roles: [...roles.values()],
  };
}
