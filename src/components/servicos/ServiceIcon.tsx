import type { ReactNode } from "react";
import type { ServiceIconName } from "@/data/services";

/** Ícones minimalistas (traço) dos serviços. Decorativos: aria-hidden. */
const PATHS: Record<ServiceIconName, ReactNode> = {
  landing: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M6.5 6.5h.01M9 6.5h.01M7 13h6M7 16.5h10" />
    </>
  ),
  site: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" />
    </>
  ),
  store: (
    <>
      <path d="M3 4h2.2l2.1 10.1a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.2L20.6 8H6.1" />
      <circle cx="9.5" cy="19.3" r="1.3" />
      <circle cx="17" cy="19.3" r="1.3" />
    </>
  ),
  system: <path d="M8 7.5 3.5 12 8 16.5M16 7.5l4.5 4.5-4.5 4.5M13.6 4.5l-3.2 15" />,
  app: (
    <>
      <rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6" />
      <path d="M10.8 18h2.4" />
    </>
  ),
  redesign: (
    <>
      <path d="M18.6 3.7a2.1 2.1 0 0 1 2.9 2.9l-8.7 8.7-2.9-2.9z" />
      <path d="M9.9 12.4c-2.4-.1-4.2 1.5-4.4 3.8-.1 1.5-.8 2.6-2 3.3 3.8.9 7.4-.1 8.6-2.6.6-1.3.3-2.6-.6-3.6" />
    </>
  ),
};

export default function ServiceIcon({
  name,
  className = "h-6 w-6",
}: {
  name: ServiceIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
