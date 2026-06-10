// ── Nexum Suum — Decision Continuity™ Vault & Admissibility Engine™ ──────────
// Single table: NexumDCVault
// Routes:
//   GET    /dc-vault                              → list chains
//   GET    /dc-vault/stats                        → facility aggregate metrics
//   GET    /dc-vault/{chainId}                    → chain + all signals
//   POST   /dc-vault                              → create chain
//   POST   /dc-vault/{chainId}/signals            → append signal
//   PATCH  /dc-vault/{chainId}/signals/{sigId}    → add interpretation

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { createHash } from "crypto";

// ── Constants ─────────────────────────────────────────────────────────────────

const REGION = process.env.AWS_REGION ?? "us-east-2";
const TABLE  = process.env.TABLE ?? "NexumDCVault";
const TTL_DAYS = 365 * 3; // 3-year retention

const PHASES = [
  "observation",
  "assessment",
  "authorization",
  "execution",
  "outcome",
  "validation",
  "lessons_learned",
];

const db = new DynamoDBClient({ region: REGION });

// ── Utility helpers ───────────────────────────────────────────────────────────

const ok  = (body, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

const err = (msg, status = 400) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify({ error: msg }),
});

const ttlEpoch = () => Math.floor(Date.now() / 1000) + TTL_DAYS * 86400;

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const sha256 = (...parts) =>
  createHash("sha256").update(parts.join("||")).digest("hex");

/** Pull facilityId from JWT claims in order of preference. */
const facilityFromClaims = (claims = {}) =>
  claims["custom:facilityId"] ||
  claims["custom:orgId"] ||
  "facility-001";

// ── Auto-normalizer ───────────────────────────────────────────────────────────

const ASSET_PATTERNS = [
  { re: /chiller/i,     cat: "Chiller" },
  { re: /boiler/i,      cat: "Boiler" },
  { re: /pump/i,        cat: "Pump" },
  { re: /hvac|air.?handler|ahu|rtu/i, cat: "HVAC" },
  { re: /electrical|panel|breaker|transformer/i, cat: "Electrical" },
];

const RISK_PATTERNS = [
  { re: /safety|hazard|injury|spill|leak|fire|emerg/i,    cat: "Safety" },
  { re: /compli|regulat|osha|permit|inspection/i,         cat: "Compliance" },
  { re: /energy|utility|kw|kwh|consumption|efficiency/i,  cat: "Energy" },
  { re: /operat|routine|schedule|maintenance|pm/i,        cat: "Operational" },
];

const VIOLATION_PATTERNS = [
  { re: /therm|temp|heat|cool|overh/i,             type: "Thermal" },
  { re: /press|psi|bar|vacuum/i,                   type: "Pressure" },
  { re: /fluid|oil|water|coolant|refrigerant/i,    type: "Fluid" },
  { re: /vibrat|noise|bearing|gear|shaft/i,        type: "Mechanical" },
  { re: /current|voltage|amp|short|circuit|arc/i,  type: "Electrical" },
];

const WO_PATTERNS = [
  { re: /replac|swap|install/i,   type: "Replacement" },
  { re: /repair|fix|restore/i,    type: "Repair" },
  { re: /inspect|check|survey/i,  type: "Inspection" },
  { re: /pm|preventive|service/i, type: "Preventive Maintenance" },
  { re: /emerg|urgent|critical/i, type: "Emergency" },
];

const COMPLIANCE_PATTERNS = [
  { re: /osha/i,   cat: "OSHA" },
  { re: /epa/i,    cat: "EPA" },
  { re: /fire/i,   cat: "Fire Code" },
  { re: /nfpa/i,   cat: "NFPA" },
  { re: /ibc|building.?code/i, cat: "Building Code" },
];

function matchFirst(patterns, text) {
  for (const { re, cat, type } of patterns) {
    if (re.test(text)) return cat ?? type;
  }
  return null;
}

function autoNormalize(rawContent = "") {
  const t = rawContent;
  return {
    assetCategory:      matchFirst(ASSET_PATTERNS, t)      ?? "General",
    riskCategory:       matchFirst(RISK_PATTERNS, t)       ?? "Operational",
    violationType:      matchFirst(VIOLATION_PATTERNS, t)  ?? null,
    workOrderType:      matchFirst(WO_PATTERNS, t)         ?? "General",
    complianceCategory: matchFirst(COMPLIANCE_PATTERNS, t) ?? null,
  };
}

// ── Metrics computation ───────────────────────────────────────────────────────

/**
 * Recomputes all chain metrics from the chain item and its signals.
 * signals: array of unmarshalled signal items.
 */
function computeMetrics(chain, signals) {
  const totalSignals = signals.length;

  // knowledgePreservationScore: unique phases represented / 7 * 100
  const phasesRepresented = new Set(signals.map((s) => s.signalType)).size;
  const knowledgePreservationScore = Math.round((phasesRepresented / PHASES.length) * 100);

  // authorizationQuality
  const authSig = signals.find((s) => s.signalType === "authorization");
  let authorizationQuality = 0;
  if (authSig) {
    authorizationQuality = 40;
    if ((authSig.rawContent ?? "").length > 30) authorizationQuality += 20;
    if (authSig.admissibilityStatus === "normalized" || authSig.admissibilityStatus === "interpreted") authorizationQuality += 20;
    if (authSig.admissibilityStatus === "interpreted") authorizationQuality += 20;
  }

  // assessmentAccuracy / decisionAccuracyRate from outcome signal
  const outcomeSig = signals.find((s) => s.signalType === "outcome");
  let assessmentAccuracy = null;
  if (outcomeSig) {
    const match = outcomeSig.assessmentOutcomeMatch;
    if (match === "yes")         assessmentAccuracy = 100;
    else if (match === "partially") assessmentAccuracy = 55;
    else if (match === "no")     assessmentAccuracy = 0;
    // null stays null
  }
  const decisionAccuracyRate = assessmentAccuracy;

  // repeatFailureRisk
  const repeatCount = chain.repeatCount ?? 0;
  const repeatFailureRisk = Math.min(100, repeatCount * 25);

  // admissibilityRate: interpreted signals / total
  const interpretedCount = signals.filter(
    (s) => s.admissibilityStatus === "interpreted"
  ).length;
  const admissibilityRate =
    totalSignals > 0 ? Math.round((interpretedCount / totalSignals) * 100) : 0;

  return {
    knowledgePreservationScore,
    authorizationQuality,
    assessmentAccuracy,
    decisionAccuracyRate,
    repeatFailureRisk,
    admissibilityRate,
  };
}

// ── DynamoDB helpers ──────────────────────────────────────────────────────────

async function getItem(PK, SK) {
  const res = await db.send(
    new GetItemCommand({ TableName: TABLE, Key: marshall({ PK, SK }) })
  );
  return res.Item ? unmarshall(res.Item) : null;
}

async function queryItems(PK, skPrefix) {
  const params = {
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: marshall({
      ":pk":     PK,
      ":prefix": skPrefix,
    }),
  };
  const res = await db.send(new QueryCommand(params));
  return (res.Items ?? []).map(unmarshall);
}

async function putItem(item) {
  await db.send(new PutItemCommand({ TableName: TABLE, Item: marshall(item, { removeUndefinedValues: true }) }));
}

// ── Route handlers ────────────────────────────────────────────────────────────

// GET /dc-vault — list chains for a facility
async function listChains(facilityId) {
  const PK = `FACILITY#${facilityId}`;
  const items = await queryItems(PK, "CHAIN#");
  // Sort newest first
  items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return ok({ chains: items });
}

// GET /dc-vault/stats — aggregate metrics for a facility
async function getStats(facilityId) {
  const PK = `FACILITY#${facilityId}`;
  const chains = await queryItems(PK, "CHAIN#");

  const totalChains    = chains.length;
  const activeChains   = chains.filter((c) => c.status === "active").length;
  const completeChains = chains.filter((c) => c.status === "complete").length;
  const admissibleChains = chains.filter((c) => c.admissibilityVerified).length;

  // avgKPS
  const kpsValues = chains
    .map((c) => c.metrics?.knowledgePreservationScore)
    .filter((v) => v != null);
  const avgKPS =
    kpsValues.length > 0
      ? Math.round(kpsValues.reduce((a, b) => a + b, 0) / kpsValues.length)
      : null;

  // avgDAR
  const darValues = chains
    .map((c) => c.metrics?.decisionAccuracyRate)
    .filter((v) => v != null);
  const avgDAR =
    darValues.length > 0
      ? Math.round(darValues.reduce((a, b) => a + b, 0) / darValues.length)
      : null;

  // totalSignals + signalsByType — query all signals across all chains
  let totalSignals = 0;
  const signalsByType = {};
  for (const chain of chains) {
    const sigs = await queryItems(PK, `SIG#${chain.id}#`);
    totalSignals += sigs.length;
    for (const s of sigs) {
      const t = s.signalType ?? "unknown";
      signalsByType[t] = (signalsByType[t] ?? 0) + 1;
    }
  }

  return ok({
    totalChains,
    activeChains,
    completeChains,
    admissibleChains,
    avgKPS,
    avgDAR,
    totalSignals,
    signalsByType,
  });
}

// GET /dc-vault/{chainId} — get chain + all signals
async function getChain(facilityId, chainId) {
  const PK = `FACILITY#${facilityId}`;
  const chain = await getItem(PK, `CHAIN#${chainId}`);
  if (!chain) return err("Chain not found", 404);

  const signals = await queryItems(PK, `SIG#${chainId}#`);
  signals.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

  return ok({ chain, signals });
}

// POST /dc-vault — create chain
async function createChain(facilityId, body, actor, actorRole) {
  const {
    title,
    sourceType = "manual",
    sourceId   = null,
    description = "",
    repeatCount = 0,
  } = body ?? {};

  if (!title) return err("title is required");

  const id        = uid();
  const now       = new Date().toISOString();
  const PK        = `FACILITY#${facilityId}`;
  const SK        = `CHAIN#${id}`;

  const chain = {
    PK,
    SK,
    id,
    facilityId,
    title,
    sourceType,
    sourceId,
    description,
    phases:               {},
    signalCount:          0,
    headHash:             null,
    lastSignalId:         null,
    repeatCount,
    metrics: {
      knowledgePreservationScore: 0,
      authorizationQuality:       0,
      assessmentAccuracy:         null,
      decisionAccuracyRate:       null,
      repeatFailureRisk:          Math.min(100, repeatCount * 25),
      admissibilityRate:          0,
    },
    admissibilityVerified: false,
    status:               "active",
    createdAt:            now,
    updatedAt:            now,
    createdBy:            actor,
    TTL:                  ttlEpoch(),
  };

  await putItem(chain);
  return ok({ chain }, 201);
}

// POST /dc-vault/{chainId}/signals — append signal
async function appendSignal(facilityId, chainId, body, actor, actorRole) {
  const PK = `FACILITY#${facilityId}`;

  // Load chain
  const chain = await getItem(PK, `CHAIN#${chainId}`);
  if (!chain) return err("Chain not found", 404);

  const {
    signalType,
    sourceType      = "manual",
    sourceId        = null,
    rawContent,
    recordedAt      = new Date().toISOString(),
    assetId         = null,
    assetName       = null,
    department      = null,
    building        = null,
    area            = null,
    assessmentOutcomeMatch = null,
  } = body ?? {};

  if (!signalType) return err("signalType is required");
  if (!rawContent) return err("rawContent is required");
  if (!PHASES.includes(signalType)) {
    return err(`signalType must be one of: ${PHASES.join(", ")}`);
  }

  const sigId  = uid();
  const now    = new Date().toISOString();

  // Chain-of-custody hashing
  const contentHash  = sha256(rawContent, actor, recordedAt);
  const prevChainHash = chain.headHash ?? "GENESIS";
  const chainHash    = sha256(contentHash, prevChainHash);

  // Auto-normalize
  const normalized = autoNormalize(rawContent);

  const signal = {
    PK,
    SK:           `SIG#${chainId}#${sigId}`,
    id:           sigId,
    facilityId,
    chainId,
    signalType,
    sourceType,
    sourceId,
    // Immutable raw layer
    rawContent,
    actor,
    actorRole,
    recordedAt,
    assetId,
    assetName,
    department,
    building,
    area,
    // Chain of custody
    contentHash,
    prevSignalId:  chain.lastSignalId ?? null,
    prevChainHash,
    chainHash,
    // Normalization layer (auto-applied)
    normalized,
    // Interpretation layer (empty at ingest)
    interpretation: null,
    assessmentOutcomeMatch,
    admissibilityStatus: "normalized",
    createdAt: now,
    TTL:        ttlEpoch(),
  };

  await putItem(signal);

  // Load all signals to recompute metrics
  const allSignals = await queryItems(PK, `SIG#${chainId}#`);
  allSignals.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

  // Build phases map: signalType → most-recent sigId
  const phasesMap = {};
  for (const s of allSignals) {
    phasesMap[s.signalType] = s.id;
  }

  const metrics = computeMetrics(chain, allSignals);

  // Update chain
  const updatedChain = {
    ...chain,
    phases:      phasesMap,
    signalCount: allSignals.length,
    headHash:    chainHash,
    lastSignalId: sigId,
    metrics,
    updatedAt:   now,
  };
  await putItem(updatedChain);

  return ok({ signal, chain: updatedChain }, 201);
}

// PATCH /dc-vault/{chainId}/signals/{sigId} — add interpretation
async function addInterpretation(facilityId, chainId, sigId, body) {
  const PK = `FACILITY#${facilityId}`;
  const SK = `SIG#${chainId}#${sigId}`;

  const signal = await getItem(PK, SK);
  if (!signal) return err("Signal not found", 404);

  // Validate: caller cannot touch immutable fields
  const forbidden = ["rawContent", "actor", "recordedAt", "contentHash", "chainHash"];
  for (const f of forbidden) {
    if (body[f] !== undefined) {
      return err(`Cannot modify immutable field: ${f}`, 403);
    }
  }

  const {
    summary            = null,
    finding            = null,
    recommendation     = null,
    defensibilityScore = null,
    continuityScore    = null,
    assessmentOutcomeMatch = signal.assessmentOutcomeMatch ?? null,
  } = body ?? {};

  const interpretation = {
    summary,
    finding,
    recommendation,
    defensibilityScore,
    continuityScore,
  };

  const updatedSignal = {
    ...signal,
    interpretation,
    assessmentOutcomeMatch,
    admissibilityStatus: "interpreted",
  };

  await putItem(updatedSignal);

  // Reload signals and recompute chain metrics
  const allSignals = await queryItems(PK, `SIG#${chainId}#`);
  const chain = await getItem(PK, `CHAIN#${chainId}`);
  if (chain) {
    const metrics = computeMetrics(chain, allSignals);
    await putItem({
      ...chain,
      metrics,
      admissibilityVerified: allSignals.every(
        (s) => s.admissibilityStatus === "interpreted"
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  return ok({ signal: updatedSignal });
}

// ── Main handler ──────────────────────────────────────────────────────────────

export const handler = async (event) => {
  try {
    const method     = event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
    const rawPath    = event.rawPath ?? event.path ?? "/";
    const claims     = event.requestContext?.authorizer?.jwt?.claims ?? {};
    const facilityId = facilityFromClaims(claims);
    const actor      = claims["cognito:username"] ?? claims.sub ?? "unknown";
    const actorRole  = claims["custom:role"] ?? "staff";

    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch { /* ignore */ }
    }

    // ── Route matching ────────────────────────────────────────────────────────

    // GET /dc-vault/stats  (must be checked BEFORE /{chainId})
    if (method === "GET" && /^\/dc-vault\/stats\/?$/.test(rawPath)) {
      return await getStats(facilityId);
    }

    // GET /dc-vault
    if (method === "GET" && /^\/dc-vault\/?$/.test(rawPath)) {
      return await listChains(facilityId);
    }

    // POST /dc-vault
    if (method === "POST" && /^\/dc-vault\/?$/.test(rawPath)) {
      return await createChain(facilityId, body, actor, actorRole);
    }

    // GET /dc-vault/{chainId}
    const chainOnlyMatch = rawPath.match(/^\/dc-vault\/([^/]+)\/?$/);
    if (method === "GET" && chainOnlyMatch) {
      return await getChain(facilityId, chainOnlyMatch[1]);
    }

    // POST /dc-vault/{chainId}/signals
    const appendSigMatch = rawPath.match(/^\/dc-vault\/([^/]+)\/signals\/?$/);
    if (method === "POST" && appendSigMatch) {
      return await appendSignal(facilityId, appendSigMatch[1], body, actor, actorRole);
    }

    // PATCH /dc-vault/{chainId}/signals/{sigId}
    const patchSigMatch = rawPath.match(/^\/dc-vault\/([^/]+)\/signals\/([^/]+)\/?$/);
    if (method === "PATCH" && patchSigMatch) {
      return await addInterpretation(
        facilityId,
        patchSigMatch[1],
        patchSigMatch[2],
        body
      );
    }

    return err("Not found", 404);
  } catch (e) {
    console.error("DC Vault handler error:", e);
    return err("Internal server error", 500);
  }
};
