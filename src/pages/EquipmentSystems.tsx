import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus, Search, Edit, Trash2, Loader2, Network, AlertCircle, RefreshCw,
  Wifi, WifiOff, Copy, Check, ChevronDown, ChevronUp, Eye, Cpu, Info,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import {
  listBMSFeeds, createBMSFeed, deleteBMSFeed,
  listSkids, createSkid, deleteSkid, getBMSMetadata,
  BMSFeed, BMSProtocol, Skid, SkidEquipment,
} from '@/lib/nexum-api';
import { useToast } from '@/hooks/use-toast';
import { useBMSPolling } from '@/hooks/useBMSPolling';

// ============================================================================
// EXISTING TYPES (Systems tab)
// ============================================================================

interface EquipmentSystem {
  systemId: string;
  systemName: string;
  systemType: string;
  parentEquipment: string;
  connectedEquipment: Array<{
    equipmentId: string;
    role: string;
  }>;
  description?: string;
  createdAt: string;
}

interface Equipment {
  equipmentId: string;
  equipmentType: string;
  manufacturer: string;
  model: string;
}

const systemTypes = [
  { value: 'boiler_system', label: 'Boiler System' },
  { value: 'chiller_system', label: 'Chiller System' },
  { value: 'hvac_system', label: 'HVAC System' },
  { value: 'pump_system', label: 'Pump System' },
  { value: 'cooling_tower_system', label: 'Cooling Tower System' },
  { value: 'air_handler_system', label: 'Air Handler System' },
  { value: 'custom', label: 'Custom System' },
];

const equipmentRoles = [
  'primary',
  'secondary',
  'backup',
  'supply_pump',
  'return_pump',
  'feedwater_tank',
  'condensate_tank',
  'expansion_tank',
  'deaerator',
  'chemical_tank',
  'compressor',
  'condenser',
  'evaporator',
  'control_panel',
  'vfd',
  'other',
];

// ============================================================================
// SKID + BMS TYPES / CONSTANTS
// ============================================================================

const skidTypeOptions = [
  { value: 'chiller_plant', label: 'Chiller Plant' },
  { value: 'air_handling', label: 'Air Handling' },
  { value: 'boiler_plant', label: 'Boiler Plant' },
  { value: 'pump_station', label: 'Pump Station' },
  { value: 'cooling_tower', label: 'Cooling Tower' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'custom', label: 'Custom' },
];

const equipmentTypeOptions = [
  { value: 'chiller', label: 'Chiller' },
  { value: 'pump', label: 'Pump' },
  { value: 'ahu', label: 'AHU' },
  { value: 'cooling_tower', label: 'Cooling Tower' },
  { value: 'boiler', label: 'Boiler' },
  { value: 'vfd', label: 'VFD' },
  { value: 'generic', label: 'Generic' },
];

const BMS_PROTOCOL_LABELS: Record<string, string> = {
  rest_webhook: 'REST / Webhook',
  mqtt: 'MQTT',
  bacnet_ip: 'BACnet/IP',
  modbus_tcp: 'Modbus TCP',
  opc_ua: 'OPC-UA',
  niagara: 'Niagara N4',
  metasys: 'Johnson Metasys',
  desigo: 'Siemens Desigo',
};

const EXAMPLE_INGEST_PAYLOAD = `{
  "facilityId": "facility-001",
  "feedId": "...",
  "timestamp": "2026-06-01T14:30:00Z",
  "equipment": [
    {
      "equipmentId": "CH-1",
      "equipmentType": "chiller",
      "points": {
        "chw_supply_temp": 44.2,
        "chw_return_temp": 56.8,
        "percent_load": 78,
        "kw": 423,
        "alarm_state": false
      }
    }
  ]
}`;

// ============================================================================
// HELPER UTILITIES
// ============================================================================

function getKeyPointsForType(
  equipmentType: string,
  points: Record<string, { value: number | boolean | string | null; unit: string; label: string; inAlarm: boolean; updatedAt: string }>,
): Array<{ label: string; value: string }> {
  const fmt = (key: string): { label: string; value: string } | null => {
    const p = points[key];
    if (!p || p.value === null || p.value === undefined) return null;
    const val = typeof p.value === 'boolean' ? (p.value ? 'Yes' : 'No') : `${p.value}${p.unit ? ' ' + p.unit : ''}`;
    return { label: p.label || key, value: val };
  };

  const tryKeys = (keys: string[]) =>
    keys.map(fmt).filter((x): x is { label: string; value: string } => x !== null).slice(0, 2);

  switch (equipmentType) {
    case 'chiller':      return tryKeys(['percent_load', 'chw_supply_temp']);
    case 'pump':         return tryKeys(['flow_gpm', 'speed_percent']);
    case 'ahu':          return tryKeys(['supply_air_temp', 'supply_cfm']);
    case 'cooling_tower':return tryKeys(['basin_temp', 'fan_speed']);
    case 'boiler':       return tryKeys(['hhw_supply_temp', 'firing_rate']);
    default:             return tryKeys(['run_status']);
  }
}

function formatTimeAgo(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Never';
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getBMSStatusInfo(feed: BMSFeed): { color: string; label: string } {
  if (feed.status === 'error') return { color: 'bg-red-500', label: 'Error' };
  if (!feed.lastSeenAt) return { color: 'bg-red-500', label: 'Never connected' };
  const diffMin = (Date.now() - new Date(feed.lastSeenAt).getTime()) / 60000;
  if (diffMin < 5) return { color: 'bg-green-500', label: 'Active' };
  if (diffMin < 60) return { color: 'bg-yellow-500', label: 'Stale' };
  return { color: 'bg-red-500', label: 'Offline' };
}

// ============================================================================
// COPY BUTTON COMPONENT
// ============================================================================

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silently
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

// ============================================================================
// SKID EQUIPMENT MINI CARD
// ============================================================================

function EquipmentMiniCard({ eq }: { eq: SkidEquipment }) {
  const hasLive = !!eq.livePoints && Object.keys(eq.livePoints).length > 0;
  const inAlarm = eq.inAlarm === true;
  const running = eq.runStatus === true;

  let dotColor = 'bg-gray-400';
  let statusLabel = eq.role;
  if (hasLive) {
    if (inAlarm) { dotColor = 'bg-red-500'; statusLabel = 'ALARM'; }
    else if (running) { dotColor = 'bg-green-500'; statusLabel = 'Running'; }
    else { dotColor = 'bg-yellow-400'; statusLabel = 'Off'; }
  }

  const keyPoints = hasLive && eq.livePoints
    ? getKeyPointsForType(eq.equipmentType, eq.livePoints)
    : [];

  return (
    <div className="flex items-start gap-2 border rounded-lg p-2 text-sm">
      <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{eq.label || eq.equipmentId}</div>
        <div className="text-xs text-muted-foreground capitalize">
          {eq.equipmentType.replace(/_/g, ' ')}
        </div>
        {keyPoints.length > 0 ? (
          <div className="mt-0.5 space-y-0.5">
            {keyPoints.map((kp, i) => (
              <div key={i} className="text-xs text-foreground/80">
                {kp.label}: <span className="font-medium">{kp.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-xs mt-0.5 ${inAlarm ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
            {statusLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SKID DETAIL DIALOG
// ============================================================================

function SkidDetailDialog({
  skid,
  open,
  onOpenChange,
}: {
  skid: Skid | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!skid) return null;

  const bmsConnected = !!skid.bmsIntegrationId;
  const lastUpdate = skid.liveData?.[0]?.receivedAt || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{skid.skidName} — Equipment Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{skid.skidType.replace(/_/g, ' ')}</Badge>
            {skid.location && <span>Location: {skid.location}</span>}
            <span className="flex items-center gap-1">
              {bmsConnected ? <Wifi className="w-3.5 h-3.5 text-green-500" /> : <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />}
              {bmsConnected ? `BMS connected — last data ${formatTimeAgo(lastUpdate)}` : 'No BMS integration'}
            </span>
          </div>

          {skid.equipment.length === 0 ? (
            <p className="text-muted-foreground text-sm">No equipment configured on this skid.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Equipment ID</th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Type</th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Role</th>
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="py-2 font-medium text-muted-foreground">Data Points</th>
                  </tr>
                </thead>
                <tbody>
                  {skid.equipment.map((eq, idx) => {
                    const live = skid.liveData?.find(d => d.equipmentId === eq.equipmentId);
                    const pointEntries = live ? Object.entries(live.points) : [];
                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{eq.equipmentId}</td>
                        <td className="py-2 pr-4 capitalize">{eq.equipmentType.replace(/_/g, ' ')}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{eq.role}</td>
                        <td className="py-2 pr-4">
                          {live ? (
                            <span className={`inline-flex items-center gap-1 ${live.inAlarm ? 'text-red-500' : live.runStatus ? 'text-green-600' : 'text-yellow-500'}`}>
                              <span className={`w-2 h-2 rounded-full ${live.inAlarm ? 'bg-red-500' : live.runStatus ? 'bg-green-500' : 'bg-yellow-400'}`} />
                              {live.inAlarm ? 'ALARM' : live.runStatus ? 'Running' : 'Off'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2">
                          {pointEntries.length > 0 ? (
                            <div className="space-y-0.5">
                              {pointEntries.map(([key, pt]) => (
                                <div key={key} className="text-xs">
                                  <span className="text-muted-foreground">{pt.label || key}:</span>{' '}
                                  <span className="font-medium">
                                    {typeof pt.value === 'boolean' ? (pt.value ? 'Yes' : 'No') : `${pt.value}${pt.unit ? ' ' + pt.unit : ''}`}
                                  </span>
                                  {pt.inAlarm && <span className="ml-1 text-red-500 font-semibold">⚠</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No live data</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SKID CARD
// ============================================================================

function SkidCard({
  skid,
  onViewDetail,
}: {
  skid: Skid;
  onViewDetail: (s: Skid) => void;
}) {
  const bmsConnected = !!skid.bmsIntegrationId;
  const alarmCount = skid.alarmCount ?? 0;
  const runningCount = skid.liveData ? skid.liveData.filter(d => d.runStatus).length : 0;
  const lastData = skid.liveData?.[0]?.receivedAt || null;

  return (
    <Card className={alarmCount > 0 ? 'border-red-500/40' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs shrink-0">
                {skid.skidType.replace(/_/g, ' ')}
              </Badge>
            </div>
            <CardTitle className="text-base truncate">{skid.skidName}</CardTitle>
            {skid.location && (
              <p className="text-xs text-muted-foreground mt-0.5">Location: {skid.location}</p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => onViewDetail(skid)}>
            <Eye className="w-3.5 h-3.5 mr-1" />
            View Detail
          </Button>
        </div>
        <div className="flex items-center gap-1.5 text-xs mt-1">
          <span className={`w-2 h-2 rounded-full ${bmsConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-muted-foreground">
            {bmsConnected ? `BMS Connected — last ${formatTimeAgo(lastData)}` : 'No BMS'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span>{skid.equipment.length} Equipment</span>
          <span className={alarmCount > 0 ? 'text-red-500 font-semibold' : ''}>{alarmCount} Alarms</span>
          <span>{runningCount} Running</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {skid.equipment.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {skid.equipment.map((eq, idx) => {
              const live = skid.liveData?.find(d => d.equipmentId === eq.equipmentId);
              const enrichedEq: SkidEquipment = {
                ...eq,
                livePoints: live?.points ?? null,
                inAlarm: live?.inAlarm ?? false,
                runStatus: live?.runStatus ?? null,
              };
              return <EquipmentMiniCard key={idx} eq={enrichedEq} />;
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No equipment configured.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// BMS CONNECTION DETAILS CONTENT (reused in both create result + view dialog)
// ============================================================================

interface ConnectionDetails {
  feedId: string;
  name: string;
  protocol: string;
  ingestUrl: string;
  apiKey: string;
}

function ConnectionDetailsPanel({ details }: { details: ConnectionDetails }) {
  const [showKey, setShowKey] = useState(false);
  const maskedKey = details.apiKey.slice(0, 8) + '••••••••••••••••••••••••••••••••';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Ingest URL</Label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono break-all">
            {details.ingestUrl}
          </code>
          <CopyButton text={details.ingestUrl} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">API Key</Label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono break-all">
            {showKey ? details.apiKey : maskedKey}
          </code>
          <Button variant="outline" size="sm" onClick={() => setShowKey(v => !v)}>
            {showKey ? 'Hide' : 'Show'}
          </Button>
          <CopyButton text={details.apiKey} label="Copy Key" />
        </div>
        <p className="text-xs text-yellow-600">This key is only shown once. Store it securely.</p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Example Payload</Label>
        <div className="relative">
          <pre className="text-xs bg-muted rounded p-3 overflow-x-auto font-mono">
            {EXAMPLE_INGEST_PAYLOAD.replace('"feedId": "..."', `"feedId": "${details.feedId}"`)}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton text={EXAMPLE_INGEST_PAYLOAD} label="Copy" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EquipmentSystems() {
  const { user } = useAuth();
  const { toast } = useToast();
  const bmsPoll = useBMSPolling();

  // ── Systems tab state ──────────────────────────────────────────────────────
  const [systems, setSystems] = useState<EquipmentSystem[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemsError, setSystemsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<EquipmentSystem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    systemName: '',
    systemType: '',
    description: '',
    parentEquipment: '',
    connectedEquipment: [] as Array<{ equipmentId: string; role: string }>,
  });

  // ── Skids tab state ────────────────────────────────────────────────────────
  const [skids, setSkids] = useState<Skid[]>([]);
  const [skidsLoading, setSkidsLoading] = useState(false);
  const [createSkidOpen, setCreateSkidOpen] = useState(false);
  const [selectedSkid, setSelectedSkid] = useState<Skid | null>(null);
  const [skidDetailOpen, setSkidDetailOpen] = useState(false);
  const [skidSubmitting, setSkidSubmitting] = useState(false);

  const [skidForm, setSkidForm] = useState({
    skidName: '',
    skidType: '',
    description: '',
    location: '',
    bmsIntegrationId: '',
    equipment: [] as Array<{ equipmentId: string; equipmentType: string; role: string; label: string }>,
  });

  // ── BMS tab state ──────────────────────────────────────────────────────────
  const [feeds, setFeeds] = useState<BMSFeed[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(false);
  const [createFeedOpen, setCreateFeedOpen] = useState(false);
  const [feedSubmitting, setFeedSubmitting] = useState(false);
  const [newConnectionDetails, setNewConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [selectedFeedCreds, setSelectedFeedCreds] = useState<ConnectionDetails | null>(null);
  const [feedCredsOpen, setFeedCredsOpen] = useState(false);
  const [deletingFeedId, setDeletingFeedId] = useState<string | null>(null);
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [bmsProtocols, setBmsProtocols] = useState<Record<string, { label: string; description: string; vendors?: string[] }>>({});

  const [feedForm, setFeedForm] = useState({
    name: '',
    protocol: '' as BMSProtocol | '',
    bmsVendor: '',
    description: '',
  });

  const canEdit = ['admin', 'executive', 'manager'].includes(user?.role || '');

  // ── Systems tab loaders ────────────────────────────────────────────────────

  useEffect(() => {
    loadSystems();
    loadEquipment();
  }, [user?.facilityId]);

  const loadSystems = async () => {
    const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
    try {
      setLoading(true);
      setSystemsError(null);
      const data = await apiRequest(`/equipment-systems`);
      setSystems(data.systems || []);
    } catch (error: any) {
      console.error('Failed to load systems:', error);
      const msg = error?.status === 500
        ? 'Equipment Systems service is temporarily unavailable. Please try again.'
        : 'Could not load equipment systems. Check your connection and retry.';
      setSystemsError(msg);
      setSystems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    try {
      const data = await apiRequest(`/equipment`);
      setEquipment(data.equipment || []);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    }
  };

  // ── Skids tab loaders ──────────────────────────────────────────────────────

  const loadSkids = useCallback(async () => {
    try {
      setSkidsLoading(true);
      const data = await listSkids();
      setSkids(data.skids || []);
    } catch (error: any) {
      console.error('Failed to load skids:', error);
      toast({ title: 'Error', description: 'Could not load skids.', variant: 'destructive' });
    } finally {
      setSkidsLoading(false);
    }
  }, [toast]);

  // ── BMS tab loaders ────────────────────────────────────────────────────────

  const loadFeeds = useCallback(async () => {
    try {
      setFeedsLoading(true);
      const [feedData, meta] = await Promise.all([listBMSFeeds(), getBMSMetadata()]);
      setFeeds(feedData.feeds || []);
      if (meta.protocols) setBmsProtocols(meta.protocols);
    } catch (error: any) {
      console.error('Failed to load BMS feeds:', error);
      toast({ title: 'Error', description: 'Could not load BMS integrations.', variant: 'destructive' });
    } finally {
      setFeedsLoading(false);
    }
  }, [toast]);

  // ── Systems CRUD ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formData.systemName || !formData.systemType || formData.connectedEquipment.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'System name, type, and at least one equipment are required',
        variant: 'destructive',
      });
      return;
    }
    try {
      setSubmitting(true);
      await apiRequest('/equipment-systems', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      toast({ title: 'Success', description: 'Equipment system created successfully' });
      setCreateDialogOpen(false);
      resetForm();
      loadSystems();
    } catch (error: any) {
      console.error('Failed to create system:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create system', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSystem) return;
    try {
      setSubmitting(true);
      await apiRequest('/equipment-systems/update', {
        method: 'POST',
        body: JSON.stringify({ systemId: selectedSystem.systemId, ...formData }),
      });
      toast({ title: 'Success', description: 'Equipment system updated successfully' });
      setEditDialogOpen(false);
      setSelectedSystem(null);
      resetForm();
      loadSystems();
    } catch (error: any) {
      console.error('Failed to update system:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update system', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (system: EquipmentSystem) => {
    setSelectedSystem(system);
    setFormData({
      systemName: system.systemName,
      systemType: system.systemType,
      description: system.description || '',
      parentEquipment: system.parentEquipment,
      connectedEquipment: system.connectedEquipment,
    });
    setEditDialogOpen(true);
  };

  const addEquipmentToSystem = () => {
    setFormData({
      ...formData,
      connectedEquipment: [...formData.connectedEquipment, { equipmentId: '', role: 'other' }],
    });
  };

  const updateEquipmentInSystem = (index: number, field: 'equipmentId' | 'role', value: string) => {
    const updated = [...formData.connectedEquipment];
    updated[index][field] = value;
    setFormData({ ...formData, connectedEquipment: updated });
  };

  const removeEquipmentFromSystem = (index: number) => {
    setFormData({ ...formData, connectedEquipment: formData.connectedEquipment.filter((_, i) => i !== index) });
  };

  const resetForm = () => {
    setFormData({ systemName: '', systemType: '', description: '', parentEquipment: '', connectedEquipment: [] });
  };

  const filteredSystems = systems.filter(sys =>
    sys.systemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sys.systemType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Skid CRUD ──────────────────────────────────────────────────────────────

  const handleCreateSkid = async () => {
    if (!skidForm.skidName || !skidForm.skidType) {
      toast({ title: 'Validation Error', description: 'Skid name and type are required.', variant: 'destructive' });
      return;
    }
    try {
      setSkidSubmitting(true);
      await createSkid({
        skidName: skidForm.skidName,
        skidType: skidForm.skidType,
        description: skidForm.description || undefined,
        location: skidForm.location || undefined,
        bmsIntegrationId: skidForm.bmsIntegrationId || undefined,
        equipment: skidForm.equipment,
      });
      toast({ title: 'Success', description: 'Skid created successfully.' });
      setCreateSkidOpen(false);
      resetSkidForm();
      loadSkids();
    } catch (error: any) {
      console.error('Failed to create skid:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create skid.', variant: 'destructive' });
    } finally {
      setSkidSubmitting(false);
    }
  };

  const handleDeleteSkid = async (skidId: string, skidName: string) => {
    if (!window.confirm(`Delete skid "${skidName}"? This cannot be undone.`)) return;
    try {
      await deleteSkid(skidId);
      toast({ title: 'Deleted', description: `Skid "${skidName}" deleted.` });
      loadSkids();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete skid.', variant: 'destructive' });
    }
  };

  const resetSkidForm = () => {
    setSkidForm({ skidName: '', skidType: '', description: '', location: '', bmsIntegrationId: '', equipment: [] });
  };

  const addSkidEquipmentRow = () => {
    setSkidForm({
      ...skidForm,
      equipment: [...skidForm.equipment, { equipmentId: '', equipmentType: 'generic', role: '', label: '' }],
    });
  };

  const updateSkidEquipmentRow = (
    index: number,
    field: 'equipmentId' | 'equipmentType' | 'role' | 'label',
    value: string,
  ) => {
    const updated = [...skidForm.equipment];
    updated[index][field] = value;
    setSkidForm({ ...skidForm, equipment: updated });
  };

  const removeSkidEquipmentRow = (index: number) => {
    setSkidForm({ ...skidForm, equipment: skidForm.equipment.filter((_, i) => i !== index) });
  };

  // ── BMS Feed CRUD ──────────────────────────────────────────────────────────

  const handleCreateFeed = async () => {
    if (!feedForm.name || !feedForm.protocol) {
      toast({ title: 'Validation Error', description: 'Integration name and protocol are required.', variant: 'destructive' });
      return;
    }
    try {
      setFeedSubmitting(true);
      const result = await createBMSFeed({
        name: feedForm.name,
        protocol: feedForm.protocol as BMSProtocol,
        bmsVendor: feedForm.bmsVendor || undefined,
        description: feedForm.description || undefined,
      });
      setNewConnectionDetails({
        feedId: result.feedId,
        name: feedForm.name,
        protocol: feedForm.protocol,
        ingestUrl: result.ingestUrl,
        apiKey: result.apiKey,
      });
      toast({ title: 'BMS Integration Created', description: 'Save your API key — it will not be shown again.' });
      setFeedForm({ name: '', protocol: '', bmsVendor: '', description: '' });
      loadFeeds();
    } catch (error: any) {
      console.error('Failed to create BMS feed:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create BMS integration.', variant: 'destructive' });
    } finally {
      setFeedSubmitting(false);
    }
  };

  const handleDeleteFeed = async (feedId: string, feedName: string) => {
    if (!window.confirm(`Delete BMS integration "${feedName}"? All associated data will be lost.`)) return;
    try {
      setDeletingFeedId(feedId);
      await deleteBMSFeed(feedId);
      toast({ title: 'Deleted', description: `BMS integration "${feedName}" deleted.` });
      loadFeeds();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete integration.', variant: 'destructive' });
    } finally {
      setDeletingFeedId(null);
    }
  };

  const openFeedCredsDialog = (feed: BMSFeed) => {
    setSelectedFeedCreds({
      feedId: feed.feedId,
      name: feed.name,
      protocol: feed.protocol,
      ingestUrl: feed.ingestUrl,
      apiKey: feed.apiKey,
    });
    setFeedCredsOpen(true);
  };

  // ── Tab change handler (lazy load) ─────────────────────────────────────────

  const handleTabChange = (tab: string) => {
    if (tab === 'skids' && skids.length === 0 && !skidsLoading) loadSkids();
    if (tab === 'bms' && feeds.length === 0 && !feedsLoading) loadFeeds();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Equipment Systems</h1>
          <p className="text-muted-foreground">Manage equipment systems, skid views, and BMS integrations</p>
        </div>

        <Tabs defaultValue="systems" onValueChange={handleTabChange}>
          <TabsList className="mb-2">
            <TabsTrigger value="systems">Systems</TabsTrigger>
            <TabsTrigger value="skids">Skids</TabsTrigger>
            <TabsTrigger value="bms">BMS Integration</TabsTrigger>
          </TabsList>

          {/* ================================================================
              TAB 1: SYSTEMS (existing, unchanged logic)
              ================================================================ */}
          <TabsContent value="systems" className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Manage connected equipment packages and workflows</p>
              {canEdit && (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create System
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Equipment System</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>System Name *</Label>
                          <Input
                            value={formData.systemName}
                            onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
                            placeholder="e.g., Boiler Plant 1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>System Type *</Label>
                          <Select value={formData.systemType} onValueChange={(value) => setFormData({ ...formData, systemType: value })}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {systemTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Optional system description"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Connected Equipment *</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addEquipmentToSystem}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Equipment
                          </Button>
                        </div>

                        {formData.connectedEquipment.length === 0 && (
                          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                            No equipment added yet. Click "Add Equipment" to start.
                          </div>
                        )}

                        {formData.connectedEquipment.map((eq, index) => (
                          <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                            <Select
                              value={eq.equipmentId}
                              onValueChange={(value) => updateEquipmentInSystem(index, 'equipmentId', value)}
                            >
                              <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                              <SelectContent>
                                {equipment.map(e => (
                                  <SelectItem key={e.equipmentId} value={e.equipmentId}>
                                    {e.equipmentId} - {e.equipmentType}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={eq.role}
                              onValueChange={(value) => updateEquipmentInSystem(index, 'role', value)}
                            >
                              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                              <SelectContent>
                                {equipmentRoles.map(role => (
                                  <SelectItem key={role} value={role}>
                                    {role.replace(/_/g, ' ').toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeEquipmentFromSystem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }} disabled={submitting}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={submitting}>
                          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Create System
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit System: {selectedSystem?.systemName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>System Name *</Label>
                      <Input value={formData.systemName} onChange={(e) => setFormData({ ...formData, systemName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>System Type *</Label>
                      <Select value={formData.systemType} onValueChange={(value) => setFormData({ ...formData, systemType: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {systemTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Connected Equipment *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addEquipmentToSystem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Equipment
                      </Button>
                    </div>

                    {formData.connectedEquipment.map((eq, index) => (
                      <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                        <Select value={eq.equipmentId} onValueChange={(value) => updateEquipmentInSystem(index, 'equipmentId', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {equipment.map(e => (
                              <SelectItem key={e.equipmentId} value={e.equipmentId}>{e.equipmentId} - {e.equipmentType}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={eq.role} onValueChange={(value) => updateEquipmentInSystem(index, 'role', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {equipmentRoles.map(role => (
                              <SelectItem key={role} value={role}>{role.replace(/_/g, ' ').toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button type="button" variant="outline" size="icon" onClick={() => removeEquipmentFromSystem(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedSystem(null); resetForm(); }} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdate} disabled={submitting}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {systemsError && (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-500">Systems Unavailable</p>
                      <p className="text-sm text-muted-foreground">{systemsError}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadSystems}>
                    <RefreshCw className="w-4 h-4 mr-2" />Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search systems..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Badge variant="outline">{filteredSystems.length} systems</Badge>
            </div>

            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="h-5 bg-muted/40 rounded w-48 mb-2" />
                      <div className="flex gap-2">
                        <div className="h-5 bg-muted/40 rounded w-28" />
                        <div className="h-5 bg-muted/40 rounded w-24" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map(j => <div key={j} className="h-12 bg-muted/30 rounded-lg" />)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredSystems.length === 0 && !systemsError ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Network className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No equipment systems yet</p>
                  <p className="text-sm mb-4">Create your first system to group connected equipment into logical packages</p>
                  {canEdit && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />Add Your First System
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredSystems.map((system) => (
                  <Card key={system.systemId}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{system.systemName}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge>{system.systemType.replace(/_/g, ' ').toUpperCase()}</Badge>
                            <Badge variant="outline">{system.connectedEquipment.length} Equipment</Badge>
                          </div>
                        </div>
                        {canEdit && (
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(system)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {system.description && (
                        <p className="text-sm text-muted-foreground mb-3">{system.description}</p>
                      )}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Connected Equipment:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {system.connectedEquipment.map((eq, idx) => (
                            <div key={idx} className="text-sm border rounded-lg p-2">
                              <div className="font-medium">{eq.equipmentId}</div>
                              <div className="text-xs text-muted-foreground">{eq.role.replace(/_/g, ' ')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ================================================================
              TAB 2: SKIDS
              ================================================================ */}
          <TabsContent value="skids" className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Skids group equipment together with live BMS data overlaid on each piece of equipment.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadSkids} disabled={skidsLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${skidsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {canEdit && (
                  <Dialog open={createSkidOpen} onOpenChange={setCreateSkidOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Skid
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create Skid</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Skid Name *</Label>
                            <Input
                              value={skidForm.skidName}
                              onChange={(e) => setSkidForm({ ...skidForm, skidName: e.target.value })}
                              placeholder="e.g., Chiller Plant 1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Skid Type *</Label>
                            <Select value={skidForm.skidType} onValueChange={(v) => setSkidForm({ ...skidForm, skidType: v })}>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                {skidTypeOptions.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input
                            value={skidForm.location}
                            onChange={(e) => setSkidForm({ ...skidForm, location: e.target.value })}
                            placeholder="e.g., Mechanical Room B"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={skidForm.description}
                            onChange={(e) => setSkidForm({ ...skidForm, description: e.target.value })}
                            placeholder="Optional description"
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>BMS Integration</Label>
                          <Select
                            value={skidForm.bmsIntegrationId || 'none'}
                            onValueChange={(v) => setSkidForm({ ...skidForm, bmsIntegrationId: v === 'none' ? '' : v })}
                          >
                            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {feeds.map(f => (
                                <SelectItem key={f.feedId} value={f.feedId}>
                                  {f.name} ({BMS_PROTOCOL_LABELS[f.protocol] || f.protocol})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {feeds.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No BMS integrations yet. Create one in the BMS Integration tab first.
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Equipment</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addSkidEquipmentRow}>
                              <Plus className="w-4 h-4 mr-2" />
                              Add Equipment
                            </Button>
                          </div>

                          {skidForm.equipment.length === 0 && (
                            <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                              No equipment added yet. Click "Add Equipment" to start.
                            </div>
                          )}

                          {skidForm.equipment.map((eq, index) => (
                            <div key={index} className="grid grid-cols-[1fr,1fr,1fr,1fr,auto] gap-2">
                              <Input
                                value={eq.equipmentId}
                                onChange={(e) => updateSkidEquipmentRow(index, 'equipmentId', e.target.value)}
                                placeholder="Equipment ID"
                              />
                              <Select value={eq.equipmentType} onValueChange={(v) => updateSkidEquipmentRow(index, 'equipmentType', v)}>
                                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                  {equipmentTypeOptions.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={eq.role}
                                onChange={(e) => updateSkidEquipmentRow(index, 'role', e.target.value)}
                                placeholder="Role"
                              />
                              <Input
                                value={eq.label}
                                onChange={(e) => updateSkidEquipmentRow(index, 'label', e.target.value)}
                                placeholder="Label"
                              />
                              <Button type="button" variant="outline" size="icon" onClick={() => removeSkidEquipmentRow(index)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => { setCreateSkidOpen(false); resetSkidForm(); }} disabled={skidSubmitting}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateSkid} disabled={skidSubmitting}>
                            {skidSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Skid
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* Skid detail dialog */}
            <SkidDetailDialog
              skid={selectedSkid}
              open={skidDetailOpen}
              onOpenChange={setSkidDetailOpen}
            />

            {skidsLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="h-5 bg-muted/40 rounded w-40 mb-2" />
                      <div className="h-4 bg-muted/30 rounded w-24" />
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2].map(j => <div key={j} className="h-16 bg-muted/25 rounded-lg" />)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : skids.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Cpu className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No skids configured yet</p>
                  <p className="text-sm mb-4">
                    Create a skid to group equipment and connect BMS live data.
                  </p>
                  {canEdit && (
                    <Button onClick={() => setCreateSkidOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />Create Your First Skid
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {skids.map(skid => (
                  <div key={skid.skidId} className="relative group">
                    <SkidCard
                      skid={skid}
                      onViewDetail={(s) => { setSelectedSkid(s); setSkidDetailOpen(true); }}
                    />
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => handleDeleteSkid(skid.skidId, skid.skidName)}
                        title="Delete skid"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ================================================================
              TAB 3: BMS INTEGRATION
              ================================================================ */}
          <TabsContent value="bms" className="space-y-6">
            {/* Overview card */}
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-5 flex items-start gap-4">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">What is BMS Integration?</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your Building Management System to Nexum FI to receive real-time data from chillers,
                    pumps, AHUs, and other equipment. Your BMS pushes data to our secure ingest endpoint.
                    No firewall changes needed — your BMS sends outbound HTTPS requests to us.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Protocol info cards */}
            {Object.keys(bmsProtocols).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Supported Protocols</h3>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(bmsProtocols).map(([key, proto]) => {
                    const isExpanded = expandedProtocol === key;
                    const vendors: string[] = Array.isArray(proto.vendors) ? proto.vendors : [];
                    return (
                      <Card
                        key={key}
                        className="cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => setExpandedProtocol(isExpanded ? null : key)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{proto.label || BMS_PROTOCOL_LABELS[key] || key}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          {isExpanded ? (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">{proto.description}</p>
                              {vendors.length > 0 && (
                                <p className="text-xs text-muted-foreground">Vendors: {vendors.join(', ')}</p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-1">
                              <p className="text-xs text-muted-foreground truncate">{proto.description}</p>
                              {vendors.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {vendors.slice(0, 2).join(', ')}{vendors.length > 2 ? '…' : ''}
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Auto-sync status banner */}
            <div className={`rounded-lg border px-4 py-3 flex flex-wrap items-center gap-3 text-xs ${
              bmsPoll.status === 'error'   ? 'border-red-500/30 bg-red-500/5 text-red-400' :
              bmsPoll.status === 'polling' ? 'border-primary/30 bg-primary/5 text-primary' :
              bmsPoll.status === 'success' ? 'border-green-500/30 bg-green-500/5 text-green-400' :
              'border-border/50 bg-muted/20 text-muted-foreground'
            }`}>
              <div className="flex items-center gap-2">
                {bmsPoll.isPolling
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Wifi className="w-3.5 h-3.5" />}
                <span className="font-medium">
                  {bmsPoll.isPolling ? 'Syncing BAS / BMS / CMMS…' : 'Auto-Sync: Every 3 hours'}
                </span>
              </div>
              <span className="text-muted-foreground">Last pull: <strong className="text-foreground">{bmsPoll.formatLastPoll()}</strong></span>
              {bmsPoll.nextPollAt && !bmsPoll.isPolling && (
                <span className="text-muted-foreground">Next: <strong className="text-foreground">{bmsPoll.formatNextPoll()}</strong></span>
              )}
              {bmsPoll.activeFeedsCount > 0 && (
                <span className="text-muted-foreground">{bmsPoll.activeFeedsCount} active feed{bmsPoll.activeFeedsCount !== 1 ? 's' : ''} · {bmsPoll.totalDataPoints.toLocaleString()} points</span>
              )}
              {bmsPoll.alarmCount > 0 && (
                <span className="text-red-400 font-medium">{bmsPoll.alarmCount} alarm{bmsPoll.alarmCount !== 1 ? 's' : ''}</span>
              )}
              {bmsPoll.status === 'error' && bmsPoll.errorMessage && (
                <span className="text-red-400">Error: {bmsPoll.errorMessage}</span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-6 text-xs py-0 px-2"
                onClick={() => bmsPoll.triggerNow()}
                disabled={bmsPoll.isPolling}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${bmsPoll.isPolling ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </div>

            {/* Feeds section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">BMS Integrations</h3>
                {feedsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadFeeds} disabled={feedsLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${feedsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {canEdit && (
                  <Dialog open={createFeedOpen} onOpenChange={(v) => { setCreateFeedOpen(v); if (!v) setNewConnectionDetails(null); }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Register BMS Integration
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Register BMS Integration</DialogTitle>
                      </DialogHeader>

                      {newConnectionDetails ? (
                        /* Step 2: Show connection details after creation */
                        <div className="space-y-4 py-4">
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-700">
                            Integration <strong>{newConnectionDetails.name}</strong> created successfully.
                            Configure your BMS to push data to the endpoint below.
                          </div>
                          <ConnectionDetailsPanel details={newConnectionDetails} />
                          <div className="flex justify-end pt-2">
                            <Button onClick={() => { setCreateFeedOpen(false); setNewConnectionDetails(null); }}>
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Step 1: Registration form */
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Integration Name *</Label>
                            <Input
                              value={feedForm.name}
                              onChange={(e) => setFeedForm({ ...feedForm, name: e.target.value })}
                              placeholder="e.g., Main Campus BMS"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Protocol *</Label>
                            <Select value={feedForm.protocol} onValueChange={(v) => setFeedForm({ ...feedForm, protocol: v as BMSProtocol })}>
                              <SelectTrigger><SelectValue placeholder="Select protocol" /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(BMS_PROTOCOL_LABELS).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>BMS Vendor / Platform <span className="text-muted-foreground">(optional)</span></Label>
                            <Input
                              value={feedForm.bmsVendor}
                              onChange={(e) => setFeedForm({ ...feedForm, bmsVendor: e.target.value })}
                              placeholder="e.g., Johnson Controls, Siemens, Honeywell"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
                            <Textarea
                              value={feedForm.description}
                              onChange={(e) => setFeedForm({ ...feedForm, description: e.target.value })}
                              placeholder="Optional notes about this integration"
                              rows={2}
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setCreateFeedOpen(false)} disabled={feedSubmitting}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateFeed} disabled={feedSubmitting}>
                              {feedSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Register Integration
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* Feed creds dialog */}
            <Dialog open={feedCredsOpen} onOpenChange={setFeedCredsOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Connection Details — {selectedFeedCreds?.name}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  {selectedFeedCreds && <ConnectionDetailsPanel details={selectedFeedCreds} />}
                </div>
              </DialogContent>
            </Dialog>

            {/* Feeds list */}
            {feeds.length === 0 && !feedsLoading ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <WifiOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No BMS integrations registered</p>
                  <p className="text-sm mb-4">
                    Register a BMS integration to start receiving live equipment data from your building management system.
                  </p>
                  {canEdit && (
                    <Button onClick={() => setCreateFeedOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />Register Your First Integration
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {feeds.map(feed => {
                  const { color: dotColor, label: statusLabel } = getBMSStatusInfo(feed);
                  const isDeleting = deletingFeedId === feed.feedId;
                  return (
                    <Card key={feed.feedId}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{feed.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {BMS_PROTOCOL_LABELS[feed.protocol] || feed.protocol}
                              </Badge>
                              {feed.bmsVendor && (
                                <Badge variant="outline" className="text-xs">{feed.bmsVendor}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                              <span>{statusLabel}</span>
                              <span>—</span>
                              <span>
                                {feed.lastSeenAt ? `Last seen ${formatTimeAgo(feed.lastSeenAt)}` : 'Never connected'}
                              </span>
                              {feed.pointCount > 0 && (
                                <>
                                  <span>—</span>
                                  <Badge variant="outline" className="text-xs">{feed.pointCount} points</Badge>
                                </>
                              )}
                            </div>
                            {feed.description && (
                              <p className="text-xs text-muted-foreground mt-1">{feed.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => openFeedCredsDialog(feed)}>
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View Connection Details
                            </Button>
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive border-destructive/30"
                                onClick={() => handleDeleteFeed(feed.feedId, feed.name)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
