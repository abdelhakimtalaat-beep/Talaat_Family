export type Locale = "ar" | "en";
export const dict = {
  ar: {
    appName: "عائلتي",
    nav: {
      dashboard: "لوحة التحكم", documents: "أرشيف العائلة", photos: "الصور والذكريات",
      directory: "دليل العائلة", tree: "شجرة العائلة", villa: "إدارة الفيلا",
      maintenance: "الصيانة والتشطيب", finance: "الإدارة المالية",
      calendar: "التقويم والتذكيرات", users: "إدارة المستخدمين", settings: "الإعدادات",
    },
    login: { title: "تسجيل الدخول", email: "البريد الإلكتروني", password: "كلمة المرور", submit: "دخول", error: "تعذر تسجيل الدخول. تحقق من البيانات." },
    dash: {
      members: "أفراد العائلة", documents: "المستندات", photos: "الصور", albums: "الألبومات",
      expiring: "مستندات قاربت على الانتهاء", events: "المناسبات القادمة",
      openTasks: "مهام تشطيب مفتوحة", totalExpenses: "إجمالي مصروفات الفيلا",
      balances: "الأرصدة بين المقيمين", owed: "له", owes: "عليه", settled: "مسوّى",
      none: "لا يوجد", currency: "ج.م",
    },
    villa: {
      docsTitle: "مستندات الفيلا", upload: "رفع مستند للفيلا", quickTitle: "رفع سريع", newTitle: "مستند جديد للفيلا",
      quick: { contract: "عقد", handover: "محضر استلام", license: "ترخيص", arch: "مخطط معماري", struct: "مخطط إنشائي" },
      groups: { legal: "العقود والوثائق القانونية", handoverLicense: "محضر الاستلام والتراخيص", drawings: "المخططات الهندسية", other: "مستندات أخرى" },
      empty: "لا توجد مستندات في هذا القسم بعد.", download: "تنزيل",
      soon: "معلومات الفيلا والمساحات وتوثيق الصور تأتي في المرحلة 4.",
    },
    docs: {
      add: "إضافة مستند", search: "بحث بالاسم أو الرقم أو الجهة", allCategories: "كل الفئات", allMembers: "كل الأشخاص",
      from: "من تاريخ", to: "إلى تاريخ", filter: "تصفية", reset: "إعادة ضبط",
      sort: "الترتيب", sortNew: "الأحدث رفعًا", sortExpiry: "الأقرب انتهاءً", sortTitle: "الاسم",
      empty: "لا توجد مستندات.", title: "عنوان المستند", category: "الفئة", member: "الشخص المرتبط", number: "رقم المستند",
      issued: "تاريخ الإصدار", expires: "تاريخ الانتهاء", authority: "جهة الإصدار", notes: "ملاحظات",
      sensitive: "مستند حساس (لا يراه إلا من لديه صلاحية كاملة)", remind: "التنبيه قبل الانتهاء (أيام)",
      file: "الملف (PDF أو صورة أو مستند)", fileRequired: "اختر ملفًا للرفع.", save: "حفظ", saving: "جارٍ الحفظ…",
      uploadedBy: "رُفع بواسطة", uploadedAt: "تاريخ الرفع", version: "الإصدار", noMember: "—",
      preview: "معاينة", download: "تنزيل", edit: "تعديل", archive: "أرشفة", archiveConfirm: "تأكيد الأرشفة",
      replace: "استبدال الملف (إصدار جديد)", history: "سجل الإصدارات", current: "الحالي", noHistory: "لا توجد إصدارات سابقة.",
      state: { expired: "منتهي", soon: "قارب على الانتهاء", ok: "ساري", none: "بدون انتهاء" },
      noPreview: "لا تتوفر معاينة لهذا النوع، استخدم التنزيل.", back: "رجوع للقائمة",
      errors: {
        generic: "حدث خطأ، حاول مرة أخرى.", forbidden: "ليست لديك صلاحية.", type_not_allowed: "نوع الملف غير مسموح.",
        too_large: "الملف أكبر من 100 ميجابايت.", drive_unavailable: "تخزين Google Drive غير متاح الآن.",
        needs_reconnect: "يلزم إعادة ربط Google Drive من الإعدادات.", upload_failed: "فشل رفع الملف.",
        register_failed: "تم الرفع لكن تعذر تسجيل الملف.", invalid: "تحقق من الحقول المطلوبة.",
      },
    },
    drive: {
      title: "تخزين الملفات (Google Drive)", account: "الحساب المرتبط", status: "الحالة",
      connected: "متصل", disconnected: "غير متصل", needs_reconnect: "يلزم إعادة الربط",
      connect: "ربط حساب العائلة", reconnect: "إعادة الربط", disconnect: "فصل الحساب",
      initFolders: "إنشاء/فحص المجلدات", lastSync: "آخر مزامنة", never: "لم تتم بعد",
      lastBackup: "آخر نسخة احتياطية", backupFailed: "فشلت آخر نسخة احتياطية",
      adminOnly: "إعدادات التخزين متاحة للمدير فقط.",
      msg: {
        connected: "تم ربط الحساب وإنشاء المجلدات بنجاح.", denied: "تم إلغاء الموافقة من جوجل.",
        no_refresh_token: "لم تُرسل جوجل رمز التحديث. أزل صلاحية التطبيق من حساب جوجل ثم أعد المحاولة.",
        state_error: "فشل التحقق الأمني. أعد المحاولة.", error: "حدث خطأ أثناء الربط.", folders: "تم فحص المجلدات.",
      },
    },
    signOut: "تسجيل الخروج", language: "English",
  },
  en: {
    appName: "Family Hub",
    nav: {
      dashboard: "Dashboard", documents: "Family Archive", photos: "Photos & Memories",
      directory: "Family Directory", tree: "Family Tree", villa: "Villa Management",
      maintenance: "Maintenance & Finishing", finance: "Financial Management",
      calendar: "Calendar & Reminders", users: "User Management", settings: "Settings",
    },
    login: { title: "Sign in", email: "Email", password: "Password", submit: "Sign in", error: "Could not sign in. Check your details." },
    dash: {
      members: "Family members", documents: "Documents", photos: "Photos", albums: "Albums",
      expiring: "Documents expiring soon", events: "Upcoming events",
      openTasks: "Open finishing tasks", totalExpenses: "Total villa expenses",
      balances: "Balances between residents", owed: "is owed", owes: "owes", settled: "Settled",
      none: "None", currency: "EGP",
    },
    villa: {
      docsTitle: "Villa documents", upload: "Upload villa document", quickTitle: "Quick upload", newTitle: "New villa document",
      quick: { contract: "Contract", handover: "Handover report", license: "License", arch: "Architectural drawing", struct: "Structural drawing" },
      groups: { legal: "Contracts & legal documents", handoverLicense: "Handover report & licenses", drawings: "Engineering drawings", other: "Other documents" },
      empty: "No documents in this section yet.", download: "Download",
      soon: "Villa information, spaces and photo documentation arrive in Phase 4.",
    },
    docs: {
      add: "Add document", search: "Search by title, number or authority", allCategories: "All categories", allMembers: "All people",
      from: "From date", to: "To date", filter: "Filter", reset: "Reset",
      sort: "Sort", sortNew: "Newest uploaded", sortExpiry: "Expiring first", sortTitle: "Title",
      empty: "No documents.", title: "Document title", category: "Category", member: "Related person", number: "Document number",
      issued: "Issue date", expires: "Expiry date", authority: "Issuing authority", notes: "Notes",
      sensitive: "Sensitive (visible only to users with full access)", remind: "Remind before expiry (days)",
      file: "File (PDF, image or document)", fileRequired: "Choose a file to upload.", save: "Save", saving: "Saving…",
      uploadedBy: "Uploaded by", uploadedAt: "Uploaded", version: "Version", noMember: "—",
      preview: "Preview", download: "Download", edit: "Edit", archive: "Archive", archiveConfirm: "Confirm archive",
      replace: "Replace file (new version)", history: "Version history", current: "Current", noHistory: "No earlier versions.",
      state: { expired: "Expired", soon: "Expiring soon", ok: "Valid", none: "No expiry" },
      noPreview: "No preview for this type; use download.", back: "Back to list",
      errors: {
        generic: "Something went wrong, try again.", forbidden: "You do not have permission.", type_not_allowed: "File type not allowed.",
        too_large: "File is larger than 100 MB.", drive_unavailable: "Google Drive storage is unavailable right now.",
        needs_reconnect: "Google Drive must be reconnected in Settings.", upload_failed: "Upload failed.",
        register_failed: "Uploaded, but the file could not be recorded.", invalid: "Check the required fields.",
      },
    },
    drive: {
      title: "File storage (Google Drive)", account: "Linked account", status: "Status",
      connected: "Connected", disconnected: "Not connected", needs_reconnect: "Reconnect required",
      connect: "Connect family account", reconnect: "Reconnect", disconnect: "Disconnect",
      initFolders: "Create / check folders", lastSync: "Last sync", never: "Never",
      lastBackup: "Last backup", backupFailed: "The last backup failed",
      adminOnly: "Storage settings are available to the administrator only.",
      msg: {
        connected: "Account connected and folders created.", denied: "Google consent was cancelled.",
        no_refresh_token: "Google sent no refresh token. Remove the app's access in your Google account and retry.",
        state_error: "Security check failed. Try again.", error: "Something went wrong while connecting.", folders: "Folders checked.",
      },
    },
    signOut: "Sign out", language: "العربية",
  },
} as const;
export type Dict = (typeof dict)["ar"];
/** Widens literal string types so Arabic and English dictionaries are assignable to the same prop type. */
export type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type DocsT = Widen<(typeof dict)["ar"]["docs"]>;
export type VillaT = Widen<(typeof dict)["ar"]["villa"]>;
