import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Building2, Users, Wrench, Package, Zap, FileCheck,
  ChevronRight, ChevronLeft, CheckCircle, Plus, Trash2,
  Upload, Flame, Loader2, X, Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember { name: string; role: string; email: string; }
interface EquipmentItem { equipmentType: string; manufacturer: string; model: string; location: string; serialNumber: string; }
interface InventoryItem { itemName: string; partNumber: string; quantity: string; unit: string; location: string; }
interface BaselineData { [equipmentType: string]: { [field: string]: string } }

const ROLES = ['operator', 'technician', 'engineer', 'custodian', 'supervisor', 'manager', 'executive'];
const EQUIPMENT_TYPES = ['boiler', 'chiller', 'pump', 'ahu', 'cooling_tower', 'fan', 'compressor', 'vav', 'heat_exchanger'];
const FACILITY_TYPES = ['commercial_office', 'healthcare', 'education', 'industrial', 'residential', 'retail', 'hospitality', 'government'];
const STEPS = [
  { id: 1, label: 'Organization', icon: Building2 },
  { id: 2, label: 'Staff', icon: Users },
  { id: 3, label: 'Equipment', icon: Wrench },
  { id: 4, label: 'Baselines', icon: Shield },
  { id: 5, label: 'Inventory', icon: Package },
  { id: 6, label: 'Utilities', icon: Zap },
  { id: 7, label: 'Audit Report', icon: FileCheck },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Org
  const [org, setOrg] = useState({ name: '', facilityCount: '1', facilityType: '', address: '', city: '', state: '', zip: '' });

  // Step 2 — Staff
  const [staff, setStaff] = useState<StaffMember[]>([{ name: '', role: '', email: '' }]);

  // Step 3 — Equipment
  const [equipment, setEquipment] = useState<EquipmentItem[]>([{ equipmentType: '', manufacturer: '', model: '', location: '', serialNumber: '' }]);

  // Step 4 — Baselines
  const [baselines, setBaselines] = useState<BaselineData>({});

  // Step 5 — Inventory
  const [inventory, setInventory] = useState<InventoryItem[]>([{ itemName: '', partNumber: '', quantity: '', unit: 'each', location: '' }]);

  // Step 6 — Utility Rates
  const [utilities, setUtilities] = useState({ electricRate: '0.18', gasRate: '1.52', waterRate: '15.07' });

  // Step 7 — Audit Report
  const [auditFile, setAuditFile] = useState<File | null>(null);
  const [auditMeta, setAuditMeta] = useState({ agency: '', inspectionDate: '', result: 'pass' });

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  // ─── Staff helpers ──────────────────────────────────────────────────────────
  const addStaff = () => setStaff([...staff, { name: '', role: '', email: '' }]);
  const removeStaff = (i: number) => setStaff(staff.filter((_, idx) => idx !== i));
  const updateStaff = (i: number, field: keyof StaffMember, value: string) => {
    const updated = [...staff]; updated[i][field] = value; setStaff(updated);
  };

  // ─── Equipment helpers ──────────────────────────────────────────────────────
  const addEquipment = () => setEquipment([...equipment, { equipmentType: '', manufacturer: '', model: '', location: '', serialNumber: '' }]);
  const removeEquipment = (i: number) => setEquipment(equipment.filter((_, idx) => idx !== i));
  const updateEquipment = (i: number, field: keyof EquipmentItem, value: string) => {
    const updated = [...equipment]; updated[i][field] = value; setEquipment(updated);
  };

  // ─── Baseline helpers ───────────────────────────────────────────────────────
  const updateBaseline = (eqType: string, field: string, value: string) => {
    setBaselines(prev => ({ ...prev, [eqType]: { ...(prev[eqType] || {}), [field]: value } }));
  };

  const getBaselineFields = (type: string) => {
    switch (type) {
      case 'boiler': return [
        { key: 'mawp', label: 'MAWP (PSI)' }, { key: 'capacity', label: 'Capacity (MBH)' },
        { key: 'minTemp', label: 'Min Temp (°F)' }, { key: 'maxTemp', label: 'Max Temp (°F)' },
        { key: 'efficiency', label: 'Efficiency (%)' },
      ];
      case 'chiller': return [
        { key: 'tons', label: 'Capacity (Tons)' }, { key: 'kwPerTon', label: 'kW/Ton' },
        { key: 'minChilledTemp', label: 'Min Chilled Temp (°F)' }, { key: 'maxChilledTemp', label: 'Max Chilled Temp (°F)' },
        { key: 'refrigerant', label: 'Refrigerant Type' },
      ];
      case 'pump': return [
        { key: 'gpm', label: 'Flow Rate (GPM)' }, { key: 'head', label: 'Head (ft)' },
        { key: 'motorHp', label: 'Motor HP' }, { key: 'operatingPressure', label: 'Pressure (PSI)' },
      ];
      case 'ahu': return [
        { key: 'cfm', label: 'Airflow (CFM)' }, { key: 'staticPressure', label: 'Static Pressure (in. w.c.)' },
        { key: 'supplyTemp', label: 'Supply Temp (°F)' }, { key: 'returnTemp', label: 'Return Temp (°F)' },
      ];
      case 'cooling_tower': return [
        { key: 'gpm', label: 'Flow Rate (GPM)' }, { key: 'fanHp', label: 'Fan HP' },
        { key: 'approachTemp', label: 'Approach Temp (°F)' }, { key: 'rangeTemp', label: 'Range Temp (°F)' },
      ];
      default: return [
        { key: 'capacity', label: 'Capacity' }, { key: 'efficiency', label: 'Efficiency (%)' },
      ];
    }
  };

  // ─── Inventory helpers ──────────────────────────────────────────────────────
  const addInventory = () => setInventory([...inventory, { itemName: '', partNumber: '', quantity: '', unit: 'each', location: '' }]);
  const removeInventory = (i: number) => setInventory(inventory.filter((_, idx) => idx !== i));
  const updateInventory = (i: number, field: keyof InventoryItem, value: string) => {
    const updated = [...inventory]; updated[i][field] = value; setInventory(updated);
  };

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const next = () => { if (step < STEPS.length) setStep(step + 1); };
  const back = () => { if (step > 1) setStep(step - 1); };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('nexum_access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // 1. Save org setup
      await fetch(`${baseUrl}/onboarding/org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...org, facilityId: user?.facilityId, orgId: user?.orgId }),
      });

      // 2. Send staff invites
      for (const member of staff.filter(s => s.name && s.email)) {
        await fetch(`${baseUrl}/onboarding/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...member, facilityId: user?.facilityId, orgId: user?.orgId }),
        });
      }

      // 3. Add equipment
      for (const eq of equipment.filter(e => e.equipmentType && e.manufacturer)) {
        const baseline = baselines[eq.equipmentType] || {};
        await fetch(`${baseUrl}/equipment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...eq, baseline, facilityId: user?.facilityId }),
        });
      }

      // 4. Add inventory
      for (const item of inventory.filter(i => i.itemName && i.quantity)) {
        await fetch(`${baseUrl}/inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...item, facilityId: user?.facilityId }),
        });
      }

      // 5. Save utility rates
      await fetch(`${baseUrl}/onboarding/utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...utilities, facilityId: user?.facilityId }),
      });

      // 6. Upload audit report if provided
      if (auditFile) {
        const formData = new FormData();
        formData.append('file', auditFile);
        formData.append('agency', auditMeta.agency);
        formData.append('inspectionDate', auditMeta.inspectionDate);
        formData.append('result', auditMeta.result);
        formData.append('facilityId', user?.facilityId || 'facility-001');
        await fetch(`${baseUrl}/audit-reports`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      toast({ title: 'Setup complete!', description: 'Your facility is ready. Welcome to Nexum Suum.' });
      navigate('/');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({ title: 'Setup saved', description: 'Some steps may need completion. You can update settings anytime.', variant: 'destructive' });
      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg text-primary">Nexum Suum</span>
          <Badge variant="outline" className="text-xs">Facility Setup</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Step {step} of {STEPS.length}</p>
      </div>

      {/* Progress */}
      <div className="px-6 pt-4">
        <Progress value={progress} className="h-1.5" />
        <div className="flex justify-between mt-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <button
                key={s.id}
                onClick={() => done && setStep(s.id)}
                className={`flex flex-col items-center gap-1 transition-opacity ${done ? 'cursor-pointer' : 'cursor-default'} ${active || done ? 'opacity-100' : 'opacity-30'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${active ? 'bg-primary border-primary text-primary-foreground' : done ? 'bg-primary/20 border-primary text-primary' : 'border-muted bg-muted/30 text-muted-foreground'}`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] hidden sm:block ${active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">

        {/* ── Step 1: Organization ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Set up your organization</h2>
              <p className="text-muted-foreground mt-1">Tell us about your facility so we can configure your platform.</p>
            </div>
            <Card><CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Organization Name *</Label>
                  <Input value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} placeholder="e.g., Meridian Property Group" />
                </div>
                <div className="space-y-2">
                  <Label>Facility Type *</Label>
                  <Select value={org.facilityType} onValueChange={v => setOrg({ ...org, facilityType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Facilities</Label>
                  <Input type="number" min="1" value={org.facilityCount} onChange={e => setOrg({ ...org, facilityCount: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Street Address</Label>
                  <Input value={org.address} onChange={e => setOrg({ ...org, address: e.target.value })} placeholder="123 Main St" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={org.city} onChange={e => setOrg({ ...org, city: e.target.value })} placeholder="Newark" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={org.state} onChange={e => setOrg({ ...org, state: e.target.value })} placeholder="NJ" maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input value={org.zip} onChange={e => setOrg({ ...org, zip: e.target.value })} placeholder="07102" />
                  </div>
                </div>
              </div>
            </CardContent></Card>
          </div>
        )}

        {/* ── Step 2: Staff ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Register your team</h2>
              <p className="text-muted-foreground mt-1">Each staff member will receive an email invite to create their account.</p>
            </div>
            <div className="space-y-3">
              {staff.map((member, i) => (
                <Card key={i}><CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Full Name</Label>
                      <Input value={member.name} onChange={e => updateStaff(i, 'name', e.target.value)} placeholder="Jane Smith" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Role</Label>
                      <Select value={member.role} onValueChange={v => updateStaff(i, 'role', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Email</Label>
                        <Input value={member.email} onChange={e => updateStaff(i, 'email', e.target.value)} placeholder="jane@company.com" type="email" />
                      </div>
                      {staff.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeStaff(i)} className="mb-0.5 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={addStaff} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Staff Member
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">You can add more staff later from Settings.</p>
          </div>
        )}

        {/* ── Step 3: Equipment ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Current equipment</h2>
              <p className="text-muted-foreground mt-1">Add the major equipment in your facility. You can add more from Equipment Library later.</p>
            </div>
            <div className="space-y-3">
              {equipment.map((eq, i) => (
                <Card key={i}><CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Equipment {i + 1}</Badge>
                    {equipment.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeEquipment(i)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Equipment Type *</Label>
                      <Select value={eq.equipmentType} onValueChange={v => updateEquipment(i, 'equipmentType', v)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Manufacturer *</Label>
                      <Input value={eq.manufacturer} onChange={e => updateEquipment(i, 'manufacturer', e.target.value)} placeholder="e.g., Trane" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Model</Label>
                      <Input value={eq.model} onChange={e => updateEquipment(i, 'model', e.target.value)} placeholder="e.g., RTAC-150" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <Input value={eq.location} onChange={e => updateEquipment(i, 'location', e.target.value)} placeholder="e.g., Mech Room 1" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Serial Number</Label>
                      <Input value={eq.serialNumber} onChange={e => updateEquipment(i, 'serialNumber', e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={addEquipment} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Equipment
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Baselines ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Equipment baselines</h2>
              <p className="text-muted-foreground mt-1">Set operational parameters for your equipment. Used for anomaly detection and performance tracking.</p>
            </div>
            {equipment.filter(eq => eq.equipmentType && eq.manufacturer).length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No equipment added yet. Go back to Step 3 to add equipment first.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {equipment.filter(eq => eq.equipmentType && eq.manufacturer).map((eq, i) => (
                  <Card key={i}><CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge>{eq.equipmentType.replace(/_/g, ' ').toUpperCase()}</Badge>
                      <span className="text-sm text-muted-foreground">{eq.manufacturer} {eq.model}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {getBaselineFields(eq.equipmentType).map(field => (
                        <div key={field.key} className="space-y-1">
                          <Label className="text-xs">{field.label}</Label>
                          <Input
                            value={baselines[eq.equipmentType]?.[field.key] || ''}
                            onChange={e => updateBaseline(eq.equipmentType, field.key, e.target.value)}
                            placeholder="Enter value"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Inventory ── */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Current inventory</h2>
              <p className="text-muted-foreground mt-1">Log parts and supplies currently on hand. You can update quantities anytime from Inventory Library.</p>
            </div>
            <div className="space-y-3">
              {inventory.map((item, i) => (
                <Card key={i}><CardContent className="p-4">
                  <div className="grid grid-cols-5 gap-2 items-end">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Item Name *</Label>
                      <Input value={item.itemName} onChange={e => updateInventory(i, 'itemName', e.target.value)} placeholder="e.g., Boiler Gasket" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Part #</Label>
                      <Input value={item.partNumber} onChange={e => updateInventory(i, 'partNumber', e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty *</Label>
                      <Input type="number" min="0" value={item.quantity} onChange={e => updateInventory(i, 'quantity', e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-1 flex items-end gap-1">
                      <div className="flex-1">
                        <Label className="text-xs">Unit</Label>
                        <Select value={item.unit} onValueChange={v => updateInventory(i, 'unit', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['each', 'box', 'case', 'gallon', 'lbs', 'ft', 'roll'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {inventory.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeInventory(i)} className="text-destructive hover:text-destructive shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="col-span-5 space-y-1">
                      <Label className="text-xs">Storage Location</Label>
                      <Input value={item.location} onChange={e => updateInventory(i, 'location', e.target.value)} placeholder="e.g., Parts Room Shelf B3" />
                    </div>
                  </div>
                </CardContent></Card>
              ))}
              <Button variant="outline" onClick={addInventory} className="w-full">
                <Plus className="w-4 h-4 mr-2" />Add Inventory Item
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 6: Utility Rates ── */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Utility rates</h2>
              <p className="text-muted-foreground mt-1">Enter your facility's current utility rates. Used for energy cost calculations across all dashboards.</p>
            </div>
            <Card><CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>Electric Rate ($/kWh)</Label>
                <Input type="number" step="0.001" value={utilities.electricRate} onChange={e => setUtilities({ ...utilities, electricRate: e.target.value })} />
                <p className="text-xs text-muted-foreground">NJ average: $0.18/kWh</p>
              </div>
              <div className="space-y-2">
                <Label>Natural Gas Rate ($/therm)</Label>
                <Input type="number" step="0.01" value={utilities.gasRate} onChange={e => setUtilities({ ...utilities, gasRate: e.target.value })} />
                <p className="text-xs text-muted-foreground">NJ average: $1.52/therm</p>
              </div>
              <div className="space-y-2">
                <Label>Water Rate ($/1,000 gallons)</Label>
                <Input type="number" step="0.01" value={utilities.waterRate} onChange={e => setUtilities({ ...utilities, waterRate: e.target.value })} />
                <p className="text-xs text-muted-foreground">NJ average: $15.07/1,000 gal</p>
              </div>
            </CardContent></Card>
            <p className="text-xs text-muted-foreground">You can update these anytime from Settings → Utility Configuration.</p>
          </div>
        )}

        {/* ── Step 7: Audit Report ── */}
        {step === 7 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Upload audit report <span className="text-muted-foreground text-lg font-normal">(optional)</span></h2>
              <p className="text-muted-foreground mt-1">Upload your most recent inspection report. Our AI will generate a compliance baseline narrative seeded into your account.</p>
            </div>
            <Card><CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inspecting Agency</Label>
                  <Input value={auditMeta.agency} onChange={e => setAuditMeta({ ...auditMeta, agency: e.target.value })} placeholder="e.g., NJ DEP, OSHA, DOH" />
                </div>
                <div className="space-y-2">
                  <Label>Inspection Date</Label>
                  <Input type="date" value={auditMeta.inspectionDate} onChange={e => setAuditMeta({ ...auditMeta, inspectionDate: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Inspection Result</Label>
                  <Select value={auditMeta.result} onValueChange={v => setAuditMeta({ ...auditMeta, result: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="conditional">Conditional Pass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${auditFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/30'}`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setAuditFile(e.target.files?.[0] || null)} />
                {auditFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileCheck className="w-8 h-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{auditFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(auditFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setAuditFile(null); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB</p>
                  </div>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">AI Compliance Intelligence</span> — Claude will analyze your inspection report and generate a 3-paragraph compliance narrative covering agency findings, corrective actions, and facility readiness. This will appear in your Compliance Logger under Audit Reports.
                </p>
              </div>
            </CardContent></Card>

            {/* Final confirmation */}
            <Card className="border-primary/30 bg-primary/5"><CardContent className="p-6">
              <h3 className="font-semibold mb-2">Ready to launch your facility</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Organization: {org.name || 'Not set'}</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{staff.filter(s => s.email).length} staff member(s) to invite</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{equipment.filter(e => e.equipmentType).length} equipment item(s)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{inventory.filter(i => i.itemName).length} inventory item(s)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Utility rates configured</li>
                {auditFile && <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" />Audit report: {auditFile.name}</li>}
              </ul>
            </CardContent></Card>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={back} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4 mr-2" />Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={next}>
              Next<ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={submitting} className="min-w-32">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up...</> : <>Launch Facility<ChevronRight className="w-4 h-4 ml-2" /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
