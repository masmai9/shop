import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, listProducts } from "@/lib/repo/catalog";
import { formatBaht } from "@/lib/format";
import { Motif, themeStyle } from "@/components/Motif";
import { Gallery } from "@/components/Gallery";
import { AddToCart } from "@/components/cart/AddToCart";
import { ProductGrid } from "@/components/ProductCard";

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const slug = decodeURIComponent((await props.params).slug);
  const p = await getProductBySlug(slug);
  if (!p) return { title: "ไม่พบสินค้า" };
  return {
    title: p.name,
    description: p.summary || p.description.slice(0, 150),
    openGraph: p.images[0] ? { images: [p.images[0]] } : undefined,
  };
}

export default async function ProductPage(props: PageProps<"/p/[slug]">) {
  const slug = decodeURIComponent((await props.params).slug);
  const p = await getProductBySlug(slug);
  if (!p || !p.is_active) notFound();

  const related = (await listProducts({ categoryId: p.category_id, limit: 5 }))
    .filter((r) => r.id !== p.id)
    .slice(0, 4);
  const onSale = p.compare_at_price != null && p.compare_at_price > p.price;
  const specs = Object.entries(p.specs).filter(([k, v]) => k && v);

  return (
    <div style={themeStyle(p.category.theme)} className="mx-auto max-w-6xl px-4 pt-6">
      <nav className="mb-6 text-sm text-muted" aria-label="breadcrumb">
        <Link href="/" className="hover:underline">หน้าแรก</Link> /{" "}
        <Link href={`/c/${p.category.slug}`} className="hover:underline">{p.category.name}</Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <Gallery
          images={p.images}
          alt={p.name}
          fallback={<Motif kind={p.category.theme.motif} className="h-full w-full opacity-60" />}
        />

        <div>
          <h1 className="text-2xl font-bold md:text-4xl">{p.name}</h1>
          {p.summary && <p className="mt-2 text-muted md:text-lg">{p.summary}</p>}

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold">{formatBaht(p.price)}</span>
            {onSale && <s className="text-lg text-muted">{formatBaht(p.compare_at_price)}</s>}
          </div>

          <p className="mt-2 text-sm">
            {p.stock <= 0 ? (
              <span className="font-semibold text-danger">สินค้าหมดชั่วคราว</span>
            ) : p.stock <= p.low_stock_alert ? (
              <span className="font-semibold text-accent">เหลือเพียง {p.stock} ชิ้น</span>
            ) : (
              <span className="text-ok">มีสินค้าพร้อมส่ง</span>
            )}
          </p>

          <div className="mt-6">
            <AddToCart
              product={{
                productId: p.id,
                slug: p.slug,
                name: p.name,
                price: p.price,
                image: p.images[0] ?? null,
                stock: p.stock,
              }}
            />
          </div>

          {specs.length > 0 && (
            <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
              {specs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="col-span-2">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {p.description && (
            <div className="mt-8">
              <h2 className="mb-2 text-lg font-semibold">รายละเอียดสินค้า</h2>
              <p className="whitespace-pre-line leading-relaxed text-base/7">{p.description}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-xl font-bold">สินค้าอื่นใน{p.category.name}</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
