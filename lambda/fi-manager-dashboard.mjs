// ── fi-manager-dashboard Lambda ────────────────────────────────────────────────
// FI Platform — Aggregated dashboard data for Manager, Supervisor, OperationCenter
//
// JWT-protected routes:
//   GET /dashboard/manager     — ManagerDashboard + OperationCenter combined payload
//   GET /dashboard/supervisor  — SupervisorDashboard payload
//   GET /dashboard/executive   — ExecutiveDashboard payload (alias for manager)
//   GET /dashboard/energy      — Energy summary (alias for manager)

import { DynamoDBClient }                   from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));

const LOGS_TABLE  = "FacilityLogs-v2";
const WO_TABLE    = "WorkOrders";
const VIOL_TABLE  = "ViolationEvents";
const EQUIP_TABLE = "EquipmentLibrary";
const USERS_TABLE = "NexumUsers";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type":                 "application/json",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)   { return e?.requestContext?.http?.path   || e?.path       || ""; }
function getClaims(e) { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }
function facilityId(c){ return c?.["custom:facilityId"] || c?.["custom:orgId"] || "facility-001"; }
function orgId(c)     { return c?.["custom:orgId"] || c?.["custom:facilityId"] || "org-001"; }

// Paginated query — follows LastEvaluatedKey up to maxPages pages
async function queryAll(params, maxPages = 5) {
  const items = [];
  let last;
  for (let i = 0; i < maxPages; i++) {
    const result = await ddb.send(new QueryCommand({ ...params, ExclusiveStartKey: last }));
    items.push(...(result.Items || []));
    last = result.LastEvaluatedKey;
    if (!last) break;
  }
  return items;
}

async function fetchLogs(fid, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  try {
    return await queryAll({
      TableName:                 LOGS_TABLE,
      KeyConditionExpression:    "PK = :pk AND SK >= :since",
      ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":since": `LOG#${since}` },
      ScanIndexForward:          false,
      Limit:                     500,
    });
  } catch (e) {
    console.warn("fetchLogs:", e.message);
    return [];
  }
}

async function fetchWorkOrders(fid) {
  try {
    return await queryAll({
      TableName:                 WO_TABLE,
      KeyConditionExpression:    "PK = :pk",
      ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      ScanIndexForward:          false,
      Limit:                     500,
    });
  } catch (e) {
    console.warn("fetchWorkOrders:", e.message);
    return [];
  }
}

async function fetchViolations(fid) {
  try {
    return await queryAll({
      TableName:                 VIOL_TABLE,
      KeyConditionExpression:    "PK = :pk",
      ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      ScanIndexForward:          false,
      Limit:                     500,
    });
  } catch (e) {
    console.warn("fetchViolations:", e.message);
    return [];
  }
}

async function fetchEquipment(fid, oid) {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName:                 EQUIP_TABLE,
      IndexName:                 "orgId-index",
      KeyConditionExpression:    "orgId = :oid",
      ExpressionAttributeValues: { ":oid": oid },
      Limit:                     500,
    }));
    return result.Items || [];
  } catch {
    try {
      const result = await ddb.send(new ScanCommand({
        TableName:                 EQUIP_TABLE,
        FilterExpression:          "facilityId = :fid",
        ExpressionAttributeValues: { ":fid": fid },
        Limit:                     500,
      }));
      return result.Items || [];
    } catch (e) {
      console.warn("fetchEquipment fallback:", e.message);
      return [];
    }
  }
}

function woAgeDays(wo) {
  const t = new Date(wo.createdAt || wo.created_at || wo.timestamp || 0).getTime();
  return t ? (Date.now() - t) / 86400000 : 0;
}

function buildManagerPayload(fid, logs, workOrders, violations, equipment) {
  const now   = new Date();
  const today = now.toISOString().split("T")[0];
  const ms7d  = 7 * 86400000;
  const ms30d = 30 * 86400000;

  // ── Logs ─────────────────────────────────────────────────────────────────────
  const logsToday = logs.filter(l => (l.timestamp || "").startsWith(today));
  const logs7d    = logs.filter(l => new Date(l.timestamp || 0).getTime() >= Date.now() - ms7d);
  const flagged7d = logs7d.filter(l => l.flagged);

  const timelineMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    timelineMap[d] = 0;
  }
  logs7d.forEach(l => {
    const d = (l.timestamp || "").split("T")[0];
    if (d in timelineMap) timelineMap[d]++;
  });
  const activityTimeline = Object.entries(timelineMap).map(([date, count]) => ({ date, count }));

  const activeOperatorIds = new Set(logsToday.map(l => l.operatorId || l.operator || "").filter(Boolean));
  const equipCheckedToday = new Set(logsToday.map(l => l.equipmentId).filter(Boolean)).size;

  const recentLogsFeed = logs.slice(0, 50).map(l => ({
    logId:         l.SK || l.logId || "",
    timestamp:     l.timestamp || l.createdAt || "",
    equipmentId:   l.equipmentId || "",
    equipmentType: l.equipmentType || l.systemType || "",
    operatorId:    l.operatorId || "",
    operatorName:  l.operatorName || l.operator || "",
    summary:       l.notes || l.summary || "",
    flagged:       !!l.flagged,
  }));

  // ── Equipment ─────────────────────────────────────────────────────────────────
  const totalEquip  = equipment.length;
  const activeEquip = equipment.filter(e => (e.status || "active") === "active").length;
  const maintEquip  = equipment.filter(e => e.status === "maintenance").length;
  const decommEquip = equipment.filter(e => e.status === "decommissioned").length;
  const withBaseline = new Set(logs7d.map(l => l.equipmentId).filter(Boolean)).size;

  const byTypeMap = {};
  equipment.forEach(e => {
    const t = e.systemType || e.equipmentType || "unknown";
    if (!byTypeMap[t]) byTypeMap[t] = { total: 0, active: 0, maintenance: 0 };
    byTypeMap[t].total++;
    if ((e.status || "active") === "active") byTypeMap[t].active++;
    if (e.status === "maintenance")          byTypeMap[t].maintenance++;
  });
  const equipByTypeArr    = Object.entries(byTypeMap).map(([type, v]) => ({ type, ...v }));
  const equipByTypeLookup = {};
  Object.entries(byTypeMap).forEach(([t, v]) => { equipByTypeLookup[t] = v.total; });

  const healthByType = {};
  Object.keys(byTypeMap).forEach(t => {
    healthByType[t] = {
      count:    byTypeMap[t].total,
      withData: logs7d.filter(l => (l.equipmentType || l.systemType) === t).length,
    };
  });

  // ── Work Orders ───────────────────────────────────────────────────────────────
  const openWOs       = workOrders.filter(w => !["completed","closed","done"].includes((w.status || "").toLowerCase()));
  const completedWOs  = workOrders.filter(w =>  ["completed","closed","done"].includes((w.status || "").toLowerCase()));
  const inProgressWOs = workOrders.filter(w => ["in_progress","in-progress","inprogress"].includes((w.status || "").toLowerCase()));
  const overdueWOs    = openWOs.filter(w => {
    const due = w.dueDate || w.due_date;
    return due && new Date(due).getTime() < Date.now();
  });
  const unassignedWOs = openWOs.filter(w => !w.assignedTo && !w.assigned_to);
  const avgWOAge = openWOs.length > 0
    ? openWOs.reduce((s, w) => s + woAgeDays(w), 0) / openWOs.length : 0;

  const recentWOs = workOrders.slice(0, 20).map(w => ({
    id:             w.workOrderId || w.id || (w.SK || "").split("#")[1] || "",
    title:          w.title || "Work Order",
    description:    w.description || w.reason || "",
    status:         w.status || "open",
    priority:       w.priority || "medium",
    assignedTo:     w.assignedTo || w.assigned_to || "",
    assignedToName: w.assignedToName || "",
    equipmentId:    w.equipmentId || "",
    dueDate:        w.dueDate || w.due_date || "",
    createdAt:      w.createdAt || w.created_at || "",
    department:     w.department || "",
    cost:           w.cost ?? null,
  }));

  // ── Violations ────────────────────────────────────────────────────────────────
  const since30d  = Date.now() - ms30d;
  const viol30d   = violations.filter(v => new Date(v.timestamp || v.issuedAt || 0).getTime() >= since30d);
  const openViols = violations.filter(v => (v.status || "open").toLowerCase() === "open");
  const critViols = openViols.filter(v => (v.severityScore || v.severity || 0) >= 4);

  const violEvents = violations.slice(0, 30).map(v => ({
    id:          v.violationId || v.id || (v.SK || "").split("#")[1] || "",
    type:        v.type || v.violationType || "",
    description: v.description || v.notes || v.type || "",
    timestamp:   v.timestamp || v.issuedAt || v.createdAt || "",
    severity:    v.severityScore ?? v.severity ?? 1,
    status:      v.status || "open",
    equipmentId: v.equipmentId || "",
    source:      v.source || "manual",
  }));

  const summary = {
    total_equipment:          totalEquip,
    active_equipment:         activeEquip,
    recent_logs_count:        logs7d.length,
    avg_work_order_age_days:  Math.round(avgWOAge * 10) / 10,
    open_work_orders:         openWOs.length,
    total_violations:         violations.length,
    high_severity_violations: critViols.length,
    avg_compliance_score:     openViols.length === 0
      ? 100
      : Math.max(0, Math.round(100 - (openViols.length / Math.max(totalEquip, 1)) * 100)),
    avg_virtuous_score:       100,
    unassigned_work_orders:   unassignedWOs.length,
    alerts_count:             overdueWOs.length + critViols.length,
    water_chemistry_alerts:   violations.filter(v => (v.type || "").toLowerCase().includes("water")).length,
    employees_at_risk:        0,
  };

  return {
    facilityId:  fid,
    generatedAt: now.toISOString(),
    // OperationCenter
    kpis: {
      logsToday:         logsToday.length,
      logsLast7Days:     logs7d.length,
      openWorkOrders:    openWOs.length,
      overdueWorkOrders: overdueWOs.length,
      openViolations:    openViols.length,
      equipmentOnline:   activeEquip,
      equipmentTotal:    totalEquip,
      activeStaffToday:  activeOperatorIds.size,
    },
    shiftSummary: {
      date:             today,
      totalLogsToday:   logsToday.length,
      equipmentChecked: equipCheckedToday,
      activeOperators:  activeOperatorIds.size,
      activityTimeline,
    },
    recentLogsFeed,
    workOrdersSummary: {
      total:      workOrders.length,
      open:       openWOs.length,
      inProgress: inProgressWOs.length,
      completed:  completedWOs.length,
      overdue:    overdueWOs.length,
      recent:     recentWOs,
    },
    equipmentStatus: {
      total:          totalEquip,
      active:         activeEquip,
      maintenance:    maintEquip,
      decommissioned: decommEquip,
      withBaseline,
      byType:         equipByTypeArr,
    },
    complianceSummary: {
      totalViolations30d: viol30d.length,
      openViolations:     openViols.length,
      criticalViolations: critViols.length,
      flaggedLogs7d:      flagged7d.length,
      events:             violEvents,
    },
    personnelSummary: {
      totalFieldStaff: 0,
      activeToday:     activeOperatorIds.size,
      byRole:          {},
      staff:           [],
    },
    // ManagerDashboard
    summary,
    work_orders: {
      open:        openWOs.length,
      total:       workOrders.length,
      by_status: {
        open:        openWOs.length,
        in_progress: inProgressWOs.length,
        completed:   completedWOs.length,
        overdue:     overdueWOs.length,
      },
      recent:      recentWOs,
      avg_age_days: Math.round(avgWOAge * 10) / 10,
      overdue:     overdueWOs.length,
    },
    violations: {
      active:  openViols.length,
      total:   violations.length,
      details: violEvents,
    },
    performance: {
      equipment_with_recent_data: withBaseline,
      logs_last_7_days:           logs7d.length,
      equipment_health_by_type:   healthByType,
      recent_logs_count:          logs7d.length,
    },
    equipment: {
      by_type: equipByTypeLookup,
      summary: { total: totalEquip, active: activeEquip, by_type: equipByTypeLookup },
    },
  };
}

function buildSupervisorPayload(fid, logs, workOrders, violations, equipment) {
  const base  = buildManagerPayload(fid, logs, workOrders, violations, equipment);
  const today = new Date().toISOString().split("T")[0];

  // Violations per operator
  const violByOp = {};
  violations.forEach(v => {
    const opId   = v.operatorId || v.employeeId || "unknown";
    const opName = v.employeeName || v.operator || opId;
    if (!violByOp[opId]) {
      violByOp[opId] = { employeeId: opId, employeeName: opName, role: v.role || "operator",
        violationCount: 0, totalSeverity: 0, totalWeight: 0 };
    }
    violByOp[opId].violationCount++;
    violByOp[opId].totalSeverity += v.severityScore || v.severity || 1;
    violByOp[opId].totalWeight   += v.weightFactor  || v.weight   || 1;
  });

  const violations_summary = Object.values(violByOp).map(op => {
    const count    = op.violationCount;
    const avgSev   = count > 0 ? op.totalSeverity / count : 0;
    const riskScore = Math.min(100, Math.round(avgSev * 20));
    return {
      employeeId:     op.employeeId,
      employeeName:   op.employeeName,
      role:           op.role,
      violationCount: count,
      avgWeight:      count > 0 ? Math.round((op.totalWeight / count) * 100) / 100 : 0,
      avgSeverity:    Math.round(avgSev * 100) / 100,
      riskScore,
      virtuousScore:  Math.max(0, 100 - riskScore),
      complianceRate: Math.max(0, Math.round(100 - (count / Math.max(logs.length, 1)) * 100)),
    };
  }).sort((a, b) => b.riskScore - a.riskScore);

  // On-shift team built from log history
  const opMap = {};
  logs.forEach(l => {
    const opId = l.operatorId || l.operator || "";
    if (!opId) return;
    if (!opMap[opId]) opMap[opId] = {
      operatorId: opId, name: l.operatorName || l.operator || opId,
      totalLogs: 0, logsToday: 0,
    };
    opMap[opId].totalLogs++;
    if ((l.timestamp || "").startsWith(today)) opMap[opId].logsToday++;
  });

  const on_shift_team = Object.values(opMap).map(op => {
    const ov = violByOp[op.operatorId] || {};
    const riskScore = ov.riskScore || 0;
    return {
      employee:           op.name,
      operatorId:         op.operatorId,
      role:               "operator",
      systems_logged_24h: op.logsToday,
      total_logs:         op.totalLogs,
      specialty:          "HVAC",
      last_activity:      null,
      violations_count:   ov.violationCount || 0,
      avg_severity:       ov.avgSeverity    || 0,
      compliance_rate:    ov.complianceRate  || 100,
      risk_score:         riskScore,
      virtuous_score:     Math.max(0, 100 - riskScore),
    };
  });

  return {
    ...base,
    violations_summary,
    department_metrics: [],
    work_orders: workOrders.slice(0, 50).map(w => ({
      id:          w.workOrderId || (w.SK || "").split("#")[1] || "",
      description: w.description || w.title || w.reason || "",
      type:        w.type        || "manual",
      status:      w.status      || "open",
      priority:    w.priority    || "medium",
      assigned_to: w.assignedTo  || w.assigned_to || "",
      equipment:   w.equipmentId || "",
      due_date:    w.dueDate     || w.due_date || "",
      created:     w.createdAt   || w.created_at || "",
    })),
    on_shift_team,
    violation_details: base.violations.details,
  };
}

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  if (method !== "GET") return json(405, { message: "Method not allowed" });

  const fid = facilityId(claims);
  const oid = orgId(claims);

  try {
    const [logs, workOrders, violations, equipment] = await Promise.all([
      fetchLogs(fid, 30),
      fetchWorkOrders(fid),
      fetchViolations(fid),
      fetchEquipment(fid, oid),
    ]);

    if (path.includes("/dashboard/supervisor")) {
      return json(200, buildSupervisorPayload(fid, logs, workOrders, violations, equipment));
    }

    return json(200, buildManagerPayload(fid, logs, workOrders, violations, equipment));
  } catch (err) {
    console.error("dashboard handler:", err);
    return json(500, { message: "Failed to load dashboard data.", detail: err.message });
  }
};
