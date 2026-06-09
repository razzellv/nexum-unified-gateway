import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

function LayoutInner({ children }: MainLayoutProps) {
  const { collapsed, setCollapsed } = useSidebar();
  const isMobile = useIsMobile();
  const sidebarOpen = !collapsed;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on desktop */}
      <div className={
        isMobile
          ? `fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : ''
      }>
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}