import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/** Fast gate for /admin — pages and actions still check isAdmin() themselves. */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get("shop_admin")?.value;
  let ok = false;
  if (token && process.env.SESSION_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      ok = payload.role === "admin";
    } catch {
      ok = false;
    }
  }
  if (!ok) return NextResponse.redirect(new URL("/admin/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
