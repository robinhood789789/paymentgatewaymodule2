import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useShareholder = () => {
  const { user } = useAuth();

  const { data: shareholder, isLoading } = useQuery({
    queryKey: ["shareholder", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("shareholders")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isShareholder = !!shareholder && shareholder.status === "active";

  return {
    shareholder,
    isShareholder,
    isLoading,
  };
};
