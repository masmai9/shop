import type { PaymentProvider } from "./types";

/**
 * Credit/debit card — placeholder, disabled until a gateway is chosen.
 *
 * To enable (e.g. Omise, 2C2P or Stripe):
 *  1. add the gateway's keys to the environment (e.g. OMISE_SECRET_KEY)
 *  2. in getInstructions(): create a charge/checkout session for order.total,
 *     save its id with `orders.payment_ref`, return { kind: "redirect", url }
 *  3. in handleWebhook(): verify the signature, return { orderNo, ref }
 *     — /api/payments/card then marks the order "paid" automatically
 *  4. make isEnabled() return true when the keys are present
 */
export const cardProvider: PaymentProvider = {
  id: "card",
  label: "บัตรเครดิต / เดบิต",
  description: "Visa, Mastercard, JCB",
  isEnabled: () => false,
  async getInstructions() {
    return { kind: "none", message: "ยังไม่เปิดรับชำระด้วยบัตร" };
  },
  async handleWebhook() {
    return null;
  },
};
