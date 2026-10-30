import Link from "next/link";
import { listCategories, listProducts } from "@/lib/repo/catalog";
import { getSettings } from "@/lib/repo/settings";
import { Motif, themeStyle } from "@/components/Motif";
import { ProductGrid } from "@/components/ProductCard";

export default async function HomePage() {
  const [settings, categories] = await Promise.all([getSettings(), listCategories()]);
  const rows = await Promise.all(
    categories.map(async (c) => ({
      category: c,
      products: await listProducts({ categoryId: c.id, limit: 4 }),
    })),
  );

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-8 md:pt-12">
        <div className="mb-6 max-w-2xl md:mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">วันนี้สนใจอะไรอยู่</h1>
          <p className="mt-2 text-muted md:text-lg">
            {settings.shop.tagline || "เลือกห้องที่ใช่ แล้วเข้าไปดูสินค้าในนั้นได้เลย"}
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="panel p-8 text-center text-muted">
            ยังไม่มีหมวดสินค้า — เพิ่มได้ที่หลังบ้าน (Admin › หมวดสินค้า)
          </div>
        ) : (
          <div className="rooms">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="room group flex flex-col justify-end p-6 md:p-8"
                style={themeStyle(c.theme)}
              >
                {c.banner_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.banner_url} alt="" className="room-banner" />
                )}
                <div className="room-motif">
                  <Motif kind={c.theme.motif} className="h-full w-full" />
                </div>
                <div className="room-veil" />
                <h2 className="font-display text-4xl font-bold text-balance md:text-[clamp(2rem,3.1vw,3rem)]">{c.name}</h2>
                <p className="mt-2 max-w-xs text-[0.95rem] opacity-80">{c.tagline}</p>
                <span className="room-more mt-5 inline-flex w-fit items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white">
                  เข้าไปดูสินค้า
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {rows
        .filter((r) => r.products.length > 0)
        .map(({ category, products }) => (
          <section
            key={category.id}
            className="mx-auto mt-16 max-w-6xl px-4 md:mt-24"
            style={themeStyle(category.theme)}
          >
            <div className="mb-6 flex items-end justify-between gap-4 border-b-2 border-accent pb-3">
              <h2 className="text-2xl font-bold md:text-3xl">{category.name}</h2>
              <Link href={`/c/${category.slug}`} className="shrink-0 text-sm font-semibold text-accent hover:underline">
                ดูทั้งหมด
              </Link>
            </div>
            <ProductGrid products={products} />
          </section>
        ))}
    </>
  );
}
