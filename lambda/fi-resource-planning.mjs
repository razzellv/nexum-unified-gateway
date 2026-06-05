import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });
const ddb = DynamoDBDocumentClient.from(client);

const RP_TABLE       = process.env.RP_TABLE       || "NexumResourcePlanning";
const WO_TABLE       = process.env.WO_TABLE        || "WorkOrders";
const INV_TABLE      = process.env.INV_TABLE       || "NexumInventory";
const EQ_TABLE       = process.env.EQ_TABLE        || "EquipmentLibrary";

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)   { return e?.requestContext?.http?.path   || e?.path       || ""; }
function getClaims(e) { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }
function facilityId(c){ return c?.["custom:facilityId"] || c?.["custom:orgId"] || "facility-001"; }

async function queryRP(fid, skPrefix) {
  const result = await ddb.send(new QueryCommand({
    TableName: RP_TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":prefix": skPrefix },
  }));
  return result.Items || [];
}

export async function handler(event) {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { error: "Unauthorized" });

  const fid = facilityId(claims);
  const method = getMethod(event);
  const path = getPath(event);
  const body = event.body ? JSON.parse(event.body) : {};

  // ── GET /resources/vendors ─────────────────────────────────────────────────
  if (method === "GET" && path === "/resources/vendors") {
    const vendors = await queryRP(fid, "VENDOR#");
    return json(200, { vendors, count: vendors.length });
  }

  // ── POST /resources/vendors ────────────────────────────────────────────────
  if (method === "POST" && path === "/resources/vendors") {
    const now = new Date().toISOString();
    const vendorId = body.vendorId || `vendor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const SK = `VENDOR#${vendorId}`;

    // Check if updating existing
    const existing = await ddb.send(new GetCommand({
      TableName: RP_TABLE,
      Key: { PK: `FACILITY#${fid}`, SK },
    }));

    const item = {
      ...(existing.Item || {}),
      PK: `FACILITY#${fid}`,
      SK,
      vendorId,
      name: body.name || existing.Item?.name || "",
      specialty: body.specialty || existing.Item?.specialty || "",
      contact: body.contact || existing.Item?.contact || "",
      phone: body.phone || existing.Item?.phone || "",
      email: body.email || existing.Item?.email || "",
      address: body.address || existing.Item?.address || "",
      avgLeadTimeDays: body.avgLeadTimeDays ?? existing.Item?.avgLeadTimeDays ?? 0,
      partsSupplied: body.partsSupplied || existing.Item?.partsSupplied || [],
      linkedSystems: body.linkedSystems || existing.Item?.linkedSystems || [],
      certifications: body.certifications || existing.Item?.certifications || [],
      rating: body.rating ?? existing.Item?.rating ?? 0,
      notes: body.notes || existing.Item?.notes || "",
      facilityId: fid,
      createdAt: existing.Item?.createdAt || now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: RP_TABLE, Item: item }));
    return json(201, { success: true, vendorId });
  }

  // ── GET /resources/parts ───────────────────────────────────────────────────
  if (method === "GET" && path === "/resources/parts") {
    // Fetch stored resource-planning part overrides
    const rpParts = await queryRP(fid, "PART#");

    // Fetch inventory parts
    let invParts = [];
    try {
      const invResult = await ddb.send(new QueryCommand({
        TableName: INV_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      }));
      invParts = invResult.Items || [];
    } catch { /* table may be empty */ }

    // Build map of RP overrides keyed by partId
    const rpMap = {};
    for (const rp of rpParts) {
      const partId = rp.SK.replace("PART#", "");
      rpMap[partId] = rp;
    }

    // Merge inventory parts with RP data
    const parts = invParts.map(p => ({
      ...p,
      floatDays: rpMap[p.partId]?.floatDays ?? null,
      vendorName: rpMap[p.partId]?.vendorName || p.supplier || "",
      vendorId: rpMap[p.partId]?.vendorId || "",
      reorderLeadDays: rpMap[p.partId]?.reorderLeadDays ?? 7,
      atRisk: rpMap[p.partId]?.atRisk ?? false,
      lastOrderedAt: rpMap[p.partId]?.lastOrderedAt || null,
      openWOCount: rpMap[p.partId]?.openWOCount ?? 0,
    }));

    return json(200, { parts, count: parts.length });
  }

  // ── POST /resources/parts ──────────────────────────────────────────────────
  if (method === "POST" && (path === "/resources/parts" || path.startsWith("/resources/parts"))) {
    const now = new Date().toISOString();
    const partId = body.partId || `rpart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const SK = `PART#${partId}`;

    const existing = await ddb.send(new GetCommand({
      TableName: RP_TABLE,
      Key: { PK: `FACILITY#${fid}`, SK },
    }));

    const item = {
      ...(existing.Item || {}),
      PK: `FACILITY#${fid}`,
      SK,
      partId,
      name: body.name || existing.Item?.name || "",
      category: body.category || existing.Item?.category || "",
      vendorId: body.vendorId || existing.Item?.vendorId || "",
      vendorName: body.vendorName || existing.Item?.vendorName || "",
      floatDays: body.floatDays ?? existing.Item?.floatDays ?? 0,
      reorderLeadDays: body.reorderLeadDays ?? existing.Item?.reorderLeadDays ?? 7,
      atRisk: body.atRisk ?? existing.Item?.atRisk ?? false,
      openWOCount: body.openWOCount ?? existing.Item?.openWOCount ?? 0,
      lastOrderedAt: body.lastOrderedAt || existing.Item?.lastOrderedAt || null,
      facilityId: fid,
      createdAt: existing.Item?.createdAt || now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: RP_TABLE, Item: item }));
    return json(201, { success: true, partId });
  }

  // ── GET /resources/float-time ──────────────────────────────────────────────
  if (method === "GET" && path === "/resources/float-time") {
    let workOrders = [];
    try {
      const woResult = await ddb.send(new QueryCommand({
        TableName: WO_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      }));
      workOrders = woResult.Items || [];
    } catch { /* table may be empty */ }

    // Group completed WOs by systemType and compute avg resolution days
    const groups = {};
    for (const wo of workOrders) {
      if (!wo.createdAt) continue;
      const key = wo.systemType || wo.system || "General";
      if (!groups[key]) groups[key] = { totalDays: 0, count: 0, openCount: 0, parts: new Set() };

      if (wo.status === "completed" && wo.completedAt) {
        const created = new Date(wo.createdAt).getTime();
        const completed = new Date(wo.completedAt).getTime();
        const days = (completed - created) / (1000 * 60 * 60 * 24);
        if (days >= 0 && days < 365) {
          groups[key].totalDays += days;
          groups[key].count++;
        }
      } else if (wo.status !== "cancelled") {
        groups[key].openCount++;
      }

      // Collect referenced parts
      if (wo.requiredParts) {
        const parts = Array.isArray(wo.requiredParts) ? wo.requiredParts : [wo.requiredParts];
        parts.forEach(p => groups[key].parts.add(p));
      }
    }

    const floatData = Object.entries(groups).map(([systemType, data]) => ({
      systemType,
      avgFloatDays: data.count > 0 ? Math.round((data.totalDays / data.count) * 10) / 10 : null,
      completedWOs: data.count,
      openWOs: data.openCount,
      referencedParts: [...data.parts].slice(0, 10),
      riskLevel: data.openCount > 3 ? "high" : data.openCount > 1 ? "medium" : "low",
    }));

    floatData.sort((a, b) => (b.openWOs) - (a.openWOs));

    const overallAvgDays = floatData.filter(f => f.avgFloatDays !== null).length > 0
      ? Math.round(floatData.reduce((s, f) => s + (f.avgFloatDays || 0), 0) / floatData.filter(f => f.avgFloatDays !== null).length * 10) / 10
      : 0;

    return json(200, {
      floatData,
      summary: {
        totalSystems: floatData.length,
        overallAvgDays,
        highRiskSystems: floatData.filter(f => f.riskLevel === "high").length,
        totalOpenWOs: floatData.reduce((s, f) => s + f.openWOs, 0),
      },
    });
  }

  // ── GET /resources/intervals ───────────────────────────────────────────────
  if (method === "GET" && path === "/resources/intervals") {
    let workOrders = [];
    try {
      const woResult = await ddb.send(new QueryCommand({
        TableName: WO_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      }));
      workOrders = woResult.Items || [];
    } catch { /* table may be empty */ }

    // Group PM-type WOs by equipment/system to derive intervals
    const pmTypes = ["pm", "preventive", "maintenance", "inspection", "service"];
    const pmWOs = workOrders.filter(wo =>
      pmTypes.some(t => (wo.type || wo.workOrderType || "").toLowerCase().includes(t)) ||
      pmTypes.some(t => (wo.title || wo.description || "").toLowerCase().includes(t))
    );

    const equipGroups = {};
    for (const wo of pmWOs) {
      const key = wo.equipmentId || wo.equipmentName || wo.systemType || wo.system || "Unknown";
      if (!equipGroups[key]) equipGroups[key] = { dates: [], systemType: wo.systemType || wo.system || "", name: key, openCount: 0 };
      if (wo.createdAt) equipGroups[key].dates.push(new Date(wo.createdAt).getTime());
      if (wo.status !== "completed" && wo.status !== "cancelled") equipGroups[key].openCount++;
    }

    const intervals = Object.entries(equipGroups).map(([equipId, data]) => {
      const sorted = data.dates.sort((a, b) => a - b);
      let avgIntervalDays = null;
      let trend = "stable";

      if (sorted.length >= 2) {
        const gaps = [];
        for (let i = 1; i < sorted.length; i++) {
          gaps.push((sorted[i] - sorted[i-1]) / (1000 * 60 * 60 * 24));
        }
        avgIntervalDays = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);

        // Check trend: compare first half vs second half avg gap
        if (gaps.length >= 4) {
          const mid = Math.floor(gaps.length / 2);
          const firstHalf = gaps.slice(0, mid).reduce((s, g) => s + g, 0) / mid;
          const secondHalf = gaps.slice(mid).reduce((s, g) => s + g, 0) / (gaps.length - mid);
          if (secondHalf < firstHalf * 0.85) trend = "worsening"; // intervals getting shorter = more frequent
          else if (secondHalf > firstHalf * 1.15) trend = "improving";
        }
      }

      // Suggest next due date
      const lastPM = sorted.length > 0 ? new Date(sorted[sorted.length - 1]) : null;
      const suggestedIntervalDays = avgIntervalDays || 90;
      const nextDue = lastPM
        ? new Date(lastPM.getTime() + suggestedIntervalDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const now = Date.now();
      const daysUntilDue = nextDue ? Math.round((new Date(nextDue).getTime() - now) / (1000 * 60 * 60 * 24)) : null;

      return {
        equipmentId: equipId,
        equipmentName: data.name,
        systemType: data.systemType,
        pmCount: sorted.length,
        avgIntervalDays,
        suggestedIntervalDays,
        trend,
        lastPMDate: lastPM ? lastPM.toISOString() : null,
        nextDueDate: nextDue,
        daysUntilDue,
        openCount: data.openCount,
        status: daysUntilDue !== null && daysUntilDue < 0 ? "overdue" : daysUntilDue !== null && daysUntilDue < 14 ? "due_soon" : "on_schedule",
      };
    });

    intervals.sort((a, b) => (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999));

    return json(200, {
      intervals,
      summary: {
        total: intervals.length,
        overdue: intervals.filter(i => i.status === "overdue").length,
        dueSoon: intervals.filter(i => i.status === "due_soon").length,
        onSchedule: intervals.filter(i => i.status === "on_schedule").length,
        worsening: intervals.filter(i => i.trend === "worsening").length,
      },
    });
  }

  // ── GET /resources/summary ─────────────────────────────────────────────────
  if (method === "GET" && path === "/resources/summary") {
    const [vendors, rpParts] = await Promise.all([
      queryRP(fid, "VENDOR#"),
      queryRP(fid, "PART#"),
    ]);

    let openWOCount = 0;
    let totalParts = 0;
    try {
      const woResult = await ddb.send(new QueryCommand({
        TableName: WO_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      }));
      const wos = woResult.Items || [];
      openWOCount = wos.filter(w => w.status !== "completed" && w.status !== "cancelled").length;
    } catch { /* ignore */ }

    try {
      const invResult = await ddb.send(new QueryCommand({
        TableName: INV_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      }));
      totalParts = (invResult.Items || []).length;
    } catch { /* ignore */ }

    const avgLeadTime = vendors.length > 0
      ? Math.round(vendors.reduce((s, v) => s + (v.avgLeadTimeDays || 0), 0) / vendors.length)
      : 0;

    return json(200, {
      vendorCount: vendors.length,
      trackedPartsCount: rpParts.length,
      totalInventoryParts: totalParts,
      openWOCount,
      avgVendorLeadTimeDays: avgLeadTime,
      atRiskParts: rpParts.filter(p => p.atRisk).length,
    });
  }

  return json(404, { error: "Not found" });
}
