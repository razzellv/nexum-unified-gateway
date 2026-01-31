import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

const CATEGORIES = [
  { value: 'BOLTS', label: 'Bolts', icon: '🔩' },
  { value: 'FILTERS', label: 'Filters', icon: '🔲' },
  { value: 'GASKETS', label: 'Gaskets', icon: '⭕' },
  { value: 'BELTS', label: 'Belts', icon: '➰' },
  { value: 'BEARINGS', label: 'Bearings', icon: '⚙️' },
  { value: 'VALVES', label: 'Valves', icon: '🔧' },
  { value: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
  { value: 'OTHER', label: 'Other', icon: '📦' },
];

export default function InventorySection() {
  const [activeCategory, setActiveCategory] = useState('BOLTS');
  const [inventory, setInventory] = useState<InventoryPart[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryPart[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPart, setNewPart] = useState<Partial<InventoryPart>>({
    category: 'BOLTS',
    quantity: 0,
    minQuantity: 0,
    unitCost: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, activeCategory, searchTerm]);

  const fetchInventory = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/inventory`);
      // const data = await response.json();
      // setInventory(data.parts || []);

      // Mock data for demonstration
      setTimeout(() => {
        const mockData: InventoryPart[] = [
          {
            partId: 'bolt-001',
            category: 'BOLTS',
            name: '1/2" Hex Bolt Grade 8',
            partNumber: 'HB-12-100',
            quantity: 150,
            minQuantity: 25,
            location: 'Warehouse B, Shelf 3',
            supplier: 'Acme Hardware',
            unitCost: 0.75,
            compatibleEquipment: ['B-01', 'B-02', 'P-05'],
            lastRestocked: '2026-01-15',
            notes: 'Grade 8 steel, corrosion resistant'
          },
          {
            partId: 'bolt-002',
            category: 'BOLTS',
            name: '3/8" Carriage Bolt',
            partNumber: 'CB-38-75',
            quantity: 8,
            minQuantity: 50,
            location: 'Warehouse B, Shelf 3',
            supplier: 'Acme Hardware',
            unitCost: 0.45,
            compatibleEquipment: ['AHU-01', 'AHU-02'],
            lastRestocked: '2025-12-20',
          },
          {
            partId: 'filter-001',
            category: 'FILTERS',
            name: 'HVAC Filter 20x25x4 MERV 13',
            partNumber: 'FLT-20254-M13',
            quantity: 24,
            minQuantity: 12,
            location: 'Warehouse A, Section 2',
            supplier: 'FilterPro Inc',
            unitCost: 18.50,
            compatibleEquipment: ['AHU-01', 'AHU-03', 'AHU-05'],
            lastRestocked: '2026-01-10',
            notes: 'Replace quarterly'
          },
          {
            partId: 'gasket-001',
            category: 'GASKETS',
            name: 'Flange Gasket 6" 150#',
            partNumber: 'GK-6-150',
            quantity: 45,
            minQuantity: 15,
            location: 'Warehouse B, Shelf 5',
            supplier: 'Industrial Seals LLC',
            unitCost: 8.75,
            compatibleEquipment: ['B-01', 'B-02', 'CH-01'],
            lastRestocked: '2026-01-20',
            notes: 'High-temperature rated'
          },
        ];
        setInventory(mockData);
        setIsLoading(false);
      }, 500);

    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  const filterInventory = () => {
    let filtered = inventory.filter(part => part.category === activeCategory);
    
    if (searchTerm) {
      filtered = filtered.filter(part =>
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredInventory(filtered);
  };

  const handleAddPart = async () => {
    if (!newPart.name || !newPart.partNumber) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      // TODO: POST /inventory
      // const response = await fetch(`${API_BASE_URL}/inventory`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newPart)
      // });

      toast({
        title: 'Success',
        description: 'Part added to inventory'
      });
      
      setIsAddDialogOpen(false);
      setNewPart({ category: 'BOLTS', quantity: 0, minQuantity: 0, unitCost: 0 });
      fetchInventory();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add part',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateQuantity = async (partId: string, change: number) => {
    const part = inventory.find(p => p.partId === partId);
    if (!part) return;

    const newQuantity = Math.max(0, part.quantity + change);

    try {
      // TODO: PUT /inventory/{partId}
      toast({
        title: 'Success',
        description: `Quantity updated to ${newQuantity}`
      });
      fetchInventory();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update quantity',
        variant: 'destructive'
      });
    }
  };

  const handleDeletePart = async (partId: string) => {
    if (!confirm('Remove this part from inventory?')) return;

    try {
      // TODO: DELETE /inventory/{partId}
      toast({
        title: 'Success',
        description: 'Part removed from inventory'
      });
      fetchInventory();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete part',
        variant: 'destructive'
      });
    }
  };

  const lowStockCount = inventory.filter(p => p.quantity < p.minQuantity).length;

  return (
    <Card className="neon-border opacity-0 fade-scale-in" style={{ animationDelay: '300ms' }}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Parts & Supplies Inventory
            {lowStockCount > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {lowStockCount} Low Stock
              </Badge>
            )}
          </CardTitle>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Part
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Part</DialogTitle>
                <DialogDescription>
                  Add a new part or supply to the inventory
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={newPart.category}
                    onValueChange={(value) => setNewPart({ ...newPart, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="name">Part Name *</Label>
                  <Input
                    id="name"
                    value={newPart.name || ''}
                    onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                    placeholder="1/2 inch Hex Bolt Grade 8"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="partNumber">Part Number *</Label>
                  <Input
                    id="partNumber"
                    value={newPart.partNumber || ''}
                    onChange={(e) => setNewPart({ ...newPart, partNumber: e.target.value })}
                    placeholder="HB-12-100"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newPart.quantity || 0}
                      onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="minQuantity">Min Quantity</Label>
                    <Input
                      id="minQuantity"
                      type="number"
                      value={newPart.minQuantity || 0}
                      onChange={(e) => setNewPart({ ...newPart, minQuantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newPart.location || ''}
                    onChange={(e) => setNewPart({ ...newPart, location: e.target.value })}
                    placeholder="Warehouse A, Shelf 1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={newPart.supplier || ''}
                      onChange={(e) => setNewPart({ ...newPart, supplier: e.target.value })}
                      placeholder="Acme Hardware"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unitCost">Unit Cost ($)</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      step="0.01"
                      value={newPart.unitCost || 0}
                      onChange={(e) => setNewPart({ ...newPart, unitCost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPart}>Add Part</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or part number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value} className="text-xs">
                <span className="mr-1">{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.value} value={cat.value} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No matching parts found' : `No ${cat.label.toLowerCase()} in inventory`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredInventory.map(part => {
                    const isLowStock = part.quantity < part.minQuantity;
                    const stockPct = (part.quantity / part.minQuantity) * 100;
                    
                    return (
                      <div
                        key={part.partId}
                        className={cn(
                          'p-4 rounded-lg border transition-all',
                          isLowStock 
                            ? 'border-destructive/30 bg-destructive/5' 
                            : 'border-border/50 bg-muted/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Part Info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{part.name}</h4>
                              {isLowStock && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Part #:</span>
                                <span className="ml-2 font-mono text-xs">{part.partNumber}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Location:</span>
                                <span className="ml-2 text-xs">{part.location}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Supplier:</span>
                                <span className="ml-2 text-xs">{part.supplier}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Unit:</span>
                                <span className="ml-2 font-semibold text-xs">${part.unitCost.toFixed(2)}</span>
                              </div>
                            </div>

                            {part.compatibleEquipment && part.compatibleEquipment.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">Compatible:</span>
                                {part.compatibleEquipment.map(eq => (
                                  <Badge key={eq} variant="outline" className="text-[10px] px-1.5 py-0">
                                    {eq}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="text-right">
                            <div className="text-3xl font-bold mb-1">{part.quantity}</div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Min: {part.minQuantity}
                            </div>
                            
                            <div className="w-24 h-2 bg-muted rounded-full mb-3 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all',
                                  stockPct >= 100 ? 'bg-green-500' :
                                  stockPct >= 50 ? 'bg-yellow-500' :
                                  'bg-destructive'
                                )}
                                style={{ width: `${Math.min(stockPct, 100)}%` }}
                              />
                            </div>

                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateQuantity(part.partId, -1)}
                                disabled={part.quantity <= 0}
                              >
                                <TrendingDown className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateQuantity(part.partId, 1)}
                              >
                                <TrendingUp className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeletePart(part.partId)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
