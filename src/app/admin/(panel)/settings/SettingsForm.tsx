"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "../../actions";
import type { Settings } from "@/lib/repo/settings";
import { keepForm } from "@/lib/use-keep-form";

export function SettingsForm({ s }: { s: Settings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  return (
    <form onSubmit={keepForm(action)} className="max-w-2xl space-y-6">
      <section className="panel space-y-4 p-5">
        <h2 className="font-semibold">ข้อมูลร้าน</h2>
        <div>
          <label className="label" htmlFor="shop_name">ชื่อร้าน</label>
          <input id="shop_name" name="shop_name" defaultValue={s.shop.name} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="tagline">ข้อความใต้หัวข้อหน้าแรก</label>
          <input id="tagline" name="tagline" defaultValue={s.shop.tagline} className="field" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="contact_phone">เบอร์ติดต่อร้าน</label>
            <input id="contact_phone" name="contact_phone" defaultValue={s.shop.contact_phone} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="line_id">LINE ID</label>
            <input id="line_id" name="line_id" defaultValue={s.shop.line_id} className="field" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">ที่อยู่ร้าน</label>
          <textarea id="address" name="address" defaultValue={s.shop.address} className="field" />
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="font-semibold">รับเงินด้วย QR พร้อมเพย์</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="pp_enabled" defaultChecked={s.promptpay.enabled} />
          เปิดรับชำระด้วย QR
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pp_id">เบอร์ / เลขพร้อมเพย์</label>
            <input id="pp_id" name="pp_id" inputMode="numeric" defaultValue={s.promptpay.id} className="field" placeholder="0812345678" />
            <p className="hint">เบอร์มือถือ 10 หลัก หรือเลขบัตร ปชช./ผู้เสียภาษี 13 หลัก</p>
          </div>
          <div>
            <label className="label" htmlFor="pp_name">ชื่อบัญชี</label>
            <input id="pp_name" name="pp_name" defaultValue={s.promptpay.account_name} className="field" />
            <p className="hint">ให้ลูกค้าเช็กก่อนโอน</p>
          </div>
        </div>
        <p className="text-sm text-muted">บัตรเครดิต: โค้ดเตรียมช่องไว้แล้ว เปิดใช้ได้เมื่อเลือกผู้ให้บริการ (ดู README)</p>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="font-semibold">ค่าจัดส่ง</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="flat_fee">ค่าส่ง (บาท / ออเดอร์)</label>
            <input id="flat_fee" name="flat_fee" type="number" min="0" defaultValue={s.shipping.flat_fee} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="free_over">ส่งฟรีเมื่อซื้อครบ (บาท)</label>
            <input id="free_over" name="free_over" type="number" min="0" defaultValue={s.shipping.free_over ?? ""} className="field" />
            <p className="hint">เว้นว่างถ้าไม่มีส่งฟรี</p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}</button>
        {state && "ok" in state && <span className="text-sm text-ok">บันทึกแล้ว</span>}
        {state && "error" in state && <span className="text-sm text-danger" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
