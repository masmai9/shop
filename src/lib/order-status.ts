/**
 * Single source of truth for order statuses. Add/rename statuses here
 * (and in the `order_status` enum in schema.sql).
 */
export const ORDER_STATUSES = [
  "pending_payment",
  "verifying",
  "paid",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_INFO: Record<
  OrderStatus,
  { label: string; customerHint: string; tone: "wait" | "info" | "ok" | "done" | "bad" }
> = {
  pending_payment: {
    label: "รอชำระเงิน",
    customerHint: "สแกน QR เพื่อชำระเงิน แล้วอัปโหลดสลิป",
    tone: "wait",
  },
  verifying: {
    label: "รอตรวจสลิป",
    customerHint: "ได้รับสลิปแล้ว ร้านกำลังตรวจสอบ",
    tone: "info",
  },
  paid: { label: "ชำระแล้ว", customerHint: "ร้านกำลังเตรียมจัดส่ง", tone: "ok" },
  shipped: { label: "จัดส่งแล้ว", customerHint: "สินค้าอยู่ระหว่างขนส่ง", tone: "ok" },
  completed: { label: "สำเร็จ", customerHint: "ขอบคุณที่อุดหนุน", tone: "done" },
  cancelled: { label: "ยกเลิก", customerHint: "คำสั่งซื้อนี้ถูกยกเลิก", tone: "bad" },
};

/** Main path shown as a progress line to the customer. */
export const STATUS_FLOW: OrderStatus[] = ["pending_payment", "verifying", "paid", "shipped", "completed"];

/** Quick actions an admin sees for each status (any status can still be set manually). */
export const ADMIN_NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string; note?: string }[]>> = {
  pending_payment: [{ to: "paid", label: "ยืนยันว่าได้รับเงินแล้ว" }],
  verifying: [
    { to: "paid", label: "สลิปถูกต้อง ยืนยันชำระแล้ว" },
    { to: "pending_payment", label: "สลิปไม่ถูกต้อง ให้ลูกค้าส่งใหม่", note: "สลิปไม่ถูกต้อง กรุณาตรวจสอบยอดและอัปโหลดใหม่" },
  ],
  paid: [{ to: "shipped", label: "บันทึกว่าจัดส่งแล้ว" }],
  shipped: [{ to: "completed", label: "ปิดออเดอร์ (สำเร็จ)" }],
};

export function isOrderStatus(s: string): s is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(s);
}
