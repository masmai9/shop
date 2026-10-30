"use client";

import { useState, useTransition } from "react";
import { adjustStockAction } from "../../actions";

export function StockStepper({ productId, stock, low }: { productId: string; stock: number; low: number }) {
  const [value, setValue] = useState(stock);
  const [pending, start] = useTransition();
  const change = (d: number) =>
    start(async () => {
      const r = await adjustStockAction(productId, d);
      if (r.ok) setValue(r.stock);
    });
  const tone = value === 0 ? "text-danger" : value <= low ? "text-amber-700" : "";
  return (
    <div className="inline-flex items-center rounded-full border border-line" aria-busy={pending}>
      <button className="h-8 w-8 disabled:opacity-30" disabled={pending || value === 0} onClick={() => change(-1)} aria-label="ลดสต๊อก">−</button>
      <span className={`w-10 text-center font-semibold ${tone}`}>{value}</span>
      <button className="h-8 w-8 disabled:opacity-30" disabled={pending} onClick={() => change(1)} aria-label="เพิ่มสต๊อก">+</button>
    </div>
  );
}
