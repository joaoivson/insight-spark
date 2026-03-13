import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trash2, ArrowLeft, Palette, Globe, Eye,
  Settings2, Sparkles, Wand2, AlertTriangle,
  Plus, LayoutTemplate, Copy, Save, RefreshCw,
  Upload, MessageCircle, CheckCircle2, ExternalLink,
  Clock, Flame, Zap, TrendingUp, ShieldCheck, Timer
} from "lucide-react";

// Mapeamento de ícones para o Banner de Urgência
const URGENCY_ICONS: Record<string, any> = {
  'alert': AlertTriangle,
  'clock': Clock,
  'timer': Timer,
  'flame': Flame,
  'zap': Zap,
  'trending': TrendingUp,
  'shield': ShieldCheck,
  'check': CheckCircle2
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

import {
  CaptureSite,
  CaptureSiteCreate,
  getUserSites,
  createSite,
  updateSite,
  deleteSite,
  checkSlug,
  uploadImage,
} from "@/services/capture_site.service";

// Um regex mínimo para retirar carateres especiais caso o usuário digite
const slugify = (str: string) => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

// Ícone Oficial do WhatsApp
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const DEFAULT_IMAGE = "/default-logo.png";

export const CapturaSite = () => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lista de sites
  const [sites, setSites] = useState<CaptureSite[]>([]);
  // Site atualmente selecionado/editado
  const [activeSiteId, setActiveSiteId] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [benefits, setBenefits] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [urgencyText, setUrgencyText] = useState('🔥 Promoção por tempo limitado!');
  const [slug, setSlug] = useState("");
  const [themeColor, setThemeColor] = useState('#3b82f6');

  // New styling fields
  const [buttonColor, setButtonColor] = useState('#2563eb');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [isGradient, setIsGradient] = useState(false);
  const [urgencyColor, setUrgencyColor] = useState('#fef2f2');
  const [urgencySize, setUrgencySize] = useState('md');
  const [urgencyIcon, setUrgencyIcon] = useState('alert');
  const [urgencyIconSize, setUrgencyIconSize] = useState(14);
  const [urgencyAnimation, setUrgencyAnimation] = useState('none');
  const [textPrimaryColor, setTextPrimaryColor] = useState('#ffffff');
  const [urgencyTextColor, setUrgencyTextColor] = useState('#991b1b');

  const [slugIsAvailable, setSlugIsAvailable] = useState<boolean | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      setLoading(true);
      const data = await getUserSites();
      setSites(data);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar suas páginas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectSite = (site: CaptureSite) => {
    setActiveSiteId(site.id);
    setTitle(site.title || "");
    setSubtitle(site.subtitle || "");
    setButtonText(site.button_text || "");
    setButtonLink(site.button_link || "");
    setBenefits(site.benefits?.join("\n") || "");
    setImageUrl(site.image_url || "");
    setUrgencyText(site.urgency_text || "");
    setSlug(site.slug || "");
    setThemeColor(site.theme_color || '#3b82f6');
    setButtonColor(site.button_color || '#2563eb');
    setBackgroundColor(site.background_color || '#000000');
    setIsGradient(site.is_gradient ?? false);
    setUrgencyColor(site.urgency_color || '#fef2f2');
    setUrgencyIcon(site.urgency_icon || "alert");
    setUrgencySize(site.urgency_size || 'md');
    setUrgencyIconSize(site.urgency_icon_size || 14);
    setUrgencyAnimation(site.urgency_animation || 'none');
    setTextPrimaryColor(site.text_primary_color || '#ffffff');
    setUrgencyTextColor(site.urgency_text_color || '#991b1b');

    setSlugIsAvailable(true);
    setViewMode('editor');
  };

  const handleNew = () => {
    setActiveSiteId(null);
    setTitle("Nova Página de Captura");
    setSubtitle("Subtítulo persuasivo para converter seus visitantes");
    setButtonText("Quero Entrar Agora");
    setButtonLink("");
    setBenefits("Acesso imediato\nEstratégias validadas\nSuporte premium");
    setImageUrl("");
    setUrgencyText(" Últimas vagas disponíveis - encerra hoje!");
    setUrgencyIcon("alert");
    setUrgencySize('md');
    setUrgencyIconSize(14);
    setUrgencyAnimation('none');
    setTextPrimaryColor('#ffffff');
    setUrgencyTextColor('#991b1b');
    setSlug("");
    setThemeColor('#3b82f6');
    setButtonColor('#2563eb');
    setBackgroundColor('#000000');
    setIsGradient(false);
    setUrgencyColor('#fef2f2');
    setUrgencyIcon("alert");
    setUrgencySize('md');

    setSlugIsAvailable(null);
    setViewMode('editor');
  };

  const validateSlug = async (value: string) => {
    if (!value) {
      setSlugIsAvailable(null);
      return;
    }
    const safeSlug = slugify(value);
    setSlug(safeSlug);
    try {
      const currentActive = sites.find(s => s.id === activeSiteId);
      if (currentActive && currentActive.slug === safeSlug) {
        setSlugIsAvailable(true);
        return;
      }

      const res = await checkSlug(safeSlug);
      setSlugIsAvailable(res.available);
      if (!res.available) {
        setSlug(res.suggested_slug);
        setSlugIsAvailable(true);
        toast({
          title: "URL Ocupada",
          description: `Sugerimos: ${res.suggested_slug}`,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }

    try {
      setUploadLoading(true);
      const data = await uploadImage(file);
      setImageUrl(data.url);
      toast({ title: "Sucesso", description: "Imagem adicionada com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setUploadLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta página? Esta ação é irreversível.")) return;

    try {
      setLoading(true);
      await deleteSite(id);
      setSites(prev => prev.filter(s => s.id !== id));
      toast({ title: "Sucesso", description: "Página excluída com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title) {
      toast({ title: "Erro", description: "O Título é obrigatório.", variant: "destructive" });
      return;
    }

    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = slugify(title);
      setSlug(finalSlug);
    }

    try {
      setSaving(true);
      const payload: CaptureSiteCreate = {
        title,
        subtitle,
        button_text: buttonText,
        button_link: buttonLink,
        benefits: benefits.split('\n').filter(b => b.trim() !== ""),
        image_url: imageUrl,
        urgency_text: urgencyText,
        slug: finalSlug,
        theme_color: themeColor || undefined,
        button_color: buttonColor || undefined,
        background_color: backgroundColor || undefined,
        is_gradient: isGradient,
        urgency_color: urgencyColor || undefined,
        urgency_icon: urgencyIcon || undefined,
        urgency_size: urgencySize || undefined,
        urgency_icon_size: urgencyIconSize,
        urgency_animation: urgencyAnimation,
        text_primary_color: textPrimaryColor,
        urgency_text_color: urgencyTextColor,
      };

      if (activeSiteId) {
        const updated = await updateSite(activeSiteId, payload);
        toast({ title: "Sucesso", description: "Página atualizada!" });
        setSites(prev => prev.map(s => s.id === updated.id ? updated : s));
        setViewMode('list');
      } else {
        const created = await createSite(payload);
        toast({ title: "Sucesso", description: "Nova página criada!" });
        setSites(prev => [...prev, created]);
        setViewMode('list');
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar página",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = slug ? `${window.location.origin}/c/${slug}` : "";

  const renderListView = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Suas Páginas</h2>
          <p className="text-muted-foreground">Gerencie seus sites de captura e converta mais leads.</p>
        </div>
        <Button onClick={handleNew} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Criar Novo Site
        </Button>
      </div>

      {loading && sites.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <LayoutTemplate className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Nenhum site criado</h3>
          <p className="text-muted-foreground mb-6">Comece criando sua primeira página de alta conversão.</p>
          <Button onClick={handleNew} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Criar Minha Primeira Página
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map(site => (
            <Card key={site.id} className="overflow-hidden flex flex-col group border-border/50 hover:border-emerald-500/30 transition-all shadow-sm hover:shadow-md">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg truncate pr-4">{site.title}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => selectSite(site)}
                    >
                      <Wand2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(site.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Globe className="w-3 h-3" />
                  <span className="truncate">/c/{site.slug}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: site.button_color || '#10b981' }}
                    title="Cor do Botão"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: site.background_color || '#000000' }}
                    title="Cor de Fundo"
                  />
                  {site.is_gradient && <Sparkles className="w-3 h-3 text-emerald-500" title="Gradiente Ativo" />}
                </div>
              </div>

              <div className="bg-muted/30 p-3 px-5 border-t border-border flex justify-between items-center">
                <Button variant="link" className="p-0 h-auto text-xs text-primary font-medium" onClick={() => selectSite(site)}>
                  EDITARbuilder
                </Button>
                <a
                  href={`${window.location.origin}/c/${site.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold hover:underline"
                >
                  VER PÁGINA <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderEditorView = () => (
    <div className="flex flex-col lg:flex-row h-full min-h-[500px] bg-background border border-border rounded-xl overflow-hidden">
      {/* LEFT PANEL: EDITOR */}
      <div className="w-full lg:w-1/2 flex flex-col overflow-y-auto border-r border-border">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setViewMode('list')}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Builder Mode</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Conteúdo Principal</h2>
            </div>

            <Card className="p-5 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título de Impacto</Label>
                <Input
                  placeholder="Ex: Grupo VIP de Investimentos"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Persuasiva</Label>
                <Textarea
                  placeholder="Explique o valor da sua oferta de forma breve..."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="min-h-[100px] leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logo da Página</Label>
                <div className="flex flex-col gap-4">
                  {imageUrl && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group bg-zinc-900">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImageUrl("")}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("image-upload")?.click()}
                      disabled={uploadLoading}
                      className="gap-2"
                    >
                      {uploadLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {imageUrl ? "Alterar Imagem" : "Fazer Upload do Logo"}
                    </Button>
                    {!imageUrl && <span className="text-xs text-muted-foreground italic">Recomendado: PNG fundo transparente</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Banner de Urgência</Label>

                <div className="space-y-3">
                  <Input
                    placeholder="Ex: Últimas vagas! Oferta termina hoje."
                    value={urgencyText}
                    onChange={(e) => setUrgencyText(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cor do Banner</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={urgencyColor || "#fef2f2"}
                          onChange={(e) => setUrgencyColor(e.target.value)}
                          className="w-10 h-8 p-1 cursor-pointer shrink-0"
                        />
                        <Button variant="ghost" size="sm" onClick={() => setUrgencyColor("")} className="text-[10px] h-8 px-2">
                          Reset
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Ícone Scarcity/Urgência</Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(URGENCY_ICONS).map((iconKey) => {
                          const IconComp = URGENCY_ICONS[iconKey];
                          return (
                            <Button
                              key={iconKey}
                              variant={urgencyIcon === iconKey ? 'secondary' : 'outline'}
                              size="sm"
                              className="h-10 w-10 p-0"
                              onClick={() => setUrgencyIcon(iconKey)}
                              title={iconKey}
                            >
                              <IconComp className="w-5 h-5" />
                            </Button>
                          );
                        })}
                        <Button
                          variant={urgencyIcon === 'none' ? 'secondary' : 'outline'}
                          size="sm"
                          className="h-10 w-10 p-0 text-[10px] font-bold"
                          onClick={() => setUrgencyIcon('none')}
                        >
                          SEM
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tamanho do Ícone ({urgencyIconSize}px)</Label>
                    <input
                      type="range"
                      min="10"
                      max="32"
                      value={urgencyIconSize}
                      onChange={(e) => setUrgencyIconSize(parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Efeito de Atenção</Label>
                    <div className="flex gap-2">
                      {[
                        { id: 'none', label: 'Nenhum' },
                        { id: 'pulse', label: 'Pulso 💓' },
                        { id: 'blink', label: 'Piscar ⚡' },
                        { id: 'bounce', label: 'Pular 🦘' }
                      ].map((anim) => (
                        <Button
                          key={anim.id}
                          variant={urgencyAnimation === anim.id ? 'secondary' : 'outline'}
                          size="sm"
                          className="flex-1 text-[10px]"
                          onClick={() => setUrgencyAnimation(anim.id)}
                        >
                          {anim.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Personalização Visual</h2>
            </div>

            <Card className="p-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cor do Botão</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={buttonColor || "#2563eb"}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="w-full h-10 p-1 cursor-pointer rounded-lg border-2 border-border/50 hover:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cor de Fundo</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={backgroundColor || "#000000"}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-full h-10 p-1 cursor-pointer rounded-lg border-2 border-border/50 hover:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Efeito Gradiente</Label>
                  <p className="text-xs text-muted-foreground">Adiciona profundidade ao fundo da página.</p>
                </div>
                <Switch checked={isGradient} onCheckedChange={setIsGradient} />
              </div>

              <div className="space-y-4 pt-2 border-t border-border/50">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cor do Título e Textos (Cor Principal)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={textPrimaryColor}
                      onChange={(e) => setTextPrimaryColor(e.target.value)}
                      className="w-full h-10 p-1 cursor-pointer rounded-lg border-2 border-border/50 hover:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cor do Texto do Banner</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={urgencyTextColor}
                      onChange={(e) => setUrgencyTextColor(e.target.value)}
                      className="w-full h-10 p-1 cursor-pointer rounded-lg border-2 border-border/50 hover:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cor do Brilho (Glow)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={themeColor || "#3b82f6"}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-full h-10 p-1 cursor-pointer rounded-lg border-2 border-border/50 hover:border-primary/50 transition-colors"
                    />
                    <Button variant="ghost" size="sm" onClick={() => setThemeColor("")} className="text-xs h-8 shrink-0">
                      Resetar
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Call to Action (CTA)</h2>
            </div>

            <Card className="p-5 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Texto do Botão</Label>
                <Input
                  placeholder="Ex: Quero Participar Agora"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link de Destino</Label>
                <Input
                  placeholder="https://wa.me/5511999999999"
                  value={buttonLink}
                  onChange={(e) => setButtonLink(e.target.value)}
                />
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Pontos Fortes / Benefícios</h2>
            </div>

            <Card className="p-5">
              <Textarea
                placeholder="Acesso Exclusivo\nEstratégias Avançadas\nSuporte Premium"
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                className="min-h-[120px] bg-muted/10 border-none focus-visible:ring-1"
              />
              <p className="text-[10px] text-muted-foreground mt-2 italic text-center">Digite um benefício por linha.</p>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Endereço da Página</h2>
            </div>

            <Card className="p-5 border-primary/20 bg-primary/5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-primary">Slug Personalizado</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="meu-produto-exclusivo"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    onBlur={(e) => validateSlug(e.target.value)}
                    className="bg-background border-primary/30"
                  />
                  {slugIsAvailable === true && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                </div>
                {publicUrl && (
                  <div className="mt-2 flex items-center justify-between bg-background/50 border border-primary/10 rounded-md p-2 px-3 text-xs">
                    <span className="truncate text-muted-foreground font-mono mr-2">{publicUrl}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7" onClick={() => {
                      navigator.clipboard.writeText(publicUrl);
                      toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
                    }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-3"
          >
            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            SALVAR ALTERAÇÕES
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL: LIVE PREVIEW */}
      <div className="w-full lg:w-1/2 bg-muted/10 p-4 lg:p-8 flex items-center justify-center overflow-y-auto relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
            <Eye className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Preview</span>
          </div>
        </div>

        <div className="w-full max-w-[375px] h-[812px] max-h-full bg-black rounded-[45px] border-[12px] border-zinc-900 shadow-2xl relative overflow-hidden flex flex-col scale-[0.85] sm:scale-100 origin-center">
          {/* Fake Mobile Status Bar */}
          <div className="h-7 w-full flex items-center justify-center pt-2 shrink-0 bg-black/40 backdrop-blur-sm z-50">
            <div className="w-[100px] h-4 bg-zinc-800 rounded-full" />
          </div>

          {/* The Preview Content */}
          <div
            className="flex-1 overflow-y-auto preview-scroll scrollbar-hide flex flex-col relative"
            style={{
              backgroundColor: backgroundColor || '#000000',
              backgroundImage: isGradient ? `radial-gradient(circle at top, ${backgroundColor || '#000000'} 0%, #000000 100%)` : 'none'
            }}
          >
            {/* Urgency Banner */}
            {urgencyText && (
              <div
                className="w-full py-2.5 px-6 border-b text-[11px] font-bold text-center backdrop-blur-md z-40 sticky top-0 uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
                style={{
                  backgroundColor: urgencyColor ? `${urgencyColor}26` : 'rgba(16, 185, 129, 0.15)',
                  borderColor: urgencyColor ? `${urgencyColor}33` : 'rgba(16, 185, 129, 0.2)',
                  color: urgencyTextColor || urgencyColor || '#10b981'
                }}
              >
                {urgencyIcon !== 'none' && URGENCY_ICONS[urgencyIcon] && (
                  (() => {
                    const IconComp = URGENCY_ICONS[urgencyIcon];
                    const animationClass =
                      urgencyAnimation === 'pulse' ? 'animate-pulse' :
                        urgencyAnimation === 'blink' ? 'animate-[pulse_0.5s_ease-in-out_infinite]' : // Efeito de piscar rápido
                          urgencyAnimation === 'bounce' ? 'animate-bounce' : '';

                    return (
                      <IconComp
                        className={animationClass}
                        style={{ width: `${urgencyIconSize}px`, height: `${urgencyIconSize}px` }}
                      />
                    );
                  })()
                )}
                {urgencyText}
              </div>
            )}

            <div className="flex-1 flex flex-col text-white p-8 relative">
              {/* Decorative Glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[160%] h-[350px] blur-[100px] rounded-full pointer-events-none"
                style={{ backgroundColor: themeColor || '#10b981', opacity: 0.15 }}
              />

              <div className="flex-1 flex flex-col relative z-20 items-center text-center pt-6">
                {/* Image/Logo */}
                <div className="w-24 h-24 mb-8 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl flex-shrink-0 bg-zinc-900">
                  <img src={imageUrl || DEFAULT_IMAGE} alt="Logo" className="w-full h-full object-cover" />
                </div>

                <h1 className="text-3xl font-black tracking-tight mb-5 leading-[1.1]" style={{ color: textPrimaryColor }}>
                  {title || "Título Irresistível Aqui"}
                </h1>

                <p className="text-base mb-10 leading-relaxed font-light px-2" style={{ color: `${textPrimaryColor}b3` }}>
                  {subtitle || "Uma descrição poderosa que complementa seu título e aumenta o desejo do seu cliente."}
                </p>

                <div className="w-full relative group mb-12">
                  <div
                    className="absolute -inset-1 blur-lg opacity-40 group-hover:opacity-75 transition duration-200 rounded-2xl"
                    style={{ backgroundColor: buttonColor || '#10b981' }}
                  ></div>
                  <Button
                    className="w-full h-16 rounded-2xl text-lg font-bold shadow-2xl relative z-10 gap-3 border transition-all"
                    style={{
                      backgroundColor: buttonColor || '#10b981',
                      borderColor: 'rgba(255,255,255,0.1)'
                    }}
                  >
                    <WhatsAppIcon className="w-6 h-6" />
                    {buttonText || "Botão de Ação"}
                  </Button>
                </div>

                <div className="space-y-4 w-full text-left">
                  {benefits.split('\n').filter(b => b.trim()).map((benefit, i) => (
                    <div key={i} className="flex items-start gap-4 bg-white/[0.03] p-5 rounded-2xl border border-white/[0.05] backdrop-blur-sm shadow-sm transition-all hover:bg-white/[0.06]">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug font-medium text-base" style={{ color: `${textPrimaryColor}e6` }}>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="Gestão de Páginas"
      subtitle="Gerencie e personalize seus sites de captura de alto impacto."
    >
      <div className="flex-1 min-h-screen py-4">
        {viewMode === 'list' ? renderListView() : renderEditorView()}
      </div>
    </DashboardLayout>
  );
};

export default CapturaSite;
