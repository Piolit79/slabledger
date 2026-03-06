import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { ExternalLink } from 'lucide-react';

export default function Settings() {
  const { role } = useAuth();
  const { toast } = useToast();
  const { data: projects = [] } = useProjects();
  const createProject = useCreateProject();

  const [newProject, setNewProject] = useState({ name: '', client_name: '', address: '', draw_limit: '' });
  const [projectLoading, setProjectLoading] = useState(false);

  if (role !== 'admin') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  const handleCreateProject = async () => {
    if (!newProject.name) return;
    setProjectLoading(true);
    await createProject.mutateAsync({
      name: newProject.name,
      client_name: newProject.client_name || null,
      address: newProject.address || null,
      status: 'active',
      budget_hard_cost: 0,
      budget_fees: 0,
      draw_limit: newProject.draw_limit ? parseFloat(newProject.draw_limit) : 0,
    });
    toast({ title: 'Project created', description: newProject.name });
    setNewProject({ name: '', client_name: '', address: '', draw_limit: '' });
    setProjectLoading(false);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Create New Project</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Project Name *</Label>
            <Input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} />
          </div>
          <div>
            <Label>Client Name</Label>
            <Input value={newProject.client_name} onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={newProject.address} onChange={(e) => setNewProject({ ...newProject, address: e.target.value })} />
          </div>
          <div>
            <Label>Draw Limit ($)</Label>
            <Input type="number" value={newProject.draw_limit} onChange={(e) => setNewProject({ ...newProject, draw_limit: e.target.value })} />
          </div>
          <Button onClick={handleCreateProject} disabled={!newProject.name || projectLoading}>
            Create Project
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">User Management</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            To add users, go to your Supabase dashboard → Authentication → Users → Invite user. After they sign up, add their role in the <code className="text-xs bg-muted px-1 rounded">user_roles</code> table.
          </p>
          <p className="text-sm text-muted-foreground">
            Roles: <strong>admin</strong> (full access), <strong>bookkeeper</strong> (enter payments + view all), <strong>employee</strong> (view only), <strong>client</strong> (read-only portal, no vendor names).
          </p>
          <p className="text-sm text-muted-foreground">
            Client portal URL: <code className="text-xs bg-muted px-1 rounded">/client/[project-id]</code>
          </p>
          <div>
            <p className="text-xs text-muted-foreground mt-2">Your projects:</p>
            {projects.map((p) => (
              <div key={p.id} className="text-xs text-muted-foreground py-0.5">
                <span className="font-medium">{p.name}</span>: <code className="bg-muted px-1 rounded">{p.id}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
