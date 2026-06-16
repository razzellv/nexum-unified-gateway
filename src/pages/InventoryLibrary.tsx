import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Package, Search, AlertTriangle, TrendingUp, TrendingDown,
  Download, ArrowUpDown, Wrench, Zap, Wind, Hammer, Droplets, Cylinder, Box,
  ClipboardList, CheckCircle, User, Clock, Plus, X, History,
  Thermometer, ShoppingCart, Shield, Truck, Lock, AlertOctagon, Upload,
  FlaskConical, AlertCircle, FileText, CheckCircle2, Trash2,
  Building2, Calendar, RefreshCw, Star, ChevronUp, ChevronDown, Minus,
} from 'lucide-react';
import { ImportModal } from '@/components/ImportModal';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import InventoryImportModal from '@/components/import/InventoryImportModal';
import {
  getResourceSummary, getResourceVendors, createResourceVendor,
  getFloatTime, getPMIntervals,
  type ResourceVendor, type FloatTimeData, type PMInterval, type ResourceSummary,
} from '@/lib/nexum-api';

const API_BASE_URL = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

// ── Category groups (parts/mechanical) ──────────────────────────────────────
const CATEGORY_GROUPS = [
  { label: 'All Categories', value: 'all', icon: Package, color: 'text-muted-foreground', items: [] },
  {
    label: 'Mechanical', value: 'MECHANICAL', icon: Wrench, color: 'text-blue-400',
    items: [
      { value: 'BOLTS_NUTS', label: 'Bolts & Nuts' }, { value: 'GASKETS', label: 'Gaskets & Seals' },
      { value: 'BEARINGS', label: 'Bearings' }, { value: 'BELTS', label: 'Belts & Drives' },
      { value: 'FILTERS', label: 'Filters' }, { value: 'VALVES', label: 'Valves & Actuators' },
      { value: 'PIPES_FITTINGS', label: 'Pipes & Fittings' }, { value: 'LADDERS', label: 'Ladders & Access' },
      { value: 'TILES_PANELS', label: 'Tiles & Panels' }, { value: 'DOORS_HATCHES', label: 'Doors & Hatches' },
      { value: 'PUMPS_PARTS', label: 'Pump Parts' }, { value: 'MECHANICAL_OTHER', label: 'Other Mechanical' },
    ],
  },
  {
    label: 'Electrical', value: 'ELECTRICAL', icon: Zap, color: 'text-yellow-400',
    items: [
      { value: 'WIRE_CABLE', label: 'Wire & Cable' }, { value: 'CONDUIT', label: 'Conduit & Raceway' },
      { value: 'BREAKERS_FUSES', label: 'Breakers & Fuses' }, { value: 'RELAYS_CONTACTORS', label: 'Relays & Contactors' },
      { value: 'SWITCHES', label: 'Switches & Disconnects' }, { value: 'LIGHTS_BALLASTS', label: 'Lights & Ballasts' },
      { value: 'METERS_TESTERS', label: 'Meters & Testers' }, { value: 'TERMINALS_CONNECTORS', label: 'Terminals & Connectors' },
      { value: 'SENSORS_TRANSDUCERS', label: 'Sensors & Transducers' }, { value: 'CONTROLS_BOARDS', label: 'Control Boards & PLCs' },
      { value: 'ELECTRICAL_OTHER', label: 'Other Electrical' },
    ],
  },
  {
    label: 'Pneumatic', value: 'PNEUMATIC', icon: Wind, color: 'text-cyan-400',
    items: [
      { value: 'SOLENOIDS', label: 'Solenoid Valves' }, { value: 'AIR_FILTERS', label: 'Air Filters & Dryers' },
      { value: 'REGULATORS', label: 'Regulators & Gauges' }, { value: 'CYLINDERS_ACTUATORS', label: 'Cylinders & Actuators' },
      { value: 'FITTINGS_TUBING', label: 'Fittings & Tubing' }, { value: 'COMPRESSOR_PARTS', label: 'Compressor Parts' },
      { value: 'PNEUMATIC_OTHER', label: 'Other Pneumatic' },
    ],
  },
  {
    label: 'Power Tools', value: 'POWER', icon: Hammer, color: 'text-orange-400',
    items: [
      { value: 'ELECTRIC_TOOLS', label: 'Electric Tools' }, { value: 'BATTERY_TOOLS', label: 'Battery / Cordless Tools' },
      { value: 'HAND_TOOLS', label: 'Hand Tools' }, { value: 'DRILLS_BITS', label: 'Drills & Bits' },
      { value: 'GRINDERS_CUTTERS', label: 'Grinders & Cutters' }, { value: 'TESTING_INSTRUMENTS', label: 'Testing Instruments' },
      { value: 'POWER_OTHER', label: 'Other Tools' },
    ],
  },
  {
    label: 'Treatments', value: 'TREATMENTS', icon: Droplets, color: 'text-green-400',
    items: [
      { value: 'SOFTENER_SALT', label: 'Softener Salt' }, { value: 'BOILER_CHEMICALS', label: 'Boiler Treatment Chemicals' },
      { value: 'COOLING_TOWER_CHEMICALS', label: 'Cooling Tower Treatment' }, { value: 'DESCALER', label: 'Descalers & Cleaners' },
      { value: 'BIOCIDES', label: 'Biocides & Inhibitors' }, { value: 'PH_CHEMICALS', label: 'pH Adjustment Chemicals' },
      { value: 'TREATMENT_OTHER', label: 'Other Treatments' },
    ],
  },
  {
    label: 'Lubricants', value: 'LUBRICANTS', icon: Cylinder, color: 'text-purple-400',
    items: [
      { value: 'MACHINE_OIL', label: 'Machine Oil' }, { value: 'COMPRESSOR_OIL', label: 'Compressor Oil' },
      { value: 'HYDRAULIC_FLUID', label: 'Hydraulic Fluid' }, { value: 'GREASE', label: 'Grease & Bearing Grease' },
      { value: 'FOOD_GRADE_LUBE', label: 'Food Grade Lubricants' }, { value: 'PENETRATING_OIL', label: 'Penetrating Oil' },
      { value: 'LUBRICANT_OTHER', label: 'Other Lubricants' },
    ],
  },
  {
    label: 'Others', value: 'OTHERS', icon: Box, color: 'text-muted-foreground',
    items: [
      { value: 'AIR_TANKS', label: 'Air Tanks & Vessels' }, { value: 'PPE', label: 'PPE & Safety Equipment' },
      { value: 'CLEANING_SUPPLIES', label: 'Cleaning Supplies' }, { value: 'PAPER_TOWELS_RAGS', label: 'Paper Towels & Rags' },
      { value: 'TAPES_ADHESIVES', label: 'Tapes & Adhesives' }, { value: 'LABELS_TAGS', label: 'Labels & Tags' },
      { value: 'STORAGE_CONTAINERS', label: 'Storage & Containers' }, { value: 'OTHER', label: 'Other Supplies' },
    ],
  },
];

const ALL_CATEGORY_OPTIONS = CATEGORY_GROUPS.flatMap(g =>
  g.items?.length ? g.items.map(i => ({ ...i, group: g.value, groupLabel: g.label })) : []
);
const getCategoryLabel = (value: string) => {
  const flat = ALL_CATEGORY_OPTIONS.find(c => c.value === value);
  if (flat) return flat.label;
  return CATEGORY_GROUPS.find(g => g.value === value)?.label || value;
};
const getCategoryGroup = (value: string) =>
  CATEGORY_GROUPS.find(g => g.items?.some(i => i.value === value)) || null;

// ── Types ─────────────────────────────────────────────────────────────────────
interface InventoryPart {
  partId: string;
  category: string;
  name: string;
  partNumber: string;
  quantity: number;
  minQuantity: number;
  location: string;
  supplier: string;
  unitCost: number;
  compatibleEquipment?: string[];
  lastRestocked?: string;
  notes?: string;
  itemType?: 'part' | 'food' | 'beverage' | 'chemical' | 'supply' | 'retail';
  expirationDate?: string;
  shelfLifeDays?: number;
  storageTemp?: string;
  fifoOrder?: number;
  batchNumber?: string;
  reorderPoint?: number;
  reorderQuantity?: number;
  tempMin?: number;
  tempMax?: number;
  requiresRefrigeration?: boolean;
  allergens?: string[];
}

type GovCategory = 'apparatus' | 'weapon' | 'uniform' | 'supply';
interface GovItem {
  id: string;
  govCategory: GovCategory;
  name: string;
  serialNumber?: string;
  status: 'available' | 'in-service' | 'maintenance' | 'decommissioned';
  mileage?: number;
  lastService?: string;
  nextService?: string;
  assignedTo?: string;
  lastInspection?: string;
  size?: string;
  condition?: 'Good' | 'Fair' | 'Poor' | 'Inspect';
  quantity?: number;
  unit?: string;
  unitCost?: number;
  notes?: string;
  createdAt: string;
}

type ChemicalType = 'corrosive' | 'flammable' | 'toxic' | 'oxidizer' | 'compressed_gas' | 'reactive' | 'biohazard' | 'radiation' | 'other';
interface HazmatItem {
  id: string;
  chemicalName: string;
  casNumber: string;
  sdsNumber: string;
  chemicalType: ChemicalType;
  hazardClass: string;
  unNumber: string;
  currentQuantity: number;
  maxAllowableQuantity: number;
  reorderPoint: number;
  unit: 'gallons' | 'liters' | 'pounds' | 'kg' | 'units';
  location: string;
  storageRequirements: string;
  supplier: string;
  supplierPhone: string;
  sdsLastReviewed: string;
  sdsNextReview: string;
  primaryHazard: string;
  secondaryHazards: string[];
  ppe: string[];
  emergencyProcedure: string;
  spillProcedure: string;
  disposalMethod: string;
  requiresPermit: boolean;
  permitNumber: string;
  permitExpiry: string;
  isReportable: boolean;
  reportingThreshold: number;
  lastInspectionDate: string;
  nextInspectionDue: string;
  assignedResponsible: string;
  notes: string;
  createdAt: string;
}

const CHEM_TYPE_META: Record<ChemicalType, { label: string; color: string }> = {
  corrosive:     { label: 'Corrosive',     color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  flammable:     { label: 'Flammable',     color: 'bg-red-500/15 text-red-400 border-red-500/30'         },
  toxic:         { label: 'Toxic',         color: 'bg-purple-500/15 text-purple-400 border-purple-500/30'},
  oxidizer:      { label: 'Oxidizer',      color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'},
  compressed_gas:{ label: 'Comp. Gas',     color: 'bg-blue-500/15 text-blue-400 border-blue-500/30'      },
  reactive:      { label: 'Reactive',      color: 'bg-pink-500/15 text-pink-400 border-pink-500/30'      },
  biohazard:     { label: 'Biohazard',     color: 'bg-green-500/15 text-green-400 border-green-500/30'   },
  radiation:     { label: 'Radiation',     color: 'bg-teal-500/15 text-teal-400 border-teal-500/30'      },
  other:         { label: 'Other',         color: 'bg-muted/40 text-muted-foreground border-border'       },
};

const MOCK_HAZMAT: HazmatItem[] = [
  { id: 'hm1', chemicalName: 'Muriatic Acid (HCl 31.5%)', casNumber: '7647-01-0', sdsNumber: 'SDS-001', chemicalType: 'corrosive', hazardClass: '8', unNumber: 'UN1789', currentQuantity: 5, maxAllowableQuantity: 25, reorderPoint: 2, unit: 'gallons', location: 'Chemical Storage Rm A', storageRequirements: 'Ventilated, away from bases', supplier: 'Univar Solutions', supplierPhone: '800-555-0100', sdsLastReviewed: '2025-03-01', sdsNextReview: '2026-03-01', primaryHazard: 'Corrosive — burns skin and eyes', secondaryHazards: ['Inhalation'], ppe: ['Chemical gloves', 'Face shield', 'Apron'], emergencyProcedure: 'Neutralize with sodium bicarbonate', spillProcedure: 'Absorb with dry sand', disposalMethod: 'Neutralize; dispose per RCRA', requiresPermit: false, permitNumber: '', permitExpiry: '', isReportable: true, reportingThreshold: 500, lastInspectionDate: '2026-04-01', nextInspectionDue: '2026-07-01', assignedResponsible: 'J. Smith', notes: '', createdAt: '2025-01-15' },
  { id: 'hm2', chemicalName: 'Diesel Fuel #2', casNumber: '68476-34-6', sdsNumber: 'SDS-002', chemicalType: 'flammable', hazardClass: '3', unNumber: 'UN1993', currentQuantity: 200, maxAllowableQuantity: 500, reorderPoint: 50, unit: 'gallons', location: 'Fuel Storage Pad', storageRequirements: 'Grounded containers, no ignition sources', supplier: 'Fleet Fuels Inc', supplierPhone: '800-555-0200', sdsLastReviewed: '2025-01-10', sdsNextReview: '2026-01-10', primaryHazard: 'Flammable liquid', secondaryHazards: ['Inhalation of vapors'], ppe: ['Chemical gloves', 'Safety glasses'], emergencyProcedure: 'Remove ignition sources', spillProcedure: 'Contain with absorbent boom', disposalMethod: 'Hazardous waste contractor', requiresPermit: true, permitNumber: 'SPCC-2024-001', permitExpiry: '2027-12-31', isReportable: true, reportingThreshold: 1320, lastInspectionDate: '2026-03-15', nextInspectionDue: '2026-06-15', assignedResponsible: 'M. Torres', notes: 'SPCC plan on file', createdAt: '2024-06-01' },
  { id: 'hm3', chemicalName: 'Sodium Hypochlorite 12.5%', casNumber: '7681-52-9', sdsNumber: 'SDS-003', chemicalType: 'corrosive', hazardClass: '8', unNumber: 'UN1791', currentQuantity: 30, maxAllowableQuantity: 100, reorderPoint: 10, unit: 'gallons', location: 'Treatment Plant Storage', storageRequirements: 'Cool, dark area; away from acids', supplier: 'Univar Solutions', supplierPhone: '800-555-0100', sdsLastReviewed: '2024-09-01', sdsNextReview: '2025-09-01', primaryHazard: 'Oxidizer / Corrosive', secondaryHazards: ['Chlorine gas generation if mixed with acid'], ppe: ['Chemical gloves', 'Safety glasses', 'Apron'], emergencyProcedure: 'Dilute with water', spillProcedure: 'Absorb with vermiculite', disposalMethod: 'Dilute and neutralize', requiresPermit: false, permitNumber: '', permitExpiry: '', isReportable: false, reportingThreshold: 0, lastInspectionDate: '2026-02-01', nextInspectionDue: '2026-08-01', assignedResponsible: 'R. Patel', notes: 'SDS review overdue', createdAt: '2024-03-10' },
];

const EMPTY_HAZMAT_FORM = { chemicalName: '', casNumber: '', sdsNumber: '', chemicalType: 'other' as ChemicalType, hazardClass: '', unNumber: '', currentQuantity: '', maxAllowableQuantity: '', reorderPoint: '', unit: 'gallons' as HazmatItem['unit'], location: '', storageRequirements: '', supplier: '', supplierPhone: '', sdsLastReviewed: '', sdsNextReview: '', primaryHazard: '', secondaryHazards: '', ppe: '', emergencyProcedure: '', spillProcedure: '', disposalMethod: '', requiresPermit: false, permitNumber: '', permitExpiry: '', isReportable: false, reportingThreshold: '', assignedResponsible: '', notes: '' };

type AddItemType = 'parts' | 'food' | 'apparel' | 'retail' | 'pharmacy';

const EMPTY_PARTS_FORM = { name: '', partNumber: '', category: '', quantity: '', minQuantity: '', location: '', supplier: '', unitCost: '', compatibleEquipment: '' };
const EMPTY_FOOD_FORM = { name: '', quantity: '', unit: 'each', batchNumber: '', expirationDate: '', storageTemp: '', fifoOrder: '', allergens: '', supplier: '', unitCost: '' };
const EMPTY_APPAREL_FORM = { name: '', sku: '', size: '', color: '', season: '', quantity: '', reorderPoint: '', department: '', unitCost: '' };
const EMPTY_RETAIL_FORM = { name: '', sku: '', quantity: '', reorderPoint: '', supplier: '', unitCost: '' };
const EMPTY_PHARMACY_FORM = { name: '', ndc: '', expirationDate: '', quantity: '', storageTemp: '', controlled: 'no', unitCost: '' };
const EMPTY_GOV_FORM = { name: '', govCategory: 'apparatus' as GovCategory, serialNumber: '', status: 'available' as GovItem['status'], mileage: '', lastService: '', nextService: '', assignedTo: '', lastInspection: '', size: '', condition: 'Good' as GovItem['condition'], quantity: '1', unit: 'each', notes: '', unitCost: '' };

// ── Mock gov data ─────────────────────────────────────────────────────────────
const MOCK_GOV_ITEMS: GovItem[] = [
  { id: 'g1', govCategory: 'apparatus', name: 'Engine 1', serialNumber: 'E1-2019-002', status: 'available', mileage: 42310, lastService: '2026-01-15', nextService: '2026-07-15', assignedTo: 'Station 1', condition: 'Good', createdAt: '2024-01-01' },
  { id: 'g2', govCategory: 'apparatus', name: 'Ladder 1', serialNumber: 'L1-2020-007', status: 'available', mileage: 61200, lastService: '2025-12-01', nextService: '2026-06-01', assignedTo: 'Station 1', condition: 'Good', createdAt: '2024-01-01' },
  { id: 'g3', govCategory: 'apparatus', name: 'Rescue 1', serialNumber: 'R1-2018-003', status: 'maintenance', mileage: 29840, lastService: '2025-11-20', nextService: '2026-05-20', assignedTo: 'Shop', condition: 'Fair', createdAt: '2024-01-01' },
  { id: 'g4', govCategory: 'apparatus', name: 'Police Unit 14', serialNumber: 'P14-2022-014', status: 'available', mileage: 88450, lastService: '2026-02-10', nextService: '2026-08-10', assignedTo: 'Patrol Zone 2', condition: 'Good', createdAt: '2024-01-01' },
  { id: 'g5', govCategory: 'weapon', name: 'Glock 17', serialNumber: 'G34219', status: 'in-service', assignedTo: 'Ofc. A. Chen', lastInspection: '2026-01-10', condition: 'Good', quantity: 1, createdAt: '2024-01-01' },
  { id: 'g6', govCategory: 'weapon', name: 'AR-15 Patrol Rifle', serialNumber: 'AR00412', status: 'in-service', assignedTo: 'Ofc. M. Williams', lastInspection: '2026-01-10', condition: 'Good', quantity: 1, createdAt: '2024-01-01' },
  { id: 'g7', govCategory: 'weapon', name: 'TASER X26', serialNumber: 'T0091', status: 'available', lastInspection: '2026-01-15', condition: 'Good', quantity: 8, createdAt: '2024-01-01' },
  { id: 'g8', govCategory: 'uniform', name: 'Turnout Gear Set', size: 'L', assignedTo: 'FF J. Martinez', status: 'in-service', lastInspection: '2025-12-01', condition: 'Good', quantity: 1, createdAt: '2024-01-01' },
  { id: 'g9', govCategory: 'uniform', name: 'SCBA Air Pack', serialNumber: 'SCBA-004', status: 'available', lastInspection: '2026-01-05', condition: 'Inspect', quantity: 6, createdAt: '2024-01-01' },
  { id: 'g10', govCategory: 'uniform', name: 'Ballistic Vest (Level IIIA)', size: 'M', assignedTo: 'Ofc. A. Chen', status: 'in-service', lastInspection: '2026-02-01', condition: 'Good', quantity: 1, createdAt: '2024-01-01' },
  { id: 'g11', govCategory: 'supply', name: 'Latex Gloves (Box)', status: 'available', quantity: 24, unit: 'boxes', condition: 'Good', createdAt: '2024-01-01' },
  { id: 'g12', govCategory: 'supply', name: 'Road Flares', status: 'available', quantity: 48, unit: 'each', condition: 'Good', createdAt: '2024-01-01' },
];

export default function InventoryLibrary() {
  const { user } = useAuth();
  const facilityId = user?.facilityId || 'facility-001';

  // Facility-scoped localStorage keys — prevents cross-tenant data collision
  const INV_KEY      = `nexum_inventory_${facilityId}`;
  const CHECKOUT_KEY = `inventory_checkout_logs_${facilityId}`;
  const TEMP_KEY     = `inventory_temp_logs_${facilityId}`;
  const GOV_KEY      = `gov_inventory_${facilityId}`;

  // ── State ────────────────────────────────────────────────────────────────────
  const [inventory, setInventory] = useState<InventoryPart[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof InventoryPart>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('inventory');

  // Resources tab state
  const [resourceSummary, setResourceSummary] = useState<ResourceSummary | null>(null);
  const [resourceVendors, setResourceVendors] = useState<ResourceVendor[]>([]);
  const [floatData, setFloatData] = useState<FloatTimeData[]>([]);
  const [pmIntervals, setPmIntervals] = useState<PMInterval[]>([]);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: '', specialty: '', contact: '', phone: '', email: '', address: '',
    avgLeadTimeDays: '', notes: '', linkedSystems: '', partsSupplied: '',
  });
  const [vendorSubmitting, setVendorSubmitting] = useState(false);

  // checkout / temp logs — facility-scoped
  const [checkoutLogs, setCheckoutLogs] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(CHECKOUT_KEY) || '[]'); } catch { return []; }
  });
  const [checkoutForm, setCheckoutForm] = useState({ itemId: '', itemName: '', quantity: 1, checkedOutBy: '', job: '', notes: '', action: 'checkout' });
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [tempLogs, setTempLogs] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(TEMP_KEY) || '[]'); } catch { return []; }
  });
  const [showTempLog, setShowTempLog] = useState(false);
  const [tempForm, setTempForm] = useState({ itemId: '', itemName: '', temp: '', unit: 'F', location: '', loggedBy: '', notes: '' });
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Add Inventory modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addItemType, setAddItemType] = useState<AddItemType>('parts');
  const [partsForm, setPartsForm] = useState({ ...EMPTY_PARTS_FORM });
  const [foodForm, setFoodForm] = useState({ ...EMPTY_FOOD_FORM });
  const [apparelForm, setApparelForm] = useState({ ...EMPTY_APPAREL_FORM });
  const [retailForm, setRetailForm] = useState({ ...EMPTY_RETAIL_FORM });
  const [pharmacyForm, setPharmacyForm] = useState({ ...EMPTY_PHARMACY_FORM });
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Chemical / Hazmat — facility-scoped
  const HAZMAT_KEY = `nexum_hazmat_inventory`;
  const [hazmatItems, setHazmatItems] = useState<HazmatItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HAZMAT_KEY) || '[]');
      return saved.length > 0 ? saved : MOCK_HAZMAT;
    } catch { return MOCK_HAZMAT; }
  });
  const [hazmatTypeFilter, setHazmatTypeFilter] = useState<ChemicalType | 'all'>('all');
  const [hazmatSearch, setHazmatSearch] = useState('');
  const [showAddHazmat, setShowAddHazmat] = useState(false);
  const [hazmatForm, setHazmatForm] = useState({ ...EMPTY_HAZMAT_FORM });
  const [hazmatStep, setHazmatStep] = useState(1);
  const [hazmatSubmitting, setHazmatSubmitting] = useState(false);

  const saveHazmat = (items: HazmatItem[]) => {
    setHazmatItems(items);
    localStorage.setItem(HAZMAT_KEY, JSON.stringify(items));
  };

  const addHazmatItem = () => {
    const item: HazmatItem = {
      id: `hm-${Date.now()}`,
      ...hazmatForm,
      currentQuantity:     parseFloat(hazmatForm.currentQuantity as any) || 0,
      maxAllowableQuantity:parseFloat(hazmatForm.maxAllowableQuantity as any) || 0,
      reorderPoint:        parseFloat(hazmatForm.reorderPoint as any) || 0,
      reportingThreshold:  parseFloat(hazmatForm.reportingThreshold as any) || 0,
      secondaryHazards:    String(hazmatForm.secondaryHazards).split(',').map(s => s.trim()).filter(Boolean),
      ppe:                 String(hazmatForm.ppe).split(',').map(s => s.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    saveHazmat([item, ...hazmatItems]);
    setHazmatForm({ ...EMPTY_HAZMAT_FORM });
    setHazmatStep(1);
    setShowAddHazmat(false);
    toast.success(`Chemical added — ${item.chemicalName}`);
  };

  const deleteHazmat = (id: string) => saveHazmat(hazmatItems.filter(h => h.id !== id));

  const visibleHazmat = hazmatItems.filter(h => {
    if (hazmatTypeFilter !== 'all' && h.chemicalType !== hazmatTypeFilter) return false;
    if (hazmatSearch) {
      const q = hazmatSearch.toLowerCase();
      if (!h.chemicalName.toLowerCase().includes(q) && !h.casNumber.includes(q) && !h.location.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const today = new Date();
  const hazmatStats = {
    total:       hazmatItems.length,
    hazmat:      hazmatItems.filter(h => ['corrosive','flammable','toxic','oxidizer','reactive','biohazard','radiation'].includes(h.chemicalType)).length,
    sdsDue:      hazmatItems.filter(h => h.sdsNextReview && new Date(h.sdsNextReview) <= today).length,
    permitExp:   hazmatItems.filter(h => h.requiresPermit && h.permitExpiry && Math.ceil((new Date(h.permitExpiry).getTime() - today.getTime()) / 86400000) <= 30).length,
    reportable:  hazmatItems.filter(h => h.isReportable && h.currentQuantity >= h.reportingThreshold).length,
  };

  // Gov / Public Safety — facility-scoped
  const [govItems, setGovItems] = useState<GovItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(GOV_KEY) || '[]');
      return saved.length > 0 ? saved : MOCK_GOV_ITEMS;
    } catch { return MOCK_GOV_ITEMS; }
  });
  const [govCategoryFilter, setGovCategoryFilter] = useState<GovCategory | 'all'>('all');
  const [showAddGovModal, setShowAddGovModal] = useState(false);
  const [govForm, setGovForm] = useState({ ...EMPTY_GOV_FORM });
  const [govSubmitting, setGovSubmitting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { toast } = useToast();

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchInventory(); }, []);
  useEffect(() => { filterAndSortInventory(); }, [inventory, searchTerm, categoryFilter, stockFilter, sortField, sortDirection, activeGroupFilter]);
  useEffect(() => {
    if (activeTab === 'resources' && !resourcesLoaded) loadResources();
  }, [activeTab]);

  const loadResources = async () => {
    setResourcesLoading(true);
    try {
      const [summary, vendorsResp, floatResp, intervalsResp] = await Promise.allSettled([
        getResourceSummary(),
        getResourceVendors(),
        getFloatTime(),
        getPMIntervals(),
      ]);
      if (summary.status === 'fulfilled') setResourceSummary(summary.value);
      if (vendorsResp.status === 'fulfilled') setResourceVendors(vendorsResp.value.vendors || []);
      if (floatResp.status === 'fulfilled') setFloatData(floatResp.value.floatData || []);
      if (intervalsResp.status === 'fulfilled') setPmIntervals(intervalsResp.value.intervals || []);
      setResourcesLoaded(true);
    } catch { /* silent */ } finally { setResourcesLoading(false); }
  };

  const handleAddVendor = async () => {
    if (!vendorForm.name) return;
    setVendorSubmitting(true);
    try {
      await createResourceVendor({
        name: vendorForm.name,
        specialty: vendorForm.specialty,
        contact: vendorForm.contact,
        phone: vendorForm.phone,
        email: vendorForm.email,
        address: vendorForm.address,
        avgLeadTimeDays: Number(vendorForm.avgLeadTimeDays) || 0,
        notes: vendorForm.notes,
        linkedSystems: vendorForm.linkedSystems.split(',').map(s => s.trim()).filter(Boolean),
        partsSupplied: vendorForm.partsSupplied.split(',').map(s => s.trim()).filter(Boolean),
      });
      toast({ title: 'Vendor added', description: vendorForm.name });
      setShowAddVendor(false);
      setVendorForm({ name: '', specialty: '', contact: '', phone: '', email: '', address: '', avgLeadTimeDays: '', notes: '', linkedSystems: '', partsSupplied: '' });
      setResourcesLoaded(false);
      loadResources();
    } catch { toast({ title: 'Error', description: 'Could not save vendor', variant: 'destructive' }); }
    finally { setVendorSubmitting(false); }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCheckout = (item: any, action: 'checkout' | 'checkin' | 'verify') => {
    setSelectedItem(item);
    setCheckoutForm({ itemId: item.partId || item.id, itemName: item.name, quantity: 1, checkedOutBy: '', job: '', notes: '', action });
    setShowCheckoutModal(true);
  };

  const submitCheckout = async () => {
    if (!checkoutForm.checkedOutBy) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    const log = { id: Date.now().toString(), ...checkoutForm, timestamp: new Date().toISOString(), facilityId, logType: 'checkout' };
    const updated = [log, ...checkoutLogs].slice(0, 500);
    setCheckoutLogs(updated);
    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(updated));
    setShowCheckoutModal(false);
    toast({ title: `Item ${checkoutForm.action === 'checkout' ? 'checked out' : checkoutForm.action === 'checkin' ? 'returned' : 'verified'}`, description: `${checkoutForm.itemName} — ${checkoutForm.checkedOutBy}` });
    // Persist to backend
    try {
      const token = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
      await fetch(`${API_BASE_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(log),
      });
    } catch { /* backend unavailable — localStorage is the fallback */ }
  };

  const submitTempLog = async () => {
    if (!tempForm.temp || !tempForm.loggedBy) return;
    const log = { ...tempForm, id: Date.now().toString(), timestamp: new Date().toISOString(), facilityId, logType: 'temperature' };
    const updated = [log, ...tempLogs].slice(0, 200);
    setTempLogs(updated);
    localStorage.setItem(TEMP_KEY, JSON.stringify(updated));
    setShowTempLog(false);
    setTempForm({ itemId: '', itemName: '', temp: '', unit: 'F', location: '', loggedBy: '', notes: '' });
    // Persist to backend
    try {
      const token = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token') || '';
      await fetch(`${API_BASE_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(log),
      });
    } catch { /* backend unavailable — localStorage is the fallback */ }
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const response = await fetch(`${API_BASE_URL}/inventory`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setInventory(data.parts || []);
    } catch {
      // Load from localStorage if API unavailable
      try {
        const saved = JSON.parse(localStorage.getItem(INV_KEY) || '[]');
        setInventory(saved);
      } catch { setInventory([]); }
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortInventory = () => {
    let filtered = [...inventory];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(term) || item.partNumber?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) || item.supplier?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term)
      );
    }
    if (activeGroupFilter !== 'all') {
      const group = CATEGORY_GROUPS.find(g => g.value === activeGroupFilter);
      if (group?.items?.length) {
        const groupCats = group.items.map(i => i.value);
        filtered = filtered.filter(item => groupCats.includes(item.category) || item.category === activeGroupFilter);
      }
    }
    if (categoryFilter !== 'all') filtered = filtered.filter(item => item.category === categoryFilter);
    if (stockFilter === 'low') filtered = filtered.filter(item => item.quantity <= item.minQuantity);
    else if (stockFilter === 'out') filtered = filtered.filter(item => item.quantity === 0);
    else if (stockFilter === 'ok') filtered = filtered.filter(item => item.quantity > item.minQuantity);
    filtered.sort((a, b) => {
      const aVal = a[sortField]; const bVal = b[sortField];
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      return 0;
    });
    setFilteredInventory(filtered);
  };

  const handleSort = (field: keyof InventoryPart) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const getStockStatus = (item: InventoryPart) => {
    if (item.quantity === 0) return { label: 'Out of Stock', class: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (item.quantity <= item.minQuantity) return { label: 'Low Stock', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    return { label: 'In Stock', class: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Part Number', 'Category', 'Quantity', 'Min Qty', 'Location', 'Supplier', 'Unit Cost'],
      ...filteredInventory.map(item => [item.name, item.partNumber, getCategoryLabel(item.category), item.quantity, item.minQuantity, item.location, item.supplier, `$${item.unitCost?.toFixed(2) || '0.00'}`])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `inventory-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filteredInventory.length} items exported` });
  };

  // ── Add Inventory submit ──────────────────────────────────────────────────────
  const submitAddItem = async () => {
    setAddSubmitting(true);
    try {
      let newItem: any = {};
      const partId = `item-${Date.now()}`;
      const createdAt = new Date().toISOString();

      if (addItemType === 'parts') {
        if (!partsForm.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
        newItem = { partId, itemType: 'part', ...partsForm, quantity: parseInt(partsForm.quantity) || 0, minQuantity: parseInt(partsForm.minQuantity) || 0, unitCost: parseFloat(partsForm.unitCost) || 0, compatibleEquipment: partsForm.compatibleEquipment ? partsForm.compatibleEquipment.split(',').map(s => s.trim()) : [], createdAt };
      } else if (addItemType === 'food') {
        if (!foodForm.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
        newItem = { partId, itemType: 'food', category: 'FOOD', ...foodForm, quantity: parseInt(foodForm.quantity) || 0, minQuantity: 0, fifoOrder: parseInt(foodForm.fifoOrder) || 0, unitCost: parseFloat(foodForm.unitCost) || 0, allergens: foodForm.allergens ? foodForm.allergens.split(',').map(s => s.trim()).filter(Boolean) : [], createdAt };
      } else if (addItemType === 'apparel') {
        if (!apparelForm.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
        newItem = { partId, itemType: 'supply', category: 'APPAREL', partNumber: apparelForm.sku, ...apparelForm, quantity: parseInt(apparelForm.quantity) || 0, minQuantity: parseInt(apparelForm.reorderPoint) || 0, unitCost: parseFloat(apparelForm.unitCost) || 0, createdAt };
      } else if (addItemType === 'retail') {
        if (!retailForm.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
        newItem = { partId, itemType: 'retail', category: 'RETAIL', partNumber: retailForm.sku, ...retailForm, quantity: parseInt(retailForm.quantity) || 0, minQuantity: parseInt(retailForm.reorderPoint) || 0, unitCost: parseFloat(retailForm.unitCost) || 0, createdAt };
      } else if (addItemType === 'pharmacy') {
        if (!pharmacyForm.name || !pharmacyForm.expirationDate) { toast({ title: 'Name and expiry date required', variant: 'destructive' }); return; }
        newItem = { partId, itemType: 'chemical', category: 'PHARMACY', partNumber: pharmacyForm.ndc, ...pharmacyForm, quantity: parseInt(pharmacyForm.quantity) || 0, minQuantity: 0, unitCost: parseFloat(pharmacyForm.unitCost) || 0, createdAt };
      }

      // Save to localStorage
      const saved = (() => { try { return JSON.parse(localStorage.getItem(INV_KEY) || '[]'); } catch { return []; } })();
      const updated = [newItem, ...saved];
      localStorage.setItem(INV_KEY, JSON.stringify(updated));
      setInventory(prev => [newItem, ...prev]);

      // POST to API
      try {
        const token = localStorage.getItem('nexum_access_token');
        await fetch(`${API_BASE_URL}/inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newItem),
        });
      } catch { /* API save failed silently — localStorage is source of truth */ }

      toast({ title: 'Item added', description: newItem.name });
      setShowAddModal(false);
      setPartsForm({ ...EMPTY_PARTS_FORM });
      setFoodForm({ ...EMPTY_FOOD_FORM });
      setApparelForm({ ...EMPTY_APPAREL_FORM });
      setRetailForm({ ...EMPTY_RETAIL_FORM });
      setPharmacyForm({ ...EMPTY_PHARMACY_FORM });
    } finally {
      setAddSubmitting(false);
    }
  };

  // ── Add Gov Item submit ───────────────────────────────────────────────────────
  const submitAddGovItem = async () => {
    if (!govForm.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setGovSubmitting(true);
    try {
      const newItem: GovItem = {
        id: `gov-${Date.now()}`,
        govCategory: govForm.govCategory,
        name: govForm.name,
        serialNumber: govForm.serialNumber || undefined,
        status: govForm.status,
        mileage: govForm.mileage ? parseInt(govForm.mileage) : undefined,
        lastService: govForm.lastService || undefined,
        nextService: govForm.nextService || undefined,
        assignedTo: govForm.assignedTo || undefined,
        lastInspection: govForm.lastInspection || undefined,
        size: govForm.size || undefined,
        condition: govForm.condition,
        quantity: parseInt(govForm.quantity) || 1,
        unit: govForm.unit || 'each',
        unitCost: parseFloat(govForm.unitCost) || undefined,
        notes: govForm.notes || undefined,
        createdAt: new Date().toISOString(),
      };
      const updated = [newItem, ...govItems];
      setGovItems(updated);
      localStorage.setItem(GOV_KEY, JSON.stringify(updated));

      try {
        const token = localStorage.getItem('nexum_access_token');
        await fetch(`${API_BASE_URL}/inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ...newItem, category: 'GOV_' + newItem.govCategory.toUpperCase() }),
        });
      } catch { /* silent */ }

      toast({ title: 'Gov item added', description: newItem.name });
      setShowAddGovModal(false);
      setGovForm({ ...EMPTY_GOV_FORM });
    } finally {
      setGovSubmitting(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(i => i.quantity <= i.minQuantity && i.quantity > 0).length;
  const outOfStockCount = inventory.filter(i => i.quantity === 0).length;
  const totalValue = inventory.reduce((sum, i) => sum + (i.quantity * (i.unitCost || 0)), 0);
  const govTotalValue = govItems.reduce((sum, i) => sum + ((i.quantity || 1) * (i.unitCost || 0)), 0);
  const subCategoryOptions = activeGroupFilter === 'all' ? ALL_CATEGORY_OPTIONS : CATEGORY_GROUPS.find(g => g.value === activeGroupFilter)?.items || [];

  // Gov stats
  const filteredGovItems = govCategoryFilter === 'all' ? govItems : govItems.filter(i => i.govCategory === govCategoryFilter);
  const govAvailable = govItems.filter(i => i.status === 'available').length;
  const govMaintenance = govItems.filter(i => i.status === 'maintenance').length;
  const govInspectNeeded = govItems.filter(i => i.condition === 'Inspect' || i.condition === 'Poor').length;
  const govCompliance = govItems.length > 0 ? Math.round(((govItems.length - govMaintenance - govInspectNeeded) / govItems.length) * 100) : 100;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <ParticleBackground />
      <NexumBranding />
      <div className="relative z-10 p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Inventory Library</h1>
            <p className="text-muted-foreground text-sm">Parts, supplies, and materials management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />Import
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Inventory
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Items', value: totalItems, icon: Package, color: 'text-primary' },
            { label: 'Low Stock', value: lowStockCount, icon: TrendingDown, color: 'text-yellow-400' },
            { label: 'Out of Stock', value: outOfStockCount, icon: AlertTriangle, color: 'text-destructive' },
            { label: 'Total Value', value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-success' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="glass-panel">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={cn('w-8 h-8', color)} />
                <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {/* Tab bar */}
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted/30 border border-border/30 p-1 gap-1 flex-wrap">
            {([
              { value: 'inventory',   label: 'Inventory',           icon: Package },
              { value: 'logger',      label: 'Inventory Logger',     icon: ClipboardList },
              { value: 'gov',         label: 'Gov / Public Safety',  icon: Shield },
              { value: 'retail',      label: 'Retail',               icon: ShoppingCart },
              { value: 'hazmat',      label: 'Chemical & Hazmat',    icon: FlaskConical },
              { value: 'resources',   label: 'Resources',            icon: Building2 },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setActiveTab(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
                  activeTab === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* ── Tab: Inventory ─────────────────────────────────────────────────── */}
          {activeTab === 'inventory' && <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_GROUPS.map(group => {
                const Icon = group.icon;
                const isActive = activeGroupFilter === group.value;
                return (
                  <button key={group.value} onClick={() => { setActiveGroupFilter(group.value); setCategoryFilter('all'); }}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                      isActive ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-muted/30 border-border/40 text-muted-foreground hover:border-border')}>
                    <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : group.color)} />{group.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search parts, suppliers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Sub-category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Categories</SelectItem>
                  {subCategoryOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Stock level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="ok">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="flex items-center h-10 px-3">
                {filteredInventory.length} item{filteredInventory.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <Card className="glass-panel">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground"><Package className="w-8 h-8 mx-auto mb-2 animate-pulse" />Loading inventory...</div>
                ) : filteredInventory.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No inventory items found</p>
                    <p className="text-sm mt-1">{searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' ? 'Try adjusting your filters' : 'Click "Add Inventory" to get started'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {[{ key: 'name', label: 'Name' }, { key: 'category', label: 'Category' }, { key: 'partNumber', label: 'Part #' }, { key: 'quantity', label: 'Qty' }, { key: 'location', label: 'Location' }, { key: 'supplier', label: 'Supplier' }, { key: 'unitCost', label: 'Unit Cost' }, { key: 'createdAt', label: 'Date Added' }].map(col => (
                          <TableHead key={col.key} className="cursor-pointer hover:text-foreground" onClick={() => handleSort(col.key as keyof InventoryPart)}>
                            <div className="flex items-center gap-1">{col.label}{sortField === col.key && <ArrowUpDown className="w-3 h-3" />}</div>
                          </TableHead>
                        ))}
                        <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.map(item => {
                        const stock = getStockStatus(item);
                        const group = getCategoryGroup(item.category);
                        const GroupIcon = group?.icon || Package;
                        return (
                          <TableRow key={item.partId} className="hover:bg-muted/20">
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell><div className="flex items-center gap-1.5"><GroupIcon className={cn('w-3.5 h-3.5', group?.color || 'text-muted-foreground')} /><span className="text-xs text-muted-foreground">{getCategoryLabel(item.category)}</span></div></TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{item.partNumber}</TableCell>
                            <TableCell><div className="flex items-center gap-2"><span className={cn('font-bold', item.quantity === 0 ? 'text-destructive' : item.quantity <= item.minQuantity ? 'text-yellow-400' : '')}>{item.quantity}</span><span className="text-xs text-muted-foreground">/ {item.minQuantity} min</span></div></TableCell>
                            <TableCell className="text-sm">{item.location}</TableCell>
                            <TableCell className="text-sm">{item.supplier}</TableCell>
                            <TableCell className="text-sm">${item.unitCost?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge variant="outline" className={cn('text-xs', stock.class)}>{stock.label}</Badge>
                                {(item as any).source === 'odoo' && <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-400 border-teal-500/30" title="Synced from Odoo">Odoo</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleCheckout(item, 'checkout')} className="px-2 py-1 text-[10px] rounded border border-orange-400/30 text-orange-400 hover:bg-orange-400/10 transition-colors">Out</button>
                                <button onClick={() => handleCheckout(item, 'checkin')} className="px-2 py-1 text-[10px] rounded border border-green-400/30 text-green-400 hover:bg-green-400/10 transition-colors">Return</button>
                                <button onClick={() => handleCheckout(item, 'verify')} className="px-2 py-1 text-[10px] rounded border border-blue-400/30 text-blue-400 hover:bg-blue-400/10 transition-colors">Verify</button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>}

          {/* ── Tab: Inventory Logger ──────────────────────────────────────────── */}
          {activeTab === 'logger' && <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" />Checkout / Return / Verify Log</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{checkoutLogs.length} entries stored locally</p>
              </div>
              <Button size="sm" variant="outline" className="border-border/50" onClick={() => { setSelectedItem(null); setCheckoutForm({ itemId: '', itemName: '', quantity: 1, checkedOutBy: '', job: '', notes: '', action: 'checkout' }); setShowCheckoutModal(true); }}>
                <Plus className="w-4 h-4 mr-1.5" />Log Entry
              </Button>
            </div>
            {checkoutLogs.length === 0 ? (
              <Card className="glass-panel"><CardContent className="p-12 text-center text-muted-foreground"><History className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-medium">No log entries yet</p><p className="text-sm mt-1">Use the Check Out / Return / Verify buttons on inventory items to create log entries.</p></CardContent></Card>
            ) : (
              <Card className="glass-panel">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead><TableHead>Item</TableHead><TableHead>Action</TableHead>
                        <TableHead>Qty</TableHead><TableHead>Staff Member</TableHead><TableHead>Job / WO</TableHead><TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkoutLogs.map((log: any) => (
                        <TableRow key={log.id} className="hover:bg-muted/20 text-sm">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap"><div className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(log.timestamp).toLocaleString()}</div></TableCell>
                          <TableCell className="font-medium">{log.itemName}</TableCell>
                          <TableCell><Badge variant="outline" className={cn('text-[10px]', log.action === 'checkout' ? 'border-orange-400/30 text-orange-400' : log.action === 'checkin' ? 'border-green-400/30 text-green-400' : 'border-blue-400/30 text-blue-400')}>{log.action === 'checkin' ? 'Return' : log.action === 'verify' ? 'Verify' : 'Check Out'}</Badge></TableCell>
                          <TableCell>{log.quantity}</TableCell>
                          <TableCell className="flex items-center gap-1"><User className="w-3 h-3 text-muted-foreground" />{log.checkedOutBy}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{log.job || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{log.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>}

          {/* ── Tab: Gov / Public Safety ───────────────────────────────────────── */}
          {activeTab === 'gov' && <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-base font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Gov / Public Safety Inventory</h2>
              <Button size="sm" onClick={() => setShowAddGovModal(true)}><Plus className="w-4 h-4 mr-1.5" />Add Item</Button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Compliance %', value: `${govCompliance}%`, icon: CheckCircle, color: govCompliance >= 90 ? 'text-green-400' : govCompliance >= 70 ? 'text-yellow-400' : 'text-red-400' },
                { label: 'Available Units', value: govAvailable, icon: Truck, color: 'text-green-400' },
                { label: 'In Maintenance', value: govMaintenance, icon: AlertTriangle, color: govMaintenance > 0 ? 'text-yellow-400' : 'text-muted-foreground' },
                { label: 'Need Inspection', value: govInspectNeeded, icon: AlertOctagon, color: govInspectNeeded > 0 ? 'text-orange-400' : 'text-muted-foreground' },
                { label: 'Asset Value', value: govTotalValue > 0 ? `$${govTotalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—', icon: TrendingUp, color: 'text-primary' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="neon-border">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1"><p className="text-xs text-muted-foreground">{label}</p><Icon className={cn('w-4 h-4', color)} /></div>
                    <p className={cn('text-xl font-bold', color)}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Compliance bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Fleet / Inventory Compliance</span><span className={govCompliance >= 90 ? 'text-green-400' : 'text-yellow-400'}>{govCompliance}%</span></div>
              <Progress value={govCompliance} className="h-2" />
            </div>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              {([
                { value: 'all', label: 'All', icon: Package },
                { value: 'apparatus', label: 'Apparatus / Fleet', icon: Truck },
                { value: 'weapon', label: 'Weapons', icon: Lock },
                { value: 'uniform', label: 'Uniforms / PPE', icon: Shield },
                { value: 'supply', label: 'Supplies', icon: Box },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setGovCategoryFilter(value)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    govCategoryFilter === value ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-muted/30 border-border/40 text-muted-foreground hover:border-border')}>
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>

            {/* Items table */}
            <Card className="glass-panel">
              <CardContent className="p-0">
                {filteredGovItems.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground"><Shield className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="font-medium">No items in this category</p></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Serial / ID</TableHead>
                        <TableHead>Status</TableHead><TableHead>Assigned To</TableHead>
                        <TableHead>Mileage / Qty</TableHead><TableHead>Last Service / Inspection</TableHead>
                        <TableHead>Next Service</TableHead><TableHead>Condition</TableHead>
                        <TableHead>Date Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGovItems.map(item => {
                        const statusColors: Record<string, string> = {
                          available: 'border-green-400/40 text-green-400',
                          'in-service': 'border-blue-400/40 text-blue-400',
                          maintenance: 'border-yellow-400/40 text-yellow-400',
                          decommissioned: 'border-muted-foreground/30 text-muted-foreground',
                        };
                        const conditionColor = item.condition === 'Good' ? 'text-green-400' : item.condition === 'Fair' ? 'text-yellow-400' : 'text-red-400';
                        return (
                          <TableRow key={item.id} className="hover:bg-muted/20 text-sm">
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] capitalize">{item.govCategory}</Badge></TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{item.serialNumber || '—'}</TableCell>
                            <TableCell><Badge variant="outline" className={cn('text-[10px] capitalize', statusColors[item.status] || '')}>{item.status.replace('-', ' ')}</Badge></TableCell>
                            <TableCell className="text-xs">{item.assignedTo || '—'}</TableCell>
                            <TableCell className="text-xs">
                              {item.govCategory === 'apparatus' && item.mileage != null ? `${item.mileage.toLocaleString()} mi` : item.quantity != null ? `${item.quantity} ${item.unit || 'ea'}` : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.lastService || item.lastInspection || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.nextService || '—'}</TableCell>
                            <TableCell><span className={cn('text-xs font-medium', conditionColor)}>{item.condition || '—'}</span></TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>}

          {/* ── Tab: Retail ────────────────────────────────────────────────────── */}
          {activeTab === 'retail' && <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-primary" />Food &amp; Retail Items</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Perishable items, FIFO tracking, and temperature logs</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-border/50" onClick={() => { setAddItemType('food'); setShowAddModal(true); }}>
                  <Plus className="w-4 h-4 mr-1.5" />Add Item
                </Button>
                <Button size="sm" variant="outline" className="border-border/50" onClick={() => setShowTempLog(true)}>
                  <Thermometer className="w-4 h-4 mr-1.5" />Log Temperature
                </Button>
              </div>
            </div>

            {(() => {
              const foodItems = inventory.filter((i: InventoryPart) =>
                i.itemType === 'food' || i.itemType === 'beverage' || i.itemType === 'retail' || i.itemType === 'supply' || i.expirationDate
              );
              return foodItems.length === 0 ? (
                <Card className="glass-panel">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No food or retail items found</p>
                    <p className="text-sm mt-1">Click "Add Item" to add food, beverage, or retail inventory.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass-panel">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Qty</TableHead>
                          <TableHead>Location</TableHead><TableHead>Expiry</TableHead><TableHead>Storage Temp</TableHead>
                          <TableHead>FIFO</TableHead><TableHead>Allergens</TableHead><TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {foodItems.sort((a, b) => (a.fifoOrder || 99) - (b.fifoOrder || 99)).map(item => {
                          const days = item.expirationDate ? Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / 86400000) : null;
                          const expiryColor = days === null ? '' : days < 0 ? 'text-red-400' : days <= 3 ? 'text-orange-400' : days <= 7 ? 'text-yellow-400' : 'text-green-400';
                          return (
                            <TableRow key={item.partId} className={cn('hover:bg-muted/20 text-sm', days !== null && days <= 3 && 'bg-red-400/5')}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px] capitalize">{item.itemType || 'item'}</Badge></TableCell>
                              <TableCell><span className={cn('font-bold', item.quantity === 0 ? 'text-destructive' : item.quantity <= (item.minQuantity || 0) ? 'text-yellow-400' : '')}>{item.quantity}</span></TableCell>
                              <TableCell className="text-xs">{item.location}</TableCell>
                              <TableCell>
                                {days !== null ? <span className={cn('text-xs font-medium', expiryColor)}>{days < 0 ? 'EXPIRED' : days === 0 ? 'Today' : `${days}d`}<span className="text-muted-foreground font-normal ml-1">({item.expirationDate})</span></span> : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.storageTemp || '—'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.fifoOrder ? `#${item.fifoOrder}` : '—'}</TableCell>
                              <TableCell>
                                {item.allergens?.length ? <div className="flex flex-wrap gap-1">{item.allergens.map(a => <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-400/10 text-orange-400 border border-orange-400/20">{a}</span>)}</div> : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <button onClick={() => handleCheckout(item, 'checkout')} className="px-2 py-1 text-[10px] rounded border border-orange-400/30 text-orange-400 hover:bg-orange-400/10">Out</button>
                                  <button onClick={() => { setTempForm(p => ({ ...p, itemId: item.partId, itemName: item.name })); setShowTempLog(true); }} className="px-2 py-1 text-[10px] rounded border border-blue-400/30 text-blue-400 hover:bg-blue-400/10">Temp</button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })()}

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-blue-400" />Temperature Log History
                  <span className="ml-auto text-xs font-normal text-muted-foreground">{tempLogs.length} entries</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tempLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No temperature logs yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {tempLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-muted/10 text-xs">
                        <div><p className="font-medium">{log.itemName}</p><p className="text-muted-foreground">{log.loggedBy} · {log.location || 'N/A'}</p></div>
                        <div className="text-right">
                          <p className={cn('font-bold text-sm', parseFloat(log.temp) > 40 ? 'text-red-400' : parseFloat(log.temp) > 38 ? 'text-yellow-400' : 'text-green-400')}>{log.temp}°{log.unit}</p>
                          <p className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>}

          {/* ── Tab: Chemical & Hazmat ────────────────────────────────────────── */}
          {activeTab === 'hazmat' && <div className="space-y-5">

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Total Chemicals',      value: hazmatStats.total,      color: 'text-foreground' },
                { label: 'Hazmat Items',          value: hazmatStats.hazmat,     color: 'text-orange-400' },
                { label: 'SDS Reviews Due',       value: hazmatStats.sdsDue,     color: hazmatStats.sdsDue > 0 ? 'text-red-400' : 'text-green-400' },
                { label: 'Permit Expiring Soon',  value: hazmatStats.permitExp,  color: hazmatStats.permitExp > 0 ? 'text-yellow-400' : 'text-green-400' },
                { label: 'Above Report Threshold',value: hazmatStats.reportable, color: hazmatStats.reportable > 0 ? 'text-purple-400' : 'text-green-400' },
              ].map(({ label, value, color }) => (
                <Card key={label} className="glass-panel">
                  <CardContent className="p-3 text-center">
                    <p className={cn('text-2xl font-bold', color)}>{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={hazmatSearch} onChange={e => setHazmatSearch(e.target.value)}
                  placeholder="Search name, CAS #, location…" className="pl-8 h-8 text-xs" />
              </div>
              <Select value={hazmatTypeFilter} onValueChange={v => setHazmatTypeFilter(v as any)}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All types</SelectItem>
                  {(Object.entries(CHEM_TYPE_META) as [ChemicalType, any][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => { setShowAddHazmat(true); setHazmatStep(1); }} className="ml-auto bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />Add Chemical
              </Button>
            </div>

            {/* Chemical inventory table */}
            <Card className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      {['Chemical Name', 'CAS #', 'Type', 'Quantity', 'Location', 'SDS Status', 'Permit', 'Actions'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleHazmat.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No chemicals found.</td></tr>
                    ) : visibleHazmat.map(h => {
                      const typeMeta = CHEM_TYPE_META[h.chemicalType];
                      const sdsDue = h.sdsNextReview && new Date(h.sdsNextReview) <= today;
                      const overQty = h.currentQuantity > h.maxAllowableQuantity && h.maxAllowableQuantity > 0;
                      const permitExpiring = h.requiresPermit && h.permitExpiry &&
                        Math.ceil((new Date(h.permitExpiry).getTime() - today.getTime()) / 86400000) <= 30;
                      return (
                        <tr key={h.id} className={cn('border-b border-border/20 hover:bg-muted/10 transition-colors', overQty && 'bg-red-500/5')}>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-foreground">{h.chemicalName}</p>
                            {h.unNumber && <p className="text-[10px] text-muted-foreground">UN{h.unNumber}</p>}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-muted-foreground">{h.casNumber || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold border', typeMeta.color)}>{typeMeta.label}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn('font-semibold', overQty ? 'text-red-400' : 'text-foreground')}>{h.currentQuantity} {h.unit}</span>
                            {overQty && <p className="text-[10px] text-red-400">Exceeds max {h.maxAllowableQuantity}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{h.location || '—'}</td>
                          <td className="px-3 py-2.5">
                            {sdsDue
                              ? <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-3 h-3" />Overdue</span>
                              : <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" />Current</span>}
                            {h.sdsNextReview && <p className="text-[10px] text-muted-foreground">Due {h.sdsNextReview}</p>}
                          </td>
                          <td className="px-3 py-2.5">
                            {h.requiresPermit
                              ? permitExpiring
                                ? <span className="text-yellow-400 text-[10px]">⚠ Exp. {h.permitExpiry}</span>
                                : <span className="text-green-400 text-[10px]">✓ {h.permitNumber || 'Permit on file'}</span>
                              : <span className="text-muted-foreground text-[10px]">Not required</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => deleteHazmat(h.id)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* SDS compliance tracker */}
            {hazmatStats.sdsDue > 0 && (
              <Card className="glass-panel border-orange-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-orange-400">
                    <FileText className="w-4 h-4" />SDS Reviews Overdue ({hazmatStats.sdsDue})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hazmatItems.filter(h => h.sdsNextReview && new Date(h.sdsNextReview) <= today).map(h => (
                    <div key={h.id} className="flex items-center justify-between p-2 rounded-lg border border-orange-500/20 bg-orange-500/5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{h.chemicalName}</p>
                        <p className="text-[10px] text-muted-foreground">Due: {h.sdsNextReview} · {h.assignedResponsible || 'Unassigned'}</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                        onClick={() => {
                          const next = new Date();
                          next.setFullYear(next.getFullYear() + 1);
                          const updated = hazmatItems.map(x => x.id === h.id
                            ? { ...x, sdsLastReviewed: new Date().toISOString().slice(0, 10), sdsNextReview: next.toISOString().slice(0, 10) }
                            : x);
                          saveHazmat(updated);
                          toast.success(`SDS marked reviewed — ${h.chemicalName}`);
                        }}>
                        Mark Reviewed
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tier II / SARA reporting */}
            {hazmatStats.reportable > 0 && (
              <Card className="glass-panel border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-purple-400">
                    <AlertTriangle className="w-4 h-4" />SARA Title III / Tier II Reportable Chemicals ({hazmatStats.reportable})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Chemicals where current quantity exceeds the reporting threshold. Annual Tier II report due March 1.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border/30"><th className="text-left px-2 py-1.5 text-muted-foreground">Chemical</th><th className="text-left px-2 py-1.5 text-muted-foreground">CAS #</th><th className="text-right px-2 py-1.5 text-muted-foreground">Quantity</th><th className="text-right px-2 py-1.5 text-muted-foreground">Threshold</th><th className="text-left px-2 py-1.5 text-muted-foreground">Location</th></tr></thead>
                      <tbody>
                        {hazmatItems.filter(h => h.isReportable && h.currentQuantity >= h.reportingThreshold).map(h => (
                          <tr key={h.id} className="border-b border-border/20">
                            <td className="px-2 py-2 font-medium text-foreground">{h.chemicalName}</td>
                            <td className="px-2 py-2 font-mono text-muted-foreground">{h.casNumber}</td>
                            <td className="px-2 py-2 text-right text-purple-400 font-semibold">{h.currentQuantity} {h.unit}</td>
                            <td className="px-2 py-2 text-right text-muted-foreground">{h.reportingThreshold} {h.unit}</td>
                            <td className="px-2 py-2 text-muted-foreground">{h.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                    onClick={() => {
                      const rows = hazmatItems.filter(h => h.isReportable && h.currentQuantity >= h.reportingThreshold);
                      const csv = ['Chemical Name,CAS Number,Hazard Class,UN Number,Quantity,Unit,Threshold,Location,Supplier', ...rows.map(h => `"${h.chemicalName}",${h.casNumber},${h.hazardClass},${h.unNumber},${h.currentQuantity},${h.unit},${h.reportingThreshold},"${h.location}","${h.supplier}"`)].join('\n');
                      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `tier2-report-${new Date().getFullYear()}.csv`; a.click();
                      toast.success('Tier II CSV exported');
                    }}>
                    <AlertTriangle className="w-3.5 h-3.5" />Generate Tier II Report (CSV)
                  </Button>
                </CardContent>
              </Card>
            )}

          </div>}

          {/* ── Tab: Resources ───────────────────────────────────────────────── */}
          {activeTab === 'resources' && (
            <div className="space-y-5">
              {resourcesLoading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading resource data…
                </div>
              )}

              {!resourcesLoading && (
                <>
                  {/* Summary KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {[
                      { label: 'Vendors', value: resourceSummary?.vendorCount ?? resourceVendors.length, color: 'text-blue-400' },
                      { label: 'Inventory Parts', value: resourceSummary?.totalInventoryParts ?? '—', color: 'text-cyan-400' },
                      { label: 'Open WOs', value: resourceSummary?.openWOCount ?? '—', color: resourceSummary?.openWOCount && resourceSummary.openWOCount > 5 ? 'text-red-400' : 'text-yellow-400' },
                      { label: 'Avg Lead Time', value: resourceSummary?.avgVendorLeadTimeDays != null ? `${resourceSummary.avgVendorLeadTimeDays}d` : '—', color: 'text-purple-400' },
                      { label: 'At-Risk Parts', value: resourceSummary?.atRiskParts ?? '—', color: 'text-red-400' },
                      { label: 'Systems Tracked', value: floatData.length, color: 'text-green-400' },
                    ].map(kpi => (
                      <Card key={kpi.label} className="glass-panel border-border/30">
                        <CardContent className="p-3 text-center">
                          <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Vendor Directory */}
                    <Card className="glass-panel border-border/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-blue-400" />Vendor Directory</CardTitle>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddVendor(v => !v)}>
                            <Plus className="w-3 h-3 mr-1" />{showAddVendor ? 'Cancel' : 'Add Vendor'}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {showAddVendor && (
                          <div className="bg-muted/20 border border-border/30 rounded-xl p-4 space-y-3">
                            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">New Vendor</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="col-span-2 space-y-1"><Label className="text-xs">Company Name *</Label><Input value={vendorForm.name} onChange={e => setVendorForm(p => ({...p, name: e.target.value}))} placeholder="Acme HVAC Services" className="h-8 text-sm" /></div>
                              <div className="space-y-1"><Label className="text-xs">Specialty</Label><Input value={vendorForm.specialty} onChange={e => setVendorForm(p => ({...p, specialty: e.target.value}))} placeholder="HVAC, Plumbing, Electrical…" className="h-8 text-sm" /></div>
                              <div className="space-y-1"><Label className="text-xs">Contact Name</Label><Input value={vendorForm.contact} onChange={e => setVendorForm(p => ({...p, contact: e.target.value}))} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={vendorForm.phone} onChange={e => setVendorForm(p => ({...p, phone: e.target.value}))} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={vendorForm.email} onChange={e => setVendorForm(p => ({...p, email: e.target.value}))} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><Label className="text-xs">Avg Lead Time (days)</Label><Input type="number" min={0} value={vendorForm.avgLeadTimeDays} onChange={e => setVendorForm(p => ({...p, avgLeadTimeDays: e.target.value}))} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><Label className="text-xs">Linked Systems (comma-sep)</Label><Input value={vendorForm.linkedSystems} onChange={e => setVendorForm(p => ({...p, linkedSystems: e.target.value}))} placeholder="HVAC, BLR-001, CHL-001" className="h-8 text-sm" /></div>
                              <div className="col-span-2 space-y-1"><Label className="text-xs">Parts Supplied (comma-sep)</Label><Input value={vendorForm.partsSupplied} onChange={e => setVendorForm(p => ({...p, partsSupplied: e.target.value}))} placeholder="Filters, Bearings, Belts" className="h-8 text-sm" /></div>
                              <div className="col-span-2 space-y-1"><Label className="text-xs">Notes</Label><Input value={vendorForm.notes} onChange={e => setVendorForm(p => ({...p, notes: e.target.value}))} className="h-8 text-sm" /></div>
                            </div>
                            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={handleAddVendor} disabled={vendorSubmitting || !vendorForm.name}>
                              {vendorSubmitting ? 'Saving…' : 'Save Vendor'}
                            </Button>
                          </div>
                        )}

                        {resourceVendors.length === 0 && !showAddVendor && (
                          <p className="text-sm text-muted-foreground text-center py-6">No vendors registered yet. Add your first vendor above.</p>
                        )}

                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {resourceVendors.map(v => (
                            <div key={v.vendorId} className="flex items-start gap-3 p-3 bg-muted/10 border border-border/20 rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium truncate">{v.name}</p>
                                  {v.avgLeadTimeDays > 0 && (
                                    <Badge variant="outline" className="text-xs shrink-0">{v.avgLeadTimeDays}d lead</Badge>
                                  )}
                                </div>
                                {v.specialty && <p className="text-xs text-muted-foreground">{v.specialty}</p>}
                                <div className="flex items-center gap-3 mt-1">
                                  {v.phone && <span className="text-xs text-muted-foreground">{v.phone}</span>}
                                  {v.linkedSystems?.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {v.linkedSystems.slice(0, 3).map(s => (
                                        <Badge key={s} variant="secondary" className="text-xs px-1.5 py-0">{s}</Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {v.partsSupplied?.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5">Parts: {v.partsSupplied.slice(0, 4).join(', ')}{v.partsSupplied.length > 4 ? '…' : ''}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Float Time Analysis */}
                    <Card className="glass-panel border-border/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-400" />Float Time by System</CardTitle>
                        <p className="text-xs text-muted-foreground">Avg WO resolution days per system — high open count = at-risk float</p>
                      </CardHeader>
                      <CardContent>
                        {floatData.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">No WO data yet. Float time is computed from completed work orders.</p>
                        ) : (
                          <div className="space-y-2 max-h-72 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">System</TableHead>
                                  <TableHead className="text-xs text-right">Avg Days</TableHead>
                                  <TableHead className="text-xs text-right">Open WOs</TableHead>
                                  <TableHead className="text-xs text-right">Risk</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {floatData.map(f => (
                                  <TableRow key={f.systemType} className="hover:bg-muted/20">
                                    <TableCell className="text-xs font-medium py-2">{f.systemType}</TableCell>
                                    <TableCell className="text-xs text-right py-2 font-mono">
                                      {f.avgFloatDays != null ? `${f.avgFloatDays}d` : '—'}
                                    </TableCell>
                                    <TableCell className="text-xs text-right py-2">
                                      <span className={f.openWOs > 2 ? 'text-red-400 font-semibold' : ''}>{f.openWOs}</span>
                                    </TableCell>
                                    <TableCell className="text-xs text-right py-2">
                                      <Badge variant="outline" className={cn('text-xs',
                                        f.riskLevel === 'high' ? 'border-red-500/50 text-red-400' :
                                        f.riskLevel === 'medium' ? 'border-yellow-500/50 text-yellow-400' :
                                        'border-green-500/50 text-green-400'
                                      )}>{f.riskLevel}</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* PM Intervals */}
                  <Card className="glass-panel border-border/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-green-400" />PM Interval Recommendations</CardTitle>
                      <p className="text-xs text-muted-foreground">Derived from WO history patterns — intervals computed dynamically, trend shows if frequency is increasing (worsening) or stable</p>
                    </CardHeader>
                    <CardContent>
                      {pmIntervals.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No PM work orders found. Intervals are computed from preventive maintenance WO history.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Equipment</TableHead>
                                <TableHead className="text-xs">System</TableHead>
                                <TableHead className="text-xs text-right">Avg Interval</TableHead>
                                <TableHead className="text-xs text-right">Suggested</TableHead>
                                <TableHead className="text-xs text-center">Trend</TableHead>
                                <TableHead className="text-xs">Last PM</TableHead>
                                <TableHead className="text-xs">Next Due</TableHead>
                                <TableHead className="text-xs text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pmIntervals.map(interval => (
                                <TableRow key={interval.equipmentId} className="hover:bg-muted/20">
                                  <TableCell className="text-xs font-medium py-2">{interval.equipmentName}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground py-2">{interval.systemType || '—'}</TableCell>
                                  <TableCell className="text-xs text-right py-2 font-mono">
                                    {interval.avgIntervalDays != null ? `${interval.avgIntervalDays}d` : '—'}
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-2 font-mono text-cyan-400">
                                    {interval.suggestedIntervalDays}d
                                  </TableCell>
                                  <TableCell className="text-xs text-center py-2">
                                    {interval.trend === 'worsening' ? <ChevronDown className="w-3.5 h-3.5 text-red-400 inline" /> :
                                     interval.trend === 'improving' ? <ChevronUp className="w-3.5 h-3.5 text-green-400 inline" /> :
                                     <Minus className="w-3.5 h-3.5 text-muted-foreground inline" />}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground py-2">
                                    {interval.lastPMDate ? new Date(interval.lastPMDate).toLocaleDateString() : '—'}
                                  </TableCell>
                                  <TableCell className="text-xs py-2">
                                    {interval.nextDueDate ? (
                                      <span className={interval.daysUntilDue !== null && interval.daysUntilDue < 0 ? 'text-red-400 font-semibold' : interval.daysUntilDue !== null && interval.daysUntilDue < 14 ? 'text-yellow-400' : ''}>
                                        {new Date(interval.nextDueDate).toLocaleDateString()}
                                        {interval.daysUntilDue !== null && ` (${interval.daysUntilDue < 0 ? `${Math.abs(interval.daysUntilDue)}d overdue` : `in ${interval.daysUntilDue}d`})`}
                                      </span>
                                    ) : '—'}
                                  </TableCell>
                                  <TableCell className="text-xs text-center py-2">
                                    <Badge variant="outline" className={cn('text-xs',
                                      interval.status === 'overdue' ? 'border-red-500/50 text-red-400' :
                                      interval.status === 'due_soon' ? 'border-yellow-500/50 text-yellow-400' :
                                      'border-green-500/50 text-green-400'
                                    )}>
                                      {interval.status === 'due_soon' ? 'due soon' : interval.status.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Add Chemical Modal ────────────────────────────────────────────────── */}
      {showAddHazmat && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAddHazmat(false)}>
          <div className="glass-panel rounded-2xl border border-orange-500/30 p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2"><FlaskConical className="w-5 h-5 text-orange-400" />Add Chemical / Hazmat</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Step {hazmatStep} of 4</p>
              </div>
              <button onClick={() => setShowAddHazmat(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            {/* Step progress */}
            <div className="flex gap-1">
              {[1,2,3,4].map(s => (
                <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors', s <= hazmatStep ? 'bg-orange-400' : 'bg-muted/40')} />
              ))}
            </div>

            {/* Step 1: Chemical Identity */}
            {hazmatStep === 1 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Step 1 — Chemical Identity</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5"><Label className="text-xs">Chemical Name *</Label><Input value={hazmatForm.chemicalName} onChange={e => setHazmatForm(p => ({...p, chemicalName: e.target.value}))} placeholder="e.g. Muriatic Acid 31.5%" className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">CAS Number</Label><Input value={hazmatForm.casNumber} onChange={e => setHazmatForm(p => ({...p, casNumber: e.target.value}))} placeholder="e.g. 7647-01-0" className="h-9 text-sm font-mono" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">SDS Number</Label><Input value={hazmatForm.sdsNumber} onChange={e => setHazmatForm(p => ({...p, sdsNumber: e.target.value}))} placeholder="SDS-001" className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Chemical Type</Label>
                    <Select value={hazmatForm.chemicalType} onValueChange={v => setHazmatForm(p => ({...p, chemicalType: v as ChemicalType}))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.entries(CHEM_TYPE_META) as [ChemicalType, any][]).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">DOT Hazard Class (1-9)</Label><Input value={hazmatForm.hazardClass} onChange={e => setHazmatForm(p => ({...p, hazardClass: e.target.value}))} placeholder="8" className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">UN/NA Number</Label><Input value={hazmatForm.unNumber} onChange={e => setHazmatForm(p => ({...p, unNumber: e.target.value}))} placeholder="1789" className="h-9 text-sm font-mono" /></div>
                  <div className="col-span-2 space-y-1.5"><Label className="text-xs">Primary Hazard</Label><Input value={hazmatForm.primaryHazard} onChange={e => setHazmatForm(p => ({...p, primaryHazard: e.target.value}))} placeholder="Corrosive — burns skin and eyes" className="h-9 text-sm" /></div>
                </div>
              </div>
            )}

            {/* Step 2: Inventory & Storage */}
            {hazmatStep === 2 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Step 2 — Inventory & Storage</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Current Quantity</Label><Input type="number" min={0} value={hazmatForm.currentQuantity} onChange={e => setHazmatForm(p => ({...p, currentQuantity: e.target.value}))} className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Unit</Label>
                    <Select value={hazmatForm.unit} onValueChange={v => setHazmatForm(p => ({...p, unit: v as HazmatItem['unit']}))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{['gallons','liters','pounds','kg','units'].map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Max Allowable Qty</Label><Input type="number" min={0} value={hazmatForm.maxAllowableQuantity} onChange={e => setHazmatForm(p => ({...p, maxAllowableQuantity: e.target.value}))} className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Reorder Point</Label><Input type="number" min={0} value={hazmatForm.reorderPoint} onChange={e => setHazmatForm(p => ({...p, reorderPoint: e.target.value}))} className="h-9 text-sm" /></div>
                  <div className="col-span-2 space-y-1.5"><Label className="text-xs">Storage Location</Label><Input value={hazmatForm.location} onChange={e => setHazmatForm(p => ({...p, location: e.target.value}))} placeholder="Chemical Storage Rm A, Shelf 2" className="h-9 text-sm" /></div>
                  <div className="col-span-2 space-y-1.5"><Label className="text-xs">Storage Requirements</Label><Input value={hazmatForm.storageRequirements} onChange={e => setHazmatForm(p => ({...p, storageRequirements: e.target.value}))} placeholder="Ventilated, away from bases" className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Supplier</Label><Input value={hazmatForm.supplier} onChange={e => setHazmatForm(p => ({...p, supplier: e.target.value}))} className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Supplier Phone</Label><Input value={hazmatForm.supplierPhone} onChange={e => setHazmatForm(p => ({...p, supplierPhone: e.target.value}))} className="h-9 text-sm" /></div>
                </div>
              </div>
            )}

            {/* Step 3: Safety & Compliance */}
            {hazmatStep === 3 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Step 3 — Safety & Compliance</p>
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label className="text-xs">Required PPE (comma-separated)</Label><Input value={hazmatForm.ppe} onChange={e => setHazmatForm(p => ({...p, ppe: e.target.value}))} placeholder="Chemical gloves, Face shield, Apron" className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Secondary Hazards (comma-separated)</Label><Input value={hazmatForm.secondaryHazards} onChange={e => setHazmatForm(p => ({...p, secondaryHazards: e.target.value}))} placeholder="Inhalation, Reactivity" className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Emergency Procedure</Label><textarea value={hazmatForm.emergencyProcedure} onChange={e => setHazmatForm(p => ({...p, emergencyProcedure: e.target.value}))} rows={2} className="w-full text-sm bg-muted/30 border border-border rounded-md px-3 py-2 resize-none" placeholder="Neutralize with sodium bicarbonate…" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Spill Procedure</Label><textarea value={hazmatForm.spillProcedure} onChange={e => setHazmatForm(p => ({...p, spillProcedure: e.target.value}))} rows={2} className="w-full text-sm bg-muted/30 border border-border rounded-md px-3 py-2 resize-none" placeholder="Absorb with dry sand…" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Disposal Method</Label><Input value={hazmatForm.disposalMethod} onChange={e => setHazmatForm(p => ({...p, disposalMethod: e.target.value}))} placeholder="Neutralize; dispose per RCRA" className="h-9 text-sm" /></div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/10">
                    <input type="checkbox" id="reportable" checked={hazmatForm.isReportable} onChange={e => setHazmatForm(p => ({...p, isReportable: e.target.checked}))} className="w-4 h-4" />
                    <Label htmlFor="reportable" className="text-xs cursor-pointer">Reportable under SARA Title III / Tier II</Label>
                  </div>
                  {hazmatForm.isReportable && (
                    <div className="space-y-1.5"><Label className="text-xs">Reporting Threshold ({hazmatForm.unit})</Label><Input type="number" min={0} value={hazmatForm.reportingThreshold} onChange={e => setHazmatForm(p => ({...p, reportingThreshold: e.target.value}))} className="h-9 text-sm" /></div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: SDS & Permits */}
            {hazmatStep === 4 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Step 4 — SDS & Permits</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">SDS Last Reviewed</Label><Input type="date" value={hazmatForm.sdsLastReviewed} onChange={e => setHazmatForm(p => ({...p, sdsLastReviewed: e.target.value}))} className="h-9 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">SDS Next Review Due</Label><Input type="date" value={hazmatForm.sdsNextReview} onChange={e => setHazmatForm(p => ({...p, sdsNextReview: e.target.value}))} className="h-9 text-sm" /></div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/10">
                      <input type="checkbox" id="permit" checked={hazmatForm.requiresPermit} onChange={e => setHazmatForm(p => ({...p, requiresPermit: e.target.checked}))} className="w-4 h-4" />
                      <Label htmlFor="permit" className="text-xs cursor-pointer">Requires permit (SPCC, storage permit, etc.)</Label>
                    </div>
                  </div>
                  {hazmatForm.requiresPermit && <>
                    <div className="space-y-1.5"><Label className="text-xs">Permit Number</Label><Input value={hazmatForm.permitNumber} onChange={e => setHazmatForm(p => ({...p, permitNumber: e.target.value}))} placeholder="SPCC-2024-001" className="h-9 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Permit Expiry</Label><Input type="date" value={hazmatForm.permitExpiry} onChange={e => setHazmatForm(p => ({...p, permitExpiry: e.target.value}))} className="h-9 text-sm" /></div>
                  </>}
                  <div className="col-span-2 space-y-1.5"><Label className="text-xs">Assigned Responsible Person</Label><Input value={hazmatForm.assignedResponsible} onChange={e => setHazmatForm(p => ({...p, assignedResponsible: e.target.value}))} placeholder="J. Smith" className="h-9 text-sm" /></div>
                  <div className="col-span-2 space-y-1.5"><Label className="text-xs">Notes</Label><textarea value={hazmatForm.notes} onChange={e => setHazmatForm(p => ({...p, notes: e.target.value}))} rows={2} className="w-full text-sm bg-muted/30 border border-border rounded-md px-3 py-2 resize-none" /></div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => hazmatStep > 1 ? setHazmatStep(s => s - 1) : setShowAddHazmat(false)} className="text-xs">
                {hazmatStep === 1 ? 'Cancel' : '← Back'}
              </Button>
              {hazmatStep < 4
                ? <Button size="sm" onClick={() => setHazmatStep(s => s + 1)} disabled={hazmatStep === 1 && !hazmatForm.chemicalName} className="bg-orange-600 hover:bg-orange-700 text-white text-xs">Next →</Button>
                : <Button size="sm" onClick={addHazmatItem} disabled={hazmatSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white text-xs">Save Chemical</Button>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Add Inventory Modal ──────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass-panel rounded-2xl border border-primary/30 p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Inventory Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Item Type</Label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { value: 'parts', label: 'Parts / Mechanical' },
                  { value: 'food', label: 'Food / Beverage' },
                  { value: 'apparel', label: 'Clothing / Apparel' },
                  { value: 'retail', label: 'Retail / Supply' },
                  { value: 'pharmacy', label: 'Pharmacy' },
                ] as const).map(t => (
                  <button key={t.value} onClick={() => setAddItemType(t.value)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs border transition-all', addItemType === t.value ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground hover:border-border')}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parts / Mechanical fields */}
            {addItemType === 'parts' && <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Name *</Label><Input value={partsForm.name} onChange={e => setPartsForm(p => ({...p, name: e.target.value}))} placeholder="e.g. 3/8 Hex Bolt" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Part Number</Label><Input value={partsForm.partNumber} onChange={e => setPartsForm(p => ({...p, partNumber: e.target.value}))} placeholder="P/N" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Category</Label>
                  <Select value={partsForm.category} onValueChange={v => setPartsForm(p => ({...p, category: v}))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{ALL_CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Quantity</Label><Input type="number" min={0} value={partsForm.quantity} onChange={e => setPartsForm(p => ({...p, quantity: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Min Quantity</Label><Input type="number" min={0} value={partsForm.minQuantity} onChange={e => setPartsForm(p => ({...p, minQuantity: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Location</Label><Input value={partsForm.location} onChange={e => setPartsForm(p => ({...p, location: e.target.value}))} placeholder="Storage room A" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Supplier</Label><Input value={partsForm.supplier} onChange={e => setPartsForm(p => ({...p, supplier: e.target.value}))} placeholder="Vendor name" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unit Cost ($)</Label><Input type="number" min={0} step={0.01} value={partsForm.unitCost} onChange={e => setPartsForm(p => ({...p, unitCost: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Compatible Equipment (comma-separated)</Label><Input value={partsForm.compatibleEquipment} onChange={e => setPartsForm(p => ({...p, compatibleEquipment: e.target.value}))} placeholder="Boiler #1, Chiller #2" className="h-9 text-sm" /></div>
              </div>
            </div>}

            {/* Food / Beverage fields */}
            {addItemType === 'food' && <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Name *</Label><Input value={foodForm.name} onChange={e => setFoodForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Whole Milk (1 Gallon)" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Quantity</Label><Input type="number" min={0} value={foodForm.quantity} onChange={e => setFoodForm(p => ({...p, quantity: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unit</Label><Input value={foodForm.unit} onChange={e => setFoodForm(p => ({...p, unit: e.target.value}))} placeholder="each, case, lb" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Batch Number</Label><Input value={foodForm.batchNumber} onChange={e => setFoodForm(p => ({...p, batchNumber: e.target.value}))} placeholder="Batch / lot #" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Expiry Date</Label><Input type="date" value={foodForm.expirationDate} onChange={e => setFoodForm(p => ({...p, expirationDate: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Storage Temp</Label><Input value={foodForm.storageTemp} onChange={e => setFoodForm(p => ({...p, storageTemp: e.target.value}))} placeholder="35-38°F" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">FIFO Order</Label><Input type="number" min={1} value={foodForm.fifoOrder} onChange={e => setFoodForm(p => ({...p, fifoOrder: e.target.value}))} placeholder="1" className="h-9 text-sm" /></div>
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Allergens (comma-separated)</Label><Input value={foodForm.allergens} onChange={e => setFoodForm(p => ({...p, allergens: e.target.value}))} placeholder="Gluten, Dairy, Nuts" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Supplier</Label><Input value={foodForm.supplier} onChange={e => setFoodForm(p => ({...p, supplier: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unit Cost ($)</Label><Input type="number" min={0} step={0.01} value={foodForm.unitCost} onChange={e => setFoodForm(p => ({...p, unitCost: e.target.value}))} placeholder="0.00" className="h-9 text-sm" /></div>
              </div>
            </div>}

            {/* Clothing / Apparel fields */}
            {addItemType === 'apparel' && <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Name *</Label><Input value={apparelForm.name} onChange={e => setApparelForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Staff Polo Shirt" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">SKU</Label><Input value={apparelForm.sku} onChange={e => setApparelForm(p => ({...p, sku: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Size</Label><Input value={apparelForm.size} onChange={e => setApparelForm(p => ({...p, size: e.target.value}))} placeholder="S, M, L, XL" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Color</Label><Input value={apparelForm.color} onChange={e => setApparelForm(p => ({...p, color: e.target.value}))} placeholder="Black" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Season</Label><Input value={apparelForm.season} onChange={e => setApparelForm(p => ({...p, season: e.target.value}))} placeholder="All Season, Winter" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Quantity</Label><Input type="number" min={0} value={apparelForm.quantity} onChange={e => setApparelForm(p => ({...p, quantity: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Reorder Point</Label><Input type="number" min={0} value={apparelForm.reorderPoint} onChange={e => setApparelForm(p => ({...p, reorderPoint: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unit Cost ($)</Label><Input type="number" min={0} step={0.01} value={apparelForm.unitCost} onChange={e => setApparelForm(p => ({...p, unitCost: e.target.value}))} placeholder="0.00" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Department</Label><Input value={apparelForm.department} onChange={e => setApparelForm(p => ({...p, department: e.target.value}))} placeholder="Front of House, Kitchen" className="h-9 text-sm" /></div>
              </div>
            </div>}

            {/* Retail / Supply fields */}
            {addItemType === 'retail' && <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Name *</Label><Input value={retailForm.name} onChange={e => setRetailForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Paper Bags 500ct" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">SKU</Label><Input value={retailForm.sku} onChange={e => setRetailForm(p => ({...p, sku: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Quantity</Label><Input type="number" min={0} value={retailForm.quantity} onChange={e => setRetailForm(p => ({...p, quantity: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Reorder Point</Label><Input type="number" min={0} value={retailForm.reorderPoint} onChange={e => setRetailForm(p => ({...p, reorderPoint: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Supplier</Label><Input value={retailForm.supplier} onChange={e => setRetailForm(p => ({...p, supplier: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unit Cost ($)</Label><Input type="number" min={0} step={0.01} value={retailForm.unitCost} onChange={e => setRetailForm(p => ({...p, unitCost: e.target.value}))} className="h-9 text-sm" /></div>
              </div>
            </div>}

            {/* Pharmacy fields */}
            {addItemType === 'pharmacy' && <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Name *</Label><Input value={pharmacyForm.name} onChange={e => setPharmacyForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Epinephrine 1mg/mL" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">NDC</Label><Input value={pharmacyForm.ndc} onChange={e => setPharmacyForm(p => ({...p, ndc: e.target.value}))} placeholder="XXXXX-XXXX-XX" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Expiry Date *</Label><Input type="date" value={pharmacyForm.expirationDate} onChange={e => setPharmacyForm(p => ({...p, expirationDate: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Quantity</Label><Input type="number" min={0} value={pharmacyForm.quantity} onChange={e => setPharmacyForm(p => ({...p, quantity: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unit Cost ($)</Label><Input type="number" min={0} step={0.01} value={pharmacyForm.unitCost} onChange={e => setPharmacyForm(p => ({...p, unitCost: e.target.value}))} placeholder="0.00" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Storage Temp</Label><Input value={pharmacyForm.storageTemp} onChange={e => setPharmacyForm(p => ({...p, storageTemp: e.target.value}))} placeholder="36-46°F" className="h-9 text-sm" /></div>
                <div className="col-span-2 space-y-1.5"><Label className="text-xs">Controlled Substance</Label>
                  <div className="flex gap-2">
                    {['yes','no'].map(v => (
                      <button key={v} onClick={() => setPharmacyForm(p => ({...p, controlled: v}))}
                        className={cn('flex-1 py-2 rounded-lg text-xs border capitalize transition-all', pharmacyForm.controlled === v ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground')}>
                        {v === 'yes' ? 'Yes — Controlled' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submitAddItem} disabled={addSubmitting}>
                <CheckCircle className="w-4 h-4 mr-2" />{addSubmitting ? 'Saving...' : 'Add Item'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Gov Item Modal ───────────────────────────────────────────────── */}
      {showAddGovModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAddGovModal(false)}>
          <div className="glass-panel rounded-2xl border border-primary/30 p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Add Gov / Public Safety Item</h3>
              <button onClick={() => setShowAddGovModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            {/* Category selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: 'apparatus', label: 'Apparatus / Fleet', icon: Truck },
                  { value: 'weapon', label: 'Weapon', icon: Lock },
                  { value: 'uniform', label: 'Uniform / PPE', icon: Shield },
                  { value: 'supply', label: 'Supply', icon: Box },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button key={value} onClick={() => setGovForm(p => ({...p, govCategory: value}))}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all', govForm.govCategory === value ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground')}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Name *</Label><Input value={govForm.name} onChange={e => setGovForm(p => ({...p, name: e.target.value}))} placeholder={govForm.govCategory === 'apparatus' ? 'e.g. Engine 3' : govForm.govCategory === 'weapon' ? 'e.g. Glock 17' : govForm.govCategory === 'uniform' ? 'e.g. Turnout Gear Set' : 'e.g. Road Flares'} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Serial / ID Number</Label><Input value={govForm.serialNumber} onChange={e => setGovForm(p => ({...p, serialNumber: e.target.value}))} placeholder="SN#..." className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <Select value={govForm.status} onValueChange={v => setGovForm(p => ({...p, status: v as GovItem['status']}))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in-service">In Service</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Assigned To</Label><Input value={govForm.assignedTo} onChange={e => setGovForm(p => ({...p, assignedTo: e.target.value}))} placeholder="Officer / station / unit" className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Condition</Label>
                <Select value={govForm.condition} onValueChange={v => setGovForm(p => ({...p, condition: v as GovItem['condition']}))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                    <SelectItem value="Inspect">Needs Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {govForm.govCategory === 'apparatus' && <>
                <div className="space-y-1.5"><Label className="text-xs">Mileage</Label><Input type="number" min={0} value={govForm.mileage} onChange={e => setGovForm(p => ({...p, mileage: e.target.value}))} placeholder="0" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Last Service Date</Label><Input type="date" value={govForm.lastService} onChange={e => setGovForm(p => ({...p, lastService: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Next Service Date</Label><Input type="date" value={govForm.nextService} onChange={e => setGovForm(p => ({...p, nextService: e.target.value}))} className="h-9 text-sm" /></div>
              </>}
              {(govForm.govCategory === 'weapon' || govForm.govCategory === 'uniform') && <>
                <div className="space-y-1.5"><Label className="text-xs">Last Inspection Date</Label><Input type="date" value={govForm.lastInspection} onChange={e => setGovForm(p => ({...p, lastInspection: e.target.value}))} className="h-9 text-sm" /></div>
              </>}
              {govForm.govCategory === 'uniform' && <>
                <div className="space-y-1.5"><Label className="text-xs">Size</Label><Input value={govForm.size} onChange={e => setGovForm(p => ({...p, size: e.target.value}))} placeholder="S, M, L, XL" className="h-9 text-sm" /></div>
              </>}
              {(govForm.govCategory === 'weapon' || govForm.govCategory === 'supply') && <>
                <div className="space-y-1.5"><Label className="text-xs">Quantity</Label><Input type="number" min={1} value={govForm.quantity} onChange={e => setGovForm(p => ({...p, quantity: e.target.value}))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unit</Label><Input value={govForm.unit} onChange={e => setGovForm(p => ({...p, unit: e.target.value}))} placeholder="each, box, set" className="h-9 text-sm" /></div>
              </>}
              <div className="space-y-1.5"><Label className="text-xs">Unit Cost ($)</Label><Input type="number" min={0} step={0.01} value={govForm.unitCost} onChange={e => setGovForm(p => ({...p, unitCost: e.target.value}))} placeholder="0.00" className="h-9 text-sm" /></div>
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={govForm.notes} onChange={e => setGovForm(p => ({...p, notes: e.target.value}))} placeholder="Additional details..." className="min-h-[60px] text-sm resize-none" /></div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddGovModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submitAddGovItem} disabled={govSubmitting}>
                <CheckCircle className="w-4 h-4 mr-2" />{govSubmitting ? 'Saving...' : 'Add Item'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checkout Modal ───────────────────────────────────────────────────── */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCheckoutModal(false)}>
          <div className="glass-panel rounded-2xl border border-primary/30 p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{checkoutForm.action === 'checkin' ? 'Return Item' : checkoutForm.action === 'verify' ? 'Verify Item' : 'Check Out Item'}</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {!selectedItem && <div className="space-y-1.5"><Label className="text-xs">Item Name *</Label><Input value={checkoutForm.itemName} onChange={e => setCheckoutForm(p => ({...p, itemName: e.target.value}))} placeholder="Part or item name" className="h-9 text-sm" /></div>}
              <div className="space-y-1.5">
                <Label className="text-xs">Action</Label>
                <div className="flex gap-2">
                  {['checkout','checkin','verify'].map(a => (
                    <button key={a} onClick={() => setCheckoutForm(p => ({...p, action: a}))}
                      className={`flex-1 py-1.5 rounded-lg text-xs border capitalize transition-all ${checkoutForm.action === a ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground'}`}>
                      {a === 'checkin' ? 'Return' : a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Your Name *</Label><Input value={checkoutForm.checkedOutBy} onChange={e => setCheckoutForm(p => ({...p, checkedOutBy: e.target.value}))} placeholder="Staff member name" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Quantity</Label><Input type="number" min={1} value={checkoutForm.quantity} onChange={e => setCheckoutForm(p => ({...p, quantity: parseInt(e.target.value) || 1}))} className="h-9 text-sm" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Job / Work Order</Label><Input value={checkoutForm.job} onChange={e => setCheckoutForm(p => ({...p, job: e.target.value}))} placeholder="Job description or WO number" className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={checkoutForm.notes} onChange={e => setCheckoutForm(p => ({...p, notes: e.target.value}))} placeholder="Condition, reason, additional details..." className="min-h-[60px] text-sm" /></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCheckoutModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={submitCheckout}><CheckCircle className="w-4 h-4 mr-2" />Submit Log</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Temperature Log Modal ─────────────────────────────────────────────── */}
      {showTempLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowTempLog(false)}>
          <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><Thermometer className="w-5 h-5 text-blue-400" />Log Temperature</h3>
              <button onClick={() => setShowTempLog(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Item / Location *</Label><Input value={tempForm.itemName} onChange={e => setTempForm(p => ({...p, itemName: e.target.value}))} placeholder="Walk-in cooler, storage room, product name..." className="h-9 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Temperature *</Label><Input type="number" value={tempForm.temp} onChange={e => setTempForm(p => ({...p, temp: e.target.value}))} placeholder="38" className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unit</Label>
                  <div className="flex gap-2">
                    {['F','C'].map(u => <button key={u} onClick={() => setTempForm(p => ({...p, unit: u}))} className={`flex-1 py-2 rounded-lg text-sm border transition-all ${tempForm.unit === u ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground'}`}>°{u}</button>)}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Logged By *</Label><Input value={tempForm.loggedBy} onChange={e => setTempForm(p => ({...p, loggedBy: e.target.value}))} placeholder="Staff member name" className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Input value={tempForm.notes} onChange={e => setTempForm(p => ({...p, notes: e.target.value}))} placeholder="Any observations..." className="h-9 text-sm" /></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowTempLog(false)}>Cancel</Button>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={submitTempLog} disabled={!tempForm.temp || !tempForm.loggedBy}><Thermometer className="w-4 h-4 mr-2" />Log Temperature</Button>
            </div>
          </div>
        </div>
      )}
      {/* Inventory Import Modal */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Inventory"
        storageKey="inventory_import"
        templateHeaders={[
          'itemName', 'category', 'partNumber', 'sku', 'assetTag', 'assetNumber',
          'quantity', 'minQuantity', 'reorderPoint', 'location', 'supplier',
          'unitCost', 'expirationDate', 'storageTemp', 'notes',
        ]}
        fields={[
          { key: 'itemName', label: 'Item Name', required: true },
          { key: 'category', label: 'Category', required: true },
          { key: 'partNumber', label: 'Part Number' },
          { key: 'sku', label: 'SKU' },
          { key: 'assetTag', label: 'Asset Tag' },
          { key: 'assetNumber', label: 'Asset Number' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'minQuantity', label: 'Min Quantity' },
          { key: 'reorderPoint', label: 'Reorder Point' },
          { key: 'location', label: 'Location' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'unitCost', label: 'Unit Cost' },
          { key: 'expirationDate', label: 'Expiration Date' },
          { key: 'storageTemp', label: 'Storage Temp' },
          { key: 'notes', label: 'Notes' },
        ]}
        onImportRow={async (row) => {
          const partId = `part-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const newItem = {
            partId,
            name: row.itemName,
            category: row.category,
            partNumber: row.partNumber || '',
            quantity: parseInt(row.quantity) || 0,
            minQuantity: parseInt(row.minQuantity) || 0,
            reorderPoint: parseInt(row.reorderPoint) || undefined,
            location: row.location || '',
            supplier: row.supplier || '',
            unitCost: parseFloat(row.unitCost) || 0,
            expirationDate: row.expirationDate || undefined,
            storageTemp: row.storageTemp || undefined,
            notes: row.notes || undefined,
            createdAt: new Date().toISOString(),
          };
          const saved = (() => { try { return JSON.parse(localStorage.getItem(INV_KEY) || '[]'); } catch { return []; } })();
          const updated = [newItem, ...saved];
          localStorage.setItem(INV_KEY, JSON.stringify(updated));
          setInventory(prev => [newItem as any, ...prev]);
          try {
            const token = localStorage.getItem('nexum_access_token');
            await fetch(`${API_BASE_URL}/inventory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(newItem),
            });
          } catch { /* silent — localStorage is source of truth */ }
        }}
      />
    </MainLayout>
  );
}
