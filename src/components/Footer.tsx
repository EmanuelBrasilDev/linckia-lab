import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-abyss">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm text-muted">
            Sites e soluções web que transformam ideias em experiências
            digitais.
          </p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="flex gap-6 text-sm text-muted">
            <li>
              <Link href="/" className="hover:text-white">
                Início
              </Link>
            </li>
            <li>
              <Link href="/servicos" className="hover:text-white">
                Serviços
              </Link>
            </li>
            <li>
              <Link href="/contato" className="hover:text-white">
                Contato
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-muted">
        © 2026 Linckia Lab. Todos os direitos reservados.
      </div>
    </footer>
  );
}
