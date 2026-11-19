import type { Book, BookEdit, LogEntry, SortBy } from "./types";

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

// A coordinate is kept only when it is a real number (empty, null or text becomes "no coordinate").
const coord = (v: unknown): number | undefined =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? undefined : Number(v);

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
      x: coord(row.x), // position on the shelf photo (0-1000); the shelf needs it to reach the book
      y: coord(row.y),
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

// ---------- user edits (title / author) ----------
export const TITLE_MAX = 120;
export const AUTHOR_MAX = 80;
export const DEFAULT_AUTHOR = "ไม่ระบุผู้แต่ง";
export const GENRE_MAX = 40;
export const DEFAULT_GENRE = "ทั่วไป";

// Genres offered in the edit form. Genres already on the shelf are added to this list when the form
// opens, and "other" lets the user type one that is not here.
export const GENRES = [
  "ทั่วไป", "แฟนตาซี", "สืบสวน", "ลึกลับ", "สยองขวัญ", "ผจญภัย", "โรมานซ์", "ตลก", "ไซไฟ",
  "ประวัติศาสตร์", "สังคมการเมือง", "จิตวิทยา", "ครอบครัว", "ชีวประวัติ", "ศาสนาและปรัชญา",
  "การทำงาน", "ธุรกิจ", "การเงิน", "การศึกษา", "สุขภาพ",
  "ดาราศาสตร์", "ฟิสิกส์", "ชีววิทยา", "คอมพิวเตอร์และเทคโนโลยี",
  "อาหารไทย", "อาหารและเครื่องดื่ม", "ท่องเที่ยว", "ศิลปะและการออกแบบ", "เรื่องสั้น", "กวีนิพนธ์", "การ์ตูนและนิยายภาพ",
];

// Edits are looked up by the title the shelf reported, never by the edited title.
export const editKey = (b: Book) => b.origTitle ?? b.title;

// Lay the user's edits over the books the shelf reported. A rescan replaces the raw books;
// a book that comes back with the same title keeps its edit.
export function applyEdits(books: Book[], edits: BookEdit[]): Book[] {
  if (!edits.length) return books;
  const byKey = new Map(edits.map((e) => [e.key, e]));
  return books.map((b) => {
    const e = byKey.get(b.title);
    if (!e) return b;
    return {
      ...b,
      title: e.title,
      author: e.author,
      genre: e.genre ?? b.genre,
      origTitle: b.title,
      origAuthor: b.author,
      origGenre: b.genre,
      edited: true,
    };
  });
}

// Remove the edit-only fields (used when exporting, so the file holds the text the user sees).
export function stripEditMeta(b: Book): Book {
  const { origTitle, origAuthor, origGenre, edited, ...rest } = b;
  void origTitle; void origAuthor; void origGenre; void edited;
  return rest;
}

// Read edits back from storage: keep only well-formed rows, one per key.
export function normalizeEdits(v: unknown): BookEdit[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: BookEdit[] = [];
  v.forEach((r) => {
    if (!r || typeof r !== "object") return;
    const { key, title, author, genre } = r as Record<string, unknown>;
    if (typeof key !== "string" || typeof title !== "string" || typeof author !== "string") return;
    if (!key || !title.trim() || seen.has(key)) return;
    seen.add(key);
    const g = typeof genre === "string" ? genre.trim().slice(0, GENRE_MAX) : "";
    out.push({
      key,
      title: title.trim().slice(0, TITLE_MAX),
      author: author.trim().slice(0, AUTHOR_MAX) || DEFAULT_AUTHOR,
      ...(g ? { genre: g } : {}),
    });
  });
  return out;
}

// Check what the user typed. Returns the cleaned values or a message to show.
export type EditInput = { title: string; author: string; genre: string };

export function checkEdit(input: EditInput): EditInput | { error: string } {
  const title = input.title.trim();
  const author = input.author.trim();
  const genre = input.genre.trim();
  if (!title) return { error: "กรุณาใส่ชื่อหนังสือ" };
  if (title.length > TITLE_MAX) return { error: `ชื่อหนังสือยาวเกิน ${TITLE_MAX} ตัวอักษร` };
  if (author.length > AUTHOR_MAX) return { error: `ชื่อผู้แต่งยาวเกิน ${AUTHOR_MAX} ตัวอักษร` };
  if (genre.length > GENRE_MAX) return { error: `ชื่อแนวยาวเกิน ${GENRE_MAX} ตัวอักษร` };
  return { title, author: author || DEFAULT_AUTHOR, genre: genre || DEFAULT_GENRE };
}

export function sortBooks(books: Book[], by: SortBy): Book[] {
  const a = books.slice();
  if (by === "slot") a.sort((x, y) => x.slot - y.slot);
  else if (by === "category") a.sort((x, y) => cmp(x.type, y.type) || cmp(x.genre, y.genre) || cmp(x.title, y.title));
  else a.sort((x, y) => cmp(x.title, y.title));
  return a;
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
