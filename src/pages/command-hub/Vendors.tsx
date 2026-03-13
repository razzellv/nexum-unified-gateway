import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { VendorCard } from '@/components/command-hub/vendors/VendorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Phone, RefreshCw } from 'lucide-react';
import { AddVendorDialog } from '@/components/command-hub/dialogs/AddVendorDialog';
import { FilterDialog } from '@/components/command-hub/dialogs/FilterDialog';
import { toast } from '@/hooks/use-toast';

const API_BASE = "https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod";

const getToken = () =>
  localStorage.getItem("nexum_access_token") ||
  localStorage.getItem("nexum_id_token") ||
  localStorage.getItem("accessToken") || "";

export interface Vendor {
  vendorId: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  specialty: string[];
  onCall: boolean;
  insuranceExpiry?: string;
  responseTimeRating: number;
  activeContracts: number;
  totalSpend: number;
  createdAt?: string;
}

const SPECIALTIES = ['All', 'Boilers', 'Chillers', 'Electrical', 'Controls', 'Safety', 'General', 'Pumps', 'Piping', 'Refrigeration', 'Burners'];

const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('All');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vendors?facilityId=facility-001`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch (err) {
      console.error('Failed to load vendors:', err);
      toast({ title: 'Error', description: 'Could not load vendors. Check your connection.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleVendorAdded = (newVendor: Vendor) => {
    setVendors(prev => [newVendor, ...prev]);
    toast({ title: 'Vendor Added', description: `${newVendor.name} has been added to the Vendor Hub.` });
  };

  const handleDeleteVendor = async (vendorId: string, vendorName: string) => {
    try {
      const res = await fetch(`${API_BASE}/vendors?facilityId=facility-001&vendorId=${vendorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setVendors(prev => prev.filter(v => v.vendorId !== vendorId));
      toast({ title: 'Vendor Removed', description: `${vendorName} has been removed.` });
    } catch (err) {
      toast({ title: 'Error', description: 'Could not remove vendor.', variant: 'destructive' });
    }
  };

  const handleAssignProject = (vendorId: string, vendorName: string) => {
    toast({ title: 'Coming Soon', description: `Project assignment for ${vendorName} — linked to Work Orders in next update.` });
  };

  const handleViewContracts = (vendorId: string, vendorName: string) => {
    toast({ title: 'Coming Soon', description: `Contract management for ${vendorName} — available in BUSINESS tier.` });
  };

  const handleEmergencyContacts = () => {
    const onCall = vendors.filter(v => v.onCall);
    const list = onCall.map(v => `${v.name}: ${v.phone}`).join('\n');
    toast({ title: `${onCall.length} On-Call Vendors`, description: list || 'No vendors currently on call.' });
  };

  const filtered = vendors.filter(v => {
    const matchSearch = !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      v.specialty?.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchSpecialty = activeSpecialty === 'All' ||
      v.specialty?.some(s => s.toLowerCase() === activeSpecialty.toLowerCase());
    return matchSearch && matchSpecialty;
  });

  const onCallVendors = vendors.filter(v => v.onCall);

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Vendor Hub</h1>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading...' : `${vendors.length} vendors • ${onCallVendors.length} on call`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  className="pl-10 w-full sm:w-48 md:w-64 bg-muted/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchVendors}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={() => setShowAddVendor(true)}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Vendor</span>
              </Button>
            </div>
          </div>
        </div>

        {/* On Call Banner */}
        {onCallVendors.length > 0 && (
          <div className="glass-panel p-4 border-l-4 border-l-success">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-success shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">On-Call Vendors</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {onCallVendors.map(v => v.name).join(', ')}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleEmergencyContacts} className="shrink-0">
                Emergency Contact List
              </Button>
            </div>
          </div>
        )}

        {/* Specialty Filters */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
          {SPECIALTIES.map((specialty) => (
            <Badge
              key={specialty}
              variant="outline"
              className={`cursor-pointer hover:bg-muted shrink-0 capitalize ${activeSpecialty === specialty ? 'bg-muted border-primary/50 text-primary' : ''}`}
              onClick={() => setActiveSpecialty(specialty)}
            >
              {specialty}
            </Badge>
          ))}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium mb-1">No vendors found</p>
            <p className="text-sm">
              {search || activeSpecialty !== 'All'
                ? 'Try adjusting your search or filter.'
                : 'Add your first vendor to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filtered.map((vendor) => (
              <VendorCard
                key={vendor.vendorId}
                vendor={vendor}
                onAssignProject={() => handleAssignProject(vendor.vendorId, vendor.name)}
                onViewContracts={() => handleViewContracts(vendor.vendorId, vendor.name)}
                onDelete={() => handleDeleteVendor(vendor.vendorId, vendor.name)}
              />
            ))}
          </div>
        )}
      </div>

      <AddVendorDialog
        open={showAddVendor}
        onOpenChange={setShowAddVendor}
        onVendorAdded={handleVendorAdded}
      />
      <FilterDialog
        open={showFilter}
        onOpenChange={setShowFilter}
        title="Filter Vendors"
        categories={['On Call', 'Boilers', 'Chillers', 'Electrical', 'Controls']}
      />
    </MainLayout>
  );
};

export default Vendors;
