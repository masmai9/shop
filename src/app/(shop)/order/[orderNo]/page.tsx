import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { getCustomerSession, isAdmin } from "@/lib/auth";
import { getOrderByNo } from "@/lib/repo/orders";
import { getSettings } from "@/lib/repo/settings";
import { getProvider } from "@/lib/payments";
import { STATUS_FLOW, STATUS_INFO } from "@/lib/order-status";
import { formatBaht, formatDateTime } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { StatusPill } from "@/components/StatusPill";
import { SlipUpload, CancelOrderButton } from "./SlipUpload";
import { LoginForm } from "../../account/LoginForm";

export async function generateMetadata(props: PageProps<"/order/[orderNo]">): Promise<Metadata> {
  const { orderNo } = await props.params;
  return { title: `คำสั่งซื้อ ${orderNo}` };
}

export default async function OrderPage(props: PageProps<"/order/[orderNo]">) {
  const { orderNo } = await props.params;
  const [session, admin] = await Promise.all([getCustomerSession(), isAdmin()]);

  if (!session && !admin) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12">
        <h1 className="text-2xl font-bold">ดูคำสั่งซื้อ {orderNo}</h1>
        <p className="mt-1 mb-6 text-muted">เข้าสู่ระบบด้วยเบอร์โทรและ PIN ที่ใช้ตอนสั่งซื้อ</p>
        <LoginForm next={`/order/${orderNo}`} />
      </div>
    );
  }

  const order = await getOrderByNo(orderNo);
  if (!order || (!admin && order.customer_id !== session?.cid)) notFound();

  const settings = await getSettings();
  const provider = getProvider(order.payment_method);
  const info = STATUS_INFO[order.status];
  const waiting = order.status === "pending_payment";
  const instructions = waiting && provider ? await provider.getInstructions(order, settings) : null;
  const qrSvg =
    instructions?.kind === "manual_qr"
      ? await QRCode.toString(instructions.qrPayload, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      : null;
  const stepIndex = STATUS_FLOW.indexOf(order.status);
  const lastNote = [...order.events].reverse().find((e) => e.status === order.status)?.note;
  const rejected = waiting && order.events.some((e) => e.status === "verifying");

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">คำสั่งซื้อ</p>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{order.order_no}</h1>
        </div>
        <StatusPill status={order.status} />
      </div>
      <p className="mt-1 text-sm text-muted">สั่งเมื่อ {formatDateTime(order.created_at)}</p>

      {order.status !== "cancelled" && (
        <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="ความคืบหน้า">
          {STATUS_FLOW.map((s, i) => (
            <li key={s} className="text-center" aria-current={i === stepIndex ? "step" : undefined}>
              <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-base" : "bg-line"}`} />
              <p className={`mt-1.5 text-[0.7rem] leading-tight sm:text-xs ${i === stepIndex ? "font-semibold" : "text-muted"}`}>
                {STATUS_INFO[s].label}
              </p>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          {/* Payment / status box */}
          <section className="panel p-5">
            <h2 className="text-lg font-semibold">{info.customerHint}</h2>
            {rejected && lastNote && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-danger">หมายเหตุจากร้าน: {lastNote}</p>
            )}
            {order.status === "shipped" && order.tracking_no && (
              <p className="mt-2">เลขพัสดุ: <b className="select-all">{order.tracking_no}</b></p>
            )}

            {instructions?.kind === "manual_qr" && qrSvg && (
              <div className="mt-5 grid items-start gap-6 sm:grid-cols-[14rem_1fr]">
                <div className="rounded-xl border border-line bg-white p-3">
                  <div className="aspect-square w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  <p className="mt-2 text-center text-xs text-muted">พร้อมเพย์ {instructions.promptPayId}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted">ยอดที่ต้องชำระ</p>
                    <p className="font-display text-3xl font-bold">{formatBaht(instructions.amount)}</p>
                    {instructions.accountName && <p className="text-sm">ชื่อบัญชี {instructions.accountName}</p>}
                  </div>
                  <p className="text-sm text-muted">
                    บันทึกรูป QR หรือสแกนด้วยแอปธนาคาร ยอดเงินจะขึ้นอัตโนมัติ โอนแล้วอัปโหลดสลิปด้านล่าง
                  </p>
                  {!admin && <SlipUpload orderNo={order.order_no} />}
                </div>
              </div>
            )}
            {instructions?.kind === "redirect" && (
              <a href={instructions.url} className="btn btn-primary mt-4">{instructions.label}</a>
            )}
            {instructions?.kind === "none" && <p className="mt-2 text-muted">{instructions.message}</p>}

            {waiting && !admin && (
              <div className="mt-5 border-t border-line pt-4">
                <CancelOrderButton orderNo={order.order_no} />
              </div>
            )}
          </section>

          <section className="panel">
            <h2 className="border-b border-line px-5 py-3 font-semibold">รายการสินค้า</h2>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-paper">
                    {it.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(it.image)!} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{it.name}</p>
                    <p className="text-sm text-muted">{formatBaht(it.unit_price)} × {it.qty}</p>
                  </div>
                  <p className="font-semibold">{formatBaht(it.line_total)}</p>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-line px-5 py-3 text-sm">
              <div className="flex justify-between"><span>ยอดสินค้า</span><span>{formatBaht(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>ค่าจัดส่ง</span><span>{order.shipping_fee === 0 ? "ฟรี" : formatBaht(order.shipping_fee)}</span></div>
              <div className="flex justify-between pt-1 text-base font-bold"><span>รวม</span><span>{formatBaht(order.total)}</span></div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel p-5 text-sm">
            <h2 className="mb-2 font-semibold">จัดส่งถึง</h2>
            <p>{order.shipping.name}</p>
            <p>{order.shipping.phone}</p>
            <p className="whitespace-pre-line text-muted">{order.shipping.address}</p>
            {order.shipping.note && <p className="mt-2 text-muted">หมายเหตุ: {order.shipping.note}</p>}
          </section>
          <section className="panel p-5 text-sm">
            <h2 className="mb-3 font-semibold">ประวัติ</h2>
            <ol className="space-y-3">
              {order.events.map((e) => (
                <li key={e.id}>
                  <p className="font-medium">{STATUS_INFO[e.status].label}</p>
                  <p className="text-xs text-muted">{formatDateTime(e.created_at)}</p>
                </li>
              ))}
            </ol>
          </section>
          <Link href="/account" className="btn btn-ghost w-full">คำสั่งซื้อทั้งหมดของฉัน</Link>
        </aside>
      </div>
    </div>
  );
}
