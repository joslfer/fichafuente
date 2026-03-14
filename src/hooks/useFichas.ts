import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { ARCHIVED_TAG, normalizeTags } from "@/lib/utils";

export type Ficha = Tables<"fichas">;
export type FichaInsert = TablesInsert<"fichas">;
export type FichaUpdate = TablesUpdate<"fichas">;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object") {
    const message = "message" in error && typeof error.message === "string" ? error.message : "";
    const code = "code" in error && typeof error.code === "string" ? error.code : "";
    const details = "details" in error && typeof error.details === "string" ? error.details : "";
    const hint = "hint" in error && typeof error.hint === "string" ? error.hint : "";

    const parts = [message, code ? `(code: ${code})` : "", details, hint].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(" · ");
    }
  }
  return fallback;
};

const haveSameTags = (currentTags?: string[] | null, normalizedTags: string[] = []) => {
  if (!currentTags || currentTags.length === 0) {
    return normalizedTags.length === 0;
  }

  if (currentTags.length !== normalizedTags.length) {
    return false;
  }

  return currentTags.every((tag, index) => tag === normalizedTags[index]);
};

const syncArchivedState = <T extends { tags?: string[] | null; archived_at?: string | null; updated_at?: string }>(ficha: T) => {
  const normalizedTags = normalizeTags(ficha.tags);
  const isArchived = ficha.archived_at != null || normalizedTags.includes(ARCHIVED_TAG);
  const tags = isArchived
    ? [...normalizedTags.filter((tag) => tag !== ARCHIVED_TAG), ARCHIVED_TAG]
    : normalizedTags.filter((tag) => tag !== ARCHIVED_TAG);

  return {
    ...ficha,
    tags,
    archived_at: isArchived ? ficha.archived_at ?? ficha.updated_at ?? new Date().toISOString() : null,
  };
};

const isArchiveStateSynced = (currentFicha: Ficha, nextFicha: Ficha) => {
  return haveSameTags(currentFicha.tags, nextFicha.tags ?? []) && currentFicha.archived_at === nextFicha.archived_at;
};

export const useFichas = (searchQuery?: string, tagFilters: string[] = []) => {
  const { user } = useAuth();
  const normalizedTagFilters = normalizeTags(tagFilters);

  return useQuery({
    queryKey: ["fichas", user?.id, searchQuery, normalizedTagFilters],
    queryFn: async () => {
      let query = supabase
        .from("fichas")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,source_name.ilike.%${searchQuery}%,quote.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const fichas = (data as Ficha[]) ?? [];
      const normalizedFichas = fichas.map((ficha) => syncArchivedState(ficha));

      const fichasToNormalize = normalizedFichas.filter((ficha, index) => !isArchiveStateSynced(fichas[index], ficha));

      if (fichasToNormalize.length > 0 && user) {
        void Promise.allSettled(
          fichasToNormalize.map((ficha) =>
            supabase
              .from("fichas")
              .update({ tags: ficha.tags ?? [], archived_at: ficha.archived_at })
              .eq("id", ficha.id)
              .eq("user_id", user.id)
          )
        );
      }

      if (normalizedTagFilters.length === 0) {
        return normalizedFichas;
      }

      return normalizedFichas.filter((ficha) => {
        const fichaTags = new Set(ficha.tags ?? []);
        return normalizedTagFilters.every((tag) => fichaTags.has(tag));
      });
    },
    enabled: !!user,
  });
};

export const useCreateFicha = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ficha: Omit<FichaInsert, "user_id">) => {
      const payload = syncArchivedState(ficha);

      const { data, error } = await supabase
        .from("fichas")
        .insert({ ...payload, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fichas"] });
      toast.success("Ficha creada");
    },
    onError: (error) => {
      toast.error(`Error al crear: ${getErrorMessage(error, "desconocido")}`);
    },
  });
};

export const useUpdateFicha = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FichaUpdate & { id: string }) => {
      if (!user) {
        throw new Error("Sesión no válida");
      }

      const payload = syncArchivedState(updates);

      const { data, error } = await supabase
        .from("fichas")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fichas"] });
      toast.success("Ficha actualizada");
    },
    onError: (error) => {
      toast.error(`Error al actualizar: ${getErrorMessage(error, "desconocido")}`);
    },
  });
};

export const useDeleteFicha = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fichas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fichas"] });
      toast.success("Ficha eliminada");
    },
    onError: (error) => {
      toast.error(`Error al eliminar: ${getErrorMessage(error, "desconocido")}`);
    },
  });
};

export const useFichaStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ficha-stats", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("fichas")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;

      return { total: count ?? 0 };
    },
    enabled: !!user,
  });
};
