import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

interface AddVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddVendorDialog({ open, onOpenChange }: AddVendorDialogProps) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [onCall, setOnCall] = useState(false);

  const handleSubmit = () => {
    toast({ title: 'Vendor Added', description: `"${name}" has been added to the vendor hub.` });
    setName('');
    setSpecialty('');
    setOnCall(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Vendor Name</label>
            <Input 
              placeholder="Enter vendor name..." 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Contact Name</label>
            <Input placeholder="Primary contact name..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" placeholder="contact@vendor.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input type="tel" placeholder="(555) 000-0000" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Specialty</label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boilers">Boilers</SelectItem>
                <SelectItem value="chillers">Chillers</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="controls">Controls</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="general">General Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium text-sm">On-Call Status</p>
              <p className="text-xs text-muted-foreground">Available for emergency calls</p>
            </div>
            <Switch checked={onCall} onCheckedChange={setOnCall} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name}>Add Vendor</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
