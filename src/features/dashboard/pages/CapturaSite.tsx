import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Copy, Plus, Save, ExternalLink, RefreshCw, CheckCircle2, ChevronDown, LayoutTemplate, MessageCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

import {
	CaptureSite,
	CaptureSiteCreate,
	getUserSites,
	createSite,
	updateSite,
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

const DEFAULT_IMAGE = "/default-avatar.png";

export const CapturaSite = () => {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// Lista de sites
	const [sites, setSites] = useState<CaptureSite[]>([]);
	// Site atualmente selecionado/editado
	const [activeSiteId, setActiveSiteId] = useState<number | null>(null);

	// Form State
	const [title, setTitle] = useState("Descubra o Segredo do Sucesso");
	const [subtitle, setSubtitle] = useState("Vagas abertas para o grupo VIP de mentoria. Domine o mercado.");
	const [buttonText, setButtonText] = useState("Quero Entrar no Grupo VIP");
	const [buttonLink, setButtonLink] = useState("https://wa.me/5511999999999");
	const [benefits, setBenefits] = useState<string>("Acesso imediato\nEstratégias validadas\nSuporte premium");
	const [imageUrl, setImageUrl] = useState("");
	const [urgencyText, setUrgencyText] = useState("✅ Últimas vagas disponíveis - encerra hoje!");
	const [slug, setSlug] = useState("");
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
			if (data.length > 0) {
				selectSite(data[0]);
			}
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
		setImageUrl((site as any).image_url || "");
		setUrgencyText((site as any).urgency_text || "");
		setSlug(site.slug || "");
		setSlugIsAvailable(true); // se veio do banco dele é válido
	};

	const handleNew = () => {
		setActiveSiteId(null);
		setTitle("Nova Página");
		setSubtitle("Subtítulo atrativo");
		setButtonText("Ação");
		setButtonLink("");
		setBenefits("");
		setImageUrl("");
		setUrgencyText("✅ Últimas vagas disponíveis - encerra hoje!");
		setSlug("");
		setSlugIsAvailable(null);
	};

	const validateSlug = async (value: string) => {
		if (!value) {
			setSlugIsAvailable(null);
			return;
		}
		const safeSlug = slugify(value);
		setSlug(safeSlug);
		try {
			// Se estamos editando e o slug for o mesmo de antes, está disponível
			const currentActive = sites.find(s => s.id === activeSiteId);
			if (currentActive && currentActive.slug === safeSlug) {
				setSlugIsAvailable(true);
				return;
			}

			const res = await checkSlug(safeSlug);
			setSlugIsAvailable(res.available);
			if (!res.available) {
				setSlug(res.suggested_slug);
				setSlugIsAvailable(true); // O sugerido deve estar disponível
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

	const handleSave = async () => {
		if (!title) {
			toast({ title: "Erro", description: "O Título é obrigatório.", variant: "destructive" });
			return;
		}

		// Gerar um base slug se estiver vazio
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
			} as any;

			if (activeSiteId) {
				const updated = await updateSite(activeSiteId, payload);
				toast({ title: "Sucesso", description: "Página atualizada!" });
				setSites(prev => prev.map(s => s.id === updated.id ? updated : s));
				selectSite(updated);
			} else {
				const created = await createSite(payload);
				toast({ title: "Sucesso", description: "Nova página criada!" });
				setSites(prev => [...prev, created]);
				selectSite(created);
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

	return (
		<DashboardLayout
			title="Sites de Captura"
			subtitle="Crie páginas de alta conversão para seus links."
			action={
				<div className="flex gap-3 w-full sm:w-auto mt-4 md:mt-0">

					{sites.length > 0 && (
						<div className="relative inline-block w-full sm:w-auto">
							<select
								title="Selecionar Página"
								aria-label="Selecionar Página"
								className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								value={activeSiteId || ""}
								onChange={(e) => {
									const s = sites.find(x => x.id === Number(e.target.value));
									if (s) selectSite(s);
								}}
							>
								<option value="" disabled>Selecione uma página</option>
								{sites.map(s => (
									<option key={s.id} value={s.id}>{s.title}</option>
								))}
							</select>
						</div>
					)}
					<Button variant="outline" className="gap-2 whitespace-nowrap" onClick={handleNew}>
						<Plus className="w-4 h-4" /> Nova Página
					</Button>
					<Button onClick={handleSave} disabled={saving} className="gap-2 whitespace-nowrap bg-primary text-primary-foreground">
						{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
						Salvar
					</Button>
				</div>
			}
		>
			{/* Main Builder Area: Split Screen */}
			<div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background h-full min-h-[500px] border border-border rounded-xl">

				{/* LEFT PANEL: EDITOR */}
				<div className="w-full lg:w-1/2 flex flex-col overflow-y-auto border-r border-border p-6 gap-6">
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-medium">Configurações da Página</h2>
							{publicUrl && (
								<div className="flex items-center gap-2 text-sm">
									<a href={publicUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
										Abrir Página <ExternalLink className="w-3 h-3" />
									</a>
								</div>
							)}
						</div>

						<Card className="p-5 space-y-4">
							<div className="space-y-2">
								<Label>Título Principal</Label>
								<Input
									placeholder="Ex: Grupo VIP de Investimentos"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label>Subtítulo / Descrição</Label>
								<Textarea
									placeholder="Explique o valor da sua oferta de forma breve e persuasiva..."
									value={subtitle}
									onChange={(e) => setSubtitle(e.target.value)}
									className="min-h-[80px]"
								/>
							</div>

							<div className="space-y-2">
								<Label>Foto de Perfil / Logo (Opcional)</Label>
								<div className="flex gap-2">
									<Input
										placeholder="https://exemplo.com/minha-foto.png"
										value={imageUrl}
										onChange={(e) => setImageUrl(e.target.value)}
										className="flex-1"
									/>
									<div>
										<input
											type="file"
											id="image-upload"
											accept="image/*"
											title="Upload de Imagem"
											className="hidden"
											onChange={handleFileUpload}
										/>
										<Button
											variant="outline"
											onClick={() => document.getElementById("image-upload")?.click()}
											disabled={uploadLoading}
											type="button"
										>
											{uploadLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
											Upload
										</Button>
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<Label>Texto de Urgência / Escassez</Label>
								<Input
									placeholder="Ex: Oferta acaba em 24 horas!"
									value={urgencyText}
									onChange={(e) => setUrgencyText(e.target.value)}
								/>
							</div>
						</Card>

						<Card className="p-5 space-y-4">
							<h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Botão & Link</h3>

							<div className="space-y-2">
								<Label>Texto do Botão</Label>
								<Input
									placeholder="Ex: Quero Participar Agora"
									value={buttonText}
									onChange={(e) => setButtonText(e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label>Link de Destino (WhatsApp, Checkout, etc)</Label>
								<Input
									placeholder="https://"
									value={buttonLink}
									onChange={(e) => setButtonLink(e.target.value)}
								/>
							</div>
						</Card>

						<Card className="p-5 space-y-4">
							<h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Benefícios</h3>
							<div className="space-y-2">
								<Label>Liste os benefícios (um por linha)</Label>
								<Textarea
									placeholder="Acesso Exclusivo\nEstratégias Avançadas"
									value={benefits}
									onChange={(e) => setBenefits(e.target.value)}
									className="min-h-[120px]"
								/>
							</div>
						</Card>

						<Card className="p-5 space-y-4 border-primary/20 bg-primary/5">
							<h3 className="font-medium text-sm uppercase tracking-wider text-primary">Divulgação</h3>
							<div className="space-y-2">
								<Label>Link Personalizado (Slug)</Label>
								<div className="flex items-center gap-2">
									<span className="text-muted-foreground text-sm whitespace-nowrap hidden sm:inline-block">meusite.com/c/</span>
									<Input
										placeholder="meu-produto"
										value={slug}
										onChange={(e) => setSlug(e.target.value)}
										onBlur={(e) => validateSlug(e.target.value)}
									/>
									{slugIsAvailable === true && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
								</div>
								{publicUrl && (
									<div className="mt-2 flex items-center justify-between bg-background border rounded-md p-2 px-3 text-sm">
										<span className="truncate text-muted-foreground font-mono mr-2">{publicUrl}</span>
										<Button variant="ghost" size="sm" onClick={() => {
											navigator.clipboard.writeText(publicUrl);
											toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
										}}>
											<Copy className="w-4 h-4" />
										</Button>
									</div>
								)}
							</div>
						</Card>
					</div>
				</div>

				{/* RIGHT PANEL: LIVE PREVIEW */}
				<div className="w-full lg:w-1/2 bg-muted/30 p-4 lg:p-8 flex items-center justify-center overflow-y-auto">
					<div className="w-full max-w-[375px] h-[812px] max-h-full bg-black rounded-[40px] border-[8px] border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col">
						{/* Fake Mobile Status Bar */}
						<div className="h-6 w-full flex items-center justify-center pt-2">
							<div className="w-1/3 h-4 bg-zinc-800 rounded-full" />
						</div>

						{/* The Preview Content */}
						<div className="flex-1 overflow-y-auto preview-scroll scrollbar-hide flex flex-col">
							{/* Urgency Banner (Full Width Top) */}
							{urgencyText && (
								<div className="w-full py-2.5 px-6 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs font-semibold text-center backdrop-blur-md z-30">
									{urgencyText}
								</div>
							)}

							<div className="flex-1 flex flex-col text-white p-6 relative">
								{/* Decorative Glow */}
								<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

								<div className="flex-1 flex flex-col relative z-20 px-6 pt-8 pb-10 items-center text-center">
									{/* Image/Logo */}
									<div className="w-24 h-24 mb-6 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl flex-shrink-0">
										<img src={imageUrl || DEFAULT_IMAGE} alt="Logo" className="w-full h-full object-cover" />
									</div>

									<h1 className="text-3xl font-extrabold tracking-tight mb-4 leading-tight text-white drop-shadow-sm">
										{title || "Insira seu Título"}
									</h1>

									<p className="text-white/80 text-[17px] mb-8 leading-relaxed font-light px-2">
										{subtitle || "Insira sua descrição."}
									</p>

									<div className="mt-auto w-full relative group">
										{/* Glowing standard effect behind button */}
										<div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition duration-200"></div>
										<Button className="w-full h-14 rounded-2xl text-[17px] font-bold bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-white shadow-xl border border-emerald-400/30 transition-all relative z-10 gap-2">
											<WhatsAppIcon className="w-5 h-5" />
											{buttonText || "Botão"}
										</Button>
									</div>

									<div className="space-y-3 mb-10 mt-10 w-full text-left">
										{benefits.split('\n').filter(b => b.trim()).map((benefit, i) => (
											<div key={i} className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md shadow-lg transition-transform hover:-translate-y-1">
												<CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
												<span className="text-white/95 leading-snug font-medium text-sm">{benefit}</span>
											</div>
										))}
										{benefits.trim() === "" && (
											<div className="text-white/30 italic py-4 text-center">Benefícios aparecerão aqui...</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

			</div>
		</DashboardLayout>
	);
};

export default CapturaSite;
