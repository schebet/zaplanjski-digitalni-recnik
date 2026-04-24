# Welcome to your Lovable project

Napravi PWA web-aplikaciju "Заплањски Речник" — interaktivni dijalekatski rečnik 
zaplanjskog govora (srpska ćirilica) sa sledećim karakteristikama:

═══════════════════════════════════════════════════════════════════
TEHNOLOŠKI STACK (obavezno)
═══════════════════════════════════════════════════════════════════
- Vite 5 + React 18 + TypeScript 5
- Tailwind CSS v3 sa shadcn/ui komponentama (Radix UI)
- React Router v6 (BrowserRouter)
- TanStack React Query
- vite-plugin-pwa + workbox-window (offline / installable)
- next-themes (light/dark mode)
- Biblioteke za izvoz: docx (DOCX), jspdf (PDF), file-saver
- Testiranje: vitest + @testing-library/react + jsdom
- Sve boje preko HSL semantičkih tokena u index.css i tailwind.config.ts
  (NIKAD direktne klase poput text-white, bg-black u komponentama)

═══════════════════════════════════════════════════════════════════
STRUKTURA PODATAKA
═══════════════════════════════════════════════════════════════════
Glavni izvor: src/data/recnik.json sa oblikom:
{
  "alphabet": ["А","Б","В",...,"Ш"],   // srpska ćirilica, 30 slova
  "stats":   { "А": 123, "Б": 87, ... },
  "byLetter": {
    "А": [
      {
        "headword": "абá",
        "pos": "[пр.]",
        "definition": "tekst definicije",
        "letter": "А",
        "category": "опционо"
      }
    ]
  },
  "categories": ["Храна","Алат","Биље",...],
  "categoryStats": { "Храна": 42, ... }
}

TypeScript tipovi u src/data/recnik.ts (Entry, RecnikData) + helper funkcije:
- normalize(s)   — NFD + uklanja akcente za pretragu/sortiranje
- categorySlug(c) — pretvara ćiriličnu kategoriju u url-friendly latinicu
- TOTAL_ENTRIES  — ukupan broj odrednica

═══════════════════════════════════════════════════════════════════
RUTE (React Router)
═══════════════════════════════════════════════════════════════════
- "/"               → Index (homepage sa azbukom, statistikama, pretragom)
- "/recnik/:slovo"  → Recnik (lista odrednica za jedno slovo + editor)
- "*"               → NotFound (404)

═══════════════════════════════════════════════════════════════════
KLJUČNE FUNKCIONALNOSTI
═══════════════════════════════════════════════════════════════════
1. Pregled azbuke na homepage-u — klik na slovo otvara stranicu slova
2. Pretraga (normalize-aware, ignoriše akcente i velika/mala slova)
3. Pregled po kategorijama (CategoryBrowser, CategoryManager)
4. Inline editor odrednica (EntryEditor) — dodaj/izmeni/obriši
5. Lokalne izmene se čuvaju u localStorage pod ključem "recnik.edits.v1"
   - sloj "edits" se nadograđuje preko base JSON-a
   - hook useRecnikEdits() vraća efektivni rečnik (base + edits)
   - sync između tabova preko window 'storage' i custom 'recnik:edits-changed' eventa
6. Izvoz: JSON (recnikJsonIO), DOCX (recnikExport sa docx biblio.), 
   EPUB (recnikEpub), PDF (jspdf)
7. Uvoz JSON-a (zamena ili merge sa postojećim)
8. PWA: offline rad, install prompt, OfflineIndicator komponenta,
   versionCheck.ts za detekciju nove verzije service workera
9. Dark/Light theme toggle (ThemeToggle, next-themes)
10. BackToTop dugme, responsive layout (mobile-first)

═══════════════════════════════════════════════════════════════════
KOMPONENTE (src/components)
═══════════════════════════════════════════════════════════════════
- BackToTop, OfflineIndicator, ThemeToggle, NavLink
- CategoryBrowser, CategoryManager
- EntryEditor (dialog za dodavanje/izmenu odrednice)
- ui/* — kompletan shadcn/ui set (Button, Dialog, Input, Toast, ...)

═══════════════════════════════════════════════════════════════════
DIZAJN
═══════════════════════════════════════════════════════════════════
- Klasičan, "knjiški" osećaj rečnika: serif za odrednice, sans-serif za UI
- Topla paleta sa toplim akcentom (npr. burgundy/sepia) — sve preko 
  HSL semantičkih tokena (--background, --foreground, --primary, 
  --accent, --muted, --border ...) definisanih u src/index.css
- Tailwind config proširen tim tokenima
- Dark mode pun-supportovan
- Tipografija: ćirilica mora ostati lepo akcentovana (á, í, ý, é...)

═══════════════════════════════════════════════════════════════════
FAJLOVI KOJE OBAVEZNO TREBA NAPRAVITI
═══════════════════════════════════════════════════════════════════
src/
  App.tsx, main.tsx, index.css, App.css, pwa.ts, vite-env.d.ts
  pages/        Index.tsx, Recnik.tsx, NotFound.tsx
  components/   BackToTop.tsx, CategoryBrowser.tsx, CategoryManager.tsx,
                EntryEditor.tsx, NavLink.tsx, OfflineIndicator.tsx,
                ThemeToggle.tsx, ui/* (shadcn)
  hooks/        useRecnikEdits.ts, use-mobile.tsx, use-toast.ts
  lib/          utils.ts, recnikEdits.ts, recnikJsonIO.ts,
                recnikExport.ts (DOCX), recnikEpub.ts, versionCheck.ts
  data/         recnik.ts, recnik.json
  test/         setup.ts, example.test.ts
public/         manifest.webmanifest, robots.txt, placeholder.svg
config:         vite.config.ts (sa PWA plugin-om), vitest.config.ts,
                tailwind.config.ts, tsconfig*.json, postcss.config.js,
                components.json, eslint.config.js, index.html

═══════════════════════════════════════════════════════════════════
PWA KONFIGURACIJA (vite.config.ts)
═══════════════════════════════════════════════════════════════════
- registerType: 'autoUpdate'
- manifest: name "Заплањски Речник", short_name "Речник", 
  theme_color usklađen sa dizajnom, icons (192/512), 
  display: 'standalone', start_url: '/'
- workbox: precache za HTML/CSS/JS/JSON/woff2

═══════════════════════════════════════════════════════════════════
NAPOMENE
═══════════════════════════════════════════════════════════════════
- Ne koristi backend; svi podaci su statički + localStorage
- Ako korisnik kasnije zatraži sinhronizaciju između uređaja, 
  predloži uključivanje Lovable Cloud-a
- Sav UI tekst je na srpskoj ćirilici
- Sortiranje i pretraga moraju koristiti `normalize()` da bi 
  ignorisali akcente
```

---

## 🚀 Lokalno pokretanje

```bash
npm install
npm run dev          # http://localhost:8080
npm run build        # produkciona verzija
npm run test         # vitest
```

## 📦 Skripte

| komanda | opis |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | produkcioni build |
| `npm run build:dev` | build u dev modu (sa source mapama) |
| `npm run preview` | lokalni preview build-a |
| `npm run lint` | ESLint |
| `npm run test` | Vitest jednom |
| `npm run test:watch` | Vitest u watch modu |

## 🗂️ Struktura

```
src/
├── pages/         # Index, Recnik, NotFound
├── components/    # UI + domenske komponente
├── hooks/         # useRecnikEdits + shadcn hooks
├── lib/           # edits, JSON I/O, DOCX/EPUB/PDF export
├── data/          # recnik.json + tipovi
└── test/          # vitest setup
```

## 🌐 Tehnologije

React 18 · TypeScript · Vite 5 · Tailwind CSS · shadcn/ui · React Router · TanStack Query · vite-plugin-pwa · docx · jspdf · vitest

## 📝 Licenca

Lični/edukativni projekat. Sav rečnički sadržaj je vlasništvo izvornih autora.
