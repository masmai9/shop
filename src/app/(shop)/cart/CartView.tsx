"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { refreshCart } from "../actions";
import { formatBaht } from "@/lib/format";

export function shippingFor(subtotal: number, flatFee: number, freeOver: number | null) {
  return freeOver != null && subtotal >= freeOver ? 0 : flatFee;
}

/** Sync cart with current price/stock; returns human-readable notices. */
export function useCartSync() {
  const { lines, ready, replace } = useCart();
  const [notices, setNotices] = useState<string[]>([]);
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current || lines.length === 0) return;
    done.current = true;
    refreshCart(lines.map((l) => l.productId)).then((fresh) => {
      const msgs: string[] = [];
      const next = lines.flatMap((l) => {
        const f = fresh.find((x) => x.productId === l.productId);
        if (!f || f.stock <= 0) {
          msgs.push(`"${l.name}" หมดแล้ว จึงนำออกจากตะกร้า`);
          return [];
        }
        if (f.price !== l.price) msgs.push(`"${f.name}" ราคาเปลี่ยนเป็น ${formatBaht(f.price)}`);
        let qty = l.qty;
        if (qty > f.stock) {
          msgs.push(`"${f.name}" เหลือ ${f.stock} ชิ้น ปรับจำนวนให้แล้ว`);
          qty = f.stock;
        }
        return [{ ...f, qty }];
      });
      setNotices(msgs);
      replace(next);
    });
  }, [ready, lines, replace]);

  return notices;
}

/** Explains automatic cart changes (sold out, price change, qty reduced). */
export function Notices({ list }: { list: string[] }) {
  if (list.length === 0) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="status">
      {list.map((n) => <p key={n}>{n}</p>)}
    </div>
  );
}

export function CartView({ flatFee, freeOver }: { flatFee: number; freeOver: number | null }) {
  const { lines, ready, subtotal, setQty, remove } = useCart();
  const notices = useCartSync();

  if (!ready) return <div className="panel h-40 animate-pulse" />;

  if (lines.length === 0) {
    return (
      <div>
        <Notices list={notices} />
        <div className="panel p-10 text-center">
        <p className="text-lg font-semibold">ตะกร้ายังว่างอยู่</p>
        <p className="mt-1 text-muted">เลือกสินค้าที่ชอบแล้วกด &quot;ใส่ตะกร้า&quot;</p>
        <Link href="/" className="btn btn-primary mt-6">เลือกซื้อสินค้า</Link>
        </div>
      </div>
    );
  }

  const fee = shippingFor(subtotal, flatFee, freeOver);
  const toFree = freeOver != null ? freeOver - subtotal : 0;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <div>
        <Notices list={notices} />
        <ul className="panel divide-y divide-line">
          {lines.map((l) => (
            <li key={l.productId} className="flex gap-4 p-4">
              <Link href={`/p/${l.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-paper">
                {l.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.image} alt="" className="h-full w-full object-cover" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/p/${l.slug}`} className="line-clamp-2 font-medium hover:underline">{l.name}</Link>
                <p className="text-sm text-muted">{formatBaht(l.price)}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-line">
                    <button className="h-8 w-8" onClick={() => setQty(l.productId, l.qty - 1)} aria-label="ลดจำนวน">−</button>
                    <span className="w-7 text-center text-sm font-semibold">{l.qty}</span>
                    <button
                      className="h-8 w-8 disabled:opacity-30"
                      onClick={() => setQty(l.productId, l.qty + 1)}
                      disabled={l.qty >= l.stock}
                      aria-label="เพิ่มจำนวน"
                    >
                      +
                    </button>
                  </div>
                  <button className="text-sm text-muted underline" onClick={() => remove(l.productId)}>ลบ</button>
                </div>
              </div>
              <p className="font-semibold">{formatBaht(l.price * l.qty)}</p>
            </li>
          ))}
        </ul>
      </div>

      <aside className="panel h-fit space-y-3 p-5">
        <div className="flex justify-between"><span>ยอดสินค้า</span><span>{formatBaht(subtotal)}</span></div>
        <div className="flex justify-between"><span>ค่าจัดส่ง</span><span>{fee === 0 ? "ฟรี" : formatBaht(fee)}</span></div>
        {fee > 0 && toFree > 0 && (
          <p className="text-sm text-muted">ซื้อเพิ่มอีก {formatBaht(toFree)} ส่งฟรี</p>
        )}
        <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
          <span>รวม</span><span>{formatBaht(subtotal + fee)}</span>
        </div>
        <Link href="/checkout" className="btn btn-primary w-full">ไปชำระเงิน</Link>
      </aside>
    </div>
  );
}
