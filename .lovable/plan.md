
## Reorganize Заплањски Речник into a modern dictionary DOCX

I'll process your uploaded `ZAPLANJSKI_REČNIK.docx` and produce a polished, modernized version: **`ZAPLANJSKI_RECNIK_modern.docx`**.

### What the new document will look like

**Page setup**
- Single column, wider margins (≈2.5 cm) for comfortable reading
- US Letter / A4 page in portrait
- Serif body font for entries (classic dictionary feel), clean sans-serif for headings/headers
- Consistent line height and uniform spacing between every entry — no more uneven gaps

**Letter section openers (А, Б, В, Г, Д … Ш)**
- Each letter starts on a **fresh page**
- Huge centered decorative letter banner (e.g. **А а** in oversized type) with a thin rule beneath
- Brief breathing space before the first entry of that letter

**Running page header**
- Top of every page shows the **first and last headword** on that page in the style of printed dictionaries:
  `абá — ајдúчки                                       А`
- Current letter shown on the outer side of the header
- Page numbers in the footer, centered

**Entry formatting (uniform throughout)**
- Headword in **bold**, preserving original accent marks (á, í, ý, é…)
- Variants/inflections in bold after a comma: **абáв, -а, -о**
- Grammatical tag in italics inside square brackets: *[пр.]*, *[ж.]*, *[несврш.]*
- Definition in regular text
- Example sentences after a dash, in italics, on the same paragraph (hanging indent so wrapped lines align under the definition)
- Equal vertical spacing (e.g. 4 pt) between every entry — no double blanks, no cramped pairs
- Numbered senses (1), 2), 3)) kept inline as in the original

**Cleanup applied during processing**
- Normalize whitespace and remove duplicate blank lines
- Standardize bracket tags (`[пр.]`, `[ж.]`, etc.) — fix inconsistencies like `[прид.]` vs `[пр.]`
- Ensure every headword is bold (some entries in the source aren't)
- Re-sort entries alphabetically within each letter (Cyrillic collation) to catch any out-of-order items
- Preserve all original content — definitions, examples, accents — verbatim

### How I'll build it

1. Extract the full text of every page of the original DOCX (not just the first 50)
2. Parse each entry into structured fields (headword, variants, tag, definition, example)
3. Group by initial letter, sort, and generate a fresh DOCX with `docx-js` using the layout above
4. **QA pass**: render every page to images and inspect for layout issues (overflow, broken accents, uneven spacing, header correctness) — fix and re-render until clean
5. Deliver the final file as a downloadable artifact

Ready to implement when you approve.
