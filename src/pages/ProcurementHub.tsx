import { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Shield, Briefcase, ChevronDown, ChevronRight, Copy, Check,
  Download, FileText, Building2, ArrowRight, RefreshCw, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CLINS, RATE_CARDS, type CLIN, type ProcurementModel, type LaborCategory } from '@/config/govconConfig';
import { GovConQuoteEngine, type Quote, type SOWSection } from '@/services/GovConQuoteEngine';

// ── Types ─────────────────────────────────────────────────────────────────────
type TabId = 'quote-builder' | 'rate-cards' | 'clin-reference' | 'sow' | 'saved-quotes';

const TABS: { id: TabId; label: string }[] = [
  { id: 'quote-builder', label: 'Quote Builder' },
  { id: 'rate-cards', label: 'Rate Cards' },
  { id: 'clin-reference', label: 'CLIN Reference' },
  { id: 'sow', label: 'SOW Generator' },
  { id: 'saved-quotes', label: 'Saved Quotes' },
];

const CLIN_GROUPS = [
  { label: 'Software Licenses', ids: ['CLIN_0001'] },
  { label: 'Professional Services', ids: ['CLIN_0002', 'CLIN_0006', 'CLIN_0008'] },
  { label: 'Assessments', ids: ['CLIN_0004', 'CLIN_0005', 'CLIN_0007', 'CLIN_S001', 'CLIN_S002', 'CLIN_S003', 'CLIN_S004'] },
  { label: 'Training', ids: ['CLIN_0003'] },
  { label: 'Support', ids: ['CLIN_0009'] },
  { label: 'Option Years', ids: ['CLIN_0010', 'CLIN_0011', 'CLIN_0012'] },
];

const MODEL_OPTIONS: { value: ProcurementModel; label: string }[] = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'govcon', label: 'GovCon (Government)' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'utility', label: 'Utility & Infrastructure' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Higher Education' },
];

const SECTOR_OPTIONS = [
  'Government / Public Agency',
  'Federal Agency',
  'State Agency',
  'County / Municipal',
  'Utility / Water Authority',
  'Healthcare / Hospital',
  'University / College',
  'K-12 Education',
  'Manufacturing',
  'Infrastructure / Transit',
  'Public Safety',
  'Facility Management',
  'Commercial / Corporate',
];

const LABOR_CATEGORY_LABELS: Record<LaborCategory, string> = {
  PM: 'Program Manager',
  SCA: 'Senior Contracts Administrator',
  BD: 'Business Development',
  TS: 'Training Specialist',
  SME: 'Subject Matter Expert',
  ADMIN: 'Administrative',
};

function getModelPrice(clin: CLIN, model: ProcurementModel): number {
  if (model === 'utility' || model === 'healthcare' || model === 'education') {
    // Use enterprise as a ceiling approximation for unlisted models
    const rc = RATE_CARDS.find(r => r.model === model);
    if (rc) {
      return Math.round(clin.unitPrice.commercial * rc.multiplier);
    }
  }
  return clin.unitPrice[model as 'commercial' | 'govcon' | 'enterprise'] ?? clin.unitPrice.commercial;
}

function getTypeBadgeStyle(type: CLIN['type']): string {
  switch (type) {
    case 'software': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'services': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    case 'training': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'assessment': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    case 'support': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'option_year': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getModelBadgeStyle(model: ProcurementModel): string {
  switch (model) {
    case 'commercial': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'govcon': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    case 'enterprise': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'utility': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'healthcare': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    case 'education': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

// ── Quote Builder Tab ─────────────────────────────────────────────────────────
function QuoteBuilderTab({
  onQuoteGenerated,
}: {
  onQuoteGenerated: (quote: Quote, sow: SOWSection[]) => void;
}) {
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [sector, setSector] = useState('');
  const [model, setModel] = useState<ProcurementModel>('govcon');
  const [selectedClins, setSelectedClins] = useState<Record<string, number>>({});
  const [generated, setGenerated] = useState<Quote | null>(null);
  const [quoteId, setQuoteId] = useState('');

  const toggleCLIN = useCallback((id: string) => {
    setSelectedClins(prev => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setSelectedClins(prev => ({ ...prev, [id]: Math.max(1, qty) }));
  }, []);

  // Live price calculation
  const priceCalc = useMemo(() => {
    const selections = Object.entries(selectedClins).map(([clinId, quantity]) => ({ clinId, quantity }));
    const lineItems = selections.map(sel => {
      const clin = CLINS.find(c => c.id === sel.clinId);
      if (!clin || clin.isOptionYear) return null;
      const unitPrice = getModelPrice(clin, model);
      return { clin, quantity: sel.quantity, unitPrice, totalPrice: unitPrice * sel.quantity };
    }).filter(Boolean) as Array<{ clin: CLIN; quantity: number; unitPrice: number; totalPrice: number }>;

    const baseTotal = lineItems.reduce((s, li) => s + li.totalPrice, 0);
    const escalation = 1.03;
    const oy1 = lineItems.filter(li => ['software', 'support'].includes(li.clin.type)).reduce((s, li) => s + li.totalPrice * escalation, 0);
    const oy2 = oy1 * escalation;
    const oy3 = oy2 * escalation;

    return { lineItems, baseTotal, oy1, oy2, oy3, fiveYear: baseTotal + oy1 + oy2 + oy3 };
  }, [selectedClins, model]);

  const handleGenerate = () => {
    if (!orgName || Object.keys(selectedClins).length === 0) return;
    const selections = Object.entries(selectedClins).map(([clinId, quantity]) => ({ clinId, quantity }));
    const quote = GovConQuoteEngine.buildQuote(selections, model, orgName, contactEmail, sector);
    const sow = GovConQuoteEngine.generateSOW(quote);
    GovConQuoteEngine.saveQuote(quote);
    setGenerated(quote);
    setQuoteId(quote.id);
    onQuoteGenerated(quote, sow);
  };

  const handleGenerateROM = () => {
    if (!orgName || Object.keys(selectedClins).length === 0) return;
    const selections = Object.entries(selectedClins).map(([clinId, quantity]) => ({ clinId, quantity }));
    const quote = GovConQuoteEngine.buildQuote(selections, model, orgName, contactEmail, sector);
    const rom = GovConQuoteEngine.generateROM(quote);
    const blob = new Blob([rom], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ROM-${orgName.replace(/\s+/g, '-')}-${quote.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main builder */}
      <div className="lg:col-span-2 space-y-6">
        {/* Org info */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Organization Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Organization Name *</label>
                <Input
                  placeholder="City of Springfield Public Works"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Contact Email</label>
                <Input
                  placeholder="procurement@agency.gov"
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Sector</label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger><SelectValue placeholder="Select sector..." /></SelectTrigger>
                  <SelectContent>
                    {SECTOR_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Procurement Model *</label>
                <Select value={model} onValueChange={v => setModel(v as ProcurementModel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CLIN groups */}
        {CLIN_GROUPS.map(group => {
          const groupClins = group.ids.map(id => CLINS.find(c => c.id === id)).filter(Boolean) as CLIN[];
          return (
            <div key={group.label} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">{group.label}</h3>
              <div className="space-y-2">
                {groupClins.map(clin => {
                  const isSelected = selectedClins[clin.id] !== undefined;
                  const qty = selectedClins[clin.id] || 1;
                  const unitPrice = getModelPrice(clin, model);
                  const lineTotal = isSelected ? unitPrice * qty : 0;
                  return (
                    <div
                      key={clin.id}
                      className={cn(
                        'rounded-lg border p-4 transition-colors cursor-pointer',
                        isSelected
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border bg-card hover:border-border/80 hover:bg-card/80'
                      )}
                      onClick={() => toggleCLIN(clin.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                          isSelected ? 'border-primary bg-primary' : 'border-border'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono font-bold text-muted-foreground">CLIN {clin.number}</span>
                            <Badge className={cn('text-xs', getTypeBadgeStyle(clin.type))}>{clin.type}</Badge>
                          </div>
                          <p className="text-sm font-semibold leading-tight">{clin.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{clin.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{clin.unit}{clin.periodOfPerformance ? ` · ${clin.periodOfPerformance}` : ''}</p>
                        </div>
                        <div className="text-right shrink-0" onClick={e => e.stopPropagation()}>
                          <p className="text-sm font-bold text-foreground">${unitPrice.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{clin.unit}</p>
                          {isSelected && !clin.isOptionYear && (
                            <div className="flex items-center gap-1 mt-2 justify-end">
                              <button
                                className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs hover:bg-muted"
                                onClick={() => setQty(clin.id, qty - 1)}
                              >-</button>
                              <span className="w-8 text-center text-sm font-medium">{qty}</span>
                              <button
                                className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs hover:bg-muted"
                                onClick={() => setQty(clin.id, qty + 1)}
                              >+</button>
                            </div>
                          )}
                          {isSelected && lineTotal > 0 && (
                            <p className="text-xs font-semibold text-primary mt-1">= ${lineTotal.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky price summary */}
      <div className="space-y-4">
        <div className="sticky top-4 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Price Summary</span>
                <Badge className={cn('text-xs', getModelBadgeStyle(model))}>
                  {MODEL_OPTIONS.find(o => o.value === model)?.label || model}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>CLINs selected</span>
                <span className="font-medium text-foreground">{Object.keys(selectedClins).length}</span>
              </div>

              {priceCalc.lineItems.length > 0 && (
                <div className="space-y-1.5 border-t border-border pt-3">
                  {priceCalc.lineItems.map(li => (
                    <div key={li.clin.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[140px]">{li.clin.title}</span>
                      <span className="font-medium shrink-0 ml-2">${li.totalPrice.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Base Period Total</span>
                  <span className="text-primary">${priceCalc.baseTotal.toLocaleString()}</span>
                </div>
                {priceCalc.oy1 > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Option Year 1 (+3%)</span>
                      <span>${Math.round(priceCalc.oy1).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Option Year 2 (+3%)</span>
                      <span>${Math.round(priceCalc.oy2).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Option Year 3 (+3%)</span>
                      <span>${Math.round(priceCalc.oy3).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                      <span>5-Year Total Value</span>
                      <span className="text-primary">${Math.round(priceCalc.fiveYear).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {generated && (
                <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
                  <p className="text-xs text-green-400 font-semibold">Quote Generated</p>
                  <p className="text-xs text-muted-foreground font-mono">{quoteId}</p>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={!orgName || Object.keys(selectedClins).length === 0}
                >
                  Generate Quote & SOW <FileText className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGenerateROM}
                  disabled={!orgName || Object.keys(selectedClins).length === 0}
                >
                  Generate ROM <Download className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">Quote valid for 90 days · FFP pricing</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Rate Cards Tab ─────────────────────────────────────────────────────────────
function RateCardsTab() {
  const laborCategories: LaborCategory[] = ['PM', 'SCA', 'BD', 'TS', 'SME', 'ADMIN'];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {RATE_CARDS.map(rc => (
          <Card key={rc.id} className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm leading-tight">{rc.name}</CardTitle>
                <Badge className={cn('text-xs shrink-0', getModelBadgeStyle(rc.model))}>{rc.model}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{rc.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                {rc.overhead > 0 && (
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Overhead</p>
                    <p className="text-sm font-bold">{rc.overhead}%</p>
                  </div>
                )}
                {rc.ga > 0 && (
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">G&A</p>
                    <p className="text-sm font-bold">{rc.ga}%</p>
                  </div>
                )}
                {rc.profit > 0 && (
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Profit</p>
                    <p className="text-sm font-bold">{rc.profit}%</p>
                  </div>
                )}
                <div className="rounded bg-primary/10 p-2 col-span-3 flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">Price Multiplier</p>
                  <p className="text-sm font-bold text-primary">{rc.multiplier}x</p>
                </div>
              </div>
              <div className="space-y-1 pt-1 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Labor Rates ($/hr)</p>
                {laborCategories.map(cat => (
                  <div key={cat} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{LABOR_CATEGORY_LABELS[cat]} ({cat})</span>
                    <span className="font-medium">${rc.laborRates[cat]}/hr</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                Valid through: {rc.validThrough}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Labor Rate Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Category</th>
                  {RATE_CARDS.map(rc => (
                    <th key={rc.id} className="text-right py-2 px-3 text-muted-foreground font-medium">{rc.model}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['PM', 'SCA', 'BD', 'TS', 'SME', 'ADMIN'] as LaborCategory[]).map(cat => (
                  <tr key={cat} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{cat} — {LABOR_CATEGORY_LABELS[cat]}</td>
                    {RATE_CARDS.map(rc => (
                      <td key={rc.id} className="py-2 px-3 text-right font-mono">${rc.laborRates[cat]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── CLIN Reference Tab ─────────────────────────────────────────────────────────
function ClinReferenceTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
        <div className="col-span-1">CLIN #</div>
        <div className="col-span-3">Title</div>
        <div className="col-span-1">Type</div>
        <div className="col-span-1">Unit</div>
        <div className="col-span-2 text-right">Commercial</div>
        <div className="col-span-2 text-right">GovCon</div>
        <div className="col-span-2 text-right">Enterprise</div>
      </div>

      {CLINS.map(clin => {
        const isExpanded = expandedId === clin.id;
        return (
          <div key={clin.id} className="rounded-lg border border-border bg-card overflow-hidden">
            <button
              className="w-full text-left"
              onClick={() => setExpandedId(isExpanded ? null : clin.id)}
            >
              <div className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/30 transition-colors items-center">
                <div className="md:col-span-1">
                  <span className="text-xs font-mono font-bold text-muted-foreground">{clin.number}</span>
                </div>
                <div className="md:col-span-3">
                  <p className="text-sm font-semibold leading-tight">{clin.title}</p>
                </div>
                <div className="md:col-span-1 hidden md:block">
                  <Badge className={cn('text-xs', getTypeBadgeStyle(clin.type))}>{clin.type}</Badge>
                </div>
                <div className="md:col-span-1 hidden md:block">
                  <p className="text-xs text-muted-foreground">{clin.unit}</p>
                </div>
                <div className="md:col-span-2 text-right hidden md:block">
                  <p className="text-xs font-medium">${clin.unitPrice.commercial.toLocaleString()}</p>
                </div>
                <div className="md:col-span-2 text-right hidden md:block">
                  <p className="text-xs font-medium text-violet-400">${clin.unitPrice.govcon.toLocaleString()}</p>
                </div>
                <div className="md:col-span-2 text-right flex items-center justify-end gap-2 hidden md:flex">
                  <p className="text-xs font-medium text-amber-400">${clin.unitPrice.enterprise.toLocaleString()}</p>
                  <div className="text-muted-foreground">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
                {/* Mobile */}
                <div className="flex items-center justify-between md:hidden col-span-2">
                  <Badge className={cn('text-xs', getTypeBadgeStyle(clin.type))}>{clin.type}</Badge>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">GovCon:</span>
                    <span className="font-bold text-violet-400">${clin.unitPrice.govcon.toLocaleString()}</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/20 space-y-4">
                <p className="text-sm text-muted-foreground pt-3">{clin.description}</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Period of Performance</p>
                    <p className="text-sm">{clin.periodOfPerformance || 'As specified'}</p>
                  </div>
                  {clin.laborCategory && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Labor Category</p>
                      <p className="text-sm">{clin.laborCategory} — {LABOR_CATEGORY_LABELS[clin.laborCategory]}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Deliverables Count</p>
                    <p className="text-sm">{clin.deliverables.length} deliverables</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Deliverables</p>
                  <ul className="space-y-1">
                    {clin.deliverables.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Sector Applicability</p>
                  <div className="flex flex-wrap gap-1">
                    {clin.sectors.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SOW Tab ────────────────────────────────────────────────────────────────────
function SOWTab({ sow, quote }: { sow: SOWSection[] | null; quote: Quote | null }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const copySection = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyAll = () => {
    if (!sow) return;
    const full = sow.map(s => `${s.title}\n\n${s.content}`).join('\n\n─────────────────────────────────\n\n');
    navigator.clipboard.writeText(full);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const downloadSOW = () => {
    if (!sow || !quote) return;
    const full = `STATEMENT OF WORK\n\nOrganization: ${quote.orgName}\nQuote ID: ${quote.id}\nProcurement Model: ${quote.model.toUpperCase()}\nGenerated: ${new Date(quote.generatedAt).toLocaleDateString()}\n\n${'='.repeat(60)}\n\n${sow.map(s => `${s.title}\n\n${s.content}`).join('\n\n─────────────────────────────────\n\n')}\n\nNexum Suum LLC | SAM.gov Registered | MBE Certified\nValid for 90 days from generation date`;
    const blob = new Blob([full], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOW-${quote.orgName.replace(/\s+/g, '-')}-${quote.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!sow || !quote) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <FileText className="w-12 h-12 text-muted-foreground/50" />
        <p className="text-lg font-semibold text-muted-foreground">No SOW Generated Yet</p>
        <p className="text-sm text-muted-foreground max-w-sm">Go to the Quote Builder tab, select CLINs, and click "Generate Quote & SOW" to create your Statement of Work.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">Statement of Work — {quote.orgName}</p>
          <p className="text-xs text-muted-foreground font-mono">{quote.id} · {quote.model.toUpperCase()} · Generated {new Date(quote.generatedAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyAll}>
            {copiedAll ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copiedAll ? 'Copied!' : 'Copy Full SOW'}
          </Button>
          <Button size="sm" variant="outline" onClick={downloadSOW}>
            <Download className="w-4 h-4 mr-1" />
            Download .txt
          </Button>
        </div>
      </div>

      {/* SOW sections */}
      <div className="space-y-3">
        {sow.map((section, idx) => (
          <Card key={idx} className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">{section.title}</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => copySection(section.content, idx)}
                >
                  {copiedIdx === idx ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedIdx === idx ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{section.content}</pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Saved Quotes Tab ───────────────────────────────────────────────────────────
function SavedQuotesTab({ onLoadQuote }: { onLoadQuote: (quote: Quote, sow: SOWSection[]) => void }) {
  const [quotes, setQuotes] = useState<Quote[]>(() => GovConQuoteEngine.getSavedQuotes());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => setQuotes(GovConQuoteEngine.getSavedQuotes());

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <Building2 className="w-12 h-12 text-muted-foreground/50" />
        <p className="text-lg font-semibold text-muted-foreground">No Saved Quotes</p>
        <p className="text-sm text-muted-foreground">Generate a quote from the Quote Builder tab to save it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>
      {quotes.map(q => {
        const isExpanded = expandedId === q.id;
        return (
          <Card key={q.id} className="bg-card border-border">
            <button className="w-full text-left" onClick={() => setExpandedId(isExpanded ? null : q.id)}>
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-muted-foreground">{q.id}</span>
                    <Badge className={cn('text-xs', getModelBadgeStyle(q.model))}>{q.model}</Badge>
                  </div>
                  <p className="text-sm font-semibold">{q.orgName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(q.generatedAt).toLocaleDateString()} · {q.lineItems.length} CLINs · Expires {new Date(q.expiresAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-primary">${q.baseTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">base period</p>
                  {isExpanded ? <ChevronDown className="w-4 h-4 ml-auto mt-2 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 ml-auto mt-2 text-muted-foreground" />}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-3 bg-muted/20">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Contact</p>
                    <p>{q.contactEmail || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Sector</p>
                    <p>{q.sector || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">5-Year Total</p>
                    <p className="font-bold text-primary">${q.fiveYearTotal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Option Years</p>
                    <p>${Math.round(q.optionYear1Total).toLocaleString()} / ${Math.round(q.optionYear2Total).toLocaleString()} / ${Math.round(q.optionYear3Total).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Line Items</p>
                  <div className="space-y-1">
                    {q.lineItems.map(li => (
                      <div key={li.clin.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">CLIN {li.clin.number} — {li.clin.title}</span>
                        <span className="font-medium ml-2">${li.totalPrice.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const sow = GovConQuoteEngine.generateSOW(q);
                      onLoadQuote(q, sow);
                    }}
                  >
                    Regenerate SOW <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProcurementHub() {
  const [activeTab, setActiveTab] = useState<TabId>('quote-builder');
  const [generatedQuote, setGeneratedQuote] = useState<Quote | null>(null);
  const [generatedSOW, setGeneratedSOW] = useState<SOWSection[] | null>(null);
  const [viewQuoteDialog, setViewQuoteDialog] = useState(false);

  const handleQuoteGenerated = useCallback((quote: Quote, sow: SOWSection[]) => {
    setGeneratedQuote(quote);
    setGeneratedSOW(sow);
    setActiveTab('sow');
  }, []);

  const handleLoadQuote = useCallback((quote: Quote, sow: SOWSection[]) => {
    setGeneratedQuote(quote);
    setGeneratedSOW(sow);
    setActiveTab('sow');
  }, []);

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Government & Enterprise</Badge>
                <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">CLIN-Based Procurement</Badge>
              </div>
              <h1 className="text-2xl font-bold">Government & Enterprise Contracting Engine™</h1>
              <p className="text-muted-foreground text-sm max-w-2xl">
                CLIN-structured pricing for federal, state, utility, infrastructure, healthcare, and enterprise contracts.
                Supports IDIQs, BPAs, GSA Schedule, and direct contract vehicles.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setViewQuoteDialog(true)} disabled={!generatedQuote}>
              <Star className="w-4 h-4 mr-1" />
              View Current Quote
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {['SAM.gov Registered', 'MBE Certified', 'FFP Available', 'GSA MAS Ready'].map(b => (
              <span key={b} className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border/50 bg-card/50 text-xs font-medium text-muted-foreground">
                <Shield className="w-3 h-3 text-blue-400" />
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {tab.label}
                {tab.id === 'sow' && generatedSOW && (
                  <span className="ml-1.5 w-2 h-2 rounded-full bg-green-500 inline-block" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'quote-builder' && (
            <QuoteBuilderTab onQuoteGenerated={handleQuoteGenerated} />
          )}
          {activeTab === 'rate-cards' && <RateCardsTab />}
          {activeTab === 'clin-reference' && <ClinReferenceTab />}
          {activeTab === 'sow' && <SOWTab sow={generatedSOW} quote={generatedQuote} />}
          {activeTab === 'saved-quotes' && <SavedQuotesTab onLoadQuote={handleLoadQuote} />}
        </div>
      </div>

      {/* Current quote dialog */}
      <Dialog open={viewQuoteDialog} onOpenChange={setViewQuoteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Current Quote</DialogTitle>
          </DialogHeader>
          {generatedQuote && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-mono text-muted-foreground">{generatedQuote.id}</p>
                <p className="text-lg font-bold">{generatedQuote.orgName}</p>
                <Badge className={cn('text-xs', getModelBadgeStyle(generatedQuote.model))}>{generatedQuote.model}</Badge>
              </div>
              <div className="space-y-2">
                {generatedQuote.lineItems.map(li => (
                  <div key={li.clin.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CLIN {li.clin.number} — {li.clin.title}</span>
                    <span className="font-medium">${li.totalPrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Base Period</span>
                  <span className="text-primary">${generatedQuote.baseTotal.toLocaleString()}</span>
                </div>
                {generatedQuote.fiveYearTotal > generatedQuote.baseTotal && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>5-Year Total</span>
                    <span>${Math.round(generatedQuote.fiveYearTotal).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Expires: {new Date(generatedQuote.expiresAt).toLocaleDateString()}
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setViewQuoteDialog(false)}>Close</Button>
                <Button onClick={() => { setViewQuoteDialog(false); setActiveTab('sow'); }}>
                  View SOW <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
