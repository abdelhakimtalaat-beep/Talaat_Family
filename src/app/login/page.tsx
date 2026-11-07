import { getT } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const t = await getT();
  return (
    <main className="flex min-h-screen items-center justify-center bg-beige-100 p-4">
      <div className="card w-full max-w-sm space-y-5 p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-navy" />
          <h1 className="text-2xl font-bold">{t.appName}</h1>
          <p className="text-sm text-gold-600">{t.login.title}</p>
        </div>
        <LoginForm t={t.login} />
      </div>
    </main>
  );
}
