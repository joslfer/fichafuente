import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, ExternalLink, Calendar, Hash, Quote, ArrowLeft, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Ficha } from "@/hooks/useFichas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const PublicFicha = () => {
  const { slug } = useParams<{ slug: string }>();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

useEffect(() => {
    const load = async () => {
      if (!slug) return;

      const { data, error } = await supabase
        .from("fichas")
        .select("*")
        .eq("public_slug", slug)
        .eq("is_public", true)
        .is("archived_at", null)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setFicha(data);
      }
      setLoading(false);
    };
    load();
  }, [slug]);
  
  const renderContent = (html: string) => {
    return html.replace(/<p><\/p>/g, '<p><br></p>');
  };

  const formatSourceUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      const normalizedPath = parsedUrl.pathname.replace(/\/$/, "");
      return `${parsedUrl.hostname}${normalizedPath}`;
    } catch {
      return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !ficha) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <FileText className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Ficha no encontrada</p>
        <Button variant="ghost" asChild>
          <a href="/">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Inicio
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <a href="/" className="inline-flex items-center gap-1 mb-8 text-muted-foreground hover:text-foreground transition-colors">
          <span className="text-sm font-medium">
            <span className="bg-gradient-to-b from-[hsl(var(--logo-gradient-from))] to-[hsl(var(--logo-gradient-to))] bg-clip-text text-transparent">Ficha</span>
            <span className="text-primary">fuente</span>
          </span>
          <span className="text-xs text-muted-foreground/90">· crea fichas con evidencia verificable</span>
        </a>

        <article className="animate-fade-in space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{ficha.title}</h1>

          <div className="flex flex-col gap-1 pt-1">
            {ficha.source_url ? (
              <a href={ficha.source_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary underline hover:text-primary/80 transition-colors">
                {ficha.source_name}
                <ExternalLink className="w-3.5 h-3.5 inline ml-1 -mt-0.5" />
              </a>
            ) : (
              <span className="text-sm font-medium text-foreground">{ficha.source_name}</span>
            )}

            {ficha.source_url && (
              <a
                href={ficha.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors break-all"
              >
                {formatSourceUrl(ficha.source_url)}
              </a>
            )}
          </div>

          <div
            className="text-[15px] leading-[1.45] text-foreground/90 ficha-content public-ficha-content font-[450]"
            dangerouslySetInnerHTML={{ __html: renderContent(ficha.content) }}
          />

          {ficha.quote && (
            <blockquote className="border-l-4 border-primary/70 bg-muted rounded-r-md pl-4 pr-3 py-2.5 text-sm text-foreground/90 italic">
              <Quote className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              {ficha.quote}
            </blockquote>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {ficha.data_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(ficha.data_date), "dd MMM yyyy", { locale: es })}
              </span>
            )}
          </div>

          {ficha.tags && ficha.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ficha.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-badge text-badge-foreground">
                  <Hash className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        <div className="mt-10 flex justify-center">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copiado al portapapeles");
            }}
            className="gap-2 px-6 h-11 text-sm font-medium"
          >
            <Link2 className="w-4 h-4" />
            Copiar link de esta ficha
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublicFicha;