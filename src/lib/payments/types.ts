import type { Settings } from "@/lib/repo/settings";

export type OrderForPayment = {
  id: string;
  order_no: string;
  total: number;
  status: string;
};

/**
 * What the order page renders for a payment method.
 * - manual_qr: show a QR, customer uploads a slip, admin verifies.
 * - redirect:  send the customer to a hosted payment page (e.g. card via Omise/Stripe).
 * - none:      nothing to do (already paid, cash on delivery, …).
 */
export type PaymentInstructions =
  | { kind: "manual_qr"; qrPayload: string; accountName: string; promptPayId: string; amount: number }
  | { kind: "redirect"; url: string; label: string }
  | { kind: "none"; message: string };

export interface PaymentProvider {
  /** Stored in orders.payment_method — never change once orders exist. */
  id: string;
  label: string;
  description: string;
  /** Whether the customer can pick it at checkout right now. */
  isEnabled(settings: Settings): boolean;
  /** Called on the order page while the order is waiting for payment. */
  getInstructions(order: OrderForPayment, settings: Settings): Promise<PaymentInstructions>;
  /**
   * Optional: handle a webhook from the provider (card gateways). Return the
   * order_no that was paid, or null to ignore. Wired up in /api/payments/[provider].
   */
  handleWebhook?(req: Request): Promise<{ orderNo: string; ref: string } | null>;
}
