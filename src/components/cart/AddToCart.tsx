"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartLine } from "./CartProvider";

export function AddToCart({ product }: { product: Omit<CartLine, "qty"> }) {
  const { add, lines } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const inCart = lines.find((l) => l.productId === product.productId)?.qty ?? 0;
  const room = Math.max(0, product.stock - inCart);
  const soldOut = product.stock <= 0;

  if (soldOut) {
    return <button className="btn btn-ghost w-full" disabled>สินค้าหมด</button>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">จำนวน</span>
        <div className="flex items-center rounded-full border border-line bg-card">
          <button
            type="button"
            className="h-10 w-10 text-lg"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="ลดจำนวน"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
          <button
            type="button"
            className="h-10 w-10 text-lg"
            onClick={() => setQty((q) => Math.min(Math.max(room, 1), q + 1))}
            aria-label="เพิ่มจำนวน"
          >
            +
          </button>
        </div>
        {inCart > 0 && <span className="text-sm text-muted">มีในตะกร้าแล้ว {inCart} ชิ้น</span>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn btn-accent flex-1"
          disabled={room <= 0 && !added}
          onClick={() => {
            if (room <= 0) return;
            add(product, qty);
            setAdded(true);
            setTimeout(() => setAdded(false), 1800);
          }}
        >
          {added ? "ใส่ตะกร้าแล้ว" : room <= 0 ? "ใส่ตะกร้าครบจำนวนที่มีแล้ว" : "ใส่ตะกร้า"}
        </button>
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={room <= 0 && inCart === 0}
          onClick={() => {
            if (room > 0) add(product, qty);
            router.push("/checkout");
          }}
        >
          ซื้อเลย
        </button>
      </div>
    </div>
  );
}
