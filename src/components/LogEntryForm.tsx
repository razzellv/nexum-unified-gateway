import { useState } from 'react';
import { ArrowLeft, Send, Save, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlobalFields } from '@/components/forms/GlobalFields';
import { BoilerForm, initialBoilerData, validateBoilerForm } from '@/components/forms/BoilerForm';
import { ChillerForm, initialChillerData, validateChillerForm } from '@/components/forms/ChillerForm';
import { PumpForm, initialPumpData, validatePumpForm } from '@/components/forms/PumpForm';
import { AHUForm, initialAHUData, validateAHUForm } from '@/components/forms/AHUForm';
import { TowerForm, initialTowerData, validateTowerForm } from '@/components/forms/TowerForm';
import { EnergyForm, initialEnergyData, validateEnergyForm } from '@/components/forms/EnergyForm';
import { Facility, Building, SystemInfo, Shift, MeasurementType } from '@/types/logging';
import { getCurrentShift, mockUser } from '@/data/mockData';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface LogEntryFormProps {
  facility: Facility;
  building: Building;
  system: SystemInfo | null;
  isEnergyLog?: boolean;
  onBack: () => void;
}

export function LogEntryForm({ facility, building, system, isEnergyLog = false, onBack }: LogEntryFormProps) {
  const [shift, setShift] = useState<Shift>(getCurrentShift());
  const [notes, setNotes] = useState('');
  const [abnormalCondition, setAbnormalCondition] = useState(false);
  const [measurementType, setMeasurementType] = useState<MeasurementType>('measured');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Role-based access
  const permissions = useRoleAccess(mockUser.role);

  // Form data states
  const [boilerData, setBoilerData] = useState(initialBoilerData);
  const [chillerData, setChillerData] = useState(initialChillerData);
  const [pumpData, setPumpData] = useState(initialPumpData);
  const [ahuData, setAHUData] = useState(initialAHUData);
  const [towerData, setTowerData] = useState(initialTowerData);
  const [energyData, setEnergyData] = useState(initialEnergyData);
  // Block executives from accessing
  if (!permissions.hasAccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center p-8">
          <ShieldAlert className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You do not have permission to access this application.
          </p>
          <Button variant="outline" onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  const systemType = isEnergyLog ? 'energy' : system?.type;

  const validateForm = () => {
    let formErrors: Record<string, string> = {};

    switch (systemType) {
      case 'boiler':
        formErrors = validateBoilerForm(boilerData);
        break;
      case 'chiller':
        formErrors = validateChillerForm(chillerData);
        break;
      case 'pump':
        formErrors = validatePumpForm(pumpData);
        break;
      case 'ahu':
        formErrors = validateAHUForm(ahuData);
        break;
      case 'tower':
        formErrors = validateTowerForm(towerData);
        break;
      case 'energy':
        formErrors = validateEnergyForm(energyData);
        break;
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly.',
        variant: 'destructive',
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const logName = isEnergyLog ? 'Energy & Utilities' : system?.name;
    toast({
      title: 'Log Submitted Successfully',
      description: `${logName} log entry has been recorded.`,
    });

    setIsSubmitting(false);
    onBack();
  };

  const handleSaveDraft = () => {
    toast({
      title: 'Draft Saved',
      description: 'Your entry has been saved as a draft.',
    });
  };

  const renderSystemForm = () => {
    switch (systemType) {
      case 'boiler':
        return <BoilerForm data={boilerData} onChange={setBoilerData} errors={errors} />;
      case 'chiller':
        return <ChillerForm data={chillerData} onChange={setChillerData} errors={errors} />;
      case 'pump':
        return <PumpForm data={pumpData} onChange={setPumpData} errors={errors} />;
      case 'ahu':
        return <AHUForm data={ahuData} onChange={setAHUData} errors={errors} />;
      case 'tower':
        return <TowerForm data={towerData} onChange={setTowerData} errors={errors} />;
      case 'energy':
        return <EnergyForm data={energyData} onChange={setEnergyData} errors={errors} />;
      default:
        return (
          <div className="form-section text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Unknown system type: {systemType}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24">
      {/* Sticky Header */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Systems</span>
            </Button>
            <div className="text-right">
              <h2 className="font-semibold">{isEnergyLog ? 'Energy & Utilities' : system?.name}</h2>
              <p className="text-xs text-muted-foreground font-mono">
                {isEnergyLog ? 'Building-level Log' : system?.assetTag}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-6">
        <GlobalFields
          facility={facility.name}
          building={building.name}
          system={system}
          isFacilityLevel={isEnergyLog}
          shift={shift}
          onShiftChange={setShift}
          notes={notes}
          onNotesChange={setNotes}
          abnormalCondition={abnormalCondition}
          onAbnormalChange={setAbnormalCondition}
          measurementType={measurementType}
          onMeasurementTypeChange={setMeasurementType}
          reviewNotes={reviewNotes}
          onReviewNotesChange={setReviewNotes}
          showReviewNotes={permissions.canAddReviewNotes}
          isReadOnly={permissions.isReadOnly}
        />

        {renderSystemForm()}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border p-4">
        <div className="container max-w-2xl mx-auto flex gap-3">
          {permissions.isReadOnly ? (
            <div className="flex-1 text-center py-3 text-muted-foreground">
              <Badge variant="secondary">Read Only Mode</Badge>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={handleSaveDraft}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                variant="success"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || !permissions.canSubmit}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Log'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to submit a log entry for <strong>{isEnergyLog ? 'Energy & Utilities' : system?.name}</strong>.
              {measurementType === 'estimated' && (
                <span className="block mt-2 text-warning font-medium">
                  ⚠️ This entry is tagged as ESTIMATED data.
                </span>
              )}
              {abnormalCondition && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ This entry is flagged as having an abnormal condition.
                </span>
              )}
              <span className="block mt-2">
                Once submitted, this entry cannot be edited.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSubmit}>
              Confirm Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
