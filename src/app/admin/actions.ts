"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { timingSafeEqual, createHash } from "crypto";
import { z } from "zod";
import { db, BUCKET_PRODUCTS } from "@/lib/supabase";
import { clearAdminSession, requireAdmin, setAdminSession } from "@/lib/auth";
import { setOrderStatus, updateOrderFields } from "@/lib/repo/orders";
import { resetCustomerPin } from "@/lib/repo/customers";
import { saveSetting, type Settings } from "@/lib/repo/settings";
import { isOrderStatus } from "@/lib/order-status";
import { slugify, randomSuffix } from "@/lib/format";

// ---------------- Auth ----------------
function samePassword(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function adminLogin(_: unknown, form: FormData) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { error: "ยังไม่ได้ตั้ง ADMIN_PASSWORD ในค่า environment" };
  const pw = String(form.get("password") ?? "");
  if (!samePassword(pw, expected)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }
  await setAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin/login");
}

// ---------------- Orders ----------------
export async function updateOrderStatusAction(orderId: string, status: string, note: string) {
  await requireAdmin();
  if (!isOrderStatus(status)) return { ok: false as const, error: "สถานะไม่ถูกต้อง" };
  const r = await setOrderStatus(orderId, status, note.trim() || null, "admin");
  revalidatePath("/admin", "layout");
  return r;
}

export async function saveOrderMetaAction(orderId: string, tracking: string, adminNote: string) {
  await requireAdmin();
  await updateOrderFields(orderId, {
    tracking_no: tracking.trim() || null,
    admin_note: adminNote.trim() || null,
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true as const };
}

export async function resetPinAction(customerId: string, pin: string) {
  await requireAdmin();
  try {
    await resetCustomerPin(customerId, pin);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

// ---------------- Uploads (product images, category banners) ----------------
const IMG_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

export async function createImageUpload(folder: "products" | "banners", contentType: string) {
  await requireAdmin();
  const ext = IMG_TYPES[contentType];
  if (!ext) return { ok: false as const, error: "รองรับ JPG, PNG, WEBP, GIF, AVIF" };
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await db().storage.from(BUCKET_PRODUCTS).createSignedUploadUrl(path);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, bucket: BUCKET_PRODUCTS, path, token: data.token };
}

// ---------------- Products ----------------
const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid({ message: "กรุณาเลือกหมวดสินค้า" }),
  name: z.string().trim().min(1, "กรุณากรอกชื่อสินค้า").max(200),
  slug: z.string().trim().max(120).optional(),
  summary: z.string().max(300).default(""),
  description: z.string().max(10000).default(""),
  price: z.number({ message: "กรุณากรอกราคา" }).min(0),
  compare_at_price: z.number().min(0).nullable(),
  stock: z.number().int().min(0, "สต๊อกติดลบไม่ได้"),
  low_stock_alert: z.number().int().min(0).default(3),
  sku: z.string().max(80).nullable(),
  images: z.array(z.string()).max(12),
  specs: z.record(z.string(), z.string()),
  is_active: z.boolean(),
  is_featured: z.boolean(),
});
export type ProductInput = z.input<typeof ProductSchema>;

export async function saveProductAction(input: ProductInput) {
  await requireAdmin();
  const parsed = ProductSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { id, ...data } = parsed.data;

  let slug = data.slug ? slugify(data.slug) : "";
  if (!slug) slug = [slugify(data.name) || "item", randomSuffix()].join("-");

  const row = { ...data, slug, updated_at: new Date().toISOString() };
  const q = id
    ? db().from("products").update(row).eq("id", id).select("id").single()
    : db().from("products").insert(row).select("id").single();
  const { data: saved, error } = await q;
  if (error) {
    if (error.code === "23505") return { ok: false as const, error: "ลิงก์สินค้า (slug) นี้ถูกใช้แล้ว ลองเปลี่ยน" };
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true as const, id: saved.id as string };
}

export async function adjustStockAction(productId: string, delta: number) {
  await requireAdmin();
  const { data, error } = await db().from("products").select("stock").eq("id", productId).single();
  if (error) return { ok: false as const, error: error.message };
  const next = Math.max(0, data.stock + delta);
  await db().from("products").update({ stock: next, updated_at: new Date().toISOString() }).eq("id", productId);
  revalidatePath("/", "layout");
  return { ok: true as const, stock: next };
}

export async function deleteProductAction(productId: string) {
  await requireAdmin();
  // Orders keep their own copy of name/price, so deleting is safe.
  const { error } = await db().from("products").delete().eq("id", productId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

// ---------------- Categories ----------------
const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "กรุณากรอกชื่อหมวด").max(80),
  slug: z.string().trim().min(1, "กรุณากรอกลิงก์หมวด").max(60),
  tagline: z.string().max(200).default(""),
  description: z.string().max(1000).default(""),
  theme: z.object({
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    ink: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    motif: z.enum(["music", "watch", "circuit", "plain"]),
  }),
  banner_url: z.string().nullable(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});
export type CategoryInput = z.input<typeof CategorySchema>;

export async function saveCategoryAction(input: CategoryInput) {
  await requireAdmin();
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { id, ...data } = parsed.data;
  const slug = slugify(data.slug);
  if (!slug) return { ok: false as const, error: "ลิงก์หมวดต้องเป็นภาษาอังกฤษหรือตัวเลข เช่น music" };
  const row = { ...data, slug };
  const { error } = id
    ? await db().from("categories").update(row).eq("id", id)
    : await db().from("categories").insert(row);
  if (error) {
    if (error.code === "23505") return { ok: false as const, error: "ลิงก์หมวดนี้ถูกใช้แล้ว" };
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteCategoryAction(id: string) {
  await requireAdmin();
  const { count } = await db().from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count && count > 0) return { ok: false as const, error: `ยังมีสินค้า ${count} รายการในหมวดนี้ ย้ายหรือลบก่อน` };
  const { error } = await db().from("categories").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// ---------------- Settings ----------------
export async function saveSettingsAction(_: unknown, form: FormData) {
  await requireAdmin();
  const ppId = String(form.get("pp_id") ?? "").replace(/\D/g, "");
  if (ppId && ![10, 13, 15].includes(ppId.length)) {
    return { error: "พร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตร/เลขผู้เสียภาษี 13 หลัก" };
  }
  const freeOverRaw = String(form.get("free_over") ?? "").trim();

  const shop: Settings["shop"] = {
    name: String(form.get("shop_name") ?? "").trim() || "ร้านของเรา",
    tagline: String(form.get("tagline") ?? "").trim(),
    contact_phone: String(form.get("contact_phone") ?? "").trim(),
    line_id: String(form.get("line_id") ?? "").trim(),
    address: String(form.get("address") ?? "").trim(),
  };
  const promptpay: Settings["promptpay"] = {
    enabled: form.get("pp_enabled") === "on",
    id: ppId,
    account_name: String(form.get("pp_name") ?? "").trim(),
  };
  const shipping: Settings["shipping"] = {
    flat_fee: Math.max(0, Number(form.get("flat_fee") ?? 0) || 0),
    free_over: freeOverRaw === "" ? null : Math.max(0, Number(freeOverRaw) || 0),
  };

  await Promise.all([saveSetting("shop", shop), saveSetting("promptpay", promptpay), saveSetting("shipping", shipping)]);
  revalidatePath("/", "layout");
  return { ok: true };
}
