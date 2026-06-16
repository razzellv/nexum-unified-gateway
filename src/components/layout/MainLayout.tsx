import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { WeatherBar } from '@/components/global/WeatherBar';
import { TrialBanner } from '@/components/global/TrialBanner';
import { MobileBottomNav } from './MobileBottomNav';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { useDevice } from '@/hooks/use-device';

interface MainLayoutProps {
  children: ReactNode;
}

function LayoutInner({ children }: MainLayoutProps) {
  const { collapsed, setCollapsed } = useSidebar();
  const device = useDevice();
  const isMobile = device === 'mobile';
  const sidebarOpen = !collapsed;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Overlay backdrop — mobile only */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar
          • Mobile  → fixed drawer, slides in/out off the left edge
          • Tablet  → in-flow, icon-only (w-16) by default, expands to w-64 on toggle
          • Desktop → in-flow, full width (w-64) by default, collapses to w-16 on toggle
      */}
      <div className={
        isMobile
          ? `fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'flex-shrink-0 sticky top-0 h-screen'
      }>
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <WeatherBar />
        <TrialBanner />
        <main className={`flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 ${isMobile ? 'pb-20' : ''}`}>
          {children}
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      {isMobile && <MobileBottomNav onNavigate={() => setCollapsed(true)} />}
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
