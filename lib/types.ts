export type Book = {
  id: number;
  slot: number; // position on the shelf, left to right
  title: string;
  author: string;
  type: string; // what kind of book
  genre: string; // what genre
  cover: string; // optional image URL; empty means draw a cover
  x?: number; // พิกัด X จาก Gemini (0-1000)
  y?: number; // พิกัด Y จาก Gemini (0-1000)
  // Set only when the user edited this book in the app. title/author then hold the edited text,
  // and these hold what the shelf reported (the shelf still needs the original title to find the book).
  origTitle?: string;
  origAuthor?: string;
  origGenre?: string;
  edited?: boolean;
};

// A user edit of one book, stored in this browser. `key` is the title as the shelf reported it.
// `genre` is missing in edits saved before genres could be edited; that means "keep the shelf's genre".
export type BookEdit = { key: string; title: string; author: string; genre?: string };

export type LogEntry = { id: number; t: number };

export type Settings = { mode: "test" | "real"; apiBase: string };

export type SortBy = "title" | "slot" | "category";

export type Busy = { kind: "pick" | "scan"; id?: number } | null;

export type Status = { text: string; err?: boolean; spin?: boolean } | null;