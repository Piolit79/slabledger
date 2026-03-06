import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useContracts } from '@/hooks/useContracts';
import { usePayments } from '@/hooks/usePayments';
import { useDraws } from '@/hooks/useDraws';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import slabLogo from '@/assets/slab-builders-logo.svg';

export default function ClientPortal() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId!);
  const { data: contracts = [] } = useContracts(projectId!);
  const { data: payments = [] } = usePayments(projectId!);
  const { data: draws = [] } = useDraws(projectId!);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Project not found.</p>
      </div>
    );
  }

  // Client-facing: no vendor names exposed
  const contractOwed = contracts.reduce((sum, c) => {
    if (c.type === 'Contract' || c.type === 'Change Order') return sum + c.amount;
    if (c.type === 'Credit') return sum - c.amount;
    return sum;
  }, 0);
  const contractPaid = payments.filter((p) => p.category === 'contracted').reduce((sum, p) => sum + p.amount, 0);
  const otherCosts = payments.filter((p) => p.category !== 'contracted').reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = contractPaid + otherCosts;
  const drawTotal = draws.reduce((sum, d) => sum + d.amount, 0);
  const drawBalance = project.draw_limit - drawTotal;

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex flex-col items-center pt-4 pb-2">
          <img src={slabLogo} alt="SLAB Builders" className="h-8 mb-3" />
          <h1 className="text-xl font-semibold text-center">{project.name}</h1>
          {project.address && <p className="text-sm text-muted-foreground text-center">{project.address}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Contract Value', value: contractOwed },
            { label: 'Contract Paid', value: contractPaid },
            { label: 'Other Costs Paid', value: otherCosts },
            { label: 'Total Paid', value: totalPaid },
          ].map((m) => (
            <Card key={m.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-lg font-semibold mt-0.5">{formatCurrency(m.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Draw Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Loan Limit</span>
              <span className="font-medium">{formatCurrency(project.draw_limit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Requested</span>
              <span className="font-medium">{formatCurrency(drawTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
              <span>Remaining</span>
              <span className={drawBalance < 0 ? 'text-destructive' : ''}>{formatCurrency(drawBalance)}</span>
            </div>
          </CardContent>
        </Card>

        {draws.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Draws</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {draws.map((d) => (
                <div key={d.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span className="text-muted-foreground">Draw #{d.draw_number ?? '—'}{d.date ? ` · ${formatDate(d.date)}` : ''}</span>
                  <span className="font-medium">{formatCurrency(d.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">SLAB Builders · Read-only view</p>
      </div>
    </div>
  );
}
