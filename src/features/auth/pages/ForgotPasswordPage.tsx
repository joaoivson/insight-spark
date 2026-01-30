import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, CheckCircle2, BarChart3, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { passwordService } from "../services";
import { APP_CONFIG } from "@/core/config/app.config";
import "../styles/index.scss";
import logoName from "@/assets/logo/logo_name.png";
import logoIcon from "@/assets/logo/logo.png";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lastSent, setLastSent] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Por favor, informe seu email');
      return;
    }

    // Validação básica de email
    if (!trimmedEmail.includes("@")) {
      setError('Email inválido');
      return;
    }

    // Debounce: evitar múltiplos envios em menos de 60 segundos
    const now = Date.now();
    if (now - lastSent < 60000) {
      const secondsLeft = Math.ceil((60000 - (now - lastSent)) / 1000);
      setError(`Aguarde ${secondsLeft} segundos antes de solicitar novamente`);
      return;
    }

    setLoading(true);

    try {
      let emailCheck: Awaited<ReturnType<typeof passwordService.checkEmailExists>> = {
        exists: true,
      };

      try {
        emailCheck = await passwordService.checkEmailExists(trimmedEmail);
      } catch (checkError) {
        if (checkError instanceof Error && checkError.message === "CHECK_ENDPOINT_UNAVAILABLE") {
          emailCheck = { exists: true };
        } else {
          const checkMessage = checkError instanceof Error ? checkError.message : 'Erro ao verificar email.';
          setError(checkMessage || 'Erro ao verificar email.');
          return;
        }
      }

      if (!emailCheck.exists) {
        setError('Email não cadastrado. Verifique e tente novamente.');
        return;
      }

      if (emailCheck.matchedEmail) {
        const normalizedInput = trimmedEmail.toLowerCase();
        const normalizedMatch = emailCheck.matchedEmail.trim().toLowerCase();

        if (normalizedInput !== normalizedMatch) {
          setError('Email não cadastrado. Verifique e tente novamente.');
          return;
        }
      }

      await passwordService.forgotPassword(trimmedEmail);
      setSuccess(true);
      setLastSent(now);
      
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao solicitar reset de senha. Tente novamente.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setSuccess(false);
    setError(null);
    setEmail("");
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-form-side">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="auth-form-wrapper"
          >
            <Link to={APP_CONFIG.ROUTES.HOME} className="auth-logo">
              <img src={logoIcon} alt="Logo MarketDash" className="auth-logo-icon brand-logo-mark" />
              <img src={logoName} alt="MarketDash" className="auth-logo-name brand-logo-name" />
            </Link>

            <div className="text-center space-y-6">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
              <div>
                <h1 className="auth-title">Email Enviado!</h1>
                <p className="auth-subtitle">
                  Enviamos um link para redefinir sua senha para <strong>{email}</strong>
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Verifique sua caixa de entrada (e spam) e clique no link recebido para definir uma nova senha.
                  </p>
                </div>
                <p className="text-muted-foreground text-sm mt-4">
                  O link expira em 24 horas.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={handleResend} variant="outline" size="lg" className="w-full">
                  Enviar para outro email
                </Button>
                <Button onClick={() => navigate(APP_CONFIG.ROUTES.LOGIN)} variant="hero" size="lg" className="w-full">
                  Voltar ao Login
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Decorative */}
        <div className="auth-decorative-side">
          <div className="auth-decorative-gradient" />
          <div className="auth-decorative-blob auth-decorative-blob--large auth-decorative-blob--top-right" />
          <div className="auth-decorative-blob auth-decorative-blob--small auth-decorative-blob--bottom-left" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="auth-decorative-content"
          >
            <div className="auth-decorative-icon">
              <Shield className="w-10 h-10 text-accent" />
            </div>
            <h2 className="auth-decorative-title">
              Recuperação de senha
            </h2>
            <p className="auth-decorative-text">
              Verifique seu email e siga as instruções para redefinir sua senha de forma segura.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Left Side - Form */}
      <div className="auth-form-side">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="auth-form-wrapper"
        >
          {/* Logo */}
          <Link to={APP_CONFIG.ROUTES.HOME} className="auth-logo">
            <img src={logoIcon} alt="Logo MarketDash" className="auth-logo-icon brand-logo-mark" />
            <img src={logoName} alt="MarketDash" className="auth-logo-name brand-logo-name" />
          </Link>

          <h1 className="auth-title">
            Esqueceu sua senha?
          </h1>
          <p className="auth-subtitle">
            Informe seu email e enviaremos um link para redefinir sua senha
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-group">
              <Label htmlFor="email">Email</Label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || !email.trim()}>
              {loading ? "Enviando..." : "Enviar Link de Redefinição"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="auth-footer">
            Lembrou sua senha?{" "}
            <Link to={APP_CONFIG.ROUTES.LOGIN} className="auth-link auth-link--medium">
              Fazer Login
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Decorative */}
      <div className="auth-decorative-side">
        <div className="auth-decorative-gradient" />
        <div className="auth-decorative-blob auth-decorative-blob--large auth-decorative-blob--top-right" />
        <div className="auth-decorative-blob auth-decorative-blob--small auth-decorative-blob--bottom-left" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="auth-decorative-content"
        >
          <div className="auth-decorative-icon">
            <Shield className="w-10 h-10 text-accent" />
          </div>
          <h2 className="auth-decorative-title">
            Recupere seu acesso
          </h2>
          <p className="auth-decorative-text">
            Enviaremos um link seguro por email para você redefinir sua senha e voltar a acessar sua conta.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
