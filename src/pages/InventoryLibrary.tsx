import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Search,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const API_BASE_URL = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'BOLTS', label: 'Bolts' },
  { value: 'FILTERS', label: 'Filters' },
  { value: 'GASKETS', label: 'Gaskets' },
  { value: 'BELTS', label: 'Belts' },
  { value: 'BEARINGS', label: 'Bearings' },
  { value: 'VALVES', label: 'Valves' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'OTHER', label: 'Other' },
];

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
  const { toast } = useToast();

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    filterAndSortInventory();
  }, [inventory, searchTerm, categoryFilter, stockFilter, sortField, sortDirection]);

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
      toast({
        title: 'Error',
        description: 'Failed to load inventory',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortInventory = () => {
    let filtered = [...inventory];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(part =>
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(part => part.category === categoryFilter);
    }

    // Stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter(part => part.quantity < part.minQuantity);
    } else if (stockFilter === 'adequate') {
      filtered = filtered.filter(part => part.quantity >= part.minQuantity);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
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
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Part Name', 'Part Number', 'Category', 'Quantity', 'Min Qty', 'Location', 'Supplier', 'Unit Cost', 'Total Value'];
    const rows = filteredInventory.map(part => [
      part.name,
      part.partNumber,
      part.category,
      part.quantity,
      part.minQuantity,
      part.location,
      part.supplier,
      part.unitCost,
      (part.quantity * part.unitCost).toFixed(2)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: '✅ Exported',
      description: 'Inventory exported to CSV'
    });
  };

  const totalValue = filteredInventory.reduce((sum, part) => 
    sum + (part.quantity * part.unitCost), 0
  );
  
  const lowStockCount = inventory.filter(p => p.quantity < p.minQuantity).length;

  return (
    <MainLayout>
      <ParticleBackground />
      
      <div className="relative z-10 max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-neon-cyan" />
              Inventory Library
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredInventory.length} parts • ${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} total value
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <NexumBranding />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/80 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Parts</p>
                  <p className="text-2xl font-bold">{inventory.length}</p>
                </div>
                <Package className="w-8 h-8 text-neon-cyan" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold text-yellow-400">{lowStockCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">
                    {new Set(inventory.map(p => p.category)).size}
                  </p>
                </div>
                <Filter className="w-8 h-8 text-neon-cyan" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card/80 border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Levels</SelectItem>
                  <SelectItem value="low">Low Stock Only</SelectItem>
                  <SelectItem value="adequate">Adequate Stock</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setStockFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card className="bg-card/80 border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              Inventory Parts
              {lowStockCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {lowStockCount} Low Stock
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No parts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Part Name
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                        <div className="flex items-center gap-1">
                          Category
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer text-right" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center justify-end gap-1">
                          Quantity
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Min Qty</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map(part => {
                      const isLowStock = part.quantity < part.minQuantity;
                      const stockPercent = (part.quantity / part.minQuantity) * 100;
                      const totalValue = part.quantity * part.unitCost;

                      return (
                        <TableRow key={part.partId} className={cn(isLowStock && 'bg-destructive/5')}>
                          <TableCell className="font-medium">{part.name}</TableCell>
                          <TableCell className="font-mono text-xs">{part.partNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{part.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {part.quantity}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {part.minQuantity}
                          </TableCell>
                          <TableCell className="text-xs">{part.location}</TableCell>
                          <TableCell className="text-xs">{part.supplier}</TableCell>
                          <TableCell className="text-right">
                            ${part.unitCost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${totalValue.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {isLowStock ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Low Stock
                              </Badge>
                            ) : stockPercent >= 200 ? (
                              <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Well Stocked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Adequate
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
