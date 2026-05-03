import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { syncWrite, syncRead } from '@/lib/sync-storage';
import {
  LayoutDashboard, Users, ClipboardList, FileOutput, BookOpen,
  TrendingUp, Wrench, Zap, Search, StickyNote, ExternalLink,
  ChevronRight, Activity, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const facilityId = localStorage.getItem('nexum_facility_id') || 'default';

interface WorkspaceNote {
  id: string;
  text: string;
  createdAt: string;
  pinned: boolean;
}

interface RecentActivity {
  id: string;
  label: string;
  path: string;
  ts: string;
}

const INTERNAL_TOOLS = [
  { label: 'FIAS Assessment', path: '/fias', icon: Activity, desc: 'Run facility assessments & score clients', color: 'text-blue-400' },
  { label: 'VVFI Retainers', path: '/vvfi', icon: TrendingUp, desc: 'Manage ongoing retainer engagements', color: 'text-green-400' },
  { label: 'Client Accounts', path: '/client-accounts', icon: Users, desc: 'CRM — accounts, notes, churn flags', color: 'text-purple-400' },
  { label: 'Audit Module', path: '/audit-module', icon: ClipboardList, desc: 'Run facility audits with pass/fail tracking', color: 'text-orange-400' },
  { label: 'Doc Generator', path: '/doc-generator', icon: FileOutput, desc: 'Build client-facing reports & proposals', color: 'text-yellow-400' },
  { label: 'Energy Baseline', path: '/energy-baseline', icon: Zap, desc: 'Baseline energy data & CTS integration', color: 'text-cyan-400' },
  { label: 'Contractor Installs', path: '/contractor-installs', icon: Wrench, desc: 'Track installs, callbacks & job performance', color: 'text-red-400' },
  { label: 'CTS-3 Model', path: '/cts3-model', icon: LayoutDashboard, desc: 'Correlation tracking spreadsheet model', color: 'text-indigo-400' },
  { label: 'Rapid Review', path: '/rapid-review', icon: Search, desc: 'FI Rapid Review — bill upload & AI analysis', color: 'text-pink-400' },
  { label: 'Internal Guide', path: '/internal-guide', icon: BookOpen, desc: 'SOPs, scoring guides & workflow reference', color: 'text-teal-400' },
];

const STAT_KEYS = [
  { key: 'nexum_client_accounts', label: 'Client Accounts', icon: Users },
  { key: 'nexum_vvfi_clients', label: 'VVFI Retainers', icon: TrendingUp },
  { key: 'nexum_audits', label: 'Audits', icon: ClipboardList },
  { key: 'nexum_generated_docs', label: 'Documents', icon: FileOutput },
];

function useStorageCount(key: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setCount((JSON.parse(raw) as unknown[]).length);
    } catch { /* noop */ }
  }, []);
  return count;
}

function StatsRow() {
  const counts = STAT_KEYS.map(s => ({ ...s, count: useStorageCount(s.key) }));
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {counts.map(({ key, label, icon: Icon, count }) => (
        <Card key={key}>
          <CardContent className="py-4 px-4 flex items-center gap-3">
            <Icon className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function NexumWorkspace() {
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientResult, setClientResult] = useState<string | null>(null);

  useEffect(() => {
    syncRead<WorkspaceNote[]>('nexum_workspace_notes', '/workspace/notes', facilityId)
      .then(d => { if (d) setNotes(d); });
  }, []);

  const saveNotes = (next: WorkspaceNote[]) => {
    setNotes(next);
    syncWrite('nexum_workspace_notes', next, '/workspace/notes', facilityId);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: WorkspaceNote = {
      id: `note-${Date.now()}`,
      text: newNote.trim(),
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    saveNotes([note, ...notes]);
    setNewNote('');
    toast.success('Note saved.');
  };

  const deleteNote = (id: string) => saveNotes(notes.filter(n => n.id !== id));
  const togglePin = (id: string) =>
    saveNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));

  const lookupClient = () => {
    if (!clientSearch.trim()) return;
    const raw = localStorage.getItem('nexum_client_accounts');
    if (!raw) { setClientResult('No client accounts found.'); return; }
    try {
      const accounts: { id: string; name: string; facilityId: string; tier: string; status: string }[] = JSON.parse(raw);
      const match = accounts.find(a =>
        a.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        a.facilityId.toLowerCase().includes(clientSearch.toLowerCase())
      );
      setClientResult(match
        ? `${match.name} · ${match.facilityId} · ${match.tier} · ${match.status}`
        : 'No matching client found.');
    } catch { setClientResult('Error reading client data.'); }
  };

  const sorted = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Nexum Workspace</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-400/40">Admin Only</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Internal operations hub — all Nexum tools in one place.</p>
        </div>

        {/* Stats */}
        <StatsRow />

        {/* Tool Grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Internal Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {INTERNAL_TOOLS.map(tool => {
              const Icon = tool.icon;
              return (
                <a key={tool.path} href={tool.path} className="block">
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                    <CardContent className="py-4 px-4 flex items-start gap-3">
                      <div className={cn('mt-0.5 shrink-0', tool.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{tool.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-auto mt-0.5" />
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>

        {/* Client Lookup + Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Lookup */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Quick Client Lookup</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookupClient()}
                  placeholder="Name or facilityId…"
                  className="flex-1"
                />
                <Button size="sm" onClick={lookupClient}><Search className="w-4 h-4" /></Button>
              </div>
              {clientResult && (
                <div className="text-xs bg-muted/40 rounded p-2 font-mono">{clientResult}</div>
              )}
              <Separator />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">FI Platform links</p>
                <a
                  href="https://portal.nexumsuum-facilityintelligence.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Customer Portal
                </a>
                <a
                  href="https://portal.nexumsuum-facilityintelligence.com?adminView=1"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Admin View
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Workspace Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Quick note…"
                  rows={2}
                  className="flex-1 text-sm resize-none"
                />
                <Button size="sm" onClick={addNote} className="self-end">
                  <StickyNote className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sorted.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No notes yet.</p>
                )}
                {sorted.map(n => (
                  <div key={n.id} className={cn('flex items-start gap-2 text-xs rounded p-2 border', n.pinned ? 'border-primary/40 bg-primary/5' : 'border-border/50')}>
                    <p className="flex-1 text-foreground whitespace-pre-wrap">{n.text}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => togglePin(n.id)} title="Pin" className={cn('text-muted-foreground hover:text-primary', n.pinned && 'text-primary')}>📌</button>
                      <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-destructive">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Status */}
        <Card>
          <CardHeader><CardTitle className="text-sm">System Status</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span>FI Platform — <span className="text-green-500 font-medium">Online</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span>API Gateway — <span className="text-green-500 font-medium">Healthy</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                <span>SES Email — <span className="text-yellow-500 font-medium">Verify Identities</span></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
