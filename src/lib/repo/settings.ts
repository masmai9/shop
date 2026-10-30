import "server-only";
import { db } from "@/lib/supabase";

export type Settings = {
  shop: { name: string; tagline: string; contact_phone: string; line_id: string; address: string };
  promptpay: { enabled: boolean; id: string; account_name: string };
  shipping: { flat_fee: number; free_over: number | null };
};

export const DEFAULT_SETTINGS: Settings = {
  shop: { name: "ร้านของเรา", tagline: "", contact_phone: "", line_id: "", address: "" },
  promptpay: { enabled: true, id: "", account_name: "" },
  shipping: { flat_fee: 50, free_over: 1500 },
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await db().from("settings").select("key, value");
  if (error) throw new Error(error.message);
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, Record<string, unknown>>;
  for (const row of data ?? []) {
    out[row.key] = { ...(out[row.key] ?? {}), ...(row.value as object) };
  }
  return out as unknown as Settings;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const { error } = await db()
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
