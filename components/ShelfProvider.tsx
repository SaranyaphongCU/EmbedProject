"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { shelfApi } from "@/lib/api";
import { applyEdits, checkEdit, editKey, expandLegacyEdits, normalizeBooks, normalizeEdits, stripEditMeta } from "@/lib/books";
import type { Book, BookEdit, Busy, LogEntry, Settings, SortBy, Status } from "@/lib/types";

// ---------- storage (every access guarded: it can throw or come back empty) ----------
const LS = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage may be blocked; the app still works without it */
    }
  },
};
const K_LOG = "ms-pick-log-v1";
const K_SET = "ms-settings-v2";
const K_SORT = "ms-sort-v1";
const K_BOOKS = "ms-books-v1";
const K_DEMO = "ms-demo-v1";
const K_EDITS = "ms-edits-v1";

const SORTS: SortBy[] = ["title", "slot", "category"];
const DEFAULT_SETTINGS: Settings = { mode: "real", apiBase: "https://script.google.com/macros/s/AKfycbwUTfLWiSOpoexiBEPcy8OBG8EnYU28h0krA70qm-HYLkpANWjU6Jvtf9e0a_V4QRzO/exec" };

type ShelfState = {
  ready: boolean; // false until localStorage has been read in the browser
  books: Book[];
  log: LogEntry[];
  settings: Settings;
  sortBy: SortBy;
  busy: Busy;
  status: Status;
  setSortBy: (s: SortBy) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  run: (kind: "pick" | "scan", book?: Book) => void;
  exportData: () => void;
  importData: (file: File) => void;
  clearStats: () => void;
  editBook: (book: Book, patch: { title: string; author: string; genre: string }) => string | null; // error message, or null when saved
  resetBook: (book: Book) => void;
};

const Ctx = createContext<ShelfState | null>(null);

export function useShelf(): ShelfState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShelf must be used inside <ShelfProvider>");
  return v;
}

export function ShelfProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [rawBooks, setBooks] = useState<Book[]>([]); // as the shelf reported them (empty until the first scan)
  const [edits, setEdits] = useState<BookEdit[]>([]); // the user's title/author edits, kept in this browser
  const [log, setLog] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sortBy, setSortByState] = useState<SortBy>("title"); // default: by title
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState<Status>(null);

  // Refs hold the latest values for async code, and the lock stops two clicks in the same tick.
  const booksRef = useRef(rawBooks);
  const editsRef = useRef(edits);
  const logRef = useRef(log);
  const settingsRef = useRef(settings);
  const busyRef = useRef<Busy>(null);
  booksRef.current = rawBooks;
  editsRef.current = edits;
  logRef.current = log;
  settingsRef.current = settings;

  // Read saved data once, in the browser (localStorage does not exist on the server).
  useEffect(() => {
    const savedBooks = normalizeBooks(LS.get<unknown>(K_BOOKS, null));
    if (savedBooks.length) setBooks(savedBooks);
    // Edits saved before copies of one title were told apart become one edit per copy.
    const savedEdits = normalizeEdits(LS.get<unknown>(K_EDITS, null));
    const migrated = expandLegacyEdits(savedBooks, savedEdits);
    if (savedEdits.some((e) => e.copy === undefined)) LS.set(K_EDITS, migrated);
    setEdits(migrated);

    const savedSettings = LS.get<Partial<Settings>>(K_SET, {});
    setSettings({
      mode: savedSettings.mode ?? DEFAULT_SETTINGS.mode,
      apiBase: typeof savedSettings.apiBase === "string" && savedSettings.apiBase ? savedSettings.apiBase : DEFAULT_SETTINGS.apiBase,
    });

    const savedSort = LS.get<string>(K_SORT, "title");
    if ((SORTS as string[]).includes(savedSort)) setSortByState(savedSort as SortBy);

    const savedLog = LS.get<unknown>(K_LOG, null);
    let nextLog: LogEntry[] = Array.isArray(savedLog) ? (savedLog as LogEntry[]) : [];
    // Older versions filled the log with sample pick counts (marked t = 0) and set this flag.
    // Remove those, and keep any real picks made since.
    if (LS.get<boolean>(K_DEMO, false)) {
      nextLog = nextLog.filter((e) => e && e.t !== 0);
      LS.set(K_LOG, nextLog);
      LS.set(K_DEMO, false);
    }
    setLog(nextLog);
    setReady(true);
  }, []);

  const setSortBy = useCallback((s: SortBy) => {
    setSortByState(s);
    LS.set(K_SORT, s);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    LS.set(K_SET, next);
  }, []);

  const run = useCallback((kind: "pick" | "scan", book?: Book) => {
    if (busyRef.current) return; // only one job at a time
    if (kind === "pick" && !book) return;
    const job: Busy = { kind, id: book?.id };
    busyRef.current = job;
    setBusy(job);
    setStatus({
      spin: true,
      text: kind === "scan" ? "กำลังสั่งให้ชั้นแสกนหนังสือ…" : `ชั้นกำลังนำเล่ม “${book!.title}” ออกมา (ช่อง ${book!.slot})`,
    });

    const api = shelfApi(settingsRef.current);
    // The shelf looks a book up by the title it reported, so send that, not the user's edited text.
    const request = kind === "scan" ? api.scan() : api.pick(book!.origTitle !== undefined ? { ...book!, title: book!.origTitle } : book!);
    request
      .then((res) => {
        if (kind === "pick") {
          const next = [...logRef.current, { id: book!.id, t: Date.now() }];
          logRef.current = next;
          setLog(next);
          LS.set(K_LOG, next);
          setStatus({ text: `เสร็จแล้ว: นำเล่ม “${book!.title}” ออกมาแล้ว` });
        } else {
          const scanned = normalizeBooks(res && res.books);
          let count = booksRef.current.length;
          if (scanned.length) {
            booksRef.current = scanned;
            setBooks(scanned);
            LS.set(K_BOOKS, scanned);
            count = scanned.length;
          }
          setStatus({ text: `แสกนเสร็จแล้ว พบหนังสือ ${count} เล่ม` });
        }
      })
      .catch((e: unknown) => {
        setStatus({ err: true, text: `ทำงานไม่สำเร็จ: ${e instanceof Error && e.message ? e.message : "ไม่ทราบสาเหตุ"}` });
      })
      .then(() => {
        busyRef.current = null;
        setBusy(null);
      });
  }, []);

  const exportData = useCallback(() => {
    const payload = {
      app: "MagicShelf",
      version: 1,
      exportedAt: new Date().toISOString(),
      books: applyEdits(booksRef.current, editsRef.current).map(stripEditMeta), // the text the user sees
      log: logRef.current,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "magicshelf-data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus({ text: `ส่งออกข้อมูลแล้ว: ${booksRef.current.length} เล่ม, สถิติ ${logRef.current.length} ครั้ง` });
  }, []);

  const importData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result));
        const list = normalizeBooks(Array.isArray(d) ? d : d && d.books); // a bare array of books also works
        if (!list.length) throw new Error("ไม่พบรายการหนังสือในไฟล์");
        booksRef.current = list;
        setBooks(list);
        LS.set(K_BOOKS, list);
        editsRef.current = []; // an imported file is the new truth, so old edits no longer apply
        setEdits([]);
        LS.set(K_EDITS, []);
        if (d && Array.isArray(d.log)) {
          const ids = new Set(list.map((b) => b.id));
          const nextLog: LogEntry[] = (d.log as { id?: unknown; t?: unknown }[])
            .filter((e) => e && ids.has(Number(e.id)))
            .map((e) => ({ id: Number(e.id), t: Number(e.t) || 0 }));
          logRef.current = nextLog;
          setLog(nextLog);
          LS.set(K_LOG, nextLog);
        }
        LS.set(K_DEMO, false);
        setStatus({ text: `นำเข้าข้อมูลแล้ว: หนังสือ ${list.length} เล่ม` });
      } catch (e) {
        setStatus({ err: true, text: `นำเข้าไม่สำเร็จ: ${e instanceof Error && e.message ? e.message : "ไฟล์ไม่ถูกต้อง"}` });
      }
    };
    reader.onerror = () => setStatus({ err: true, text: "อ่านไฟล์ไม่สำเร็จ" });
    reader.readAsText(file);
  }, []);

  const clearStats = useCallback(() => {
    logRef.current = [];
    setLog([]);
    LS.set(K_LOG, []);
    LS.set(K_DEMO, false);
  }, []);

  const saveEdits = useCallback((next: BookEdit[]) => {
    editsRef.current = next;
    setEdits(next);
    LS.set(K_EDITS, next);
  }, []);

  const editBook = useCallback(
    (book: Book, patch: { title: string; author: string; genre: string }): string | null => {
      const checked = checkEdit(patch);
      if ("error" in checked) return checked.error;
      const key = editKey(book);
      const copy = book.copy ?? 1;
      const rest = editsRef.current.filter((e) => !(e.key === key && e.copy === copy));
      const rawTitle = book.origTitle ?? book.title;
      const rawAuthor = book.origAuthor ?? book.author;
      const rawGenre = book.origGenre ?? book.genre;
      // Same text the shelf reported: nothing to remember.
      const unchanged = checked.title === rawTitle && checked.author === rawAuthor && checked.genre === rawGenre;
      saveEdits(unchanged ? rest : [...rest, { key, copy, ...checked }]);
      return null;
    },
    [saveEdits],
  );

  const resetBook = useCallback(
    (book: Book) => {
      const key = editKey(book);
      const copy = book.copy ?? 1;
      saveEdits(editsRef.current.filter((e) => !(e.key === key && e.copy === copy)));
    },
    [saveEdits],
  );

  const books = useMemo(() => applyEdits(rawBooks, edits), [rawBooks, edits]);

  return (
    <Ctx.Provider
      value={{ ready, books, log, settings, sortBy, busy, status, setSortBy, updateSettings, run, exportData, importData, clearStats, editBook, resetBook }}
    >
      {children}
    </Ctx.Provider>
  );
}
