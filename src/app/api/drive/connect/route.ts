import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/session";
import { buildAuthUrl } from "@/lib/google/drive";

// Admin only: starts the one-time connection to the designated family Google account.
export async function GET(req: Request) {
  const s = await getSession();
  if (!s?.profile.is_admin) return NextResponse.redirect(new URL("/", req.url));
  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("drive_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/drive", maxAge: 600 });
  return res;
}
