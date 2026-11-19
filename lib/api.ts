import type { Book, Settings } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type ScanReply = { books?: Book[] };

export function shelfApi(settings: Settings) {
  function getBaseUrl(): string {
    const base = settings.apiBase.trim().replace(/\/$/, "");
    if (!base) throw new Error("ยังไม่ได้ตั้งที่อยู่ API ของชั้น (ปุ่มตั้งค่า)");
    if (typeof location !== "undefined" && location.protocol === "https:" && /^http:\/\//i.test(base)) {
      throw new Error("หน้าเว็บเป็น https แต่ที่อยู่ API เป็น http เบราว์เซอร์จะบล็อก ต้องใช้ https");
    }
    return base;
  }

  // 1. ส่งคำสั่งเลือกหนังสือ (POST -> Apps Script)
  async function pickBook(b: Book): Promise<ScanReply> {
    if (settings.mode === "test") {
      await sleep(2000);
      return {};
    }
    const base = getBaseUrl();

    const payload = {
      action: "select_book",
      order: b.slot,
      title: b.title,
      x: b.x ?? 0,
      y: b.y ?? 0,
    };

    let res: Response;
    try {
      res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("เชื่อมต่อชั้นไม่ได้ (ตรวจที่อยู่ API และสิทธิ์การ Deploy)");
    }

    if (!res.ok) throw new Error(`ชั้นตอบกลับผิดพลาด (${res.status})`);
    try {
      return (await res.json()) as ScanReply;
    } catch {
      return {};
    }
  }

  // 2. ดึงรายชื่อหนังสือจาก Google Sheets (GET -> Apps Script)
  async function fetchBooks(): Promise<ScanReply> {
    if (settings.mode === "test") {
      await sleep(2000);
      return {};
    }
    const base = getBaseUrl();

    let res: Response;
    try {
      res = await fetch(`${base}?action=get_books`, {
        method: "GET",
      });
    } catch {
      throw new Error("เชื่อมต่อชั้นไม่ได้ (ตรวจที่อยู่ API และสิทธิ์การ Deploy)");
    }

    if (!res.ok) throw new Error(`ชั้นตอบกลับผิดพลาด (${res.status})`);
    try {
      const rawData = await res.json();
      if (!Array.isArray(rawData)) return { books: [] };

      // แปลงข้อมูลจาก Google Sheets ให้มีฟิลด์ครบตาม type Book
      const mappedBooks: Book[] = rawData.map((item: any, idx: number) => {
        const orderNum = Number(item.order) || idx + 1;
        return {
          id: orderNum,
          slot: orderNum,
          title: item.title || `หนังสือเล่มที่ ${orderNum}`,
          author: item.author || "ไม่ระบุผู้แต่ง",
          type: item.type || "หนังสือทั่วไป",
          genre: item.genre || "ทั่วไป",
          cover: "", // ปล่อยว่างไว้เพื่อให้ UI วาดปกหนังสืออัตโนมัติ (ถ้าใส่ลิงก์ Drive อาจติดสิทธิ์แสดงผล)
          x: Number(item.x) || 0,
          y: Number(item.y) || 0,
        };
      });

      return { books: mappedBooks };
    } catch {
      return { books: [] };
    }
  }

  return {
    pick: (b: Book) => pickBook(b),
    scan: () => fetchBooks(),
  };
}