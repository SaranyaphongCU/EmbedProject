"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AUTHOR_MAX, cmp, GENRE_MAX, GENRES, TITLE_MAX } from "@/lib/books";
import type { Book } from "@/lib/types";
import { useShelf } from "./ShelfProvider";

const OTHER = "__other__"; // the "type my own genre" choice

// Modal form to edit one book's title, author and genre. Edits are saved in this browser only.
export function EditBookDialog({ book, onClose }: { book: Book; onClose: () => void }) {
  const { books, editBook, resetBook } = useShelf();
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [genreChoice, setGenreChoice] = useState(book.genre); // a genre from the list, or OTHER
  const [genreCustom, setGenreCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The fixed list, plus every genre already on the shelf (the scan can produce ones that are not in the list).
  const genreOptions = useMemo(() => {
    const all = new Set<string>([...GENRES, ...books.map((b) => b.genre).filter(Boolean), book.genre]);
    return [...all].sort(cmp);
  }, [books, book.genre]);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal(); // guard: React strict mode runs effects twice in development
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const err = editBook(book, { title, author, genre: genreChoice === OTHER ? genreCustom : genreChoice });
    if (err) {
      setError(err);
      return;
    }
    onClose();
  }

  function reset() {
    resetBook(book);
    onClose();
  }

  return (
    <dialog
      ref={ref}
      className="edit-dialog"
      aria-labelledby="edit-heading"
      onClose={onClose} // fires when closed with Esc or ref.current.close()
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close(); // click on the dim background
      }}
    >
      <form className="edit-form" onSubmit={submit}>
        <h2 id="edit-heading">แก้ไขรายละเอียดหนังสือ</h2>
        <label>
          ชื่อหนังสือ
          <input
            value={title}
            maxLength={TITLE_MAX}
            required
            autoFocus
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
          />
        </label>
        <label>
          ผู้แต่ง
          <input
            value={author}
            maxLength={AUTHOR_MAX}
            onChange={(e) => {
              setAuthor(e.target.value);
              setError(null);
            }}
          />
        </label>
        <label>
          แนว
          <select
            value={genreChoice}
            onChange={(e) => {
              setGenreChoice(e.target.value);
              setError(null);
            }}
          >
            {genreOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value={OTHER}>อื่น ๆ (พิมพ์เอง)…</option>
          </select>
        </label>
        {genreChoice === OTHER && (
          <label>
            ชื่อแนว
            <input
              value={genreCustom}
              maxLength={GENRE_MAX}
              autoFocus
              placeholder="เช่น วรรณกรรมคลาสสิก"
              onChange={(e) => {
                setGenreCustom(e.target.value);
                setError(null);
              }}
            />
          </label>
        )}
        {book.edited && (
          <p className="hint">
            ที่ชั้นอ่านได้: {book.origTitle} · {book.origAuthor} · {book.origGenre}
          </p>
        )}
        <p className="hint">การแก้ไขนี้บันทึกในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่เปลี่ยนข้อมูลของชั้น</p>
        {error && (
          <p className="edit-error" role="alert">
            {error}
          </p>
        )}
        <div className="edit-actions">
          <button type="submit" className="btn">
            บันทึก
          </button>
          <button type="button" className="btn ghost" onClick={() => ref.current?.close()}>
            ยกเลิก
          </button>
          {book.edited && (
            <button type="button" className="link" onClick={reset}>
              คืนค่าเดิม
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
