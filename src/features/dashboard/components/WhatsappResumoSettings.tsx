import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  buscarStatusWhatsapp,
  confirmarCodigo,
  desligarWhatsapp,
  registrarNumero,
  type StatusWhatsapp,
} from "@/services/whatsapp.service";

/** (11) 99999-8888 conforme digita — o backend aceita qualquer formato, mas ler ajuda. */
function formatarTelefone(bruto: string): string {
  const d = bruto.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function WhatsappResumoSettings() {
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusWhatsapp | null>(null);
  const [numero, setNumero] = useState("");
  const [codigo, setCodigo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    void buscarStatusWhatsapp()
      .then((s) => montado.current && setStatus(s))
      .catch(() => undefined)
      .finally(() => montado.current && setCarregando(false));
    return () => {
      montado.current = false;
    };
  }, []);

  const acao = async (fn: () => Promise<StatusWhatsapp>, sucesso: string) => {
    setEnviando(true);
    try {
      const s = await fn();
      if (!montado.current) return;
      setStatus(s);
      toast({ title: sucesso });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Não foi possível concluir.",
        variant: "destructive",
      });
    } finally {
      if (montado.current) setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (status && !status.disponivel) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        O envio por WhatsApp está indisponível no momento.
      </p>
    );
  }

  if (status?.status === "confirmado") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-emerald-500" />
          <span>
            Enviando para <strong>{status.numero}</strong> todo dia às 9h.
          </span>
        </div>
        <Button
          variant="outline"
          disabled={enviando}
          onClick={() => void acao(desligarWhatsapp, "Você não vai mais receber o resumo.")}
        >
          {enviando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Parar de receber
        </Button>
      </div>
    );
  }

  if (status?.status === "pendente") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enviamos um código para <strong>{status.numero}</strong>. Digite ele abaixo.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wa-codigo">Código</Label>
            <Input
              id="wa-codigo"
              inputMode="numeric"
              placeholder="000000"
              className="w-32 tracking-widest"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <Button
            disabled={enviando || codigo.length < 6}
            onClick={() => void acao(() => confirmarCodigo(codigo), "Pronto! Resumo diário ligado.")}
          >
            {enviando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
          <Button
            variant="ghost"
            disabled={enviando}
            onClick={() => {
              setCodigo("");
              void acao(desligarWhatsapp, "Cadastro cancelado.");
            }}
          >
            Usar outro número
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="wa-numero">Seu WhatsApp</Label>
          <Input
            id="wa-numero"
            inputMode="tel"
            placeholder="(11) 99999-8888"
            className="w-48"
            value={numero}
            onChange={(e) => setNumero(formatarTelefone(e.target.value))}
          />
        </div>
        <Button
          disabled={enviando || numero.replace(/\D/g, "").length < 10}
          onClick={() => void acao(() => registrarNumero(numero), "Código enviado no seu WhatsApp.")}
        >
          {enviando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Receber resumo
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Enviamos um código para confirmar que o número é seu.
      </p>
    </div>
  );
}
