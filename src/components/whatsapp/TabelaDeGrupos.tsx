import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataCard } from "@/components/shared/DataCard";
import type { GrupoWhatsapp } from "@/services/whatsapp_conexoes.service";
import { rotuloDoGrupo } from "@/shared/lib/grupo";

type Props = {
  grupos: GrupoWhatsapp[];
  /** Ativar liga o grupo ao funil (nasce sub_id + link) e conta no limite do
   *  plano; desativar é só a flag — nada é apagado, por isso não há confirmação. */
  onAlternarAtivado: (grupo: GrupoWhatsapp, ativado: boolean) => void;
};

/**
 * Lista de grupos com o toggle "Ativo" (spec §6.2/§6.3): tabela de 3 colunas
 * no desktop, DataCard no mobile. Busca e estados vazios ficam em quem usa —
 * aqui é só a apresentação, compartilhada entre a página do número e o bloco
 * de grupos sem dispositivo.
 */
export function TabelaDeGrupos({ grupos, onAlternarAtivado }: Props) {
  if (grupos.length === 0) return null;

  const switchDoGrupo = (g: GrupoWhatsapp) => (
    <Switch
      checked={g.ativado}
      onCheckedChange={(ativado) => onAlternarAtivado(g, ativado)}
      aria-label={
        g.ativado
          ? `Desativar ${rotuloDoGrupo(g.nome, g.id)}`
          : `Ativar ${rotuloDoGrupo(g.nome, g.id)}`
      }
    />
  );

  return (
    <>
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ativo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Participantes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{switchDoGrupo(g)}</TableCell>
                <TableCell className="font-medium">{rotuloDoGrupo(g.nome, g.id)}</TableCell>
                <TableCell className="text-right tabular-nums">{g.participantes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {grupos.map((g) => (
          <DataCard
            key={g.id}
            title={rotuloDoGrupo(g.nome, g.id)}
            actions={switchDoGrupo(g)}
            fields={[
              {
                label: "Participantes",
                value: <span className="tabular-nums">{g.participantes}</span>,
                emphasis: true,
              },
            ]}
          />
        ))}
      </div>
    </>
  );
}
