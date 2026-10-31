import { notFound } from "next/navigation";

// Unmatched URLs under /bn or /en render the localized not-found page inside the site layout.
export default function CatchAll() {
  notFound();
}
