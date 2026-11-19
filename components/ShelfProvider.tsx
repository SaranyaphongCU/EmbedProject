"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { shelfApi } from "@/lib/api";
import { buildDemoLog, normalizeBooks } from "@/lib/books";
import { SAMPLE_BOOKS } from "@/lib/data";
import type { Book, Busy, LogEntry, Settings, SortBy, Status } from "@/lib/types";

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
const K_SET = "ms-settings-v1";
const K_SORT = "ms-sort-v1";
const K_BOOKS = "ms-books-v1";
const K_DEMO = "ms-demo-v1";

const SORTS: SortBy[] = ["title", "slot", "category"];
const DEFAULT_SETTINGS: Settings = { mode: "real", apiBase: "https://script.google.com/macros/s/AKfycbz5dd1qZpjE1RltWDFGrb1LCidmbO7SfuWGSKwlIEIFM0UwtfSvlF5nRmHgx0o424yC/exec" };

type ShelfState = {
  ready: boolean; // false until localStorage has been read in the browser
  books: Book[];
  log: LogEntry[];
  settings: Settings;
  sortBy: SortBy;
  demo: boolean;
  busy: Busy;
  status: Status;
  setSortBy: (s: SortBy) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  run: (kind: "pick" | "scan", book?: Book) => void;
  exportData: () => void;
  importData: (file: File) => void;
  clearStats: () => void;
};

const Ctx = createContext<ShelfState | null>(null);

export function useShelf(): ShelfState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShelf must be used inside <ShelfProvider>");
  return v;
}

export function ShelfProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [books, setBooks] = useState<Book[]>(SAMPLE_BOOKS);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sortBy, setSortByState] = useState<SortBy>("title"); // default: by title
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState<Status>(null);

  // Refs hold the latest values for async code, and the lock stops two clicks in the same tick.
  const booksRef = useRef(books);
  const logRef = useRef(log);
  const settingsRef = useRef(settings);
  const busyRef = useRef<Busy>(null);
  booksRef.current = books;
  logRef.current = log;
  settingsRef.current = settings;

  // Read saved data once, in the browser (localStorage does not exist on the server).
  useEffect(() => {
    const savedBooks = normalizeBooks(LS.get<unknown>(K_BOOKS, null));
    if (savedBooks.length) setBooks(savedBooks);

    const savedSettings = LS.get<Partial<Settings>>(K_SET, {});
    setSettings({
      mode: savedSettings.mode === "real" ? "real" : "test",
      apiBase: typeof savedSettings.apiBase === "string" ? savedSettings.apiBase : "",
    });

    const savedSort = LS.get<string>(K_SORT, "title");
    if ((SORTS as string[]).includes(savedSort)) setSortByState(savedSort as SortBy);

    const savedLog = LS.get<unknown>(K_LOG, null);
    if (Array.isArray(savedLog)) {
      setLog(savedLog as LogEntry[]);
      setDemo(LS.get<boolean>(K_DEMO, false));
    } else {
      const seeded = buildDemoLog(); // first run: seed example numbers
      setLog(seeded);
      setDemo(true);
      LS.set(K_LOG, seeded);
      LS.set(K_DEMO, true);
    }
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
    const request = kind === "scan" ? api.scan() : api.pick(book!);
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
      books: booksRef.current,
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
        if (d && Array.isArray(d.log)) {
          const ids = new Set(list.map((b) => b.id));
          const nextLog: LogEntry[] = (d.log as { id?: unknown; t?: unknown }[])
            .filter((e) => e && ids.has(Number(e.id)))
            .map((e) => ({ id: Number(e.id), t: Number(e.t) || 0 }));
          logRef.current = nextLog;
          setLog(nextLog);
          LS.set(K_LOG, nextLog);
        }
        setDemo(false);
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
    setDemo(false);
    LS.set(K_LOG, []);
    LS.set(K_DEMO, false);
  }, []);

  return (
    <Ctx.Provider
      value={{ ready, books, log, settings, sortBy, demo, busy, status, setSortBy, updateSettings, run, exportData, importData, clearStats }}
    >
      {children}
    </Ctx.Provider>
  );
}
