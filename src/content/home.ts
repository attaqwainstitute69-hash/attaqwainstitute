// Homepage content that has no API yet (api-spec §13 #7: "serve from static config in V1").
// Every list starts EMPTY on purpose: a section with no entries is hidden or shows only its call to action,
// so the site never shows invented numbers, names or reviews. Fill these with real, verified data.
// Text is { bn, en }; `en` may be left equal to `bn` until a translation exists.

type Text = { bn: string; en: string };

// S6 stats counters, shown after the two automatic ones (years since 2019, live course count).
// Example: { value: 500, suffix: "+", label: { bn: "প্রশিক্ষিত শিক্ষক", en: "teachers trained" } }
export const extraStats: { value: number; suffix?: string; label: Text }[] = [];

// S9 the nine steps of the Student Monitoring System, in order. The infographic appears only when all 9 are filled in.
// Example: { title: { bn: "দৈনিক উপস্থিতি", en: "Daily attendance" } }
export const monitoringSteps: { title: Text }[] = [];

// S8 partner & client institutions. `logo` is an https image URL (e.g. uploaded to R2 from the admin panel).
// Example: { name: { bn: "মারকাযুত তাকওয়া", en: "Markazut Taqwa" }, district: { bn: "ঢাকা", en: "Dhaka" } }
export const partnerInstitutions: { name: Text; district: Text; logo?: string }[] = [];

// S12 upcoming events & webinars. `date` is YYYY-MM-DD; past events are hidden automatically.
// `registerUrl` is optional (a form or Facebook event link); without it the button opens WhatsApp.
export const upcomingEvents: { title: Text; date: string; place: Text; registerUrl?: string }[] = [];
