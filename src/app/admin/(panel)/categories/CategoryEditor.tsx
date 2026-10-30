"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCategoryAction, deleteCategoryAction, type CategoryInput } from "../../actions";
import { uploadImage } from "../ImageUploader";
import { Motif, themeStyle } from "@/components/Motif";
import { imageUrl } from "@/lib/images";
import type { CategoryTheme } from "@/lib/repo/catalog";

const MOTIFS: { id: CategoryTheme["motif"]; label: string }[] = [
  { id: "music", label: "ดนตรี (คลื่นเสียง)" },
  { id: "watch", label: "นาฬิกา (หน้าปัด)" },
  { id: "circuit", label: "เทค (ลายวงจร)" },
  { id: "plain", label: "เส้นเรียบ" },
];

/** Ready-made palettes so the admin doesn't have to pick hex values. */
const PRESETS: { name: string; theme: Omit<CategoryTheme, "motif"> }[] = [
  { name: "ทองเหลือง", theme: { accent: "#B07A2A", surface: "#F6EFE3", ink: "#2B1E12" } },
  { name: "น้ำเงินเข้ม", theme: { accent: "#1F3A5F", surface: "#E9EEF4", ink: "#0E1B2C" } },
  { name: "ฟ้าไฟฟ้า", theme: { accent: "#2563EB", surface: "#E8EEFB", ink: "#0B1530" } },
  { name: "เขียวป่า", theme: { accent: "#2F6B4F", surface: "#E7F0EA", ink: "#0F2219" } },
  { name: "แดงไวน์", theme: { accent: "#8E2C3A", surface: "#F5E8EA", ink: "#2A0E13" } },
  { name: "กราไฟต์", theme: { accent: "#3F4652", surface: "#E9EAEC", ink: "#15181D" } },
];

export function CategoryEditor({ initial, isNew = false }: { initial: CategoryInput; isNew?: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [open, setOpen] = useState(isNew);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const theme = v.theme as CategoryTheme;
  const setTheme = (t: Partial<CategoryTheme>) => setV((s) => ({ ...s, theme: { ...s.theme, ...t } }));
  const bannerSrc = imageUrl(v.banner_url);

  const preview = (
    <div className="room flex min-h-56 flex-col justify-end p-5" style={themeStyle(theme)}>
      {bannerSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bannerSrc} alt="" className="room-banner" />
      )}
      <div className="room-motif"><Motif kind={theme.motif} className="h-full w-full" /></div>
      <div className="room-veil" />
      <p className="font-display text-3xl font-bold">{v.name || "ชื่อหมวด"}</p>
      <p className="text-sm opacity-80">{v.tagline}</p>
    </div>
  );

  if (!open) {
    return (
      <div className="panel overflow-hidden">
        <div className="grid sm:grid-cols-[14rem_1fr]">
          <div className="p-3">{preview}</div>
          <div className="flex flex-col justify-between gap-3 p-5">
            <div>
              <p className="font-semibold">{v.name} {!v.is_active && <span className="status-pill tone-done ml-2">ซ่อน</span>}</p>
              <p className="text-sm text-muted">/c/{v.slug} · ลำดับ {v.sort_order}</p>
              <p className="mt-2 line-clamp-2 text-sm">{v.description}</p>
            </div>
            <button className="btn btn-ghost btn-sm w-fit" onClick={() => setOpen(true)}>แก้ไขหมวดและธีม</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      className="panel grid gap-6 p-5 lg:grid-cols-[1fr_18rem]"
      action={() =>
        start(async () => {
          setError(null);
          const r = await saveCategoryAction(v);
          if (!r.ok) return setError(r.error);
          if (isNew) setV(initial);
          setOpen(isNew);
          router.refresh();
        })
      }
    >
      <div className="space-y-4">
        <h2 className="font-semibold">{isNew ? "เพิ่มหมวดใหม่" : `แก้ไข ${initial.name}`}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">ชื่อหมวด</label>
            <input className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">ลิงก์หมวด</label>
            <input className="field" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} required placeholder="เช่น music" />
            <p className="hint">ภาษาอังกฤษ ใช้เป็น /c/ลิงก์</p>
          </div>
        </div>
        <div>
          <label className="label">ข้อความบนแบนเนอร์</label>
          <input className="field" value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} />
        </div>
        <div>
          <label className="label">คำอธิบายหมวด</label>
          <textarea className="field" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </div>

        <fieldset>
          <legend className="label">ชุดสี</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setTheme(p.theme)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${theme.accent === p.theme.accent ? "border-base" : "border-line"}`}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: p.theme.accent, boxShadow: `0 0 0 3px ${p.theme.surface}` }} />
                {p.name}
              </button>
            ))}
          </div>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-muted">กำหนดสีเอง</summary>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {(["accent", "surface", "ink"] as const).map((k) => (
                <label key={k} className="text-sm">
                  <span className="block text-muted">{k === "accent" ? "สีหลัก" : k === "surface" ? "สีพื้น" : "สีตัวอักษร"}</span>
                  <input type="color" value={theme[k]} onChange={(e) => setTheme({ [k]: e.target.value.toUpperCase() })} className="h-10 w-full" />
                </label>
              ))}
            </div>
          </details>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">ลวดลาย</label>
            <select className="field" value={theme.motif} onChange={(e) => setTheme({ motif: e.target.value as CategoryTheme["motif"] })}>
              {MOTIFS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ลำดับการแสดง</label>
            <input type="number" className="field" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })} />
          </div>
        </div>

        <div>
          <label className="label">รูปแบนเนอร์ (ไม่บังคับ)</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn btn-ghost btn-sm cursor-pointer">
              {uploading ? "กำลังอัปโหลด…" : bannerSrc ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  try {
                    const path = await uploadImage(f, "banners");
                    setV((s) => ({ ...s, banner_url: path }));
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            {bannerSrc && (
              <button type="button" className="text-sm underline" onClick={() => setV({ ...v, banner_url: null })}>ใช้ลวดลายแทน</button>
            )}
          </div>
          <p className="hint">ถ้ามีรูป จะแสดงรูปแทนลวดลาย แนะนำรูปแนวตั้งหรือจัตุรัส</p>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} />
          แสดงหมวดนี้ในหน้าร้าน
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">ตัวอย่าง</p>
        {preview}
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={pending || uploading}>{pending ? "กำลังบันทึก…" : isNew ? "เพิ่มหมวด" : "บันทึก"}</button>
        {!isNew && (
          <div className="flex justify-between">
            <button type="button" className="text-sm underline" onClick={() => { setV(initial); setOpen(false); }}>ยกเลิก</button>
            <button
              type="button"
              className="text-sm text-danger underline"
              onClick={async () => {
                if (!confirm(`ลบหมวด "${initial.name}"?`)) return;
                const r = await deleteCategoryAction(initial.id!);
                if (!r.ok) setError(r.error);
                else router.refresh();
              }}
            >
              ลบหมวด
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
