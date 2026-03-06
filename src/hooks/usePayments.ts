import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Payment } from '@/integrations/supabase/types';

const db = supabase as any;

export function usePayments(projectId: string) {
  return useQuery({
    queryKey: ['payments', projectId],
    queryFn: async () => {
      const { data, error } = await db
        .from('payments')
        .select('*, vendors(name)')
        .eq('project_id', projectId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await db.from('payments').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'created_at'>) => {
      const { data, error } = await db.from('payments').insert(payment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ['payments', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Payment> & { id: string }) => {
      const { data, error } = await db.from('payments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
