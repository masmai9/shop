/** Storage path → public URL (works on server and client). Full URLs pass through. */
export function imageUrl(path: string | null | undefined, bucket = "products") {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
