import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Vendor } from '@/integrations/supabase/types';

const db = supabase as any;

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await db.from('vendors').select('*').order('name');
      if (error) throw error;
      return data as Vendor[];
    },
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: Omit<Vendor, 'id' | 'created_at'>) => {
      const { data, error } = await db.from('vendors').insert(vendor).select().single();
      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vendor> & { id: string }) => {
      const { data, error } = await db.from('vendors').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('vendors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}
