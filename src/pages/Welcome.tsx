import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Flame, ArrowRight, Zap, Building2, Crown, Loader2, AlertTriangle } from 'lucide-react';

const TIER_DETAILS: Record<string, {
  icon: React.ElementType; color: string; bg: string; border: string;
  features: string[]; description: string;
}> = {
  BASIC: {
    icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30',
    description: 'Your Basic plan is active. You have access to core facility management tools.',
    features: ['Equipment Library', 'Facility Data Source', 'Compliance Logger', 'Work Orders', 'Basic Dashboards'],
  },
  STANDARD: {
    icon: Building2, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30',
    description: 'Your Standard plan is active. Full operational visibility across your facilities.',
    features: ['Everything in Basic', 'Vendor Hub', 'Energy Dashboard', 'Manager & Supervisor Dashboards', 'Inventory Library'],
  },
  BUSINESS: {
    icon: Flame, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30',
    description: 'Your Business plan is active. Advanced multi-site intelligence at your fingertips.',
    features: ['Everything in Standard', 'Executive Dashboard', 'Multi-facility Analytics', 'Compliance Analyzer AI', 'Full Command Hub'],
  },
  PREMIUM: {
    icon: Crown, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30',
    description: 'Your Premium plan is active. Full platform access including all AI-powered features.',
    features: ['Everything in Business', 'VVFI Facility Instructor AI', 'OVPI Performance Intelligence', 'Optimize & Learn Training', 'Dedicated Account Manager'],
  },
};

export default function Welcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const tierParam = (searchParams.get('tier') || 'BASIC').toUpperCase();

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState(tierParam);
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (!sessionId) {
      navigate('/pricing');
      return;
    }
    verifySession();
  }, [sessionId]);

  const verifySession = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stripe/verify-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || 'Payment verification failed');
        setVerifying(false);
        return;
      }

      // Store verified flag + session info for onboarding gate
      sessionStorage.setItem('nexum_onboarding_verified', 'true');
      sessionStorage.setItem('nexum_onboarding_session', sessionId!);
      sessionStorage.setItem('nexum_onboarding_tier', data.tier);
      sessionStorage.setItem('nexum_onboarding_email', data.email || '');

      setTier(data.tier);
      setVerified(true);
      setVerifying(false);
    } catch (err) {
      setError('Could not verify payment. Please contact support.');
      setVerifying(false);
    }
  };

  // Auto-redirect countdown after verified
  useEffect(() => {
    if (!verified) return;
    if (count <= 0) { navigate('/onboarding'); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, verified, navigate]);

  const details = TIER_DETAILS[tier] || TIER_DETAILS.BASIC;
  const Icon = details.icon;

  // Verifying state
  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">Payment Verification Failed</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/pricing')}>Back to Pricing</Button>
            <Button onClick={verifySession}>Try Again</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If you believe this is an error, contact{' '}
            <a href="mailto:support@nexumsuum.com" className="text-primary">support@nexumsuum.com</a>
          </p>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-12">
        <Flame className="w-8 h-8 text-primary" />
        <span className="font-bold text-2xl text-primary">Nexum Suum</span>
        <Badge variant="outline">Facility Intelligence™</Badge>
      </div>

      <div className="w-full max-w-lg space-y-6">
        <Card className={`border-2 ${details.border} ${details.bg}`}>
          <CardContent className="p-8 text-center space-y-4">
            <div className={`w-16 h-16 rounded-full ${details.bg} border-2 ${details.border} flex items-center justify-center mx-auto`}>
              <CheckCircle className={`w-8 h-8 ${details.color}`} />
            </div>
            <div>
              <Badge className={`${details.bg} ${details.color} ${details.border} mb-3`}>{tier} PLAN</Badge>
              <h1 className="text-3xl font-bold">Payment Confirmed!</h1>
              <p className="text-muted-foreground mt-2">{details.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Icon className={`w-5 h-5 ${details.color}`} />
              What's included in your {tier} plan
            </h3>
            <div className="space-y-2">
              {details.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`w-4 h-4 shrink-0 ${details.color}`} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 text-center space-y-4">
            <h3 className="font-semibold">Next: Set up your facility</h3>
            <p className="text-sm text-muted-foreground">
              The setup wizard will guide you through adding your organization, staff, equipment, inventory, and utility rates. Takes about 10 minutes.
            </p>
            <Button className="w-full" onClick={() => navigate('/onboarding')}>
              Start Setup Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Redirecting automatically in {count}s...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
