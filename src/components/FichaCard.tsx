import { ExternalLink, Hash, Calendar, Eye, MoreHorizontal, Trash2, Pencil, FileDown } from "lucide-react";
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
      <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    )
  );
};

const stripHtml = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
};

const FichaCard = ({ ficha, onEdit, searchQuery }: FichaCardProps) => {
  const deleteFicha = useDeleteFicha();

  const handleClick = () => {
    if (ficha.public_slug) {
      window.open(`${window.location.origin}/f/${ficha.public_slug}`, "_blank");
    }
  };

  const handleDelete = () => {
    deleteFicha.mutate(ficha.id);
  };

  

  return (
    <article
      className="group relative bg-card rounded-lg border border-border/60 p-5 hover:border-border transition-colors animate-fade-in flex flex-col min-h-[280px]"    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3
          className="text-[15px] font-semibold leading-snug text-foreground flex-1 cursor-pointer hover:text-primary transition-colors"
          onClick={handleClick}
        >
          {highlightText(ficha.title, searchQuery || "")}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onEdit(ficha)}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportFichaToPDF(ficha)}>
              <FileDown className="w-3.5 h-3.5 mr-2" /> Exportar PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content preview - preserving HTML structure */}
      <div className="mb-3 flex-1">
        <div
          className="text-sm text-muted-foreground leading-relaxed line-clamp-5 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
          dangerouslySetInnerHTML={{ __html: ficha.content || "" }}
        />
      </div>

      {/* "Ver más" button */}
      <button
        onClick={handleClick}
        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors mb-3 flex items-center gap-0.5"
      >
        Ver más &gt;
      </button>

      {/* Source */}
      {ficha.source_name && (
        <div className="flex items-center gap-1.5 mb-3">
          {ficha.source_url ? (
            <a
              href={ficha.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary underline hover:text-primary/80 transition-colors truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {highlightText(ficha.source_name, searchQuery || "")}
              <ExternalLink className="w-3 h-3 inline ml-1 -mt-0.5" />
            </a>
          ) : (
            <span className="text-xs font-medium text-foreground/80 truncate">
              {highlightText(ficha.source_name, searchQuery || "")}
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {ficha.tags && ficha.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ficha.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-badge text-badge-foreground"
            >
              <Hash className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
        {ficha.data_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(ficha.data_date), "dd MMM yyyy", { locale: es })}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {ficha.visit_count}
        </span>
      </div>
    </article>
  );
};

export default FichaCard;
