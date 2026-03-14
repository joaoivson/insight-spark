import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { getApiUrl } from "@/core/config/api.config";
import { Loader2 } from "lucide-react";

const LinkRedirect = () => {
    const { slug } = useParams<{ slug: string }>();

    useEffect(() => {
        if (!slug) return;
        const redirectUrl = getApiUrl(`/api/v1/links/r/${encodeURIComponent(slug)}`);
        window.location.replace(redirectUrl);
    }, [slug]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-muted-foreground">Redirecionando...</p>
            </div>
        </div>
    );
};

export default LinkRedirect;
