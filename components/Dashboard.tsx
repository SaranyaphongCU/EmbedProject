"use client";

import { useState } from "react";
import { cmp, coverColor, pickCounts } from "@/lib/books";
import type { Book } from "@/lib/types";
import { useShelf } from "./ShelfProvider";

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      <div className="sub">{sub || " "}</div>
    </div>
  );
}

export function Dashboard() {
  const { ready, books, log, clearStats } = useShelf();
  const [tab, setTab] = useState<"books" | "genres">("books");
  const [groupBy, setGroupBy] = useState<"genre" | "type">("genre");
  const [picked, setPicked] = useState<string | null>(null);

  if (!ready) return <section aria-busy="true" />;

  const c = pickCounts(books, log);
  const total = Object.values(c).reduce((s, n) => s + n, 0);
  const ranked = books.filter((b) => c[b.id]).sort((a, b) => c[b.id] - c[a.id] || cmp(a.title, b.title));
  const top: Book | undefined = ranked[0];

  const genreCounts: Record<string, number> = {};
  ranked.forEach((b) => (genreCounts[b.genre] = (genreCounts[b.genre] || 0) + c[b.id]));
  const topGenre = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a])[0];

  // tab 2: which genres (or book types) have been read
  const g: Record<string, number> = {};
  const items: Record<string, Book[]> = {};
  ranked.forEach((b) => {
    const k = b[groupBy];
    g[k] = (g[k] || 0) + c[b.id];
    (items[k] = items[k] || []).push(b);
  });
  const names = Object.keys(g).sort((a, b) => g[b] - g[a] || cmp(a, b));
  const selected = picked && g[picked] ? picked : names[0] || null;
  const topMax = top ? c[top.id] : 1;
  const groupMax = names.length ? g[names[0]] : 1;

  return (
    <section>
      <div className="summary">
        <Card label="เลือกทั้งหมด" value={`${total} ครั้ง`} sub={`จาก ${ranked.length} เล่ม`} />
        <Card
          label="เล่มที่เลือกมากที่สุด"
          value={top ? top.title : "ยังไม่มีข้อมูล"}
          sub={top ? `${c[top.id]} ครั้ง · ${top.author}` : ""}
        />
        <Card
          label="แนวที่อ่านมากที่สุด"
          value={topGenre ? topGenre : "ยังไม่มีข้อมูล"}
          sub={topGenre ? `${genreCounts[topGenre]} ครั้ง` : ""}
        />
      </div>

      <div className="dash-tabs">
        <div className="seg" role="tablist" aria-label="มุมมองสถิติ">
          <button role="tab" aria-selected={tab === "books"} onClick={() => setTab("books")}>หนังสือที่เลือกบ่อยที่สุด</button>
          <button role="tab" aria-selected={tab === "genres"} onClick={() => setTab("genres")}>แนวที่อ่านไปแล้ว</button>
        </div>
      </div>

      {tab === "books" && (
        <div className="panel">
          {ranked.length ? (
            <ol className="rank">
              {ranked.map((b, i) => (
                <li key={b.id}>
                  <span className="n">{i + 1}</span>
                  <span className="mini" style={{ background: coverColor(b) }} />
                  <div>
                    <div className="t">{b.title}</div>
                    <div className="m">{b.author} · {b.type} / {b.genre}</div>
                    <div className="bar"><b style={{ width: `${Math.round((c[b.id] / topMax) * 100)}%` }} /></div>
                  </div>
                  <span className="v">{c[b.id]}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">ยังไม่มีสถิติ กดเลือกหนังสือที่หน้าชั้นหนังสือได้เลย</p>
          )}
        </div>
      )}

      {tab === "genres" && (
        <div className="panel">
          <div className="gtools">
            <span className="ctl-label">ดูตาม</span>
            <div className="seg" role="group" aria-label="จัดกลุ่ม">
              <button aria-pressed={groupBy === "genre"} onClick={() => { setGroupBy("genre"); setPicked(null); }}>แนว</button>
              <button aria-pressed={groupBy === "type"} onClick={() => { setGroupBy("type"); setPicked(null); }}>ประเภทหนังสือ</button>
            </div>
          </div>
          {names.length && selected ? (
            <>
              <ul className="gbars">
                {names.map((n) => (
                  <li key={n} className={n === selected ? "on" : ""}>
                    <button aria-pressed={n === selected} onClick={() => setPicked(n)}>
                      <span className="gn">{n}</span>
                      <span className="bar"><b style={{ width: `${Math.round((g[n] / groupMax) * 100)}%` }} /></span>
                      <span className="v">{g[n]}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="gdetail">
                <h3>หนังสือที่เลือกใน{groupBy === "genre" ? "แนว" : "ประเภท"} “{selected}”</h3>
                <ul>
                  {items[selected].map((b) => (
                    <li key={b.id}>
                      <span>{b.title} <small>{b.author}</small></span>
                      <span>{c[b.id]} ครั้ง</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="empty">ยังไม่มีสถิติ</p>
          )}
        </div>
      )}

      <p className="foot">
        <button className="link" onClick={clearStats}>ล้างสถิติทั้งหมด</button>
      </p>
    </section>
  );
}
