/**
 * Build a fresh DOCX or PDF on the client, applying any local edits.
 * Both libraries are loaded dynamically so the home page stays fast.
 */

import type { Entry, RecnikData } from "@/data/recnik";

/** Format a single entry as a single line, dictionary-style. */
function formatEntry(e: Entry): { headword: string; pos: string; definition: string } {
  return {
    headword: e.headword || "",
    pos: e.pos || "",
    definition: e.definition || "",
  };
}

/* -------------------------------------------------------------------------- */
/*                                   DOCX                                     */
/* -------------------------------------------------------------------------- */

export async function generateDocx(data: RecnikData): Promise<Blob> {
  const docx = await import("docx");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    PageOrientation,
    HeadingLevel,
    PageBreak,
    Header,
    Footer,
    PageNumber,
  } = docx;

  const SERIF = "Cambria";
  const SANS = "Calibri";

  const sections: any[] = [];

  for (const letter of data.alphabet) {
    const entries = data.byLetter[letter] ?? [];
    if (!entries.length) continue;

    const children: any[] = [];

    // Letter banner
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 600 },
        children: [
          new TextRun({ text: letter, font: SERIF, size: 220, bold: true }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `${entries.length} одредница`,
            font: SANS,
            size: 18,
            italics: true,
            color: "888888",
          }),
        ],
      }),
    );

    // Entries
    for (const e of entries) {
      const { headword, pos, definition } = formatEntry(e);
      const runs: any[] = [];
      if (headword) {
        runs.push(new TextRun({ text: headword, bold: true, font: SERIF, size: 22 }));
      }
      if (pos) {
        runs.push(new TextRun({ text: "  " }));
        runs.push(new TextRun({ text: `[${pos}]`, italics: true, font: SERIF, size: 20, color: "666666" }));
      }
      if (e.category) {
        runs.push(new TextRun({ text: "  " }));
        runs.push(new TextRun({ text: `(${e.category})`, italics: true, font: SERIF, size: 18, color: "1F7A5A" }));
      }
      if (definition) {
        runs.push(new TextRun({ text: "  " }));
        runs.push(new TextRun({ text: definition, font: SERIF, size: 22 }));
      }
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 80, line: 300 },
          indent: { left: 360, hanging: 360 },
          children: runs,
        }),
      );
    }

    sections.push({
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: letter, font: SANS, size: 18, color: "888888", bold: true }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ children: [PageNumber.CURRENT], font: SANS, size: 18, color: "888888" }),
              ],
            }),
          ],
        }),
      },
      children,
    });
  }

  // Title section at the start
  sections.unshift({
    properties: {
      page: {
        size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 4000, after: 400 },
        children: [
          new TextRun({ text: "ЗАПЛАЊСКИ", font: SERIF, size: 96, bold: true }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
        children: [
          new TextRun({ text: "РЕЧНИК", font: SERIF, size: 96, bold: true, color: "1F4E79" }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "Модерно дигитално издање са ручним исправкама",
            font: SANS,
            size: 24,
            italics: true,
            color: "666666",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: new Date().toLocaleDateString("sr-Cyrl"),
            font: SANS,
            size: 20,
            color: "888888",
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: "Заплањски Речник",
    title: "Заплањски Речник — измењено издање",
    styles: {
      default: { document: { run: { font: SERIF, size: 22 } } },
    },
    sections,
  });

  return Packer.toBlob(doc);
}

/* -------------------------------------------------------------------------- */
/*                                    PDF                                     */
/* -------------------------------------------------------------------------- */

export async function generatePdf(data: RecnikData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 56;
  const marginTop = 64;
  const marginBottom = 64;
  const contentW = pageW - marginX * 2;

  // jsPDF's bundled fonts only cover Latin. For Cyrillic we fall back to
  // built-in "times" which on most viewers renders Cyrillic via the system
  // base fonts; this is good enough for a quick export.
  doc.setFont("times", "normal");

  let y = marginTop;
  let currentLetter = "";

  const drawHeader = (letter: string, pageNum: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text("Заплањски Речник", marginX, 36);
    if (letter) doc.text(letter, pageW - marginX, 36, { align: "right" });
    doc.text(String(pageNum), pageW / 2, pageH - 28, { align: "center" });
    doc.setTextColor(0);
  };

  const newPage = (letter: string) => {
    doc.addPage();
    y = marginTop;
    drawHeader(letter, doc.getNumberOfPages());
  };

  // Title page
  doc.setFont("times", "bold");
  doc.setFontSize(48);
  doc.text("ЗАПЛАЊСКИ", pageW / 2, pageH / 2 - 40, { align: "center" });
  doc.setTextColor(31, 78, 121);
  doc.text("РЕЧНИК", pageW / 2, pageH / 2 + 20, { align: "center" });
  doc.setTextColor(0);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text(
    "Модерно дигитално издање са ручним исправкама",
    pageW / 2,
    pageH / 2 + 70,
    { align: "center" },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(140);
  doc.text(new Date().toLocaleDateString("sr-Cyrl"), pageW / 2, pageH / 2 + 100, {
    align: "center",
  });
  doc.setTextColor(0);

  for (const letter of data.alphabet) {
    const entries = data.byLetter[letter] ?? [];
    if (!entries.length) continue;

    currentLetter = letter;
    newPage(letter);

    // Letter banner
    doc.setFont("times", "bold");
    doc.setFontSize(80);
    doc.setTextColor(31, 78, 121);
    doc.text(letter, pageW / 2, y + 80, { align: "center" });
    doc.setTextColor(0);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(140);
    doc.text(`${entries.length} одредница`, pageW / 2, y + 110, { align: "center" });
    doc.setTextColor(0);

    y += 160;

    for (const e of entries) {
      const { headword, pos, definition } = formatEntry(e);

      // Build the line: bold headword, italic [pos], regular definition
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      const headW = doc.getTextWidth(headword);

      doc.setFont("times", "italic");
      const posStr = pos ? `  [${pos}]` : "";
      const posW = posStr ? doc.getTextWidth(posStr) : 0;

      doc.setFont("times", "normal");
      const defStr = definition ? `  ${definition}` : "";
      // Wrap full text considering hanging indent
      const fullText = `${headword}${posStr}${defStr}`;
      const wrapped = doc.splitTextToSize(fullText, contentW - 12);

      const lineHeight = 14;
      const blockH = wrapped.length * lineHeight + 4;

      if (y + blockH > pageH - marginBottom) {
        newPage(letter);
      }

      // Draw first line in pieces (bold + italic + regular)
      let cursorX = marginX;
      const firstLine = wrapped[0] || "";
      // The first chunk is the headword
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(31, 78, 121);
      doc.text(headword, cursorX, y);
      doc.setTextColor(0);
      cursorX += headW;

      if (posStr) {
        doc.setFont("times", "italic");
        doc.setTextColor(110);
        doc.text(posStr, cursorX, y);
        doc.setTextColor(0);
        cursorX += posW;
      }

      // Remainder of the first wrapped line: take what's after headword+pos in the wrapped text
      const firstLineRemainder = firstLine.slice((headword + posStr).length);
      if (firstLineRemainder) {
        doc.setFont("times", "normal");
        doc.text(firstLineRemainder, cursorX, y);
      }

      // Subsequent wrapped lines (definition continuation) indented for hanging effect
      for (let i = 1; i < wrapped.length; i++) {
        doc.setFont("times", "normal");
        doc.text(wrapped[i], marginX + 16, y + i * lineHeight);
      }

      y += blockH;
    }
  }

  // Re-stamp page numbers at the very end so the title page is page 1 too
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i > 1) {
      // Header was already drawn for content pages; leave them
    }
  }

  return doc.output("blob");
}
