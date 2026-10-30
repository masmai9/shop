import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById, slipSignedUrl } from "@/lib/repo/orders";
import { getProvider } from "@/lib/payments";
import { STATUS_INFO } from "@/lib/order-status";
import { formatBaht, formatDateTime } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { StatusPill } from "@/components/StatusPill";
import { StatusControls, MetaForm, ResetPin } from "./OrderControls";

export default async function AdminOrderDetail(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const order = await getOrderById(id);
  if (!order) notFound();
  const slipUrl = order.slip_path ? await slipSignedUrl(order.slip_path) : null;
  const provider = getProvider(order.payment_method);

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-muted hover:underline">กลับไปรายการคำสั่งซื้อ</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">{order.order_no}</h1>
        <StatusPill status={order.status} />
        <span className="text-sm text-muted">{formatDateTime(order.created_at)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {/* Slip */}
          <section className="panel p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold">การชำระเงิน</h2>
              <span className="text-sm text-muted">{provider?.label ?? order.payment_method}</span>
            </div>
            <p className="mb-4">
              ยอดที่ต้องได้รับ <b className="font-display text-xl">{formatBaht(order.total)}</b>
            </p>
            {slipUrl ? (
              <a href={slipUrl} target="_blank" rel="noreferrer" className="block w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slipUrl} alt="สลิปการโอน" className="max-h-[28rem] rounded-lg border border-line" />
                <span className="mt-1 block text-xs text-muted">แตะเพื่อเปิดรูปเต็ม (ลิงก์ใช้ได้ 30 นาที)</span>
              </a>
            ) : (
              <p className="text-sm text-muted">ลูกค้ายังไม่ได้อัปโหลดสลิป</p>
            )}
            {order.payment_ref && <p className="mt-3 text-sm">เลขอ้างอิง: {order.payment_ref}</p>}
          </section>

          {/* Items */}
          <section className="panel">
            <h2 className="border-b border-line px-5 py-3 font-semibold">รายการสินค้า</h2>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-paper">
                    {it.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(it.image)!} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    {it.product_id ? (
                      <Link href={`/admin/products/${it.product_id}`} className="font-medium hover:underline">{it.name}</Link>
                    ) : (
                      <p className="font-medium">{it.name}</p>
                    )}
                    <p className="text-muted">{formatBaht(it.unit_price)} × {it.qty}</p>
                  </div>
                  <p className="font-semibold">{formatBaht(it.line_total)}</p>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-line px-5 py-3 text-sm">
              <div className="flex justify-between"><span>ยอดสินค้า</span><span>{formatBaht(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>ค่าจัดส่ง</span><span>{formatBaht(order.shipping_fee)}</span></div>
              <div className="flex justify-between font-bold"><span>รวม</span><span>{formatBaht(order.total)}</span></div>
            </div>
          </section>

          {/* History */}
          <section className="panel p-5">
            <h2 className="mb-3 font-semibold">ประวัติสถานะ</h2>
            <ol className="space-y-3 text-sm">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-28 shrink-0 text-xs text-muted">{formatDateTime(e.created_at)}</span>
                  <span>
                    <b>{STATUS_INFO[e.status].label}</b>
                    <span className="text-muted"> โดย {e.actor === "admin" ? "แอดมิน" : e.actor === "customer" ? "ลูกค้า" : "ระบบ"}</span>
                    {e.note && <span className="block text-muted">{e.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel p-5">
            <h2 className="mb-3 font-semibold">อัปเดตสถานะ</h2>
            <StatusControls orderId={order.id} status={order.status} />
          </section>

          <section className="panel p-5 text-sm">
            <h2 className="mb-2 font-semibold">จัดส่งถึง</h2>
            <p className="font-medium">{order.shipping.name}</p>
            <a href={`tel:${order.shipping.phone}`} className="underline">{order.shipping.phone}</a>
            <p className="mt-1 whitespace-pre-line">{order.shipping.address}</p>
            {order.shipping.note && <p className="mt-2 rounded bg-paper p-2">หมายเหตุลูกค้า: {order.shipping.note}</p>}
            <div className="mt-4 border-t border-line pt-3 text-muted">
              <p>บัญชีลูกค้า: {order.customer?.phone}</p>
              <ResetPin customerId={order.customer_id} />
            </div>
          </section>

          <section className="panel p-5">
            <MetaForm orderId={order.id} tracking={order.tracking_no ?? ""} adminNote={order.admin_note ?? ""} />
          </section>
        </aside>
      </div>
    </div>
  );
}
