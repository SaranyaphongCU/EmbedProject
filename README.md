# MagicShelf

Web app for a smart bookshelf, built with Next.js (App Router, TypeScript). Thai UI, light library theme.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Production check: `npm run build` then `npm start`. Needs Node 18.18 or newer.

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel choose **Add New → Project**, import the repository. Vercel detects Next.js; keep the defaults (no environment variables are needed).
3. Click **Deploy**.

The build downloads the Sarabun font from Google Fonts, so the build machine needs internet access (Vercel has it).

## Files

| Path | Purpose |
|---|---|
| `app/layout.tsx` | Page shell: Sarabun font, header, shared state provider |
| `app/page.tsx` | Shelf page (`/`) |
| `app/dashboard/page.tsx` | Dashboard page (`/dashboard`) |
| `app/globals.css` | Library theme: light brown tones, wooden planks, catalog cards |
| `components/ShelfProvider.tsx` | State: books, pick log, settings, busy lock, import/export, `localStorage` |
| `components/Shelf.tsx` | Sorting, scan, pick buttons, settings panel |
| `components/Dashboard.tsx` | Statistics: most picked books, genres read |
| `lib/books.ts` | Book validation (`normalizeBooks`), sorting, pick counts |
| `lib/api.ts` | The only code that talks to the shelf (test and real mode) |

## Features

- Shelf page: sort by title (default), left to right (slot), or category. Each book shows cover, title, author, type and genre.
- **แสกน** button sends a scan command. **เลือกเล่มนี้** sends a pick command; while a job runs, every select button and the scan button are disabled.
- Dashboard: most picked books, and which genres or book types have been read (click a genre to see its books). Statistics are stored in the browser (`localStorage`) and can be cleared. The shelf starts empty: press **แสกน** to load the books.

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
- **Real mode**: the app sends `POST <API base>/pick` with `{ "id", "slot" }` and `POST <API base>/scan`, then waits until the shelf replies. A 2xx reply means done. A scan reply may include `{ "books": [ ... ] }` in the same shape as the `Book` type in `lib/types.ts` to replace the list.

### Real mode on a deployed (https) site

The requests are made by the visitor's browser, so two browser rules apply:

- A page served over **https** (Vercel) cannot call an **http** address such as `http://192.168.1.50/api` (mixed content is blocked). The shelf needs an https address, for example through a cloud service or tunnel.
- The shelf (or the service in front of it) must send CORS headers allowing the site's origin and answer the `OPTIONS` preflight request.

Until the shelf is online, use test mode on the deployed site.
