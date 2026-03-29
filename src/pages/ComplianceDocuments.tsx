import { useState, useRef } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TierGate } from '@/components/global/TierGate';
import { useToast } from '@/hooks/use-toast';
import {
  FileText, Upload, Search, Download, Trash2, Plus,
  Eye, Calendar, Tag, Building2, Filter, FolderOpen,
  CheckCircle, AlertTriangle, Clock, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface ComplianceDoc {
  id: string;
  title: string;
  category: 'sop' | 'eop' | 'checklist' | 'pm-schedule' | 'audit-report' | 'permit' | 'certification' | 'policy' | 'other';
  description?: string;
  tags: string[];
  facilityId: string;
  uploadedBy: string;
  uploadedAt: string;
  lastReviewedAt?: string;
  nextReviewDate?: string;
  status: 'current' | 'review-due' | 'expired' | 'draft';
  fileType: string;
  fileSize: number;
  fileData?: string; // base64
  version: string;
}

const CATEGORIES = [
  { id: 'sop',          label: 'SOP',              color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  { id: 'eop',          label: 'EOP',              color: 'text-red-400 border-red-400/30 bg-red-400/10' },
  { id: 'checklist',    label: 'Checklist',        color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  { id: 'pm-schedule',  label: 'PM Schedule',      color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  { id: 'audit-report', label: 'Audit Report',     color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
  { id: 'permit',       label: 'Permit',           color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
  { id: 'certification',label: 'Certification',    color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
  { id: 'policy',       label: 'Policy',           color: 'text-primary border-primary/30 bg-primary/10' },
  { id: 'other',        label: 'Other',            color: 'text-muted-foreground border-border/30 bg-muted/10' },
];

const STATUS_STYLES = {
  current:     { label: 'Current',     color: 'text-green-400 border-green-400/30 bg-green-400/10', icon: CheckCircle },
  'review-due':{ label: 'Review Due',  color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10', icon: Clock },
  expired:     { label: 'Expired',     color: 'text-red-400 border-red-400/30 bg-red-400/10', icon: AlertTriangle },
  draft:       { label: 'Draft',       color: 'text-muted-foreground border-border/30 bg-muted/10', icon: FileText },
};

export default function ComplianceDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<ComplianceDoc[]>(() => {
    try { return JSON.parse(localStorage.getItem('compliance_docs') || '[]'); } catch { return []; }
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', category: 'sop' as ComplianceDoc['category'],
    description: '', tags: '', version: '1.0',
    nextReviewDate: '', status: 'current' as ComplianceDoc['status'],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const saveDocs = (updated: ComplianceDoc[]) => {
    setDocs(updated);
    localStorage.setItem('compliance_docs', JSON.stringify(updated));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!form.title) setForm(p => ({ ...p, title: file.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleUpload = async () => {
    if (!form.title) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      let fileData = '';
      let fileType = 'unknown';
      let fileSize = 0;
      if (selectedFile) {
        fileType = selectedFile.type || selectedFile.name.split('.').pop() || 'unknown';
        fileSize = selectedFile.size;
        fileData = await new Promise<string>(res => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }
      const doc: ComplianceDoc = {
        id: `doc-${Date.now()}`,
        title: form.title,
        category: form.category,
        description: form.description,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        facilityId: user?.facilityId || 'facility-001',
        uploadedBy: user?.name || user?.email || 'Unknown',
        uploadedAt: new Date().toISOString(),
        nextReviewDate: form.nextReviewDate || undefined,
        status: form.status,
        fileType, fileSize, fileData,
        version: form.version,
      };
      saveDocs([doc, ...docs]);
      setShowUpload(false);
      setSelectedFile(null);
      setForm({ title: '', category: 'sop', description: '', tags: '', version: '1.0', nextReviewDate: '', status: 'current' });
      toast({ title: 'Document added', description: doc.title });
    } catch (e) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const handleDownload = (doc: ComplianceDoc) => {
    if (!doc.fileData) { toast({ title: 'No file attached', variant: 'destructive' }); return; }
    const a = document.createElement('a');
    a.href = doc.fileData;
    a.download = `${doc.title}.${doc.fileType.split('/').pop() || 'pdf'}`;
    a.click();
    toast({ title: 'Downloading', description: doc.title });
  };

  const handleDelete = (id: string) => {
    saveDocs(docs.filter(d => d.id !== id));
    toast({ title: 'Document removed' });
  };

  const markReviewed = (id: string) => {
    saveDocs(docs.map(d => d.id === id ? { ...d, lastReviewedAt: new Date().toISOString(), status: 'current' } : d));
    toast({ title: 'Marked as reviewed' });
  };

  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || d.tags.some(t => t.toLowerCase().includes(q)) || d.category.includes(q);
    const matchCat = categoryFilter === 'all' || d.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const reviewDue = docs.filter(d => d.status === 'review-due' || d.status === 'expired').length;
  const catCounts = CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: docs.filter(d => d.category === c.id).length }), {} as Record<string, number>);

  return (
    <MainLayout>
      <ParticleBackground />
      <TierGate feature="compliance_documents">
        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3"><FolderOpen className="w-7 h-7 text-primary" />Compliance Documents</h1>
              <p className="text-muted-foreground text-sm mt-1">{docs.length} documents · {reviewDue > 0 ? `${reviewDue} need review` : 'All current'}</p>
            </div>
            <Button onClick={() => setShowUpload(true)} className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />Add Document
            </Button>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Docs', value: docs.length, color: 'text-primary' },
              { label: 'Current', value: docs.filter(d => d.status === 'current').length, color: 'text-green-400' },
              { label: 'Review Due', value: docs.filter(d => d.status === 'review-due').length, color: 'text-yellow-400' },
              { label: 'Expired', value: docs.filter(d => d.status === 'expired').length, color: 'text-destructive' },
            ].map(({ label, value, color }) => (
              <Card key={label} className="neon-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCategoryFilter('all')}
              className={cn('px-3 py-1.5 rounded-full text-xs border transition-all', categoryFilter === 'all' ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground hover:border-border')}>
              All ({docs.length})
            </button>
            {CATEGORIES.filter(c => (catCounts[c.id] || 0) > 0).map(c => (
              <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                className={cn('px-3 py-1.5 rounded-full text-xs border transition-all', categoryFilter === c.id ? c.color : 'border-border/30 text-muted-foreground hover:border-border')}>
                {c.label} ({catCounts[c.id] || 0})
              </button>
            ))}
          </div>

          {/* Search + filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search documents, tags..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 border-border/50" />
            </div>
            <div className="flex gap-2">
              {['all','current','review-due','expired','draft'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn('px-3 py-1.5 rounded-full text-xs border transition-all capitalize', statusFilter === s ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground hover:border-border')}>
                  {s === 'review-due' ? 'Review Due' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Document list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <FileText className="w-12 h-12 mx-auto opacity-30" />
              <p className="font-medium">{docs.length === 0 ? 'No documents yet' : 'No documents match your filters'}</p>
              {docs.length === 0 && <Button onClick={() => setShowUpload(true)} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" />Add First Document</Button>}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(doc => {
                const cat = CATEGORIES.find(c => c.id === doc.category);
                const status = STATUS_STYLES[doc.status];
                const StatusIcon = status.icon;
                return (
                  <div key={doc.id} className="glass-panel rounded-xl border border-border/30 hover:border-primary/20 transition-all p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-lg bg-muted/20 shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm">{doc.title}</p>
                          <Badge variant="outline" className={cn('text-[10px]', cat?.color || '')}>{cat?.label}</Badge>
                          <Badge variant="outline" className={cn('text-[10px]', status.color)}>
                            <StatusIcon className="w-2.5 h-2.5 mr-1" />{status.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">v{doc.version}</span>
                        </div>
                        {doc.description && <p className="text-xs text-muted-foreground mb-1">{doc.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Added {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          <span>By {doc.uploadedBy}</span>
                          {doc.nextReviewDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Review: {new Date(doc.nextReviewDate).toLocaleDateString()}</span>}
                          {doc.fileSize > 0 && <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>}
                        </div>
                        {doc.tags.length > 0 && (
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {doc.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 border border-border/20 text-muted-foreground">{t}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.status === 'review-due' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-green-400/30 text-green-400" onClick={() => markReviewed(doc.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" />Mark Reviewed
                          </Button>
                        )}
                        {doc.fileData && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => handleDownload(doc)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </TierGate>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Compliance Document</h3>
              <button onClick={() => setShowUpload(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Document Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="e.g. Boiler Room SOP v2.1" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value as any}))}
                    className="w-full h-9 text-sm border border-border/40 bg-card/50 rounded-lg px-3 focus:outline-none">
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value as any}))}
                    className="w-full h-9 text-sm border border-border/40 bg-card/50 rounded-lg px-3 focus:outline-none">
                    <option value="current">Current</option>
                    <option value="draft">Draft</option>
                    <option value="review-due">Review Due</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Version</Label>
                  <Input value={form.version} onChange={e => setForm(p => ({...p, version: e.target.value}))} placeholder="1.0" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Next Review Date</Label>
                  <Input type="date" value={form.nextReviewDate} onChange={e => setForm(p => ({...p, nextReviewDate: e.target.value}))} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Brief description of this document..." className="min-h-[60px] text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tags <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
                <Input value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))} placeholder="boiler, HVAC, maintenance, NJ-code" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">File <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-border/50">
                    <Upload className="w-4 h-4 mr-2" />{selectedFile ? selectedFile.name : 'Choose File'}
                  </Button>
                  {selectedFile && <button onClick={() => setSelectedFile(null)}><X className="w-4 h-4 text-muted-foreground" /></button>}
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xlsx,.csv,.txt" onChange={handleFileSelect} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleUpload} disabled={uploading}>
                <Plus className="w-4 h-4 mr-2" />{uploading ? 'Adding...' : 'Add Document'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
