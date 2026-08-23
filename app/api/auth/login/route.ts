import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, createAuthToken, isAuthEnabled } from "@/lib/auth";

const input = z.object({ code: z.string().min(1).max(200) });

export async function POST(request: Request) {
  try {
    if (!isAuthEnabled()) return NextResponse.json({ ok: true, disabled: true });
    const { code } = input.parse(await request.json());
    if (code !== process.env.APP_ACCESS_CODE) return NextResponse.json({ error: "访问码不正确" }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE, await createAuthToken(code), { httpOnly: true, sameSite: "lax", secure: process.env.AUTH_COOKIE_SECURE === "true", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "登录失败" }, { status: 400 }); }
}
