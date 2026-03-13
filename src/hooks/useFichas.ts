import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

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

export const useFichas = (searchQuery?: string, tagFilters: string[] = []) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fichas", user?.id, searchQuery, tagFilters],
    queryFn: async () => {
      let query = supabase
        .from("fichas")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,source_name.ilike.%${searchQuery}%,quote.ilike.%${searchQuery}%`);
      }

      if (tagFilters.length > 0) {
        query = query.contains("tags", tagFilters);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ficha[];
    },
    enabled: !!user,
  });
};

export const useCreateFicha = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ficha: Omit<FichaInsert, "user_id">) => {
      const { data, error } = await supabase
        .from("fichas")
        .insert({ ...ficha, user_id: user!.id })
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

      const { data, error } = await supabase
        .from("fichas")
        .update(updates)
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
