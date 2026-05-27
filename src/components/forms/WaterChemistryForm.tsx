import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Droplets, FlaskConical, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export interface WaterChemistryData {
  equipmentId: string;
  equipmentType: string;
  equipmentName: string;
  // Universal
  ph: string;
  conductivity: string;
  tds: string;
  hardness: string;
  // Boiler / hot water heater
  pAlkalinity: string;
  mAlkalinity: string;
  sulfites: string;
  chlorides: string;
  iron: string;
  silica: string;
  phosphates: string;
  cyclesOfConcentration: string;
  // Cooling tower
  caHardness: string;
  biocideResidual: string;
  bacteriaCount: string;
  turbidity: string;
  lsi: string;
  // Chiller (closed loop)
  glycolPct: string;
  inhibitorConc: string;
  nitrite: string;
  // RO system
  feedConductivity: string;
  permeateConductivity: string;
  tdsRejectionPct: string;
  sdi: string;
  chlorineResidual: string;
  // Sample info
  samplePoint: string;
  notes: string;
}

export const initialWaterChemistryData: WaterChemistryData = {
  equipmentId: '', equipmentType: '', equipmentName: '',
  ph: '', conductivity: '', tds: '', hardness: '',
  pAlkalinity: '', mAlkalinity: '', sulfites: '', chlorides: '',
  iron: '', silica: '', phosphates: '', cyclesOfConcentration: '',
  caHardness: '', biocideResidual: '', bacteriaCount: '', turbidity: '', lsi: '',
  glycolPct: '', inhibitorConc: '', nitrite: '',
  feedConductivity: '', permeateConductivity: '', tdsRejectionPct: '', sdi: '', chlorineResidual: '',
  samplePoint: '', notes: '',
};

export function validateWaterChemistryForm(data: WaterChemistryData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.equipmentId) errors.equipmentId = 'Select equipment to test';
  return errors;
}

interface Props {
  data: WaterChemistryData;
  onChange: (data: WaterChemistryData) => void;
  errors: Record<string, string>;
}

const WATER_CHEM_TYPES = ['boiler', 'hot_water_heater', 'chiller', 'cooling_tower', 'ro_system', 'wfi_system', 'condensate_system', 'other'];

function field(label: string, key: keyof WaterChemistryData, unit: string, data: WaterChemistryData, onChange: (d: WaterChemistryData) => void, placeholder = '', type = 'number', hint = '') {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {unit && <span className="text-muted-foreground font-normal">({unit})</span>}
      </Label>
      <Input
        type={type}
        step="any"
        value={data[key] as string}
        onChange={e => onChange({ ...data, [key]: e.target.value })}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function WaterChemistryForm({ data, onChange, errors }: Props) {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loadingEq, setLoadingEq] = useState(false);

  useEffect(() => {
    if (!user?.facilityId) return;
    setLoadingEq(true);
    apiRequest(`/equipment?facility_id=${user.facilityId}`)
      .then(res => {
        const eq: any[] = (res.equipment || []).filter((e: any) =>
          WATER_CHEM_TYPES.includes(e.equipmentType)
        );
        setEquipment(eq);
      })
      .catch(() => {})
      .finally(() => setLoadingEq(false));
  }, [user?.facilityId]);

  const selectEquipment = (id: string) => {
    const eq = equipment.find(e => e.equipmentId === id);
    if (eq) onChange({ ...data, equipmentId: id, equipmentType: eq.equipmentType, equipmentName: eq.equipmentName || eq.equipmentId });
  };

  const t = data.equipmentType;
  const isBoiler      = t === 'boiler' || t === 'hot_water_heater' || t === 'condensate_system';
  const isTower       = t === 'cooling_tower';
  const isChiller     = t === 'chiller';
  const isRO          = t === 'ro_system' || t === 'wfi_system';
  const hasUniversal  = !!t;

  return (
    <div className="space-y-6">
      {/* Equipment selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Droplets className="w-4 h-4 text-sky-400" />
          Equipment / Asset <span className="text-destructive">*</span>
        </Label>
        <Select value={data.equipmentId} onValueChange={selectEquipment} disabled={loadingEq}>
          <SelectTrigger className={errors.equipmentId ? 'border-destructive' : ''}>
            <SelectValue placeholder={loadingEq ? 'Loading equipment…' : 'Select equipment to test'} />
          </SelectTrigger>
          <SelectContent>
            {equipment.map(eq => (
              <SelectItem key={eq.equipmentId} value={eq.equipmentId}>
                {eq.equipmentName || eq.equipmentId} — {eq.equipmentType?.replace(/_/g, ' ')}
              </SelectItem>
            ))}
            {equipment.length === 0 && !loadingEq && (
              <SelectItem value="__none" disabled>No water-bearing equipment found</SelectItem>
            )}
          </SelectContent>
        </Select>
        {errors.equipmentId && <p className="text-xs text-destructive">{errors.equipmentId}</p>}
        {data.equipmentType && (
          <Badge variant="outline" className="text-xs capitalize">{data.equipmentType.replace(/_/g, ' ')}</Badge>
        )}
      </div>

      {/* Sample point */}
      {hasUniversal && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Sample Point / Location</Label>
          <Input value={data.samplePoint} onChange={e => onChange({ ...data, samplePoint: e.target.value })} placeholder="e.g. Boiler drum, Tower basin, Return header" className="h-8 text-sm" />
        </div>
      )}

      {/* Universal fields */}
      {hasUniversal && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" />General Chemistry
          </p>
          <div className="grid grid-cols-2 gap-3">
            {field('pH', 'ph', '', data, onChange, '7.0–9.0', 'number')}
            {field('Conductivity', 'conductivity', 'µS/cm', data, onChange, 'e.g. 1500')}
            {field('TDS', 'tds', 'ppm', data, onChange, 'e.g. 750')}
            {field('Total Hardness', 'hardness', 'ppm CaCO₃', data, onChange, 'e.g. 200')}
          </div>
        </div>
      )}

      {/* Boiler / Hot Water Heater / Condensate */}
      {isBoiler && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Boiler Water Chemistry</p>
          <div className="grid grid-cols-2 gap-3">
            {field('P-Alkalinity', 'pAlkalinity', 'ppm CaCO₃', data, onChange, 'e.g. 200')}
            {field('M-Alkalinity', 'mAlkalinity', 'ppm CaCO₃', data, onChange, 'e.g. 400')}
            {field('Sulfites (O₂ Scavenger)', 'sulfites', 'ppm', data, onChange, 'e.g. 30–60')}
            {field('Chlorides', 'chlorides', 'ppm', data, onChange, 'e.g. <50')}
            {field('Iron', 'iron', 'ppm', data, onChange, 'e.g. <0.1')}
            {field('Silica', 'silica', 'ppm SiO₂', data, onChange, 'e.g. <50')}
            {field('Phosphates', 'phosphates', 'ppm PO₄', data, onChange, 'e.g. 20–40')}
            {field('Cycles of Concentration', 'cyclesOfConcentration', 'x', data, onChange, 'e.g. 8')}
          </div>
          <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            Maintain pH 10–11 in steam boilers. Sulfite target varies by operating pressure — verify with your water treatment provider.
          </div>
        </div>
      )}

      {/* Cooling Tower */}
      {isTower && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cooling Tower Chemistry</p>
          <div className="grid grid-cols-2 gap-3">
            {field('Calcium Hardness', 'caHardness', 'ppm CaCO₃', data, onChange, 'e.g. 200–600')}
            {field('M-Alkalinity', 'mAlkalinity', 'ppm CaCO₃', data, onChange, 'e.g. 100–300')}
            {field('Chlorides', 'chlorides', 'ppm', data, onChange, 'e.g. <250')}
            {field('Phosphates', 'phosphates', 'ppm PO₄', data, onChange, 'e.g. 2–5')}
            {field('Cycles of Concentration', 'cyclesOfConcentration', 'x', data, onChange, 'e.g. 4–6')}
            {field('Biocide Residual', 'biocideResidual', 'ppm', data, onChange, 'per program')}
            {field('Bacteria Count', 'bacteriaCount', 'CFU/mL', data, onChange, 'target <10,000')}
            {field('Turbidity', 'turbidity', 'NTU', data, onChange, 'e.g. <5')}
            {field('LSI (Langelier Index)', 'lsi', '', data, onChange, '-0.5 to +0.5', 'number')}
          </div>
          <div className="p-2.5 rounded bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            Legionella risk: bacteria count {'>'} 100,000 CFU/mL requires immediate remediation. Maintain biocide residual per ASHRAE 188 water management plan.
          </div>
        </div>
      )}

      {/* Chiller (closed loop) */}
      {isChiller && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Chilled Water Loop Chemistry</p>
          <div className="grid grid-cols-2 gap-3">
            {field('Glycol Concentration', 'glycolPct', '%', data, onChange, 'e.g. 25 (if glycol system)')}
            {field('Inhibitor Concentration', 'inhibitorConc', 'ppm', data, onChange, 'per product spec')}
            {field('Nitrite', 'nitrite', 'ppm', data, onChange, 'e.g. 800–1200')}
            {field('Turbidity', 'turbidity', 'NTU', data, onChange, 'e.g. <1')}
          </div>
        </div>
      )}

      {/* RO / WFI System */}
      {isRO && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">RO / Water Treatment Chemistry</p>
          <div className="grid grid-cols-2 gap-3">
            {field('Feed Conductivity', 'feedConductivity', 'µS/cm', data, onChange, 'e.g. 500')}
            {field('Permeate Conductivity', 'permeateConductivity', 'µS/cm', data, onChange, 'e.g. 5')}
            {field('TDS Rejection', 'tdsRejectionPct', '%', data, onChange, 'target >95%')}
            {field('SDI (Silt Density Index)', 'sdi', '', data, onChange, 'target <5')}
            {field('Chlorine Residual', 'chlorineResidual', 'ppm', data, onChange, '<0.1 for RO membranes')}
            {field('Chlorides', 'chlorides', 'ppm', data, onChange, 'e.g. <250')}
          </div>
        </div>
      )}

      {/* Notes */}
      {hasUniversal && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Notes / Observations</Label>
          <Input value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} placeholder="Treatment added, dosing adjustments, unusual readings…" className="h-8 text-sm" />
        </div>
      )}
    </div>
  );
}
