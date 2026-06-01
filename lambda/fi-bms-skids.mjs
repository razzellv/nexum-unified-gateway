// ── fi-bms-skids Lambda ───────────────────────────────────────────────────────
// BMS Integration + Equipment Skid Management for Nexum FI Platform
//
// JWT-protected routes:
//   POST   /bms/feeds                — register a BMS integration
//   GET    /bms/feeds                — list BMS integrations for facility
//   GET    /bms/feeds/{feedId}       — get feed detail + last-seen status
//   PATCH  /bms/feeds/{feedId}       — update feed config
//   DELETE /bms/feeds/{feedId}       — remove feed
//   GET    /bms/data/{feedId}        — latest data points for a feed
//   POST   /skids                    — create skid
//   GET    /skids                    — list skids (with latest BMS data)
//   GET    /skids/{skidId}           — skid detail + all equipment + live data
//   PATCH  /skids/{skidId}           — update skid
//   DELETE /skids/{skidId}           — delete skid
//   GET    /skids/{skidId}/data      — live BMS feed for all skid equipment
//
// Key-authenticated (no JWT — BMS system pushes here):
//   POST   /bms/ingest               — receive BMS data push from external BMS

import { DynamoDBClient }    from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.REGION || "us-east-2" })
);

const FEEDS_TABLE  = process.env.FEEDS_TABLE  || "NexumBMSFeeds";
const SKIDS_TABLE  = process.env.SKIDS_TABLE  || "NexumSkids";
const DATA_TABLE   = process.env.DATA_TABLE   || "NexumBMSData";

// ── CORS / response helpers ───────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-BMS-API-Key",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

function json(status, body) {
  return {
    statusCode: status,
    headers:    { ...CORS, "Content-Type": "application/json" },
    body:       JSON.stringify(body),
  };
}

// ── User extraction ───────────────────────────────────────────────────────────
function extractUser(event) {
  const claims =
    event?.requestContext?.authorizer?.jwt?.claims ||
    event?.requestContext?.authorizer?.claims ||
    null;
  if (claims) {
    return {
      userId:     claims.sub || "unknown",
      email:      claims.email || "",
      role:       claims["custom:role"] || "staff",
      facilityId: claims["custom:facilityId"] || claims["custom:orgId"] || "facility-001",
    };
  }
  try {
    const auth  = event.headers?.Authorization || event.headers?.authorization || "";
    const token = auth.replace("Bearer ", "");
    const p     = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return {
      userId:     p.sub || "unknown",
      email:      p.email || "",
      role:       p["custom:role"] || "staff",
      facilityId: p["custom:facilityId"] || p["custom:orgId"] || "facility-001",
    };
  } catch {
    return { userId: "unknown", email: "", role: "staff", facilityId: "facility-001" };
  }
}

// ── DynamoDB helpers ──────────────────────────────────────────────────────────
async function queryAll(params, maxPages = 10) {
  const items = [];
  let last;
  for (let i = 0; i < maxPages; i++) {
    const res = await ddb.send(new QueryCommand({ ...params, ExclusiveStartKey: last }));
    items.push(...(res.Items || []));
    last = res.LastEvaluatedKey;
    if (!last) break;
  }
  return items;
}

function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "GET";
}
function getPath(event) {
  return event?.requestContext?.http?.path || event?.path || "";
}

// ── BMS Protocol definitions ──────────────────────────────────────────────────
// Describes how each protocol connects to the platform (informational — actual
// data delivery is always via POST /bms/ingest webhook push).
const BMS_PROTOCOLS = {
  rest_webhook: {
    label:       "REST API / Webhook Push",
    description: "BMS pushes JSON data to Nexum ingest endpoint via HTTP POST",
    vendors:     ["Any REST-capable BMS", "Custom middleware", "Intermediary gateway"],
  },
  mqtt: {
    label:       "MQTT",
    description: "BMS publishes to MQTT broker; middleware bridges to Nexum",
    vendors:     ["Niagara N4", "Custom IoT gateway", "AWS IoT Core bridge"],
  },
  bacnet_ip: {
    label:       "BACnet/IP",
    description: "BACnet/IP device data routed through a BACnet-to-REST gateway",
    vendors:     ["Tridium Niagara", "Siemens Desigo", "Schneider EcoStruxure", "Generic BACnet"],
  },
  modbus_tcp: {
    label:       "Modbus TCP",
    description: "Modbus TCP registers mapped through a Modbus-to-REST gateway",
    vendors:     ["Generic Modbus devices", "Allen-Bradley", "Siemens S7 series"],
  },
  opc_ua: {
    label:       "OPC-UA",
    description: "OPC-UA server data routed through an OPC-to-REST gateway",
    vendors:     ["Ignition SCADA", "Kepware", "Siemens S7", "Rockwell"],
  },
  niagara: {
    label:       "Tridium Niagara (REST)",
    description: "Direct Niagara Station REST API integration",
    vendors:     ["Tridium Niagara 4", "Honeywell Niagara", "Distech ECB"],
  },
  metasys: {
    label:       "Johnson Controls Metasys",
    description: "Metasys REST API via Metasys API gateway",
    vendors:     ["JCI Metasys"],
  },
  desigo: {
    label:       "Siemens Desigo CC",
    description: "Desigo CC REST API or OPC-UA bridge",
    vendors:     ["Siemens Desigo CC", "Siemens PXC series"],
  },
};

// ── Standard data point schemas per equipment type ─────────────────────────────
const EQUIPMENT_POINT_SCHEMAS = {
  chiller: [
    { pointId: "chw_supply_temp",   label: "CHW Supply Temp",    unit: "°F",  alarmThreshold: { low: 38, high: 60 } },
    { pointId: "chw_return_temp",   label: "CHW Return Temp",    unit: "°F",  alarmThreshold: { low: 40, high: 70 } },
    { pointId: "cw_supply_temp",    label: "CW Supply Temp",     unit: "°F",  alarmThreshold: { low: 60, high: 95 } },
    { pointId: "cw_return_temp",    label: "CW Return Temp",     unit: "°F",  alarmThreshold: { low: 65, high: 105 } },
    { pointId: "percent_load",      label: "% Load",             unit: "%",   alarmThreshold: { high: 100 } },
    { pointId: "kw",                label: "Power",              unit: "kW",  alarmThreshold: null },
    { pointId: "tons",              label: "Tons of Cooling",    unit: "Tons", alarmThreshold: null },
    { pointId: "entering_water_temp", label: "Entering Water Temp", unit: "°F", alarmThreshold: null },
    { pointId: "leaving_water_temp",  label: "Leaving Water Temp",  unit: "°F", alarmThreshold: null },
    { pointId: "runtime_hours",     label: "Runtime Hours",      unit: "hrs", alarmThreshold: null },
    { pointId: "alarm_state",       label: "Alarm State",        unit: "bool", alarmThreshold: null },
  ],
  pump: [
    { pointId: "run_status",        label: "Run Status",         unit: "bool", alarmThreshold: null },
    { pointId: "speed_percent",     label: "Speed",              unit: "%",   alarmThreshold: null },
    { pointId: "flow_gpm",          label: "Flow",               unit: "GPM", alarmThreshold: { low: 0 } },
    { pointId: "discharge_pressure",label: "Discharge Pressure", unit: "PSI", alarmThreshold: null },
    { pointId: "suction_pressure",  label: "Suction Pressure",   unit: "PSI", alarmThreshold: null },
    { pointId: "differential_pressure", label: "Differential Pressure", unit: "PSI", alarmThreshold: null },
    { pointId: "amps",              label: "Amps",               unit: "A",   alarmThreshold: null },
    { pointId: "kw",                label: "Power",              unit: "kW",  alarmThreshold: null },
    { pointId: "alarm_state",       label: "Alarm State",        unit: "bool", alarmThreshold: null },
  ],
  ahu: [
    { pointId: "supply_air_temp",   label: "Supply Air Temp",    unit: "°F",  alarmThreshold: { low: 50, high: 80 } },
    { pointId: "return_air_temp",   label: "Return Air Temp",    unit: "°F",  alarmThreshold: { low: 60, high: 85 } },
    { pointId: "mixed_air_temp",    label: "Mixed Air Temp",     unit: "°F",  alarmThreshold: null },
    { pointId: "outside_air_temp",  label: "Outside Air Temp",   unit: "°F",  alarmThreshold: null },
    { pointId: "supply_cfm",        label: "Supply CFM",         unit: "CFM", alarmThreshold: { low: 0 } },
    { pointId: "duct_static_pressure", label: "Duct Static Pressure", unit: "in. WC", alarmThreshold: { high: 3.0 } },
    { pointId: "cooling_valve",     label: "Cooling Valve",      unit: "%",   alarmThreshold: null },
    { pointId: "heating_valve",     label: "Heating Valve",      unit: "%",   alarmThreshold: null },
    { pointId: "filter_dp",         label: "Filter DP",          unit: "in. WC", alarmThreshold: { high: 1.5 } },
    { pointId: "supply_fan_status", label: "Supply Fan Status",  unit: "bool", alarmThreshold: null },
    { pointId: "supply_fan_vfd",    label: "Supply Fan VFD",     unit: "%",   alarmThreshold: null },
    { pointId: "economizer_damper", label: "Economizer Damper",  unit: "%",   alarmThreshold: null },
    { pointId: "alarm_state",       label: "Alarm State",        unit: "bool", alarmThreshold: null },
  ],
  cooling_tower: [
    { pointId: "basin_temp",        label: "Basin Temp",         unit: "°F",  alarmThreshold: { high: 90 } },
    { pointId: "approach_temp",     label: "Approach Temp",      unit: "°F",  alarmThreshold: { high: 10 } },
    { pointId: "fan_speed",         label: "Fan Speed",          unit: "%",   alarmThreshold: null },
    { pointId: "fan_amps",          label: "Fan Amps",           unit: "A",   alarmThreshold: null },
    { pointId: "makeup_water_valve",label: "Makeup Water Valve", unit: "%",   alarmThreshold: null },
    { pointId: "alarm_state",       label: "Alarm State",        unit: "bool", alarmThreshold: null },
  ],
  boiler: [
    { pointId: "hhw_supply_temp",   label: "HHW Supply Temp",    unit: "°F",  alarmThreshold: { high: 220 } },
    { pointId: "hhw_return_temp",   label: "HHW Return Temp",    unit: "°F",  alarmThreshold: { high: 200 } },
    { pointId: "firing_rate",       label: "Firing Rate",        unit: "%",   alarmThreshold: null },
    { pointId: "stack_temp",        label: "Stack Temp",         unit: "°F",  alarmThreshold: { high: 400 } },
    { pointId: "efficiency",        label: "Efficiency",         unit: "%",   alarmThreshold: { low: 75 } },
    { pointId: "gas_pressure",      label: "Gas Pressure",       unit: "in. WC", alarmThreshold: null },
    { pointId: "alarm_state",       label: "Alarm State",        unit: "bool", alarmThreshold: null },
  ],
  vfd: [
    { pointId: "output_freq",       label: "Output Frequency",   unit: "Hz",  alarmThreshold: null },
    { pointId: "output_voltage",    label: "Output Voltage",     unit: "V",   alarmThreshold: null },
    { pointId: "output_current",    label: "Output Current",     unit: "A",   alarmThreshold: null },
    { pointId: "speed_percent",     label: "Speed",              unit: "%",   alarmThreshold: null },
    { pointId: "kw",                label: "Power",              unit: "kW",  alarmThreshold: null },
    { pointId: "fault_code",        label: "Fault Code",         unit: "code", alarmThreshold: null },
    { pointId: "alarm_state",       label: "Alarm State",        unit: "bool", alarmThreshold: null },
  ],
  heat_exchanger: [
    { pointId: "primary_supply_temp",   label: "Primary Supply Temp",   unit: "°F", alarmThreshold: null },
    { pointId: "primary_return_temp",   label: "Primary Return Temp",   unit: "°F", alarmThreshold: null },
    { pointId: "secondary_supply_temp", label: "Secondary Supply Temp", unit: "°F", alarmThreshold: null },
    { pointId: "secondary_return_temp", label: "Secondary Return Temp", unit: "°F", alarmThreshold: null },
    { pointId: "approach_temp",         label: "Approach Temp",         unit: "°F", alarmThreshold: { high: 5 } },
    { pointId: "alarm_state",           label: "Alarm State",           unit: "bool", alarmThreshold: null },
  ],
  generic: [
    { pointId: "run_status",   label: "Run Status",  unit: "bool", alarmThreshold: null },
    { pointId: "alarm_state",  label: "Alarm State", unit: "bool", alarmThreshold: null },
  ],
};

// ── Skid type definitions ─────────────────────────────────────────────────────
const SKID_TYPES = {
  chiller_plant: {
    label: "Chiller Plant",
    description: "Chiller(s) + CHW Pumps + CW Pumps + Cooling Tower(s)",
    defaultEquipmentTypes: ["chiller", "pump", "pump", "cooling_tower"],
    defaultRoles: ["chiller", "chilled_water_pump", "condenser_water_pump", "cooling_tower"],
    icon: "snowflake",
  },
  air_handling: {
    label: "Air Handling",
    description: "AHU + Supply/Return Fans + Coils + Economizer",
    defaultEquipmentTypes: ["ahu", "vfd", "vfd"],
    defaultRoles: ["air_handling_unit", "supply_fan_vfd", "return_fan_vfd"],
    icon: "wind",
  },
  boiler_plant: {
    label: "Boiler Plant",
    description: "Boiler(s) + HHW Pumps + Heat Exchangers",
    defaultEquipmentTypes: ["boiler", "pump", "heat_exchanger"],
    defaultRoles: ["boiler", "hot_water_pump", "heat_exchanger"],
    icon: "flame",
  },
  pump_station: {
    label: "Pump Station",
    description: "Primary + Secondary Pumps + VFDs + Bypass Valve",
    defaultEquipmentTypes: ["pump", "pump", "vfd"],
    defaultRoles: ["primary_pump", "secondary_pump", "variable_frequency_drive"],
    icon: "droplets",
  },
  cooling_tower: {
    label: "Cooling Tower System",
    description: "Cooling Tower + Basin + Fan + Makeup Water",
    defaultEquipmentTypes: ["cooling_tower"],
    defaultRoles: ["cooling_tower"],
    icon: "cloud",
  },
  electrical: {
    label: "Electrical System",
    description: "Switchgear + UPS + Generator + Transfer Switch",
    defaultEquipmentTypes: ["generic", "generic", "generic"],
    defaultRoles: ["switchgear", "ups", "generator"],
    icon: "zap",
  },
  custom: {
    label: "Custom Skid",
    description: "User-defined equipment grouping",
    defaultEquipmentTypes: [],
    defaultRoles: [],
    icon: "settings",
  },
};

// ── Check if alarm threshold exceeded ────────────────────────────────────────
function checkAlarm(value, schema) {
  if (!schema?.alarmThreshold || value === null || value === undefined) return false;
  const { low, high } = schema.alarmThreshold;
  if (high !== undefined && value > high) return true;
  if (low  !== undefined && value < low)  return true;
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// BMS FEED HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function createFeed(event, user) {
  const body   = JSON.parse(event.body || "{}");
  const feedId = randomUUID();
  const apiKey = `nexum-bms-${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const now    = new Date().toISOString();

  const feed = {
    PK:           `FACILITY#${user.facilityId}`,
    SK:           `FEED#${feedId}`,
    feedId,
    facilityId:   user.facilityId,
    name:         body.name         || "BMS Integration",
    protocol:     body.protocol     || "rest_webhook",
    bmsVendor:    body.bmsVendor    || null,
    description:  body.description  || null,
    apiKey,
    ingestUrl:    `https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/bms/ingest`,
    status:       "active",
    lastSeenAt:   null,
    pointCount:   0,
    createdAt:    now,
    updatedAt:    now,
    createdBy:    user.userId,
    protocolInfo: BMS_PROTOCOLS[body.protocol] || BMS_PROTOCOLS.rest_webhook,
    settings:     body.settings || {},
  };

  await ddb.send(new PutCommand({ TableName: FEEDS_TABLE, Item: feed }));
  return json(201, {
    feedId,
    feed,
    message: "BMS integration registered",
    ingestUrl:  feed.ingestUrl,
    apiKey,
    instructions: [
      `Configure your BMS or gateway to POST JSON data to: ${feed.ingestUrl}`,
      `Include header: X-BMS-API-Key: ${apiKey}`,
      `Payload format: { "facilityId": "${user.facilityId}", "feedId": "${feedId}", "timestamp": "ISO8601", "equipment": [{ "equipmentId": "...", "equipmentType": "chiller|pump|ahu|...", "points": { "pointId": value } }] }`,
    ],
  });
}

async function listFeeds(user) {
  const items = await queryAll({
    TableName:                 FEEDS_TABLE,
    KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `FACILITY#${user.facilityId}`, ":prefix": "FEED#" },
  });
  return json(200, { feeds: items, count: items.length, protocols: BMS_PROTOCOLS });
}

async function getFeed(feedId, user) {
  const result = await ddb.send(new GetCommand({
    TableName: FEEDS_TABLE,
    Key: { PK: `FACILITY#${user.facilityId}`, SK: `FEED#${feedId}` },
  }));
  if (!result.Item) return json(404, { error: "Feed not found" });

  // Get latest data points count
  const dataItems = await queryAll({
    TableName:                 DATA_TABLE,
    KeyConditionExpression:    "PK = :pk",
    ExpressionAttributeValues: { ":pk": `FEED#${feedId}` },
    Limit:                     100,
    ScanIndexForward:          false,
  }, 1);

  return json(200, {
    feed:       result.Item,
    latestData: dataItems.slice(0, 1)[0] || null,
    pointSchemas: EQUIPMENT_POINT_SCHEMAS,
    skidTypes:    SKID_TYPES,
  });
}

async function updateFeed(event, feedId, user) {
  const body  = JSON.parse(event.body || "{}");
  const now   = new Date().toISOString();
  const allowed = ["name", "protocol", "bmsVendor", "description", "status", "settings"];
  const sets  = ["updatedAt = :now"];
  const vals  = { ":now": now };
  for (const k of allowed) {
    if (body[k] !== undefined) { sets.push(`${k} = :${k}`); vals[`:${k}`] = body[k]; }
  }
  await ddb.send(new UpdateCommand({
    TableName:                 FEEDS_TABLE,
    Key:                       { PK: `FACILITY#${user.facilityId}`, SK: `FEED#${feedId}` },
    UpdateExpression:          `SET ${sets.join(", ")}`,
    ExpressionAttributeValues: vals,
  }));
  return json(200, { message: "Feed updated" });
}

async function deleteFeed(feedId, user) {
  await ddb.send(new DeleteCommand({
    TableName: FEEDS_TABLE,
    Key: { PK: `FACILITY#${user.facilityId}`, SK: `FEED#${feedId}` },
  }));
  return json(200, { message: "Feed removed" });
}

// ── BMS data ingest (called by external BMS / gateway) ───────────────────────
async function ingestData(event) {
  const apiKey = event.headers?.["X-BMS-API-Key"] || event.headers?.["x-bms-api-key"] || "";
  const body   = JSON.parse(event.body || "{}");

  if (!apiKey || !body.feedId || !body.facilityId) {
    return json(400, { error: "feedId, facilityId, and X-BMS-API-Key header required" });
  }

  // Verify the API key against the stored feed
  const feedResult = await queryAll({
    TableName:                 FEEDS_TABLE,
    KeyConditionExpression:    "PK = :pk AND SK = :sk",
    ExpressionAttributeValues: {
      ":pk": `FACILITY#${body.facilityId}`,
      ":sk": `FEED#${body.feedId}`,
    },
  }, 1);
  const feed = feedResult[0];
  if (!feed || feed.apiKey !== apiKey) {
    return json(401, { error: "Invalid API key" });
  }

  const now       = new Date().toISOString();
  const equipment = body.equipment || [];

  // Store each equipment's data as a single record
  const writes = equipment.map(async (eq) => {
    const equipmentId = eq.equipmentId || "unknown";
    const eqType      = eq.equipmentType || "generic";
    const schema      = EQUIPMENT_POINT_SCHEMAS[eqType] || EQUIPMENT_POINT_SCHEMAS.generic;
    const points      = eq.points || {};

    // Enrich points with alarm status
    const enrichedPoints = {};
    for (const [pointId, value] of Object.entries(points)) {
      const pointSchema = schema.find(s => s.pointId === pointId);
      enrichedPoints[pointId] = {
        value,
        unit:        pointSchema?.unit || "",
        label:       pointSchema?.label || pointId,
        inAlarm:     checkAlarm(value, pointSchema),
        updatedAt:   now,
      };
    }

    // Determine overall equipment alarm state
    const anyAlarm = Object.values(enrichedPoints).some(p => p.inAlarm) || !!points.alarm_state;

    const item = {
      PK:           `FEED#${body.feedId}`,
      SK:           `DP#${now}#${equipmentId}`,
      feedId:       body.feedId,
      facilityId:   body.facilityId,
      equipmentId,
      equipmentType: eqType,
      timestamp:    body.timestamp || now,
      receivedAt:   now,
      points:       enrichedPoints,
      inAlarm:      anyAlarm,
      runStatus:    points.run_status ?? null,
    };

    await ddb.send(new PutCommand({ TableName: DATA_TABLE, Item: item }));

    // Also write a "latest" record that's always overwritten for fast lookup
    await ddb.send(new PutCommand({
      TableName: DATA_TABLE,
      Item: { ...item, SK: `LATEST#${equipmentId}` },
    }));
  });

  await Promise.all(writes);

  // Update feed lastSeenAt and pointCount
  await ddb.send(new UpdateCommand({
    TableName:                 FEEDS_TABLE,
    Key:                       { PK: `FACILITY#${body.facilityId}`, SK: `FEED#${body.feedId}` },
    UpdateExpression:          "SET lastSeenAt = :now, pointCount = :cnt, #s = :active",
    ExpressionAttributeNames:  { "#s": "status" },
    ExpressionAttributeValues: {
      ":now":    now,
      ":cnt":    equipment.length,
      ":active": "active",
    },
  }));

  return json(200, {
    message:         "Data ingested",
    equipmentCount:  equipment.length,
    receivedAt:      now,
    alarms:          equipment.filter(e => {
      const schema = EQUIPMENT_POINT_SCHEMAS[e.equipmentType] || EQUIPMENT_POINT_SCHEMAS.generic;
      return schema.some(s => checkAlarm(e.points?.[s.pointId], s));
    }).map(e => e.equipmentId),
  });
}

async function getFeedData(feedId, user) {
  // Get all "latest" records for this feed
  const items = await queryAll({
    TableName:                 DATA_TABLE,
    KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `FEED#${feedId}`, ":prefix": "LATEST#" },
  });

  const alarmCount   = items.filter(i => i.inAlarm).length;
  const runningCount = items.filter(i => i.runStatus === true || i.runStatus === 1).length;

  return json(200, {
    feedId,
    equipment:    items,
    count:        items.length,
    alarmCount,
    runningCount,
    lastUpdated:  items.length > 0 ? items.reduce((a, b) =>
      (a.receivedAt > b.receivedAt ? a : b)).receivedAt : null,
    pointSchemas: EQUIPMENT_POINT_SCHEMAS,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SKID HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function createSkid(event, user) {
  const body   = JSON.parse(event.body || "{}");
  const skidId = randomUUID();
  const now    = new Date().toISOString();

  const skid = {
    PK:           `FACILITY#${user.facilityId}`,
    SK:           `SKID#${skidId}`,
    skidId,
    facilityId:   user.facilityId,
    skidName:     body.skidName     || "New Skid",
    skidType:     body.skidType     || "custom",
    description:  body.description  || null,
    location:     body.location     || null,
    bmsIntegrationId: body.bmsIntegrationId || null,
    equipment:    (body.equipment || []).map(e => ({
      equipmentId:   e.equipmentId,
      equipmentType: e.equipmentType || "generic",
      role:          e.role          || "primary",
      label:         e.label         || e.equipmentId,
      bmsPointMap:   e.bmsPointMap   || null,
    })),
    status:       "active",
    createdAt:    now,
    updatedAt:    now,
    createdBy:    user.userId,
    skidTypeInfo: SKID_TYPES[body.skidType] || SKID_TYPES.custom,
  };

  await ddb.send(new PutCommand({ TableName: SKIDS_TABLE, Item: skid }));
  return json(201, { skidId, skid, message: "Skid created", skidTypes: SKID_TYPES });
}

async function listSkids(event, user) {
  const items = await queryAll({
    TableName:                 SKIDS_TABLE,
    KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `FACILITY#${user.facilityId}`, ":prefix": "SKID#" },
  });

  // Attach latest BMS data for each skid's equipment in parallel
  const enriched = await Promise.all(items.map(async (skid) => {
    if (!skid.bmsIntegrationId) return { ...skid, liveData: null, alarmCount: 0 };

    try {
      const latestItems = await queryAll({
        TableName:                 DATA_TABLE,
        KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `FEED#${skid.bmsIntegrationId}`, ":prefix": "LATEST#" },
      }, 2);

      const equipmentIds = new Set((skid.equipment || []).map(e => e.equipmentId));
      const liveData = latestItems.filter(d => equipmentIds.has(d.equipmentId));
      const alarmCount = liveData.filter(d => d.inAlarm).length;

      return { ...skid, liveData, alarmCount };
    } catch {
      return { ...skid, liveData: null, alarmCount: 0 };
    }
  }));

  return json(200, { skids: enriched, count: enriched.length, skidTypes: SKID_TYPES });
}

async function getSkid(skidId, user) {
  const result = await ddb.send(new GetCommand({
    TableName: SKIDS_TABLE,
    Key: { PK: `FACILITY#${user.facilityId}`, SK: `SKID#${skidId}` },
  }));
  const skid = result.Item;
  if (!skid) return json(404, { error: "Skid not found" });

  let liveData   = null;
  let alarmCount = 0;

  if (skid.bmsIntegrationId) {
    try {
      const latestItems = await queryAll({
        TableName:                 DATA_TABLE,
        KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `FEED#${skid.bmsIntegrationId}`, ":prefix": "LATEST#" },
      }, 3);

      const equipmentIds = new Set((skid.equipment || []).map(e => e.equipmentId));
      liveData   = latestItems.filter(d => equipmentIds.has(d.equipmentId));
      alarmCount = liveData.filter(d => d.inAlarm).length;
    } catch (e) {
      console.warn("Live data fetch failed:", e.message);
    }
  }

  // Build enriched equipment list with point schemas + live values
  const enrichedEquipment = (skid.equipment || []).map(eq => {
    const schema    = EQUIPMENT_POINT_SCHEMAS[eq.equipmentType] || EQUIPMENT_POINT_SCHEMAS.generic;
    const liveEntry = liveData?.find(d => d.equipmentId === eq.equipmentId);
    return {
      ...eq,
      pointSchema: schema,
      livePoints:  liveEntry?.points  || null,
      inAlarm:     liveEntry?.inAlarm || false,
      runStatus:   liveEntry?.runStatus ?? null,
      lastUpdated: liveEntry?.receivedAt || null,
    };
  });

  return json(200, {
    skid:              { ...skid, equipment: enrichedEquipment },
    alarmCount,
    bmsConnected:      !!skid.bmsIntegrationId && liveData !== null,
    lastDataReceived:  liveData?.length > 0
      ? liveData.reduce((a, b) => (a.receivedAt > b.receivedAt ? a : b)).receivedAt
      : null,
    skidTypes:   SKID_TYPES,
    pointSchemas: EQUIPMENT_POINT_SCHEMAS,
  });
}

async function updateSkid(event, skidId, user) {
  const body    = JSON.parse(event.body || "{}");
  const now     = new Date().toISOString();
  const allowed = ["skidName", "skidType", "description", "location", "bmsIntegrationId", "equipment", "status"];
  const sets    = ["updatedAt = :now"];
  const vals    = { ":now": now };
  const names   = {};

  for (const k of allowed) {
    if (body[k] !== undefined) {
      if (k === "status") { sets.push("#s = :status"); vals[":status"] = body[k]; names["#s"] = "status"; }
      else { sets.push(`${k} = :${k}`); vals[`:${k}`] = body[k]; }
    }
  }

  const params = {
    TableName:                 SKIDS_TABLE,
    Key:                       { PK: `FACILITY#${user.facilityId}`, SK: `SKID#${skidId}` },
    UpdateExpression:          `SET ${sets.join(", ")}`,
    ExpressionAttributeValues: vals,
    ReturnValues:              "ALL_NEW",
  };
  if (Object.keys(names).length) params.ExpressionAttributeNames = names;

  const result = await ddb.send(new UpdateCommand(params));
  return json(200, { skid: result.Attributes, message: "Skid updated" });
}

async function deleteSkid(skidId, user) {
  await ddb.send(new DeleteCommand({
    TableName: SKIDS_TABLE,
    Key: { PK: `FACILITY#${user.facilityId}`, SK: `SKID#${skidId}` },
  }));
  return json(200, { message: "Skid deleted" });
}

async function getSkidData(skidId, user) {
  const result = await ddb.send(new GetCommand({
    TableName: SKIDS_TABLE,
    Key: { PK: `FACILITY#${user.facilityId}`, SK: `SKID#${skidId}` },
  }));
  const skid = result.Item;
  if (!skid) return json(404, { error: "Skid not found" });
  if (!skid.bmsIntegrationId) return json(200, { skidId, liveData: [], bmsConnected: false, message: "No BMS integration configured for this skid" });

  const latestItems = await queryAll({
    TableName:                 DATA_TABLE,
    KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `FEED#${skid.bmsIntegrationId}`, ":prefix": "LATEST#" },
  }, 3);

  const equipmentIds = new Set((skid.equipment || []).map(e => e.equipmentId));
  const liveData = latestItems.filter(d => equipmentIds.has(d.equipmentId));

  return json(200, {
    skidId,
    skidName:    skid.skidName,
    liveData,
    bmsConnected: true,
    alarmCount:  liveData.filter(d => d.inAlarm).length,
    runningCount: liveData.filter(d => d.runStatus === true || d.runStatus === 1).length,
    lastUpdated: liveData.length > 0
      ? liveData.reduce((a, b) => (a.receivedAt > b.receivedAt ? a : b)).receivedAt
      : null,
    pointSchemas: EQUIPMENT_POINT_SCHEMAS,
  });
}

// ── Metadata (no auth needed) ─────────────────────────────────────────────────
function getMetadata() {
  return json(200, {
    protocols:    BMS_PROTOCOLS,
    skidTypes:    SKID_TYPES,
    pointSchemas: EQUIPMENT_POINT_SCHEMAS,
    equipmentTypes: Object.keys(EQUIPMENT_POINT_SCHEMAS),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════════

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  // Public: BMS ingest endpoint (authenticated via API key, not JWT)
  if (method === "POST" && path === "/bms/ingest") {
    return await ingestData(event);
  }

  // Public: metadata endpoint
  if (method === "GET" && path === "/bms/metadata") {
    return getMetadata();
  }

  // All other routes require JWT
  const user = extractUser(event);

  try {
    // ── Feed routes ───────────────────────────────────────────────────────
    if (path === "/bms/feeds") {
      if (method === "POST") return await createFeed(event, user);
      if (method === "GET")  return await listFeeds(user);
    }

    const feedMatch = path.match(/^\/bms\/feeds\/([^/]+)$/);
    if (feedMatch) {
      const feedId = feedMatch[1];
      if (method === "GET")    return await getFeed(feedId, user);
      if (method === "PATCH")  return await updateFeed(event, feedId, user);
      if (method === "DELETE") return await deleteFeed(feedId, user);
    }

    const feedDataMatch = path.match(/^\/bms\/data\/([^/]+)$/);
    if (feedDataMatch) {
      if (method === "GET") return await getFeedData(feedDataMatch[1], user);
    }

    // ── Skid routes ───────────────────────────────────────────────────────
    if (path === "/skids") {
      if (method === "POST") return await createSkid(event, user);
      if (method === "GET")  return await listSkids(event, user);
    }

    const skidDataMatch = path.match(/^\/skids\/([^/]+)\/data$/);
    if (skidDataMatch) {
      if (method === "GET") return await getSkidData(skidDataMatch[1], user);
    }

    const skidMatch = path.match(/^\/skids\/([^/]+)$/);
    if (skidMatch) {
      const skidId = skidMatch[1];
      if (method === "GET")    return await getSkid(skidId, user);
      if (method === "PATCH")  return await updateSkid(event, skidId, user);
      if (method === "DELETE") return await deleteSkid(skidId, user);
    }

    return json(404, { error: "Route not found", path, method });
  } catch (err) {
    console.error("fi-bms-skids error:", err);
    return json(500, { error: err.message || "Internal server error" });
  }
};
