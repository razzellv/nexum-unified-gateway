/**
 * EquipmentPhotoPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Embedded inside the Equipment Library edit dialog.
 * Handles photo upload (drag+drop, file picker, camera capture), Claude Vision
 * analysis, component confirmation form, and inventory save.
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Camera, Upload, Trash2, Loader2, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Eye, Package, Zap, X, Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  MAX_PHOTOS, generatePartNumber, analyzeEquipmentPhoto, saveComponentToInventory,
  getEquipmentPhotos, saveEquipmentPhotos, deleteEquipmentPhoto,
  logPhotoUploadToJournal, logAiAnalysisToJournal, logComponentConfirmedToJournal,
  type EquipmentPhoto, type DetectedComponent, type ComponentType,
} from '@/lib/equipmentPhotoAnalysis';

const PHOTO_LABELS: { value: EquipmentPhoto['label']; label: string; hint: string }[] = [
  { value: 'front',       label: 'Front of Unit',   hint: 'Catches gauges, actuators, BAS connections, indicator lights' },
  { value: 'supply_side', label: 'Supply Side',     hint: 'Supply pump, supply valves, strainer' },
  { value: 'return_side', label: 'Return Side',     hint: 'Return pump, return valves, expansion tank' },
  { value: 'nameplate',   label: 'Nameplate / Data Plate', hint: 'Model, serial number, ratings' },
  { value: 'detail',      label: 'Detail / Other',  hint: 'Any specific component or area' },
];

const COMPONENT_TYPE_LABELS: Partial<Record<ComponentType, string>> = {
  check_valve: 'Check Valve', butterfly_valve: 'Butterfly Valve', gate_valve: 'Gate Valve',
  globe_valve: 'Globe Valve', ball_valve: 'Ball Valve', safety_valve: 'Safety Valve',
  relief_valve: 'Relief Valve', solenoid_valve: 'Solenoid Valve', isolation_valve: 'Isolation Valve',
  control_valve: 'Control Valve', actuator_valve: 'Valve Actuator', actuator_damper: 'Damper Actuator',
  strainer_y: 'Y-Strainer', strainer_basket: 'Basket Strainer',
  pressure_gauge: 'Pressure Gauge', temperature_gauge: 'Temperature Gauge',
  flow_meter: 'Flow Meter', conductivity_sensor: 'Conductivity Reader',
  bas_sensor: 'BAS Sensor (Context)', bms_controller: 'BMS Controller (Context)',
  vfd: 'Variable Frequency Drive', motor_starter: 'Motor Starter',
  pump_heating_supply: 'Heating Supply Pump', pump_heating_return: 'Heating Return Pump',
  pump_cooling_supply: 'Cooling Supply Pump', pump_cooling_return: 'Cooling Return Pump',
  pump_chilled_water: 'Chilled Water Pump', pump_condenser_water: 'Condenser Water Pump',
  pump_air_compressor: 'Air Compressor Pump', pump_oil: 'Oil Pump',
  expansion_tank: 'Expansion Tank', air_separator: 'Air Separator',
  heat_exchanger_plate: 'Plate Heat Exchanger', pressure_relief_device: 'Pressure Relief Device',
  indicator_light: 'Indicator Light', terminal_block: 'Terminal Block', other: 'Other',
};

const BAS_TYPES: ComponentType[] = ['bas_sensor', 'bms_controller'];

interface Props {
  equipmentId: string;
  equipmentType: string;
  equipmentName: string;
  facilityId: string;
  userName: string;
  onComponentsSaved?: (count: number) => void;
}

// Compress image to fit in DynamoDB / localStorage — cap at 600px wide, 75% JPEG quality
async function compressImage(file: File): Promise<{ base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 800;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function EquipmentPhotoPanel({
  equipmentId, equipmentType, equipmentName, facilityId, userName, onComponentsSaved,
}: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<EquipmentPhoto[]>(() => getEquipmentPhotos(equipmentId));
  const [pendingLabel, setPendingLabel] = useState<EquipmentPhoto['label']>('front');
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  // componentForms[photoId][componentId] = user-edited part number
  const [componentForms, setComponentForms] = useState<Record<string, Record<string, string>>>({});
  const [savingComponent, setSavingComponent] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY;

  const persist = useCallback((updated: EquipmentPhoto[]) => {
    setPhotos(updated);
    saveEquipmentPhotos(equipmentId, updated);
  }, [equipmentId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast({ title: `Max ${MAX_PHOTOS} photos`, description: 'Delete a photo before adding new ones.', variant: 'destructive' });
      return;
    }
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Images only', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Max 10 MB per photo.', variant: 'destructive' });
      return;
    }

    let base64: string;
    let mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    try {
      const compressed = await compressImage(file);
      base64 = compressed.base64;
      mimeType = compressed.mimeType;
    } catch {
      toast({ title: 'Failed to process image', variant: 'destructive' });
      return;
    }

    const photoId = `photo-${Date.now()}`;
    const newPhoto: EquipmentPhoto = {
      photoId,
      label: pendingLabel,
      base64,
      mimeType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userName,
      analysisStatus: hasApiKey ? 'analyzing' : 'no_key',
      detectedComponents: [],
    };

    const updated = [...photos, newPhoto];
    persist(updated);
    setExpandedPhoto(photoId);

    // Log upload to observation journal (non-blocking)
    logPhotoUploadToJournal(equipmentId, equipmentName, facilityId, pendingLabel, updated.length - 1, userName);

    if (!hasApiKey) return;

    // Run AI analysis
    try {
      const result = await analyzeEquipmentPhoto(base64, mimeType, equipmentType, equipmentName);
      const rawJson = JSON.stringify(result);

      const components: DetectedComponent[] = result.components.map(c => ({
        componentId: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: c.type as ComponentType,
        name: c.name,
        location: c.location,
        confidence: c.confidence,
        partNumber: generatePartNumber(c.type as ComponentType, c.location),
        fromPhotoIndex: updated.length - 1,
        detectedAt: new Date().toISOString(),
        confirmedByUser: false,
        basClarification: BAS_TYPES.includes(c.type as ComponentType) ? result.basContextNote : undefined,
      }));

      const finalPhotos = getEquipmentPhotos(equipmentId).map(p =>
        p.photoId === photoId
          ? { ...p, analysisStatus: 'complete' as const, detectedComponents: components, rawAiResponse: rawJson }
          : p,
      );
      persist(finalPhotos);

      // Initialise form state for part numbers
      const formInit: Record<string, string> = {};
      components.forEach(c => { formInit[c.componentId] = c.partNumber; });
      setComponentForms(prev => ({ ...prev, [photoId]: formInit }));

      // Log AI analysis to journal (non-blocking)
      logAiAnalysisToJournal(equipmentId, equipmentName, facilityId, pendingLabel, rawJson, components.length, userName);

      toast({ title: 'Analysis complete', description: `${components.length} component(s) detected.` });
    } catch (err: any) {
      const isNoKey = err?.message === 'NO_API_KEY';
      const finalPhotos = getEquipmentPhotos(equipmentId).map(p =>
        p.photoId === photoId
          ? { ...p, analysisStatus: isNoKey ? 'no_key' as const : 'error' as const, analysisError: err?.message }
          : p,
      );
      persist(finalPhotos);
      if (!isNoKey) toast({ title: 'Analysis failed', description: err?.message, variant: 'destructive' });
    }
  };

  const handleDelete = (photoId: string) => {
    const updated = deleteEquipmentPhoto(equipmentId, photoId);
    setPhotos(updated);
    if (expandedPhoto === photoId) setExpandedPhoto(null);
    setComponentForms(prev => { const n = { ...prev }; delete n[photoId]; return n; });
  };

  const handleConfirmComponent = async (photo: EquipmentPhoto, component: DetectedComponent) => {
    const partNumber = componentForms[photo.photoId]?.[component.componentId] ?? component.partNumber;
    setSavingComponent(component.componentId);
    try {
      // Skip BAS/BMS types — they are context only, never go to inventory as actionable parts
      if (BAS_TYPES.includes(component.type)) {
        toast({ title: 'BAS/BMS — context noted', description: 'BAS connections are documented for context only. No inventory entry created.' });
        setSavingComponent(null);
        return;
      }

      const inventoryPartId = await saveComponentToInventory(
        { ...component, userPartNumber: partNumber },
        equipmentId, equipmentName, facilityId,
      );

      // Mark confirmed in photo record
      const updated = getEquipmentPhotos(equipmentId).map(p =>
        p.photoId === photo.photoId
          ? {
              ...p,
              detectedComponents: p.detectedComponents.map(c =>
                c.componentId === component.componentId
                  ? { ...c, confirmedByUser: true, confirmedAt: new Date().toISOString(), confirmedBy: userName, userPartNumber: partNumber, inventoryPartId }
                  : c,
              ),
            }
          : p,
      );
      persist(updated);

      await logComponentConfirmedToJournal(
        { ...component, userPartNumber: partNumber, inventoryPartId },
        equipmentId, equipmentName, facilityId, userName, inventoryPartId,
      );

      const confirmedCount = updated.flatMap(p => p.detectedComponents).filter(c => c.confirmedByUser).length;
      onComponentsSaved?.(confirmedCount);
      toast({ title: 'Saved to inventory', description: `${component.name} added with part #${partNumber}` });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err?.message, variant: 'destructive' });
    } finally {
      setSavingComponent(null);
    }
  };

  const totalConfirmed = photos.flatMap(p => p.detectedComponents).filter(c => c.confirmedByUser).length;
  const totalDetected = photos.flatMap(p => p.detectedComponents).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Equipment Photos</p>
          <p className="text-xs text-muted-foreground">
            {photos.length}/{MAX_PHOTOS} photos · {totalConfirmed}/{totalDetected} components saved to inventory
          </p>
        </div>
        {totalConfirmed > 0 && (
          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
            <Package className="w-3 h-3 mr-1" />{totalConfirmed} in inventory
          </Badge>
        )}
      </div>

      {/* API key notice */}
      {!hasApiKey && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            AI visual analysis requires <code className="font-mono bg-amber-500/20 px-1 rounded">VITE_ANTHROPIC_API_KEY</code> in your environment.
            Photos will still be saved — you can manually add components using the confirmation form.
          </span>
        </div>
      )}

      {/* Upload area */}
      {photos.length < MAX_PHOTOS && (
        <div
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${dragOver ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Drop photo here or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">{MAX_PHOTOS - photos.length} slot{MAX_PHOTOS - photos.length !== 1 ? 's' : ''} remaining</p>

          {/* Label selector */}
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center" onClick={e => e.stopPropagation()}>
            {PHOTO_LABELS.map(pl => (
              <button
                key={pl.value}
                type="button"
                onClick={() => setPendingLabel(pl.value)}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${pendingLabel === pl.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:border-primary/50 text-muted-foreground'}`}
                title={pl.hint}
              >
                {pl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />

      {/* Camera button */}
      {photos.length < MAX_PHOTOS && (
        <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={() => cameraInputRef.current?.click()}>
          <Camera className="w-4 h-4" /> Take Photo with Camera
        </Button>
      )}

      {/* Photo cards */}
      <div className="space-y-3">
        {photos.map((photo, idx) => {
          const isExpanded = expandedPhoto === photo.photoId;
          const confirmedCount = photo.detectedComponents.filter(c => c.confirmedByUser).length;

          return (
            <div key={photo.photoId} className="rounded-xl border border-border/50 overflow-hidden bg-muted/10">
              {/* Photo header row */}
              <div className="flex items-center gap-3 p-3">
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                  <img
                    src={`data:${photo.mimeType};base64,${photo.base64}`}
                    alt={photo.label}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold capitalize">{photo.label.replace(/_/g, ' ')}</span>
                    <StatusBadge status={photo.analysisStatus} />
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Slot {idx + 1} · {new Date(photo.uploadedAt).toLocaleDateString()} · {photo.uploadedBy}
                  </p>
                  {photo.detectedComponents.length > 0 && (
                    <p className="text-[11px] text-cyan-400">
                      {photo.detectedComponents.length} detected · {confirmedCount} saved
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedPhoto(isExpanded ? null : photo.photoId)}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.photoId)}
                    className="p-1.5 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                    title="Delete photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded: full image + component list */}
              {isExpanded && (
                <div className="border-t border-border/40 p-3 space-y-3">
                  {/* Full image */}
                  <img
                    src={`data:${photo.mimeType};base64,${photo.base64}`}
                    alt={photo.label}
                    className="w-full rounded-lg object-contain max-h-64"
                  />

                  {/* Overall description */}
                  {photo.analysisStatus === 'complete' && photo.rawAiResponse && (() => {
                    try {
                      const parsed = JSON.parse(photo.rawAiResponse);
                      if (parsed.overallDescription) return (
                        <p className="text-xs text-muted-foreground italic">{parsed.overallDescription}</p>
                      );
                    } catch {}
                    return null;
                  })()}

                  {/* Analyzing spinner */}
                  {photo.analysisStatus === 'analyzing' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-xs text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI is analyzing this photo…
                    </div>
                  )}

                  {/* Error */}
                  {photo.analysisStatus === 'error' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-xs text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      Analysis failed: {photo.analysisError}
                    </div>
                  )}

                  {/* Detected components */}
                  {photo.detectedComponents.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Detected Components — confirm to save to inventory
                      </p>
                      {photo.detectedComponents.map(comp => {
                        const isBas = BAS_TYPES.includes(comp.type);
                        const currentPartNum = componentForms[photo.photoId]?.[comp.componentId] ?? comp.partNumber;
                        return (
                          <ComponentConfirmCard
                            key={comp.componentId}
                            component={comp}
                            isBas={isBas}
                            partNumber={currentPartNum}
                            saving={savingComponent === comp.componentId}
                            onPartNumberChange={val => setComponentForms(prev => ({
                              ...prev,
                              [photo.photoId]: { ...(prev[photo.photoId] || {}), [comp.componentId]: val },
                            }))}
                            onConfirm={() => handleConfirmComponent(photo, comp)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Manual add placeholder when no API key */}
                  {photo.analysisStatus === 'no_key' && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No AI analysis available — add <code className="font-mono bg-muted px-1 rounded">VITE_ANTHROPIC_API_KEY</code> to enable automatic detection.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {photos.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No photos yet. Upload photos to document this equipment and auto-detect components.
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EquipmentPhoto['analysisStatus'] }) {
  if (status === 'analyzing') return (
    <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] py-0">
      <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />Analyzing
    </Badge>
  );
  if (status === 'complete') return (
    <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] py-0">
      <CheckCircle className="w-2.5 h-2.5 mr-1" />Analyzed
    </Badge>
  );
  if (status === 'error') return (
    <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] py-0">
      <AlertTriangle className="w-2.5 h-2.5 mr-1" />Error
    </Badge>
  );
  if (status === 'no_key') return (
    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] py-0">
      No AI Key
    </Badge>
  );
  return (
    <Badge className="bg-muted/40 text-muted-foreground border-border text-[10px] py-0">Uploaded</Badge>
  );
}

interface ComponentConfirmCardProps {
  component: DetectedComponent;
  isBas: boolean;
  partNumber: string;
  saving: boolean;
  onPartNumberChange: (val: string) => void;
  onConfirm: () => void;
}

function ComponentConfirmCard({ component, isBas, partNumber, saving, onPartNumberChange, onConfirm }: ComponentConfirmCardProps) {
  const confirmed = component.confirmedByUser;

  return (
    <div className={`rounded-lg border p-3 space-y-2 text-xs ${
      confirmed ? 'bg-green-500/5 border-green-500/20' :
      isBas     ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-muted/20 border-border/40'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isBas && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] py-0">BAS Context Only</Badge>}
            {confirmed && <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] py-0"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Saved</Badge>}
            <span className="font-semibold">{COMPONENT_TYPE_LABELS[component.type] || component.type}</span>
            <span className="text-muted-foreground">· {Math.round(component.confidence * 100)}% confidence</span>
          </div>
          <p className="text-muted-foreground mt-0.5">{component.name}</p>
          <p className="text-muted-foreground/70 mt-0.5 italic">{component.location}</p>
          {isBas && component.basClarification && (
            <p className="mt-1 text-amber-400/80 text-[11px]">{component.basClarification}</p>
          )}
          {confirmed && (
            <p className="text-green-400 mt-1">Inventory Part #: {component.userPartNumber || component.partNumber}</p>
          )}
        </div>
      </div>

      {!confirmed && !isBas && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-[10px] text-muted-foreground mb-1 block">Part Number</Label>
            <Input
              value={partNumber}
              onChange={e => onPartNumberChange(e.target.value)}
              className="h-7 text-xs"
              placeholder="Auto-generated or enter manually"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Package className="w-3 h-3 mr-1" />}
            Save to Inventory
          </Button>
        </div>
      )}

      {!confirmed && isBas && (
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1 text-amber-400 border-amber-500/30" onClick={onConfirm}>
          <Zap className="w-3 h-3" />Add BAS Context Note
        </Button>
      )}
    </div>
  );
}
