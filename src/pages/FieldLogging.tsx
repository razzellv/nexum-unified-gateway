import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, ShieldCheck, LayoutGrid, ArrowRight } from 'lucide-react';

const SECTIONS = [
  {
    id: 'data-source',
    title: 'Facility Data Source™',
    description: 'Log equipment readings directly from the field — boiler pressures, chiller temps, pump flow rates, energy readings, and more. Bulk CSV import supported.',
    href: '/data-source',
    icon: Upload,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    badge: 'Primary Logger',
    badgeCls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    id: 'compliance-logger',
    title: 'Compliance Logger™',
    description: 'Log compliance events, PM checks, violations, and safety observations. Everything creates a defensible operational record with timestamps and operator IDs.',
    href: '/compliance-logger',
    icon: ShieldCheck,
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/30',
    badge: 'Compliance',
    badgeCls: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  {
    id: 'evidence-board',
    title: 'Evidence Vault™',
    description: 'Store, tag, and chain-of-custody your photos, documents, and inspection records. Every upload is timestamped and linked to equipment or events.',
    href: '/evidence-board',
    icon: LayoutGrid,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
    badge: 'Evidence',
    badgeCls: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
] as const;

export default function FieldLogging() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Field Logging™</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Three tools for capturing, recording, and vaulting operational data from the field.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {SECTIONS.map(s => (
            <Card key={s.id} className={`border cursor-pointer hover:shadow-md transition-shadow ${s.bg}`} onClick={() => navigate(s.href)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg ${s.bg}`}>
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <Badge className={`text-[10px] ${s.badgeCls}`}>{s.badge}</Badge>
                </div>
                <CardTitle className="text-base mt-3">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">{s.description}</p>
                <Button size="sm" className="w-full" onClick={e => { e.stopPropagation(); navigate(s.href); }}>
                  Open <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-center">
          {[
            { label: 'Equipment Readings', sublabel: 'logged via Data Source', color: 'text-blue-400', key: 'nexum_facility_logs' },
            { label: 'Compliance Events', sublabel: 'via Compliance Logger', color: 'text-green-400', key: 'nexum_violation_events' },
            { label: 'Evidence Records', sublabel: 'in Evidence Vault', color: 'text-purple-400', key: 'nexum_evidence_records' },
          ].map(stat => {
            const count = (() => { try { const r = localStorage.getItem(stat.key); return r ? JSON.parse(r).length : 0; } catch { return 0; } })();
            return (
              <Card key={stat.key}>
                <CardContent className="p-4">
                  <p className={`text-3xl font-bold ${stat.color}`}>{count.toLocaleString()}</p>
                  <p className="text-sm font-medium mt-1">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
