import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, Loader2 } from "lucide-react";
import { useState } from "react";
import logoName from "@/assets/logo/logo_name.png";
import logoIcon from "@/assets/logo/logo.png";
import { useSubscribe } from "@/shared/hooks/useSubscribe";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { handleSubscribe, loading } = useSubscribe();

  const navItems = [
    { label: "O Problema", href: "#problem" },
    { label: "A Solução", href: "#solution" },
    { label: "Funcionalidades", href: "#features" },
    { label: "Preços", href: "#pricing" },
  ];

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src={logoIcon}
              alt="Logo MarketDash"
              className="w-11 h-11 rounded-xl group-hover:scale-105 transition-transform object-contain brand-logo-mark"
            />
            <img
              src={logoName}
              alt="MarketDash"
              className="h-8 w-auto brand-logo-name"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-muted-foreground hover:text-accent transition-colors font-medium"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Button variant="accent" onClick={handleSubscribe}>
              Ver Lucro Real
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu - Fullscreen Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent 
            side="left" 
            className="w-full sm:w-80 p-0 bg-background [&>button]:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header do menu */}
              <div className="h-16 flex items-center justify-between border-b border-border px-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <img
                    src={logoIcon}
                    alt="Logo MarketDash"
                    className="w-9 h-9 rounded-lg object-contain p-1.5 brand-logo-mark"
                  />
                  <img
                    src={logoName}
                    alt="MarketDash"
                    className="h-6 w-auto brand-logo-name"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 py-6 px-4 overflow-y-auto">
                <div className="flex flex-col gap-4">
                  {navItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-medium text-foreground hover:text-accent transition-colors py-2"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </nav>

              {/* CTA Buttons */}
              <div className="border-t border-border p-4 flex-shrink-0 space-y-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full">Entrar</Button>
                </Link>
                <Button 
                  variant="accent" 
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSubscribe(true);
                  }}
                  disabled={loading}
                  aria-label="Ver Lucro Real"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    "Ver Lucro Real"
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
};

export default Header;
