import "server-only";
import { db, publicImageUrl } from "@/lib/supabase";

export type CategoryTheme = {
  accent: string;
  surface: string;
  ink: string;
  motif: "music" | "watch" | "circuit" | "plain";
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  theme: CategoryTheme;
  banner_url: string | null; // resolved public URL
  banner_path: string | null; // raw storage path (for editing)
  sort_order: number;
  is_active: boolean;
};

export type Product = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  low_stock_alert: number;
  sku: string | null;
  images: string[]; // public URLs (resolved)
  specs: Record<string, string>;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
};

export type ProductWithCategory = Product & { category: Pick<Category, "slug" | "name" | "theme"> };

const DEFAULT_THEME: CategoryTheme = { accent: "#334155", surface: "#F1F5F9", ink: "#0F172A", motif: "plain" };

function toCategory(row: Record<string, unknown>): Category {
  return {
    ...(row as unknown as Category),
    theme: { ...DEFAULT_THEME, ...((row.theme as object) ?? {}) },
    banner_url: row.banner_url ? publicImageUrl(row.banner_url as string) : null,
    banner_path: (row.banner_url as string | null) ?? null,
  };
}

function toProduct(row: Record<string, unknown>): Product {
  return {
    ...(row as unknown as Product),
    price: Number(row.price),
    compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
    images: ((row.images as string[]) ?? []).map(publicImageUrl),
    specs: (row.specs as Record<string, string>) ?? {},
  };
}

// ---------------- Categories ----------------
export async function listCategories(opts: { includeInactive?: boolean } = {}) {
  let q = db().from("categories").select("*").order("sort_order").order("name");
  if (!opts.includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(toCategory);
}

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await db().from("categories").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toCategory(data) : null;
}

// ---------------- Products ----------------
export type ProductQuery = {
  categoryId?: string;
  featured?: boolean;
  search?: string;
  sort?: "new" | "price_asc" | "price_desc";
  includeInactive?: boolean;
  limit?: number;
};

export async function listProducts(q: ProductQuery = {}): Promise<ProductWithCategory[]> {
  let query = db().from("products").select("*, category:categories(slug, name, theme)");
  if (!q.includeInactive) query = query.eq("is_active", true);
  if (q.categoryId) query = query.eq("category_id", q.categoryId);
  if (q.featured) query = query.eq("is_featured", true);
  if (q.search) query = query.ilike("name", `%${q.search.replace(/[%_]/g, "")}%`);
  if (q.sort === "price_asc") query = query.order("price", { ascending: true });
  else if (q.sort === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  if (q.limit) query = query.limit(q.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...toProduct(row),
    category: {
      ...(row.category as Category),
      theme: { ...DEFAULT_THEME, ...((row.category as Category)?.theme ?? {}) },
    },
  }));
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await db()
    .from("products")
    .select("*, category:categories(slug, name, theme)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...toProduct(data),
    category: { ...(data.category as Category), theme: { ...DEFAULT_THEME, ...(data.category?.theme ?? {}) } },
  } as ProductWithCategory;
}

/** For admin edit form: returns raw storage paths alongside resolved URLs. */
export async function getProductForEdit(id: string) {
  const { data, error } = await db().from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    product: toProduct(data),
    images: ((data.images as string[]) ?? []).map((path) => ({ path, url: publicImageUrl(path) })),
  };
}

/** Current price/stock for a set of ids (cart validation). */
export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await db().from("products").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toProduct);
}
