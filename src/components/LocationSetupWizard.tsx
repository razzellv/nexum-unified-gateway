/**
 * LocationSetupWizard
 * ────────────────────────────────────────────────────────────────────────────
 * Shown when a licensee upgrades to a multi-location plan (Standard, Business,
 * Premium, Retail Pro, Command Standard/Pro, Property, Entrepreneur).
 *
 * Collects which buildings/properties are active (have operational systems)
 * vs. Asset Properties (no mechanical systems — portfolio/investment tracking).
 *
 * Data persisted to nexum_locations_<facilityId> and synced via sync-storage.
 * Consumed by: FacilityDataSource, ComplianceLogger, EquipmentLibrary.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Plus, Trash2, ChevronRight, ChevronLeft,
  CheckCircle, Wrench, Home, X, MapPin, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { syncWrite } from '@/lib/sync-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LocationType = 'active' | 'asset';

export interface ActiveSystem {
  id: string;
  label: string;
  icon: string;
}

export interface FacilityLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  type: LocationType;
  /** Only for type === 'active' */
  systems: string[];
  /** Only for type === 'asset' */
  assetClass?: string;
  status: 'operational' | 'under-construction' | 'seasonal' | 'inactive';
  addedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVE_SYSTEMS: ActiveSystem[] = [
  { id: 'hvac',          label: 'HVAC / Climate',         icon: '❄️' },
  { id: 'boilers',       label: 'Boilers / Steam',        icon: '🔥' },
  { id: 'chillers',      label: 'Chillers',               icon: '🧊' },
  { id: 'plumbing',      label: 'Plumbing / Water',       icon: '💧' },
  { id: 'electrical',    label: 'Electrical / Power',     icon: '⚡' },
  { id: 'fire_suppression', label: 'Fire Suppression',    icon: '🚒' },
  { id: 'elevators',     label: 'Elevators / Lifts',      icon: '🛗' },
  { id: 'generators',    label: 'Generators / Backup',    icon: '🔋' },
  { id: 'refrigeration', label: 'Refrigeration',          icon: '🏭' },
  { id: 'security',      label: 'Security / Access',      icon: '🔐' },
  { id: 'cctv',          label: 'CCTV / Surveillance',    icon: '📹' },
  { id: 'kitchen',       label: 'Kitchen Equipment',      icon: '🍳' },
  { id: 'compressed_air',label: 'Compressed Air',         icon: '💨' },
  { id: 'solar',         label: 'Solar / Renewable',      icon: '☀️' },
];

const ASSET_CLASSES = [
  'Commercial Building', 'Retail Space', 'Warehouse / Storage',
  'Industrial / Manufacturing', 'Land / Vacant Lot', 'Residential Property',
  'Mixed-Use Property', 'Office Space', 'Other',
];

const STATUS_OPTIONS: { value: FacilityLocation['status']; label: string }[] = [
  { value: 'operational',       label: 'Operational' },
  { value: 'under-construction',label: 'Under Construction' },
  { value: 'seasonal',          label: 'Seasonal / Intermittent' },
  { value: 'inactive',          label: 'Currently Inactive' },
];

const emptyLocation = (): FacilityLocation => ({
  id:        `loc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  name:      '',
  address:   '',
  city:      '',
  state:     '',
  type:      'active',
  systems:   [],
  assetClass:'',
  status:    'operational',
  addedAt:   new Date().toISOString(),
});

// ── Max locations by plan ─────────────────────────────────────────────────────
const MAX_BY_PLAN: Record<string, number> = {
  basic:           2,
  standard:        5,
  business:        15,
  premium:         Infinity,
  enterprise:      Infinity,
  retail_starter:  1,
  retail_pro:      3,
  command_basic:   1,
  command_standard:5,
  command_pro:     Infinity,
};

// ── Wizard steps ──────────────────────────────────────────────────────────────
type Step = 'intro' | 'locations' | 'systems' | 'review';

interface Props {
  open: boolean;
  onClose: () => void;
  /** After saving, proceed to the billing/upgrade URL */
  onProceed: (locations: FacilityLocation[]) => void;
  planId: string;
  planName: string;
}

export function LocationSetupWizard({ open, onClose, onProceed, planId, planName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const facilityId = user?.facilityId || 'facility-001';

  // Load existing locations if available
  const [locations, setLocations] = useState<FacilityLocation[]>(() => {
    try {
      const saved = localStorage.getItem(`nexum_locations_${facilityId}`);
      return saved ? JSON.parse(saved) : [emptyLocation()];
    } catch { return [emptyLocation()]; }
  });

  const [step, setStep]                     = useState<Step>('intro');
  const [activeLocIdx, setActiveLocIdx]     = useState(0);
  const [saving, setSaving]                 = useState(false);
  const [systemsTarget, setSystemsTarget]   = useState(0); // which location we're configuring systems for

  const maxLocations = MAX_BY_PLAN[planId] ?? 5;
  const activeOnes   = locations.filter(l => l.type === 'active');

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const updateLocation = (idx: number, patch: Partial<FacilityLocation>) => {
    setLocations(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const addLocation = () => {
    if (locations.length >= maxLocations) {
      toast({ title: `Your ${planName} plan supports up to ${maxLocations} location${maxLocations > 1 ? 's' : ''}`, variant: 'destructive' });
      return;
    }
    setLocations(prev => [...prev, emptyLocation()]);
    setActiveLocIdx(locations.length);
  };

  const removeLocation = (idx: number) => {
    if (locations.length <= 1) return;
    setLocations(prev => prev.filter((_, i) => i !== idx));
    setActiveLocIdx(prev => Math.max(0, Math.min(prev, locations.length - 2)));
  };

  const toggleSystem = (locIdx: number, sysId: string) => {
    const loc = locations[locIdx];
    const has = loc.systems.includes(sysId);
    updateLocation(locIdx, {
      systems: has ? loc.systems.filter(s => s !== sysId) : [...loc.systems, sysId],
    });
  };

  const canAdvanceLocations = locations.every(l => l.name.trim().length > 0);

  const handleSaveAndProceed = async () => {
    setSaving(true);
    try {
      const cleaned = locations.map(l => ({
        ...l,
        name:    l.name.trim(),
        address: l.address.trim(),
        city:    l.city.trim(),
        state:   l.state.trim(),
      }));
      // Persist locally + queue S3 sync
      await syncWrite(`nexum_locations`, cleaned, '/locations', facilityId, 'PUT');
      toast({ title: 'Locations saved', description: `${cleaned.length} location${cleaned.length > 1 ? 's' : ''} configured` });
      onProceed(cleaned);
    } catch {
      toast({ title: 'Save failed', description: 'Changes stored locally', variant: 'destructive' });
      onProceed(locations);
    } finally { setSaving(false); }
  };

  // ── Step: Intro ───────────────────────────────────────────────────────────────

  const StepIntro = () => (
    <div className="space-y-6 text-center py-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
        <Building2 className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-bold">Set Up Your Locations</h3>
        <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
          Your <span className="text-primary font-semibold">{planName}</span> plan supports up to{' '}
          <span className="font-semibold">{maxLocations === Infinity ? 'unlimited' : maxLocations}</span> location{maxLocations !== 1 ? 's' : ''}.
          Tell us about each property so we can align your Facility Data Source, Compliance Logger, and Equipment Library correctly.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-green-400" />
            <p className="font-semibold text-xs text-green-400">Active Facility</p>
          </div>
          <p className="text-xs text-muted-foreground">Has operational systems — boilers, HVAC, chillers, etc. Full compliance + equipment tracking.</p>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-yellow-400" />
            <p className="font-semibold text-xs text-yellow-400">Asset Property</p>
          </div>
          <p className="text-xs text-muted-foreground">Land, vacant building, or investment property with no mechanical systems. Portfolio tracking only.</p>
        </div>
      </div>
      <Button onClick={() => setStep('locations')} className="bg-primary text-primary-foreground gap-2">
        Get Started <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );

  // ── Step: Locations list ──────────────────────────────────────────────────────

  const StepLocations = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add each building or property. You can change these later in Settings.</p>

      {/* Location tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {locations.map((loc, idx) => (
          <button
            key={loc.id}
            onClick={() => setActiveLocIdx(idx)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5',
              activeLocIdx === idx
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'border-border/40 text-muted-foreground hover:border-border'
            )}
          >
            {loc.type === 'asset' ? <Home className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
            {loc.name || `Location ${idx + 1}`}
            {locations.length > 1 && (
              <X className="w-3 h-3 ml-0.5 hover:text-destructive"
                onClick={e => { e.stopPropagation(); removeLocation(idx); }} />
            )}
          </button>
        ))}
        {locations.length < maxLocations && (
          <button onClick={addLocation}
            className="px-3 py-1.5 rounded-lg text-xs border border-dashed border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Location
          </button>
        )}
      </div>

      {/* Active location form */}
      {locations[activeLocIdx] && (() => {
        const loc = locations[activeLocIdx];
        const idx = activeLocIdx;
        return (
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4 space-y-4">
            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => updateLocation(idx, { type: 'active', assetClass: '' })}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border transition-all',
                  loc.type === 'active'
                    ? 'border-green-500/60 bg-green-500/15 text-green-400'
                    : 'border-border/40 text-muted-foreground hover:border-green-500/30'
                )}
              >
                <Wrench className="w-4 h-4" /> Active Facility
              </button>
              <button
                onClick={() => updateLocation(idx, { type: 'asset', systems: [] })}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border transition-all',
                  loc.type === 'asset'
                    ? 'border-yellow-500/60 bg-yellow-500/15 text-yellow-400'
                    : 'border-border/40 text-muted-foreground hover:border-yellow-500/30'
                )}
              >
                <Home className="w-4 h-4" /> Asset Property
              </button>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Location Name *</Label>
              <Input
                value={loc.name}
                onChange={e => updateLocation(idx, { name: e.target.value })}
                placeholder={loc.type === 'active' ? 'e.g. Main Campus — Building A' : 'e.g. 123 Oak St Warehouse'}
                className="h-9 text-sm"
              />
            </div>

            {/* Address row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Street Address</Label>
                <Input value={loc.address} onChange={e => updateLocation(idx, { address: e.target.value })}
                  placeholder="123 Main St" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input value={loc.city} onChange={e => updateLocation(idx, { city: e.target.value })}
                  placeholder="Newark" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Input value={loc.state} onChange={e => updateLocation(idx, { state: e.target.value })}
                  placeholder="NJ" className="h-9 text-sm" maxLength={2} />
              </div>
            </div>

            {/* Asset class (asset only) */}
            {loc.type === 'asset' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Asset Class</Label>
                <select value={loc.assetClass} onChange={e => updateLocation(idx, { assetClass: e.target.value })}
                  className="w-full h-9 text-sm border border-border/40 bg-card/50 rounded-lg px-3 focus:outline-none">
                  <option value="">— Select type —</option>
                  {ASSET_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Current Status</Label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => updateLocation(idx, { status: opt.value })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs border transition-all',
                      loc.status === opt.value
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'border-border/40 text-muted-foreground hover:border-border'
                    )}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Systems preview (active only) */}
            {loc.type === 'active' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Systems configured: {loc.systems.length > 0 ? loc.systems.length : 'none yet — configure in next step'}</Label>
                {loc.systems.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {loc.systems.map(s => {
                      const sys = ACTIVE_SYSTEMS.find(a => a.id === s);
                      return sys ? (
                        <Badge key={s} variant="outline" className="text-[10px] bg-primary/10 border-primary/30 text-primary">
                          {sys.icon} {sys.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={() => setStep('intro')} className="gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button
          size="sm"
          disabled={!canAdvanceLocations}
          onClick={() => {
            if (activeOnes.length > 0) {
              setSystemsTarget(locations.findIndex(l => l.type === 'active'));
              setStep('systems');
            } else {
              setStep('review');
            }
          }}
          className="bg-primary text-primary-foreground gap-1"
        >
          {activeOnes.length > 0 ? 'Configure Systems' : 'Review'} <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ── Step: Systems per active location ─────────────────────────────────────────

  const StepSystems = () => {
    const loc = locations[systemsTarget];
    if (!loc) return null;
    const nextActive = locations.findIndex((l, i) => i > systemsTarget && l.type === 'active');
    return (
      <div className="space-y-4">
        <div>
          <p className="font-semibold text-sm">{loc.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {[loc.address, loc.city, loc.state].filter(Boolean).join(', ') || 'Address not set'}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Select which systems are present. This determines which compliance checks, PM schedules, and equipment templates apply to this location.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ACTIVE_SYSTEMS.map(sys => {
            const selected = loc.systems.includes(sys.id);
            return (
              <button
                key={sys.id}
                onClick={() => toggleSystem(systemsTarget, sys.id)}
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border text-left text-sm transition-all',
                  selected
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                )}
              >
                <span className="text-base">{sys.icon}</span>
                <span className="text-xs font-medium">{sys.label}</span>
                {selected && <CheckCircle className="w-3.5 h-3.5 ml-auto shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>

        {loc.systems.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            No systems selected — this location will be treated as a minimal-compliance site. You can update this anytime.
          </div>
        )}

        {/* Location progress */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {locations.filter(l => l.type === 'active').map((l, i) => {
            const realIdx = locations.indexOf(l);
            return (
              <div key={l.id} className={cn('flex items-center gap-1', realIdx === systemsTarget ? 'text-primary' : l.systems.length > 0 ? 'text-green-400' : '')}>
                {l.systems.length > 0 && realIdx !== systemsTarget ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current inline-flex items-center justify-center text-[8px]">{i + 1}</span>}
                <span>{l.name || `Location ${i + 1}`}</span>
              </div>
            );
          }).reduce((prev: any, curr: any, i) => i === 0 ? curr : [prev, <span key={`s${i}`} className="text-border">·</span>, curr], null)}
        </div>

        <div className="flex justify-between pt-1">
          <Button variant="outline" size="sm" onClick={() => {
            const prevActive = [...locations.entries()].reverse().find(([i, l]) => i < systemsTarget && l.type === 'active');
            if (prevActive) setSystemsTarget(prevActive[0]);
            else setStep('locations');
          }} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Button size="sm" onClick={() => {
            if (nextActive >= 0) setSystemsTarget(nextActive);
            else setStep('review');
          }} className="bg-primary text-primary-foreground gap-1">
            {nextActive >= 0 ? 'Next Location' : 'Review'} <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ── Step: Review ──────────────────────────────────────────────────────────────

  const StepReview = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your locations below. These will be applied to your Facility Data Source, Compliance Logger, and Equipment Library.</p>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {locations.map((loc, idx) => (
          <div key={loc.id} className="rounded-xl border border-border/30 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className={cn('p-1.5 rounded-lg mt-0.5', loc.type === 'active' ? 'bg-green-500/15' : 'bg-yellow-500/15')}>
                  {loc.type === 'active' ? <Wrench className="w-3.5 h-3.5 text-green-400" /> : <Home className="w-3.5 h-3.5 text-yellow-400" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">{loc.name}</p>
                  {(loc.address || loc.city) && (
                    <p className="text-xs text-muted-foreground">{[loc.address, loc.city, loc.state].filter(Boolean).join(', ')}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className={cn('text-[10px]', loc.type === 'active' ? 'text-green-400 border-green-400/30' : 'text-yellow-400 border-yellow-400/30')}>
                      {loc.type === 'active' ? 'Active Facility' : loc.assetClass || 'Asset Property'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground capitalize">{loc.status.replace('-', ' ')}</Badge>
                  </div>
                  {loc.type === 'active' && loc.systems.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Systems: {loc.systems.map(s => ACTIVE_SYSTEMS.find(a => a.id === s)?.label).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => { setActiveLocIdx(idx); setStep('locations'); }}
                className="text-xs text-muted-foreground hover:text-primary underline shrink-0">Edit</button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-primary mb-1">What gets updated:</p>
        <ul className="space-y-0.5">
          <li>• <strong>Facility Data Source</strong> — per-location sensor logs and readings</li>
          <li>• <strong>Compliance Logger</strong> — location-specific compliance checks</li>
          <li>• <strong>Equipment Library</strong> — filtered by building/location</li>
          <li>• <strong>Work Orders & PM</strong> — tied to the correct property</li>
        </ul>
      </div>

      <div className="flex justify-between pt-1">
        <Button variant="outline" size="sm" onClick={() => setStep(activeOnes.length > 0 ? 'systems' : 'locations')} className="gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button size="sm" onClick={handleSaveAndProceed} disabled={saving}
          className="bg-primary text-primary-foreground gap-2">
          {saving ? 'Saving...' : 'Save & Continue to Payment'} <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  const STEP_LABELS: Record<Step, string> = {
    intro:     'Setup',
    locations: 'Locations',
    systems:   'Systems',
    review:    'Review',
  };

  const STEP_ORDER: Step[] = ['intro', 'locations', 'systems', 'review'];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            Location & Property Setup
            <Badge variant="outline" className="text-xs ml-auto font-normal">{planName}</Badge>
          </DialogTitle>
          {/* Progress indicator */}
          <div className="flex items-center gap-2 pt-1">
            {STEP_ORDER.filter(s => s !== 'systems' || activeOnes.length > 0).map((s, i, arr) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'flex-1 h-1 rounded-full transition-all',
                  STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(s) ? 'bg-primary' : 'bg-border/40'
                )} />
                {i === arr.length - 1 && null}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-right capitalize">{STEP_LABELS[step]}</p>
        </DialogHeader>

        <div className="pt-2">
          {step === 'intro'     && <StepIntro />}
          {step === 'locations' && <StepLocations />}
          {step === 'systems'   && <StepSystems />}
          {step === 'review'    && <StepReview />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helper to check if this plan warrants location setup ─────────────────────
export function planRequiresLocationSetup(planId: string): boolean {
  // Plans that support multiple or mixed-use locations
  return ['standard', 'business', 'premium', 'enterprise',
          'retail_pro', 'command_standard', 'command_pro',
          'property', 'entrepreneur'].includes(planId);
}

// ── Exported storage helpers ─────────────────────────────────────────────────
export function getLocations(facilityId: string): FacilityLocation[] {
  try {
    return JSON.parse(localStorage.getItem(`nexum_locations_${facilityId}`) || '[]');
  } catch { return []; }
}
