export const metadata = { title: "Privacy Policy – Family Hub" };

const box = "mx-auto max-w-2xl space-y-3 p-4 text-sm leading-7";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-beige-100 py-6">
      <section dir="rtl" lang="ar" className={box}>
        <h1 className="text-2xl font-bold">سياسة الخصوصية – عائلتي (Family Hub)</h1>
        <p>عائلتي تطبيق خاص لإدارة شؤون العائلة والفيلا، ويستخدمه أفراد العائلة المدعوون فقط.</p>
        <h2 className="font-bold">ما البيانات التي يحفظها التطبيق؟</h2>
        <p>
          بيانات الحسابات (الاسم والبريد الإلكتروني)، وبيانات أفراد العائلة وأرقام التواصل وتواريخ الميلاد وصلات القرابة،
          وسجلات المستندات والصور (عنوان وتاريخ وملاحظات)، وسجلات الفيلا والصيانة والمصروفات والتسويات بين المقيمين.
        </p>
        <h2 className="font-bold">أين تُحفظ البيانات والملفات؟</h2>
        <p>
          السجلات النصية تُحفظ في قاعدة بيانات Supabase بحماية صلاحيات على مستوى قاعدة البيانات. أما الملفات (المستندات والصور
          والمخططات) فتُحفظ في حساب Google Drive الخاص بالعائلة، ولا تُجعل عامة، ولا تُعرض إلا لمن يملك صلاحية داخل التطبيق.
        </p>
        <h2 className="font-bold">بيانات حساب Google</h2>
        <p>
          يطلب التطبيق صلاحية واحدة فقط من Google Drive هي <span dir="ltr">drive.file</span>، وهي تتيح له التعامل مع الملفات
          والمجلدات التي أنشأها هو فقط، ولا يستطيع قراءة بقية ملفاتك. يُحفظ رمز الربط مشفّرًا في الخادم ولا يصل إلى المتصفح.
          لا نبيع هذه البيانات ولا نشاركها مع أي جهة، ولا نستخدمها للإعلانات أو لتدريب نماذج الذكاء الاصطناعي. استخدام التطبيق
          للمعلومات المستلمة من واجهات Google يلتزم بسياسة بيانات المستخدم في خدمات Google API، بما في ذلك متطلبات الاستخدام المحدود.
        </p>
        <h2 className="font-bold">من يصل إلى البيانات؟</h2>
        <p>مدير التطبيق وأفراد العائلة الذين منحهم المدير صلاحيات، وكل منهم يرى ما يسمح به دوره فقط.</p>
        <h2 className="font-bold">إلغاء الربط وحذف البيانات</h2>
        <p>
          يمكن للمدير فصل حساب Drive من صفحة الإعدادات، ويمكنك سحب الصلاحية في أي وقت من صفحة أذونات حسابك في Google.
          لطلب تعديل أو حذف بياناتك تواصل مع مدير التطبيق.
        </p>
      </section>

      <hr className="mx-auto my-6 max-w-2xl border-mist" />

      <section dir="ltr" lang="en" className={box}>
        <h1 className="text-2xl font-bold">Privacy Policy – Family Hub</h1>
        <p>Family Hub is a private application for managing family and villa information, used only by invited family members.</p>
        <h2 className="font-bold">What data is stored</h2>
        <p>
          Account details (name, email); family member details, contact numbers, birth dates and relationships; records about
          documents and photos (title, date, notes); villa, maintenance, expense and settlement records between residents.
        </p>
        <h2 className="font-bold">Where data and files are stored</h2>
        <p>
          Text records are stored in a Supabase database protected by database-level access policies. Files (documents, photos,
          drawings) are stored in the family&apos;s Google Drive. They are never made public and are shown only to users who have
          permission inside the app.
        </p>
        <h2 className="font-bold">Google user data</h2>
        <p>
          The app requests a single Google Drive scope, <code>drive.file</code>, which lets it work only with files and folders it
          created itself; it cannot read the rest of your Drive. The authorization token is stored encrypted on the server and is
          never sent to the browser. We do not sell or share this data, do not use it for advertising, and do not use it to train AI
          models. The app&apos;s use of information received from Google APIs adheres to the Google API Services User Data Policy,
          including the Limited Use requirements.
        </p>
        <h2 className="font-bold">Who can access the data</h2>
        <p>The application administrator and the family members the administrator has granted access to; each sees only what their role allows.</p>
        <h2 className="font-bold">Revoking access and deleting data</h2>
        <p>
          The administrator can disconnect Google Drive from the Settings page, and you can revoke access at any time from your
          Google Account permissions page. To request correction or deletion of your data, contact the application administrator.
        </p>
      </section>
    </main>
  );
}
