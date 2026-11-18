import { DEMO_PICKS } from "./data";
import type { Book, LogEntry, SortBy } from "./types";

// Thai-aware string comparison
export const cmp = (a: string, b: string) => String(a).localeCompare(String(b), "th");

// Cover colours by book type
const COVER: Record<string, string> = {
  "นวนิยาย": "#8c4a3b",
  "วรรณกรรมเยาวชน": "#3f7a78",
  "สารคดี": "#5b5f86",
  "พัฒนาตนเอง": "#a8742f",
  "วิทยาศาสตร์": "#2f6a8c",
  "ตำราอาหาร": "#6b7d3a",
};
export const coverColor = (b: Pick<Book, "type">) => COVER[b.type] || "#7b5232";

// Accepts an array of books; drops rows without a title and fills missing fields.
// Returns [] if nothing is usable.
export function normalizeBooks(arr: unknown): Book[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<number>();
  const out: (Omit<Book, "id"> & { id: number | null })[] = [];

  arr.forEach((r, i) => {
    if (!r || typeof r !== "object") return;
    const row = r as Record<string, unknown>;
    const title = String(row.title ?? "").trim();
    if (!title) return;

    let id: number | null = Number(row.id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) id = null;
    const slot = Number(row.slot);
    const cover = typeof row.cover === "string" && /^(https?:|data:image\/)/.test(row.cover) ? row.cover : "";

    out.push({
      id,
      slot: Number.isFinite(slot) && slot > 0 ? slot : i + 1,
      title,
      author: String(row.author || "ไม่ระบุผู้แต่ง").trim(),
      type: String(row.type || "ไม่ระบุประเภท").trim(),
      genre: String(row.genre || "ไม่ระบุแนว").trim(),
      cover,
    });
    if (id !== null) seen.add(id);
  });

  // give every row without a usable id a fresh one
  let next = 1;
  return out.map((b) => {
    if (b.id !== null) return b as Book;
    while (seen.has(next)) next++;
    seen.add(next);
    return { ...b, id: next };
  });
}

export function sortBooks(books: Book[], by: SortBy): Book[] {
  const a = books.slice();
  if (by === "slot") a.sort((x, y) => x.slot - y.slot);
  else if (by === "category") a.sort((x, y) => cmp(x.type, y.type) || cmp(x.genre, y.genre) || cmp(x.title, y.title));
  else a.sort((x, y) => cmp(x.title, y.title));
  return a;
}

// First run: seed the pick log from the sample numbers
export function buildDemoLog(): LogEntry[] {
  const log: LogEntry[] = [];
  Object.keys(DEMO_PICKS).forEach((id) => {
    for (let i = 0; i < DEMO_PICKS[+id]; i++) log.push({ id: +id, t: 0 });
  });
  return log;
}

// Pick counts per book id, ignoring log rows for books that no longer exist
export function pickCounts(books: Book[], log: LogEntry[]): Record<number, number> {
  const ids = new Set(books.map((b) => b.id));
  const c: Record<number, number> = {};
  log.forEach((e) => {
    if (ids.has(e.id)) c[e.id] = (c[e.id] || 0) + 1;
  });
  return c;
}
