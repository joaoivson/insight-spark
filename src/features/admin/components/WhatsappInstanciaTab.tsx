import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buscarInstancia, type InstanciaWhatsapp } from "@/services/whatsapp.service";

/**
 * Estados que a rota devolve. `open` é contrato mantido da era Evolution (o
 * backend traduz `WORKING` para ele); o resto vem do WAHA em minúsculas —
 * sem estas entradas a tela mostrava `scan_qr_code` cru para o admin.
 */
const ESTADOS: Record<string, { rotulo: string; cor: string }> = {
  open: { rotulo: "Conectado", cor: "text-emerald-500" },
  starting: { rotulo: "Iniciando…", cor: "text-amber-500" },
  scan_qr_code: { rotulo: "Aguardando leitura do QR", cor: "text-amber-500" },
  connecting: { rotulo: "Conectando…", cor: "text-amber-500" },
  stopped: { rotulo: "Parada", cor: "text-destructive" },
  failed: { rotulo: "Falhou", cor: "text-destructive" },
  close: { rotulo: "Desconectado", cor: "text-destructive" },
  inexistente: { rotulo: "Sessão não existe no WAHA", cor: "text-destructive" },
  sem_config: { rotulo: "Não configurado", cor: "text-muted-foreground" },
};

/** O QR expira em segundos; sem recarregar sozinho a tela mostra um código morto. */
const INTERVALO_MS = 20_000;

export function WhatsappInstanciaTab() {
  const [dados, setDados] = useState<InstanciaWhatsapp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const montado = useRef(true);

  const carregar = useCallback(async () => {
    try {
      const d = await buscarInstancia();
      if (!montado.current) return;
      setDados(d);
      setErro(null);
    } catch (e) {
      if (montado.current) setErro(e instanceof Error ? e.message : "Falha ao consultar.");
    } finally {
      if (montado.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    void carregar();
    return () => {
      montado.current = false;
    };
  }, [carregar]);

  // Só fica repetindo enquanto há QR na tela: conectado, não há o que atualizar.
  useEffect(() => {
    if (dados?.estado === "open" || !dados?.configurado) return;
    const id = setInterval(() => void carregar(), INTERVALO_MS);
    return () => clearInterval(id);
  }, [dados?.estado, dados?.configurado, carregar]);

  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const estado = ESTADOS[dados?.estado ?? ""] ?? {
    rotulo: dados?.estado ?? "desconhecido",
    cor: "text-muted-foreground",
  };

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Número do MarketDash</p>
              <p className={`text-lg font-semibold ${estado.cor}`}>{estado.rotulo}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void carregar()}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Atualizar
            </Button>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          {!dados?.configurado && (
            <p className="text-sm text-muted-foreground">
              Faltam <code>WAHA_URL</code>, <code>WAHA_API_KEY</code> e{" "}
              <code>WAHA_SESSAO_RESUMO</code> nas variáveis de ambiente da API.
            </p>
          )}

          {/* Sem isto a tela fica muda quando a instância está "connecting" e o
              QR ainda não saiu — e o admin não sabe se espera ou se quebrou. */}
          {dados?.configurado && dados.estado !== "open" && !dados.qrcode && !erro && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando o QR code…
              </p>
              <p>
                Se não aparecer em cerca de 30 segundos, confira a sessão no
                WAHA — ver <code>docs/whatsapp-waha.md</code>.
              </p>
            </div>
          )}

          {dados?.qrcode && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp do número do MarketDash → Aparelhos conectados → Conectar
                aparelho, e aponte para o código. Ele se renova sozinho a cada 20 segundos.
              </p>
              <img
                src={dados.qrcode}
                alt="QR code para conectar o WhatsApp"
                className="h-64 w-64 rounded-lg bg-white p-2"
              />
            </div>
          )}

          {dados?.estado === "open" && (
            <p className="text-sm text-muted-foreground">
              O resumo diário sai às 9h de Brasília para quem confirmou o número.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
