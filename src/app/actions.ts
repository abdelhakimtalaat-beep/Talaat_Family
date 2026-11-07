"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: boolean; detail?: string } | null;

export async function signIn(_: SignInState, form: FormData): Promise<SignInState> {
  let failure: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (error) failure = error.code ?? error.message;
  } catch (e) {
    // e.g. wrong Supabase URL / key, or Supabase unreachable
    failure = e instanceof Error ? e.message : "unknown";
  }
  if (failure) return { error: true, detail: failure.slice(0, 120) };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function toggleLocale() {
  const store = await cookies();
  store.set("locale", store.get("locale")?.value === "en" ? "ar" : "en", { path: "/", maxAge: 31536000 });
  redirect("/");
}
