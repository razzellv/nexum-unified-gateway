import { Violation, EmployeeAccountability } from '@/types/facility';

// Placeholder functions for backend integration
export async function submitViolationToBackend(violation: Violation): Promise<void> {
  // Will call edge function for:
  // - Performance scoring calculation
  // - Cost impact analysis
  console.log('Submitting violation to backend:', violation);
  // TODO: Implement actual API call
}

export async function fetchEmployeeAccountability(employeeId?: string): Promise<EmployeeAccountability[]> {
  // Will fetch rolling 30/60/90 day data from backend
  console.log('Fetching accountability for:', employeeId || 'all employees');
  // TODO: Implement actual API call
  return [];
}

export async function calculatePerformanceScore(employeeId: string): Promise<number> {
  // Calculate performance score based on violations
  console.log('Calculating performance score for:', employeeId);
  // TODO: Implement actual API call
  return 100;
}

export async function calculateCostImpact(violations: Violation[]): Promise<number> {
  // Calculate cost impact of violations
  console.log('Calculating cost impact for violations:', violations.length);
  // TODO: Implement actual API call
  return 0;
}

export function getSeverityColor(score: number): string {
  if (score <= 3) return 'text-success';
  if (score <= 6) return 'text-warning';
  if (score <= 9) return 'text-orange-500';
  return 'text-critical';
}

export function getSeverityBgColor(score: number): string {
  if (score <= 3) return 'bg-success/20';
  if (score <= 6) return 'bg-warning/20';
  if (score <= 9) return 'bg-orange-500/20';
  return 'bg-critical/20';
}

export function getStatusColor(status: 'good' | 'warning' | 'critical'): string {
  switch (status) {
    case 'good': return 'text-success';
    case 'warning': return 'text-warning';
    case 'critical': return 'text-critical';
  }
}

export function getStatusBgColor(status: 'good' | 'warning' | 'critical'): string {
  switch (status) {
    case 'good': return 'bg-success/20';
    case 'warning': return 'bg-warning/20';
    case 'critical': return 'bg-critical/20';
  }
}
