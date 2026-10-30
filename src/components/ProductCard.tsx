import Link from "next/link";
import type { ProductWithCategory } from "@/lib/repo/catalog";
import { formatBaht } from "@/lib/format";
import { Motif, themeStyle } from "./Motif";

export function ProductCard({ p }: { p: ProductWithCategory }) {
  const img = p.images[0];
  const soldOut = p.stock <= 0;
  const low = !soldOut && p.stock <= p.low_stock_alert;
  const onSale = p.compare_at_price != null && p.compare_at_price > p.price;

  return (
    <Link href={`/p/${p.slug}`} className="group block" style={themeStyle(p.category.theme)}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={p.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <div className="h-full w-full text-accent opacity-60">
            <Motif kind={p.category.theme.motif} className="h-full w-full" />
          </div>
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-base px-2.5 py-0.5 text-xs font-semibold text-white">หมด</span>
        )}
        {onSale && !soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">ลดราคา</span>
        )}
      </div>
      <div className="mt-3 space-y-0.5 px-0.5">
        <h3 className="line-clamp-2 font-sans text-[0.95rem] font-medium leading-snug">{p.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold">{formatBaht(p.price)}</span>
          {onSale && <s className="text-sm text-muted">{formatBaht(p.compare_at_price)}</s>}
        </div>
        {low && <p className="text-xs font-medium text-accent">เหลือ {p.stock} ชิ้น</p>}
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductWithCategory[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
