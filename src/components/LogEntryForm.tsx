import { useState } from 'react';
import { ArrowLeft, Send, Save, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlobalFields } from '@/components/forms/GlobalFields';

// ── Existing forms ────────────────────────────────────────────────────────────
import { BoilerForm, initialBoilerData, validateBoilerForm } from '@/components/forms/BoilerForm';
import { ChillerForm, initialChillerData, validateChillerForm } from '@/components/forms/ChillerForm';
import { PumpForm, initialPumpData, validatePumpForm } from '@/components/forms/PumpForm';
import { AHUForm, initialAHUData, validateAHUForm } from '@/components/forms/AHUForm';
import { TowerForm, initialTowerData, validateTowerForm } from '@/components/forms/TowerForm';
import { EnergyForm, initialEnergyData, validateEnergyForm } from '@/components/forms/EnergyForm';

// ── New forms ─────────────────────────────────────────────────────────────────
import { HeatExchangerForm, initialHeatExchangerData, validateHeatExchangerForm } from '@/components/forms/HeatExchangerForm';
import { TurbineForm, initialTurbineData, validateTurbineForm } from '@/components/forms/TurbineForm';
import { HotWaterHeaterForm, initialHotWaterHeaterData, validateHotWaterHeaterForm } from '@/components/forms/HotWaterHeaterForm';
import { CondensateSystemForm, initialCondensateSystemData, validateCondensateSystemForm } from '@/components/forms/CondensateSystemForm';
import { GeneratorForm, initialGeneratorData, validateGeneratorForm } from '@/components/forms/GeneratorForm';
import { ROSystemForm, initialROSystemData, validateROSystemForm } from '@/components/forms/ROSystemForm';
import { WFISystemForm, initialWFISystemData, validateWFISystemForm } from '@/components/forms/WFISystemForm';

import { Facility, Building, SystemInfo, Shift, MeasurementType } from '@/types/logging';
import { getCurrentShift, mockUser } from '@/data/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { submitFacilityLog } from '@/lib/equipment-api';
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

export function LogEntryForm({
  facility,
  building,
  system,
  isEnergyLog = false,
  onBack,
}: LogEntryFormProps) {
  const [shift, setShift] = useState<Shift>(getCurrentShift());
  const [notes, setNotes] = useState('');
  const [abnormalCondition, setAbnormalCondition] = useState(false);
  const [measurementType, setMeasurementType] = useState<MeasurementType>('measured');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user: authUser } = useAuth();
  const permissions = useRoleAccess(authUser?.role || mockUser.role);

  // ── Existing form state ───────────────────────────────────────────────────
  const [boilerData, setBoilerData] = useState(initialBoilerData);
  const [chillerData, setChillerData] = useState(initialChillerData);
  const [pumpData, setPumpData] = useState(initialPumpData);
  const [ahuData, setAHUData] = useState(initialAHUData);
  const [towerData, setTowerData] = useState(initialTowerData);
  const [energyData, setEnergyData] = useState(initialEnergyData);

  // ── New form state ────────────────────────────────────────────────────────
  const [heatExchangerData, setHeatExchangerData] = useState(initialHeatExchangerData);
  const [turbineData, setTurbineData] = useState(initialTurbineData);
  const [hotWaterHeaterData, setHotWaterHeaterData] = useState(initialHotWaterHeaterData);
  const [condensateSystemData, setCondensateSystemData] = useState(initialCondensateSystemData);
  const [generatorData, setGeneratorData] = useState(initialGeneratorData);
  const [roSystemData, setROSystemData] = useState(initialROSystemData);
  const [wfiSystemData, setWFISystemData] = useState(initialWFISystemData);

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

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = () => {
    let formErrors: Record<string, string> = {};

    switch (systemType) {
      // Existing
      case 'boiler':       formErrors = validateBoilerForm(boilerData); break;
      case 'chiller':      formErrors = validateChillerForm(chillerData); break;
      case 'pump':         formErrors = validatePumpForm(pumpData); break;
      case 'ahu':          formErrors = validateAHUForm(ahuData); break;
      case 'tower':        formErrors = validateTowerForm(towerData); break;
      case 'energy':       formErrors = validateEnergyForm(energyData); break;
      // New
      case 'heat_exchanger':    formErrors = validateHeatExchangerForm(heatExchangerData); break;
      case 'turbine':           formErrors = validateTurbineForm(turbineData); break;
      case 'hot_water_heater':  formErrors = validateHotWaterHeaterForm(hotWaterHeaterData); break;
      case 'condensate_system': formErrors = validateCondensateSystemForm(condensateSystemData); break;
      case 'generator':         formErrors = validateGeneratorForm(generatorData); break;
      case 'ro_system':         formErrors = validateROSystemForm(roSystemData); break;
      case 'wfi_system':        formErrors = validateWFISystemForm(wfiSystemData); break;
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

    try {
      // ── Metrics payload — pick the right data object ───────────────────
      const metricsMap: Record<string, any> = {
        boiler:            boilerData,
        chiller:           chillerData,
        pump:              pumpData,
        ahu:               ahuData,
        tower:             towerData,
        energy:            energyData,
        heat_exchanger:    heatExchangerData,
        turbine:           turbineData,
        hot_water_heater:  hotWaterHeaterData,
        condensate_system: condensateSystemData,
        generator:         generatorData,
        ro_system:         roSystemData,
        wfi_system:        wfiSystemData,
      };

      const logData = {
        facilityId: facility.id,
        buildingId: building.id,
        systemType: system?.type || 'energy',
        systemId: system?.id || 'energy-log',
        timestamp: new Date().toISOString(),
        shift,
        operator: authUser?.name || authUser?.email || mockUser.name,
        operatorId: authUser?.sub || mockUser.id,
        measurementType,
        abnormalCondition,
        operatorNotes: notes,
        metrics: metricsMap[systemType ?? 'energy'] ?? {},
      };

      console.log('📤 Submitting log data:', logData);
      const result = await submitFacilityLog(logData);
      console.log('✅ Log submitted successfully:', result);

      const logName = isEnergyLog ? 'Energy & Utilities' : system?.name;
      toast({
        title: 'Log Submitted Successfully',
        description: `${logName} log entry has been recorded.`,
      });

      setIsSubmitting(false);
      onBack();
    } catch (error) {
      console.error('❌ Error submitting log:', error);
      toast({
        title: 'Submission Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to submit log entry. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    toast({
      title: 'Draft Saved',
      description: 'Your entry has been saved as a draft.',
    });
  };

  // ── Form renderer ─────────────────────────────────────────────────────────
  const renderSystemForm = () => {
    switch (systemType) {
      // Existing
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
      // New
      case 'heat_exchanger':
        return <HeatExchangerForm data={heatExchangerData} onChange={setHeatExchangerData} errors={errors} />;
      case 'turbine':
        return <TurbineForm data={turbineData} onChange={setTurbineData} errors={errors} />;
      case 'hot_water_heater':
        return <HotWaterHeaterForm data={hotWaterHeaterData} onChange={setHotWaterHeaterData} errors={errors} />;
      case 'condensate_system':
        return <CondensateSystemForm data={condensateSystemData} onChange={setCondensateSystemData} errors={errors} />;
      case 'generator':
        return <GeneratorForm data={generatorData} onChange={setGeneratorData} errors={errors} />;
      case 'ro_system':
        return <ROSystemForm data={roSystemData} onChange={setROSystemData} errors={errors} />;
      case 'wfi_system':
        return <WFISystemForm data={wfiSystemData} onChange={setWFISystemData} errors={errors} />;
      default:
        return (
          <div className="form-section text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Unknown system type: {systemType}</p>
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
              <h2 className="font-semibold">
                {isEnergyLog ? 'Energy & Utilities' : system?.name}
              </h2>
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
              You are about to submit a log entry for{' '}
              <strong>{isEnergyLog ? 'Energy & Utilities' : system?.name}</strong>.
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
              <span className="block mt-2">Once submitted, this entry cannot be edited.</span>
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
