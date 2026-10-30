import { listCategories } from "@/lib/repo/catalog";
import { CategoryEditor } from "./CategoryEditor";

export default async function AdminCategories() {
  const categories = await listCategories({ includeInactive: true });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">หมวดสินค้าและธีม</h1>
        <p className="text-muted">แต่ละหมวดมีสีและลวดลายของตัวเอง ใช้ทั้งในแบนเนอร์หน้าแรก หน้าหมวด และหน้าสินค้า</p>
      </div>
      {categories.map((c) => (
        <CategoryEditor
          key={c.id}
          initial={{
            id: c.id,
            name: c.name,
            slug: c.slug,
            tagline: c.tagline,
            description: c.description,
            theme: c.theme,
            banner_url: c.banner_path,
            sort_order: c.sort_order,
            is_active: c.is_active,
          }}
        />
      ))}
      <CategoryEditor
        isNew
        initial={{
          name: "",
          slug: "",
          tagline: "",
          description: "",
          theme: { accent: "#2F6B4F", surface: "#E7F0EA", ink: "#0F2219", motif: "plain" },
          banner_url: null,
          sort_order: categories.length + 1,
          is_active: true,
        }}
      />
    </div>
  );
}
