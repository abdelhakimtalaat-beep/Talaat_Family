import Link from "next/link";

export const metadata = { title: "Family Hub – About" };

export default function AboutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-beige-100 p-4">
      <div className="card w-full max-w-lg space-y-4 p-6 text-sm leading-7">
        <div dir="rtl" lang="ar" className="space-y-2">
          <h1 className="text-2xl font-bold">عائلتي (Family Hub)</h1>
          <p>
            تطبيق خاص لإدارة شؤون العائلة: أرشيف المستندات والصور، دليل العائلة وشجرتها، ومتابعة الفيلا
            ومصروفاتها وتقسيمها بين المقيمين. الدخول للأعضاء المدعوين فقط، وتُحفظ الملفات في Google Drive الخاص بالعائلة.
          </p>
        </div>
        <div dir="ltr" lang="en" className="space-y-2">
          <h2 className="text-xl font-bold">Family Hub</h2>
          <p>
            A private app for managing family matters: document and photo archive, family directory and tree, and villa
            maintenance and expenses shared between residents. Access is for invited members only; files are stored in the
            family&apos;s own Google Drive.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-mist pt-3">
          <Link href="/login" className="underline">تسجيل الدخول / Sign in</Link>
          <Link href="/privacy" className="underline">سياسة الخصوصية / Privacy policy</Link>
        </div>
      </div>
    </main>
  );
}
