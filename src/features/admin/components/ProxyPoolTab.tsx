import { FormEvent, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Shuffle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { useToast } from "@/hooks/use-toast";
import { useAdminProxiesStore } from "@/stores/adminProxiesStore";
import {
  STATUS_LABELS,
  TIPO_LABELS,
  type InstanciaProxy,
  type Proxy,
  type StatusProxy,
  type TipoProxy,
} from "@/services/admin-proxies.service";

const STATUS_CLASSE: Record<StatusProxy, string> = {
  ok: "border-transparent bg-emerald-500/15 text-emerald-600",
  degradado: "border-transparent bg-amber-500/15 text-amber-600",
  quarentena: "border-transparent bg-destructive/15 text-destructive",
};

const formVazio = {
  rotulo: "",
  tipo: "residencial" as TipoProxy,
  host: "",
  porta: "",
  usuario: "",
  senha: "",
  pais: "BR",
  max_sessoes: "3",
};

const dataCurta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function StatusBadge({ status }: { status: StatusProxy }) {
  return <Badge className={STATUS_CLASSE[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function ProxyPoolTab() {
  const { toast } = useToast();
  const { pool, loading, error, fetch, criar, desativar, verificar, atualizar, realocar } =
    useAdminProxiesStore();

  useEffect(() => {
    void fetch();
  }, [fetch]);

  // ── Cadastro ───────────────────────────────────────────────────────────────
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [salvando, setSalvando] = useState(false);

  const cadastrar = async (ev: FormEvent) => {
    ev.preventDefault();
    const porta = Number(form.porta);
    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
      toast({ title: "Porta inválida", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      await criar({
        rotulo: form.rotulo.trim(),
        tipo: form.tipo,
        host: form.host.trim(),
        porta,
        usuario: form.usuario.trim() || null,
        senha: form.senha || null,
        pais: form.pais.trim().toUpperCase() || "BR",
        max_sessoes: Number(form.max_sessoes) || null,
      });
      setAberto(false);
      setForm(formVazio);
      toast({ title: "Proxy cadastrado" });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Não foi possível cadastrar.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  // ── Verificar / desativar ──────────────────────────────────────────────────
  const [verificandoId, setVerificandoId] = useState<number | null>(null);

  const aoVerificar = async (p: Proxy) => {
    setVerificandoId(p.id);
    try {
      const r = await verificar(p.id);
      toast({
        title: r.ok ? `Respondeu de ${r.ip ?? "IP desconhecido"}` : "Não respondeu",
        description: r.ok
          ? r.pais && r.pais.toUpperCase() !== p.pais.toUpperCase()
            ? `Atenção: saindo de ${r.pais}, não de ${p.pais}.`
            : undefined
          : r.detalhe,
        variant: r.ok ? undefined : "destructive",
      });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Falha ao verificar.",
        variant: "destructive",
      });
    } finally {
      setVerificandoId(null);
    }
  };

  // ── Realocar (troca de IP de uma sessão) ───────────────────────────────────
  const [alvo, setAlvo] = useState<InstanciaProxy | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ignorarCooldown, setIgnorarCooldown] = useState(false);
  const [aplicarAgora, setAplicarAgora] = useState(false);
  const [realocando, setRealocando] = useState(false);

  const confirmarRealocacao = async () => {
    if (!alvo) return;
    setRealocando(true);
    try {
      const r = await realocar(alvo.id, {
        motivo: motivo.trim(),
        ignorar_cooldown: ignorarCooldown,
        aplicar_na_sessao: aplicarAgora,
      });
      toast({ title: `Agora no IP ${r.proxy_rotulo ?? "—"}`, description: r.aviso ?? undefined });
      setAlvo(null);
      setMotivo("");
      setIgnorarCooldown(false);
      setAplicarAgora(false);
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Não foi possível realocar.",
        variant: "destructive",
      });
    } finally {
      setRealocando(false);
    }
  };

  if (loading && !pool) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando o pool…
      </div>
    );
  }

  const proxies = pool?.proxies ?? [];
  const instancias = pool?.instancias ?? [];
  const semIp = instancias.filter((i) => i.proxy_id === null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pool cadastrado e feature desligada é o estado mais confuso possível:
              a tabela parece em uso e nenhuma sessão passa por ela. */}
          <Badge variant={pool?.ligado ? "default" : "secondary"}>
            {pool?.ligado ? "Proxy ligado" : "Proxy desligado (flag)"}
          </Badge>
          {pool?.obrigatorio && <Badge variant="outline">Obrigatório para criar número</Badge>}
          {semIp > 0 && (
            <Badge className={STATUS_CLASSE.degradado}>{semIp} número(s) sem IP</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void fetch({ force: true })}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setAberto(true)}>
            <Plus className="mr-1 h-4 w-4" /> Novo proxy
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pool de IPs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rótulo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Servidor</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última checagem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proxies.map((p) => (
                <TableRow key={p.id} className={p.ativo ? "" : "opacity-60"}>
                  <TableCell className="font-medium">
                    {p.rotulo}
                    {!p.ativo && <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>}
                    {/* 2 afiliadas no mesmo IP fura a afinidade: um banimento
                        contaminaria a vizinhança. É erro, não informação. */}
                    {p.usuarias > 1 && (
                      <span className="ml-2 text-xs text-destructive">
                        {p.usuarias} afiliadas no mesmo IP
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{TIPO_LABELS[p.tipo] ?? p.tipo}</TableCell>
                  <TableCell className="font-mono text-xs">{p.servidor}</TableCell>
                  <TableCell>{p.pais}</TableCell>
                  <TableCell className="tabular-nums">
                    {p.ocupacao}/{p.max_sessoes}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                    {p.ultimo_erro && (
                      <p className="mt-1 max-w-[22rem] truncate text-xs text-muted-foreground">
                        {p.ultimo_erro}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {dataCurta(p.verificado_em)}
                    {p.ultimo_ip && <span className="ml-1 font-mono">({p.ultimo_ip})</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={verificandoId === p.id}
                        onClick={() => void aoVerificar(p)}
                      >
                        {verificandoId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Verificar"
                        )}
                      </Button>
                      {p.status !== "ok" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void atualizar(p.id, { reativar_status: true }).catch((e) =>
                              toast({
                                title: e instanceof Error ? e.message : "Falha.",
                                variant: "destructive",
                              }),
                            )
                          }
                        >
                          Reativar
                        </Button>
                      )}
                      {p.ativo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void desativar(p.id).catch((e) =>
                              toast({
                                title: e instanceof Error ? e.message : "Falha.",
                                variant: "destructive",
                              }),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {proxies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhum proxy cadastrado — as sessões saem pelo IP do servidor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Números e seus IPs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Afiliada</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Sessão</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead>Trocas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instancias.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="max-w-[16rem] truncate">
                    {i.user_email ?? `user ${i.user_id}`}
                  </TableCell>
                  <TableCell>
                    {i.nome_exibicao ?? "—"}
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {i.numero_mascarado ?? ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={i.status === "conectada" ? "default" : "secondary"}>
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {i.proxy_rotulo ? (
                      <span className="flex items-center gap-2">
                        {i.proxy_rotulo}
                        {i.proxy_status && i.proxy_status !== "ok" && (
                          <StatusBadge status={i.proxy_status} />
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">sem IP dedicado</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {dataCurta(i.proxy_fixado_em)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {i.proxy_trocas}
                    {i.em_cooldown && (
                      <span className="ml-1 text-xs text-muted-foreground">(cooldown)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setAlvo(i)}>
                      <Shuffle className="mr-1 h-4 w-4" /> Realocar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {instancias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum número conectado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ResponsiveModal open={aberto} onOpenChange={setAberto} title="Novo proxy">
        <form className="space-y-3" onSubmit={cadastrar}>
          <div>
            <Label htmlFor="proxy-rotulo">Rótulo</Label>
            <Input
              id="proxy-rotulo"
              value={form.rotulo}
              onChange={(e) => setForm({ ...form, rotulo: e.target.value })}
              placeholder="BR-móvel-01"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="proxy-tipo">Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as TipoProxy })}
              >
                <SelectTrigger id="proxy-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movel">Móvel</SelectItem>
                  <SelectItem value="residencial">Residencial</SelectItem>
                  <SelectItem value="datacenter">Datacenter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="proxy-pais">País</Label>
              <Input
                id="proxy-pais"
              value={form.pais}
                maxLength={2}
                onChange={(e) => setForm({ ...form, pais: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <div>
              <Label htmlFor="proxy-host">Host</Label>
              <Input
                id="proxy-host"
              value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="br.proxy.exemplo.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="proxy-porta">Porta</Label>
              <Input
                id="proxy-porta"
              value={form.porta}
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, porta: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="proxy-usuario">Usuário</Label>
              <Input
                id="proxy-usuario"
              value={form.usuario}
                autoComplete="off"
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="proxy-senha">Senha</Label>
              <Input
                type="password"
                id="proxy-senha"
              value={form.senha}
                autoComplete="new-password"
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="proxy-max">Máx. de sessões</Label>
            <Input
              id="proxy-max"
              value={form.max_sessoes}
              inputMode="numeric"
              onChange={(e) => setForm({ ...form, max_sessoes: e.target.value })}
            />
            {/* Um IP com mais chips do que uma pessoa teria aparelhos é, por si
                só, retrato de automação. */}
            <p className="mt-1 text-xs text-muted-foreground">
              Só chips da mesma afiliada dividem um IP. 3 é o teto de números do plano Max.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Cadastrar
            </Button>
          </div>
        </form>
      </ResponsiveModal>

      <ResponsiveModal
        open={alvo !== null}
        onOpenChange={(o) => !o && setAlvo(null)}
        title="Realocar o IP deste número"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Trocar de IP é o padrão que o WhatsApp mais associa a automação. Faça isso apenas
            com falha de proxy confirmada — nunca porque o número caiu ou foi banido.
          </p>
          <div>
            <Label htmlFor="realocar-motivo">Motivo</Label>
            <Input
              id="realocar-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="proxy em quarentena desde 27/08"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={aplicarAgora}
              onCheckedChange={(v) => setAplicarAgora(v === true)}
            />
            <span>
              Aplicar na sessão agora (para e reinicia a conexão).
              <span className="block text-xs text-muted-foreground">
                Ainda não está confirmado se o WhatsApp pede novo QR depois disso. Sem marcar,
                o IP novo passa a valer no próximo reinício da sessão.
              </span>
            </span>
          </label>
          {alvo?.em_cooldown && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={ignorarCooldown}
                onCheckedChange={(v) => setIgnorarCooldown(v === true)}
              />
              <span>
                Ignorar o cooldown de troca.
                <span className="block text-xs text-muted-foreground">
                  Este número trocou de IP há pouco tempo. Trocar de novo aumenta o risco.
                </span>
              </span>
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAlvo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={realocando || motivo.trim().length < 3}
              onClick={() => void confirmarRealocacao()}
            >
              {realocando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Realocar
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
