#!/usr/bin/env python3
"""Report the typographic and production facts of a PDF.

Usage: python3 -I inspect-pdf.py FILE.pdf [--pages N]

Needs qpdf (structure, fonts, boxes) and Ghostscript (text sizes and lines).
Either one missing degrades the report instead of failing it.
"""

import argparse
import html
import json
import re
import shutil
import statistics
import subprocess
import sys
from collections import Counter, defaultdict

PT_PER_MM = 72 / 25.4

FORMATS = {
    "A3": (297, 420),
    "A4": (210, 297),
    "A5": (148, 210),
    "A6": (105, 148),
    "B5": (176, 250),
    "US Letter": (215.9, 279.4),
    "US Legal": (215.9, 355.6),
    "Tabloid": (279.4, 431.8),
    "B-format paperback": (129, 198),
    "Demy": (135, 216),
    "Royal": (156, 234),
    "US Trade": (152.4, 228.6),
    "16:9 slide (13.33in)": (338.7, 190.5),
}


def mm(pt):
    return round(pt / PT_PER_MM, 1)


def name_format(w_mm, h_mm):
    for name, (fw, fh) in FORMATS.items():
        for a, b in ((fw, fh), (fh, fw)):
            if abs(w_mm - a) <= 1.5 and abs(h_mm - b) <= 1.5:
                orient = "" if a == fw else " landscape"
                return name + orient
    return None


def run(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.TimeoutExpired) as exc:
        return exc


def structure(path):
    if not shutil.which("qpdf"):
        return {"error": "qpdf not installed (brew install qpdf); structure, fonts and boxes skipped"}
    res = run(["qpdf", "--json=2", path])
    if isinstance(res, Exception) or not res.stdout:
        res = run(["qpdf", "--json", path])
    if isinstance(res, Exception) or not res.stdout:
        return {"error": f"qpdf failed: {getattr(res, 'stderr', res)}"}
    try:
        data = json.loads(res.stdout)
        if isinstance(data.get("qpdf"), list):
            meta, objs = data["qpdf"][0], data["qpdf"][1]
        else:
            meta, objs = data.get("parameters", {}), data["objects"]
        return structure_from(data, meta, objs)
    except (KeyError, IndexError, TypeError, ValueError, AttributeError) as exc:
        return {"error": f"qpdf JSON not understood ({type(exc).__name__}: {exc}); upgrade qpdf (brew upgrade qpdf). Structure, fonts and boxes skipped"}


def structure_from(data, meta, objs):

    def val(ref):
        o = objs.get(f"obj:{ref}") if isinstance(ref, str) and ref.endswith(" R") else None
        if o is None:
            return ref
        return o.get("value", o.get("stream", {}).get("dict"))

    def deref(x):
        return val(x) if isinstance(x, str) and x.endswith(" R") else x

    trailer = objs["trailer"]["value"]
    root = deref(trailer["/Root"])
    info = deref(trailer.get("/Info", {})) or {}

    out = {
        "pdf_version": meta.get("pdfversion"),
        "producer": str(info.get("/Producer", "")).removeprefix("u:"),
        "creator": str(info.get("/Creator", "")).removeprefix("u:"),
        "title": str(info.get("/Title", "")).removeprefix("u:") or None,
        "lang": str(root.get("/Lang", "")).removeprefix("u:") or None,
        "tagged": bool((deref(root.get("/MarkInfo", {})) or {}).get("/Marked")) or "/StructTreeRoot" in root,
        "pdfx": None,
        "output_intent": None,
    }
    for intent in deref(root.get("/OutputIntents", [])) or []:
        intent = deref(intent)
        subtype = intent.get("/S")
        out["output_intent"] = {
            "subtype": subtype,
            "kind": {"/GTS_PDFX": "PDF/X", "/GTS_PDFA1": "PDF/A"}.get(subtype, "other"),
            "condition": str(intent.get("/OutputConditionIdentifier", "")).removeprefix("u:"),
        }
    for k, v in info.items():
        if k.upper().startswith("/GTS_PDFX"):
            out["pdfx"] = str(v).removeprefix("u:")

    sizes = Counter()
    boxes_seen = Counter()
    for page in data["pages"]:
        p = deref(page["object"])
        node, inherited = p, {}
        while node:
            for key in ("/MediaBox", "/CropBox", "/Rotate"):
                if key in node and key not in inherited:
                    inherited[key] = node[key]
            node = deref(node.get("/Parent")) if node.get("/Parent") else None
        media = deref(inherited.get("/MediaBox"))
        trim = deref(p.get("/TrimBox"))
        bleed = deref(p.get("/BleedBox"))
        for key in ("/TrimBox", "/BleedBox", "/ArtBox"):
            if key in p:
                boxes_seen[key] += 1
        box = trim or media
        w, h = box[2] - box[0], box[3] - box[1]
        ref = media or box
        edges = (box[0] - ref[0], ref[3] - box[3], ref[2] - box[2], box[1] - ref[1])
        try:
            rot = int(deref(inherited.get("/Rotate")) or 0) % 360
        except (TypeError, ValueError):
            rot = 0
        if rot == 90:
            w, h, edges = h, w, (edges[3], edges[0], edges[1], edges[2])
        elif rot == 270:
            w, h, edges = h, w, (edges[1], edges[2], edges[3], edges[0])
        elif rot == 180:
            edges = (edges[2], edges[3], edges[0], edges[1])
        left_off, top_off = round(edges[0], 2), round(edges[1], 2)
        bleed_mm = None
        if trim and bleed:
            bleed_mm = mm(min(trim[0] - bleed[0], trim[1] - bleed[1], bleed[2] - trim[2], bleed[3] - trim[3]))
        elif trim and media:
            bleed_mm = mm(min(trim[0] - media[0], trim[1] - media[1], media[2] - trim[2], media[3] - trim[3]))
        sizes[(mm(w), mm(h), bleed_mm, left_off, top_off, rot)] += 1
    out["page_count"] = len(data["pages"])
    out["page_sizes"] = [
        {"width_mm": w, "height_mm": h, "format": name_format(w, h), "bleed_mm": b, "pages": n,
         "rotate": r, "trim_offset_pt": {"left": lo, "top": to}}
        for (w, h, b, lo, to, r), n in sizes.most_common()
    ]
    out["has_trimbox"] = boxes_seen["/TrimBox"] > 0
    out["has_bleedbox"] = boxes_seen["/BleedBox"] > 0

    fonts = {}
    colorspaces = Counter()
    cs_names = {}
    for key, o in objs.items():
        d = o.get("value") if isinstance(o, dict) else None
        d = d if isinstance(d, dict) else (o.get("stream", {}).get("dict") if isinstance(o, dict) else None)
        if not isinstance(d, dict):
            continue
        if d.get("/Type") == "/Font" and d.get("/Subtype") != "/Type0":
            fd = deref(d.get("/FontDescriptor", {})) or {}
            base = str(d.get("/BaseFont") or fd.get("/FontName") or "(unnamed)").lstrip("/")
            embedded = any(k in fd for k in ("/FontFile", "/FontFile2", "/FontFile3"))
            if d.get("/Subtype") == "/Type3":
                embedded = True
            subset = bool(re.match(r"^[A-Z]{6}\+", base))
            clean = re.sub(r"^[A-Z]{6}\+", "", base)
            entry = fonts.setdefault(clean, {"embedded": True, "subset": False, "type": str(d.get("/Subtype", "")).lstrip("/")})
            entry["embedded"] = entry["embedded"] and embedded
            entry["subset"] = entry["subset"] or subset
        for cs_key in ("/ColorSpace",):
            cs = d.get(cs_key)
            if isinstance(cs, dict):
                for cs_name, v in cs.items():
                    v = deref(v)
                    name = v[0] if isinstance(v, list) and v else v
                    colorspaces[str(name)] += 1
                    resolved = str(name).lstrip("/")
                    if resolved == "ICCBased" and isinstance(v, list) and len(v) > 1:
                        n = (deref(v[1]) or {}).get("/N") if isinstance(deref(v[1]), dict) else None
                        resolved = f"ICCBased/{n}" if n else resolved
                    elif resolved in ("Separation", "DeviceN") and isinstance(v, list) and len(v) > 1:
                        resolved = f"{resolved} {deref(v[1]) if isinstance(deref(v[1]), str) else ''}".strip()
                    cs_names.setdefault(cs_name, set()).add(resolved)
            elif isinstance(cs, str) and cs.startswith("/"):
                colorspaces[cs] += 1
    out["fonts"] = [{"name": n, **f} for n, f in sorted(fonts.items())]
    if any(f["type"] == "Type3" for f in fonts.values()):
        out["type3_note"] = ("Type3 fonts draw glyphs as procedures: no hinting, and some RIPs and preflight profiles reject them. "
                             "Chrome writes variable-font instances this way when printing.")
    out["image_and_resource_colorspaces"] = dict(colorspaces)
    out["_cs_names"] = {k.lstrip("/"): sorted(v) for k, v in cs_names.items()}
    return out


COLOUR_OPS = re.compile(rb"(?<![\w/.])(?:(/[^\s/\[\]()<>]+)\s+(cs|CS)|((?:-?[\d.]+\s+){1,4})(k|K|rg|RG|g|G|sc|scn|SC|SCN))(?![\w*'\"])")
DEVICE_BY_COUNT = {1: "/DeviceGray", 3: "/DeviceRGB", 4: "/DeviceCMYK"}


def colour_label(space, vals, resources):
    n = len(vals)
    kind = space
    if space.startswith("/") and space.lstrip("/") in resources:
        options = resources[space.lstrip("/")]
        kind = "/" + options[0] if len(options) == 1 else space
    if kind.startswith("/ICCBased"):
        kind = DEVICE_BY_COUNT.get(n, kind)
    if kind == "/DeviceCMYK" and n == 4:
        vals = tuple(round(v, 2) for v in vals)
        label = "CMYK " + " ".join(f"{v:g}" for v in vals)
        if vals == (1, 1, 1, 1):
            label += " (registration black)"
        elif vals[3] == 1 and sum(vals[:3]) > 0:
            label += " (rich black)"
        elif min(vals[:3]) > 0.2 and vals[3] > 0.2:
            label += " (four-colour grey/black)"
        return label
    if kind == "/DeviceRGB" and n == 3:
        return "RGB #%02x%02x%02x" % tuple(round(v * 255) for v in vals)
    if kind == "/DeviceGray" and n == 1:
        return f"Gray {vals[0]:g}"
    return f"{kind.lstrip('/')} " + " ".join(f"{v:g}" for v in vals)


def colours(path, resources=None):
    """Count fill/stroke colour operators in the uncompressed content streams."""
    if not shutil.which("qpdf"):
        return None
    try:
        raw = subprocess.run(["qpdf", "--qdf", "--object-streams=disable", path, "-"],
                             capture_output=True, timeout=180).stdout
    except (OSError, subprocess.TimeoutExpired):
        return None
    resources = resources or {}
    found = Counter()
    for chunk in raw.split(b"endstream"):
        spaces = {"fill": "/DeviceGray", "stroke": "/DeviceGray"}
        for m in COLOUR_OPS.finditer(chunk):
            if m.group(1):
                spaces["fill" if m.group(2) == b"cs" else "stroke"] = m.group(1).decode("latin-1")
                continue
            op = m.group(4).decode()
            try:
                vals = tuple(float(v) for v in m.group(3).split())
            except ValueError:
                continue
            use = "fill" if op in ("k", "rg", "g", "sc", "scn") else "stroke"
            if op in ("k", "K"):
                spaces[use] = "/DeviceCMYK"
            elif op in ("rg", "RG"):
                spaces[use] = "/DeviceRGB"
            elif op in ("g", "G"):
                spaces[use] = "/DeviceGray"
            elif len(vals) > 4:
                continue
            found[(use, colour_label(spaces[use], vals, resources))] += 1
    return [{"use": u, "colour": c, "count": n} for (u, c), n in found.most_common(12)]


SPAN = re.compile(r'<span bbox="([\d.\- ]+)" font="([^"]*)" size="([\d.]+)">')
CHAR = re.compile(r'<char bbox="([\d.\- ]+)" c="([^"]*)"/>')


def text_layout(path, max_pages):
    if not shutil.which("gs"):
        return {"error": "Ghostscript not installed (brew install ghostscript); text sizes and measure skipped"}
    cmd = ["gs", "-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=txtwrite", "-dTextFormat=0",
           f"-dLastPage={max_pages}", "-sOutputFile=-", path]
    res = run(cmd)
    if isinstance(res, Exception) or res.returncode != 0:
        return {"error": f"Ghostscript failed: {getattr(res, 'stderr', res)}"}

    size_chars = Counter()
    font_by_size = defaultdict(Counter)
    lines = []
    page_extents = []
    for page_xml in res.stdout.split("<page>")[1:]:
        page_lines = defaultdict(list)
        xs, ys = [], []
        size = font = None
        for line in page_xml.splitlines():
            m = SPAN.search(line)
            if m:
                size = round(float(m.group(3)) * 2) / 2
                font = re.sub(r"^[A-Z]{6}\+", "", m.group(2)).replace("-Identity-H", "")
                continue
            c = CHAR.search(line)
            if c and size:
                x0, y0, x1, _ = (float(v) for v in c.group(1).split())
                ch = html.unescape(c.group(2))
                page_lines[(round(y0), size)].append((x0, x1, ch))
                top = y0 - size * 0.7
                if ch.strip():
                    size_chars[size] += 1
                    font_by_size[size][font] += 1
                    xs += [x0, x1]
                    ys.append(top)
        if xs:
            page_extents.append((min(xs), max(xs), min(ys), max(ys)))
        for (y, s), chars in page_lines.items():
            chars.sort()
            runs = [[chars[0]]]
            for prev, cur in zip(chars, chars[1:]):
                if cur[0] - prev[1] > s:
                    runs.append([])
                runs[-1].append(cur)
            for run_chars in runs:
                text = "".join(ch for _, _, ch in run_chars)
                if text.strip():
                    lines.append({"y": y, "size": s, "text": text, "x0": run_chars[0][0], "x1": run_chars[-1][1],
                                  "page": len(page_extents)})

    if not size_chars:
        return {"error": "no extractable text: the PDF may be outlined or rasterised (type converted to shapes or images)"}

    body = size_chars.most_common(1)[0][0]
    body_lines = [l for l in lines if l["size"] == body]
    widths = [len(l["text"].strip()) for l in body_lines]
    full = sorted(widths)[len(widths) // 2:] if widths else []
    leads = []
    by_page = defaultdict(list)
    for l in body_lines:
        by_page[l["page"]].append(l["y"])
    for ys in by_page.values():
        ys = sorted(set(ys))
        leads += [b - a for a, b in zip(ys, ys[1:]) if 0 < b - a < body * 3]

    sample = " ".join(l["text"] for l in lines)
    chars = {
        "straight_double_quotes": sample.count('"'),
        "straight_single_quotes": sample.count("'"),
        "double_hyphens": sample.count("--"),
        "curly_quotes": sum(sample.count(c) for c in "‘’“”"),
        "en_dashes": sample.count("–"),
        "em_dashes": sample.count("—"),
        "ligature_glyphs": sum(sample.count(c) for c in "ﬀﬁﬂﬃﬄ"),
        "digit_hyphen_digit": len(re.findall(r"\d-\d", sample)),
    }
    sizes = sorted(size_chars)
    return {
        "body_size_pt": body,
        "body_fonts": [f for f, _ in font_by_size[body].most_common(3)],
        "body_leading_pt": statistics.median(leads) if leads else None,
        "body_chars_per_line_median_full_lines": statistics.median(full) if full else None,
        "sizes_pt_by_share": [
            {"size": s, "share": round(size_chars[s] / sum(size_chars.values()), 3),
             "fonts": [f for f, _ in font_by_size[s].most_common(2)]}
            for s in sorted(size_chars, key=size_chars.get, reverse=True)
        ],
        "smallest_text_pt": sizes[0],
        "scale_ratios": [round(b / a, 3) for a, b in zip(sizes, sizes[1:])],
        "text_extents_pt": {
            "left_min": min(e[0] for e in page_extents),
            "right_max": max(e[1] for e in page_extents),
            "top_min": min(e[2] for e in page_extents),
            "bottom_max": max(e[3] for e in page_extents),
            "note": "y is measured from the top of the MediaBox; top_min is the top of the highest glyph (baseline minus 0.7 em of its own size)",
        },
        "character_checks": chars,
        "pages_scanned": len(page_extents),
    }


def medium_hint(s):
    if "error" in s:
        return "unknown"
    press = []
    if s.get("has_trimbox") or s.get("has_bleedbox"):
        press.append("trim/bleed boxes")
    if (s.get("output_intent") or {}).get("kind") == "PDF/X" or s.get("pdfx"):
        press.append("PDF/X output intent")
    if "/DeviceCMYK" in s.get("image_and_resource_colorspaces", {}):
        press.append("CMYK colour")
    fmt = (s["page_sizes"][0].get("format") or "") if s.get("page_sizes") else ""
    if press:
        return "press (" + ", ".join(press) + ")"
    if "slide" in fmt:
        return "screen (slide proportions, no press signals)"
    return "office/screen PDF (no trim, bleed, PDF/X or CMYK): ask whether it is going to a press"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf")
    ap.add_argument("--pages", type=int, default=20, help="pages to scan for text metrics (default 20)")
    args = ap.parse_args()
    s = structure(args.pdf)
    text = text_layout(args.pdf, args.pages)
    if "error" not in s and "error" not in text and any(p["rotate"] for p in s.get("page_sizes", [])):
        text.pop("text_extents_pt", None)
        for key in ("body_leading_pt", "body_chars_per_line_median_full_lines"):
            text[key] = None
        text["rotated_pages_note"] = ("page /Rotate is set and Ghostscript reports text in unrotated, mixed coordinates: "
                                      "leading, measure and margins are skipped; rotate the PDF upright to measure them")
    elif "error" not in s and "error" not in text and s.get("page_sizes"):
        page = s["page_sizes"][0]
        ext = text.pop("text_extents_pt")
        off = page["trim_offset_pt"]
        text["text_block_margins_mm_approx"] = {
            "top": mm(ext["top_min"] - off["top"]),
            "bottom": round(page["height_mm"] - mm(ext["bottom_max"] - off["top"]), 1),
            "left": mm(ext["left_min"] - off["left"]),
            "right": round(page["width_mm"] - mm(ext["right_max"] - off["left"]), 1),
            "note": "from the extremes of text on any page, so a short last page does not skew them; ignores images and rules",
        }
    s["colour_operators"] = colours(args.pdf, s.pop("_cs_names", None))
    if s["colour_operators"] and any(c["colour"].startswith("CMYK") for c in s["colour_operators"]):
        s.setdefault("image_and_resource_colorspaces", {})["/DeviceCMYK"] = 1
    report = {"file": args.pdf, "medium_hint": medium_hint(s), "structure": s, "text": text}
    json.dump(report, sys.stdout, indent=2, ensure_ascii=False)
    print()


if __name__ == "__main__":
    main()
