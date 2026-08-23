import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, createAuthToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const code = process.env.APP_ACCESS_CODE;
  if (!code) return NextResponse.next();
  const path = request.nextUrl.pathname;
  if (path === "/login" || path === "/api/health" || path.startsWith("/api/auth/") || path.startsWith("/_next/") || path === "/favicon.ico") return NextResponse.next();
  const valid = request.cookies.get(AUTH_COOKIE)?.value === await createAuthToken(code);
  if (valid) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const url = request.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
