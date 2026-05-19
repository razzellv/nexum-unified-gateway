/**
 * Lambda: fi-courses
 * Routes:
 *   GET    /courses           — list courses for org (org-specific + global)
 *   POST   /courses           — create a course (admin / facility-compass)
 *   PATCH  /courses/{id}      — update course metadata
 *   DELETE /courses/{id}      — remove a course
 */

import { DynamoDBClient }                                from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand,
         UpdateCommand, DeleteCommand }                  from "@aws-sdk/lib-dynamodb";

const ddb   = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.COURSES_TABLE || "NexumCourses";

const ADMIN_DOMAINS = ["nexumsuum.com", "nexumsuum-facilityintelligence.com"];

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type":                 "application/json",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)   { return e?.requestContext?.http?.path   || e?.path       || ""; }
function getClaims(e) { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }

function newId() {
  return `course-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

export const handler = async (event) => {
  if (getMethod(event) === "OPTIONS") return json(200, {});

  const method = getMethod(event);
  const path   = getPath(event);
  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Authentication required" });

  const orgId   = claims["custom:orgId"] || claims["custom:facilityId"] || "facility-001";
  const email   = (claims.email || "").toLowerCase();
  const domain  = email.split("@")[1] || "";
  const isAdmin = ADMIN_DOMAINS.includes(domain) || claims["custom:role"] === "admin";

  let body = {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString()
      : event.body || "{}";
    body = JSON.parse(raw);
  } catch { /* ignore */ }

  // ── GET /courses ───────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/courses") || path.includes("/courses?"))) {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const courses = (result.Items || [])
      .filter(c => c.orgId === "global" || c.orgId === orgId || isAdmin)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return json(200, { courses });
  }

  // ── POST /courses ──────────────────────────────────────────────────────────
  if (method === "POST" && path.endsWith("/courses")) {
    if (!isAdmin) return json(403, { message: "Admin only" });

    const { title, description, modules = [], thumbnail, category, targetOrgId } = body;
    if (!title) return json(400, { message: "title required" });

    const now  = new Date().toISOString();
    const id   = newId();
    const item = {
      courseId:    id,
      orgId:       targetOrgId || "global",
      title,
      description: description || "",
      modules,
      thumbnail:   thumbnail  || null,
      category:    category   || "general",
      source:      "admin",
      createdBy:   email,
      createdAt:   now,
      updatedAt:   now,
    };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    return json(200, { success: true, courseId: id, course: item });
  }

  // ── PATCH /courses/{id} ────────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/courses/")) {
    if (!isAdmin) return json(403, { message: "Admin only" });
    const id        = path.split("/courses/")[1].split("?")[0];
    const exprParts = ["updatedAt = :u"];
    const exprVals  = { ":u": new Date().toISOString() };
    if (body.title)       { exprParts.push("title = :t");       exprVals[":t"] = body.title; }
    if (body.description) { exprParts.push("description = :d"); exprVals[":d"] = body.description; }
    if (body.modules)     { exprParts.push("modules = :m");     exprVals[":m"] = body.modules; }
    if (body.category)    { exprParts.push("category = :c");    exprVals[":c"] = body.category; }
    if (body.orgId)       { exprParts.push("orgId = :o");       exprVals[":o"] = body.orgId; }
    await ddb.send(new UpdateCommand({
      TableName:                 TABLE,
      Key:                       { courseId: id },
      UpdateExpression:          `SET ${exprParts.join(", ")}`,
      ExpressionAttributeValues: exprVals,
    }));
    return json(200, { success: true });
  }

  // ── DELETE /courses/{id} ───────────────────────────────────────────────────
  if (method === "DELETE" && path.includes("/courses/")) {
    if (!isAdmin) return json(403, { message: "Admin only" });
    const id = path.split("/courses/")[1].split("?")[0];
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { courseId: id } }));
    return json(200, { success: true });
  }

  return json(405, { message: "Method not allowed" });
};
