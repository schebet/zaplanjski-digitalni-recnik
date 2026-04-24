import { useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Search, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { recnik, normalize, type Entry } from "@/data/recnik";
import BackToTop from "@/components/BackToTop";


const PDF_PATH = "/downloads/ZAPLANJSKI_RECNIK_modern.pdf";

const Recnik = () => {
  const { slovo } = useParams<{ slovo: string }>();
  const letter = (slovo || "").toUpperCase();
  const [query, setQuery] = useState("");

  const entries = recnik.byLetter[letter] ?? [];
  const filtered = useMemo<Entry[]>(() => {
    if (!query.trim()) return entries;
    const q = normalize(query);
    return entries.filter(
      (e) =>
        normalize(e.headword).includes(q) ||
        normalize(e.definition).includes(q),
    );
  }, [entries, query]);

  if (!letter || !recnik.byLetter[letter]) {
    return <Navigate to="/" replace />;
  }

  const currentIdx = recnik.alphabet.indexOf(letter);
  const prevLetter =
    currentIdx > 0 ? recnik.alphabet[currentIdx - 1] : null;
  const nextLetter =
    currentIdx < recnik.alphabet.length - 1
      ? recnik.alphabet[currentIdx + 1]
      : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Заплањски Речник</span>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href={PDF_PATH} download>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </a>
          </Button>
        </div>
      </header>

      {/* Letter banner */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-10 text-center">
          <div className="font-serif text-8xl font-bold leading-none text-primary">
            {letter}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? "одредница" : "одредница"}
          </p>
        </div>
      </section>

      {/* Alphabet strip */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex flex-wrap justify-center gap-1">
            {recnik.alphabet.map((l) => {
              const active = l === letter;
              return (
                <Link
                  key={l}
                  to={`/recnik/${l}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-md font-serif text-sm font-bold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-primary hover:bg-primary/10"
                  }`}
                >
                  {l}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={`Претражи у слову ${letter}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-11 text-base"
          />
        </div>
        {query && (
          <p className="mt-2 text-sm text-muted-foreground">
            {filtered.length} резултат(а) за „{query}"
          </p>
        )}
      </section>

      {/* Entries */}
      <section className="mx-auto max-w-3xl px-6 py-8">
        {filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">
              Нема одредница које одговарају претрази.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {filtered.map((e, i) => (
              <li key={`${e.headword}-${i}`}>
                <Card className="p-4 transition-colors hover:border-primary/40">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-serif text-lg font-bold text-primary">
                      {e.headword}
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {e.pos}
                    </Badge>
                    {e.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {e.category}
                      </Badge>
                    )}
                  </div>
                  {e.definition && (
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                      {e.definition}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Prev/Next nav */}
      <nav className="border-t border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-6">
          {prevLetter ? (
            <Button asChild variant="outline" className="gap-2">
              <Link to={`/recnik/${prevLetter}`}>
                <ArrowLeft className="h-4 w-4" />
                {prevLetter}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {nextLetter ? (
            <Button asChild variant="outline" className="gap-2">
              <Link to={`/recnik/${nextLetter}`}>
                {nextLetter}
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </div>
      </nav>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Заплањски Речник · Модерно дигитално издање
      </footer>
      <BackToTop />
    </main>
  );
};

export default Recnik;
