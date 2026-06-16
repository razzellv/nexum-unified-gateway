import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Building2, Users, Wrench, Package, Zap, FileCheck,
  ChevronRight, ChevronLeft, CheckCircle, Plus, Trash2,
  Upload, Flame, Loader2, X, Shield, DollarSign, ShoppingCart, LayoutDashboard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { DEPARTMENTS, getRolesForOrgType, ROLE_DISPLAY_NAMES } from '@/config/roles';
import { createObservation } from '@/lib/nexum-api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StaffMember { name: string; role: string; email: string; department: string; }
interface EquipmentItem { equipmentType: string; manufacturer: string; model: string; location: string; serialNumber: string; }
interface InventoryItem { itemName: string; partNumber: string; quantity: string; unit: string; location: string; }
interface BaselineData { [equipmentType: string]: { [field: string]: string } }
interface DepartmentBudget { department: string; annualBudget: string; monthlyBudget: string; }

// Legacy fallback; actual roles derived from orgType at render time
const ROLES = ['operator', 'technician', 'engineer', 'custodian', 'supervisor', 'manager', 'executive'];
const EQUIPMENT_TYPES = ['boiler', 'chiller', 'pump', 'ahu', 'cooling_tower', 'fan', 'compressor', 'vav', 'heat_exchanger'];
const FACILITY_TYPES = ['commercial_office', 'healthcare', 'education_university', 'education_k12', 'industrial', 'manufacturing', 'residential', 'hospitality', 'data_center', 'government', 'other'];

const FACILITY_TYPE_LABELS: Record<string, string> = {
  commercial_office:    'Commercial / Office',
  healthcare:           'Healthcare / Medical',
  education_university: 'University / Higher Education',
  education_k12:        'K-12 School / School District',
  industrial:           'Industrial / Warehouse',
  manufacturing:        'Manufacturing / Production',
  residential:          'Residential / Multi-family',
  hospitality:          'Hotel / Hospitality',
  data_center:          'Data Center',
  government:           'Government / Municipal',
  other:                'Other',
};
const DEFAULT_DEPARTMENTS = ['Maintenance', 'Energy', 'Procurement', 'Operations', 'Safety & Compliance'];
const FISCAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STEPS = [
  { id: 0, label: 'Org Type', icon: LayoutDashboard },
  { id: 1, label: 'Organization', icon: Building2 },
  { id: 2, label: 'Staff', icon: Users },
  { id: 3, label: 'Equipment', icon: Wrench },
  { id: 4, label: 'Baselines', icon: Shield },
  { id: 5, label: 'Inventory', icon: Package },
  { id: 6, label: 'Budget', icon: DollarSign },
  { id: 7, label: 'Utilities', icon: Zap },
  { id: 8, label: 'Audit Report', icon: FileCheck },
];

const RETAIL_STEPS = [
  { id: 0, label: 'Org Type', icon: LayoutDashboard },
  { id: 1, label: 'Store Info', icon: Building2 },
  { id: 2, label: 'Staff', icon: Users },
  { id: 3, label: 'Categories', icon: ShoppingCart },
  { id: 4, label: 'Suppliers', icon: Package },
  { id: 5, label: 'Temp Zones', icon: Zap },
  { id: 6, label: 'Budget', icon: DollarSign },
];

const GOVT_STEPS = [
  { id: 0, label: 'Org Type', icon: LayoutDashboard },
  { id: 1, label: 'Agency Info', icon: Building2 },
  { id: 2, label: 'Personnel', icon: Users },
  { id: 3, label: 'Fleet', icon: Wrench },
  { id: 4, label: 'Budget', icon: DollarSign },
];

const STORE_TYPES = ['convenience_store', 'grocery', 'pharmacy', 'restaurant', 'cafe', 'bakery', 'bar', 'food_truck', 'other'];
const AGENCY_TYPES = ['fire_department', 'police_department', 'ems', 'public_works', 'municipality', 'county', 'state_agency', 'federal_agency'];
const APPARATUS_TYPES = ['engine', 'ladder', 'rescue', 'ambulance', 'hazmat', 'tanker', 'patrol_car', 'utility_vehicle', 'pickup_truck', 'other'];

const ORG_TYPES = [
  {
    value: 'facility',
    label: 'Facility / Institutional',
    description: 'Commercial, industrial, healthcare, educational (universities, K-12), or institutional facilities — equipment, compliance, energy, and multi-building operations.',
    icon: Building2,
  },
  {
    value: 'retail',
    label: 'Retail / Food Service',
    description: 'Convenience stores, grocery, or food service operations requiring inventory, temperature logs, and health inspection tools.',
    icon: ShoppingCart,
  },
  {
    value: 'government',
    label: 'Government / Public Safety',
    description: 'Fire departments, police departments, EMS, and government agencies needing apparatus tracking, personnel certs, and response metrics.',
    icon: Shield,
  },
] as const;

type OrgTypeValue = 'facility' | 'retail' | 'government';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Payment gate ──────────────────────────────────────────────────────────
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isVerified = sessionStorage.getItem('nexum_onboarding_verified') === 'true';

  useEffect(() => {
    if (!isAdmin && !isVerified) {
      navigate('/pricing');
    }
  }, [isAdmin, isVerified, navigate]);

  if (!isAdmin && !isVerified) return null;
  // ── End gate ──────────────────────────────────────────────────────────────

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [orgType, setOrgType] = useState<OrgTypeValue | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Org
  const [org, setOrg] = useState({ name: '', facilityCount: '1', facilityType: '', address: '', city: '', state: '', zip: '' });

  // Step 2 — Staff
  const [staff, setStaff] = useState<StaffMember[]>([{ name: '', role: '', email: '', department: 'Operations' }]);

  // Step 3 — Equipment
  const [equipment, setEquipment] = useState<EquipmentItem[]>([{ equipmentType: '', manufacturer: '', model: '', location: '', serialNumber: '' }]);

  // Step 4 — Baselines
  const [baselines, setBaselines] = useState<BaselineData>({});

  // Step 5 — Inventory
  const [inventory, setInventory] = useState<InventoryItem[]>([{ itemName: '', partNumber: '', quantity: '', unit: 'each', location: '' }]);

  // Step 6 — Budget
  const [budget, setBudget] = useState({
    annualTotal: '',
    fiscalYearStart: 'January',
    trackActuals: 'yes',
    notes: '',
  });
  const [deptBudgets, setDeptBudgets] = useState<DepartmentBudget[]>(
    DEFAULT_DEPARTMENTS.map(d => ({ department: d, annualBudget: '', monthlyBudget: '' }))
  );

  // Step 7 — Utility Rates
  const [utilities, setUtilities] = useState({ electricRate: '0.18', gasRate: '1.52', waterRate: '15.07' });

  // Step 8 — Audit Report
  const [auditFile, setAuditFile] = useState<File | null>(null);
  const [auditMeta, setAuditMeta] = useState({ agency: '', inspectionDate: '', result: 'pass' });

  // Retail-specific state
  const [retailStore, setRetailStore] = useState({ storeName: '', storeType: '', address: '', city: '', state: '', zip: '' });
  const [retailCategories, setRetailCategories] = useState<string[]>(['']);
  const [retailSuppliers, setRetailSuppliers] = useState<{ name: string; contact: string; product: string }[]>([{ name: '', contact: '', product: '' }]);
  const [retailTempZones, setRetailTempZones] = useState<{ zone: string; minTemp: string; maxTemp: string }[]>([{ zone: '', minTemp: '', maxTemp: '' }]);
  const [retailBudget, setRetailBudget] = useState({ annualTotal: '', fiscalYearStart: 'January' });

  // Government-specific state
  const [govAgency, setGovAgency] = useState({ agencyName: '', agencyType: '', address: '', city: '', state: '', zip: '' });
  const [govPersonnel, setGovPersonnel] = useState<StaffMember[]>([{ name: '', role: '', email: '' }]);
  const [govApparatus, setGovApparatus] = useState<{ unitNumber: string; type: string; year: string; make: string; model: string }[]>([{ unitNumber: '', type: '', year: '', make: '', model: '' }]);
  const [govBudget, setGovBudget] = useState({ annualTotal: '', fiscalYearStart: 'January' });

  const currentSteps = orgType === 'retail' ? RETAIL_STEPS : orgType === 'government' ? GOVT_STEPS : STEPS;
  const progress = (step / (currentSteps.length - 1)) * 100;

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const addStaff = () => setStaff([...staff, { name: '', role: '', email: '', department: 'Operations' }]);
  const removeStaff = (i: number) => setStaff(staff.filter((_, idx) => idx !== i));
  const updateStaff = (i: number, field: keyof StaffMember, value: string) => {
    const updated = [...staff]; updated[i][field] = value; setStaff(updated);
  };

  const addEquipment = () => setEquipment([...equipment, { equipmentType: '', manufacturer: '', model: '', location: '', serialNumber: '' }]);
  const removeEquipment = (i: number) => setEquipment(equipment.filter((_, idx) => idx !== i));
  const updateEquipment = (i: number, field: keyof EquipmentItem, value: string) => {
    const updated = [...equipment]; updated[i][field] = value; setEquipment(updated);
  };

  const updateBaseline = (eqType: string, field: string, value: string) => {
    setBaselines(prev => ({ ...prev, [eqType]: { ...(prev[eqType] || {}), [field]: value } }));
  };

  const getBaselineFields = (type: string) => {
    switch (type) {
      case 'boiler': return [
        { key: 'mawp', label: 'MAWP (PSI)' }, { key: 'capacity', label: 'Capacity (MBH)' },
        { key: 'minTemp', label: 'Min Temp (°F)' }, { key: 'maxTemp', label: 'Max Temp (°F)' },
        { key: 'efficiency', label: 'Efficiency (%)' },
      ];
      case 'chiller': return [
        { key: 'tons', label: 'Capacity (Tons)' }, { key: 'kwPerTon', label: 'kW/Ton' },
        { key: 'minChilledTemp', label: 'Min Chilled Temp (°F)' }, { key: 'maxChilledTemp', label: 'Max Chilled Temp (°F)' },
        { key: 'refrigerant', label: 'Refrigerant Type' },
      ];
      case 'pump': return [
        { key: 'gpm', label: 'Flow Rate (GPM)' }, { key: 'head', label: 'Head (ft)' },
        { key: 'motorHp', label: 'Motor HP' }, { key: 'operatingPressure', label: 'Pressure (PSI)' },
      ];
      case 'ahu': return [
        { key: 'cfm', label: 'Airflow (CFM)' }, { key: 'staticPressure', label: 'Static Pressure (in. w.c.)' },
        { key: 'supplyTemp', label: 'Supply Temp (°F)' }, { key: 'returnTemp', label: 'Return Temp (°F)' },
      ];
      case 'cooling_tower': return [
        { key: 'gpm', label: 'Flow Rate (GPM)' }, { key: 'fanHp', label: 'Fan HP' },
        { key: 'approachTemp', label: 'Approach Temp (°F)' }, { key: 'rangeTemp', label: 'Range Temp (°F)' },
      ];
      default: return [
        { key: 'capacity', label: 'Capacity' }, { key: 'efficiency', label: 'Efficiency (%)' },
      ];
    }
  };

  const addInventory = () => setInventory([...inventory, { itemName: '', partNumber: '', quantity: '', unit: 'each', location: '' }]);
  const removeInventory = (i: number) => setInventory(inventory.filter((_, idx) => idx !== i));
  const updateInventory = (i: number, field: keyof InventoryItem, value: string) => {
    const updated = [...inventory]; updated[i][field] = value; setInventory(updated);
  };

  const updateDeptBudget = (i: number, field: keyof DepartmentBudget, value: string) => {
    const updated = [...deptBudgets];
    updated[i][field] = value;
    // Auto-calculate monthly from annual
    if (field === 'annualBudget' && value) {
      updated[i].monthlyBudget = (parseFloat(value) / 12).toFixed(2);
    }
    setDeptBudgets(updated);
  };

  const addDeptBudget = () => setDeptBudgets([...deptBudgets, { department: '', annualBudget: '', monthlyBudget: '' }]);
  const removeDeptBudget = (i: number) => setDeptBudgets(deptBudgets.filter((_, idx) => idx !== i));

  const totalDeptBudget = deptBudgets.reduce((sum, d) => sum + (parseFloat(d.annualBudget) || 0), 0);

  const next = () => {
    if (step === 0 && orgType) {
      localStorage.setItem('nexum_org_type', orgType);
      sessionStorage.setItem('nexum_org_type', orgType);
    }
    if (step < currentSteps.length - 1) setStep(step + 1);
  };
  const back = () => { if (step > 0) setStep(step - 1); };

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      await fetch(`${baseUrl}/onboarding/org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...org, facilityId: user?.facilityId, orgId: user?.orgId }),
      });

      for (const member of staff.filter(s => s.name && s.email)) {
        await fetch(`${baseUrl}/onboarding/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            ...member,
            facilityId: user?.facilityId,
            orgId: user?.orgId,
            orgType,
          }),
        });
      }

      for (const eq of equipment.filter(e => e.equipmentType && e.manufacturer)) {
        const baseline = baselines[eq.equipmentType] || {};
        await fetch(`${baseUrl}/equipment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...eq, baseline, facilityId: user?.facilityId }),
        });
      }

      for (const item of inventory.filter(i => i.itemName && i.quantity)) {
        await fetch(`${baseUrl}/inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...item, facilityId: user?.facilityId }),
        });
      }

      // Save budget
      await fetch(`${baseUrl}/onboarding/utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...utilities,
          facilityId: user?.facilityId,
          budget: {
            annualTotal: parseFloat(budget.annualTotal) || 0,
            fiscalYearStart: budget.fiscalYearStart,
            trackActuals: budget.trackActuals === 'yes',
            notes: budget.notes,
            departments: deptBudgets.filter(d => d.department && d.annualBudget),
          },
        }),
      });

      if (auditFile) {
        const formData = new FormData();
        formData.append('file', auditFile);
        formData.append('agency', auditMeta.agency);
        formData.append('inspectionDate', auditMeta.inspectionDate);
        formData.append('result', auditMeta.result);
        formData.append('facilityId', user?.facilityId || 'facility-001');
        await fetch(`${baseUrl}/audit-reports`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      // Persist org type choice
      if (orgType) localStorage.setItem('nexum_org_type', orgType);

      // Persist facility location for weather service
      const _weatherCity =
        orgType === 'retail'     ? retailStore.city :
        orgType === 'government' ? govAgency.city   :
        org.city;
      const _weatherState =
        orgType === 'retail'     ? retailStore.state :
        orgType === 'government' ? govAgency.state   :
        org.state;
      if (_weatherCity)  localStorage.setItem('nexum_facility_city',  _weatherCity.trim());
      if (_weatherState) localStorage.setItem('nexum_facility_state', _weatherState.trim());
      if (org.zip)       localStorage.setItem('nexum_facility_zip',   org.zip.trim());
      // Invalidate cached coords so the new location geocodes on next load
      localStorage.removeItem('nexum_weather_coords');
      localStorage.removeItem('nexum_weather_cache');

      // ── Observation Journal — capture onboarding as system of origin ──────────
      try {
        const equipList  = equipment.filter(e => e.equipmentType && e.manufacturer);
        const inventList = inventory.filter(i => i.itemName && i.quantity);
        const staffList  = staff.filter(s => s.name && s.email);

        const orgName =
          orgType === 'retail'      ? retailStore.storeName :
          orgType === 'government'  ? govAgency.agencyName  :
          org.name || 'this facility';

        const orgAddress =
          orgType === 'retail'     ? `${retailStore.address}, ${retailStore.city}, ${retailStore.state}` :
          orgType === 'government' ? `${govAgency.address}, ${govAgency.city}, ${govAgency.state}`       :
          org.address ? `${org.address}, ${org.city}, ${org.state} ${org.zip}` : '';

        const baselineLines: string[] = [
          `Initial setup completed for ${orgName}. Organization type: ${orgType}.`,
          orgAddress && `Location: ${orgAddress}.`,
          orgType === 'facility' && org.facilityType && `Facility type: ${org.facilityType}.`,
          equipList.length > 0
            ? `Equipment registered (${equipList.length} items):\n` +
              equipList.map(e =>
                `  • ${e.equipmentType} — ${e.manufacturer} ${e.model}` +
                `${e.location ? ` at ${e.location}` : ''}` +
                `${e.serialNumber ? ` (S/N: ${e.serialNumber})` : ''}`
              ).join('\n')
            : null,
          inventList.length > 0 ? `Inventory: ${inventList.length} item types registered.` : null,
          staffList.length > 0
            ? `Staff/personnel invited: ${staffList.map(s => `${s.name} (${s.role})`).join(', ')}.`
            : null,
          orgType === 'retail' && retailCategories.filter(Boolean).length > 0
            ? `Product categories: ${retailCategories.filter(Boolean).join(', ')}.`
            : null,
          orgType === 'government' && govApparatus.filter(a => a.unitNumber).length > 0
            ? `Fleet: ${govApparatus.filter(a => a.unitNumber).map(a => `${a.year} ${a.make} ${a.model} (Unit ${a.unitNumber})`).join(', ')}.`
            : null,
          budget.annualTotal ? `Annual budget baseline: $${parseFloat(budget.annualTotal).toLocaleString()}.` : null,
          utilities.electricRate ? `Utility rates — Electric: $${utilities.electricRate}/kWh, Gas: $${utilities.gasRate}/therm, Water: $${utilities.waterRate}/CCF.` : null,
        ].filter(Boolean) as string[];

        await createObservation({
          observationSource: 'Onboarding',
          systemType:        'Administrative',
          department:        'All Departments',
          building:          orgAddress,
          area:              orgType === 'facility' ? (org.city || '') : '',
          reporterName:      user?.name || user?.email || 'Facility Administrator',
          reporterRole:      user?.role || 'administrator',
          reporterOrganization: orgName,
          originalText:      baselineLines.join('\n'),
          originalSeverity:  null,
          originalRisk:      null,
          priority:          'normal',
          tags:              ['onboarding', 'baseline', 'facility-setup', orgType].filter(Boolean),
        } as any);

        // Equipment baseline observations (one per registered item)
        for (const eq of equipList) {
          const baseline = baselines[eq.equipmentType] || {};
          const readings = Object.entries(baseline)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          await createObservation({
            observationSource:    'PM Finding',
            systemType:           eq.equipmentType,
            department:           'Maintenance',
            area:                 eq.location || '',
            assetId:              eq.serialNumber || '',
            equipmentId:          `${eq.equipmentType}-${eq.manufacturer}-${eq.model}`.toLowerCase().replace(/\s+/g, '-'),
            locationId:           eq.location || '',
            reporterName:         user?.name || user?.email || 'Facility Administrator',
            reporterRole:         user?.role || 'administrator',
            reporterOrganization: orgName,
            originalText: [
              `Equipment baseline recorded at facility onboarding.`,
              `${eq.manufacturer} ${eq.model}${eq.serialNumber ? ` (S/N: ${eq.serialNumber})` : ''} installed at ${eq.location || 'unspecified location'}.`,
              readings ? `Baseline readings: ${readings}.` : null,
            ].filter(Boolean).join(' '),
            originalSeverity: null,
            originalRisk:     null,
            priority:         'normal',
            tags:             ['onboarding', 'equipment-baseline', eq.equipmentType],
          } as any);
        }

        // Audit finding observation
        if (auditFile) {
          await createObservation({
            observationSource:    'Audit Finding',
            systemType:           'Compliance',
            department:           'Safety & Compliance',
            reporterName:         auditMeta.agency || 'External Inspector',
            reporterRole:         'Inspector',
            reporterOrganization: auditMeta.agency || '',
            originalText: `Initial compliance audit uploaded at onboarding. Agency: ${auditMeta.agency || 'N/A'}. Inspection date: ${auditMeta.inspectionDate || 'N/A'}. Result: ${(auditMeta.result || 'pass').toUpperCase()}.`,
            originalSeverity: auditMeta.result === 'fail' ? 8 : auditMeta.result === 'conditional' ? 5 : 2,
            originalRisk:     auditMeta.result === 'fail' ? 8 : auditMeta.result === 'conditional' ? 4 : 1,
            priority:         auditMeta.result === 'fail' ? 'high' : 'normal',
            tags:             ['onboarding', 'audit', 'compliance', auditMeta.result || 'pass'],
          } as any);
        }
      } catch {
        // Observation journal capture is non-blocking — onboarding success is unaffected
      }
      // ── End Observation Journal capture ───────────────────────────────────────

      // Clear onboarding session flag after successful completion
      sessionStorage.removeItem('nexum_onboarding_verified');
      sessionStorage.removeItem('nexum_onboarding_session');

      toast({ title: 'Setup complete!', description: 'Your facility is ready. Welcome to Nexum Suum.' });
      navigate(getPostOnboardRoute(orgType, user?.role || ''));
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({ title: 'Setup saved', description: 'Some steps may need completion. You can update settings anytime.', variant: 'destructive' });
      navigate(getPostOnboardRoute(orgType, user?.role || ''));
    } finally {
      setSubmitting(false);
    }
  };

  function getPostOnboardRoute(org: string, role: string): string {
    if (org === 'retail')      return '/retail-dashboard';
    if (org === 'government')  return '/government-dashboard';
    if (org === 'property' || org === 'entrepreneur') return '/property-dashboard';
    const r = role.toLowerCase();
    if (r === 'executive' || r === 'director') return '/dashboard/executive';
    if (r === 'manager')    return '/dashboard/manager';
    if (r === 'supervisor') return '/dashboard/supervisor';
    return '/platform-guide';
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg text-primary">Nexum Suum</span>
          <Badge variant="outline" className="text-xs">Facility Setup</Badge>
        </div>
        {step > 0 && <p className="text-sm text-muted-foreground">Step {step} of {currentSteps.length - 1}</p>}
      </div>

      {/* Progress */}
      {step > 0 && <div className="px-6 pt-4">
        <Progress value={progress} className="h-1.5" />
        <div className="flex justify-between mt-3">
          {currentSteps.map((s) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <button
                key={s.id}
                onClick={() => done && setStep(s.id)}
                className={`flex flex-col items-center gap-1 transition-opacity ${done ? 'cursor-pointer' : 'cursor-default'} ${active || done ? 'opacity-100' : 'opacity-30'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${active ? 'bg-primary border-primary text-primary-foreground' : done ? 'bg-primary/20 border-primary text-primary' : 'border-muted bg-muted/30 text-muted-foreground'}`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] hidden sm:block ${active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>}

      {/* Content */}
      <div className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">

        {/* ── Step 0: Org Type ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">What type of organization are you?</h2>
              <p className="text-muted-foreground mt-1">This helps us configure the right dashboard and tools for your team.</p>
            </div>
            <div className="grid gap-4">
              {ORG_TYPES.map(opt => {
                const Icon = opt.icon;
                const selected = orgType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setOrgType(opt.value as OrgTypeValue)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all flex items-start gap-4 ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border/40 bg-muted/10 hover:border-border hover:bg-muted/20'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg shrink-0 ${selected ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`font-semibold ${selected ? 'text-primary' : ''}`}>{opt.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                    {selected && <CheckCircle className="w-5 h-5 text-primary ml-auto shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={next} disabled={!orgType}>
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 1: Organization (Facility) ── */}
        {step === 1 && orgType === 'facility' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Set up your organization</h2>
              <p className="text-muted-foreground mt-1">Tell us about your facility so we can configure your platform.</p>
            </div>
            <Card><CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Organization Name *</Label>
                  <Input value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} placeholder="e.g., Meridian Property Group" />
                </div>
                <div className="space-y-2">
                  <Label>Facility Type *</Label>
                  <Select value={org.facilityType} onValueChange={v => setOrg({ ...org, facilityType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map(t => <SelectItem key={t} value={t}>{FACILITY_TYPE_LABELS[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Facilities</Label>
                  <Input type="number" min="1" value={org.facilityCount} onChange={e => setOrg({ ...org, facilityCount: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Street Address</Label>
                  <Input value={org.address} onChange={e => setOrg({ ...org, address: e.target.value })} placeholder="123 Main St" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={org.city} onChange={e => setOrg({ ...org, city: e.target.value })} placeholder="Newark" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={org.state} onChange={e => setOrg({ ...org, state: e.target.value })} placeholder="NJ" maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input value={org.zip} onChange={e => setOrg({ ...org, zip: e.target.value })} placeholder="07102" />
                  </div>
                </div>
              </div>
            </CardContent></Card>
          </div>
        )}

        {/* ── Step 2: Staff (Facility) ── */}
        {step === 2 && orgType === 'facility' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Register your team</h2>
              <p className="text-muted-foreground mt-1">Each staff member will receive an email invite to create their account.</p>
            </div>
            <div className="space-y-3">
              {staff.map((member, i) => {
                const orgRoles = getRolesForOrgType(orgType as string);
                return (
                  <Card key={i}><CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Full Name</Label>
                        <Input value={member.name} onChange={e => updateStaff(i, 'name', e.target.value)} placeholder="Jane Smith" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Role</Label>
                        <Select value={member.role} onValueChange={v => updateStaff(i, 'role', v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {orgRoles.map(r => (
                              <SelectItem key={r} value={r}>
                                {ROLE_DISPLAY_NAMES[r] || r.charAt(0).toUpperCase() + r.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Department</Label>
                        <Select value={member.department} onValueChange={v => updateStaff(i, 'department', v)}>
                          <SelectTrigger><SelectValue placeholder="Dept" /></SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.filter(d => d !== 'All').map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Email</Label>
                          <Input value={member.email} onChange={e => updateStaff(i, 'email', e.target.value)} placeholder="jane@company.com" type="email" />
                        </div>
                        {staff.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeStaff(i)} className="mb-0.5 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent></Card>
                );
              })}
              <Button variant="outline" onClick={addStaff} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Staff Member
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">You can add more staff later from Settings.</p>
          </div>
        )}

        {/* ── Step 3: Equipment (Facility) ── */}
        {step === 3 && orgType === 'facility' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Current equipment</h2>
              <p className="text-muted-foreground mt-1">Add the major equipment in your facility. You can add more from Equipment Library later.</p>
            </div>
            <div className="space-y-3">
              {equipment.map((eq, i) => (
                <Card key={i}><CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Equipment {i + 1}</Badge>
                    {equipment.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeEquipment(i)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Equipment Type *</Label>
                      <Select value={eq.equipmentType} onValueChange={v => updateEquipment(i, 'equipmentType', v)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Manufacturer *</Label>
                      <Input value={eq.manufacturer} onChange={e => updateEquipment(i, 'manufacturer', e.target.value)} placeholder="e.g., Trane" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Model</Label>
                      <Input value={eq.model} onChange={e => updateEquipment(i, 'model', e.target.value)} placeholder="e.g., RTAC-150" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <Input value={eq.location} onChange={e => updateEquipment(i, 'location', e.target.value)} placeholder="e.g., Mech Room 1" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Serial Number</Label>
                      <Input value={eq.serialNumber} onChange={e => updateEquipment(i, 'serialNumber', e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={addEquipment} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Equipment
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Baselines (Facility) ── */}
        {step === 4 && orgType === 'facility' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Equipment baselines</h2>
              <p className="text-muted-foreground mt-1">Set operational parameters for your equipment. Used for anomaly detection and performance tracking.</p>
            </div>
            {equipment.filter(eq => eq.equipmentType && eq.manufacturer).length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No equipment added yet. Go back to Step 3 to add equipment first.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {equipment.filter(eq => eq.equipmentType && eq.manufacturer).map((eq, i) => (
                  <Card key={i}><CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge>{eq.equipmentType.replace(/_/g, ' ').toUpperCase()}</Badge>
                      <span className="text-sm text-muted-foreground">{eq.manufacturer} {eq.model}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {getBaselineFields(eq.equipmentType).map(field => (
                        <div key={field.key} className="space-y-1">
                          <Label className="text-xs">{field.label}</Label>
                          <Input
                            value={baselines[eq.equipmentType]?.[field.key] || ''}
                            onChange={e => updateBaseline(eq.equipmentType, field.key, e.target.value)}
                            placeholder="Enter value"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Inventory (Facility) ── */}
        {step === 5 && orgType === 'facility' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Current inventory</h2>
              <p className="text-muted-foreground mt-1">Log parts and supplies currently on hand.</p>
            </div>
            <div className="space-y-3">
              {inventory.map((item, i) => (
                <Card key={i}><CardContent className="p-4">
                  <div className="grid grid-cols-5 gap-2 items-end">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Item Name *</Label>
                      <Input value={item.itemName} onChange={e => updateInventory(i, 'itemName', e.target.value)} placeholder="e.g., Boiler Gasket" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Part #</Label>
                      <Input value={item.partNumber} onChange={e => updateInventory(i, 'partNumber', e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty *</Label>
                      <Input type="number" min="0" value={item.quantity} onChange={e => updateInventory(i, 'quantity', e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-1 flex items-end gap-1">
                      <div className="flex-1">
                        <Label className="text-xs">Unit</Label>
                        <Select value={item.unit} onValueChange={v => updateInventory(i, 'unit', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['each', 'box', 'case', 'gallon', 'lbs', 'ft', 'roll'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {inventory.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeInventory(i)} className="text-destructive hover:text-destructive shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="col-span-5 space-y-1">
                      <Label className="text-xs">Storage Location</Label>
                      <Input value={item.location} onChange={e => updateInventory(i, 'location', e.target.value)} placeholder="e.g., Parts Room Shelf B3" />
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={addInventory} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Inventory Item
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 6: Budget (Facility) ── */}
        {step === 6 && orgType === 'facility' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Budget configuration</h2>
              <p className="text-muted-foreground mt-1">Set your facility budget baselines. Used for budget vs actual tracking across dashboards.</p>
            </div>

            {/* Overall budget */}
            <Card><CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Annual Facility Budget
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Total Annual Budget ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={budget.annualTotal}
                    onChange={e => setBudget({ ...budget, annualTotal: e.target.value })}
                    placeholder="e.g., 500000"
                  />
                  {budget.annualTotal && (
                    <p className="text-xs text-muted-foreground">
                      Monthly equivalent: ${(parseFloat(budget.annualTotal) / 12).toLocaleString('en-US', { maximumFractionDigits: 2 })} / mo
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Fiscal Year Start</Label>
                  <Select value={budget.fiscalYearStart} onValueChange={v => setBudget({ ...budget, fiscalYearStart: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FISCAL_MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Track Budget vs Actuals</Label>
                  <Select value={budget.trackActuals} onValueChange={v => setBudget({ ...budget, trackActuals: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes — enable tracking</SelectItem>
                      <SelectItem value="no">No — skip for now</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Budget Notes (optional)</Label>
                  <Textarea
                    value={budget.notes}
                    onChange={e => setBudget({ ...budget, notes: e.target.value })}
                    placeholder="e.g., Includes capital reserve for chiller replacement in Q3"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            </CardContent></Card>

            {/* Department budgets */}
            <Card><CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Department Budgets</h3>
                {totalDeptBudget > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Total allocated: ${totalDeptBudget.toLocaleString()}
                    {budget.annualTotal && parseFloat(budget.annualTotal) > 0 && (
                      <span className={`ml-1 ${totalDeptBudget > parseFloat(budget.annualTotal) ? 'text-destructive' : 'text-green-500'}`}>
                        ({Math.round((totalDeptBudget / parseFloat(budget.annualTotal)) * 100)}% of total)
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {deptBudgets.map((dept, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 items-end">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Department</Label>
                      <Input
                        value={dept.department}
                        onChange={e => updateDeptBudget(i, 'department', e.target.value)}
                        placeholder="e.g., Maintenance"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Annual ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={dept.annualBudget}
                        onChange={e => updateDeptBudget(i, 'annualBudget', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Monthly ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={dept.monthlyBudget}
                        onChange={e => updateDeptBudget(i, 'monthlyBudget', e.target.value)}
                        placeholder="Auto"
                      />
                    </div>
                    <div className="flex items-end pb-0.5">
                      {deptBudgets.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeDeptBudget(i)} className="text-destructive hover:text-destructive w-full">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={addDeptBudget} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Department
              </Button>
            </CardContent></Card>

            <p className="text-xs text-muted-foreground">Budget data feeds into the Executive and Manager dashboards for real-time budget vs actual comparisons.</p>
          </div>
        )}

        {/* ── Step 7: Utility Rates (Facility) ── */}
        {step === 7 && orgType === 'facility' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Utility rates</h2>
              <p className="text-muted-foreground mt-1">Enter your facility's current utility rates. Used for energy cost calculations across all dashboards.</p>
            </div>
            <Card><CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>Electric Rate ($/kWh)</Label>
                <Input type="number" step="0.001" value={utilities.electricRate} onChange={e => setUtilities({ ...utilities, electricRate: e.target.value })} />
                <p className="text-xs text-muted-foreground">NJ average: $0.18/kWh</p>
              </div>
              <div className="space-y-2">
                <Label>Natural Gas Rate ($/therm)</Label>
                <Input type="number" step="0.01" value={utilities.gasRate} onChange={e => setUtilities({ ...utilities, gasRate: e.target.value })} />
                <p className="text-xs text-muted-foreground">NJ average: $1.52/therm</p>
              </div>
              <div className="space-y-2">
                <Label>Water Rate ($/1,000 gallons)</Label>
                <Input type="number" step="0.01" value={utilities.waterRate} onChange={e => setUtilities({ ...utilities, waterRate: e.target.value })} />
                <p className="text-xs text-muted-foreground">NJ average: $15.07/1,000 gal</p>
              </div>
            </CardContent></Card>
            <p className="text-xs text-muted-foreground">You can update these anytime from Settings → Utility Configuration.</p>
          </div>
        )}

        {/* ── Step 8: Audit Report (Facility) ── */}
        {step === 8 && orgType === 'facility' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Upload audit report <span className="text-muted-foreground text-lg font-normal">(optional)</span></h2>
              <p className="text-muted-foreground mt-1">Upload your most recent inspection report. Our AI will generate a compliance baseline narrative seeded into your account.</p>
            </div>
            <Card><CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inspecting Agency</Label>
                  <Input value={auditMeta.agency} onChange={e => setAuditMeta({ ...auditMeta, agency: e.target.value })} placeholder="e.g., NJ DEP, OSHA, DOH" />
                </div>
                <div className="space-y-2">
                  <Label>Inspection Date</Label>
                  <Input type="date" value={auditMeta.inspectionDate} onChange={e => setAuditMeta({ ...auditMeta, inspectionDate: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Inspection Result</Label>
                  <Select value={auditMeta.result} onValueChange={v => setAuditMeta({ ...auditMeta, result: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="conditional">Conditional Pass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${auditFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/30'}`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setAuditFile(e.target.files?.[0] || null)} />
                {auditFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileCheck className="w-8 h-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{auditFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(auditFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setAuditFile(null); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB</p>
                  </div>
                )}
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">AI Compliance Intelligence</span> — Claude will analyze your inspection report and generate a 3-paragraph compliance narrative seeded into your Compliance Logger.
                </p>
              </div>
            </CardContent></Card>

            {/* Final confirmation */}
            <Card className="border-primary/30 bg-primary/5"><CardContent className="p-6">
              <h3 className="font-semibold mb-2">Ready to launch your facility</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Organization: {org.name || 'Not set'}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{staff.filter(s => s.email).length} staff member(s) to invite</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{equipment.filter(e => e.equipmentType).length} equipment item(s)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{inventory.filter(i => i.itemName).length} inventory item(s)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  Budget: {budget.annualTotal ? `$${parseFloat(budget.annualTotal).toLocaleString()}/yr` : 'Not set'}
                </li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Utility rates configured</li>
                {auditFile && <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Audit report: {auditFile.name}</li>}
              </ul>
            </CardContent></Card>
          </div>
        )}

        {/* ── RETAIL STEPS ── */}

        {/* Retail Step 1: Store Info */}
        {step === 1 && orgType === 'retail' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Set up your store</h2>
              <p className="text-muted-foreground mt-1">Tell us about your store so we can configure the right tools.</p>
            </div>
            <Card><CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Store Name *</Label>
                  <Input value={retailStore.storeName} onChange={e => setRetailStore({ ...retailStore, storeName: e.target.value })} placeholder="e.g., Main Street Deli" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Store Type *</Label>
                  <Select value={retailStore.storeType} onValueChange={v => setRetailStore({ ...retailStore, storeType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {STORE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Street Address</Label>
                  <Input value={retailStore.address} onChange={e => setRetailStore({ ...retailStore, address: e.target.value })} placeholder="123 Main St" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={retailStore.city} onChange={e => setRetailStore({ ...retailStore, city: e.target.value })} placeholder="Newark" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={retailStore.state} onChange={e => setRetailStore({ ...retailStore, state: e.target.value })} placeholder="NJ" maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input value={retailStore.zip} onChange={e => setRetailStore({ ...retailStore, zip: e.target.value })} placeholder="07102" />
                  </div>
                </div>
              </div>
            </CardContent></Card>
          </div>
        )}

        {/* Retail Step 2: Staff */}
        {step === 2 && orgType === 'retail' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Register your team</h2>
              <p className="text-muted-foreground mt-1">Each staff member will receive an email invite to create their account.</p>
            </div>
            <div className="space-y-3">
              {staff.map((member, i) => (
                <Card key={i}><CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Full Name</Label>
                      <Input value={member.name} onChange={e => updateStaff(i, 'name', e.target.value)} placeholder="Jane Smith" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Role</Label>
                      <Select value={member.role} onValueChange={v => updateStaff(i, 'role', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Email</Label>
                        <Input value={member.email} onChange={e => updateStaff(i, 'email', e.target.value)} placeholder="jane@store.com" type="email" />
                      </div>
                      {staff.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeStaff(i)} className="mb-0.5 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={addStaff} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Staff Member
              </Button>
            </div>
          </div>
        )}

        {/* Retail Step 3: Product Categories */}
        {step === 3 && orgType === 'retail' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Product categories</h2>
              <p className="text-muted-foreground mt-1">List the main product categories you carry. Used for inventory organization.</p>
            </div>
            <div className="space-y-3">
              {retailCategories.map((cat, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={cat} onChange={e => { const u = [...retailCategories]; u[i] = e.target.value; setRetailCategories(u); }} placeholder={`e.g., ${['Beverages', 'Dairy & Deli', 'Snacks', 'Produce', 'Frozen Foods'][i % 5]}`} />
                  {retailCategories.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setRetailCategories(retailCategories.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={() => setRetailCategories([...retailCategories, ''])} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Category
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">You can manage categories from Inventory Library later.</p>
          </div>
        )}

        {/* Retail Step 4: Suppliers */}
        {step === 4 && orgType === 'retail' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Suppliers</h2>
              <p className="text-muted-foreground mt-1">Add your key suppliers for reorder tracking and purchase orders.</p>
            </div>
            <div className="space-y-3">
              {retailSuppliers.map((sup, i) => (
                <Card key={i}><CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Supplier Name *</Label>
                      <Input value={sup.name} onChange={e => { const u = [...retailSuppliers]; u[i].name = e.target.value; setRetailSuppliers(u); }} placeholder="e.g., US Foods" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Contact / Phone</Label>
                      <Input value={sup.contact} onChange={e => { const u = [...retailSuppliers]; u[i].contact = e.target.value; setRetailSuppliers(u); }} placeholder="e.g., 800-555-0100" />
                    </div>
                    <div className="space-y-1 flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Primary Product</Label>
                        <Input value={sup.product} onChange={e => { const u = [...retailSuppliers]; u[i].product = e.target.value; setRetailSuppliers(u); }} placeholder="e.g., Dairy" />
                      </div>
                      {retailSuppliers.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setRetailSuppliers(retailSuppliers.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={() => setRetailSuppliers([...retailSuppliers, { name: '', contact: '', product: '' }])} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Supplier
              </Button>
            </div>
          </div>
        )}

        {/* Retail Step 5: Temperature Zones */}
        {step === 5 && orgType === 'retail' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Temperature zones</h2>
              <p className="text-muted-foreground mt-1">Define storage zones for temperature compliance logging and health inspection readiness.</p>
            </div>
            <div className="space-y-3">
              {retailTempZones.map((zone, i) => (
                <Card key={i}><CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Zone Name *</Label>
                      <Input value={zone.zone} onChange={e => { const u = [...retailTempZones]; u[i].zone = e.target.value; setRetailTempZones(u); }} placeholder={`e.g., ${['Walk-in Cooler', 'Freezer', 'Hot Hold', 'Prep Area'][i % 4]}`} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Min Temp (°F)</Label>
                      <Input type="number" value={zone.minTemp} onChange={e => { const u = [...retailTempZones]; u[i].minTemp = e.target.value; setRetailTempZones(u); }} placeholder="e.g., 33" />
                    </div>
                    <div className="space-y-1 flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Max Temp (°F)</Label>
                        <Input type="number" value={zone.maxTemp} onChange={e => { const u = [...retailTempZones]; u[i].maxTemp = e.target.value; setRetailTempZones(u); }} placeholder="e.g., 41" />
                      </div>
                      {retailTempZones.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setRetailTempZones(retailTempZones.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={() => setRetailTempZones([...retailTempZones, { zone: '', minTemp: '', maxTemp: '' }])} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Zone
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Temperature logs feed into health inspection reports and compliance alerts.</p>
          </div>
        )}

        {/* Retail Step 6: Budget */}
        {step === 6 && orgType === 'retail' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Budget configuration</h2>
              <p className="text-muted-foreground mt-1">Set your store's annual budget baseline for dashboard tracking.</p>
            </div>
            <Card><CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Total Annual Budget ($)</Label>
                <Input type="number" min="0" value={retailBudget.annualTotal} onChange={e => setRetailBudget({ ...retailBudget, annualTotal: e.target.value })} placeholder="e.g., 250000" />
                {retailBudget.annualTotal && (
                  <p className="text-xs text-muted-foreground">Monthly equivalent: ${(parseFloat(retailBudget.annualTotal) / 12).toLocaleString('en-US', { maximumFractionDigits: 2 })} / mo</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Fiscal Year Start</Label>
                <Select value={retailBudget.fiscalYearStart} onValueChange={v => setRetailBudget({ ...retailBudget, fiscalYearStart: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FISCAL_MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent></Card>

            {/* Launch summary */}
            <Card className="border-primary/30 bg-primary/5"><CardContent className="p-6">
              <h3 className="font-semibold mb-2">Ready to launch your store</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Store: {retailStore.storeName || 'Not set'}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{staff.filter(s => s.email).length} staff member(s) to invite</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{retailCategories.filter(Boolean).length} product category(ies)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{retailSuppliers.filter(s => s.name).length} supplier(s)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{retailTempZones.filter(z => z.zone).length} temperature zone(s)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Budget: {retailBudget.annualTotal ? `$${parseFloat(retailBudget.annualTotal).toLocaleString()}/yr` : 'Not set'}</li>
              </ul>
            </CardContent></Card>
          </div>
        )}

        {/* ── GOVERNMENT STEPS ── */}

        {/* Govt Step 1: Agency Info */}
        {step === 1 && orgType === 'government' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Agency information</h2>
              <p className="text-muted-foreground mt-1">Tell us about your agency so we can configure the right dashboard and compliance tools.</p>
            </div>
            <Card><CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Agency Name *</Label>
                  <Input value={govAgency.agencyName} onChange={e => setGovAgency({ ...govAgency, agencyName: e.target.value })} placeholder="e.g., Newark Fire Department" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Agency Type *</Label>
                  <Select value={govAgency.agencyType} onValueChange={v => setGovAgency({ ...govAgency, agencyType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {AGENCY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Street Address</Label>
                  <Input value={govAgency.address} onChange={e => setGovAgency({ ...govAgency, address: e.target.value })} placeholder="123 Fire Station Rd" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={govAgency.city} onChange={e => setGovAgency({ ...govAgency, city: e.target.value })} placeholder="Newark" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={govAgency.state} onChange={e => setGovAgency({ ...govAgency, state: e.target.value })} placeholder="NJ" maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input value={govAgency.zip} onChange={e => setGovAgency({ ...govAgency, zip: e.target.value })} placeholder="07102" />
                  </div>
                </div>
              </div>
            </CardContent></Card>
          </div>
        )}

        {/* Govt Step 2: Personnel */}
        {step === 2 && orgType === 'government' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Personnel</h2>
              <p className="text-muted-foreground mt-1">Register your staff. Each member will receive an email invite to create their account.</p>
            </div>
            <div className="space-y-3">
              {govPersonnel.map((member, i) => (
                <Card key={i}><CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Full Name</Label>
                      <Input value={member.name} onChange={e => { const u = [...govPersonnel]; u[i].name = e.target.value; setGovPersonnel(u); }} placeholder="John Smith" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rank / Role</Label>
                      <Select value={member.role} onValueChange={v => { const u = [...govPersonnel]; u[i].role = v; setGovPersonnel(u); }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Email</Label>
                        <Input value={member.email} onChange={e => { const u = [...govPersonnel]; u[i].email = e.target.value; setGovPersonnel(u); }} placeholder="john@agency.gov" type="email" />
                      </div>
                      {govPersonnel.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setGovPersonnel(govPersonnel.filter((_, idx) => idx !== i))} className="mb-0.5 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={() => setGovPersonnel([...govPersonnel, { name: '', role: '', email: '' }])} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Personnel
              </Button>
            </div>
          </div>
        )}

        {/* Govt Step 3: Apparatus / Fleet */}
        {step === 3 && orgType === 'government' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Apparatus & fleet</h2>
              <p className="text-muted-foreground mt-1">Log your vehicles and apparatus for maintenance tracking and response metrics.</p>
            </div>
            <div className="space-y-3">
              {govApparatus.map((unit, i) => (
                <Card key={i}><CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Unit {i + 1}</Badge>
                    {govApparatus.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setGovApparatus(govApparatus.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Number *</Label>
                      <Input value={unit.unitNumber} onChange={e => { const u = [...govApparatus]; u[i].unitNumber = e.target.value; setGovApparatus(u); }} placeholder="e.g., E-1, PD-42" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type *</Label>
                      <Select value={unit.type} onValueChange={v => { const u = [...govApparatus]; u[i].type = v; setGovApparatus(u); }}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {APPARATUS_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Year</Label>
                      <Input value={unit.year} onChange={e => { const u = [...govApparatus]; u[i].year = e.target.value; setGovApparatus(u); }} placeholder="e.g., 2019" maxLength={4} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Make</Label>
                      <Input value={unit.make} onChange={e => { const u = [...govApparatus]; u[i].make = e.target.value; setGovApparatus(u); }} placeholder="e.g., Pierce, Ford" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Model</Label>
                      <Input value={unit.model} onChange={e => { const u = [...govApparatus]; u[i].model = e.target.value; setGovApparatus(u); }} placeholder="e.g., Arrow XT, F-550" />
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={() => setGovApparatus([...govApparatus, { unitNumber: '', type: '', year: '', make: '', model: '' }])} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Apparatus
              </Button>
            </div>
          </div>
        )}

        {/* Govt Step 4: Budget */}
        {step === 4 && orgType === 'government' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Budget configuration</h2>
              <p className="text-muted-foreground mt-1">Set your agency's annual budget baseline for dashboard tracking.</p>
            </div>
            <Card><CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Total Annual Budget ($)</Label>
                <Input type="number" min="0" value={govBudget.annualTotal} onChange={e => setGovBudget({ ...govBudget, annualTotal: e.target.value })} placeholder="e.g., 2500000" />
                {govBudget.annualTotal && (
                  <p className="text-xs text-muted-foreground">Monthly equivalent: ${(parseFloat(govBudget.annualTotal) / 12).toLocaleString('en-US', { maximumFractionDigits: 2 })} / mo</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Fiscal Year Start</Label>
                <Select value={govBudget.fiscalYearStart} onValueChange={v => setGovBudget({ ...govBudget, fiscalYearStart: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FISCAL_MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent></Card>

            {/* Launch summary */}
            <Card className="border-primary/30 bg-primary/5"><CardContent className="p-6">
              <h3 className="font-semibold mb-2">Ready to launch your agency</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Agency: {govAgency.agencyName || 'Not set'}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{govPersonnel.filter(p => p.email).length} personnel to invite</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{govApparatus.filter(a => a.unitNumber).length} apparatus / fleet unit(s)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Budget: {govBudget.annualTotal ? `$${parseFloat(govBudget.annualTotal).toLocaleString()}/yr` : 'Not set'}</li>
              </ul>
            </CardContent></Card>
          </div>
        )}

        {/* ── Navigation ── */}
        {step > 0 && (
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={back} disabled={step === 0}>
              <ChevronLeft className="w-4 h-4 mr-2" />Back
            </Button>
            {step < currentSteps.length - 1 ? (
              <Button onClick={next}>
                Next<ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={submitting} className="min-w-32">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up...</>
                ) : orgType === 'retail' ? (
                  <>Launch Store<ChevronRight className="w-4 h-4 ml-2" /></>
                ) : orgType === 'government' ? (
                  <>Launch Agency<ChevronRight className="w-4 h-4 ml-2" /></>
                ) : (
                  <>Launch Facility<ChevronRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
