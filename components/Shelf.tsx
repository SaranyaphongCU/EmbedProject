"use client";

import { Fragment, useState } from "react";
import { coverColor, editKey, sortBooks } from "@/lib/books";
import type { Book, SortBy } from "@/lib/types";
import { EditBookDialog } from "./EditBookDialog";
import { useShelf } from "./ShelfProvider";

const SORT_LABELS: [SortBy, string][] = [
  ["title", "ชื่อหนังสือ"],
  ["slot", "ซ้าย → ขวา"],
  ["category", "หมวดหมู่"],
];

function Cover({ book }: { book: Book }) {
  const color = coverColor(book);
  return (
    <div className="cover" style={{ background: `linear-gradient(160deg,${color},${color}cc)` }}>
      {book.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={book.cover} alt="" loading="lazy" />
      ) : (
        <>
          <div className="ct clamp2">{book.title}</div>
          <div className="ca clamp2">{book.author}</div>
        </>
      )}
    </div>
  );
}

export function Shelf() {
  const { ready, books, settings, sortBy, busy, status, setSortBy, updateSettings, run } = useShelf();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);

  const list = ready ? sortBooks(books, sortBy) : [];
  const typeCounts: Record<string, number> = {};
  list.forEach((b) => (typeCounts[b.type] = (typeCounts[b.type] || 0) + 1));

  const scanning = busy?.kind === "scan";

  return (
    <section>
      <div className="controls">
        <div className="ctl">
          <span className="ctl-label" id="sort-label">เรียงตาม</span>
          <div className="seg" role="group" aria-labelledby="sort-label">
            {SORT_LABELS.map(([key, label]) => (
              <button key={key} aria-pressed={sortBy === key} onClick={() => setSortBy(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="ctl-right">
          <button className="btn scan" disabled={!!busy} onClick={() => run("scan")}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span>{scanning ? "กำลังแสกน…" : "แสกน"}</span>
          </button>
          <button
            className="btn ghost"
            aria-expanded={settingsOpen}
            aria-controls="settings"
            onClick={() => setSettingsOpen((o) => !o)}
          >
            ตั้งค่า
          </button>
        </div>
      </div>

      <div id="settings" className="settings" hidden={!settingsOpen}>
        <fieldset>
          <legend>โหมดการทำงาน</legend>
          <label>
            <input type="radio" name="mode" value="test" checked={settings.mode === "test"} onChange={() => updateSettings({ mode: "test" })} />{" "}
            โหมดทดสอบ <span className="hint">ค้างไว้ 2 วินาทีแล้วถือว่าเสร็จ</span>
          </label>
          <label>
            <input type="radio" name="mode" value="real" checked={settings.mode === "real"} onChange={() => updateSettings({ mode: "real" })} />{" "}
            โหมดจริง <span className="hint">รอจนชั้นตอบกลับว่าทำงานเสร็จ</span>
          </label>
        </fieldset>
      </div>

      {status && (
        <div className={"status" + (status.err ? " err" : "")} role="status" aria-live="polite">
          {status.spin && <span className="spin" />}
          <span>{status.text}</span>
        </div>
      )}

      <div className="shelf">
        {ready && list.length === 0 && <p className="empty">ไม่พบหนังสือบนชั้น ลองกดแสกน</p>}
        {list.map((b, i) => {
          const active = busy?.kind === "pick" && busy.id === b.id;
          const newGroup = sortBy === "category" && (i === 0 || list[i - 1].type !== b.type);
          return (
            <Fragment key={b.id}>
              {newGroup && (
                <div className="group">
                  <h2>{b.type}</h2>
                  <span>{typeCounts[b.type]} เล่ม</span>
                </div>
              )}
              <article className={"book" + (active ? " active" : "")}>
                <div className="cover-wrap">
                  <span className="slot" title="ตำแหน่งบนชั้นจากซ้าย">ช่อง {b.slot}</span>
                  <Cover book={b} />
                  <button
                    type="button"
                    className={"edit-btn" + (b.edited ? " on" : "")}
                    aria-label={`แก้ไขชื่อและผู้แต่งของ ${b.title}`}
                    title={b.edited ? "แก้ไขแล้ว (กดเพื่อแก้ไขหรือคืนค่าเดิม)" : "แก้ไขชื่อและผู้แต่ง"}
                    onClick={() => setEditing(b)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
                <div className="info">
                  <div className="t clamp2" title={b.title}>{b.title}</div>
                  <div className="a clamp2" title={b.author}>{b.author}</div>
                  <div className="tags">
                    <span className="tag" title={b.type}>{b.type}</span>
                    <span className="tag genre" title={b.genre}>{b.genre}</span>
                  </div>
                </div>
                <button className="pick" disabled={!!busy} aria-label={`เลือกหนังสือ ${b.title}`} onClick={() => run("pick", b)}>
                  {active ? (
                    <>
                      <span className="spin" style={{ borderColor: "#fff", borderRightColor: "transparent" }} />
                      กำลังทำงาน
                    </>
                  ) : (
                    "เลือกเล่มนี้"
                  )}
                </button>
              </article>
            </Fragment>
          );
        })}
      </div>

      {editing && <EditBookDialog key={editKey(editing)} book={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
