import Link from "next/link";
import { listOrders } from "@/lib/repo/orders";
import { ORDER_STATUSES, STATUS_INFO, isOrderStatus } from "@/lib/order-status";
import { formatBaht, formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";

export default async function AdminOrders(props: PageProps<"/admin/orders">) {
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" && isOrderStatus(sp.status) ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const orders = await listOrders({ status, search: q || undefined });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">คำสั่งซื้อ</h1>

      <form className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="ค้นหาเลขออเดอร์ ชื่อ หรือเบอร์โทร" className="field max-w-sm" />
        <button className="btn btn-ghost">ค้นหา</button>
      </form>

      <div className="flex gap-1 overflow-x-auto">
        <Link href="/admin/orders" className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${!status ? "bg-base text-white" : "border border-line bg-card"}`}>
          ทั้งหมด
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${status === s ? "bg-base text-white" : "border border-line bg-card"}`}
          >
            {STATUS_INFO[s].label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="panel p-10 text-center text-muted">ไม่มีคำสั่งซื้อในรายการนี้</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">ออเดอร์</th>
                <th className="px-4 py-3 font-medium">ลูกค้า</th>
                <th className="px-4 py-3 font-medium">จำนวน</th>
                <th className="px-4 py-3 text-right font-medium">ยอดรวม</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold underline-offset-2 hover:underline">{o.order_no}</Link>
                    <p className="text-xs text-muted">{formatDateTime(o.created_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{o.shipping.name}</p>
                    <p className="text-xs text-muted">{o.shipping.phone}</p>
                  </td>
                  <td className="px-4 py-3">{o.itemCount} ชิ้น</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatBaht(o.total)}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
