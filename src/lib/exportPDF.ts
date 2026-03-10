import jsPDF from "jspdf";
import { Ficha } from "@/hooks/useFichas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type InlineStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  highlight?: boolean;
};

type StyledRun = { text: string; style: InlineStyle };

type ContentBlock =
  | { type: "paragraph"; runs: StyledRun[] }
  | { type: "list-item"; runs: StyledRun[] }
  | { type: "quote"; runs: StyledRun[] };

type WrappedToken = { text: string; style: InlineStyle };

const normalizeRawText = (text: string) => text.replace(/\u00a0/g, " ").replace(/\r/g, "");

const mergeRuns = (runs: StyledRun[]) => {
  const merged: StyledRun[] = [];

  runs.forEach((run) => {
    if (!run.text) return;

    const last = merged[merged.length - 1];
    const sameStyle =
      last &&
      !!last.style.bold === !!run.style.bold &&
      !!last.style.italic === !!run.style.italic &&
      !!last.style.underline === !!run.style.underline &&
      !!last.style.strike === !!run.style.strike &&
      !!last.style.highlight === !!run.style.highlight;

    if (sameStyle) {
      last.text += run.text;
      return;
    }

    merged.push({ text: run.text, style: { ...run.style } });
  });

  return merged;
};

const trimRuns = (runs: StyledRun[]) => {
  const merged = mergeRuns(runs);
  if (merged.length === 0) return merged;

  merged[0] = { ...merged[0], text: merged[0].text.replace(/^\s+/, "") };
  merged[merged.length - 1] = {
    ...merged[merged.length - 1],
    text: merged[merged.length - 1].text.replace(/\s+$/, ""),
  };

  return merged.filter((run) => run.text.length > 0);
};

const parseInlineRuns = (node: Node, baseStyle: InlineStyle = {}): StyledRun[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = normalizeRawText(node.textContent || "");
    const normalized = raw.replace(/[\t ]+/g, " ");
    if (!normalized) return [];
    return [{ text: normalized, style: { ...baseStyle } }];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === "br") {
    return [{ text: "\n", style: { ...baseStyle } }];
  }

  if (tag === "script" || tag === "style") {
    return [];
  }

  const style: InlineStyle = { ...baseStyle };
  if (tag === "strong" || tag === "b") style.bold = true;
  if (tag === "em" || tag === "i") style.italic = true;
  if (tag === "u") style.underline = true;
  if (tag === "s" || tag === "strike" || tag === "del") style.strike = true;
  if (tag === "mark") style.highlight = true;

  return mergeRuns(Array.from(element.childNodes).flatMap((child) => parseInlineRuns(child, style)));
};

const parseHtmlToBlocks = (html: string): ContentBlock[] => {
  const container = document.createElement("div");
  container.innerHTML = html || "";
  const blocks: ContentBlock[] = [];

  const pushBlock = (type: ContentBlock["type"], runs: StyledRun[]) => {
    const cleaned = trimRuns(runs);
    if (cleaned.length === 0) return;
    blocks.push({ type, runs: cleaned } as ContentBlock);
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushBlock("paragraph", parseInlineRuns(node));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(element.children).filter((child) => child.tagName.toLowerCase() === "li");
      items.forEach((item, index) => {
        const marker = tag === "ol" ? `${index + 1}. ` : "• ";
        const itemRuns = parseInlineRuns(item);
        pushBlock("list-item", [{ text: marker, style: {} }, ...itemRuns]);
      });
      return;
    }

    if (tag === "blockquote") {
      pushBlock("quote", parseInlineRuns(element, { italic: true }));
      return;
    }

    if (["p", "div", "pre"].includes(tag)) {
      pushBlock("paragraph", parseInlineRuns(element));
      return;
    }

    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      pushBlock("paragraph", parseInlineRuns(element, { bold: true }));
      return;
    }

    Array.from(element.childNodes).forEach(walk);
  };

  Array.from(container.childNodes).forEach(walk);
  return blocks;
};

const getFontStyle = (style: InlineStyle): "normal" | "bold" | "italic" | "bolditalic" => {
  if (style.bold && style.italic) return "bolditalic";
  if (style.bold) return "bold";
  if (style.italic) return "italic";
  return "normal";
};

const safeFilename = (title: string) => {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `ficha-${base || "sin-titulo"}.pdf`;
};

export const exportFichaToPDF = (ficha: Ficha) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const topMargin = 20;
  const bottomMargin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = topMargin;

  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight <= pageHeight - bottomMargin) return;
    doc.addPage();
    y = topMargin;
  };

  const drawFooter = (pageNumber: number, totalPages: number) => {
    doc.setPage(pageNumber);
    const footerY = pageHeight - 14;
    doc.setDrawColor(220, 220, 228);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 145);
    doc.text("Generado con FichaFuente", margin, footerY);
    doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), pageWidth / 2, footerY, { align: "center" });
    doc.text(`Página ${pageNumber}/${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  };

  const textWidth = (text: string, style: InlineStyle, fontSize: number) => {
    doc.setFont("helvetica", getFontStyle(style));
    doc.setFontSize(fontSize);
    return doc.getTextWidth(text);
  };

  const wrapRuns = (runs: StyledRun[], maxWidth: number, fontSize: number): WrappedToken[][] => {
    const lines: WrappedToken[][] = [];
    let currentLine: WrappedToken[] = [];
    let currentWidth = 0;

    const pushLine = () => {
      while (currentLine.length > 0 && /^\s+$/.test(currentLine[currentLine.length - 1].text)) {
        const removed = currentLine.pop();
        if (removed) currentWidth -= textWidth(removed.text, removed.style, fontSize);
      }

      if (currentLine.length > 0) {
        lines.push(currentLine);
      }

      currentLine = [];
      currentWidth = 0;
    };

    runs.forEach((run) => {
      const parts = run.text.split("\n");

      parts.forEach((part, index) => {
        const pieces = part.split(/(\s+)/).filter((piece) => piece.length > 0);

        pieces.forEach((piece) => {
          const isWhitespace = /^\s+$/.test(piece);
          if (isWhitespace && currentLine.length === 0) return;

          const pieceWidth = textWidth(piece, run.style, fontSize);
          const overflows = currentWidth + pieceWidth > maxWidth;

          if (overflows && currentLine.length > 0 && !isWhitespace) {
            pushLine();
          }

          if (isWhitespace && currentLine.length === 0) return;

          currentLine.push({ text: piece, style: run.style });
          currentWidth += pieceWidth;
        });

        if (index < parts.length - 1) {
          pushLine();
        }
      });
    });

    pushLine();
    return lines;
  };

  const drawWrappedRuns = (params: {
    runs: StyledRun[];
    x: number;
    width: number;
    fontSize: number;
    lineHeight: number;
    blockGap: number;
    textColor: [number, number, number];
  }) => {
    const lines = wrapRuns(params.runs, params.width, params.fontSize);
    const fontHeight = params.fontSize * 0.3528;

    lines.forEach((line) => {
      ensureSpace(params.lineHeight + 1);
      let xCursor = params.x;

      line.forEach((token) => {
        const style = token.style;
        const width = textWidth(token.text, style, params.fontSize);

        if (style.highlight) {
          doc.setFillColor(254, 240, 138);
          doc.rect(xCursor - 0.2, y - fontHeight * 0.82, width + 0.4, fontHeight * 0.9, "F");
        }

        doc.setFont("helvetica", getFontStyle(style));
        doc.setFontSize(params.fontSize);
        doc.setTextColor(...params.textColor);
        doc.text(token.text, xCursor, y);

        if (style.underline) {
          doc.setDrawColor(...params.textColor);
          doc.setLineWidth(0.2);
          doc.line(xCursor, y + 0.45, xCursor + width, y + 0.45);
        }

        if (style.strike) {
          doc.setDrawColor(...params.textColor);
          doc.setLineWidth(0.2);
          doc.line(xCursor, y - fontHeight * 0.28, xCursor + width, y - fontHeight * 0.28);
        }

        xCursor += width;
      });

      y += params.lineHeight;
    });

    y += params.blockGap;
  };

  // Header line
  ensureSpace(18);
  doc.setDrawColor(30, 64, 120);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 12;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 30);
  const titleLines = doc.splitTextToSize(ficha.title, contentWidth);
  ensureSpace(titleLines.length * 8 + 8);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 6;

  // Source
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 100);
  ensureSpace(6);
  doc.text(`Fuente: ${ficha.source_name}`, margin, y);
  y += 5;
  if (ficha.source_url) {
    doc.setTextColor(30, 64, 120);
    ensureSpace(6);
    doc.textWithLink(ficha.source_url, margin, y, { url: ficha.source_url });
    y += 5;
  }

  // Date
  if (ficha.data_date) {
    doc.setTextColor(80, 80, 100);
    ensureSpace(6);
    doc.text(`Fecha del dato: ${format(new Date(ficha.data_date), "dd MMMM yyyy", { locale: es })}`, margin, y);
    y += 5;
  }

  y += 6;

  // Divider
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Content (parsed from HTML)
  const contentBlocks = parseHtmlToBlocks(ficha.content || "");
  contentBlocks.forEach((block) => {
    if (block.type === "quote") {
      const quoteLines = wrapRuns(block.runs, contentWidth - 8, 10.8);
      const quoteHeight = quoteLines.length * 5.2 + 5;
      ensureSpace(quoteHeight + 4);

      doc.setFillColor(242, 244, 248);
      doc.rect(margin, y - 3.5, contentWidth, quoteHeight + 2, "F");
      doc.setDrawColor(30, 64, 120);
      doc.setLineWidth(0.8);
      doc.line(margin, y - 3.5, margin, y + quoteHeight - 1.5);

      y += 1;
      drawWrappedRuns({
        runs: block.runs,
        x: margin + 4,
        width: contentWidth - 8,
        fontSize: 10.8,
        lineHeight: 5.2,
        blockGap: 3.6,
        textColor: [70, 70, 90],
      });
      return;
    }

    if (block.type === "list-item") {
      drawWrappedRuns({
        runs: block.runs,
        x: margin,
        width: contentWidth,
        lineHeight: 5.4,
        blockGap: 1.4,
        fontSize: 11.2,
        textColor: [30, 30, 40],
      });
      return;
    }

    drawWrappedRuns({
      runs: block.runs,
      x: margin,
      width: contentWidth,
      lineHeight: 5.6,
      blockGap: 2,
      fontSize: 11.2,
      textColor: [30, 30, 40],
    });
  });

  // Quote
  if (ficha.quote) {
    const quoteText = normalizeRawText(ficha.quote).replace(/\s+/g, " ").trim();
    const quoteRuns: StyledRun[] = [{ text: `“${quoteText}”`, style: { italic: true } }];
    const quoteLines = wrapRuns(quoteRuns, contentWidth - 8, 10.8);
    const quoteHeight = quoteLines.length * 5.2 + 5;
    ensureSpace(quoteHeight + 8);

    y += 2;
    doc.setFillColor(242, 244, 248);
    doc.rect(margin, y - 3.5, contentWidth, quoteHeight + 2, "F");
    doc.setDrawColor(30, 64, 120);
    doc.setLineWidth(0.8);
    doc.line(margin, y - 3.5, margin, y + quoteHeight - 1.5);

    y += 1;
    drawWrappedRuns({
      runs: quoteRuns,
      x: margin + 4,
      width: contentWidth - 8,
      fontSize: 10.8,
      lineHeight: 5.2,
      blockGap: 3.6,
      textColor: [70, 70, 90],
    });
  }

  // Tags
  if (ficha.tags && ficha.tags.length > 0) {
    y += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 100);
    ensureSpace(8);
    doc.text(`Tags: ${ficha.tags.join(", ")}`, margin, y);
    y += 8;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    drawFooter(page, totalPages);
  }

  doc.save(safeFilename(ficha.title));
};
