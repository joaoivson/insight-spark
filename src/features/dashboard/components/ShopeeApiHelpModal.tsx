import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";

/**
 * Passo a passo para conseguir o AppID + Senha da API de Afiliada da Shopee.
 *
 * Vive num modal, e não solto na tela, por dois motivos: quem já tem as
 * credenciais não precisa ler nada (telas diretas), e quem não tem trava logo
 * no primeiro campo — o "não sei onde pegar isso" é a maior desistência desta
 * tela, e a resposta não é óbvia (a API não vem ligada, precisa ser solicitada
 * e pode demorar dias).
 */

/** O formulário de e-mail da Shopee — cada campo com a resposta exata. */
const CAMPOS_DO_CHAMADO: [string, string][] = [
  ["Já é Afiliado da Shopee?", "Sim"],
  ["Problemas de login?", "Não, outras dúvidas"],
  ["ID de Afiliado", "seu ID (11 dígitos)"],
  ["Telefone", "o mesmo do Programa de Afiliados"],
  ["Tema", "Dúvidas / dificuldades com meu cadastro"],
  ["Cenário", "Quero ativar a API"],
];

const Caminho = ({ children }: { children: ReactNode }) => (
  <span className="font-medium text-foreground">{children}</span>
);

type Passo = {
  numero: number;
  titulo: string;
  corpo: ReactNode;
};

const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: "Veja se você já tem",
    corpo: (
      <>
        No Painel de Afiliada da Shopee: menu lateral → <Caminho>Abrir API</Caminho> →{" "}
        <Caminho>Abrir API</Caminho>. Se aparecer o bloco <Caminho>Meu API</Caminho> com
        AppID e Senha marcados como <Caminho>Válido</Caminho>, copie os dois e cole aqui.
        Acabou.
      </>
    ),
  },
  {
    numero: 2,
    titulo: "Se não aparecer, peça a ativação",
    corpo: (
      <>
        Ainda na Shopee: <Caminho>Central de Ajuda</Caminho> →{" "}
        <Caminho>Acesso rápido</Caminho> → <Caminho>E-mail</Caminho>. Preencha:
        <dl className="mt-3 space-y-2 rounded-lg border border-border bg-muted/40 p-3">
          {CAMPOS_DO_CHAMADO.map(([campo, resposta]) => (
            <div key={campo} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="text-xs text-muted-foreground sm:w-[45%] sm:shrink-0">{campo}</dt>
              <dd className="text-xs font-medium text-foreground">{resposta}</dd>
            </div>
          ))}
        </dl>
      </>
    ),
  },
  {
    numero: 3,
    titulo: "Depois que ativarem",
    corpo: (
      <>
        A API aparece sozinha naquela mesma tela <Caminho>Abrir API</Caminho>.{" "}
        <Caminho>Não chega por e-mail</Caminho> — volte lá e confira. Costuma levar de
        algumas horas a alguns dias.
      </>
    ),
  },
];

export const ShopeeApiHelpModal = ({ trigger }: { trigger?: ReactNode }) => (
  <ResponsiveModal
    title="Como pegar sua API de Afiliada da Shopee"
    trigger={
      trigger ?? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto gap-1.5 px-2 py-1 text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Não sei onde pegar
        </Button>
      )
    }
  >
    <ol className="space-y-5 pb-2">
      {PASSOS.map((passo) => (
        <li key={passo.numero} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
            {passo.numero}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{passo.titulo}</p>
            <div className="text-xs leading-relaxed text-muted-foreground">{passo.corpo}</div>
          </div>
        </li>
      ))}
    </ol>
  </ResponsiveModal>
);
