import type { PaymentProvider } from "./types";
import { promptPayPayload } from "@/lib/promptpay";

export const promptPayProvider: PaymentProvider = {
  id: "promptpay",
  label: "สแกน QR พร้อมเพย์",
  description: "สแกนด้วยแอปธนาคารใดก็ได้ แล้วอัปโหลดสลิป",
  isEnabled: (s) => Boolean(s.promptpay.enabled && s.promptpay.id),
  async getInstructions(order, s) {
    return {
      kind: "manual_qr",
      qrPayload: promptPayPayload(s.promptpay.id, Number(order.total)),
      accountName: s.promptpay.account_name,
      promptPayId: s.promptpay.id,
      amount: Number(order.total),
    };
  },
};
