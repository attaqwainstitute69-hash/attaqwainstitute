// Site-wide constants from PRD §1.8. These move to the admin Settings module (F15) later.
export const site = {
  name: { bn: "আত-তাকওয়া ইনস্টিটিউট", en: "At-Taqwa Institute" },
  address: { bn: "ব্যাংক কলোনি, সাভার, ঢাকা", en: "Bank Colony, Savar, Dhaka" },
  // Pin from the institute's Google Maps share link (maps.app.goo.gl/kmUSbhZNUPssqvk16).
  location: { lat: 23.844587, lng: 90.250535 },
  mapLink: "https://maps.app.goo.gl/kmUSbhZNUPssqvk16",
  phones: ["01619995011"],
  whatsapp: "8801619995011",
  email: "Attaqwainstitute69@gmail.com",
  facebook: "https://www.facebook.com/share/1RmdWwcFXq/",
  madrasatutTaqwaUrl: process.env.NEXT_PUBLIC_MADRASATUT_TAQWA_URL ?? "", // PRD open question #3
} as const;

export const whatsappLink = `https://wa.me/${site.whatsapp}`;

export const mapEmbedUrl = `https://maps.google.com/maps?q=${site.location.lat},${site.location.lng}&z=16&output=embed`;
