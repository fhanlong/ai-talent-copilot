export const AUTH_COOKIE = "talent_copilot_session";

export async function createAuthToken(code: string) {
  const secret = process.env.AUTH_SECRET || "local-demo-secret";
  const bytes = new TextEncoder().encode(`${code}:${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function isAuthEnabled() {
  return Boolean(process.env.APP_ACCESS_CODE);
}
