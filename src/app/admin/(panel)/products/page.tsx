import Link from "next/link";
import { listCategories, listProducts } from "@/lib/repo/catalog";
import { formatBaht } from "@/lib/format";
import { StockStepper } from "./StockStepper";

export default async function AdminProducts(props: PageProps<"/admin/products">) {
  const sp = await props.searchParams;
  const cat = typeof sp.cat === "string" ? sp.cat : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const lowOnly = sp.filter === "low";
  const [categories, all] = await Promise.all([
    listCategories({ includeInactive: true }),
    listProducts({ includeInactive: true, categoryId: cat, search: q || undefined }),
  ]);
  const products = lowOnly ? all.filter((p) => p.stock <= p.low_stock_alert) : all;
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ cat, q: q || undefined, filter: lowOnly ? "low" : undefined, ...o })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">สินค้าและสต๊อก</h1>
        <Link href="/admin/products/new" className="btn btn-primary">เพิ่มสินค้า</Link>
      </div>

      <form className="flex gap-2">
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input name="q" defaultValue={q} placeholder="ค้นหาชื่อสินค้า" className="field max-w-sm" />
        <button className="btn btn-ghost">ค้นหา</button>
      </form>

      <div className="flex gap-1 overflow-x-auto">
        <Link href={`/admin/products${qs({ cat: undefined })}`} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${!cat ? "bg-base text-white" : "border border-line bg-card"}`}>ทุกหมวด</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/admin/products${qs({ cat: c.id })}`} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${cat === c.id ? "bg-base text-white" : "border border-line bg-card"}`}>
            {c.name}
          </Link>
        ))}
        <Link
          href={`/admin/products${qs({ filter: lowOnly ? undefined : "low" })}`}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${lowOnly ? "bg-amber-600 text-white" : "border border-line bg-card"}`}
        >
          ใกล้หมด
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="font-semibold">ยังไม่มีสินค้า{lowOnly ? "ที่ใกล้หมด" : ""}</p>
          {!lowOnly && <Link href="/admin/products/new" className="btn btn-primary mt-4">เพิ่มสินค้าชิ้นแรก</Link>}
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">สินค้า</th>
                <th className="px-4 py-3 font-medium">หมวด</th>
                <th className="px-4 py-3 text-right font-medium">ราคา</th>
                <th className="px-4 py-3 font-medium">สต๊อก</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded bg-paper">
                        {p.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="line-clamp-2 font-medium hover:underline">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.category.name}</td>
                  <td className="px-4 py-3 text-right">{formatBaht(p.price)}</td>
                  <td className="px-4 py-3"><StockStepper productId={p.id} stock={p.stock} low={p.low_stock_alert} /></td>
                  <td className="px-4 py-3">
                    {p.is_active ? <span className="status-pill tone-ok">แสดงอยู่</span> : <span className="status-pill tone-done">ซ่อน</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
