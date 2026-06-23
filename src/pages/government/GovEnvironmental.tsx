import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Leaf, CheckCircle2, XCircle, Lightbulb, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnvCategory {
  key: string;
  label: string;
  items: string[];
  inverted?: boolean;
}

const CATEGORIES: EnvCategory[] = [
  {
    key: 'stormwaterMS4',
    label: 'Stormwater / MS4',
    items: ['NPDES Permit Current', 'Annual Report Filed', 'Stormwater Management Plan Current', 'Public Education Program', 'BMP Inspections Documented'],
  },
  {
    key: 'spcc',
    label: 'SPCC Program',
    items: ['SPCC Plan Current (< 5 years)', 'Secondary Containment Inspected', 'Spill Response Equipment Maintained', 'Personnel Trained', 'Annual Inspection Completed'],
  },
  {
    key: 'tierII',
    label: 'Tier II Reporting',
    items: ['Inventory Complete & Filed', 'Facility Emergency Response Plan', 'LEPC Coordination', 'Chemical Storage Maps Current', 'Annual Review Completed'],
  },
  {
    key: 'hazmat',
    label: 'Hazardous Materials',
    items: ['HazMat Inventory Current', 'Storage Compliance', 'Disposal Contracts Current', 'Personnel Training Current', 'Emergency Response Plan'],
  },
  {
    key: 'reporting',
    label: 'Environmental Reporting',
    items: ['DEP Reports Filed on Time', 'No Violations in Last 3 Years', 'Permit Renewals Current', 'Compliance Schedule Met', 'Environmental Audit Recent'],
  },
];

type CheckState = Record<string, Record<string, boolean>>;

function calcExposureScore(checked: CheckState): number {
  let compliant = 0; let total = 0;
  CATEGORIES.forEach(cat => {
    cat.items.forEach(item => {
      total++;
      if (checked[cat.key]?.[item]) compliant++;
    });
  });
  if (total === 0) return 100;
  return Math.round((compliant / total) * 100);
}

function scoreLabel(pct: number): string {
  if (pct >= 90) return 'Compliant';
  if (pct >= 75) return 'Mostly Compliant';
  if (pct >= 50) return 'Partial Compliance';
  return 'High Exposure';
}

function scoreBadge(pct: number): string {
  if (pct >= 90) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (pct >= 75) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (pct >= 50) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  return 'bg-red-500/20 text-red-300 border-red-500/30';
}

function getOutstandingItems(checked: CheckState): string[] {
  const gaps: string[] = [];
  CATEGORIES.forEach(cat => {
    cat.items.forEach(item => {
      if (!checked[cat.key]?.[item]) gaps.push(`[${cat.label}] ${item}`);
    });
  });
  return gaps.slice(0, 8);
}

function generateInsights(checked: CheckState, pct: number): string[] {
  const insights: string[] = [];
  const outstanding = getOutstandingItems(checked);
  if (pct < 50) insights.push('Environmental compliance posture is critically low — immediate remediation required to avoid regulatory enforcement.');
  if (pct >= 90) insights.push('Strong environmental compliance posture — document as part of annual sustainability report.');
  const spccItems = CATEGORIES.find(c => c.key === 'spcc')!.items.filter(i => !checked['spcc']?.[i]);
  if (spccItems.length > 0) insights.push(`SPCC gaps detected: ${spccItems.length} item(s) outstanding — SPCC violations carry significant penalties.`);
  const tierIIItems = CATEGORIES.find(c => c.key === 'tierII')!.items.filter(i => !checked['tierII']?.[i]);
  if (tierIIItems.length > 0) insights.push(`Tier II reporting gaps: ${tierIIItems.length} item(s) outstanding — coordinate with LEPC immediately.`);
  if (outstanding.length > 0) insights.push(`${outstanding.length} compliance item(s) outstanding — prioritize based on permit deadlines and regulatory risk.`);
  insights.push('Schedule annual environmental compliance audit with qualified environmental consultant.');
  return insights.slice(0, 5);
}

export default function GovEnvironmental() {
  const [checked, setChecked] = useState<CheckState>({});

  const load = useCallback(() => {
    const raw = localStorage.getItem('nexum_gov_environmental_assessment');
    if (raw) { try { setChecked(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(catKey: string, item: string) {
    setChecked(prev => {
      const next = { ...prev, [catKey]: { ...(prev[catKey] || {}), [item]: !prev[catKey]?.[item] } };
      localStorage.setItem('nexum_gov_environmental_assessment', JSON.stringify(next));
      return next;
    });
  }

  const score = calcExposureScore(checked);
  const outstanding = getOutstandingItems(checked);
  const insights = generateInsights(checked, score);
  const colorClass = score >= 90 ? 'text-emerald-400' : score >= 75 ? 'text-amber-400' : score >= 50 ? 'text-orange-400' : 'text-red-400';

  let compliantCount = 0; let totalCount = 0;
  CATEGORIES.forEach(cat => { cat.items.forEach(item => { totalCount++; if (checked[cat.key]?.[item]) compliantCount++; }); });

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Environmental Intelligence™</h1>
              <p className="text-muted-foreground text-sm">Environmental compliance assessment and exposure analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn('text-sm px-3 py-1 border', scoreBadge(score))}>{scoreLabel(score)}</Badge>
            <span className={cn('text-2xl font-bold', colorClass)}>{score}%</span>
          </div>
        </div>

        {/* Score Bar */}
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Environmental Compliance Score™</span>
              <span className="text-sm text-muted-foreground">{compliantCount}/{totalCount} items compliant</span>
            </div>
            <Progress value={score} className="h-3" />
          </CardContent>
        </Card>

        {/* Category Checklists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map(cat => {
            const catCompliant = cat.items.filter(i => checked[cat.key]?.[i]).length;
            const catPct = Math.round((catCompliant / cat.items.length) * 100);
            return (
              <Card key={cat.key} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground">{cat.label}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Progress value={catPct} className="w-16 h-1.5" />
                      <span className={cn('text-xs font-bold', catPct === 100 ? 'text-emerald-400' : catPct >= 60 ? 'text-amber-400' : 'text-red-400')}>
                        {catCompliant}/{cat.items.length}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
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
                            : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          }
                          <span className={cn('text-xs', isChecked ? 'text-foreground' : 'text-muted-foreground')}>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Outstanding Items */}
        {outstanding.length > 0 && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Outstanding Compliance Items ({outstanding.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {outstanding.map((item, i) => (
                  <li key={i} className="text-xs text-foreground flex gap-2">
                    <span className="text-red-400 shrink-0">•</span> {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* AI Insights */}
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> AI Environmental Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground">
                  <span className="text-emerald-400 font-bold shrink-0">•</span> {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
