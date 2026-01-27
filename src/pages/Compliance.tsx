import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { ParticleBackground } from '@/components/ParticleBackground';
import { NexumBranding } from '@/components/NexumBranding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ClipboardCheck, Eye, FileText, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const VIOLATION_TYPES = [
  'MISSING_LOG',
  'LATE_LOG', 
  'INCOMPLETE_DATA',
  'OUT_OF_RANGE',
  'CRITICAL_FAILURE',
  'UNSAFE_OPERATION',
  'MISSED_ROUND',
  'DOCUMENTATION_ERROR',
  'UNAUTHORIZED_CHANGE',
  'SAFETY_VIOLATION',
  'TRAINING_LAPSE',
  'PROCEDURE_DEVIATION',
  'POOR_COMMUNICATION',
  'QUALITY_ISSUE',
  'RESPONSE_DELAY',
  'UNETHICAL_CONDUCT',
  'DISHONESTY',
  'POLICY_VIOLATION'
];

const EQUIPMENT_TYPES = [
  'boilers',
  'chillers',
  'cooling_towers',
  'pumps',
  'ahu',
  'compressors',
  'other'
];

export default function ComplianceLogger() {
  const [activeTab, setActiveTab] = useState('violation');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Violation Form State
  const [violationData, setViolationData] = useState({
    type: '',
    operatorId: '',
    operator: '',
    equipmentId: '',
    equipmentType: '',
    description: '',
    severity: '',
    notes: ''
  });

  // PM Check Form State
  const [pmCheckData, setPmCheckData] = useState({
    equipmentId: '',
    equipmentType: '',
    checkType: '',
    operatorId: '',
    operator: '',
    status: 'completed',
    findings: '',
    nextDueDate: ''
  });

  // Safety Observation Form State
  const [safetyData, setSafetyData] = useState({
    location: '',
    observationType: 'hazard',
    severity: 'medium',
    description: '',
    reportedBy: '',
    immediateAction: ''
  });

  const handleViolationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('nexum_id_token');
      if (!token) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch(
        'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/compliance/log',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: violationData.type,
            operatorId: violationData.operatorId,
            operator: violationData.operator || violationData.operatorId,
            equipmentId: violationData.equipmentId,
            equipmentType: violationData.equipmentType,
            description: violationData.description,
            severity: violationData.severity ? parseInt(violationData.severity) : undefined,
            notes: violationData.notes
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to log violation');
      }

      const result = await response.json();

      toast({
        title: 'Violation Logged Successfully',
        description: `Virtuous Score: ${result.employeeScores?.virtuousScore || 'N/A'}%`
      });

      // Reset form
      setViolationData({
        type: '',
        operatorId: '',
        operator: '',
        equipmentId: '',
        equipmentType: '',
        description: '',
        severity: '',
        notes: ''
      });

    } catch (error) {
      console.error('Error logging violation:', error);
      toast({
        title: 'Error',
        description: 'Failed to log violation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePMCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: 'PM Check Logged',
      description: 'Preventive maintenance check recorded successfully'
    });

    // Reset form
    setPmCheckData({
      equipmentId: '',
      equipmentType: '',
      checkType: '',
      operatorId: '',
      operator: '',
      status: 'completed',
      findings: '',
      nextDueDate: ''
    });
  };

  const handleSafetySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: 'Safety Observation Logged',
      description: 'Safety observation recorded successfully'
    });

    // Reset form
    setSafetyData({
      location: '',
      observationType: 'hazard',
      severity: 'medium',
      description: '',
      reportedBy: '',
      immediateAction: ''
    });
  };

  return (
    <MainLayout>
      <ParticleBackground />
      
      <div className="relative z-10 max-w-[1400px] mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-neon-cyan" />
              Compliance Logger
            </h1>
            <p className="text-muted-foreground mt-1">Log violations, PM checks, and safety observations</p>
          </div>
          <NexumBranding />
        </div>

        {/* Main Form Area */}
        <Card className="bg-card/80 border-border">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-3 w-full max-w-[600px]">
                <TabsTrigger
                  value="violation"
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Violation
                </TabsTrigger>
                <TabsTrigger
                  value="pm_check"
                  className="flex items-center gap-2"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  PM Check
                </TabsTrigger>
                <TabsTrigger
                  value="safety"
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Safety
                </TabsTrigger>
              </TabsList>

              {/* Violation Form */}
              <TabsContent value="violation">
                <form onSubmit={handleViolationSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="violationType">Violation Type *</Label>
                      <Select
                        value={violationData.type}
                        onValueChange={(value) => setViolationData({...violationData, type: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select violation type" />
                        </SelectTrigger>
                        <SelectContent>
                          {VIOLATION_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="operatorId">Operator ID *</Label>
                      <Input
                        id="operatorId"
                        value={violationData.operatorId}
                        onChange={(e) => setViolationData({...violationData, operatorId: e.target.value})}
                        placeholder="EMP-001"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="operator">Operator Name</Label>
                      <Input
                        id="operator"
                        value={violationData.operator}
                        onChange={(e) => setViolationData({...violationData, operator: e.target.value})}
                        placeholder="John Smith"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="equipmentId">Equipment ID</Label>
                      <Input
                        id="equipmentId"
                        value={violationData.equipmentId}
                        onChange={(e) => setViolationData({...violationData, equipmentId: e.target.value})}
                        placeholder="BOILER-001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="equipmentType">Equipment Type</Label>
                      <Select
                        value={violationData.equipmentType}
                        onValueChange={(value) => setViolationData({...violationData, equipmentType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select equipment type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="severity">Severity Override (0-100)</Label>
                      <Input
                        id="severity"
                        type="number"
                        min="0"
                        max="100"
                        value={violationData.severity}
                        onChange={(e) => setViolationData({...violationData, severity: e.target.value})}
                        placeholder="Leave empty for default"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={violationData.description}
                      onChange={(e) => setViolationData({...violationData, description: e.target.value})}
                      placeholder="Describe the violation in detail..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={violationData.notes}
                      onChange={(e) => setViolationData({...violationData, notes: e.target.value})}
                      placeholder="Any additional context or corrective actions..."
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-destructive hover:bg-destructive/90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Logging Violation...' : 'Log Violation'}
                  </Button>
                </form>
              </TabsContent>

              {/* PM Check Form */}
              <TabsContent value="pm_check">
                <form onSubmit={handlePMCheckSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pmEquipmentId">Equipment ID *</Label>
                      <Input
                        id="pmEquipmentId"
                        value={pmCheckData.equipmentId}
                        onChange={(e) => setPmCheckData({...pmCheckData, equipmentId: e.target.value})}
                        placeholder="BOILER-001"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pmEquipmentType">Equipment Type *</Label>
                      <Select
                        value={pmCheckData.equipmentType}
                        onValueChange={(value) => setPmCheckData({...pmCheckData, equipmentType: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select equipment type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkType">Check Type *</Label>
                      <Select
                        value={pmCheckData.checkType}
                        onValueChange={(value) => setPmCheckData({...pmCheckData, checkType: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select check type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily Inspection</SelectItem>
                          <SelectItem value="weekly">Weekly Maintenance</SelectItem>
                          <SelectItem value="monthly">Monthly Service</SelectItem>
                          <SelectItem value="quarterly">Quarterly Review</SelectItem>
                          <SelectItem value="annual">Annual Inspection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pmOperatorId">Performed By (Operator ID) *</Label>
                      <Input
                        id="pmOperatorId"
                        value={pmCheckData.operatorId}
                        onChange={(e) => setPmCheckData({...pmCheckData, operatorId: e.target.value})}
                        placeholder="EMP-001"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pmStatus">Status</Label>
                      <Select
                        value={pmCheckData.status}
                        onValueChange={(value) => setPmCheckData({...pmCheckData, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="passed">Passed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextDue">Next Due Date</Label>
                      <Input
                        id="nextDue"
                        type="date"
                        value={pmCheckData.nextDueDate}
                        onChange={(e) => setPmCheckData({...pmCheckData, nextDueDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="findings">Findings *</Label>
                    <Textarea
                      id="findings"
                      value={pmCheckData.findings}
                      onChange={(e) => setPmCheckData({...pmCheckData, findings: e.target.value})}
                      placeholder="Document any findings, observations, or issues..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Log PM Check
                  </Button>
                </form>
              </TabsContent>

              {/* Safety Observation Form */}
              <TabsContent value="safety">
                <form onSubmit={handleSafetySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        value={safetyData.location}
                        onChange={(e) => setSafetyData({...safetyData, location: e.target.value})}
                        placeholder="Building A, Floor 2, Boiler Room"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="observationType">Observation Type *</Label>
                      <Select
                        value={safetyData.observationType}
                        onValueChange={(value) => setSafetyData({...safetyData, observationType: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hazard">Hazard Identified</SelectItem>
                          <SelectItem value="near_miss">Near Miss</SelectItem>
                          <SelectItem value="unsafe_condition">Unsafe Condition</SelectItem>
                          <SelectItem value="unsafe_behavior">Unsafe Behavior</SelectItem>
                          <SelectItem value="positive">Positive Observation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="safetySeverity">Severity Level *</Label>
                      <Select
                        value={safetyData.severity}
                        onValueChange={(value) => setSafetyData({...safetyData, severity: value})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low - Minor concern</SelectItem>
                          <SelectItem value="medium">Medium - Moderate risk</SelectItem>
                          <SelectItem value="high">High - Significant risk</SelectItem>
                          <SelectItem value="critical">Critical - Immediate danger</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reportedBy">Reported By *</Label>
                      <Input
                        id="reportedBy"
                        value={safetyData.reportedBy}
                        onChange={(e) => setSafetyData({...safetyData, reportedBy: e.target.value})}
                        placeholder="Your name or EMP ID"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="safetyDescription">Description *</Label>
                    <Textarea
                      id="safetyDescription"
                      value={safetyData.description}
                      onChange={(e) => setSafetyData({...safetyData, description: e.target.value})}
                      placeholder="Describe the safety observation in detail..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="immediateAction">Immediate Action Taken</Label>
                    <Textarea
                      id="immediateAction"
                      value={safetyData.immediateAction}
                      onChange={(e) => setSafetyData({...safetyData, immediateAction: e.target.value})}
                      placeholder="Describe any immediate actions taken..."
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Log Safety Observation
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
