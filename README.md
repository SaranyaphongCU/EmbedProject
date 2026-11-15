# MagicShelf

Web app for a smart bookshelf. No build step: open `index.html` or serve the folder with any static server.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure (shelf page and Dashboard) |
| `styles.css` | Library theme: light brown tones, wooden planks, catalog cards |
| `data.js` | Sample books (`slot`, `title`, `author`, `type`, `genre`, optional `cover` image URL) |
| `app.js` | Sorting, scan, pick lock, statistics, shelf API |

## Features

- Shelf page: sort by title (default), left to right (slot), or category. Each book shows cover, title, author, type and genre.
- **แสกน** button sends a scan command. **เลือกเล่มนี้** sends a pick command; while a job runs, every select button and the scan button are disabled.
- Dashboard: most picked books, and which genres or book types have been read (click a genre to see its books). Statistics are stored in the browser (`localStorage`). Starting numbers are sample data and can be cleared.

## Import and export

In **ตั้งค่า**, **ส่งออกข้อมูล** downloads `magicshelf-data.json` and **นำเข้าข้อมูล** loads one. Format:

```json
{ "books": [ { "id": 1, "slot": 1, "title": "...", "author": "...", "type": "นวนิยาย", "genre": "แฟนตาซี", "cover": "" } ],
  "log": [ { "id": 1, "t": 1731650000000 } ] }
```

`books` is required (a bare array of books also works); `log` holds the pick history and is optional. Rows without a title are skipped and missing fields are filled in. Importing replaces the current books and statistics.

## Test mode and real mode

Use the **ตั้งค่า** button on the shelf page.

- **Test mode** (default): each command waits 2 seconds and counts as done.
- **Real mode**: the app sends `POST <API base>/pick` with `{ "id", "slot" }` and `POST <API base>/scan`, then waits until the shelf replies. A 2xx reply means done. A scan reply may include `{ "books": [ ... ] }` in the same shape as `data.js` to replace the list.

All shelf communication is in the `api` object at the top of `app.js`.
