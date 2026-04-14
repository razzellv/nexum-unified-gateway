import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  Building2, Package, MapPin, UserPlus, Key, Link2, Wifi, WifiOff,
  ShoppingCart, Copy, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ApprovalsTab } from '@/components/settings/ApprovalsTab';

const ADMIN_ROLES      = ['admin'];
const EXECUTIVE_ROLES  = ['admin', 'executive'];
const MANAGER_ROLES    = ['admin', 'executive', 'manager'];
const LEADERSHIP_ROLES = ['admin', 'executive', 'manager', 'supervisor'];
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
  { id: 'addons',        label: 'Locations & Modules', icon: Package, access: EXECUTIVE_ROLES },
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
const PLAN_TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$49/mo',
    features: ['Up to 5 users', 'Core facility monitoring', 'Work orders', 'Basic reporting'],
    highlight: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$149/mo',
    features: ['Up to 20 users', 'Everything in Basic', 'Compliance tracking', 'Vendor management', 'API access'],
    highlight: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: '$349/mo',
    features: ['Up to 75 users', 'Everything in Standard', 'Advanced analytics', 'Multi-building', 'Priority support'],
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$699/mo',
    features: ['Unlimited users', 'Everything in Business', 'Executive dashboards', 'Custom integrations', 'Dedicated CSM'],
    highlight: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: ['Everything in Premium', 'On-premise option', 'SLA guarantee', 'Custom contracts', 'White-label'],
    highlight: false,
  },
];

const CANCELLATION_POLICY = [
  'You may cancel your subscription at any time from this page.',
  'Cancellation takes effect at the end of your current billing period — you keep full access until then.',
  'No refunds are issued for partial billing periods.',
  'All facility data is retained for 90 days after cancellation and can be exported before deletion.',
  'To reactivate, simply choose a new plan — your historical data will be restored if within the retention window.',
];

// ── BMS / CMMS platform catalogue ────────────────────────────────────────────
const BMS_PLATFORMS = [
  { id: 'honeywell',   name: 'Honeywell Connected Controls', color: 'text-red-400',    border: 'border-red-500/30',    bg: 'bg-red-500/10',    category: 'BMS', desc: 'Connect ECC, Niagara N4, or Forge BMS data to the FI Platform via webhook.' },
  { id: 'siemens',     name: 'Siemens Building Technologies',color: 'text-cyan-400',   border: 'border-cyan-500/30',   bg: 'bg-cyan-500/10',   category: 'BMS', desc: 'Push Desigo CC, Apogee, or Synco device data directly into Equipment Intelligence.' },
  { id: 'jci',         name: 'Johnson Controls OpenBlue',   color: 'text-blue-400',   border: 'border-blue-500/30',   bg: 'bg-blue-500/10',   category: 'BMS', desc: 'Sync Metasys, FX, or OpenBlue platform alarms, trends, and equipment states.' },
  { id: 'schneider',   name: 'Schneider Electric EcoStruxure',color:'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/10',  category: 'BMS', desc: 'Bridge EcoStruxure Building Operation or Power Monitoring Expert readings.' },
  { id: 'tridium',     name: 'Tridium / Niagara Framework', color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', category: 'BMS', desc: 'Use Niagara N4 REST API or BACnet proxy to forward points to FI Platform.' },
  { id: 'maximo',      name: 'IBM Maximo',                  color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10', category: 'CMMS', desc: 'Sync work orders, asset records, and PM schedules from Maximo into FI Platform.' },
  { id: 'servicenow',  name: 'ServiceNow Facilities',       color: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-500/10', category: 'CMMS', desc: 'Bridge ServiceNow WO and asset records to FI Platform for unified compliance logging.' },
  { id: 'upkeep',      name: 'UpKeep CMMS',                 color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', category: 'CMMS', desc: 'Sync UpKeep assets and work orders via webhook to keep FI Platform aligned.' },
  { id: 'fiix',        name: 'Fiix CMMS',                   color: 'text-emerald-400',border: 'border-emerald-500/30',bg: 'bg-emerald-500/10',category: 'CMMS', desc: 'Forward Fiix maintenance tasks, asset health scores, and parts inventory.' },
];

function IntegrationsTab({ user }: { user: any }) {
  const { toast } = useToast();
  const isEnterprise = (user?.tier || '').toLowerCase() === 'enterprise';
  const facilityId  = localStorage.getItem('nexum_facility_id') || user?.facilityId || 'YOUR_FACILITY_ID';
  const apiKey      = localStorage.getItem('nexum_api_key')     || `nxm_${facilityId.slice(0, 8)}_live`;
  const webhookBase = `${import.meta.env.VITE_API_BASE_URL || 'https://api.nexumsuum.com'}/v1/inbound/${facilityId}`;

  const [connected, setConnected] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexum_bms_connections') || '[]'); } catch { return []; }
  });
  const [configOpen, setConfigOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: `${label} copied` });
  };

  const toggleConnect = (id: string) => {
    const next = connected.includes(id) ? connected.filter(x => x !== id) : [...connected, id];
    setConnected(next);
    localStorage.setItem('nexum_bms_connections', JSON.stringify(next));
    toast({
      title: connected.includes(id) ? 'Disconnected' : 'Connection saved',
      description: connected.includes(id)
        ? 'Remove the webhook URL from your BMS system to stop data flow.'
        : 'Paste your Nexum webhook URL into the BMS integration settings to activate.',
    });
  };

  const byCategory = (cat: string) => BMS_PLATFORMS.filter(p => p.category === cat);

  return (
    <div className="space-y-8">

      {/* ── Platform (Nexum internal) integrations ── */}
      <div>
        <h2 className="text-base font-semibold mb-3">Platform Services</h2>
        <div className="space-y-2">
          {[
            { name: 'Stripe Billing',   desc: 'Payment processing and subscription management',          status: 'connected' },
            { name: 'AWS Cognito',       desc: 'Authentication and user management',                      status: 'connected' },
            { name: 'Claude AI',         desc: 'VVFI Instructor, compliance narratives, photo analysis',  status: 'connected' },
            { name: 'S3 Storage',        desc: 'Audit report and document storage',                       status: 'connected' },
          ].map((int) => (
            <div key={int.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div><p className="font-medium text-sm">{int.name}</p><p className="text-xs text-muted-foreground">{int.desc}</p></div>
              <Badge className="bg-green-500/20 text-green-400">connected</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* ── Enterprise gate for BMS/CMMS ── */}
      {!isEnterprise && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5 flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 shrink-0">
            <Lock className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-yellow-300">BMS / CMMS Integrations — Enterprise Only</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Direct connections to Honeywell, Siemens, Johnson Controls, IBM Maximo, ServiceNow, and other
              BMS/CMMS platforms require an Enterprise plan. Upgrade to unlock webhook configuration, API key
              generation, and live data sync from your building systems.
            </p>
            <button
              onClick={() => window.location.href = '/pricing#enterprise-quote'}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              View Enterprise pricing <ArrowUpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <Badge className="shrink-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Enterprise</Badge>
        </div>
      )}

      {/* ── How BMS/CMMS connection works (Enterprise only) ── */}
      {isEnterprise && (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">How BMS / CMMS Connection Works</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          No native app is required. Each BMS or CMMS platform supports outbound webhooks or REST callbacks.
          Copy your <strong>Nexum Inbound Webhook URL</strong> and <strong>API Key</strong> below, paste them
          into your BMS integration settings (under "Outbound Webhooks" or "REST Callback URL"),
          and the system will automatically push equipment states, alarms, work orders, and energy data to the FI Platform.
          Data appears in Equipment Intelligence within seconds of each push.
        </p>
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs bg-muted/50 border border-border/40 rounded px-3 py-2 truncate text-muted-foreground">
              {webhookBase}/data
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => copyText(`${webhookBase}/data`, 'Webhook URL')}>
              <Copy className="w-3.5 h-3.5" />{copied === 'Webhook URL' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs bg-muted/50 border border-border/40 rounded px-3 py-2 truncate text-muted-foreground">
              {apiKey}
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => copyText(apiKey, 'API Key')}>
              <Key className="w-3.5 h-3.5" />{copied === 'API Key' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground pt-1">
          Supported data types pushed by BMS: <span className="text-foreground">equipment_status · alarm · work_order · energy_reading · asset_health</span>
        </p>
      </div>
      )}

      {/* ── BMS Platforms ── */}
      {isEnterprise && (
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />BMS Platforms</h2>
        <div className="space-y-3">
          {byCategory('BMS').map(p => {
            const isConnected = connected.includes(p.id);
            const isOpen      = configOpen === p.id;
            return (
              <div key={p.id} className={cn('rounded-xl border transition-all', isConnected ? `${p.border} ${p.bg}` : 'border-border/30 bg-muted/10')}>
                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg shrink-0', p.bg, 'border', p.border)}>
                      {isConnected ? <Wifi className={cn('w-4 h-4', p.color)} /> : <WifiOff className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfigOpen(isOpen ? null : p.id)}
                      className="text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded px-2 py-1 transition-colors"
                    >
                      {isOpen ? 'Close' : 'Configure'}
                    </button>
                    <button
                      onClick={() => toggleConnect(p.id)}
                      className={cn('text-xs px-3 py-1 rounded border transition-colors',
                        isConnected
                          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                          : `${p.border} ${p.color} hover:${p.bg}`
                      )}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 space-y-2 border-t border-border/20">
                    <p className="text-xs text-muted-foreground pt-3">
                      Paste these credentials into <strong>{p.name}</strong> → Integrations → Outbound Webhook / REST Callback:
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">Webhook URL</span>
                      <div className="flex-1 font-mono text-xs bg-muted/50 border border-border/40 rounded px-2 py-1.5 truncate">{webhookBase}/data</div>
                      <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2" onClick={() => copyText(`${webhookBase}/data`, p.id + '_url')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">API Key</span>
                      <div className="flex-1 font-mono text-xs bg-muted/50 border border-border/40 rounded px-2 py-1.5 truncate">{apiKey}</div>
                      <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2" onClick={() => copyText(apiKey, p.id + '_key')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ── CMMS Platforms ── */}
      {isEnterprise && (
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />CMMS Platforms</h2>
        <div className="space-y-3">
          {byCategory('CMMS').map(p => {
            const isConnected = connected.includes(p.id);
            const isOpen      = configOpen === p.id;
            return (
              <div key={p.id} className={cn('rounded-xl border transition-all', isConnected ? `${p.border} ${p.bg}` : 'border-border/30 bg-muted/10')}>
                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg shrink-0', p.bg, 'border', p.border)}>
                      {isConnected ? <Wifi className={cn('w-4 h-4', p.color)} /> : <WifiOff className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfigOpen(isOpen ? null : p.id)}
                      className="text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded px-2 py-1 transition-colors"
                    >
                      {isOpen ? 'Close' : 'Configure'}
                    </button>
                    <button
                      onClick={() => toggleConnect(p.id)}
                      className={cn('text-xs px-3 py-1 rounded border transition-colors',
                        isConnected
                          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                          : `${p.border} ${p.color} hover:${p.bg}`
                      )}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 space-y-2 border-t border-border/20">
                    <p className="text-xs text-muted-foreground pt-3">
                      In <strong>{p.name}</strong>, go to Settings → Integrations → Webhook / Outbound REST and enter:
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">Webhook URL</span>
                      <div className="flex-1 font-mono text-xs bg-muted/50 border border-border/40 rounded px-2 py-1.5 truncate">{webhookBase}/data</div>
                      <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2" onClick={() => copyText(`${webhookBase}/data`, p.id + '_url')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">API Key</span>
                      <div className="flex-1 font-mono text-xs bg-muted/50 border border-border/40 rounded px-2 py-1.5 truncate">{apiKey}</div>
                      <Button size="sm" variant="ghost" className="shrink-0 h-7 px-2" onClick={() => copyText(apiKey, p.id + '_key')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

    </div>
  );
}

// ── Purchased add-on module metadata ─────────────────────────────────────────
const MODULE_META: Record<string, { name: string; icon: any; color: string; bg: string; border: string; path: string; desc: string }> = {
  addon_retail: {
    name: 'Retail Module',
    icon: ShoppingCart,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    path: '/retail-dashboard',
    desc: 'Retail Dashboard, inventory tracking, temperature compliance, shelf-life alerts.',
  },
  addon_govt: {
    name: 'Government Module',
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    path: '/government-dashboard',
    desc: 'Government Dashboard, apparatus tracking, chain of custody, personnel certifications.',
  },
};

const PURCHASED_ADDONS_KEY = 'nexum_purchased_addons';   // e.g. ['addon_retail']
const ACTIVE_MODULES_KEY   = 'nexum_active_modules';      // controls sidebar visibility

function LocationsAddonsTab({ user }: { user: any }) {
  const { toast } = useToast();

  // ── Purchased modules (set by Stripe webhook / welcome page) ──
  const [purchased] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PURCHASED_ADDONS_KEY) || '[]'); } catch { return []; }
  });
  const [activeModules, setActiveModules] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(ACTIVE_MODULES_KEY) || JSON.stringify(purchased)); } catch { return purchased; }
  });

  const toggleModule = (id: string) => {
    const next = activeModules.includes(id) ? activeModules.filter(x => x !== id) : [...activeModules, id];
    setActiveModules(next);
    localStorage.setItem(ACTIVE_MODULES_KEY, JSON.stringify(next));
    toast({ title: 'Module updated', description: 'Sidebar will reflect the change on next navigation.' });
  };

  // ── Locations ──
  const [locations, setLocations] = useState<{ id: string; name: string; address: string; type: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexum_locations') || '[]'); } catch { return []; }
  });
  const [locForm, setLocForm] = useState({ name: '', address: '', type: 'Facility' });
  const LOC_TYPES = ['Facility', 'Warehouse', 'Retail Site', 'Government Site', 'Data Center', 'Other'];

  const addLocation = () => {
    if (!locForm.name.trim()) return;
    const next = [...locations, { id: Date.now().toString(), ...locForm }];
    setLocations(next);
    localStorage.setItem('nexum_locations', JSON.stringify(next));
    setLocForm({ name: '', address: '', type: 'Facility' });
    toast({ title: 'Location added', description: locForm.name });
  };

  const removeLocation = (id: string) => {
    const next = locations.filter(l => l.id !== id);
    setLocations(next);
    localStorage.setItem('nexum_locations', JSON.stringify(next));
  };

  // ── Staff ──
  const [staff, setStaff] = useState<{ id: string; name: string; email: string; role: string; location: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexum_staff_roster') || '[]'); } catch { return []; }
  });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'employee', location: '' });
  const STAFF_ROLES = ['admin', 'executive', 'manager', 'supervisor', 'engineer', 'operator', 'technician', 'custodian', 'employee'];

  const addStaff = () => {
    if (!staffForm.name.trim() || !staffForm.email.trim()) return;
    const next = [...staff, { id: Date.now().toString(), ...staffForm }];
    setStaff(next);
    localStorage.setItem('nexum_staff_roster', JSON.stringify(next));
    setStaffForm({ name: '', email: '', role: 'employee', location: '' });
    toast({ title: 'Staff member added', description: staffForm.name });
  };

  const removeStaff = (id: string) => {
    const next = staff.filter(s => s.id !== id);
    setStaff(next);
    localStorage.setItem('nexum_staff_roster', JSON.stringify(next));
  };

  // ── Asset / Inventory import ──
  const [importPreview, setImportPreview] = useState<string[][]>([]);
  const [importType, setImportType] = useState<'inventory' | 'assets'>('assets');
  const fileRef = useState<HTMLInputElement | null>(null);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.trim().split('\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      setImportPreview(rows.slice(0, 6)); // show header + first 5 rows
      toast({ title: 'CSV loaded', description: `${rows.length - 1} records ready to import.` });
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importPreview.length) return;
    const key = importType === 'assets' ? 'nexum_imported_assets' : 'nexum_imported_inventory';
    localStorage.setItem(key, JSON.stringify(importPreview));
    toast({ title: 'Import saved', description: `${importPreview.length - 1} records stored locally. Sync will push to your facility on next connection.` });
    setImportPreview([]);
  };

  return (
    <div className="space-y-8">

      {/* ── Add-on Modules ── */}
      <div>
        <h2 className="text-base font-semibold mb-1">Add-on Modules</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Modules purchased with your Standard plan remain active as you upgrade tiers. Toggle sidebar visibility here.
        </p>
        {Object.entries(MODULE_META).map(([id, meta]) => {
          const ModIcon = meta.icon;
          const isPurchased = purchased.includes(id);
          const isActive    = activeModules.includes(id);
          return (
            <div
              key={id}
              className={cn(
                'flex items-start justify-between gap-4 p-4 rounded-xl border mb-3 transition-all',
                isPurchased ? `${meta.border} ${meta.bg}` : 'border-border/30 bg-muted/10 opacity-50'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', meta.bg, 'border', meta.border)}>
                  <ModIcon className={cn('w-4 h-4', meta.color)} />
                </div>
                <div>
                  <p className="font-medium text-sm">{meta.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                  {!isPurchased && (
                    <p className="text-xs text-yellow-400 mt-1">Not purchased — available as a Standard tier add-on.</p>
                  )}
                </div>
              </div>
              {isPurchased && (
                <button
                  onClick={() => toggleModule(id)}
                  className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isActive
                    ? <ToggleRight className="w-5 h-5 text-green-400" />
                    : <ToggleLeft className="w-5 h-5" />}
                  {isActive ? 'Active' : 'Hidden'}
                </button>
              )}
              {!isPurchased && (
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  Add +$2,500–4,000/yr
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Locations ── */}
      <div>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Locations</h2>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Location Name *</label>
            <Input placeholder="e.g. Main Facility — Newark" value={locForm.name} onChange={e => setLocForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={locForm.type} onValueChange={v => setLocForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs text-muted-foreground">Address</label>
            <Input placeholder="123 Main St, Newark, NJ 07101" value={locForm.address} onChange={e => setLocForm(p => ({ ...p, address: e.target.value }))} />
          </div>
        </div>
        <Button size="sm" onClick={addLocation} className="gap-2 mb-4">
          <Plus className="w-4 h-4" />Add Location
        </Button>
        {locations.length > 0 && (
          <div className="space-y-2">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div>
                  <p className="text-sm font-medium">{loc.name}</p>
                  <p className="text-xs text-muted-foreground">{loc.type}{loc.address ? ` · ${loc.address}` : ''}</p>
                </div>
                <button onClick={() => removeLocation(loc.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Staff ── */}
      <div>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" />Add Staff</h2>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Full Name *</label>
            <Input placeholder="Jane Smith" value={staffForm.name} onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Email *</label>
            <Input type="email" placeholder="jane@facility.com" value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Role</label>
            <Select value={staffForm.role} onValueChange={v => setStaffForm(p => ({ ...p, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAFF_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Location</label>
            <Select value={staffForm.location} onValueChange={v => setStaffForm(p => ({ ...p, location: v }))}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {locations.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" onClick={addStaff} className="gap-2 mb-4">
          <UserPlus className="w-4 h-4" />Add Staff Member
        </Button>
        {staff.length > 0 && (
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div>
                  <p className="text-sm font-medium">{s.name} <span className="text-xs text-muted-foreground capitalize">· {s.role}</span></p>
                  <p className="text-xs text-muted-foreground">{s.email}{s.location ? ` · ${s.location}` : ''}</p>
                </div>
                <button onClick={() => removeStaff(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Import Assets / Inventory ── */}
      <div>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-primary" />Import Assets or Inventory</h2>
        <div className="flex gap-3 mb-4">
          {(['assets', 'inventory'] as const).map(t => (
            <button
              key={t}
              onClick={() => setImportType(t)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium border transition-all capitalize',
                importType === t ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'assets' ? 'Equipment / Assets' : 'Inventory Items'}
            </button>
          ))}
        </div>
        <div className="p-4 rounded-xl border border-dashed border-border/60 bg-muted/10 text-center space-y-3">
          <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Upload CSV file</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {importType === 'assets'
                ? 'Columns: name, type, model, serial, location, install_date, design_life_hours'
                : 'Columns: name, sku, category, quantity, unit, location, reorder_point'}
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-md bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition-colors">
            <FolderOpen className="w-4 h-4" />
            Choose File
            <input type="file" accept=".csv" className="sr-only" onChange={handleImportCSV} />
          </label>
        </div>
        {importPreview.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground font-medium">Preview ({importPreview.length - 1} records):</p>
            <div className="overflow-x-auto rounded-lg border border-border/30">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30">
                    {importPreview[0]?.map((h, i) => <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(1).map((row, ri) => (
                    <tr key={ri} className="border-t border-border/20">
                      {row.map((cell, ci) => <td key={ci} className="px-3 py-2 whitespace-nowrap">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" onClick={confirmImport} className="gap-2">
              <CheckCircle className="w-4 h-4" />Confirm Import
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}

function BillingTab({ user }: { user: any }) {
  const { toast } = useToast();
  const currentTier: string = user?.tier || 'basic';
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason]           = useState('');

  const handleUpgrade = (planId: string) => {
    // Opens pricing page for plan selection → Stripe checkout
    window.location.href = `/pricing?plan=${planId}`;
  };

  const handleViewPricing = () => {
    window.location.href = '/pricing';
  };

  const handleManageBilling = () => {
    const billingUrl = `https://billing.stripe.com/p/login/nexumsuum?prefilled_email=${encodeURIComponent(user?.email || '')}`;
    window.open(billingUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCancelSubscription = () => {
    // In production: POST to /billing/cancel with reason
    toast({
      title: 'Cancellation Request Received',
      description: 'Your request has been logged. You retain full access until the end of your current billing period. Confirmation will be sent to your email.',
    });
    setShowCancelConfirm(false);
    setCancelReason('');
  };

  const CANCEL_REASONS = [
    'Too expensive for our budget',
    'Missing features we need',
    'Switching to another solution',
    'Facility closed or restructured',
    'Temporary pause — plan to return',
    'Other',
  ];

  return (
    <div className="space-y-8">
      {/* Current plan banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20"><CreditCard className="w-5 h-5 text-cyan-400" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Current Plan</p>
            <p className="font-semibold text-lg capitalize">{currentTier.replace(/_/g, ' ')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="gap-2 bg-cyan-600 hover:bg-cyan-500" onClick={handleViewPricing}>
            <ArrowUpCircle className="w-4 h-4" /> Upgrade Plan
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleManageBilling}>
            <ExternalLink className="w-4 h-4" /> Billing Portal
          </Button>
        </div>
      </div>

      {/* Active subscription value breakdown */}
      {(() => {
        const PLAN_COSTS: Record<string, number> = {
          basic: 10788, standard: 23988, business: 47988, premium: 83988, enterprise: 0,
          pm_starter: 1970, pm_professional: 3970,
          entrepreneur: 6000, entrepreneur_pro: 8490,
        };
        const baseCost = PLAN_COSTS[currentTier] || 0;
        let activeModules: string[] = [];
        try { activeModules = JSON.parse(localStorage.getItem('nexum_active_modules') || '[]'); } catch { /**/ }
        const ADDON_COSTS: Record<string, { label: string; cost: number; period: string }> = {
          addon_retail:    { label: 'Retail Module',          cost: 2500,  period: '/yr' },
          addon_govt:      { label: 'Government Module',       cost: 4000,  period: '/yr' },
          addon_property:  { label: 'Property Module',         cost: 1970,  period: '/yr' },
        };
        const addonRows = activeModules.map(id => ADDON_COSTS[id]).filter(Boolean);
        const addonTotal = addonRows.reduce((s, a) => s + a.cost, 0);
        const expandProps = parseInt(localStorage.getItem('nexum_expand_properties') || '0');
        const expandFleet = parseInt(localStorage.getItem('nexum_expand_fleet') || '0');
        const expandLocs  = parseInt(localStorage.getItem('nexum_expand_locations') || '0');
        const expandMo = expandProps * 49 + expandFleet * 19 + expandLocs * 99;
        const annualTotal = baseCost + addonTotal;
        if (baseCost === 0 && addonRows.length === 0) return null;
        return (
          <div className="rounded-xl border border-border/30 bg-muted/10 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Subscription Value</p>
            {baseCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="capitalize">{currentTier.replace(/_/g, ' ')} Plan</span>
                <span className="font-medium">${baseCost.toLocaleString()}/yr</span>
              </div>
            )}
            {addonRows.map((a, i) => (
              <div key={i} className="flex justify-between text-sm text-muted-foreground">
                <span>{a.label}</span>
                <span>+${a.cost.toLocaleString()}{a.period}</span>
              </div>
            ))}
            {expandMo > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Expansion add-ons ({expandProps > 0 ? `${expandProps} prop` : ''}{expandFleet > 0 ? ` ${expandFleet} veh` : ''}{expandLocs > 0 ? ` ${expandLocs} loc` : ''})</span>
                <span>+${expandMo.toLocaleString()}/mo</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border/30">
              <span>Annual Total</span>
              <span className="text-cyan-400">${(annualTotal + expandMo * 12).toLocaleString()}/yr</span>
            </div>
          </div>
        );
      })()}

      {/* Plan comparison */}
      <div>
        <h2 className="text-base font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLAN_TIERS.map(plan => {
            const isCurrent = currentTier === plan.id;
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
                </div>
                <ul className="space-y-1 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 mt-0.5 text-green-400 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  disabled={isCurrent}
                  variant={isCurrent ? 'outline' : 'default'}
                  className={cn('w-full gap-1.5 mt-1', !isCurrent && 'bg-cyan-600 hover:bg-cyan-500')}
                  onClick={() => !isCurrent && handleUpgrade(plan.id)}
                >
                  {isCurrent ? 'Active Plan' : <><ArrowUpCircle className="w-3.5 h-3.5" /> Upgrade</>}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancellation policy */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <h3 className="font-semibold text-sm">Cancellation Policy</h3>
        </div>
        <ul className="space-y-2">
          {CANCELLATION_POLICY.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400/70 shrink-0" />
              {point}
            </li>
          ))}
        </ul>

        {!showCancelConfirm ? (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Subscription
            </Button>
          </div>
        ) : (
          <div className="space-y-3 p-4 rounded-lg bg-red-500/5 border border-red-500/30">
            <p className="text-sm font-semibold text-red-400">Confirm Cancellation</p>
            <p className="text-xs text-muted-foreground">
              You'll keep full access until the end of your current billing period. After that, your data is retained for 90 days.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason for cancelling (optional)</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }}>
                Keep My Plan
              </Button>
              <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-500 text-white" onClick={handleCancelSubscription}>
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}
      </div>
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
  const [utilitiesLoading, setUtilitiesLoading] = useState(false);

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
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold">Team & Roles</h2>
                  {can(userRole, ADMIN_ROLES) && (
                    <Button size="sm" onClick={() => toast({ title: 'Invite via Onboarding', description: 'Use the onboarding wizard to invite new staff.' })}>
                      <Plus className="w-4 h-4 mr-1.5" />Add Member
                    </Button>
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
                  <div className="text-center py-8 text-muted-foreground text-sm">No team members found. Add staff through the onboarding wizard.</div>
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
            {activeTab === 'addons'  && <LocationsAddonsTab user={user} />}

            {/* ── Integrations ── */}
            {activeTab === 'integration' && <IntegrationsTab user={user} />}

            {/* ── Data & Backup ── */}
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
    </MainLayout>
  );
};

export default Settings;
