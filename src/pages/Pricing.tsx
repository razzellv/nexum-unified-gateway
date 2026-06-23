import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { IntakeFormWidget } from '@/components/intake/IntakeFormWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Check, Flame, Zap, Building2, Crown, ArrowRight, X,
  ShoppingCart, Shield, Star, Sparkles, Lock, Users, Package, Cpu, Wifi,
  HelpCircle, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Wrench,
  Phone, MapPin, FileText, TrendingUp,
  ClipboardCheck, BookOpen, BarChart3, MessageSquare,
  CheckCircle2, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SectorTab = 'facility' | 'retail' | 'government' | 'property' | 'entrepreneur' | 'service_tech';

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
    description: 'Full operational visibility for growing facilities. Includes inventory management, team coordination, and optional retail or government modules.',
    features: [
      'Up to 5 facilities',
      'Everything in Basic',
      'Vendor Hub',
      'Violations tracking',
      'Energy Dashboard',
      'Manager & Supervisor dashboards',
      'Inventory Library',
      '+ Retail Module add-on available ($2,500/yr)',
      '+ Govt Module add-on available ($4,000/yr)',
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
    description: 'Multi-site intelligence for complex operations. Advanced analytics, AI compliance, and the full decision-defense layer.',
    features: [
      'Up to 15 facilities',
      'Everything in Standard',
      'Executive Dashboard',
      'Multi-facility analytics',
      'Compliance Analyzer AI',
      'Staff Performance Compass',
      'Command Hub (full)',
      'System Violations™ lifecycle',
      'Facility Memory™',
      'Event Integrity™',
      'Drift Intelligence™',
      'Operation Center',
      'Phone + email support',
    ],
  },
  {
    name: 'Prestige',
    priceId: 'price_1TAbPLDfw4bOR2dfeT4Posk4',
    price: 83988,
    billingLabel: '/yr',
    annualLicense: true,
    icon: Crown,
    color: 'text-amber-400',
    border: 'border-amber-400/40',
    bg: 'bg-amber-400/5',
    badge: 'Full Platform',
    description: 'The complete Nexum Prestige platform — every intelligence engine, the full Prestige Intelligence™ suite, and the Decision Continuity™ layer.',
    features: [
      'Unlimited facilities',
      'Everything in Business',
      '── Prestige Intelligence™ Suite ──',
      'Decision Continuity™ Vault',
      'Decision Outcome Tracking™',
      'Continuity Intelligence™',
      'Scope Alignment™ Intelligence',
      'Admissibility Engine™',
      'Operational DNA™',
      'VVFI Facility Instructor AI',
      'OVPI Performance Intelligence',
      'Optimize & Learn LMS',
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
    description: 'Multi-location retail intelligence with supplier management, PO/RFP tracking, and waste analytics. Built for operators managing 2–3 locations.',
    features: [
      'Everything in Starter',
      'Multi-location (up to 3)',
      'Purchase orders & RFP management',
      'Supplier directory & scoring',
      'Waste & shrink tracking',
      'Light equipment log (fridges, fryers, HVAC)',
      'Basic work orders',
      'Compliance document storage',
      'Manager dashboard · 10 users',
      'Own the building? → Facility Standard + Retail Module',
    ],
  },
];

// ── SERVICE TECH — monthly + annual ──────────────────────────────────────────
// price_1TQNVoDfw4bOR2dfHDuSpXP7  → $397/mo   price_1TQNPhDfw4bOR2df7oxLjDSC → $3,970/yr
// price_1TQNT8Dfw4bOR2dfpxNZFoog  → $797/mo   price_1TQNQoDfw4bOR2df5jGaOyLW → $7,970/yr
const SERVICE_TECH_PLANS: Plan[] = [
  {
    name: 'Service Tech Starter',
    priceId: 'price_1TQNVoDfw4bOR2dfHDuSpXP7',
    price: 397,
    billingLabel: '/mo',
    annualPriceId: 'price_1TQNPhDfw4bOR2df7oxLjDSC',
    annualPrice: 3970,
    icon: Zap,
    color: 'text-orange-400',
    border: 'border-orange-400/30',
    bg: 'bg-orange-400/5',
    badge: null,
    description: 'Field operations intelligence for HVAC, mechanical, and facilities service companies. Dispatch, work orders, and client site management in one place.',
    features: [
      'Service dispatch board',
      'Technician status grid',
      'Work order management',
      'Client site tracking',
      'Vendor + contractor directory',
      'Job completion tracking',
      '2 months free on annual',
      '1 dispatch office · up to 5 techs',
    ],
  },
  {
    name: 'Service Tech Pro',
    priceId: 'price_1TQNT8Dfw4bOR2dfpxNZFoog',
    price: 797,
    billingLabel: '/mo',
    annualPriceId: 'price_1TQNQoDfw4bOR2df5jGaOyLW',
    annualPrice: 7970,
    icon: Star,
    color: 'text-amber-400',
    border: 'border-amber-400/40',
    bg: 'bg-amber-400/5',
    badge: 'Best Value',
    description: 'Full service intelligence with analytics, vendor performance tracking, and multi-client management. Built for growing service companies.',
    features: [
      'Everything in Starter',
      'Service analytics dashboard',
      'Vendor performance scoring',
      'Completion rate + on-time tracking',
      'Response time + recurring issue flags',
      'Multi-client management',
      'Revenue by service type',
      'Tech performance reports',
      '2 months free on annual',
      'Up to 20 technicians',
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
    description: 'Core tools for public safety departments and municipal agencies. Apparatus tracking, personnel certifications, and government infrastructure assessment.',
    features: [
      '── Public Safety Operations',
      'Apparatus / fleet tracking',
      'Personnel certifications',
      'Chain of custody logging',
      'Equipment inventory',
      'Work orders',
      'Compliance logging',
      '1 department · 15 users',
      '── Government Intelligence™',
      'Government Readiness Assessment',
      'Infrastructure Continuity scoring',
      'Deferred Maintenance tracker',
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
    description: 'Advanced response metrics, multi-unit coordination, and expanded government intelligence including knowledge preservation and capital planning.',
    features: [
      'Everything in Command Basic',
      '── Public Safety',
      'Response metrics (NFPA 1710)',
      'Weapons + uniform inventory',
      'Compliance reporting',
      'Multi-unit (up to 5)',
      '30 users',
      '── Government Intelligence™',
      'Knowledge Preservation™ module',
      'Capital Planning Intelligence™',
      'Emergency Ops Intelligence™',
      'Public Works Intelligence™',
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
    description: 'Full platform for large public safety agencies and government organizations. Complete Government Intelligence™ suite, AI compliance, and decision continuity.',
    features: [
      'Everything in Command Standard',
      '── Full Government Intelligence™',
      'Government Readiness Index™',
      'Decision Continuity Registry™',
      'Environmental Intelligence™',
      'Government PMO™ (6-phase)',
      'Workforce Continuity tracking',
      '── Advanced Operations',
      'AI compliance analysis',
      'Unlimited units',
      'Full Command Hub',
      'Decision Continuity™ Vault',
      'Scope Alignment™ Intelligence',
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
    description: 'Custom pricing for statewide, multi-agency, or federal deployments. Full white-label, BMS/SCADA integrations, and dedicated operational continuity support.',
    features: [
      'Everything in Command Pro',
      '── Enterprise Scale',
      'Multi-agency deployment',
      'White-label options',
      'BMS / SCADA integration',
      'Custom integrations',
      'Dedicated SLA',
      'On-site training & assessment',
      'Custom contract',
      '── Joint Programs',
      'IFRA™ Integrated Risk Assessment',
      'CIIP™ Continuity Intelligence',
      'OC3™ Certification eligible',
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
    priceId: 'price_1TLy9hDfw4bOR2dfKDfJqMi5',
    price: 197,
    billingLabel: '/mo',
    annualPriceId: 'price_1TLyB6Dfw4bOR2dfJmP2VMZQ',
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
    priceId: 'price_1TLyAVDfw4bOR2dfn8EsqhfC',
    price: 397,
    billingLabel: '/mo',
    annualPriceId: 'price_1TLyBlDfw4bOR2dfzqiQ3nzY',
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
    priceId: 'price_1TLyEEDfw4bOR2dfEaLVfg4j',
    price: 600,
    billingLabel: '/mo',
    annualPriceId: 'price_1TLyFDDfw4bOR2df6Uzj2mRA',
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
    priceId: 'price_1TLyG8Dfw4bOR2df6w0och3C',
    price: 849,
    billingLabel: '/mo',
    annualPriceId: 'price_1TLyH2Dfw4bOR2dfGhLRooKE',
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
    priceId: 'price_1TLyIRDfw4bOR2dfwJAxycnZ',
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
    priceId: 'price_1TLyJvDfw4bOR2dfcpIZTt2Y',
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
    priceId: 'price_1TLyKrDfw4bOR2df79hMyIto',
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
  // ── Secure Storage Add-ons ───────────────────────────────────────────────────
  { name: 'Additional Storage — 50 GB',  price: 29,    priceId: 'price_1TZHU5Dfw4bOR2df0NA7V6Sn', desc: '+50 GB encrypted S3 document & media storage', billing: '/mo', category: 'storage' },
  { name: 'Additional Storage — 200 GB', price: 49,    priceId: 'price_1TZHV1Dfw4bOR2df1nXbVcJs', desc: '+200 GB encrypted S3 document & media storage', billing: '/mo', category: 'storage' },
  { name: 'Additional Storage — 1 TB',   price: 149,   priceId: 'price_1TZHVNDfw4bOR2dfeAno93a4', desc: '+1 TB encrypted S3 document & media storage', billing: '/mo', category: 'storage' },
  // ── Asset Expansion Add-ons ──────────────────────────────────────────────────
  { name: 'Asset Expansion — 500–2K',    price: 4000,  priceId: 'price_1TZHXJDfw4bOR2dfx1WHANSc', desc: 'Expand tracked assets from base plan limit to 2,000', billing: '/yr', category: 'assets' },
  { name: 'Asset Expansion — 2K–10K',   price: 10000, priceId: 'price_1TZHXtDfw4bOR2dfnXlUcgME', desc: 'Expand tracked assets up to 10,000', billing: '/yr', category: 'assets' },
  { name: 'Asset Expansion — 10K+',     price: 20000, priceId: 'price_1TZHYWDfw4bOR2dfhQBgYGp5', desc: 'Unlimited asset tracking for enterprise-scale facilities', billing: '/yr', category: 'assets' },
  // ── Professional Services ────────────────────────────────────────────────────
  { name: 'FI Platform Implementation',  price: 4999,  priceId: 'price_1TAbl7Dfw4bOR2dfSxKwaYdP', desc: 'White-glove onboarding and setup', billing: 'one-time', category: 'services' },
  { name: 'FI Enterprise Support',       price: 10000, priceId: 'price_1TAbiWDfw4bOR2dfrBMHzuqV', desc: 'Dedicated support SLA', billing: '/yr', category: 'services' },
  { name: 'FI Priority Support',         price: 3000,  priceId: 'price_1TAbhqDfw4bOR2dfM0FNrTlF', desc: 'Priority response guarantee', billing: '/yr', category: 'services' },
  // ── Training Packages ────────────────────────────────────────────────────────
  { name: 'Training — Small Team (1–10)',     price: 1500, priceId: 'price_1TAbVLDfw4bOR2dfHMCBek1G', desc: 'Team training package', billing: 'one-time', category: 'training' },
  { name: 'Training — Department (11–25)',    price: 3500, priceId: 'price_1TAbWXDfw4bOR2dfeb5UqZHy', desc: 'Department training package', billing: 'one-time', category: 'training' },
  { name: 'Training — Operations (26–50)',    price: 6500, priceId: 'price_1TAbXhDfw4bOR2dfXVyOvlJe', desc: 'Operations training package', billing: 'one-time', category: 'training' },
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
  { id: 'mod_retail', label: 'Retail Module',          add: 2500, priceId: 'price_1TLs9PDfw4bOR2dfka4QxilT', icon: ShoppingCart, color: 'text-green-400' },
  { id: 'mod_govt',   label: 'Government Module',       add: 4000, priceId: 'price_1TLs9wDfw4bOR2dfpXlMi0iw', icon: Shield,       color: 'text-blue-400' },
  { id: 'mod_bms',    label: 'BMS / CMMS Integration',  add: 8000, priceId: 'price_1TZHakDfw4bOR2dfbVqEUQRY', icon: Wifi,         color: 'text-cyan-400' },
] as const;

// ── Licensing Guide Modal ─────────────────────────────────────────────────────

const LICENSING_PATHS = [
  {
    id: 'retail_operator',
    sectors: ['retail'] as SectorTab[],
    emoji: '🏪',
    title: 'Retail Operator',
    subtitle: 'Leases space — runs the business, not the building',
    color: 'border-green-500/40 bg-green-500/5',
    badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
    features: ['Inventory tracking', 'Temperature & compliance logs', 'Daily open/close checklists', 'Vendor coordination', 'Waste & shrink tracking'],
    plan: 'Retail Pro ($297/mo)',
    planNote: 'No facility system management needed.',
  },
  {
    id: 'owner_franchise',
    sectors: ['facility'] as SectorTab[],
    emoji: '🏢',
    title: 'Owner / Franchise',
    subtitle: 'Operates AND is responsible for building systems',
    color: 'border-cyan-500/40 bg-cyan-500/5',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    features: ['Full equipment intelligence', 'Energy & performance dashboards', 'BMS / system integrations', 'Compliance risk tracking', 'Retail operations tools included'],
    plan: 'Facility Standard + Retail Module',
    planNote: 'Full-stack for retailers who manage the building.',
  },
  {
    id: 'multi_site',
    sectors: ['facility'] as SectorTab[],
    emoji: '🏬',
    title: 'Multi-Site Operator',
    subtitle: 'Manages multiple locations or properties',
    color: 'border-orange-500/40 bg-orange-500/5',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    features: ['Cross-site analytics', 'Portfolio-level performance tracking', 'Centralized compliance + operations', 'Multi-user accountability', 'Unified equipment intelligence'],
    plan: 'Facility Business + Retail Module',
    planNote: 'Best for 3–15 locations with shared oversight.',
  },
  {
    id: 'government',
    sectors: ['government'] as SectorTab[],
    emoji: '🛡️',
    title: 'Government / Public Safety',
    subtitle: 'Municipal, county, state, federal agencies, and public safety operations',
    color: 'border-blue-500/40 bg-blue-500/5',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    features: ['Apparatus & fleet tracking', 'Personnel certifications', 'Chain of custody logging', 'NFPA 1710 response metrics', 'Government Readiness Index™', 'Knowledge Preservation™', 'Capital Planning Intelligence™', 'Emergency Ops Intelligence™', 'Decision Continuity Registry™', 'Government PMO™'],
    plan: 'Command Basic → Standard → Pro',
    planNote: 'Scale from one department to a full multi-agency or statewide deployment.',
  },
  {
    id: 'property',
    sectors: ['property'] as SectorTab[],
    emoji: '🏘️',
    title: 'Property Manager',
    subtitle: 'Manages residential or commercial rental portfolios',
    color: 'border-teal-500/40 bg-teal-500/5',
    badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    features: ['Multi-property asset library', 'Fleet & vehicle tracking', 'Maintenance logs & reminders', 'NOI impact analysis', 'Tenant-facing compliance records', 'CSV import for properties & assets'],
    plan: 'PM Starter ($197/mo) or PM Professional ($397/mo)',
    planNote: 'Scale with expansion add-ons per property or vehicle.',
  },
  {
    id: 'entrepreneur',
    sectors: ['entrepreneur'] as SectorTab[],
    emoji: '🚀',
    title: 'Entrepreneur',
    subtitle: 'Stores + buildings + fleet — the full portfolio',
    color: 'border-amber-500/40 bg-amber-500/5',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    features: ['Full operational ecosystem', 'Retail + facility + asset intelligence', 'Fleet management (car lots, delivery, rental)', 'Multi-site benchmarking', 'Compliance across all verticals', 'Scalable with per-unit expansion add-ons'],
    plan: 'Entrepreneur ($600/mo) or Entrepreneur Pro ($849/mo)',
    planNote: 'Built for 2–5 stores, mixed property portfolio, and fleet.',
  },
];

function LicensingGuideModal({ open, onClose, activeSector }: {
  open: boolean; onClose: () => void; activeSector: SectorTab;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            How Licensing Works — Choose the Right Path
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Nexum Suum is designed to match how you operate — whether you run a store, manage a building, or oversee an entire portfolio.
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {LICENSING_PATHS.map(path => {
            const isRecommended = path.sectors.includes(activeSector);
            return (
              <div
                key={path.id}
                className={cn(
                  'rounded-xl border-2 p-4 transition-all',
                  isRecommended ? path.color + ' ring-1 ring-primary/30' : 'border-border/30 bg-muted/5 opacity-75'
                )}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{path.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{path.title}</h3>
                        {isRecommended && (
                          <Badge className={cn('text-[10px] border', path.badgeColor)}>
                            Recommended for your sector
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{path.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">{path.plan}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{path.planNote}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {path.features.map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-green-400 shrink-0" />{f}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upgrade path */}
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Upgrade Path — No Confusion</p>
          </div>
          <p className="text-xs text-muted-foreground">You can start simple and upgrade anytime. Your data and tools carry over — no need to restart or reconfigure.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              'Retail Pro → Facility Standard (when you start managing equipment)',
              'PM Starter → PM Professional (as portfolio grows)',
              'Entrepreneur → Enterprise (multi-agency or custom deployment)',
            ].map(step => (
              <div key={step} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-full border border-border/30">
                <ChevronRight className="w-3 h-3 text-primary shrink-0" />{step}
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">Important</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              If you own or are responsible for building systems (HVAC, refrigeration, electrical, energy), Retail Pro alone is not sufficient.
              Facility Intelligence is available in <strong className="text-foreground">Facility Standard and above</strong>.
            </p>
          </div>
        </div>

        {/* Quick rule + CTAs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {[
            { label: 'Leasing space?', rec: 'Retail Pro' },
            { label: 'Own/manage systems?', rec: 'Facility Standard+' },
            { label: 'Multiple sites?', rec: 'Business' },
            { label: 'Scaling everything?', rec: 'Entrepreneur' },
          ].map(r => (
            <div key={r.label} className="text-center p-3 rounded-lg border border-border/30 bg-muted/10">
              <p className="text-[10px] text-muted-foreground">{r.label}</p>
              <p className="text-xs font-semibold text-primary mt-1">→ {r.rec}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button className="flex-1" onClick={onClose}>
            Choose a Plan <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => window.open('https://www.nexumsuum.com', '_blank', 'noopener,noreferrer')}>
            Visit nexumsuum.com <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Pilot Program Modal ───────────────────────────────────────────────────────
const PILOT_SPOTS_TOTAL = 10;

function PilotModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stage, setStage] = useState<'overview' | 'apply' | 'submitted' | 'verify'>('overview');
  const [applying, setApplying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [supportAddon, setSupportAddon] = useState<'' | 'priority' | 'enterprise'>('');
  const [form, setForm] = useState({
    name: '', company: '', email: '', role: '', facilities: '', useCase: '',
  });
  const [code, setCode] = useState('');
  const [codeEmail, setCodeEmail] = useState('');

  const spotsLeft = (() => {
    try { return PILOT_SPOTS_TOTAL - parseInt(localStorage.getItem('nexum_pilot_apps') || '0'); }
    catch { return PILOT_SPOTS_TOTAL; }
  })();

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    try {
      const token = localStorage.getItem('nexum_access_token');
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/pilot-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          tier: 'Business',
          promoId: 'promo_1TM6yrDfw4bOR2dfq1igLbG1',
          supportAddon: supportAddon || null,
          agreedToResponsibilities: true,
        }),
      });
      const cur = parseInt(localStorage.getItem('nexum_pilot_apps') || '0');
      localStorage.setItem('nexum_pilot_apps', String(cur + 1));
      setStage('submitted');
    } catch (err: any) {
      toast({
        title: 'Submission failed',
        description: err?.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
      setStage('form');
    } finally {
      setApplying(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setVerifyError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/pilot-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), email: codeEmail.trim() }),
      });
      const data = await response.json();
      if (data.valid) {
        localStorage.setItem('nexum_pilot_approved', 'true');
        localStorage.setItem('nexum_pilot_code', code.trim().toUpperCase());
        onClose();
        // If already logged in go straight to onboarding; otherwise register first
        const token = localStorage.getItem('nexum_access_token');
        navigate(token ? '/onboarding?pilot=true' : '/register?pilot=true');
      } else {
        setVerifyError(data.message || 'Invalid code or email. Please check your approval email and try again.');
      }
    } catch {
      setVerifyError('Unable to verify — please check your connection and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setStage('overview');
    setForm({ name: '', company: '', email: '', role: '', facilities: '', useCase: '' });
    setCode(''); setCodeEmail(''); setVerifyError('');
    setAgreed(false); setSupportAddon('');
    onClose();
  };

  const PILOT_RESPONSIBILITIES = [
    { icon: '🔁', label: 'Monthly feedback check-in', desc: 'Short structured update on what\'s working and what isn\'t — via email or a 15-min call.' },
    { icon: '🐛', label: 'Bug & error reporting', desc: 'Report issues as they occur with enough detail to reproduce. We\'ll respond within 1 business day.' },
    { icon: '💡', label: 'Feature input', desc: 'Participate in improvement cycles — vote on roadmap priorities and test new features before general release.' },
    { icon: '📋', label: 'Use case documentation', desc: 'Help us document your real-world setup as an anonymized case study (with your approval).' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <span className="text-xl">🚀</span> Nexum Suum Business Pilot Program
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {spotsLeft > 0
              ? <><span className="font-semibold text-orange-400">{spotsLeft} of {PILOT_SPOTS_TOTAL} spots remaining</span> — full Business access, free for approved partners.</>
              : 'Applications are under review. Check back soon.'}
          </p>
        </DialogHeader>

        {/* Spots bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Spots filled</span><span>{PILOT_SPOTS_TOTAL - spotsLeft}/{PILOT_SPOTS_TOTAL}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all"
              style={{ width: `${((PILOT_SPOTS_TOTAL - spotsLeft) / PILOT_SPOTS_TOTAL) * 100}%` }} />
          </div>
        </div>

        {/* ── Stage: Overview ── */}
        {stage === 'overview' && (
          <div className="space-y-4 mt-1">
            {/* What you get */}
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-orange-400">What pilot partners receive</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {['Full Business tier access', 'Up to 15 facilities', 'Executive Dashboard', 'Compliance Analyzer AI', 'Multi-facility analytics', 'Command Hub (full)', 'Staff Performance Compass', 'All future Business features'].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-orange-400 shrink-0" />{f}
                  </div>
                ))}
              </div>
            </div>

            {/* Responsibilities */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Pilot Partner Responsibilities</p>
              <p className="text-xs text-muted-foreground">This is a working partnership. In exchange for free access, pilot partners commit to:</p>
              <div className="space-y-2">
                {PILOT_RESPONSIBILITIES.map(r => (
                  <div key={r.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-muted/5">
                    <span className="text-base shrink-0">{r.icon}</span>
                    <div>
                      <p className="text-xs font-semibold">{r.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Support add-on notice */}
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-300">Support is not included</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    The pilot covers full platform access. Dedicated support remains an optional add-on —
                    community channels and bug reporting are always available at no cost.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Add support to your pilot (optional)</p>
                {[
                  { id: 'priority' as const, label: 'Priority Support', price: '$3,000/yr', desc: 'Priority response SLA — issues addressed within 4 business hours.' },
                  { id: 'enterprise' as const, label: 'Enterprise Support', price: '$10,000/yr', desc: 'Dedicated support contact + same-day response + quarterly account review.' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setSupportAddon(s => s === opt.id ? '' : opt.id)}
                    className={cn('w-full text-left rounded-lg border p-3 text-xs transition-all',
                      supportAddon === opt.id ? 'border-yellow-400/50 bg-yellow-400/10' : 'border-border/30 hover:border-border bg-transparent')}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{opt.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 font-semibold">{opt.price}</span>
                        <div className={cn('w-4 h-4 rounded border flex items-center justify-center',
                          supportAddon === opt.id ? 'border-yellow-400 bg-yellow-400/20' : 'border-border/50')}>
                          {supportAddon === opt.id && <Check className="w-2.5 h-2.5 text-yellow-400" />}
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full bg-orange-500 hover:bg-orange-400 text-white" onClick={() => setStage('apply')} disabled={spotsLeft <= 0}>
              Continue to Application <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button onClick={() => setStage('verify')} className="w-full text-xs text-muted-foreground hover:text-primary transition-colors text-center">
              Already have an approval code? Activate here →
            </button>
          </div>
        )}

        {/* ── Stage: Apply ── */}
        {stage === 'apply' && (
          <form onSubmit={handleApply} className="space-y-3 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Full Name *</label>
                <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Company *</label>
                <Input required value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Facilities" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Email *</label>
                <Input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Your Role *</label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facility_manager">Facility Manager</SelectItem>
                    <SelectItem value="operations_director">Operations Director</SelectItem>
                    <SelectItem value="facilities_director">Facilities Director</SelectItem>
                    <SelectItem value="campus_operations">Campus / University Operations</SelectItem>
                    <SelectItem value="property_owner">Property Owner</SelectItem>
                    <SelectItem value="retail_owner">Retail Owner/Operator</SelectItem>
                    <SelectItem value="chief_engineer">Chief Engineer</SelectItem>
                    <SelectItem value="maintenance_supervisor">Maintenance Supervisor</SelectItem>
                    <SelectItem value="it_admin">IT / Systems Admin</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs text-muted-foreground">No. of Facilities</label>
                <Input value={form.facilities} onChange={e => setForm(f => ({ ...f, facilities: e.target.value }))} placeholder="e.g. 3" className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">What are you hoping to solve? *</label>
              <Textarea required value={form.useCase} onChange={e => setForm(f => ({ ...f, useCase: e.target.value }))}
                placeholder="Describe your current challenge — equipment tracking, compliance, multi-site visibility..." rows={3} className="text-sm resize-none" />
            </div>

            {/* Responsibility acknowledgment */}
            <button type="button" onClick={() => setAgreed(a => !a)}
              className={cn('w-full text-left flex items-start gap-3 rounded-lg border p-3 text-xs transition-all',
                agreed ? 'border-orange-400/40 bg-orange-400/5' : 'border-border/40 hover:border-border')}>
              <div className={cn('shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors',
                agreed ? 'border-orange-400 bg-orange-400/20' : 'border-border/50')}>
                {agreed && <Check className="w-2.5 h-2.5 text-orange-400" />}
              </div>
              <span className="text-muted-foreground">
                I understand that pilot access comes with responsibilities — monthly feedback check-ins, bug reporting,
                and feature input — and that <strong className="text-foreground">support is not included</strong> unless separately added.
              </span>
            </button>

            {supportAddon && (
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted-foreground">Support add-on selected:</span>
                <span className="font-semibold text-yellow-400">
                  {supportAddon === 'priority' ? 'Priority Support +$3,000/yr' : 'Enterprise Support +$10,000/yr'}
                </span>
              </div>
            )}

            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-muted-foreground">
              <strong className="text-orange-400">What happens next:</strong> Your application is reviewed within 1–2 business days.
              If approved, you'll receive an email with an access code to activate your Business account and begin onboarding.
              {supportAddon && ' A separate invoice will be sent for your selected support tier.'}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStage('overview')}>← Back</Button>
              <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-400 text-white" disabled={applying || !agreed || spotsLeft <= 0}>
                {applying ? 'Submitting...' : 'Apply for Pilot Access'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        )}

        {stage === 'submitted' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-400/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Application Submitted</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We'll review your application and email you within <strong>1–2 business days</strong>.
                If approved, you'll receive an access code to activate your Business account.
                {supportAddon && <><br /><span className="text-yellow-400">A support invoice will follow separately.</span></>}
              </p>
            </div>
            <button onClick={() => setStage('verify')} className="text-xs text-primary hover:underline">
              Already received your code? Activate here →
            </button>
            <Button variant="outline" className="w-full" onClick={handleClose}>Close</Button>
          </div>
        )}

        {stage === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-3 mt-1">
            <p className="text-sm text-muted-foreground">
              Enter the approval code from your email to activate your free Business account and begin onboarding.
            </p>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email address used to apply *</label>
              <Input required type="email" value={codeEmail} onChange={e => setCodeEmail(e.target.value)} placeholder="jane@company.com" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Approval Code *</label>
              <Input
                required value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. PILOT-XXXX-XXXX"
                className="h-9 text-sm font-mono tracking-widest"
                maxLength={20}
              />
            </div>
            {verifyError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{verifyError}</p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStage('apply')}>← Back</Button>
              <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-400 text-white" disabled={verifying}>
                {verifying ? 'Verifying...' : 'Activate Account'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const [sector, setSector] = useState<SectorTab>('facility');
  const [retailBilling, setRetailBilling] = useState<'monthly' | 'annual'>('monthly');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showLicensingGuide, setShowLicensingGuide] = useState(false);
  const [showPilot, setShowPilot] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    estimatedLocations: '',
    teamSize: '',
    estimatedEquipment: '',
    estimatedInventoryItems: '',
    historicalDataYears: '',
    complianceDocsCount: '',
    orgType: '',
    notes: '',
  });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  // ── Request-based consulting modals ──────────────────────────────────────────
  const [consultModal, setConsultModal] = useState<'stormwater' | 'tier2' | 'bundle' | 'blueprint' | null>(null);
  const [consultForm, setConsultForm] = useState<Record<string, string>>({});
  const [consultSubmitting, setConsultSubmitting] = useState(false);
  const [consultSuccess, setConsultSuccess] = useState<string | null>(null);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', org: '', facilityType: '', concern: '', referral: '' });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [engageDialog, setEngageDialog] = useState<{ open: boolean; stage: string }>({ open: false, stage: '' });
  const [engageForm, setEngageForm] = useState({ name: '', email: '', org: '', facilityType: '', concern: '', expectations: '', referral: '' });
  const [engageSubmitting, setEngageSubmitting] = useState(false);
  const [engageSuccess, setEngageSuccess] = useState(false);
  const [engageLoading, setEngageLoading] = useState<string | null>(null);
  // On-Site Engagements expand/collapse + inline inquiry
  const [onsiteExpanded, setOnsiteExpanded] = useState<string | null>(null);
  const [onsiteForm, setOnsiteForm] = useState<Record<string, { name: string; email: string; org: string; message: string }>>({});
  const [onsiteSubmitted, setOnsiteSubmitted] = useState<Set<string>>(new Set());
  const [onsiteSubmitting, setOnsiteSubmitting] = useState<string | null>(null);
  // Professional Services Proposal Calculator
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalLicense, setProposalLicense] = useState<string>('none');
  const [proposalServices, setProposalServices] = useState<Record<string, boolean>>({});
  const [proposalTravel, setProposalTravel] = useState<string>('none');
  const [proposalSupport, setProposalSupport] = useState<string>('standard');
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
    sector === 'service_tech'  ? SERVICE_TECH_PLANS :
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

    // If user is not logged in, pay first then create account
    const token = localStorage.getItem('nexum_access_token');
    if (!token) {
      setLoadingPlan(plan.name);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stripe/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineItems: [{ price: priceId, quantity: 1 }],
            tier: plan.name,
            allowPromotionCodes: true,
            successUrl: `${window.location.origin}/register?plan=${encodeURIComponent(plan.name)}&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/pricing`,
          }),
        });
        const data = await res.json();
        if (data.url) { window.location.href = data.url; return; }
      } catch { /* fall through */ } finally {
        setLoadingPlan(null);
      }
      // Stripe failed — fall back to register with pending plan
      localStorage.setItem('nexum_pending_plan',     plan.name);
      localStorage.setItem('nexum_pending_price_id', priceId);
      navigate(`/register?plan=${encodeURIComponent(plan.name)}&priceId=${encodeURIComponent(priceId)}`);
      return;
    }

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
          allowPromotionCodes: true,
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

  // ── Consulting service handlers ───────────────────────────────────────────────
  const openConsultModal = (svc: 'stormwater' | 'tier2' | 'bundle' | 'blueprint') => {
    setConsultForm({});
    setConsultSuccess(null);
    setConsultModal(svc);
  };
  const submitConsulting = async (service: string, successMsg: string, e: React.FormEvent) => {
    e.preventDefault();
    setConsultSubmitting(true);
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, ...consultForm }),
      });
    } catch { /* swallow — success message still shown */ }
    setConsultSuccess(successMsg);
    setConsultSubmitting(false);
  };
  const submitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySubmitting(true);
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'general_inquiry', ...inquiryForm }),
      });
    } catch { /* swallow */ }
    setInquirySuccess(true);
    setInquirySubmitting(false);
  };

  const handleEngagementCheckout = async (priceId: string, label?: string, mode: 'payment' | 'subscription' = 'subscription') => {
    setEngageLoading(priceId);
    try {
      const token = localStorage.getItem('nexum_access_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lineItems: [{ price: priceId, quantity: 1 }],
          tier: label || 'consulting',
          mode,
          allowPromotionCodes: false,
          successUrl: `${window.location.origin}/welcome?service=${encodeURIComponent(label || 'consulting')}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: 'Checkout error', description: data.error || 'Could not start checkout. Please try again.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Checkout error', description: err?.message || 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setEngageLoading(null);
    }
  };

  const openEngage = (stage: string) => {
    setEngageForm({ name: '', email: '', org: '', facilityType: '', concern: '', expectations: '', referral: '' });
    setEngageSuccess(false);
    setEngageDialog({ open: true, stage });
  };

  const submitEngage = async (e: React.FormEvent) => {
    e.preventDefault();
    setEngageSubmitting(true);
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: engageDialog.stage || 'general_inquiry', ...engageForm }),
      });
    } catch { /* swallow */ }
    setEngageSuccess(true);
    setEngageSubmitting(false);
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
          <Button variant="outline" size="sm" onClick={() => navigate('/register')}>Create Account</Button>
          <Button size="sm" onClick={() => setShowLicensingGuide(true)}>Learn More</Button>
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

        {/* Licensing Guide Modal */}
        <LicensingGuideModal
          open={showLicensingGuide}
          onClose={() => setShowLicensingGuide(false)}
          activeSector={sector}
        />

        {/* Pilot Program Modal */}
        <PilotModal open={showPilot} onClose={() => setShowPilot(false)} />

        {/* ── Unified Engagement Dialog ─────────────────────────────────────── */}
        <Dialog open={engageDialog.open} onOpenChange={open => !open && setEngageDialog(d => ({ ...d, open: false }))}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-base">
                {engageDialog.stage ? `Start with ${engageDialog.stage}` : 'Engagement Inquiry'}
              </DialogTitle>
            </DialogHeader>
            {engageSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="font-semibold">Inquiry received!</p>
                <p className="text-sm text-muted-foreground">We'll reach out within 1 business day to discuss next steps.</p>
                <Button variant="outline" className="w-full" onClick={() => setEngageDialog(d => ({ ...d, open: false }))}>Close</Button>
              </div>
            ) : (
              <form onSubmit={submitEngage} className="space-y-4 mt-1">
                {engageDialog.stage && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">Selected engagement: </span>{engageDialog.stage}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Name *</label>
                    <Input required value={engageForm.name} onChange={e => setEngageForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Email *</label>
                    <Input required type="email" value={engageForm.email} onChange={e => setEngageForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Organization</label>
                    <Input value={engageForm.org} onChange={e => setEngageForm(f => ({ ...f, org: e.target.value }))} placeholder="Company or facility name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Facility type</label>
                    <Select value={engageForm.facilityType} onValueChange={v => setEngageForm(f => ({ ...f, facilityType: v }))}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Primary concern *</label>
                  <Textarea required value={engageForm.concern} onChange={e => setEngageForm(f => ({ ...f, concern: e.target.value }))} placeholder="Describe your main operational challenge or compliance concern…" rows={3} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">What do you expect from this engagement?</label>
                  <Textarea value={engageForm.expectations} onChange={e => setEngageForm(f => ({ ...f, expectations: e.target.value }))} placeholder="e.g. I want a written report I can show my board, a gap analysis, or help with OSHA readiness…" rows={2} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">How did you hear about us?</label>
                  <Select value={engageForm.referral} onValueChange={v => setEngageForm(f => ({ ...f, referral: v }))}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select one" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calendly">Calendly booking</SelectItem>
                      <SelectItem value="colleague">Colleague referral</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={engageSubmitting}>
                  {engageSubmitting ? 'Sending…' : 'Submit Inquiry'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Stormwater Audit Modal ──────────────────────────────────────────── */}
        <Dialog open={consultModal === 'stormwater'} onOpenChange={open => !open && setConsultModal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-5 h-5 text-blue-400" />
                Industrial Stormwater Compliance Audit — $2,400
              </DialogTitle>
            </DialogHeader>
            {consultSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="font-semibold">Request Submitted</p>
                <p className="text-sm text-muted-foreground">{consultSuccess}</p>
                <Button className="w-full" disabled={engageLoading !== null} onClick={() => handleEngagementCheckout('price_1TZHydDfw4bOR2dfHm9B15dn', 'Stormwater Audit', 'payment')}>
                  {engageLoading === 'price_1TZHydDfw4bOR2dfHm9B15dn' ? 'Redirecting…' : 'Pay $2,400 Now'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setConsultModal(null)}>Close — I'll pay later</Button>
              </div>
            ) : (
              <form onSubmit={e => submitConsulting('stormwater_audit', "We'll reach out within 2 business days to confirm site details and schedule.", e)} className="space-y-3 mt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Organization name *</label>
                    <Input required value={consultForm.orgName || ''} onChange={e => setConsultForm(f => ({ ...f, orgName: e.target.value }))} placeholder="Company or facility name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Contact name *</label>
                    <Input required value={consultForm.contactName || ''} onChange={e => setConsultForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Email *</label>
                    <Input required type="email" value={consultForm.email || ''} onChange={e => setConsultForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Facility address / state</label>
                    <Input value={consultForm.facilityAddress || ''} onChange={e => setConsultForm(f => ({ ...f, facilityAddress: e.target.value }))} placeholder="City, State or full address" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">SIC code or industry type</label>
                    <Select value={consultForm.industry || ''} onValueChange={v => setConsultForm(f => ({ ...f, industry: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="mining">Mining</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Existing SWPPP?</label>
                    <Select value={consultForm.hasSwppp || ''} onValueChange={v => setConsultForm(f => ({ ...f, hasSwppp: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select one" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Last NPDES permit review</label>
                    <Input value={consultForm.lastPermitReview || ''} onChange={e => setConsultForm(f => ({ ...f, lastPermitReview: e.target.value }))} placeholder="e.g. 2022 or Never" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Primary concern</label>
                    <Textarea value={consultForm.concern || ''} onChange={e => setConsultForm(f => ({ ...f, concern: e.target.value }))} placeholder="What's your biggest stormwater compliance concern?" rows={2} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Preferred timeline</label>
                    <Input value={consultForm.timeline || ''} onChange={e => setConsultForm(f => ({ ...f, timeline: e.target.value }))} placeholder="e.g. Within 30 days, Q3 2026" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={consultSubmitting}>
                  {consultSubmitting ? 'Submitting…' : 'Request This Service'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Tier II Audit Modal ─────────────────────────────────────────────── */}
        <Dialog open={consultModal === 'tier2'} onOpenChange={open => !open && setConsultModal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Package className="w-5 h-5 text-orange-400" />
                Tier II / SARA Chemical Inventory Audit — $1,800
              </DialogTitle>
            </DialogHeader>
            {consultSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="font-semibold">Request Submitted</p>
                <p className="text-sm text-muted-foreground">{consultSuccess}</p>
                <Button className="w-full" disabled={engageLoading !== null} onClick={() => handleEngagementCheckout('price_1TZI0cDfw4bOR2dfRHJKJDIJ', 'Tier II Audit', 'payment')}>
                  {engageLoading === 'price_1TZI0cDfw4bOR2dfRHJKJDIJ' ? 'Redirecting…' : 'Pay $1,800 Now'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setConsultModal(null)}>Close — I'll pay later</Button>
              </div>
            ) : (
              <form onSubmit={e => submitConsulting('tier2_audit', "We'll review your facility state requirements and contact you within 2 business days.", e)} className="space-y-3 mt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Organization name *</label>
                    <Input required value={consultForm.orgName || ''} onChange={e => setConsultForm(f => ({ ...f, orgName: e.target.value }))} placeholder="Company or facility name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Contact name *</label>
                    <Input required value={consultForm.contactName || ''} onChange={e => setConsultForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Email *</label>
                    <Input required type="email" value={consultForm.email || ''} onChange={e => setConsultForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Facility state *</label>
                    <Input required value={consultForm.facilityState || ''} onChange={e => setConsultForm(f => ({ ...f, facilityState: e.target.value }))} placeholder="e.g. Ohio, Texas" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Approx. # of chemicals on-site</label>
                    <Input value={consultForm.chemicalCount || ''} onChange={e => setConsultForm(f => ({ ...f, chemicalCount: e.target.value }))} placeholder="e.g. 15" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">SDS records tracked digitally?</label>
                    <Select value={consultForm.sdsDigital || ''} onValueChange={v => setConsultForm(f => ({ ...f, sdsDigital: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select one" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Reporting year needed</label>
                    <Input value={consultForm.reportingYear || ''} onChange={e => setConsultForm(f => ({ ...f, reportingYear: e.target.value }))} placeholder="e.g. 2025" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Prior Tier II filings?</label>
                    <Select value={consultForm.priorFilings || ''} onValueChange={v => setConsultForm(f => ({ ...f, priorFilings: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Yes / No" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Primary concern</label>
                    <Textarea value={consultForm.concern || ''} onChange={e => setConsultForm(f => ({ ...f, concern: e.target.value }))} placeholder="What's driving this request?" rows={2} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={consultSubmitting}>
                  {consultSubmitting ? 'Submitting…' : 'Request This Service'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Stormwater + Tier II Bundle Modal ──────────────────────────────── */}
        <Dialog open={consultModal === 'bundle'} onOpenChange={open => !open && setConsultModal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="w-5 h-5 text-teal-400" />
                Stormwater + Tier II Bundle — $3,800
              </DialogTitle>
            </DialogHeader>
            {consultSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="font-semibold">Request Submitted</p>
                <p className="text-sm text-muted-foreground">{consultSuccess}</p>
                <Button className="w-full" disabled={engageLoading !== null} onClick={() => handleEngagementCheckout('price_1TZI22Dfw4bOR2dff9Evpj6J', 'Stormwater + Tier II Bundle', 'payment')}>
                  {engageLoading === 'price_1TZI22Dfw4bOR2dff9Evpj6J' ? 'Redirecting…' : 'Pay $3,800 Now'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setConsultModal(null)}>Close — I'll pay later</Button>
              </div>
            ) : (
              <form onSubmit={e => submitConsulting('bundle_audit', "We'll coordinate a single site visit and reach out within 2 business days to schedule.", e)} className="space-y-3 mt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Organization name *</label>
                    <Input required value={consultForm.orgName || ''} onChange={e => setConsultForm(f => ({ ...f, orgName: e.target.value }))} placeholder="Company or facility name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Contact name *</label>
                    <Input required value={consultForm.contactName || ''} onChange={e => setConsultForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Email *</label>
                    <Input required type="email" value={consultForm.email || ''} onChange={e => setConsultForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Facility address / state</label>
                    <Input value={consultForm.facilityAddress || ''} onChange={e => setConsultForm(f => ({ ...f, facilityAddress: e.target.value }))} placeholder="City, State or full address" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Primary compliance concern</label>
                    <Textarea value={consultForm.concern || ''} onChange={e => setConsultForm(f => ({ ...f, concern: e.target.value }))} placeholder="Stormwater discharge, chemical storage thresholds, both…" rows={2} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Preferred timeline</label>
                    <Input value={consultForm.timeline || ''} onChange={e => setConsultForm(f => ({ ...f, timeline: e.target.value }))} placeholder="e.g. Within 30 days, Q3 2026" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white" disabled={consultSubmitting}>
                  {consultSubmitting ? 'Submitting…' : 'Request This Bundle'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── FI Blueprint Modal ──────────────────────────────────────────────── */}
        <Dialog open={consultModal === 'blueprint'} onOpenChange={open => !open && setConsultModal(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-background border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                FI Integration Blueprint™ — Enterprise Engagement
              </DialogTitle>
            </DialogHeader>
            {consultSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="font-semibold">Request Submitted</p>
                <p className="text-sm text-muted-foreground">{consultSuccess}</p>
                <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white" disabled={engageLoading !== null} onClick={() => handleEngagementCheckout('price_1TZI3mDfw4bOR2dfUjyL3xg8', 'FI Blueprint', 'payment')}>
                  {engageLoading === 'price_1TZI3mDfw4bOR2dfUjyL3xg8' ? 'Redirecting…' : 'Start Engagement — Base $25,000'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setConsultModal(null)}>Close — I'll be invoiced</Button>
              </div>
            ) : (
              <form onSubmit={e => submitConsulting('fi_blueprint', "We'll contact you within 24 hours to confirm scope and timeline.", e)} className="space-y-3 mt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Organization name *</label>
                    <Input required value={consultForm.orgName || ''} onChange={e => setConsultForm(f => ({ ...f, orgName: e.target.value }))} placeholder="Company name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Contact name *</label>
                    <Input required value={consultForm.contactName || ''} onChange={e => setConsultForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Email *</label>
                    <Input required type="email" value={consultForm.email || ''} onChange={e => setConsultForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Current systems (BMS, CMMS, ERP, spreadsheets…)</label>
                    <Input value={consultForm.currentSystems || ''} onChange={e => setConsultForm(f => ({ ...f, currentSystems: e.target.value }))} placeholder="List all systems in use" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Target ERP / CMMS platform</label>
                    <Input value={consultForm.targetPlatform || ''} onChange={e => setConsultForm(f => ({ ...f, targetPlatform: e.target.value }))} placeholder="SAP, Infor, Workday, ServiceNow, etc." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Go-live timeline</label>
                    <Input value={consultForm.goLive || ''} onChange={e => setConsultForm(f => ({ ...f, goLive: e.target.value }))} placeholder="e.g. Q4 2026" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Asset count in scope</label>
                    <Input value={consultForm.assetCount || ''} onChange={e => setConsultForm(f => ({ ...f, assetCount: e.target.value }))} placeholder="e.g. 1,200" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Current PM compliance rate (%)</label>
                    <Input
                      type="number" min="0" max="100"
                      value={consultForm.pmCompliance || ''}
                      onChange={e => setConsultForm(f => ({ ...f, pmCompliance: e.target.value }))}
                      placeholder="e.g. 65"
                    />
                    {consultForm.pmCompliance && parseInt(consultForm.pmCompliance) < 70 && (
                      <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-400 mt-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        PM compliance below threshold — this is a Yellow Flag item that will be prioritized in your Blueprint.
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Regulatory / compliance context</label>
                    <Input value={consultForm.compliance || ''} onChange={e => setConsultForm(f => ({ ...f, compliance: e.target.value }))} placeholder="EPA, OSHA, state energy code, etc." />
                    {(consultForm.compliance || '').toUpperCase().includes('EPA') || (consultForm.compliance || '').toUpperCase().includes('OSHA') ? (
                      <p className="text-xs text-blue-400 mt-1">Compliance documentation continuity will be a required Blueprint component.</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Available data formats</label>
                    <Input value={consultForm.dataFormats || ''} onChange={e => setConsultForm(f => ({ ...f, dataFormats: e.target.value }))} placeholder="CSV, Excel, PDF, API…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">IT integration partner (if any)</label>
                    <Input value={consultForm.itPartner || ''} onChange={e => setConsultForm(f => ({ ...f, itPartner: e.target.value }))} placeholder="Partner name or TBD" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Top operational concerns</label>
                    <Textarea value={consultForm.concerns || ''} onChange={e => setConsultForm(f => ({ ...f, concerns: e.target.value }))} placeholder="What are the biggest risks or gaps you're trying to solve?" rows={3} />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white" disabled={consultSubmitting}>
                  {consultSubmitting ? 'Submitting…' : 'Request Blueprint Engagement'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Consulting Services Sequence ────────────────────────────────────── */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Consulting Services</Badge>
            <h2 className="text-3xl font-bold">The Nexum Engagement Journey</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every client follows a structured path — from discovery to full transformation.
              Each stage builds on the last, so you only invest further when it makes sense.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                step: 1,
                name: 'FI Intro',
                price: 'Free',
                priceNote: 'No commitment',
                icon: BookOpen,
                color: 'text-blue-400',
                border: 'border-blue-400/30',
                bg: 'bg-blue-400/5',
                badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                desc: 'Learn whether the Facility Intelligence framework is the right fit for your operation.',
                deliverables: [
                  'FI framework overview',
                  'Fit assessment conversation',
                  'Sector-specific use case review',
                  'No obligation, no pressure',
                ],
              },
              {
                step: 2,
                name: 'Rapid Review',
                price: '$500',
                priceNote: 'Virtual discovery assessment',
                priceId: 'price_1TZHoQDfw4bOR2dfZbXLRBQ6',
                icon: Phone,
                color: 'text-cyan-400',
                border: 'border-cyan-400/30',
                bg: 'bg-cyan-400/5',
                badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                desc: 'Virtual questionnaire and discovery call to map your current operational structure.',
                deliverables: [
                  'How logs are taken & stored',
                  'Where SOPs are kept',
                  'Safety awareness & signage review',
                  'Workflow & staff routines',
                  'Utility bill summary review',
                  'What a rough week looks like',
                ],
              },
              {
                step: 3,
                name: 'FI™ Assessment',
                price: '$2,500–$7,500',
                priceNote: '1-day structured assessment',
                quoteOnly: true,
                badge: 'Best for Referrals',
                icon: ClipboardCheck,
                color: 'text-teal-400',
                border: 'border-teal-400/30',
                bg: 'bg-teal-400/5',
                badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
                desc: 'A structured 1-day facility assessment producing operational risk scores, compliance gap analysis, and a written executive findings report.',
                deliverables: [
                  'Operational risk scoring',
                  'Compliance gap analysis',
                  'Knowledge continuity review',
                  'Executive findings report',
                ],
              },
              {
                step: 4,
                name: 'Onsite Lite',
                price: '$2,500',
                priceNote: 'Half-day assessment',
                priceId: 'price_1TZHppDfw4bOR2dfSV33Vr6s',
                icon: MapPin,
                color: 'text-orange-400',
                border: 'border-orange-400/40',
                bg: 'bg-orange-400/5',
                badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                highlight: true,
                desc: 'On-site walkthrough to log trend data, assess key personnel, and deliver actionable documents.',
                deliverables: [
                  'Current trend data logged',
                  'Lead operator & engineer evaluated',
                  'Manager workflow observed',
                  'Emergency & unplanned task handling',
                  'System & process understanding scored',
                  'Written assessment report',
                  'Generated SOPs, EOPs & Checklists',
                ],
              },
              {
                step: 5,
                name: 'Full Engagement',
                price: '$5,000+',
                priceNote: 'Full transformation program',
                quoteOnly: true,
                icon: Wrench,
                color: 'text-purple-400',
                border: 'border-purple-400/40',
                bg: 'bg-purple-400/5',
                badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                desc: 'Everything in Onsite Lite plus deep staff, system, and compliance evaluation.',
                deliverables: [
                  'All staff roles assessed',
                  'System troubleshooting tracked',
                  'Interlock & safety testing',
                  'Blowdown line & load testing',
                  'Communication flow review',
                  'Active compliance faults documented',
                  'Permits, certs & licenses verified',
                  'Staff capability scoring (boilers, chillers, etc.)',
                ],
              },
              {
                step: 6,
                name: 'Consulting / VVFI',
                price: 'Retainer',
                priceNote: '$497–$1,997/mo',
                icon: TrendingUp,
                color: 'text-green-400',
                border: 'border-green-400/30',
                bg: 'bg-green-400/5',
                badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
                desc: 'Ongoing relationship — quarterly or bi-weekly meetings, custom reports, and Analysis to Improve.',
                deliverables: [
                  '30-question bank from past assessments',
                  'Quarterly or bi-weekly meetings',
                  'Weekly client improvement reports',
                  'Analysis to Improve reports',
                  'Recommendations, feedback & soft advice',
                  'Custom SOPs & Checklists on request',
                  '1 original + 2 copies within 72hrs',
                  '20% off first year FI Platform license',
                ],
                tiers: [
                  { label: 'Basic',    price: '$497/mo',  priceId: 'price_1TDrGqDfw4bOR2dfpFGztXBE' },
                  { label: 'Standard', price: '$997/mo',  priceId: 'price_1TDrI8Dfw4bOR2dfn5Van0F9' },
                  { label: 'Premium',  price: '$1,997/mo', priceId: 'price_1TDrJUDfw4bOR2dfHcozYsiC' },
                ],
              },
            ].map((stage, idx, arr) => {
              const Icon = stage.icon;
              return (
                <div key={stage.step} className="relative flex flex-col">
                  {/* Connector arrow — desktop */}
                  {idx < arr.length - 1 && (
                    <div className="hidden xl:flex absolute -right-2.5 top-8 z-10 items-center justify-center w-5">
                      <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className={cn(
                    'flex flex-col h-full rounded-xl border-2 p-5 transition-all hover:scale-[1.01]',
                    stage.border, stage.bg,
                    (stage as any).highlight && 'ring-1 ring-orange-400/30 shadow-lg shadow-orange-400/10',
                  )}>
                    {/* Step badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border', stage.badgeColor)}>
                        {stage.step}
                      </div>
                      <Badge className={cn('text-xs border', stage.badgeColor)}>{stage.price}</Badge>
                      {(stage as any).highlight && (
                        <Badge className="text-xs bg-orange-500 text-white border-0 ml-auto">Most Booked</Badge>
                      )}
                    </div>

                    {/* Icon + name */}
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn('w-5 h-5', stage.color)} />
                      <h3 className="font-bold text-base">{stage.name}</h3>
                    </div>
                    <p className={cn('text-xs mb-3', stage.color)}>{stage.priceNote}</p>

                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{stage.desc}</p>

                    <ul className="space-y-1.5 mt-auto">
                      {stage.deliverables.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className={cn('w-3 h-3 mt-0.5 shrink-0', stage.color)} />
                          {d}
                        </li>
                      ))}
                    </ul>
                    {(stage as any).priceId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn('mt-4 w-full text-xs border', stage.border)}
                        disabled={engageLoading === (stage as any).priceId}
                        onClick={() => handleEngagementCheckout((stage as any).priceId, stage.name, 'payment')}
                      >
                        {engageLoading === (stage as any).priceId ? 'Redirecting…' : 'Book & Pay'} <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    ) : (stage as any).tiers ? (
                      <div className="mt-4 space-y-1.5">
                        {((stage as any).tiers as Array<{ label: string; price: string; priceId: string }>).map(t => (
                          <Button
                            key={t.priceId}
                            size="sm"
                            variant="outline"
                            className={cn('w-full text-xs border justify-between', stage.border)}
                            disabled={engageLoading === t.priceId}
                            onClick={() => handleEngagementCheckout(t.priceId, `VVFI ${t.label}`, 'subscription')}
                          >
                            <span>{t.label}</span>
                            <span className={cn('font-semibold', stage.color)}>{t.price}</span>
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn('mt-4 w-full text-xs border', stage.border)}
                        onClick={() => openEngage(stage.name)}
                      >
                        {(stage as any).quoteOnly ? 'Request Quote' : 'Get Started'} <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* How it flows */}
          <div className="rounded-xl border border-border/50 bg-card/30 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                  How the journey works
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  The FI Intro call is always free. After your $500 Rapid Review discovery session, Nexum recommends Onsite Lite or Full Engagement based on what we hear. There's no pressure to move further than the stage that makes sense for you.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Consulting program
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  If you join the Consulting program, every meeting includes a custom questionnaire drawn from your past assessments. You send weekly updates on improvements made or gaps found — we turn those into a formal Analysis to Improve report.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  VVFI retainer perks
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  VVFI retainer covers 1 original report + 2 free copies delivered within 72 hours of request, custom SOPs and Checklists generated on demand, and a 20% discount on your first year of the FI Platform license.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">Ready to find out which stage is right for your facility?</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => document.getElementById('enterprise-quote')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Book a Rapid Review <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => window.open('https://www.nexumsuum.com/facility-intelligence', '_blank')}>
                Learn About the FI Framework
              </Button>
            </div>
          </div>
        </div>

        {/* ── On-Site Engagements ─────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm font-medium uppercase tracking-widest">
              <MapPin className="w-4 h-4 text-primary" />
              On-Site Engagements
            </div>
            <h2 className="text-2xl font-bold">We Come To You</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Structured on-site programs designed around your facility's stage — from structured assessment through ongoing advisory.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Step 5 — FI™ Assessment */}
            {(() => {
              const key = 'fi-assessment';
              const isOpen = onsiteExpanded === key;
              const form = onsiteForm[key] || { name: '', email: '', org: '', message: '' };
              const submitted = onsiteSubmitted.has(key);
              return (
                <div key={key} className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">Step 5</Badge>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Best for Referrals</Badge>
                      </div>
                      <h3 className="font-semibold text-base">FI™ Assessment</h3>
                      <p className="text-xs text-muted-foreground">$2,500 – $7,500 · Structured 1-day site assessment</p>
                    </div>
                    <button
                      onClick={() => setOnsiteExpanded(isOpen ? null : key)}
                      className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="space-y-4 pt-1">
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {[
                          '1-day structured facility assessment',
                          'Operational risk scoring across all systems',
                          'Compliance gap identification',
                          'Knowledge continuity review',
                          'Executive findings report with recommendations',
                        ].map(item => (
                          <li key={item} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      {submitted ? (
                        <p className="text-sm text-teal-400 font-medium">Request received — we'll be in touch within 1 business day.</p>
                      ) : (
                        <form
                          onSubmit={async e => {
                            e.preventDefault();
                            try {
                              await fetch(`${import.meta.env.VITE_API_BASE_URL}/intake`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ service: 'fi_assessment', ...form }),
                              });
                            } catch { /* swallow */ }
                            setOnsiteSubmitted(prev => new Set([...prev, key]));
                          }}
                          className="space-y-2"
                        >
                          <Input placeholder="Your name" value={form.name} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, name: e.target.value } }))} required />
                          <Input placeholder="Email" type="email" value={form.email} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, email: e.target.value } }))} required />
                          <Input placeholder="Organization" value={form.org} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, org: e.target.value } }))} />
                          <Textarea placeholder="Brief note about your facility or goals…" value={form.message} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, message: e.target.value } }))} rows={2} />
                          <Button type="submit" size="sm" className="w-full bg-teal-600 hover:bg-teal-500 text-white">Request FI™ Assessment <ArrowRight className="w-3 h-3 ml-1" /></Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Step 6 — Onsite Lite FIWE™ */}
            {(() => {
              const key = 'onsite-lite';
              const isOpen = onsiteExpanded === key;
              const form = onsiteForm[key] || { name: '', email: '', org: '', message: '' };
              const submitted = onsiteSubmitted.has(key);
              return (
                <div key={key} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Step 6</Badge>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Most Booked</Badge>
                      </div>
                      <h3 className="font-semibold text-base">Onsite Lite — FIWE™</h3>
                      <p className="text-xs text-muted-foreground">$2,500 · Physical walkthrough & validation</p>
                    </div>
                    <button
                      onClick={() => setOnsiteExpanded(isOpen ? null : key)}
                      className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="space-y-4 pt-1">
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {[
                          'Physical walkthrough of all critical systems',
                          'Validates findings from virtual assessments',
                          'Operator interviews & knowledge capture',
                          'Live audit trail generation during visit',
                          '60-day Basic FI Platform access included',
                        ].map(item => (
                          <li key={item} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      {submitted ? (
                        <p className="text-sm text-amber-400 font-medium">Request received — we'll be in touch within 1 business day.</p>
                      ) : (
                        <form
                          onSubmit={async e => {
                            e.preventDefault();
                            try {
                              await fetch(`${import.meta.env.VITE_API_BASE_URL}/intake`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ service: 'onsite_lite_fiwe', ...form }),
                              });
                            } catch { /* swallow */ }
                            setOnsiteSubmitted(prev => new Set([...prev, key]));
                          }}
                          className="space-y-2"
                        >
                          <Input placeholder="Your name" value={form.name} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, name: e.target.value } }))} required />
                          <Input placeholder="Email" type="email" value={form.email} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, email: e.target.value } }))} required />
                          <Input placeholder="Organization" value={form.org} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, org: e.target.value } }))} />
                          <Textarea placeholder="Brief note about your facility or goals…" value={form.message} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, message: e.target.value } }))} rows={2} />
                          <Button type="submit" size="sm" className="w-full bg-amber-600 hover:bg-amber-500 text-white">Request Onsite Lite <ArrowRight className="w-3 h-3 ml-1" /></Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Step 7 — Full Engagement */}
            {(() => {
              const key = 'full-engagement';
              const isOpen = onsiteExpanded === key;
              const form = onsiteForm[key] || { name: '', email: '', org: '', message: '' };
              const submitted = onsiteSubmitted.has(key);
              return (
                <div key={key} className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-xs">Step 7</Badge>
                      </div>
                      <h3 className="font-semibold text-base">Full Engagement</h3>
                      <p className="text-xs text-muted-foreground">$5,000+ · Comprehensive multi-day engagement</p>
                    </div>
                    <button
                      onClick={() => setOnsiteExpanded(isOpen ? null : key)}
                      className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="space-y-4 pt-1">
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {[
                          'Everything in Onsite Lite plus all staff roles',
                          'Deep-dive troubleshooting across all systems',
                          'Safety testing and hazard documentation',
                          'Compliance fault identification and remediation plan',
                          'Permits, HVAC & Energy efficiency reports',
                          'Full AI-powered operational intelligence report',
                        ].map(item => (
                          <li key={item} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      {submitted ? (
                        <p className="text-sm text-violet-400 font-medium">Request received — we'll be in touch within 1 business day.</p>
                      ) : (
                        <form
                          onSubmit={async e => {
                            e.preventDefault();
                            try {
                              await fetch(`${import.meta.env.VITE_API_BASE_URL}/intake`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ service: 'full_engagement', ...form }),
                              });
                            } catch { /* swallow */ }
                            setOnsiteSubmitted(prev => new Set([...prev, key]));
                          }}
                          className="space-y-2"
                        >
                          <Input placeholder="Your name" value={form.name} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, name: e.target.value } }))} required />
                          <Input placeholder="Email" type="email" value={form.email} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, email: e.target.value } }))} required />
                          <Input placeholder="Organization" value={form.org} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, org: e.target.value } }))} />
                          <Textarea placeholder="Tell us about your facility size, systems, and key challenges…" value={form.message} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, message: e.target.value } }))} rows={2} />
                          <Button type="submit" size="sm" className="w-full bg-violet-600 hover:bg-violet-500 text-white">Request Full Engagement <ArrowRight className="w-3 h-3 ml-1" /></Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Step 8 — Consulting / VVFI Retainer */}
            {(() => {
              const key = 'vvfi-retainer';
              const isOpen = onsiteExpanded === key;
              const form = onsiteForm[key] || { name: '', email: '', org: '', message: '' };
              const submitted = onsiteSubmitted.has(key);
              return (
                <div key={key} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Step 8</Badge>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Ongoing Advisory</Badge>
                      </div>
                      <h3 className="font-semibold text-base">Consulting / VVFI Retainer</h3>
                      <p className="text-xs text-muted-foreground">$497 – $1,997/mo · Ongoing strategic advisory</p>
                    </div>
                    <button
                      onClick={() => setOnsiteExpanded(isOpen ? null : key)}
                      className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="space-y-4 pt-1">
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {[
                          'Quarterly strategy meetings with custom questionnaire',
                          'Weekly improvement reports (Analysis to Improve)',
                          'Custom SOPs and checklists generated on demand',
                          '1 original VVFI report + 2 free copies within 72hrs',
                          '20% discount on first year of FI Platform license',
                        ].map(item => (
                          <li key={item} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      {submitted ? (
                        <p className="text-sm text-emerald-400 font-medium">Request received — we'll be in touch within 1 business day.</p>
                      ) : (
                        <form
                          onSubmit={async e => {
                            e.preventDefault();
                            try {
                              await fetch(`${import.meta.env.VITE_API_BASE_URL}/intake`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ service: 'vvfi_retainer', ...form }),
                              });
                            } catch { /* swallow */ }
                            setOnsiteSubmitted(prev => new Set([...prev, key]));
                          }}
                          className="space-y-2"
                        >
                          <Input placeholder="Your name" value={form.name} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, name: e.target.value } }))} required />
                          <Input placeholder="Email" type="email" value={form.email} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, email: e.target.value } }))} required />
                          <Input placeholder="Organization" value={form.org} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, org: e.target.value } }))} />
                          <Textarea placeholder="What operational challenges are you looking to solve with ongoing advisory?" value={form.message} onChange={e => setOnsiteForm(p => ({ ...p, [key]: { ...form, message: e.target.value } }))} rows={2} />
                          <Button type="submit" size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">Start Retainer Conversation <ArrowRight className="w-3 h-3 ml-1" /></Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* ── Enterprise Joint Programs ────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm font-medium uppercase tracking-widest">
              <TrendingUp className="w-4 h-4 text-primary" />
              Enterprise Joint Programs
            </div>
            <h2 className="text-2xl font-bold">Institutional-Scale Programs</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
              Multi-partner programs for organizations that need cross-institutional intelligence, continuity, and operational governance at scale.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                key: 'ifra',
                abbr: 'IFRA™',
                name: 'Integrated Facility Risk Assessment',
                color: 'blue',
                borderClass: 'border-blue-500/30',
                bgClass: 'bg-blue-500/5',
                badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                partners: ['NS', 'PAG', 'VM'],
                description: 'A cross-institutional risk assessment framework that combines physical site data, compliance records, and operational intelligence into a unified risk profile used by insurers, property groups, and facility managers.',
                idealFor: 'Multi-site operators, property managers, insurers needing defensible risk documentation',
                tiers: [
                  { name: 'Pilot', price: '$4,970', note: 'Single site, 90-day engagement' },
                  { name: 'Mid-Market', price: '$9,970', note: '3–10 sites, 6-month program' },
                  { name: 'Enterprise', price: '$19,970', note: '10+ sites, annual cycle' },
                  { name: 'Government', price: 'Custom', note: 'Multi-agency, federal compliance' },
                ],
              },
              {
                key: 'digp',
                abbr: 'DIGP™',
                name: 'Decision Intelligence Governance Program',
                color: 'violet',
                borderClass: 'border-violet-500/30',
                bgClass: 'bg-violet-500/5',
                badgeClass: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
                partners: ['NS', 'PAG'],
                description: 'Structured governance framework for capturing, reviewing, and auditing operational decisions. Converts facility decision patterns into institutional policy, leadership continuity plans, and defensible audit trails.',
                idealFor: 'Executive teams, compliance officers, organizations with leadership transition risk',
                tiers: [
                  { name: 'Pilot', price: '$3,970', note: 'Leadership team, 60-day setup' },
                  { name: 'Mid-Market', price: '$7,970', note: 'Dept-level governance, quarterly review' },
                  { name: 'Enterprise', price: '$14,970', note: 'Org-wide decision intelligence layer' },
                  { name: 'Government', price: 'Custom', note: 'Public accountability framework' },
                ],
              },
              {
                key: 'oc3',
                abbr: 'OC3™',
                name: 'Operational Continuity & Compliance Certification',
                color: 'emerald',
                borderClass: 'border-emerald-500/30',
                bgClass: 'bg-emerald-500/5',
                badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                partners: ['NS', 'VM'],
                description: 'A joint certification program that validates operational continuity posture across facilities. Produces a third-party-reviewed OC3™ Certification used in procurement bids, tenant negotiations, and regulatory submissions.',
                idealFor: 'Facilities seeking vendor or tenant qualification, government contractors, compliance-heavy operations',
                tiers: [
                  { name: 'Pilot', price: '$2,970', note: 'Single facility, certification review' },
                  { name: 'Mid-Market', price: '$5,970', note: 'Portfolio certification, 12-month cycle' },
                  { name: 'Enterprise', price: '$11,970', note: 'Multi-site, continuous compliance layer' },
                  { name: 'Government', price: 'Custom', note: 'Regulatory-aligned, agency submission ready' },
                ],
              },
              {
                key: 'ciip',
                abbr: 'CIIP™',
                name: 'Continuity & Institutional Intelligence Program',
                color: 'amber',
                borderClass: 'border-amber-500/30',
                bgClass: 'bg-amber-500/5',
                badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                partners: ['NS', 'PAG', 'VM'],
                description: 'The flagship institutional program combining operational DNA, leadership succession planning, knowledge continuity vaults, and AI-powered foresight modeling. Designed for organizations that cannot afford operational amnesia.',
                idealFor: 'Organizations with critical infrastructure, high staff turnover risk, or complex multi-generational operational knowledge',
                tiers: [
                  { name: 'Pilot', price: '$6,970', note: 'Core team, knowledge vault setup' },
                  { name: 'Mid-Market', price: '$12,970', note: 'Dept continuity modeling, 12-month' },
                  { name: 'Enterprise', price: '$24,970', note: 'Full institutional intelligence layer' },
                  { name: 'Government', price: 'Custom', note: 'Mission-critical continuity assurance' },
                ],
              },
            ].map(prog => (
              <div key={prog.key} className={`rounded-xl border ${prog.borderClass} ${prog.bgClass} p-5 space-y-4`}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <Badge className={`${prog.badgeClass} text-sm font-bold px-2.5 py-0.5`}>{prog.abbr}</Badge>
                    <div className="flex items-center gap-1 flex-wrap">
                      {prog.partners.map(p => (
                        <span key={p} className="text-xs font-medium bg-muted/60 text-muted-foreground rounded px-1.5 py-0.5 border border-border/50">{p}</span>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-semibold text-base leading-snug">{prog.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{prog.description}</p>
                  <p className="text-xs text-muted-foreground/70 italic">Ideal for: {prog.idealFor}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {prog.tiers.map(tier => (
                    <div key={tier.name} className="rounded-lg border border-border/40 bg-card/40 p-2.5 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground/80">{tier.name}</p>
                      <p className="text-sm font-bold">{tier.price}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{tier.note}</p>
                    </div>
                  ))}
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  variant="outline"
                  onClick={() => openEngage(`${prog.abbr} — ${prog.name}`)}
                >
                  Request Engagement <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Platform Subscriptions heading */}
        <div className="text-center space-y-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">FI Platform</Badge>
          <h2 className="text-3xl font-bold">Platform Subscriptions</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The software your team uses every day. Choose by sector — facility, retail, or government.
            VVFI retainer clients receive 20% off their first year.
          </p>
        </div>

        {/* Sector tabs */}
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex rounded-lg border border-border bg-card/50 p-1 gap-1">
            {([
              { value: 'facility'     as const, label: 'Facility',      icon: Building2 },
              { value: 'retail'       as const, label: 'Retail',         icon: ShoppingCart },
              { value: 'service_tech' as const, label: 'Service Tech',   icon: Wrench },
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
          {(sector === 'retail' || sector === 'service_tech' || sector === 'property' || sector === 'entrepreneur') ? (
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
          <div className="space-y-3">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 py-3 px-6 rounded-lg border border-blue-400/20 bg-blue-400/5 text-sm text-blue-300 font-medium">
              <span>MBE Certified</span>
              <span className="text-blue-400/30">·</span>
              <span>SAM.gov Registered</span>
              <span className="text-blue-400/30">·</span>
              <span>TWIC Cleared</span>
              <span className="text-blue-400/30">·</span>
              <span>NJ Licensed Stationary Engineer</span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 py-2.5 px-6 rounded-lg border border-blue-500/15 bg-card/30 text-xs text-muted-foreground">
              <span className="font-medium text-blue-300/80">Covers:</span>
              <span>Municipal · County · State · Federal</span>
              <span className="text-blue-400/30">·</span>
              <span>Special Districts (Water, Sewer, Transit, Port, Airport)</span>
              <span className="text-blue-400/30">·</span>
              <span>Public Safety (Fire, Police, EMS, Dispatch)</span>
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div className={cn(
          'grid gap-6',
          (sector === 'retail' || sector === 'property' || sector === 'entrepreneur')
            ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto w-full'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        )}>
          {activePlans.map((plan) => {
            const Icon = plan.icon;
            const isRetail = sector === 'retail';
            const isMonthlySector = sector === 'retail' || sector === 'service_tech' || sector === 'property' || sector === 'entrepreneur';
            const useAnnual = isMonthlySector && retailBilling === 'annual';
            const effectivePrice   = useAnnual && plan.annualPrice   ? plan.annualPrice   : plan.price;
            const effectivePriceId = useAnnual && plan.annualPriceId ? plan.annualPriceId : plan.priceId;
            const effectiveLabel   = useAnnual ? '/yr' : plan.billingLabel;
            const annualSavings    = isMonthlySector && plan.price ? plan.price * 2 : 0;

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
                        {!useAnnual && isMonthlySector && annualSavings > 0 && (
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
                    {plan.features.map((f, i) => {
                      if (f.startsWith('──')) {
                        return (
                          <div key={i} className="flex items-center gap-2 pt-1">
                            <div className="h-px flex-1 bg-border/60" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 shrink-0">
                              {f.replace(/^──\s*/, '').replace(/\s*──$/, '')}
                            </span>
                            <div className="h-px flex-1 bg-border/60" />
                          </div>
                        );
                      }
                      return (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.color}`} />
                          <span>{f}</span>
                        </div>
                      );
                    })}
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
                    <div className="mt-auto space-y-2">
                      <Button
                        className={`w-full ${ctaBg(plan)}`}
                        onClick={() => handleCheckout(plan, effectivePriceId || undefined)}
                        disabled={loadingPlan === plan.name}
                      >
                        {loadingPlan === plan.name ? 'Redirecting...' : `Get ${plan.name}`}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      {plan.name === 'Business' && (
                        <button
                          onClick={() => setShowPilot(true)}
                          className="w-full text-xs text-muted-foreground hover:text-orange-400 transition-colors text-center py-1"
                        >
                          🚀 Apply for Pilot access (10 spots)
                        </button>
                      )}
                    </div>
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
                    <form id="ent-contact-form" onSubmit={handleQuoteSubmit} className="space-y-3">
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
                      {/* Storage / Usage Estimator */}
                      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-3">
                        <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Usage Estimator — Helps Us Quote Accurately</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Equipment Assets</label>
                            <Input value={quoteForm.estimatedEquipment} onChange={e => setQuoteForm(f => ({ ...f, estimatedEquipment: e.target.value }))} placeholder="e.g. 2,400" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Staff / Users</label>
                            <Input value={quoteForm.teamSize} onChange={e => setQuoteForm(f => ({ ...f, teamSize: e.target.value }))} placeholder="e.g. 85" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Inventory SKUs</label>
                            <Input value={quoteForm.estimatedInventoryItems} onChange={e => setQuoteForm(f => ({ ...f, estimatedInventoryItems: e.target.value }))} placeholder="e.g. 500" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Compliance Docs</label>
                            <Input value={quoteForm.complianceDocsCount} onChange={e => setQuoteForm(f => ({ ...f, complianceDocsCount: e.target.value }))} placeholder="e.g. 120" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-xs text-muted-foreground">Historical Data — Years to Import</label>
                            <Input value={quoteForm.historicalDataYears} onChange={e => setQuoteForm(f => ({ ...f, historicalDataYears: e.target.value }))} placeholder="e.g. 3 years" className="h-8 text-xs" />
                          </div>
                        </div>
                        {/* Live storage estimate */}
                        {(quoteForm.estimatedEquipment || quoteForm.teamSize) && (() => {
                          const eq  = parseInt(quoteForm.estimatedEquipment?.replace(/,/g,'') || '0') || 0;
                          const inv = parseInt(quoteForm.estimatedInventoryItems?.replace(/,/g,'') || '0') || 0;
                          const docs = parseInt(quoteForm.complianceDocsCount?.replace(/,/g,'') || '0') || 0;
                          const yrs = parseInt(quoteForm.historicalDataYears || '1') || 1;
                          // Rough DynamoDB storage estimate: equipment ~3KB, log ~1KB/day/asset, inventory ~2KB, docs ~50KB
                          const eqMB   = (eq * 3) / 1024;
                          const logsMB = (eq * 365 * yrs * 1) / 1024;
                          const invMB  = (inv * 2) / 1024;
                          const docsMB = (docs * 50) / 1024;
                          const totalGB = ((eqMB + logsMB + invMB + docsMB) / 1024).toFixed(1);
                          return (
                            <div className="bg-black/20 rounded p-2 text-xs text-yellow-400/80">
                              Est. data volume: ~<strong>{totalGB} GB</strong> · {eq.toLocaleString()} assets · {yrs}yr history
                            </div>
                          );
                        })()}
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
            <p className="text-muted-foreground mt-1">Storage expansions, professional services, and training packages</p>
          </div>
          {/* Storage callout */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
            </div>
            <div>
              <p className="font-semibold text-sm text-cyan-400">Secure Cloud Storage</p>
              <p className="text-xs text-muted-foreground mt-0.5">All data is stored in encrypted AWS S3 buckets, scoped per licensee account. localStorage acts as an instant-access backup — every write syncs automatically to the cloud. Storage add-ons expand your S3 capacity for documents, photos, compliance files, and media.</p>
            </div>
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

        {/* ── Request-Based Consulting Services ──────────────────────────────────── */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">Professional Services</Badge>
            <h2 className="text-3xl font-bold">Request-Based Consulting Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Targeted regulatory and integration engagements — not a subscription, just the service you need, delivered and documented.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* ── Stormwater Audit ── */}
            <Card className="flex flex-col border-2 border-blue-400/30 bg-blue-400/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-400/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Request-Based</Badge>
                </div>
                <CardTitle className="text-base leading-tight">Industrial Stormwater Compliance Audit</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Clean water compliance — documented, defensible, and filed.</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">$2,400</span>
                  <span className="text-sm text-muted-foreground ml-1">one-time engagement</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-0">
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  A complete NPDES permit review and SWPPP gap analysis against your state's Multi-Sector General Permit. We walk your site, map your discharge points, identify your exposure, and deliver a corrective action report with a quarterly inspection checklist.
                </p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {[
                    'NPDES permit review and permit limit mapping',
                    'Site walkthrough protocol (discharge points, BMPs, housekeeping)',
                    'SWPPP gap analysis vs. MSGP',
                    'Quarterly visual inspection checklist (MSGP Table D-1 format)',
                    'Corrective action report with prioritized findings',
                    '30-day follow-up check-in call',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" />{item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-auto" onClick={() => openConsultModal('stormwater')}>
                  Request This Service <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* ── Tier II Audit ── */}
            <Card className="flex flex-col border-2 border-orange-400/30 bg-orange-400/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-400/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-orange-400" />
                  </div>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Request-Based</Badge>
                </div>
                <CardTitle className="text-base leading-tight">Tier II / SARA Chemical Inventory Audit</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Know exactly what you're holding — before a regulator asks.</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">$1,800</span>
                  <span className="text-sm text-muted-foreground ml-1">one-time engagement</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-0">
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  A complete chemical inventory review against SARA Title III reporting thresholds. We verify your SDS records, calculate threshold quantities, and generate your state Tier II report — filed on your behalf or handed off ready to submit.
                </p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {[
                    'On-site or remote chemical inventory review',
                    'SDS verification and threshold calculations',
                    'Tier II report generated and reviewed',
                    'Filed on your behalf (or handed off ready to submit)',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 mt-0.5 shrink-0 text-orange-400" />{item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-orange-600 hover:bg-orange-500 text-white mt-auto" onClick={() => openConsultModal('tier2')}>
                  Request This Service <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* ── Stormwater + Tier II Bundle ── */}
            <Card className="flex flex-col border-2 border-teal-400/30 bg-teal-400/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-teal-400" />
                  </div>
                  <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">Bundle — Save $400</Badge>
                </div>
                <CardTitle className="text-base leading-tight">Stormwater + Tier II Bundle</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Both audits together — one engagement, one price.</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">$3,800</span>
                  <span className="text-sm text-muted-foreground ml-1">· save $400 vs. separate</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-0">
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Full Industrial Stormwater Compliance Audit + SARA Title III Tier II Report Filing in one engagement. Ideal for facilities that have both stormwater discharge activity and reportable chemical storage on-site.
                </p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {[
                    'Everything in Stormwater Audit',
                    'Everything in Tier II Audit',
                    'Coordinated site visit (single mobilization)',
                    'Combined compliance report',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 mt-0.5 shrink-0 text-teal-400" />{item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-teal-600 hover:bg-teal-500 text-white mt-auto" onClick={() => openConsultModal('bundle')}>
                  Request Bundle <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* ── FI Blueprint ── */}
            <Card className="flex flex-col border-2 border-purple-400/30 bg-purple-400/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-400/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">Enterprise</Badge>
                </div>
                <CardTitle className="text-base leading-tight">FI Integration Blueprint™</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Before you spend millions on a new ERP, know exactly what it must capture — or watch your operational defensibility disappear.</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">$25K–$45K</span>
                  <span className="text-sm text-muted-foreground ml-1">· 30-day fixed engagement</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-0">
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  IT consultants will tell you it takes 6 months and $150,000 to clean and migrate your data. Nexum Suum breaks that bottleneck: your team drops historical plant logs, maintenance records, and equipment data into our platform via CSV or API. In 30 days you get a fully structured data model, risk gap analysis, and the exact API mapping schemas to push clean operational data into your new ERP.
                </p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {[
                    'Fully structured operational data model',
                    'Decision Defensibility parameter map',
                    'Risk gap analysis (Red / Yellow / Green flags)',
                    'API mapping schemas for your ERP integrator',
                    'Data field requirements spec (handed to IT team)',
                    '90-day post-go-live monitoring checklist',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 mt-0.5 shrink-0 text-purple-400" />{item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white mt-auto" onClick={() => openConsultModal('blueprint')}>
                  Request Blueprint Engagement <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── General Service Inquiry ── */}
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 md:p-8 text-center space-y-4">
            <h3 className="text-xl font-bold">Not sure which service fits?</h3>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Tell us about your facility and the challenge you're trying to solve — we'll recommend the right engagement stage and reach out within 1 business day.
            </p>
            <Button onClick={() => openEngage('General Inquiry')}>
              Send Inquiry <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Intake Form */}
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 md:p-8 text-center space-y-4">
          <h2 className="text-xl font-bold">Not ready to commit?</h2>
          <p className="text-muted-foreground text-sm">
            That's okay. Tell us about your facility and what's on your mind — we'll reach out within 1 business day with no obligation.
          </p>
          <Button variant="outline" onClick={() => openEngage('Exploring Options')}>
            Tell Us About Your Facility <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* ── Professional Services Proposal Calculator ── */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Build Your Proposal</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Annual license + professional services calculated separately. Nothing is bundled.
                Every line item is yours to accept or decline.
              </p>
            </div>
            <Button onClick={() => setProposalOpen(true)} className="shrink-0">
              <BarChart3 className="w-4 h-4 mr-2" />Open Proposal Calculator
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
            {[
              { label: 'Annual License', desc: 'From $10,788/yr' },
              { label: 'Implementation', desc: 'One-time engagement' },
              { label: 'Assessment Services', desc: 'Per engagement' },
              { label: 'Executive Advisory', desc: 'Monthly retainer' },
              { label: 'Operational Leadership', desc: 'Fractional / interim' },
              { label: 'Knowledge Transfer', desc: 'Fixed engagement' },
              { label: 'Leadership Transition™', desc: 'Per transition' },
              { label: 'Training + Travel + Support', desc: 'Itemized' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-1.5">
                <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proposal Calculator Dialog */}
        <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Professional Services Proposal Builder
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Select what applies to your engagement. Every line item is separate — nothing is bundled.
              </p>
            </DialogHeader>
            {(() => {
              const LICENSE_OPTIONS = [
                { value: 'none', label: 'No annual license (services only)', price: 0 },
                { value: 'basic', label: 'Facility Basic', price: 10788 },
                { value: 'standard', label: 'Facility Standard', price: 23988 },
                { value: 'business', label: 'Facility Business', price: 47988 },
                { value: 'prestige', label: 'Facility Prestige', price: 83988 },
                { value: 'cmd_basic', label: 'Command Basic (Gov)', price: 4970 },
                { value: 'cmd_standard', label: 'Command Standard (Gov)', price: 9970 },
                { value: 'cmd_pro', label: 'Command Pro (Gov)', price: 19970 },
              ];

              const SERVICES = [
                { id: 'impl_assisted', label: 'Implementation — Assisted Setup', price: 4999, billing: 'one-time', desc: 'Guided onboarding, configuration, and team walkthrough.' },
                { id: 'impl_wg', label: 'Implementation — White-Glove', price: 12000, billing: 'one-time', desc: 'Full custom setup, data migration, integrations, and dedicated onboarding manager.' },
                { id: 'assessment', label: 'Assessment Services (FIAS)', price: 7500, billing: 'one-time', desc: 'Facility Intelligence Assessment — systems review, gap analysis, and findings report.' },
                { id: 'assessment_full', label: 'Assessment — Full Engagement', price: 24999, billing: 'one-time', desc: 'Multi-site assessment with stakeholder interviews, risk scoring, and roadmap deliverable.' },
                { id: 'advisory', label: 'Executive Advisory', price: 2500, billing: '/mo', desc: 'Monthly retainer — strategic guidance, operational reviews, and leadership advisory sessions.' },
                { id: 'op_leadership', label: 'Operational Leadership (Fractional)', price: 5000, billing: '/mo', desc: 'Part-time embedded operational leadership — fills gaps between permanent hires.' },
                { id: 'knowledge', label: 'Knowledge Transfer', price: 5000, billing: 'one-time', desc: 'Structured capture and documentation of institutional operational knowledge.' },
                { id: 'transition', label: 'Leadership Transition™', price: 7500, billing: 'one-time', desc: 'Full transition engagement — 30/60/90 day plan, knowledge interviews, and handover package.' },
                { id: 'training_sm', label: 'Training — Small Team (1–10)', price: 1500, billing: 'one-time', desc: 'Platform training package for small teams.' },
                { id: 'training_dept', label: 'Training — Department (11–25)', price: 3500, billing: 'one-time', desc: 'Department-level platform training.' },
                { id: 'training_ops', label: 'Training — Operations (26–50)', price: 6500, billing: 'one-time', desc: 'Full operations team training package.' },
              ];

              const TRAVEL_OPTIONS = [
                { value: 'none', label: 'No travel required', price: 0 },
                { value: 'regional', label: 'Regional (drive/day trip)', price: 1500 },
                { value: 'national', label: 'National (flight + hotel)', price: 3500 },
                { value: 'multisite', label: 'Multi-site / Extended', price: 5500 },
              ];

              const SUPPORT_OPTIONS = [
                { value: 'standard', label: 'Standard email support', price: 0 },
                { value: 'priority', label: 'Priority response (+$3,000/yr)', price: 3000 },
                { value: 'enterprise', label: 'Enterprise SLA — dedicated (+$10,000/yr)', price: 10000 },
              ];

              const licensePrice = LICENSE_OPTIONS.find(o => o.value === proposalLicense)?.price ?? 0;
              const servicesTotal = SERVICES.filter(s => proposalServices[s.id]).reduce((t, s) => t + s.price, 0);
              const travelPrice = TRAVEL_OPTIONS.find(o => o.value === proposalTravel)?.price ?? 0;
              const supportPrice = SUPPORT_OPTIONS.find(o => o.value === proposalSupport)?.price ?? 0;
              const grandTotal = licensePrice + servicesTotal + travelPrice + supportPrice;

              return (
                <div className="space-y-5 py-2">
                  {/* License */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Annual License</p>
                    <Select value={proposalLicense} onValueChange={setProposalLicense}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select license tier..." /></SelectTrigger>
                      <SelectContent>
                        {LICENSE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}{o.price > 0 ? ` — $${o.price.toLocaleString()}/yr` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Professional Services */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Professional Services</p>
                    <div className="space-y-2">
                      {SERVICES.map(svc => (
                        <label key={svc.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${proposalServices[svc.id] ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:bg-muted/20'}`}>
                          <input
                            type="checkbox"
                            className="mt-0.5 shrink-0 accent-primary"
                            checked={!!proposalServices[svc.id]}
                            onChange={e => setProposalServices(prev => ({ ...prev, [svc.id]: e.target.checked }))}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{svc.label}</span>
                              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                                ${svc.price.toLocaleString()} {svc.billing}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{svc.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Travel */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Travel (Estimated)</p>
                    <Select value={proposalTravel} onValueChange={setProposalTravel}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRAVEL_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}{o.price > 0 ? ` — ~$${o.price.toLocaleString()}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Support */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Ongoing Support</p>
                    <Select value={proposalSupport} onValueChange={setProposalSupport}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUPPORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Totals */}
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Proposal Summary</p>
                    {licensePrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Annual License ({LICENSE_OPTIONS.find(o => o.value === proposalLicense)?.label})</span>
                        <span className="font-medium">${licensePrice.toLocaleString()}/yr</span>
                      </div>
                    )}
                    {SERVICES.filter(s => proposalServices[s.id]).map(svc => (
                      <div key={svc.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{svc.label}</span>
                        <span className="font-medium">${svc.price.toLocaleString()} {svc.billing}</span>
                      </div>
                    ))}
                    {travelPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Travel (est.)</span>
                        <span className="font-medium">~${travelPrice.toLocaleString()}</span>
                      </div>
                    )}
                    {supportPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ongoing Support</span>
                        <span className="font-medium">${supportPrice.toLocaleString()}/yr</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-3 flex justify-between items-center">
                      <span className="font-semibold">Estimated Total</span>
                      <span className="text-xl font-bold text-primary">${grandTotal.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is a proposal estimate. Final engagement terms are confirmed in a signed statement of work.
                      Annual license and professional services are invoiced separately.
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <Button variant="outline" onClick={() => setProposalOpen(false)}>Close</Button>
                    <Button onClick={() => { setProposalOpen(false); openEngage('Proposal Calculator Inquiry'); }}>
                      Send to Nexum Suum <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

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
