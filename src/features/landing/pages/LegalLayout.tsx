import { ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logoName from "@/assets/logo/logo_name.png";

interface LegalLayoutProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

/** Layout simples e público para páginas legais (Privacidade, Termos). */
const LegalLayout = ({ title, updatedAt, children }: LegalLayoutProps) => {
  // Auto-scroll até a âncora da URL (ex.: /privacy#exclusao). Numa SPA o scroll
  // nativo do navegador falha porque o conteúdo só existe depois que o React
  // renderiza; por isso rolamos manualmente até a seção após a montagem.
  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    requestAnimationFrame(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoName} alt="MarketDash" className="h-7 w-auto brand-logo-name" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
        <div className="legal-content mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:scroll-mt-24 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>ORQUESTRA IA - TRANSFORMANDO SOLUÇÕES LTDA — CNPJ: 66.641.347/0001-21</p>
          <p>Rua da Carioca, 1379, Uberlândia-MG – CEP 38.411-151</p>
        </footer>
      </main>
    </div>
  );
};

export default LegalLayout;
