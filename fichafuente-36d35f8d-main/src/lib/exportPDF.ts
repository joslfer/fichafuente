import jsPDF from "jspdf";
import { Ficha } from "@/hooks/useFichas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const exportFichaToPDF = (ficha: Ficha) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  let y = 30;

  // Header line
  doc.setDrawColor(30, 64, 120);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 30);
  const titleLines = doc.splitTextToSize(ficha.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 6;

  // Source
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 100);
  doc.text(`Fuente: ${ficha.source_name}`, margin, y);
  y += 5;
  if (ficha.source_url) {
    doc.setTextColor(30, 64, 120);
    doc.textWithLink(ficha.source_url, margin, y, { url: ficha.source_url });
    y += 5;
  }

  // Date
  if (ficha.data_date) {
    doc.setTextColor(80, 80, 100);
    doc.text(`Fecha del dato: ${format(new Date(ficha.data_date), "dd MMMM yyyy", { locale: es })}`, margin, y);
    y += 5;
  }

  y += 6;

  // Divider
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Content
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 40);
  const contentLines = doc.splitTextToSize(ficha.content, contentWidth);
  doc.text(contentLines, margin, y);
  y += contentLines.length * 5.5 + 6;

  // Quote
  if (ficha.quote) {
    y += 4;
    doc.setDrawColor(30, 64, 120);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin, y + 12);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 120);
    const quoteLines = doc.splitTextToSize(`"${ficha.quote}"`, contentWidth - 8);
    doc.text(quoteLines, margin + 5, y + 4);
    y += quoteLines.length * 5 + 10;
  }

  // Tags
  if (ficha.tags && ficha.tags.length > 0) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 100);
    doc.text(`Tags: ${ficha.tags.join(", ")}`, margin, y);
    y += 8;
  }

  // Footer
  y = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 160);
  doc.text("Generado con FichaFuente", margin, y);
  doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), pageWidth - margin, y, { align: "right" });

  doc.save(`ficha-${ficha.title.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}.pdf`);
};
