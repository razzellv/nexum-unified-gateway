import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface NewSolicitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewSolicitationDialog({ open, onOpenChange }: NewSolicitationDialogProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    toast({ title: 'Solicitation Created', description: `"${title}" has been added to procurement.` });
    setTitle('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Solicitation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Title</label>
            <Input 
              placeholder="Enter solicitation title..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Estimated Amount</label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Due Date</label>
              <Input type="date" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="maintenance">Maintenance Services</SelectItem>
                <SelectItem value="parts">Parts & Supplies</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="construction">Construction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea placeholder="Describe the procurement needs..." className="min-h-[100px]" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title}>Create Solicitation</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
