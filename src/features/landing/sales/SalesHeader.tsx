import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

const NAV_LINKS = [
  { label: "O problema", href: "#problema" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "O painel", href: "#painel" },
  { label: "Preços", href: "#precos" },
];

export default function SalesHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#090D16]/[.78] backdrop-blur font-manrope">
      <div className="mx-auto flex h-[70px] max-w-[1140px] items-center px-6">
        {/* Logo */}
        <a href="#top" className="flex items-center">
          <BrandLogo className="h-8 w-auto" />
        </a>

        {/* Desktop nav */}
        <nav className="ml-10 hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[#9aa3b2] transition-colors hover:text-[#F5F7FA]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side (desktop) */}
        <div className="ml-auto flex items-center gap-5">
          <Link
            to="/login"
            className="hidden text-sm text-[#9aa3b2] transition-colors hover:text-[#F5F7FA] md:inline-flex"
          >
            Entrar
          </Link>
          <a
            href="#precos"
            className="hidden rounded-xl bg-[#318CE9] px-[18px] py-[10px] text-sm font-bold text-[#031426] transition-opacity hover:opacity-90 md:inline-flex"
          >
            Começar agora
          </a>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#F5F7FA] transition-colors hover:bg-white/[0.06] md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {createPortal(
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden={!open}
            className={`fixed inset-0 z-[100] bg-black/80 transition-opacity duration-300 md:hidden ${
              open ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
          <aside
            aria-hidden={!open}
            className={`fixed right-0 top-0 z-[110] flex h-dvh min-h-screen w-80 max-w-[80%] flex-col border-l border-white/[0.08] bg-[#0B1018] px-6 py-5 transition-transform duration-300 ease-out md:hidden ${
              open ? "translate-x-0" : "pointer-events-none translate-x-full"
            }`}
            style={{ backgroundColor: "#0B1018" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-grotesk text-[17px] font-bold text-[#F5F7FA]">
                MarketDash
              </span>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#9aa3b2] transition-colors hover:bg-white/[0.06] hover:text-[#F5F7FA]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="mt-8 flex flex-1 flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-3 text-base text-[#9aa3b2] transition-colors hover:bg-white/[0.04] hover:text-[#F5F7FA]"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-white/[0.08] pt-5">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base text-[#9aa3b2] transition-colors hover:text-[#F5F7FA]"
              >
                Entrar
              </Link>
              <a
                href="#precos"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-[#318CE9] px-[18px] py-[12px] text-center text-base font-bold text-[#031426] transition-opacity hover:opacity-90"
              >
                Começar agora
              </a>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </header>
  );
}
