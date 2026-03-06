import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BudgetItem } from '@/integrations/supabase/types';

const db = supabase as any;

export function useBudgetItems(projectId: string) {
  return useQuery({
    queryKey: ['budget_items', projectId],
    queryFn: async () => {
      const { data, error } = await db
        .from('budget_items')
        .select('*, vendors(name)')
        .eq('project_id', projectId)
        .order('section')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateBudgetItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<BudgetItem, 'id' | 'created_at'>) => {
      const { data, error } = await db.from('budget_items').insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ['budget_items', vars.project_id] });
    },
  });
}

export function useUpdateBudgetItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetItem> & { id: string }) => {
      const { data, error } = await db.from('budget_items').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_items'] }),
  });
}

export function useDeleteBudgetItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('budget_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_items'] }),
  });
}
