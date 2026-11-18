"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const path = usePathname();
  return (
    <header className="sign">
      <div className="sign-in">
        <div className="brand">
          <svg className="logo" viewBox="0 0 40 40" aria-hidden="true">
            <rect x="3" y="6" width="7" height="28" rx="1.5" fill="#7b5232" />
            <rect x="12" y="10" width="7" height="24" rx="1.5" fill="#b88a3b" />
            <rect x="21" y="4" width="7" height="30" rx="1.5" fill="#a9784a" />
            <rect x="30" y="12" width="7" height="22" rx="1.5" fill="#4f6b54" transform="rotate(8 33 23)" />
            <rect x="1" y="34" width="38" height="3.5" rx="1" fill="#5c3b22" />
          </svg>
          <div>
            <h1>MagicShelf</h1>
            <p>ห้องสมุดส่วนตัวอัจฉริยะ</p>
          </div>
        </div>
        <nav aria-label="เมนูหลัก">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            ชั้นหนังสือ
          </Link>
          <Link href="/dashboard" aria-current={path === "/dashboard" ? "page" : undefined}>
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
