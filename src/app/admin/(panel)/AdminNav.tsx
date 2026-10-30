"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "ภาพรวม", exact: true },
  { href: "/admin/orders", label: "คำสั่งซื้อ" },
  { href: "/admin/products", label: "สินค้าและสต๊อก" },
  { href: "/admin/categories", label: "หมวดสินค้าและธีม" },
  { href: "/admin/settings", label: "ตั้งค่าร้าน" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3" aria-label="เมนูหลังบ้าน">
      {LINKS.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm ${active ? "bg-base font-semibold text-white" : "hover:bg-paper"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
