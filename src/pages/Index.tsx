import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Search, LogOut, X, FileText, ArrowUp, ArrowDown, ArrowRight, Archive, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useFichas, Ficha } from "@/hooks/useFichas";
import FichaCard from "@/components/FichaCard";
import FichaForm from "@/components/FichaForm";
import { Skeleton } from "@/components/ui/skeleton";
import AmbientKnowledgeGraph from "@/components/AmbientKnowledgeGraph";
import { ARCHIVED_TAG, isArchivedTag, normalizeTag } from "@/lib/utils";

const Index = () => {
  const showMonthlyNewCards = false;

  const { user, signOut } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchIconAnimating, setIsSearchIconAnimating] = useState(false);
  const [animatedMonthlyCount, setAnimatedMonthlyCount] = useState(0);
  const [animatedWeeklyStreak, setAnimatedWeeklyStreak] = useState(0);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [graphPerturbSignal, setGraphPerturbSignal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFicha, setEditingFicha] = useState<Ficha | null>(null);

  const { data: fichas, isLoading } = useFichas(searchQuery, tagFilters);
  // Stats are always computed from all fichas (no tag filter) so they don't change when filtering.
  const { data: allFichasForStats } = useFichas();
  const viewingArchived = tagFilters.some((tag) => normalizeTag(tag) === ARCHIVED_TAG);

  const activeFichas = useMemo(
    () => (fichas ?? []).filter((ficha) => !(ficha.tags ?? []).includes(ARCHIVED_TAG)),
    [fichas]
  );

  // Unfiltered active fichas — used for streak/monthly stats only.
  const allActiveFichas = useMemo(
    () => (allFichasForStats ?? []).filter((ficha) => !(ficha.tags ?? []).includes(ARCHIVED_TAG)),
    [allFichasForStats]
  );

  const archivedFichas = useMemo(
    () => (fichas ?? []).filter((ficha) => (ficha.tags ?? []).includes(ARCHIVED_TAG)),
    [fichas]
  );

  const visibleFichas = viewingArchived ? archivedFichas : activeFichas;

  // Collect all unique tags and prioritize the most used ones.
  const allTags = useMemo(() => {
    if (!fichas) return [];
    const tagCounts = new Map<string, number>();

    visibleFichas.forEach((f) => {
      // Count a tag at most once per ficha.
      const uniqueTagsInFicha = new Set(f.tags ?? []);
      uniqueTagsInFicha.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });
    });

    if (!searchQuery.trim() && !tagFilters.length && !tagCounts.has(ARCHIVED_TAG) && (allFichasForStats ?? []).length > 0) {
      tagCounts.set(ARCHIVED_TAG, 0);
    }

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .map(([tag]) => tag);
  }, [allFichasForStats, fichas, searchQuery, tagFilters, visibleFichas]);

  const monthlyCardsStats = useMemo(() => {
    const now = new Date();
    const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let currentMonth = 0;
    let previousMonth = 0;

    allActiveFichas.forEach((ficha) => {
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
  }, [allActiveFichas]);

  const currentMonthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date()).toLowerCase();
  }, []);

  const weeklyStreakStats = useMemo(() => {
    const getWeekStart = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      const day = (normalized.getDay() + 6) % 7;
      normalized.setDate(normalized.getDate() - day);
      return normalized;
    };

    const weekKeys = new Set<string>();
    allActiveFichas.forEach((ficha) => {
      const createdAt = new Date(ficha.created_at);
      if (Number.isNaN(createdAt.getTime())) return;
      weekKeys.add(getWeekStart(createdAt).toISOString());
    });

    const currentWeek = getWeekStart(new Date());
    const currentWeekKey = currentWeek.toISOString();

    let streak = 0;
    const cursor = new Date(currentWeek);
    while (weekKeys.has(cursor.toISOString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
    }

    return {
      current: streak,
      hasCurrentWeek: weekKeys.has(currentWeekKey),
    };
  }, [allActiveFichas]);

  const weeklyCreationStats = useMemo(() => {
    const getWeekStart = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      const day = (normalized.getDay() + 6) % 7;
      normalized.setDate(normalized.getDate() - day);
      return normalized;
    };

    const currentWeekStart = getWeekStart(new Date());
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    let currentWeek = 0;
    let previousWeek = 0;

    allActiveFichas.forEach((ficha) => {
      const createdAt = new Date(ficha.created_at);
      if (Number.isNaN(createdAt.getTime())) return;

      if (createdAt >= currentWeekStart && createdAt < nextWeekStart) {
        currentWeek += 1;
        return;
      }

      if (createdAt >= previousWeekStart && createdAt < currentWeekStart) {
        previousWeek += 1;
      }
    });

    const delta = currentWeek - previousWeek;
    const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

    return {
      currentWeek,
      previousWeek,
      trend,
    };
  }, [allActiveFichas]);

  const isWeeklyStreakZero = weeklyStreakStats.current === 0;

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

  useEffect(() => {
    if (isLoading) return;

    const target = weeklyStreakStats.current;
    const from = animatedWeeklyStreak;
    const duration = 680;
    const start = performance.now();
    let frameId = 0;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(progress);
      const next = Math.round(from + (target - from) * eased);
      setAnimatedWeeklyStreak(next);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [weeklyStreakStats.current, isLoading]);

  const graphItems = useMemo(
    () => activeFichas.map((ficha) => ({ tags: ficha.tags ?? [] })),
    [activeFichas]
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
    const normalizedTagKey = normalizeTag(tag);
    if (!normalizedTagKey) return;

    setTagFilters((prev) => {
      if (prev.some((prevTag) => normalizeTag(prevTag) === normalizedTagKey)) return prev;
      return [...prev, tag];
    });
  };

  const removeTagFilter = (tag: string) => {
    const normalizedTagKey = normalizeTag(tag);
    setTagFilters((prev) => prev.filter((t) => normalizeTag(t) !== normalizedTagKey));
  };

  const triggerSearchIconAnimation = () => {
    setIsSearchIconAnimating(false);
    requestAnimationFrame(() => {
      setIsSearchIconAnimating(true);
      window.setTimeout(() => setIsSearchIconAnimating(false), 220);
    });
  };

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
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 shrink-0">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-base font-semibold tracking-tight"><span className="bg-gradient-to-b from-[hsl(var(--logo-gradient-from))] to-[hsl(var(--logo-gradient-to))] bg-clip-text text-transparent">Ficha</span><span className="text-primary">fuente</span></span>
              </div>
              {showMonthlyNewCards ? (
                <span className="inline-flex items-center gap-1.5 ml-3 sm:ml-4 text-xs sm:text-sm font-normal text-muted-foreground/85 tabular-nums whitespace-nowrap">
                  {currentMonthLabel}: {animatedMonthlyCount}
                  {monthlyCardsStats.delta > 0 && <ArrowUp className="w-3.5 h-3.5 text-success" />}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 ml-3 sm:ml-4 text-xs sm:text-sm font-normal text-muted-foreground/90 tabular-nums whitespace-nowrap">
                  <Flame
                    className={`w-3.5 h-3.5 ${weeklyStreakStats.hasCurrentWeek ? "text-orange-500" : "text-muted-foreground/60"}`}
                    fill={weeklyStreakStats.hasCurrentWeek ? "#fdba74" : "none"}
                  />
                  <span className="sm:hidden inline-flex h-8 flex-col justify-center leading-[1.05]">
                    <span className="text-[11px]">
                      {isWeeklyStreakZero ? "Continúa esta semana!" : `racha semanal: ${animatedWeeklyStreak}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/85">
                      ({weeklyCreationStats.currentWeek} nuevas)
                      {weeklyCreationStats.trend === "up" && <ArrowUp className="w-3 h-3" />}
                    </span>
                  </span>
                  <span className="hidden sm:inline">
                    {isWeeklyStreakZero ? "Continúa esta semana!" : `racha semanal: ${animatedWeeklyStreak}`}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 ml-3 text-muted-foreground/85">
                    ({weeklyCreationStats.currentWeek} nuevas)
                    {weeklyCreationStats.trend === "up" && <ArrowUp className="w-3.5 h-3.5" />}
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleNewFicha} size="sm" className="gap-1.5 h-8 px-2.5 sm:px-4 text-xs font-semibold shadow-sm ring-1 ring-primary/30 hover:ring-primary/60 hover:shadow-md hover:brightness-110 transition-all duration-150 active:scale-95">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nueva ficha</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                className={`tag-hop inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full animate-tag-in transition-all duration-100 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:shadow-md hover:ring-1 active:translate-y-0 active:scale-[0.96] ${
                  isArchivedTag(selectedTag)
                    ? "bg-[hsl(var(--foreground)/0.12)] text-foreground/90 border border-[hsl(var(--foreground)/0.18)] hover:bg-[hsl(var(--foreground)/0.16)] hover:ring-[hsl(var(--foreground)/0.18)]"
                    : "bg-primary text-primary-foreground hover:brightness-110 hover:ring-primary/40"
                }`}
                style={{ animationDelay: `${selectedIndex * 24}ms`, animationFillMode: "backwards" }}
              >
                {isArchivedTag(selectedTag) && <Archive className="w-3 h-3" />}
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
                  className={`tag-hop text-[11px] font-medium px-2.5 py-1 rounded-full animate-tag-in hover:-translate-y-px hover:shadow-md hover:ring-1 active:translate-y-0 active:scale-[0.96] transition-all duration-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isArchivedTag(tag)
                        ? "bg-[hsl(var(--foreground)/0.12)] text-foreground/90 border border-[hsl(var(--foreground)/0.18)] hover:bg-[hsl(var(--foreground)/0.16)] hover:ring-[hsl(var(--foreground)/0.18)]"
                      : "bg-badge text-badge-foreground hover:bg-badge/80 hover:ring-primary/35"
                  }`}
                  style={{ animationDelay: `${Math.min(index * 32, 224)}ms`, animationFillMode: "backwards" }}
                >
                  {isArchivedTag(tag) && <Archive className="w-3 h-3 inline-block mr-1" />}
                  {tag}
                </button>
              ))}
          </div>
        )}
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
        ) : visibleFichas.length > 0 ? (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${visibleFichas.length < 3 ? "lg:grid-cols-2" : "lg:grid-cols-3"} gap-5`}
          >
            {visibleFichas.map((ficha) => (
              <FichaCard key={ficha.id} ficha={ficha} onEdit={handleEdit} searchQuery={searchQuery} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {viewingArchived
                ? "No se encontraron fichas archivadas"
                : searchQuery || tagFilters.length > 0
                  ? "No se encontraron fichas activas"
                  : "Aún no tienes fichas"}
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
          {!isLoading && !viewingArchived && activeFichas.length > 0 && (
            <div className="relative w-full mt-2">
              <AmbientKnowledgeGraph
                items={graphItems}
                className="w-full"
                centerAvoidRadius={0}
                perturbSignal={graphPerturbSignal}
              />
              <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground/80 text-center">
                <button
                  type="button"
                  onClick={() => setGraphPerturbSignal((prev) => prev + 1)}
                  className="pointer-events-auto rounded-full bg-background/65 px-3 py-1 backdrop-blur-[1px] shadow-[0_2px_10px_hsl(var(--background)/0.95)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  title="Mover el gráfico"
                  aria-label="Aplicar una pequeña perturbación al gráfico"
                >
                  {activeFichas.length} fichas · {allTags.length} tags
                </button>
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