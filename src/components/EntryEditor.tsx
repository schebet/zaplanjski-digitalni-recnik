import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Scissors, Undo2, Plus } from "lucide-react";
import {
  addCategory,
  deleteEntry,
  revertEntry,
  upsertEdit,
  type RuntimeEntry,
} from "@/lib/recnikEdits";
import { useRecnikEdits } from "@/hooks/useRecnikEdits";
import type { Entry } from "@/data/recnik";

interface EntryEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: RuntimeEntry | null;
  letter: string;
}

/**
 * Heuristic split for two glued Cyrillic words.
 * Looks for a second accented vowel and inserts a space before the previous
 * consonant cluster boundary. If we can't find one, returns the word as-is.
 *
 * Example: "нешто́изнао́ди" → "нешто́ изнао́ди"
 */
function suggestSplit(word: string): string {
  if (!word || word.includes(" ")) return word;
  // Combining accent marks commonly used in the dictionary
  const ACCENTS = /[\u0300\u0301\u0304\u030F\u0311]/g;
  // Find positions of accent marks
  const accentPositions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (ACCENTS.test(word[i])) accentPositions.push(i);
    ACCENTS.lastIndex = 0;
  }
  if (accentPositions.length < 2) return word;

  // After the first accent, scan forward for the start of a new word.
  // Heuristic: the next word likely starts at a vowel or after a consonant
  // boundary. We split right before a vowel that occurs after the first
  // accented syllable.
  const VOWELS = "аеиоуАЕИОУ";
  const firstAccent = accentPositions[0];
  for (let i = firstAccent + 2; i < word.length - 1; i++) {
    const ch = word[i];
    const prev = word[i - 1];
    if (VOWELS.includes(ch) && !VOWELS.includes(prev)) {
      // Don't split inside a 2-letter combining sequence
      // Walk back over consonants to a reasonable boundary
      let cut = i;
      // If the previous char is a consonant cluster start, cut before it
      while (cut > firstAccent + 2 && !VOWELS.includes(word[cut - 1])) cut--;
      if (cut > firstAccent + 1 && cut < word.length - 1) {
        return word.slice(0, cut) + " " + word.slice(cut);
      }
    }
  }
  return word;
}

const POS_OPTIONS = [
  "м.", "ж.", "с.", "пр.", "несврш.", "сврш.", "прил.", "узв.", "вез.", "пр.и пр.", "зам.", "бр.", "изр.", "предл.",
];

export default function EntryEditor({ open, onOpenChange, entry, letter }: EntryEditorProps) {
  const [headword, setHeadword] = useState("");
  const [pos, setPos] = useState("");
  const [definition, setDefinition] = useState("");
  const [category, setCategory] = useState("");
  const { categories, categoryStats } = useRecnikEdits();

  useEffect(() => {
    if (open && entry) {
      setHeadword(entry.headword || "");
      setPos(entry.pos || "");
      setDefinition(entry.definition || "");
      setCategory(entry.category || "");
    }
  }, [open, entry]);

  if (!entry) return null;

  const handleAddCategory = () => {
    const name = window.prompt("Назив нове категорије:");
    if (!name) return;
    const ok = addCategory(name);
    if (!ok) {
      toast.error("Категорија већ постоји или је назив празан");
      return;
    }
    setCategory(name.trim());
    toast.success("Категорија додата", { description: name.trim() });
  };

  const handleSave = () => {
    const trimmed = headword.trim();
    if (!trimmed) {
      toast.error("Унеси одредницу", { description: "Поље „Реч“ не може бити празно." });
      return;
    }
    const data: Entry = {
      headword: trimmed,
      pos: pos.trim(),
      definition: definition.trim(),
      letter,
      category: category.trim() || undefined,
    };
    upsertEdit(entry.__id, data);
    toast.success("Сачувано", { description: trimmed });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!confirm(`Обрисати одредницу „${entry.headword}“?`)) return;
    deleteEntry(entry.__id);
    toast.success("Обрисано");
    onOpenChange(false);
  };

  const handleRevert = () => {
    revertEntry(entry.__id);
    toast.success("Враћено на оригинал");
    onOpenChange(false);
  };

  const handleSplitHeadword = () => {
    const split = suggestSplit(headword);
    if (split === headword) {
      toast.info("Нема предлога за раздвајање");
      return;
    }
    setHeadword(split);
    toast.success("Предложено раздвајање", { description: split });
  };

  const handleSplitInDefinition = () => {
    // Split glued words inside the definition (best-effort).
    const parts = definition.split(/(\s+)/);
    let changed = false;
    const out = parts.map((p) => {
      if (/^\s+$/.test(p)) return p;
      const s = suggestSplit(p);
      if (s !== p) changed = true;
      return s;
    });
    if (!changed) {
      toast.info("Нема спојених речи у објашњењу");
      return;
    }
    setDefinition(out.join(""));
    toast.success("Раздвојене спојене речи у објашњењу");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {entry.__isNew ? "Нова одредница" : "Уреди одредницу"}
          </DialogTitle>
          <DialogDescription>
            Измене се чувају локално у твом прегледачу. Преузми DOCX/PDF са
            почетне стране да добијеш фајл са свим исправкама.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="hw">Реч (одредница)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={handleSplitHeadword}
                title="Покушај да раздвоји спојене речи (нпр. „нешто́изнао́ди“ → „нешто́ изнао́ди“)"
              >
                <Scissors className="h-3.5 w-3.5" />
                Раздвоји
              </Button>
            </div>
            <Input
              id="hw"
              value={headword}
              onChange={(e) => setHeadword(e.target.value)}
              className="font-serif text-lg"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pos">Граматичка ознака</Label>
            <Input
              id="pos"
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              list="pos-list"
              placeholder="нпр. несврш., м., ж., пр."
            />
            <datalist id="pos-list">
              {POS_OPTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="def">Објашњење и примери</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={handleSplitInDefinition}
                title="Раздваја спојене речи унутар примера"
              >
                <Scissors className="h-3.5 w-3.5" />
                Раздвоји у тексту
              </Button>
            </div>
            <Textarea
              id="def"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows={6}
              className="font-serif text-base leading-relaxed"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cat">Категорија (опционо)</Label>
            <Input
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="нпр. Тело и здравље, Особине..."
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {!entry.__isNew && (
              <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Обриши
              </Button>
            )}
            {(entry.__isEdited || entry.__isNew) && (
              <Button variant="outline" size="sm" onClick={handleRevert} className="gap-2">
                <Undo2 className="h-4 w-4" />
                {entry.__isNew ? "Поништи" : "Врати оригинал"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Откажи
            </Button>
            <Button onClick={handleSave}>Сачувај</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
