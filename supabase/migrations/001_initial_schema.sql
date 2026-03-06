-- SLAB Ledger — Initial Schema
-- Run this in your Supabase project SQL Editor

-- 1. Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_name TEXT,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on-hold')),
  budget_hard_cost NUMERIC DEFAULT 0,
  budget_fees NUMERIC DEFAULT 0,
  draw_limit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Vendors (shared across all projects)
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  detail TEXT,
  type TEXT CHECK (type IN ('Subcontractor','Vendor','Consultant','Organization')),
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Contracts (per project, per vendor)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  date DATE,
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('Contract','Change Order','Credit')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Payments (per project)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  date DATE,
  amount NUMERIC NOT NULL,
  form TEXT,
  check_number TEXT,
  category TEXT CHECK (category IN (
    'contracted','materials_vendors','fixtures_fittings','soft_costs','field_labor'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Draws (loan draws per project)
CREATE TABLE draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  date DATE,
  draw_number INTEGER,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Budget Items
CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  section TEXT,
  name TEXT NOT NULL,
  labor_amount NUMERIC,
  material_amount NUMERIC,
  optional_amount NUMERIC,
  vendor_id UUID REFERENCES vendors(id),
  notes TEXT,
  status TEXT CHECK (status IN ('paid_complete','contracted','proposed','estimated')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. User Roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','bookkeeper','employee','client')),
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get client's project
CREATE OR REPLACE FUNCTION get_client_project_id()
RETURNS UUID AS $$
  SELECT project_id FROM user_roles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Projects: admin/bookkeeper/employee see all; client sees only their project
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (
    get_user_role() IN ('admin','bookkeeper','employee')
    OR (get_user_role() = 'client' AND id = get_client_project_id())
  );
CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (get_user_role() = 'admin');

-- Vendors: admin/bookkeeper/employee see all; clients see nothing
CREATE POLICY "vendors_select" ON vendors FOR SELECT
  USING (get_user_role() IN ('admin','bookkeeper','employee'));
CREATE POLICY "vendors_insert" ON vendors FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "vendors_update" ON vendors FOR UPDATE
  USING (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "vendors_delete" ON vendors FOR DELETE
  USING (get_user_role() = 'admin');

-- Contracts: same project scoping as projects
CREATE POLICY "contracts_select" ON contracts FOR SELECT
  USING (
    get_user_role() IN ('admin','bookkeeper','employee')
    OR (get_user_role() = 'client' AND project_id = get_client_project_id())
  );
CREATE POLICY "contracts_insert" ON contracts FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "contracts_update" ON contracts FOR UPDATE
  USING (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "contracts_delete" ON contracts FOR DELETE
  USING (get_user_role() IN ('admin','bookkeeper'));

-- Payments
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (
    get_user_role() IN ('admin','bookkeeper','employee')
    OR (get_user_role() = 'client' AND project_id = get_client_project_id())
  );
CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "payments_delete" ON payments FOR DELETE
  USING (get_user_role() IN ('admin','bookkeeper'));

-- Draws
CREATE POLICY "draws_select" ON draws FOR SELECT
  USING (
    get_user_role() IN ('admin','bookkeeper','employee')
    OR (get_user_role() = 'client' AND project_id = get_client_project_id())
  );
CREATE POLICY "draws_insert" ON draws FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "draws_update" ON draws FOR UPDATE
  USING (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "draws_delete" ON draws FOR DELETE
  USING (get_user_role() IN ('admin','bookkeeper'));

-- Budget items
CREATE POLICY "budget_items_select" ON budget_items FOR SELECT
  USING (
    get_user_role() IN ('admin','bookkeeper','employee')
    OR (get_user_role() = 'client' AND project_id = get_client_project_id())
  );
CREATE POLICY "budget_items_insert" ON budget_items FOR INSERT
  WITH CHECK (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "budget_items_update" ON budget_items FOR UPDATE
  USING (get_user_role() IN ('admin','bookkeeper'));
CREATE POLICY "budget_items_delete" ON budget_items FOR DELETE
  USING (get_user_role() IN ('admin','bookkeeper'));

-- User roles: users can read their own role
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "user_roles_insert" ON user_roles FOR INSERT
  WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "user_roles_update" ON user_roles FOR UPDATE
  USING (get_user_role() = 'admin');
CREATE POLICY "user_roles_delete" ON user_roles FOR DELETE
  USING (get_user_role() = 'admin');
