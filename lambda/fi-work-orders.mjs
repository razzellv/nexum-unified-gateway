// ── fi-work-orders Lambda ─────────────────────────────────────────────────────
// FI Platform — Maintenance Work Orders CRUD
//
// JWT-protected routes:
//   GET    /work-orders              — list all work orders for facility
//   POST   /work-orders              — create a work order
//   PATCH  /work-orders/{id}         — update status / fields / notes
//   DELETE /work-orders/{id}         — remove a work order
//   POST   /work-orders/{id}/notes   — append a note to a work order

import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         PutCommand, UpdateCommand, DeleteCommand,
         GetCommand }                              from "@aws-sdk/lib-dynamodb";

const ddb              = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE            = process.env.WORK_ORDERS_TABLE || "WorkOrders";
const ONBOARDING_TABLE = "NexumOnboardingRecords";

async function markMilestone(fid, milestoneId) {
  try {
    const res    = await ddb.send(new GetCommand({ TableName: ONBOARDING_TABLE, Key: { facilityId: fid } }));
    const record = res.Item;
    if (!record) return;
    if ((record.milestones || []).find(m => m.id === milestoneId)?.done) return;
    const milestones = (record.milestones || []).map(m =>
      m.id === milestoneId ? { ...m, done: true, doneAt: new Date().toISOString() } : m
    );
    const completed = milestones.filter(m => m.done).length;
    const progress  = Math.round((completed / milestones.length) * 100);
    await ddb.send(new UpdateCommand({
      TableName:                 ONBOARDING_TABLE,
      Key:                       { facilityId: fid },
      UpdateExpression:          "SET milestones = :m, progress = :p, updatedAt = :u, #st = :s",
      ExpressionAttributeNames:  { "#st": "status" },
      ExpressionAttributeValues: { ":m": milestones, ":p": progress, ":u": new Date().toISOString(), ":s": progress === 100 ? "complete" : "in_progress" },
    }));
  } catch (err) {
    console.error(`markMilestone(${milestoneId}):`, err.message);
  }
}

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

function newId() {
  return `wo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function mapItem(item, fid) {
  const id = item.workOrderId || item.SK?.split("#")[1] || "";
  return {
    workOrderId:    id,
    id,
    title:          item.title          || "",
    description:    item.description    || item.reason || "",
    reason:         item.reason         || item.description || "",
    status:         item.status         || "open",
    priority:       item.priority       || "medium",
    type:           item.type           || "manual",
    equipmentId:    item.equipmentId    || "",
    equipmentType:  item.equipmentType  || item.system || "",
    system:         item.system         || item.equipmentType || "",
    assignedTo:     item.assignedTo     || "",
    assignedToName: item.assignedToName || "",
    createdBy:      item.createdBy      || "",
    createdByName:  item.createdByName  || "",
    facilityId:     item.facilityId     || fid,
    createdAt:      item.createdAt      || "",
    updatedAt:      item.updatedAt      || "",
    dueDate:        item.dueDate        || null,
    completedAt:    item.completedAt    || null,
    estimatedCost:  item.estimatedCost  ?? null,
    estimatedHours: item.estimatedHours ?? null,
    actualCost:     item.actualCost     ?? null,
    actualHours:    item.actualHours    ?? null,
    notes:          item.notes          || [],
    partsRequired:  item.partsRequired  || [],
    tags:           item.tags           || [],
    attachments:    item.attachments    || [],
  };
}

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const fid = facilityId(claims);

  // ── POST /work-orders/{id}/notes ────────────────────────────────────────────
  if (method === "POST" && path.includes("/work-orders/") && path.endsWith("/notes")) {
    try {
      const id  = path.split("/work-orders/")[1].split("/notes")[0];
      let raw   = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();

      // Fetch current item to get existing notes array
      const existing = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key:       { PK: `FACILITY#${fid}`, SK: `WO#${id}` },
      }));

      const currentNotes = existing.Item?.notes || [];
      const newNote = {
        id:        `note-${Date.now()}`,
        content:   body.content || "",
        author:    claims?.sub              || "",
        authorName:body.authorName          || claims?.name || claims?.email || "",
        createdAt: now,
      };
      const updatedNotes = [...currentNotes, newNote];

      await ddb.send(new UpdateCommand({
        TableName:                 TABLE,
        Key:                       { PK: `FACILITY#${fid}`, SK: `WO#${id}` },
        UpdateExpression:          "SET notes = :notes, updatedAt = :now",
        ExpressionAttributeValues: { ":notes": updatedNotes, ":now": now },
      }));

      return json(200, { success: true, note: newNote });
    } catch (err) {
      console.error("POST /work-orders/{id}/notes:", err);
      return json(500, { message: "Failed to add note.", detail: err.message });
    }
  }

  // ── GET /work-orders ────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/work-orders") || path.includes("/work-orders?"))) {
    try {
      const qs     = event.queryStringParameters || {};
      const limit  = Math.min(parseInt(qs.limit || "200"), 500);
      const status = qs.status;

      let params = {
        TableName:                 TABLE,
        KeyConditionExpression:    "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      if (status) {
        params.FilterExpression              = "#st = :status";
        params.ExpressionAttributeNames      = { "#st": "status" };
        params.ExpressionAttributeValues[":status"] = status;
      }

      const result     = await ddb.send(new QueryCommand(params));
      const workOrders = (result.Items || []).map(i => mapItem(i, fid));

      return json(200, { workOrders, count: workOrders.length });
    } catch (err) {
      console.error("GET /work-orders:", err);
      return json(500, { message: "Failed to fetch work orders.", detail: err.message });
    }
  }

  // ── POST /work-orders ───────────────────────────────────────────────────────
  if (method === "POST" && path.endsWith("/work-orders")) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);

      if (!body.title) return json(400, { message: "title is required" });

      const now = new Date().toISOString();
      const id  = newId();

      const item = {
        PK:             `FACILITY#${fid}`,
        SK:             `WO#${id}`,
        workOrderId:    id,
        facilityId:     fid,
        title:          body.title,
        description:    body.description    || body.reason || "",
        reason:         body.reason         || body.description || "",
        status:         body.status         || "open",
        priority:       body.priority       || "medium",
        type:           body.type           || "manual",
        equipmentId:    body.equipmentId    || "",
        equipmentType:  body.equipmentType  || body.system || "",
        system:         body.system         || body.equipmentType || "",
        assignedTo:     body.assignedTo     || "",
        assignedToName: body.assignedToName || "",
        createdBy:      claims?.sub         || "",
        createdByName:  body.createdByName  || claims?.name || claims?.email || "",
        dueDate:        body.dueDate        || null,
        completedAt:    null,
        estimatedCost:  body.estimatedCost  ?? null,
        estimatedHours: body.estimatedHours ?? null,
        actualCost:     null,
        actualHours:    null,
        notes:          [],
        partsRequired:  body.partsRequired  || [],
        tags:           body.tags           || [],
        attachments:    [],
        createdAt:      now,
        updatedAt:      now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      markMilestone(fid, "first_work_order").catch(() => {});
      return json(200, { success: true, workOrderId: id, workOrder: mapItem(item, fid) });
    } catch (err) {
      console.error("POST /work-orders:", err);
      return json(500, { message: "Failed to create work order.", detail: err.message });
    }
  }

  // ── PATCH /work-orders/{id} ─────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/work-orders/")) {
    try {
      const id  = path.split("/work-orders/")[1].split("?")[0];
      let raw   = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();

      const setExprs = ["updatedAt = :now"];
      const names    = {};
      const vals     = { ":now": now };

      if (body.status         !== undefined) { setExprs.push("#st = :st");           names["#st"] = "status"; vals[":st"]   = body.status; }
      if (body.priority       !== undefined) { setExprs.push("priority = :pri");                              vals[":pri"]  = body.priority; }
      if (body.title          !== undefined) { setExprs.push("title = :title");                               vals[":title"]= body.title; }
      if (body.description    !== undefined) { setExprs.push("description = :desc");                          vals[":desc"] = body.description; }
      if (body.assignedTo     !== undefined) { setExprs.push("assignedTo = :at");                             vals[":at"]   = body.assignedTo; }
      if (body.assignedToName !== undefined) { setExprs.push("assignedToName = :atn");                        vals[":atn"]  = body.assignedToName; }
      if (body.dueDate        !== undefined) { setExprs.push("dueDate = :dd");                                vals[":dd"]   = body.dueDate; }
      if (body.completedAt    !== undefined) { setExprs.push("completedAt = :ca");                            vals[":ca"]   = body.completedAt; }
      if (body.actualCost     !== undefined) { setExprs.push("actualCost = :ac");                             vals[":ac"]   = body.actualCost; }
      if (body.actualHours    !== undefined) { setExprs.push("actualHours = :ah");                            vals[":ah"]   = body.actualHours; }
      if (body.equipmentId    !== undefined) { setExprs.push("equipmentId = :eid");                           vals[":eid"]  = body.equipmentId; }
      if (body.equipmentType  !== undefined) { setExprs.push("equipmentType = :et");                          vals[":et"]   = body.equipmentType; }
      if (body.partsRequired  !== undefined) { setExprs.push("partsRequired = :pr");                          vals[":pr"]   = body.partsRequired; }
      if (body.tags           !== undefined) { setExprs.push("tags = :tags");                                 vals[":tags"] = body.tags; }

      const params = {
        TableName:                 TABLE,
        Key:                       { PK: `FACILITY#${fid}`, SK: `WO#${id}` },
        UpdateExpression:          "SET " + setExprs.join(", "),
        ExpressionAttributeValues: vals,
      };
      if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;

      await ddb.send(new UpdateCommand(params));
      return json(200, { success: true, workOrderId: id });
    } catch (err) {
      console.error("PATCH /work-orders:", err);
      return json(500, { message: "Failed to update work order.", detail: err.message });
    }
  }

  // ── DELETE /work-orders/{id} ────────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/work-orders/")) {
    try {
      const id = path.split("/work-orders/")[1].split("?")[0];
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key:       { PK: `FACILITY#${fid}`, SK: `WO#${id}` },
      }));
      return json(200, { success: true });
    } catch (err) {
      console.error("DELETE /work-orders:", err);
      return json(500, { message: "Failed to delete work order.", detail: err.message });
    }
  }

  return json(404, { message: "Route not found" });
};
