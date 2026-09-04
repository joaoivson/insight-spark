import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, QrCode, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { useToast } from "@/hooks/use-toast";
import { mensagemAmigavel } from "@/services/http-error";
import {
  codigoDePareamento,
  qrDaInstancia,
  type InstanciaConexao,
  type QrInstancia,
} from "@/services/whatsapp_conexoes.service";

/** Pareamento é interativo — 5s mantém o QR vivo sem martelar a API. */
const POLL_MS = 5_000;

type Modo = "qr" | "codigo";

/**
 * Conectar um número: QR **ou** código de pareamento.
 *
 * O código existe porque a afiliada abre o MarketDash no celular e o WhatsApp
 * que ela vai conectar é o do MESMO aparelho — não há como escanear um QR da
 * própria tela. Sem essa alternativa, parte do público não conecta e some sem
 * dizer por quê.
 *
 * O poll do QR roda nos DOIS modos: é ele quem detecta a conexão. No modo
 * código o QR não é exibido, mas continua sendo o sinal de "pareou".
 */
export function ConectarNumeroModal({
  instancia,
  onOpenChange,
  onConectou,
}: {
  instancia: InstanciaConexao | null;
  onOpenChange: (aberto: boolean) => void;
  onConectou: () => void;
}) {
  const { toast } = useToast();
  const [modo, setModo] = useState<Modo>("qr");
  const [qr, setQr] = useState<QrInstancia | null>(null);

  const [numero, setNumero] = useState("");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erroNumero, setErroNumero] = useState<string | null>(null);

  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  // Reabrir o modal recomeça do zero: código velho de outra sessão expira e
  // exibi-lo mandaria a afiliada digitar algo que o WhatsApp recusa.
  useEffect(() => {
    if (!instancia) return;
    setModo("qr");
    setQr(null);
    setNumero("");
    setCodigo(null);
    setErroNumero(null);
  }, [instancia]);

  const instanciaId = instancia?.id;

  useEffect(() => {
    if (instanciaId == null) return;
    let ativo = true;
    const consultar = async () => {
      try {
        const r = await qrDaInstancia(instanciaId);
        if (!ativo || !montado.current) return;
        setQr(r);
        if (r.estado === "conectada") {
          toast({ title: "Número conectado" });
          onConectou();
        }
      } catch {
        if (ativo && montado.current) setQr({ estado: "erro: falha na consulta", qrcode: null });
      }
    };
    void consultar();
    const id = setInterval(() => void consultar(), POLL_MS);
    return () => {
      ativo = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanciaId]);

  const gerarCodigo = async () => {
    if (instanciaId == null) return;
    setErroNumero(null);
    setGerando(true);
    try {
      const r = await codigoDePareamento(instanciaId, numero);
      if (!montado.current) return;
      if (r.estado === "conectada") {
        toast({ title: "Número conectado" });
        onConectou();
        return;
      }
      if (!r.codigo) {
        // Sessão ainda subindo: o WAHA só emite o código depois de chegar em
        // "aguardando pareamento". Tentar de novo em alguns segundos resolve.
        setErroNumero("Ainda preparando a conexão. Toque em gerar de novo em instantes.");
        return;
      }
      setCodigo(r.codigo);
    } catch (e) {
      setErroNumero(mensagemAmigavel(e, "Não foi possível gerar o código."));
    } finally {
      if (montado.current) setGerando(false);
    }
  };

  const copiarCodigo = async () => {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      toast({ title: "Código copiado" });
    } catch {
      // Clipboard bloqueado (http, permissão): o código está na tela para ler.
    }
  };

  return (
    <ResponsiveModal
      open={!!instancia}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
      title="Conectar número"
      description={
        modo === "qr"
          ? "No celular: WhatsApp → Aparelhos conectados → Conectar aparelho."
          : "No celular: WhatsApp → Aparelhos conectados → Conectar com número de telefone."
      }
    >
      <div className="space-y-4 pb-2">
        {modo === "qr" ? (
          <div className="flex justify-center">
            {qr?.qrcode ? (
              <img
                src={qr.qrcode}
                alt="QR code para conectar o WhatsApp"
                className="h-64 w-64 rounded-lg bg-white p-2"
              />
            ) : qr && qr.estado.startsWith("erro") ? (
              <p className="py-10 text-center text-sm text-destructive">
                Não foi possível gerar o QR code agora. Aguarde — tentamos de novo sozinhos.
              </p>
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-dashed border-border">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando o QR code…
                </span>
              </div>
            )}
          </div>
        ) : codigo ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <p className="text-xs text-muted-foreground">Digite este código no WhatsApp</p>
              <p className="mt-1 text-3xl font-bold tracking-[0.2em] tabular-nums text-foreground">
                {codigo}
              </p>
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => void copiarCodigo()}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copiar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O código vale por poucos minutos. Se expirar, gere outro.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setCodigo(null)}>
              Gerar outro código
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="numero-pareamento">Número do WhatsApp</Label>
              <div className="flex items-center gap-2">
                {/* O DDI é fixo: o produto atende o Brasil e o backend recusa
                    outro país. Um seletor sugeriria uma opção que dá erro. */}
                <span className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground tabular-nums">
                  +55
                </span>
                <Input
                  id="numero-pareamento"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="DDD + número"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="flex-1 tabular-nums"
                />
              </div>
              {erroNumero && <p className="text-sm text-destructive">{erroNumero}</p>}
            </div>
            <Button
              className="w-full"
              onClick={() => void gerarCodigo()}
              disabled={gerando || !numero.trim()}
            >
              {gerando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar código de pareamento
            </Button>
          </div>
        )}

        {/* A troca de método fica visível sempre: quem está no celular precisa
            achar o código sem descobrir que existe. */}
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => {
            setModo((m) => (m === "qr" ? "codigo" : "qr"));
            setCodigo(null);
            setErroNumero(null);
          }}
        >
          {modo === "qr" ? (
            <>
              <Smartphone className="mr-2 h-4 w-4" />
              Conectando pelo próprio celular? Gerar código de pareamento
            </>
          ) : (
            <>
              <QrCode className="mr-2 h-4 w-4" />
              Gerar QR code
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          O envio é feito pelo seu número. Uso excessivo pode levar o WhatsApp a restringi-lo —
          respeite os limites do painel.
        </p>
      </div>
    </ResponsiveModal>
  );
}
