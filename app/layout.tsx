import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { Header } from "@/components/Header";
import { ShelfProvider } from "@/components/ShelfProvider";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "MagicShelf",
  description: "ห้องสมุดส่วนตัวอัจฉริยะ: ชั้นหนังสืออัจฉริยะที่เลือกและแสกนหนังสือได้",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body>
        <ShelfProvider>
          <Header />
          <main>{children}</main>
        </ShelfProvider>
      </body>
    </html>
  );
}
