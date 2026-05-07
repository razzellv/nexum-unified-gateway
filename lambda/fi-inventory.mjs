// ── fi-inventory Lambda ───────────────────────────────────────────────────────
// FI Platform — Parts / Supplies Inventory + Checkout Logs
//
// JWT-protected routes:
//   GET    /inventory          — list all inventory items for facility
//   POST   /inventory          — create an inventory item
//   PATCH  /inventory/{id}     — update quantity / fields
//   DELETE /inventory/{id}     — remove an item
//   POST   /logs               — log a checkout or temperature event

import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb         = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE       = process.env.INVENTORY_TABLE || "NexumInventory";
const LOGS_TABLE  = process.env.LOGS_TABLE      || "FacilityLogs-v2";

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

function newId(prefix = "part") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function mapItem(item, fid) {
  const id = item.partId || item.SK?.split("#")[1] || "";
  return {
    partId:               id,
    id,
    itemType:             item.itemType             || "part",
    name:                 item.name                 || "",
    partNumber:           item.partNumber           || "",
    category:             item.category             || "",
    quantity:             item.quantity             ?? 0,
    minQuantity:          item.minQuantity          ?? 0,
    location:             item.location             || "",
    supplier:             item.supplier             || "",
    unitCost:             item.unitCost             ?? null,
    compatibleEquipment:  item.compatibleEquipment  || [],
    description:          item.description          || "",
    unit:                 item.unit                 || "",
    expirationDate:       item.expirationDate       || null,
    lastRestocked:        item.lastRestocked        || null,
    facilityId:           item.facilityId           || fid,
    createdAt:            item.createdAt            || "",
    updatedAt:            item.updatedAt            || "",
  };
}

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const fid = facilityId(claims);

  // ── POST /logs — checkout / temperature log ─────────────────────────────────
  if (method === "POST" && (path.endsWith("/logs") || path.includes("/logs?"))) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();
      const id   = newId("log");

      const item = {
        PK:          `FACILITY#${fid}`,
        SK:          `LOG#${now}#${id}`,
        id,
        facilityId:  fid,
        logType:     body.logType    || "checkout",
        timestamp:   body.timestamp  || now,
        createdAt:   now,
        // checkout fields
        itemId:       body.itemId       || "",
        itemName:     body.itemName     || "",
        quantity:     body.quantity     ?? null,
        checkedOutBy: body.checkedOutBy || claims?.sub || "",
        job:          body.job          || "",
        action:       body.action       || "checkout",
        notes:        body.notes        || "",
        // temperature fields
        temp:         body.temp         || null,
        unit:         body.unit         || "F",
        location:     body.location     || "",
        loggedBy:     body.loggedBy     || claims?.sub || "",
      };

      await ddb.send(new PutCommand({ TableName: LOGS_TABLE, Item: item }));

      // If it's a checkout, decrement inventory quantity
      if ((body.logType === "checkout" || body.action === "checkout") && body.itemId && body.quantity) {
        try {
          await ddb.send(new UpdateCommand({
            TableName:                 TABLE,
            Key:                       { PK: `FACILITY#${fid}`, SK: `PART#${body.itemId}` },
            UpdateExpression:          "SET quantity = quantity - :qty, updatedAt = :now",
            ConditionExpression:       "quantity >= :qty",
            ExpressionAttributeValues: { ":qty": body.quantity, ":now": now },
          }));
        } catch (updateErr) {
          console.warn("Quantity update skipped:", updateErr.message);
        }
      }

      return json(200, { success: true, id, timestamp: now });
    } catch (err) {
      console.error("POST /logs:", err);
      return json(500, { message: "Failed to save log.", detail: err.message });
    }
  }

  // ── GET /inventory ──────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/inventory") || path.includes("/inventory?"))) {
    try {
      const qs       = event.queryStringParameters || {};
      const limit    = Math.min(parseInt(qs.limit || "500"), 1000);
      const itemType = qs.itemType;
      const category = qs.category;

      let params = {
        TableName:                 TABLE,
        KeyConditionExpression:    "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      const filters  = [];
      const names    = {};

      if (itemType) { filters.push("itemType = :itype");      params.ExpressionAttributeValues[":itype"]   = itemType; }
      if (category) { filters.push("#cat = :cat");  names["#cat"] = "category"; params.ExpressionAttributeValues[":cat"] = category; }

      if (filters.length > 0) {
        params.FilterExpression = filters.join(" AND ");
        if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;
      }

      const result = await ddb.send(new QueryCommand(params));
      const parts  = (result.Items || []).map(i => mapItem(i, fid));

      return json(200, { parts, count: parts.length });
    } catch (err) {
      console.error("GET /inventory:", err);
      return json(500, { message: "Failed to fetch inventory.", detail: err.message });
    }
  }

  // ── POST /inventory ─────────────────────────────────────────────────────────
  if (method === "POST" && path.endsWith("/inventory")) {
    try {
      let raw = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);

      if (!body.name) return json(400, { message: "name is required" });

      const now = new Date().toISOString();
      const id  = newId("part");

      const item = {
        PK:                   `FACILITY#${fid}`,
        SK:                   `PART#${id}`,
        partId:               id,
        facilityId:           fid,
        itemType:             body.itemType             || "part",
        name:                 body.name,
        partNumber:           body.partNumber           || "",
        category:             body.category             || "",
        quantity:             body.quantity             ?? 0,
        minQuantity:          body.minQuantity          ?? 0,
        location:             body.location             || "",
        supplier:             body.supplier             || "",
        unitCost:             body.unitCost             ?? null,
        compatibleEquipment:  body.compatibleEquipment  || [],
        description:          body.description          || "",
        unit:                 body.unit                 || "",
        expirationDate:       body.expirationDate       || null,
        lastRestocked:        body.lastRestocked        || now,
        createdAt:            now,
        updatedAt:            now,
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return json(200, { success: true, partId: id, part: mapItem(item, fid) });
    } catch (err) {
      console.error("POST /inventory:", err);
      return json(500, { message: "Failed to create inventory item.", detail: err.message });
    }
  }

  // ── PATCH /inventory/{id} ───────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/inventory/")) {
    try {
      const id  = path.split("/inventory/")[1].split("?")[0];
      let raw   = event.body || "{}";
      if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
      const body = JSON.parse(raw);
      const now  = new Date().toISOString();

      const setExprs = ["updatedAt = :now"];
      const names    = {};
      const vals     = { ":now": now };

      if (body.quantity        !== undefined) { setExprs.push("quantity = :qty");          vals[":qty"]    = body.quantity; }
      if (body.minQuantity     !== undefined) { setExprs.push("minQuantity = :mq");         vals[":mq"]     = body.minQuantity; }
      if (body.name            !== undefined) { setExprs.push("#nm = :name");  names["#nm"] = "name"; vals[":name"]   = body.name; }
      if (body.location        !== undefined) { setExprs.push("#loc = :loc");  names["#loc"] = "location"; vals[":loc"] = body.location; }
      if (body.supplier        !== undefined) { setExprs.push("supplier = :sup");           vals[":sup"]    = body.supplier; }
      if (body.unitCost        !== undefined) { setExprs.push("unitCost = :uc");             vals[":uc"]     = body.unitCost; }
      if (body.category        !== undefined) { setExprs.push("#cat = :cat");  names["#cat"] = "category"; vals[":cat"] = body.category; }
      if (body.lastRestocked   !== undefined) { setExprs.push("lastRestocked = :lr");        vals[":lr"]     = body.lastRestocked; }
      if (body.expirationDate  !== undefined) { setExprs.push("expirationDate = :ed");       vals[":ed"]     = body.expirationDate; }
      if (body.compatibleEquipment !== undefined) { setExprs.push("compatibleEquipment = :ce"); vals[":ce"] = body.compatibleEquipment; }

      const params = {
        TableName:                 TABLE,
        Key:                       { PK: `FACILITY#${fid}`, SK: `PART#${id}` },
        UpdateExpression:          "SET " + setExprs.join(", "),
        ExpressionAttributeValues: vals,
      };
      if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;

      await ddb.send(new UpdateCommand(params));
      return json(200, { success: true, partId: id });
    } catch (err) {
      console.error("PATCH /inventory:", err);
      return json(500, { message: "Failed to update inventory item.", detail: err.message });
    }
  }

  // ── DELETE /inventory/{id} ──────────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/inventory/")) {
    try {
      const id = path.split("/inventory/")[1].split("?")[0];
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key:       { PK: `FACILITY#${fid}`, SK: `PART#${id}` },
      }));
      return json(200, { success: true });
    } catch (err) {
      console.error("DELETE /inventory:", err);
      return json(500, { message: "Failed to delete inventory item.", detail: err.message });
    }
  }

  return json(404, { message: "Route not found" });
};
