"use client";

import { useRef, useState } from "react";
import { createImageUpload } from "../actions";
import { uploadSigned } from "@/lib/supabase-browser";
import { imageUrl } from "@/lib/images";

const MAX_MB = 8;

/** Upload one file to storage and return its path. */
export async function uploadImage(file: File, folder: "products" | "banners") {
  if (!file.type.startsWith("image/")) throw new Error("กรุณาเลือกไฟล์รูปภาพ");
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`รูปใหญ่เกิน ${MAX_MB}MB`);
  const target = await createImageUpload(folder, file.type);
  if (!target.ok) throw new Error(target.error);
  await uploadSigned(target, file);
  return target.path;
}

/** Multi-image field: upload, reorder (first = cover), remove. Value = storage paths. */
export function ImageUploader({ value, onChange, max = 12 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const list = Array.from(files).slice(0, max - value.length);
    setBusy(list.length);
    const added: string[] = [];
    for (const f of list) {
      try {
        added.push(await uploadImage(f, "products"));
      } catch (e) {
        setError((e as Error).message);
      }
      setBusy((b) => b - 1);
    }
    onChange([...value, ...added]);
    if (input.current) input.current.value = "";
  }

  const move = (i: number, d: number) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((path, i) => (
          <div key={path} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(path)!} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-base px-1.5 text-xs text-white">ปก</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 p-1 text-white">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-2 disabled:opacity-30" aria-label="เลื่อนไปก่อน">‹</button>
              <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="px-2 text-xs" aria-label="ลบรูป">ลบ</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="px-2 disabled:opacity-30" aria-label="เลื่อนไปหลัง">›</button>
            </div>
          </div>
        ))}
        {Array.from({ length: busy }, (_, i) => (
          <div key={`b${i}`} className="aspect-square animate-pulse rounded-lg bg-line" aria-label="กำลังอัปโหลด" />
        ))}
        {value.length + busy < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-sm text-muted hover:border-base"
          >
            <span className="text-2xl leading-none">+</span>
            เพิ่มรูป
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} aria-label="เลือกรูปสินค้า" />
      <p className="hint">รูปแรกคือรูปปก · เลือกได้หลายรูปพร้อมกัน · ไม่เกิน {MAX_MB}MB ต่อรูป</p>
      {error && <p className="mt-1 text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
