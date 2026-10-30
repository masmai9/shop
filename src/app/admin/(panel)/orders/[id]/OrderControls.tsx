"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOrderStatusAction, saveOrderMetaAction, resetPinAction } from "../../../actions";
import { keepForm } from "@/lib/use-keep-form";
import { ADMIN_NEXT, ORDER_STATUSES, STATUS_INFO, type OrderStatus } from "@/lib/order-status";

export function StatusControls({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [manual, setManual] = useState<OrderStatus>(status);
  const [error, setError] = useState<string | null>(null);
  const quick = ADMIN_NEXT[status] ?? [];

  function go(to: OrderStatus, defaultNote?: string) {
    if (to === "cancelled" && !confirm("ยกเลิกออเดอร์นี้? สต๊อกจะถูกคืนอัตโนมัติ")) return;
    setError(null);
    start(async () => {
      const r = await updateOrderStatusAction(orderId, to, note || defaultNote || "");
      if (!r.ok) setError(r.error);
      else {
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {quick.length > 0 && (
        <div className="flex flex-col gap-2">
          {quick.map((a, i) => (
            <button
              key={a.to}
              className={`btn ${i === 0 ? "btn-primary" : "btn-ghost"}`}
              disabled={pending}
              onClick={() => go(a.to, a.note)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      <div>
        <label className="label" htmlFor="status-note">หมายเหตุถึงลูกค้า (ไม่บังคับ)</label>
        <input
          id="status-note"
          className="field"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น สลิปยอดไม่ตรง / ส่งด้วย Kerry"
        />
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">เปลี่ยนสถานะเอง</summary>
        <div className="mt-3 flex gap-2">
          <select className="field" value={manual} onChange={(e) => setManual(e.target.value as OrderStatus)}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_INFO[s].label}</option>
            ))}
          </select>
          <button className="btn btn-ghost" disabled={pending || manual === status} onClick={() => go(manual)}>
            บันทึก
          </button>
        </div>
      </details>
      {status !== "cancelled" && status !== "completed" && (
        <button className="text-sm text-danger underline" disabled={pending} onClick={() => go("cancelled")}>
          ยกเลิกออเดอร์ (คืนสต๊อก)
        </button>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}

export function MetaForm({ orderId, tracking, adminNote }: { orderId: string; tracking: string; adminNote: string }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={keepForm((f) =>
        start(async () => {
          await saveOrderMetaAction(orderId, String(f.get("tracking") ?? ""), String(f.get("note") ?? ""));
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }),
      )}
    >
      <div>
        <label className="label" htmlFor="tracking">เลขพัสดุ</label>
        <input id="tracking" name="tracking" defaultValue={tracking} className="field" />
        <p className="hint">ลูกค้าจะเห็นเลขนี้เมื่อสถานะเป็น &quot;จัดส่งแล้ว&quot;</p>
      </div>
      <div>
        <label className="label" htmlFor="note">โน้ตภายในร้าน</label>
        <textarea id="note" name="note" defaultValue={adminNote} className="field" />
        <p className="hint">ลูกค้าไม่เห็น</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost btn-sm" disabled={pending}>บันทึก</button>
        {saved && <span className="text-sm text-ok">บันทึกแล้ว</span>}
      </div>
    </form>
  );
}

export function ResetPin({ customerId }: { customerId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <button
      className="text-sm underline"
      onClick={async () => {
        const pin = prompt("ตั้ง PIN ใหม่ให้ลูกค้า (ตัวเลข 4 หลัก)");
        if (!pin) return;
        const r = await resetPinAction(customerId, pin);
        setMsg(r.ok ? "รีเซ็ต PIN แล้ว แจ้งลูกค้าได้เลย" : r.error);
      }}
    >
      {msg ?? "ลูกค้าลืม PIN? รีเซ็ตให้"}
    </button>
  );
}
