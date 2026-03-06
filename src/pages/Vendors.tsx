import { useState } from 'react';
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/useVendors';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Vendor } from '@/integrations/supabase/types';

const VENDOR_TYPES = ['Subcontractor', 'Vendor', 'Consultant', 'Organization'];
const TYPE_COLORS: Record<string, string> = {
  Subcontractor: 'bg-blue-100 text-blue-800',
  Vendor: 'bg-purple-100 text-purple-800',
  Consultant: 'bg-green-100 text-green-800',
  Organization: 'bg-orange-100 text-orange-800',
};

function VendorForm({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Name *</Label>
        <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={value.type ?? ''} onValueChange={(v) => onChange({ ...value, type: v })}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {VENDOR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Detail / Trade</Label>
        <Input value={value.detail ?? ''} onChange={(e) => onChange({ ...value, detail: e.target.value })} placeholder="e.g., General Contractor, Electrical, Plumbing" />
      </div>
      <div>
        <Label>Contact Name</Label>
        <Input value={value.contact_name ?? ''} onChange={(e) => onChange({ ...value, contact_name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Email</Label>
          <Input type="email" value={value.email ?? ''} onChange={(e) => onChange({ ...value, email: e.target.value })} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={value.phone ?? ''} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

export default function Vendors() {
  const { data: vendors = [], isLoading } = useVendors();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();
  const { role } = useAuth();
  const { toast } = useToast();
  const canEdit = role === 'admin' || role === 'bookkeeper';

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [addForm, setAddForm] = useState({ name: '', type: '', detail: '', contact_name: '', email: '', phone: '' });

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.detail ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    await createVendor.mutateAsync({
      name: addForm.name,
      type: addForm.type as any || null,
      detail: addForm.detail || null,
      contact_name: addForm.contact_name || null,
      email: addForm.email || null,
      phone: addForm.phone || null,
    });
    toast({ title: 'Vendor added' });
    setAddOpen(false);
    setAddForm({ name: '', type: '', detail: '', contact_name: '', email: '', phone: '' });
  };

  const handleUpdate = async () => {
    if (!editVendor) return;
    await updateVendor.mutateAsync(editVendor);
    toast({ title: 'Vendor updated' });
    setEditVendor(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    await deleteVendor.mutateAsync(id);
    toast({ title: 'Vendor deleted' });
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vendors & Subs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{vendors.length} vendors</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Vendor
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search vendors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        {filtered.map((vendor) => (
          <div key={vendor.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">{vendor.name}</p>
                {vendor.type && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[vendor.type] ?? 'bg-gray-100 text-gray-700'}`}>
                    {vendor.type}
                  </span>
                )}
              </div>
              {vendor.detail && <p className="text-xs text-muted-foreground">{vendor.detail}</p>}
              {vendor.contact_name && <p className="text-xs text-muted-foreground">{vendor.contact_name}{vendor.phone ? ` · ${vendor.phone}` : ''}{vendor.email ? ` · ${vendor.email}` : ''}</p>}
            </div>
            {canEdit && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditVendor({ ...vendor })} className="text-muted-foreground hover:text-foreground transition-colors p-1.5">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(vendor.id, vendor.name)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No vendors found.</p>}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <VendorForm value={addForm} onChange={setAddForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!addForm.name || createVendor.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editVendor} onOpenChange={() => setEditVendor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
          {editVendor && <VendorForm value={editVendor} onChange={setEditVendor} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVendor(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateVendor.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
