import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DeclareEmergencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedType?: string;
}

const emergencyTypes = [
  { value: 'fire', label: '🔥 Fire', color: 'text-critical' },
  { value: 'flood', label: '🌊 Flood', color: 'text-primary' },
  { value: 'power-loss', label: '⚡ Power Loss', color: 'text-warning' },
  { value: 'chiller-fail', label: '❄️ Chiller Fail', color: 'text-primary' },
  { value: 'boiler-lockout', label: '🔥 Boiler Lockout', color: 'text-warning' },
  { value: 'production-shutdown', label: '🏭 Production Shutdown', color: 'text-critical' },
  { value: 'chemical-spill', label: '☢️ Chemical Spill', color: 'text-critical' },
];

export function DeclareEmergencyDialog({ open, onOpenChange, preselectedType }: DeclareEmergencyDialogProps) {
  const [type, setType] = useState(preselectedType || '');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    const typeName = emergencyTypes.find(t => t.value === type)?.label || type;
    toast({ 
      title: 'Emergency Declared', 
      description: `${typeName} emergency has been declared. Response team notified.`,
      variant: 'destructive'
    });
    setType('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-critical">
            <AlertTriangle className="w-5 h-5" />
            Declare Emergency
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-critical/10 border border-critical/30">
            <p className="text-sm text-critical">
              Declaring an emergency will immediately notify all on-call staff and vendors.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Emergency Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select emergency type" />
              </SelectTrigger>
              <SelectContent>
                {emergencyTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea 
              placeholder="Describe the emergency situation..." 
              className="min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Location</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="building-a">Building A - Main Plant</SelectItem>
                <SelectItem value="building-b">Building B - Production</SelectItem>
                <SelectItem value="building-c">Building C - Storage</SelectItem>
                <SelectItem value="exterior">Exterior/Grounds</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!type}>
            Declare Emergency
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
