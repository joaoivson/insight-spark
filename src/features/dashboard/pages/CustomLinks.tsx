import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { usePlanStore } from "@/stores/planStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Plus, ArrowLeft, Copy, Pencil, Trash2, ExternalLink,
    Link2, Loader2, Check, AlertCircle,
    CalendarIcon, X, BarChart3, Search, ArrowUpDown
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Paginacao, paginar, totalDePaginas } from "@/components/shared/Paginacao";
import ConverterTab from "@/features/dashboard/components/ConverterTab";
import LinkInsightModal from "@/features/dashboard/components/LinkInsightModal";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { isUnlimited } from "@/shared/lib/plans";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    CustomLink, CustomLinkCreate, CustomLinkUpdate,
    getUserLinks, createLink, updateLink, deleteLink, checkLinkSlug
} from "@/services/custom_link.service";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ViewMode = "list" | "editor";

/** Um link está "parado" quando teve clique, mas o último passou de 48h. */
const LAST_CLICK_STALE_MS = 48 * 60 * 60 * 1000;
const isStale = (lastClickAt: string | null) => {
    if (!lastClickAt) return false;
    const t = new Date(lastClickAt).getTime();
    return !Number.isNaN(t) && Date.now() - t > LAST_CLICK_STALE_MS;
};

type FiltroLinks = "todos" | "ativos" | "inativos" | "parados";

const FILTROS: { key: FiltroLinks; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "ativos", label: "Ativos" },
    { key: "inativos", label: "Inativos" },
    { key: "parados", label: "Parados" },
];

type OrdemLinks =
    | "recentes" | "antigos"
    | "cliques" | "menos-cliques"
    | "ultimo-clique" | "nome";

const ORDENS: { key: OrdemLinks; label: string }[] = [
    { key: "recentes", label: "Mais recentes" },
    { key: "antigos", label: "Mais antigos" },
    { key: "cliques", label: "Mais cliques" },
    { key: "menos-cliques", label: "Menos cliques" },
    { key: "ultimo-clique", label: "Último clique" },
    { key: "nome", label: "Nome (A-Z)" },
];

const ts = (iso: string | null) => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? null : t;
};

/** Link sem clique nenhum vai para o fim de "Último clique", não para o topo. */
const porUltimoClique = (a: CustomLink, b: CustomLink) => {
    const ta = ts(a.last_click_at);
    const tb = ts(b.last_click_at);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
};

const COMPARADORES: Record<OrdemLinks, (a: CustomLink, b: CustomLink) => number> = {
    recentes: (a, b) => (ts(b.created_at) ?? 0) - (ts(a.created_at) ?? 0),
    antigos: (a, b) => (ts(a.created_at) ?? 0) - (ts(b.created_at) ?? 0),
    cliques: (a, b) => b.click_count - a.click_count,
    "menos-cliques": (a, b) => a.click_count - b.click_count,
    "ultimo-clique": porUltimoClique,
    nome: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
};

const getLinkBaseUrl = () => {
    const host = window.location.hostname;
    if (host.includes("hml")) return "hml.marketdash.com.br/l/";
    if (host.includes("marketdash.com.br")) return "marketdash.com.br/l/";
    return `${host}:${window.location.port}/l/`;
};
const LINK_BASE_URL = getLinkBaseUrl();

const CustomLinks = () => {
    const { toast } = useToast();
    const fetchPlan = usePlanStore((s) => s.fetch);
    const [view, setView] = useState<ViewMode>("list");
    const [links, setLinks] = useState<CustomLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingLink, setEditingLink] = useState<CustomLink | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState<CustomLink | null>(null);
    const [activeTab, setActiveTab] = useState<"converter" | "links">("links");
    const [insightLink, setInsightLink] = useState<CustomLink | null>(null);

    // Busca / ordenação / filtro da lista
    const [busca, setBusca] = useState("");
    const [ordem, setOrdem] = useState<OrdemLinks>("recentes");
    const [filtro, setFiltro] = useState<FiltroLinks>("todos");
    const [pagina, setPagina] = useState(1);
    const [porPagina, setPorPagina] = useState(25);

    // Form state
    const [formName, setFormName] = useState("");
    const [formUrl, setFormUrl] = useState("");
    const [formSlug, setFormSlug] = useState("");
    const [formTag, setFormTag] = useState("");
    const [formExpiresAt, setFormExpiresAt] = useState<Date | undefined>(undefined);
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [slugChecking, setSlugChecking] = useState(false);

    const fetchLinks = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getUserLinks();
            setLinks(data);
        } catch (err: any) {
            toast({ title: "Não foi possível carregar seus links", description: "Verifique sua conexão e tente novamente.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void fetchPlan();
        fetchLinks();
    }, [fetchLinks, fetchPlan]);

    const resetForm = () => {
        setFormName("");
        setFormUrl("");
        setFormSlug("");
        setFormTag("");
        setFormExpiresAt(undefined);
        setSlugAvailable(null);
        setEditingLink(null);
    };

    const MAX_CUSTOM_LINKS = usePlanStore((s) => s.context?.limites_links ?? 30);
    const linksIlimitado = isUnlimited(MAX_CUSTOM_LINKS);

    const handleNew = () => {
        if (!linksIlimitado && links.length >= MAX_CUSTOM_LINKS) {
            toast({ title: "Limite de links atingido", description: `Seu plano permite até ${MAX_CUSTOM_LINKS} links personalizados.`, variant: "destructive" });
            return;
        }
        resetForm();
        setView("editor");
    };

    // Ponte da aba "Converter": leva o link curto gerado para o fluxo "Novo Link".
    const handleConvert = (shortLink: string) => {
        setActiveTab("links");
        if (!linksIlimitado && links.length >= MAX_CUSTOM_LINKS) {
            toast({ title: "Limite de links atingido", description: `Seu plano permite até ${MAX_CUSTOM_LINKS} links personalizados.`, variant: "destructive" });
            return;
        }
        resetForm();
        setFormUrl(shortLink);
        setView("editor");
    };

    const handleEdit = (link: CustomLink) => {
        setEditingLink(link);
        setFormName(link.name);
        setFormUrl(link.original_url);
        setFormSlug(link.slug);
        setFormTag(link.tag || "");
        setFormExpiresAt(link.expires_at ? new Date(link.expires_at) : undefined);
        setSlugAvailable(null);
        setView("editor");
    };

    const handleBack = () => {
        resetForm();
        setView("list");
    };

    const handleCheckSlug = async () => {
        if (!formSlug.trim()) return;
        try {
            setSlugChecking(true);
            const result = await checkLinkSlug(formSlug.trim());
            setSlugAvailable(result.available);
            if (!result.available) {
                setFormSlug(result.suggested_slug);
                toast({ title: "Slug indisponivel", description: `Sugestao: ${result.suggested_slug}` });
            }
        } catch {
            toast({ title: "Não foi possível verificar a URL", description: "Tente novamente em instantes.", variant: "destructive" });
        } finally {
            setSlugChecking(false);
        }
    };

    const handleSave = async () => {
        if (!formName.trim() || !formUrl.trim()) {
            toast({ title: "Campos obrigatórios", description: "Preencha o nome e a URL do link antes de salvar.", variant: "destructive" });
            return;
        }

        try {
            setSaving(true);
            if (editingLink) {
                const payload: CustomLinkUpdate = {
                    name: formName,
                    original_url: formUrl,
                    slug: formSlug || undefined,
                    tag: formTag || undefined,
                    expires_at: formExpiresAt ? formExpiresAt.toISOString() : null,
                };
                await updateLink(editingLink.id, payload);
                toast({ title: "Link atualizado!" });
            } else {
                const payload: CustomLinkCreate = {
                    name: formName,
                    original_url: formUrl,
                    slug: formSlug || undefined,
                    tag: formTag || undefined,
                    expires_at: formExpiresAt ? formExpiresAt.toISOString() : undefined,
                };
                await createLink(payload);
                toast({ title: "Link criado!" });
            }
            await fetchLinks();
            handleBack();
        } catch (err: any) {
            toast({ title: "Não foi possível salvar o link", description: err.message || "Tente novamente em instantes.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!linkToDelete) return;
        try {
            await deleteLink(linkToDelete.id);
            toast({ title: "Link deletado!" });
            await fetchLinks();
        } catch (err: any) {
            toast({ title: "Não foi possível excluir o link", description: err.message || "Tente novamente em instantes.", variant: "destructive" });
        } finally {
            setDeleteDialogOpen(false);
            setLinkToDelete(null);
        }
    };

    const handleToggleActive = async (link: CustomLink) => {
        try {
            await updateLink(link.id, { is_active: !link.is_active });
            await fetchLinks();
            toast({ title: link.is_active ? "Link desativado" : "Link ativado" });
        } catch {
            toast({ title: "Não foi possível alterar o status", description: "Tente novamente em instantes.", variant: "destructive" });
        }
    };

    const handleCopy = (slug: string) => {
        navigator.clipboard.writeText(`https://${LINK_BASE_URL}${slug}`);
        toast({ title: "Link copiado!" });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric"
        });
    };

    const filtrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        const resultado = links.filter((l) => {
            if (termo && !l.name.toLowerCase().includes(termo) && !l.slug.toLowerCase().includes(termo)) {
                return false;
            }
            if (filtro === "ativos") return l.is_active;
            if (filtro === "inativos") return !l.is_active;
            if (filtro === "parados") return isStale(l.last_click_at);
            return true;
        });
        // Cópia antes de ordenar: `filter` já devolve array novo, mas deixar
        // explícito evita que uma refatoração futura ordene `links` no lugar.
        return [...resultado].sort(COMPARADORES[ordem]);
    }, [links, busca, filtro, ordem]);

    // Qualquer mudança de recorte volta para a página 1 — senão a afiliada
    // filtra e cai numa página que não existe mais no novo conjunto.
    useEffect(() => {
        setPagina(1);
    }, [busca, filtro, ordem, porPagina]);

    // Excluir o último link de uma página deixaria a tela vazia com "Anterior"
    // disponível; recua sozinho para a última página que ainda tem conteúdo.
    useEffect(() => {
        const ultima = totalDePaginas(filtrados.length, porPagina);
        if (pagina > ultima) setPagina(ultima);
    }, [filtrados.length, porPagina, pagina]);

    const daPagina = paginar(filtrados, pagina, porPagina);
    const filtroAtivo = busca.trim() !== "" || filtro !== "todos";

    const renderList = () => (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-muted-foreground text-sm">
                        Crie links personalizados que redirecionam para seus links de afiliado
                        <span className={`ml-2 text-xs font-medium ${!linksIlimitado && links.length >= MAX_CUSTOM_LINKS ? "text-destructive" : "text-muted-foreground"}`}>
                            {linksIlimitado ? "(ilimitado)" : `(${links.length}/${MAX_CUSTOM_LINKS})`}
                        </span>
                    </p>
                </div>
                <Button onClick={handleNew} disabled={!linksIlimitado && links.length >= MAX_CUSTOM_LINKS} className="w-full sm:w-auto flex-shrink-0">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Link
                </Button>
            </div>

            {/* Barra de controle: busca, ordenação e filtros rápidos.
                Com o MAX liberando links ilimitados, achar um link na rolagem
                deixou de ser viável — a busca é o caminho principal. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 sm:min-w-[240px]">
                    <Search
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                    />
                    <Input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome ou slug"
                        className="pl-9"
                        aria-label="Buscar link por nome ou slug"
                    />
                </div>
                <Select value={ordem} onValueChange={(v) => setOrdem(v as OrdemLinks)}>
                    <SelectTrigger className="w-full sm:w-[180px]" aria-label="Ordenar links">
                        <ArrowUpDown className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {ORDENS.map((o) => (
                            <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-wrap gap-1">
                {FILTROS.map((f) => (
                    <Button
                        key={f.key}
                        size="sm"
                        variant={filtro === f.key ? "default" : "outline"}
                        onClick={() => setFiltro(f.key)}
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            {loading ? (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-3 lg:px-4">
                            <Skeleton className="h-6 w-11 flex-shrink-0 rounded-full" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-56" />
                            </div>
                            <Skeleton className="hidden h-8 w-14 lg:block" />
                            <Skeleton className="hidden h-8 w-24 lg:block" />
                            <Skeleton className="hidden h-9 w-40 lg:block" />
                        </div>
                    ))}
                </div>
            ) : links.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-lg">
                    <Link2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum link criado</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        Crie seu primeiro link personalizado para compartilhar nos anuncios
                    </p>
                    <Button onClick={handleNew} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Link
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                        {filtrados.length} {filtrados.length === 1 ? "link" : "links"}
                        {filtroAtivo && ` de ${links.length}`}
                    </p>

                    {filtrados.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border py-12 text-center">
                            <p className="text-sm text-muted-foreground">Nenhum link encontrado.</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => { setBusca(""); setFiltro("todos"); }}
                            >
                                Limpar busca e filtros
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                                {daPagina.map((link) => {
                                    const parado = isStale(link.last_click_at);
                                    return (
                                        <div
                                            key={link.id}
                                            className="px-3 py-2.5 transition-colors hover:bg-accent/40 lg:px-4 lg:py-3"
                                        >
                                            <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-4">
                                                {/* Identidade. O checkbox das ações em massa entra
                                                    aqui, antes do toggle, quando for a hora. */}
                                                <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:gap-3">
                                                    <Switch
                                                        checked={link.is_active}
                                                        onCheckedChange={() => handleToggleActive(link)}
                                                        className="flex-shrink-0"
                                                        aria-label={link.is_active ? `Desativar ${link.name}` : `Ativar ${link.name}`}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p
                                                            className={cn(
                                                                "truncate text-sm font-semibold",
                                                                !link.is_active && "text-muted-foreground",
                                                            )}
                                                            title={link.original_url}
                                                        >
                                                            {link.name}
                                                        </p>
                                                        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-muted-foreground">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy(link.slug)}
                                                                className="flex min-w-0 items-center gap-1 text-primary hover:underline"
                                                            >
                                                                <Link2 className="h-3 w-3 flex-shrink-0" aria-hidden />
                                                                <span className="truncate">{LINK_BASE_URL}{link.slug}</span>
                                                            </button>
                                                            {/* "criado" e tag saem no celular: são o que menos
                                                                pesa na decisão e o que mais empurra a linha. */}
                                                            <span className="hidden flex-shrink-0 whitespace-nowrap lg:inline">
                                                                criado {formatDate(link.created_at)}
                                                            </span>
                                                            {link.tag && (
                                                                <Badge variant="secondary" className="hidden flex-shrink-0 text-[10px] lg:inline-flex">
                                                                    {link.tag}
                                                                </Badge>
                                                            )}
                                                            {parado && (
                                                                <span className="flex-shrink-0 whitespace-nowrap rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                                                                    parado
                                                                </span>
                                                            )}
                                                            {/* No celular o toggle desligado já diz isso, e um
                                                                ícone solto ao lado do "parado" só confunde. */}
                                                            {!link.is_active && (
                                                                <span className="hidden flex-shrink-0 items-center gap-1 whitespace-nowrap text-amber-500 lg:flex">
                                                                    <AlertCircle className="h-3 w-3" aria-hidden />
                                                                    desativado
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Números e ações. No celular viram uma linha só, com os
                                                    dois números inline; `flex-wrap` é a rede de segurança
                                                    para o aparelho mais estreito — as ações descem em vez
                                                    de a linha estourar a largura da página. */}
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 lg:flex-nowrap lg:gap-4">
                                                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground lg:hidden">
                                                        <span className="whitespace-nowrap tabular-nums">
                                                            <span className="font-semibold text-foreground">
                                                                {link.click_count.toLocaleString("pt-BR")}
                                                            </span>{" "}
                                                            cliques
                                                        </span>
                                                        <span aria-hidden>·</span>
                                                        <span className={cn("whitespace-nowrap tabular-nums", parado && "text-amber-500")}>
                                                            {link.last_click_at ? `último ${formatDate(link.last_click_at)}` : "nunca clicado"}
                                                        </span>
                                                    </div>

                                                    <div className="hidden w-20 flex-shrink-0 text-right lg:block">
                                                        <div className="text-sm font-semibold tabular-nums">
                                                            {link.click_count.toLocaleString("pt-BR")}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">cliques</div>
                                                    </div>
                                                    <div className="hidden w-[104px] flex-shrink-0 text-right lg:block">
                                                        <div className="text-[10px] text-muted-foreground">último clique</div>
                                                        <div className={cn("text-xs tabular-nums", parado && "text-amber-500")}>
                                                            {link.last_click_at ? formatDate(link.last_click_at) : "nunca"}
                                                        </div>
                                                    </div>

                                                    <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            onClick={() => handleCopy(link.slug)}
                                                            className="h-8 w-8 px-0 lg:h-9 lg:w-9"
                                                            aria-label={`Copiar link ${link.name}`}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            onClick={() => handleEdit(link)}
                                                            className="h-8 w-8 px-0 lg:h-9 lg:w-9"
                                                            aria-label={`Editar ${link.name}`}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <a
                                                            href={`https://${LINK_BASE_URL}${link.slug}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            aria-label={`Abrir ${link.name}`}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors duration-150 hover:bg-accent hover:text-accent-foreground lg:h-9 lg:w-9"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            onClick={() => setInsightLink(link)}
                                                            className="h-8 w-8 px-0 lg:h-9 lg:w-9"
                                                            aria-label={`Ver insights de ${link.name}`}
                                                        >
                                                            <BarChart3 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            onClick={() => { setLinkToDelete(link); setDeleteDialogOpen(true); }}
                                                            className="h-8 w-8 px-0 text-destructive hover:text-destructive lg:h-9 lg:w-9"
                                                            aria-label={`Deletar ${link.name}`}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <Paginacao
                                pagina={pagina}
                                total={filtrados.length}
                                onChange={setPagina}
                                porPagina={porPagina}
                                onPorPaginaChange={setPorPagina}
                                formato="intervalo"
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );

    const renderEditor = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold">
                    {editingLink ? "Editar Link" : "Novo Link"}
                </h1>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Form */}
                <div className="space-y-4 bg-card border border-border rounded-lg p-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Link *</Label>
                        <Input
                            id="name"
                            placeholder="Ex: Produto XYZ Shopee"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="url">Link Original (URL de destino) *</Label>
                        <Input
                            id="url"
                            type="url"
                            placeholder="https://shopee.com.br/..."
                            value={formUrl}
                            onChange={(e) => setFormUrl(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slug">Slug Personalizado</Label>
                        <div className="flex gap-2">
                            <Input
                                id="slug"
                                placeholder="meu-produto"
                                value={formSlug}
                                readOnly={!!editingLink}
                                onChange={(e) => {
                                    if (editingLink) return;
                                    setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                                    setSlugAvailable(null);
                                }}
                                className={editingLink ? "opacity-60 cursor-not-allowed" : ""}
                            />
                            {!editingLink && (
                                <Button
                                    variant="outline" size="sm"
                                    onClick={handleCheckSlug}
                                    disabled={!formSlug.trim() || slugChecking}
                                    className="flex-shrink-0"
                                >
                                    {slugChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar"}
                                </Button>
                            )}
                        </div>
                        {!editingLink && slugAvailable === true && (
                            <p className="text-xs text-green-500 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Slug disponivel
                            </p>
                        )}
                        {!editingLink && slugAvailable === false && (
                            <p className="text-xs text-yellow-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Slug ajustado automaticamente
                            </p>
                        )}
                        {editingLink ? (
                            <p className="text-xs text-muted-foreground">O slug não pode ser alterado após a criação.</p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Deixe em branco para gerar automaticamente
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tag">Tag (opcional)</Label>
                        <Input
                            id="tag"
                            placeholder="Ex: shopee, campanha-verao"
                            value={formTag}
                            onChange={(e) => setFormTag(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Data de Expiracao (opcional)</Label>
                        <div className="flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !formExpiresAt && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formExpiresAt
                                            ? format(formExpiresAt, "dd 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR })
                                            : "Selecionar data e horario"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formExpiresAt}
                                        onSelect={(date) => {
                                            if (!date) return setFormExpiresAt(undefined);
                                            const prev = formExpiresAt;
                                            if (prev) {
                                                date.setHours(prev.getHours(), prev.getMinutes());
                                            }
                                            setFormExpiresAt(new Date(date));
                                        }}
                                        disabled={(date) => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            return date < today;
                                        }}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                    <div className="border-t border-border px-3 py-3 flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Horario:</Label>
                                        <Input
                                            type="time"
                                            value={formExpiresAt ? format(formExpiresAt, "HH:mm") : ""}
                                            onChange={(e) => {
                                                const [h, m] = e.target.value.split(":").map(Number);
                                                const date = formExpiresAt ? new Date(formExpiresAt) : new Date();
                                                date.setHours(h, m, 0, 0);
                                                setFormExpiresAt(new Date(date));
                                            }}
                                            className="h-8 w-24 text-sm"
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                            {formExpiresAt && (
                                <Button
                                    variant="ghost" size="icon"
                                    onClick={() => setFormExpiresAt(undefined)}
                                    className="flex-shrink-0"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={saving || !formName.trim() || !formUrl.trim()}
                        className="w-full"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {editingLink ? "Salvar Alteracoes" : "Criar Link"}
                    </Button>
                </div>

                {/* Preview */}
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <h3 className="font-semibold text-lg">Preview do Link</h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Link divulgado nos anuncios:</p>
                            <div className="flex items-center gap-2 bg-background rounded px-3 py-2 border">
                                <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-sm text-primary truncate">
                                    https://{LINK_BASE_URL}{formSlug || "seu-slug"}
                                </span>
                                {formSlug && (
                                    <Button
                                        variant="ghost" size="sm"
                                        className="h-6 px-1.5 ml-auto flex-shrink-0"
                                        onClick={() => handleCopy(formSlug)}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Redireciona para:</p>
                            <div className="flex items-center gap-2 bg-background rounded px-3 py-2 border">
                                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm text-muted-foreground truncate">
                                    {formUrl || "https://..."}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-border pt-4">
                        <h4 className="font-medium text-sm mb-2">Como funciona?</h4>
                        <ul className="text-xs text-muted-foreground space-y-1.5">
                            <li>1. Use o link de cima nos seus anuncios</li>
                            <li>2. Quando alguem clicar, sera redirecionado para o link original</li>
                            <li>3. Se o produto esgotar, troque o link original aqui</li>
                            <li>4. O link dos anuncios continua o mesmo!</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <DashboardLayout title="Meus Links">
            {/* Sem px próprio: o <main> do DashboardLayout já dá o respiro
                lateral, e o padding duplicado comia 56px dos 390px do celular. */}
            <div className="max-w-6xl mx-auto">
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as "converter" | "links")}
                    className="space-y-6"
                >
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger
                            value="converter"
                            className="data-[state=active]:border data-[state=active]:border-[rgba(49,140,233,0.38)] data-[state=active]:bg-[rgba(49,140,233,0.12)] data-[state=active]:text-[#7CB8F2]"
                        >
                            Converter
                        </TabsTrigger>
                        <TabsTrigger
                            value="links"
                            className="data-[state=active]:border data-[state=active]:border-[rgba(49,140,233,0.38)] data-[state=active]:bg-[rgba(49,140,233,0.12)] data-[state=active]:text-[#7CB8F2]"
                        >
                            Meus Links
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="converter" className="mt-0">
                        <ConverterTab onConvert={handleConvert} />
                    </TabsContent>

                    <TabsContent value="links" className="mt-0">
                        {view === "list" ? renderList() : renderEditor()}
                    </TabsContent>
                </Tabs>
            </div>

            <LinkInsightModal
                link={insightLink ? { id: insightLink.id, title: insightLink.name, slug: insightLink.slug } : null}
                onClose={() => setInsightLink(null)}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deletar link?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O link "{linkToDelete?.name}" sera removido permanentemente.
                            Qualquer pessoa que acessar esse link recebera um erro 404.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Deletar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
};

export default CustomLinks;
