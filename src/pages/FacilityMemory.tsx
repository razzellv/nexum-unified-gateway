import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Brain, BookOpen, Eye, RefreshCw, Wrench, ShieldCheck, AlertTriangle,
  Clock, FileText, Thermometer, Plus, Search, Download, Zap,
  ChevronDown, ChevronUp, Users, BarChart3, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemoryRecord {
  memory_id: string;
  SK: string;
  asset_id?: string;
  memory_type: string;
  observation: string;
  lesson_learned?: string;
  risk_level: string;
  author: string;
  source: string;
  timestamp: string;
  confidence_score: number;
  tags?: string[];
  is_tribal_knowledge?: boolean;
  access_count?: number;
}

interface MemoryScores {
  completeness: number;
  retention: number;
  continuity: number;
  total_memories: number;
  tribal_knowledge_count: number;
  assets_covered: number;
  lessons_documented?: number;
}

interface Patterns {
  frequently_referenced_assets: { asset: string; count: number; types: string[] }[];
  repeated_observations: { keyword: string; count: number }[];
  seasonal_patterns: { month: string; count: number }[];
  tribal_knowledge_count: number;
  tribal_knowledge_preview: { id: string; observation: string; asset?: string }[];
  total_analyzed: number;
}

// ── Memory type config ────────────────────────────────────────────────────────
const MEMORY_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  observation:           { label: 'Observation',          icon: Eye,           color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  lesson_learned:        { label: 'Lesson Learned',       icon: BookOpen,      color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  tribal_knowledge:      { label: 'Tribal Knowledge',     icon: Brain,         color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  seasonal_issue:        { label: 'Seasonal Issue',       icon: Thermometer,   color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  recurring_failure:     { label: 'Recurring Failure',    icon: RefreshCw,     color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  troubleshooting_action:{ label: 'Troubleshooting',      icon: Wrench,        color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  sop:                   { label: 'SOP',                  icon: FileText,      color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  eop:                   { label: 'EOP',                  icon: FileText,      color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  mop:                   { label: 'MOP',                  icon: FileText,      color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  compliance_finding:    { label: 'Compliance',           icon: ShieldCheck,   color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  incident:              { label: 'Incident',             icon: AlertTriangle, color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  historical_event:      { label: 'Historical',           icon: Clock,         color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
};

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low:      'bg-green-500/20 text-green-400 border-green-500/30',
};

const DEFAULT_FORM = {
  memory_type: 'observation', observation: '', lesson_learned: '',
  risk_level: 'medium', asset_id: '', source: 'manual_entry',
  tags: '', is_tribal_knowledge: false, confidence_score: 80,
};

// ── Score gauge ───────────────────────────────────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn('text-sm font-bold', color)}>{value}%</span>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color.replace('text-', 'bg-').split(' ')[0])}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── Memory card ───────────────────────────────────────────────────────────────
function MemoryCard({ memory, onUpdate }: { memory: MemoryRecord; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const meta = MEMORY_TYPE_META[memory.memory_type] || MEMORY_TYPE_META.observation;
  const Icon = meta.icon;

  return (
    <Card className={cn('glass-panel border-border/30 transition-all', memory.risk_level === 'critical' && 'border-red-500/30')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border', meta.color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <Badge variant="outline" className={cn('text-[10px]', meta.color)}>{meta.label}</Badge>
                  <Badge variant="outline" className={cn('text-[10px]', RISK_COLORS[memory.risk_level])}>
                    {memory.risk_level}
                  </Badge>
                  {memory.is_tribal_knowledge && (
                    <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/30">
                      Tribal Knowledge
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {Math.round(memory.confidence_score)}% confidence
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug">{memory.observation}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {memory.asset_id && (
                <span className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />{memory.asset_id}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />{memory.author}
              </span>
              <span>{new Date(memory.timestamp).toLocaleDateString()}</span>
              {(memory.access_count || 0) > 0 && (
                <span className="text-muted-foreground/50">{memory.access_count} views</span>
              )}
              <button
                onClick={() => setExpanded(v => !v)}
                className="ml-auto flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? 'Less' : 'More'}
              </button>
            </div>

            {expanded && (
              <div className="mt-3 space-y-2 border-t border-border/20 pt-3">
                {memory.lesson_learned && (
                  <div>
                    <p className="text-xs font-semibold text-green-400 mb-0.5 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />Lesson Learned
                    </p>
                    <p className="text-xs text-muted-foreground">{memory.lesson_learned}</p>
                  </div>
                )}
                {(memory.tags || []).length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {memory.tags!.map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">Source: {memory.source} · ID: {memory.memory_id?.slice(0, 8)}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const FacilityMemory = () => {
  const { toast } = useToast();
  const [memories, setMemories]     = useState<MemoryRecord[]>([]);
  const [scores, setScores]         = useState<MemoryScores | null>(null);
  const [patterns, setPatterns]     = useState<Patterns | null>(null);
  const [loading, setLoading]       = useState(true);
  const [ingesting, setIngesting]   = useState(false);
  const [activeTab, setActiveTab]   = useState<'all' | 'timeline' | 'asset' | 'patterns'>('all');
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(DEFAULT_FORM);
  const [saving, setSaving]         = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, scoresRes] = await Promise.allSettled([
        apiRequest('/facility-memory'),
        apiRequest('/facility-memory/scores'),
      ]);
      if (memRes.status === 'fulfilled') {
        setMemories(memRes.value?.items || []);
        if (memRes.value?.scores) setScores(memRes.value.scores);
      }
      if (scoresRes.status === 'fulfilled') setScores(scoresRes.value);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const fetchPatterns = useCallback(async () => {
    try {
      const data = await apiRequest('/facility-memory/patterns');
      setPatterns(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (activeTab === 'patterns' && !patterns) fetchPatterns(); }, [activeTab]);

  const handleIngest = async () => {
    setIngesting(true);
    try {
      const data = await apiRequest('/facility-memory/ingest', { method: 'POST' });
      toast({ title: 'Auto-Ingest Complete', description: `${data.created || 0} new memories captured from operational records.` });
      await fetchAll();
    } catch {
      toast({ title: 'Ingest Error', description: 'Could not reach memory engine.', variant: 'destructive' });
    } finally { setIngesting(false); }
  };

  const handleSave = async () => {
    if (!form.observation) {
      toast({ title: 'Required', description: 'Observation is required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/facility-memory', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      });
      toast({ title: 'Memory Saved', description: 'Knowledge record created successfully.' });
      setForm(DEFAULT_FORM);
      setShowForm(false);
      await fetchAll();
    } catch {
      toast({ title: 'Save Failed', description: 'Could not save memory record.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleExport = () => {
    const lines = [
      'NEXUM SUUM — FACILITY MEMORY ENGINE™',
      `Exported: ${new Date().toLocaleString()}`,
      `Total Records: ${memories.length}`,
      `Completeness: ${scores?.completeness ?? '--'}% | Retention: ${scores?.retention ?? '--'}% | Continuity: ${scores?.continuity ?? '--'}%`,
      '═'.repeat(60),
      ...memories.map(m => [
        `[${m.memory_type.toUpperCase()}] ${m.observation}`,
        `  Risk: ${m.risk_level} | Asset: ${m.asset_id || 'N/A'} | Author: ${m.author}`,
        m.lesson_learned ? `  Lesson: ${m.lesson_learned}` : '',
        `  Date: ${new Date(m.timestamp).toLocaleDateString()} | Confidence: ${m.confidence_score}%`,
        '',
      ].filter(Boolean).join('\n')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `facility-memory-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: 'Facility Memory exported.' });
  };

  // Filter
  const filtered = memories.filter(m => {
    if (typeFilter && m.memory_type !== typeFilter) return false;
    if (riskFilter && m.risk_level !== riskFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (m.observation || '').toLowerCase().includes(q) ||
             (m.lesson_learned || '').toLowerCase().includes(q) ||
             (m.asset_id || '').toLowerCase().includes(q) ||
             (m.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  // Asset grouping
  const byAsset = filtered.reduce((acc, m) => {
    const key = m.asset_id || 'Unassigned';
    (acc[key] = acc[key] || []).push(m);
    return acc;
  }, {} as Record<string, MemoryRecord[]>);

  const TABS = [
    { key: 'all',      label: `All (${memories.length})` },
    { key: 'timeline', label: 'Timeline' },
    { key: 'asset',    label: 'By Asset' },
    { key: 'patterns', label: 'Patterns' },
  ] as const;

  const scoreColor = (v: number) => v >= 80 ? 'text-green-400' : v >= 60 ? 'text-yellow-400' : v >= 40 ? 'text-orange-400' : 'text-red-400';

  return (
    <MainLayout>
      <div className="space-y-5 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Brain className="w-7 h-7 text-purple-400" />
              Facility Memory Engine™
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Living institutional knowledge — never lose what your team knows
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleIngest} disabled={ingesting}>
              <Zap className={cn('w-4 h-4 mr-2', ingesting && 'animate-pulse text-yellow-400')} />
              {ingesting ? 'Ingesting…' : 'Auto-Ingest'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            <Button size="sm" onClick={() => setShowForm(v => !v)}>
              <Plus className="w-4 h-4 mr-2" />Add Memory
            </Button>
          </div>
        </div>

        {/* Score cards */}
        {scores && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Memory Completeness', value: scores.completeness,  desc: 'Records fully documented' },
              { label: 'Knowledge Retention', value: scores.retention,     desc: 'Coverage & recency' },
              { label: 'Operational Continuity', value: scores.continuity, desc: 'Lessons + tribal knowledge' },
            ].map(({ label, value, desc }) => (
              <Card key={label} className="glass-panel">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn('text-2xl font-bold mt-1', scoreColor(value))}>{value}%</p>
                  <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', scoreColor(value).replace('text-', 'bg-'))} style={{ width: `${value}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
                </CardContent>
              </Card>
            ))}
            <Card className="glass-panel">
              <CardContent className="p-4 space-y-1.5">
                <p className="text-xs text-muted-foreground">Knowledge Stock</p>
                <p className="text-2xl font-bold text-primary">{scores.total_memories}</p>
                <div className="text-[11px] text-muted-foreground space-y-0.5 mt-2">
                  <div className="flex justify-between"><span>Assets covered</span><span className="font-medium text-foreground">{scores.assets_covered}</span></div>
                  <div className="flex justify-between"><span>Tribal knowledge</span><span className="font-medium text-purple-400">{scores.tribal_knowledge_count}</span></div>
                  {scores.lessons_documented !== undefined && (
                    <div className="flex justify-between"><span>Lessons documented</span><span className="font-medium text-green-400">{scores.lessons_documented}</span></div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Memory Form */}
        {showForm && (
          <Card className="glass-panel border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-primary">New Memory Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type *</label>
                  <select className="w-full text-sm bg-background border border-border/50 rounded px-2 py-1.5 focus:outline-none"
                    value={form.memory_type} onChange={e => setForm(f => ({ ...f, memory_type: e.target.value }))}>
                    {Object.entries(MEMORY_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Risk Level</label>
                  <select className="w-full text-sm bg-background border border-border/50 rounded px-2 py-1.5 focus:outline-none"
                    value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value }))}>
                    {['critical','high','medium','low'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Asset/System</label>
                  <Input className="text-sm" placeholder="e.g. Boiler-1, HVAC-3" value={form.asset_id}
                    onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Source</label>
                  <select className="w-full text-sm bg-background border border-border/50 rounded px-2 py-1.5 focus:outline-none"
                    value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                    {['manual_entry','work_order','pm_record','operator_log','shift_log','inspection','incident_report'].map(s => <option key={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Observation *</label>
                <textarea className="w-full text-sm bg-background border border-border/50 rounded px-3 py-2 resize-none focus:outline-none focus:border-primary/50"
                  rows={2} placeholder="What was observed, known, or experienced?"
                  value={form.observation} onChange={e => setForm(f => ({ ...f, observation: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Lesson Learned</label>
                <textarea className="w-full text-sm bg-background border border-border/50 rounded px-3 py-2 resize-none focus:outline-none focus:border-primary/50"
                  rows={2} placeholder="What should future operators know?"
                  value={form.lesson_learned} onChange={e => setForm(f => ({ ...f, lesson_learned: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label>
                  <Input className="text-sm" placeholder="boiler, pressure, seasonal" value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-purple-500" checked={form.is_tribal_knowledge}
                      onChange={e => setForm(f => ({ ...f, is_tribal_knowledge: e.target.checked }))} />
                    <span className="text-xs text-muted-foreground">Mark as Tribal Knowledge</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Memory'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search observations, assets, lessons…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="text-sm bg-background border border-border/50 rounded px-2 py-1.5 focus:outline-none"
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {Object.entries(MEMORY_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="text-sm bg-background border border-border/50 rounded px-2 py-1.5 focus:outline-none"
            value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
            <option value="">All Risk</option>
            {['critical','high','medium','low'].map(r => <option key={r}>{r}</option>)}
          </select>
          <Button variant="ghost" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/40">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
                activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* All / Timeline */}
            {(activeTab === 'all' || activeTab === 'timeline') && (
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No memory records found.</p>
                    <p className="text-xs mt-1">Click "Auto-Ingest" to pull from operational records, or "Add Memory" to document knowledge.</p>
                  </div>
                ) : filtered.map(m => (
                  <MemoryCard key={m.memory_id || m.SK} memory={m} onUpdate={fetchAll} />
                ))}
              </div>
            )}

            {/* By Asset */}
            {activeTab === 'asset' && (
              <div className="space-y-5">
                {Object.entries(byAsset).sort((a, b) => b[1].length - a[1].length).map(([asset, mems]) => (
                  <div key={asset}>
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{asset}</span>
                      <Badge variant="outline" className="text-xs">{mems.length}</Badge>
                    </div>
                    <div className="space-y-2 pl-2 border-l border-primary/20">
                      {mems.map(m => <MemoryCard key={m.memory_id || m.SK} memory={m} onUpdate={fetchAll} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Patterns */}
            {activeTab === 'patterns' && (
              <div className="space-y-5">
                {!patterns ? (
                  <div className="text-center py-12">
                    <Button onClick={fetchPatterns}><BarChart3 className="w-4 h-4 mr-2" />Analyze Patterns</Button>
                  </div>
                ) : (
                  <>
                    {/* Frequently referenced assets */}
                    {patterns.frequently_referenced_assets.length > 0 && (
                      <Card className="glass-panel">
                        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Frequently Referenced Assets</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {patterns.frequently_referenced_assets.slice(0, 6).map(({ asset, count, types }) => (
                            <div key={asset} className="flex items-center gap-3">
                              <span className="text-sm font-medium w-32 truncate">{asset}</span>
                              <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(100, count / patterns.frequently_referenced_assets[0].count * 100)}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Tribal Knowledge */}
                      {patterns.tribal_knowledge_preview.length > 0 && (
                        <Card className="glass-panel border-purple-400/20">
                          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-purple-400" />Tribal Knowledge ({patterns.tribal_knowledge_count})</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                            {patterns.tribal_knowledge_preview.map(tk => (
                              <div key={tk.id} className="p-2 rounded-lg bg-purple-400/5 border border-purple-400/20 text-xs">
                                <p className="text-foreground/90">{tk.observation}</p>
                                {tk.asset && <p className="text-muted-foreground mt-0.5">{tk.asset}</p>}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Seasonal patterns */}
                      {patterns.seasonal_patterns.length > 0 && (
                        <Card className="glass-panel">
                          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Thermometer className="w-4 h-4 text-yellow-400" />Seasonal Patterns</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                            {patterns.seasonal_patterns.map(({ month, count }) => (
                              <div key={month} className="flex items-center justify-between text-sm">
                                <span>{month}</span>
                                <span className="text-yellow-400 font-semibold">{count} records</span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Repeated keywords */}
                    {patterns.repeated_observations.length > 0 && (
                      <Card className="glass-panel">
                        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Tag className="w-4 h-4 text-blue-400" />Repeated Knowledge Themes</CardTitle></CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {patterns.repeated_observations.map(({ keyword, count }) => (
                              <span key={keyword}
                                className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                                {keyword} <span className="text-muted-foreground">×{count}</span>
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default FacilityMemory;
