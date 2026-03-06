import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Contract } from '@/integrations/supabase/types';

const db = supabase as any;

export function useContracts(projectId: string) {
  return useQuery({
    queryKey: ['contracts', projectId],
    queryFn: async () => {
      const { data, error } = await db
        .from('contracts')
        .select('*, vendors(name)')
        .eq('project_id', projectId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useAllContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await db
        .from('contracts')
        .select('*, vendors(name)')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contract: Omit<Contract, 'id' | 'created_at'>) => {
      const { data, error } = await db.from('contracts').insert(contract).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ['contracts', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contract> & { id: string }) => {
      const { data, error } = await db.from('contracts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('contracts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
}
