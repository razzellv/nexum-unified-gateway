import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutGrid, Plus, Search, Pin, Trash2, ExternalLink,
  FileText, AlertTriangle, Wrench, BookOpen, ChevronLeft,
  Clock, Tag, User, Filter, CheckCircle, Circle, XCircle,
  StickyNote, Link2, Edit3, Save, X, AlertOctagon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nexumApi } from '@/lib/nexum-api';

const API_BASE = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EvidenceBoard {
  boardId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  conclusionNotes: string;
  assignedTo: string | null;
  evidence?: EvidenceItem[];
}

interface EvidenceItem {
  itemId: string;
  boardId: string;
  sourceType: 'observation' | 'violation' | 'workorder' | 'log' | 'manual';
  sourceId: string | null;
  title: string;
  description: string;
  occurredAt: string;
  pinnedAt: string;
  pinnedBy: string;
  notes: string;
  tags: string[];
  severity: string | null;
  metadata: Record<string, any>;
}

interface SourceItem {
  id: string;
  type: 'observation' | 'violation' | 'workorder' | 'log';
  title: string;
  description: string;
  occurredAt: string;
  severity?: string;
  metadata: Record<string, any>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeStr(val: any, fallback = ''): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val.name || val.id || fallback;
  return String(val);
}

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    safety:      'text-red-500 bg-red-500/10 border-red-500/30',
    compliance:  'text-orange-500 bg-orange-500/10 border-orange-500/30',
    operational: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    equipment:   'text-purple-500 bg-purple-500/10 border-purple-500/30',
    personnel:   'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    general:     'text-muted-foreground bg-muted/30 border-border/50',
  };
  return map[cat] || map.general;
}

function priorityColor(p: string) {
  const map: Record<string, string> = {
    critical: 'text-red-500',
    high:     'text-orange-500',
    medium:   'text-yellow-500',
    low:      'text-muted-foreground',
  };
  return map[p] || map.low;
}

function statusIcon(s: string) {
  if (s === 'open')       return <Circle className="w-4 h-4 text-blue-500" />;
  if (s === 'active')     return <AlertOctagon className="w-4 h-4 text-orange-500" />;
  if (s === 'concluded')  return <CheckCircle className="w-4 h-4 text-success" />;
  if (s === 'archived')   return <XCircle className="w-4 h-4 text-muted-foreground" />;
  return <Circle className="w-4 h-4" />;
}

function sourceIcon(type: string) {
  if (type === 'observation') return <BookOpen className="w-4 h-4 text-blue-400" />;
  if (type === 'violation')   return <AlertTriangle className="w-4 h-4 text-red-400" />;
  if (type === 'workorder')   return <Wrench className="w-4 h-4 text-purple-400" />;
  if (type === 'log')         return <FileText className="w-4 h-4 text-green-400" />;
  return <StickyNote className="w-4 h-4 text-muted-foreground" />;
}

function sourceBadgeColor(type: string) {
  const map: Record<string, string> = {
    observation: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    violation:   'text-red-500 bg-red-500/10 border-red-500/30',
    workorder:   'text-purple-500 bg-purple-500/10 border-purple-500/30',
    log:         'text-green-500 bg-green-500/10 border-green-500/30',
    manual:      'text-muted-foreground bg-muted/30 border-border/50',
  };
  return map[type] || map.manual;
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`API ${path} → ${r.status}`);
  if (r.status === 204) return null;
  return r.json();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BoardCard({ board, onClick }: { board: EvidenceBoard; onClick: () => void }) {
  return (
    <Card
      className="p-4 bg-card/50 border-border/50 hover:border-primary/40 cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {statusIcon(board.status)}
            <h3 className="font-semibold text-foreground truncate">{board.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{board.description || 'No description'}</p>
        </div>
        <Badge variant="outline" className={cn('text-xs shrink-0', categoryColor(board.category))}>
          {board.category}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Pin className="w-3 h-3" />
          <span>{board.evidenceCount} evidence item{board.evidenceCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{format(new Date(board.createdAt), 'MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>{board.createdBy}</span>
        </div>
        <span className={cn('font-medium', priorityColor(board.priority))}>
          {board.priority.toUpperCase()}
        </span>
      </div>

      {board.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {board.tags.slice(0, 4).map(t => (
            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function EvidenceItemCard({
  item,
  onUpdateNotes,
  onUnpin,
}: {
  item: EvidenceItem;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onUnpin: (itemId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes);

  function save() {
    onUpdateNotes(item.itemId, notes);
    setEditing(false);
  }

  return (
    <div className="border border-border/50 rounded-lg p-4 bg-card/30 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {sourceIcon(item.sourceType)}
          <span className="font-medium text-sm truncate">{item.title}</span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', sourceBadgeColor(item.sourceType))}>
            {item.sourceType}
          </Badge>
          {item.severity && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-orange-500 bg-orange-500/10">
              {item.severity}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(!editing)}>
            <Edit3 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={() => onUnpin(item.itemId)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(new Date(item.occurredAt), 'MMM d, yyyy HH:mm')}
        </span>
        <span className="flex items-center gap-1">
          <Pin className="w-3 h-3" />
          Pinned by {item.pinnedBy}
        </span>
      </div>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.map(t => (
            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
          ))}
        </div>
      )}

      {editing ? (
        <div className="space-y-2 mt-2">
          <Textarea
            className="text-xs min-h-[60px]"
            placeholder="Add investigator notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={save}><Save className="w-3 h-3 mr-1" />Save</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setNotes(item.notes); setEditing(false); }}><X className="w-3 h-3 mr-1" />Cancel</Button>
          </div>
        </div>
      ) : item.notes ? (
        <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded text-xs text-muted-foreground italic">
          <StickyNote className="w-3 h-3 inline mr-1 text-primary/60" />
          {item.notes}
        </div>
      ) : null}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EvidenceBoard() {
  const { user } = useAuth();
  const token = localStorage.getItem('nexum_access_token') || '';

  const [boards, setBoards] = useState<EvidenceBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<EvidenceBoard | null>(null);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

  // New board form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newPriority, setNewPriority] = useState('medium');
  const [newTags, setNewTags] = useState('');
  const [creating, setCreating] = useState(false);

  // Evidence source picker
  const [showPicker, setShowPicker] = useState(false);
  const [sourceTab, setSourceTab] = useState<'observation' | 'violation' | 'workorder' | 'log'>('observation');
  const [sourceItems, setSourceItems] = useState<SourceItem[]>([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Manual evidence form
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 16));

  // Filter
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('boards');

  const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';

  // ── Load boards ──────────────────────────────────────────────────────────────
  const loadBoards = useCallback(async () => {
    setLoadingBoards(true);
    try {
      const data = await apiFetch('/evidence-boards', token);
      setBoards(data?.boards || []);
    } catch {
      setBoards([]);
    } finally {
      setLoadingBoards(false);
    }
  }, [token]);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  // ── Open a board ─────────────────────────────────────────────────────────────
  async function openBoard(board: EvidenceBoard) {
    setLoadingBoard(true);
    setSelectedBoard(board);
    try {
      const data = await apiFetch(`/evidence-boards/${board.boardId}`, token);
      setSelectedBoard(data);
    } catch {
      /* keep stub */
    } finally {
      setLoadingBoard(false);
    }
  }

  // ── Create board ─────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await apiFetch('/evidence-boards', token, {
        method: 'POST',
        body: JSON.stringify({
          title:    newTitle.trim(),
          description: newDesc.trim(),
          category: newCategory,
          priority: newPriority,
          tags:     newTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      setNewTitle(''); setNewDesc(''); setNewTags('');
      setNewCategory('general'); setNewPriority('medium');
      setActiveTab('boards');
      loadBoards();
    } finally {
      setCreating(false);
    }
  }

  // ── Update board status ───────────────────────────────────────────────────────
  async function updateBoardStatus(boardId: string, status: string) {
    await apiFetch(`/evidence-boards/${boardId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (selectedBoard?.boardId === boardId) {
      setSelectedBoard(prev => prev ? { ...prev, status } : prev);
    }
    setBoards(prev => prev.map(b => b.boardId === boardId ? { ...b, status } : b));
  }

  // ── Load source items for picker ──────────────────────────────────────────────
  async function loadSourceItems(type: typeof sourceTab) {
    setSourceTab(type);
    setLoadingSource(true);
    setSourceItems([]);
    try {
      let items: SourceItem[] = [];
      if (type === 'observation') {
        const d = await apiFetch(`/observations?facilityId=${facilityId}`, token);
        items = (d?.observations || []).map((o: any) => ({
          id:          o.observationId || o.id,
          type:        'observation',
          title:       o.title || o.subject || 'Observation',
          description: o.description || o.observationText || '',
          occurredAt:  o.observedAt || o.createdAt || new Date().toISOString(),
          severity:    o.severity,
          metadata:    { status: o.status, reporter: o.reporterName || o.reportedBy, location: o.location },
        }));
      } else if (type === 'violation') {
        const d = await apiFetch(`/violations?facilityId=${facilityId}`, token);
        items = (d?.violations || []).map((v: any) => ({
          id:          v.violationId || v.id,
          type:        'violation',
          title:       safeStr(v.type, 'Violation'),
          description: v.description || '',
          occurredAt:  v.issuedAt || v.timestamp || v.createdAt || new Date().toISOString(),
          severity:    v.severity || String(v.severityScore),
          metadata:    { category: safeStr(v.category), employee: v.employeeName || safeStr(v.operator) },
        }));
      } else if (type === 'workorder') {
        const d = await apiFetch(`/work-orders?facilityId=${facilityId}`, token);
        items = (d?.workOrders || []).map((w: any) => ({
          id:          w.workOrderId || w.id,
          type:        'workorder',
          title:       w.title || `Work Order #${w.workOrderId}`,
          description: w.description || '',
          occurredAt:  w.createdAt || new Date().toISOString(),
          severity:    w.priority,
          metadata:    { status: w.status, equipment: w.equipmentId || w.equipmentName },
        }));
      } else if (type === 'log') {
        const d = await apiFetch(`/facility-logs?facilityId=${facilityId}`, token);
        items = (d?.logs || []).map((l: any) => ({
          id:          l.logId || l.id,
          type:        'log',
          title:       `${safeStr(l.equipmentType || l.equipmentId, 'Log')} — ${safeStr(l.operator)}`,
          description: l.notes || '',
          occurredAt:  l.timestamp || l.createdAt || new Date().toISOString(),
          severity:    null,
          metadata:    { equipmentId: l.equipmentId, equipmentType: safeStr(l.equipmentType) },
        }));
      }
      setSourceItems(items);
    } catch {
      setSourceItems([]);
    } finally {
      setLoadingSource(false);
    }
  }

  // ── Pin evidence from source picker ───────────────────────────────────────────
  async function pinFromSource(source: SourceItem) {
    if (!selectedBoard) return;
    try {
      const newItem = await apiFetch(`/evidence-boards/${selectedBoard.boardId}/evidence`, token, {
        method: 'POST',
        body: JSON.stringify({
          sourceType:  source.type,
          sourceId:    source.id,
          title:       source.title,
          description: source.description,
          occurredAt:  source.occurredAt,
          severity:    source.severity || null,
          metadata:    source.metadata,
          tags:        [],
          notes:       '',
        }),
      });
      setSelectedBoard(prev => prev ? {
        ...prev,
        evidenceCount: (prev.evidenceCount || 0) + 1,
        evidence: [...(prev.evidence || []), newItem],
      } : prev);
      setBoards(b => b.map(x => x.boardId === selectedBoard.boardId ? { ...x, evidenceCount: (x.evidenceCount || 0) + 1 } : x));
    } catch (err) {
      console.error(err);
    }
  }

  // ── Pin manual evidence ────────────────────────────────────────────────────────
  async function pinManual() {
    if (!selectedBoard || !manualTitle.trim()) return;
    try {
      const newItem = await apiFetch(`/evidence-boards/${selectedBoard.boardId}/evidence`, token, {
        method: 'POST',
        body: JSON.stringify({
          sourceType:  'manual',
          sourceId:    null,
          title:       manualTitle.trim(),
          description: manualDesc.trim(),
          occurredAt:  new Date(manualDate).toISOString(),
          notes:       manualNotes.trim(),
          tags:        [],
          metadata:    {},
          severity:    null,
        }),
      });
      setSelectedBoard(prev => prev ? {
        ...prev,
        evidenceCount: (prev.evidenceCount || 0) + 1,
        evidence: [...(prev.evidence || []), newItem],
      } : prev);
      setBoards(b => b.map(x => x.boardId === selectedBoard.boardId ? { ...x, evidenceCount: (x.evidenceCount || 0) + 1 } : x));
      setManualTitle(''); setManualDesc(''); setManualNotes('');
      setManualDate(new Date().toISOString().slice(0, 16));
      setShowManual(false);
    } catch (err) {
      console.error(err);
    }
  }

  // ── Update evidence notes ──────────────────────────────────────────────────────
  async function handleUpdateNotes(itemId: string, notes: string) {
    if (!selectedBoard) return;
    await apiFetch(`/evidence-boards/${selectedBoard.boardId}/evidence/${itemId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
    setSelectedBoard(prev => prev ? {
      ...prev,
      evidence: (prev.evidence || []).map(e => e.itemId === itemId ? { ...e, notes } : e),
    } : prev);
  }

  // ── Unpin evidence ─────────────────────────────────────────────────────────────
  async function handleUnpin(itemId: string) {
    if (!selectedBoard) return;
    await apiFetch(`/evidence-boards/${selectedBoard.boardId}/evidence/${itemId}`, token, { method: 'DELETE' });
    setSelectedBoard(prev => prev ? {
      ...prev,
      evidenceCount: Math.max(0, (prev.evidenceCount || 1) - 1),
      evidence: (prev.evidence || []).filter(e => e.itemId !== itemId),
    } : prev);
    setBoards(b => b.map(x => x.boardId === selectedBoard.boardId ? { ...x, evidenceCount: Math.max(0, (x.evidenceCount || 1) - 1) } : x));
  }

  // ── Filtered boards ────────────────────────────────────────────────────────────
  const filteredBoards = boards.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredSourceItems = sourceItems.filter(i =>
    pickerSearch ? i.title.toLowerCase().includes(pickerSearch.toLowerCase()) || i.description.toLowerCase().includes(pickerSearch.toLowerCase()) : true
  );

  // ── Board detail view ──────────────────────────────────────────────────────────
  if (selectedBoard) {
    const evidenceByType = {
      observation: (selectedBoard.evidence || []).filter(e => e.sourceType === 'observation'),
      violation:   (selectedBoard.evidence || []).filter(e => e.sourceType === 'violation'),
      workorder:   (selectedBoard.evidence || []).filter(e => e.sourceType === 'workorder'),
      log:         (selectedBoard.evidence || []).filter(e => e.sourceType === 'log'),
      manual:      (selectedBoard.evidence || []).filter(e => e.sourceType === 'manual'),
    };

    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" className="mt-0.5" onClick={() => setSelectedBoard(null)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {statusIcon(selectedBoard.status)}
                <h1 className="text-2xl font-bold text-foreground truncate">{selectedBoard.title}</h1>
                <Badge variant="outline" className={cn('text-xs', categoryColor(selectedBoard.category))}>
                  {selectedBoard.category}
                </Badge>
                <Badge variant="outline" className={cn('text-xs', priorityColor(selectedBoard.priority))}>
                  {selectedBoard.priority}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{selectedBoard.description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                <span>Created {format(new Date(selectedBoard.createdAt), 'MMM d, yyyy')} by {selectedBoard.createdBy}</span>
                <span>{selectedBoard.evidenceCount} evidence items</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={selectedBoard.status} onValueChange={s => updateBoardStatus(selectedBoard.boardId, s)}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="concluded">Concluded</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pin Evidence bar */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => { setShowPicker(!showPicker); setShowManual(false); if (!showPicker) loadSourceItems('observation'); }}>
              <Pin className="w-4 h-4" />
              Pin Evidence
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => { setShowManual(!showManual); setShowPicker(false); }}>
              <StickyNote className="w-4 h-4" />
              Manual Entry
            </Button>
          </div>

          {/* Source picker */}
          {showPicker && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Select Evidence from Operational Record</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPicker(false)}><X className="w-4 h-4" /></Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {(['observation', 'violation', 'workorder', 'log'] as const).map(t => (
                    <Button
                      key={t}
                      size="sm"
                      variant={sourceTab === t ? 'default' : 'outline'}
                      className="gap-1.5 h-7 text-xs"
                      onClick={() => loadSourceItems(t)}
                    >
                      {sourceIcon(t)}
                      {t.charAt(0).toUpperCase() + t.slice(1)}s
                    </Button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9 h-8 text-sm" placeholder="Search..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
                </div>
                <ScrollArea className="h-64">
                  {loadingSource ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">Loading...</p>
                  ) : filteredSourceItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">No items found</p>
                  ) : (
                    <div className="space-y-1 pr-2">
                      {filteredSourceItems.map(item => {
                        const alreadyPinned = (selectedBoard.evidence || []).some(e => e.sourceId === item.id);
                        return (
                          <div key={item.id} className="flex items-center justify-between gap-3 p-2.5 rounded border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {sourceIcon(item.type)}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{item.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{item.description || format(new Date(item.occurredAt), 'MMM d, yyyy')}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={alreadyPinned ? 'secondary' : 'outline'}
                              className="h-7 text-xs shrink-0"
                              disabled={alreadyPinned}
                              onClick={() => pinFromSource(item)}
                            >
                              {alreadyPinned ? 'Pinned' : <><Pin className="w-3 h-3 mr-1" />Pin</>}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Manual evidence form */}
          {showManual && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Add Manual Evidence</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowManual(false)}><X className="w-4 h-4" /></Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title *</Label>
                    <Input className="h-8 text-sm" placeholder="Evidence title" value={manualTitle} onChange={e => setManualTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date / Time</Label>
                    <Input className="h-8 text-sm" type="datetime-local" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea className="text-sm min-h-[60px]" placeholder="What happened?" value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Investigator Notes</Label>
                  <Textarea className="text-sm min-h-[60px]" placeholder="Your analysis, observations, context..." value={manualNotes} onChange={e => setManualNotes(e.target.value)} />
                </div>
                <Button size="sm" className="gap-2" onClick={pinManual} disabled={!manualTitle.trim()}>
                  <Pin className="w-4 h-4" />
                  Add to Board
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Evidence Timeline — {selectedBoard.evidenceCount} items
            </h2>

            {loadingBoard ? (
              <p className="text-sm text-muted-foreground py-4">Loading evidence...</p>
            ) : (selectedBoard.evidence || []).length === 0 ? (
              <Card className="border-dashed border-border/50 bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Pin className="w-8 h-8 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground text-sm">No evidence pinned yet.</p>
                  <p className="text-muted-foreground/70 text-xs mt-1">Use "Pin Evidence" to pull from the Observation Journal, Violations, Work Orders, or Logs.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border/50" />
                <div className="space-y-4">
                  {[...(selectedBoard.evidence || [])].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()).map(item => (
                    <div key={item.itemId} className="flex gap-4">
                      <div className="w-10 flex-shrink-0 flex justify-center pt-3 z-10">
                        <div className="w-5 h-5 rounded-full border-2 border-border bg-background flex items-center justify-center">
                          {sourceIcon(item.sourceType)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <EvidenceItemCard
                          item={item}
                          onUpdateNotes={handleUpdateNotes}
                          onUnpin={handleUnpin}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* By source type breakdown */}
          {(selectedBoard.evidence || []).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(evidenceByType).map(([type, items]) => items.length > 0 && (
                <div key={type} className={cn('p-3 rounded-lg border text-center', sourceBadgeColor(type))}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {sourceIcon(type)}
                    <span className="text-xs font-medium capitalize">{type}s</span>
                  </div>
                  <p className="text-lg font-bold">{items.length}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  // ── Board list view ────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <LayoutGrid className="w-6 h-6 text-primary" />
              Evidence Board™
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Collect and organize operational evidence into investigation cases — linked to Observations, Violations, Work Orders, and Logs.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="boards">Active Boards</TabsTrigger>
            <TabsTrigger value="new">
              <Plus className="w-4 h-4 mr-1" />
              New Board
            </TabsTrigger>
          </TabsList>

          {/* ── Boards list ─────────────────────────────────────────────────── */}
          <TabsContent value="boards" className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder="Search boards..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="concluded">Concluded</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingBoards ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Loading boards...</p>
            ) : filteredBoards.length === 0 ? (
              <Card className="border-dashed border-border/50 bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <LayoutGrid className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No investigation boards yet.</p>
                  <p className="text-muted-foreground/70 text-xs mt-1">Create a board to start collecting evidence from your operational record.</p>
                  <Button className="mt-4 gap-2" size="sm" onClick={() => setActiveTab('new')}>
                    <Plus className="w-4 h-4" />
                    Create First Board
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBoards.map(b => (
                  <BoardCard key={b.boardId} board={b} onClick={() => openBoard(b)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── New board form ───────────────────────────────────────────────── */}
          <TabsContent value="new">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="text-base">New Investigation Board</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Title *</Label>
                  <Input placeholder="e.g. Q2 Safety Incident Review" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea placeholder="What are you investigating or documenting?" className="min-h-[80px]" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="personnel">Personnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Priority</Label>
                    <Select value={newPriority} onValueChange={setNewPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                  <Input placeholder="e.g. boiler-room, q2-2026, shift-a" value={newTags} onChange={e => setNewTags(e.target.value)} />
                </div>
                <Button className="w-full gap-2" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                  <Plus className="w-4 h-4" />
                  {creating ? 'Creating...' : 'Create Board'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
