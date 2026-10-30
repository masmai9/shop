"use client";

import { useActionState } from "react";
import { saveProfileAction } from "../actions";
import { keepForm } from "@/lib/use-keep-form";

export function ProfileForm({ name, address }: { name: string; address: string }) {
  const [state, action, pending] = useActionState(saveProfileAction, undefined);
  return (
    <form onSubmit={keepForm(action)} className="space-y-3">
      <div>
        <label className="label" htmlFor="pf-name">ชื่อผู้รับ</label>
        <input id="pf-name" name="name" defaultValue={name} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="pf-address">ที่อยู่จัดส่ง</label>
        <textarea id="pf-address" name="address" defaultValue={address} className="field" />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost btn-sm" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกที่อยู่"}</button>
        {state && "ok" in state && <span className="text-sm text-ok">บันทึกแล้ว</span>}
      </div>
    </form>
  );
}
