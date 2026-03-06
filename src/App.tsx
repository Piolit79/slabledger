import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProjectDetail from '@/pages/ProjectDetail';
import Vendors from '@/pages/Vendors';
import Settings from '@/pages/Settings';
import ClientPortal from '@/pages/ClientPortal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/client/:projectId" element={<ClientPortal />} />

            <Route path="/" element={
              <ProtectedRoute allowedRoles={['admin', 'bookkeeper', 'employee']}>
                <AppLayout><Dashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'bookkeeper', 'employee']}>
                <AppLayout><ProjectDetail /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/vendors" element={
              <ProtectedRoute allowedRoles={['admin', 'bookkeeper', 'employee']}>
                <AppLayout><Vendors /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout><Settings /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/unauthorized" element={
              <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground">You don't have access to this page.</p>
              </div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
