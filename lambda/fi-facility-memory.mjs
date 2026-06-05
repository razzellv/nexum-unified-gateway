// ── fi-facility-memory Lambda ──────────────────────────────────────────────────
// FI Platform — Facility Memory & Tribal Knowledge Management
//
// JWT-protected routes:
//   GET    /facility-memory              — list memories (supports ?type=, ?risk=, ?assetId=, ?search=)
//   POST   /facility-memory              — create a memory record
//   GET    /facility-memory/scores       — completeness / retention / continuity scores
//   GET    /facility-memory/timeline     — all memories sorted by timestamp desc
//   GET    /facility-memory/patterns     — pattern analysis (assets, keywords, seasonal, tribal)
//   POST   /facility-memory/ingest       — auto-ingest from WorkOrders + ViolationEvents
//   GET    /facility-memory/{sk}         — get single memory + increment access_count
//   PATCH  /facility-memory/{sk}         — update a memory
//   DELETE /facility-memory/{sk}         — delete a memory (204)

import { DynamoDBClient }                                from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand,
         GetCommand, UpdateCommand, DeleteCommand }       from "@aws-sdk/lib-dynamodb";
import { randomUUID }                                    from "crypto";

const ddb      = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE    = process.env.TABLE            || "NexumFacilityMemory";
const WO_TABLE = process.env.WO_TABLE         || "WorkOrders";
const VE_TABLE = process.env.VE_TABLE         || "ViolationEvents";

// ── Response helper ────────────────────────────────────────────────────────────
function res(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type":                 "application/json",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
    body: statusCode === 204 ? "" : JSON.stringify(body),
  };
}

// ── Request helpers ────────────────────────────────────────────────────────────
function getMethod(e)  { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)    { return e?.requestContext?.http?.path   || e?.rawPath    || e?.path || ""; }
function getClaims(e)  { return e?.requestContext?.authorizer?.jwt?.claims || e?.requestContext?.authorizer?.claims || null; }
function getFid(c)     { return c?.["custom:facilityId"] || c?.["custom:orgId"] || "facility-001"; }

function parseBody(event) {
  let raw = event.body || "{}";
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
  try { return JSON.parse(raw); } catch { return {}; }
}

// ── Keyword extractor ──────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  "the","and","for","are","but","not","you","all","any","can","had","her",
  "was","one","our","out","day","get","has","him","his","how","its","may",
  "new","now","old","see","two","who","boy","did","its","let","put","say",
  "she","too","use","been","from","have","here","more","than","that","them",
  "then","they","this","will","with","also","into","just","over","such",
  "their","there","these","which","would","about","after","being","could",
  "every","going","other","should","since","those","under","very","were",
  "what","when","where","while","your","some","come","does","each","even",
  "from","give","keep","know","made","make","most","move","much","only",
  "open","same","take","tell","turn","work","year",
]);

function extractKeywords(text) {
  if (!text || typeof text !== "string") return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));

  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);
}

// ── DynamoDB helpers ───────────────────────────────────────────────────────────
async function queryAllMemories(fid) {
  const items = [];
  let last;
  do {
    const result = await ddb.send(new QueryCommand({
      TableName:                 TABLE,
      KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":prefix": "MEMORY#" },
      ScanIndexForward:          false,
      ExclusiveStartKey:         last,
      Limit:                     500,
    }));
    items.push(...(result.Items || []));
    last = result.LastEvaluatedKey;
  } while (last);
  return items;
}

// ── Route: GET /facility-memory ────────────────────────────────────────────────
async function listMemories(fid, qs) {
  try {
    let items = await queryAllMemories(fid);

    if (qs.type)    items = items.filter(m => m.memory_type === qs.type);
    if (qs.risk)    items = items.filter(m => m.risk_level   === qs.risk);
    if (qs.assetId) items = items.filter(m => m.asset_id     === qs.assetId);
    if (qs.search) {
      const term = qs.search.toLowerCase();
      items = items.filter(m =>
        (m.observation    || "").toLowerCase().includes(term) ||
        (m.lesson_learned || "").toLowerCase().includes(term) ||
        (m.tags           || []).some(t => t.toLowerCase().includes(term)) ||
        (m.keywords       || []).some(k => k.toLowerCase().includes(term))
      );
    }

    return res(200, { memories: items, count: items.length });
  } catch (err) {
    console.error("listMemories:", err);
    return res(500, { message: "Failed to list memories.", detail: err.message });
  }
}

// ── Route: POST /facility-memory ───────────────────────────────────────────────
async function createMemory(fid, body, claims) {
  try {
    if (!body.observation) return res(400, { message: "observation is required" });

    const now       = new Date().toISOString();
    const memoryId  = randomUUID();
    const keywords  = body.keywords?.length
      ? body.keywords
      : extractKeywords(`${body.observation || ""} ${body.lesson_learned || ""}`);

    const item = {
      PK:                 `FACILITY#${fid}`,
      SK:                 `MEMORY#${now}#${memoryId}`,
      memory_id:          memoryId,
      facility_id:        fid,
      asset_id:           body.asset_id           || "",
      memory_type:        body.memory_type         || "observation",
      observation:        body.observation         || "",
      lesson_learned:     body.lesson_learned      || "",
      risk_level:         body.risk_level          || "low",
      author:             body.author              || claims?.sub || claims?.email || "",
      source:             body.source              || "manual_entry",
      source_id:          body.source_id           || "",
      timestamp:          body.timestamp           || now,
      confidence_score:   body.confidence_score    ?? 80,
      tags:               body.tags                || [],
      keywords,
      access_count:       0,
      last_accessed:      null,
      is_tribal_knowledge: body.is_tribal_knowledge === true || body.memory_type === "tribal_knowledge",
      related_memories:   body.related_memories    || [],
      createdAt:          now,
      updatedAt:          now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    return res(201, { success: true, memory_id: memoryId, memory: item });
  } catch (err) {
    console.error("createMemory:", err);
    return res(500, { message: "Failed to create memory.", detail: err.message });
  }
}

// ── Route: GET /facility-memory/scores ────────────────────────────────────────
async function getScores(fid) {
  try {
    const items = await queryAllMemories(fid);
    const total = items.length;

    if (total === 0) {
      return res(200, {
        memory_completeness_score:     0,
        knowledge_retention_score:     0,
        operational_continuity_score:  0,
        total_records:                 0,
      });
    }

    // Memory Completeness Score
    const complete = items.filter(m => m.observation && m.lesson_learned && m.risk_level).length;
    const memoryCompletenessScore = Math.round((complete / total) * 100);

    // Knowledge Retention Score
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const recentCount   = items.filter(m => (m.timestamp || m.createdAt || "") >= ninetyDaysAgo).length;
    const uniqueAssets  = new Set(items.map(m => m.asset_id).filter(Boolean)).size;
    const assetScore    = Math.min(100, uniqueAssets * 5);
    const recencyScore  = Math.round((recentCount / total) * 100);
    const knowledgeRetentionScore = Math.min(100, Math.round((assetScore + recencyScore) / 2));

    // Operational Continuity Score
    const tribalCount       = items.filter(m => m.is_tribal_knowledge).length;
    const withLessonLearned = items.filter(m => m.lesson_learned).length;
    const operationalContinuityScore = Math.min(100, Math.round(
      (tribalCount / total * 40) + (withLessonLearned / total * 60)
    ));

    return res(200, {
      memory_completeness_score:     memoryCompletenessScore,
      knowledge_retention_score:     knowledgeRetentionScore,
      operational_continuity_score:  operationalContinuityScore,
      total_records:                 total,
      complete_records:              complete,
      tribal_knowledge_count:        tribalCount,
      recent_records:                recentCount,
      unique_assets_covered:         uniqueAssets,
    });
  } catch (err) {
    console.error("getScores:", err);
    return res(500, { message: "Failed to compute scores.", detail: err.message });
  }
}

// ── Route: GET /facility-memory/timeline ──────────────────────────────────────
async function getTimeline(fid, qs) {
  try {
    let items = await queryAllMemories(fid);

    // Already sorted desc by SK (MEMORY#timestamp), but re-sort by timestamp field for safety
    items.sort((a, b) => (b.timestamp || b.createdAt || "").localeCompare(a.timestamp || a.createdAt || ""));

    if (qs.limit) items = items.slice(0, parseInt(qs.limit, 10));

    return res(200, { timeline: items, count: items.length });
  } catch (err) {
    console.error("getTimeline:", err);
    return res(500, { message: "Failed to get timeline.", detail: err.message });
  }
}

// ── Route: GET /facility-memory/patterns ──────────────────────────────────────
async function analyzePatterns(fid) {
  try {
    const items = await queryAllMemories(fid);
    const total = items.length;

    // Frequently referenced assets
    const assetCounts = {};
    for (const m of items) {
      if (m.asset_id) assetCounts[m.asset_id] = (assetCounts[m.asset_id] || 0) + 1;
    }
    const topAssets = Object.entries(assetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([asset_id, count]) => ({ asset_id, count }));

    // Repeated keywords
    const keywordCounts = {};
    for (const m of items) {
      for (const kw of (m.keywords || [])) {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
      }
    }
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));

    // Seasonal issues — count memories by month
    const monthCounts = {};
    for (const m of items) {
      const ts = m.timestamp || m.createdAt || "";
      if (ts) {
        const month = ts.slice(5, 7); // "01"-"12"
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    }
    const seasonalPeaks = Object.entries(monthCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([month, count]) => ({ month, count }));

    // Tribal knowledge summary
    const tribalItems  = items.filter(m => m.is_tribal_knowledge);
    const tribalByAsset = {};
    for (const m of tribalItems) {
      if (m.asset_id) tribalByAsset[m.asset_id] = (tribalByAsset[m.asset_id] || 0) + 1;
    }

    return res(200, {
      total_memories:       total,
      top_referenced_assets: topAssets,
      repeated_keywords:    topKeywords,
      seasonal_peaks:       seasonalPeaks,
      tribal_knowledge: {
        count:    tribalItems.length,
        by_asset: tribalByAsset,
        items:    tribalItems.slice(0, 20),
      },
    });
  } catch (err) {
    console.error("analyzePatterns:", err);
    return res(500, { message: "Failed to analyze patterns.", detail: err.message });
  }
}

// ── Route: POST /facility-memory/ingest ───────────────────────────────────────
async function autoIngest(fid) {
  try {
    // Fetch existing source_ids to deduplicate
    const existing = await queryAllMemories(fid);
    const existingSourceIds = new Set(existing.map(m => m.source_id).filter(Boolean));

    // Fetch WorkOrders — best-effort
    let wos = [];
    try {
      const woResult = await ddb.send(new QueryCommand({
        TableName:                 WO_TABLE,
        KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":prefix": "WO#" },
        ScanIndexForward:          false,
        Limit:                     500,
      }));
      wos = woResult.Items || [];
    } catch (woErr) {
      console.warn("autoIngest - WorkOrders fetch error:", woErr.message);
    }

    // Fetch ViolationEvents — best-effort
    let violations = [];
    try {
      const veResult = await ddb.send(new QueryCommand({
        TableName:                 VE_TABLE,
        KeyConditionExpression:    "PK = :pk",
        ExpressionAttributeValues: { ":pk": `FACILITY#${fid}` },
        ScanIndexForward:          false,
        Limit:                     200,
      }));
      violations = veResult.Items || [];
    } catch (veErr) {
      console.warn("autoIngest - ViolationEvents fetch error:", veErr.message);
    }

    let created = 0;
    const now = new Date().toISOString();

    // Map WorkOrders → memories
    for (const wo of wos) {
      const sourceId = wo.workOrderId || wo.SK || "";
      if (!sourceId || existingSourceIds.has(sourceId)) continue;

      const isCritical = (wo.priority || "").toLowerCase() === "critical" ||
                         (wo.status   || "").toLowerCase() === "critical";
      const memType    = isCritical ? "recurring_failure" : "observation";
      const memoryId   = randomUUID();
      const ts         = wo.createdAt || now;
      const text       = `${wo.title || ""} ${wo.description || wo.reason || ""}`;

      const item = {
        PK:                 `FACILITY#${fid}`,
        SK:                 `MEMORY#${ts}#${memoryId}`,
        memory_id:          memoryId,
        facility_id:        fid,
        asset_id:           wo.equipmentId || wo.system || "",
        memory_type:        memType,
        observation:        wo.description || wo.reason || wo.title || "",
        lesson_learned:     "",
        risk_level:         isCritical ? "high" : "medium",
        author:             wo.createdBy || "auto_ingest",
        source:             "work_order",
        source_id:          sourceId,
        timestamp:          ts,
        confidence_score:   70,
        tags:               wo.tags || [],
        keywords:           extractKeywords(text),
        access_count:       0,
        last_accessed:      null,
        is_tribal_knowledge: false,
        related_memories:   [],
        createdAt:          now,
        updatedAt:          now,
      };

      try {
        await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
        existingSourceIds.add(sourceId);
        created++;
      } catch (putErr) {
        console.warn(`autoIngest - PutCommand error for WO ${sourceId}:`, putErr.message);
      }
    }

    // Map ViolationEvents → memories
    for (const v of violations) {
      const sourceId = v.violationId || v.SK || "";
      if (!sourceId || existingSourceIds.has(sourceId)) continue;

      const memoryId = randomUUID();
      const ts       = v.timestamp || v.issuedAt || v.createdAt || now;
      const text     = `${v.type || v.violationType || ""} ${v.description || ""}`;

      const item = {
        PK:                 `FACILITY#${fid}`,
        SK:                 `MEMORY#${ts}#${memoryId}`,
        memory_id:          memoryId,
        facility_id:        fid,
        asset_id:           v.equipmentId || "",
        memory_type:        "compliance_finding",
        observation:        v.description || `${v.type || v.violationType || ""} violation`,
        lesson_learned:     "",
        risk_level:         (v.severityScore || v.severity || 0) >= 7 ? "high" : "medium",
        author:             v.operatorId || "auto_ingest",
        source:             "incident_report",
        source_id:          sourceId,
        timestamp:          ts,
        confidence_score:   75,
        tags:               ["compliance", "violation"],
        keywords:           extractKeywords(text),
        access_count:       0,
        last_accessed:      null,
        is_tribal_knowledge: false,
        related_memories:   [],
        createdAt:          now,
        updatedAt:          now,
      };

      try {
        await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
        existingSourceIds.add(sourceId);
        created++;
      } catch (putErr) {
        console.warn(`autoIngest - PutCommand error for violation ${sourceId}:`, putErr.message);
      }
    }

    return res(200, {
      created,
      work_orders_processed:    wos.length,
      violations_processed:     violations.length,
    });
  } catch (err) {
    console.error("autoIngest:", err);
    return res(500, { message: "Auto-ingest failed.", detail: err.message });
  }
}

// ── Route: GET /facility-memory/{sk} ──────────────────────────────────────────
async function getMemory(fid, skParam) {
  try {
    const sk = decodeURIComponent(skParam);

    const result = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key:       { PK: `FACILITY#${fid}`, SK: sk },
    }));

    if (!result.Item) return res(404, { message: "Memory not found" });

    // Increment access_count + update last_accessed
    try {
      await ddb.send(new UpdateCommand({
        TableName:                 TABLE,
        Key:                       { PK: `FACILITY#${fid}`, SK: sk },
        UpdateExpression:          "SET access_count = if_not_exists(access_count, :zero) + :one, last_accessed = :now",
        ExpressionAttributeValues: { ":one": 1, ":zero": 0, ":now": new Date().toISOString() },
      }));
    } catch (updateErr) {
      console.warn("getMemory - access_count update error:", updateErr.message);
    }

    return res(200, { memory: result.Item });
  } catch (err) {
    console.error("getMemory:", err);
    return res(500, { message: "Failed to get memory.", detail: err.message });
  }
}

// ── Route: PATCH /facility-memory/{sk} ────────────────────────────────────────
async function updateMemory(fid, skParam, body) {
  try {
    const sk  = decodeURIComponent(skParam);
    const now = new Date().toISOString();

    const setExprs = ["updatedAt = :now"];
    const vals     = { ":now": now };

    if (body.observation        !== undefined) { setExprs.push("observation = :obs");               vals[":obs"]    = body.observation; }
    if (body.lesson_learned     !== undefined) { setExprs.push("lesson_learned = :ll");             vals[":ll"]     = body.lesson_learned; }
    if (body.risk_level         !== undefined) { setExprs.push("risk_level = :rl");                 vals[":rl"]     = body.risk_level; }
    if (body.memory_type        !== undefined) { setExprs.push("memory_type = :mt");                vals[":mt"]     = body.memory_type; }
    if (body.asset_id           !== undefined) { setExprs.push("asset_id = :aid");                  vals[":aid"]    = body.asset_id; }
    if (body.confidence_score   !== undefined) { setExprs.push("confidence_score = :cs");           vals[":cs"]     = body.confidence_score; }
    if (body.tags               !== undefined) { setExprs.push("tags = :tags");                     vals[":tags"]   = body.tags; }
    if (body.keywords           !== undefined) { setExprs.push("keywords = :kw");                   vals[":kw"]     = body.keywords; }
    if (body.is_tribal_knowledge !== undefined) { setExprs.push("is_tribal_knowledge = :itk");     vals[":itk"]    = body.is_tribal_knowledge; }
    if (body.related_memories   !== undefined) { setExprs.push("related_memories = :rm");           vals[":rm"]     = body.related_memories; }

    await ddb.send(new UpdateCommand({
      TableName:                 TABLE,
      Key:                       { PK: `FACILITY#${fid}`, SK: sk },
      UpdateExpression:          "SET " + setExprs.join(", "),
      ExpressionAttributeValues: vals,
    }));

    return res(200, { success: true });
  } catch (err) {
    console.error("updateMemory:", err);
    return res(500, { message: "Failed to update memory.", detail: err.message });
  }
}

// ── Route: DELETE /facility-memory/{sk} ───────────────────────────────────────
async function deleteMemory(fid, skParam) {
  try {
    const sk = decodeURIComponent(skParam);
    await ddb.send(new DeleteCommand({
      TableName: TABLE,
      Key:       { PK: `FACILITY#${fid}`, SK: sk },
    }));
    return res(204, {});
  } catch (err) {
    console.error("deleteMemory:", err);
    return res(500, { message: "Failed to delete memory.", detail: err.message });
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);
  const pp     = event.pathParameters || {};
  const qs     = event.queryStringParameters || {};

  if (method === "OPTIONS") return res(200, {});

  const claims = getClaims(event);
  if (!claims) return res(401, { message: "Unauthorized" });

  const fid = getFid(claims);

  try {
    // Fixed sub-routes first (before param route)
    if (method === "GET"  && (path.endsWith("/facility-memory/scores")  || path.includes("/facility-memory/scores")))
      return await getScores(fid);

    if (method === "GET"  && (path.endsWith("/facility-memory/timeline") || path.includes("/facility-memory/timeline")))
      return await getTimeline(fid, qs);

    if (method === "GET"  && (path.endsWith("/facility-memory/patterns") || path.includes("/facility-memory/patterns")))
      return await analyzePatterns(fid);

    if (method === "POST" && (path.endsWith("/facility-memory/ingest")   || path.includes("/facility-memory/ingest")))
      return await autoIngest(fid);

    // Collection routes
    if (method === "GET"  && (path.endsWith("/facility-memory") || path.includes("/facility-memory?")))
      return await listMemories(fid, qs);

    if (method === "POST" && path.endsWith("/facility-memory"))
      return await createMemory(fid, parseBody(event), claims);

    // Item routes — extract SK from path or pathParameters
    const skFromPath = path.split("/facility-memory/")[1]?.split("?")[0];
    const skParam    = pp.sk || skFromPath;

    if (skParam) {
      if (method === "GET")    return await getMemory(fid, skParam);
      if (method === "PATCH")  return await updateMemory(fid, skParam, parseBody(event));
      if (method === "DELETE") return await deleteMemory(fid, skParam);
    }

    return res(404, { message: "Route not found", path, method });
  } catch (err) {
    console.error("fi-facility-memory error:", err);
    return res(500, { message: "Internal error", detail: err.message });
  }
};
