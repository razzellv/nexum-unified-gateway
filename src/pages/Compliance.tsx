import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, ClipboardCheck, Eye, FileText, Building2, Cpu, User, AlertCircle, Scale, Calendar, Zap, ShieldAlert, RotateCcw, Award } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logComplianceEvent } from '@/lib/nexum-api';

const FACILITIES = ['Facility Alpha', 'Facility Beta', 'Facility Gamma', 'Facility Delta'];
const BUILDINGS = ['Building A', 'Building B', 'Building C', 'Warehouse 1', 'Warehouse 2'];

const SYSTEM_TYPES = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'security', label: 'Security' },
  { value: 'production', label: 'Production' },
  { value: 'waste_management', label: 'Waste Management' },
  { value: 'other', label: 'Other' },
];

// ✅ FIXED: Match Lambda's VIOLATION_TYPES exactly
const VIOLATION_TYPES = [
  // Equipment violations
  { value: 'MISSING_LOG', label: 'Missing Equipment Log', severity: 25 },
  { value: 'LATE_LOG', label: 'Late Log Entry', severity: 15 },
  { value: 'INCOMPLETE_DATA', label: 'Incomplete Data Entry', severity: 35 },
  { value: 'OUT_OF_RANGE', label: 'Out of Range Reading', severity: 50 },
  { value: 'CRITICAL_FAILURE', label: 'Critical Equipment Failure', severity: 100 },
  { value: 'UNSAFE_OPERATION', label: 'Unsafe Operation', severity: 90 },
  
  // Compliance violations
  { value: 'MISSED_ROUND', label: 'Missed Equipment Round', severity: 40 },
  { value: 'DOCUMENTATION_ERROR', label: 'Documentation Error', severity: 30 },
  { value: 'UNAUTHORIZED_CHANGE', label: 'Unauthorized System Change', severity: 75 },
  { value: 'SAFETY_VIOLATION', label: 'Safety Protocol Violation', severity: 95 },
  { value: 'TRAINING_LAPSE', label: 'Training/Certification Lapse', severity: 35 },
  
  // Operational violations
  { value: 'PROCEDURE_DEVIATION', label: 'Procedure Deviation', severity: 45 },
  { value: 'POOR_COMMUNICATION', label: 'Poor Communication', severity: 25 },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue', severity: 40 },
  { value: 'RESPONSE_DELAY', label: 'Delayed Response to Issue', severity: 55 },
  
  // Unethical behavior
  { value: 'UNETHICAL_CONDUCT', label: 'Unethical Conduct', severity: 85 },
  { value: 'DISHONESTY', label: 'Dishonesty/Falsification', severity: 95 },
  { value: 'POLICY_VIOLATION', label: 'Company Policy Violation', severity: 65 },
];

// Positive behaviors
const POSITIVE_BEHAVIORS = [
  { value: 'EXEMPLARY_SAFETY', label: 'Exemplary Safety Practice', severity: -20 },
  { value: 'PROACTIVE_REPORTING', label: 'Proactive Issue Reporting', severity: -15 },
  { value: 'EXCELLENCE', label: 'Operational Excellence', severity: -25 },
  { value: 'MENTORSHIP', label: 'Mentorship/Training Others', severity: -15 },
];

const POLICY_REFERENCES = [
  { value: 'OSHA-1910.134', label: 'OSHA 1910.134 - Respiratory Protection' },
  { value: 'OSHA-1910.147', label: 'OSHA 1910.147 - Lockout/Tagout' },
  { value: 'OSHA-1910.1200', label: 'OSHA 1910.1200 - Hazard Communication' },
  { value: 'OSHA-1926.501', label: 'OSHA 1926.501 - Fall Protection' },
  { value: 'NFPA-70', label: 'NFPA 70 - National Electrical Code' },
  { value: 'NFPA-101', label: 'NFPA 101 - Life Safety Code' },
  { value: 'ASHRAE-62.1', label: 'ASHRAE 62.1 - Ventilation Standards' },
  { value: 'COMPANY-SOP-001', label: 'Company SOP-001 - General Safety' },
  { value: 'COMPANY-SOP-002', label: 'Company SOP-002 - Equipment Operation' },
  { value: 'COMPANY-SOP-003', label: 'Company SOP-003 - Emergency Response' },
  { value: 'other', label: 'Other (specify in notes)' },
];

const HAZARD_TYPES = [
  { value: 'slip_trip_fall', label: 'Slip / Trip / Fall' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'ergonomic', label: 'Ergonomic' },
  { value: 'fire', label: 'Fire' },
  { value: 'confined_space', label: 'Confined Space' },
  { value: 'other', label: 'Other' },
];

interface GlobalFieldsProps {
  register: any;
  watch: any;
  errors: any;
  setValue: any;
}

function GlobalFields({ register, watch, errors, setValue }: GlobalFieldsProps) {
  const severityLevel = watch('severityLevel') || 3;

  return (
    <div className="space-y-6">
      {/* Location Section */}
      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Location</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Facility</Label>
            <Select onValueChange={(v) => setValue('facility', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                {FACILITIES.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Building</Label>
            <Select onValueChange={(v) => setValue('building', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select building" />
              </SelectTrigger>
              <SelectContent>
                {BUILDINGS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* System Section */}
      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">System / Equipment</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>System Type</Label>
            <Select onValueChange={(v) => setValue('equipmentType', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select system type" />
              </SelectTrigger>
              <SelectContent>
                {SYSTEM_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Equipment ID</Label>
            <Input
              {...register('equipmentId')}
              placeholder="e.g., HVAC-001, B-01"
              className="font-mono"
            />
          </div>
        </div>
      </div>

      {/* ✅ FIXED: Employee ID field */}
      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Personnel</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Employee ID *</Label>
            <Input
              {...register('operatorId', { required: true })}
              placeholder="e.g., EMP001"
              className={`font-mono ${errors.operatorId ? 'border-destructive' : ''}`}
            />
            {errors.operatorId && <p className="text-xs text-destructive">Required</p>}
            <p className="text-xs text-muted-foreground">Employee's ID from system</p>
          </div>
          <div className="space-y-2">
            <Label>Employee Name</Label>
            <Input
              {...register('operator')}
              placeholder="Full name (optional)"
            />
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Event Details</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              {...register('description', { required: true, minLength: 10 })}
              placeholder="Provide a detailed description of the event..."
              rows={4}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && <p className="text-xs text-destructive">Required (min 10 characters)</p>}
          </div>

          <div className="space-y-2">
            <Label>Notes / Evidence</Label>
            <Textarea
              {...register('notes')}
              placeholder="Additional notes, evidence, or context..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Corrective Action Taken</Label>
            <Textarea
              {...register('correctiveAction')}
              placeholder="What action was taken or is planned..."
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Compliance() {
  const [activeTab, setActiveTab] = useState('violation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastVirtuousScore, setLastVirtuousScore] = useState<number | null>(null);

  const violationForm = useForm({
    defaultValues: {
      operatorId: '',
    }
  });

  const pmForm = useForm({
    defaultValues: {
      operatorId: '',
    }
  });

  const safetyForm = useForm({
    defaultValues: {
      operatorId: '',
    }
  });

  const handleViolationSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      console.log('Submitting violation:', data);
      
      // ✅ FIXED: Send payload matching Lambda's expected format
      const payload = {
        type: data.violationType, // e.g., "SAFETY_VIOLATION"
        operatorId: data.operatorId, // Required!
        operator: data.operator || data.operatorId,
        description: data.description,
        equipmentId: data.equipmentId,
        equipmentType: data.equipmentType,
        notes: data.notes,
        correctiveAction: data.correctiveAction,
      };

      console.log('Payload:', payload);

      const response = await logComplianceEvent(payload);
      console.log('Response:', response);
      
      const virtuousScore = response?.employeeScores?.virtuousScore || response?.virtuousScore || response?.score;
      if (virtuousScore !== undefined) {
        setLastVirtuousScore(virtuousScore);
      }

      toast({
        title: '✅ Violation Logged Successfully',
        description: virtuousScore !== undefined
          ? `Employee Virtuous Score: ${virtuousScore}%`
          : 'The violation has been recorded.',
      });

      violationForm.reset({ operatorId: '' });
    } catch (error: any) {
      console.error('Compliance logging error:', error);
      toast({
        title: 'Error Logging Violation',
        description: error.message || 'Failed to log violation. Check console for details.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePMSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        type: 'MISSED_ROUND', // Or appropriate type
        operatorId: data.operatorId,
        operator: data.operator || data.operatorId,
        description: `PM Check: ${data.pmTask}`,
        equipmentId: data.equipmentId,
        equipmentType: data.equipmentType,
        notes: `Scheduled: ${data.scheduledDate}. ${!data.completedOnTime ? 'LATE: ' + data.missedReason : 'On time'}`,
      };

      const response = await logComplianceEvent(payload);
      
      const virtuousScore = response?.employeeScores?.virtuousScore;
      if (virtuousScore !== undefined) {
        setLastVirtuousScore(virtuousScore);
      }

      toast({
        title: '✅ PM Check Logged',
        description: virtuousScore !== undefined
          ? `Virtuous Score: ${virtuousScore}%`
          : 'PM check recorded.',
      });

      pmForm.reset({ operatorId: '' });
    } catch (error: any) {
      console.error('PM logging error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to log PM check.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSafetySubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        type: data.immediateRisk ? 'SAFETY_VIOLATION' : 'PROACTIVE_REPORTING',
        operatorId: data.operatorId,
        operator: data.operator || data.operatorId,
        description: data.description,
        equipmentId: data.equipmentId,
        equipmentType: data.equipmentType,
        notes: `Hazard: ${data.hazardType}. Action: ${data.actionTaken}`,
        correctiveAction: data.actionTaken,
      };

      const response = await logComplianceEvent(payload);
      
      const virtuousScore = response?.employeeScores?.virtuousScore;
      if (virtuousScore !== undefined) {
        setLastVirtuousScore(virtuousScore);
      }

      toast({
        title: '✅ Safety Observation Logged',
        description: virtuousScore !== undefined
          ? `Virtuous Score: ${virtuousScore}%`
          : 'Safety observation recorded.',
      });

      safetyForm.reset({ operatorId: '' });
    } catch (error: any) {
      console.error('Safety logging error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to log safety observation.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <ParticleBackground />
      
      <div className="relative z-10 max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-neon-cyan" />
              Facility Compliance Logger
            </h1>
            <p className="text-muted-foreground mt-1">Immutable compliance event logging system</p>
          </div>
          <div className="flex items-center gap-3">
            {lastVirtuousScore !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Award className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Virtuous Score</p>
                  <p className="text-lg font-bold text-green-500">{lastVirtuousScore}%</p>
                </div>
              </div>
            )}
            <NexumBranding />
          </div>
        </div>

        {/* Main Form Area */}
        <Card className="bg-card/80 border-border">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-3 w-full max-w-[600px] h-auto p-1">
                <TabsTrigger value="violation" className="flex items-center gap-2 py-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Violation</span>
                </TabsTrigger>
                <TabsTrigger value="pm_check" className="flex items-center gap-2 py-3">
                  <ClipboardCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">PM Check</span>
                </TabsTrigger>
                <TabsTrigger value="safety" className="flex items-center gap-2 py-3">
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Safety</span>
                </TabsTrigger>
              </TabsList>

              {/* Violation Form */}
              <TabsContent value="violation">
                <form onSubmit={violationForm.handleSubmit(handleViolationSubmit)} className="space-y-6">
                  <GlobalFields 
                    register={violationForm.register}
                    watch={violationForm.watch}
                    errors={violationForm.formState.errors}
                    setValue={violationForm.setValue}
                  />

                  {/* Violation-Specific Fields */}
                  <div className="space-y-4 p-6 rounded-lg border border-warning/30 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      <h3 className="font-semibold text-foreground">Violation Type</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Violation Type *</Label>
                        <Select onValueChange={(v) => violationForm.setValue('violationType', v)}>
                          <SelectTrigger className={violationForm.formState.errors.violationType ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select violation type" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[400px]">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Equipment Violations</div>
                            {VIOLATION_TYPES.filter(v => v.severity > 0).slice(0, 6).map(({ value, label }) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Compliance Violations</div>
                            {VIOLATION_TYPES.filter(v => v.severity > 0).slice(6, 11).map(({ value, label }) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Operational Issues</div>
                            {VIOLATION_TYPES.filter(v => v.severity > 0).slice(11, 15).map(({ value, label }) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Serious Violations</div>
                            {VIOLATION_TYPES.filter(v => v.severity > 0).slice(15).map(({ value, label }) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-green-500 mt-2">✅ Positive Behaviors</div>
                            {POSITIVE_BEHAVIORS.map(({ value, label }) => (
                              <SelectItem key={value} value={value} className="text-green-500">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {violationForm.formState.errors.violationType && (
                          <p className="text-xs text-destructive">Required</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Policy / Code Reference</Label>
                        <Select onValueChange={(v) => violationForm.setValue('policyReference', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select policy or code" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {POLICY_REFERENCES.map(({ value, label }) => (
                              <SelectItem key={value} value={value} className="font-mono text-sm">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} size="lg" className="w-full bg-destructive hover:bg-destructive/90">
                    <Scale className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Logging Violation...' : 'Log Violation Entry'}
                  </Button>
                </form>
              </TabsContent>

              {/* PM Check Form */}
              <TabsContent value="pm_check">
                <form onSubmit={pmForm.handleSubmit(handlePMSubmit)} className="space-y-6">
                  <GlobalFields 
                    register={pmForm.register}
                    watch={pmForm.watch}
                    errors={pmForm.formState.errors}
                    setValue={pmForm.setValue}
                  />

                  <div className="space-y-4 p-6 rounded-lg border border-green-500/30 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardCheck className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold text-foreground">PM Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>PM Task *</Label>
                        <Input
                          {...pmForm.register('pmTask', { required: true })}
                          placeholder="e.g., Quarterly Filter Replacement"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Scheduled Date *</Label>
                        <Input
                          type="date"
                          {...pmForm.register('scheduledDate', { required: true })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                      <Label>Completed On Time</Label>
                      <Switch
                        checked={pmForm.watch('completedOnTime')}
                        onCheckedChange={(checked) => pmForm.setValue('completedOnTime', checked)}
                      />
                    </div>

                    {!pmForm.watch('completedOnTime') && (
                      <Textarea
                        {...pmForm.register('missedReason')}
                        placeholder="Reason for delay..."
                        rows={2}
                      />
                    )}
                  </div>

                  <Button type="submit" disabled={isSubmitting} size="lg" className="w-full bg-green-600 hover:bg-green-700">
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Logging PM Check...' : 'Log PM Check'}
                  </Button>
                </form>
              </TabsContent>

              {/* Safety Observation Form */}
              <TabsContent value="safety">
                <form onSubmit={safetyForm.handleSubmit(handleSafetySubmit)} className="space-y-6">
                  <GlobalFields 
                    register={safetyForm.register}
                    watch={safetyForm.watch}
                    errors={safetyForm.formState.errors}
                    setValue={safetyForm.setValue}
                  />

                  <div className="space-y-4 p-6 rounded-lg border border-primary/30 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Safety Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hazard Type *</Label>
                        <Select onValueChange={(v) => safetyForm.setValue('hazardType', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select hazard type" />
                          </SelectTrigger>
                          <SelectContent>
                            {HAZARD_TYPES.map(({ value, label }) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                        <Label>Immediate Risk</Label>
                        <Switch
                          checked={safetyForm.watch('immediateRisk')}
                          onCheckedChange={(checked) => safetyForm.setValue('immediateRisk', checked)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Action Taken *</Label>
                      <Textarea
                        {...safetyForm.register('actionTaken', { required: true })}
                        placeholder="Corrective/preventive action..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} size="lg" className="w-full bg-primary hover:bg-primary/90">
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Logging Safety Observation...' : 'Log Safety Observation'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
