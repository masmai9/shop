import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug, listProducts } from "@/lib/repo/catalog";
import { Motif, themeStyle } from "@/components/Motif";
import { ProductGrid } from "@/components/ProductCard";

const SORTS = [
  { id: "new", label: "มาใหม่" },
  { id: "price_asc", label: "ราคาต่ำ–สูง" },
  { id: "price_desc", label: "ราคาสูง–ต่ำ" },
] as const;

export async function generateMetadata(props: PageProps<"/c/[slug]">): Promise<Metadata> {
  const slug = decodeURIComponent((await props.params).slug);
  const c = await getCategoryBySlug(slug);
  return { title: c?.name ?? "ไม่พบหมวดสินค้า" };
}

export default async function CategoryPage(props: PageProps<"/c/[slug]">) {
  const slug = decodeURIComponent((await props.params).slug);
  const sp = await props.searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category || !category.is_active) notFound();

  const sort = (SORTS.find((s) => s.id === sp.sort)?.id ?? "new") as (typeof SORTS)[number]["id"];
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const products = await listProducts({ categoryId: category.id, sort, search: q || undefined });

  return (
    <div style={themeStyle(category.theme)}>
      <section className="band">
        <div className="absolute inset-0 -z-10 text-accent opacity-40 md:left-1/2">
          <Motif kind={category.theme.motif} className="h-full w-full" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <nav className="mb-4 text-sm opacity-70" aria-label="breadcrumb">
            <Link href="/" className="hover:underline">หน้าแรก</Link> / {category.name}
          </nav>
          <h1 className="text-4xl font-bold md:text-6xl">{category.name}</h1>
          {category.description && <p className="mt-3 max-w-xl opacity-80 md:text-lg">{category.description}</p>}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-8">
        <form className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            name="q"
            defaultValue={q}
            placeholder={`ค้นหาใน${category.name}`}
            className="field sm:max-w-xs"
            aria-label="ค้นหาสินค้า"
          />
          <input type="hidden" name="sort" value={sort} />
          <div className="flex gap-1 overflow-x-auto" role="group" aria-label="เรียงลำดับ">
            {SORTS.map((s) => (
              <Link
                key={s.id}
                href={`/c/${category.slug}?sort=${s.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${s.id === sort ? "bg-accent text-white" : "border border-line bg-card"}`}
                aria-current={s.id === sort ? "true" : undefined}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </form>

        {products.length === 0 ? (
          <div className="panel p-10 text-center">
            <p className="font-semibold">{q ? `ไม่พบสินค้าที่ตรงกับ "${q}"` : "หมวดนี้ยังไม่มีสินค้า"}</p>
            <p className="mt-1 text-sm text-muted">{q ? "ลองใช้คำค้นที่สั้นลง" : "แวะมาดูใหม่เร็วๆ นี้"}</p>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
