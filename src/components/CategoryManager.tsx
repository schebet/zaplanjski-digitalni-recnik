import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useRecnikEdits } from "@/hooks/useRecnikEdits";
import {
  addCategory,
  deleteCategory,
  renameCategory,
} from "@/lib/recnikEdits";

/**
 * Dialog za добављање/брисање/преименовање категорија.
 * Промене се одмах одражавају у едитору речи и претраживачу.
 */
export default function CategoryManager() {
  const { categories, categoryStats } = useRecnikEdits();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Унеси назив категорије");
      return;
    }
    const ok = addCategory(name);
    if (!ok) {
      toast.error("Категорија већ постоји");
      return;
    }
    toast.success("Категорија додата", { description: name });
    setNewName("");
  };

  const handleDelete = (name: string) => {
    const used = categoryStats[name] ?? 0;
    const msg =
      used > 0
        ? `Обрисати категорију „${name}“? Уклониће се са ${used} речи (речи остају).`
        : `Обрисати категорију „${name}“?`;
    if (!confirm(msg)) return;
    deleteCategory(name);
    toast.success("Категорија обрисана", { description: name });
  };

  const startRename = (name: string) => {
    setRenaming(name);
    setRenameValue(name);
  };

  const commitRename = () => {
    if (!renaming) return;
    const target = renameValue.trim();
    if (!target || target === renaming) {
      setRenaming(null);
      return;
    }
    renameCategory(renaming, target);
    toast.success("Категорија преименована", {
      description: `${renaming} → ${target}`,
    });
    setRenaming(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Tag className="h-4 w-4" />
          Уреди категорије
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Категорије</DialogTitle>
          <DialogDescription>
            Додај нову категорију, преименуј или обриши постојеће. Промене се
            чувају локално у твом прегледачу и улазе у све експорте (PDF, DOCX,
            EPUB).
          </DialogDescription>
        </DialogHeader>

        {/* Add new */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Нова категорија</label>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="нпр. Биљке и дрвеће"
            />
            <Button onClick={handleAdd} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Додај
            </Button>
          </div>
        </div>

        {/* Existing list */}
        <div className="mt-2 grid gap-2">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium">
              Постојеће категорије
            </label>
            <span className="text-xs text-muted-foreground">
              {categories.length} укупно
            </span>
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {categories.length === 0 && (
              <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                Нема категорија. Додај прву изнад.
              </li>
            )}
            {categories.map((c) => {
              const count = categoryStats[c] ?? 0;
              const isRenaming = renaming === c;
              return (
                <li
                  key={c}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  {isRenaming ? (
                    <>
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        autoFocus
                        className="h-8"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={commitRename}
                        aria-label="Сачувај"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setRenaming(null)}
                        aria-label="Откажи"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-sm">{c}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {count}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startRename(c)}
                        aria-label={`Преименуј ${c}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(c)}
                        aria-label={`Обриши ${c}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Затвори
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
