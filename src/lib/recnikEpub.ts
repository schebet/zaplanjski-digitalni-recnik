/**
 * Generate a minimal but valid EPUB 3 from the dictionary data.
 * One XHTML file per letter + nav.xhtml + content.opf + toc.ncx.
 * Uses JSZip (already a transitive dependency of `docx`).
 */

import type { RecnikData } from "@/data/recnik";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function letterFile(letter: string): string {
  // ASCII filename per letter (avoids EPUB readers choking on Cyrillic paths).
  return `letter-${letter.charCodeAt(0).toString(16)}.xhtml`;
}

function letterXhtml(letter: string, entries: RecnikData["byLetter"][string]): string {
  const items = entries
    .map((e) => {
      const hw = escapeXml(e.headword || "");
      const pos = e.pos ? ` <em class="pos">[${escapeXml(e.pos)}]</em>` : "";
      const cat = e.category ? ` <span class="cat">(${escapeXml(e.category)})</span>` : "";
      const def = e.definition ? ` ${escapeXml(e.definition)}` : "";
      return `      <p class="entry"><strong class="hw">${hw}</strong>${pos}${cat}${def}</p>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="sr-Cyrl" lang="sr-Cyrl">
  <head>
    <title>${letter}</title>
    <meta charset="UTF-8" />
    <link rel="stylesheet" type="text/css" href="style.css" />
  </head>
  <body>
    <section epub:type="chapter" xmlns:epub="http://www.idpf.org/2007/ops">
      <h1 class="letter" id="letter-${escapeXml(letter)}">${escapeXml(letter)}</h1>
      <p class="count">${entries.length} одредница</p>
${items}
    </section>
  </body>
</html>`;
}

const STYLE_CSS = `body { font-family: Cambria, Georgia, "Times New Roman", serif; line-height: 1.5; margin: 0 1em; }
h1.letter { font-size: 4em; text-align: center; color: #1f4e79; margin: 1.5em 0 0.2em; font-weight: bold; }
p.count { text-align: center; color: #888; font-style: italic; font-size: 0.85em; margin: 0 0 1.5em; }
p.entry { text-indent: -1em; padding-left: 1em; margin: 0.35em 0; }
strong.hw { color: #1f4e79; }
em.pos { color: #666; font-size: 0.9em; }
span.cat { color: #1f7a5a; font-size: 0.85em; font-style: italic; }
nav.toc ol { list-style: none; padding: 0; columns: 4; }
nav.toc li { margin: 0.4em 0; font-size: 1.2em; font-weight: bold; }
h1.title { font-size: 3em; text-align: center; margin: 2em 0 0.2em; }
h2.title { font-size: 2em; text-align: center; color: #1f4e79; margin: 0 0 1em; }
p.subtitle { text-align: center; font-style: italic; color: #666; }
`;

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

function buildOpf(letters: string[], uuid: string, dateIso: string): string {
  const manifest = [
    '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    '    <item id="style" href="style.css" media-type="text/css"/>',
    '    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>',
    ...letters.map(
      (l) =>
        `    <item id="ch-${l.charCodeAt(0).toString(16)}" href="${letterFile(l)}" media-type="application/xhtml+xml"/>`,
    ),
  ].join("\n");

  const spine = [
    '    <itemref idref="title"/>',
    '    <itemref idref="nav"/>',
    ...letters.map((l) => `    <itemref idref="ch-${l.charCodeAt(0).toString(16)}"/>`),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="sr-Cyrl">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
    <dc:title>Заплањски Речник — измењено издање</dc:title>
    <dc:creator>Заплањски Речник</dc:creator>
    <dc:language>sr-Cyrl</dc:language>
    <dc:date>${dateIso}</dc:date>
    <meta property="dcterms:modified">${dateIso}</meta>
  </metadata>
  <manifest>
${manifest}
  </manifest>
  <spine toc="ncx">
${spine}
  </spine>
</package>`;
}

function buildNav(letters: string[]): string {
  const items = letters
    .map(
      (l) =>
        `      <li><a href="${letterFile(l)}">${escapeXml(l)}</a></li>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="sr-Cyrl" lang="sr-Cyrl">
  <head>
    <title>Садржај</title>
    <meta charset="UTF-8"/>
    <link rel="stylesheet" type="text/css" href="style.css"/>
  </head>
  <body>
    <nav epub:type="toc" class="toc" id="toc">
      <h1>Азбука</h1>
      <ol>
${items}
      </ol>
    </nav>
  </body>
</html>`;
}

function buildNcx(letters: string[], uuid: string): string {
  const points = letters
    .map(
      (l, i) =>
        `    <navPoint id="np-${i + 1}" playOrder="${i + 1}"><navLabel><text>${escapeXml(l)}</text></navLabel><content src="${letterFile(l)}"/></navPoint>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>Заплањски Речник</text></docTitle>
  <navMap>
${points}
  </navMap>
</ncx>`;
}

const TITLE_XHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="sr-Cyrl" lang="sr-Cyrl">
  <head>
    <title>Заплањски Речник</title>
    <meta charset="UTF-8"/>
    <link rel="stylesheet" type="text/css" href="style.css"/>
  </head>
  <body>
    <h1 class="title">ЗАПЛАЊСКИ</h1>
    <h2 class="title">РЕЧНИК</h2>
    <p class="subtitle">Модерно дигитално издање са ручним исправкама</p>
  </body>
</html>`;

function uuidv4(): string {
  // Lightweight UUID (no crypto polyfill required)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function generateEpub(data: RecnikData): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  // EPUB requires "mimetype" to be the FIRST entry, uncompressed.
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.folder("META-INF")!.file("container.xml", CONTAINER_XML);

  const oebps = zip.folder("OEBPS")!;
  const usedLetters = data.alphabet.filter((l) => (data.byLetter[l]?.length ?? 0) > 0);
  const uuid = uuidv4();
  const dateIso = new Date().toISOString().split(".")[0] + "Z";

  oebps.file("style.css", STYLE_CSS);
  oebps.file("title.xhtml", TITLE_XHTML);
  oebps.file("nav.xhtml", buildNav(usedLetters));
  oebps.file("toc.ncx", buildNcx(usedLetters, uuid));
  oebps.file("content.opf", buildOpf(usedLetters, uuid, dateIso));

  for (const letter of usedLetters) {
    oebps.file(letterFile(letter), letterXhtml(letter, data.byLetter[letter]));
  }

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/epub+zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
