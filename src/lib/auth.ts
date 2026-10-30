import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const CUSTOMER_COOKIE = "shop_customer";
const ADMIN_COOKIE = "shop_admin";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร");
  return new TextEncoder().encode(s);
}

async function sign(payload: Record<string, unknown>, days: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

async function verify<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

// ---------- Customer ----------
export type CustomerSession = { cid: string; phone: string };

export async function setCustomerSession(s: CustomerSession) {
  const token = await sign({ ...s, role: "customer" }, 90);
  (await cookies()).set(CUSTOMER_COOKIE, token, { ...cookieBase, maxAge: 60 * 60 * 24 * 90 });
}

export async function getCustomerSession() {
  const p = await verify<CustomerSession & { role: string }>(
    (await cookies()).get(CUSTOMER_COOKIE)?.value,
  );
  return p?.role === "customer" ? { cid: p.cid, phone: p.phone } : null;
}

export async function clearCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

// ---------- Admin ----------
export async function setAdminSession() {
  const token = await sign({ role: "admin" }, 7);
  (await cookies()).set(ADMIN_COOKIE, token, { ...cookieBase, maxAge: 60 * 60 * 24 * 7 });
}

export async function isAdmin() {
  const p = await verify<{ role: string }>((await cookies()).get(ADMIN_COOKIE)?.value);
  return p?.role === "admin";
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export const ADMIN_COOKIE_NAME = ADMIN_COOKIE;
