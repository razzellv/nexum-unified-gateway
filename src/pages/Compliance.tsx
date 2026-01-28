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

const COMPLIANCE_CATEGORIES = [
  { value: 'safety', label: 'Safety' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'quality', label: 'Quality' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'procedural', label: 'Procedural' },
  { value: 'documentation', label: 'Documentation' },
];

const VIOLATION_TYPES = [
  { value: 'safety_protocol', label: 'Safety Protocol Violation' },
  { value: 'equipment_misuse', label: 'Equipment Misuse' },
  { value: 'documentation_failure', label: 'Documentation Failure' },
  { value: 'procedural_deviation', label: 'Procedural Deviation' },
  { value: 'environmental_breach', label: 'Environmental Breach' },
  { value: 'regulatory_non_compliance', label: 'Regulatory Non-Compliance' },
];

const IMPACT_LEVELS = ['low', 'medium', 'high', 'critical'];

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
            <Label>Facility *</Label>
            <Select onValueChange={(v) => setValue('facility', v)}>
              <SelectTrigger className={errors.facility ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                {FACILITIES.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.facility && <p className="text-xs text-destructive">Required</p>}
          </div>
          <div className="space-y-2">
            <Label>Building *</Label>
            <Select onValueChange={(v) => setValue('building', v)}>
              <SelectTrigger className={errors.building ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select building" />
              </SelectTrigger>
              <SelectContent>
                {BUILDINGS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.building && <p className="text-xs text-destructive">Required</p>}
          </div>
        </div>
      </div>

      {/* System Section */}
      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">System</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>System Type *</Label>
            <Select onValueChange={(v) => setValue('systemType', v)}>
              <SelectTrigger className={errors.systemType ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select system type" />
              </SelectTrigger>
              <SelectContent>
                {SYSTEM_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.systemType && <p className="text-xs text-destructive">Required</p>}
          </div>
          <div className="space-y-2">
            <Label>System ID *</Label>
            <Input
              {...register('systemId', { required: true })}
              placeholder="e.g., HVAC-001"
              className={`font-mono ${errors.systemId ? 'border-destructive' : ''}`}
            />
            {errors.systemId && <p className="text-xs text-destructive">Required</p>}
          </div>
        </div>
      </div>

      {/* Personnel Section */}
      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Personnel</h3>
        </div>
        <div className="space-y-2">
          <Label>Employee Involved *</Label>
          <Input
            {...register('employeeInvolved', { required: true })}
            placeholder="Full name of employee"
            className={errors.employeeInvolved ? 'border-destructive' : ''}
          />
          {errors.employeeInvolved && <p className="text-xs text-destructive">Required</p>}
        </div>
      </div>

      {/* Compliance Details Section */}
      <div className="space-y-4 p-6 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Compliance Details</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Compliance Category *</Label>
              <Select onValueChange={(v) => setValue('complianceCategory', v)}>
                <SelectTrigger className={errors.complianceCategory ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_CATEGORIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.complianceCategory && <p className="text-xs text-destructive">Required</p>}
            </div>
            <div className="space-y-2">
              <Label>Severity Level (1-5) *</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setValue('severityLevel', level)}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      severityLevel === level 
                        ? 'scale-110 ring-2 ring-offset-2 ring-primary' 
                        : 'opacity-50 hover:opacity-75'
                    } ${
                      level === 1 ? 'bg-green-500 text-white' :
                      level === 2 ? 'bg-blue-500 text-white' :
                      level === 3 ? 'bg-yellow-500 text-white' :
                      level === 4 ? 'bg-orange-500 text-white' :
                      'bg-red-500 text-white'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              {...register('description', { required: true, minLength: 10 })}
              placeholder="Provide a detailed description of the compliance event..."
              rows={4}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && <p className="text-xs text-destructive">Required (min 10 characters)</p>}
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-warning" />
              <div>
                <Label className="text-foreground">Corrective Action Required</Label>
                <p className="text-xs text-muted-foreground">Mark if follow-up action is needed</p>
              </div>
            </div>
            <Switch
              checked={watch('correctiveActionRequired')}
              onCheckedChange={(checked) => setValue('correctiveActionRequired', checked)}
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
      severityLevel: 3,
      correctiveActionRequired: false,
      repeatOffense: false,
    }
  });

  const pmForm = useForm({
    defaultValues: {
      severityLevel: 3,
      correctiveActionRequired: false,
      completedOnTime: true,
    }
  });

  const safetyForm = useForm({
    defaultValues: {
      severityLevel: 3,
      correctiveActionRequired: false,
      immediateRisk: false,
    }
  });

  const handleViolationSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = {
        type: 'violation',
        ...data,
      };

      const response = await logComplianceEvent(payload);
      
      // Extract virtuous score from response
      const virtuousScore = response?.employeeScores?.virtuousScore || response?.virtuousScore;
      setLastVirtuousScore(virtuousScore);

      toast({
        title: '✅ Violation Logged Successfully',
        description: virtuousScore 
          ? `Employee Virtuous Score: ${virtuousScore.toFixed(1)}%`
          : 'The compliance violation has been recorded.',
      });

      violationForm.reset({
        severityLevel: 3,
        correctiveActionRequired: false,
        repeatOffense: false,
      });
    } catch (error) {
      console.error('Compliance logging error:', error);
      toast({
        title: 'Error',
        description: 'Failed to log violation. Please try again.',
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
        type: 'pm_check',
        ...data,
      };

      const response = await logComplianceEvent(payload);
      
      const virtuousScore = response?.employeeScores?.virtuousScore || response?.virtuousScore;
      setLastVirtuousScore(virtuousScore);

      toast({
        title: '✅ PM Check Logged Successfully',
        description: virtuousScore 
          ? `Employee Virtuous Score: ${virtuousScore.toFixed(1)}%`
          : 'The preventive maintenance check has been recorded.',
      });

      pmForm.reset({
        severityLevel: 3,
        correctiveActionRequired: false,
        completedOnTime: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log PM check. Please try again.',
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
        type: 'safety_observation',
        ...data,
      };

      const response = await logComplianceEvent(payload);
      
      const virtuousScore = response?.employeeScores?.virtuousScore || response?.virtuousScore;
      setLastVirtuousScore(virtuousScore);

      toast({
        title: '✅ Safety Observation Logged Successfully',
        description: virtuousScore 
          ? `Employee Virtuous Score: ${virtuousScore.toFixed(1)}%`
          : 'The safety observation has been recorded.',
      });

      safetyForm.reset({
        severityLevel: 3,
        correctiveActionRequired: false,
        immediateRisk: false,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log safety observation. Please try again.',
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
                  <p className="text-lg font-bold text-green-500">{lastVirtuousScore.toFixed(1)}%</p>
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
                      <h3 className="font-semibold text-foreground">Violation Details</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Violation Type *</Label>
                          <Select onValueChange={(v) => violationForm.setValue('violationType', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select violation type" />
                            </SelectTrigger>
                            <SelectContent>
                              {VIOLATION_TYPES.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Policy / Code Reference *</Label>
                          <Input
                            {...violationForm.register('policyReference', { required: true })}
                            placeholder="e.g., OSHA 1910.134"
                            className="font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Estimated Impact Level *</Label>
                          <Select onValueChange={(v) => violationForm.setValue('estimatedImpactLevel', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select impact level" />
                            </SelectTrigger>
                            <SelectContent>
                              {IMPACT_LEVELS.map((level) => (
                                <SelectItem key={level} value={level} className="capitalize">{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border h-fit">
                          <div className="flex items-center gap-3">
                            <RotateCcw className="w-5 h-5 text-destructive" />
                            <div>
                              <Label className="text-foreground">Repeat Offense</Label>
                              <p className="text-xs text-muted-foreground">Previous occurrence recorded</p>
                            </div>
                          </div>
                          <Switch
                            checked={violationForm.watch('repeatOffense')}
                            onCheckedChange={(checked) => violationForm.setValue('repeatOffense', checked)}
                          />
                        </div>
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

                  {/* PM Check-Specific Fields */}
                  <div className="space-y-4 p-6 rounded-lg border border-green-500/30 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardCheck className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold text-foreground">PM Compliance Check Details</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>PM Task *</Label>
                          <Input
                            {...pmForm.register('pmTask', { required: true })}
                            placeholder="e.g., Quarterly HVAC Filter Replacement"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Scheduled Date *</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="date"
                              {...pmForm.register('scheduledDate', { required: true })}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <ClipboardCheck className={`w-5 h-5 ${pmForm.watch('completedOnTime') ? 'text-green-500' : 'text-destructive'}`} />
                          <div>
                            <Label className="text-foreground">Completed On Time</Label>
                            <p className="text-xs text-muted-foreground">Was this PM task completed by the scheduled date?</p>
                          </div>
                        </div>
                        <Switch
                          checked={pmForm.watch('completedOnTime')}
                          onCheckedChange={(checked) => pmForm.setValue('completedOnTime', checked)}
                        />
                      </div>

                      {!pmForm.watch('completedOnTime') && (
                        <div className="space-y-2 animate-in slide-in-from-top">
                          <Label className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            Missed Reason *
                          </Label>
                          <Textarea
                            {...pmForm.register('missedReason', { required: !pmForm.watch('completedOnTime') })}
                            placeholder="Explain why the PM task was not completed on time..."
                            rows={3}
                            className="border-destructive/50"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} size="lg" className="w-full bg-green-600 hover:bg-green-700">
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Logging PM Check...' : 'Log PM Check Entry'}
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

                  {/* Safety Observation-Specific Fields */}
                  <div className="space-y-4 p-6 rounded-lg border border-primary/30 bg-card/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Safety Observation Details</h3>
                    </div>
                    <div className="space-y-4">
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
                        <div className={`flex items-center justify-between p-4 rounded-lg border ${safetyForm.watch('immediateRisk') ? 'bg-destructive/10 border-destructive/30' : 'bg-secondary/50 border-border'}`}>
                          <div className="flex items-center gap-3">
                            <Zap className={`w-5 h-5 ${safetyForm.watch('immediateRisk') ? 'text-destructive' : 'text-muted-foreground'}`} />
                            <div>
                              <Label className="text-foreground">Immediate Risk</Label>
                              <p className="text-xs text-muted-foreground">Poses immediate danger</p>
                            </div>
                          </div>
                          <Switch
                            checked={safetyForm.watch('immediateRisk')}
                            onCheckedChange={(checked) => safetyForm.setValue('immediateRisk', checked)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Action Taken *</Label>
                        <Textarea
                          {...safetyForm.register('actionTaken', { required: true, minLength: 10 })}
                          placeholder="Describe the corrective or preventive action taken..."
                          rows={4}
                        />
                      </div>
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
