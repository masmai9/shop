"use client";

import { useActionState } from "react";
import { adminLogin } from "../actions";
import { keepForm } from "@/lib/use-keep-form";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(adminLogin, undefined);
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={keepForm(action)} className="panel w-full max-w-sm space-y-4 p-6">
        <h1 className="text-2xl font-bold">หลังบ้าน</h1>
        <div>
          <label className="label" htmlFor="password">รหัสผ่าน</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="field" autoFocus />
        </div>
        {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
      </form>
    </div>
  );
}
