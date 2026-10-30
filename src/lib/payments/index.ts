import type { PaymentProvider } from "./types";
import { promptPayProvider } from "./promptpay";
import { cardProvider } from "./card";
import type { Settings } from "@/lib/repo/settings";

/**
 * Register payment methods here. To add a new one:
 *  1. create a file in this folder implementing PaymentProvider
 *  2. add it to this list
 * Checkout, the order page and the admin panel pick it up automatically.
 */
export const PAYMENT_PROVIDERS: PaymentProvider[] = [promptPayProvider, cardProvider];

export function getProvider(id: string) {
  return PAYMENT_PROVIDERS.find((p) => p.id === id) ?? null;
}

export function enabledProviders(settings: Settings) {
  return PAYMENT_PROVIDERS.filter((p) => p.isEnabled(settings));
}

export type { PaymentProvider, PaymentInstructions } from "./types";
