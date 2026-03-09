import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { CheckCircle2, LayoutTemplate } from "lucide-react";
import { CaptureSite, getPublicSite } from "@/services/capture_site.service";
import { Button } from "@/components/ui/button";

// Ícone Oficial do WhatsApp
const DEFAULT_IMAGE = "/default-avatar.png";

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


export const CaptureViewer = () => {
    const { slug } = useParams<{ slug: string }>();
    const [site, setSite] = useState<CaptureSite | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!slug) return;
        const fetchSite = async () => {
            try {
                const data = await getPublicSite(slug);
                setSite(data);
            } catch (e) {
                console.error(e);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchSite();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
        );
    }

    if (error || !site) {
        return <Navigate to="/" replace />;
    }

    const handleActionClick = () => {
        if (site.button_link) {
            // Formata o link se não tiver http/https
            let link = site.button_link;
            if (!/^https?:\/\//i.test(link)) {
                link = "https://" + link;
            }
            window.location.href = link;
        }
    };

    const benefitsList = site.benefits || [];

    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
            {/* Urgency Banner (Top Strip) */}
            {site.urgency_text && (
                <div className="absolute top-0 left-0 w-full py-3 px-6 bg-red-500/10 border-b border-red-500/20 text-red-500 text-xs sm:text-sm font-bold text-center backdrop-blur-md z-30 animate-pulse">
                    <span className="relative flex h-2 w-2 inline-flex mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    {site.urgency_text.toUpperCase()}
                </div>
            )}

            {/* Decorative Glow Elements */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[200%] max-w-[1000px] h-[400px] bg-primary/20 blur-[120px] rounded-[100%] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Main Container */}
            <div className={`w-full max-w-xl relative z-10 flex flex-col min-h-[80vh] ${site.urgency_text ? 'pt-12' : ''}`}>
                {/* Header Branding */}
                <div className="flex items-center gap-2 mb-12 sm:mb-16">
                    <LayoutTemplate className="w-6 h-6 text-primary" />
                    <span className="font-semibold tracking-tight text-white/90">MarketDash</span>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center">
                    {/* Profile Image */}
                    <div className="mb-8 flex justify-center w-full">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl flex-shrink-0 bg-black/50">
                            <img
                                src={site.image_url || DEFAULT_IMAGE}
                                alt="Foto de Perfil"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>


                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1] bg-gradient-to-br from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                        {site.title}
                    </h1>

                    {site.subtitle && (
                        <p className="text-lg sm:text-xl text-white/70 mb-12 leading-relaxed font-light max-w-lg">
                            {site.subtitle}
                        </p>
                    )}

                    {benefitsList.length > 0 && (
                        <div className="space-y-4 mb-16 max-w-lg">
                            {benefitsList.map((benefit, i) => (
                                <div key={i} className="flex items-start gap-3 sm:bg-white/5 sm:p-5 sm:rounded-2xl sm:border sm:border-white/5 sm:backdrop-blur-sm">
                                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                                    <span className="text-white/90 text-[17px] leading-snug">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div className="mt-auto pt-8 sm:pt-16 pb-6 w-full max-w-lg">
                    <Button
                        onClick={handleActionClick}
                        className="w-full relative group overflow-hidden rounded-full h-14 sm:h-16 text-lg sm:text-xl font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(34,197,94,0.6)]"
                        style={{
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            border: "1px solid rgba(255,255,255,0.1)"
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_2s_infinite]" />
                        <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
                            <WhatsAppIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            {site.button_text || "Acessar Agora"}
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CaptureViewer;
