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
} from 'lucide-react';
import { ImportModal } from '@/components/ImportModal';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import InventoryImportModal from '@/components/import/InventoryImportModal';

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
                        {[{ key: 'name', label: 'Name' }, { key: 'category', label: 'Category' }, { key: 'partNumber', label: 'Part #' }, { key: 'quantity', label: 'Qty' }, { key: 'location', label: 'Location' }, { key: 'supplier', label: 'Supplier' }, { key: 'unitCost', label: 'Unit Cost' }].map(col => (
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
                            <TableCell><Badge variant="outline" className={cn('text-xs', stock.class)}>{stock.label}</Badge></TableCell>
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
        </div>
      </div>

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
