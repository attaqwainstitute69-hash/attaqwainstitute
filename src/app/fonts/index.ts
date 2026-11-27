import localFont from "next/font/local";
import { Plus_Jakarta_Sans } from "next/font/google";

// Shared by the site and admin root layouts. Add `fontVariables` to <html className>.

// SolaimanLipi, self-hosted (PRD §1.7): the Bengali face, also used for Latin text on /bn pages.
const solaimanLipi = localFont({
  src: [
    { path: "./solaimanlipi-normal-v1.0.woff2", weight: "400", style: "normal" },
    { path: "./solaimanlipi-bold-v1.0.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-solaiman",
  display: "swap",
});

// Plus Jakarta Sans: geometric sans for English pages, bold headlines and numbers.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  preload: false, // Preload only the primary (Bengali) face (F17)
});

export const fontVariables = `${solaimanLipi.variable} ${jakarta.variable}`;
