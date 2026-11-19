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
  // Which copy this is when several books share a title: 1 for the first from the left, 2 for the next...
  // Set by the app (not the shelf), so each copy can be edited on its own.
  copy?: number;
};

// A user edit of one book, stored in this browser. `key` is the title as the shelf reported it and `copy`
// says which book with that title (see Book.copy). `genre` is missing in edits saved before genres could be
// edited ("keep the shelf's genre"), and `copy` is missing in edits saved before copies were told apart
// ("every book with this title"); those are converted when the app loads.
export type BookEdit = { key: string; copy?: number; title: string; author: string; genre?: string };

export type LogEntry = { id: number; t: number };

export type Settings = { mode: "test" | "real"; apiBase: string };

export type SortBy = "title" | "slot" | "category";

export type Busy = { kind: "pick" | "scan"; id?: number } | null;

export type Status = { text: string; err?: boolean; spin?: boolean } | null;