"use client";
import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";

export default function LoginForm({ t }: { t: { email: string; password: string; submit: string; error: string } }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, null);
  const input = "w-full rounded-xl border border-mist bg-warm px-3 py-2 outline-none focus:border-gold";
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" required placeholder={t.email} className={input} autoComplete="email" />
      <input name="password" type="password" required placeholder={t.password} className={input} autoComplete="current-password" />
      {state?.error && (
        <div className="text-sm text-red-700">
          <p>{t.error}</p>
          {state.detail && <p dir="ltr" className="mt-1 text-start font-mono text-xs opacity-80">{state.detail}</p>}
        </div>
      )}
      <button disabled={pending} className="w-full rounded-xl bg-navy py-2 font-semibold text-beige hover:bg-navy-700 disabled:opacity-60">
        {t.submit}
      </button>
    </form>
  );
}
