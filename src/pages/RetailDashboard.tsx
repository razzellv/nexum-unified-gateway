import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useRetail } from '@/contexts/RetailContext';
import { apiRequest } from '@/lib/api';
import {
  ShoppingCart, Thermometer, ClipboardList, AlertTriangle,
  CheckCircle, TrendingUp, Package, Users, ArrowRight,
  AlertOctagon, Clock, Star, Zap, History, BarChart2, Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangeFilter, filterByRange, bucketByDay, type DateRange } from '@/components/DateRangeFilter';

const CHECKLIST_TEMPLATES = {
  open: [
    'Check and log walk-in cooler temperature',
    'Check and log freezer temperature',
    'Verify all refrigerated items are within temp range',
    'Check expiration dates on high-turnover items',
    'Inspect produce/fresh items for quality',
    'Verify inventory levels on critical items',
    'Check supplier deliveries received',
    'Confirm staff assignments for shift',
    'Safety check — exits clear, spills cleaned',
    'POS system operational',
  ],
  close: [
    'Log end-of-day temperatures (cooler, freezer)',
    'Record waste log for expired/damaged items',
    'Secure all refrigerated units',
    'Count register and reconcile sales',
    'Restock critical inventory items',
    'Clean food prep and service areas',
    'Dispose of expired products',
    'Lock all entry points',
    'Set alarm system',
    'Complete end-of-day inventory count',
  ],
};

const HEALTH_CHECKS = [
  { id: 'temp_logs', label: 'Temperature logs up to date', weight: 20 },
  { id: 'no_expired', label: 'No expired products on shelf', weight: 25 },
  { id: 'fifo', label: 'FIFO rotation practiced', weight: 15 },
  { id: 'checklists', label: 'Daily checklists completed', weight: 20 },
  { id: 'docs', label: 'Compliance documents current', weight: 10 },
  { id: 'staff_trained', label: 'Staff food safety trained', weight: 10 },
];

const MOCK_INVENTORY = [
  { partId: 'r1', name: 'Whole Milk (1 Gallon)', category: 'dairy', itemType: 'food', quantity: 12, minQuantity: 6, reorderPoint: 6, location: 'Walk-in Cooler', expirationDate: new Date(Date.now() + 3*86400000).toISOString().split('T')[0], storageTemp: '35-38°F', fifoOrder: 1, unitCost: 3.99 },
  { partId: 'r2', name: 'Orange Juice (64oz)', category: 'beverage', itemType: 'beverage', quantity: 8, minQuantity: 4, reorderPoint: 4, location: 'Cooler Section 2', expirationDate: new Date(Date.now() + 14*86400000).toISOString().split('T')[0], fifoOrder: 2, unitCost: 4.49 },
  { partId: 'r3', name: 'Sliced Turkey (1lb)', category: 'deli', itemType: 'food', quantity: 3, minQuantity: 5, reorderPoint: 5, location: 'Deli Case', expirationDate: new Date(Date.now() + 1*86400000).toISOString().split('T')[0], storageTemp: '34-38°F', fifoOrder: 1, allergens: ['Gluten'], unitCost: 6.99 },
  { partId: 'r4', name: 'Bread Loaf', category: 'bakery', itemType: 'food', quantity: 15, minQuantity: 8, location: 'Shelf B2', expirationDate: new Date(Date.now() + 5*86400000).toISOString().split('T')[0], fifoOrder: 1, unitCost: 2.99 },
  { partId: 'r5', name: 'Paper Bags (500ct)', category: 'supply', itemType: 'supply', quantity: 2, minQuantity: 3, reorderPoint: 3, location: 'Storage Room', unitCost: 24.99 },
];

const safeParseArray = (key: string): any[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

export default function RetailDashboard() {
  const { user } = useAuth();
  const { storeInfo } = useRetail();
  const navigate = useNavigate();

  const facilityId = user?.facilityId || (user as any)?.['custom:facilityId'] || 'facility-001';

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);
  const [tempLogs, setTempLogs] = useState<any[]>([]);
  const [checkoutLogs, setCheckoutLogs] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [complianceLogs, setComplianceLogs] = useState<any[]>([]);
  const [violationLogs, setViolationLogs] = useState<any[]>([]);

  const [checklistType, setChecklistType] = useState<'open' | 'close'>('open');
  const [completedChecks, setCompletedChecks] = useState<Record<string, boolean>>(() => {
    const today = new Date().toISOString().split('T')[0];
    try { return JSON.parse(localStorage.getItem(`retail_checklist_${today}`) || '{}'); } catch { return {}; }
  });
  const [healthChecks, setHealthChecks] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('retail_health_checks') || '{}'); } catch { return {}; }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, tempRes, checkoutRes, complianceRes, violationRes] = await Promise.allSettled([
        apiRequest(`/inventory?facilityId=${facilityId}&limit=100`),
        apiRequest(`/logs/latest?facilityId=${facilityId}&logType=temperature&limit=200`),
        apiRequest(`/logs/latest?facilityId=${facilityId}&logType=checkout&limit=200`),
        apiRequest(`/logs/latest?facilityId=${facilityId}&logType=compliance&limit=500`),
        apiRequest(`/violations?facilityId=${facilityId}&limit=500`),
      ]);

      // Inventory — prefer API, fallback to localStorage then mock
      if (invRes.status === 'fulfilled') {
        const items = invRes.value?.items || invRes.value?.inventory || invRes.value;
        const apiItems = Array.isArray(items) ? items : [];
        if (apiItems.length > 0) {
          setInventory(apiItems);
        } else {
          const saved = safeParseArray('nexum_inventory');
          setInventory(saved.length > 0 ? saved : MOCK_INVENTORY);
        }
      } else {
        const saved = safeParseArray('nexum_inventory');
        setInventory(saved.length > 0 ? saved : MOCK_INVENTORY);
      }

      // Temp logs — prefer API, fallback to localStorage
      if (tempRes.status === 'fulfilled') {
        const logs = tempRes.value?.logs || tempRes.value?.items || tempRes.value;
        const apiLogs = Array.isArray(logs) ? logs : [];
        if (apiLogs.length > 0) {
          setTempLogs(apiLogs);
        } else {
          setTempLogs(safeParseArray('inventory_temp_logs'));
        }
      } else {
        setTempLogs(safeParseArray('inventory_temp_logs'));
      }

      // Checkout logs — prefer API, fallback to localStorage
      if (checkoutRes.status === 'fulfilled') {
        const logs = checkoutRes.value?.logs || checkoutRes.value?.items || checkoutRes.value;
        const apiLogs = Array.isArray(logs) ? logs : [];
        if (apiLogs.length > 0) {
          setCheckoutLogs(apiLogs);
        } else {
          setCheckoutLogs(safeParseArray('inventory_checkout_logs'));
        }
      } else {
        setCheckoutLogs(safeParseArray('inventory_checkout_logs'));
      }

      // Compliance history
      if (complianceRes.status === 'fulfilled') {
        const logs = complianceRes.value?.logs || complianceRes.value?.items || complianceRes.value;
        setComplianceLogs(Array.isArray(logs) ? logs : []);
      } else {
        setComplianceLogs(safeParseArray('nexum_compliance_logs'));
      }

      // Violation history
      if (violationRes.status === 'fulfilled') {
        const items = violationRes.value?.items || violationRes.value?.violations || violationRes.value;
        setViolationLogs(Array.isArray(items) ? items : []);
      } else {
        setViolationLogs(safeParseArray('nexum_violations'));
      }
    } catch {
      const saved = safeParseArray('nexum_inventory');
      setInventory(saved.length > 0 ? saved : MOCK_INVENTORY);
      setTempLogs(safeParseArray('inventory_temp_logs'));
      setCheckoutLogs(safeParseArray('inventory_checkout_logs'));
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toISOString().split('T')[0];
  const todayTempLogs = tempLogs.filter((l: any) => l.timestamp?.startsWith(today));
  const todayCheckouts = checkoutLogs.filter((l: any) => l.timestamp?.startsWith(today));

  // Date-range filtered historical sets
  const rangedTempLogs    = filterByRange(tempLogs, dateRange);
  const rangedCheckouts   = filterByRange(checkoutLogs, dateRange);
  const rangedCompliance  = filterByRange(complianceLogs, dateRange);
  const rangedViolations  = filterByRange(violationLogs, dateRange, 'createdAt');

  // Trend buckets for charts
  const tempBuckets       = bucketByDay(tempLogs, dateRange);
  const violationBuckets  = bucketByDay(violationLogs, dateRange, 'createdAt');
  const complianceBuckets = bucketByDay(complianceLogs, dateRange);

  // Scored & flagged aggregates
  const flaggedViolations = rangedViolations.filter((v: any) => v.status === 'open' || v.severity === 'critical');
  const avgComplianceScore = (() => {
    const scored = rangedCompliance.filter((l: any) => typeof l.score === 'number');
    if (!scored.length) return null;
    return Math.round(scored.reduce((s: number, l: any) => s + l.score, 0) / scored.length);
  })();

  // Calculate health inspection score
  const healthScore = Math.round(
    HEALTH_CHECKS.reduce((score, check) => {
      return score + (healthChecks[check.id] ? check.weight : 0);
    }, 0)
  );

  // Expiry alerts
  const getDaysUntilExpiry = (expDate?: string) => {
    if (!expDate) return null;
    return Math.ceil((new Date(expDate).getTime() - Date.now()) / 86400000);
  };

  const expiringItems = inventory.filter((i: any) => {
    const days = getDaysUntilExpiry(i.expirationDate);
    return days !== null && days <= 7;
  });

  const lowStockItems = inventory.filter((i: any) =>
    i.quantity <= (i.reorderPoint || i.minQuantity || 0)
  );

  // Checklist completion
  const checklistItems = CHECKLIST_TEMPLATES[checklistType];
  const completedCount = checklistItems.filter((_, i) => completedChecks[`${checklistType}_${i}`]).length;
  const checklistPct = Math.round((completedCount / checklistItems.length) * 100);

  const toggleCheck = (idx: number) => {
    const key = `${checklistType}_${idx}`;
    const updated = { ...completedChecks, [key]: !completedChecks[key] };
    setCompletedChecks(updated);
    localStorage.setItem(`retail_checklist_${today}`, JSON.stringify(updated));
  };

  const toggleHealthCheck = (id: string) => {
    const updated = { ...healthChecks, [id]: !healthChecks[id] };
    setHealthChecks(updated);
    localStorage.setItem('retail_health_checks', JSON.stringify(updated));
  };

  // Org-type guard — only retail orgs and admin have access
  const orgType = localStorage.getItem('nexum_org_type') || sessionStorage.getItem('nexum_org_type') || '';
  const role = user?.role?.toLowerCase() || '';
  if (orgType !== 'retail' && role !== 'admin') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
          <ShoppingCart className="w-12 h-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold">Retail Mode Required</h2>
          <p className="text-sm text-muted-foreground max-w-xs">This dashboard is for retail organizations. If you run a store or food service operation, select Retail during onboarding to unlock this view.</p>
          <button onClick={() => navigate('/onboarding')} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Go to Onboarding</button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">{storeInfo.name || 'My Store'}</h1>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">Retail Mode</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/inventory-library')} className="border-border/50">
              <Package className="w-4 h-4 mr-2" />Inventory
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => navigate('/pricing')}>
              <Zap className="w-4 h-4 mr-2" />Upgrade to Standard
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Expiring Soon', value: expiringItems.length, icon: AlertOctagon, color: expiringItems.length > 0 ? 'text-red-400' : 'text-green-400', sub: 'within 7 days' },
            { label: 'Low Stock', value: lowStockItems.length, icon: Package, color: lowStockItems.length > 0 ? 'text-yellow-400' : 'text-green-400', sub: 'need reorder' },
            { label: "Today's Temp Logs", value: todayTempLogs.length, icon: Thermometer, color: todayTempLogs.length > 0 ? 'text-blue-400' : 'text-yellow-400', sub: 'logged today' },
            { label: 'Health Score', value: `${healthScore}%`, icon: Star, color: healthScore >= 80 ? 'text-green-400' : healthScore >= 60 ? 'text-yellow-400' : 'text-red-400', sub: 'inspection ready' },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className="neon-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1"><p className="text-xs text-muted-foreground">{label}</p><Icon className={cn('w-4 h-4', color)} /></div>
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily Checklist */}
          <Card className="neon-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="w-4 h-4 text-primary" />Daily Checklist
                </CardTitle>
                <div className="flex gap-1">
                  {(['open','close'] as const).map(t => (
                    <button key={t} onClick={() => setChecklistType(t)}
                      className={cn('px-3 py-1 rounded-full text-xs border capitalize transition-all',
                        checklistType === t ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={checklistPct} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{completedCount}/{checklistItems.length} complete</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-64 overflow-y-auto">
              {checklistItems.map((item, i) => {
                const key = `${checklistType}_${i}`;
                const done = completedChecks[key];
                return (
                  <button key={i} onClick={() => toggleCheck(i)}
                    className={cn('w-full flex items-center gap-3 p-2.5 rounded-lg border text-left text-sm transition-all',
                      done ? 'border-green-400/30 bg-green-400/5 text-green-400' : 'border-border/30 bg-muted/10 hover:border-border text-muted-foreground')}>
                    <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', done ? 'bg-green-400 border-green-400' : 'border-border/50')}>
                      {done && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className={done ? 'line-through opacity-70' : ''}>{item}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Health Inspection Readiness */}
          <Card className="neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="w-4 h-4 text-yellow-400" />Health Inspection Readiness
                <span className={cn('ml-auto text-lg font-bold', healthScore >= 80 ? 'text-green-400' : healthScore >= 60 ? 'text-yellow-400' : 'text-red-400')}>{healthScore}%</span>
              </CardTitle>
              <Progress value={healthScore} className="h-2" />
            </CardHeader>
            <CardContent className="space-y-2">
              {HEALTH_CHECKS.map(check => (
                <button key={check.id} onClick={() => toggleHealthCheck(check.id)}
                  className={cn('w-full flex items-center gap-3 p-2.5 rounded-lg border text-left text-sm transition-all',
                    healthChecks[check.id] ? 'border-green-400/30 bg-green-400/5' : 'border-border/30 bg-muted/10 hover:border-border')}>
                  <CheckCircle className={cn('w-4 h-4 shrink-0', healthChecks[check.id] ? 'text-green-400' : 'text-muted-foreground/30')} />
                  <span className="flex-1 text-sm">{check.label}</span>
                  <span className="text-[10px] text-muted-foreground">{check.weight}pts</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Expiry alerts */}
        {expiringItems.length > 0 && (
          <Card className="neon-border border-red-500/30">
            <CardHeader><CardTitle className="text-base flex items-center gap-2 text-red-400"><AlertOctagon className="w-4 h-4" />Expiring Items — Action Required</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiringItems.map((item: any) => {
                  const days = getDaysUntilExpiry(item.expirationDate)!;
                  return (
                    <div key={item.partId} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/20">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} · {item.location}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-xs', days <= 0 ? 'border-red-500/30 text-red-400' : days <= 3 ? 'border-orange-400/30 text-orange-400' : 'border-yellow-400/30 text-yellow-400')}>
                        {days <= 0 ? 'EXPIRED' : `${days}d left`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Historical Analytics ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Historical Analytics</h2>
            </div>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>

          {/* Aggregate KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Temp Logs', value: rangedTempLogs.length, icon: Thermometer, color: 'text-blue-400', sub: 'recorded' },
              { label: 'Checkouts', value: rangedCheckouts.length, icon: Package, color: 'text-green-400', sub: 'logged' },
              { label: 'Violations', value: rangedViolations.length, icon: Flag, color: rangedViolations.length > 0 ? 'text-red-400' : 'text-green-400', sub: `${flaggedViolations.length} flagged open` },
              { label: 'Avg Compliance', value: avgComplianceScore !== null ? `${avgComplianceScore}%` : '—', icon: BarChart2, color: avgComplianceScore === null ? 'text-muted-foreground' : avgComplianceScore >= 80 ? 'text-green-400' : avgComplianceScore >= 60 ? 'text-yellow-400' : 'text-red-400', sub: 'scored entries' },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <Card key={label} className="neon-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <Icon className={cn('w-4 h-4', color)} />
                  </div>
                  <p className={cn('text-2xl font-bold', color)}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trend charts */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Temperature log trend */}
            <Card className="neon-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-blue-400" />Temperature Logs Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tempBuckets.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No temperature logs in range</p>
                ) : (
                  <div className="space-y-1">
                    {tempBuckets.slice(-7).map(b => (
                      <div key={b.date} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-16 shrink-0">{b.label}</span>
                        <div className="flex-1 bg-muted/20 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (b.count / Math.max(...tempBuckets.map(x => x.count))) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-4 text-right">{b.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Violation trend */}
            <Card className="neon-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-400" />Violations Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {violationBuckets.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No violations in range</p>
                ) : (
                  <div className="space-y-1">
                    {violationBuckets.slice(-7).map(b => (
                      <div key={b.date} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-16 shrink-0">{b.label}</span>
                        <div className="flex-1 bg-muted/20 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, (b.count / Math.max(...violationBuckets.map(x => x.count), 1)) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-4 text-right">{b.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance log trend */}
            <Card className="neon-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-green-400" />Compliance Entries Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complianceBuckets.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No compliance logs in range</p>
                ) : (
                  <div className="space-y-1">
                    {complianceBuckets.slice(-7).map(b => (
                      <div key={b.date} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-16 shrink-0">{b.label}</span>
                        <div className="flex-1 bg-muted/20 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.min(100, (b.count / Math.max(...complianceBuckets.map(x => x.count))) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-4 text-right">{b.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Flagged violations list */}
          {flaggedViolations.length > 0 && (
            <Card className="neon-border border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                  <Flag className="w-4 h-4" />Flagged Open Violations ({flaggedViolations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {flaggedViolations.slice(0, 5).map((v: any, i: number) => (
                    <div key={v.violationId || i} className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-muted/10">
                      <div>
                        <p className="text-sm font-medium">{v.description || v.type || 'Violation'}</p>
                        <p className="text-xs text-muted-foreground">{v.location || v.area || '—'} · {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—'}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-xs shrink-0', v.severity === 'critical' ? 'border-red-500/30 text-red-400' : 'border-orange-400/30 text-orange-400')}>
                        {v.severity || v.status || 'open'}
                      </Badge>
                    </div>
                  ))}
                  {flaggedViolations.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">+{flaggedViolations.length - 5} more violations</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upgrade CTA */}
        <div className="glass-panel rounded-2xl p-6 border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold">Ready for full facility intelligence?</p>
                <p className="text-sm text-muted-foreground mt-1">Upgrade to Standard and get energy dashboards, work orders, manager tools, compliance document storage, and multi-location analytics. Your retail data transfers automatically.</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['Energy Dashboard', 'Work Orders', 'Manager Dashboard', 'Compliance Docs', 'Multi-Location'].map(f => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 text-primary bg-primary/5">{f}</span>
                  ))}
                </div>
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground shrink-0" onClick={() => navigate('/pricing')}>
              Upgrade to Standard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
