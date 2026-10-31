// Site-wide constants from PRD §1.8. These move to the admin Settings module (F15) later.
export const site = {
  name: { bn: "আত-তাকওয়া ইনস্টিটিউট", en: "At-Taqwa Institute" },
  address: { bn: "ব্যাংক কলোনি, সাভার, ঢাকা", en: "Bank Colony, Savar, Dhaka" },
  phones: ["01612417120"], // TODO: second number "019995011" is incomplete (PRD open question #1)
  // TODO: PRD lists WhatsApp as 01400189683 in §1.8 but uses 8801619995011 in F8 — confirm which is correct.
  whatsapp: "8801400189683",
  email: "Attaqwainstitute69@gmail.com",
  facebook: "https://www.facebook.com/share/1RmdWwcFXq/",
  madrasatutTaqwaUrl: process.env.NEXT_PUBLIC_MADRASATUT_TAQWA_URL ?? "", // PRD open question #3
} as const;

export const whatsappLink = `https://wa.me/${site.whatsapp}`;
