import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Draw } from '@/integrations/supabase/types';

const db = supabase as any;

export function useDraws(projectId: string) {
  return useQuery({
    queryKey: ['draws', projectId],
    queryFn: async () => {
      const { data, error } = await db
        .from('draws')
        .select('*')
        .eq('project_id', projectId)
        .order('draw_number', { ascending: true });
      if (error) throw error;
      return data as Draw[];
    },
    enabled: !!projectId,
  });
}

export function useAllDraws() {
  return useQuery({
    queryKey: ['draws'],
    queryFn: async () => {
      const { data, error } = await db.from('draws').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data as Draw[];
    },
  });
}

export function useCreateDraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draw: Omit<Draw, 'id' | 'created_at'>) => {
      const { data, error } = await db.from('draws').insert(draw).select().single();
      if (error) throw error;
      return data as Draw;
    },
    onSuccess: (_data: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ['draws', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['draws'] });
    },
  });
}

export function useUpdateDraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Draw> & { id: string }) => {
      const { data, error } = await db.from('draws').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Draw;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['draws'] }),
  });
}

export function useDeleteDraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('draws').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['draws'] }),
  });
}
