"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProductsByIds } from "@/lib/repo/catalog";
import { getSettings } from "@/lib/repo/settings";
import { loginOrRegister, getCustomer, updateCustomerProfile } from "@/lib/repo/customers";
import { placeOrder, getOrderByNo, setOrderStatus, updateOrderFields } from "@/lib/repo/orders";
import { getProvider } from "@/lib/payments";
import { clearCustomerSession, getCustomerSession, setCustomerSession } from "@/lib/auth";
import { isValidThaiMobile, normalizePhone } from "@/lib/format";
import { db, BUCKET_SLIPS } from "@/lib/supabase";

// ---------------- Cart ----------------
/** Fresh price/stock for the cart so the customer sees changes before paying. */
export async function refreshCart(ids: string[]) {
  const products = await getProductsByIds(ids.slice(0, 100));
  return products.map((p) => ({
    productId: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: p.images[0] ?? null,
    stock: p.is_active ? p.stock : 0,
  }));
}

// ---------------- Login ----------------
export type LoginState = { error?: string } | undefined;

export async function loginAction(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const pin = String(form.get("pin") ?? "");
  if (!isValidThaiMobile(phone)) return { error: "กรุณากรอกเบอร์โทรให้ถูกต้อง เช่น 0812345678" };
  const r = await loginOrRegister(phone, pin);
  if (!r.ok) return { error: r.error };
  await setCustomerSession({ cid: r.customer.id, phone: r.customer.phone });
  const next = String(form.get("next") ?? "/account");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
}

export async function logoutAction() {
  await clearCustomerSession();
  redirect("/");
}

export async function saveProfileAction(_: unknown, form: FormData) {
  const s = await getCustomerSession();
  if (!s) return { error: "กรุณาเข้าสู่ระบบ" };
  await updateCustomerProfile(s.cid, String(form.get("name") ?? "").slice(0, 120), {
    line: String(form.get("address") ?? "").slice(0, 600),
  });
  revalidatePath("/account");
  return { ok: true };
}

// ---------------- Checkout ----------------
const CheckoutSchema = z.object({
  items: z.array(z.object({ product_id: z.string().uuid(), qty: z.number().int().min(1).max(99) })).min(1).max(50),
  name: z.string().trim().min(1, "กรุณากรอกชื่อผู้รับ").max(120),
  phone: z.string(),
  address: z.string().trim().min(10, "กรุณากรอกที่อยู่จัดส่งให้ครบ").max(600),
  note: z.string().max(500).optional(),
  pin: z.string().optional(),
  paymentMethod: z.string(),
});

export type CheckoutInput = z.infer<typeof CheckoutSchema>;
export type CheckoutResult = { ok: true; orderNo: string } | { ok: false; error: string; field?: string };

export async function checkoutAction(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = CheckoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  const data = parsed.data;
  const phone = normalizePhone(data.phone);
  if (!isValidThaiMobile(phone)) return { ok: false, error: "เบอร์โทรไม่ถูกต้อง", field: "phone" };

  const settings = await getSettings();
  const provider = getProvider(data.paymentMethod);
  if (!provider || !provider.isEnabled(settings)) {
    return { ok: false, error: "ช่องทางชำระเงินนี้ยังไม่เปิดใช้งาน", field: "paymentMethod" };
  }

  // Who is ordering? Logged-in customer, or phone + PIN (creates an account on first order)
  let session = await getCustomerSession();
  if (!session) {
    const r = await loginOrRegister(phone, data.pin ?? "");
    if (!r.ok) return { ok: false, error: r.error, field: "pin" };
    session = { cid: r.customer.id, phone: r.customer.phone };
    await setCustomerSession(session);
  }

  // Merge duplicate lines
  const merged = new Map<string, number>();
  for (const i of data.items) merged.set(i.product_id, (merged.get(i.product_id) ?? 0) + i.qty);

  const result = await placeOrder({
    customerId: session.cid,
    items: [...merged].map(([product_id, qty]) => ({ product_id, qty })),
    shipping: { name: data.name, phone, address: data.address, note: data.note },
    paymentMethod: provider.id,
    shippingFee: settings.shipping.flat_fee,
    freeOver: settings.shipping.free_over,
  });
  if (!result.ok) return { ok: false, error: result.error };

  // Remember name/address for next time
  const customer = await getCustomer(session.cid);
  if (customer && (!customer.name || !customer.address?.line)) {
    await updateCustomerProfile(session.cid, customer.name || data.name, {
      ...customer.address,
      line: customer.address?.line || data.address,
    });
  }

  revalidatePath("/", "layout");
  return { ok: true, orderNo: result.order.order_no };
}

// ---------------- Slip upload ----------------
async function ownOrder(orderNo: string) {
  const s = await getCustomerSession();
  if (!s) return null;
  const order = await getOrderByNo(orderNo);
  if (!order || order.customer_id !== s.cid) return null;
  return order;
}

const SLIP_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

/** Step 1: get a one-time upload URL. The browser uploads straight to storage. */
export async function createSlipUpload(orderNo: string, contentType: string) {
  const order = await ownOrder(orderNo);
  if (!order) return { ok: false as const, error: "ไม่พบคำสั่งซื้อ" };
  if (order.status !== "pending_payment") return { ok: false as const, error: "คำสั่งซื้อนี้ไม่ได้รอการชำระเงินแล้ว" };
  const ext = SLIP_TYPES[contentType];
  if (!ext) return { ok: false as const, error: "รองรับเฉพาะไฟล์รูป JPG, PNG, WEBP" };

  const path = `${order.id}/${Date.now()}.${ext}`;
  const { data, error } = await db().storage.from(BUCKET_SLIPS).createSignedUploadUrl(path);
  if (error) return { ok: false as const, error: "อัปโหลดไม่สำเร็จ กรุณาลองใหม่" };
  return { ok: true as const, bucket: BUCKET_SLIPS, path, token: data.token };
}

/** Step 2: after upload, attach the slip and move the order to "verifying". */
export async function confirmSlip(orderNo: string, path: string) {
  const order = await ownOrder(orderNo);
  if (!order) return { ok: false as const, error: "ไม่พบคำสั่งซื้อ" };
  if (!path.startsWith(`${order.id}/`)) return { ok: false as const, error: "ไฟล์ไม่ถูกต้อง" };
  if (order.status !== "pending_payment") return { ok: false as const, error: "คำสั่งซื้อนี้ไม่ได้รอการชำระเงินแล้ว" };

  await updateOrderFields(order.id, { slip_path: path });
  const r = await setOrderStatus(order.id, "verifying", "ลูกค้าอัปโหลดสลิป", "customer");
  if (!r.ok) return r;
  revalidatePath(`/order/${orderNo}`);
  return { ok: true as const };
}

export async function cancelOwnOrder(orderNo: string) {
  const order = await ownOrder(orderNo);
  if (!order || order.status !== "pending_payment") return { ok: false as const, error: "ยกเลิกไม่ได้" };
  const r = await setOrderStatus(order.id, "cancelled", "ลูกค้ายกเลิกเอง", "customer");
  revalidatePath(`/order/${orderNo}`);
  return r;
}
