export type Book = {
  id: number;
  slot: number; // position on the shelf, left to right
  title: string;
  author: string;
  type: string; // what kind of book
  genre: string; // what genre
  cover: string; // optional image URL; empty means draw a cover
};

export type LogEntry = { id: number; t: number };

export type Settings = { mode: "test" | "real"; apiBase: string };

export type SortBy = "title" | "slot" | "category";

export type Busy = { kind: "pick" | "scan"; id?: number } | null;

export type Status = { text: string; err?: boolean; spin?: boolean } | null;
