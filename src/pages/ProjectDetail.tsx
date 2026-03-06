import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useContracts, useCreateContract, useDeleteContract } from '@/hooks/useContracts';
import { usePayments, useCreatePayment, useDeletePayment } from '@/hooks/usePayments';
import { useDraws, useCreateDraw, useDeleteDraw } from '@/hooks/useDraws';
import { useBudgetItems, useCreateBudgetItem } from '@/hooks/useBudget';
import { useVendors } from '@/hooks/useVendors';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function OverviewTab({ project, contracts, payments, draws }: any) {
  const contractOwed = (contracts ?? []).reduce((sum: number, c: any) => {
    if (c.type === 'Contract' || c.type === 'Change Order') return sum + c.amount;
    if (c.type === 'Credit') return sum - c.amount;
    return sum;
  }, 0);
  const contractPaid = (payments ?? []).filter((p: any) => p.category === 'contracted').reduce((sum: number, p: any) => sum + p.amount, 0);
  const materialsPaid = (payments ?? []).filter((p: any) => p.category === 'materials_vendors' || p.category === 'fixtures_fittings').reduce((sum: number, p: any) => sum + p.amount, 0);
  const softCosts = (payments ?? []).filter((p: any) => p.category === 'soft_costs').reduce((sum: number, p: any) => sum + p.amount, 0);
  const fieldLabor = (payments ?? []).filter((p: any) => p.category === 'field_labor').reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalPaid = contractPaid + materialsPaid + softCosts + fieldLabor;
  const drawTotal = (draws ?? []).reduce((sum: number, d: any) => sum + d.amount, 0);
  const drawBalance = (project?.draw_limit ?? 0) - drawTotal;

  const metrics = [
    { label: 'Contract Owed', value: contractOwed },
    { label: 'Contract Paid', value: contractPaid },
    { label: 'Contract Balance', value: contractOwed - contractPaid },
    { label: 'Materials & Vendors', value: materialsPaid },
    { label: 'Soft Costs', value: softCosts },
    { label: 'Field Labor', value: fieldLabor },
    { label: 'Total Paid to Date', value: totalPaid },
    { label: 'Total Draws', value: drawTotal },
    { label: 'Draw Balance', value: drawBalance, red: drawBalance < 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className={`text-xl font-semibold mt-0.5 ${m.red ? 'text-destructive' : ''}`}>{formatCurrency(m.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ContractsTab({ projectId, contracts, vendors, canEdit }: any) {
  const { toast } = useToast();
  const createContract = useCreateContract();
  const deleteContract = useDeleteContract();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vendor_id: '', date: '', amount: '', type: 'Contract', notes: '' });

  const handleAdd = async () => {
    await createContract.mutateAsync({
      project_id: projectId,
      vendor_id: form.vendor_id || null,
      date: form.date || null,
      amount: parseFloat(form.amount) || 0,
      type: form.type as any,
      notes: form.notes || null,
    });
    toast({ title: 'Contract added' });
    setOpen(false);
    setForm({ vendor_id: '', date: '', amount: '', type: 'Contract', notes: '' });
  };

  const grouped = (contracts ?? []).reduce((acc: any, c: any) => {
    const v = c.vendors?.name ?? 'Unknown';
    if (!acc[v]) acc[v] = [];
    acc[v].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {canEdit && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Contract
        </Button>
      )}

      {Object.entries(grouped).map(([vendor, items]: any) => (
        <div key={vendor}>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">{vendor}</h3>
          <div className="space-y-1">
            {items.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant={c.type === 'Credit' ? 'destructive' : c.type === 'Change Order' ? 'secondary' : 'default'} className="text-xs">
                    {c.type}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(c.amount)}</p>
                    {c.date && <p className="text-xs text-muted-foreground">{formatDate(c.date)}</p>}
                    {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                  </div>
                </div>
                {canEdit && (
                  <button onClick={() => deleteContract.mutate(c.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {(!contracts || contracts.length === 0) && (
        <p className="text-sm text-muted-foreground">No contracts yet.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contract / Change Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Vendor</Label>
              <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {(vendors ?? []).map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Change Order">Change Order</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.amount || createContract.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const PAYMENT_CATEGORIES = [
  { value: 'contracted', label: 'Contracted' },
  { value: 'materials_vendors', label: 'Materials & Vendors' },
  { value: 'fixtures_fittings', label: 'Fixtures & Fittings' },
  { value: 'soft_costs', label: 'Soft Costs' },
  { value: 'field_labor', label: 'Field Labor' },
];

const PAYMENT_FORMS = ['Check', 'Wire', 'ACH', 'Credit', 'Refund'];

function PaymentsTab({ projectId, payments, vendors, canEdit }: any) {
  const { toast } = useToast();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('contracted');
  const [form, setForm] = useState({ vendor_id: '', date: '', amount: '', form: 'Check', check_number: '', category: 'contracted', notes: '' });

  const handleAdd = async () => {
    await createPayment.mutateAsync({
      project_id: projectId,
      vendor_id: form.vendor_id || null,
      date: form.date || null,
      amount: parseFloat(form.amount) || 0,
      form: form.form,
      check_number: form.check_number || null,
      category: form.category as any,
      notes: form.notes || null,
    });
    toast({ title: 'Payment added' });
    setOpen(false);
    setForm({ vendor_id: '', date: '', amount: '', form: 'Check', check_number: '', category: 'contracted', notes: '' });
  };

  const filtered = (payments ?? []).filter((p: any) => p.category === activeCategory);
  const categoryTotal = filtered.reduce((sum: number, p: any) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {PAYMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => { setForm({ ...form, category: activeCategory }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Payment
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} payment{filtered.length !== 1 ? 's' : ''}</p>
        <p className="text-sm font-semibold">{formatCurrency(categoryTotal)}</p>
      </div>

      <div className="space-y-1">
        {filtered.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              {p.vendors?.name && <p className="text-sm font-medium">{p.vendors.name}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
                {p.date && <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>}
                {p.form && <Badge variant="outline" className="text-xs">{p.form}{p.check_number ? ` #${p.check_number}` : ''}</Badge>}
              </div>
              {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
            </div>
            {canEdit && (
              <button onClick={() => deletePayment.mutate(p.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No payments in this category.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor (optional)</Label>
              <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(vendors ?? []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Form</Label>
                <Select value={form.form} onValueChange={(v) => setForm({ ...form, form: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Check #</Label>
                <Input value={form.check_number} onChange={(e) => setForm({ ...form, check_number: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.amount || createPayment.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DrawsTab({ projectId, draws, project, canEdit }: any) {
  const { toast } = useToast();
  const createDraw = useCreateDraw();
  const deleteDraw = useDeleteDraw();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: '', draw_number: '', amount: '', notes: '' });

  const handleAdd = async () => {
    await createDraw.mutateAsync({
      project_id: projectId,
      date: form.date || null,
      draw_number: form.draw_number ? parseInt(form.draw_number) : null,
      amount: parseFloat(form.amount) || 0,
      notes: form.notes || null,
    });
    toast({ title: 'Draw added' });
    setOpen(false);
    setForm({ date: '', draw_number: '', amount: '', notes: '' });
  };

  const total = (draws ?? []).reduce((sum: number, d: any) => sum + d.amount, 0);
  const balance = (project?.draw_limit ?? 0) - total;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Draw Limit</p>
          <p className="text-xl font-semibold">{formatCurrency(project?.draw_limit)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Requested</p>
          <p className="text-xl font-semibold">{formatCurrency(total)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className={`text-xl font-semibold ${balance < 0 ? 'text-destructive' : ''}`}>{formatCurrency(balance)}</p>
        </CardContent></Card>
      </div>

      {canEdit && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Draw
        </Button>
      )}

      <div className="space-y-1">
        {(draws ?? []).map((d: any) => (
          <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <p className="text-sm font-medium">Draw #{d.draw_number ?? '—'} — {formatCurrency(d.amount)}</p>
              {d.date && <p className="text-xs text-muted-foreground">{formatDate(d.date)}</p>}
              {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
            </div>
            {canEdit && (
              <button onClick={() => deleteDraw.mutate(d.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {(!draws || draws.length === 0) && <p className="text-sm text-muted-foreground">No draws yet.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Draw</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Draw #</Label>
              <Input type="number" value={form.draw_number} onChange={(e) => setForm({ ...form, draw_number: e.target.value })} />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.amount || createDraw.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetTab({ projectId, budgetItems, vendors, canEdit }: any) {
  const { toast } = useToast();
  const createItem = useCreateBudgetItem();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ section: '', name: '', labor_amount: '', material_amount: '', vendor_id: '', status: 'estimated', notes: '' });

  const handleAdd = async () => {
    await createItem.mutateAsync({
      project_id: projectId,
      section: form.section || null,
      name: form.name,
      labor_amount: form.labor_amount ? parseFloat(form.labor_amount) : null,
      material_amount: form.material_amount ? parseFloat(form.material_amount) : null,
      optional_amount: null,
      vendor_id: form.vendor_id || null,
      notes: form.notes || null,
      status: form.status as any,
    });
    toast({ title: 'Budget item added' });
    setOpen(false);
    setForm({ section: '', name: '', labor_amount: '', material_amount: '', vendor_id: '', status: 'estimated', notes: '' });
  };

  const grouped = (budgetItems ?? []).reduce((acc: any, item: any) => {
    const s = item.section ?? 'General';
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});

  const totalBudget = (budgetItems ?? []).reduce((sum: number, item: any) => sum + (item.labor_amount ?? 0) + (item.material_amount ?? 0), 0);

  const statusColors: Record<string, string> = {
    paid_complete: 'bg-green-100 text-green-800',
    contracted: 'bg-blue-100 text-blue-800',
    proposed: 'bg-yellow-100 text-yellow-800',
    estimated: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Total Budget: <span className="font-semibold text-foreground">{formatCurrency(totalBudget)}</span></p>
        {canEdit && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Item
          </Button>
        )}
      </div>

      {Object.entries(grouped).map(([section, items]: any) => {
        const sectionTotal = items.reduce((sum: number, i: any) => sum + (i.labor_amount ?? 0) + (i.material_amount ?? 0), 0);
        return (
          <div key={section}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{section}</h3>
              <span className="text-xs text-muted-foreground">{formatCurrency(sectionTotal)}</span>
            </div>
            <div className="space-y-1">
              {items.map((item: any) => {
                const total = (item.labor_amount ?? 0) + (item.material_amount ?? 0);
                return (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm">{item.name}</p>
                        {item.status && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[item.status] ?? ''}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      {item.vendors?.name && <p className="text-xs text-muted-foreground">{item.vendors.name}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(total)}</p>
                      {item.labor_amount && item.material_amount && (
                        <p className="text-[10px] text-muted-foreground">L: {formatCurrency(item.labor_amount)} / M: {formatCurrency(item.material_amount)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {(!budgetItems || budgetItems.length === 0) && <p className="text-sm text-muted-foreground">No budget items yet.</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Budget Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Section</Label>
              <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="SITE, EXTERIOR, INTERIOR…" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Labor Amount</Label>
                <Input type="number" value={form.labor_amount} onChange={(e) => setForm({ ...form, labor_amount: e.target.value })} />
              </div>
              <div>
                <Label>Material Amount</Label>
                <Input type="number" value={form.material_amount} onChange={(e) => setForm({ ...form, material_amount: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Vendor</Label>
              <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(vendors ?? []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="estimated">Estimated</SelectItem>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="contracted">Contracted</SelectItem>
                  <SelectItem value="paid_complete">Paid/Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name || createItem.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: project, isLoading } = useProject(id!);
  const { data: contracts } = useContracts(id!);
  const { data: payments } = usePayments(id!);
  const { data: draws } = useDraws(id!);
  const { data: budgetItems } = useBudgetItems(id!);
  const { data: vendors } = useVendors();

  const canEdit = role === 'admin' || role === 'bookkeeper';

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return <div className="text-sm text-muted-foreground">Project not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.client_name && <p className="text-sm text-muted-foreground">{project.client_name}</p>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="draws">Draws</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab project={project} contracts={contracts} payments={payments} draws={draws} />
        </TabsContent>
        <TabsContent value="budget" className="mt-4">
          <BudgetTab projectId={id} budgetItems={budgetItems} vendors={vendors} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          <ContractsTab projectId={id} contracts={contracts} vendors={vendors} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab projectId={id} payments={payments} vendors={vendors} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="draws" className="mt-4">
          <DrawsTab projectId={id} draws={draws} project={project} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
