import { DynamoDBClient }                          from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         PutCommand, GetCommand }                  from "@aws-sdk/lib-dynamodb";

const ddb        = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const OBS_TABLE  = process.env.OBS_TABLE    || "ObservationJournal";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "ObservationEvents";

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

function newObsId() {
  return `obs-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function newEventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function parseBody(event) {
  let raw = event.body || "{}";
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
  try { return JSON.parse(raw); } catch { return {}; }
}

// ── Scoring Engine ─────────────────────────────────────────────────────────────
function computeScores(obs, events) {
  const eventTypes = new Set((events || []).map(e => e.eventType));

  // integrityScore
  const integrityFields = [
    "originalText", "systemType", "department", "assetId",
    "location", "reporterName", "originalSeverity",
  ];
  const fieldsFilled = integrityFields.filter(f => obs[f] !== undefined && obs[f] !== null && obs[f] !== "").length;
  let integrityScore = (fieldsFilled / 7) * 85;
  const hasEvidence =
    (obs.originalPhotos?.length > 0 ? 1 : 0) +
    (obs.originalDocuments?.length > 0 ? 1 : 0) +
    (obs.originalSensorReadings && Object.keys(obs.originalSensorReadings || {}).length > 0 ? 1 : 0);
  integrityScore = Math.min(100, integrityScore + (hasEvidence / 3) * 15);

  // chainOfCustodyScore
  const custodyStages = ["validated", "escalated", "assigned", "action", "verified", "closed"];
  const stagesPresent = custodyStages.filter(s => eventTypes.has(s)).length;
  const chainOfCustodyScore = (stagesPresent / 6) * 100;

  // validationScore
  let validationScore = 0;
  const validatedEvent = (events || []).find(e => e.eventType === "validated");
  if (validatedEvent) {
    const obsTs  = new Date(obs.observationTimestamp || obs.createdAt).getTime();
    const valTs  = new Date(validatedEvent.timestamp).getTime();
    const hoursElapsed = (valTs - obsTs) / 3600000;
    if (hoursElapsed <= 4)       validationScore = 100;
    else if (hoursElapsed <= 24) validationScore = 85;
    else if (hoursElapsed <= 72) validationScore = 60;
    else                         validationScore = 40;
  }

  // escalationScore
  let escalationScore = 100;
  const severity = obs.originalSeverity || 0;
  const hasEscalation = eventTypes.has("escalated");
  if (severity >= 6 && !hasEscalation) escalationScore = 30;
  else if (hasEscalation)              escalationScore = 90;

  // ownershipScore
  const ownershipScore = eventTypes.has("assigned") ? 100 : 20;

  // correctiveActionScore
  const correctiveActionScore = eventTypes.has("action") ? 100 : 0;

  // verificationScore
  let verificationScore = 0;
  if (eventTypes.has("verified"))     verificationScore = 100;
  else if (eventTypes.has("action"))  verificationScore = 30;

  // decisionDefensibilityScore
  const decisionDefensibilityScore =
    integrityScore     * 0.25 +
    chainOfCustodyScore * 0.20 +
    validationScore    * 0.15 +
    ownershipScore     * 0.15 +
    correctiveActionScore * 0.15 +
    verificationScore  * 0.10;

  // operationalContinuityScore
  const reopenCount = (events || []).filter(e => e.eventType === "reopened").length;
  const operationalContinuityScore = Math.max(0, 100 - reopenCount * 20);

  // facilityIntelligenceScore
  const facilityIntelligenceScore =
    decisionDefensibilityScore * 0.40 +
    integrityScore             * 0.30 +
    operationalContinuityScore * 0.30;

  return {
    integrityScore:              Math.round(integrityScore),
    chainOfCustodyScore:         Math.round(chainOfCustodyScore),
    validationScore:             Math.round(validationScore),
    escalationScore:             Math.round(escalationScore),
    ownershipScore:              Math.round(ownershipScore),
    correctiveActionScore:       Math.round(correctiveActionScore),
    verificationScore:           Math.round(verificationScore),
    decisionDefensibilityScore:  Math.round(decisionDefensibilityScore),
    operationalContinuityScore:  Math.round(operationalContinuityScore),
    facilityIntelligenceScore:   Math.round(facilityIntelligenceScore),
  };
}

// ── Timeline Builder ───────────────────────────────────────────────────────────
const EVENT_TITLES = {
  created:   "Observation Created",
  validated: "Observation Validated",
  escalated: "Escalated",
  assigned:  "Ownership Assigned",
  action:    "Corrective Action Recorded",
  verified:  "Action Verified",
  closed:    "Observation Closed",
  reopened:  "Observation Reopened",
  amended:   "Record Amended",
};

function buildTimeline(obs, events) {
  const timeline = [];

  timeline.push({
    timestamp: obs.observationTimestamp || obs.createdAt,
    eventType: "created",
    title:     "Observation Created",
    actor:     obs.reporterName || "Unknown",
    role:      obs.reporterRole || "",
    summary:   obs.originalText
      ? `Observation recorded: "${obs.originalText.substring(0, 120)}${obs.originalText.length > 120 ? "..." : ""}"`
      : "Original observation recorded.",
    eventId:   obs.observationId,
  });

  const sorted = [...(events || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const evt of sorted) {
    const entry = {
      timestamp: evt.timestamp,
      eventType: evt.eventType,
      title:     EVENT_TITLES[evt.eventType] || evt.eventType,
      actor:     evt.actor || "Unknown",
      role:      evt.actorRole || "",
      summary:   evt.summary || evt.notes || "",
      eventId:   evt.eventId,
    };
    if (evt.evidence) entry.evidence = evt.evidence;
    timeline.push(entry);
  }

  return timeline;
}

// ── Fetch all events for an observation ───────────────────────────────────────
async function fetchEvents(obsId) {
  const result = await ddb.send(new QueryCommand({
    TableName:                 EVENTS_TABLE,
    KeyConditionExpression:    "PK = :pk",
    ExpressionAttributeValues: { ":pk": `OBS#${obsId}` },
    ScanIndexForward:          true,
  }));
  return result.Items || [];
}

// ── Immutable fields for amend ─────────────────────────────────────────────────
const IMMUTABLE_FIELDS = new Set([
  "originalText", "originalPhotos", "originalVideos", "originalAudio",
  "originalDocuments", "originalAttachments", "originalSensorReadings",
  "originalBMSData", "originalEnvironmentalConditions", "originalSeverity",
  "originalRisk", "createdAt", "observationId", "facilityId",
  "reporterUserId", "PK", "SK",
]);

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const fid = facilityId(claims);
  const pk  = `FACILITY#${fid}`;

  // ── POST /observations/ai-summary ─────────────────────────────────────────
  if (method === "POST" && path.endsWith("/observations/ai-summary")) {
    const body = parseBody(event);
    const { observation, events: evts, scores } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return json(500, { message: "ANTHROPIC_API_KEY not configured" });

    const timeline = buildTimeline(observation || {}, evts || []);
    const timelineText = timeline
      .map(t => `[${t.timestamp}] ${t.title} — ${t.actor}${t.role ? ` (${t.role})` : ""}: ${t.summary}`)
      .join("\n");

    const systemPrompt = `You are an Observation Journal Analyst for the Nexum Suum Facility Intelligence platform. Your role is to synthesize facility observation records into clear, defensible operational narratives. Focus on decision defensibility, chain of custody integrity, and operational risk. Be concise and professional.`;

    const userPrompt = `Provide a narrative summary of the following observation record.

OBSERVATION DETAILS:
- ID: ${observation?.observationId || "N/A"}
- System: ${observation?.systemType || "N/A"} | Department: ${observation?.department || "N/A"}
- Location: ${observation?.building || ""}/${observation?.area || ""}
- Severity: ${observation?.originalSeverity || "N/A"} | Risk: ${observation?.originalRisk || "N/A"}
- Status: ${observation?.status || "N/A"}
- Original Text: ${observation?.originalText || "N/A"}

SCORES:
- Decision Defensibility: ${scores?.decisionDefensibilityScore ?? "N/A"}
- Facility Intelligence: ${scores?.facilityIntelligenceScore ?? "N/A"}
- Chain of Custody: ${scores?.chainOfCustodyScore ?? "N/A"}
- Integrity: ${scores?.integrityScore ?? "N/A"}

TIMELINE:
${timelineText || "No events recorded."}

Provide a 3-5 sentence narrative covering: what was observed, how it was handled, the defensibility of the record, and any notable gaps or strengths.`;

    try {
      const ar = await fetch("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: {
          "x-api-key":         apiKey,
          "anthropic-version": "2023-06-01",
          "content-type":      "application/json",
        },
        body: JSON.stringify({
          model:      "claude-sonnet-4-6",
          max_tokens: 800,
          system:     systemPrompt,
          messages:   [{ role: "user", content: userPrompt }],
        }),
      });

      if (!ar.ok) {
        const errText = await ar.text();
        return json(502, { message: "AI service error", detail: errText });
      }
      const result = await ar.json();
      const narrative = result.content?.[0]?.text || "";
      return json(200, { narrative });
    } catch (err) {
      return json(500, { message: "AI summary failed", detail: err.message });
    }
  }

  // ── POST /observations — create ────────────────────────────────────────────
  if (method === "POST" && path.endsWith("/observations")) {
    const body = parseBody(event);
    const now   = new Date().toISOString();
    const obsId = newObsId();
    const sk    = `OBS#${now}#${obsId}`;

    const item = {
      PK:                          pk,
      SK:                          sk,
      observationId:               obsId,
      facilityId:                  fid,
      organizationId:              body.organizationId              || "",
      assetId:                     body.assetId                     || "",
      equipmentId:                 body.equipmentId                 || "",
      locationId:                  body.locationId                  || "",
      systemType:                  body.systemType                  || "",
      department:                  body.department                  || "",
      building:                    body.building                    || "",
      area:                        body.area                        || "",
      reporterName:                body.reporterName                || claims?.name || claims?.email || "",
      reporterUserId:              body.reporterUserId              || claims?.sub  || "",
      reporterRole:                body.reporterRole                || claims?.["custom:role"] || "",
      reporterOrganization:        body.reporterOrganization        || "",
      observationTimestamp:        body.observationTimestamp        || now,
      observationSource:           body.observationSource           || "manual",
      originalText:                body.originalText                || "",
      originalPhotos:              body.originalPhotos              || [],
      originalVideos:              body.originalVideos              || [],
      originalAudio:               body.originalAudio               || [],
      originalDocuments:           body.originalDocuments           || [],
      originalAttachments:         body.originalAttachments         || [],
      originalSensorReadings:      body.originalSensorReadings      || {},
      originalBMSData:             body.originalBMSData             || {},
      originalEnvironmentalConditions: body.originalEnvironmentalConditions || {},
      originalSeverity:            body.originalSeverity            ?? null,
      originalRisk:                body.originalRisk                ?? null,
      status:                      "open",
      currentSeverity:             body.currentSeverity             ?? body.originalSeverity ?? null,
      assignedTo:                  null,
      linkedWorkOrders:            [],
      linkedViolations:            [],
      linkedRiskAcceptances:       [],
      linkedVendorActions:         [],
      createdAt:                   now,
      updatedAt:                   now,
      tags:                        body.tags                        || [],
      priority:                    body.priority                    || "normal",
    };

    try {
      await ddb.send(new PutCommand({ TableName: OBS_TABLE, Item: item }));
      return json(200, { success: true, observationId: obsId, SK: sk, observation: item });
    } catch (err) {
      console.error("POST /observations:", err);
      return json(500, { message: "Failed to create observation.", detail: err.message });
    }
  }

  // ── GET /observations — list ───────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/observations") || path.includes("/observations?"))) {
    try {
      const qs       = event.queryStringParameters || {};
      const limit    = Math.min(parseInt(qs.limit || "50"), 200);
      const status   = qs.status;
      const dateFrom = qs.dateFrom;
      const dateTo   = qs.dateTo;

      const params = {
        TableName:                 OBS_TABLE,
        KeyConditionExpression:    "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": pk, ":prefix": "OBS#" },
        ScanIndexForward:          false,
        Limit:                     limit,
      };

      const filters = [];
      const names   = {};

      if (status) {
        filters.push("#st = :status");
        names["#st"] = "status";
        params.ExpressionAttributeValues[":status"] = status;
      }
      if (dateFrom) {
        filters.push("observationTimestamp >= :dateFrom");
        params.ExpressionAttributeValues[":dateFrom"] = dateFrom;
      }
      if (dateTo) {
        filters.push("observationTimestamp <= :dateTo");
        params.ExpressionAttributeValues[":dateTo"] = dateTo;
      }

      if (filters.length > 0) {
        params.FilterExpression = filters.join(" AND ");
        if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;
      }

      const result = await ddb.send(new QueryCommand(params));
      return json(200, { observations: result.Items || [], count: (result.Items || []).length });
    } catch (err) {
      console.error("GET /observations:", err);
      return json(500, { message: "Failed to list observations.", detail: err.message });
    }
  }

  // ── Routes with /{sk} ─────────────────────────────────────────────────────
  if (path.includes("/observations/")) {
    const afterPrefix = path.split("/observations/")[1] || "";
    const segments    = afterPrefix.split("/");
    const encodedSK   = segments[0];
    const action      = segments[1] || null;
    const sk          = decodeURIComponent(encodedSK);

    // ── GET /observations/{sk}/score ────────────────────────────────────────
    if (method === "GET" && action === "score") {
      try {
        const getResult = await ddb.send(new GetCommand({ TableName: OBS_TABLE, Key: { PK: pk, SK: sk } }));
        if (!getResult.Item) return json(404, { message: "Observation not found" });
        const obs    = getResult.Item;
        const events = await fetchEvents(obs.observationId);
        const scores = computeScores(obs, events);
        return json(200, scores);
      } catch (err) {
        console.error("GET /observations/{sk}/score:", err);
        return json(500, { message: "Failed to get score.", detail: err.message });
      }
    }

    // ── GET /observations/{sk} ──────────────────────────────────────────────
    if (method === "GET" && !action) {
      try {
        const getResult = await ddb.send(new GetCommand({ TableName: OBS_TABLE, Key: { PK: pk, SK: sk } }));
        if (!getResult.Item) return json(404, { message: "Observation not found" });
        const obs      = getResult.Item;
        const events   = await fetchEvents(obs.observationId);
        const scores   = computeScores(obs, events);
        const timeline = buildTimeline(obs, events);
        return json(200, { observation: obs, events, timeline, scores });
      } catch (err) {
        console.error("GET /observations/{sk}:", err);
        return json(500, { message: "Failed to get observation.", detail: err.message });
      }
    }

    // ── POST /observations/{sk}/amend ───────────────────────────────────────
    if (method === "POST" && action === "amend") {
      const body = parseBody(event);
      const { field, correctedValue, reason, notes } = body;

      if (!field || correctedValue === undefined || !reason) {
        return json(400, { message: "field, correctedValue, and reason are required" });
      }
      if (IMMUTABLE_FIELDS.has(field)) {
        return json(400, { message: `Field "${field}" is immutable and cannot be amended.` });
      }

      try {
        const getResult = await ddb.send(new GetCommand({ TableName: OBS_TABLE, Key: { PK: pk, SK: sk } }));
        if (!getResult.Item) return json(404, { message: "Observation not found" });
        const obs           = getResult.Item;
        const originalValue = obs[field];
        const now           = new Date().toISOString();

        const updated = { ...obs, [field]: correctedValue, updatedAt: now };
        await ddb.send(new PutCommand({ TableName: OBS_TABLE, Item: updated }));

        const eventId = newEventId();
        const eventItem = {
          PK:            `OBS#${obs.observationId}`,
          SK:            `EVENT#amended#${now}#${eventId}`,
          eventId,
          observationId: obs.observationId,
          eventType:     "amended",
          timestamp:     now,
          actor:         claims?.name || claims?.email || "Unknown",
          actorRole:     claims?.["custom:role"] || "",
          title:         "Record Amended",
          summary:       `Field "${field}" amended. Reason: ${reason}`,
          notes:         notes || "",
          originalValue,
          correctedValue,
          field,
          reason,
        };
        await ddb.send(new PutCommand({ TableName: EVENTS_TABLE, Item: eventItem }));
        return json(200, { success: true, originalValue, event: eventItem });
      } catch (err) {
        console.error("POST /observations/{sk}/amend:", err);
        return json(500, { message: "Failed to amend observation.", detail: err.message });
      }
    }

    // ── Lifecycle event POSTs ────────────────────────────────────────────────
    if (method === "POST" && action) {
      const LIFECYCLE_ACTIONS = {
        validate: { eventType: "validated", statusTo: "validated",   title: "Observation Validated" },
        escalate: { eventType: "escalated", statusTo: "escalated",   title: "Escalated" },
        assign:   { eventType: "assigned",  statusTo: "assigned",    title: "Ownership Assigned" },
        action:   { eventType: "action",    statusTo: "in-progress", title: "Corrective Action Recorded" },
        verify:   { eventType: "verified",  statusTo: "verified",    title: "Action Verified" },
        close:    { eventType: "closed",    statusTo: "closed",      title: "Observation Closed" },
        reopen:   { eventType: "reopened",  statusTo: "open",        title: "Observation Reopened" },
      };

      const def = LIFECYCLE_ACTIONS[action];
      if (!def) return json(404, { message: "Route not found" });

      const body = parseBody(event);
      const now  = new Date().toISOString();

      try {
        const getResult = await ddb.send(new GetCommand({ TableName: OBS_TABLE, Key: { PK: pk, SK: sk } }));
        if (!getResult.Item) return json(404, { message: "Observation not found" });
        const obs = getResult.Item;

        const updated = { ...obs, status: def.statusTo, updatedAt: now };
        if (action === "assign" && body.assignedTo) updated.assignedTo = body.assignedTo;
        await ddb.send(new PutCommand({ TableName: OBS_TABLE, Item: updated }));

        const eventId   = newEventId();
        let summary = body.notes || body.reason || body.resolution || body.actionDescription || "";
        if (action === "escalate" && body.reason) summary = `Escalated to ${body.escalateTo || ""}. Reason: ${body.reason}`;
        if (action === "assign"   && body.assignedTo) summary = `Assigned to ${body.assignedTo}${body.assignedToRole ? ` (${body.assignedToRole})` : ""}. ${body.notes || ""}`;
        if (action === "action"   && body.actionDescription) summary = body.actionDescription;
        if (action === "verify")  summary = `Verification method: ${body.verificationMethod || ""}. Passed: ${body.passed !== false ? "Yes" : "No"}. ${body.notes || ""}`;
        if (action === "close")   summary = `Resolution: ${body.resolution || ""}. ${body.notes || ""}`;
        if (action === "reopen")  summary = `Reopened. Reason: ${body.reason || ""}`;
        if (action === "validate") summary = `Validated via ${body.validationMethod || "inspection"}. ${body.notes || ""}`;

        const eventItem = {
          PK:            `OBS#${obs.observationId}`,
          SK:            `EVENT#${def.eventType}#${now}#${eventId}`,
          eventId,
          observationId: obs.observationId,
          eventType:     def.eventType,
          timestamp:     now,
          actor:         claims?.name || claims?.email || "Unknown",
          actorRole:     claims?.["custom:role"] || "",
          title:         def.title,
          summary,
          notes:         body.notes || "",
          evidence:      body.evidence || null,
          ...body,
        };
        delete eventItem.notes;
        eventItem.notes = body.notes || "";

        await ddb.send(new PutCommand({ TableName: EVENTS_TABLE, Item: eventItem }));
        return json(200, { success: true, event: eventItem });
      } catch (err) {
        console.error(`POST /observations/{sk}/${action}:`, err);
        return json(500, { message: `Failed to ${action} observation.`, detail: err.message });
      }
    }
  }

  return json(404, { message: "Route not found" });
};
