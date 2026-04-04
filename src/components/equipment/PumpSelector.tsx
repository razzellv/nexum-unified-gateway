import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Loader2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

interface Pump {
  id: string;
  name: string;
  systemType: string;
}

interface PumpSelectorProps {
  facilityId: string;
  currentEquipmentId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function PumpSelector({ facilityId, currentEquipmentId, selectedIds, onChange }: PumpSelectorProps) {
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!facilityId) return;
    setLoading(true);
    fetch(`${API_BASE}/equipment?facilityId=${facilityId}&systemType=pump`)
      .then((r) => r.json())
      .then((data) => {
        const list: Pump[] = Array.isArray(data) ? data : (data.items ?? data.equipment ?? []);
        setPumps(list.filter((p) => p.id !== currentEquipmentId));
      })
      .catch(() => setPumps([]))
      .finally(() => setLoading(false));
  }, [facilityId, currentEquipmentId]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  };

  if (!facilityId) return null;

  return (
    <div className="input-group">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        Linked Pumps
      </Label>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pumps…
        </div>
      ) : pumps.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No pumps found for this facility.</p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {pumps.map((pump) => {
            const selected = selectedIds.includes(pump.id);
            return (
              <button
                key={pump.id}
                type="button"
                onClick={() => toggle(pump.id)}
                className={cn(
                  'px-3 py-1.5 rounded-md border text-xs font-medium transition-all',
                  selected
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-background/50 border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {pump.name}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Select all pumps serving this system.</p>
    </div>
  );
}
