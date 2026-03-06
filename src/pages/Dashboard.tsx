import { Link } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { useAllContracts } from '@/hooks/useContracts';
import { useAllPayments } from '@/hooks/usePayments';
import { useAllDraws } from '@/hooks/useDraws';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, DollarSign, Building2, CreditCard } from 'lucide-react';

function MetricCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: any }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: contracts = [] } = useAllContracts();
  const { data: payments = [] } = useAllPayments();
  const { data: draws = [] } = useAllDraws();

  // Global metrics across all projects
  const contractOwed = contracts.reduce((sum, c) => {
    if (c.type === 'Contract' || c.type === 'Change Order') return sum + c.amount;
    if (c.type === 'Credit') return sum - c.amount;
    return sum;
  }, 0);

  const contractPaid = payments
    .filter((p) => p.category === 'contracted')
    .reduce((sum, p) => sum + p.amount, 0);

  const otherHardCosts = payments
    .filter((p) => p.category === 'materials_vendors' || p.category === 'fixtures_fittings')
    .reduce((sum, p) => sum + p.amount, 0);

  const softCosts = payments
    .filter((p) => p.category === 'soft_costs')
    .reduce((sum, p) => sum + p.amount, 0);

  const fieldLabor = payments
    .filter((p) => p.category === 'field_labor')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = contractPaid + otherHardCosts + softCosts + fieldLabor;
  const totalDraws = draws.reduce((sum, d) => sum + d.amount, 0);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Global summary metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Contract Owed" value={formatCurrency(contractOwed)} icon={DollarSign} />
        <MetricCard
          label="Contract Balance"
          value={formatCurrency(contractOwed - contractPaid)}
          sub={`Paid: ${formatCurrency(contractPaid)}`}
          icon={TrendingUp}
        />
        <MetricCard label="Total Paid to Date" value={formatCurrency(totalPaid)} icon={CreditCard} />
        <MetricCard label="Total Draws" value={formatCurrency(totalDraws)} icon={Building2} />
      </div>

      {/* Project list */}
      <div>
        <h2 className="text-base font-semibold mb-3">Projects</h2>
        <div className="space-y-3">
          {projects.map((project) => {
            const projectContracts = contracts.filter((c) => c.project_id === project.id);
            const projectPayments = payments.filter((p) => p.project_id === project.id);
            const projectDraws = draws.filter((d) => d.project_id === project.id);

            const owed = projectContracts.reduce((sum, c) => {
              if (c.type === 'Contract' || c.type === 'Change Order') return sum + c.amount;
              if (c.type === 'Credit') return sum - c.amount;
              return sum;
            }, 0);
            const paid = projectPayments.filter((p) => p.category === 'contracted').reduce((sum, p) => sum + p.amount, 0);
            const balance = owed - paid;
            const drawTotal = projectDraws.reduce((sum, d) => sum + d.amount, 0);
            const drawBalance = project.draw_limit - drawTotal;

            return (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{project.name}</h3>
                          <ProjectStatusBadge status={project.status} />
                        </div>
                        {project.client_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{project.client_name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="text-xs text-muted-foreground">Balance</div>
                        <div className="font-semibold text-sm">{formatCurrency(balance)}</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-4 border-t pt-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Contracted</p>
                        <p className="text-sm font-medium">{formatCurrency(owed)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Paid</p>
                        <p className="text-sm font-medium">{formatCurrency(paid)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Draw Balance</p>
                        <p className={`text-sm font-medium ${drawBalance < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(drawBalance)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
