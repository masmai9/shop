"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";
import { keepForm } from "@/lib/use-keep-form";

export function LoginForm({ next = "/account" }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  return (
    <form onSubmit={keepForm(action)} className="panel space-y-4 p-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="login-phone">เบอร์โทรศัพท์</label>
        <input id="login-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className="field" placeholder="0812345678" />
      </div>
      <div>
        <label className="label" htmlFor="login-pin">PIN 4 หลัก</label>
        <input
          id="login-pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
          className="field tracking-[0.5em]"
        />
        <p className="hint">ยังไม่เคยสั่ง? ตั้ง PIN ใหม่ได้เลย ระบบจะสร้างบัญชีให้</p>
      </div>
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
