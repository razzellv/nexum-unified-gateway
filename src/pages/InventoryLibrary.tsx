import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Package, Search, AlertTriangle, TrendingUp, TrendingDown,
  Download, ArrowUpDown, Wrench, Zap, Wind, Hammer, Droplets, Cylinder, Box,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const API_BASE_URL = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

// ── Categorized inventory groups ──────────────────────────────────────────────
const CATEGORY_GROUPS = [
  {
    label: 'All Categories',
    value: 'all',
    icon: Package,
    color: 'text-muted-foreground',
    items: [],
  },
  {
    label: 'Mechanical',
    value: 'MECHANICAL',
    icon: Wrench,
    color: 'text-blue-400',
    description: 'Hardware, structural, and mechanical components',
    items: [
      { value: 'BOLTS_NUTS', label: 'Bolts & Nuts' },
      { value: 'GASKETS', label: 'Gaskets & Seals' },
      { value: 'BEARINGS', label: 'Bearings' },
      { value: 'BELTS', label: 'Belts & Drives' },
      { value: 'FILTERS', label: 'Filters' },
      { value: 'VALVES', label: 'Valves & Actuators' },
      { value: 'PIPES_FITTINGS', label: 'Pipes & Fittings' },
      { value: 'LADDERS', label: 'Ladders & Access' },
      { value: 'TILES_PANELS', label: 'Tiles & Panels' },
      { value: 'DOORS_HATCHES', label: 'Doors & Hatches' },
      { value: 'PUMPS_PARTS', label: 'Pump Parts' },
      { value: 'MECHANICAL_OTHER', label: 'Other Mechanical' },
    ],
  },
  {
    label: 'Electrical',
    value: 'ELECTRICAL',
    icon: Zap,
    color: 'text-yellow-400',
    description: 'Electrical components, wiring, and control devices',
    items: [
      { value: 'WIRE_CABLE', label: 'Wire & Cable' },
      { value: 'CONDUIT', label: 'Conduit & Raceway' },
      { value: 'BREAKERS_FUSES', label: 'Breakers & Fuses' },
      { value: 'RELAYS_CONTACTORS', label: 'Relays & Contactors' },
      { value: 'SWITCHES', label: 'Switches & Disconnects' },
      { value: 'LIGHTS_BALLASTS', label: 'Lights & Ballasts' },
      { value: 'METERS_TESTERS', label: 'Meters & Testers' },
      { value: 'TERMINALS_CONNECTORS', label: 'Terminals & Connectors' },
      { value: 'SENSORS_TRANSDUCERS', label: 'Sensors & Transducers' },
      { value: 'CONTROLS_BOARDS', label: 'Control Boards & PLCs' },
      { value: 'ELECTRICAL_OTHER', label: 'Other Electrical' },
    ],
  },
  {
    label: 'Pneumatic',
    value: 'PNEUMATIC',
    icon: Wind,
    color: 'text-cyan-400',
    description: 'Compressed air system components',
    items: [
      { value: 'SOLENOIDS', label: 'Solenoid Valves' },
      { value: 'AIR_FILTERS', label: 'Air Filters & Dryers' },
      { value: 'REGULATORS', label: 'Regulators & Gauges' },
      { value: 'CYLINDERS_ACTUATORS', label: 'Cylinders & Actuators' },
      { value: 'FITTINGS_TUBING', label: 'Fittings & Tubing' },
      { value: 'COMPRESSOR_PARTS', label: 'Compressor Parts' },
      { value: 'PNEUMATIC_OTHER', label: 'Other Pneumatic' },
    ],
  },
  {
    label: 'Power Tools',
    value: 'POWER',
    icon: Hammer,
    color: 'text-orange-400',
    description: 'Power tools, hand tools, and work equipment',
    items: [
      { value: 'ELECTRIC_TOOLS', label: 'Electric Tools' },
      { value: 'BATTERY_TOOLS', label: 'Battery / Cordless Tools' },
      { value: 'HAND_TOOLS', label: 'Hand Tools' },
      { value: 'DRILLS_BITS', label: 'Drills & Bits' },
      { value: 'GRINDERS_CUTTERS', label: 'Grinders & Cutters' },
      { value: 'TESTING_INSTRUMENTS', label: 'Testing Instruments' },
      { value: 'POWER_OTHER', label: 'Other Tools' },
    ],
  },
  {
    label: 'Treatments',
    value: 'TREATMENTS',
    icon: Droplets,
    color: 'text-green-400',
    description: 'Water treatment, chemical treatments, and salts',
    items: [
      { value: 'SOFTENER_SALT', label: 'Softener Salt' },
      { value: 'BOILER_CHEMICALS', label: 'Boiler Treatment Chemicals' },
      { value: 'COOLING_TOWER_CHEMICALS', label: 'Cooling Tower Treatment' },
      { value: 'DESCALER', label: 'Descalers & Cleaners' },
      { value: 'BIOCIDES', label: 'Biocides & Inhibitors' },
      { value: 'PH_CHEMICALS', label: 'pH Adjustment Chemicals' },
      { value: 'TREATMENT_OTHER', label: 'Other Treatments' },
    ],
  },
  {
    label: 'Lubricants',
    value: 'LUBRICANTS',
    icon: Cylinder,
    color: 'text-purple-400',
    description: 'Oils, greases, and lubrication products',
    items: [
      { value: 'MACHINE_OIL', label: 'Machine Oil' },
      { value: 'COMPRESSOR_OIL', label: 'Compressor Oil' },
      { value: 'HYDRAULIC_FLUID', label: 'Hydraulic Fluid' },
      { value: 'GREASE', label: 'Grease & Bearing Grease' },
      { value: 'FOOD_GRADE_LUBE', label: 'Food Grade Lubricants' },
      { value: 'PENETRATING_OIL', label: 'Penetrating Oil' },
      { value: 'LUBRICANT_OTHER', label: 'Other Lubricants' },
    ],
  },
  {
    label: 'Others',
    value: 'OTHERS',
    icon: Box,
    color: 'text-muted-foreground',
    description: 'Safety, PPE, cleaning, and miscellaneous supplies',
    items: [
      { value: 'AIR_TANKS', label: 'Air Tanks & Vessels' },
      { value: 'PPE', label: 'PPE & Safety Equipment' },
      { value: 'CLEANING_SUPPLIES', label: 'Cleaning Supplies' },
      { value: 'PAPER_TOWELS_RAGS', label: 'Paper Towels & Rags' },
      { value: 'TAPES_ADHESIVES', label: 'Tapes & Adhesives' },
      { value: 'LABELS_TAGS', label: 'Labels & Tags' },
      { value: 'STORAGE_CONTAINERS', label: 'Storage & Containers' },
      { value: 'OTHER', label: 'Other Supplies' },
    ],
  },
];

// Flat list for filtering
const ALL_CATEGORY_OPTIONS = CATEGORY_GROUPS.flatMap(g =>
  g.items?.length ? g.items.map(i => ({ ...i, group: g.value, groupLabel: g.label })) : []
);

const getCategoryLabel = (value: string) => {
  const flat = ALL_CATEGORY_OPTIONS.find(c => c.value === value);
  if (flat) return flat.label;
  const group = CATEGORY_GROUPS.find(g => g.value === value);
  return group?.label || value;
};

const getCategoryGroup = (value: string) => {
  return CATEGORY_GROUPS.find(g => g.items?.some(i => i.value === value)) || null;
};

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
}

export default function InventoryLibrary() {
  const [inventory, setInventory] = useState<InventoryPart[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof InventoryPart>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => { fetchInventory(); }, []);
  useEffect(() => { filterAndSortInventory(); }, [inventory, searchTerm, categoryFilter, stockFilter, sortField, sortDirection, activeGroupFilter]);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data.parts || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({ title: 'Error', description: 'Failed to load inventory. Check your connection.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortInventory = () => {
    let filtered = [...inventory];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(term) ||
        item.partNumber?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) ||
        item.supplier?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term)
      );
    }

    // Group-level filter
    if (activeGroupFilter !== 'all') {
      const group = CATEGORY_GROUPS.find(g => g.value === activeGroupFilter);
      if (group?.items?.length) {
        const groupCats = group.items.map(i => i.value);
        filtered = filtered.filter(item => groupCats.includes(item.category) || item.category === activeGroupFilter);
      }
    }

    // Sub-category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (stockFilter === 'low') {
      filtered = filtered.filter(item => item.quantity <= item.minQuantity);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(item => item.quantity === 0);
    } else if (stockFilter === 'ok') {
      filtered = filtered.filter(item => item.quantity > item.minQuantity);
    }

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    setFilteredInventory(filtered);
  };

  const handleSort = (field: keyof InventoryPart) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStockStatus = (item: InventoryPart) => {
    if (item.quantity === 0) return { label: 'Out of Stock', class: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (item.quantity <= item.minQuantity) return { label: 'Low Stock', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    return { label: 'In Stock', class: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Part Number', 'Category', 'Quantity', 'Min Qty', 'Location', 'Supplier', 'Unit Cost'],
      ...filteredInventory.map(item => [
        item.name, item.partNumber, getCategoryLabel(item.category),
        item.quantity, item.minQuantity, item.location, item.supplier,
        `$${item.unitCost?.toFixed(2) || '0.00'}`,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filteredInventory.length} items exported` });
  };

  // Stats
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(i => i.quantity <= i.minQuantity && i.quantity > 0).length;
  const outOfStockCount = inventory.filter(i => i.quantity === 0).length;
  const totalValue = inventory.reduce((sum, i) => sum + (i.quantity * (i.unitCost || 0)), 0);

  // Category sub-options based on active group
  const subCategoryOptions = activeGroupFilter === 'all'
    ? ALL_CATEGORY_OPTIONS
    : CATEGORY_GROUPS.find(g => g.value === activeGroupFilter)?.items || [];

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
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
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
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Category group tabs */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_GROUPS.map(group => {
            const Icon = group.icon;
            const isActive = activeGroupFilter === group.value;
            return (
              <button
                key={group.value}
                onClick={() => { setActiveGroupFilter(group.value); setCategoryFilter('all'); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                  isActive
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:border-border'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : group.color)} />
                {group.label}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search parts, suppliers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Sub-category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sub-Categories</SelectItem>
              {subCategoryOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
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

        {/* Table */}
        <Card className="glass-panel">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                Loading inventory...
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No inventory items found</p>
                <p className="text-sm mt-1">
                  {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add inventory items to get started'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'category', label: 'Category' },
                      { key: 'partNumber', label: 'Part #' },
                      { key: 'quantity', label: 'Qty' },
                      { key: 'location', label: 'Location' },
                      { key: 'supplier', label: 'Supplier' },
                      { key: 'unitCost', label: 'Unit Cost' },
                    ].map(col => (
                      <TableHead
                        key={col.key}
                        className="cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => handleSort(col.key as keyof InventoryPart)}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortField === col.key && (
                            <ArrowUpDown className="w-3 h-3" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map(item => {
                    const stock = getStockStatus(item);
                    const group = getCategoryGroup(item.category);
                    const GroupIcon = group?.icon || Package;
                    return (
                      <TableRow key={item.partId} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <GroupIcon className={cn('w-3.5 h-3.5', group?.color || 'text-muted-foreground')} />
                            <span className="text-xs text-muted-foreground">{getCategoryLabel(item.category)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.partNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('font-bold', item.quantity === 0 ? 'text-destructive' : item.quantity <= item.minQuantity ? 'text-yellow-400' : 'text-foreground')}>
                              {item.quantity}
                            </span>
                            <span className="text-xs text-muted-foreground">/ {item.minQuantity} min</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.location}</TableCell>
                        <TableCell className="text-sm">{item.supplier}</TableCell>
                        <TableCell className="text-sm">${item.unitCost?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', stock.class)}>{stock.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
