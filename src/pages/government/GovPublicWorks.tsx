import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wrench, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PWCategory {
  key: string;
  label: string;
  items: string[];
}

const CATEGORIES: PWCategory[] = [
  {
    key: 'roadways',
    label: 'Roadways',
    items: ['Condition Rating System in Use', 'Annual Inspection Program', 'Pothole/Repair Response SLA', 'Pavement Management System', 'Bridge Inspection Current'],
  },
  {
    key: 'stormwater',
    label: 'Stormwater',
    items: ['MS4 Program Active', 'Annual Inspection Program', 'Inlet/Outlet Mapping Complete', 'Catch Basin Maintenance Log', 'Illicit Discharge Program'],
  },
  {
    key: 'pumpStations',
    label: 'Pump Stations',
    items: ['All Stations Inventoried', 'Backup Power Available', 'Maintenance Schedule Current', 'SCADA Monitoring', 'Emergency Response Plan'],
  },
  {
    key: 'trafficSystems',
    label: 'Traffic Systems',
    items: ['Signal Maintenance Program', 'Emergency Pre-emption Functional', 'Timing Plan Current', 'LED Conversion Complete', 'Coordination Plan w/ State'],
  },
  {
    key: 'municipalBuildings',
    label: 'Municipal Buildings',
    items: ['Asset Management System', 'Capital Plan Current', 'Maintenance Work Order System', 'ADA Compliance Assessment', 'Energy Benchmarking'],
  },
];

type Ratings = Record<string, Record<string, number>>;

function calcScore(ratings: Ratings): { total: number; max: number; pct: number } {
  let total = 0; let max = 0;
  CATEGORIES.forEach(cat => { cat.items.forEach(item => { max += 2; total += ratings[cat.key]?.[item] ?? 0; }); });
  return { total, max, pct: max === 0 ? 0 : Math.round((total / max) * 100) };
}

function scoreLabel(pct: number): string {
  if (pct >= 80) return 'High Reliability';
  if (pct >= 60) return 'Moderate Reliability';
  if (pct >= 40) return 'Developing';
  return 'Critical Gaps';
}

function scoreBadge(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (pct >= 60) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (pct >= 40) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  return 'bg-red-500/20 text-red-300 border-red-500/30';
}

function getTopPriorities(ratings: Ratings): string[] {
  const gaps: { label: string; catLabel: string; score: number }[] = [];
  CATEGORIES.forEach(cat => {
    cat.items.forEach(item => {
      const val = ratings[cat.key]?.[item] ?? 0;
      if (val < 2) gaps.push({ label: item, catLabel: cat.label, score: val });
    });
  });
  gaps.sort((a, b) => a.score - b.score);
  return gaps.slice(0, 5).map((g, i) => `${i + 1}. [${g.catLabel}] ${g.label} — currently ${g.score === 0 ? 'Not Present' : 'Partial'}`);
}

export default function GovPublicWorks() {
  const [ratings, setRatings] = useState<Ratings>({});

  const load = useCallback(() => {
    const raw = localStorage.getItem('nexum_gov_public_works_assessment');
    if (raw) { try { setRatings(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  useEffect(() => { load(); }, [load]);

  function setRating(catKey: string, item: string, val: number) {
    setRatings(prev => {
      const next = { ...prev, [catKey]: { ...(prev[catKey] || {}), [item]: val } };
      localStorage.setItem('nexum_gov_public_works_assessment', JSON.stringify(next));
      return next;
    });
  }

  const { total, max, pct } = calcScore(ratings);
  const priorities = getTopPriorities(ratings);

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-teal-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Public Works Intelligence™</h1>
              <p className="text-muted-foreground text-sm">Infrastructure reliability scoring across all public works systems</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn('text-sm px-3 py-1 border', scoreBadge(pct))}>{scoreLabel(pct)}</Badge>
            <span className={cn('text-2xl font-bold', pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : pct >= 40 ? 'text-orange-400' : 'text-red-400')}>{pct}%</span>
          </div>
        </div>

        {/* Overall Score */}
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Infrastructure Reliability Score™</span>
              <span className="text-sm text-muted-foreground">{total}/{max} points</span>
            </div>
            <Progress value={pct} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">0 = Not Present | 1 = Partial | 2 = Strong</p>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map(cat => {
            const catMax = cat.items.length * 2;
            const catTotal = cat.items.reduce((s, item) => s + (ratings[cat.key]?.[item] ?? 0), 0);
            const catPct = Math.round((catTotal / catMax) * 100);
            return (
              <Card key={cat.key} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground">{cat.label}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Progress value={catPct} className="w-16 h-1.5" />
                      <span className={cn('text-xs font-bold', catPct >= 80 ? 'text-emerald-400' : catPct >= 50 ? 'text-amber-400' : 'text-red-400')}>
                        {catTotal}/{catMax}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {cat.items.map(item => {
                    const cur = ratings[cat.key]?.[item] ?? -1;
                    return (
                      <div key={item} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-xs text-foreground">{item}</span>
                        <div className="flex gap-1">
                          {[0, 1, 2].map(val => (
                            <button
                              key={val}
                              onClick={() => setRating(cat.key, item, val)}
                              className={cn(
                                'w-7 h-7 rounded text-xs font-bold border transition-colors',
                                cur === val
                                  ? val === 0 ? 'bg-red-500/20 border-red-500 text-red-300'
                                    : val === 1 ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                    : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                  : 'border-border text-muted-foreground hover:border-primary/50'
                              )}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Top Infrastructure Priorities */}
        {priorities.length > 0 && (
          <Card className="border-teal-500/20 bg-teal-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-teal-400 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Top 5 Infrastructure Priorities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {priorities.map((p, i) => (
                  <li key={i} className="text-xs text-foreground">{p}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
