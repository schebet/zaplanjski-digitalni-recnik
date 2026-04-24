import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Download,
  ExternalLink,
  FileText,
  BookOpen,
  Hash,
  RefreshCw,
  Book,
} from "lucide-react";
import { toast } from "sonner";
import { recnik, TOTAL_ENTRIES } from "@/data/recnik";
import BackToTop from "@/components/BackToTop";
import CategoryBrowser from "@/components/CategoryBrowser";
import { resetCachesAndReload } from "@/lib/versionCheck";

const PDF_PATH = "/downloads/ZAPLANJSKI_RECNIK_modern.pdf";
const DOCX_PATH = "/downloads/ZAPLANJSKI_RECNIK_modern.docx";
const EPUB_PATH = "/downloads/ZAPLANJSKI_RECNIK_modern.epub";
const LIVE_URL = "https://digitalni-zaplanjski-recnik.lovable.app";

const ALPHABET = [
  "А","Б","В","Г","Д","Ђ","Е","Ж","З","И","Ј","К","Л","Љ","М","Н","Њ",
  "О","П","Р","С","Т","Ћ","У","Ц","Ч","Џ","Ш",
];

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const Index = () => {
  const isPreview = typeof window !== "undefined" && window.location.hostname.includes("id-preview--");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handlePdfDownload = () => {
    triggerDownload(PDF_PATH, "ZAPLANJSKI_RECNIK_modern.pdf");
    toast.success("Преузимање PDF-а је започето", {
      description: "271 страна • 2,7 MB",
    });
  };

  const handleDocxDownload = () => {
    triggerDownload(DOCX_PATH, "ZAPLANJSKI_RECNIK_modern.docx");
    toast.success("Преузимање DOCX-а је започето", {
      description: "Word формат • 363 KB",
    });
  };

  const handleEpubDownload = () => {
    triggerDownload(EPUB_PATH, "ZAPLANJSKI_RECNIK_modern.epub");
    toast.success("Преузимање EPUB-а је започето", {
      description: "Формат за читаче е-књига",
    });
  };

  const handleHardRefresh = async () => {
    if (isRefreshing) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error("Нема интернет везе", {
        description: "Освежавање ће бити покушано чим се веза врати.",
      });
      return;
    }
    setIsRefreshing(true);
    toast("Освежавам све", {
      description: "Бришем кеш и учитавам најновију верзију…",
    });
    await resetCachesAndReload("manual");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(217_60%_30%/0.08),_transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <p className="mb-6 inline-block rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Дигитални речник заплањског говора
          </p>
          <h1 className="font-serif text-5xl font-bold tracking-tight sm:text-7xl">
            Заплањски
            <br />
            <span className="text-primary">Речник</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Преко {TOTAL_ENTRIES.toLocaleString("sr-Cyrl")} одредница
            заплањског говора, преуређених у модерни речник са алфабетском
            навигацијом, доследним размацима и чистом типографијом.
          </p>

          {/* One-click downloads */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={handlePdfDownload}
              className="h-14 gap-3 border-0 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-orange-500/30 hover:from-rose-600 hover:via-orange-600 hover:to-amber-600 hover:text-white dark:from-rose-600 dark:via-orange-600 dark:to-amber-600 dark:shadow-orange-900/50 dark:hover:from-rose-500 dark:hover:via-orange-500 dark:hover:to-amber-500"
            >
              <Download className="h-5 w-5" />
              Преузми PDF
            </Button>
            <Button
              size="lg"
              onClick={handleDocxDownload}
              className="h-14 gap-3 border-0 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-8 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 hover:from-sky-600 hover:via-indigo-600 hover:to-violet-600 hover:text-white dark:from-sky-600 dark:via-indigo-600 dark:to-violet-600 dark:shadow-indigo-900/50 dark:hover:from-sky-500 dark:hover:via-indigo-500 dark:hover:to-violet-500"
            >
              <FileText className="h-5 w-5" />
              Преузми DOCX
            </Button>
            <Button
              size="lg"
              onClick={handleEpubDownload}
              className="h-14 gap-3 border-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 text-base font-semibold text-white shadow-lg shadow-teal-500/30 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 hover:text-white dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-600 dark:shadow-teal-900/50 dark:hover:from-emerald-500 dark:hover:via-teal-500 dark:hover:to-cyan-500"
            >
              <Book className="h-5 w-5" />
              Преузми EPUB
            </Button>
          </div>
          {isPreview && (
            <div className="mt-4 flex justify-center">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={LIVE_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Отвори live верзију
                </a>
              </Button>
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Један клик · без регистрације · спремно за штампу
          </p>
        </div>
      </section>

      {/* Stats moved to footer */}


      {/* Alphabet */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <h2 className="mb-2 text-center font-serif text-2xl font-semibold">
          Азбука речника
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Кликни на слово да отвориш одреднице
        </p>
        <div className="grid grid-cols-7 gap-2 sm:grid-cols-10 md:grid-cols-14">
          {ALPHABET.map((letter) => {
            const count = recnik.stats[letter] ?? 0;
            return (
              <Link
                key={letter}
                to={`/recnik/${letter}`}
                aria-label={`Отвори одреднице на слово ${letter} (${count})`}
                className="group relative flex aspect-square items-center justify-center rounded-md border border-border bg-card font-serif text-xl font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {letter}
                <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <CategoryBrowser />

      {/* Features */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="mb-10 text-center font-serif text-3xl font-semibold">
            Шта је ново у овом издању
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                title: "Свако слово на новој страни",
                desc: "Велики декоративни банер са почетним словом отвара свако поглавље.",
              },
              {
                title: "Доследна типографија",
                desc: "Серифни Cambria за тело текста, висећа увлака, уједначен размак између одредница.",
              },
              {
                title: "Уредна заглавља страна",
                desc: "Назив речника лево, тренутно слово десно, центрирани бројеви страна у дну.",
              },
            ].map((f) => (
              <Card key={f.title} className="p-6">
                <h3 className="mb-2 font-serif text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>

        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6">
          <div className="grid w-full grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-1">
              <BookOpen className="h-5 w-5 text-primary" />
              <div className="text-lg font-bold text-foreground">
                {TOTAL_ENTRIES.toLocaleString("sr-Cyrl")}
              </div>
              <div className="text-xs">одредница</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Hash className="h-5 w-5 text-primary" />
              <div className="text-lg font-bold text-foreground">28</div>
              <div className="text-xs">слова азбуке</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-lg font-bold text-foreground">271</div>
              <div className="text-xs">страна</div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleHardRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Освежи све
          </Button>
          <p>Заплањски Речник · Модерно дигитално издање</p>
        </div>
      </footer>
      <BackToTop />
    </main>
  );
};

export default Index;
