from io import BytesIO
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


def generate_excel_report(summary: dict, bins: list, records: list):
    wb = Workbook()

    # Sheet 1: Executive Summary & Bin Status
    ws_sum = wb.active
    ws_sum.title = "Summary & Bins"
    header_fill = PatternFill(start_color="14532D", end_color="14532D", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)

    ws_sum["A1"] = "EcoSort AI - Smart Waste Segregation Report"
    ws_sum["A1"].font = Font(bold=True, size=14, color="14532D")
    ws_sum["A2"] = f"Generated At (UTC): {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"

    metrics = [
        ("Total Registered Users", summary.get("total_users", 0)),
        ("Total Waste Items Classified", summary.get("total_items", 0)),
        ("Wet Waste Items", summary.get("wet_count", 0)),
        ("Dry Waste Items", summary.get("dry_count", 0)),
        ("Metal Waste Items", summary.get("metal_count", 0)),
        ("Total Recyclable Weight (kg)", round(summary.get("total_weight_kg", 0.0), 2)),
        ("Total CO2 Diverted (kg)", round(summary.get("total_co2_kg", 0.0), 2)),
    ]

    ws_sum["A4"] = "Metric"
    ws_sum["B4"] = "Value"
    for cell in (ws_sum["A4"], ws_sum["B4"]):
        cell.fill = header_fill
        cell.font = header_font

    for idx, (label, val) in enumerate(metrics, start=5):
        ws_sum[f"A{idx}"] = label
        ws_sum[f"B{idx}"] = val

    ws_sum["A14"] = "Smart Bin Status"
    ws_sum["A14"].font = Font(bold=True, size=12, color="14532D")
    bin_headers = ["Bin Category", "Label", "Items", "Capacity", "Fill %", "Status", "Last Emptied"]
    for col_idx, h in enumerate(bin_headers, start=1):
        c = ws_sum.cell(row=15, column=col_idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center")

    for r_idx, b in enumerate(bins, start=16):
        ws_sum.cell(row=r_idx, column=1, value=b["category"])
        ws_sum.cell(row=r_idx, column=2, value=b["label"])
        ws_sum.cell(row=r_idx, column=3, value=b["current_items"])
        ws_sum.cell(row=r_idx, column=4, value=b["capacity_items"])
        ws_sum.cell(row=r_idx, column=5, value=round(b["fill_percentage"], 1))
        ws_sum.cell(row=r_idx, column=6, value=b["status"])
        ws_sum.cell(row=r_idx, column=7, value=b["last_emptied_at"][:19])

    for col in ("A", "B", "C", "D", "E", "F", "G"):
        ws_sum.column_dimensions[col].width = 24

    # Sheet 2: Waste Classification History
    ws_hist = wb.create_sheet("Classification History")
    hist_headers = [
        "ID",
        "User",
        "Email",
        "Category",
        "Detected Label",
        "Confidence (%)",
        "Mode",
        "Sorting Status",
        "Points",
        "Weight (kg)",
        "CO2 Saved (kg)",
        "Timestamp",
    ]
    for col_idx, h in enumerate(hist_headers, start=1):
        c = ws_hist.cell(row=1, column=col_idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center")

    for row_idx, rec in enumerate(records, start=2):
        ws_hist.cell(row=row_idx, column=1, value=rec["id"])
        ws_hist.cell(row=row_idx, column=2, value=rec.get("user_name", ""))
        ws_hist.cell(row=row_idx, column=3, value=rec.get("user_email", ""))
        ws_hist.cell(row=row_idx, column=4, value=rec["predicted_category"])
        ws_hist.cell(row=row_idx, column=5, value=rec["detected_label"])
        ws_hist.cell(row=row_idx, column=6, value=round(rec["confidence"], 1))
        ws_hist.cell(row=row_idx, column=7, value="Demo" if rec.get("is_demo") else rec.get("model_source", "MobileNetV2"))
        ws_hist.cell(row=row_idx, column=8, value=rec["sorting_status"])
        ws_hist.cell(row=row_idx, column=9, value=rec["points_earned"])
        ws_hist.cell(row=row_idx, column=10, value=rec["estimated_weight_kg"])
        ws_hist.cell(row=row_idx, column=11, value=rec["co2_saved_kg"])
        ws_hist.cell(row=row_idx, column=12, value=rec["created_at"][:19])

    for col in ws_hist.columns:
        ws_hist.column_dimensions[col[0].column_letter].width = 20

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def generate_pdf_report(summary: dict, bins: list, records: list):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), rightMargin=24, leftMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("<b>EcoSort AI — Smart Waste Segregation & Recycling Report</b>", styles["Title"]))
    elements.append(Paragraph(f"Generated (UTC): {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    summary_data = [
        ["Registered Users", "Total Classified", "Wet Waste", "Dry Waste", "Metal Waste", "Recycled Weight", "CO2 Avoided"],
        [
            str(summary.get("total_users", 0)),
            str(summary.get("total_items", 0)),
            str(summary.get("wet_count", 0)),
            str(summary.get("dry_count", 0)),
            str(summary.get("metal_count", 0)),
            f"{summary.get('total_weight_kg', 0):.2f} kg",
            f"{summary.get('total_co2_kg', 0):.2f} kg",
        ],
    ]
    t_sum = Table(summary_data, repeatRows=1)
    t_sum.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#14532D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#BBF7D0")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F0FDF4")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(t_sum)
    elements.append(Spacer(1, 14))

    elements.append(Paragraph("<b>Smart Bin Monitoring</b>", styles["Heading2"]))
    bin_rows = [["Category", "Bin Name", "Items / Capacity", "Fill %", "Status", "Last Emptied"]]
    for b in bins:
        bin_rows.append(
            [
                b["category"],
                b["label"],
                f"{b['current_items']} / {b['capacity_items']}",
                f"{b['fill_percentage']:.1f}%",
                b["status"],
                b["last_emptied_at"][:19],
            ]
        )
    t_bins = Table(bin_rows, repeatRows=1)
    t_bins.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#166534")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    elements.append(t_bins)
    elements.append(Spacer(1, 14))

    elements.append(Paragraph("<b>Recent Classification & Sorting History (Latest 40 Records)</b>", styles["Heading2"]))
    rec_rows = [["ID", "User", "Category", "Detected Label", "Conf %", "Status", "Points", "Date"]]
    for rec in records[:40]:
        rec_rows.append(
            [
                str(rec["id"]),
                rec.get("user_name", "")[:18],
                rec["predicted_category"],
                rec["detected_label"][:24],
                f"{rec['confidence']:.1f}%",
                rec["sorting_status"],
                str(rec["points_earned"]),
                rec["created_at"][:16].replace("T", " "),
            ]
        )
    t_rec = Table(rec_rows, repeatRows=1)
    t_rec.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#15803D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
                ("PADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(t_rec)

    doc.build(elements)
    buf.seek(0)
    return buf

