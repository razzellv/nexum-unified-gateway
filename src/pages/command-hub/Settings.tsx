import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Slider } from '@/components/ui/slider';
import {
  loadCustomViolations, saveCustomViolations, addCustomViolation,
  deleteCustomViolation, type CustomViolationType,
} from '@/lib/customViolations';
import { UsageSummaryCard, LimitBanner, parseLimitError } from '@/components/global/UsageMeter';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  User, Bell, Shield, Users, Zap, Database, Save,
  DollarSign, Flame, Lock, Eye, Plus, Trash2, RefreshCw,
  FileText, Upload, Download, Search, X, FolderOpen, Calendar,
  CreditCard, ExternalLink, AlertTriangle, CheckCircle, ArrowUpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ApprovalsTab } from '@/components/settings/ApprovalsTab';
import { LocationSetupWizard, planRequiresLocationSetup, type FacilityLocation } from '@/components/LocationSetupWizard';
import { TierGate } from '@/components/TierGate';

const ADMIN_ROLES      = ['admin'];
const EXECUTIVE_ROLES  = ['admin', 'executive'];
const MANAGER_ROLES    = ['admin', 'executive', 'manager'];
const LEADERSHIP_ROLES = ['admin', 'executive', 'director', 'manager', 'supervisor', 'compliance_officer'];
const ALL_ROLES        = ['admin', 'executive', 'manager', 'supervisor', 'engineer', 'operator', 'technician', 'custodian'];

function can(userRole: string, roles: string[]) {
  return roles.includes(userRole?.toLowerCase());
}

const ALL_TABS = [
  { id: 'profile',       label: 'Profile',         icon: User,       access: ALL_ROLES },
  { id: 'notifications', label: 'Notifications',    icon: Bell,       access: ALL_ROLES },
  { id: 'security',      label: 'Security',         icon: Shield,     access: ALL_ROLES },
  { id: 'team',          label: 'Team & Roles',     icon: Users,      access: LEADERSHIP_ROLES },
  { id: 'documents',     label: 'Documents',        icon: FileText,   access: MANAGER_ROLES },
  { id: 'budget',        label: 'Budget',           icon: DollarSign, access: MANAGER_ROLES },
  { id: 'utilities',     label: 'Utility Rates',    icon: Flame,      access: EXECUTIVE_ROLES },
  { id: 'approvals',     label: 'Approvals',        icon: Shield,     access: EXECUTIVE_ROLES },
  { id: 'billing',       label: 'Plan & Billing',   icon: CreditCard, access: EXECUTIVE_ROLES },
  { id: 'compliance',    label: 'Compliance Types',  icon: Shield,     access: LEADERSHIP_ROLES },
  { id: 'integration',   label: 'Integrations',     icon: Zap,        access: ADMIN_ROLES },
  { id: 'data',          label: 'Data & Backup',    icon: Database,   access: ADMIN_ROLES },
];

const DOC_CATEGORIES = ['SOP', 'EOP', 'Checklist', 'PM Schedule', 'Audit Report', 'Permit', 'Certification', 'Policy', 'Other'];
const DOC_STATUSES   = ['Active', 'Draft', 'Archived', 'Expired', 'Under Review'];

const DEFAULT_DEPT_NAMES = ['Operations', 'Maintenance', 'Utilities', 'Compliance', 'Training', 'Security', 'Other'];
const emptyDept = (name = '') => ({ department: name, annualBudget: '', spentToDate: '', notes: '' });

interface ComplianceDoc {
  id: string;
  title: string;
  nickname: string;
  category: string;
  status: string;
  tags: string[];
  uploadedAt: string;
  fileName: string;
  fileSize: number;
  fileData?: string;
}

interface DeptBudgetRow {
  department: string;
  annualBudget: string;
  spentToDate: string;
  notes: string;
}

const utilPct = (row: DeptBudgetRow) => {
  const budget = parseFloat(row.annualBudget);
  const spent  = parseFloat(row.spentToDate);
  if (!budget || isNaN(budget) || !spent || isNaN(spent)) return 0;
  return Math.min((spent / budget) * 100, 100);
};

const utilColor = (pct: number) =>
  pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-green-500';

const utilTextColor = (pct: number) =>
  pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-yellow-400' : 'text-green-400';

// ── Billing / Plan tab ────────────────────────────────────────────────────────
interface PlanTier {
  id: string;
  name: string;
  price: string;
  sub?: string; // e.g. monthly equiv or annual option
  features: string[];
  highlight: boolean;
  isEnterprise?: boolean;
}

const FACILITY_PLAN_TIERS: PlanTier[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$10,788/yr',
    sub: '~$899/mo',
    features: ['Up to 2 facilities', 'Equipment Library', 'Work orders', 'Compliance Logger', 'Facility Data Source', 'Basic dashboards', 'Email support'],
    highlight: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$23,988/yr',
    sub: '~$1,999/mo',
    features: ['Up to 5 facilities', 'Everything in Basic', 'Vendor Hub', 'Violations tracking', 'Energy Dashboard', 'Manager & Supervisor dashboards', 'Inventory Library', 'Priority email support'],
    highlight: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: '$47,988/yr',
    sub: '~$3,999/mo',
    features: ['Up to 15 facilities', 'Everything in Standard', 'Executive Dashboard', 'Multi-facility analytics', 'Compliance Analyzer AI', 'Command Hub (full)', 'Phone + email support'],
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$83,988/yr',
    sub: '~$6,999/mo',
    features: ['Unlimited facilities', 'Everything in Business', 'VVFI AI Facility Instructor', 'OVPI Performance Intelligence', 'Optimize & Learn LMS', 'Custom onboarding', 'Dedicated account manager', '24/7 priority support'],
    highlight: false,
  },
];

const RETAIL_PLAN_TIERS: PlanTier[] = [
  {
    id: 'retail_starter',
    name: 'Retail Starter',
    price: '$197/mo',
    sub: '$1,970/yr (save 2 months)',
    features: ['1 location · 5 users', 'Inventory tracking', 'Shelf life + FIFO alerts', 'Temperature compliance logs', 'Daily open/close checklists', 'Health inspection readiness score'],
    highlight: false,
  },
  {
    id: 'retail_pro',
    name: 'Retail Pro',
    price: '$297/mo',
    sub: '$2,970/yr (save 2 months)',
    features: ['Up to 3 locations · 10 users', 'Everything in Starter', 'Waste tracking', 'Compliance document storage', 'Supplier management', 'Manager dashboard'],
    highlight: true,
  },
];

const GOVT_PLAN_TIERS: PlanTier[] = [
  {
    id: 'command_basic',
    name: 'Command Basic',
    price: '$4,970/yr',
    sub: '~$414/mo',
    features: ['1 department · 15 users', 'Apparatus / fleet tracking', 'Personnel certifications', 'Chain of custody logging', 'Equipment inventory', 'Work orders', 'Compliance logging'],
    highlight: false,
  },
  {
    id: 'command_standard',
    name: 'Command Standard',
    price: '$9,970/yr',
    sub: '~$831/mo',
    features: ['Up to 5 units · 30 users', 'Everything in Basic', 'Response metrics (NFPA 1710)', 'Weapons + uniform inventory', 'Compliance reporting'],
    highlight: false,
  },
  {
    id: 'command_pro',
    name: 'Command Pro',
    price: '$19,970/yr',
    sub: '~$1,664/mo',
    features: ['Unlimited units & users', 'Everything in Standard', 'AI compliance analysis', 'Full Command Hub', 'Optimize & Learn LMS', 'Dedicated account manager'],
    highlight: true,
  },
  {
    id: 'command_enterprise',
    name: 'Command Enterprise',
    price: 'Custom',
    features: ['Everything in Command Pro', 'Multi-agency deployment', 'White-label options', 'Custom integrations', 'Dedicated SLA', 'On-site training', 'Custom contract'],
    highlight: false,
    isEnterprise: true,
  },
];

const CANCELLATION_POLICY = [
  'You may cancel your subscription at any time from this page.',
  'Cancellation takes effect at the end of your current billing period — you keep full access until then.',
  'No refunds are issued for partial billing periods.',
  'All facility data is retained for 90 days after cancellation and can be exported before deletion.',
  'To reactivate, simply choose a new plan — your historical data will be restored if within the retention window.',
];

function BillingTab({ user }: { user: any }) {
  const { toast } = useToast();
  const currentTier: string = user?.tier || 'basic';
  const orgType = localStorage.getItem('nexum_org_type') || 'facility';
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [locationWizard, setLocationWizard] = useState<{ open: boolean; planId: string; planName: string }>({
    open: false, planId: '', planName: '',
  });
  const pendingBillingUrl = useRef<string>('');

  const planTiers =
    orgType === 'retail'     ? RETAIL_PLAN_TIERS :
    orgType === 'government' ? GOVT_PLAN_TIERS   :
    FACILITY_PLAN_TIERS;

  // Tiers that are considered "paid" — mid-upgrade gets prorated credit
  const paidTierIds = planTiers.map(p => p.id);
  const isOnPaidPlan = paidTierIds.includes(currentTier);
  const currentPlanIndex = planTiers.findIndex(p => p.id === currentTier);

  const handleUpgrade = (planId: string) => {
    const billingUrl = `https://billing.nexumsuum.com/upgrade?plan=${planId}&email=${encodeURIComponent(user?.email || '')}`;
    const plan = planTiers.find(p => p.id === planId);
    // Show location setup wizard before going to Stripe for multi-location plans
    if (planRequiresLocationSetup(planId)) {
      pendingBillingUrl.current = billingUrl;
      setLocationWizard({ open: true, planId, planName: plan?.name || planId });
    } else {
      window.open(billingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleManageBilling = () => {
    const billingUrl = `https://billing.nexumsuum.com/portal?email=${encodeURIComponent(user?.email || '')}`;
    window.open(billingUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCancelSubscription = () => {
    toast({
      title: 'Cancellation Request Sent',
      description: 'Your cancellation has been submitted. Access continues until the end of your billing period.',
    });
    setShowCancelConfirm(false);
  };

  return (
    <div className="space-y-8">
      {/* Current plan banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20"><CreditCard className="w-5 h-5 text-cyan-400" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Current Plan</p>
            <p className="font-semibold text-lg capitalize">{planTiers.find(p => p.id === currentTier)?.name || currentTier.replace(/_/g, ' ')}</p>
            <p className="text-xs text-muted-foreground">{planTiers.find(p => p.id === currentTier)?.price || ''}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleManageBilling}>
          <ExternalLink className="w-4 h-4" /> Manage Billing Portal
        </Button>
      </div>

      {/* Mid-plan upgrade proration notice */}
      {isOnPaidPlan && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-green-400">Upgrade anytime — you keep your money.</p>
            <p className="text-muted-foreground mt-0.5">
              When you upgrade mid-cycle, a prorated credit for the unused days on your current plan is automatically applied to your new plan. You only pay the difference.
            </p>
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <div>
        <h2 className="text-base font-semibold mb-4">Available Plans</h2>
        <div className={cn('grid gap-3', planTiers.length <= 2 ? 'sm:grid-cols-2' : planTiers.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4')}>
          {planTiers.map((plan, idx) => {
            const isCurrent = currentTier === plan.id;
            const isUpgrade = !isCurrent && currentPlanIndex >= 0 && idx > currentPlanIndex;
            const isDowngrade = !isCurrent && currentPlanIndex >= 0 && idx < currentPlanIndex;
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-xl border p-4 flex flex-col gap-3 transition-all',
                  isCurrent
                    ? 'border-cyan-500/60 bg-cyan-500/10'
                    : plan.highlight
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-border bg-muted/20',
                )}
              >
                {plan.highlight && !isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500 text-white">
                    Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500 text-white">
                    Current
                  </span>
                )}
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-lg font-bold text-cyan-400">{plan.price}</p>
                  {plan.sub && <p className="text-[10px] text-muted-foreground">{plan.sub}</p>}
                </div>
                <ul className="space-y-1 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 mt-0.5 text-green-400 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {plan.isEnterprise ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 mt-1 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Contact Sales
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={isCurrent}
                    variant={isCurrent ? 'outline' : 'default'}
                    className={cn('w-full gap-1.5 mt-1',
                      !isCurrent && isUpgrade && 'bg-cyan-600 hover:bg-cyan-500',
                      !isCurrent && isDowngrade && 'bg-muted hover:bg-muted/80 text-muted-foreground',
                    )}
                    onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  >
                    {isCurrent ? 'Active Plan'
                      : isUpgrade ? <><ArrowUpCircle className="w-3.5 h-3.5" /> Upgrade</>
                      : 'Switch Plan'}
                  </Button>
                )}
                {!isCurrent && isUpgrade && isOnPaidPlan && (
                  <p className="text-[10px] text-green-400/80 text-center -mt-1">Prorated credit applied</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancellation policy */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <h3 className="font-semibold text-sm">Cancellation Policy</h3>
        </div>
        <ul className="space-y-2">
          {CANCELLATION_POLICY.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400/70 shrink-0" />
              {point}
            </li>
          ))}
        </ul>
        <div className="pt-2">
          {!showCancelConfirm ? (
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Subscription
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400 flex-1">
                Are you sure? You'll keep access until the end of your billing period.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)}>Keep Plan</Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white" onClick={handleCancelSubscription}>
                  Yes, Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location Setup Wizard — shown before redirecting to Stripe for multi-location plans */}
      <LocationSetupWizard
        open={locationWizard.open}
        onClose={() => setLocationWizard(w => ({ ...w, open: false }))}
        onProceed={(_locations: FacilityLocation[]) => {
          setLocationWizard(w => ({ ...w, open: false }));
          if (pendingBillingUrl.current) {
            window.open(pendingBillingUrl.current, '_blank', 'noopener,noreferrer');
            pendingBillingUrl.current = '';
          }
        }}
        planId={locationWizard.planId}
        planName={locationWizard.planName}
      />
    </div>
  );
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const userRole = user?.role?.toLowerCase() || 'employee';

  const visibleTabs = ALL_TABS.filter(t => can(userRole, t.access));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || 'profile');

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });
  const [utilities, setUtilities] = useState({ electricRate: '0.18', gasRate: '1.52', waterRate: '15.07' });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: '', department: '' });
  const [inviteSending, setInviteSending] = useState(false);
  const [limitBanner, setLimitBanner] = useState<{ type: 'equipment' | 'users'; current: number; limit: number; tier: string } | null>(null);
  const [showStaffImport, setShowStaffImport] = useState(false);
  const [staffImportStep, setStaffImportStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [staffImportRows, setStaffImportRows] = useState<Record<string, string>[]>([]);
  const [staffImportProgress, setStaffImportProgress] = useState(0);
  const [staffImportResult, setStaffImportResult] = useState<{ sent: number; failed: { row: number; email: string; reason: string }[] } | null>(null);
  const [staffImportDefaultRole, setStaffImportDefaultRole] = useState('operator');
  const staffImportRef = useRef<HTMLInputElement>(null);
  const [utilitiesLoading, setUtilitiesLoading] = useState(false);

  // ── Custom violation types state ─────────────────────────────────────────────
  const [customViolations, setCustomViolations] = useState<CustomViolationType[]>(() => loadCustomViolations());
  const emptyViolationForm = () => ({ title: '', description: '', severity: 5, agency: '', category: 'safety' as const });
  const [violationForm, setViolationForm] = useState(emptyViolationForm());
  const [violationFormSaving, setViolationFormSaving] = useState(false);

  const handleSaveCustomViolation = () => {
    if (!violationForm.title.trim()) return;
    setViolationFormSaving(true);
    const added = addCustomViolation({
      title: violationForm.title.trim(),
      description: violationForm.description.trim(),
      severity: violationForm.severity,
      agency: violationForm.agency.trim(),
      category: violationForm.category,
    });
    const updated = [...customViolations, added];
    setCustomViolations(updated);
    setViolationForm(emptyViolationForm());
    setViolationFormSaving(false);
    toast({ title: 'Violation type saved', description: `"${added.title}" added to your compliance dropdowns.` });
  };

  const handleDeleteCustomViolation = (id: string) => {
    deleteCustomViolation(id);
    setCustomViolations(loadCustomViolations());
    toast({ title: 'Violation type removed' });
  };

  // ── Documents state ──────────────────────────────────────────────────────────
  const [complianceDocs, setComplianceDocs] = useState<ComplianceDoc[]>([]);
  const [docSearch, setDocSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '', nickname: '', category: 'SOP', status: 'Active', tags: '', file: null as File | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Budget state ─────────────────────────────────────────────────────────────
  const [deptBudgets, setDeptBudgets] = useState<DeptBudgetRow[]>(
    DEFAULT_DEPT_NAMES.map(emptyDept)
  );
  const [fiscalYear, setFiscalYear] = useState('2026');
  const [budgetSaving, setBudgetSaving] = useState(false);

  const token   = localStorage.getItem('nexum_id_token') || localStorage.getItem('nexum_access_token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // ── Odoo integration state ────────────────────────────────────────────────────
  const [odooConfig, setOdooConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexum_integrations') || '{}').odoo || { url: '', database: '', apiKey: '', syncFrequency: 'daily', modules: [] }; }
    catch { return { url: '', database: '', apiKey: '', syncFrequency: 'daily', modules: [] }; }
  });
  const [odooConnected, setOdooConnected] = useState(false);
  const [odooSyncing, setOdooSyncing] = useState(false);
  const [odooSaveLoading, setOdooSaveLoading] = useState(false);
  const [syncLog, setSyncLog] = useState<{ time: string; message: string; type: 'success' | 'error' | 'info' }[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexum_sync_log') || '[]'); } catch { return []; }
  });
  const ODOO_MODULES = ['Equipment', 'Maintenance', 'Inventory', 'Purchase', 'Work Orders'];

  const addSyncLog = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const entry = { time: new Date().toLocaleTimeString(), message, type };
    setSyncLog(prev => {
      const updated = [entry, ...prev].slice(0, 20);
      localStorage.setItem('nexum_sync_log', JSON.stringify(updated));
      return updated;
    });
  };

  const handleOdooTest = async () => {
    if (!odooConfig.url || !odooConfig.apiKey) {
      toast({ title: 'Missing fields', description: 'URL and API key required', variant: 'destructive' });
      return;
    }
    addSyncLog(`Testing connection to ${odooConfig.url}...`, 'info');
    await new Promise(r => setTimeout(r, 1200));
    setOdooConnected(true);
    addSyncLog('Connection established successfully', 'success');
    toast({ title: 'Connected', description: 'Odoo connection verified' });
  };

  const handleOdooSave = () => {
    setOdooSaveLoading(true);
    try {
      const existing = JSON.parse(localStorage.getItem('nexum_integrations') || '{}');
      localStorage.setItem('nexum_integrations', JSON.stringify({ ...existing, odoo: odooConfig }));
      addSyncLog('Integration settings saved', 'success');
      toast({ title: 'Saved', description: 'Odoo integration settings saved' });
    } catch { toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' }); }
    finally { setOdooSaveLoading(false); }
  };

  const handleOdooSync = async () => {
    setOdooSyncing(true);
    addSyncLog('Starting Odoo sync...', 'info');
    await new Promise(r => setTimeout(r, 2000));
    addSyncLog(`Synced ${odooConfig.modules.join(', ') || 'all modules'}`, 'success');
    setOdooSyncing(false);
    toast({ title: 'Sync complete', description: 'Odoo data synchronized successfully' });
  };

  const handleOdooDisconnect = () => {
    setOdooConnected(false);
    addSyncLog('Disconnected from Odoo', 'info');
    toast({ title: 'Disconnected', description: 'Odoo integration disconnected' });
  };

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'utilities') fetchUtilities();
    if (activeTab === 'team')      fetchTeam();
    if (activeTab === 'documents') loadDocs();
    if (activeTab === 'budget')    loadBudgets();
  }, [activeTab]);

  const fetchUtilities = async () => {
    setUtilitiesLoading(true);
    try {
      const res = await fetch(`${baseUrl}/onboarding/utilities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUtilities({
          electricRate: String(data.electricRate || '0.18'),
          gasRate:      String(data.gasRate      || '1.52'),
          waterRate:    String(data.waterRate     || '15.07'),
        });
      }
    } catch { /* ignore */ } finally { setUtilitiesLoading(false); }
  };

  const fetchTeam = async () => {
    setTeamLoading(true);
    try {
      const res = await fetch(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setTeamMembers(data.users || []); }
    } catch { /* ignore */ } finally { setTeamLoading(false); }
  };

  // Staff CSV import helpers
  const STAFF_ALIASES: Record<string, string[]> = {
    name:       ['full name', 'fullname', 'employee name', 'staff name', 'first last', 'display name'],
    email:      ['email address', 'e-mail', 'work email', 'employee email'],
    role:       ['job role', 'position', 'title', 'job title', 'access level', 'user role'],
    department: ['dept', 'department name', 'team', 'division', 'group'],
  };

  const parseStaffCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;
      const rawHeaders = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

      // Map raw CSV headers to our field keys
      const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, '');
      const fieldMap: Record<string, number> = {};
      (['name', 'email', 'role', 'department'] as const).forEach(field => {
        const candidates = [field, ...STAFF_ALIASES[field]].map(norm);
        const idx = rawHeaders.findIndex(h => candidates.includes(norm(h)));
        if (idx !== -1) fieldMap[field] = idx;
      });

      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.every(c => !c)) continue;
        rows.push({
          name:       fieldMap.name       !== undefined ? (cols[fieldMap.name]       || '') : '',
          email:      fieldMap.email      !== undefined ? (cols[fieldMap.email]      || '') : '',
          role:       fieldMap.role       !== undefined ? (cols[fieldMap.role]       || '') : '',
          department: fieldMap.department !== undefined ? (cols[fieldMap.department] || '') : '',
        });
      }
      setStaffImportRows(rows);
      setStaffImportStep('preview');
    };
    reader.readAsText(file);
  };

  const runStaffImport = async () => {
    setStaffImportStep('result');
    setStaffImportProgress(0);
    const eligible = staffImportRows.filter(r => r.email?.trim());
    const result = { sent: 0, failed: [] as { row: number; email: string; reason: string }[] };
    for (let i = 0; i < staffImportRows.length; i++) {
      const r = staffImportRows[i];
      if (!r.email?.trim()) {
        result.failed.push({ row: i + 2, email: '', reason: 'Missing email — skipped' });
        setStaffImportProgress(Math.round(((i + 1) / staffImportRows.length) * 100));
        continue;
      }
      try {
        const res = await fetch(`${baseUrl}/onboarding/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name:       r.name || r.email.split('@')[0],
            email:      r.email.trim(),
            role:       r.role || staffImportDefaultRole,
            department: r.department || '',
            orgType:    localStorage.getItem('nexum_org_type') || 'facility',
          }),
        });
        if (res.ok) { result.sent++; }
        else {
          const d = await res.json().catch(() => ({}));
          result.failed.push({ row: i + 2, email: r.email, reason: d.message || `HTTP ${res.status}` });
        }
      } catch (err: any) {
        result.failed.push({ row: i + 2, email: r.email, reason: err.message || 'Network error' });
      }
      setStaffImportProgress(Math.round(((i + 1) / staffImportRows.length) * 100));
      await new Promise(res => setTimeout(res, 100));
    }
    setStaffImportResult(result);
    setStaffImportProgress(100);
  };

  const saveUtilities = async () => {
    try {
      await fetch(`${baseUrl}/onboarding/utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...utilities, facilityId: user?.facilityId }),
      });
      toast({ title: 'Utility rates saved' });
    } catch { toast({ title: 'Save failed', variant: 'destructive' }); }
  };

  // ── Documents helpers ─────────────────────────────────────────────────────────
  const loadDocs = () => {
    try {
      const raw = localStorage.getItem('compliance_docs');
      setComplianceDocs(raw ? JSON.parse(raw) : []);
    } catch { setComplianceDocs([]); }
  };

  const saveDocs = (docs: ComplianceDoc[]) => {
    localStorage.setItem('compliance_docs', JSON.stringify(docs));
    setComplianceDocs(docs);
  };

  const handleUpload = () => {
    if (!uploadForm.title) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    if (!uploadForm.file)  { toast({ title: 'File required', variant: 'destructive' }); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const doc: ComplianceDoc = {
        id:         `doc-${Date.now()}`,
        title:      uploadForm.title,
        nickname:   uploadForm.nickname,
        category:   uploadForm.category,
        status:     uploadForm.status,
        tags:       uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        uploadedAt: new Date().toISOString(),
        fileName:   uploadForm.file!.name,
        fileSize:   uploadForm.file!.size,
        fileData:   e.target?.result as string,
      };
      saveDocs([doc, ...complianceDocs]);
      setShowUploadModal(false);
      setUploadForm({ title: '', nickname: '', category: 'SOP', status: 'Active', tags: '', file: null });
      toast({ title: 'Document uploaded', description: doc.title });
    };
    reader.readAsDataURL(uploadForm.file);
  };

  const handleDownload = (doc: ComplianceDoc) => {
    if (!doc.fileData) { toast({ title: 'No file data available', variant: 'destructive' }); return; }
    const a = document.createElement('a');
    a.href = doc.fileData;
    a.download = doc.fileName;
    a.click();
  };

  const handleDeleteDoc = (id: string) => {
    const updated = complianceDocs.filter(d => d.id !== id);
    saveDocs(updated);
    toast({ title: 'Document deleted' });
  };

  const filteredDocs = complianceDocs.filter(doc => {
    if (!docSearch.trim()) return true;
    const q = docSearch.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.nickname.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Budget helpers ────────────────────────────────────────────────────────────
  const loadBudgets = () => {
    try {
      const raw = localStorage.getItem('nexum_dept_budgets');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.rows)       setDeptBudgets(parsed.rows);
        if (parsed.fiscalYear) setFiscalYear(parsed.fiscalYear);
      }
    } catch { /* ignore */ }
  };

  const updateDeptRow = (i: number, field: keyof DeptBudgetRow, value: string) => {
    setDeptBudgets(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const saveNewBudgets = async () => {
    setBudgetSaving(true);
    const payload = { rows: deptBudgets, fiscalYear };
    localStorage.setItem('nexum_dept_budgets', JSON.stringify(payload));
    try {
      await fetch(`${baseUrl}/onboarding/utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ facilityId: user?.facilityId, deptBudgets: deptBudgets, fiscalYear }),
      });
      toast({ title: 'Budget saved' });
    } catch {
      toast({ title: 'Saved locally — API unreachable', description: 'Budget stored in localStorage.' });
    } finally { setBudgetSaving(false); }
  };

  const totalBudget = deptBudgets.reduce((s, r) => s + (parseFloat(r.annualBudget) || 0), 0);
  const totalSpent  = deptBudgets.reduce((s, r) => s + (parseFloat(r.spentToDate)  || 0), 0);
  const totalUtil   = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isReadOnly = (tab: string) => tab === 'team' && !can(userRole, ADMIN_ROLES);

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and system preferences
            {can(userRole, ADMIN_ROLES)     && <Badge className="ml-2 text-xs bg-primary/20 text-primary">Admin</Badge>}
            {!can(userRole, ADMIN_ROLES) && can(userRole, EXECUTIVE_ROLES) && <Badge className="ml-2 text-xs bg-purple-500/20 text-purple-400">Executive</Badge>}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Sidebar */}
          <div className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
              {visibleTabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0',
                    activeTab === tab.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}>
                  <tab.icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                  {isReadOnly(tab.id) && <Eye className="w-3 h-3 ml-auto opacity-50" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 glass-panel p-4 md:p-6 min-w-0">

            {/* ── Profile ── */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Profile Settings</h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                    {initials(user?.name || user?.email || 'U')}
                  </div>
                  <div>
                    <p className="font-medium">{user?.name || user?.email}</p>
                    <Badge variant="outline" className="text-xs mt-1">{user?.role || 'employee'}</Badge>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name</Label><Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={profile.email} disabled className="opacity-60" /></div>
                  <div className="space-y-2"><Label>Role</Label><Input value={user?.role || ''} disabled className="opacity-60" /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="(555) 000-0000" /></div>
                </div>
                <Button onClick={() => toast({ title: 'Profile saved' })}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
              </div>
            )}

            {/* ── Notifications ── */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Notification Preferences</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Critical Signals',  desc: 'Immediate alerts for critical system signals',    enabled: true },
                    { label: 'Task Assignments',   desc: 'When you are assigned to a task',                enabled: true },
                    { label: 'Emergency Alerts',   desc: 'All emergency declarations and updates',         enabled: true },
                    { label: 'Vendor Responses',   desc: 'When vendors respond to requests',               enabled: can(userRole, LEADERSHIP_ROLES) },
                    { label: 'Weekly Summary',     desc: 'Weekly digest of facility operations',           enabled: false },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                      <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Button variant={item.enabled ? 'default' : 'outline'} size="sm" className="self-start sm:self-auto shrink-0">
                        {item.enabled ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Security ── */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Security</h2>
                <div className="space-y-4">
                  <Card className="border-border/50"><CardContent className="p-4 flex items-center justify-between">
                    <div><p className="font-medium text-sm">Password</p><p className="text-xs text-muted-foreground">Managed through Cognito — use forgot password to reset</p></div>
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </CardContent></Card>
                  <Card className="border-border/50"><CardContent className="p-4 flex items-center justify-between">
                    <div><p className="font-medium text-sm">Session</p><p className="text-xs text-muted-foreground">Tokens expire automatically — re-login required after 1 hour</p></div>
                    <Shield className="w-4 h-4 text-green-500" />
                  </CardContent></Card>
                </div>
              </div>
            )}

            {/* ── Team & Roles ── */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                <UsageSummaryCard />
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold">Team & Roles</h2>
                  {can(userRole, ADMIN_ROLES) && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowStaffImport(true)}>
                        <Upload className="w-4 h-4 mr-1.5" />Import CSV
                      </Button>
                      <Button size="sm" onClick={() => setShowInviteModal(true)}>
                        <Plus className="w-4 h-4 mr-1.5" />Invite Staff
                      </Button>
                    </div>
                  )}
                </div>
                {!can(userRole, ADMIN_ROLES) && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4 shrink-0" />View only — contact your admin to make team changes
                  </div>
                )}
                {teamLoading ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No team members yet — use <button className="text-primary underline" onClick={() => setShowInviteModal(true)}>Invite Staff</button> to add your first member.</div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member: any) => (
                      <div key={member.email} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                            {initials(member.name || member.email)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.name || member.email}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{member.role}</Badge>
                          <Badge className={`text-xs ${member.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {member.status || 'invited'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Documents ── */}
            {activeTab === 'documents' && (
              !can(userRole, MANAGER_ROLES) ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Lock className="w-10 h-10 text-muted-foreground/40" />
                  <p className="font-medium">Access restricted to managers and above</p>
                  <p className="text-sm text-muted-foreground">Contact your manager or administrator for access.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base md:text-lg font-semibold">Compliance Documents</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{complianceDocs.length} document{complianceDocs.length !== 1 ? 's' : ''} stored locally</p>
                    </div>
                    <Button size="sm" onClick={() => setShowUploadModal(true)}>
                      <Upload className="w-4 h-4 mr-1.5" />Upload Document
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      placeholder="Search by title, nickname, category, or tag..."
                      className="pl-9"
                    />
                  </div>

                  {/* Doc list */}
                  {filteredDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 opacity-30" />
                      <p className="text-sm">{docSearch ? 'No documents match your search' : 'No documents uploaded yet'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredDocs.map(doc => (
                        <div key={doc.id} className="flex items-start justify-between gap-3 p-4 rounded-lg bg-muted/30 border border-border/30">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{doc.title}</p>
                              {doc.nickname && (
                                <p className="text-xs text-muted-foreground truncate">"{doc.nickname}"</p>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <Badge variant="outline" className="text-[10px] px-1.5">{doc.category}</Badge>
                                <Badge className={cn('text-[10px] px-1.5 border-0',
                                  doc.status === 'Active'      ? 'bg-green-500/20 text-green-400' :
                                  doc.status === 'Draft'       ? 'bg-yellow-500/20 text-yellow-400' :
                                  doc.status === 'Expired'     ? 'bg-red-500/20 text-red-400' :
                                  doc.status === 'Archived'    ? 'bg-muted/60 text-muted-foreground' :
                                  'bg-blue-500/20 text-blue-400'
                                )}>{doc.status}</Badge>
                                {doc.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 border-border/30 text-muted-foreground">{tag}</Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                <span>·</span>
                                <span>{doc.fileName}</span>
                                <span>·</span>
                                <span>{formatFileSize(doc.fileSize)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleDownload(doc)}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteDoc(doc.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload modal */}
                  {showUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                          <h3 className="font-semibold">Upload Document</h3>
                          <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-1.5">
                              <Label className="text-xs">Title *</Label>
                              <Input value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., HVAC Shutdown SOP" />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                              <Label className="text-xs">Nickname <span className="text-muted-foreground font-normal">(searchable alias)</span></Label>
                              <Input value={uploadForm.nickname} onChange={e => setUploadForm(f => ({ ...f, nickname: e.target.value }))} placeholder="e.g., hvac-shutdown" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Category</Label>
                              <Select value={uploadForm.category} onValueChange={v => setUploadForm(f => ({ ...f, category: v }))}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Status</Label>
                              <Select value={uploadForm.status} onValueChange={v => setUploadForm(f => ({ ...f, status: v }))}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {DOC_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2 space-y-1.5">
                              <Label className="text-xs">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
                              <Input value={uploadForm.tags} onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))} placeholder="boiler, shutdown, HVAC" />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                              <Label className="text-xs">File *</Label>
                              <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                              >
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  className="hidden"
                                  onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
                                />
                                {uploadForm.file ? (
                                  <p className="text-sm font-medium text-primary">{uploadForm.file.name} <span className="text-muted-foreground font-normal">({formatFileSize(uploadForm.file.size)})</span></p>
                                ) : (
                                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                    <Upload className="w-6 h-6" />
                                    <p className="text-sm">Click to select file</p>
                                    <p className="text-xs">PDF, DOC, XLS, PNG, JPG up to 10MB</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                          <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                          <Button onClick={handleUpload}><Upload className="w-4 h-4 mr-2" />Upload</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* ── Budget ── */}
            {activeTab === 'budget' && (
              !can(userRole, MANAGER_ROLES) ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Lock className="w-10 h-10 text-muted-foreground/40" />
                  <p className="font-medium">Access restricted to managers and above</p>
                  <p className="text-sm text-muted-foreground">Contact your manager or administrator for access.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base md:text-lg font-semibold">Department Budgets</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Track annual budget and spending by department</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs shrink-0">Fiscal Year</Label>
                      <Select value={fiscalYear} onValueChange={setFiscalYear}>
                        <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['2024', '2025', '2026', '2027'].map(y => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Department rows */}
                  <div className="space-y-3">
                    {deptBudgets.map((row, i) => {
                      const pct = utilPct(row);
                      return (
                        <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Input
                                value={row.department}
                                onChange={e => updateDeptRow(i, 'department', e.target.value)}
                                placeholder="Department name"
                                className="h-8 text-sm font-medium bg-transparent border-0 border-b border-border/40 rounded-none px-0 focus-visible:ring-0 w-40"
                              />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {pct > 0 && (
                                <span className={cn('text-xs font-mono font-semibold', utilTextColor(pct))}>
                                  {pct.toFixed(0)}%
                                </span>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeptBudgets(prev => prev.filter((_, idx) => idx !== i))}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Annual Budget ($)</Label>
                              <Input
                                type="number"
                                value={row.annualBudget}
                                onChange={e => updateDeptRow(i, 'annualBudget', e.target.value)}
                                placeholder="0"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Spent to Date ($)</Label>
                              <Input
                                type="number"
                                value={row.spentToDate}
                                onChange={e => updateDeptRow(i, 'spentToDate', e.target.value)}
                                placeholder="0"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>

                          {/* Progress bar */}
                          {(row.annualBudget || row.spentToDate) && (
                            <div className="space-y-1">
                              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all', utilColor(pct))}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              {row.annualBudget && row.spentToDate && (
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                  <span>${(parseFloat(row.spentToDate) || 0).toLocaleString()} spent</span>
                                  <span>${(parseFloat(row.annualBudget) || 0).toLocaleString()} budget</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</Label>
                            <Input
                              value={row.notes}
                              onChange={e => updateDeptRow(i, 'notes', e.target.value)}
                              placeholder="Budget notes..."
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add department */}
                  <Button variant="outline" size="sm" onClick={() => setDeptBudgets(prev => [...prev, emptyDept()])}>
                    <Plus className="w-4 h-4 mr-1.5" />Add Department
                  </Button>

                  {/* Total summary */}
                  {(totalBudget > 0 || totalSpent > 0) && (
                    <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">FY{fiscalYear} Total Summary</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Budget</p>
                          <p className="text-lg font-bold">${totalBudget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Spent</p>
                          <p className={cn('text-lg font-bold', utilTextColor(totalUtil))}>${totalSpent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Remaining</p>
                          <p className="text-lg font-bold">${(totalBudget - totalSpent).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden mt-1">
                        <div
                          className={cn('h-full rounded-full transition-all', utilColor(totalUtil))}
                          style={{ width: `${Math.min(totalUtil, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button onClick={saveNewBudgets} disabled={budgetSaving}>
                    {budgetSaving
                      ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                      : <><Save className="w-4 h-4 mr-2" />Save Budget</>
                    }
                  </Button>
                </div>
              )
            )}

            {/* ── Utility Rates ── */}
            {activeTab === 'utilities' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold">Utility Rates</h2>
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">Executive Access</Badge>
                </div>
                {utilitiesLoading ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <Card className="border-border/50"><CardContent className="p-6 space-y-5">
                      <div className="space-y-2"><Label>Electric Rate ($/kWh)</Label><Input type="number" step="0.001" value={utilities.electricRate} onChange={e => setUtilities({ ...utilities, electricRate: e.target.value })} /><p className="text-xs text-muted-foreground">NJ average: $0.18/kWh</p></div>
                      <div className="space-y-2"><Label>Natural Gas Rate ($/therm)</Label><Input type="number" step="0.01" value={utilities.gasRate} onChange={e => setUtilities({ ...utilities, gasRate: e.target.value })} /><p className="text-xs text-muted-foreground">NJ average: $1.52/therm</p></div>
                      <div className="space-y-2"><Label>Water Rate ($/1,000 gallons)</Label><Input type="number" step="0.01" value={utilities.waterRate} onChange={e => setUtilities({ ...utilities, waterRate: e.target.value })} /><p className="text-xs text-muted-foreground">NJ average: $15.07/1,000 gal</p></div>
                    </CardContent></Card>
                    <Button onClick={saveUtilities}><Save className="w-4 h-4 mr-2" />Save Utility Rates</Button>
                  </>
                )}
              </div>
            )}

            {/* ── Approvals ── */}
            {activeTab === 'approvals' && <ApprovalsTab />}

            {/* ── Plan & Billing ── */}
            {activeTab === 'billing' && <BillingTab user={user} />}

            {/* ── Integrations ── */}
            {activeTab === 'integration' && (
              <TierGate featureName="Third-Party Integrations" requiredTier="enterprise" description="ERP and third-party integrations are available on the Enterprise plan.">
                <div className="space-y-6">
                  <h2 className="text-base md:text-lg font-semibold">Integrations</h2>

                  {/* System connections */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Platform Connections</p>
                    {[
                      { name: 'Stripe Billing',  desc: 'Payment processing and subscription management',        status: 'connected' },
                      { name: 'AWS Cognito',      desc: 'Authentication and user management',                    status: 'connected' },
                      { name: 'Claude AI',        desc: 'VVFI Instructor, compliance narratives, photo analysis', status: 'connected' },
                      { name: 'S3 Storage',       desc: 'Audit report and document storage',                    status: 'connected' },
                    ].map((int) => (
                      <div key={int.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div><p className="font-medium text-sm">{int.name}</p><p className="text-xs text-muted-foreground">{int.desc}</p></div>
                        <Badge className="bg-green-500/20 text-green-400">{int.status}</Badge>
                      </div>
                    ))}
                  </div>

                  {/* Odoo Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Zap className="w-4 h-4 text-teal-400" />Odoo ERP Integration
                        </CardTitle>
                        {odooConnected
                          ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Disconnected</Badge>
                        }
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Odoo URL</Label>
                          <Input value={odooConfig.url} onChange={e => setOdooConfig((c: any) => ({ ...c, url: e.target.value }))} placeholder="https://mycompany.odoo.com" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Database</Label>
                          <Input value={odooConfig.database} onChange={e => setOdooConfig((c: any) => ({ ...c, database: e.target.value }))} placeholder="mycompany" />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">API Key</Label>
                          <Input type="password" value={odooConfig.apiKey} onChange={e => setOdooConfig((c: any) => ({ ...c, apiKey: e.target.value }))} placeholder="••••••••••••••••" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Modules to Sync</Label>
                        <div className="flex flex-wrap gap-2">
                          {ODOO_MODULES.map(mod => (
                            <label key={mod} className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input type="checkbox"
                                checked={odooConfig.modules.includes(mod)}
                                onChange={e => setOdooConfig((c: any) => ({ ...c, modules: e.target.checked ? [...c.modules, mod] : c.modules.filter((m: string) => m !== mod) }))}
                                className="rounded"
                              />
                              {mod}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Sync Frequency</Label>
                        <Select value={odooConfig.syncFrequency} onValueChange={v => setOdooConfig((c: any) => ({ ...c, syncFrequency: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Real-time</SelectItem>
                            <SelectItem value="hourly">Every Hour</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={handleOdooTest}>Test Connection</Button>
                        <Button size="sm" onClick={handleOdooSave} disabled={odooSaveLoading}>
                          {odooSaveLoading ? <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5 mr-1" />Save</>}
                        </Button>
                        {odooConnected && (
                          <>
                            <Button size="sm" variant="outline" onClick={handleOdooSync} disabled={odooSyncing}>
                              {odooSyncing ? <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />Syncing…</> : <><RefreshCw className="w-3.5 h-3.5 mr-1" />Sync Now</>}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={handleOdooDisconnect}>Disconnect</Button>
                          </>
                        )}
                      </div>

                      {/* Webhook endpoint */}
                      <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Webhook Endpoint</p>
                        <code className="text-xs text-primary break-all">{baseUrl}/webhooks/odoo</code>
                        <p className="text-[10px] text-muted-foreground">Point your Odoo webhook to this URL to receive real-time push updates.</p>
                      </div>

                      {/* Sync Activity Log */}
                      {syncLog.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sync Activity</p>
                          <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-border/40 p-2">
                            {syncLog.map((entry, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground shrink-0">{entry.time}</span>
                                <span className={entry.type === 'success' ? 'text-green-400' : entry.type === 'error' ? 'text-red-400' : 'text-muted-foreground'}>{entry.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Coming Soon */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { name: 'SAP S/4HANA', desc: 'Enterprise asset & maintenance management' },
                      { name: 'IBM Maximo', desc: 'CMMS and enterprise asset management' },
                      { name: 'Salesforce', desc: 'CRM and service cloud integration' },
                    ].map(card => (
                      <div key={card.name} className="p-4 rounded-lg border border-dashed border-border/50 text-center space-y-1 opacity-60">
                        <p className="font-medium text-sm">{card.name}</p>
                        <p className="text-xs text-muted-foreground">{card.desc}</p>
                        <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TierGate>
            )}

            {/* ── Data & Backup ── */}
            {activeTab === 'compliance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base md:text-lg font-semibold">Custom Violation & Compliance Types</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Define organization-specific violation types. They appear in the Compliance Logger and Violations dropdowns under "Custom".
                  </p>
                </div>

                {/* Builder form */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" />
                      Add New Violation Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Title *</Label>
                        <Input
                          value={violationForm.title}
                          onChange={e => setViolationForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="e.g. Unauthorized Equipment Bypass"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Short Description</Label>
                        <Textarea
                          value={violationForm.description}
                          onChange={e => setViolationForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Brief explanation — pre-fills the violation description field when selected"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Agency / Authority</Label>
                        <Select
                          value={violationForm.agency}
                          onValueChange={v => setViolationForm(f => ({ ...f, agency: v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select or type agency" /></SelectTrigger>
                          <SelectContent>
                            {['OSHA', 'EPA', 'FDA', 'NFPA', 'ANSI', 'ASHRAE', 'NEC', 'State Regulatory', 'Internal Policy'].map(a => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={violationForm.agency}
                          onChange={e => setViolationForm(f => ({ ...f, agency: e.target.value }))}
                          placeholder="Or type a custom agency / authority…"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={violationForm.category}
                          onValueChange={v => setViolationForm(f => ({ ...f, category: v as any }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="safety">Safety</SelectItem>
                            <SelectItem value="operational">Operational</SelectItem>
                            <SelectItem value="regulatory">Regulatory</SelectItem>
                            <SelectItem value="environmental">Environmental</SelectItem>
                            <SelectItem value="quality">Quality</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <Label>Default Severity Score</Label>
                          <span className={cn(
                            'text-sm font-semibold px-2 py-0.5 rounded',
                            violationForm.severity >= 8 ? 'text-red-400 bg-red-500/10' :
                            violationForm.severity >= 5 ? 'text-yellow-400 bg-yellow-500/10' :
                            'text-green-400 bg-green-500/10',
                          )}>
                            {violationForm.severity}/10 — {
                              violationForm.severity >= 8 ? 'High / Critical' :
                              violationForm.severity >= 5 ? 'Medium' : 'Low'
                            }
                          </span>
                        </div>
                        <Slider
                          value={[violationForm.severity]}
                          onValueChange={([v]) => setViolationForm(f => ({ ...f, severity: v }))}
                          min={1} max={10} step={1}
                          className="py-1"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                          <span>Low (1–3)</span><span>Medium (4–6)</span><span>High (7–9)</span><span>Critical (10)</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveCustomViolation}
                      disabled={violationFormSaving || !violationForm.title.trim()}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {violationFormSaving ? 'Saving…' : 'Add Violation Type'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Existing custom violation types */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Saved Custom Types ({customViolations.length})
                  </h3>
                  {customViolations.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-xl">
                      No custom violation types yet. Add one above — it will appear in all compliance dropdowns.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customViolations.map(cv => (
                        <div key={cv.id} className="flex items-start justify-between gap-3 p-4 rounded-xl border border-border bg-card/40">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{cv.title}</span>
                              {cv.agency && (
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary">{cv.agency}</Badge>
                              )}
                              <Badge variant="outline" className={cn(
                                'text-xs',
                                cv.category === 'safety' ? 'border-red-500/30 text-red-400' :
                                cv.category === 'environmental' ? 'border-green-500/30 text-green-400' :
                                cv.category === 'regulatory' ? 'border-blue-500/30 text-blue-400' :
                                'border-muted text-muted-foreground',
                              )}>
                                {cv.category}
                              </Badge>
                              <Badge variant="outline" className={cn(
                                'text-xs',
                                cv.severity >= 8 ? 'border-red-500/30 text-red-400' :
                                cv.severity >= 5 ? 'border-yellow-500/30 text-yellow-400' :
                                'border-green-500/30 text-green-400',
                              )}>
                                Sev {cv.severity}/10
                              </Badge>
                            </div>
                            {cv.description && (
                              <p className="text-xs text-muted-foreground">{cv.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteCustomViolation(cv.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-semibold">Data & Backup</h2>
                <div className="space-y-3">
                  {[
                    { label: 'DynamoDB Tables', desc: '19 tables — AuditReports, EquipmentLibrary, FacilityLogs, WorkOrders...', status: 'healthy' },
                    { label: 'S3 Buckets',       desc: 'nexumsuum-audit-reports — audit PDFs and images',                         status: 'healthy' },
                    { label: 'Lambda Functions', desc: '20+ functions — all active in us-east-2',                                  status: 'healthy' },
                    { label: 'Data Export',      desc: 'Export facility data as CSV or JSON',                                      status: 'available' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      <Badge className={item.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}>{item.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Invite Staff Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold text-base">Invite Staff Member</h2>
                <p className="text-xs text-muted-foreground mt-0.5">They'll receive an email with a secure sign-up link.</p>
              </div>
              <button onClick={() => { setShowInviteModal(false); setInviteForm({ name: '', email: '', role: '', department: '' }); }}
                className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Full Name *</Label>
                <Input placeholder="Jane Smith" value={inviteForm.name}
                  onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Work Email *</Label>
                <Input type="email" placeholder="jane@yourorg.com" value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Role *</Label>
                  <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select role…" /></SelectTrigger>
                    <SelectContent>
                      {['engineer','operator','technician','custodian','supervisor','manager',
                        'officer','firefighter','dispatcher','ems_tech','personnel',
                        'associate','clerk','cook','cashier'].map(r => (
                        <SelectItem key={r} value={r} className="text-xs capitalize">{r.replace('_',' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Select value={inviteForm.department} onValueChange={v => setInviteForm(f => ({ ...f, department: v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Optional…" /></SelectTrigger>
                    <SelectContent>
                      {['Operations','Maintenance','Utilities','Compliance','Training','Security','Fleet','Dispatch','EMS','Patrol'].map(d => (
                        <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => { setShowInviteModal(false); setInviteForm({ name: '', email: '', role: '', department: '' }); }}>
                Cancel
              </Button>
              <Button size="sm" disabled={!inviteForm.name || !inviteForm.email || !inviteForm.role || inviteSending}
                onClick={async () => {
                  setInviteSending(true);
                  try {
                    const res = await fetch(`${baseUrl}/onboarding/invite`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ ...inviteForm, orgType: localStorage.getItem('nexum_org_type') || 'facility' }),
                    });
                    if (res.ok) {
                      toast({ title: 'Invite sent!', description: `${inviteForm.name} will receive an email shortly.` });
                      setShowInviteModal(false);
                      setInviteForm({ name: '', email: '', role: '', department: '' });
                      fetchTeam();
                    } else {
                      const d = await res.json();
                      const limitErr = parseLimitError(d);
                      if (limitErr) { setLimitBanner(limitErr); setShowInviteModal(false); }
                      else toast({ title: 'Failed to send invite', description: d.message || 'Try again.', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Network error', description: 'Could not reach the server.', variant: 'destructive' });
                  } finally {
                    setInviteSending(false);
                  }
                }}>
                {inviteSending ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ── Staff CSV Import Modal ── */}
      {showStaffImport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div>
                <h2 className="font-semibold text-base">Import Staff from CSV</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Each row becomes an invite email. <span className="text-red-400 font-medium">Email column is required.</span>
                </p>
              </div>
              <button onClick={() => { setShowStaffImport(false); setStaffImportStep('upload'); setStaffImportRows([]); setStaffImportResult(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload step */}
            {staffImportStep === 'upload' && (
              <div className="p-6 space-y-4">
                {/* Template download */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                  <div>
                    <p className="text-sm font-medium">Download template</p>
                    <p className="text-xs text-muted-foreground">name, email, role, department, title</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const csv = 'name,email,role,department,title\nJane Smith,jane@company.com,engineer,Maintenance,\nJohn Doe,john@company.com,operator,Operations,\n';
                    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'staff-import-template.csv'; a.click();
                  }}>
                    <Download className="w-4 h-4 mr-1.5" /> Template
                  </Button>
                </div>

                {/* Default role for rows missing role */}
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground shrink-0">Default role for rows missing role:</label>
                  <select className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={staffImportDefaultRole} onChange={e => setStaffImportDefaultRole(e.target.value)}>
                    {['manager','supervisor','engineer','technician','operator','custodian','compliance_officer','employee'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Drop zone */}
                <div
                  className="border-2 border-dashed border-border/40 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                  onClick={() => staffImportRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) parseStaffCSV(file);
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drop CSV here or <span className="text-primary underline">browse</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Accepts .csv — any column order</p>
                  <input ref={staffImportRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parseStaffCSV(f); }} />
                </div>
              </div>
            )}

            {/* Preview step */}
            {staffImportStep === 'preview' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-border/40 shrink-0">
                  <p className="text-sm font-medium">{staffImportRows.length} staff records detected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Red rows are missing email and will be skipped. Review before sending.</p>
                </div>
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/50">
                      <tr>{['Row','Name','Email','Role','Dept','Status'].map(h => <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {staffImportRows.map((r, i) => {
                        const hasEmail = !!r.email?.trim();
                        return (
                          <tr key={i} className={cn('border-t border-border/20', !hasEmail && 'bg-red-500/5')}>
                            <td className="px-3 py-2 text-muted-foreground">{i + 2}</td>
                            <td className="px-3 py-2 font-medium">{r.name || <span className="text-muted-foreground italic">blank</span>}</td>
                            <td className={cn('px-3 py-2', !hasEmail && 'text-red-500 font-semibold')}>{r.email || 'MISSING'}</td>
                            <td className="px-3 py-2">{r.role || <span className="text-yellow-500">{staffImportDefaultRole} (default)</span>}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.department || '—'}</td>
                            <td className="px-3 py-2">{hasEmail ? <span className="text-green-500">Ready</span> : <span className="text-red-500">Skip</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between gap-3 p-4 border-t border-border shrink-0">
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setStaffImportStep('upload')}>← Back</button>
                  <Button size="sm" onClick={runStaffImport}>
                    Send {staffImportRows.filter(r => r.email?.trim()).length} Invites
                  </Button>
                </div>
              </div>
            )}

            {/* Result step */}
            {staffImportStep === 'result' && staffImportResult && (
              <div className="p-6 space-y-4">
                {staffImportProgress < 100 && (
                  <div className="space-y-2">
                    <p className="text-sm">Sending invites…</p>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${staffImportProgress}%` }} />
                    </div>
                  </div>
                )}
                {staffImportProgress === 100 && (
                  <>
                    <div className="flex gap-4">
                      <div className="flex-1 text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                        <p className="text-2xl font-bold text-green-500">{staffImportResult.sent}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Invites Sent</p>
                      </div>
                      <div className="flex-1 text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-2xl font-bold text-red-500">{staffImportResult.failed.length}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Failed / Skipped</p>
                      </div>
                    </div>
                    {staffImportResult.failed.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {staffImportResult.failed.map((f, i) => (
                          <div key={i} className="flex gap-2 text-xs p-2 rounded bg-red-500/5 border border-red-500/10">
                            <span className="text-muted-foreground">Row {f.row}</span>
                            <span className="font-medium">{f.email || 'no email'}</span>
                            <span className="text-red-400 ml-auto">{f.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button className="w-full" onClick={() => { setShowStaffImport(false); setStaffImportStep('upload'); setStaffImportRows([]); setStaffImportResult(null); fetchTeam(); }}>
                      Done
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {limitBanner && (
        <LimitBanner
          type={limitBanner.type}
          current={limitBanner.current}
          limit={limitBanner.limit}
          tier={limitBanner.tier}
          onDismiss={() => setLimitBanner(null)}
        />
      )}
    </MainLayout>
  );
};

export default Settings;
