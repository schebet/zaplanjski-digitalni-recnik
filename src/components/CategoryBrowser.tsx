import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { recnik, normalize, type Entry } from "@/data/recnik";

type SortMode = "alpha" | "letter";

/** Šarena paleta za tabove kategorija — svaka kategorija dobija stabilnu boju.
 *  Koristimo Tailwind utility klase direktno (ne semantic tokens) jer su ovo
 *  dekorativni „identifikatori" kategorija, slično bojama oznaka u Gmail-u. */
const CATEGORY_COLORS: { active: string; idle: string; badgeIdle: string }[] = [
  { active: "border-rose-500 bg-rose-500 text-white shadow-sm",
    idle: "border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:bg-rose-900/40",
    badgeIdle: "bg-rose-200/70 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100" },
  { active: "border-amber-500 bg-amber-500 text-white shadow-sm",
    idle: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/40",
    badgeIdle: "bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100" },
  { active: "border-emerald-500 bg-emerald-500 text-white shadow-sm",
    idle: "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/40",
    badgeIdle: "bg-emerald-200/70 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100" },
  { active: "border-sky-500 bg-sky-500 text-white shadow-sm",
    idle: "border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100 dark:hover:bg-sky-900/40",
    badgeIdle: "bg-sky-200/70 text-sky-900 dark:bg-sky-900/60 dark:text-sky-100" },
  { active: "border-violet-500 bg-violet-500 text-white shadow-sm",
    idle: "border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/40",
    badgeIdle: "bg-violet-200/70 text-violet-900 dark:bg-violet-900/60 dark:text-violet-100" },
  { active: "border-pink-500 bg-pink-500 text-white shadow-sm",
    idle: "border-pink-300 bg-pink-50 text-pink-900 hover:bg-pink-100 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-100 dark:hover:bg-pink-900/40",
    badgeIdle: "bg-pink-200/70 text-pink-900 dark:bg-pink-900/60 dark:text-pink-100" },
  { active: "border-teal-500 bg-teal-500 text-white shadow-sm",
    idle: "border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900/40",
    badgeIdle: "bg-teal-200/70 text-teal-900 dark:bg-teal-900/60 dark:text-teal-100" },
  { active: "border-orange-500 bg-orange-500 text-white shadow-sm",
    idle: "border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100 dark:hover:bg-orange-900/40",
    badgeIdle: "bg-orange-200/70 text-orange-900 dark:bg-orange-900/60 dark:text-orange-100" },
  { active: "border-lime-500 bg-lime-500 text-white shadow-sm",
    idle: "border-lime-300 bg-lime-50 text-lime-900 hover:bg-lime-100 dark:border-lime-900 dark:bg-lime-950/40 dark:text-lime-100 dark:hover:bg-lime-900/40",
    badgeIdle: "bg-lime-200/70 text-lime-900 dark:bg-lime-900/60 dark:text-lime-100" },
  { active: "border-cyan-500 bg-cyan-500 text-white shadow-sm",
    idle: "border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100 dark:hover:bg-cyan-900/40",
    badgeIdle: "bg-cyan-200/70 text-cyan-900 dark:bg-cyan-900/60 dark:text-cyan-100" },
  { active: "border-fuchsia-500 bg-fuchsia-500 text-white shadow-sm",
    idle: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100 dark:border-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-100 dark:hover:bg-fuchsia-900/40",
    badgeIdle: "bg-fuchsia-200/70 text-fuchsia-900 dark:bg-fuchsia-900/60 dark:text-fuchsia-100" },
  { active: "border-indigo-500 bg-indigo-500 text-white shadow-sm",
    idle: "border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100 dark:hover:bg-indigo-900/40",
    badgeIdle: "bg-indigo-200/70 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-100" },
  { active: "border-yellow-500 bg-yellow-500 text-stone-900 shadow-sm",
    idle: "border-yellow-300 bg-yellow-50 text-yellow-900 hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-100 dark:hover:bg-yellow-900/40",
    badgeIdle: "bg-yellow-200/70 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100" },
  { active: "border-stone-500 bg-stone-500 text-white shadow-sm",
    idle: "border-stone-300 bg-stone-50 text-stone-900 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-100 dark:hover:bg-stone-800/60",
    badgeIdle: "bg-stone-200/70 text-stone-900 dark:bg-stone-800 dark:text-stone-100" },
];

function colorForCategory(name: string, index: number) {
  // „Остало" uvek dobija neutralnu (poslednju) paletu — vizuelno se razlikuje
  // od pravih kategorija i ostaje stabilna ako se redosled menja.
  if (name === "Остало") return CATEGORY_COLORS[CATEGORY_COLORS.length - 1];
  return CATEGORY_COLORS[index % (CATEGORY_COLORS.length - 1)];
}

/** Po opadajućem broju odrednica, sa "Остало" uvek na kraju radi jasnije navigacije. */
function getOrderedCategories(): { name: string; count: number }[] {
  const stats = recnik.categoryStats ?? {};
  const list = Object.entries(stats).map(([name, count]) => ({ name, count }));
  list.sort((a, b) => {
    if (a.name === "Остало") return 1;
    if (b.name === "Остало") return -1;
    return b.count - a.count;
  });
  return list;
}

/** Sve odrednice spljoštene jednom — kategorije se filtriraju iz ovog niza. */
const ALL_ENTRIES: Entry[] = Object.values(recnik.byLetter).flat();

const CategoryBrowser = () => {
  const categories = useMemo(getOrderedCategories, []);
  const [active, setActive] = useState<string>(categories[0]?.name ?? "Остало");
  const [sort, setSort] = useState<SortMode>("alpha");

  const entries = useMemo(() => {
    const filtered = ALL_ENTRIES.filter((e) => e.category === active);
    if (sort === "alpha") {
      return [...filtered].sort((a, b) =>
        normalize(a.headword).localeCompare(normalize(b.headword), "sr"),
      );
    }
    // sort === "letter": grupisanje sledi prirodni redosled azbuke
    return [...filtered].sort((a, b) => {
      const la = recnik.alphabet.indexOf(a.letter);
      const lb = recnik.alphabet.indexOf(b.letter);
      if (la !== lb) return la - lb;
      return normalize(a.headword).localeCompare(normalize(b.headword), "sr");
    });
  }, [active, sort]);

  // Group za prikaz po slovu (samo kad sort === "letter")
  const grouped = useMemo(() => {
    if (sort !== "letter") return null;
    const map = new Map<string, Entry[]>();
    entries.forEach((e) => {
      const arr = map.get(e.letter) ?? [];
      arr.push(e);
      map.set(e.letter, arr);
    });
    return Array.from(map.entries());
  }, [entries, sort]);

  return (
    <section
      id="kategorije"
      className="border-t border-border bg-background"
      aria-labelledby="kategorije-heading"
    >
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
          <Tag className="h-4 w-4" />
          Категорије
        </div>
        <h2
          id="kategorije-heading"
          className="mb-3 text-center font-serif text-3xl font-semibold"
        >
          Речи по темама
        </h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Изабери категорију — нпр. дунђерлук, овчарство, одећа — и прегледај
          све одреднице које припадају тој теми.
        </p>

        {/* Tabovi kategorija */}
        <div
          role="tablist"
          aria-label="Категорије речи"
          className="mb-6 flex flex-wrap justify-center gap-2"
        >
          {categories.map((c, idx) => {
            const isActive = c.name === active;
            const palette = colorForCategory(c.name, idx);
            return (
              <button
                key={c.name}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls="category-panel"
                onClick={() => setActive(c.name)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? palette.active : palette.idle
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive ? "bg-white/25 text-current" : palette.badgeIdle
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort toolbar */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {entries.length}
            </span>{" "}
            одредница у категорији „{active}"
          </p>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={sort === "alpha" ? "default" : "ghost"}
              onClick={() => setSort("alpha")}
              className="h-8 gap-1.5 px-3 text-xs"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Азбучно
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sort === "letter" ? "default" : "ghost"}
              onClick={() => setSort("letter")}
              className="h-8 px-3 text-xs"
            >
              По слову
            </Button>
          </div>
        </div>

        {/* Panel sa odrednicama */}
        <div
          id="category-panel"
          role="tabpanel"
          aria-label={`Одреднице у категорији ${active}`}
        >
          {entries.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              Нема одредница у овој категорији.
            </Card>
          ) : grouped ? (
            <div className="space-y-8">
              {grouped.map(([letter, items]) => (
                <div key={letter}>
                  <div className="mb-3 flex items-baseline gap-3 border-b border-border pb-2">
                    <Link
                      to={`/recnik/${letter}`}
                      className="font-serif text-3xl font-bold text-primary hover:underline"
                      aria-label={`Отвори све одреднице на слово ${letter}`}
                    >
                      {letter}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {items.length} одредница
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {items.map((e, i) => (
                      <EntryRow key={`${e.headword}-${i}`} entry={e} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {entries.map((e, i) => (
                <EntryRow key={`${e.headword}-${i}`} entry={e} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

/** Dosledan red prikaza odrednice — koristi se i pri grupisanju i pri sortiranju. */
const EntryRow = ({ entry }: { entry: Entry }) => (
  <li>
    <Link
      to={`/recnik/${entry.letter}`}
      className="group block rounded-md border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-serif text-base font-bold text-primary">
          {entry.headword}
        </span>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {entry.pos}
        </Badge>
      </div>
      {entry.definition && (
        <p className="mt-1 line-clamp-2 text-sm text-foreground/80">
          {entry.definition}
        </p>
      )}
    </Link>
  </li>
);

export default CategoryBrowser;
