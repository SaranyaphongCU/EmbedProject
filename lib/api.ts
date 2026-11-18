import type { Book, Settings } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type ScanReply = { books?: unknown };

// This is the only place that talks to the real shelf.
// Test mode waits 2 s. Real mode POSTs and waits until the shelf replies that it has finished.
export function shelfApi(settings: Settings) {
  async function send(path: string, payload: object): Promise<ScanReply> {
    if (settings.mode === "test") {
      await sleep(2000);
      return {};
    }
    const base = settings.apiBase.trim().replace(/\/$/, "");
    if (!base) throw new Error("ยังไม่ได้ตั้งที่อยู่ API ของชั้น (ปุ่มตั้งค่า)");
    if (typeof location !== "undefined" && location.protocol === "https:" && /^http:\/\//i.test(base)) {
      throw new Error("หน้าเว็บเป็น https แต่ที่อยู่ API เป็น http เบราว์เซอร์จะบล็อก ต้องใช้ https หรือส่งผ่านบริการคลาวด์");
    }

    let res: Response;
    try {
      res = await fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("เชื่อมต่อชั้นไม่ได้ (ตรวจที่อยู่ API และการตั้งค่า CORS ของชั้น)");
    }
    if (!res.ok) throw new Error(`ชั้นตอบกลับผิดพลาด (${res.status})`);
    try {
      return (await res.json()) as ScanReply;
    } catch {
      return {};
    }
  }

  return {
    pick: (b: Book) => send("/pick", { id: b.id, slot: b.slot }),
    scan: () => send("/scan", {}),
  };
}
