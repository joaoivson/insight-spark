import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import {
    CheckCircle2, AlertTriangle, Clock, Flame, Zap,
    TrendingUp, ShieldCheck, Timer
} from "lucide-react";

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
import { CaptureSite, getPublicSite } from "@/services/capture_site.service";
import { Button } from "@/components/ui/button";

// Ícone Oficial do WhatsApp
const DEFAULT_IMAGE = "/default-logo.png";

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
                <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
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
        <div
            className="min-h-screen text-white relative flex flex-col items-center overflow-x-hidden"
            style={{
                backgroundColor: site.background_color || '#000000',
                backgroundImage: site.is_gradient ? `radial-gradient(circle at top, ${site.background_color || '#000000'} 0%, #000000 100%)` : 'none'
            }}
        >
            {/* Urgency Banner (Top Strip) */}
            {site.urgency_text && (
                <div
                    className={`w-full px-6 border-b font-bold text-center backdrop-blur-md z-30 fixed top-0 left-0 flex items-center justify-center gap-2 shadow-lg uppercase tracking-wider transition-all duration-300 ${site.urgency_size === 'lg'
                        ? 'py-4 sm:py-5 text-sm sm:text-base'
                        : 'py-2.5 sm:py-3 text-xs sm:text-sm'
                        }`}
                    style={{
                        color: site.urgency_text_color || site.urgency_color || '#10b981'
                    }}
                >
                    {site.urgency_icon !== 'none' && URGENCY_ICONS[site.urgency_icon || ''] && (
                        (() => {
                            const IconComp = URGENCY_ICONS[site.urgency_icon || ''];
                            const animationClass =
                                site.urgency_animation === 'pulse' ? 'animate-pulse' :
                                    site.urgency_animation === 'blink' ? 'animate-[pulse_0.5s_ease-in-out_infinite]' :
                                        site.urgency_animation === 'bounce' ? 'animate-bounce' : '';

                            return (
                                <IconComp
                                    className={animationClass}
                                    style={{
                                        width: `${site.urgency_icon_size || 16}px`,
                                        height: `${site.urgency_icon_size || 16}px`,
                                        color: site.urgency_text_color || site.urgency_color || '#10b981'
                                    }}
                                />
                            );
                        })()
                    )}
                    {site.urgency_text}
                </div>
            )}

            {/* Decorative Glow Elements */}
            <div
                className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[200%] max-w-[1000px] h-[400px] blur-[120px] rounded-[100%] pointer-events-none"
                style={{ backgroundColor: site.theme_color || 'hsl(var(--primary))', opacity: 0.2 }}
            />
            <div
                className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] blur-[120px] rounded-full pointer-events-none"
                style={{ backgroundColor: site.theme_color || '#10b981', opacity: 0.1 }}
            />

            {/* Main Container */}
            <div className={`w-full max-w-4xl relative z-10 flex flex-col items-center justify-center flex-1 px-4 pb-20 ${site.urgency_text ? 'pt-24 sm:pt-32' : 'pt-16 sm:pt-24'}`}>

                {/* Profile Image */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 mb-8 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl flex-shrink-0 bg-black/50">
                    <img
                        src={site.image_url || DEFAULT_IMAGE}
                        alt="Foto de Perfil"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight drop-shadow-sm text-center max-w-3xl" style={{ color: site.text_primary_color || '#ffffff' }}>
                    {site.title}
                </h1>

                {/* Subtitle */}
                {site.subtitle && (
                    <p className="text-lg sm:text-xl md:text-2xl mb-12 sm:mb-14 leading-relaxed font-light text-center max-w-2xl px-2" style={{ color: site.text_primary_color ? `${site.text_primary_color}cc` : 'rgba(255,255,255,0.8)' }}>
                        {site.subtitle}
                    </p>
                )}

                {/* Action Button */}
                <div className="w-full max-w-lg relative group mb-14 sm:mb-16">
                    <div
                        className="absolute -inset-1 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition duration-200"
                        style={{ backgroundColor: site.button_color || '#10b981' }}
                    ></div>
                    <Button
                        onClick={handleActionClick}
                        className="w-full h-16 sm:h-20 rounded-2xl text-lg sm:text-xl font-bold text-white shadow-xl border transition-all relative z-10 gap-3"
                        style={{
                            backgroundColor: site.button_color || '#10b981',
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}
                    >
                        <WhatsAppIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                        {site.button_text || "Acessar Agora"}
                    </Button>
                </div>

                {/* Benefits */}
                {benefitsList.length > 0 && (
                    <div className="space-y-4 w-full max-w-xl text-left">
                        {benefitsList.map((benefit, i) => (
                            <div key={i} className="flex items-start gap-4 bg-white/5 p-4 sm:p-6 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg transition-transform hover:-translate-y-1">
                                <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 flex-shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                <span className="leading-relaxed font-medium text-base sm:text-lg" style={{ color: site.text_primary_color ? `${site.text_primary_color}f2` : 'rgba(255,255,255,0.95)' }}>{benefit}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CaptureViewer;
