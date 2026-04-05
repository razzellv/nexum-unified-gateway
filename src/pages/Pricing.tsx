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
  ShoppingCart, Shield, Star, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SectorTab = 'facility' | 'retail' | 'government';

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

const ADDONS = [
  { name: 'FI Platform Implementation', price: 4999, priceId: 'price_1TAbl7Dfw4bOR2dfSxKwaYdP', desc: 'White-glove onboarding and setup', billing: 'one-time' },
  { name: 'FI Enterprise Support', price: 10000, priceId: 'price_1TAbiWDfw4bOR2dfrBMHzuqV', desc: 'Dedicated support SLA', billing: '/yr' },
  { name: 'FI Priority Support', price: 3000, priceId: 'price_1TAbhqDfw4bOR2dfM0FNrTlF', desc: 'Priority response guarantee', billing: '/yr' },
  { name: 'Training — Small Team (1–10)', price: 1500, priceId: 'price_1TAbVLDfw4bOR2dfHMCBek1G', desc: 'Team training package', billing: 'one-time' },
  { name: 'Training — Department (11–25)', price: 3500, priceId: 'price_1TAbWXDfw4bOR2dfeb5UqZHy', desc: 'Department training package', billing: 'one-time' },
  { name: 'Training — Operations (26–50)', price: 6500, priceId: 'price_1TAbXhDfw4bOR2dfXVyOvlJe', desc: 'Operations training package', billing: 'one-time' },
];

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

  const activePlans =
    sector === 'facility' ? FACILITY_PLANS :
    sector === 'retail' ? RETAIL_PLANS :
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
      const lineItems = [
        { price: priceId, quantity: 1 },
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
    return '';
  };

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
              { value: 'facility' as const, label: 'Facility', icon: Building2 },
              { value: 'retail' as const, label: 'Retail', icon: ShoppingCart },
              { value: 'government' as const, label: 'Government', icon: Shield },
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
          {sector === 'retail' ? (
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

        {/* Enterprise Quote Form */}
        <div id="enterprise-quote" className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Request Enterprise Quote</h2>
            <p className="text-muted-foreground mt-1">
              Custom pricing for large deployments, multi-agency coordination, or white-label needs
            </p>
          </div>

          {quoteSuccess ? (
            <Card className="max-w-2xl mx-auto border-green-400/30 bg-green-400/5">
              <CardContent className="p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-green-400/20 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold">Quote Request Received</h3>
                <p className="text-muted-foreground">
                  Our team will reach out within 1–2 business days to discuss your requirements.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-2xl mx-auto border-border/40">
              <CardContent className="p-8">
                <form onSubmit={handleQuoteSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Company Name</label>
                      <Input required value={quoteForm.companyName}
                        onChange={e => setQuoteForm(f => ({ ...f, companyName: e.target.value }))}
                        placeholder="Acme Public Safety" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Contact Name</label>
                      <Input required value={quoteForm.contactName}
                        onChange={e => setQuoteForm(f => ({ ...f, contactName: e.target.value }))}
                        placeholder="Jane Smith" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Email</label>
                      <Input required type="email" value={quoteForm.email}
                        onChange={e => setQuoteForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="jane@agency.gov" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Phone</label>
                      <Input value={quoteForm.phone}
                        onChange={e => setQuoteForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+1 (555) 000-0000" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Estimated Facilities / Locations</label>
                      <Input value={quoteForm.estimatedLocations}
                        onChange={e => setQuoteForm(f => ({ ...f, estimatedLocations: e.target.value }))}
                        placeholder="e.g. 12" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Team Size</label>
                      <Input value={quoteForm.teamSize}
                        onChange={e => setQuoteForm(f => ({ ...f, teamSize: e.target.value }))}
                        placeholder="e.g. 50" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Organization Type</label>
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

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Additional Notes</label>
                    <Textarea value={quoteForm.notes}
                      onChange={e => setQuoteForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Describe your use case, integration needs, or any questions..."
                      rows={4} />
                  </div>

                  <Button type="submit" className="w-full" disabled={quoteSubmitting}>
                    {quoteSubmitting ? 'Submitting...' : 'Submit Quote Request'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
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
