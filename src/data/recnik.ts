import data from "./recnik.json";

export interface Entry {
  headword: string;
  pos: string;
  definition: string;
  letter: string;
  category?: string;
}

export interface RecnikData {
  alphabet: string[];
  stats: Record<string, number>;
  byLetter: Record<string, Entry[]>;
  categories?: string[];
  categoryStats?: Record<string, number>;
}

/** Slug za URL kategorije (latinica, bez akcenata, crtice). */
export function categorySlug(c: string): string {
  const map: Record<string, string> = {
    "А":"a","Б":"b","В":"v","Г":"g","Д":"d","Ђ":"dj","Е":"e","Ж":"z","З":"z","И":"i",
    "Ј":"j","К":"k","Л":"l","Љ":"lj","М":"m","Н":"n","Њ":"nj","О":"o","П":"p","Р":"r",
    "С":"s","Т":"t","Ћ":"c","У":"u","Ф":"f","Х":"h","Ц":"c","Ч":"c","Џ":"dz","Ш":"s",
    "а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"dj","е":"e","ж":"z","з":"z","и":"i",
    "ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r",
    "с":"s","т":"t","ћ":"c","у":"u","ф":"f","х":"h","ц":"c","ч":"c","џ":"dz","ш":"s",
  };
  return c.split("").map(ch => map[ch] ?? ch).join("").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export const recnik = data as RecnikData;

/** Ukloni kombinujuće akcente i razmake da olakša pretragu i sortiranje. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export const TOTAL_ENTRIES = Object.values(recnik.stats).reduce(
  (a, b) => a + b,
  0,
);
