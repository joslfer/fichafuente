import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, ExternalLink, Calendar, Hash, Quote, ArrowLeft, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Ficha } from "@/hooks/useFichas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import DoiBadge from "@/components/DoiBadge";
import { isDoiSourceUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const PublicFicha = () => {
  const { slug } = useParams<{ slug: string }>();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const isDoiSource = isDoiSourceUrl(ficha?.source_url);

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
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
          <Skeleton className="h-4 w-56" />

          <article className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-11/12" />
              <Skeleton className="h-8 w-8/12" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-80" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-9/12" />
            </div>

            <Skeleton className="h-16 w-full" />

            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </article>

          <div className="flex justify-center">
            <Skeleton className="h-11 w-52" />
          </div>
        </div>
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-8">
          <a href="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-w-0">
            <span className="text-sm font-medium">
              <span className="bg-gradient-to-b from-[hsl(var(--logo-gradient-from))] to-[hsl(var(--logo-gradient-to))] bg-clip-text text-transparent">Ficha</span>
              <span className="text-primary">fuente</span>
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground/90">· crea fichas con evidencia verificable</span>
          </a>
        </div>

        <article className="animate-fade-in space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{ficha.title}</h1>

          <div className="flex flex-col gap-1 pt-1 min-w-0">
            {ficha.source_url ? (
              <div className="flex items-center gap-2 min-w-0 w-full">
                <a href={ficha.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary underline hover:text-primary/80 transition-colors min-w-0">
                  <span className="truncate">{ficha.source_name}</span>
                  <ExternalLink className="w-3.5 h-3.5 inline ml-1 -mt-0.5 shrink-0" />
                </a>
                {isDoiSource && <DoiBadge />}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{ficha.source_name}</span>
                {isDoiSource && <DoiBadge />}
              </div>
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

          {ficha.authors && ficha.authors.length > 0 && (
            <div className="text-sm flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground">Autores:</span>
              <span className="text-foreground/85">{ficha.authors.join(", ")}</span>
            </div>
          )}

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
                <span key={tag} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-badge text-badge-foreground transition-all duration-100 hover:-translate-y-px hover:bg-badge/80">
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