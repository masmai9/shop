import Link from "next/link";
import { countOrdersByStatus, listOrders } from "@/lib/repo/orders";
import { listProducts } from "@/lib/repo/catalog";
import { getSettings } from "@/lib/repo/settings";
import { ORDER_STATUSES, STATUS_INFO } from "@/lib/order-status";
import { formatBaht, formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";

export default async function AdminHome() {
  const [counts, recent, products, settings] = await Promise.all([
    countOrdersByStatus(),
    listOrders({ limit: 8 }),
    listProducts({ includeInactive: true }),
    getSettings(),
  ]);
  const lowStock = products.filter((p) => p.is_active && p.stock <= p.low_stock_alert);
  const toCheck = counts.verifying ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">ภาพรวม</h1>

      {!settings.promptpay.id && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          ยังไม่ได้ใส่เบอร์/เลขพร้อมเพย์ ลูกค้าจะยังสั่งซื้อไม่ได้ —{" "}
          <Link href="/admin/settings" className="font-semibold underline">ตั้งค่าตอนนี้</Link>
        </div>
      )}

      {toCheck > 0 && (
        <Link href="/admin/orders?status=verifying" className="block rounded-xl bg-base p-5 text-white">
          <p className="text-lg font-semibold">มีสลิปรอตรวจ {toCheck} รายการ</p>
          <p className="text-sm opacity-80">แตะเพื่อตรวจและยืนยันการชำระเงิน</p>
        </Link>
      )}

      <section>
        <h2 className="mb-3 font-semibold">คำสั่งซื้อตามสถานะ</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ORDER_STATUSES.map((s) => (
            <Link key={s} href={`/admin/orders?status=${s}`} className="panel p-4 hover:border-base">
              <p className="text-sm text-muted">{STATUS_INFO[s].label}</p>
              <p className="font-display text-2xl font-bold">{counts[s] ?? 0}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-semibold">คำสั่งซื้อล่าสุด</h2>
            <Link href="/admin/orders" className="text-sm underline">ดูทั้งหมด</Link>
          </div>
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted">ยังไม่มีคำสั่งซื้อ</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-paper">
                    <div>
                      <p className="font-medium">{o.order_no}</p>
                      <p className="text-xs text-muted">{o.shipping.name} · {formatDateTime(o.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <StatusPill status={o.status} />
                      <p className="text-sm font-semibold">{formatBaht(o.total)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-semibold">สต๊อกใกล้หมด</h2>
            <Link href="/admin/products?filter=low" className="text-sm underline">จัดการสต๊อก</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="p-5 text-sm text-muted">สต๊อกเพียงพอทุกรายการ</p>
          ) : (
            <ul className="divide-y divide-line">
              {lowStock.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-paper">
                    <span className="line-clamp-1 text-sm">{p.name}</span>
                    <span className={`text-sm font-semibold ${p.stock === 0 ? "text-danger" : "text-amber-700"}`}>
                      {p.stock === 0 ? "หมด" : `เหลือ ${p.stock}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
