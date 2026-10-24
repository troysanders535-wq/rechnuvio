"""
Build the Digital ToolPad tool-link catalogue workbook.

Source of truth : src/data/tools.ts  (TOOLS_CATALOG) + src/data/tools_de.json
Exported to      : scripts/.cache/tools-export.json  (node scripts/export-tools.mjs)

Sheets
  1. All Tools        every tool: #, Name, Description (as authored), Description
                      (cleaned - live formula that strips the glued tool name),
                      Category, Slug, Engine, URL EN / DE / Local, desc length
  2. German (DE)      the German catalogue
  3. Summary          per-category counts driven by =COUNTIF / =AVERAGEIF
  4. Site Pages       core + category + blog landing pages and sitemap status

Usage: python scripts/build_tools_link_sheet.py
"""

import json
import os
import re
import sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", ".cache", "tools-export.json")
# The output path can be given on the command line, so a workbook that is
# open in a spreadsheet application does not block the rebuild.
OUT = (
    os.path.abspath(sys.argv[1])
    if len(sys.argv) > 1
    else os.path.join(ROOT, "digitaltoolpad-tools-link-sheet.xlsx")
)

EN_DOMAIN = "https://www.digitaltoolpad.com"
DE_DOMAIN = "https://de.digitaltoolpad.com"
LOCAL_BASE = "http://localhost:3100"

# ---------------------------------------------------------------- style ----
FONT = "Calibri"
BLACK = "000000"
BLUE = "0000FF"
GREEN = "008000"
RED = "FF0000"

HDR_FILL = PatternFill("solid", fgColor="1E3A5F")
HDR_FONT = Font(name=FONT, size=10, bold=True, color="FFFFFF")
TITLE_FONT = Font(name=FONT, size=14, bold=True, color=BLACK)
NOTE_FONT = Font(name=FONT, size=9, italic=True, color="595959")
BODY_FONT = Font(name=FONT, size=10, color=BLACK)
LINK_FONT = Font(name=FONT, size=10, color="0563C1", underline="single")
INPUT_FONT = Font(name=FONT, size=10, color=BLUE)
FORMULA_FONT = Font(name=FONT, size=10, color=BLACK)
BOLD_FONT = Font(name=FONT, size=10, bold=True, color=BLACK)
TOTAL_FILL = PatternFill("solid", fgColor="E8EEF7")
WARN_FILL = PatternFill("solid", fgColor="FFF4CE")
WARN_FONT = Font(name=FONT, size=10, bold=True, color="9C5700")

thin = Side(style="thin", color="D0D7E5")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
TOP = Alignment(vertical="top", wrap_text=True)
TOP_NOWRAP = Alignment(vertical="top")
CENTER = Alignment(horizontal="center", vertical="top")

HDR_H = 26


def write_header(sheet, row, headers, widths):
    for i, (head, width) in enumerate(zip(headers, widths), start=1):
        c = sheet.cell(row=row, column=i, value=head)
        c.fill, c.font, c.border = HDR_FILL, HDR_FONT, BORDER
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        sheet.column_dimensions[get_column_letter(i)].width = width
    sheet.row_dimensions[row].height = HDR_H


def set_link(sheet, row, col, url, text=None):
    c = sheet.cell(row=row, column=col, value=text or url)
    c.hyperlink = url
    c.font = LINK_FONT
    c.alignment = TOP_NOWRAP
    c.border = BORDER
    return c


def title_block(sheet, title, note, span):
    sheet.cell(row=1, column=1, value=title).font = TITLE_FONT
    sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=span)
    sheet.cell(row=2, column=1, value=note).font = NOTE_FONT
    sheet.merge_cells(start_row=2, start_column=1, end_row=2, end_column=span)


# --------------------------------------------------------------- source ----
with open(SRC, "r", encoding="utf-8") as fh:
    tools = json.load(fh)

CAT_ORDER = None  # derived from the catalog at runtime (see build_summary_order)

# The catalog stores one category with a leaked HTML entity: "Video &amp; Audio".
# COUNTIF has to match that raw string, while readers should see the clean form.
CAT_DISPLAY = {}


def clean_category(value: str) -> str:
    return (value or "").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")

CORE_PAGES = [
    ("Home", "/"),
    ("All Tools", "/tools"),
    ("Productivity Suite", "/productivity-suite"),
    ("Blog", "/blog"),
    ("About", "/about"),
    ("Contact", "/contact"),
    ("Privacy Policy", "/privacy-policy"),
    ("Terms of Service", "/terms-of-service"),
]

CATEGORY_PAGES = [
    ("JSON Tools", "/json-tools"), ("YAML Tools", "/yaml-tools"),
    ("Markdown Tools", "/markdown-tools"), ("PDF Tools", "/pdf-tools"),
    ("Image Tools", "/image-tools"), ("Text Tools", "/text-tools"),
    ("Developer Tools", "/developer-tools"), ("Calculator Tools", "/calculator-tools"),
    ("Productivity Tools", "/productivity-tools"), ("Base64 Tools", "/base64-tools"),
    ("Encoding Tools", "/encoding-tools"), ("Health Tools", "/health-tools"),
    ("Device Tools", "/device-tools"), ("File Viewers", "/file-viewers"),
    ("AI Tools", "/ai-tools"), ("Video Tools", "/video-tools"),
    ("DIY Tools", "/diy-tools"), ("Privacy Tools", "/privacy-tools"),
    ("Student Tools", "/student-tools"), ("Holiday Tools", "/holiday-tools"),
]

BLOG_POSTS = [
    "/blog/online-json-formatter", "/blog/what-is-base-64-encoding",
    "/blog/how-to-convert-xml-to-json", "/blog/privacy-first-qr-code-generator-playbook",
    "/blog/markdown-to-word-conversion-guide", "/blog/bank-statement-converter-developer-guide",
]

wb = Workbook()

# =========================================================== 1. All Tools ==
ws = wb.active
ws.title = "All Tools"
write_header(
    ws, 4,
    ["#", "Name", "Description (as authored)", "Description (cleaned)",
     "Category (catalog)", "Category (clean)", "Slug", "Engine",
     "URL (English)", "URL (German)", "URL (Local)", "Desc Len"],
    [5, 30, 62, 62, 18, 16, 34, 18, 46, 46, 42, 9],
)
title_block(
    ws,
    "Digital ToolPad - All Tools Link Catalogue (EN)",
    "Source: src/data/tools.ts (TOOLS_CATALOG) + src/data/tools_de.json | "
    "492 tools | Description (cleaned) is a live formula that strips the tool name "
    "glued onto the front of the authored description | Category (clean) un-escapes "
    "the HTML entity that leaks into the raw catalog category.",
    12,
)

row = 5
for i, t in enumerate(tools, start=1):
    ws.cell(row=row, column=1, value=i).alignment = CENTER
    ws.cell(row=row, column=2, value=t["name"])
    ws.cell(row=row, column=3, value=t["description"])
    # live formula: drop the glued tool-name prefix if present
    ws.cell(
        row=row, column=4,
        value=(f'=IF(LOWER(LEFT(C{row},LEN(B{row})))=LOWER(B{row}),'
               f'TRIM(MID(C{row},LEN(B{row})+1,1000)),C{row})'),
    )
    ws.cell(row=row, column=5, value=t["category"])
    ws.cell(row=row, column=6, value=f'=SUBSTITUTE(E{row},"&amp;","&")')
    ws.cell(row=row, column=7, value=t["slug"])
    ws.cell(row=row, column=8, value=t["engine"])
    set_link(ws, row, 9, f"{EN_DOMAIN}/tools/{t['slug']}")
    set_link(ws, row, 10, f"{DE_DOMAIN}/tools/{t['slug']}")
    set_link(ws, row, 11, f"{LOCAL_BASE}/tools/{t['slug']}")
    ws.cell(row=row, column=12, value=f"=LEN(D{row})")

    for col in range(1, 13):
        c = ws.cell(row=row, column=col)
        if col in (4, 6, 12):
            c.font = FORMULA_FONT
        else:
            c.font = BODY_FONT
        c.alignment = CENTER if col == 1 else TOP
        c.border = BORDER
    row += 1

LAST = row - 1
ws.freeze_panes = "C5"
ws.auto_filter.ref = f"A4:L{LAST}"

# ======================================================= 2. German (DE) ===
ws2 = wb.create_sheet("German (DE)")
write_header(
    ws2, 4,
    ["#", "Name (DE)", "Name (EN)", "Beschreibung (DE)",
     "Beschreibung (bereinigt)", "Kategorie (DE)", "Slug",
     "URL (Deutsch)", "URL (Local DE)", "Glue Key"],
    [5, 34, 30, 62, 62, 26, 34, 48, 46, 28],
)
title_block(
    ws2,
    "Digital ToolPad - Tool-Link-Katalog (DE)",
    "Quelle: src/data/tools_de.json | 492 Tools | "
    "Beschreibung (bereinigt) entfernt den vorangestellten Tool-Namen per Formel - "
    "geprueft werden Name (DE), Name (EN) und der Glue Key (DE-Name mit vertauschter "
    "Wortfolge). Bleibt der Text unveraendert, war kein Name vorangestellt.",
    10,
)


def glue_key(name_de: str, name_en: str, desc_de: str) -> str:
    """The exact prefix glued onto a German description, if it is a permutation
    of the German name that neither name literal matches."""
    if desc_de.lower().startswith(name_de.lower()):
        return ""
    if desc_de.lower().startswith(name_en.lower()):
        return ""
    tokens = name_de.split()
    for k in range(len(tokens), 0, -1):
        candidate = " ".join(tokens[:k][::-1])
        if desc_de.lower().startswith(candidate.lower()):
            return candidate
    return ""


row = 5
for i, t in enumerate(tools, start=1):
    de = t.get("de") or {}
    name_de = de.get("name") or t["name"]
    desc_de = de.get("description") or t["description"]
    cat_de = de.get("category") or t["category"]

    ws2.cell(row=row, column=1, value=i).alignment = CENTER
    ws2.cell(row=row, column=2, value=name_de)
    ws2.cell(row=row, column=3, value=t["name"])
    ws2.cell(row=row, column=4, value=desc_de)
    ws2.cell(
        row=row, column=5,
        value=(
            f'=IF(LOWER(LEFT(D{row},LEN(B{row})))=LOWER(B{row}),TRIM(MID(D{row},LEN(B{row})+1,1000)),'
            f'IF(LOWER(LEFT(D{row},LEN(C{row})))=LOWER(C{row}),TRIM(MID(D{row},LEN(C{row})+1,1000)),'
            f'IF(AND($J{row}<>"",LOWER(LEFT(D{row},LEN($J{row})))=LOWER($J{row})),'
            f'TRIM(MID(D{row},LEN($J{row})+1,1000)),D{row})))'
        ),
    )
    ws2.cell(row=row, column=6, value=cat_de)
    ws2.cell(row=row, column=7, value=t["slug"])
    set_link(ws2, row, 8, f"{DE_DOMAIN}/tools/{t['slug']}")
    set_link(ws2, row, 9, f"{LOCAL_BASE}/tools/{t['slug']}")
    ws2.cell(row=row, column=10, value=glue_key(name_de, t["name"], desc_de)).font = INPUT_FONT

    for col in range(1, 11):
        c = ws2.cell(row=row, column=col)
        if col == 5:
            c.font = FORMULA_FONT
        elif col == 10:
            c.font = INPUT_FONT
        else:
            c.font = BODY_FONT
        c.alignment = CENTER if col == 1 else TOP
        c.border = BORDER
    row += 1

ws2.freeze_panes = "D5"
ws2.auto_filter.ref = f"A4:J{row - 1}"

# ============================================================ 3. Summary ===
# Categories are derived from the catalog itself so a COUNTIF can never miss
# a row because the label was hardcoded wrong (the catalog ships one category
# as "Video &amp; Audio", with a leaked HTML entity).
counts = {}
for t in tools:
    counts[t["category"]] = counts.get(t["category"], 0) + 1
CAT_KEYS = sorted(counts, key=lambda k: (-counts[k], clean_category(k).lower()))
CAT_DISPLAY = {k: clean_category(k) for k in CAT_KEYS}
N_CATS = len(CAT_KEYS)
TOTAL_ROW = 5 + N_CATS          # one row per category, then the TOTAL row
CHK_ROW = TOTAL_ROW + 2

ws3 = wb.create_sheet("Summary")
title_block(
    ws3,
    "Digital ToolPad - Inventory Summary",
    "All counts are live formulas over the 'All Tools' sheet - edit a row there and "
    "these totals recompute. Source: src/data/tools.ts.",
    7,
)
write_header(
    ws3, 4,
    ["Category", "Tools", "Share of Total", "Avg Clean Desc Length",
     "Catalog Key (raw)", "Status", "Note"],
    [24, 10, 15, 22, 20, 12, 40],
)

for i, key in enumerate(CAT_KEYS):
    r = 5 + i
    ws3.cell(row=r, column=1, value=CAT_DISPLAY[key]).font = BOLD_FONT
    ws3.cell(row=r, column=2, value=f'=COUNTIF(\'All Tools\'!$E$5:$E${LAST},$E{r})')
    ws3.cell(row=r, column=3, value=f'=IF($B${TOTAL_ROW}=0,0,B{r}/$B${TOTAL_ROW})')
    ws3.cell(row=r, column=4, value=(
        f'=IFERROR(ROUND(AVERAGEIF(\'All Tools\'!$E$5:$E${LAST},$E{r},'
        f'\'All Tools\'!$L$5:$L${LAST}),0),0)'))
    ws3.cell(row=r, column=5, value=key).font = INPUT_FONT
    ws3.cell(row=r, column=6, value=f'=IF(B{r}>0,"OK","NO MATCH")')
    ws3.cell(row=r, column=7, value=(
        "Catalog stores an HTML-escaped ampersand in this category"
        if CAT_DISPLAY[key] != key else ""
    )).font = NOTE_FONT

CAT_LAST = 4 + N_CATS
ws3.cell(row=TOTAL_ROW, column=1, value="TOTAL")
ws3.cell(row=TOTAL_ROW, column=2, value=f"=SUM(B5:B{CAT_LAST})")
ws3.cell(row=TOTAL_ROW, column=3, value=f"=SUM(C5:C{CAT_LAST})")
ws3.cell(row=TOTAL_ROW, column=4, value=(
    f'=ROUND(AVERAGE(\'All Tools\'!$L$5:$L${LAST}),0)'))
ws3.cell(row=TOTAL_ROW, column=5, value=f"{N_CATS} categories").font = INPUT_FONT
ws3.cell(row=TOTAL_ROW, column=6, value=f'=IF(B{TOTAL_ROW}=COUNTA(\'All Tools\'!$B$5:$B${LAST}),"OK","CHECK")')
ws3.cell(row=TOTAL_ROW, column=7, value="")

for r in range(5, TOTAL_ROW + 1):
    for col in range(1, 8):
        c = ws3.cell(row=r, column=col)
        c.border = BORDER
        if col == 1:
            c.alignment = TOP_NOWRAP
        elif col == 3:
            c.alignment = CENTER
            c.number_format = "0.0%"
        elif col in (2, 4):
            c.alignment = CENTER
            c.number_format = "#,##0"
        elif col in (5, 6):
            c.alignment = CENTER
        else:
            c.alignment = TOP_NOWRAP
        if r == TOTAL_ROW:
            c.fill = TOTAL_FILL
            c.font = BOLD_FONT
        elif col in (2, 3, 4, 6):
            c.font = FORMULA_FONT
        elif col == 5:
            c.font = INPUT_FONT
        elif col == 7:
            c.font = NOTE_FONT
        else:
            c.font = BOLD_FONT

ws3.cell(row=CHK_ROW, column=1, value="Rows on 'All Tools' sheet").font = BOLD_FONT
ws3.cell(row=CHK_ROW, column=2, value=f"=COUNTA('All Tools'!$B$5:$B${LAST})")
ws3.cell(row=CHK_ROW, column=3, value="Catalog size (source)").font = BOLD_FONT
ws3.cell(row=CHK_ROW, column=4, value=len(tools)).font = INPUT_FONT
ws3.cell(row=CHK_ROW + 1, column=1, value="Coverage check").font = BOLD_FONT
ws3.cell(
    row=CHK_ROW + 1, column=2,
    value=(
        f'=IF(AND(B{TOTAL_ROW}=B{CHK_ROW},D{CHK_ROW}={len(tools)}),'
        f'"OK - all "&TEXT(D{CHK_ROW},"0")&" tools accounted for","MISMATCH")'
    ),
)
ws3.merge_cells(start_row=CHK_ROW + 1, start_column=2, end_row=CHK_ROW + 1, end_column=7)
for r in (CHK_ROW, CHK_ROW + 1):
    for col in range(1, 8):
        c = ws3.cell(row=r, column=col)
        c.border = BORDER
        c.alignment = TOP_NOWRAP
        if r == CHK_ROW and col in (2, 4):
            c.font = FORMULA_FONT if col == 2 else INPUT_FONT
        if r == CHK_ROW + 1:
            c.font = FORMULA_FONT if col == 2 else BOLD_FONT
ws3.cell(row=CHK_ROW + 1, column=2).font = BOLD_FONT

# ========================================================== 4. Site Pages =
ws4 = wb.create_sheet("Site Pages")
write_header(
    ws4, 4,
    ["Page Type", "Path", "URL (English)", "URL (German)", "In Sitemap?", "Note"],
    [16, 34, 46, 46, 14, 44],
)
title_block(
    ws4,
    "Digital ToolPad - Site Pages & Sitemap Coverage",
    "Sitemap source: src/app/sitemap.ts (fetched from http://localhost:3100/sitemap.xml) | "
    "506 paths per locale = 8 core + 492 tools + 6 blog posts.",
    6,
)

sitemap_paths = {path for _, path in CORE_PAGES} | {f"/tools/{t['slug']}" for t in tools} | set(BLOG_POSTS)

r = 5
for label, path in CORE_PAGES:
    ws4.cell(row=r, column=1, value="Core Page").font = BODY_FONT
    ws4.cell(row=r, column=2, value=path).font = BODY_FONT
    set_link(ws4, r, 3, EN_DOMAIN + path)
    set_link(ws4, r, 4, DE_DOMAIN + path)
    ws4.cell(row=r, column=5, value="Yes" if path in sitemap_paths else "No")
    ws4.cell(row=r, column=6, value="In sitemap.xml")
    for col in range(1, 7):
        c = ws4.cell(row=r, column=col)
        c.border = BORDER
        c.alignment = CENTER if col == 5 else TOP_NOWRAP
        if col in (1, 2, 6) and c.font != LINK_FONT:
            c.font = BODY_FONT
    r += 1

for label, path in CATEGORY_PAGES:
    ws4.cell(row=r, column=1, value="Category Page").font = BODY_FONT
    ws4.cell(row=r, column=2, value=path).font = BODY_FONT
    set_link(ws4, r, 3, EN_DOMAIN + path)
    set_link(ws4, r, 4, DE_DOMAIN + path)
    ws4.cell(row=r, column=5, value="Yes" if path in sitemap_paths else "No")
    ws4.cell(row=r, column=6, value="MISSING FROM SITEMAXML" if path not in sitemap_paths else "In sitemap.xml")
    for col in range(1, 7):
        c = ws4.cell(row=r, column=col)
        c.border = BORDER
        c.alignment = CENTER if col == 5 else TOP_NOWRAP
        if path not in sitemap_paths:
            c.fill = WARN_FILL
            if col in (1, 2, 6):
                c.font = WARN_FONT
        elif col in (1, 2, 6):
            c.font = BODY_FONT
    r += 1

for path in BLOG_POSTS:
    ws4.cell(row=r, column=1, value="Blog Post").font = BODY_FONT
    ws4.cell(row=r, column=2, value=path).font = BODY_FONT
    set_link(ws4, r, 3, EN_DOMAIN + path)
    set_link(ws4, r, 4, DE_DOMAIN + path)
    ws4.cell(row=r, column=5, value="Yes" if path in sitemap_paths else "No")
    ws4.cell(row=r, column=6, value="In sitemap.xml")
    for col in range(1, 7):
        c = ws4.cell(row=r, column=col)
        c.border = BORDER
        c.alignment = CENTER if col == 5 else TOP_NOWRAP
        if col in (1, 2, 6):
            c.font = BODY_FONT
    r += 1

ws4.freeze_panes = "A5"

wb.save(OUT)
print(f"written: {OUT}")
print(f"tools rows: {len(tools)} (rows 5..{LAST})")
print(f"summary category rows: 5..{CAT_LAST}, total row {TOTAL_ROW}, checks {CHK_ROW}/{CHK_ROW + 1}")
print(f"site page rows: 5..{r - 1}")
