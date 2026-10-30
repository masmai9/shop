import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/supabase";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type Customer = {
  id: string;
  phone: string;
  name: string;
  address: { line?: string; [k: string]: unknown };
};

export type LoginResult =
  | { ok: true; customer: Customer; isNew: boolean }
  | { ok: false; error: string };

/**
 * One step "log in or sign up": if the phone is new, create the account with
 * this PIN; otherwise check the PIN. Locks for 15 min after 5 wrong PINs.
 */
export async function loginOrRegister(phone: string, pin: string): Promise<LoginResult> {
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "PIN ต้องเป็นตัวเลข 4 หลัก" };

  const { data: existing, error } = await db()
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!existing) {
    const pin_hash = await bcrypt.hash(pin, 10);
    const { data, error: insErr } = await db()
      .from("customers")
      .insert({ phone, pin_hash })
      .select("id, phone, name, address")
      .single();
    if (insErr) {
      // Race: someone created the same phone a moment ago → treat as login
      if (insErr.code === "23505") return loginOrRegister(phone, pin);
      throw new Error(insErr.message);
    }
    return { ok: true, customer: data as Customer, isNew: true };
  }

  if (existing.locked_until && new Date(existing.locked_until) > new Date()) {
    return { ok: false, error: `ใส่ PIN ผิดหลายครั้ง กรุณารอ ${LOCK_MINUTES} นาทีแล้วลองใหม่` };
  }

  const match = await bcrypt.compare(pin, existing.pin_hash);
  if (!match) {
    const attempts = existing.failed_attempts + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await db()
      .from("customers")
      .update({
        failed_attempts: lock ? 0 : attempts,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", existing.id);
    return {
      ok: false,
      error: lock
        ? `ใส่ PIN ผิด ${MAX_ATTEMPTS} ครั้ง ล็อกไว้ ${LOCK_MINUTES} นาที`
        : `PIN ไม่ถูกต้อง (เหลืออีก ${MAX_ATTEMPTS - attempts} ครั้ง) — ถ้าลืม PIN ติดต่อร้านเพื่อรีเซ็ต`,
    };
  }

  if (existing.failed_attempts > 0 || existing.locked_until) {
    await db().from("customers").update({ failed_attempts: 0, locked_until: null }).eq("id", existing.id);
  }
  const { id, name, address } = existing;
  return { ok: true, customer: { id, phone, name, address }, isNew: false };
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await db()
    .from("customers")
    .select("id, phone, name, address")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Customer | null;
}

export async function updateCustomerProfile(id: string, name: string, address: Customer["address"]) {
  const { error } = await db().from("customers").update({ name, address }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Admin: reset a forgotten PIN. */
export async function resetCustomerPin(id: string, pin: string) {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN ต้องเป็นตัวเลข 4 หลัก");
  const pin_hash = await bcrypt.hash(pin, 10);
  const { error } = await db()
    .from("customers")
    .update({ pin_hash, failed_attempts: 0, locked_until: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
