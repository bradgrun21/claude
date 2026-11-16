"""sheetkit - a small design system on top of openpyxl for sellable spreadsheet templates.

Everything here is chosen to survive three places at once: Excel, Google Sheets
(after the .xlsx is uploaded and converted), and LibreOffice (which the verifier uses).
That is why there are no data bars, sparklines, dynamic arrays or cross-sheet
conditional formats - see references/compatibility.md.

Typical use:

    from sheetkit import Kit, L
    kit = Kit(theme="light")
    wb = kit.workbook()
    ws = kit.sheet(wb, "Dashboard", widths=[2, 24, 13, 13, 13, 19, 2], rows=40, tab="income")
    kit.banner(ws, 2, 2, 6, "Monthly Budget", "Pick a month - everything updates.")
    kit.card(ws, 5, 2, 3, "INCOME", "=SUM(D11:D16)", sub="this month", color="income")
    kit.save(wb, "out/My Template.xlsx")
"""
from __future__ import annotations

import json
from pathlib import Path
from xml.etree.ElementTree import Element

from openpyxl import Workbook
from openpyxl.chart import BarChart, DoughnutChart, LineChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.layout import Layout, ManualLayout
from openpyxl.chart.series import DataPoint
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.chart.text import RichText
from openpyxl.drawing.line import LineProperties
from openpyxl.drawing.text import CharacterProperties, Font as DFont, Paragraph, ParagraphProperties
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Protection, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.properties import PageSetupProperties

__all__ = ["Kit", "L", "THEMES", "ref", "rng"]

THEMES = {
    "light": dict(
        bg="F6F3EE", surface="FFFFFF", ink="1F2A2C", muted="7A8587", line="E7E1D8",
        band="1F3A3D", band_ink="FFFFFF", band_sub="B9CFC9",
        input="FFF5D6", input_soft="FFFBF0", input_line="EBDCA8",
        pos="2E8B6F", neg="D0503F", on_cat="FFFFFF", neutral="5E6B6D",
        income="3E9A84", bills="4A78B0", expenses="E07B53", savings="D99A2B", debt="9466AE",
    ),
    "dark": dict(
        bg="121718", surface="1B2223", ink="E8ECE8", muted="93A09E", line="2B3536",
        band="0B0F10", band_ink="FFFFFF", band_sub="8FB5AC",
        input="3A3418", input_soft="2A2818", input_line="6B5F2A",
        pos="5CC2A8", neg="F0806E", on_cat="101516", neutral="6F7C7E",
        income="4DB89E", bills="6C9FDD", expenses="F08C66", savings="EFBE57", debt="B58AD0",
    ),
}

ERROR_TOKENS = ("#DIV/0!", "#N/A", "#NAME?", "#REF!", "#VALUE!", "#NUM!", "#NULL!")


def ref(col: int, row: int, abs_col: bool = True, abs_row: bool = True, sheet: str | None = None) -> str:
    """Cell reference from numbers: ref(3, 7) -> '$C$7'; ref(3, 7, sheet='Budget Plan') -> "'Budget Plan'!$C$7"."""
    a = f"{'$' if abs_col else ''}{L(col)}{'$' if abs_row else ''}{row}"
    return f"'{sheet}'!{a}" if sheet else a


def rng(c1: int, r1: int, c2: int, r2: int, sheet: str | None = None) -> str:
    """Absolute range from numbers: rng(2, 6, 2, 20) -> '$B$6:$B$20'."""
    a = f"${L(c1)}${r1}:${L(c2)}${r2}"
    return f"'{sheet}'!{a}" if sheet else a


class Kit:
    """Holds a theme and writes consistently styled cells, cards, tables and charts."""

    def __init__(self, theme: str = "light", font: str = "Inter", currency: str = "$", palette: dict | None = None):
        self.theme_name = theme
        self.t = dict(THEMES[theme])
        if palette:
            self.t.update(palette)
        self.font_name = font
        self.currency = currency
        c = currency
        # Zero shows as a dash so an empty template does not read as a wall of $0.00.
        self.money = f'"{c}"#,##0.00;-"{c}"#,##0.00;"–"'
        self.money0 = f'"{c}"#,##0;-"{c}"#,##0;"{c}"0'
        self.money_txt = f"{c}#,##0"  # for TEXT(x, "...") inside formulas
        self.pct = "0%"
        self.date = "mmm d"
        self.date_long = "ddd, mmm d"
        self.previews: dict[str, str] = {}
        self._fills: dict[str, PatternFill] = {}

    # ---------------------------------------------------------------- basics
    def color(self, key_or_hex: str | None) -> str | None:
        if key_or_hex is None:
            return None
        return self.t.get(key_or_hex, key_or_hex)

    def fill(self, key_or_hex: str) -> PatternFill:
        hexv = self.color(key_or_hex)
        if hexv not in self._fills:
            self._fills[hexv] = PatternFill("solid", fgColor=hexv)
        return self._fills[hexv]

    def font(self, size=10, bold=False, color="ink", italic=False, name=None, underline=None) -> Font:
        return Font(name=name or self.font_name, size=size, bold=bold, italic=italic,
                    color=self.color(color), underline=underline)

    def workbook(self) -> Workbook:
        wb = Workbook()
        wb.remove(wb.active)
        return wb

    def sheet(self, wb, title, widths, rows, tab="neutral", row_height=21, zoom=100,
              freeze=None, landscape=True, hidden=False):
        """Create a sheet with a painted background, no gridlines and fixed column widths.

        widths: list of column widths (characters) starting at column A. Keep column A
        and the last column narrow (about 2) so the content has a margin.
        rows:   how many rows to paint and size. Content must stay inside this area.
        """
        ws = wb.create_sheet(title)
        ws.sheet_view.showGridLines = False
        ws.sheet_view.zoomScale = zoom
        ws.sheet_properties.tabColor = self.color(tab)
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[L(i)].width = w
        bg, base = self.fill("bg"), self.font()
        for r in range(1, rows + 1):
            ws.row_dimensions[r].height = row_height
            for c in range(1, len(widths) + 1):
                cell = ws.cell(r, c)
                cell.fill = bg
                cell.font = base
        ws.row_dimensions[1].height = 9
        if freeze:
            ws.freeze_panes = freeze
        ws.page_setup.orientation = "landscape" if landscape else "portrait"
        ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 0
        ws.print_options.horizontalCentered = True
        ws.page_margins.left = ws.page_margins.right = 0.4
        ws.page_margins.top = ws.page_margins.bottom = 0.4
        if hidden:
            ws.sheet_state = "hidden"
        else:
            self.previews[title] = f"A1:{L(len(widths))}{rows}"
        return ws

    def preview(self, ws, cell_range: str):
        """Limit the preview picture of a sheet (e.g. the first 40 rows of a long log)."""
        self.previews[ws.title] = cell_range

    def put(self, ws, row, col, value=None, *, size=10, bold=False, color="ink", fill=None,
            fmt=None, align=None, valign="center", wrap=False, italic=False, font=None,
            border=None, locked=True, indent=0, underline=None):
        """Write one styled cell. `color`/`fill` take a theme key ('muted', 'income') or a hex."""
        cell = ws.cell(row, col)
        if value is not None:
            cell.value = value
        cell.font = self.font(size=size, bold=bold, color=color, italic=italic, name=font, underline=underline)
        if fill:
            cell.fill = self.fill(fill)
        if fmt:
            cell.number_format = fmt
        cell.alignment = Alignment(horizontal=align, vertical=valign, wrap_text=wrap, indent=indent)
        if border:
            cell.border = border
        if not locked:
            cell.protection = Protection(locked=False)
        return cell

    def merge(self, ws, row, c1, c2, value=None, row2=None, **style):
        """Merge row..row2 x c1..c2, paint every cell in it, and write the value top-left."""
        row2 = row2 or row
        fill = style.get("fill")
        border = style.get("border")
        for r in range(row, row2 + 1):
            for c in range(c1, c2 + 1):
                if fill:
                    ws.cell(r, c).fill = self.fill(fill)
                if border:
                    ws.cell(r, c).border = border
        if c2 > c1 or row2 > row:
            ws.merge_cells(start_row=row, start_column=c1, end_row=row2, end_column=c2)
        return self.put(ws, row, c1, value, **style)

    def hairline(self, color="line", top=False, bottom=True) -> Border:
        s = Side(style="thin", color=self.color(color))
        return Border(top=s if top else None, bottom=s if bottom else None)

    def box(self, color="line") -> Border:
        s = Side(style="thin", color=self.color(color))
        return Border(top=s, bottom=s, left=s, right=s)

    # ------------------------------------------------------------ components
    def banner(self, ws, row, c1, c2, title, subtitle=None, title_cols=None):
        """Two-row title band. Returns nothing; leave the right-hand cells for selectors."""
        ws.row_dimensions[row].height = 34
        ws.row_dimensions[row + 1].height = 22
        for r in (row, row + 1):
            for c in range(c1, c2 + 1):
                ws.cell(r, c).fill = self.fill("band")
        t2 = title_cols or c2
        self.merge(ws, row, c1, t2, title, size=20, bold=True, color="band_ink", fill="band",
                   valign="bottom", indent=1)
        self.merge(ws, row + 1, c1, t2, subtitle or "", size=9.5, color="band_sub", fill="band",
                   valign="top", indent=1)

    def strip(self, ws, row, c1, labels, color="neutral", height=22, aligns=None):
        """Coloured table header. labels[0] is the section name, the rest are column labels."""
        ws.row_dimensions[row].height = height
        for i, text in enumerate(labels):
            al = (aligns[i] if aligns else ("left" if i == 0 else "right"))
            self.put(ws, row, c1 + i, text, size=9 if i else 9.5, bold=True, color="on_cat",
                     fill=color, align=al, indent=1 if al == "left" else 0)

    def row(self, ws, row, c1, c2, fill="surface", line="line"):
        """Paint one table row (white surface + hairline underneath)."""
        b = self.hairline(line)
        for c in range(c1, c2 + 1):
            cell = ws.cell(row, c)
            cell.fill = self.fill(fill)
            cell.border = b

    def card(self, ws, row, c1, c2, label, value, sub=None, color="neutral", fmt=None, value_color="ink",
             value_rows=1, set_heights=True):
        """KPI card: small label, big number, small note. Top edge takes the colour.
        Uses 2 + value_rows rows. Pass set_heights=False when the rows are shared with another layout."""
        fmt = fmt or self.money0
        top = Border(top=Side(style="thick", color=self.color(color)))
        if set_heights:
            ws.row_dimensions[row].height = 20
            ws.row_dimensions[row + 1].height = 32
            ws.row_dimensions[row + 2].height = 19
        self.merge(ws, row, c1, c2, label, size=8.5, bold=True, color=color, fill="surface",
                   valign="bottom", indent=1, border=top)
        self.merge(ws, row + 1, c1, c2, value, row2=row + value_rows, size=18, bold=True, color=value_color,
                   fill="surface", fmt=fmt, align="left", indent=1)
        self.merge(ws, row + 1 + value_rows, c1, c2, sub, size=8.5, color="muted", fill="surface",
                   valign="top", indent=1)
        return ws.cell(row + 1, c1)

    def input(self, ws, row, col, value=None, fmt=None, align=None, soft=False, size=10, bold=False, c2=None):
        """A cell the buyer types in: tinted, outlined and unlocked. soft=True for pre-filled defaults."""
        style = dict(fill="input_soft" if soft else "input", fmt=fmt, align=align, locked=False,
                     border=self.box("input_line"), size=size, bold=bold)
        if c2 and c2 > col:
            for c in range(col, c2 + 1):
                ws.cell(row, c).protection = Protection(locked=False)
            return self.merge(ws, row, col, c2, value, **style)
        return self.put(ws, row, col, value, **style)

    def dropdown(self, ws, cells: str, source, prompt=None, allow_blank=True):
        """Dropdown list. source is a list of short strings or a range like "Calc!$G$2:$G$55"."""
        if isinstance(source, (list, tuple)):
            f1 = '"' + ",".join(str(s) for s in source) + '"'
        else:
            f1 = source if source.startswith("=") else "=" + source
        dv = DataValidation(type="list", formula1=f1, allow_blank=allow_blank)
        dv.showErrorMessage = True
        dv.errorTitle, dv.error = "Pick from the list", "Choose one of the options in the dropdown."
        if prompt:
            dv.showInputMessage, dv.prompt = True, prompt
        ws.add_data_validation(dv)
        dv.add(cells)
        return dv

    def number_only(self, ws, cells: str, minimum=None):
        dv = DataValidation(type="decimal", operator="greaterThanOrEqual" if minimum is not None else None,
                            formula1=str(minimum) if minimum is not None else None, allow_blank=True)
        dv.showErrorMessage = True
        dv.errorTitle, dv.error = "Numbers only", "Type a number here (no letters or symbols)."
        ws.add_data_validation(dv)
        dv.add(cells)

    def bar_formula(self, done: str, total: str, guard: str | None = None, show_pct=True, cells=10) -> str:
        """In-cell progress bar that works everywhere: =REPT of block characters.
        done/total are formula fragments (e.g. 'D12', 'C12'). Put the result in a cell styled with bar()."""
        ratio = f"MIN(1,MAX(0,{done}/{total}))"
        n = f"ROUND({ratio}*{cells},0)"
        txt = f'REPT("█",{n})&REPT("░",{cells}-{n})'
        if show_pct:
            txt += f'&"  "&TEXT({done}/{total},"0%")'
        cond = f"N({total})<=0" if not guard else f"OR({guard},N({total})<=0)"
        return f'=IF({cond},"",{txt})'

    def bar(self, ws, row, col, formula, color="income", fill="surface"):
        """Bars are set in Arial: the block characters are in every Arial-compatible font."""
        return self.put(ws, row, col, formula, size=8.5, color=color, fill=fill, font="Arial",
                        border=self.hairline())

    def link(self, ws, row, col, text, sheet, cell="A1", **style):
        """Internal jump link (works in Excel, Sheets and LibreOffice)."""
        style.setdefault("color", "band_sub")
        style.setdefault("size", 9)
        c = self.put(ws, row, col, text, **style)
        c.hyperlink = f"#'{sheet}'!{cell}"
        return c

    # ------------------------------------------------- conditional formatting
    def cf_negative(self, ws, cells: str, color="neg"):
        ws.conditional_formatting.add(cells, CellIsRule(operator="lessThan", formula=["0"],
                                                        font=Font(color=self.color(color))))

    def cf_formula(self, ws, cells: str, formula: str, color=None, fill=None, bold=None):
        """formula is relative to the top-left cell of `cells` and must only reference its own sheet
        (Google Sheets drops conditional formats that point at another sheet)."""
        kw = {}
        if color or bold is not None:
            kw["font"] = Font(color=self.color(color), bold=bold)
        if fill:
            kw["fill"] = PatternFill("solid", bgColor=self.color(fill), fgColor=self.color(fill))
        ws.conditional_formatting.add(cells, FormulaRule(formula=[formula.lstrip("=")], **kw))

    # ----------------------------------------------------------------- charts
    def _txt(self, size=9, color="muted", bold=False) -> RichText:
        cp = CharacterProperties(sz=int(size * 100), b=bold, solidFill=self.color(color),
                                 latin=DFont(typeface=self.font_name))
        return RichText(p=[Paragraph(pPr=ParagraphProperties(defRPr=cp), endParaRPr=cp)])

    def _frame(self, chart, width, height, legend="b"):
        chart.width, chart.height = width, height
        chart.title = None
        chart.style = 2
        chart.graphical_properties = GraphicalProperties(solidFill=self.color("surface"),
                                                         ln=LineProperties(noFill=True))
        chart.plot_area.graphicalProperties = GraphicalProperties(noFill=True, ln=LineProperties(noFill=True))
        if legend:
            chart.legend.position = legend
            chart.legend.txPr = self._txt(9, "muted")
        else:
            chart.legend = None
        _no_auto_title(chart)

    def _axes(self, chart, number_format=None):
        for ax in (chart.x_axis, chart.y_axis):
            ax.delete = False
            ax.txPr = self._txt(8.5, "muted")
            ax.graphicalProperties = GraphicalProperties(ln=LineProperties(solidFill=self.color("line")))
        chart.y_axis.majorGridlines.spPr = GraphicalProperties(ln=LineProperties(solidFill=self.color("line")))
        chart.x_axis.majorGridlines = None
        if number_format:
            chart.y_axis.number_format = number_format
            chart.y_axis.numFmt.sourceLinked = False

    def donut(self, ws, anchor, labels: str, values: str, colors, width=7.0, height=5.6, hole=62):
        """Doughnut chart. labels/values are ranges on any sheet ("Calc!$L$2:$L$6"). colors: one per slice."""
        ch = DoughnutChart()
        ch.add_data(Reference(range_string=values), titles_from_data=False)
        ch.set_categories(Reference(range_string=labels))
        ch.holeSize = hole
        s = ch.series[0]
        for i, col in enumerate(colors):
            pt = DataPoint(idx=i)
            pt.graphicalProperties = GraphicalProperties(solidFill=self.color(col),
                                                         ln=LineProperties(solidFill=self.color("surface"), w=19050))
            s.dPt.append(pt)
        self._frame(ch, width, height, legend="r")
        ws.add_chart(ch, anchor)
        return ch

    def columns(self, ws, anchor, cats: str, series, width=8.6, height=5.6, horizontal=False,
                number_format=None, gap=80, overlap=None, legend="b"):
        """Clustered column (or bar) chart. series: list of (title, values_range, color_key)."""
        from openpyxl.chart import Series
        ch = BarChart()
        ch.type = "bar" if horizontal else "col"
        ch.grouping = "clustered"
        for title, values, col in series:
            s = Series(Reference(range_string=values), title=title)
            s.graphicalProperties = GraphicalProperties(solidFill=self.color(col), ln=LineProperties(noFill=True))
            ch.series.append(s)
        ch.set_categories(Reference(range_string=cats))
        ch.gapWidth = gap
        if overlap is not None:
            ch.overlap = overlap
        self._frame(ch, width, height, legend=legend if len(series) > 1 else None)
        self._axes(ch, number_format or f'"{self.currency}"#,##0')
        if horizontal:
            ch.x_axis.scaling.orientation = "maxMin"
        ws.add_chart(ch, anchor)
        return ch

    def lines(self, ws, anchor, cats: str, series, width=12, height=6, number_format=None):
        from openpyxl.chart import Series
        ch = LineChart()
        for title, values, col in series:
            s = Series(Reference(range_string=values), title=title)
            s.graphicalProperties = GraphicalProperties(ln=LineProperties(solidFill=self.color(col), w=28575))
            s.smooth = False
            ch.series.append(s)
        ch.set_categories(Reference(range_string=cats))
        self._frame(ch, width, height, legend="b" if len(series) > 1 else None)
        self._axes(ch, number_format or f'"{self.currency}"#,##0')
        ws.add_chart(ch, anchor)
        return ch

    # ----------------------------------------------------------------- finish
    def protect(self, ws):
        """Lock formulas against accidental edits (no password - the buyer can switch it off)."""
        p = ws.protection
        p.sheet = True
        p.formatCells = False
        p.formatColumns = False
        p.formatRows = False
        p.sort = False
        p.autoFilter = False
        p.selectLockedCells = False
        p.selectUnlockedCells = False

    def save(self, wb, path, protect=True, active=0):
        """Save the product file, plus a print-ready twin in _build/ that the verifier turns into pictures."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        visible = [ws for ws in wb.worksheets if ws.sheet_state == "visible"]
        if protect:
            for ws in visible:
                self.protect(ws)
        wb.active = wb.worksheets.index(visible[active])
        wb.save(path)

        build = path.parent / "_build"
        build.mkdir(exist_ok=True)
        for ws in visible:
            _drop_links(ws)  # LibreOffice paints links blue; the real file keeps them
            area = self.previews.get(ws.title)
            if not area:
                continue
            ws.print_area = area
            wide = _aspect(ws, area) >= 1.0
            ws.page_setup.orientation = "landscape" if wide else "portrait"
            ws.page_setup.fitToWidth = 1
            ws.page_setup.fitToHeight = 1
            ws.print_options.horizontalCentered = True
            ws.print_options.verticalCentered = True
            for side in ("left", "right", "top", "bottom", "header", "footer"):
                setattr(ws.page_margins, side, 0.0)
        twin = build / (path.stem + ".preview.xlsx")
        wb.save(twin)
        (build / (path.stem + ".preview.json")).write_text(json.dumps(
            {"sheets": [ws.title for ws in visible if ws.title in self.previews],
             "theme": self.theme_name, "bg": self.t["bg"]}, indent=1))
        return path


def _drop_links(ws):
    for link in list(ws._hyperlinks):
        ws[link.ref.split(":")[0]]._hyperlink = None
    ws._hyperlinks.clear()


def _aspect(ws, area: str) -> float:
    from openpyxl.utils import range_boundaries
    c1, r1, c2, r2 = range_boundaries(area)
    w = sum((ws.column_dimensions[L(c)].width or 8.43) * 7 + 5 for c in range(c1, c2 + 1))
    h = sum((ws.row_dimensions[r].height or 15) * 96 / 72 for r in range(r1, r2 + 1))
    return w / max(h, 1)


def _no_auto_title(chart):
    """Stop Excel inventing a chart title from the series name (openpyxl has no switch for it)."""
    original = chart._write
    ns = "{http://schemas.openxmlformats.org/drawingml/2006/chart}"

    def _write():
        tree = original()
        node = tree.find(ns + "chart")
        if node is not None and node.find(ns + "autoTitleDeleted") is None:
            pos = 1 if node.find(ns + "title") is not None else 0
            node.insert(pos, Element(ns + "autoTitleDeleted", {"val": "1"}))
        return tree

    chart._write = _write
