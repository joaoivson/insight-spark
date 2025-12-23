import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-display font-bold text-xl">
                Dash<span className="text-accent">Ads</span>
              </span>
            </Link>
            <p className="text-primary-foreground/70 text-sm max-w-md">
              Plataforma de análise de dados para vendedores digitais. 
              Transforme seus CSVs em insights acionáveis.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><a href="#features" className="hover:text-accent transition-colors">Funcionalidades</a></li>
              <li><a href="#pricing" className="hover:text-accent transition-colors">Preços</a></li>
              <li><a href="#how-it-works" className="hover:text-accent transition-colors">Como Funciona</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/terms" className="hover:text-accent transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacy" className="hover:text-accent transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-primary-foreground/10 text-center text-sm text-primary-foreground/50">
          <p>© {new Date().getFullYear()} DashAds. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
