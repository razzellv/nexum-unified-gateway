// Nexum Suum API Client - AWS Lambda Integration
import { apiRequest } from './api';

export interface APIResponse<T> {
  data: T | null;
  error: boolean;
  message?: string;
}

export interface DashboardMetrics {
  totalEnergyCost: number;
  avgEfficiency: number;
  openWorkOrders: number;
  complianceScore: number;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo: string;
  equipment: string;
  dueDate: string;
  createdAt: string;
  notes?: string;
}

export interface ExecutiveData {
  metrics: DashboardMetrics;
  workOrders: WorkOrder[];
  // Add other fields as needed
}

// ============ DASHBOARD ENDPOINTS ============

export async function getMasterExecutive() {
  return apiRequest<ExecutiveData>('/dashboard/manager');
}

export async function getMasterWorkOrders() {
  return apiRequest<WorkOrder[]>('/work-orders/list');
}

export async function getSupervisorDashboard() {
  return apiRequest<any>('/dashboard/supervisor');
}

export async function getExecutiveDashboard() {
  return apiRequest<any>('/dashboard/executive');
}

export async function getEnergyDashboard() {
  return apiRequest<any>('/dashboard/energy');
}
