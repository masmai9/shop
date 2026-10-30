"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { checkoutAction } from "../actions";
import { shippingFor, useCartSync, Notices } from "../cart/CartView";
import { formatBaht } from "@/lib/format";
import { keepForm } from "@/lib/use-keep-form";

type Method = { id: string; label: string; description: string; enabled: boolean };

export function CheckoutForm(props: {
  loggedInPhone: string | null;
  defaults: { name: string; address: string };
  methods: Method[];
  flatFee: number;
  freeOver: number | null;
}) {
  const { lines, ready, subtotal, clear } = useCart();
  const notices = useCartSync();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null);
  const firstEnabled = props.methods.find((m) => m.enabled)?.id ?? "";
  const [method, setMethod] = useState(firstEnabled);

  if (!ready) return <div className="panel h-60 animate-pulse" />;
  if (lines.length === 0) {
    return (
      <div>
        <Notices list={notices} />
        <div className="panel p-10 text-center">
          <p className="font-semibold">ตะกร้าว่าง</p>
          <Link href="/" className="btn btn-primary mt-5">เลือกซื้อสินค้า</Link>
        </div>
      </div>
    );
  }

  const fee = shippingFor(subtotal, props.flatFee, props.freeOver);

  function submit(form: FormData) {
    setError(null);
    start(async () => {
      const res = await checkoutAction({
        items: lines.map((l) => ({ product_id: l.productId, qty: l.qty })),
        name: String(form.get("name") ?? ""),
        phone: props.loggedInPhone ?? String(form.get("phone") ?? ""),
        address: String(form.get("address") ?? ""),
        note: String(form.get("note") ?? "") || undefined,
        pin: props.loggedInPhone ? undefined : String(form.get("pin") ?? ""),
        paymentMethod: method,
      });
      if (!res.ok) {
        setError({ msg: res.error, field: res.field });
        return;
      }
      clear();
      router.push(`/order/${res.orderNo}`);
    });
  }

  const err = (f: string) =>
    error?.field === f ? <p className="mt-1 text-sm text-danger" role="alert">{error.msg}</p> : null;

  return (
    <form onSubmit={keepForm(submit)} className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <Notices list={notices} />

        <fieldset className="panel space-y-4 p-5">
          <legend className="px-1 text-lg font-semibold">ข้อมูลของคุณ</legend>
          {props.loggedInPhone ? (
            <p className="text-sm">
              สั่งซื้อในชื่อเบอร์ <b>{props.loggedInPhone}</b> — ประวัติคำสั่งซื้อจะเก็บไว้ในเบอร์นี้
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                ใช้เบอร์โทรกับ PIN 4 หลักเพื่อดูสถานะและประวัติคำสั่งซื้อภายหลัง
                ครั้งแรกตั้ง PIN ได้เลย ไม่ต้องสมัครสมาชิก
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="phone">เบอร์โทรศัพท์</label>
                  <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className="field" placeholder="0812345678" />
                  {err("phone")}
                </div>
                <div>
                  <label className="label" htmlFor="pin">PIN 4 หลัก</label>
                  <input
                    id="pin"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    autoComplete="off"
                    required
                    className="field tracking-[0.5em]"
                  />
                  <p className="hint">เคยสั่งแล้ว ใส่ PIN เดิม / ครั้งแรก ตั้งใหม่ได้เลย</p>
                  {err("pin")}
                </div>
              </div>
            </>
          )}
        </fieldset>

        <fieldset className="panel space-y-4 p-5">
          <legend className="px-1 text-lg font-semibold">ที่อยู่จัดส่ง</legend>
          <div>
            <label className="label" htmlFor="name">ชื่อผู้รับ</label>
            <input id="name" name="name" autoComplete="name" defaultValue={props.defaults.name} required className="field" />
            {err("name")}
          </div>
          <div>
            <label className="label" htmlFor="address">ที่อยู่</label>
            <textarea
              id="address"
              name="address"
              autoComplete="street-address"
              defaultValue={props.defaults.address}
              required
              className="field"
              placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
            />
            {err("address")}
          </div>
          <div>
            <label className="label" htmlFor="note">หมายเหตุถึงร้าน (ถ้ามี)</label>
            <input id="note" name="note" className="field" />
          </div>
        </fieldset>

        <fieldset className="panel space-y-3 p-5">
          <legend className="px-1 text-lg font-semibold">วิธีชำระเงิน</legend>
          {props.methods.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                method === m.id ? "border-base" : "border-line"
              } ${m.enabled ? "" : "cursor-not-allowed opacity-50"}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={m.id}
                checked={method === m.id}
                disabled={!m.enabled}
                onChange={() => setMethod(m.id)}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold">{m.label}</span>
                <span className="block text-sm text-muted">{m.enabled ? m.description : "เร็วๆ นี้"}</span>
              </span>
            </label>
          ))}
          {!firstEnabled && (
            <p className="text-sm text-danger">ร้านยังไม่ได้เปิดช่องทางชำระเงิน กรุณาติดต่อร้าน</p>
          )}
          {err("paymentMethod")}
        </fieldset>
      </div>

      <aside className="panel h-fit space-y-3 p-5 md:sticky md:top-24">
        <h2 className="font-semibold">สรุปคำสั่งซื้อ</h2>
        <ul className="space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-3">
              <span className="line-clamp-1">{l.name} × {l.qty}</span>
              <span className="shrink-0">{formatBaht(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><span>ยอดสินค้า</span><span>{formatBaht(subtotal)}</span></div>
          <div className="flex justify-between"><span>ค่าจัดส่ง</span><span>{fee === 0 ? "ฟรี" : formatBaht(fee)}</span></div>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
          <span>รวม</span><span>{formatBaht(subtotal + fee)}</span>
        </div>
        {error && !["phone", "pin", "name", "address", "paymentMethod"].includes(error.field ?? "") && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-danger" role="alert">{error.msg}</p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={pending || !firstEnabled}>
          {pending ? "กำลังสร้างคำสั่งซื้อ…" : "ยืนยันคำสั่งซื้อ"}
        </button>
        <p className="text-center text-xs text-muted">ขั้นต่อไปจะแสดง QR สำหรับชำระเงิน</p>
      </aside>
    </form>
  );
}
