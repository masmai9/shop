import "server-only";
import { db, BUCKET_SLIPS } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/order-status";

export type ShippingInfo = { name: string; phone: string; address: string; note?: string };

export type OrderItem = {
  id: string;
  product_id: string | null;
  name: string;
  image: string | null;
  unit_price: number;
  qty: number;
  line_total: number;
};

export type OrderEvent = { id: number; status: OrderStatus; note: string | null; actor: string; created_at: string };

export type Order = {
  id: string;
  order_no: string;
  customer_id: string;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: string;
  payment_ref: string | null;
  slip_path: string | null;
  shipping: ShippingInfo;
  tracking_no: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderDetail = Order & {
  items: OrderItem[];
  events: OrderEvent[];
  customer?: { phone: string; name: string };
};

const num = (o: Record<string, unknown>) => ({
  ...(o as unknown as Order),
  subtotal: Number(o.subtotal),
  shipping_fee: Number(o.shipping_fee),
  total: Number(o.total),
});

/** Turn a Postgres exception from place_order into a Thai message. */
export function orderErrorMessage(raw: string) {
  const m = raw.match(/OUT_OF_STOCK:(.+):(\d+)/);
  if (m) return Number(m[2]) === 0 ? `"${m[1]}" หมดแล้ว` : `"${m[1]}" เหลือเพียง ${m[2]} ชิ้น`;
  const u = raw.match(/PRODUCT_UNAVAILABLE:(.+)/);
  if (u) return `"${u[1]}" ไม่มีจำหน่ายแล้ว`;
  if (raw.includes("EMPTY_CART")) return "ตะกร้าว่าง";
  return "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่";
}

export async function placeOrder(input: {
  customerId: string;
  items: { product_id: string; qty: number }[];
  shipping: ShippingInfo;
  paymentMethod: string;
  shippingFee: number;
  freeOver: number | null;
}) {
  const { data, error } = await db().rpc("place_order", {
    p_customer_id: input.customerId,
    p_items: input.items,
    p_shipping: input.shipping,
    p_payment_method: input.paymentMethod,
    p_shipping_fee: input.shippingFee,
    p_free_over: input.freeOver,
  });
  if (error) return { ok: false as const, error: orderErrorMessage(error.message) };
  return { ok: true as const, order: num(data as Record<string, unknown>) };
}

export async function getOrderByNo(orderNo: string): Promise<OrderDetail | null> {
  const { data, error } = await db()
    .from("orders")
    .select("*, items:order_items(*), events:order_events(*), customer:customers(phone, name)")
    .eq("order_no", orderNo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return shapeDetail(data);
}

export async function getOrderById(id: string): Promise<OrderDetail | null> {
  const { data, error } = await db()
    .from("orders")
    .select("*, items:order_items(*), events:order_events(*), customer:customers(phone, name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return shapeDetail(data);
}

function shapeDetail(data: Record<string, unknown>): OrderDetail {
  const items = ((data.items as OrderItem[]) ?? []).map((i) => ({
    ...i,
    unit_price: Number(i.unit_price),
    line_total: Number(i.line_total),
  }));
  const events = ((data.events as OrderEvent[]) ?? []).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return { ...num(data), items, events, customer: data.customer as OrderDetail["customer"] };
}

export async function listCustomerOrders(customerId: string) {
  const { data, error } = await db()
    .from("orders")
    .select("*, items:order_items(name, qty, image)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => ({ ...num(o), items: o.items as Pick<OrderItem, "name" | "qty" | "image">[] }));
}

export async function listOrders(opts: { status?: OrderStatus; search?: string; limit?: number } = {}) {
  let q = db()
    .from("orders")
    .select("*, customer:customers(phone, name), items:order_items(qty)")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.search) {
    const s = opts.search.replace(/[%_,()]/g, "");
    q = q.or(`order_no.ilike.%${s}%,shipping->>phone.ilike.%${s}%,shipping->>name.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => ({
    ...num(o),
    customer: o.customer as { phone: string; name: string },
    itemCount: ((o.items as { qty: number }[]) ?? []).reduce((s, i) => s + i.qty, 0),
  }));
}

export async function countOrdersByStatus() {
  const { data, error } = await db().from("orders").select("status");
  if (error) throw new Error(error.message);
  const counts: Partial<Record<OrderStatus, number>> = {};
  for (const r of data ?? []) counts[r.status as OrderStatus] = (counts[r.status as OrderStatus] ?? 0) + 1;
  return counts;
}

export async function setOrderStatus(orderId: string, status: OrderStatus, note: string | null, actor: string) {
  const { error } = await db().rpc("set_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_note: note,
    p_actor: actor,
  });
  if (error) return { ok: false as const, error: orderErrorMessage(error.message) };
  return { ok: true as const };
}

export async function updateOrderFields(orderId: string, fields: Partial<Pick<Order, "tracking_no" | "admin_note" | "slip_path" | "payment_ref">>) {
  const { error } = await db()
    .from("orders")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function slipSignedUrl(path: string) {
  const { data, error } = await db().storage.from(BUCKET_SLIPS).createSignedUrl(path, 60 * 30);
  if (error) return null;
  return data.signedUrl;
}
