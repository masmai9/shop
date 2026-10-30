import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";
import { adminLogout } from "../actions";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "หลังบ้าน", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <aside className="border-b border-line bg-card md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/admin" className="font-display text-lg font-bold">หลังบ้าน</Link>
          <div className="flex gap-3 text-sm md:mt-1">
            <Link href="/" target="_blank" className="text-muted hover:underline">ดูหน้าร้าน</Link>
            <form action={adminLogout}>
              <button className="text-muted hover:underline">ออกจากระบบ</button>
            </form>
          </div>
        </div>
        <AdminNav />
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
