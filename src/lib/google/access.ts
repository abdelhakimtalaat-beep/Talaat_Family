import { getSession, allows } from "@/lib/session";
import { UPLOAD_TARGETS } from "./drive";

/** Returns the session if the user may upload into `folder`, otherwise null. */
export async function sessionForUpload(folder: string) {
  const s = await getSession();
  const modules = UPLOAD_TARGETS[folder];
  if (!s || !modules) return null;
  return modules.some((m) => allows(s.levels[m], "update")) ? s : null;
}
