import { whatsappLink } from "@/lib/site";

// Floating click-to-chat button, mobile only (PRD F8, F20).
export function WhatsAppButton({ label }: { label: string }) {
  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed right-4 bottom-4 z-50 inline-flex size-14 items-center justify-center rounded-full bg-[#1f7a4a] text-white shadow-lg hover:bg-[#186139] md:hidden"
    >
      <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.28-.68-2.78-1.1-4.54-3.94-4.68-4.12-.13-.18-1.12-1.49-1.12-2.84s.71-2.01.96-2.29c.25-.27.55-.34.73-.34h.52c.17 0 .4-.06.62.47.24.56.8 1.94.87 2.08.07.14.12.3.02.48-.09.18-.14.3-.27.46l-.41.48c-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.35Z" />
      </svg>
    </a>
  );
}
