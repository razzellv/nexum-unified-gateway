import { createContext, useContext, useState, ReactNode } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { ViewRole, ROLE_DEFINITIONS } from '@/lib/role-filters';

export interface SelectionContext {
  facility: string;
  building: string;
  systemType: string;
}

export interface DashboardContent {
  showKPIs: boolean;
  showTrends: boolean;
  showLogs: boolean;
  showAlerts: boolean;
  showCostAnalytics: boolean;
  showComplianceStatus: boolean;
  showRawData: boolean;
  showExecutiveSummary: boolean;
  showSystemDetails: boolean;
  maxTrendDays: number;
}

interface RoleDashboardContextType {
  selection: SelectionContext;
  setSelection: (selection: Partial<SelectionContext>) => void;
  content: DashboardContent;
  hasValidSelection: boolean;
  selectionMessage: string | null;
}

const RoleDashboardContext = createContext<RoleDashboardContextType | undefined>(undefined);

function getContentForRole(role: ViewRole, selection: SelectionContext): DashboardContent {
  const base: DashboardContent = {
    showKPIs: true,
    showTrends: false,
    showLogs: false,
    showAlerts: false,
    showCostAnalytics: false,
    showComplianceStatus: false,
    showRawData: false,
    showExecutiveSummary: false,
    showSystemDetails: false,
    maxTrendDays: 7,
  };

  switch (role) {
    case 'executive':
      return {
        ...base,
        showKPIs: true,
        showTrends: true,
        showCostAnalytics: true,
        showComplianceStatus: true,
        showExecutiveSummary: true,
        showLogs: false, // Never show raw logs to executives
        showRawData: false,
        showSystemDetails: false,
        maxTrendDays: 90,
      };
    case 'manager':
      return {
        ...base,
        showKPIs: true,
        showTrends: true,
        showCostAnalytics: selection.facility !== 'all', // Only when facility selected
        showComplianceStatus: true,
        showSystemDetails: true,
        showLogs: false, // Aggregated only, no raw logs
        showRawData: false,
        showExecutiveSummary: false,
        maxTrendDays: 30,
      };
    case 'supervisor':
      return {
        ...base,
        showKPIs: true,
        showTrends: true,
        showLogs: true,
        showAlerts: true,
        showSystemDetails: true,
        showCostAnalytics: false, // No cost analytics for supervisors
        showComplianceStatus: false,
        showExecutiveSummary: false, // No executive summaries
        showRawData: true,
        maxTrendDays: 30,
      };
    default:
      return base;
  }
}

function getSelectionMessage(role: ViewRole, selection: SelectionContext): string | null {
  // Check if we need a selection for the current role
  if (role === 'supervisor') {
    if (selection.building === 'all' && selection.systemType === 'all') {
      return 'Select a building or system to view operational details.';
    }
  }
  return null;
}

function hasValidSelectionForRole(role: ViewRole, selection: SelectionContext): boolean {
  // Executive can view multi-facility, always valid
  if (role === 'executive') return true;
  
  // Manager can view full facility, always valid
  if (role === 'manager') return true;
  
  // Supervisor needs at least building or system selected for detailed view
  if (role === 'supervisor') {
    return selection.building !== 'all' || selection.systemType !== 'all';
  }
  
  return false;
}

export function RoleDashboardProvider({ children }: { children: ReactNode }) {
  const { currentRole } = useRole();
  const [selection, setSelectionState] = useState<SelectionContext>({
    facility: 'all',
    building: 'all',
    systemType: 'all',
  });

  const setSelection = (partial: Partial<SelectionContext>) => {
    setSelectionState(prev => ({ ...prev, ...partial }));
  };

  const content = getContentForRole(currentRole, selection);
  const hasValidSelection = hasValidSelectionForRole(currentRole, selection);
  const selectionMessage = getSelectionMessage(currentRole, selection);

  return (
    <RoleDashboardContext.Provider value={{ 
      selection, 
      setSelection, 
      content,
      hasValidSelection,
      selectionMessage,
    }}>
      {children}
    </RoleDashboardContext.Provider>
  );
}

export function useRoleDashboard() {
  const context = useContext(RoleDashboardContext);
  if (context === undefined) {
    throw new Error('useRoleDashboard must be used within a RoleDashboardProvider');
  }
  return context;
}
