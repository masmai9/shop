import Link from "next/link";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartButton } from "@/components/cart/CartButton";
import { getSettings } from "@/lib/repo/settings";
import { listCategories } from "@/lib/repo/catalog";
import { getCustomerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, session] = await Promise.all([
    getSettings(),
    listCategories(),
    getCustomerSession(),
  ]);

  return (
    <CartProvider>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            {settings.shop.name}
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="หมวดสินค้า">
            {categories.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="rounded-full px-3 py-1.5 text-sm hover:bg-card">
                {c.name}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/account" className="btn btn-ghost btn-sm">
              {session ? "คำสั่งซื้อของฉัน" : "เข้าสู่ระบบ"}
            </Link>
            <CartButton />
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden"
          aria-label="หมวดสินค้า"
        >
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="shrink-0 rounded-full border border-line bg-card px-3 py-1 text-sm"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
          <div>
            <p className="font-display text-base font-bold">{settings.shop.name}</p>
            {settings.shop.tagline && <p className="mt-1 text-muted">{settings.shop.tagline}</p>}
          </div>
          <div className="space-y-1">
            <p className="font-semibold">หมวดสินค้า</p>
            {categories.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="block text-muted hover:text-base">
                {c.name}
              </Link>
            ))}
          </div>
          <div className="space-y-1 text-muted">
            <p className="font-semibold text-base">ติดต่อร้าน</p>
            {settings.shop.contact_phone && <p>โทร {settings.shop.contact_phone}</p>}
            {settings.shop.line_id && <p>LINE {settings.shop.line_id}</p>}
            {settings.shop.address && <p className="whitespace-pre-line">{settings.shop.address}</p>}
          </div>
        </div>
      </footer>
    </CartProvider>
  );
}
