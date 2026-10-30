"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="btn btn-ghost btn-sm relative" aria-label={`ตะกร้าสินค้า ${count} ชิ้น`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M5 7h14l-1.5 11h-11L5 7Z" strokeLinejoin="round" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      ตะกร้า
      {ready && count > 0 && (
        <span className="ml-0.5 min-w-5 rounded-full bg-base px-1.5 text-center text-xs leading-5 text-white">{count}</span>
      )}
    </Link>
  );
}
