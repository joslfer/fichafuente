import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Search, LogOut, X, FileText, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useFichas, Ficha } from "@/hooks/useFichas";
import FichaCard from "@/components/FichaCard";
import FichaForm from "@/components/FichaForm";
import { Skeleton } from "@/components/ui/skeleton";
import AmbientKnowledgeGraph from "@/components/AmbientKnowledgeGraph";

const Index = () => {
  const { user, signOut } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchIconAnimating, setIsSearchIconAnimating] = useState(false);
  const [animatedMonthlyCount, setAnimatedMonthlyCount] = useState(0);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFicha, setEditingFicha] = useState<Ficha | null>(null);

  const { data: fichas, isLoading } = useFichas(searchQuery, tagFilters);

  // Collect all unique tags
  const allTags = useMemo(() => {
    if (!fichas) return [];
    const tagSet = new Set<string>();
    fichas.forEach((f) => f.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [fichas]);

  const monthlyCardsStats = useMemo(() => {
    const now = new Date();
    const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let currentMonth = 0;
    let previousMonth = 0;

    (fichas ?? []).forEach((ficha) => {
      const createdAt = new Date(ficha.created_at);
      if (Number.isNaN(createdAt.getTime())) return;

      if (createdAt >= startCurrentMonth) {
        currentMonth += 1;
        return;
      }

      if (createdAt >= startPreviousMonth && createdAt < startCurrentMonth) {
        previousMonth += 1;
      }
    });

    return {
      currentMonth,
      previousMonth,
      delta: currentMonth - previousMonth,
    };
  }, [fichas]);

  const currentMonthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date()).toLowerCase();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const target = monthlyCardsStats.currentMonth;
    const from = animatedMonthlyCount;
    const duration = 720;
    const start = performance.now();
    let frameId = 0;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(progress);
      const next = Math.round(from + (target - from) * eased);
      setAnimatedMonthlyCount(next);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [monthlyCardsStats.currentMonth, isLoading]);

  const graphItems = useMemo(
    () => (fichas ?? []).map((ficha) => ({ tags: ficha.tags ?? [] })),
    [fichas]
  );

  const handleEdit = (ficha: Ficha) => {
    setEditingFicha(ficha);
    setFormOpen(true);
  };

  const handleNewFicha = () => {
    setEditingFicha(null);
    setFormOpen(true);
  };

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingFicha(null);
    }
  };

  const addTagFilter = (tag: string) => {
    setTagFilters((prev) => {
      if (prev.includes(tag)) return prev;
      if (prev.length >= 2) return prev;
      return [...prev, tag];
    });
  };

  const removeTagFilter = (tag: string) => {
    setTagFilters((prev) => prev.filter((t) => t !== tag));
  };

  const triggerSearchIconAnimation = () => {
    setIsSearchIconAnimating(false);
    requestAnimationFrame(() => {
      setIsSearchIconAnimating(true);
      window.setTimeout(() => setIsSearchIconAnimating(false), 220);
    });
  };

  const maxTagsReached = tagFilters.length >= 2;

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
    };

    const handleShortcuts = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (key === "n" && !formOpen) {
        event.preventDefault();
        handleNewFicha();
      }

      if (key === "f" && !formOpen) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [formOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-base font-semibold tracking-tight"><span className="bg-gradient-to-b from-[hsl(var(--logo-gradient-from))] to-[hsl(var(--logo-gradient-to))] bg-clip-text text-transparent">Ficha</span><span className="text-primary">fuente</span></span>
              </div>
              <span className="inline-flex items-center gap-1.5 ml-3 sm:ml-4 text-xs sm:text-sm font-normal text-muted-foreground/85 tabular-nums whitespace-nowrap">
                {currentMonthLabel}: {animatedMonthlyCount}
                {monthlyCardsStats.delta > 0 && <ArrowUp className="w-3.5 h-3.5 text-success" />}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleNewFicha} size="sm" className="gap-1.5 h-8 px-2.5 sm:px-4 text-xs font-semibold shadow-sm ring-1 ring-primary/30 hover:ring-primary/60 hover:shadow-md hover:brightness-110 transition-all duration-150 active:scale-95">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nueva ficha</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={signOut}
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Search and filters */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 group">
            <Search className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-muted-foreground transition-colors duration-100 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-focus-within:text-primary/80 ${isSearchIconAnimating ? "search-icon-pop" : ""}`} />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  searchInputRef.current?.blur();
                }
              }}
              onFocus={triggerSearchIconAnimation}
              onClick={triggerSearchIconAnimation}
              placeholder="Buscar fichas, contenido..."
              className="pl-9 pr-9 h-9 text-sm bg-card focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/60 focus-visible:shadow-sm transition-[border-color,box-shadow,background-color] duration-100 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tag filters */}
        {(allTags.length > 0 || tagFilters.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {tagFilters.map((selectedTag, selectedIndex) => (
              <button
                key={selectedTag}
                onClick={() => removeTagFilter(selectedTag)}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary text-primary-foreground animate-tag-in transition-all duration-100 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-110 hover:-translate-y-px hover:shadow-md hover:ring-1 hover:ring-primary/40 active:translate-y-0 active:scale-[0.96]"
                style={{ animationDelay: `${selectedIndex * 24}ms`, animationFillMode: "both" }}
              >
                {selectedTag}
                <X className="w-3 h-3" />
              </button>
            ))}
            {allTags
              .filter((t) => !tagFilters.includes(t))
              .map((tag, index) => (
                <button
                  key={tag}
                  onClick={() => addTagFilter(tag)}
                  disabled={maxTagsReached}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-badge text-badge-foreground animate-tag-in hover:bg-badge/80 hover:-translate-y-px hover:shadow-md hover:ring-1 hover:ring-primary/35 active:translate-y-0 active:scale-[0.96] transition-all duration-100 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{ animationDelay: `${Math.min(index * 32, 224)}ms`, animationFillMode: "both" }}
                >
                  {tag}
                </button>
              ))}
            {maxTagsReached && (
              <span className="text-[11px] text-muted-foreground px-1.5 py-1">Máximo 2 tags</span>
            )}
          </div>
        )}
 {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <article
                key={index}
                className={`bg-card rounded-lg border border-border/60 p-5 min-h-[280px] flex flex-col ${
                  index >= 2 ? "hidden sm:flex" : ""
                } ${index >= 4 ? "hidden lg:flex" : ""}`}
              >
                <div className="mb-3 space-y-2">
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-7/12" />
                </div>
                <div className="mb-3 flex-1 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/6" />
                </div>
                <div className="mb-3">
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <div className="mb-3 flex gap-1.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <div className="pt-3 border-t border-border/40">
                  <Skeleton className="h-3 w-24" />
                </div>
              </article>
            ))}
          </div>
        ) : fichas && fichas.length > 0 ? (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${fichas.length < 3 ? "lg:grid-cols-2" : "lg:grid-cols-3"} gap-5`}
          >
            {fichas.map((ficha) => (
              <FichaCard key={ficha.id} ficha={ficha} onEdit={handleEdit} searchQuery={searchQuery} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || tagFilters.length > 0 ? "No se encontraron fichas" : "Aún no tienes fichas"}
            </p>
            {!searchQuery && tagFilters.length === 0 && (
              <Button onClick={handleNewFicha} variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Crear tu primera ficha
              </Button>
            )}
          </div>
        )}

      </div>

      <footer className="mt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          {!isLoading && (fichas?.length ?? 0) > 0 && (
            <div className="relative w-full mt-2">
              <AmbientKnowledgeGraph items={graphItems} className="w-full" centerAvoidRadius={0} />
              <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground/80 text-center">
                <span className="rounded-full bg-background/65 px-3 py-1 backdrop-blur-[1px] shadow-[0_2px_10px_hsl(var(--background)/0.95)]">
                  {(fichas?.length ?? 0)} fichas · {allTags.length} tags
                </span>
              </p>
            </div>
          )}
        </div>
      </footer>

      <FichaForm open={formOpen} onOpenChange={handleFormOpenChange} editingFicha={editingFicha} />
    </div>
  );
};

export default Index;