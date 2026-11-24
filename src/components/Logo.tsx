import Image from "next/image";
import Link from "next/link";

/**
 * Logo oficial. `logo.png` é a versão para fundos escuros (letras claras);
 * `logo-original.png` mantém as cores originais (azul-marinho) para fundos claros.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Linckia Lab — página inicial"
      className={`inline-flex ${className}`}
    >
      <Image
        src="/logo.png"
        alt="Linckia Lab"
        width={1015}
        height={365}
        priority
        className="h-10 w-auto"
      />
    </Link>
  );
}
