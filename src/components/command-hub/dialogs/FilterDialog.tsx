import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  categories?: string[];
}

export function FilterDialog({ 
  open, 
  onOpenChange, 
  title = 'Filter',
  categories = ['Critical', 'High', 'Medium', 'Low']
}: FilterDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setSelected(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleApply = () => {
    toast({ 
      title: 'Filters Applied', 
      description: selected.length > 0 
        ? `Filtering by: ${selected.join(', ')}` 
        : 'Showing all items'
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelected([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <Input placeholder="Search..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-3 block">Priority</label>
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category} className="flex items-center gap-3">
                  <Checkbox 
                    id={category}
                    checked={selected.includes(category)}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <label htmlFor={category} className="text-sm cursor-pointer">
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" placeholder="From" />
              <Input type="date" placeholder="To" />
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleClear}>Clear All</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleApply}>Apply Filters</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
