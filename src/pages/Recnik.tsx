import { useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Search, Download, BookOpen, Pencil, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { recnik, normalize } from "@/data/recnik";
import { useRecnikEdits } from "@/hooks/useRecnikEdits";
import { newEntryId, type RuntimeEntry } from "@/lib/recnikEdits";
import EntryEditor from "@/components/EntryEditor";
import BackToTop from "@/components/BackToTop";


const PDF_PATH = "/downloads/ZAPLANJSKI_RECNIK_modern.pdf";

const Recnik = () => {
  const { slovo } = useParams<{ slovo: string }>();
  const letter = (slovo || "").toUpperCase();
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RuntimeEntry | null>(null);

  const { byLetter, stats } = useRecnikEdits();
  const entries = byLetter[letter] ?? [];
  const filtered = useMemo<RuntimeEntry[]>(() => {
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

  const openEditor = (entry: RuntimeEntry) => {
    setEditingEntry(entry);
    setEditorOpen(true);
  };

  const openNewEntry = () => {
    const fresh: RuntimeEntry = {
      __id: newEntryId(),
      __isNew: true,
      headword: "",
      pos: "",
      definition: "",
      letter,
    };
    setEditingEntry(fresh);
    setEditorOpen(true);
  };

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
            {stats[letter] ?? entries.length} одредница
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

      {/* Search + Add */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={`Претражи у слову ${letter}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 pl-11 text-base"
            />
          </div>
          <Button onClick={openNewEntry} size="lg" className="h-12 gap-2">
            <Plus className="h-4 w-4" />
            Додај реч
          </Button>
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
            {filtered.map((e) => (
              <li key={e.__id}>
                <Card className="group relative p-4 transition-colors hover:border-primary/40">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-12">
                    <span className="font-serif text-lg font-bold text-primary">
                      {e.headword}
                    </span>
                    {e.pos && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {e.pos}
                      </Badge>
                    )}
                    {e.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {e.category}
                      </Badge>
                    )}
                    {e.__isNew && (
                      <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15">
                        <Sparkles className="h-3 w-3" />
                        нова
                      </Badge>
                    )}
                    {e.__isEdited && (
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        измењена
                      </Badge>
                    )}
                  </div>
                  {e.definition && (
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                      {e.definition}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditor(e)}
                    className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Уреди „${e.headword}“`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
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

      <EntryEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        entry={editingEntry}
        letter={letter}
      />
    </main>
  );
};

export default Recnik;
