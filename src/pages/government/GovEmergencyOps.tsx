import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertOctagon, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistCategory {
  key: string;
  label: string;
  items: string[];
}

const CATEGORIES: ChecklistCategory[] = [
  {
    key: 'backupPower',
    label: 'Backup Power',
    items: ['Generator Available', 'Transfer Switch Tested', 'Fuel Supply (72hr min)', 'Load Test Completed', 'Maintenance Current'],
  },
  {
    key: 'emergencyProcedures',
    label: 'Emergency Procedures',
    items: ['EOP Current & Approved', 'ICS Structure Defined', 'Mutual Aid Agreements', 'Staff Trained on EOPs', 'Tabletop Exercises (Annual)'],
  },
  {
    key: 'communicationSystems',
    label: 'Communication Systems',
    items: ['Backup Radio System', 'Satellite Phone/Communication', 'Emergency Alert System', 'SCADA Backup Access', 'Communication Tree Documented'],
  },
  {
    key: 'disasterRecovery',
    label: 'Disaster Recovery',
    items: ['IT Backup/Recovery Plan', 'Critical Records Backed Up', 'Cloud Redundancy', 'Recovery Time Objective Defined', 'Business Continuity Plan'],
  },
  {
    key: 'incidentCommand',
    label: 'Incident Command',
    items: ['ICS Positions Identified', 'Command Post Designated', 'NIMS Compliant', 'Incident Documentation System', 'After-Action Review Process'],
  },
  {
    key: 'resourceManagement',
    label: 'Resource Management',
    items: ['Emergency Supply Inventory', 'Vendor Emergency Contracts', 'Regional Resource Agreements', 'Equipment Maintenance Current', 'Fuel/Supply Stockpile'],
  },
];

type CheckState = Record<string, Record<string, boolean>>;

function calcScore(checked: CheckState): { total: number; max: number; pct: number } {
  let total = 0; let max = 0;
  CATEGORIES.forEach(cat => { cat.items.forEach(item => { max++; if (checked[cat.key]?.[item]) total++; }); });
  return { total, max, pct: max === 0 ? 0 : Math.round((total / max) * 100) };
}

function scoreBadge(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (pct >= 60) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-red-500/20 text-red-300 border-red-500/30';
}

function scoreLabel(pct: number): string {
  if (pct >= 80) return 'Strong Readiness';
  if (pct >= 60) return 'Moderate Readiness';
  return 'Critical Gaps';
}

function getTopGaps(checked: CheckState): string[] {
  const gaps: string[] = [];
  CATEGORIES.forEach(cat => {
    cat.items.forEach(item => {
      if (!checked[cat.key]?.[item]) gaps.push(`[${cat.label}] ${item}`);
    });
  });
  return gaps.slice(0, 5);
}

export default function GovEmergencyOps() {
  const [checked, setChecked] = useState<CheckState>({});

  const load = useCallback(() => {
    const raw = localStorage.getItem('nexum_gov_emergency_assessment');
    if (raw) { try { setChecked(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(catKey: string, item: string) {
    setChecked(prev => {
      const next = { ...prev, [catKey]: { ...(prev[catKey] || {}), [item]: !prev[catKey]?.[item] } };
      localStorage.setItem('nexum_gov_emergency_assessment', JSON.stringify(next));
      return next;
    });
  }

  const { total, max, pct } = calcScore(checked);
  const gaps = getTopGaps(checked);

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-red-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Emergency Operations Intelligence™</h1>
              <p className="text-muted-foreground text-sm">Assess emergency readiness across 6 critical categories</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn('text-sm px-3 py-1 border', scoreBadge(pct))}>{scoreLabel(pct)}</Badge>
            <span className={cn('text-2xl font-bold', pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400')}>{pct}%</span>
          </div>
        </div>

        {/* Overall Score Bar */}
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Emergency Readiness Score™</span>
              <span className="text-sm text-muted-foreground">{total}/{max} items</span>
            </div>
            <Progress value={pct} className="h-3" />
          </CardContent>
        </Card>

        {/* Category Checklists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map(cat => {
            const catChecked = cat.items.filter(i => checked[cat.key]?.[i]).length;
            const catPct = Math.round((catChecked / cat.items.length) * 100);
            return (
              <Card key={cat.key} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground">{cat.label}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Progress value={catPct} className="w-16 h-1.5" />
                      <span className={cn('text-xs font-bold', catPct === 100 ? 'text-emerald-400' : catPct >= 60 ? 'text-amber-400' : 'text-red-400')}>
                        {catChecked}/{cat.items.length}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {cat.items.map(item => {
                      const isChecked = !!checked[cat.key]?.[item];
                      return (
                        <button
                          key={item}
                          onClick={() => toggle(cat.key, item)}
                          className="w-full flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/40 transition-colors text-left"
                        >
                          {isChecked
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                          }
                          <span className={cn('text-xs', isChecked ? 'text-foreground' : 'text-muted-foreground line-through')}>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Top 5 Gaps */}
        {gaps.length > 0 && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Top 5 Readiness Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {gaps.map((gap, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground">
                    <span className="text-red-400 font-bold shrink-0">{i + 1}.</span> {gap}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
