import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Check, Flame, Zap, Building2, Crown, ArrowRight, X,
  ShoppingCart, Shield, Star, Sparkles, Lock, Users, Package, Cpu, Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SectorTab = 'facility' | 'retail' | 'government' | 'property' | 'entrepreneur';

interface Plan {
  name: string;
  priceId: string | null;
  price: number | null;
  billingLabel: '/yr' | '/mo';
  annualPriceId?: string;
  annualPrice?: number;
  icon: any;
  color: string;
  border: string;
  bg: string;
  badge?: string | null;
  annualLicense?: boolean;
  description: string;
  features: string[];
  isEnterprise?: boolean;
}

// ── FACILITY — annual license only ────────────────────────────────────────────
const FACILITY_PLANS: Plan[] = [
  {
    name: 'Basic',
    priceId: 'price_1TAbJ4Dfw4bOR2dfEHzEs5qY',
    price: 10788,
    billingLabel: '/yr',
    annualLicense: true,
    icon: Zap,
    color: 'text-blue-400',
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/5',
    badge: null,
    description: 'Core facility logging and visibility for small operations. Perfect for getting started with digital compliance.',
    features: [
      'Up to 2 facilities',
      'Equipment Library',
      'Facility Data Source logging',
      'Compliance Logger',
      'Work Orders',
      'Basic dashboards',
      'Email support',
    ],
  },
  {
    name: 'Standard',
    priceId: 'price_1TAbKQDfw4bOR2df9CbJymgf',
    price: 23988,
    billingLabel: '/yr',
    annualLicense: true,
    icon: Building2,
    color: 'text-cyan-400',
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-400/5',
    badge: null,
    description: 'Full operational visibility for growing facilities. Includes inventory management and team coordination.',
    features: [
      'Up to 5 facilities',
      'Everything in Basic',
      'Vendor Hub',
      'Violations tracking',
      'Energy Dashboard',
      'Manager & Supervisor dashboards',
      'Inventory Library',
      'Priority email support',
    ],
  },
  {
    name: 'Business',
    priceId: 'price_1TAbNoDfw4bOR2dfepJUVort',
    price: 47988,
    billingLabel: '/yr',
    annualLicense: true,
    icon: Flame,
    color: 'text-orange-400',
    border: 'border-orange-400/40',
    bg: 'bg-orange-400/5',
    badge: 'Most Popular',
    description: 'Multi-site intelligence for complex operations. Advanced analytics and AI-powered compliance analysis.',
    features: [
      'Up to 15 facilities',
      'Everything in Standard',
      'Executive Dashboard',
      'Multi-facility analytics',
      'Compliance Analyzer AI',
      'Staff Performance Compass',
      'Command Hub (full)',
      'Phone + email support',
    ],
  },
  {
    name: 'Premium',
    priceId: 'price_1TAbPLDfw4bOR2dfeT4Posk4',
    price: 83988,
    billingLabel: '/yr',
    annualLicense: true,
    icon: Crown,
    color: 'text-purple-400',
    border: 'border-purple-400/40',
    bg: 'bg-purple-400/5',
    badge: 'Full Platform',
    description: 'Unlimited access to every feature including AI-powered tools. Includes dedicated account manager and 24/7 support.',
    features: [
      'Unlimited facilities',
      'Everything in Business',
      'VVFI Facility Instructor AI',
      'OVPI Performance Intelligence',
      'Optimize & Learn training',
      'Custom onboarding',
      'Dedicated account manager',
      '24/7 priority support',
    ],
  },
];

// ── RETAIL — monthly + annual ─────────────────────────────────────────────────
const RETAIL_PLANS: Plan[] = [
  {
    name: 'Retail Starter',
    priceId: 'price_1TGTF3Dfw4bOR2dfenLjfUMf',
    price: 197,
    billingLabel: '/mo',
    annualPriceId: 'price_1THMfpDfw4bOR2dfwtc7c1LJ',
    annualPrice: 1970,
    icon: ShoppingCart,
    color: 'text-green-400',
    border: 'border-green-400/30',
    bg: 'bg-green-400/5',
    badge: null,
    description: 'Essential compliance tools for single-location retail and food service. Built for daily operations that demand audit-ready records.',
    features: [
      'Inventory tracking',
      'Shelf life + FIFO alerts',
      'Temperature compliance logs',
      'Daily open/close checklists',
      'Health inspection readiness score',
      '1 location · 5 users',
    ],
  },
  {
    name: 'Retail Pro',
    priceId: 'price_1TGTIMDfw4bOR2dfWvWCGU87',
    price: 297,
    billingLabel: '/mo',
    annualPriceId: 'price_1THMepDfw4bOR2df4bO6qRtW',
    annualPrice: 2970,
    icon: Star,
    color: 'text-emerald-400',
    border: 'border-emerald-400/40',
    bg: 'bg-emerald-400/5',
    badge: 'Best Value',
    description: 'Multi-location retail intelligence with supplier management and waste tracking. Scales with your growing operation.',
    features: [
      'Everything in Starter',
      'Multi-location (up to 3)',
      'Waste tracking',
      'Compliance document storage',
      'Supplier management',
      'Manager dashboard',
      '10 users',
    ],
  },
];

// ── GOVERNMENT — annual license only ──────────────────────────────────────────
const GOVERNMENT_PLANS: Plan[] = [
  {
    name: 'Command Basic',
    priceId: 'price_1TGTMYDfw4bOR2dfkANtaj0z',
    price: 4970,
    billingLabel: '/yr',
    annualLicense: true,
    icon: Shield,
    color: 'text-blue-400',
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/5',
    badge: null,
    description: 'Core tools for public safety departments. Apparatus tracking, personnel certifications, and compliance logging in one platform.',
    features: [
      'Apparatus / fleet tracking',
      'Personnel certifications',
      'Chain of custody logging',
      'Equipment inventory',
      'Work orders',
      'Compliance logging',
      '1 department · 15 users',
    ],
  },
  {
    name: 'Command Standard',
    priceId: 'price_1TGTNzDfw4bOR2df7EU4x1DQ',
    price: 9970,
    billingLabel: '/yr',
    annualLicense: true,
    icon: Shield,
    color: 'text-cyan-400',
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-400/5',
    badge: null,
    description: 'Advanced response metrics and multi-unit coordination. Includes NFPA 1710 benchmark scoring and weapons inventory.',
    features: [
      'Everything in Basic',
      'Response metrics (NFPA 1710)',
      'Weapons + uniform inventory',
      'Compliance reporting',
      'Multi-unit (up to 5)',
      '30 users',
    ],
  },
  {
    name: 'Command Pro',
    priceId: 'price_1TGTPGDfw4bOR2dfJZVGSrm5',
    price: 19970,
    billingLabel: '/yr',
    annualLicense: true,
    icon: Crown,
    color: 'text-purple-400',
    border: 'border-purple-400/40',
    bg: 'bg-purple-400/5',
    badge: 'Most Capable',
    description: 'Full platform access for large public safety agencies. AI compliance analysis, unlimited units, and a dedicated account manager.',
    features: [
      'Everything in Standard',
      'AI compliance analysis',
      'Unlimited units',
      'Full Command Hub',
      'Optimize & Learn LMS',
      'Dedicated account manager',
      'Unlimited users',
    ],
  },
  {
    name: 'Command Enterprise',
    priceId: null,
    price: null,
    billingLabel: '/yr',
    icon: Sparkles,
    color: 'text-yellow-400',
    border: 'border-yellow-400/40',
    bg: 'bg-yellow-400/5',
    badge: 'Custom',
    isEnterprise: true,
    description: 'Custom pricing for statewide or multi-agency deployments. Full white-label, custom integrations, and dedicated SLA.',
    features: [
      'Everything in Command Pro',
      'Multi-agency deployment',
      'White-label options',
      'Custom integrations',
      'Dedicated SLA',
      'On-site training',
      'Custom contract',
    ],
  },
];

// ── PROPERTY MANAGEMENT ──────────────────────────────────────────────────────
// Stripe IDs: create in Stripe Dashboard → Products, then replace placeholders
// price_pm_starter_mo  → $197/mo recurring
// price_pm_starter_yr  → $1,970/yr recurring
// price_pm_pro_mo      → $397/mo recurring
// price_pm_pro_yr      → $3,970/yr recurring
const PROPERTY_PLANS: Plan[] = [
  {
    name: 'PM Starter',
    priceId: 'price_pm_starter_mo',
    price: 197,
    billingLabel: '/mo',
    annualPriceId: 'price_pm_starter_yr',
    annualPrice: 1970,
    icon: Building2,
    color: 'text-teal-400',
    border: 'border-teal-400/30',
    bg: 'bg-teal-400/5',
    badge: null,
    description: 'Asset intelligence for small property portfolios. Track appliances, systems, maintenance history, and fleet vehicles across up to 5 properties.',
    features: [
      '1–5 properties',
      'Up to 25 units total',
      'Equipment & appliance library',
      'Fleet vehicle tracking (up to 10)',
      'Maintenance log & reminders',
      'CSV import (properties, assets)',
      'Work orders',
      'NOI impact flags',
    ],
  },
  {
    name: 'PM Professional',
    priceId: 'price_pm_pro_mo',
    price: 397,
    billingLabel: '/mo',
    annualPriceId: 'price_pm_pro_yr',
    annualPrice: 3970,
    icon: Crown,
    color: 'text-teal-300',
    border: 'border-teal-300/40',
    bg: 'bg-teal-300/5',
    badge: 'Best Value',
    description: 'Full portfolio intelligence for growing property managers. Multi-building oversight, compliance tracking, and fleet management at scale.',
    features: [
      '6–20 properties',
      'Up to 100 units total',
      'Everything in PM Starter',
      'Compliance document tracking',
      'Fleet tracking (up to 50 vehicles)',
      'Tenant impact analysis',
      'Capex vs OpEx modeling',
      'Manager dashboard',
    ],
  },
];

// ── ENTREPRENEUR BUNDLE (Retail + Property + Fleet) ───────────────────────────
// Stripe IDs: create in Stripe Dashboard → Products, then replace placeholders
// price_ent_mo      → $600/mo recurring
// price_ent_yr      → $6,000/yr recurring
// price_ent_pro_mo  → $849/mo recurring
// price_ent_pro_yr  → $8,490/yr recurring
const ENTREPRENEUR_PLANS: Plan[] = [
  {
    name: 'Entrepreneur',
    priceId: 'price_ent_mo',
    price: 600,
    billingLabel: '/mo',
    annualPriceId: 'price_ent_yr',
    annualPrice: 6000,
    icon: Flame,
    color: 'text-amber-400',
    border: 'border-amber-400/30',
    bg: 'bg-amber-400/5',
    badge: null,
    description: 'Built for the owner-operator who manages retail locations, rental properties, and a fleet — all from one platform.',
    features: [
      '2–3 retail/store locations',
      'Up to 10 properties (any type)',
      'Fleet management (up to 20 vehicles)',
      'Retail compliance & inventory',
      'Property asset library',
      'Work orders across all sites',
      'Unified equipment intelligence',
      'Priority email support',
    ],
  },
  {
    name: 'Entrepreneur Pro',
    priceId: 'price_ent_pro_mo',
    price: 849,
    billingLabel: '/mo',
    annualPriceId: 'price_ent_pro_yr',
    annualPrice: 8490,
    icon: Crown,
    color: 'text-amber-300',
    border: 'border-amber-300/40',
    bg: 'bg-amber-300/5',
    badge: 'Most Capable',
    description: 'Scale your portfolio with advanced analytics, multi-site benchmarking, and unlimited fleet management across all your ventures.',
    features: [
      '4–5 retail/store locations',
      'Up to 30 properties (mixed portfolio)',
      'Fleet management (up to 100 vehicles)',
      'Everything in Entrepreneur',
      'Executive dashboard',
      'Multi-site benchmarking',
      'Compliance analyzer AI',
      'Phone + priority support',
    ],
  },
];

// ── EXPANSION ADD-ONS (pay-per-unit scaling) ──────────────────────────────────
// Stripe IDs: create as recurring monthly prices, then replace placeholders
// price_expand_property → $49/mo per additional property
// price_expand_fleet    → $19/mo per additional vehicle
// price_expand_location → $99/mo per additional retail location
const EXPANSION_ADDONS = [
  {
    id: 'expand_property',
    name: 'Additional Property',
    priceId: 'price_expand_property',
    monthlyCost: 49,
    unit: 'property',
    icon: Building2,
    color: 'text-teal-400',
    border: 'border-teal-400/30',
    bg: 'bg-teal-400/10',
    description: 'Add one additional property to your portfolio beyond your plan limit.',
    sectors: ['property', 'entrepreneur'] as SectorTab[],
  },
  {
    id: 'expand_fleet',
    name: 'Additional Fleet Vehicles',
    priceId: 'price_expand_fleet',
    monthlyCost: 19,
    unit: 'vehicle',
    icon: Zap,
    color: 'text-amber-400',
    border: 'border-amber-400/30',
    bg: 'bg-amber-400/10',
    description: 'Add additional tracked vehicles beyond your plan\'s fleet limit.',
    sectors: ['property', 'entrepreneur'] as SectorTab[],
  },
  {
    id: 'expand_location',
    name: 'Additional Retail Location',
    priceId: 'price_expand_location',
    monthlyCost: 99,
    unit: 'location',
    icon: ShoppingCart,
    color: 'text-green-400',
    border: 'border-green-400/30',
    bg: 'bg-green-400/10',
    description: 'Add a retail or store location beyond your Entrepreneur plan limit.',
    sectors: ['entrepreneur'] as SectorTab[],
  },
];

const ADDONS = [
  { name: 'FI Platform Implementation', price: 4999, priceId: 'price_1TAbl7Dfw4bOR2dfSxKwaYdP', desc: 'White-glove onboarding and setup', billing: 'one-time' },
  { name: 'FI Enterprise Support', price: 10000, priceId: 'price_1TAbiWDfw4bOR2dfrBMHzuqV', desc: 'Dedicated support SLA', billing: '/yr' },
  { name: 'FI Priority Support', price: 3000, priceId: 'price_1TAbhqDfw4bOR2dfM0FNrTlF', desc: 'Priority response guarantee', billing: '/yr' },
  { name: 'Training — Small Team (1–10)', price: 1500, priceId: 'price_1TAbVLDfw4bOR2dfHMCBek1G', desc: 'Team training package', billing: 'one-time' },
  { name: 'Training — Department (11–25)', price: 3500, priceId: 'price_1TAbWXDfw4bOR2dfeb5UqZHy', desc: 'Department training package', billing: 'one-time' },
  { name: 'Training — Operations (26–50)', price: 6500, priceId: 'price_1TAbXhDfw4bOR2dfXVyOvlJe', desc: 'Operations training package', billing: 'one-time' },
];

// ── Standard-tier module add-ons (Retail + Government) ───────────────────────
const STANDARD_MODULE_ADDONS = [
  {
    id: 'addon_retail',
    name: 'Retail Module',
    priceId: 'price_1TLs9PDfw4bOR2dfka4QxilT',
    annualCost: 2500,
    icon: ShoppingCart,
    color: 'text-green-400',
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
    description: 'Add retail & food service tools to your Standard facility plan.',
    features: [
      'Retail Dashboard',
      'Inventory tracking (food/apparel)',
      'Temperature compliance logs',
      'Shelf-life & FIFO alerts',
      'Health inspection readiness',
    ],
  },
  {
    id: 'addon_govt',
    name: 'Government Module',
    priceId: 'price_1TLs9wDfw4bOR2dfpXlMi0iw',
    annualCost: 4000,
    icon: Shield,
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    description: 'Add public safety & government tools to your Standard facility plan.',
    features: [
      'Government Dashboard',
      'Apparatus / fleet tracking',
      'Chain of custody logging',
      'Personnel certification tracking',
      'Response metrics (NFPA 1710)',
    ],
  },
];

// ── Enterprise pricing config ─────────────────────────────────────────────────
const ENT_BASE = 83988; // Premium tier as annual base

const ENT_STAFF = [
  { label: '1–25 users',     value: 's25',   add: 0 },
  { label: '26–75 users',    value: 's75',   add: 6000 },
  { label: '76–150 users',   value: 's150',  add: 15000 },
  { label: '151–300 users',  value: 's300',  add: 30000 },
  { label: '300+ users',     value: 's300p', add: 0,     custom: true },
] as const;

const ENT_FACILITIES = [
  { label: '1–5 facilities',   value: 'f5',   add: 0 },
  { label: '6–15 facilities',  value: 'f15',  add: 12000 },
  { label: '16–30 facilities', value: 'f30',  add: 28000 },
  { label: '31–50 facilities', value: 'f50',  add: 50000 },
  { label: '50+ facilities',   value: 'f50p', add: 0,     custom: true },
] as const;

const ENT_SIZE = [
  { label: '<50,000 sqft',        value: 'sz50k',  add: 0 },
  { label: '50,000–200,000 sqft', value: 'sz200k', add: 4000 },
  { label: '200,000–500,000 sqft',value: 'sz500k', add: 10000 },
  { label: '500,000+ sqft',       value: 'sz500p', add: 20000 },
] as const;

const ENT_ASSETS = [
  { label: '<500 assets',          value: 'a500',  add: 0 },
  { label: '500–2,000 assets',     value: 'a2k',   add: 4000 },
  { label: '2,000–10,000 assets',  value: 'a10k',  add: 10000 },
  { label: '10,000+ assets',       value: 'a10kp', add: 20000 },
] as const;

const ENT_SUPPORT = [
  { label: 'Standard email',              value: 'sup_std', add: 0 },
  { label: 'Priority response (+$3k/yr)', value: 'sup_pri', add: 3000 },
  { label: 'Enterprise SLA — dedicated',  value: 'sup_ent', add: 10000 },
] as const;

const ENT_IMPL = [
  { label: 'Self-guided (included)',  value: 'impl_self', add: 0,     oneTime: false },
  { label: 'Assisted setup',          value: 'impl_asst', add: 4999,  oneTime: true },
  { label: 'White-glove / custom',    value: 'impl_wg',   add: 12000, oneTime: true },
] as const;

const ENT_MODULES = [
  { id: 'mod_retail', label: 'Retail Module',          add: 2500, icon: ShoppingCart, color: 'text-green-400' },
  { id: 'mod_govt',   label: 'Government Module',       add: 4000, icon: Shield,       color: 'text-blue-400' },
  { id: 'mod_bms',    label: 'BMS / CMMS Integration',  add: 8000, icon: Wifi,         color: 'text-cyan-400' },
] as const;

export default function Pricing() {
  const navigate = useNavigate();
  const [sector, setSector] = useState<SectorTab>('facility');
  const [retailBilling, setRetailBilling] = useState<'monthly' | 'annual'>('monthly');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    estimatedLocations: '',
    teamSize: '',
    orgType: '',
    notes: '',
  });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  // Standard module add-ons
  const [standardModuleAddons, setStandardModuleAddons] = useState<string[]>([]);
  // Enterprise configurator
  const [entStaff,    setEntStaff]    = useState('s25');
  const [entFacility, setEntFacility] = useState('f5');
  const [entSize,     setEntSize]     = useState('sz50k');
  const [entAssets,   setEntAssets]   = useState('a500');
  const [entSupport,  setEntSupport]  = useState('sup_std');
  const [entImpl,     setEntImpl]     = useState('impl_self');
  const [entModules,  setEntModules]  = useState<string[]>([]);
  const [entLoading,  setEntLoading]  = useState(false);
  // Expansion add-on quantities (property/fleet/location)
  const [expandQty, setExpandQty] = useState<Record<string, number>>({
    expand_property: 0, expand_fleet: 0, expand_location: 0,
  });
  const expandTotal = EXPANSION_ADDONS
    .filter(a => a.sectors.includes(sector))
    .reduce((s, a) => s + (expandQty[a.id] || 0) * a.monthlyCost, 0);

  const toggleStandardAddon = (id: string) =>
    setStandardModuleAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const standardAddonTotal = STANDARD_MODULE_ADDONS
    .filter(a => standardModuleAddons.includes(a.id))
    .reduce((s, a) => s + a.annualCost, 0);

  // Enterprise live total
  const entStaffRow    = ENT_STAFF.find(r => r.value === entStaff)!;
  const entFacilityRow = ENT_FACILITIES.find(r => r.value === entFacility)!;
  const entSizeRow     = ENT_SIZE.find(r => r.value === entSize)!;
  const entAssetsRow   = ENT_ASSETS.find(r => r.value === entAssets)!;
  const entSupportRow  = ENT_SUPPORT.find(r => r.value === entSupport)!;
  const entImplRow     = ENT_IMPL.find(r => r.value === entImpl)!;
  const entModTotal    = ENT_MODULES.filter(m => entModules.includes(m.id)).reduce((s, m) => s + m.add, 0);
  const isCustomQuote  = ('custom' in entStaffRow && entStaffRow.custom) || ('custom' in entFacilityRow && entFacilityRow.custom);
  const entAnnualTotal = isCustomQuote ? null : ENT_BASE + entStaffRow.add + entFacilityRow.add + entSizeRow.add + entAssetsRow.add + entSupportRow.add + entModTotal;
  const entGrandTotal  = entAnnualTotal !== null ? entAnnualTotal + entImplRow.add : null;

  const handleEnterpriseCheckout = async () => {
    if (!entGrandTotal) return;
    setEntLoading(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lineItems: [{
            price_data: {
              currency: 'usd',
              unit_amount: entGrandTotal * 100,
              product_data: { name: 'Enterprise Platform — Nexum Suum FI (Custom Configuration)' },
            },
            quantity: 1,
          }],
          tier: 'enterprise',
          successUrl: `${window.location.origin}/welcome?tier=enterprise&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Enterprise checkout error:', err);
    } finally {
      setEntLoading(false);
    }
  };

  const activePlans =
    sector === 'facility'      ? FACILITY_PLANS :
    sector === 'retail'        ? RETAIL_PLANS :
    sector === 'property'      ? PROPERTY_PLANS :
    sector === 'entrepreneur'  ? ENTREPRENEUR_PLANS :
    GOVERNMENT_PLANS;

  const toggleAddon = (priceId: string) => {
    setSelectedAddons(prev =>
      prev.includes(priceId) ? prev.filter(id => id !== priceId) : [...prev, priceId]
    );
  };

  const handleCheckout = async (plan: Plan, effectivePriceId?: string) => {
    const priceId = effectivePriceId || plan.priceId;
    if (!priceId) return;
    setLoadingPlan(plan.name);
    try {
      const standardAddonItems =
        plan.name === 'Standard' && sector === 'facility'
          ? standardModuleAddons
              .map(id => STANDARD_MODULE_ADDONS.find(a => a.id === id))
              .filter(Boolean)
              .map(a => ({ price: a!.priceId, quantity: 1 }))
          : [];
      const lineItems = [
        { price: priceId, quantity: 1 },
        ...standardAddonItems,
        ...expansionLineItems,
        ...selectedAddons.map(id => ({ price: id, quantity: 1 })),
      ];
      const token = localStorage.getItem('nexum_access_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lineItems,
          tier: plan.name,
          successUrl: `${window.location.origin}/welcome?tier=${plan.name}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteSubmitting(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/enterprise-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(quoteForm),
      });
      setQuoteSuccess(true);
    } catch {
      setQuoteSuccess(true);
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const ctaBg = (plan: Plan) => {
    if (plan.name === 'Premium' || plan.name === 'Command Pro') return 'bg-purple-500 hover:bg-purple-600';
    if (plan.name === 'Business') return 'bg-orange-500 hover:bg-orange-600';
    if (plan.name === 'Retail Pro') return 'bg-emerald-600 hover:bg-emerald-700';
    if (plan.name === 'PM Professional') return 'bg-teal-600 hover:bg-teal-700';
    if (plan.name === 'Entrepreneur Pro') return 'bg-amber-600 hover:bg-amber-700';
    return '';
  };

  // Build expansion line items for checkout
  const expansionLineItems = EXPANSION_ADDONS
    .filter(a => a.sectors.includes(sector) && (expandQty[a.id] || 0) > 0)
    .map(a => ({ price: a.priceId, quantity: expandQty[a.id] }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg text-primary">Nexum Suum</span>
          <Badge variant="outline" className="text-xs">Facility Intelligence™</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign In</Button>
          <Button size="sm" onClick={() => window.open('https://www.nexumsuum.com/facility-intelligence', '_blank')}>Learn More</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge className="bg-primary/20 text-primary border-primary/30">Decision Defensibility™</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">Intelligence for Every Sector</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time monitoring, AI-powered insights, and comprehensive compliance tracking for facility, retail, and public safety operations.
          </p>
        </div>

        {/* Sector tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-border bg-card/50 p-1 gap-1">
            {([
              { value: 'facility'     as const, label: 'Facility',      icon: Building2 },
              { value: 'retail'       as const, label: 'Retail',         icon: ShoppingCart },
              { value: 'government'   as const, label: 'Government',     icon: Shield },
              { value: 'property'     as const, label: 'Property',       icon: Crown },
              { value: 'entrepreneur' as const, label: 'Entrepreneur',   icon: Flame },
            ]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSector(value)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all',
                  sector === value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Billing model note / retail toggle */}
        <div className="flex justify-center">
          {(sector === 'retail' || sector === 'property' || sector === 'entrepreneur') ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <span className={cn('text-sm font-medium', retailBilling === 'monthly' ? 'text-foreground' : 'text-muted-foreground')}>
                  Monthly
                </span>
                <button
                  onClick={() => setRetailBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors focus:outline-none',
                    retailBilling === 'annual' ? 'bg-green-500' : 'bg-muted'
                  )}
                >
                  <span className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                    retailBilling === 'annual' ? 'translate-x-7' : 'translate-x-1'
                  )} />
                </button>
                <span className={cn('text-sm font-medium', retailBilling === 'annual' ? 'text-foreground' : 'text-muted-foreground')}>
                  Annual
                </span>
                {retailBilling === 'annual' && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    2 months free
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              Annual license — billed once per year
            </Badge>
          )}
        </div>

        {/* Government credibility strip */}
        {sector === 'government' && (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 py-3 px-6 rounded-lg border border-blue-400/20 bg-blue-400/5 text-sm text-blue-300 font-medium">
            <span>MBE Certified</span>
            <span className="text-blue-400/30">·</span>
            <span>SAM.gov Registered</span>
            <span className="text-blue-400/30">·</span>
            <span>TWIC Cleared</span>
            <span className="text-blue-400/30">·</span>
            <span>NJ Licensed Stationary Engineer</span>
          </div>
        )}

        {/* Plan cards */}
        <div className={cn(
          'grid gap-6',
          sector === 'retail'
            ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto w-full'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        )}>
          {activePlans.map((plan) => {
            const Icon = plan.icon;
            const isRetail = sector === 'retail';
            const useAnnual = isRetail && retailBilling === 'annual';
            const effectivePrice   = useAnnual && plan.annualPrice   ? plan.annualPrice   : plan.price;
            const effectivePriceId = useAnnual && plan.annualPriceId ? plan.annualPriceId : plan.priceId;
            const effectiveLabel   = useAnnual ? '/yr' : plan.billingLabel;
            const annualSavings    = isRetail && plan.price ? plan.price * 2 : 0;

            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col border-2 ${plan.border} ${plan.bg} transition-all hover:scale-[1.02]`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={cn(
                      'text-white border-0 whitespace-nowrap',
                      plan.badge === 'Full Platform' ? 'bg-purple-500' :
                      plan.badge === 'Most Popular' ? 'bg-orange-500' :
                      plan.badge === 'Most Capable' ? 'bg-purple-500' :
                      plan.badge === 'Best Value' ? 'bg-emerald-600' :
                      plan.badge === 'Custom' ? 'bg-yellow-600' : 'bg-primary'
                    )}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4 pt-6">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${plan.bg} border ${plan.border}`}>
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {plan.annualLicense && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary shrink-0">
                        Annual License
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1">
                    {plan.isEnterprise ? (
                      <div>
                        <p className="text-2xl font-bold">Request Quote</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Tailored to your deployment</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">${effectivePrice!.toLocaleString()}</span>
                          <span className="text-muted-foreground text-sm">{effectiveLabel}</span>
                        </div>
                        {useAnnual && annualSavings > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">${plan.price!.toLocaleString()}/mo equivalent</span>
                            <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                              Save ${annualSavings.toLocaleString()}
                            </Badge>
                          </div>
                        )}
                        {!useAnnual && isRetail && annualSavings > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Annual: save ${annualSavings.toLocaleString()} (2 months free)
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-4">
                  <div className="space-y-2">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.color}`} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Standard facility add-ons */}
                  {plan.name === 'Standard' && sector === 'facility' && (
                    <div className="space-y-3 pt-3 border-t border-border/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Optional Module Add-ons
                      </p>
                      {STANDARD_MODULE_ADDONS.map(addon => {
                        const AddonIcon = addon.icon;
                        const selected = standardModuleAddons.includes(addon.id);
                        return (
                          <button
                            key={addon.id}
                            onClick={() => toggleStandardAddon(addon.id)}
                            className={cn(
                              'w-full text-left rounded-lg border p-3 transition-all',
                              selected
                                ? `${addon.border} ${addon.bg}`
                                : 'border-border/40 hover:border-border bg-transparent'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <AddonIcon className={`w-4 h-4 shrink-0 ${addon.color}`} />
                                <span className="text-sm font-medium">{addon.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-xs font-semibold ${addon.color}`}>
                                  +${addon.annualCost.toLocaleString()}/yr
                                </span>
                                <div className={cn(
                                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                                  selected ? `${addon.bg} ${addon.border}` : 'border-border/50'
                                )}>
                                  {selected && <Check className={`w-3 h-3 ${addon.color}`} />}
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 ml-6">{addon.description}</p>
                          </button>
                        );
                      })}
                      {standardAddonTotal > 0 && (
                        <div className="flex items-center justify-between pt-1 px-1">
                          <span className="text-xs text-muted-foreground">Updated total</span>
                          <span className="text-sm font-bold text-cyan-400">
                            ${(plan.price! + standardAddonTotal).toLocaleString()}/yr
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expansion add-ons — property / entrepreneur sectors */}
                  {(sector === 'property' || sector === 'entrepreneur') && (
                    <div className="space-y-3 pt-3 border-t border-border/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Scale Beyond Plan Limits
                      </p>
                      {EXPANSION_ADDONS.filter(a => a.sectors.includes(sector)).map(addon => {
                        const AIcon = addon.icon;
                        const qty = expandQty[addon.id] || 0;
                        return (
                          <div key={addon.id} className={cn('rounded-lg border p-3 space-y-2', addon.border, addon.bg)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AIcon className={`w-3.5 h-3.5 ${addon.color}`} />
                                <span className="text-xs font-medium">{addon.name}</span>
                              </div>
                              <span className={`text-xs font-semibold ${addon.color}`}>
                                ${addon.monthlyCost}/mo each
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setExpandQty(p => ({ ...p, [addon.id]: Math.max(0, (p[addon.id]||0) - 1) }))}
                                className="w-6 h-6 rounded border border-border/50 flex items-center justify-center text-sm hover:bg-muted/50">−</button>
                              <span className="text-sm font-medium w-6 text-center">{qty}</span>
                              <button onClick={() => setExpandQty(p => ({ ...p, [addon.id]: (p[addon.id]||0) + 1 }))}
                                className="w-6 h-6 rounded border border-border/50 flex items-center justify-center text-sm hover:bg-muted/50">+</button>
                              {qty > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  = +${(qty * addon.monthlyCost).toLocaleString()}/mo
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {expandTotal > 0 && (
                        <div className="flex items-center justify-between pt-1 px-1">
                          <span className="text-xs text-muted-foreground">Monthly total</span>
                          <span className="text-sm font-bold text-amber-400">
                            ${((effectivePrice || 0) + expandTotal).toLocaleString()}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {plan.isEnterprise ? (
                    <Button
                      variant="outline"
                      className="mt-auto w-full border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10"
                      onClick={() => document.getElementById('enterprise-quote')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Request Quote
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      className={`mt-auto w-full ${ctaBg(plan)}`}
                      onClick={() => handleCheckout(plan, effectivePriceId || undefined)}
                      disabled={loadingPlan === plan.name}
                    >
                      {loadingPlan === plan.name ? 'Redirecting...' : `Get ${plan.name}`}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Enterprise Configurator ── */}
        <div id="enterprise-quote" className="space-y-8">
          <div className="text-center">
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 mb-3">Enterprise</Badge>
            <h2 className="text-2xl font-bold">Build Your Enterprise Plan</h2>
            <p className="text-muted-foreground mt-1">
              Configure your deployment — see live pricing, then pay via Stripe or request an invoice.
            </p>
          </div>

          {quoteSuccess ? (
            <Card className="max-w-2xl mx-auto border-green-400/30 bg-green-400/5">
              <CardContent className="p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-green-400/20 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold">Quote Request Received</h3>
                <p className="text-muted-foreground">Our team will reach out within 1–2 business days with your invoice or Stripe payment link.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">

              {/* ── Left: configurator ── */}
              <div className="lg:col-span-2 space-y-5">

                {/* Staff */}
                <Card className="border-border/40">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />Staff / Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {ENT_STAFF.map(t => (
                      <button key={t.value} onClick={() => setEntStaff(t.value)}
                        className={cn('text-left px-3 py-2.5 rounded-lg border text-sm transition-all',
                          entStaff === t.value ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground')}>
                        <span className="font-medium block">{t.label}</span>
                        <span className="text-xs">{t.add === 0 ? ('custom' in t && t.custom ? 'Contact us' : 'Included') : `+$${t.add.toLocaleString()}/yr`}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Facilities */}
                <Card className="border-border/40">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />Facilities / Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {ENT_FACILITIES.map(t => (
                      <button key={t.value} onClick={() => setEntFacility(t.value)}
                        className={cn('text-left px-3 py-2.5 rounded-lg border text-sm transition-all',
                          entFacility === t.value ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground')}>
                        <span className="font-medium block">{t.label}</span>
                        <span className="text-xs">{t.add === 0 ? ('custom' in t && t.custom ? 'Contact us' : 'Included') : `+$${t.add.toLocaleString()}/yr`}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Building Size */}
                <Card className="border-border/40">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />Average Building Size
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ENT_SIZE.map(t => (
                      <button key={t.value} onClick={() => setEntSize(t.value)}
                        className={cn('text-left px-3 py-2.5 rounded-lg border text-sm transition-all',
                          entSize === t.value ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground')}>
                        <span className="font-medium block">{t.label}</span>
                        <span className="text-xs">{t.add === 0 ? 'Included' : `+$${t.add.toLocaleString()}/yr`}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Assets */}
                <Card className="border-border/40">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />Equipment / Asset Count
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ENT_ASSETS.map(t => (
                      <button key={t.value} onClick={() => setEntAssets(t.value)}
                        className={cn('text-left px-3 py-2.5 rounded-lg border text-sm transition-all',
                          entAssets === t.value ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground')}>
                        <span className="font-medium block">{t.label}</span>
                        <span className="text-xs">{t.add === 0 ? 'Included' : `+$${t.add.toLocaleString()}/yr`}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Modules */}
                <Card className="border-border/40">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary" />Add-on Modules
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 space-y-2">
                    {ENT_MODULES.map(m => {
                      const ModIcon = m.icon;
                      const on = entModules.includes(m.id);
                      return (
                        <button key={m.id} onClick={() => setEntModules(p => on ? p.filter(x => x !== m.id) : [...p, m.id])}
                          className={cn('w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all',
                            on ? 'border-primary/60 bg-primary/10' : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground')}>
                          <span className="flex items-center gap-2">
                            <ModIcon className={cn('w-4 h-4', on ? m.color : 'text-muted-foreground')} />
                            <span className={cn('font-medium', on && 'text-foreground')}>{m.label}</span>
                          </span>
                          <span className={cn('text-xs', on ? m.color : '')}>{on ? <Check className="w-3.5 h-3.5" /> : `+$${m.add.toLocaleString()}/yr`}</span>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Support + Implementation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="border-border/40">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-sm font-semibold">Support Tier</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 space-y-2">
                      {ENT_SUPPORT.map(t => (
                        <button key={t.value} onClick={() => setEntSupport(t.value)}
                          className={cn('w-full text-left px-3 py-2 rounded-lg border text-xs transition-all',
                            entSupport === t.value ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border')}>
                          {t.label}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-sm font-semibold">Implementation</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 space-y-2">
                      {ENT_IMPL.map(t => (
                        <button key={t.value} onClick={() => setEntImpl(t.value)}
                          className={cn('w-full text-left px-3 py-2 rounded-lg border text-xs transition-all',
                            entImpl === t.value ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border')}>
                          {t.label}
                          {t.add > 0 && <span className="ml-1 text-muted-foreground">(+${t.add.toLocaleString()} one-time)</span>}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Contact fields */}
                <Card className="border-border/40">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <form onSubmit={handleQuoteSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1"><label className="text-xs text-muted-foreground">Company Name *</label>
                          <Input required value={quoteForm.companyName} onChange={e => setQuoteForm(f => ({ ...f, companyName: e.target.value }))} placeholder="Acme Facilities" /></div>
                        <div className="space-y-1"><label className="text-xs text-muted-foreground">Contact Name *</label>
                          <Input required value={quoteForm.contactName} onChange={e => setQuoteForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Jane Smith" /></div>
                        <div className="space-y-1"><label className="text-xs text-muted-foreground">Email *</label>
                          <Input required type="email" value={quoteForm.email} onChange={e => setQuoteForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" /></div>
                        <div className="space-y-1"><label className="text-xs text-muted-foreground">Phone</label>
                          <Input value={quoteForm.phone} onChange={e => setQuoteForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" /></div>
                      </div>
                      <div className="space-y-1"><label className="text-xs text-muted-foreground">Organization Type</label>
                        <Select value={quoteForm.orgType} onValueChange={val => setQuoteForm(f => ({ ...f, orgType: val }))}>
                          <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facility">Facility Management</SelectItem>
                            <SelectItem value="retail">Retail / Food Service</SelectItem>
                            <SelectItem value="government">Government / Public Safety</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><label className="text-xs text-muted-foreground">Notes / Integration requirements</label>
                        <Textarea value={quoteForm.notes} onChange={e => setQuoteForm(f => ({ ...f, notes: e.target.value }))} placeholder="BMS system used, white-label needs, custom integrations..." rows={3} />
                      </div>
                      <Button type="submit" variant="outline" className="w-full border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10" disabled={quoteSubmitting}>
                        {quoteSubmitting ? 'Submitting...' : 'Request Invoice by Email'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* ── Right: live price summary ── */}
              <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-4">
                  <Card className="border-yellow-500/30 bg-yellow-500/5">
                    <CardHeader className="pt-5 pb-2 px-5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <CardTitle className="text-sm font-semibold text-yellow-300">Enterprise Summary</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 space-y-3">
                      {/* Breakdown rows */}
                      {[
                        { label: 'Premium Base (all features)',    amt: ENT_BASE },
                        { label: entStaffRow.label,               amt: entStaffRow.add },
                        { label: entFacilityRow.label,            amt: entFacilityRow.add },
                        { label: entSizeRow.label,                amt: entSizeRow.add },
                        { label: entAssetsRow.label,              amt: entAssetsRow.add },
                        { label: entSupportRow.label,             amt: entSupportRow.add },
                        ...ENT_MODULES.filter(m => entModules.includes(m.id)).map(m => ({ label: m.label, amt: m.add })),
                      ].map((row, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 text-xs">
                          <span className="text-muted-foreground leading-tight">{row.label}</span>
                          <span className={cn('shrink-0 font-medium', row.amt === 0 ? 'text-muted-foreground' : 'text-foreground')}>
                            {row.amt === 0 ? 'Included' : `$${row.amt.toLocaleString()}`}
                          </span>
                        </div>
                      ))}

                      {/* Implementation line */}
                      {entImplRow.add > 0 && (
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">{entImplRow.label} (one-time)</span>
                          <span className="shrink-0 font-medium">+${entImplRow.add.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="border-t border-yellow-500/20 pt-3 space-y-1">
                        {isCustomQuote ? (
                          <p className="text-sm text-yellow-400 font-semibold">Custom Quote Required</p>
                        ) : (
                          <>
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-muted-foreground">Annual platform fee</span>
                              <span className="font-bold text-lg text-yellow-300">${entAnnualTotal!.toLocaleString()}</span>
                            </div>
                            {entImplRow.add > 0 && (
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted-foreground">One-time implementation</span>
                                <span className="text-sm font-semibold">+${entImplRow.add.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex items-baseline justify-between pt-1 border-t border-yellow-500/20">
                              <span className="text-sm font-semibold">Grand Total</span>
                              <span className="font-bold text-xl text-yellow-300">${entGrandTotal!.toLocaleString()}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Enterprise features always included */}
                      <div className="pt-2 space-y-1">
                        {['Everything in Premium', 'BMS/CMMS integrations', 'White-label options', 'Custom SLA', 'On-site training available', 'Dedicated account manager'].map(f => (
                          <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Check className="w-3 h-3 text-yellow-400 shrink-0" />{f}
                          </div>
                        ))}
                      </div>

                      {/* CTAs */}
                      <div className="space-y-2 pt-2">
                        {!isCustomQuote && (
                          <Button
                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                            onClick={handleEnterpriseCheckout}
                            disabled={entLoading}
                          >
                            {entLoading ? 'Redirecting...' : `Pay $${entGrandTotal!.toLocaleString()} via Stripe`}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="w-full border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 text-sm"
                          onClick={() => document.querySelector<HTMLFormElement>('#ent-contact-form')?.requestSubmit()}
                        >
                          {isCustomQuote ? 'Request Custom Quote' : 'Request Invoice Instead'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Add-ons */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Add-ons & Services</h2>
            <p className="text-muted-foreground mt-1">Enhance your subscription with professional services and training</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADDONS.map((addon) => {
              const selected = selectedAddons.includes(addon.priceId);
              return (
                <Card key={addon.priceId} onClick={() => toggleAddon(addon.priceId)}
                  className={`cursor-pointer transition-all border-2 ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{addon.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{addon.desc}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold">${addon.price.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{addon.billing}</p>
                      {selected && <Badge className="text-xs bg-primary/20 text-primary mt-1">Added</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {selectedAddons.length > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {selectedAddons.length} add-on{selectedAddons.length > 1 ? 's' : ''} selected — will be included in checkout
            </p>
          )}
        </div>

        {/* Trust badges */}
        <div className="border-t border-border pt-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-sm text-muted-foreground">
          <div><p className="font-semibold text-foreground">MBE Certified</p><p>Minority Business Enterprise</p></div>
          <div><p className="font-semibold text-foreground">SAM.gov Registered</p><p>Federal contracting ready</p></div>
          <div><p className="font-semibold text-foreground">Nexum Suum™</p><p>Trademarked brand</p></div>
          <div><p className="font-semibold text-foreground">Secure Payments</p><p>Powered by Stripe</p></div>
        </div>
      </div>
    </div>
  );
}
