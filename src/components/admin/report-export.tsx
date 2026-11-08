"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface ReportSheet {
  title: string;
  columns: { header: string; key: string; money?: boolean; width?: number }[];
  rows: Record<string, string | number | null>[];
}

const fmt = (v: string | number | null, money?: boolean) => (v == null ? "" : money ? `S/ ${Number(v).toFixed(2)}` : String(v));

/** Exporta las tablas del reporte a Excel (.xlsx) o PDF en el navegador; las librerías se cargan solo al exportar. */
export function ReportExport({ name, subtitle, sheets }: { name: string; subtitle: string; sheets: ReportSheet[] }) {
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function toExcel() {
    setBusy("xlsx");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "MULTIPRODUCTOS HUAYTALLA";
      wb.created = new Date();
      for (const s of sheets) {
        const ws = wb.addWorksheet(s.title.slice(0, 31));
        ws.addRow([s.title]).font = { bold: true, size: 14 };
        ws.addRow([subtitle]).font = { italic: true, color: { argb: "FF64748B" } };
        ws.addRow([]);
        const header = ws.addRow(s.columns.map((c) => c.header));
        header.font = { bold: true, color: { argb: "FFFFFFFF" } };
        header.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16A34A" } }));
        for (const r of s.rows) ws.addRow(s.columns.map((c) => (c.money && r[c.key] != null ? Number(r[c.key]) : r[c.key])));
        s.columns.forEach((c, i) => {
          const col = ws.getColumn(i + 1);
          col.width = c.width ?? Math.max(12, c.header.length + 4);
          if (c.money) col.numFmt = '"S/" #,##0.00';
        });
      }
      const buf = await wb.xlsx.writeBuffer();
      download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${name}.xlsx`);
    } catch (e) {
      toast.error(`No se pudo generar el Excel: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function toPdf() {
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(16);
      doc.text("MULTIPRODUCTOS HUAYTALLA", 40, 40);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(subtitle, 40, 58);
      let y = 80;
      for (const s of sheets) {
        doc.setFontSize(12);
        doc.setTextColor(20);
        if (y > 500) {
          doc.addPage();
          y = 40;
        }
        doc.text(s.title, 40, y);
        autoTable(doc, {
          startY: y + 8,
          head: [s.columns.map((c) => c.header)],
          body: s.rows.length ? s.rows.map((r) => s.columns.map((c) => fmt(r[c.key], c.money))) : [[{ content: "Sin datos en el periodo", colSpan: s.columns.length }]],
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: [22, 163, 74] },
          margin: { left: 40, right: 40 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;
      }
      download(doc.output("blob"), `${name}.pdf`);
    } catch (e) {
      toast.error(`No se pudo generar el PDF: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" loading={busy === "xlsx"} disabled={busy !== null} onClick={toExcel}><FileSpreadsheet className="h-4 w-4" /> Exportar Excel</Button>
      <Button variant="outline" size="sm" loading={busy === "pdf"} disabled={busy !== null} onClick={toPdf}><FileText className="h-4 w-4" /> Exportar PDF</Button>
    </div>
  );
}
