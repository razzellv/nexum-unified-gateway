import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';

const API_BASE = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

interface ConnectedToBannerProps {
  linkedPumpIds: string[];
}

export function ConnectedToBanner({ linkedPumpIds }: ConnectedToBannerProps) {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (linkedPumpIds.length === 0) return;
    const missing = linkedPumpIds.filter((id) => !names[id]);
    if (missing.length === 0) return;

    Promise.allSettled(
      missing.map((id) =>
        fetch(`${API_BASE}/equipment/${id}`)
          .then((r) => r.json())
          .then((d) => ({ id, name: d.name ?? id }))
      )
    ).then((results) => {
      const resolved: Record<string, string> = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled') resolved[r.value.id] = r.value.name;
      });
      setNames((prev) => ({ ...prev, ...resolved }));
    });
  }, [linkedPumpIds]);

  if (linkedPumpIds.length === 0) return null;

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-primary/10 border border-primary/20 text-sm">
      <Link2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <span className="font-medium text-primary">Connected to: </span>
        <span className="text-foreground">
          {linkedPumpIds.map((id) => names[id] ?? id).join(', ')}
        </span>
      </div>
    </div>
  );
}
