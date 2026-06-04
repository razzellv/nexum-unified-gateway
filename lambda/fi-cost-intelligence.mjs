import { DynamoDBClient }                                     from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand,
         GetCommand, ScanCommand }                            from "@aws-sdk/lib-dynamodb";

const ddb               = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const VALUATION_TABLE   = process.env.VALUATION_TABLE    || "NexumAssetValuation";
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE || "SpendingTransactions";

// ── Helpers ────────────────────────────────────────────────────────────────────
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

function parseBody(event) {
  let raw = event.body || "{}";
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf-8");
  try { return JSON.parse(raw); } catch { return {}; }
}

function newId() {
  return `cost-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function getQueryParam(event, key) {
  return event?.queryStringParameters?.[key] || event?.queryStringParameters?.[key] || null;
}

// ── Depreciation Engine ────────────────────────────────────────────────────────
function computeDepreciation(valuation) {
  const {
    purchasePrice = 0,
    purchaseDate = "",
    usefulLifeYears = 10,
    depreciationMethod = "straight_line",
    residualValue = 0,
  } = valuation;

  const now = new Date();
  const purchased = purchaseDate ? new Date(purchaseDate) : now;
  const ageYears = Math.max(0, (now - purchased) / (365.25 * 24 * 60 * 60 * 1000));
  const yearsElapsed = Math.min(ageYears, usefulLifeYears);
  const depreciableBase = Math.max(0, purchasePrice - residualValue);

  let annualDepreciation = 0;
  let accumulatedDepreciation = 0;

  if (depreciationMethod === "straight_line") {
    annualDepreciation = usefulLifeYears > 0 ? depreciableBase / usefulLifeYears : 0;
    accumulatedDepreciation = annualDepreciation * yearsElapsed;

  } else if (depreciationMethod === "double_declining") {
    const rate = usefulLifeYears > 0 ? 2 / usefulLifeYears : 0;
    let bookValue = purchasePrice;
    let accum = 0;
    const fullYears = Math.floor(yearsElapsed);
    const fracYear = yearsElapsed - fullYears;

    for (let y = 0; y < fullYears && bookValue > residualValue; y++) {
      const dep = Math.min(bookValue - residualValue, bookValue * rate);
      accum += dep;
      bookValue -= dep;
    }
    // fractional year
    if (fracYear > 0 && bookValue > residualValue) {
      const dep = Math.min(bookValue - residualValue, bookValue * rate * fracYear);
      accum += dep;
    }
    accumulatedDepreciation = accum;
    // annual for current year (integer year)
    const fullYearBook = purchasePrice - (() => {
      let bv = purchasePrice; let ac = 0;
      for (let y = 0; y < Math.floor(yearsElapsed) && bv > residualValue; y++) {
        const dep = Math.min(bv - residualValue, bv * rate);
        ac += dep; bv -= dep;
      }
      return ac;
    })();
    annualDepreciation = Math.min(fullYearBook - residualValue, fullYearBook * rate);

  } else if (depreciationMethod === "sum_of_years") {
    const n = usefulLifeYears;
    const syd = (n * (n + 1)) / 2;
    let accum = 0;
    const fullYears = Math.floor(yearsElapsed);
    const fracYear = yearsElapsed - fullYears;

    for (let y = 0; y < fullYears; y++) {
      const remainingLife = n - y;
      const dep = syd > 0 ? (remainingLife / syd) * depreciableBase : 0;
      accum += dep;
    }
    // fractional year
    if (fracYear > 0) {
      const remainingLife = n - fullYears;
      const dep = syd > 0 ? (remainingLife / syd) * depreciableBase * fracYear : 0;
      accum += dep;
    }
    accumulatedDepreciation = Math.min(accum, depreciableBase);

    // annual for current full year
    const currentYearRemaining = n - Math.floor(yearsElapsed);
    annualDepreciation = syd > 0 ? (currentYearRemaining / syd) * depreciableBase : 0;
  }

  const currentBookValue = Math.max(residualValue, purchasePrice - accumulatedDepreciation);
  const remainingLifeYears = Math.max(0, usefulLifeYears - ageYears);
  const depreciationPercent = purchasePrice > 0 ? (accumulatedDepreciation / purchasePrice) * 100 : 0;

  return {
    annualDepreciation,
    accumulatedDepreciation,
    currentBookValue,
    remainingLifeYears,
    depreciationPercent,
    ageYears,
  };
}

// ── Query helpers ──────────────────────────────────────────────────────────────
async function queryTransactions(fid, extraParams = {}) {
  const params = {
    TableName: TRANSACTIONS_TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":prefix": "TXN#" },
    Limit: 200,
    ...extraParams,
  };
  const result = await ddb.send(new QueryCommand(params));
  return result.Items || [];
}

async function queryValuations(fid) {
  const params = {
    TableName: VALUATION_TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": `FACILITY#${fid}`, ":prefix": "ASSET#" },
  };
  const result = await ddb.send(new QueryCommand(params));
  return result.Items || [];
}

// ── Percent helpers ────────────────────────────────────────────────────────────
function toPercent(value, total) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function buildBreakdownArray(map, total) {
  return Object.entries(map)
    .map(([name, { amount, count }]) => ({
      name,
      amount,
      percent: toPercent(amount, total),
      transactionCount: count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ── Route Handlers ─────────────────────────────────────────────────────────────

// GET /costs/summary
async function handleGetSummary(fid) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [transactions, valuations] = await Promise.all([
    queryTransactions(fid),
    queryValuations(fid),
  ]);

  let totalCostYTD = 0, totalCostThisMonth = 0, totalCostAllTime = 0;
  let capex = 0, opex = 0;
  const byCategory = { labor: 0, parts: 0, utilities: 0, contracts: 0, emergency: 0, other: 0 };
  const byDepartment = {};
  const bySystemType = {};

  for (const txn of transactions) {
    const amount = txn.amount || 0;
    const date = txn.transactionDate || txn.createdAt || "";

    totalCostAllTime += amount;
    if (date >= yearStart) totalCostYTD += amount;
    if (date >= monthStart) totalCostThisMonth += amount;

    if (txn.costType === "capex") capex += amount;
    else opex += amount;

    const cat = txn.category || "other";
    if (cat in byCategory) byCategory[cat] += amount;
    else byCategory.other += amount;

    if (txn.department) {
      byDepartment[txn.department] = (byDepartment[txn.department] || 0) + amount;
    }
    if (txn.systemType) {
      bySystemType[txn.systemType] = (bySystemType[txn.systemType] || 0) + amount;
    }
  }

  // Asset valuation aggregates
  let totalAssetValue = 0, totalBookValue = 0;
  let totalDepreciationYTD = 0, totalAccumulatedDepreciation = 0;

  for (const val of valuations) {
    totalAssetValue += val.purchasePrice || 0;
    const dep = computeDepreciation(val);
    totalBookValue += dep.currentBookValue;
    totalAccumulatedDepreciation += dep.accumulatedDepreciation;
    totalDepreciationYTD += dep.annualDepreciation;
  }

  const transactionCount = transactions.length;
  const total = totalCostAllTime;

  const byCategoryPercent = {};
  for (const [k, v] of Object.entries(byCategory)) {
    byCategoryPercent[k] = toPercent(v, total);
  }
  const byDepartmentPercent = {};
  for (const [k, v] of Object.entries(byDepartment)) {
    byDepartmentPercent[k] = toPercent(v, total);
  }
  const bySystemTypePercent = {};
  for (const [k, v] of Object.entries(bySystemType)) {
    bySystemTypePercent[k] = toPercent(v, total);
  }

  return json(200, {
    totalCostYTD,
    totalCostThisMonth,
    totalCostAllTime,
    capex,
    opex,
    capexPercent: toPercent(capex, total),
    opexPercent: toPercent(opex, total),
    byCategory,
    byCategoryPercent,
    byDepartment,
    byDepartmentPercent,
    bySystemType,
    bySystemTypePercent,
    totalAssetValue,
    totalBookValue,
    totalDepreciationYTD,
    totalAccumulatedDepreciation,
    assetCount: valuations.length,
    avgCostPerTransaction: transactionCount > 0 ? Math.round(totalCostAllTime / transactionCount) : 0,
    transactionCount,
  });
}

// GET /costs/transactions
async function handleGetTransactions(fid, event) {
  const dateFrom = getQueryParam(event, "dateFrom");
  const dateTo   = getQueryParam(event, "dateTo");
  const category = getQueryParam(event, "category");
  const department = getQueryParam(event, "department");
  const limitStr = getQueryParam(event, "limit");
  const limit = limitStr ? parseInt(limitStr, 10) : 200;

  let items = await queryTransactions(fid, { Limit: limit });

  if (dateFrom) items = items.filter(t => (t.transactionDate || t.createdAt || "") >= dateFrom);
  if (dateTo)   items = items.filter(t => (t.transactionDate || t.createdAt || "") <= dateTo);
  if (category) items = items.filter(t => t.category === category);
  if (department) items = items.filter(t => t.department === department);

  items.sort((a, b) => (b.transactionDate || b.createdAt || "").localeCompare(a.transactionDate || a.createdAt || ""));

  return json(200, { transactions: items, count: items.length });
}

// POST /costs/transactions
async function handleCreateTransaction(fid, event, claims) {
  const body = parseBody(event);
  const now = new Date().toISOString();
  const id = newId();

  const item = {
    PK: `FACILITY#${fid}`,
    SK: `TXN#${now}#${id}`,
    transactionId: id,
    facilityId: fid,
    amount: body.amount || 0,
    category: body.category || "other",
    costType: body.costType || "opex",
    description: body.description || "",
    department: body.department || "",
    systemType: body.systemType || "",
    equipmentId: body.equipmentId || "",
    workOrderId: body.workOrderId || "",
    vendor: body.vendor || "",
    invoiceNumber: body.invoiceNumber || "",
    poNumber: body.poNumber || "",
    transactionDate: body.transactionDate || now,
    createdAt: now,
    createdBy: claims?.sub || "",
    createdByName: claims?.name || claims?.email || "",
  };

  await ddb.send(new PutCommand({ TableName: TRANSACTIONS_TABLE, Item: item }));
  return json(201, { success: true, transactionId: id });
}

// GET /costs/valuations
async function handleGetValuations(fid) {
  const valuations = await queryValuations(fid);
  const withDepreciation = valuations.map(v => ({
    ...v,
    depreciation: computeDepreciation(v),
  }));
  return json(200, { valuations: withDepreciation, count: withDepreciation.length });
}

// POST /costs/valuations
async function handleCreateValuation(fid, event, claims) {
  const body = parseBody(event);
  if (!body.equipmentId) return json(400, { error: "equipmentId required" });
  const now = new Date().toISOString();

  const item = {
    PK: `FACILITY#${fid}`,
    SK: `ASSET#${body.equipmentId}`,
    equipmentId: body.equipmentId,
    equipmentName: body.equipmentName || "",
    systemType: body.systemType || "",
    purchasePrice: body.purchasePrice || 0,
    purchaseDate: body.purchaseDate || "",
    usefulLifeYears: body.usefulLifeYears || 10,
    depreciationMethod: body.depreciationMethod || "straight_line",
    residualValue: body.residualValue || 0,
    replacementCost: body.replacementCost || 0,
    insuranceValue: body.insuranceValue || 0,
    notes: body.notes || "",
    facilityId: fid,
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: VALUATION_TABLE, Item: item }));
  return json(200, { success: true });
}

// GET /costs/depreciation
async function handleGetDepreciation(fid) {
  const valuations = await queryValuations(fid);
  let totalBookValue = 0;
  let totalDepreciationYTD = 0;

  const assets = valuations.map(v => {
    const dep = computeDepreciation(v);
    totalBookValue += dep.currentBookValue;
    totalDepreciationYTD += dep.annualDepreciation;
    return {
      ...v,
      depreciation: dep,
      depreciationThisYear: dep.annualDepreciation,
      nextYearDepreciation: computeDepreciation({ ...v, purchaseDate: (() => {
        // simulate one year from now
        const d = new Date(v.purchaseDate || new Date());
        d.setFullYear(d.getFullYear() - 1);
        return d.toISOString();
      })() }).annualDepreciation,
    };
  });

  return json(200, { assets, totalBookValue, totalDepreciationYTD });
}

// GET /costs/breakdown
async function handleGetBreakdown(fid) {
  const transactions = await queryTransactions(fid);
  let totalAmount = 0;

  const catMap = {};
  const deptMap = {};
  const sysMap = {};

  for (const txn of transactions) {
    const amount = txn.amount || 0;
    totalAmount += amount;

    const cat = txn.category || "other";
    if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 };
    catMap[cat].amount += amount;
    catMap[cat].count++;

    const dept = txn.department || "";
    if (dept) {
      if (!deptMap[dept]) deptMap[dept] = { amount: 0, count: 0 };
      deptMap[dept].amount += amount;
      deptMap[dept].count++;
    }

    const sys = txn.systemType || "";
    if (sys) {
      if (!sysMap[sys]) sysMap[sys] = { amount: 0, count: 0 };
      sysMap[sys].amount += amount;
      sysMap[sys].count++;
    }
  }

  const byCategory   = buildBreakdownArray(catMap,  totalAmount);
  const byDepartment = buildBreakdownArray(deptMap, totalAmount);
  const bySystemType = buildBreakdownArray(sysMap,  totalAmount);

  // Top 5 combined cost drivers
  const allDrivers = [...byCategory, ...byDepartment, ...bySystemType]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return json(200, { byCategory, byDepartment, bySystemType, topCostDrivers: allDrivers });
}

// ── Lambda Handler ─────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { error: "Unauthorized" });

  const fid = facilityId(claims);

  try {
    if (method === "GET"  && path === "/costs/summary")       return await handleGetSummary(fid);
    if (method === "GET"  && path === "/costs/transactions")  return await handleGetTransactions(fid, event);
    if (method === "POST" && path === "/costs/transactions")  return await handleCreateTransaction(fid, event, claims);
    if (method === "GET"  && path === "/costs/valuations")    return await handleGetValuations(fid);
    if (method === "POST" && path === "/costs/valuations")    return await handleCreateValuation(fid, event, claims);
    if (method === "GET"  && path === "/costs/depreciation")  return await handleGetDepreciation(fid);
    if (method === "GET"  && path === "/costs/breakdown")     return await handleGetBreakdown(fid);

    return json(404, { error: "Not found", path, method });
  } catch (err) {
    console.error("Cost Intelligence error:", err);
    return json(500, { error: err.message || "Internal server error" });
  }
};
