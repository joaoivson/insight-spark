import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { APP_CONFIG } from "@/core/config/app.config";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Página não encontrada</p>
        <Link 
          to={APP_CONFIG.ROUTES.HOME} 
          className="text-primary underline hover:text-primary/90"
        >
          Voltar para Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

