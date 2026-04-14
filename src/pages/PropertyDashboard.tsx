import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Building2, Car, Package, Plus, X, Upload, ChevronDown, ChevronRight,
  Wrench, AlertTriangle, CheckCircle, Clock, DollarSign, MapPin,
  Gauge, Flame, FolderOpen, FileText, TrendingUp, Users, Home,
  ShoppingCart, Edit2, Trash2, BarChart3, Shield,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type PropertyType = 'single_family' | 'multi_family' | 'apartment' | 'commercial' | 'mixed_use' | 'retail_site' | 'car_lot';
type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
type VehicleStatus  = 'active' | 'maintenance' | 'for_sale' | 'sold' | 'decommissioned';

interface PropertyUnit {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  tenantName?: string;
  tenantPhone?: string;
  occupied: boolean;
  monthlyRent?: number;
}

interface PropertyAsset {
  id: string;
  name: string;
  type: string;
  location: string;
  condition: AssetCondition;
  installDate?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  replacementCost?: number;
  notes?: string;
}

interface MaintenanceLog {
  id: string;
  date: string;
  type: 'repair' | 'inspection' | 'preventive' | 'emergency' | 'tenant_request';
  description: string;
  cost?: number;
  performedBy?: string;
  propertyId: string;
  assetId?: string;
  vehicleId?: string;
  status: 'open' | 'in_progress' | 'completed';
}

interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  units: PropertyUnit[];
  assets: PropertyAsset[];
  purchasePrice?: number;
  currentValue?: number;
  monthlyExpenses?: number;
  notes?: string;
  addedAt: string;
}

interface FleetVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  vin?: string;
  licensePlate?: string;
  color?: string;
  mileage: number;
  expectedLifeMiles: number;
  status: VehicleStatus;
  assignedTo?: string;      // property name or "Operations"
  insuranceExpiry?: string;
  registrationExpiry?: string;
  inspectionExpiry?: string;
  lastOilChange?: number;   // mileage at last oil change
  nextOilChange?: number;   // mileage due
  purchasePrice?: number;
  purchaseDate?: string;
  forSalePrice?: number;    // car lot listing price
  notes?: string;
}

type SpaceType = 'office' | 'storage' | 'apartment' | 'single_family' | 'commercial' | 'retail_space' | 'studio' | 'condo' | 'warehouse' | 'other';
type LeaseType = 'month_to_month' | '6_month' | 'annual' | '2_year' | 'custom';
type RentPeriod = 'weekly' | 'monthly' | 'quarterly';
type TenantStatus = 'active' | 'expiring_soon' | 'overdue' | 'past' | 'pending';

interface TenantIssue {
  id: string;
  date: string;
  description: string;
  photos: string[];
  resolvedAt?: string;
  vendorRef?: string;
}

interface Tenant {
  id: string;
  propertyId: string;
  unitRef?: string;
  name: string;
  email?: string;
  phone?: string;
  spaceType: SpaceType;
  leaseType: LeaseType;
  leaseStart: string;
  leaseEnd?: string;
  rent: number;
  deposit?: number;
  period: RentPeriod;
  status: TenantStatus;
  notes?: string;
  issues: TenantIssue[];
  addedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  single_family: 'Single Family', multi_family: 'Multi-Family', apartment: 'Apartment Building',
  commercial: 'Commercial', mixed_use: 'Mixed Use', retail_site: 'Retail Site', car_lot: 'Car Lot',
};

const CONDITION_META: Record<AssetCondition, { label: string; color: string; bg: string }> = {
  excellent: { label: 'Excellent', color: 'text-green-400',  bg: 'bg-green-500/10' },
  good:      { label: 'Good',      color: 'text-blue-400',   bg: 'bg-blue-500/10'  },
  fair:      { label: 'Fair',      color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  poor:      { label: 'Poor',      color: 'text-orange-400', bg: 'bg-orange-500/10' },
  failed:    { label: 'Failed',    color: 'text-red-400',    bg: 'bg-red-500/10'   },
};

const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; color: string }> = {
  active:          { label: 'Active',        color: 'text-green-400'  },
  maintenance:     { label: 'In Service',    color: 'text-yellow-400' },
  for_sale:        { label: 'For Sale',      color: 'text-blue-400'   },
  sold:            { label: 'Sold',          color: 'text-muted-foreground' },
  decommissioned:  { label: 'Decommissioned',color: 'text-red-400'   },
};

const ASSET_TYPES = [
  'HVAC Unit', 'Furnace', 'Water Heater', 'Electrical Panel', 'Roof', 'Washer', 'Dryer',
  'Refrigerator', 'Dishwasher', 'Oven / Range', 'Sump Pump', 'Generator', 'Elevator',
  'Pool Pump', 'Pool Heater', 'Garage Door Opener', 'Security System', 'Intercom',
  'Boiler', 'Cooling Tower', 'Fire Panel', 'Sprinkler System', 'Other',
];

const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  office: 'Office', storage: 'Storage', apartment: 'Apartment', single_family: 'Single Family',
  commercial: 'Commercial', retail_space: 'Retail Space', studio: 'Studio', condo: 'Condo',
  warehouse: 'Warehouse', other: 'Other',
};

const LEASE_TYPE_LABELS: Record<LeaseType, string> = {
  month_to_month: 'Month-to-Month', '6_month': '6 Month', annual: 'Annual', '2_year': '2 Year', custom: 'Custom',
};

const RENT_PERIOD_LABELS: Record<RentPeriod, string> = {
  weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly',
};

const TENANT_STATUS_META: Record<TenantStatus, { label: string; color: string; bg: string }> = {
  active:        { label: 'Active',        color: 'text-green-400',  bg: 'bg-green-500/10'  },
  expiring_soon: { label: 'Expiring Soon', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  overdue:       { label: 'Overdue',       color: 'text-red-400',    bg: 'bg-red-500/10'    },
  past:          { label: 'Past',          color: 'text-muted-foreground', bg: 'bg-muted/20' },
  pending:       { label: 'Pending',       color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
};

const STORAGE_KEYS = {
  properties:  'nexum_properties',
  fleet:       'nexum_fleet',
  maintenance: 'nexum_prop_maintenance',
  tenants:     'nexum_tenants',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; } catch { return fallback; }
}
function save(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

function vehicleHealthPct(v: FleetVehicle): number | null {
  if (!v.mileage || !v.expectedLifeMiles) return null;
  return Math.max(0, Math.round((1 - v.mileage / v.expectedLifeMiles) * 100));
}

function healthColor(pct: number) {
  if (pct >= 70) return 'bg-green-500';
  if (pct >= 40) return 'bg-yellow-500';
  if (pct >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

function isExpiringSoon(dateStr?: string, daysWarning = 30): boolean {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < daysWarning * 86400000;
}

function isExpired(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY FORM DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

const emptyProperty = (): Omit<Property, 'id' | 'units' | 'assets' | 'addedAt'> => ({
  name: '', address: '', type: 'single_family',
  purchasePrice: undefined, currentValue: undefined, monthlyExpenses: undefined, notes: '',
});

const emptyUnit = (): Omit<PropertyUnit, 'id'> => ({
  unitNumber: '', bedrooms: 1, bathrooms: 1, sqft: 0, occupied: false,
  tenantName: '', tenantPhone: '', monthlyRent: undefined,
});

const emptyVehicle = (): Omit<FleetVehicle, 'id'> => ({
  year: new Date().getFullYear(), make: '', model: '', vin: '', licensePlate: '',
  color: '', mileage: 0, expectedLifeMiles: 150000, status: 'active',
  assignedTo: '', insuranceExpiry: '', registrationExpiry: '', inspectionExpiry: '',
  lastOilChange: undefined, nextOilChange: undefined,
  purchasePrice: undefined, purchaseDate: '', forSalePrice: undefined, notes: '',
});

const emptyAsset = (): Omit<PropertyAsset, 'id'> => ({
  name: '', type: 'HVAC Unit', location: '', condition: 'good',
  installDate: '', warrantyExpiry: '', lastServiceDate: '', nextServiceDate: '',
  replacementCost: undefined, notes: '',
});

const emptyLog = (propertyId = ''): Omit<MaintenanceLog, 'id'> => ({
  date: new Date().toISOString().split('T')[0], type: 'repair', description: '',
  cost: undefined, performedBy: '', propertyId, status: 'open',
});

const emptyTenant = (propertyId = ''): Omit<Tenant, 'id' | 'addedAt' | 'issues'> => ({
  propertyId, unitRef: '', name: '', email: '', phone: '',
  spaceType: 'apartment', leaseType: 'annual',
  leaseStart: new Date().toISOString().split('T')[0], leaseEnd: '',
  rent: 0, deposit: undefined, period: 'monthly', status: 'active', notes: '',
});

const emptyIssue = (): Omit<TenantIssue, 'id'> => ({
  date: new Date().toISOString().split('T')[0], description: '', photos: [], vendorRef: '',
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PropertyDashboard() {
  const { toast } = useToast();

  // ── State ──
  const [properties,  setProperties]  = useState<Property[]>(() => load(STORAGE_KEYS.properties, []));
  const [fleet,       setFleet]        = useState<FleetVehicle[]>(() => load(STORAGE_KEYS.fleet, []));
  const [maintenance, setMaintenance]  = useState<MaintenanceLog[]>(() => load(STORAGE_KEYS.maintenance, []));

  const [activeTab, setActiveTab]      = useState<'overview' | 'properties' | 'fleet' | 'maintenance' | 'financials' | 'tenants'>('overview');
  const [expandedProp, setExpandedProp]= useState<string | null>(null);

  // Modals / forms
  const [tenants,      setTenants]      = useState<Tenant[]>(() => load(STORAGE_KEYS.tenants, []));
  const [tenantFilter, setTenantFilter] = useState<'all' | TenantStatus>('all');
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [tenantForm,   setTenantForm]   = useState(emptyTenant());
  const [showIssueModal, setShowIssueModal] = useState<string | null>(null); // tenantId
  const [issueForm,    setIssueForm]    = useState(emptyIssue());
  const issuePhotoRef = useRef<HTMLInputElement>(null);

  const [showAddProp,  setShowAddProp]  = useState(false);
  const [showAddUnit,  setShowAddUnit]  = useState<string | null>(null);   // propertyId
  const [showAddAsset, setShowAddAsset] = useState<string | null>(null);   // propertyId
  const [showAddFleet, setShowAddFleet] = useState(false);
  const [showAddLog,   setShowAddLog]   = useState<string | null>(null);   // propertyId

  const [propForm,  setPropForm]  = useState(emptyProperty());
  const [unitForm,  setUnitForm]  = useState(emptyUnit());
  const [assetForm, setAssetForm] = useState(emptyAsset());
  const [fleetForm, setFleetForm] = useState(emptyVehicle());
  const [logForm,   setLogForm]   = useState(emptyLog());

  const csvRef = useRef<HTMLInputElement>(null);

  // ── Derived KPIs ──
  const totalProperties  = properties.length;
  const totalUnits       = properties.reduce((s, p) => s + p.units.length, 0);
  const occupiedUnits    = properties.reduce((s, p) => s + p.units.filter(u => u.occupied).length, 0);
  const totalFleet       = fleet.length;
  const activeFleet      = fleet.filter(v => v.status === 'active').length;
  const forSaleFleet     = fleet.filter(v => v.status === 'for_sale').length;
  const monthlyRent      = properties.reduce((s, p) => s + p.units.reduce((us, u) => us + (u.monthlyRent || 0), 0), 0);
  const monthlyExpenses  = properties.reduce((s, p) => s + (p.monthlyExpenses || 0), 0);
  const monthlyNOI       = monthlyRent - monthlyExpenses;
  const openMaintenance  = maintenance.filter(m => m.status !== 'completed').length;
  const expiredDocs      = fleet.filter(v => isExpired(v.insuranceExpiry) || isExpired(v.registrationExpiry) || isExpired(v.inspectionExpiry)).length;
  const portfolioValue   = properties.reduce((s, p) => s + (p.currentValue || 0), 0);
  const lotInventoryValue= fleet.filter(v => v.status === 'for_sale').reduce((s, v) => s + (v.forSalePrice || 0), 0);

  // Tenant KPIs
  function computeTenantStatus(t: Tenant): TenantStatus {
    if (!t.leaseEnd) return t.status;
    const now = Date.now();
    const end = new Date(t.leaseEnd).getTime();
    if (end < now) return 'past';
    if (end - now < 30 * 86400000) return 'expiring_soon';
    return t.status === 'overdue' ? 'overdue' : 'active';
  }
  const tenantsWithStatus = tenants.map(t => ({ ...t, status: computeTenantStatus(t) }));
  const activeTenants  = tenantsWithStatus.filter(t => t.status === 'active').length;
  const expiringSoon   = tenantsWithStatus.filter(t => t.status === 'expiring_soon').length;
  const overdueTenants = tenantsWithStatus.filter(t => t.status === 'overdue').length;
  const rentRoll       = tenants.reduce((s, t) => s + (t.rent || 0), 0);

  // ── Persist helpers ──
  function saveProperties(next: Property[])     { setProperties(next);  save(STORAGE_KEYS.properties, next); }
  function saveFleet(next: FleetVehicle[])       { setFleet(next);       save(STORAGE_KEYS.fleet, next); }
  function saveMaintenance(next: MaintenanceLog[]){ setMaintenance(next); save(STORAGE_KEYS.maintenance, next); }
  function saveTenants(next: Tenant[])           { setTenants(next);     save(STORAGE_KEYS.tenants, next); }

  // ── Add handlers ──
  const handleAddProperty = () => {
    if (!propForm.name || !propForm.address) return;
    const next = [...properties, { ...propForm, id: Date.now().toString(), units: [], assets: [], addedAt: new Date().toISOString() }];
    saveProperties(next);
    setPropForm(emptyProperty());
    setShowAddProp(false);
    toast({ title: 'Property added', description: propForm.name });
  };

  const handleAddUnit = (propertyId: string) => {
    if (!unitForm.unitNumber) return;
    const next = properties.map(p => p.id === propertyId
      ? { ...p, units: [...p.units, { ...unitForm, id: Date.now().toString() }] } : p);
    saveProperties(next);
    setUnitForm(emptyUnit());
    setShowAddUnit(null);
    toast({ title: 'Unit added', description: `Unit ${unitForm.unitNumber}` });
  };

  const handleAddAsset = (propertyId: string) => {
    if (!assetForm.name) return;
    const next = properties.map(p => p.id === propertyId
      ? { ...p, assets: [...p.assets, { ...assetForm, id: Date.now().toString() }] } : p);
    saveProperties(next);
    setAssetForm(emptyAsset());
    setShowAddAsset(null);
    toast({ title: 'Asset added', description: assetForm.name });
  };

  const handleAddVehicle = () => {
    if (!fleetForm.make || !fleetForm.model) return;
    const next = [...fleet, { ...fleetForm, id: Date.now().toString() }];
    saveFleet(next);
    setFleetForm(emptyVehicle());
    setShowAddFleet(false);
    toast({ title: 'Vehicle added', description: `${fleetForm.year} ${fleetForm.make} ${fleetForm.model}` });
  };

  const handleAddLog = (propertyId: string) => {
    if (!logForm.description) return;
    const next = [...maintenance, { ...logForm, propertyId, id: Date.now().toString() }];
    saveMaintenance(next);
    setLogForm(emptyLog(propertyId));
    setShowAddLog(null);
    toast({ title: 'Log entry added' });
  };

  const handleDeleteProperty = (id: string) => {
    saveProperties(properties.filter(p => p.id !== id));
    toast({ title: 'Property removed' });
  };

  const handleDeleteVehicle = (id: string) => {
    saveFleet(fleet.filter(v => v.id !== id));
    toast({ title: 'Vehicle removed' });
  };

  const handleAddTenant = () => {
    if (!tenantForm.name || !tenantForm.rent) return;
    const t: Tenant = { ...tenantForm, id: Date.now().toString(), issues: [], addedAt: new Date().toISOString() };
    saveTenants([...tenants, t]);
    setTenantForm(emptyTenant());
    setShowAddTenant(false);
    toast({ title: 'Tenant added', description: tenantForm.name });
  };

  const handleDeleteTenant = (id: string) => {
    saveTenants(tenants.filter(t => t.id !== id));
    toast({ title: 'Tenant removed' });
  };

  const handleAddIssue = (tenantId: string) => {
    if (!issueForm.description) return;
    const issue: TenantIssue = { ...issueForm, id: Date.now().toString() };
    const next = tenants.map(t => t.id === tenantId ? { ...t, issues: [...t.issues, issue] } : t);
    saveTenants(next);
    setIssueForm(emptyIssue());
    setShowIssueModal(null);
    toast({ title: 'Issue logged' });
  };

  const handleResolveIssue = (tenantId: string, issueId: string) => {
    const next = tenants.map(t => t.id === tenantId
      ? { ...t, issues: t.issues.map(i => i.id === issueId ? { ...i, resolvedAt: new Date().toISOString() } : i) }
      : t);
    saveTenants(next);
  };

  const handleIssuePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        setIssueForm(f => ({ ...f, photos: [...f.photos, dataUrl] }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleMarkOverdue = (tenantId: string) => {
    const next = tenants.map(t => t.id === tenantId ? { ...t, status: 'overdue' as TenantStatus } : t);
    saveTenants(next);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.trim().split('\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      const headers = rows[0];
      const imported: Property[] = rows.slice(1).map(row => {
        const get = (col: string) => row[headers.indexOf(col)] || '';
        return {
          id: Date.now().toString() + Math.random(),
          name: get('name') || get('property_name'),
          address: get('address'),
          type: (get('type') as PropertyType) || 'single_family',
          units: [], assets: [],
          purchasePrice: parseFloat(get('purchase_price')) || undefined,
          currentValue: parseFloat(get('current_value')) || undefined,
          monthlyExpenses: parseFloat(get('monthly_expenses')) || undefined,
          notes: get('notes'),
          addedAt: new Date().toISOString(),
        };
      }).filter(p => p.name);
      saveProperties([...properties, ...imported]);
      toast({ title: `Imported ${imported.length} properties` });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const TABS = [
    { id: 'overview'    as const, label: 'Overview',     icon: BarChart3 },
    { id: 'properties'  as const, label: 'Properties',   icon: Building2 },
    { id: 'tenants'     as const, label: 'Tenants',      icon: Users },
    { id: 'fleet'       as const, label: 'Fleet',        icon: Car },
    { id: 'maintenance' as const, label: 'Maintenance',  icon: Wrench },
    { id: 'financials'  as const, label: 'Financials',   icon: DollarSign },
  ];

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-400" />
              Property & Fleet Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your portfolio, fleet, and assets — all in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors">
              <Upload className="w-4 h-4" /> Import CSV
              <input type="file" accept=".csv" className="sr-only" ref={csvRef} onChange={handleImportCSV} />
            </label>
            <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-500" onClick={() => setShowAddProp(true)}>
              <Plus className="w-4 h-4" /> Add Property
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowAddFleet(true)}>
              <Car className="w-4 h-4" /> Add Vehicle
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Properties',     value: totalProperties,                    icon: Building2,   color: 'text-teal-400'   },
            { label: 'Units',          value: `${occupiedUnits}/${totalUnits}`,   icon: Home,        color: 'text-blue-400'   },
            { label: 'Fleet',          value: `${activeFleet} active`,            icon: Car,         color: 'text-amber-400'  },
            { label: 'For Sale',       value: forSaleFleet,                       icon: ShoppingCart,color: 'text-green-400'  },
            { label: 'Open Work',      value: openMaintenance,                    icon: Wrench,      color: openMaintenance > 0 ? 'text-orange-400' : 'text-muted-foreground' },
            { label: 'Alerts',         value: expiredDocs,                        icon: AlertTriangle,color: expiredDocs > 0 ? 'text-red-400' : 'text-muted-foreground' },
          ].map(k => (
            <Card key={k.label} className="border-border/30">
              <CardContent className="p-3 flex items-center gap-2">
                <k.icon className={cn('w-4 h-4 shrink-0', k.color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="font-semibold text-sm">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* NOI / Value strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Monthly Rent',     value: `$${monthlyRent.toLocaleString()}`,       color: 'text-green-400'  },
            { label: 'Monthly Expenses', value: `$${monthlyExpenses.toLocaleString()}`,   color: 'text-red-400'    },
            { label: 'Monthly NOI',      value: `$${monthlyNOI.toLocaleString()}`,        color: monthlyNOI >= 0 ? 'text-teal-400' : 'text-red-400' },
            { label: 'Lot Inventory',    value: `$${lotInventoryValue.toLocaleString()}`, color: 'text-amber-400'  },
          ].map(k => (
            <Card key={k.label} className="border-border/30 bg-muted/10">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={cn('text-lg font-bold', k.color)}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/30 overflow-x-auto pb-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Properties summary */}
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-400" /> Portfolio Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {properties.length === 0 && <p className="text-xs text-muted-foreground">No properties yet — add your first above.</p>}
                {properties.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{PROPERTY_TYPE_LABELS[p.type]} · {p.units.length} units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-400 font-medium">
                        ${p.units.reduce((s, u) => s + (u.monthlyRent || 0), 0).toLocaleString()}/mo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.units.filter(u => u.occupied).length}/{p.units.length} occupied
                      </p>
                    </div>
                  </div>
                ))}
                {properties.length > 5 && <p className="text-xs text-muted-foreground pt-1">+{properties.length - 5} more — see Properties tab</p>}
              </CardContent>
            </Card>

            {/* Fleet summary */}
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-400" /> Fleet Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {fleet.length === 0 && <p className="text-xs text-muted-foreground">No vehicles yet — add fleet above.</p>}
                {fleet.slice(0, 5).map(v => {
                  const health = vehicleHealthPct(v);
                  const expWarn = isExpiringSoon(v.insuranceExpiry) || isExpiringSoon(v.registrationExpiry) || isExpiringSoon(v.inspectionExpiry);
                  const expErr  = isExpired(v.insuranceExpiry) || isExpired(v.registrationExpiry) || isExpired(v.inspectionExpiry);
                  return (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{v.year} {v.make} {v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.licensePlate || 'No plate'} · {v.mileage.toLocaleString()} mi</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {expErr  && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                        {expWarn && !expErr && <Clock className="w-3.5 h-3.5 text-yellow-400" />}
                        {health !== null && (
                          <div className="flex items-center gap-1">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', healthColor(health))} style={{ width: `${health}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{health}%</span>
                          </div>
                        )}
                        <Badge className={cn('text-xs', VEHICLE_STATUS_META[v.status].color === 'text-green-400' ? 'bg-green-500/10 text-green-400' : 'bg-muted/30 text-muted-foreground')}>
                          {VEHICLE_STATUS_META[v.status].label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Open maintenance */}
            <Card className="border-border/30 lg:col-span-2">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-400" /> Open Maintenance Items
                  {openMaintenance > 0 && <Badge className="bg-orange-500/10 text-orange-400 ml-1">{openMaintenance}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {maintenance.filter(m => m.status !== 'completed').length === 0 && (
                  <p className="text-xs text-muted-foreground">No open items.</p>
                )}
                <div className="space-y-2">
                  {maintenance.filter(m => m.status !== 'completed').slice(0, 8).map(m => {
                    const prop = properties.find(p => p.id === m.propertyId);
                    return (
                      <div key={m.id} className="flex items-start justify-between gap-3 py-2 border-b border-border/20 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm">{m.description}</p>
                          <p className="text-xs text-muted-foreground">{prop?.name || 'Unknown'} · {m.date} · {m.type}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.cost && <span className="text-xs text-muted-foreground">${m.cost.toLocaleString()}</span>}
                          <button
                            onClick={() => { const next = maintenance.map(x => x.id === m.id ? { ...x, status: 'completed' as const } : x); saveMaintenance(next); }}
                            className="text-xs px-2 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── PROPERTIES TAB ── */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {properties.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No properties added yet.</p>
                <p className="text-xs mt-1">Use "Add Property" or import a CSV to get started.</p>
              </div>
            )}
            {properties.map(p => (
              <Card key={p.id} className="border-border/30">
                <div
                  className="flex items-start justify-between gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedProp(expandedProp === p.id ? null : p.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 shrink-0">
                      <Building2 className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.address}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-xs">{PROPERTY_TYPE_LABELS[p.type]}</Badge>
                        <span className="text-xs text-muted-foreground">{p.units.length} units · {p.assets.length} assets</span>
                        {p.currentValue && <span className="text-xs text-teal-400">${p.currentValue.toLocaleString()} value</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); handleDeleteProperty(p.id); }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expandedProp === p.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedProp === p.id && (
                  <div className="border-t border-border/20 p-4 space-y-5">
                    {/* Units */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Units</p>
                        <button onClick={() => { setShowAddUnit(p.id); setUnitForm(emptyUnit()); }}
                          className="text-xs flex items-center gap-1 text-primary hover:text-primary/80">
                          <Plus className="w-3 h-3" /> Add Unit
                        </button>
                      </div>
                      {p.units.length === 0 && <p className="text-xs text-muted-foreground">No units — add above.</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {p.units.map(u => (
                          <div key={u.id} className={cn('rounded-lg border p-3 text-xs', u.occupied ? 'border-green-500/20 bg-green-500/5' : 'border-border/30 bg-muted/10')}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">Unit {u.unitNumber}</span>
                              <Badge className={u.occupied ? 'bg-green-500/20 text-green-400 text-[10px]' : 'bg-muted/30 text-muted-foreground text-[10px]'}>
                                {u.occupied ? 'Occupied' : 'Vacant'}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">{u.bedrooms}bd · {u.bathrooms}ba{u.sqft ? ` · ${u.sqft} sqft` : ''}</p>
                            {u.tenantName && <p className="mt-1">{u.tenantName}</p>}
                            {u.monthlyRent && <p className="text-green-400 font-medium mt-1">${u.monthlyRent.toLocaleString()}/mo</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assets */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assets & Equipment</p>
                        <button onClick={() => { setShowAddAsset(p.id); setAssetForm(emptyAsset()); }}
                          className="text-xs flex items-center gap-1 text-primary hover:text-primary/80">
                          <Plus className="w-3 h-3" /> Add Asset
                        </button>
                      </div>
                      {p.assets.length === 0 && <p className="text-xs text-muted-foreground">No assets logged.</p>}
                      <div className="space-y-1">
                        {p.assets.map(a => (
                          <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0 text-xs">
                            <div>
                              <span className="font-medium">{a.name}</span>
                              <span className="text-muted-foreground ml-2">{a.type}{a.location ? ` · ${a.location}` : ''}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {a.warrantyExpiry && isExpiringSoon(a.warrantyExpiry) && <Clock className="w-3 h-3 text-yellow-400" />}
                              <Badge className={cn('text-[10px]', CONDITION_META[a.condition].color, CONDITION_META[a.condition].bg)}>
                                {CONDITION_META[a.condition].label}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Log entry shortcut */}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddLog(p.id); setLogForm(emptyLog(p.id)); }}
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded border border-border/40 text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                        <FileText className="w-3 h-3" /> Log Maintenance
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── FLEET TAB ── */}
        {activeTab === 'fleet' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{fleet.length} vehicles · {forSaleFleet} for sale · lot value ${lotInventoryValue.toLocaleString()}</p>
              <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-500" onClick={() => setShowAddFleet(true)}>
                <Plus className="w-4 h-4" /> Add Vehicle
              </Button>
            </div>
            {fleet.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No vehicles in fleet yet.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {fleet.map(v => {
                const health = vehicleHealthPct(v);
                const insExp   = isExpired(v.insuranceExpiry);
                const regExp   = isExpired(v.registrationExpiry);
                const inspExp  = isExpired(v.inspectionExpiry);
                const insWarn  = !insExp  && isExpiringSoon(v.insuranceExpiry);
                const regWarn  = !regExp  && isExpiringSoon(v.registrationExpiry);
                const inspWarn = !inspExp && isExpiringSoon(v.inspectionExpiry);
                const hasAlert = insExp || regExp || inspExp;
                const hasWarn  = insWarn || regWarn || inspWarn;
                return (
                  <Card key={v.id} className={cn('border-2 transition-all', hasAlert ? 'border-red-500/40' : hasWarn ? 'border-yellow-500/30' : 'border-border/30')}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{v.year} {v.make} {v.model}</p>
                          <p className="text-xs text-muted-foreground">{v.color || ''}{v.licensePlate ? ` · ${v.licensePlate}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className={cn('text-xs', VEHICLE_STATUS_META[v.status].color === 'text-green-400' ? 'bg-green-500/10 text-green-400' : VEHICLE_STATUS_META[v.status].color === 'text-blue-400' ? 'bg-blue-500/10 text-blue-400' : 'bg-muted/20 text-muted-foreground')}>
                            {VEHICLE_STATUS_META[v.status].label}
                          </Badge>
                          <button onClick={() => handleDeleteVehicle(v.id)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Mileage / Health */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Mileage</span>
                          <span className="font-medium">{v.mileage.toLocaleString()} / {v.expectedLifeMiles.toLocaleString()} mi</span>
                        </div>
                        {health !== null && (
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', healthColor(health))} style={{ width: `${health}%` }} />
                          </div>
                        )}
                      </div>

                      {/* Docs status */}
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        {[
                          { label: 'Insurance',    date: v.insuranceExpiry,    exp: insExp,  warn: insWarn  },
                          { label: 'Registration', date: v.registrationExpiry, exp: regExp,  warn: regWarn  },
                          { label: 'Inspection',   date: v.inspectionExpiry,   exp: inspExp, warn: inspWarn },
                        ].map(d => (
                          <div key={d.label} className={cn('rounded p-1.5 text-center', d.exp ? 'bg-red-500/10' : d.warn ? 'bg-yellow-500/10' : 'bg-muted/20')}>
                            <p className={cn('font-medium', d.exp ? 'text-red-400' : d.warn ? 'text-yellow-400' : 'text-muted-foreground')}>{d.label}</p>
                            <p>{d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : '—'}</p>
                          </div>
                        ))}
                      </div>

                      {/* Assignment + price */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{v.assignedTo || 'Unassigned'}</span>
                        {v.forSalePrice && <span className="text-green-400 font-semibold">${v.forSalePrice.toLocaleString()}</span>}
                        {v.vin && <span className="font-mono">{v.vin.slice(-6)}</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MAINTENANCE TAB ── */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{openMaintenance} open · {maintenance.filter(m => m.status === 'completed').length} completed</p>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => { setShowAddLog(''); setLogForm(emptyLog()); }}>
                <Plus className="w-4 h-4" /> Log Item
              </Button>
            </div>
            {maintenance.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No maintenance logs yet.</p>
              </div>
            )}
            <div className="space-y-2">
              {[...maintenance].sort((a, b) => b.date.localeCompare(a.date)).map(m => {
                const prop = properties.find(p => p.id === m.propertyId);
                return (
                  <div key={m.id} className={cn('flex items-start justify-between gap-3 p-3 rounded-lg border', m.status === 'completed' ? 'border-border/20 bg-muted/5 opacity-60' : 'border-border/30 bg-card')}>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {prop?.name || 'Unknown property'} · {m.date} · <span className="capitalize">{m.type.replace('_', ' ')}</span>
                        {m.performedBy ? ` · ${m.performedBy}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.cost && <span className="text-xs text-muted-foreground">${m.cost.toLocaleString()}</span>}
                      <Badge className={m.status === 'completed' ? 'bg-green-500/10 text-green-400 text-xs' : m.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 text-xs' : 'bg-yellow-500/10 text-yellow-400 text-xs'}>
                        {m.status.replace('_', ' ')}
                      </Badge>
                      {m.status !== 'completed' && (
                        <button onClick={() => { const next = maintenance.map(x => x.id === m.id ? { ...x, status: 'completed' as const } : x); saveMaintenance(next); }}
                          className="text-xs text-green-400 hover:text-green-300 border border-green-500/30 rounded px-2 py-0.5 transition-colors">
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FINANCIALS TAB ── */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Portfolio Value',      value: `$${portfolioValue.toLocaleString()}`,                        color: 'text-teal-400',   icon: TrendingUp  },
                { label: 'Annual Gross Rent',    value: `$${(monthlyRent * 12).toLocaleString()}`,                    color: 'text-green-400',  icon: DollarSign  },
                { label: 'Annual NOI',           value: `$${(monthlyNOI * 12).toLocaleString()}`,                     color: monthlyNOI >= 0 ? 'text-teal-400' : 'text-red-400', icon: BarChart3 },
              ].map(k => (
                <Card key={k.label} className="border-border/30">
                  <CardContent className="p-5 flex items-center gap-3">
                    <k.icon className={cn('w-5 h-5', k.color)} />
                    <div>
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                      <p className={cn('text-xl font-bold', k.color)}>{k.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Property Financial Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="space-y-3">
                  {properties.map(p => {
                    const rent  = p.units.reduce((s, u) => s + (u.monthlyRent || 0), 0);
                    const noi   = rent - (p.monthlyExpenses || 0);
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{PROPERTY_TYPE_LABELS[p.type]}</p>
                        </div>
                        <div className="flex items-center gap-6 text-right text-xs">
                          <div><p className="text-muted-foreground">Rent/mo</p><p className="text-green-400 font-medium">${rent.toLocaleString()}</p></div>
                          <div><p className="text-muted-foreground">Expenses</p><p className="text-red-400 font-medium">${(p.monthlyExpenses || 0).toLocaleString()}</p></div>
                          <div><p className="text-muted-foreground">NOI/mo</p><p className={cn('font-bold', noi >= 0 ? 'text-teal-400' : 'text-red-400')}>${noi.toLocaleString()}</p></div>
                          {p.currentValue && <div><p className="text-muted-foreground">Value</p><p className="text-teal-400 font-medium">${p.currentValue.toLocaleString()}</p></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-300">Lot Inventory Value</p>
                  <p className="text-xs text-muted-foreground">{forSaleFleet} vehicles listed for sale</p>
                </div>
                <p className="text-2xl font-bold text-amber-300">${lotInventoryValue.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TENANTS TAB ── */}
        {activeTab === 'tenants' && (
          <div className="space-y-5">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Rent Roll/mo',   value: `$${rentRoll.toLocaleString()}`,  color: 'text-green-400'  },
                { label: 'Active',         value: activeTenants,                     color: 'text-teal-400'   },
                { label: 'Expiring <30d',  value: expiringSoon,                      color: expiringSoon > 0 ? 'text-yellow-400' : 'text-muted-foreground' },
                { label: 'Overdue',        value: overdueTenants,                    color: overdueTenants > 0 ? 'text-red-400' : 'text-muted-foreground' },
              ].map(k => (
                <Card key={k.label} className="border-border/30 bg-muted/10">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className={cn('text-lg font-bold', k.color)}>{k.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-1 flex-wrap">
                {(['all', 'active', 'expiring_soon', 'overdue', 'past', 'pending'] as const).map(f => (
                  <button key={f} onClick={() => setTenantFilter(f)}
                    className={cn('text-xs px-3 py-1 rounded-full border transition-colors', tenantFilter === f
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 text-muted-foreground hover:text-foreground')}>
                    {f === 'all' ? 'All' : TENANT_STATUS_META[f as TenantStatus].label}
                  </button>
                ))}
              </div>
              <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-500" onClick={() => { setTenantForm(emptyTenant()); setShowAddTenant(true); }}>
                <Plus className="w-4 h-4" /> Add Tenant
              </Button>
            </div>

            {tenantsWithStatus.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No tenants yet — add your first above.</p>
              </div>
            )}

            <div className="space-y-3">
              {tenantsWithStatus
                .filter(t => tenantFilter === 'all' || t.status === tenantFilter)
                .map(t => {
                  const prop = properties.find(p => p.id === t.propertyId);
                  const openIssues = t.issues.filter(i => !i.resolvedAt).length;
                  const isExpanded = expandedTenant === t.id;
                  return (
                    <Card key={t.id} className={cn('border transition-all', t.status === 'overdue' ? 'border-red-500/30' : t.status === 'expiring_soon' ? 'border-yellow-500/30' : 'border-border/30')}>
                      {/* Tenant header */}
                      <div className="flex items-start justify-between gap-3 p-4 cursor-pointer" onClick={() => setExpandedTenant(isExpanded ? null : t.id)}>
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 shrink-0">
                            <Users className="w-4 h-4 text-teal-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{t.name}</p>
                              <Badge className={cn('text-[10px]', TENANT_STATUS_META[t.status].color, TENANT_STATUS_META[t.status].bg)}>
                                {TENANT_STATUS_META[t.status].label}
                              </Badge>
                              {openIssues > 0 && (
                                <Badge className="text-[10px] bg-orange-500/10 text-orange-400">{openIssues} open issue{openIssues > 1 ? 's' : ''}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {prop?.name || 'No property'}{t.unitRef ? ` · Unit ${t.unitRef}` : ''} · {SPACE_TYPE_LABELS[t.spaceType]}
                            </p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
                              <span className="text-green-400 font-semibold">${t.rent.toLocaleString()}/{RENT_PERIOD_LABELS[t.period].toLowerCase()}</span>
                              <span className="text-muted-foreground">{LEASE_TYPE_LABELS[t.leaseType]}</span>
                              {t.leaseEnd && (
                                <span className={cn(t.status === 'expiring_soon' ? 'text-yellow-400' : t.status === 'past' ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                  Ends {new Date(t.leaseEnd).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={e => { e.stopPropagation(); handleDeleteTenant(t.id); }}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-border/20 p-4 space-y-4">
                          {/* Contact + lease info grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {t.email && <div><p className="text-muted-foreground">Email</p><p className="font-medium truncate">{t.email}</p></div>}
                            {t.phone && <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{t.phone}</p></div>}
                            <div><p className="text-muted-foreground">Lease Start</p><p className="font-medium">{new Date(t.leaseStart).toLocaleDateString()}</p></div>
                            {t.deposit && <div><p className="text-muted-foreground">Deposit</p><p className="font-medium text-green-400">${t.deposit.toLocaleString()}</p></div>}
                          </div>

                          {t.notes && (
                            <div className="p-3 rounded-lg bg-muted/20 text-xs text-muted-foreground">{t.notes}</div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => { setIssueForm(emptyIssue()); setShowIssueModal(t.id); }}
                              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors">
                              <AlertTriangle className="w-3 h-3" /> Log Issue / Upload Photos
                            </button>
                            {t.status !== 'overdue' && (
                              <button
                                onClick={() => handleMarkOverdue(t.id)}
                                className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                                Mark Overdue
                              </button>
                            )}
                            <button
                              onClick={() => window.location.href = '/vendor-hub'}
                              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded border border-border/40 text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                              <Shield className="w-3 h-3" /> Vendor Hub
                            </button>
                            <button
                              onClick={() => window.location.href = '/compliance'}
                              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded border border-border/40 text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                              <FolderOpen className="w-3 h-3" /> Compliance Docs
                            </button>
                          </div>

                          {/* Issues list */}
                          {t.issues.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Issues & Maintenance</p>
                              <div className="space-y-2">
                                {t.issues.map(issue => (
                                  <div key={issue.id} className={cn('rounded-lg border p-3 text-xs', issue.resolvedAt ? 'border-border/20 opacity-60' : 'border-orange-500/20 bg-orange-500/5')}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="font-medium">{issue.description}</p>
                                        <p className="text-muted-foreground mt-0.5">{issue.date}{issue.vendorRef ? ` · Vendor: ${issue.vendorRef}` : ''}</p>
                                        {issue.photos.length > 0 && (
                                          <div className="flex gap-1 mt-2 flex-wrap">
                                            {issue.photos.map((ph, i) => (
                                              <img key={i} src={ph} alt={`Issue photo ${i + 1}`}
                                                className="w-16 h-16 object-cover rounded border border-border/30 cursor-pointer hover:opacity-90"
                                                onClick={() => window.open(ph, '_blank')} />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      {!issue.resolvedAt && (
                                        <button onClick={() => handleResolveIssue(t.id, issue.id)}
                                          className="text-green-400 hover:text-green-300 border border-green-500/30 rounded px-2 py-0.5 whitespace-nowrap transition-colors">
                                          Resolve
                                        </button>
                                      )}
                                      {issue.resolvedAt && (
                                        <span className="text-green-400 text-[10px]">Resolved</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
            </div>

            {/* Vacancy cost nudge */}
            {totalUnits - occupiedUnits > 0 && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Vacancy Cost Alert</p>
                    <p className="text-xs text-muted-foreground">
                      {totalUnits - occupiedUnits} unit{totalUnits - occupiedUnits > 1 ? 's' : ''} vacant —
                      estimated ${((monthlyRent / (occupiedUnits || 1)) * (totalUnits - occupiedUnits)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo in lost revenue.
                    </p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── MODALS ── */}

        {/* Add Property */}
        {showAddProp && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddProp(false)}>
            <Card className="w-full max-w-lg border-teal-500/30" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Add Property</CardTitle>
                <button onClick={() => setShowAddProp(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Property Name *</label>
                    <Input placeholder="Oak Street Apartments" value={propForm.name} onChange={e => setPropForm(p => ({ ...p, name: e.target.value }))} /></div>
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Address *</label>
                    <Input placeholder="123 Oak St, Newark, NJ 07101" value={propForm.address} onChange={e => setPropForm(p => ({ ...p, address: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Type</label>
                    <Select value={propForm.type} onValueChange={v => setPropForm(p => ({ ...p, type: v as PropertyType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Monthly Expenses ($)</label>
                    <Input type="number" placeholder="2500" value={propForm.monthlyExpenses || ''} onChange={e => setPropForm(p => ({ ...p, monthlyExpenses: parseFloat(e.target.value) || undefined }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Purchase Price ($)</label>
                    <Input type="number" placeholder="350000" value={propForm.purchasePrice || ''} onChange={e => setPropForm(p => ({ ...p, purchasePrice: parseFloat(e.target.value) || undefined }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Current Value ($)</label>
                    <Input type="number" placeholder="400000" value={propForm.currentValue || ''} onChange={e => setPropForm(p => ({ ...p, currentValue: parseFloat(e.target.value) || undefined }))} /></div>
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Notes</label>
                    <Textarea rows={2} value={propForm.notes} onChange={e => setPropForm(p => ({ ...p, notes: e.target.value }))} /></div>
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-500" onClick={handleAddProperty}>Add Property</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Unit */}
        {showAddUnit && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddUnit(null)}>
            <Card className="w-full max-w-md border-border/40" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Add Unit</CardTitle>
                <button onClick={() => setShowAddUnit(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Unit # *</label>
                    <Input placeholder="1A" value={unitForm.unitNumber} onChange={e => setUnitForm(u => ({ ...u, unitNumber: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Monthly Rent ($)</label>
                    <Input type="number" value={unitForm.monthlyRent || ''} onChange={e => setUnitForm(u => ({ ...u, monthlyRent: parseFloat(e.target.value) || undefined }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Bedrooms</label>
                    <Input type="number" value={unitForm.bedrooms} onChange={e => setUnitForm(u => ({ ...u, bedrooms: parseInt(e.target.value) || 1 }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Bathrooms</label>
                    <Input type="number" value={unitForm.bathrooms} onChange={e => setUnitForm(u => ({ ...u, bathrooms: parseInt(e.target.value) || 1 }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Sq Ft</label>
                    <Input type="number" value={unitForm.sqft || ''} onChange={e => setUnitForm(u => ({ ...u, sqft: parseInt(e.target.value) || 0 }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Status</label>
                    <Select value={unitForm.occupied ? 'occupied' : 'vacant'} onValueChange={v => setUnitForm(u => ({ ...u, occupied: v === 'occupied' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="occupied">Occupied</SelectItem><SelectItem value="vacant">Vacant</SelectItem></SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Tenant Name</label>
                    <Input value={unitForm.tenantName || ''} onChange={e => setUnitForm(u => ({ ...u, tenantName: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Tenant Phone</label>
                    <Input value={unitForm.tenantPhone || ''} onChange={e => setUnitForm(u => ({ ...u, tenantPhone: e.target.value }))} /></div>
                </div>
                <Button className="w-full" onClick={() => handleAddUnit(showAddUnit!)}>Add Unit</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Asset */}
        {showAddAsset && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddAsset(null)}>
            <Card className="w-full max-w-md border-border/40" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Add Asset / Equipment</CardTitle>
                <button onClick={() => setShowAddAsset(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Asset Name *</label>
                    <Input placeholder="Main HVAC Unit" value={assetForm.name} onChange={e => setAssetForm(a => ({ ...a, name: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Type</label>
                    <Select value={assetForm.type} onValueChange={v => setAssetForm(a => ({ ...a, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Condition</label>
                    <Select value={assetForm.condition} onValueChange={v => setAssetForm(a => ({ ...a, condition: v as AssetCondition }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(CONDITION_META).map(([v, m]) => <SelectItem key={v} value={v}>{m.label}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Location / Room</label>
                    <Input placeholder="Unit 2B / Basement" value={assetForm.location} onChange={e => setAssetForm(a => ({ ...a, location: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Install Date</label>
                    <Input type="date" value={assetForm.installDate} onChange={e => setAssetForm(a => ({ ...a, installDate: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Warranty Expiry</label>
                    <Input type="date" value={assetForm.warrantyExpiry} onChange={e => setAssetForm(a => ({ ...a, warrantyExpiry: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Replacement Cost ($)</label>
                    <Input type="number" value={assetForm.replacementCost || ''} onChange={e => setAssetForm(a => ({ ...a, replacementCost: parseFloat(e.target.value) || undefined }))} /></div>
                </div>
                <Button className="w-full" onClick={() => handleAddAsset(showAddAsset!)}>Add Asset</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Fleet Vehicle */}
        {showAddFleet && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAddFleet(false)}>
            <Card className="w-full max-w-lg border-amber-500/30 my-4" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Add Fleet Vehicle</CardTitle>
                <button onClick={() => setShowAddFleet(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Year *</label>
                    <Input type="number" value={fleetForm.year} onChange={e => setFleetForm(f => ({ ...f, year: parseInt(e.target.value) || new Date().getFullYear() }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Make *</label>
                    <Input placeholder="Ford" value={fleetForm.make} onChange={e => setFleetForm(f => ({ ...f, make: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Model *</label>
                    <Input placeholder="Transit" value={fleetForm.model} onChange={e => setFleetForm(f => ({ ...f, model: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Color</label>
                    <Input placeholder="White" value={fleetForm.color || ''} onChange={e => setFleetForm(f => ({ ...f, color: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">License Plate</label>
                    <Input placeholder="ABC1234" value={fleetForm.licensePlate || ''} onChange={e => setFleetForm(f => ({ ...f, licensePlate: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Status</label>
                    <Select value={fleetForm.status} onValueChange={v => setFleetForm(f => ({ ...f, status: v as VehicleStatus }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(VEHICLE_STATUS_META).map(([v, m]) => <SelectItem key={v} value={v}>{m.label}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Current Mileage</label>
                    <Input type="number" value={fleetForm.mileage} onChange={e => setFleetForm(f => ({ ...f, mileage: parseInt(e.target.value) || 0 }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Expected Life (mi)</label>
                    <Input type="number" value={fleetForm.expectedLifeMiles} onChange={e => setFleetForm(f => ({ ...f, expectedLifeMiles: parseInt(e.target.value) || 150000 }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">VIN</label>
                    <Input placeholder="1HGBH41..." value={fleetForm.vin || ''} onChange={e => setFleetForm(f => ({ ...f, vin: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Insurance Expiry</label>
                    <Input type="date" value={fleetForm.insuranceExpiry || ''} onChange={e => setFleetForm(f => ({ ...f, insuranceExpiry: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Registration Expiry</label>
                    <Input type="date" value={fleetForm.registrationExpiry || ''} onChange={e => setFleetForm(f => ({ ...f, registrationExpiry: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Inspection Expiry</label>
                    <Input type="date" value={fleetForm.inspectionExpiry || ''} onChange={e => setFleetForm(f => ({ ...f, inspectionExpiry: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Assigned To</label>
                    <Input placeholder="Operations / Property name" value={fleetForm.assignedTo || ''} onChange={e => setFleetForm(f => ({ ...f, assignedTo: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Purchase Price ($)</label>
                    <Input type="number" value={fleetForm.purchasePrice || ''} onChange={e => setFleetForm(f => ({ ...f, purchasePrice: parseFloat(e.target.value) || undefined }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">For Sale Price ($)</label>
                    <Input type="number" placeholder="Lot listing price" value={fleetForm.forSalePrice || ''} onChange={e => setFleetForm(f => ({ ...f, forSalePrice: parseFloat(e.target.value) || undefined }))} /></div>
                </div>
                <Button className="w-full bg-amber-600 hover:bg-amber-500" onClick={handleAddVehicle}>Add Vehicle</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Tenant */}
        {showAddTenant && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAddTenant(false)}>
            <Card className="w-full max-w-lg border-teal-500/30 my-4" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Add Tenant</CardTitle>
                <button onClick={() => setShowAddTenant(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Tenant Name *</label>
                    <Input placeholder="Jane Smith" value={tenantForm.name} onChange={e => setTenantForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Email</label>
                    <Input type="email" placeholder="jane@email.com" value={tenantForm.email || ''} onChange={e => setTenantForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Phone</label>
                    <Input placeholder="(555) 000-0000" value={tenantForm.phone || ''} onChange={e => setTenantForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Property</label>
                    <Select value={tenantForm.propertyId} onValueChange={v => setTenantForm(f => ({ ...f, propertyId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Unit / Space Ref</label>
                    <Input placeholder="1A / Suite 200" value={tenantForm.unitRef || ''} onChange={e => setTenantForm(f => ({ ...f, unitRef: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Space Type</label>
                    <Select value={tenantForm.spaceType} onValueChange={v => setTenantForm(f => ({ ...f, spaceType: v as SpaceType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(SPACE_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Lease Type</label>
                    <Select value={tenantForm.leaseType} onValueChange={v => setTenantForm(f => ({ ...f, leaseType: v as LeaseType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(LEASE_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Rent Amount ($) *</label>
                    <Input type="number" placeholder="1500" value={tenantForm.rent || ''} onChange={e => setTenantForm(f => ({ ...f, rent: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Rent Period</label>
                    <Select value={tenantForm.period} onValueChange={v => setTenantForm(f => ({ ...f, period: v as RentPeriod }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(RENT_PERIOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Security Deposit ($)</label>
                    <Input type="number" placeholder="3000" value={tenantForm.deposit || ''} onChange={e => setTenantForm(f => ({ ...f, deposit: parseFloat(e.target.value) || undefined }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Lease Start</label>
                    <Input type="date" value={tenantForm.leaseStart} onChange={e => setTenantForm(f => ({ ...f, leaseStart: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Lease End</label>
                    <Input type="date" value={tenantForm.leaseEnd || ''} onChange={e => setTenantForm(f => ({ ...f, leaseEnd: e.target.value }))} /></div>
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Notes</label>
                    <Textarea rows={2} placeholder="Pet policy, parking spot, special terms..." value={tenantForm.notes || ''} onChange={e => setTenantForm(f => ({ ...f, notes: e.target.value }))} /></div>
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-500" onClick={handleAddTenant}>Add Tenant</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Log Issue / Upload Photos */}
        {showIssueModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowIssueModal(null)}>
            <Card className="w-full max-w-md border-orange-500/30" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" /> Log Issue
                </CardTitle>
                <button onClick={() => setShowIssueModal(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Issue Date</label>
                  <Input type="date" value={issueForm.date} onChange={e => setIssueForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Description *</label>
                  <Textarea rows={3} placeholder="Describe the issue in detail..." value={issueForm.description} onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="space-y-1"><label className="text-xs text-muted-foreground">Assigned Vendor (optional)</label>
                  <Input placeholder="ABC Plumbing / vendor name" value={issueForm.vendorRef || ''} onChange={e => setIssueForm(f => ({ ...f, vendorRef: e.target.value }))} /></div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Photos</label>
                  <div className="flex flex-wrap gap-2">
                    {issueForm.photos.map((ph, i) => (
                      <div key={i} className="relative">
                        <img src={ph} alt="" className="w-16 h-16 object-cover rounded border border-border/30" />
                        <button onClick={() => setIssueForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
                      </div>
                    ))}
                    <label className="w-16 h-16 border-2 border-dashed border-border/40 rounded cursor-pointer flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Plus className="w-5 h-5" />
                      <input type="file" accept="image/*" multiple className="sr-only" ref={issuePhotoRef} onChange={handleIssuePhoto} />
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Photos are stored locally and linked to compliance records.</p>
                </div>
                <Button className="w-full bg-orange-600 hover:bg-orange-500" onClick={() => handleAddIssue(showIssueModal!)}>Save Issue</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Log Maintenance */}
        {showAddLog !== null && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddLog(null)}>
            <Card className="w-full max-w-md border-border/40" onClick={e => e.stopPropagation()}>
              <CardHeader className="pb-2 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Log Maintenance</CardTitle>
                <button onClick={() => setShowAddLog(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Property</label>
                    <Select value={logForm.propertyId} onValueChange={v => setLogForm(l => ({ ...l, propertyId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Type</label>
                    <Select value={logForm.type} onValueChange={v => setLogForm(l => ({ ...l, type: v as MaintenanceLog['type'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['repair','inspection','preventive','emergency','tenant_request'] as const).map(t =>
                          <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Date</label>
                    <Input type="date" value={logForm.date} onChange={e => setLogForm(l => ({ ...l, date: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Cost ($)</label>
                    <Input type="number" value={logForm.cost || ''} onChange={e => setLogForm(l => ({ ...l, cost: parseFloat(e.target.value) || undefined }))} /></div>
                  <div className="col-span-2 space-y-1"><label className="text-xs text-muted-foreground">Description *</label>
                    <Textarea rows={2} value={logForm.description} onChange={e => setLogForm(l => ({ ...l, description: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Performed By</label>
                    <Input value={logForm.performedBy || ''} onChange={e => setLogForm(l => ({ ...l, performedBy: e.target.value }))} /></div>
                  <div className="space-y-1"><label className="text-xs text-muted-foreground">Status</label>
                    <Select value={logForm.status} onValueChange={v => setLogForm(l => ({ ...l, status: v as MaintenanceLog['status'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select></div>
                </div>
                <Button className="w-full" onClick={() => handleAddLog(logForm.propertyId || showAddLog!)}>Save Log</Button>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
