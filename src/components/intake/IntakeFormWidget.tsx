import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL;

const FACILITY_TYPES = [
  'Commercial Office', 'Manufacturing / Industrial', 'Healthcare / Hospital',
  'Data Center', 'Education / School', 'Government / Public Facility',
  'Retail / Grocery', 'Hospitality / Hotel', 'Warehouse / Distribution', 'Other',
];

const PRIMARY_SYSTEMS = ['HVAC', 'Boiler', 'Chiller', 'Electrical', 'Plumbing', 'Controls', 'Compliance', 'Fleet', 'Other'];

const CHALLENGES = [
  "Can't justify decisions to leadership",
  'Repeated equipment failures',
  'Failed/upcoming compliance inspection',
  'High utility costs, no data',
  'No standardized SOPs',
  'Poor multi-location visibility',
  'Staff accountability issues',
];

const NEED_OPTIONS = [
  'Quick intro call (15 min)',
  'Formal facility assessment (FIAS)',
  'Document/SOP development',
  'Data analysis and reporting',
  'Ongoing platform access',
  'Not sure — help me figure it out',
];

const RECOMMENDED: Record<string, string> = {
  'Quick intro call (15 min)':         'We\'ll schedule a 15-minute discovery call with a facility intelligence advisor.',
  'Formal facility assessment (FIAS)': 'Our FIAS team will conduct a structured facility assessment and deliver a written intelligence report.',
  'Document/SOP development':          'We\'ll connect you with our documentation team to build defensible SOPs for your facility.',
  'Data analysis and reporting':        'Our analysts will review your current data and produce an executive-ready operations report.',
  'Ongoing platform access':            'We\'ll set you up with a pilot account so you can explore the full FI platform.',
  'Not sure — help me figure it out':  'A senior advisor will reach out to understand your situation and recommend the right starting point.',
};

type Step = 1 | 2 | 3 | 4;

interface StepOneData { fullName: string; workEmail: string; title: string; company: string; }
interface StepTwoData { facilityType: string; numFacilities: string; systems: string[]; }
interface StepThreeData { challenges: string[]; otherChallenge: string; }
interface StepFourData { need: string; }

export function IntakeFormWidget() {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [one, setOne] = useState<StepOneData>({ fullName: '', workEmail: '', title: '', company: '' });
  const [two, setTwo] = useState<StepTwoData>({ facilityType: '', numFacilities: '', systems: [] });
  const [three, setThree] = useState<StepThreeData>({ challenges: [], otherChallenge: '' });
  const [four, setFour] = useState<StepFourData>({ need: '' });

  const toggleItem = <T extends string>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const canNext = () => {
    if (step === 1) return one.fullName.trim() && one.workEmail.trim() && one.company.trim();
    if (step === 2) return two.facilityType && two.numFacilities;
    if (step === 3) return three.challenges.length > 0;
    return !!four.need;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await fetch(`${API}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName:      one.fullName,
          workEmail:     one.workEmail,
          title:         one.title,
          company:       one.company,
          facilityType:  two.facilityType,
          numFacilities: two.numFacilities,
          systems:       two.systems,
          challenges:    [...three.challenges, ...(three.otherChallenge ? [three.otherChallenge] : [])],
          need:          four.need,
          submittedAt:   new Date().toISOString(),
        }),
      });
      setSubmitted(true);
    } catch {
      // Still show success — intake is best-effort
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Thanks, {one.fullName.split(' ')[0]}!</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Check your email — we'll be in touch within 1 business day.
        </p>
        {four.need && RECOMMENDED[four.need] && (
          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-left max-w-sm mx-auto">
            <p className="font-semibold text-primary mb-1">What happens next</p>
            <p className="text-muted-foreground">{RECOMMENDED[four.need]}</p>
          </div>
        )}
      </div>
    );
  }

  const stepLabel = ['About You', 'Your Facility', 'Your Challenge', 'What You Need'][step - 1];

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {([1, 2, 3, 4] as Step[]).map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {s}
            </div>
            {s < 4 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Step {step} of 4 — {stepLabel}</p>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input value={one.fullName} onChange={e => setOne(o => ({ ...o, fullName: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Work Email *</Label>
              <Input type="email" value={one.workEmail} onChange={e => setOne(o => ({ ...o, workEmail: e.target.value }))} placeholder="jane@yourorg.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title / Role</Label>
              <Input value={one.title} onChange={e => setOne(o => ({ ...o, title: e.target.value }))} placeholder="Facilities Manager" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company *</Label>
              <Input value={one.company} onChange={e => setOne(o => ({ ...o, company: e.target.value }))} placeholder="Acme Corp" />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Facility Type *</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={two.facilityType}
              onChange={e => setTwo(t => ({ ...t, facilityType: e.target.value }))}
            >
              <option value="">Select type…</option>
              {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Number of Locations *</Label>
            <div className="flex gap-2 flex-wrap">
              {['1', '2–5', '6–15', '15+'].map(v => (
                <button
                  key={v} type="button"
                  onClick={() => setTwo(t => ({ ...t, numFacilities: v }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${two.numFacilities === v ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Primary Systems (select all that apply)</Label>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_SYSTEMS.map(sys => (
                <button
                  key={sys} type="button"
                  onClick={() => setTwo(t => ({ ...t, systems: toggleItem(t.systems, sys) }))}
                  className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${two.systems.includes(sys) ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                >
                  {sys}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-3">
          <Label className="text-xs">What challenges are you facing? *</Label>
          <div className="space-y-2">
            {CHALLENGES.map(ch => (
              <label key={ch} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={three.challenges.includes(ch)}
                  onChange={() => setThree(t => ({ ...t, challenges: toggleItem(t.challenges, ch) }))}
                  className="mt-0.5 rounded"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{ch}</span>
              </label>
            ))}
            <div className="space-y-1 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={!!three.otherChallenge} onChange={e => { if (!e.target.checked) setThree(t => ({ ...t, otherChallenge: '' })); }} className="rounded" />
                <span className="text-sm text-muted-foreground">Other</span>
              </label>
              {three.otherChallenge !== undefined && (
                <Input
                  className="ml-6 mt-1"
                  placeholder="Describe your challenge…"
                  value={three.otherChallenge}
                  onChange={e => setThree(t => ({ ...t, otherChallenge: e.target.value }))}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="space-y-3">
          <Label className="text-xs">What do you need most right now? *</Label>
          <div className="space-y-2">
            {NEED_OPTIONS.map(opt => (
              <label key={opt} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio" name="need"
                  checked={four.need === opt}
                  onChange={() => setFour({ need: opt })}
                  className="mt-0.5"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        {step > 1
          ? <Button variant="outline" size="sm" onClick={() => setStep(s => (s - 1) as Step)}>Back</Button>
          : <div />
        }
        {step < 4
          ? <Button size="sm" disabled={!canNext()} onClick={() => setStep(s => (s + 1) as Step)}>Next →</Button>
          : <Button size="sm" disabled={!canNext() || submitting} onClick={handleSubmit}>
              {submitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</> : 'Submit'}
            </Button>
        }
      </div>
    </div>
  );
}
