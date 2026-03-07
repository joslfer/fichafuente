import { useState, useMemo } from "react";
import { Plus, Search, LogOut, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useFichas, Ficha } from "@/hooks/useFichas";
import Dashboard from "@/components/Dashboard";
import FichaCard from "@/components/FichaCard";
import FichaForm from "@/components/FichaForm";

const Index = () => {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [editingFicha, setEditingFicha] = useState<Ficha | null>(null);

  const { data: fichas, isLoading } = useFichas(searchQuery, tagFilter);

  // Collect all unique tags
  const allTags = useMemo(() => {
    if (!fichas) return [];
    const tagSet = new Set<string>();
    fichas.forEach((f) => f.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [fichas]);

  const handleEdit = (ficha: Ficha) => {
    setEditingFicha(ficha);
    setFormOpen(true);
  };

  const handleNewFicha = () => {
    setEditingFicha(null);
    setFormOpen(true);
  };

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
              <div className="hidden sm:block">
                <Dashboard />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleNewFicha} size="sm" className="gap-1.5 h-8 text-xs font-medium">
                <Plus className="w-3.5 h-3.5" />
                Nueva ficha
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

      {/* Mobile dashboard */}
      <div className="sm:hidden px-4 py-3 border-b border-border/40">
        <Dashboard />
      </div>

      {/* Search and filters */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar fichas..."
              className="pl-9 h-9 text-sm bg-card"
            />
          </div>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {tagFilter && (
              <button
                onClick={() => setTagFilter(undefined)}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary text-primary-foreground transition-colors"
              >
                {tagFilter}
                <X className="w-3 h-3" />
              </button>
            )}
            {allTags
              .filter((t) => t !== tagFilter)
              .map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-badge text-badge-foreground hover:bg-badge/80 transition-colors"
                >
                  {tag}
                </button>
              ))}
          </div>
        )}
 {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : fichas && fichas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {fichas.map((ficha) => (
              <FichaCard key={ficha.id} ficha={ficha} onEdit={handleEdit} searchQuery={searchQuery} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || tagFilter ? "No se encontraron fichas" : "Aún no tienes fichas"}
            </p>
            {!searchQuery && !tagFilter && (
              <Button onClick={handleNewFicha} variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Crear tu primera ficha
              </Button>
            )}
          </div>
        )}
      </div>

      <FichaForm open={formOpen} onOpenChange={setFormOpen} editingFicha={editingFicha} />
    </div>
  );
};

export default Index;