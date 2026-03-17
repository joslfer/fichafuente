import { useEffect, useRef, useState } from "react";
import { ExternalLink, Hash, Calendar, MoreHorizontal, Trash2, Pencil, FileDown } from "lucide-react";
import { exportFichaToPDF } from "@/lib/exportPDF";
import { Ficha, useDeleteFicha } from "@/hooks/useFichas";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DoiBadge from "@/components/DoiBadge";
import { isArchivedTag, isDoiSourceUrl, orderTagsForDisplay } from "@/lib/utils";

type FichaCardProps = {
  ficha: Ficha;
  onEdit: (ficha: Ficha) => void;
  searchQuery?: string;
};

const highlightText = (text: string, query: string) => {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="search-highlight">{part}</mark>
    ) : (
      part
    )
  );
};

const hasMeaningfulContent = (html?: string | null) => {
  if (!html) return false;

  const container = document.createElement("div");
  container.innerHTML = html;

  const text = (container.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .trim();

  if (text.length > 0) return true;

  return Boolean(container.querySelector("img, video, iframe, table, hr, pre"));
};

const FichaCard = ({ ficha, onEdit, searchQuery }: FichaCardProps) => {
  const deleteFicha = useDeleteFicha();
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [maxPreviewOffset, setMaxPreviewOffset] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const isArchived = Boolean(ficha.archived_at);
  const canOpenPublicPreview = Boolean(ficha.public_slug) && !isArchived;

  const handleClick = () => {
    if (canOpenPublicPreview) {
      window.open(`${window.location.origin}/f/${ficha.public_slug}`, "_blank");
    }
  };

  const handleDelete = () => {
    deleteFicha.mutate(ficha.id);
  };

  const hasContent = hasMeaningfulContent(ficha.content);
  const isDoiSource = isDoiSourceUrl(ficha.source_url);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = () => setMenuOpen(false);

    window.addEventListener("scroll", closeMenu, true);
    return () => window.removeEventListener("scroll", closeMenu, true);
  }, [menuOpen]);

  useEffect(() => {
    if (!hasContent || !previewViewportRef.current || !previewContentRef.current) {
      setPreviewOffset(0);
      setMaxPreviewOffset(0);
      return;
    }

    const viewport = previewViewportRef.current;
    const content = previewContentRef.current;

    const updatePreviewPosition = () => {
      const viewportHeight = viewport.clientHeight;
      const contentHeight = content.scrollHeight;
      const maxOffset = Math.max(contentHeight - viewportHeight, 0);
      setMaxPreviewOffset(maxOffset);

      if (maxOffset <= 0) {
        setPreviewOffset(0);
        return;
      }

      const marks = Array.from(content.querySelectorAll("mark"));
      if (marks.length === 0) {
        setPreviewOffset(0);
        return;
      }

      const contentRect = content.getBoundingClientRect();
      const markCenters = marks.map((mark) => {
        const rect = mark.getBoundingClientRect();
        return rect.top - contentRect.top + rect.height / 2;
      });

      const centerOfInterest = markCenters.reduce((sum, center) => sum + center, 0) / markCenters.length;
      const desiredOffset = centerOfInterest - viewportHeight / 2;
      const clampedOffset = Math.min(Math.max(desiredOffset, 0), maxOffset);
      setPreviewOffset(clampedOffset);
    };

    const frame = requestAnimationFrame(updatePreviewPosition);
    const observer = new ResizeObserver(updatePreviewPosition);
    observer.observe(viewport);
    observer.observe(content);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ficha.content, hasContent]);

  const showTopFog = previewOffset > 2;
  const showBottomFog = previewOffset < maxPreviewOffset - 2;

  

  return (
    <article
      className="group relative bg-card rounded-lg border border-border/60 p-5 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 flex flex-col min-h-[280px]"    >
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-100 ease-out z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 data-[state=open]:[animation-duration:110ms] data-[state=closed]:[animation-duration:80ms] data-[state=open]:[animation-timing-function:cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:[animation-timing-function:cubic-bezier(0.4,0,1,1)]"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem onClick={() => onEdit(ficha)}>
            <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportFichaToPDF(ficha)}>
            <FileDown className="w-3.5 h-3.5 mr-2" /> Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:bg-destructive/15 focus:text-destructive data-[highlighted]:bg-destructive/15 data-[highlighted]:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Header */}
      <div className="mb-2 pr-8">
        <h3
          className={`text-[15px] font-semibold leading-snug transition-colors ${
            canOpenPublicPreview ? "text-foreground cursor-pointer hover:text-primary" : "text-foreground"
          }`}
          onClick={canOpenPublicPreview ? handleClick : undefined}
        >
          {highlightText(ficha.title, searchQuery || "")}
        </h3>
      </div>

      {/* Content preview - preserving HTML structure */}
      <div className="mb-3 flex-1">
        {hasContent ? (
          <div
            ref={previewViewportRef}
            className={`relative h-28 overflow-hidden ${canOpenPublicPreview ? "cursor-pointer" : ""}`}
            onClick={canOpenPublicPreview ? handleClick : undefined}
          >
            <div
              ref={previewContentRef}
              className="ficha-preview-content text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 transition-transform duration-300"
              style={{ transform: `translateY(-${previewOffset}px)` }}
              dangerouslySetInnerHTML={{ __html: ficha.content || "" }}
            />
            {showTopFog && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-card to-transparent" />
            )}
            {showBottomFog && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent" />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full py-4">
            <span className="ficha-empty-dots text-2xl text-muted-foreground/30 tracking-[0.18em] select-none" aria-hidden="true">
              <span className="ficha-empty-dot">·</span>
              <span className="ficha-empty-dot">·</span>
              <span className="ficha-empty-dot">·</span>
            </span>
          </div>
        )}
      </div>

      {/* Source */}
      {ficha.source_name && (
        <div className="flex items-center gap-1.5 mb-3 min-w-0">
          {ficha.source_url ? (
            <div className="flex items-center gap-2 min-w-0 w-full">
              <a
                href={ficha.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 min-w-0 text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{highlightText(ficha.source_name, searchQuery || "")}</span>
                <ExternalLink className="w-3 h-3 inline ml-1 -mt-0.5 shrink-0" />
              </a>
              {isDoiSource && <div className="shrink-0"><DoiBadge /></div>}
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0 w-full">
              <span className="text-sm font-semibold text-foreground/90 truncate min-w-0">
                {highlightText(ficha.source_name, searchQuery || "")}
              </span>
              {isDoiSource && <div className="shrink-0"><DoiBadge /></div>}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {ficha.tags && ficha.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 justify-start">
          {orderTagsForDisplay(ficha.tags).map((tag) => (
            <span
              key={tag}
              className={`tag-hop inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-all duration-100 hover:-translate-y-px ${
                isArchivedTag(tag)
                  ? "ml-auto bg-secondary text-foreground/80 border border-border hover:bg-secondary/90"
                  : "bg-badge text-badge-foreground hover:bg-badge/80"
              }`}
            >
              <Hash className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
        {ficha.data_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(ficha.data_date), "dd MMM yyyy", { locale: es })}
          </span>
        )}
      </div>
    </article>
  );
};

export default FichaCard;
