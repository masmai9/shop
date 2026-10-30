import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductForEdit, listCategories } from "@/lib/repo/catalog";
import { ProductForm } from "../ProductForm";

export default async function EditProduct(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;
  const [found, categories] = await Promise.all([getProductForEdit(id), listCategories({ includeInactive: true })]);
  if (!found) notFound();
  const { product: p, images } = found;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/products" className="text-sm text-muted hover:underline">กลับไปรายการสินค้า</Link>
        <Link href={`/p/${p.slug}`} target="_blank" className="text-sm underline">ดูในหน้าร้าน</Link>
      </div>
      <h1 className="text-2xl font-bold">แก้ไขสินค้า</h1>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        catSlugs={Object.fromEntries(categories.map((c) => [c.id, c.slug]))}
        initial={{
          id: p.id,
          category_id: p.category_id,
          name: p.name,
          slug: p.slug,
          summary: p.summary,
          description: p.description,
          price: String(p.price),
          compare_at_price: p.compare_at_price == null ? "" : String(p.compare_at_price),
          stock: String(p.stock),
          low_stock_alert: String(p.low_stock_alert),
          sku: p.sku ?? "",
          images: images.map((i) => i.path),
          specs: Object.entries(p.specs).map(([k, v]) => ({ k, v })),
          is_active: p.is_active,
          is_featured: p.is_featured,
        }}
      />
    </div>
  );
}
