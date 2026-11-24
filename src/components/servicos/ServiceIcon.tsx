import Image from "next/image";
import type { ServiceIconName } from "@/data/services";

const artwork: Record<ServiceIconName, string> = {
  landing: "landing-page",
  site: "institutional-website",
  store: "ecommerce",
  system: "web-system",
  app: "progressive-web-app",
  redesign: "website-redesign",
};

export default function ServiceIcon({
  name,
  className = "h-9 w-9",
  illustration = false,
}: {
  name: ServiceIconName;
  className?: string;
  illustration?: boolean;
}) {
  const directory = illustration ? "illustrations" : "icons";
  const size = illustration ? 384 : 36;

  return (
    <Image
      unoptimized
      src={`/assets/services/${directory}/${artwork[name]}.webp`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      alt=""
    />
  );
}
