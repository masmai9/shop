import type { Metadata } from "next";
import { CartView } from "./CartView";
import { getSettings } from "@/lib/repo/settings";

export const metadata: Metadata = { title: "ตะกร้าสินค้า" };

export default async function CartPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <h1 className="mb-6 text-3xl font-bold">ตะกร้าสินค้า</h1>
      <CartView flatFee={s.shipping.flat_fee} freeOver={s.shipping.free_over} />
    </div>
  );
}
