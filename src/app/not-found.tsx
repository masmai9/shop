import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">ไม่พบหน้านี้</h1>
      <p className="mt-2 text-muted">ลิงก์อาจผิดหรือสินค้านี้ไม่มีจำหน่ายแล้ว</p>
      <Link href="/" className="btn btn-primary mt-6">กลับหน้าแรก</Link>
    </div>
  );
}
