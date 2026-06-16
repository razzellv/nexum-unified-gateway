import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Flame, ArrowRight, Zap, Building2, Crown, Loader2, AlertTriangle, CalendarDays, Clock, Check } from 'lucide-react';

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
    icon: Crown, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/40',
    description: 'Your Prestige plan is active. Full platform access including the complete Prestige Intelligence™ suite.',
    features: ['Everything in Business', 'Prestige Intelligence™ Suite', 'VVFI Facility Instructor AI', 'OVPI Performance Intelligence', 'Optimize & Learn Training', 'Dedicated Account Manager'],
  },
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

const SLOT_LABELS: Record<string, string> = {
  "09:00": "9:00 AM", "10:00": "10:00 AM", "11:00": "11:00 AM",
  "13:00": "1:00 PM", "14:00": "2:00 PM",  "15:00": "3:00 PM",  "16:00": "4:00 PM",
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

  const serviceParam = searchParams.get('service');
  const isServicePayment = !!serviceParam;

  // Scheduling state (for consulting service payments)
  const [schedDate, setSchedDate]     = useState('');
  const [availSlots, setAvailSlots]   = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [schedForm, setSchedForm]     = useState({ name: '', email: '', phone: '', org: '', notes: '' });
  const [scheduling, setScheduling]   = useState(false);
  const [schedDone, setSchedDone]     = useState(false);

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

  const fetchSlots = async (date: string) => {
    if (!date) return;
    setSlotsLoading(true);
    setSelectedSlot('');
    try {
      const res = await fetch(`${API_BASE}/bookings?date=${date}`);
      const data = await res.json();
      setAvailSlots(data.available || []);
      setBookedSlots(data.bookedSlots || []);
    } catch {
      setAvailSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !schedDate) return;
    setScheduling(true);
    try {
      await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName:      schedForm.name,
          clientEmail:     schedForm.email,
          clientPhone:     schedForm.phone,
          clientOrg:       schedForm.org,
          service:         serviceParam || 'Consulting',
          scheduledDate:   schedDate,
          timeSlot:        selectedSlot,
          notes:           schedForm.notes,
          stripeSessionId: sessionId || '',
        }),
      });
      setSchedDone(true);
    } catch {
      setSchedDone(true); // show confirmation even if network fails
    } finally {
      setScheduling(false);
    }
  };

  // Auto-redirect countdown — only for platform subscription payments
  useEffect(() => {
    if (!verified || isServicePayment) return;
    if (count <= 0) { navigate('/onboarding'); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, verified, isServicePayment, navigate]);

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
      <div className="flex items-center gap-3 mb-10">
        <Flame className="w-8 h-8 text-primary" />
        <span className="font-bold text-2xl text-primary">Nexum Suum</span>
        <Badge variant="outline">Facility Intelligence™</Badge>
      </div>

      {isServicePayment ? (
        /* ── Service payment: scheduling flow ── */
        <div className="w-full max-w-lg space-y-6">
          {schedDone ? (
            <Card className="border-2 border-green-400/30 bg-green-400/5">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-400/20 border-2 border-green-400/30 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-3">Booking Confirmed</Badge>
                  <h1 className="text-2xl font-bold">You're all set!</h1>
                  <p className="text-muted-foreground mt-2 text-sm">
                    A confirmation email is on its way. We'll also reach out 24–48 hours before your session with prep notes.
                  </p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card/50 p-4 text-sm text-left space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{serviceParam}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{schedDate}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{SLOT_LABELS[selectedSlot] || selectedSlot} EST</span></div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-2 border-primary/30 bg-primary/5">
                <CardContent className="p-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold">Payment Confirmed</h1>
                  <p className="text-primary font-semibold">{serviceParam}</p>
                  <p className="text-muted-foreground text-sm">Now pick a date and time for your session.</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-5">
                  {/* Date picker */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      Select a date
                    </div>
                    <input
                      type="date"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      min={(() => { const d = new Date(); d.setDate(d.getDate()+2); return d.toISOString().split('T')[0]; })()}
                      max={(() => { const d = new Date(); d.setDate(d.getDate()+90); return d.toISOString().split('T')[0]; })()}
                      value={schedDate}
                      onChange={e => { setSchedDate(e.target.value); fetchSlots(e.target.value); }}
                    />
                    <p className="text-xs text-muted-foreground">Business days only · Eastern Time · Booking opens 2 days ahead</p>
                  </div>

                  {/* Time slots */}
                  {schedDate && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Clock className="w-4 h-4 text-primary" />
                        Available times
                        {slotsLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                      </div>
                      {!slotsLoading && (
                        <div className="grid grid-cols-4 gap-2">
                          {["09:00","10:00","11:00","13:00","14:00","15:00","16:00"].map(slot => {
                            const taken = bookedSlots.includes(slot);
                            const selected = selectedSlot === slot;
                            return (
                              <button
                                key={slot}
                                disabled={taken}
                                onClick={() => setSelectedSlot(slot)}
                                className={`rounded-md border px-2 py-2 text-xs font-medium transition-all ${
                                  taken    ? 'border-border/30 bg-muted/20 text-muted-foreground/40 cursor-not-allowed line-through' :
                                  selected ? 'border-primary bg-primary/20 text-primary' :
                                             'border-border hover:border-primary/50 hover:bg-primary/5'
                                }`}
                              >
                                {SLOT_LABELS[slot]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {!slotsLoading && availSlots.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">No slots available on this date. Please pick another day.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact form */}
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={submitBooking} className="space-y-4">
                    <p className="text-sm font-semibold">Your details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Name *</label>
                        <Input required value={schedForm.name} onChange={e => setSchedForm(f => ({...f, name: e.target.value}))} placeholder="Full name" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Email *</label>
                        <Input required type="email" value={schedForm.email} onChange={e => setSchedForm(f => ({...f, email: e.target.value}))} placeholder="you@company.com" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Phone</label>
                        <Input value={schedForm.phone} onChange={e => setSchedForm(f => ({...f, phone: e.target.value}))} placeholder="(555) 000-0000" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Organization</label>
                        <Input value={schedForm.org} onChange={e => setSchedForm(f => ({...f, org: e.target.value}))} placeholder="Facility or company" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Anything we should know before the session?</label>
                      <Textarea value={schedForm.notes} onChange={e => setSchedForm(f => ({...f, notes: e.target.value}))} placeholder="Systems, concerns, access requirements, questions…" rows={2} />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!selectedSlot || !schedDate || !schedForm.name || !schedForm.email || scheduling}
                    >
                      {scheduling ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Confirming…</> : <>Confirm Booking <ArrowRight className="w-4 h-4 ml-2" /></>}
                    </Button>
                    {(!selectedSlot || !schedDate) && (
                      <p className="text-xs text-muted-foreground text-center">Select a date and time above to continue.</p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        /* ── Platform subscription: existing onboarding flow ── */
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
      )}
    </div>
  );
}
