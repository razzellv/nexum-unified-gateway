import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const WI_TABLE = process.env.WI_TABLE || "NexumWorkIntegrity";
const VIOLATIONS_TABLE = process.env.VIOLATIONS_TABLE || "ViolationEvents";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });
const ddb = DynamoDBDocumentClient.from(client);

function json(statusCode, body) {
  return {
    statusCode,
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

function computeDeadlineStatus(deadline, status) {
  if (!deadline) return "on_track";
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  if (dl < now) return "overdue";
  if (dl - now < 48 * 60 * 60 * 1000 && status !== "completed") return "at_risk";
  return "on_track";
}

async function queryTasks(fid, filters = {}) {
  const params = {
    TableName: WI_TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":prefix": "TASK#" },
  };
  const result = await ddb.send(new QueryCommand(params));
  let items = result.Items || [];

  if (filters.status) items = items.filter(i => i.status === filters.status);
  if (filters.taskType) items = items.filter(i => i.taskType === filters.taskType);
  if (filters.department) items = items.filter(i => i.department === filters.department);

  return items.map(i => ({ ...i, deadlineStatus: computeDeadlineStatus(i.deadline, i.status) }));
}

export async function handler(event) {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { error: "Unauthorized" });

  const fid = facilityId(claims);
  const method = getMethod(event);
  const path = getPath(event);
  const body = event.body ? JSON.parse(event.body) : {};
  const qs = event.queryStringParameters || {};

  // GET /work-integrity/tasks
  if (method === "GET" && path === "/work-integrity/tasks") {
    const tasks = await queryTasks(fid, qs);
    return json(200, { tasks, count: tasks.length });
  }

  // POST /work-integrity/tasks
  if (method === "POST" && path === "/work-integrity/tasks") {
    const now = new Date().toISOString();
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const SK = `TASK#${now}#${taskId}`;
    const item = {
      PK: `FACILITY#${fid}`,
      SK,
      taskId,
      taskType: body.taskType || "wo",
      title: body.title || "",
      description: body.description || "",
      systemType: body.systemType || "",
      department: body.department || "",
      assignedTo: body.assignedTo || "",
      assignedToId: body.assignedToId || "",
      assignedToCompetencyScore: body.assignedToCompetencyScore || 0,
      deadline: body.deadline || "",
      estimatedDurationHours: body.estimatedDurationHours || 0,
      actualDurationHours: null,
      priority: body.priority || "normal",
      status: body.status || "pending_review",
      reviewRequired: true,
      reviews: [],
      criticalPath: body.criticalPath || false,
      dependencies: body.dependencies || [],
      linkedWOId: body.linkedWOId || "",
      linkedPMId: body.linkedPMId || "",
      linkedViolationId: body.linkedViolationId || "",
      tags: body.tags || [],
      aiCritique: null,
      facilityId: fid,
      createdBy: claims.sub || "",
      createdByName: claims.name || claims.email || "",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    item.deadlineStatus = computeDeadlineStatus(item.deadline, item.status);
    await ddb.send(new PutCommand({ TableName: WI_TABLE, Item: item }));
    return json(201, { success: true, taskId, SK });
  }

  // PATCH /work-integrity/tasks/{sk}
  const patchMatch = path.match(/^\/work-integrity\/tasks\/([^/]+)$/);
  if (method === "PATCH" && patchMatch) {
    const sk = decodeURIComponent(patchMatch[1]);
    const existing = await ddb.send(new GetCommand({ TableName: WI_TABLE, Key: { PK: `FACILITY#${fid}`, SK: sk } }));
    if (!existing.Item) return json(404, { error: "Task not found" });
    const updated = { ...existing.Item, ...body, updatedAt: new Date().toISOString() };
    if (body.status === "completed" && !updated.completedAt) updated.completedAt = new Date().toISOString();
    updated.deadlineStatus = computeDeadlineStatus(updated.deadline, updated.status);
    await ddb.send(new PutCommand({ TableName: WI_TABLE, Item: updated }));
    return json(200, { success: true });
  }

  // POST /work-integrity/tasks/{sk}/review
  const reviewMatch = path.match(/^\/work-integrity\/tasks\/([^/]+)\/review$/);
  if (method === "POST" && reviewMatch) {
    const sk = decodeURIComponent(reviewMatch[1]);
    const existing = await ddb.send(new GetCommand({ TableName: WI_TABLE, Key: { PK: `FACILITY#${fid}`, SK: sk } }));
    if (!existing.Item) return json(404, { error: "Task not found" });
    const review = {
      userId: claims.sub || "",
      userName: claims.name || claims.email || "",
      role: claims["custom:role"] || "",
      timestamp: new Date().toISOString(),
      approved: body.approved === true,
      note: body.note || "",
    };
    const reviews = [...(existing.Item.reviews || []), review];
    const hasApproval = reviews.some(r => r.approved);
    const newStatus = hasApproval && existing.Item.status === "pending_review" ? "approved" : existing.Item.status;
    const updated = { ...existing.Item, reviews, status: newStatus, updatedAt: new Date().toISOString() };
    updated.deadlineStatus = computeDeadlineStatus(updated.deadline, updated.status);
    await ddb.send(new PutCommand({ TableName: WI_TABLE, Item: updated }));
    return json(200, { success: true });
  }

  // GET /work-integrity/deadlines
  if (method === "GET" && path === "/work-integrity/deadlines") {
    const allTasks = await queryTasks(fid);
    const open = allTasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
    open.sort((a, b) => new Date(a.deadline || "9999").getTime() - new Date(b.deadline || "9999").getTime());

    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);

    const overdue = open.filter(t => t.deadline && new Date(t.deadline) < now);
    const due_today = open.filter(t => t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= todayEnd);
    const due_this_week = open.filter(t => t.deadline && new Date(t.deadline) > todayEnd && new Date(t.deadline) <= weekEnd);
    const upcoming = open.filter(t => !t.deadline || new Date(t.deadline) > weekEnd);

    return json(200, { overdue, due_today, due_this_week, upcoming });
  }

  // GET /work-integrity/critical-path
  if (method === "GET" && path === "/work-integrity/critical-path") {
    const allTasks = await queryTasks(fid);
    const open = allTasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
    open.sort((a, b) => new Date(a.deadline || "9999").getTime() - new Date(b.deadline || "9999").getTime());

    const criticalTasks = open.filter(t => t.priority === "critical" || t.criticalPath === true);
    const now = Date.now();
    const atRisk = open.filter(t => t.deadline && new Date(t.deadline).getTime() - now < 48 * 60 * 60 * 1000 && new Date(t.deadline).getTime() > now);
    const overdue = open.filter(t => t.deadline && new Date(t.deadline).getTime() < now);

    const totalEstimatedHours = open.reduce((sum, t) => sum + (t.estimatedDurationHours || 0), 0);
    const earliestCompletion = new Date(now + totalEstimatedHours * 60 * 60 * 1000).toISOString();

    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const completedThisWeek = allTasks.filter(t => t.status === "completed" && t.completedAt && new Date(t.completedAt) >= weekAgo).length;

    return json(200, {
      tasks: open,
      criticalTasks,
      atRisk,
      overdue,
      totalEstimatedHours,
      earliestCompletion,
      overdueCount: overdue.length,
      atRiskCount: atRisk.length,
      completedThisWeek,
    });
  }

  // GET /work-integrity/competency-match
  if (method === "GET" && path === "/work-integrity/competency-match") {
    const taskType = qs.taskType || "";
    const systemType = qs.systemType || "";
    const department = qs.department || "";

    const [violationsResult, tasksResult] = await Promise.all([
      ddb.send(new QueryCommand({
        TableName: VIOLATIONS_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      })),
      ddb.send(new QueryCommand({
        TableName: WI_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":prefix": "TASK#" },
      })),
    ]);

    const violations = violationsResult.Items || [];
    const tasks = tasksResult.Items || [];

    const empViolations = {};
    for (const v of violations) {
      const id = v.operatorId || v.employeeId || "unknown";
      if (!empViolations[id]) empViolations[id] = { count: 0, name: v.operatorName || v.employeeName || id };
      empViolations[id].count++;
    }

    const empCompleted = {};
    const empOverdue = {};
    const empOpenCount = {};
    for (const t of tasks) {
      const id = t.assignedToId || t.assignedTo || "unknown";
      const name = t.assignedTo || id;
      if (!empCompleted[id]) empCompleted[id] = { count: 0, name };
      if (!empOverdue[id]) empOverdue[id] = 0;
      if (!empOpenCount[id]) empOpenCount[id] = 0;
      if (t.status === "completed") empCompleted[id].count++;
      else if (t.status === "overdue") empOverdue[id]++;
      else if (t.status !== "cancelled") empOpenCount[id]++;
    }

    const allIds = new Set([
      ...Object.keys(empViolations),
      ...Object.keys(empCompleted),
    ]);

    const recommendations = [];
    for (const id of allIds) {
      if (id === "unknown") continue;
      const vCount = empViolations[id]?.count || 0;
      const reliability = Math.max(0, 100 - vCount * 5);
      const completed = empCompleted[id]?.count || 0;
      const overdue = empOverdue[id] || 0;
      const completionRate = completed + overdue > 0 ? (completed / (completed + overdue)) * 100 : 80;
      const currentWorkload = empOpenCount[id] || 0;
      const competencyScore = reliability * 0.40 + completionRate * 0.35 + Math.max(0, 100 - currentWorkload * 10) * 0.25;
      const name = empViolations[id]?.name || empCompleted[id]?.name || id;
      recommendations.push({
        employeeId: id,
        employeeName: name,
        competencyScore: Math.round(competencyScore),
        reliability: Math.round(reliability),
        completionRate: Math.round(completionRate),
        currentWorkload,
        reasoning: `Reliability ${Math.round(reliability)}% (${vCount} violations), completion rate ${Math.round(completionRate)}%, ${currentWorkload} active tasks`,
      });
    }

    recommendations.sort((a, b) => b.competencyScore - a.competencyScore);
    return json(200, { taskType, systemType, department, recommendations: recommendations.slice(0, 8) });
  }

  // GET /work-integrity/performance
  if (method === "GET" && path === "/work-integrity/performance") {
    const [violationsResult, tasksResult] = await Promise.all([
      ddb.send(new QueryCommand({
        TableName: VIOLATIONS_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
      })),
      ddb.send(new QueryCommand({
        TableName: WI_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":prefix": "TASK#" },
      })),
    ]);

    const violations = violationsResult.Items || [];
    const tasks = tasksResult.Items || [];

    const empViolationCount = {};
    for (const v of violations) {
      const id = v.operatorId || v.employeeId || "unknown";
      empViolationCount[id] = (empViolationCount[id] || 0) + 1;
    }

    const empMap = {};
    for (const t of tasks) {
      const id = t.assignedToId || t.assignedTo || "unknown";
      if (!empMap[id]) {
        empMap[id] = {
          employeeId: id,
          employeeName: t.assignedTo || id,
          department: t.department || "",
          tasksCompleted: 0,
          tasksOverdue: 0,
          totalDuration: 0,
          durationCount: 0,
        };
      }
      if (t.status === "completed") {
        empMap[id].tasksCompleted++;
        if (t.actualDurationHours) {
          empMap[id].totalDuration += t.actualDurationHours;
          empMap[id].durationCount++;
        }
      }
      if (t.status === "overdue") empMap[id].tasksOverdue++;
    }

    const employees = Object.values(empMap).map(e => {
      const vCount = empViolationCount[e.employeeId] || 0;
      const total = e.tasksCompleted + e.tasksOverdue;
      const onTimeRate = total > 0 ? Math.round((e.tasksCompleted / total) * 100) : 100;
      const avgDurationHours = e.durationCount > 0 ? Math.round((e.totalDuration / e.durationCount) * 10) / 10 : 0;
      const reliability = Math.max(0, 100 - vCount * 5);
      const competencyScore = Math.round(reliability * 0.40 + onTimeRate * 0.35 + Math.max(0, 100 - 0) * 0.25);
      return {
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        department: e.department,
        tasksCompleted: e.tasksCompleted,
        tasksOverdue: e.tasksOverdue,
        onTimeRate,
        avgDurationHours,
        competencyScore,
        virtuousScore: reliability,
      };
    }).filter(e => e.employeeId !== "unknown");

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const overdueCount = tasks.filter(t => t.status === "overdue").length;
    const overallOnTime = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
    const avgCompetencyScore = employees.length > 0
      ? Math.round(employees.reduce((s, e) => s + e.competencyScore, 0) / employees.length)
      : 0;

    return json(200, {
      employees,
      facilityStats: {
        totalTasks,
        completedTasks,
        overdueCount,
        onTimeRate: overallOnTime,
        avgCompetencyScore,
      },
    });
  }

  // POST /work-integrity/ai-critique
  if (method === "POST" && path === "/work-integrity/ai-critique") {
    const { title, description, taskType, systemType, estimatedDurationHours, deadline } = body;

    const userMessage = `Analyze this facility task and respond with valid JSON only (no markdown):

Title: ${title || ""}
Description: ${description || ""}
Task Type: ${taskType || ""}
System Type: ${systemType || ""}
Estimated Duration (hours): ${estimatedDurationHours || 0}
Deadline: ${deadline || ""}

Respond with this exact JSON structure:
{
  "assumptions": [{"text":"...","risk":"high|medium|low","recommendation":"..."}],
  "efficiencyGains": [{"description":"...","estimatedTimeSavingHours":0}],
  "simplifications": ["..."],
  "estimatedOptimisticHours": 0,
  "estimatedPessimisticHours": 0,
  "criticalPathRisk": "high|medium|low",
  "competencyNotes": "...",
  "overallRisk": "high|medium|low",
  "deadlineViability": "achievable|tight|unrealistic"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "You are the Nexum Work Integrity Analyst. Your job is to question EVERY assumption in a facility task, find ways to reduce effort and elapsed time, ensure the right person is assigned, and identify risks to deadlines. Be direct and specific. Format your response as valid JSON only, no markdown.",
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text || "";
    try {
      const parsed = JSON.parse(rawText);
      return json(200, parsed);
    } catch {
      return json(200, { response: rawText });
    }
  }

  return json(404, { error: "Not found" });
}
