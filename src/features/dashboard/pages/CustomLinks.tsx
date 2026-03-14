import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Plus, ArrowLeft, Copy, Pencil, Trash2, ExternalLink,
    Link2, MousePointerClick, Loader2, Check, AlertCircle,
    CalendarIcon, X
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/shared/lib/utils";
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

const getLinkBaseUrl = () => {
    const host = window.location.hostname;
    if (host.includes("hml")) return "hml.marketdash.com.br/l/";
    if (host.includes("marketdash.com.br")) return "marketdash.com.br/l/";
    return `${host}:${window.location.port}/l/`;
};
const LINK_BASE_URL = getLinkBaseUrl();

const CustomLinks = () => {
    const { toast } = useToast();
    const [view, setView] = useState<ViewMode>("list");
    const [links, setLinks] = useState<CustomLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingLink, setEditingLink] = useState<CustomLink | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState<CustomLink | null>(null);

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
            toast({ title: "Erro", description: "Falha ao carregar links", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchLinks();
    }, [fetchLinks]);

    const resetForm = () => {
        setFormName("");
        setFormUrl("");
        setFormSlug("");
        setFormTag("");
        setFormExpiresAt(undefined);
        setSlugAvailable(null);
        setEditingLink(null);
    };

    const handleNew = () => {
        resetForm();
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
            toast({ title: "Erro", description: "Falha ao verificar slug", variant: "destructive" });
        } finally {
            setSlugChecking(false);
        }
    };

    const handleSave = async () => {
        if (!formName.trim() || !formUrl.trim()) {
            toast({ title: "Campos obrigatorios", description: "Preencha nome e URL", variant: "destructive" });
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
            toast({ title: "Erro", description: err.message || "Falha ao salvar", variant: "destructive" });
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
            toast({ title: "Erro", description: err.message || "Falha ao deletar", variant: "destructive" });
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
            toast({ title: "Erro", description: "Falha ao alterar status", variant: "destructive" });
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

    const renderList = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Meus Links</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Crie links personalizados que redirecionam para seus links de afiliado
                    </p>
                </div>
                <Button onClick={handleNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Link
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {links.map((link) => (
                        <div
                            key={link.id}
                            className="bg-card border border-border rounded-lg p-4 space-y-3 hover:border-primary/30 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold truncate">{link.name}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                        {link.original_url}
                                    </p>
                                </div>
                                <Switch
                                    checked={link.is_active}
                                    onCheckedChange={() => handleToggleActive(link)}
                                    className="ml-2 flex-shrink-0"
                                />
                            </div>

                            <div
                                className="flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline"
                                onClick={() => handleCopy(link.slug)}
                            >
                                <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{LINK_BASE_URL}{link.slug}</span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <MousePointerClick className="w-3.5 h-3.5" />
                                    {link.click_count} cliques
                                </span>
                                <span>{formatDate(link.created_at)}</span>
                                {link.tag && <Badge variant="secondary" className="text-[10px]">{link.tag}</Badge>}
                            </div>

                            {!link.is_active && (
                                <div className="flex items-center gap-1 text-xs text-yellow-500">
                                    <AlertCircle className="w-3 h-3" />
                                    Desativado
                                </div>
                            )}

                            <div className="flex items-center gap-1 pt-1 border-t border-border">
                                <Button
                                    variant="ghost" size="sm"
                                    onClick={() => handleCopy(link.slug)}
                                    className="h-8 px-2"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost" size="sm"
                                    onClick={() => handleEdit(link)}
                                    className="h-8 px-2"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <a
                                    href={`https://${LINK_BASE_URL}${link.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center h-8 px-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <Button
                                    variant="ghost" size="sm"
                                    onClick={() => { setLinkToDelete(link); setDeleteDialogOpen(true); }}
                                    className="h-8 px-2 ml-auto text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
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
                                onChange={(e) => {
                                    setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                                    setSlugAvailable(null);
                                }}
                            />
                            <Button
                                variant="outline" size="sm"
                                onClick={handleCheckSlug}
                                disabled={!formSlug.trim() || slugChecking}
                                className="flex-shrink-0"
                            >
                                {slugChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar"}
                            </Button>
                        </div>
                        {slugAvailable === true && (
                            <p className="text-xs text-green-500 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Slug disponivel
                            </p>
                        )}
                        {slugAvailable === false && (
                            <p className="text-xs text-yellow-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Slug ajustado automaticamente
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Deixe em branco para gerar automaticamente
                        </p>
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
        <DashboardLayout>
            <div className="max-w-6xl mx-auto p-4 md:p-6">
                {view === "list" ? renderList() : renderEditor()}
            </div>

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
