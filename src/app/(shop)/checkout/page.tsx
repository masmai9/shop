import type { Metadata } from "next";
import { getSettings } from "@/lib/repo/settings";
import { getCustomerSession } from "@/lib/auth";
import { getCustomer } from "@/lib/repo/customers";
import { enabledProviders, PAYMENT_PROVIDERS } from "@/lib/payments";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "ชำระเงิน" };

export default async function CheckoutPage() {
  const [settings, session] = await Promise.all([getSettings(), getCustomerSession()]);
  const customer = session ? await getCustomer(session.cid) : null;
  const enabled = enabledProviders(settings).map((p) => p.id);
  const methods = PAYMENT_PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    enabled: enabled.includes(p.id),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <h1 className="mb-6 text-3xl font-bold">ชำระเงิน</h1>
      <CheckoutForm
        loggedInPhone={customer?.phone ?? null}
        defaults={{ name: customer?.name ?? "", address: customer?.address?.line ?? "" }}
        methods={methods}
        flatFee={settings.shipping.flat_fee}
        freeOver={settings.shipping.free_over}
      />
    </div>
  );
}
