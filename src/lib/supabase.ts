import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { imageUrl } from "@/lib/images";

let admin: SupabaseClient | null = null;

/** Server-only client using the service role key. All DB access goes through here. */
export function db(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (ดู .env.example)",
    );
  }
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

export const BUCKET_PRODUCTS = "products";
export const BUCKET_SLIPS = "slips";

export function publicImageUrl(path: string) {
  return imageUrl(path, BUCKET_PRODUCTS)!;
}
