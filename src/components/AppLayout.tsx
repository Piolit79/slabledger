import { AppSidebar } from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={cn(
        "transition-all duration-300",
        isMobile ? "pt-14" : "ml-[240px]"
      )}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
