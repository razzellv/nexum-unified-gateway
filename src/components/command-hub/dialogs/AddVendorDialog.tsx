import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Vendor } from '@/pages/command-hub/Vendors';

const API_BASE = "https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod";

const getToken = () =>
  localStorage.getItem("nexum_id_token") ||
  localStorage.getItem("nexum_access_token") ||
  localStorage.getItem("accessToken") || "";

interface AddVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendorAdded?: (vendor: Vendor) => void;
}

const EMPTY = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  specialty: '',
  onCall: false,
};

export function AddVendorDialog({ open, onOpenChange, onVendorAdded }: AddVendorDialogProps) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof EMPTY, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          facilityId: 'facility-001',
          name: form.name.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          specialty: form.specialty ? [form.specialty] : [],
          onCall: form.onCall,
          responseTimeRating: 0,
          activeContracts: 0,
          totalSpend: 0,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newVendor: Vendor = await res.json();
      onVendorAdded?.(newVendor);
      setForm(EMPTY);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not save vendor. Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Vendor Name *</label>
            <Input
              placeholder="Enter vendor name..."
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Contact Name</label>
            <Input
              placeholder="Primary contact name..."
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                placeholder="contact@vendor.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input
                type="tel"
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Specialty</label>
            <Select value={form.specialty} onValueChange={(v) => set('specialty', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boilers">Boilers</SelectItem>
                <SelectItem value="chillers">Chillers</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="controls">Controls</SelectItem>
                <SelectItem value="pumps">Pumps</SelectItem>
                <SelectItem value="piping">Piping</SelectItem>
                <SelectItem value="refrigeration">Refrigeration</SelectItem>
                <SelectItem value="burners">Burners</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="general">General Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium text-sm">On-Call Status</p>
              <p className="text-xs text-muted-foreground">Available for emergency dispatch</p>
            </div>
            <Switch checked={form.onCall} onCheckedChange={(v) => set('onCall', v)} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim() || saving}>
            {saving ? 'Saving...' : 'Add Vendor'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
