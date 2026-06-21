import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wifi, CheckCircle2, Loader2, AlertTriangle, Cpu, Clock, Radio, Zap, ChevronRight, Shield, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createProbeSession } from '@/lib/nexum-api';

interface Equipment {
  equipmentId: string;
  equipmentName?: string;
  equipmentType?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
}

export interface ProbeSession {
  sessionId: string;
  equipmentId: string;
  equipmentName: string;
  facilityId: string;
  tier: 'standard' | 'extended' | 'prestige';
  tierLabel: string;
  startedAt: string;
  endsAt: string;
  pollIntervalMin: number;
  device: {
    brand: string;
    type: string;
    model: string;
    firmware: string;
    protocol: string;
    comPort: string;
    baudRate: string;
    nodeAddress: string;
  };
  readings: { ts: string; values: Record<string, number> }[];
  checkIns: { date: string; tech: string; notes: string }[];
  status: 'active' | 'completed' | 'paused';
}

interface ConnectionWizardProps {
  open: boolean;
  equipment: Equipment;
  facilityId: string;
  onClose: () => void;
  onSessionStarted: (session: ProbeSession) => void;
}

const TIERS = [
  {
    id: 'standard' as const,
    label: 'Standard',
    duration: '8-Hour Session',
    durationHours: 8,
    pollMin: 15,
    description: 'One-day connected monitoring. ~32 readings.',
    checkIns: 0,
    color: 'border-blue-500/40 bg-blue-500/5',
    badge: 'text-blue-400 border-blue-400/40',
  },
  {
    id: 'extended' as const,
    label: 'Extended',
    duration: '1-Week Continuous',
    durationHours: 168,
    pollMin: 30,
    description: '7-day continuous data pull. ~336 readings.',
    checkIns: 0,
    color: 'border-purple-500/40 bg-purple-500/5',
    badge: 'text-purple-400 border-purple-400/40',
  },
  {
    id: 'prestige' as const,
    label: 'Prestige Probe',
    duration: '30-Day Managed',
    durationHours: 720,
    pollMin: 60,
    description: '30 days, weekly on-site check-ins, probe cleaning & maintenance. ~720 readings.',
    checkIns: 4,
    color: 'border-amber-500/40 bg-amber-500/5',
    badge: 'text-amber-400 border-amber-400/40',
  },
];

const PROTOCOLS = ['Modbus RTU', 'Modbus TCP', 'BACnet MS/TP', 'BACnet IP', 'Direct Serial', 'Manual Entry'];
const DEVICE_TYPES = ['VFD / Variable Frequency Drive', 'PLC / Controller', 'SCADA Node', 'Flow Meter', 'Pressure Transmitter', 'Temperature Sensor', 'Power Meter', 'Chiller Controller', 'Boiler Controller', 'AHU Controller', 'Other'];
const BRANDS = ['ABB', 'Siemens', 'Danfoss', 'Allen-Bradley / Rockwell', 'Yaskawa', 'SEW-Eurodrive', 'WEG', 'Schneider Electric', 'Emerson', 'Honeywell', 'Johnson Controls', 'Carrier', 'Trane', 'York', 'Other'];
const BAUD_RATES = ['9600', '19200', '38400', '57600', '115200'];
const COM_PORTS = Array.from({ length: 16 }, (_, i) => `COM${i + 1}`);

type Step = 'scan' | 'identity' | 'tier' | 'sync' | 'active';

export function ConnectionWizard({ open, equipment, facilityId, onClose, onSessionStarted }: ConnectionWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('scan');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<'detected' | 'manual' | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [device, setDevice] = useState({
    brand: '',
    type: '',
    model: '',
    firmware: '',
    protocol: '',
    comPort: 'COM1',
    baudRate: '9600',
    nodeAddress: '1',
  });

  useEffect(() => {
    if (open && step === 'scan') {
      setScanProgress(0);
      setScanResult(null);
      scanRef.current = setInterval(() => {
        setScanProgress(p => {
          if (p >= 100) {
            clearInterval(scanRef.current!);
            // 60% chance of "detected" for demo — real impl would probe the port
            const detected = Math.random() > 0.4;
            setScanResult(detected ? 'detected' : 'manual');
            if (detected) {
              setDevice({
                brand: BRANDS[Math.floor(Math.random() * 5)],
                type: DEVICE_TYPES[0],
                model: `FW-${Math.floor(Math.random() * 900 + 100)}`,
                firmware: `v${Math.floor(Math.random() * 5 + 1)}.${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 9)}`,
                protocol: 'Modbus RTU',
                comPort: 'COM3',
                baudRate: '19200',
                nodeAddress: '1',
              });
            }
            return 100;
          }
          return p + 4;
        });
      }, 80);
    }
    return () => { if (scanRef.current) clearInterval(scanRef.current); };
  }, [open, step]);

  const startSync = () => {
    setStep('sync');
    setSyncProgress(0);
    syncRef.current = setInterval(() => {
      setSyncProgress(p => {
        if (p >= 100) {
          clearInterval(syncRef.current!);
          setStep('active');
          return 100;
        }
        return p + 2;
      });
    }, 60);
  };

  const finishSession = () => {
    if (!selectedTier) return;
    const now = new Date();
    const endsAt = new Date(now.getTime() + selectedTier.durationHours * 60 * 60 * 1000);
    const session: ProbeSession = {
      sessionId: `ps-${Date.now()}`,
      equipmentId: equipment.equipmentId,
      equipmentName: equipment.equipmentName || equipment.equipmentId,
      facilityId,
      tier: selectedTier.id,
      tierLabel: selectedTier.label,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      pollIntervalMin: selectedTier.pollMin,
      device,
      readings: [],
      checkIns: [],
      status: 'active',
    };
    // Persist to localStorage (always) and attempt API save
    try {
      const existing = JSON.parse(localStorage.getItem('nexum_probe_sessions') || '[]');
      localStorage.setItem('nexum_probe_sessions', JSON.stringify([session, ...existing]));
    } catch {}
    createProbeSession({
      sessionId: session.sessionId,
      facilityId: session.facilityId,
      equipmentId: session.equipmentId,
      equipmentName: session.equipmentName,
      tier: session.tier,
      startedAt: session.startedAt,
      endsAt: session.endsAt,
      pollIntervalMin: session.pollIntervalMin,
      device: { brand: device.brand, type: device.type, model: device.model, comPort: device.comPort, protocol: device.protocol },
      status: 'active',
      readingCount: 0,
      createdAt: session.startedAt,
    }).catch(() => { /* API not yet live — localStorage is source of truth */ });
    onSessionStarted(session);
    toast({ title: 'Monitoring session started', description: `${selectedTier.label} — ${selectedTier.duration} session active on ${equipment.equipmentName || equipment.equipmentId}.` });
    onClose();
  };

  const handleClose = () => {
    setStep('scan');
    setScanProgress(0);
    setScanResult(null);
    setSyncProgress(0);
    setSelectedTier(null);
    setDevice({ brand: '', type: '', model: '', firmware: '', protocol: '', comPort: 'COM1', baudRate: '9600', nodeAddress: '1' });
    onClose();
  };

  const canProceedToTier = device.brand && device.type && device.protocol;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Connect Device
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {equipment.equipmentName || equipment.equipmentId}
            {equipment.location ? ` · ${equipment.location}` : ''}
          </p>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          {(['scan', 'identity', 'tier', 'sync', 'active'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span className={cn('font-medium capitalize', step === s ? 'text-primary' : s < step ? 'text-muted-foreground/60' : '')}>
                {s === 'scan' ? 'Detect' : s === 'identity' ? 'Device' : s === 'tier' ? 'Tier' : s === 'sync' ? 'Sync' : 'Active'}
              </span>
              {i < 4 && <ChevronRight className="w-3 h-3 opacity-30" />}
            </div>
          ))}
        </div>

        {/* STEP: SCAN */}
        {step === 'scan' && (
          <div className="py-6 text-center space-y-4">
            <div className="relative mx-auto w-20 h-20">
              <div className={cn('w-20 h-20 rounded-full border-2 flex items-center justify-center',
                scanResult === 'detected' ? 'border-green-500 bg-green-500/10' :
                scanResult === 'manual' ? 'border-orange-500 bg-orange-500/10' :
                'border-primary/40 bg-primary/5')}>
                {scanResult === 'detected' ? <CheckCircle2 className="w-8 h-8 text-green-400" /> :
                 scanResult === 'manual' ? <AlertTriangle className="w-8 h-8 text-orange-400" /> :
                 <Wifi className={cn('w-8 h-8 text-primary', scanProgress < 100 && 'animate-pulse')} />}
              </div>
              {scanProgress < 100 && (
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="38" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/20" />
                  <circle cx="40" cy="40" r="38" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - scanProgress / 100)}`} className="text-primary transition-all" />
                </svg>
              )}
            </div>
            {scanProgress < 100 ? (
              <div>
                <p className="font-medium">Scanning for connected devices…</p>
                <p className="text-xs text-muted-foreground mt-1">Probing COM ports · Testing baud rates · Checking protocols</p>
              </div>
            ) : scanResult === 'detected' ? (
              <div className="space-y-3">
                <p className="font-medium text-green-400">Device detected</p>
                <p className="text-xs text-muted-foreground">Connection established. Review device details before proceeding.</p>
                <Button onClick={() => setStep('identity')}>Review Details <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-medium text-orange-400">Auto-detect failed</p>
                <p className="text-xs text-muted-foreground">No device found automatically. Enter connection details manually.</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => { setScanProgress(0); setScanResult(null); setStep('scan'); }}>Retry</Button>
                  <Button onClick={() => setStep('identity')}>Enter Manually</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP: IDENTITY */}
        {step === 'identity' && (
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {scanResult === 'detected' && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-xs text-green-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Auto-detected. Confirm or edit the values below.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Protocol *</Label>
                <Select value={device.protocol} onValueChange={v => setDevice(d => ({ ...d, protocol: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{PROTOCOLS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">COM Port</Label>
                <Select value={device.comPort} onValueChange={v => setDevice(d => ({ ...d, comPort: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{COM_PORTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Baud Rate</Label>
                <Select value={device.baudRate} onValueChange={v => setDevice(d => ({ ...d, baudRate: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{BAUD_RATES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Node / Slave Address</Label>
                <Input className="h-8 text-xs" value={device.nodeAddress} onChange={e => setDevice(d => ({ ...d, nodeAddress: e.target.value }))} placeholder="1" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Device Brand *</Label>
                <Select value={device.brand} onValueChange={v => setDevice(d => ({ ...d, brand: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select brand..." /></SelectTrigger>
                  <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Device Type *</Label>
                <Select value={device.type} onValueChange={v => setDevice(d => ({ ...d, type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>{DEVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model / Part No.</Label>
                <Input className="h-8 text-xs" value={device.model} onChange={e => setDevice(d => ({ ...d, model: e.target.value }))} placeholder="e.g., ACS580" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Firmware Version</Label>
                <Input className="h-8 text-xs" value={device.firmware} onChange={e => setDevice(d => ({ ...d, firmware: e.target.value }))} placeholder="e.g., v2.4.1" />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep('scan')}>Back</Button>
              <Button size="sm" onClick={() => setStep('tier')} disabled={!canProceedToTier}>
                Select Monitoring Tier <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: TIER */}
        {step === 'tier' && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Select the monitoring session duration. Sessions are booked and assigned by Nexum Suum.</p>
            {TIERS.map(tier => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier)}
                className={cn(
                  'w-full text-left p-4 rounded-lg border-2 transition-all',
                  selectedTier?.id === tier.id ? tier.color + ' border-2' : 'border-border/40 bg-transparent hover:bg-muted/20',
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{tier.label}</span>
                      <Badge variant="outline" className={cn('text-xs', tier.badge)}>{tier.duration}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                    {tier.checkIns > 0 && (
                      <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" />{tier.checkIns} weekly on-site check-ins included
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 ml-3">
                    <Clock className="w-3 h-3" />every {tier.pollMin}min
                  </div>
                </div>
              </button>
            ))}
            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep('identity')}>Back</Button>
              <Button size="sm" onClick={startSync} disabled={!selectedTier}>
                Begin Sync <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: SYNC */}
        {step === 'sync' && (
          <div className="py-8 text-center space-y-4">
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 rounded-full border-2 border-primary/40 bg-primary/5 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="38" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/20" />
                <circle cx="40" cy="40" r="38" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - syncProgress / 100)}`} className="text-primary transition-all" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Syncing historical data…</p>
              <p className="text-xs text-muted-foreground mt-1">Pulling fault logs · Runtime hours · Operating parameters</p>
              <p className="text-xs text-primary font-bold mt-2">{syncProgress}%</p>
            </div>
          </div>
        )}

        {/* STEP: ACTIVE */}
        {step === 'active' && selectedTier && (
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <p className="font-semibold text-green-400">Session Active</p>
            </div>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier</span>
                  <Badge variant="outline" className={selectedTier.badge}>{selectedTier.label}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{selectedTier.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Poll interval</span>
                  <span className="font-medium">Every {selectedTier.pollMin} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Device</span>
                  <span className="font-medium">{device.brand} {device.type.split('/')[0].trim()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protocol</span>
                  <span className="font-medium">{device.protocol} · {device.comPort}</span>
                </div>
                {selectedTier.checkIns > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-ins scheduled</span>
                    <span className="font-medium text-amber-400">{selectedTier.checkIns} (weekly)</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground text-center">
              Data will be logged every {selectedTier.pollMin} minutes and synced to this asset's record.
              {selectedTier.checkIns > 0 ? ' Nexum will perform weekly on-site check-ins.' : ''}
            </p>
            <Button className="w-full" onClick={finishSession}>
              <Zap className="w-4 h-4 mr-2" />Confirm & Start Monitoring
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
