import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Flame, Zap, Building2, Crown, ArrowRight, X } from 'lucide-react';

const PLANS = [
  {
    name: 'BASIC',
    price: 899,
    priceId: 'price_1TAbJ4Dfw4bOR2dfEHzEs5qY',
    icon: Zap,
    color: 'text-blue-400',
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/5',
    badge: null,
    description: 'For small facilities getting started with digital operations.',
    features: [
      'Up to 2 facilities',
      'Equipment Library',
      'Facility Data Source logging',
      'Compliance Logger',
      'Work Orders',
      'Basic dashboards',
      'Email support',
    ],
    excluded: ['VVFI Facility Instructor', 'OVPI Performance Intelligence', 'Vendor Hub', 'Multi-facility analytics'],
  },
  {
    name: 'STANDARD',
    price: 1999,
    priceId: 'price_1TAbKQDfw4bOR2df9CbJymgf',
    icon: Building2,
    color: 'text-cyan-400',
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-400/5',
    badge: null,
    description: 'For growing facilities needing full operational visibility.',
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
    excluded: ['VVFI Facility Instructor', 'OVPI Performance Intelligence'],
  },
  {
    name: 'BUSINESS',
    price: 3999,
    priceId: 'price_1TAbNoDfw4bOR2dfepJUVort',
    icon: Flame,
    color: 'text-orange-400',
    border: 'border-orange-400/40',
    bg: 'bg-orange-400/5',
    badge: 'Most Popular',
    description: 'For multi-site operations requiring advanced intelligence.',
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
    excluded: ['VVFI Facility Instructor', 'OVPI Performance Intelligence'],
  },
  {
    name: 'PREMIUM',
    price: 6999,
    priceId: 'price_1TAbPLDfw4bOR2dfeT4Posk4',
    icon: Crown,
    color: 'text-purple-400',
    border: 'border-purple-400/40',
    bg: 'bg-purple-400/5',
    badge: 'Full Platform',
    description: 'Unlimited access to every feature including AI-powered tools.',
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
    excluded: [],
  },
];

const ADDONS = [
  { name: 'FI Platform Implementation', price: 4999, priceId: 'price_1TAbl7Dfw4bOR2dfSxKwaYdP', desc: 'White-glove onboarding and setup' },
  { name: 'Enterprise Support', price: 10000, priceId: 'price_1TAbiWDfw4bOR2dfrBMHzuqV', desc: '$10,000/yr dedicated support SLA', yearly: true },
  { name: 'Priority Support', price: 3000, priceId: 'price_1TAbhqDfw4bOR2dfM0FNrTlF', desc: '$3,000/yr priority response', yearly: true },
  { name: 'Training — Small Team (1-10)', price: 1500, priceId: 'price_1TAbVLDfw4bOR2dfHMCBek1G', desc: 'Team training package' },
  { name: 'Training — Department (11-25)', price: 3500, priceId: 'price_1TAbWXDfw4bOR2dfeb5UqZHy', desc: 'Department training package' },
  { name: 'Training — Operations (26-50)', price: 6500, priceId: 'price_1TAbXhDfw4bOR2dfXVyOvlJe', desc: 'Operations training package' },
];

const STRIPE_PUBLISHABLE_KEY = 'pk_live_51SSR6lDfw4bOR2df5ApX52Fh13A1SyWwg7e1Ai0x8a4LDB7oeICZWB22NWk6ieI4uK2cKg53ZfQFK2FPvXRH0FAO008Fq6SXK5';

export default function Pricing() {
  const navigate = useNavigate();
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const toggleAddon = (priceId: string) => {
    setSelectedAddons(prev =>
      prev.includes(priceId) ? prev.filter(id => id !== priceId) : [...prev, priceId]
    );
  };

  const handleCheckout = async (plan: typeof PLANS[0]) => {
    setLoadingPlan(plan.name);
    try {
      // Build line items
      const lineItems = [
        { price: plan.priceId, quantity: 1 },
        ...selectedAddons.map(id => ({ price: id, quantity: 1 })),
      ];

      // Call your backend to create a Stripe Checkout session
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
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      // Fallback: redirect to Stripe payment link if backend not ready
      alert('Redirecting to checkout...');
    } finally {
      setLoadingPlan(null);
    }
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
          <Button size="sm" onClick={() => window.open('https://nexumsuum.com', '_blank')}>Learn More</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge className="bg-primary/20 text-primary border-primary/30">Decision Defensibility™</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">Facility Intelligence for Every Scale</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time monitoring, AI-powered insights, and comprehensive compliance tracking for facility operations teams.
          </p>
          <p className="text-sm text-muted-foreground">All plans billed annually · Cancel anytime</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col border-2 ${plan.border} ${plan.bg} transition-all hover:scale-[1.02]`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`${plan.name === 'PREMIUM' ? 'bg-purple-500' : 'bg-orange-500'} text-white border-0`}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4 pt-6">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${plan.bg} border ${plan.border}`}>
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price.toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm">/yr</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <div className="space-y-2">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.color}`} />
                        <span>{f}</span>
                      </div>
                    ))}
                    {plan.excluded.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm opacity-40">
                        <X className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className={`mt-auto w-full ${plan.name === 'PREMIUM' ? 'bg-purple-500 hover:bg-purple-600' : plan.name === 'BUSINESS' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                    onClick={() => handleCheckout(plan)}
                    disabled={loadingPlan === plan.name}
                  >
                    {loadingPlan === plan.name ? 'Redirecting...' : `Get ${plan.name}`}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
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
                <Card
                  key={addon.priceId}
                  onClick={() => toggleAddon(addon.priceId)}
                  className={`cursor-pointer transition-all border-2 ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{addon.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{addon.desc}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold">${addon.price.toLocaleString()}</p>
                      {selected && <Badge className="text-xs bg-primary/20 text-primary mt-1">Added</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {selectedAddons.length > 0 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {selectedAddons.length} add-on{selectedAddons.length > 1 ? 's' : ''} selected — will be added to your checkout
              </p>
            </div>
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
