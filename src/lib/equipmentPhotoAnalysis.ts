/**
 * equipmentPhotoAnalysis.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Photo upload, Claude Vision analysis, component detection, inventory save,
 * and observation journal logging for the Equipment Photo feature.
 *
 * Storage:
 *   nexum_equipment_photos_{equipmentId}  — base64 photos + metadata
 *   nexum_inventory_{facilityId}          — detected components as parts
 *   API POST /inventory                   — synced to DynamoDB
 *   API POST /observations                — admissible journal entry per event
 *
 * Note: AI analysis requires VITE_ANTHROPIC_API_KEY set in environment.
 * BAS/BMS connections are NEVER mutated — photos only add clarifying context.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANALYSIS_MODEL = 'claude-haiku-4-5-20251001';
const MAX_PHOTOS = 4;

// ── Component types ────────────────────────────────────────────────────────────

export type ComponentType =
  | 'check_valve' | 'butterfly_valve' | 'gate_valve' | 'globe_valve' | 'ball_valve'
  | 'safety_valve' | 'relief_valve' | 'solenoid_valve'
  | 'actuator_valve' | 'actuator_damper'
  | 'strainer_y' | 'strainer_basket'
  | 'pressure_gauge' | 'temperature_gauge' | 'flow_meter' | 'conductivity_sensor'
  | 'bas_sensor' | 'bms_controller' | 'vfd' | 'motor_starter'
  | 'pump_heating_supply' | 'pump_heating_return'
  | 'pump_cooling_supply' | 'pump_cooling_return'
  | 'pump_chilled_water' | 'pump_condenser_water'
  | 'pump_air_compressor' | 'pump_oil'
  | 'expansion_tank' | 'air_separator' | 'heat_exchanger_plate'
  | 'pressure_relief_device' | 'isolation_valve' | 'control_valve'
  | 'indicator_light' | 'terminal_block' | 'other';

export interface DetectedComponent {
  componentId: string;
  type: ComponentType;
  name: string;
  location: string;           // AI-described location in the photo
  confidence: number;         // 0–1
  partNumber: string;         // AI-suggested or user-entered
  userPartNumber?: string;    // user override
  fromPhotoIndex: number;     // 0–3
  detectedAt: string;
  confirmedByUser: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  inventoryPartId?: string;   // set after saved to inventory
  basClarification?: string;  // context only — never alters BAS config
}

export interface EquipmentPhoto {
  photoId: string;
  label: 'front' | 'supply_side' | 'return_side' | 'detail' | 'nameplate';
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  uploadedAt: string;
  uploadedBy: string;
  analysisStatus: 'pending' | 'analyzing' | 'complete' | 'error' | 'no_key';
  analysisError?: string;
  detectedComponents: DetectedComponent[];
  rawAiResponse?: string;     // full AI response preserved for observation journal
}

export interface PhotoAnalysisResult {
  components: Omit<DetectedComponent, 'componentId' | 'fromPhotoIndex' | 'detectedAt' | 'confirmedByUser' | 'partNumber'>[];
  overallDescription: string;
  basContextNote?: string;    // purely informational about BAS, no mutations
}

// ── Inventory category mapping ─────────────────────────────────────────────────

export interface ComponentInventoryMapping {
  group: string;        // top-level group label
  category: string;     // inventory category value
  subcategory: string;  // pump sub-type or valve sub-type
  groupColor: string;
}

const COMPONENT_INVENTORY_MAP: Record<ComponentType, ComponentInventoryMapping> = {
  pump_heating_supply:    { group: 'Equipment Components', category: 'PUMPS_HEATING',  subcategory: 'Heating Supply Pump',    groupColor: 'text-orange-400' },
  pump_heating_return:    { group: 'Equipment Components', category: 'PUMPS_HEATING',  subcategory: 'Heating Return Pump',    groupColor: 'text-orange-400' },
  pump_cooling_supply:    { group: 'Equipment Components', category: 'PUMPS_COOLING',  subcategory: 'Cooling Supply Pump',    groupColor: 'text-blue-400'   },
  pump_cooling_return:    { group: 'Equipment Components', category: 'PUMPS_COOLING',  subcategory: 'Cooling Return Pump',    groupColor: 'text-blue-400'   },
  pump_chilled_water:     { group: 'Equipment Components', category: 'PUMPS_CHW',      subcategory: 'Chilled Water Pump',     groupColor: 'text-cyan-400'   },
  pump_condenser_water:   { group: 'Equipment Components', category: 'PUMPS_COOLING',  subcategory: 'Condenser Water Pump',   groupColor: 'text-blue-400'   },
  pump_air_compressor:    { group: 'Equipment Components', category: 'PUMPS_AIR',      subcategory: 'Air Compressor Pump',    groupColor: 'text-sky-400'    },
  pump_oil:               { group: 'Equipment Components', category: 'PUMPS_OIL',      subcategory: 'Oil Pump',               groupColor: 'text-yellow-600' },
  check_valve:            { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Check Valve',            groupColor: 'text-purple-400' },
  butterfly_valve:        { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Butterfly Valve',        groupColor: 'text-purple-400' },
  gate_valve:             { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Gate Valve',             groupColor: 'text-purple-400' },
  globe_valve:            { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Globe Valve',            groupColor: 'text-purple-400' },
  ball_valve:             { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Ball Valve',             groupColor: 'text-purple-400' },
  safety_valve:           { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Safety Valve',           groupColor: 'text-red-400'    },
  relief_valve:           { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Relief Valve',           groupColor: 'text-red-400'    },
  solenoid_valve:         { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Solenoid Valve',         groupColor: 'text-purple-400' },
  isolation_valve:        { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Isolation Valve',        groupColor: 'text-purple-400' },
  control_valve:          { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Control Valve',          groupColor: 'text-purple-400' },
  actuator_valve:         { group: 'Equipment Components', category: 'ACTUATORS_COMPS',subcategory: 'Valve Actuator',         groupColor: 'text-green-400'  },
  actuator_damper:        { group: 'Equipment Components', category: 'ACTUATORS_COMPS',subcategory: 'Damper Actuator',        groupColor: 'text-green-400'  },
  strainer_y:             { group: 'Equipment Components', category: 'STRAINERS_COMPS',subcategory: 'Y-Strainer',             groupColor: 'text-teal-400'   },
  strainer_basket:        { group: 'Equipment Components', category: 'STRAINERS_COMPS',subcategory: 'Basket Strainer',        groupColor: 'text-teal-400'   },
  pressure_gauge:         { group: 'Equipment Components', category: 'GAUGES_COMPS',   subcategory: 'Pressure Gauge',         groupColor: 'text-indigo-400' },
  temperature_gauge:      { group: 'Equipment Components', category: 'GAUGES_COMPS',   subcategory: 'Temperature Gauge',      groupColor: 'text-indigo-400' },
  flow_meter:             { group: 'Equipment Components', category: 'SENSORS_COMPS',  subcategory: 'Flow Meter',             groupColor: 'text-pink-400'   },
  conductivity_sensor:    { group: 'Equipment Components', category: 'SENSORS_COMPS',  subcategory: 'Conductivity Reader',    groupColor: 'text-pink-400'   },
  bas_sensor:             { group: 'Equipment Components', category: 'SENSORS_COMPS',  subcategory: 'BAS Sensor (Context)',   groupColor: 'text-amber-400'  },
  bms_controller:         { group: 'Equipment Components', category: 'SENSORS_COMPS',  subcategory: 'BMS Controller (Context)',groupColor: 'text-amber-400' },
  vfd:                    { group: 'Equipment Components', category: 'CONTROLS_COMPS', subcategory: 'Variable Frequency Drive',groupColor: 'text-yellow-400'},
  motor_starter:          { group: 'Equipment Components', category: 'CONTROLS_COMPS', subcategory: 'Motor Starter',          groupColor: 'text-yellow-400' },
  expansion_tank:         { group: 'Equipment Components', category: 'VESSELS_COMPS',  subcategory: 'Expansion Tank',         groupColor: 'text-slate-400'  },
  air_separator:          { group: 'Equipment Components', category: 'VESSELS_COMPS',  subcategory: 'Air Separator',          groupColor: 'text-slate-400'  },
  heat_exchanger_plate:   { group: 'Equipment Components', category: 'VESSELS_COMPS',  subcategory: 'Plate Heat Exchanger',   groupColor: 'text-slate-400'  },
  pressure_relief_device: { group: 'Equipment Components', category: 'VALVES_COMPS',   subcategory: 'Pressure Relief Device', groupColor: 'text-red-400'    },
  indicator_light:        { group: 'Equipment Components', category: 'SENSORS_COMPS',  subcategory: 'Indicator Light',        groupColor: 'text-pink-400'   },
  terminal_block:         { group: 'Equipment Components', category: 'CONTROLS_COMPS', subcategory: 'Terminal Block',         groupColor: 'text-yellow-400' },
  other:                  { group: 'Equipment Components', category: 'EQUIP_OTHER',    subcategory: 'Other Component',        groupColor: 'text-muted-foreground' },
};

export function getInventoryMapping(type: ComponentType): ComponentInventoryMapping {
  return COMPONENT_INVENTORY_MAP[type] || COMPONENT_INVENTORY_MAP.other;
}

// ── Part number generation ─────────────────────────────────────────────────────

const TYPE_CODE: Partial<Record<ComponentType, string>> = {
  check_valve: 'CV', butterfly_valve: 'BV', gate_valve: 'GV', globe_valve: 'GLV', ball_valve: 'BLV',
  safety_valve: 'SV', relief_valve: 'RV', solenoid_valve: 'SOL', isolation_valve: 'IV', control_valve: 'CTLV',
  actuator_valve: 'VACT', actuator_damper: 'DACT',
  strainer_y: 'YST', strainer_basket: 'BST',
  pressure_gauge: 'PG', temperature_gauge: 'TG', flow_meter: 'FM', conductivity_sensor: 'COND',
  bas_sensor: 'BASS', bms_controller: 'BMSC',
  pump_heating_supply: 'PHS', pump_heating_return: 'PHR',
  pump_cooling_supply: 'PCS', pump_cooling_return: 'PCR',
  pump_chilled_water: 'PCHW', pump_condenser_water: 'PCND',
  pump_air_compressor: 'PAC', pump_oil: 'POIL',
  vfd: 'VFD', motor_starter: 'MS',
  expansion_tank: 'XT', air_separator: 'AXS', heat_exchanger_plate: 'PHX',
  pressure_relief_device: 'PRD', indicator_light: 'IND', terminal_block: 'TB',
};

function shortId(len = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function generatePartNumber(type: ComponentType, location: string): string {
  const code = TYPE_CODE[type] || 'CMP';
  // Extract size hint from location description (e.g. "3/4 inch", "2\"")
  const sizeMatch = location.match(/(\d+(?:[./]\d+)?)\s*(?:inch|in|"|'|mm|cm)/i);
  const sizePart = sizeMatch ? sizeMatch[1].replace('/', '-') : 'STD';
  return `${code}-${sizePart}-${shortId(4)}`;
}

// ── Photo storage ─────────────────────────────────────────────────────────────

const photoKey = (equipmentId: string) => `nexum_equipment_photos_${equipmentId}`;

export function getEquipmentPhotos(equipmentId: string): EquipmentPhoto[] {
  try {
    return JSON.parse(localStorage.getItem(photoKey(equipmentId)) || '[]');
  } catch { return []; }
}

export function saveEquipmentPhotos(equipmentId: string, photos: EquipmentPhoto[]): void {
  try {
    localStorage.setItem(photoKey(equipmentId), JSON.stringify(photos.slice(0, MAX_PHOTOS)));
  } catch { /* silent */ }
}

export function deleteEquipmentPhoto(equipmentId: string, photoId: string): EquipmentPhoto[] {
  const photos = getEquipmentPhotos(equipmentId).filter(p => p.photoId !== photoId);
  saveEquipmentPhotos(equipmentId, photos);
  return photos;
}

export { MAX_PHOTOS };

// ── Claude Vision analysis ─────────────────────────────────────────────────────

const COMPONENT_PROMPT = `You are an expert facility equipment analyst. Analyze this photo of mechanical/HVAC equipment and identify every visible component.

For each component, return:
- type: one of the exact ComponentType values listed
- name: human-readable name (e.g. "3/4\" Bronze Check Valve")
- location: where it is in the photo (e.g. "supply header, left of pump outlet")
- confidence: 0.0 to 1.0

ComponentType values (use EXACTLY these):
check_valve, butterfly_valve, gate_valve, globe_valve, ball_valve, safety_valve, relief_valve, solenoid_valve, isolation_valve, control_valve, actuator_valve, actuator_damper, strainer_y, strainer_basket, pressure_gauge, temperature_gauge, flow_meter, conductivity_sensor, bas_sensor, bms_controller, vfd, motor_starter, expansion_tank, air_separator, heat_exchanger_plate, pressure_relief_device, indicator_light, terminal_block, pump_heating_supply, pump_heating_return, pump_cooling_supply, pump_cooling_return, pump_chilled_water, pump_condenser_water, pump_air_compressor, pump_oil, other

IMPORTANT RULES:
1. For BAS/BMS sensors: set type to "bas_sensor" or "bms_controller" and note in basClarification that this is CONTEXT ONLY — never suggest any config changes.
2. Only identify what is clearly visible.
3. If a pump is visible, classify it by its role in the system (heating supply, cooling return, etc.) based on pipe colors, labels, or flow direction.

Return ONLY valid JSON in this exact shape:
{
  "components": [
    { "type": "check_valve", "name": "...", "location": "...", "confidence": 0.85 }
  ],
  "overallDescription": "Brief description of what this photo shows",
  "basContextNote": "Optional: any BAS/BMS visible context (DO NOT suggest config changes)"
}`;

export async function analyzeEquipmentPhoto(
  base64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  equipmentType: string,
  equipmentName: string,
): Promise<PhotoAnalysisResult> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) throw new Error('NO_API_KEY');

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: `Equipment type: ${equipmentType}. Equipment name: ${equipmentName}.\n\n${COMPONENT_PROMPT}` },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`AI_ERROR: ${err}`);
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text || '{}';

  // Extract JSON from potential markdown code fences
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;
  return JSON.parse(jsonStr) as PhotoAnalysisResult;
}

// ── Inventory save ─────────────────────────────────────────────────────────────

const API_BASE = 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

export async function saveComponentToInventory(
  component: DetectedComponent,
  equipmentId: string,
  equipmentName: string,
  facilityId: string,
): Promise<string> {
  const mapping = getInventoryMapping(component.type);
  const partId = `comp-${Date.now()}-${shortId(4)}`;

  const part = {
    partId,
    category: mapping.category,
    subcategory: mapping.subcategory,
    name: component.name,
    partNumber: component.userPartNumber || component.partNumber,
    quantity: 1,
    minQuantity: 0,
    location: component.location,
    supplier: '',
    unitCost: 0,
    notes: `Detected in photo of ${equipmentName} (${equipmentId}). Location: ${component.location}. Confidence: ${Math.round(component.confidence * 100)}%.`,
    itemType: 'part' as const,
    source: 'photo_detection' as const,
    linkedEquipmentId: equipmentId,
    linkedEquipmentName: equipmentName,
    photoDetectedAt: component.detectedAt,
    fromPhotoIndex: component.fromPhotoIndex,
    createdAt: new Date().toISOString(),
  };

  // Save to localStorage (source of truth for offline)
  const invKey = `nexum_inventory_${facilityId}`;
  try {
    const existing = JSON.parse(localStorage.getItem(invKey) || '[]');
    existing.unshift(part);
    localStorage.setItem(invKey, JSON.stringify(existing));
  } catch { /* silent */ }

  // POST to API
  try {
    const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
    await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(part),
    });
  } catch { /* API failure is non-fatal — localStorage is source of truth */ }

  return partId;
}

// ── Observation journal ───────────────────────────────────────────────────────

export async function logPhotoUploadToJournal(
  equipmentId: string,
  equipmentName: string,
  facilityId: string,
  photoLabel: string,
  photoIndex: number,
  uploadedBy: string,
): Promise<void> {
  try {
    const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
    if (!token) return;
    await fetch(`${API_BASE}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        facilityId,
        equipmentId,
        assetId: equipmentId,
        observationSource: 'photo_upload',
        observationTimestamp: new Date().toISOString(),
        reporterName: uploadedBy,
        originalText: `Photo uploaded for ${equipmentName}: ${photoLabel} (slot ${photoIndex + 1} of ${MAX_PHOTOS})`,
        tags: ['photo_upload', 'equipment_documentation'],
        status: 'open',
      }),
    });
  } catch { /* journal failure is non-fatal */ }
}

export async function logAiAnalysisToJournal(
  equipmentId: string,
  equipmentName: string,
  facilityId: string,
  photoLabel: string,
  rawAiResponse: string,
  componentCount: number,
  uploadedBy: string,
): Promise<void> {
  try {
    const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
    if (!token) return;
    await fetch(`${API_BASE}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        facilityId,
        equipmentId,
        assetId: equipmentId,
        observationSource: 'ai_detection',
        observationTimestamp: new Date().toISOString(),
        reporterName: 'AI Vision Analysis',
        originalText: `AI visual analysis of ${photoLabel} for ${equipmentName}: ${componentCount} component(s) detected.`,
        originalDocuments: [{ name: 'raw_ai_response.json', content: rawAiResponse }],
        tags: ['ai_analysis', 'photo_detection', 'equipment_components'],
        status: 'open',
        metadata: {
          model: ANALYSIS_MODEL,
          componentCount,
          triggeredBy: uploadedBy,
        },
      }),
    });
  } catch { /* non-fatal */ }
}

export async function logComponentConfirmedToJournal(
  component: DetectedComponent,
  equipmentId: string,
  equipmentName: string,
  facilityId: string,
  confirmedBy: string,
  inventoryPartId: string,
): Promise<void> {
  try {
    const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
    if (!token) return;
    await fetch(`${API_BASE}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        facilityId,
        equipmentId,
        assetId: equipmentId,
        observationSource: 'manual_report',
        observationTimestamp: new Date().toISOString(),
        reporterName: confirmedBy,
        originalText: `Component confirmed and added to inventory: ${component.name} at ${component.location}. Part #: ${component.userPartNumber || component.partNumber}. Inventory ID: ${inventoryPartId}.`,
        tags: ['component_confirmed', 'inventory_populated', 'equipment_components'],
        status: 'closed',
        metadata: {
          componentType: component.type,
          partNumber: component.userPartNumber || component.partNumber,
          inventoryPartId,
          aiConfidence: component.confidence,
        },
      }),
    });
  } catch { /* non-fatal */ }
}

export async function logPartNumberEditedToJournal(
  componentId: string,
  equipmentId: string,
  equipmentName: string,
  facilityId: string,
  oldPartNumber: string,
  newPartNumber: string,
  editedBy: string,
): Promise<void> {
  try {
    const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');
    if (!token) return;
    await fetch(`${API_BASE}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        facilityId,
        equipmentId,
        assetId: equipmentId,
        observationSource: 'manual_report',
        observationTimestamp: new Date().toISOString(),
        reporterName: editedBy,
        originalText: `Part number updated for component on ${equipmentName}: "${oldPartNumber}" → "${newPartNumber}".`,
        tags: ['part_number_edit', 'equipment_components'],
        status: 'closed',
        metadata: { componentId, oldPartNumber, newPartNumber },
      }),
    });
  } catch { /* non-fatal */ }
}
