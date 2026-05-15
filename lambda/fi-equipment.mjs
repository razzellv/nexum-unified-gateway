// ── fi-equipment Lambda ───────────────────────────────────────────────────────
// FI Platform — Equipment Library + Facility Logs
//
// JWT-protected routes:
//   GET    /equipment          — list equipment for facility
//   POST   /equipment          — add equipment entry
//   PATCH  /equipment/{id}     — update equipment record
//   DELETE /equipment/{id}     — remove equipment
//   GET    /logs/latest        — latest facility log entries (dashboard charts)
//   GET    /logs/query         — query logs by date range / system type
//   POST   /logs               — write a facility log entry
//   GET    /metrics            — aggregated equipment metrics per system type

import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb        = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const EQUIP_TABLE = process.env.EQUIPMENT_TABLE || "EquipmentLibrary";
const LOGS_TABLE  = process.env.LOGS_TABLE      || "FacilityLogs-v2";

const TIER_LIMITS = {
  basic:            { maxUsers: 10,  maxEquipment: 50   },
  standard:         { maxUsers: 25,  maxEquipment: 200  },
  business:         { maxUsers: 50,  maxEquipment: null },
  premium:          { maxUsers: null, maxEquipment: null },
  enterprise:       { maxUsers: null, maxEquipment: null },
  admin:            { maxUsers: null, maxEquipment: null },
  retail_starter:   { maxUsers: 5,   maxEquipment: 100  },
  retail_pro:       { maxUsers: 10,  maxEquipment: 500  },
  command_basic:    { maxUsers: 15,  maxEquipment: 200  },
  command_standard: { maxUsers: 30,  maxEquipment: null },
  command_pro:      { maxUsers: null, maxEquipment: null },
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type":                 "application/json",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getMethod(e)  { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)    { return e?.requestContext?.http?.path   || e?.path       || ""; }
function getClaims(e)  { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }
function facilityId(c) { return c?.["custom:facilityId"] || c?.["custom:orgId"] || "facility-001"; }
function orgId(c)      { return c?.["custom:orgId"] || c?.["custom:facilityId"] || "org-001"; }

function newId(prefix = "equip") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function mapEquipment(item, fid) {
  const id = item.equipmentId || item.SK?.split("#")[1] || "";
  return {
    equipmentId:     id,
    id,
    systemId:        item.systemId        || id,
    name:            item.name            || "",
    systemType:      item.systemType      || item.equipmentType || "",
    equipmentType:   item.equipmentType   || item.systemType    || "",
    make:            item.make            || item.manufacturer  || "",
    manufacturer:    item.manufacturer    || item.make         || "",
    model:           item.model           || "",
    serialNumber:    item.serialNumber    || "",
    location:        item.location        || "",
    department:      item.department      || "",
    installDate:     item.installDate     || null,
    lastServiceDate: item.lastServiceDate || null,
    nextServiceDate: item.nextServiceDate || null,
    status:          item.status          || "active",
    avgEfficiency:   item.avgEfficiency   ?? null,
    avgCOP:          item.avgCOP          ?? null,
    totalRuntime:    item.totalRuntime    ?? null,
    avgKW:           item.avgKW           ?? null,
    avgPressure:     item.avgPressure     ?? null,
    avgFlow:         item.avgFlow         ?? null,
    notes:           item.notes           || "",
    facilityId:      item.facilityId      || fid,
    createdAt:       item.createdAt       || "",
    updatedAt:       item.updatedAt       || "",
  };
}

function mapLog(item) {
  const data = item.data || {};
  return {
    PK:            item.PK,
    SK:            item.SK,
    equipmentId:   item.equipmentId   || "",
    equipmentType: item.equipmentType || item.systemType || "",
    systemType:    item.systemType    || item.equipmentType || "",
    timestamp:     item.timestamp     || item.createdAt || "",
    operator:      item.operator      || item.operatorName || "",
    operatorId:    item.operatorId    || "",
    facilityId:    item.facilityId    || "",
    notes:         item.notes         || "",
    ...data,
  };
}

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const fid = facilityId(claims);

  // ── GET /facility-logs — frontend canonical path ─────────────────────────────
  // Handles: /facility-logs?facilityId=&limit=&flagged=true
  if (method === "GET" && path.includes("/facility-logs")) {
    try {
      const qs      = event.queryStringParameters || {};
      const limit   = Math.min(parseInt(qs.limit || "50"), 500);
      const flagged = qs.flagged === "true";

      let params = {
        TableName:                 LOGS_TABLE,
        KeyConditionExpression:    "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      if (flagged) {
        params.FilterExpression = "flagged = :f";
        params.ExpressionAttributeValues[":f"] = true;
      }

      const result = await ddb.send(new QueryCommand(params));
      const logs   = (result.Items || []).map(mapLog);
      return json(200, { logs, count: logs.length });
    } catch (err) {
      console.error("GET /facility-logs:", err);
      return json(500, { message: "Failed to fetch facility logs.", detail: err.message });
    }
  }

  // ── POST /facility-log-ingest — batch ingest from EquipmentLibrary / SDK ────
  if (method === "POST" && path.includes("/facility-log-ingest")) {
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
      const entries = Array.isArray(body) ? body : [body];
      const now     = new Date().toISOString();
      const written = [];

      for (const entry of entries) {
        const ts  = entry.timestamp || now;
        const id  = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
        const item = {
          PK:          `FACILITY#${fid}`,
          SK:          `LOG#${ts}#${id}`,
          logId:       id,
          facilityId:  fid,
          timestamp:   ts,
          operator:    entry.operator || claims.sub || "system",
          equipmentId: entry.equipmentId || null,
          action:      entry.action || entry.logType || "log",
          notes:       entry.notes  || null,
          severity:    entry.severity || "info",
          metric:      entry.metric  || null,
          value:       entry.value   != null ? Number(entry.value) : null,
          kw:          entry.kw      != null ? Number(entry.kw) : null,
          kwPerTon:    entry.kwPerTon != null ? Number(entry.kwPerTon) : null,
          tons:        entry.tons    != null ? Number(entry.tons) : null,
          ampDraw:     entry.ampDraw != null ? Number(entry.ampDraw) : null,
          efficiency:  entry.efficiency != null ? Number(entry.efficiency) : null,
          alarmCode:   entry.alarmCode || null,
          overrideFlag: !!entry.overrideFlag,
          flagged:     !!entry.flagged,
          source:      entry.source || "manual",
          ttl:         Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90, // 90d TTL
        };
        await ddb.send(new PutCommand({ TableName: LOGS_TABLE, Item: item }));
        written.push(id);
      }
      return json(201, { written: written.length, ids: written });
    } catch (err) {
      console.error("POST /facility-log-ingest:", err);
      return json(500, { message: "Ingest failed.", detail: err.message });
    }
  }

  // ── GET /logs/latest ────────────────────────────────────────────────────────
  if (method === "GET" && path.includes("/logs/latest")) {
    try {
      const qs          = event.queryStringParameters || {};
      const limit       = Math.min(parseInt(qs.limit || "100"), 500);
      const systemType  = qs.system_type;
      const startDate   = qs.start_date;
      const endDate     = qs.end_date;

      let params = {
        TableName:                 LOGS_TABLE,
        KeyConditionExpression:    "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      if (startDate || endDate || systemType) {
        const filters  = [];
        const names    = {};

        if (startDate) { filters.push("SK >= :start"); params.ExpressionAttributeValues[":start"] = `LOG#${startDate}`; }
        if (endDate)   { filters.push("SK <= :end");   params.ExpressionAttributeValues[":end"]   = `LOG#${endDate}z`; }
        if (systemType){ filters.push("systemType = :st"); params.ExpressionAttributeValues[":st"] = systemType; }

        if (filters.length > 0) {
          if (startDate || endDate) {
            params.KeyConditionExpression += " AND " + filters.filter(f => f.startsWith("SK")).join(" AND ");
          }
          const nonKeyFilters = filters.filter(f => !f.startsWith("SK"));
          if (nonKeyFilters.length > 0) params.FilterExpression = nonKeyFilters.join(" AND ");
        }
      }

      const result = await ddb.send(new QueryCommand(params));
      const logs   = (result.Items || []).map(mapLog);

      return json(200, { logs, count: logs.length });
    } catch (err) {
      console.error("GET /logs/latest:", err);
      return json(500, { message: "Failed to fetch logs.", detail: err.message });
    }
  }

  // ── GET /logs/query ─────────────────────────────────────────────────────────
  if (method === "GET" && path.includes("/logs/query")) {
    try {
      const qs        = event.queryStringParameters || {};
      const limit     = Math.min(parseInt(qs.limit || "200"), 1000);
      const startDate = qs.start_date || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const endDate   = qs.end_date   || new Date().toISOString().split("T")[0];

      const result = await ddb.send(new QueryCommand({
        TableName:                 LOGS_TABLE,
        KeyConditionExpression:    "PK = :pk AND SK BETWEEN :start AND :end",
        ExpressionAttributeValues: {
          ":pk":    `FACILITY#${fid}`,
          ":start": `LOG#${startDate}`,
          ":end":   `LOG#${endDate}z`,
        },
        ScanIndexForward: false,
        Limit:            limit,
      }));

      const logs = (result.Items || []).map(mapLog);
      return json(200, { logs, count: logs.length });
    } catch (err) {
      console.error("GET /logs/query:", err);
      return json(500, { message: "Failed to query logs.", detail: err.message });
    }
  }

  // ── POST /logs ──────────────────────────────────────────────────────────────
  if (method === "POST" && (path.endsWith("/logs") || path.includes("/logs?"))) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();
      const id   = newId("log");

      const item = {
        PK:            `FACILITY#${fid}`,
        SK:            `LOG#${now}#${id}`,
        equipmentId:   body.equipmentId   || "",
        equipmentType: body.equipmentType || body.systemType || "",
        systemType:    body.systemType    || body.equipmentType || "",
        timestamp:     body.timestamp     || now,
        operator:      body.operator      || body.operatorName || claims?.name || "",
        operatorId:    body.operatorId    || claims?.sub || "",
        facilityId:    fid,
        notes:         body.notes         || "",
        data:          body.data          || {},
        createdAt:     now,
        // flatten common metric fields for direct querying
        ...(body.data || {}),
      };

      await ddb.send(new PutCommand({ TableName: LOGS_TABLE, Item: item }));
      return json(200, { success: true, id, timestamp: now });
    } catch (err) {
      console.error("POST /logs:", err);
      return json(500, { message: "Failed to save log.", detail: err.message });
    }
  }

  // ── GET /metrics ────────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/metrics") || path.includes("/metrics?"))) {
    try {
      const qs    = event.queryStringParameters || {};
      const start = qs.start_date || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const end   = qs.end_date   || new Date().toISOString().split("T")[0];

      // Pull recent logs and aggregate by system type
      const result = await ddb.send(new QueryCommand({
        TableName:                 LOGS_TABLE,
        KeyConditionExpression:    "PK = :pk AND SK BETWEEN :start AND :end",
        ExpressionAttributeValues: {
          ":pk":    `FACILITY#${fid}`,
          ":start": `LOG#${start}`,
          ":end":   `LOG#${end}z`,
        },
        ScanIndexForward: false,
        Limit:            1000,
      }));

      const byType = {};
      for (const item of result.Items || []) {
        const st = item.systemType || item.equipmentType || "unknown";
        if (!byType[st]) {
          byType[st] = { systemId: st, systemType: st, count: 0, _eff: [], _cop: [], _kw: [], _rt: [] };
        }
        byType[st].count++;
        if (item.efficiency != null)  byType[st]._eff.push(item.efficiency);
        if (item.cop        != null)  byType[st]._cop.push(item.cop);
        if (item.kw         != null)  byType[st]._kw.push(item.kw);
        if (item.runtime    != null)  byType[st]._rt.push(item.runtime);
        byType[st].lastReading = item.timestamp;
      }

      const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      const equipment_metrics = Object.values(byType).map(s => ({
        systemId:      s.systemId,
        systemType:    s.systemType,
        count:         s.count,
        lastReading:   s.lastReading || null,
        avgEfficiency: avg(s._eff),
        avgCOP:        avg(s._cop),
        avgKW:         avg(s._kw),
        totalRuntime:  s._rt.reduce((a, b) => a + b, 0) || null,
      }));

      return json(200, {
        facility_id:       fid,
        start_date:        start,
        end_date:          end,
        equipment_metrics,
      });
    } catch (err) {
      console.error("GET /metrics:", err);
      return json(500, { message: "Failed to compute metrics.", detail: err.message });
    }
  }

  // ── GET /equipment ──────────────────────────────────────────────────────────
  // EquipmentLibrary key: equipmentId (HASH only), GSI: orgId-index (orgId+createdAt)
  if (method === "GET" && (path.endsWith("/equipment") || path.includes("/equipment?"))) {
    try {
      const qs    = event.queryStringParameters || {};
      const limit = Math.min(parseInt(qs.limit || "200"), 500);
      const type  = qs.type || qs.systemType;
      const oid   = orgId(claims);

      let params = {
        TableName:                 EQUIP_TABLE,
        IndexName:                 "orgId-index",
        KeyConditionExpression:    "orgId = :oid",
        ExpressionAttributeValues: { ":oid": oid },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      if (type) {
        params.FilterExpression              = "systemType = :type";
        params.ExpressionAttributeValues[":type"] = type;
      }

      const result    = await ddb.send(new QueryCommand(params));
      const equipment = (result.Items || []).map(i => mapEquipment(i, fid));

      return json(200, { equipment, count: equipment.length });
    } catch (err) {
      console.error("GET /equipment:", err);
      return json(500, { message: "Failed to fetch equipment.", detail: err.message });
    }
  }

  // ── POST /equipment ─────────────────────────────────────────────────────────
  if (method === "POST" && path.endsWith("/equipment")) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);

      if (!body.name && !body.systemType) return json(400, { message: "name or systemType is required" });

      const now = new Date().toISOString();
      const id  = newId("equip");

      const oid  = orgId(claims);
      const tier = claims["custom:tier"] || "basic";

      if (tier !== "admin") {
        const limits = TIER_LIMITS[tier] || TIER_LIMITS["basic"];
        const limit  = limits.maxEquipment;
        if (limit !== null) {
          try {
            const countResult = await ddb.send(new QueryCommand({
              TableName:                 EQUIP_TABLE,
              IndexName:                 "orgId-index",
              KeyConditionExpression:    "orgId = :oid",
              ExpressionAttributeValues: { ":oid": oid },
              Select:                    "COUNT",
            }));
            const currentCount = countResult.Count || 0;
            if (currentCount >= limit) {
              return json(403, {
                error:   "LIMIT_REACHED",
                code:    "equipment_limit",
                current: currentCount,
                limit:   limit,
                tier:    tier,
                message: `Equipment limit reached (${currentCount}/${limit}). Upgrade your plan to add more.`,
              });
            }
          } catch (countErr) {
            console.error("Equipment limit count check failed (allowing write):", countErr);
          }
        }
      }

      const item = {
        equipmentId:     id,
        orgId:           oid,
        systemId:        body.systemId        || id,
        facilityId:      fid,
        name:            body.name            || body.systemType || "",
        systemType:      body.systemType      || body.equipmentType || "",
        equipmentType:   body.equipmentType   || body.systemType    || "",
        make:            body.make            || body.manufacturer  || "",
        manufacturer:    body.manufacturer    || body.make         || "",
        model:           body.model           || "",
        serialNumber:    body.serialNumber    || "",
        location:        body.location        || "",
        department:      body.department      || claims?.["custom:department"] || "",
        installDate:     body.installDate     || null,
        lastServiceDate: body.lastServiceDate || null,
        nextServiceDate: body.nextServiceDate || null,
        status:          body.status          || "active",
        notes:           body.notes           || "",
        createdAt:       now,
        updatedAt:       now,
      };

      await ddb.send(new PutCommand({ TableName: EQUIP_TABLE, Item: item }));
      return json(200, { success: true, equipmentId: id, equipment: mapEquipment(item, fid) });
    } catch (err) {
      console.error("POST /equipment:", err);
      return json(500, { message: "Failed to create equipment.", detail: err.message });
    }
  }

  // ── PATCH /equipment/{id} ───────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/equipment/")) {
    try {
      const id  = path.split("/equipment/")[1].split("?")[0];
      let raw   = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();

      const setExprs = ["updatedAt = :now"];
      const names    = {};
      const vals     = { ":now": now };

      if (body.name            !== undefined) { setExprs.push("#nm = :name");  names["#nm"] = "name"; vals[":name"]   = body.name; }
      if (body.status          !== undefined) { setExprs.push("#st = :st");    names["#st"] = "status"; vals[":st"]   = body.status; }
      if (body.location        !== undefined) { setExprs.push("#loc = :loc");  names["#loc"] = "location"; vals[":loc"] = body.location; }
      if (body.model           !== undefined) { setExprs.push("model = :model");                           vals[":model"]= body.model; }
      if (body.serialNumber    !== undefined) { setExprs.push("serialNumber = :sn");                       vals[":sn"]   = body.serialNumber; }
      if (body.lastServiceDate !== undefined) { setExprs.push("lastServiceDate = :lsd");                   vals[":lsd"]  = body.lastServiceDate; }
      if (body.nextServiceDate !== undefined) { setExprs.push("nextServiceDate = :nsd");                   vals[":nsd"]  = body.nextServiceDate; }
      if (body.notes           !== undefined) { setExprs.push("notes = :notes");                           vals[":notes"]= body.notes; }
      if (body.avgEfficiency   !== undefined) { setExprs.push("avgEfficiency = :ae");                      vals[":ae"]   = body.avgEfficiency; }
      if (body.avgKW           !== undefined) { setExprs.push("avgKW = :akw");                             vals[":akw"]  = body.avgKW; }

      const params = {
        TableName:                 EQUIP_TABLE,
        Key:                       { equipmentId: id },
        UpdateExpression:          "SET " + setExprs.join(", "),
        ExpressionAttributeValues: vals,
      };
      if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;

      await ddb.send(new UpdateCommand(params));
      return json(200, { success: true, equipmentId: id });
    } catch (err) {
      console.error("PATCH /equipment:", err);
      return json(500, { message: "Failed to update equipment.", detail: err.message });
    }
  }

  // ── DELETE /equipment/{id} ──────────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/equipment/")) {
    try {
      const id = path.split("/equipment/")[1].split("?")[0];
      await ddb.send(new DeleteCommand({
        TableName: EQUIP_TABLE,
        Key:       { equipmentId: id },
      }));
      return json(200, { success: true });
    } catch (err) {
      console.error("DELETE /equipment:", err);
      return json(500, { message: "Failed to delete equipment.", detail: err.message });
    }
  }

  return json(404, { message: "Route not found" });
};
