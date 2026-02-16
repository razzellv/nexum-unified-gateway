import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { VendorCard } from '@/components/command-hub/vendors/VendorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Phone } from 'lucide-react';
import { mockVendors } from '@/data/mockData';
import { AddVendorDialog } from '@/components/command-hub/dialogs/AddVendorDialog';
import { FilterDialog } from '@/components/command-hub/dialogs/FilterDialog';
import { toast } from '@/hooks/use-toast';

const Vendors = () => {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [activeSpecialty, setActiveSpecialty] = useState<string | null>(null);
  
  const onCallVendors = mockVendors.filter(v => v.onCall);

  const handleSpecialtyFilter = (specialty: string) => {
    setActiveSpecialty(activeSpecialty === specialty ? null : specialty);
  };

  const handleEmergencyContacts = () => {
    toast({ title: 'Emergency Contacts', description: 'Opening emergency contact list...' });
  };

  const handleAssignProject = (vendorId: string, vendorName: string) => {
    toast({ title: 'Assign Project', description: `Opening project assignment for ${vendorName}` });
  };

  const handleViewContracts = (vendorId: string, vendorName: string) => {
    toast({ title: 'View Contracts', description: `Opening contracts for ${vendorName}` });
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Vendor Hub</h1>
              <p className="text-sm text-muted-foreground">
                {mockVendors.length} vendors • {onCallVendors.length} on call
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search vendors..." 
                  className="pl-10 w-full sm:w-48 md:w-64 bg-muted/50"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilter(true)}>
                <Filter className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Filter</span>
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
          {['All Specialties', 'Boilers', 'Chillers', 'Electrical', 'Controls', 'Safety', 'General'].map((specialty) => (
            <Badge 
              key={specialty}
              variant="outline" 
              className={`cursor-pointer hover:bg-muted shrink-0 ${activeSpecialty === specialty ? 'bg-muted' : ''}`}
              onClick={() => handleSpecialtyFilter(specialty)}
            >
              {specialty}
            </Badge>
          ))}
        </div>

        {/* Vendors Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {mockVendors.map((vendor) => (
            <VendorCard 
              key={vendor.id} 
              vendor={vendor}
              onAssignProject={() => handleAssignProject(vendor.id, vendor.name)}
              onViewContracts={() => handleViewContracts(vendor.id, vendor.name)}
            />
          ))}
        </div>
      </div>

      <AddVendorDialog open={showAddVendor} onOpenChange={setShowAddVendor} />
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
