export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          client_name: string | null;
          address: string | null;
          status: 'active' | 'completed' | 'on-hold';
          budget_hard_cost: number;
          budget_fees: number;
          draw_limit: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          detail: string | null;
          type: 'Subcontractor' | 'Vendor' | 'Consultant' | 'Organization' | null;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vendors']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['vendors']['Insert']>;
      };
      contracts: {
        Row: {
          id: string;
          project_id: string;
          vendor_id: string | null;
          date: string | null;
          amount: number;
          type: 'Contract' | 'Change Order' | 'Credit';
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contracts']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['contracts']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          project_id: string;
          vendor_id: string | null;
          date: string | null;
          amount: number;
          form: string | null;
          check_number: string | null;
          category: 'contracted' | 'materials_vendors' | 'fixtures_fittings' | 'soft_costs' | 'field_labor';
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      draws: {
        Row: {
          id: string;
          project_id: string;
          date: string | null;
          draw_number: number | null;
          amount: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['draws']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['draws']['Insert']>;
      };
      budget_items: {
        Row: {
          id: string;
          project_id: string;
          section: string | null;
          name: string;
          labor_amount: number | null;
          material_amount: number | null;
          optional_amount: number | null;
          vendor_id: string | null;
          notes: string | null;
          status: 'paid_complete' | 'contracted' | 'proposed' | 'estimated' | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budget_items']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['budget_items']['Insert']>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'bookkeeper' | 'employee' | 'client';
          project_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_roles']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>;
      };
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Project = Tables<'projects'>;
export type Vendor = Tables<'vendors'>;
export type Contract = Tables<'contracts'>;
export type Payment = Tables<'payments'>;
export type Draw = Tables<'draws'>;
export type BudgetItem = Tables<'budget_items'>;
export type UserRole = Tables<'user_roles'>;
export type UserRoleType = 'admin' | 'bookkeeper' | 'employee' | 'client';
