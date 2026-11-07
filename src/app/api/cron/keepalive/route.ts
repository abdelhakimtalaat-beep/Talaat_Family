import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron-auth";
import { adminClient } from "@/lib/supabase/admin";

// Runs daily from Vercel Cron. A small real query keeps the free Supabase project
// from being paused for inactivity.
export async function GET(req: Request) {
  if (!isCronRequest(req)) return new NextResponse("Unauthorized", { status: 401 });
  const { error } = await adminClient().from("roles").select("id").limit(1);
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
