import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));

const PLUCKS_TABLE  = process.env.PLUCKS_TABLE  || "NexumVendorPlucks";
const VENDORS_TABLE = process.env.VENDORS_TABLE || "NexumVendors";

// ─── Response helper ─────────────────────────────────────────────────────────
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
    body: JSON.stringify(body),
  };
}

function getClaims(event) {
  return (
    event?.requestContext?.authorizer?.jwt?.claims ||
    event?.requestContext?.authorizer?.claims ||
    null
  );
}

function getMethod(event) {
  return event?.requestContext?.http?.method || event?.httpMethod || "";
}

function getPath(event) {
  return event?.requestContext?.http?.path || event?.path || "";
}

function parseBody(event) {
  try {
    let raw = event.body || "{}";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ─── Auth helper ─────────────────────────────────────────────────────────────
function auth(claims) {
  if (!claims) return null;
  const role       = claims["custom:role"] || "";
  const orgType    = claims["custom:orgType"] || "";
  const facilityId = claims["custom:facilityId"] || claims["custom:orgId"] || "facility-001";
  const orgId      = claims["custom:orgId"] || facilityId;
  const email      = claims["email"] || claims["sub"] || "";
  const sub        = claims.sub || "";
  const isAdmin    = role === "admin";
  const isServiceTech = orgType === "service_tech";
  const isLeadership  = ["executive","director","manager","supervisor","chief","lieutenant","captain","owner","operations_manager","dispatch_manager"].includes(role);
  return { role, orgType, facilityId, orgId, email, sub, isAdmin, isServiceTech, isLeadership };
}

// ─── Vendor Fit Scoring ───────────────────────────────────────────────────────
// Scores a vendor against a requested service type (0-100 scale)
function scoreVendor(vendor, requestedService, facilityId) {
  let score = 0;

  // serviceMatch: does vendor advertise this service? (0-30)
  const services = vendor.services || [];
  const reqLower = (requestedService || "").toLowerCase();
  const matched  = services.some(s => s.toLowerCase().includes(reqLower) || reqLower.includes(s.toLowerCase()));
  if (matched) score += 30;
  else if (services.length > 0) score += 5;

  // history: past accepted plucks with this facility (0-25)
  const historyCount = vendor.historyByFacility?.[facilityId] || 0;
  score += Math.min(25, historyCount * 5);

  // recency: days since last job (0-20)
  const lastJobAt = vendor.lastJobAt;
  if (lastJobAt) {
    const daysSince = (Date.now() - new Date(lastJobAt).getTime()) / 86400000;
    if (daysSince < 30)  score += 20;
    else if (daysSince < 90)  score += 12;
    else if (daysSince < 180) score += 6;
    else score += 2;
  }

  // rating: 0-15
  const rating = vendor.rating || 0;
  score += Math.round(rating * 3);

  // responseRate: 0-10
  const responseRate = vendor.responseRate || 0;
  score += Math.round(responseRate * 10);

  return Math.min(100, score);
}

// ─── Vendors ──────────────────────────────────────────────────────────────────
async function listVendors(facilityId, serviceType = null) {
  const result = await ddb.send(new QueryCommand({
    TableName: VENDORS_TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk":     `FACILITY#${facilityId}`,
      ":prefix": "VENDOR#",
    },
  }));
  let vendors = result.Items || [];

  if (serviceType) {
    vendors = vendors.map(v => ({
      ...v,
      matchScore: scoreVendor(v, serviceType, facilityId),
    })).sort((a, b) => b.matchScore - a.matchScore);
  }

  return vendors;
}

async function getVendor(facilityId, vendorId) {
  const result = await ddb.send(new GetCommand({
    TableName: VENDORS_TABLE,
    Key: { PK: `FACILITY#${facilityId}`, SK: `VENDOR#${vendorId}` },
  }));
  return result.Item || null;
}

async function getVendorProfile(vendorOrgId) {
  const result = await ddb.send(new GetCommand({
    TableName: VENDORS_TABLE,
    Key: { PK: `VENDOR_ORG#${vendorOrgId}`, SK: "PROFILE" },
  }));
  return result.Item || null;
}

async function upsertVendorProfile(vendorOrgId, data, updatedBy) {
  const now = new Date().toISOString();
  const existing = await getVendorProfile(vendorOrgId);

  const item = {
    PK:           `VENDOR_ORG#${vendorOrgId}`,
    SK:           "PROFILE",
    vendorOrgId,
    orgName:      data.orgName    || existing?.orgName    || "Service Company",
    ownerName:    data.ownerName  || existing?.ownerName  || "",
    ownerTitle:   data.ownerTitle || existing?.ownerTitle || "",
    email:        data.email      || existing?.email      || updatedBy,
    phone:        data.phone      || existing?.phone      || "",
    website:      data.website    || existing?.website    || "",
    services:     data.services   || existing?.services   || [],
    serviceAreas: data.serviceAreas || existing?.serviceAreas || [],
    bio:          data.bio        || existing?.bio        || "",
    licenseNumber: data.licenseNumber || existing?.licenseNumber || "",
    certifications: data.certifications || existing?.certifications || [],
    tier:         data.tier       || existing?.tier       || "basic",
    updatedBy,
    updatedAt:    now,
    createdAt:    existing?.createdAt || now,
  };

  await ddb.send(new PutCommand({ TableName: VENDORS_TABLE, Item: item }));
  return item;
}

// ─── Plucks ───────────────────────────────────────────────────────────────────
async function sendPluck(facilityId, vendorId, data, sentBy) {
  const id  = randomUUID();
  const now = new Date().toISOString();

  const item = {
    // Facility-side lookup
    PK:            `FACILITY#${facilityId}`,
    SK:            `PLUCK#${now}#${id}`,
    // Vendor-side GSI
    GSI1PK:        `VENDOR#${vendorId}`,
    GSI1SK:        `PLUCK#${now}#${id}`,
    id,
    facilityId,
    vendorId,
    sentBy,
    serviceType:   data.serviceType || "General",
    description:   data.description || "",
    urgency:       data.urgency    || "normal",
    preferredDate: data.preferredDate || null,
    status:        "sent",
    vendorResponse: null,
    respondedAt:   null,
    matchScore:    data.matchScore || null,
    relatedSuggestionId: data.relatedSuggestionId || null,
    relatedWOId:   data.relatedWOId || null,
    createdAt:     now,
  };

  await ddb.send(new PutCommand({ TableName: PLUCKS_TABLE, Item: item }));
  return item;
}

async function listPlucksByFacility(facilityId) {
  const result = await ddb.send(new QueryCommand({
    TableName: PLUCKS_TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk":     `FACILITY#${facilityId}`,
      ":prefix": "PLUCK#",
    },
    ScanIndexForward: false,
  }));
  return result.Items || [];
}

async function listPlucksByVendor(vendorId) {
  const result = await ddb.send(new QueryCommand({
    TableName: PLUCKS_TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :gsi1pk AND begins_with(GSI1SK, :prefix)",
    ExpressionAttributeValues: {
      ":gsi1pk": `VENDOR#${vendorId}`,
      ":prefix": "PLUCK#",
    },
    ScanIndexForward: false,
  }));
  return result.Items || [];
}

async function respondToPluck(facilityId, pluckSK, vendorId, responseData) {
  const now = new Date().toISOString();

  await ddb.send(new UpdateCommand({
    TableName: PLUCKS_TABLE,
    Key: { PK: `FACILITY#${facilityId}`, SK: pluckSK },
    UpdateExpression: "SET #s = :status, vendorResponse = :resp, respondedAt = :now, vendorMessage = :msg",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: {
      ":status": responseData.status || "responded",
      ":resp":   responseData.response || "accepted",
      ":msg":    responseData.message || "",
      ":now":    now,
    },
  }));
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const u = auth(claims);
  if (!u) return json(401, { message: "Unauthorized" });

  const method = getMethod(event);
  const path   = getPath(event);
  const body   = parseBody(event);
  const pp     = event.pathParameters || {};
  const qs     = event.queryStringParameters || {};

  try {
    // ── GET /vendors ────────────────────────────────────────────────────────
    if (method === "GET" && path.endsWith("/vendors")) {
      const vendors = await listVendors(u.facilityId, qs.serviceType || null);
      return json(200, { items: vendors, count: vendors.length });
    }

    // ── GET /vendors/{id} ──────────────────────────────────────────────────
    if (method === "GET" && /\/vendors\/[^/]+$/.test(path) && !path.includes("/pluck")) {
      const vendorId = pp.id || path.split("/").pop();
      const vendor   = await getVendor(u.facilityId, vendorId);
      if (!vendor) return json(404, { message: "Vendor not found" });
      return json(200, vendor);
    }

    // ── POST /vendors/{id}/pluck ───────────────────────────────────────────
    if (method === "POST" && /\/vendors\/[^/]+\/pluck$/.test(path)) {
      if (!u.isAdmin && !u.isLeadership) return json(403, { message: "Leadership access required to send pluck" });
      const vendorId = pp.id || path.split("/").slice(-2)[0];
      if (!body.serviceType || !body.description) {
        return json(400, { message: "serviceType and description are required" });
      }
      const pluck = await sendPluck(u.facilityId, vendorId, body, u.sub);
      return json(201, pluck);
    }

    // ── GET /vendors/plucks (facility side — plucks sent by this facility) ─
    if (method === "GET" && path.endsWith("/vendors/plucks")) {
      const plucks = await listPlucksByFacility(u.facilityId);
      return json(200, { items: plucks, count: plucks.length });
    }

    // ── GET /vendor/profile ────────────────────────────────────────────────
    if (method === "GET" && path.endsWith("/vendor/profile")) {
      if (!u.isServiceTech && !u.isAdmin) return json(403, { message: "Service tech access required" });
      const profile = await getVendorProfile(u.orgId);
      if (!profile) return json(200, { vendorOrgId: u.orgId, services: [], tier: "basic" });
      return json(200, profile);
    }

    // ── PATCH /vendor/profile ──────────────────────────────────────────────
    if (method === "PATCH" && path.endsWith("/vendor/profile")) {
      if (!u.isServiceTech && !u.isAdmin) return json(403, { message: "Service tech access required" });
      const profile = await upsertVendorProfile(u.orgId, body, u.email);
      return json(200, profile);
    }

    // ── GET /vendor/plucks (vendor side — plucks received) ─────────────────
    if (method === "GET" && path.endsWith("/vendor/plucks")) {
      if (!u.isServiceTech && !u.isAdmin) return json(403, { message: "Service tech access required" });
      const plucks = await listPlucksByVendor(u.orgId);
      return json(200, { items: plucks, count: plucks.length });
    }

    // ── POST /vendor/plucks/{sk}/respond ───────────────────────────────────
    if (method === "POST" && /\/vendor\/plucks\/[^/]+\/respond$/.test(path)) {
      if (!u.isServiceTech && !u.isAdmin) return json(403, { message: "Service tech access required" });
      const encoded = pp.sk || path.split("/").slice(-2)[0];
      const sk = decodeURIComponent(encoded);

      // We need the facilityId from the pluck itself — look it up via GSI first
      const plucks = await listPlucksByVendor(u.orgId);
      const pluck  = plucks.find(p => p.SK === sk);
      if (!pluck) return json(404, { message: "Pluck not found" });

      await respondToPluck(pluck.facilityId, sk, u.orgId, body);
      return json(200, { message: "Response recorded", status: body.status || "responded" });
    }

    return json(404, { message: "Route not found", path, method });

  } catch (err) {
    console.error("fi-vendor-pluck error:", err);
    return json(500, { message: "Internal error", detail: err.message });
  }
};
