import Link from "next/link";
import type { Metadata } from "next";
import { getCustomerSession } from "@/lib/auth";
import { getCustomer } from "@/lib/repo/customers";
import { listCustomerOrders } from "@/lib/repo/orders";
import { formatBaht, formatDateTime } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { StatusPill } from "@/components/StatusPill";
import { LoginForm } from "./LoginForm";
import { ProfileForm } from "./ProfileForm";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "คำสั่งซื้อของฉัน" };

export default async function AccountPage() {
  const session = await getCustomerSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12">
        <h1 className="text-3xl font-bold">เข้าสู่ระบบ</h1>
        <p className="mb-6 mt-1 text-muted">ใช้เบอร์โทรกับ PIN 4 หลัก เพื่อดูสถานะและประวัติคำสั่งซื้อ</p>
        <LoginForm />
      </div>
    );
  }

  const [customer, orders] = await Promise.all([getCustomer(session.cid), listCustomerOrders(session.cid)]);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">คำสั่งซื้อของฉัน</h1>
          <p className="text-muted">เบอร์ {session.phone}</p>
        </div>
        <form action={logoutAction}>
          <button className="btn btn-ghost btn-sm">ออกจากระบบ</button>
        </form>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_18rem]">
        <div>
          {orders.length === 0 ? (
            <div className="panel p-10 text-center">
              <p className="font-semibold">ยังไม่มีคำสั่งซื้อ</p>
              <Link href="/" className="btn btn-primary mt-5">เลือกซื้อสินค้า</Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.order_no}`} className="panel flex items-center gap-4 p-4 hover:border-base">
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((it, i) => (
                        <div key={i} className="h-12 w-12 overflow-hidden rounded-lg border-2 border-card bg-paper">
                          {it.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl(it.image)!} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold">{o.order_no}</p>
                      <p className="line-clamp-1 text-sm text-muted">
                        {o.items.map((i) => i.name).join(", ")}
                      </p>
                      <p className="text-xs text-muted">{formatDateTime(o.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <StatusPill status={o.status} />
                      <p className="mt-1 font-semibold">{formatBaht(o.total)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="panel h-fit p-5">
          <h2 className="mb-3 font-semibold">ที่อยู่ที่บันทึกไว้</h2>
          <ProfileForm name={customer?.name ?? ""} address={customer?.address?.line ?? ""} />
        </aside>
      </div>
    </div>
  );
}
