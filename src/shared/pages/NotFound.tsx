import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, ArrowLeft } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Compass className="h-8 w-8" />
        </div>

        <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>

        <Button asChild size="lg" className="mt-8 h-11 w-full sm:w-auto">
          <Link to={APP_CONFIG.ROUTES.HOME}>
            <ArrowLeft className="h-4 w-4" />
            Voltar para o início
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
