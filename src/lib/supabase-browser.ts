"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser client — used ONLY to upload files to a signed upload URL that the
 * server issued. It has no table access (RLS blocks everything).
 */
export function browserSupabase() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return client;
}

/** Upload a file using {bucket, path, token} returned by a server action. */
export async function uploadSigned(
  target: { bucket: string; path: string; token: string },
  file: File,
) {
  const { error } = await browserSupabase()
    .storage.from(target.bucket)
    .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
  if (error) throw new Error(error.message);
}
