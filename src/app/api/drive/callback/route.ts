import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ensureFolders, exchangeCode, saveConnection } from "@/lib/google/drive";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/settings?drive=${q}`, req.url));

  const s = await getSession();
  if (!s?.profile.is_admin) return NextResponse.redirect(new URL("/", req.url));

  // CSRF check: the state must match the cookie set by /connect.
  const cookieState = req.headers.get("cookie")?.match(/drive_oauth_state=([a-f0-9]+)/)?.[1];
  if (!cookieState || cookieState !== url.searchParams.get("state")) return back("state_error");
  if (url.searchParams.get("error")) return back("denied");

  const code = url.searchParams.get("code");
  if (!code) return back("error");
  try {
    const t = await exchangeCode(code);
    if (!t.refresh_token) return back("no_refresh_token");
    await saveConnection(t.refresh_token, t.access_token, s.profile.id);
    await ensureFolders();
    const res = back("connected");
    res.cookies.delete({ name: "drive_oauth_state", path: "/api/drive" });
    return res;
  } catch {
    return back("error");
  }
}
