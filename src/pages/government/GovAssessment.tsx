import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ScoreKey = 'infrastructure' | 'operational' | 'decision' | 'workforce' | 'compliance' | 'capitalPlanning';

interface CategoryDef {
  key: ScoreKey;
  label: string;
  color: string;
  items: string[];
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'infrastructure',
    label: 'Infrastructure Continuity',
    color: 'text-blue-400',
    items: [
      'Asset Condition Documentation',
      'Critical Systems Inventory',
      'Single Points of Failure Identification',
      'Deferred Maintenance Log',
      'Lifecycle Risk Assessment',
    ],
  },
  {
    key: 'operational',
    label: 'Operational Continuity',
    color: 'text-teal-400',
    items: [
      'SOPs Available & Current',
      'EOPs Available & Current',
      'MOPs Available & Current',
      'Knowledge Capture System',
      'Cross-Training Program',
    ],
  },
  {
    key: 'decision',
    label: 'Decision Continuity',
    color: 'text-violet-400',
    items: [
      'Historical Decision Log',
      'Project Documentation Archive',
      'Lessons Learned Repository',
      'Leadership Transition Readiness',
      'Governance Records Complete',
    ],
  },
  {
    key: 'workforce',
    label: 'Workforce Continuity',
    color: 'text-amber-400',
    items: [
      'Retirement Exposure Assessment',
      'Skill Gap Analysis',
      'Knowledge Transfer Program',
      'Succession Planning',
    ],
  },
  {
    key: 'compliance',
    label: 'Compliance Readiness',
    color: 'text-green-400',
    items: [
      'OSHA Compliance Status',
      'EPA/NJDEP Compliance',
      'MS4/Stormwater Program',
      'Tier II Reporting',
      'NFPA Compliance',
    ],
  },
  {
    key: 'capitalPlanning',
    label: 'Capital Planning Readiness',
    color: 'text-orange-400',
    items: [
      'Asset Lifecycle Data Available',
      '5-Year Replacement Schedule',
      'Budget Alignment Documented',
      'Funding Source Identified',
    ],
  },
];

type ItemRatings = Record<string, Record<string, number>>;

function calcCategoryScore(key: ScoreKey, ratings: ItemRatings): number {
  const cat = CATEGORIES.find(c => c.key === key)!;
  const total = cat.items.reduce((sum, item) => sum + (ratings[key]?.[item] ?? 0), 0);
  return Math.min(13, total);
}

export default function GovAssessment() {
  const navigate = useNavigate();
  const [agencyName, setAgencyName] = useState('');
  const [agencyType, setAgencyType] = useState('');
  const [ratings, setRatings] = useState<ItemRatings>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ infrastructure: true });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('nexum_gov_assessment_ratings');
    if (raw) { try { setRatings(JSON.parse(raw)); } catch { /* ignore */ } }
    setAgencyName(localStorage.getItem('nexum_gov_agency_name') || '');
    setAgencyType(localStorage.getItem('nexum_gov_agency_type') || '');
  }, []);

  function setRating(catKey: ScoreKey, item: string, val: number) {
    setRatings(prev => ({ ...prev, [catKey]: { ...(prev[catKey] || {}), [item]: val } }));
  }

  function handleSubmit() {
    const scores: Record<string, number> = {};
    CATEGORIES.forEach(cat => { scores[cat.key] = calcCategoryScore(cat.key, ratings); });
    localStorage.setItem('nexum_gov_scores', JSON.stringify(scores));
    localStorage.setItem('nexum_gov_assessment_ratings', JSON.stringify(ratings));
    localStorage.setItem('nexum_gov_agency_name', agencyName);
    localStorage.setItem('nexum_gov_agency_type', agencyType);
    setSaved(true);
    setTimeout(() => navigate('/gov-intelligence'), 1500);
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Government FI™ Assessment</h1>
            <p className="text-muted-foreground text-sm">Scored readiness evaluation across 6 continuity categories</p>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Assessment saved! Redirecting to Intelligence Hub…</span>
          </div>
        )}

        {/* Agency Info */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Agency Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Organization Name</label>
              <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="e.g. Township of Springfield DPW" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Agency Type</label>
              <Select value={agencyType} onValueChange={setAgencyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agency type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="municipal">Municipal</SelectItem>
                  <SelectItem value="county">County</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                  <SelectItem value="federal">Federal</SelectItem>
                  <SelectItem value="special_district">Special District</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Rating legend */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span><span className="font-semibold text-foreground">0</span> = Not Present</span>
          <span><span className="font-semibold text-foreground">1</span> = Partial</span>
          <span><span className="font-semibold text-foreground">2</span> = Strong</span>
        </div>

        {/* Categories */}
        {CATEGORIES.map(cat => {
          const score = calcCategoryScore(cat.key, ratings);
          const pct = Math.round((score / 13) * 100);
          const isOpen = expanded[cat.key];

          return (
            <Card key={cat.key} className="border-border bg-card">
              <button
                className="w-full text-left"
                onClick={() => setExpanded(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      <CardTitle className={cn('text-sm font-semibold', cat.color)}>{cat.label}</CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="w-24 h-1.5" />
                      <Badge variant="outline" className={cn('text-xs font-bold', cat.color)}>{score}/13</Badge>
                    </div>
                  </div>
                </CardHeader>
              </button>

              {isOpen && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {cat.items.map(item => {
                      const cur = ratings[cat.key]?.[item] ?? -1;
                      return (
                        <div key={item} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <span className="text-sm text-foreground">{item}</span>
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map(val => (
                              <button
                                key={val}
                                onClick={() => setRating(cat.key, item, val)}
                                className={cn(
                                  'w-8 h-8 rounded text-xs font-bold border transition-colors',
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
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        <Button onClick={handleSubmit} className="w-full" size="lg">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Save Assessment & Generate Readiness Index™
        </Button>
      </div>
    </MainLayout>
  );
}
