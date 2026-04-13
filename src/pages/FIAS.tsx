import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardCheck, ChevronRight, ChevronLeft, Lock, AlertTriangle,
  CheckCircle, Shield, Building2, User, Wrench, FileText,
  TrendingDown, TrendingUp, BarChart3, Zap, AlertOctagon,
  Download, Plus, Trash2, ArrowRight, Mail, Send,
} from 'lucide-react';
import {
  SystemType, AssessmentType, FIASFinding, RiskBand,
  SYSTEM_QUESTION_SETS, GLOBAL_CONDITION_QUESTIONS, ASSESSMENT_TYPE_META,
  RISK_BAND_META, SCORE_LABEL, SECTION_META,
  scoreSection, computeFIASScore, getRiskBand, getAllQuestions,
  ConditionQuestion,
} from '@/data/fiasData';

// ── Constants ─────────────────────────────────────────────────────────────────

const SYSTEM_OPTIONS: { value: SystemType; label: string; icon: string }[] = [
  { value: 'boiler',        label: 'Boiler System',           icon: '🔥' },
  { value: 'chiller',       label: 'Chiller System',          icon: '❄️' },
  { value: 'ahu',           label: 'Air Handling Unit',       icon: '💨' },
  { value: 'cooling_tower', label: 'Cooling Tower',           icon: '🌊' },
  { value: 'pump',          label: 'Pump System',             icon: '⚙️' },
  { value: 'generator',     label: 'Emergency Generator',     icon: '⚡' },
  { value: 'electrical',    label: 'Electrical Distribution', icon: '🔌' },
  { value: 'fire_safety',   label: 'Fire Safety Systems',     icon: '🚒' },
  { value: 'general',       label: 'General Facility',        icon: '🏢' },
];

const STEPS = [
  { id: 1, label: 'Identity',     icon: Building2 },
  { id: 2, label: 'Condition',    icon: ClipboardCheck },
  { id: 3, label: 'Performance',  icon: BarChart3 },
  { id: 4, label: 'Risk',         icon: AlertTriangle },
  { id: 5, label: 'Score',        icon: TrendingUp },
  { id: 6, label: 'Findings',     icon: FileText },
  { id: 7, label: 'Output',       icon: CheckCircle },
];

const SCORE_COLORS: Record<number, string> = {
  1: 'border-red-500 bg-red-500/20 text-red-400',
  2: 'border-orange-500 bg-orange-500/20 text-orange-400',
  3: 'border-yellow-500 bg-yellow-500/20 text-yellow-400',
  4: 'border-blue-500 bg-blue-500/20 text-blue-400',
  5: 'border-green-500 bg-green-500/20 text-green-400',
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FIAS() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Only Nexum Suum admins
  const isAdmin = userRole === 'admin';

  // ── Step state ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Section 1: Identity ──────────────────────────────────────────────────────
  const [facilityName, setFacilityName] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [location, setLocation] = useState('');
  const [systemType, setSystemType] = useState<SystemType>('boiler');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('pre_onboarding');
  const [equipmentTag, setEquipmentTag] = useState('');
  const [assessorName, setAssessorName] = useState(user?.name || user?.email || '');
  const [assessorEmail, setAssessorEmail] = useState(user?.email || '');
  const [conductedAt] = useState(new Date().toISOString().slice(0, 16));

  // ── Section 2: Condition responses ──────────────────────────────────────────
  const [conditionResponses, setConditionResponses] = useState<
    Record<string, { score: number; evidence: string }>
  >({});

  // ── Section 3: Performance notes ────────────────────────────────────────────
  const [performanceNotes, setPerformanceNotes] = useState('');
  const [performanceScore, setPerformanceScore] = useState(70);

  // ── Section 4: Risk ──────────────────────────────────────────────────────────
  const [safetyRisk, setSafetyRisk] = useState(50);
  const [complianceRisk, setComplianceRisk] = useState(50);
  const [operationalRisk, setOperationalRisk] = useState(50);
  const [riskNotes, setRiskNotes] = useState('');

  // ── Section 6: Findings ──────────────────────────────────────────────────────
  const [findings, setFindings] = useState<FIASFinding[]>([]);
  const [newFinding, setNewFinding] = useState<Partial<FIASFinding>>({
    systemArea: '', observedCondition: '', recommendedAction: '',
    priority: 'medium', generateWorkOrder: true,
  });

  // ── Section 7: Sealed ────────────────────────────────────────────────────────
  const [sealed, setSealed] = useState(false);

  // ── Computed scores ──────────────────────────────────────────────────────────
  const allQuestions = useMemo(() => getAllQuestions(systemType), [systemType]);

  const conditionScore = useMemo(
    () => scoreSection(conditionResponses, allQuestions),
    [conditionResponses, allQuestions]
  );

  const riskScore = useMemo(() => {
    // Risk score: invert — low risk = high score
    const avgRisk = (safetyRisk + complianceRisk + operationalRisk) / 3;
    return Math.round(100 - avgRisk);
  }, [safetyRisk, complianceRisk, operationalRisk]);

  const fiasScore = useMemo(
    () => computeFIASScore(conditionScore, performanceScore, riskScore),
    [conditionScore, performanceScore, riskScore]
  );

  const riskBand: RiskBand = useMemo(() => getRiskBand(fiasScore), [fiasScore]);
  const bandMeta = RISK_BAND_META[riskBand];

  const answeredCount = Object.keys(conditionResponses).filter(
    k => conditionResponses[k]?.score > 0
  ).length;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const setResponse = (qId: string, field: 'score' | 'evidence', value: any) => {
    setConditionResponses(prev => ({
      ...prev,
      [qId]: { ...prev[qId], score: prev[qId]?.score || 0, evidence: prev[qId]?.evidence || '', [field]: value },
    }));
  };

  const addFinding = () => {
    if (!newFinding.systemArea || !newFinding.observedCondition || !newFinding.recommendedAction) {
      toast({ title: 'All finding fields required', variant: 'destructive' }); return;
    }
    setFindings(prev => [...prev, {
      ...newFinding as FIASFinding,
      id: `finding-${Date.now()}`,
    }]);
    setNewFinding({ systemArea: '', observedCondition: '', recommendedAction: '', priority: 'medium', generateWorkOrder: true });
  };

  const removeFinding = (id: string) => setFindings(prev => prev.filter(f => f.id !== id));

  const sealAssessment = () => {
    if (!facilityName || !assessorName) {
      toast({ title: 'Facility name and assessor required before sealing', variant: 'destructive' }); return;
    }
    setSealed(true);
    toast({ title: 'Assessment Sealed', description: 'FIAS record is now immutable and ready to push to platform.' });
  };

  const pushToPlatform = () => {
    const session = {
      sessionId: `fias-${Date.now()}`,
      facilityId: facilityId || `fac-${Date.now()}`,
      facilityName, location, systemType, assessmentType,
      assessorName, assessorEmail, conductedAt, equipmentTag,
      conditionScore, performanceScore, riskScore, fiasScore, riskBand,
      conditionResponses, performanceNotes, riskNotes, findings,
      sealed: true, sealedAt: new Date().toISOString(),
    };
    // Persist to localStorage so dashboards can read it
    const existing = (() => { try { return JSON.parse(localStorage.getItem('nexum_fias_sessions') || '[]'); } catch { return []; } })();
    localStorage.setItem('nexum_fias_sessions', JSON.stringify([session, ...existing]));
    // Dispatch event so dashboards update
    window.dispatchEvent(new CustomEvent('fias-session-submitted', { detail: session }));
    toast({ title: 'Pushed to Platform', description: `FIAS score ${fiasScore} for ${facilityName} is now live on dashboards.` });
    navigate('/dashboard/executive');
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full py-20">
          <div className="text-center space-y-3">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-medium">FIAS is a Nexum Suum internal tool.</p>
            <p className="text-xs text-muted-foreground">Access restricted to admin accounts.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <ClipboardCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                FIAS <span className="text-muted-foreground font-normal text-base">— Facility Intelligence Assessment System</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Internal tool · Nexum Suum staff only · Records sealed on submission</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />Admin
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => !sealed && setStep(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    active ? 'bg-primary/20 border-primary/50 text-primary' :
                    done  ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                    'border-border/30 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {done ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {s.label}
                </button>
                {idx < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* ── SECTION 1: IDENTITY ── */}
        {step === 1 && (
          <Card className="neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-5 h-5 text-primary" />
                Section 1 — Session Identity
              </CardTitle>
              <p className="text-xs text-muted-foreground">Establish who is conducting this assessment, what is being assessed, and why.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Facility Name *</Label>
                  <Input value={facilityName} onChange={e => setFacilityName(e.target.value)} placeholder="e.g., Riverside Municipal Complex" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Facility ID</Label>
                  <Input value={facilityId} onChange={e => setFacilityId(e.target.value)} placeholder="e.g., FAC-2026-004 (leave blank to auto-assign)" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Location / Building</Label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Main Building, Floor 2 Mechanical Room" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide">System Being Assessed *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {SYSTEM_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setSystemType(opt.value)}
                        className={cn('flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs border transition-all',
                          systemType === opt.value ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground hover:text-foreground')}>
                        <span>{opt.icon}</span>{opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Assessment Type *</Label>
                  <div className="space-y-2">
                    {(Object.keys(ASSESSMENT_TYPE_META) as AssessmentType[]).map(type => (
                      <button key={type} onClick={() => setAssessmentType(type)}
                        className={cn('w-full flex items-start gap-2 p-2.5 rounded-lg text-left text-xs border transition-all',
                          assessmentType === type ? 'bg-primary/10 border-primary/40 text-foreground' : 'border-border/30 text-muted-foreground hover:text-foreground')}>
                        <div className={cn('w-2 h-2 rounded-full mt-0.5 shrink-0', assessmentType === type ? 'bg-primary' : 'bg-muted-foreground/30')} />
                        <div>
                          <p className="font-semibold">{ASSESSMENT_TYPE_META[type].label}</p>
                          <p className="text-muted-foreground">{ASSESSMENT_TYPE_META[type].description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Equipment Tag / ID</Label>
                  <Input value={equipmentTag} onChange={e => setEquipmentTag(e.target.value)} placeholder="e.g., BOILER-01, CHIL-A" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Assessor Name *</Label>
                  <Input value={assessorName} onChange={e => setAssessorName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Assessor Email</Label>
                  <Input value={assessorEmail} onChange={e => setAssessorEmail(e.target.value)} placeholder="name@nexumsuum.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Assessment Date & Time</Label>
                  <Input type="datetime-local" defaultValue={conductedAt} disabled className="opacity-70" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => {
                  if (!facilityName || !assessorName) { toast({ title: 'Facility name and assessor name required', variant: 'destructive' }); return; }
                  setStep(2);
                }}>
                  Next: Condition Assessment <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── SECTION 2: CONDITION QUESTIONS ── */}
        {step === 2 && (
          <Card className="neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Section 2 — Condition Assessment
                <Badge variant="outline" className="ml-auto text-xs">
                  {answeredCount} / {allQuestions.length} answered
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Score each question 1–5. Evidence field required for scores below 4.
                Global questions apply to all systems; system-specific questions follow.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {(['physical', 'safety', 'operational', 'documentation'] as const).map(section => {
                const sectionQs = allQuestions.filter(q => q.section === section);
                const meta = SECTION_META[section];
                return (
                  <div key={section} className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-border/30">
                      <span className={cn('text-xs font-bold uppercase tracking-widest', meta.color)}>{meta.label}</span>
                    </div>
                    {sectionQs.map((q: ConditionQuestion) => {
                      const resp = conditionResponses[q.id];
                      const score = resp?.score || 0;
                      return (
                        <div key={q.id} className="rounded-lg border border-border/30 bg-muted/10 p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-snug">{q.question}</p>
                              <p className="text-xs text-muted-foreground mt-1 italic">{q.guidance}</p>
                              {q.weight === 3 && (
                                <Badge className="mt-1.5 text-[10px] bg-red-500/10 text-red-400 border-red-500/20">Critical Weight</Badge>
                              )}
                            </div>
                          </div>
                          {/* Score buttons 1–5 */}
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button key={n} onClick={() => setResponse(q.id, 'score', n)}
                                className={cn('flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all',
                                  score === n ? SCORE_COLORS[n] : 'border-border/30 text-muted-foreground hover:border-border')}>
                                {n}<span className="hidden sm:inline"> — {SCORE_LABEL[n]}</span>
                              </button>
                            ))}
                          </div>
                          {/* Evidence */}
                          <Textarea
                            placeholder={score > 0 && score < 4 ? 'Evidence required for score below 4...' : 'Evidence / observations (optional for score 4–5)'}
                            value={resp?.evidence || ''}
                            onChange={e => setResponse(q.id, 'evidence', e.target.value)}
                            rows={2}
                            className={cn('text-xs resize-none', score > 0 && score < 4 && !resp?.evidence ? 'border-orange-500/50' : '')}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Condition score preview */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-4">
                <div className="text-center min-w-[80px]">
                  <p className={cn('text-3xl font-bold', conditionScore >= 85 ? 'text-green-400' : conditionScore >= 70 ? 'text-yellow-400' : conditionScore >= 50 ? 'text-orange-400' : 'text-red-400')}>
                    {conditionScore}
                  </p>
                  <p className="text-xs text-muted-foreground">Condition Score</p>
                </div>
                <Progress value={conditionScore} className="flex-1 h-2" />
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
                <Button onClick={() => setStep(3)}>Next: Performance Review <ChevronRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Steps 3–7 placeholder — rendered in next pass */}
        {step >= 3 && step <= 7 && (
          <StepsThreeToSeven
            step={step} setStep={setStep}
            performanceNotes={performanceNotes} setPerformanceNotes={setPerformanceNotes}
            performanceScore={performanceScore} setPerformanceScore={setPerformanceScore}
            safetyRisk={safetyRisk} setSafetyRisk={setSafetyRisk}
            complianceRisk={complianceRisk} setComplianceRisk={setComplianceRisk}
            operationalRisk={operationalRisk} setOperationalRisk={setOperationalRisk}
            riskNotes={riskNotes} setRiskNotes={setRiskNotes}
            conditionScore={conditionScore} riskScore={riskScore} fiasScore={fiasScore}
            riskBand={riskBand} bandMeta={bandMeta}
            findings={findings} setFindings={setFindings}
            newFinding={newFinding} setNewFinding={setNewFinding}
            addFinding={addFinding} removeFinding={removeFinding}
            sealed={sealed} sealAssessment={sealAssessment} pushToPlatform={pushToPlatform}
            facilityName={facilityName} systemType={systemType}
          />
        )}
      </div>
    </MainLayout>
  );
}

// ── Steps 3–7 Implementation ──────────────────────────────────────────────────
function StepsThreeToSeven({
  step, setStep,
  performanceNotes, setPerformanceNotes,
  performanceScore, setPerformanceScore,
  safetyRisk, setSafetyRisk,
  complianceRisk, setComplianceRisk,
  operationalRisk, setOperationalRisk,
  riskNotes, setRiskNotes,
  conditionScore, riskScore, fiasScore,
  riskBand, bandMeta,
  findings, newFinding, setNewFinding,
  addFinding, removeFinding,
  sealed, sealAssessment, pushToPlatform,
  facilityName, systemType,
}: any) {
  const PRIORITY_META = {
    critical: { label: 'Critical', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    high:     { label: 'High',     color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    medium:   { label: 'Medium',   color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    low:      { label: 'Low',      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  };

  // ── Section 3: Performance ───────────────────────────────────────────────────
  if (step === 3) return (
    <Card className="neon-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-5 h-5 text-primary" />
          Section 3 — Performance Review
        </CardTitle>
        <p className="text-xs text-muted-foreground">Assess operational performance against design specs: output capacity, efficiency ratings, uptime, and benchmark comparisons.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide">Performance Score (0–100) *</Label>
          <div className="flex items-center gap-4">
            <input
              type="range" min={0} max={100} value={performanceScore}
              onChange={e => setPerformanceScore(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <div className="text-center min-w-[60px]">
              <p className={cn('text-2xl font-bold',
                performanceScore >= 85 ? 'text-green-400' :
                performanceScore >= 70 ? 'text-yellow-400' :
                performanceScore >= 50 ? 'text-orange-400' : 'text-red-400')}>
                {performanceScore}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {performanceScore >= 85 ? 'Optimal' : performanceScore >= 70 ? 'Functional' : performanceScore >= 50 ? 'Degraded' : 'Poor'}
              </p>
            </div>
          </div>
          <Progress value={performanceScore} className="h-2" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Poor',       range: '0–49',   color: 'text-red-400 border-red-500/20 bg-red-500/5' },
            { label: 'Degraded',   range: '50–69',  color: 'text-orange-400 border-orange-500/20 bg-orange-500/5' },
            { label: 'Functional', range: '70–84',  color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' },
            { label: 'Optimal',    range: '85–100', color: 'text-green-400 border-green-500/20 bg-green-500/5' },
          ].map(t => (
            <div key={t.label} className={cn('rounded-lg border p-3 text-center', t.color)}>
              <p className="font-semibold text-sm">{t.label}</p>
              <p className="text-xs opacity-70">{t.range}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide">Performance Context Notes</Label>
          <Textarea
            value={performanceNotes}
            onChange={e => setPerformanceNotes(e.target.value)}
            placeholder="Describe observed performance: output levels, efficiency losses, benchmark deviations, recent trends..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
          <Button onClick={() => setStep(4)}>Next: Risk Classification <ChevronRight className="w-4 h-4 ml-2" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  // ── Section 4: Risk ──────────────────────────────────────────────────────────
  if (step === 4) {
    const avgRisk = (safetyRisk + complianceRisk + operationalRisk) / 3;
    const compositeRiskScore = Math.round(100 - avgRisk);
    return (
      <Card className="neon-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Section 4 — Risk Classification
          </CardTitle>
          <p className="text-xs text-muted-foreground">Quantify risk exposure across three domains. Higher percentage = higher risk exposure.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            { label: 'Safety Risk',      sublabel: 'Injury, hazard, or unsafe operating conditions',              value: safetyRisk,      setter: setSafetyRisk,      icon: AlertOctagon, warnColor: 'text-red-400'    },
            { label: 'Compliance Risk',  sublabel: 'Code violations, permit gaps, regulatory exposure',           value: complianceRisk,  setter: setComplianceRisk,  icon: Shield,       warnColor: 'text-orange-400' },
            { label: 'Operational Risk', sublabel: 'Downtime likelihood, continuity risk, failure probability',   value: operationalRisk, setter: setOperationalRisk, icon: Wrench,       warnColor: 'text-yellow-400' },
          ].map(({ label, sublabel, value, setter, icon: Icon, warnColor }) => (
            <div key={label} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
                    <Icon className={cn('w-3.5 h-3.5', warnColor)} />{label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
                </div>
                <span className={cn('text-xl font-bold min-w-[48px] text-right',
                  value >= 70 ? 'text-red-400' : value >= 40 ? 'text-yellow-400' : 'text-green-400')}>
                  {value}%
                </span>
              </div>
              <input
                type="range" min={0} max={100} value={value}
                onChange={e => setter(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Low Risk (0%)</span><span>Moderate (50%)</span><span>High Risk (100%)</span>
              </div>
            </div>
          ))}

          {/* Composite risk score */}
          <div className="p-4 rounded-lg border border-border/30 bg-muted/10 flex items-center gap-4">
            <div className="text-center min-w-[90px]">
              <p className={cn('text-3xl font-bold',
                compositeRiskScore >= 85 ? 'text-green-400' :
                compositeRiskScore >= 70 ? 'text-yellow-400' :
                compositeRiskScore >= 50 ? 'text-orange-400' : 'text-red-400')}>
                {compositeRiskScore}
              </p>
              <p className="text-xs text-muted-foreground">Risk Score</p>
              <p className="text-[10px] text-muted-foreground">(inverted avg)</p>
            </div>
            <div className="flex-1">
              <Progress value={compositeRiskScore} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {compositeRiskScore >= 85 ? 'Minimal risk profile — system well-controlled.' :
                 compositeRiskScore >= 70 ? 'Moderate risk — monitor and schedule review.' :
                 compositeRiskScore >= 50 ? 'Elevated risk — action plan recommended.' :
                 'Critical risk — immediate intervention required.'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide">Risk Notes</Label>
            <Textarea
              value={riskNotes}
              onChange={e => setRiskNotes(e.target.value)}
              placeholder="Detail specific risk factors, recent incidents, near-misses, compliance gaps, or pending actions..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
            <Button onClick={() => setStep(5)}>Next: FIAS Score <ChevronRight className="w-4 h-4 ml-2" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Section 5: FIAS Score ────────────────────────────────────────────────────
  if (step === 5) return (
    <Card className="neon-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-primary" />
          Section 5 — FIAS Composite Score
        </CardTitle>
        <p className="text-xs text-muted-foreground">Score = (Condition × 0.35) + (Performance × 0.35) + (Risk × 0.30)</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Big score display */}
        <div className={cn('rounded-xl border-2 p-6 text-center', bandMeta.border, bandMeta.bg)}>
          <p className={cn('text-7xl font-bold', bandMeta.color)}>{fiasScore}</p>
          <p className="text-muted-foreground text-sm mt-1">FIAS Composite Score</p>
          <Badge className={cn('mt-2 text-sm px-3 py-1 border', bandMeta.bg, bandMeta.color, bandMeta.border)}>
            {bandMeta.label}
          </Badge>
          <p className={cn('text-xs mt-2 opacity-80', bandMeta.color)}>{bandMeta.description}</p>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Condition',    score: conditionScore,   weight: '35%' },
            { label: 'Performance',  score: performanceScore, weight: '35%' },
            { label: 'Risk',         score: riskScore,        weight: '30%' },
          ].map(({ label, score, weight }) => (
            <div key={label} className="rounded-lg border border-border/30 bg-muted/10 p-3 text-center">
              <p className={cn('text-2xl font-bold',
                score >= 85 ? 'text-green-400' : score >= 70 ? 'text-yellow-400' : score >= 50 ? 'text-orange-400' : 'text-red-400')}>
                {score}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground/60">weight {weight}</p>
              <Progress value={score} className="h-1 mt-2" />
            </div>
          ))}
        </div>

        {/* Band reference */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { range: '85–100', label: 'Standard',        color: 'text-green-400 border-green-500/20 bg-green-500/5' },
            { range: '70–84',  label: 'Monitor',         color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' },
            { range: '50–69',  label: 'Action Required', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5' },
            { range: '< 50',   label: 'Critical',        color: 'text-red-400 border-red-500/20 bg-red-500/5' },
          ].map(b => (
            <div key={b.label} className={cn('rounded-lg border p-2 text-center text-xs', b.color)}>
              <p className="font-semibold">{b.label}</p>
              <p className="opacity-70">{b.range}</p>
            </div>
          ))}
        </div>

        {/* Recommended action */}
        <div className={cn('rounded-lg border p-4 space-y-1', bandMeta.border, bandMeta.bg)}>
          <p className={cn('text-xs font-semibold uppercase tracking-wide', bandMeta.color)}>Recommended Next Step</p>
          <p className="text-xs text-muted-foreground">{bandMeta.action}</p>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep(4)}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
          <Button onClick={() => setStep(6)}>Next: Findings <ChevronRight className="w-4 h-4 ml-2" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  // ── Section 6: Findings ──────────────────────────────────────────────────────
  if (step === 6) return (
    <Card className="neon-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-5 h-5 text-primary" />
          Section 6 — Findings &amp; Recommendations
          {findings.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">{findings.length} finding{findings.length !== 1 ? 's' : ''}</Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Document specific observations. Findings flagged for WO generation will auto-create work orders when pushed to the FI Platform.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add finding form */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Add Finding</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">System Area</Label>
              <Input
                value={newFinding.systemArea || ''}
                onChange={e => setNewFinding((p: any) => ({ ...p, systemArea: e.target.value }))}
                placeholder="e.g., Heat exchanger, Pump seal, Control panel"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={newFinding.priority || 'medium'} onValueChange={v => setNewFinding((p: any) => ({ ...p, priority: v }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Observed Condition</Label>
              <Textarea
                value={newFinding.observedCondition || ''}
                onChange={e => setNewFinding((p: any) => ({ ...p, observedCondition: e.target.value }))}
                placeholder="What was observed? Include measurements, visible damage, or abnormal readings..."
                rows={2} className="text-xs resize-none"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Recommended Action</Label>
              <Textarea
                value={newFinding.recommendedAction || ''}
                onChange={e => setNewFinding((p: any) => ({ ...p, recommendedAction: e.target.value }))}
                placeholder="Specify corrective action, inspection protocol, or replacement requirement..."
                rows={2} className="text-xs resize-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={newFinding.generateWorkOrder ?? true}
                onChange={e => setNewFinding((p: any) => ({ ...p, generateWorkOrder: e.target.checked }))}
                className="accent-primary"
              />
              Auto-generate Work Order when pushed to platform
            </label>
            <Button size="sm" onClick={addFinding}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Add Finding
            </Button>
          </div>
        </div>

        {/* Findings list */}
        {findings.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border/30 rounded-lg">
            No findings added yet. Use the form above to document observations.
          </div>
        ) : (
          <div className="space-y-2">
            {findings.map((f: any) => (
              <div key={f.id} className="rounded-lg border border-border/30 bg-muted/5 p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{f.systemArea}</span>
                    <Badge className={cn('text-[10px]', PRIORITY_META[f.priority as keyof typeof PRIORITY_META]?.color)}>
                      {PRIORITY_META[f.priority as keyof typeof PRIORITY_META]?.label}
                    </Badge>
                    {f.generateWorkOrder && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        <Zap className="w-2.5 h-2.5 mr-1" />WO
                      </Badge>
                    )}
                  </div>
                  <button onClick={() => removeFinding(f.id)} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">Observed:</span> {f.observedCondition}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">Action:</span> {f.recommendedAction}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep(5)}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
          <Button onClick={() => setStep(7)}>Next: Output &amp; Export <ChevronRight className="w-4 h-4 ml-2" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  // ── Section 7: Output ────────────────────────────────────────────────────────
  return (
    <Card className="neon-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle className="w-5 h-5 text-primary" />
          Section 7 — Output &amp; Export
        </CardTitle>
        <p className="text-xs text-muted-foreground">Review the assessment summary, seal the record, then push to the FI Platform.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary */}
        <div className="rounded-lg border border-border/30 bg-muted/5 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assessment Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {[
              { label: 'Facility',     value: facilityName || '—' },
              { label: 'System',       value: systemType },
              { label: 'Findings',     value: `${findings.length} documented` },
              { label: 'Condition',    value: String(conditionScore) },
              { label: 'Performance',  value: String(performanceScore) },
              { label: 'Risk Score',   value: String(riskScore) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-muted-foreground">{label}</p>
                <p className="font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
          <div className={cn('rounded-lg border p-3 flex items-center gap-4', bandMeta.border, bandMeta.bg)}>
            <p className={cn('text-4xl font-bold', bandMeta.color)}>{fiasScore}</p>
            <div>
              <p className={cn('text-sm font-semibold', bandMeta.color)}>{bandMeta.label}</p>
              <p className="text-xs text-muted-foreground">{bandMeta.description}</p>
            </div>
          </div>
          {findings.filter((f: any) => f.generateWorkOrder).length > 0 && (
            <div className="flex items-center gap-2 text-xs text-primary/80 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              {findings.filter((f: any) => f.generateWorkOrder).length} work order(s) will be auto-generated on platform push.
            </div>
          )}
        </div>

        {/* Email Section */}
        {/* email rendered as separate component defined below */}
        <EmailSectionWidget
          facilityName={facilityName}
          systemType={systemType}
          fiasScore={fiasScore}
          riskBand={riskBand}
          bandMeta={bandMeta}
          findings={findings}
          assessorName={assessorName}
          conductedAt={conductedAt}
        />

        {/* Seal / Push */}
        {!sealed ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Seal before pushing</p>
                <p className="text-blue-400/70 mt-0.5">Sealing marks this record as immutable — no further edits after sealing. The record is then ready to push to the FI Platform.</p>
              </div>
            </div>
            <Button className="w-full" onClick={sealAssessment}>
              <Lock className="w-4 h-4 mr-2" />Seal Assessment Record
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-xs text-green-400">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span><strong>Record Sealed</strong> — immutable. Ready to push to FI Platform.</span>
            </div>
            <Button className="w-full" onClick={pushToPlatform}>
              <ArrowRight className="w-4 h-4 mr-2" />Push to FI Platform &amp; View Dashboard
            </Button>
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" />Export as PDF (Print)
            </Button>
          </div>
        )}

        <div className="flex justify-start pt-2">
          <Button variant="outline" onClick={() => setStep(6)}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Email Section Widget ───────────────────────────────────────────────────────
const RECIPIENTS = [
  { label: 'razzellv@nexumsuum.com',                        value: 'razzellv@nexumsuum.com' },
  { label: 'info@nexumsuum-facilityintelligence.com',       value: 'info@nexumsuum-facilityintelligence.com' },
  { label: 'Custom address',                                 value: 'custom' },
];

function EmailSectionWidget({ facilityName, systemType, fiasScore, riskBand, bandMeta, findings, assessorName, conductedAt }: any) {
  const { toast } = useToast();
  const [recipient, setRecipient]     = useState('razzellv@nexumsuum.com');
  const [customEmail, setCustomEmail] = useState('');
  const [template, setTemplate]       = useState<'summary' | 'action' | 'ready' | 'custom'>('summary');
  const [customBody, setCustomBody]   = useState('');
  const [showCompose, setShowCompose] = useState(false);

  const date = new Date(conductedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const woCount = findings.filter((f: any) => f.generateWorkOrder).length;

  const TEMPLATES: Record<string, { subject: string; body: string }> = {
    summary: {
      subject: `FIAS Assessment Summary — ${facilityName || 'Facility'} | Score: ${fiasScore}`,
      body: `Hello,\n\nPlease find below the FIAS assessment summary for ${facilityName || 'the facility'} conducted on ${date}.\n\nSystem Assessed: ${systemType?.replace(/_/g, ' ').toUpperCase()}\nFIAS Score: ${fiasScore} / 100\nRisk Band: ${bandMeta?.label}\n\nFindings Documented: ${findings.length}\nWork Orders to be Generated: ${woCount}\n\n${bandMeta?.action ? `Recommended Next Step: ${bandMeta.action}` : ''}\n\nPlease review the full assessment record on the FI Platform dashboard.\n\nRegards,\n${assessorName || 'Nexum Suum FIO'}\nFacility Intelligence Officer\nNexum Suum`,
    },
    action: {
      subject: `Action Required — FIAS Finding at ${facilityName || 'Facility'} | ${bandMeta?.label}`,
      body: `Hello,\n\nA FIAS assessment conducted on ${date} has identified items requiring your attention at ${facilityName || 'your facility'}.\n\nFIAS Score: ${fiasScore} — ${bandMeta?.label}\n\nCritical Findings (${findings.filter((f: any) => f.priority === 'critical').length}):\n${findings.filter((f: any) => f.priority === 'critical').map((f: any) => `• ${f.systemArea}: ${f.observedCondition}`).join('\n') || 'None'}\n\nHigh Priority Findings (${findings.filter((f: any) => f.priority === 'high').length}):\n${findings.filter((f: any) => f.priority === 'high').map((f: any) => `• ${f.systemArea}: ${f.observedCondition}`).join('\n') || 'None'}\n\nPlease acknowledge receipt and confirm the corrective action timeline.\n\nRegards,\n${assessorName || 'Nexum Suum FIO'}\nFacility Intelligence Officer\nNexum Suum`,
    },
    ready: {
      subject: `Platform Update — ${facilityName || 'Facility'} Assessment Published`,
      body: `Hello,\n\nThe FIAS assessment for ${facilityName || 'your facility'} conducted on ${date} has been sealed and published to the FI Platform.\n\nYour current FIAS Score: ${fiasScore} (${bandMeta?.label})\n\n${woCount > 0 ? `${woCount} work order(s) have been auto-generated on your dashboard. Please review and assign to the appropriate technicians.` : 'No work orders were generated from this assessment.'}\n\nYou can view the full report on your Executive Dashboard.\n\nRegards,\n${assessorName || 'Nexum Suum FIO'}\nFacility Intelligence Officer\nNexum Suum`,
    },
    custom: {
      subject: `FIAS Note — ${facilityName || 'Facility'}`,
      body: '',
    },
  };

  const selectedTemplate = TEMPLATES[template];
  const finalRecipient = recipient === 'custom' ? customEmail : recipient;
  const finalBody = template === 'custom' ? customBody : selectedTemplate.body;

  const handleOpenMailto = () => {
    if (!finalRecipient || (recipient === 'custom' && !customEmail)) {
      toast({ title: 'Recipient required', variant: 'destructive' }); return;
    }
    const mailto = `mailto:${finalRecipient}?subject=${encodeURIComponent(selectedTemplate.subject)}&body=${encodeURIComponent(finalBody)}`;
    window.open(mailto, '_blank');
    toast({ title: 'Email client opened', description: `Draft prepared for ${finalRecipient}` });
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Mail className="w-4 h-4" />Email Assessment
        </div>
        <button onClick={() => setShowCompose(v => !v)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          {showCompose ? 'Collapse' : 'Compose'}
        </button>
      </div>

      {showCompose && (
        <div className="space-y-3">
          {/* Recipient */}
          <div className="space-y-1.5">
            <Label className="text-xs">Send To</Label>
            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECIPIENTS.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {recipient === 'custom' && (
              <Input value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="Enter email address" className="text-xs mt-1" />
            )}
          </div>

          {/* Template */}
          <div className="space-y-1.5">
            <Label className="text-xs">Template</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { key: 'summary', label: 'Assessment Summary' },
                { key: 'action',  label: 'Action Required' },
                { key: 'ready',   label: 'Platform Ready' },
                { key: 'custom',  label: 'Custom Message' },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTemplate(t.key)}
                  className={cn('px-2 py-1.5 rounded-lg text-[11px] border transition-all text-left',
                    template === t.key ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border/30 text-muted-foreground hover:text-foreground')}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview / Custom body */}
          <div className="space-y-1.5">
            <Label className="text-xs">{template === 'custom' ? 'Message' : 'Preview'}</Label>
            <Textarea
              value={template === 'custom' ? customBody : finalBody}
              onChange={e => template === 'custom' && setCustomBody(e.target.value)}
              readOnly={template !== 'custom'}
              rows={6}
              className="text-xs resize-none font-mono bg-muted/20"
            />
          </div>

          <Button size="sm" className="w-full" onClick={handleOpenMailto}>
            <Send className="w-3.5 h-3.5 mr-2" />Open in Email Client
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">Opens your default email app with the draft pre-filled.</p>
        </div>
      )}
    </div>
  );
}
