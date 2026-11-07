import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: BYPASSES Row Level Security.
 * Use only in server code, and only for tables with no user policies (drive_connection).
 * Never import this from a client component.
 */
export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
