import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

const PRODUTO_LINKS = [
  { label: "Funcionalidades", href: "#painel" },
  { label: "Preços", href: "#precos" },
  { label: "Como funciona", href: "#como-funciona" },
];

export default function SalesFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#090D16] px-6 py-12 font-manrope">
      <div className="mx-auto max-w-[1140px]">
        {/* Colunas */}
        <div className="flex flex-wrap justify-between gap-10">
          {/* Coluna esquerda — marca */}
          <div className="max-w-[320px]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1c3c5e] to-[#0d1726]">
                <TrendingUp className="h-[18px] w-[18px] text-[#7CB8F2]" />
              </span>
              <span className="font-grotesk text-[17px] font-bold text-[#F5F7FA]">
                MarketDash
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#9aa3b2]">
              Conecte Shopee e Meta e veja o lucro real de cada campanha. Para
              afiliados que vivem de performance.
            </p>

            <p className="mt-5 text-xs leading-relaxed text-[#6B7280]">
              ORQUESTRA IA - TRANSFORMANDO SOLUÇÕES LTDA — CNPJ:
              66.641.347/0001-21
              <br />
              Rua da Carioca, 1379, Uberlândia-MG — CEP 38.411-151
            </p>
          </div>

          {/* Coluna Produto */}
          <div>
            <h3 className="font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
              Produto
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {PRODUTO_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-[#9aa3b2] transition-colors hover:text-[#F5F7FA]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna Legal */}
          <div>
            <h3 className="font-jbmono text-xs uppercase tracking-[0.14em] text-[#7CB8F2]">
              Legal
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-[#9aa3b2] transition-colors hover:text-[#F5F7FA]"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-[#9aa3b2] transition-colors hover:text-[#F5F7FA]"
                >
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t border-white/[0.08] pt-6">
          <p className="text-xs text-[#6B7280]">
            © 2026 Orquestra IA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
