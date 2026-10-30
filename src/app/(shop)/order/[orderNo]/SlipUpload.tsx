"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createSlipUpload, confirmSlip, cancelOwnOrder } from "../../actions";
import { uploadSigned } from "@/lib/supabase-browser";

const MAX_MB = 8;

export function SlipUpload({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("กรุณาเลือกไฟล์รูปภาพ");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`ไฟล์ใหญ่เกิน ${MAX_MB}MB`);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function send() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const target = await createSlipUpload(orderNo, file.type);
      if (!target.ok) throw new Error(target.error);
      await uploadSigned(target, file);
      const done = await confirmSlip(orderNo, target.path);
      if (!done.ok) throw new Error(done.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
        aria-label="เลือกรูปสลิป"
      />
      {preview ? (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="สลิปที่เลือก" className="h-28 w-20 rounded-lg border border-line object-cover" />
          <button type="button" className="text-sm underline" onClick={() => input.current?.click()} disabled={busy}>
            เปลี่ยนรูป
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-paper p-6 text-sm hover:border-base"
        >
          <span className="font-semibold">แตะเพื่อเลือกรูปสลิป</span>
          <span className="text-muted">JPG / PNG ไม่เกิน {MAX_MB}MB</span>
        </button>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button type="button" className="btn btn-primary w-full" onClick={send} disabled={!file || busy}>
        {busy ? "กำลังส่งสลิป…" : "ส่งสลิป"}
      </button>
    </div>
  );
}

export function CancelOrderButton({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="text-sm text-muted underline disabled:opacity-50"
      disabled={busy}
      onClick={async () => {
        if (!confirm("ยกเลิกคำสั่งซื้อนี้?")) return;
        setBusy(true);
        await cancelOwnOrder(orderNo);
        router.refresh();
        setBusy(false);
      }}
    >
      ยกเลิกคำสั่งซื้อ
    </button>
  );
}
