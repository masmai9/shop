"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProductAction, deleteProductAction } from "../../actions";
import { ImageUploader } from "../ImageUploader";

type Cat = { id: string; name: string };
export type ProductFormValue = {
  id?: string;
  category_id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  price: string;
  compare_at_price: string;
  stock: string;
  low_stock_alert: string;
  sku: string;
  images: string[];
  specs: { k: string; v: string }[];
  is_active: boolean;
  is_featured: boolean;
};

/** Suggested spec fields per category slug — edit freely. */
const SPEC_HINTS: Record<string, string[]> = {
  music: ["ยี่ห้อ", "รุ่น", "วัสดุ", "ขนาด", "อุปกรณ์ที่ให้มา"],
  watches: ["ยี่ห้อ", "ระบบกลไก", "ขนาดหน้าปัด", "วัสดุสาย", "กันน้ำ"],
  gadget: ["ยี่ห้อ", "รุ่น", "การเชื่อมต่อ", "แบตเตอรี่", "ประกัน"],
};

export function ProductForm({ initial, categories, catSlugs }: { initial: ProductFormValue; categories: Cat[]; catSlugs: Record<string, string> }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((s) => ({ ...s, [k]: val }));

  const hints = SPEC_HINTS[catSlugs[v.category_id]] ?? [];
  const missingHints = hints.filter((h) => !v.specs.some((s) => s.k === h));

  function save() {
    setError(null);
    start(async () => {
      const r = await saveProductAction({
        id: v.id,
        category_id: v.category_id,
        name: v.name,
        slug: v.slug || undefined,
        summary: v.summary,
        description: v.description,
        price: v.price === "" ? NaN : Number(v.price),
        compare_at_price: v.compare_at_price === "" ? null : Number(v.compare_at_price),
        stock: Number(v.stock || 0),
        low_stock_alert: Number(v.low_stock_alert || 0),
        sku: v.sku || null,
        images: v.images,
        specs: Object.fromEntries(v.specs.filter((s) => s.k.trim() && s.v.trim()).map((s) => [s.k.trim(), s.v.trim()])),
        is_active: v.is_active,
        is_featured: v.is_featured,
      });
      if (!r.ok) return setError(r.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (!v.id) router.replace(`/admin/products/${r.id}`);
      else router.refresh();
    });
  }

  return (
    <form action={save} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <section className="panel space-y-4 p-5">
          <div>
            <label className="label" htmlFor="name">ชื่อสินค้า</label>
            <input id="name" className="field" value={v.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="summary">คำอธิบายสั้น</label>
            <input id="summary" className="field" value={v.summary} onChange={(e) => set("summary", e.target.value)} placeholder="1 บรรทัด แสดงใต้ชื่อสินค้า" />
          </div>
          <div>
            <label className="label" htmlFor="description">รายละเอียดสินค้า</label>
            <textarea id="description" className="field min-h-40" value={v.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 font-semibold">รูปสินค้า</h2>
          <ImageUploader value={v.images} onChange={(imgs) => set("images", imgs)} />
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">คุณสมบัติสินค้า</h2>
          <p className="hint -mt-2">แสดงเป็นตารางในหน้าสินค้า เพิ่มหัวข้ออะไรก็ได้</p>
          {v.specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="field w-2/5"
                placeholder="หัวข้อ"
                value={s.k}
                onChange={(e) => set("specs", v.specs.map((x, k) => (k === i ? { ...x, k: e.target.value } : x)))}
                aria-label="หัวข้อคุณสมบัติ"
              />
              <input
                className="field flex-1"
                placeholder="รายละเอียด"
                value={s.v}
                onChange={(e) => set("specs", v.specs.map((x, k) => (k === i ? { ...x, v: e.target.value } : x)))}
                aria-label="รายละเอียดคุณสมบัติ"
              />
              <button type="button" className="px-2 text-muted" onClick={() => set("specs", v.specs.filter((_, k) => k !== i))} aria-label="ลบแถว">✕</button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("specs", [...v.specs, { k: "", v: "" }])}>เพิ่มแถว</button>
            {missingHints.map((h) => (
              <button key={h} type="button" className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted hover:border-base" onClick={() => set("specs", [...v.specs, { k: h, v: "" }])}>
                + {h}
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="panel space-y-4 p-5">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={v.is_active} onChange={(e) => set("is_active", e.target.checked)} />
            <span>แสดงในหน้าร้าน</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={v.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
            <span>สินค้าแนะนำ</span>
          </label>
          <div>
            <label className="label" htmlFor="category">หมวดสินค้า</label>
            <select id="category" className="field" value={v.category_id} onChange={(e) => set("category_id", e.target.value)} required>
              <option value="" disabled>เลือกหมวด</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </section>

        <section className="panel space-y-4 p-5">
          <div>
            <label className="label" htmlFor="price">ราคาขาย (บาท)</label>
            <input id="price" type="number" inputMode="decimal" min="0" step="0.01" className="field" value={v.price} onChange={(e) => set("price", e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="compare">ราคาก่อนลด (ถ้ามี)</label>
            <input id="compare" type="number" inputMode="decimal" min="0" step="0.01" className="field" value={v.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} />
            <p className="hint">ใส่เมื่อต้องการโชว์ราคาขีดฆ่า</p>
          </div>
        </section>

        <section className="panel space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="stock">สต๊อก</label>
              <input id="stock" type="number" inputMode="numeric" min="0" className="field" value={v.stock} onChange={(e) => set("stock", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="low">เตือนเมื่อเหลือ</label>
              <input id="low" type="number" inputMode="numeric" min="0" className="field" value={v.low_stock_alert} onChange={(e) => set("low_stock_alert", e.target.value)} />
            </div>
          </div>
          <p className="hint -mt-2">สต๊อกจะลดเองเมื่อมีคนสั่ง และคืนเองเมื่อยกเลิกออเดอร์</p>
          <div>
            <label className="label" htmlFor="sku">รหัสสินค้า (SKU)</label>
            <input id="sku" className="field" value={v.sku} onChange={(e) => set("sku", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="slug">ลิงก์สินค้า</label>
            <input id="slug" className="field" value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder="สร้างให้อัตโนมัติ" />
          </div>
        </section>

        <div className="space-y-2 lg:sticky lg:top-6">
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-danger" role="alert">{error}</p>}
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "กำลังบันทึก…" : saved ? "บันทึกแล้ว" : v.id ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
          </button>
          {v.id && (
            <button
              type="button"
              className="w-full py-2 text-sm text-danger underline"
              onClick={async () => {
                if (!confirm(`ลบ "${v.name}"? ออเดอร์เก่ายังเก็บข้อมูลไว้ครบ`)) return;
                const r = await deleteProductAction(v.id!);
                if (r && !r.ok) setError(r.error);
              }}
            >
              ลบสินค้า
            </button>
          )}
        </div>
      </aside>
    </form>
  );
}
