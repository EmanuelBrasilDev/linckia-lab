import type { ReactNode } from "react";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0";

const variants = {
  primary:
    "bg-linckia text-white shadow-[0_8px_30px_-8px_rgba(68,104,242,0.7)] hover:bg-[#5576f5] hover:shadow-[0_12px_36px_-8px_rgba(68,104,242,0.95)]",
  ghost:
    "border border-white/15 bg-white/[0.03] text-ink hover:border-bio/60 hover:bg-white/[0.07]",
};

/** Âncora para seções da mesma página (#id). */
export default function Button({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <a href={href} className={`${base} ${variants[variant]}`}>
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-300 group-hover:translate-x-1"
      >
        ↓
      </span>
    </a>
  );
}
