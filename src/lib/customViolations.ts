import type { ViolationTypeConfig, ComplianceCategory } from '@/types/facility';

export interface CustomViolationType {
  id: string;
  title: string;
  description: string;
  severity: number;       // 1–10
  agency: string;         // OSHA, FDA, NFPA, org name, etc.
  category: ComplianceCategory;
}

const STORAGE_KEY = 'nexum_custom_violations';

export function loadCustomViolations(): CustomViolationType[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveCustomViolations(types: CustomViolationType[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
}

export function addCustomViolation(cv: Omit<CustomViolationType, 'id'>): CustomViolationType {
  const all = loadCustomViolations();
  const newType: CustomViolationType = { ...cv, id: `cv_${Date.now()}` };
  saveCustomViolations([...all, newType]);
  return newType;
}

export function deleteCustomViolation(id: string): void {
  saveCustomViolations(loadCustomViolations().filter(cv => cv.id !== id));
}

/** Convert a CustomViolationType into a ViolationTypeConfig-compatible shape for dropdowns */
export function customToConfig(cv: CustomViolationType): ViolationTypeConfig {
  return {
    value: `custom_${cv.id}` as any,
    label: cv.title,
    defaultSeverity: cv.severity,
    defaultCategory: cv.category,
    weightFactor: 1,
    subcategory: `Custom — ${cv.agency || 'Organization'}`,
  };
}
