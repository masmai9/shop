import Link from "next/link";
import { listCategories } from "@/lib/repo/catalog";
import { ProductForm } from "../ProductForm";

export default async function NewProduct(props: PageProps<"/admin/products/new">) {
  const sp = await props.searchParams;
  const categories = await listCategories({ includeInactive: true });
  const preset = typeof sp.cat === "string" ? sp.cat : categories[0]?.id ?? "";

  return (
    <div className="space-y-5">
      <Link href="/admin/products" className="text-sm text-muted hover:underline">กลับไปรายการสินค้า</Link>
      <h1 className="text-2xl font-bold">เพิ่มสินค้า</h1>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        catSlugs={Object.fromEntries(categories.map((c) => [c.id, c.slug]))}
        initial={{
          category_id: preset,
          name: "",
          slug: "",
          summary: "",
          description: "",
          price: "",
          compare_at_price: "",
          stock: "1",
          low_stock_alert: "3",
          sku: "",
          images: [],
          specs: [],
          is_active: true,
          is_featured: false,
        }}
      />
    </div>
  );
}
