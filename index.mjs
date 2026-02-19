import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));

const VIOLATIONS_TABLE = "ViolationEvents";
const LOGS_TABLE = "FacilityLogs-v2";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
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

// Map old violation types to new standardized format
function normalizeViolationType(type) {
  const mapping = {
    'incomplete_data': 'INCOMPLETE_DATA',
    'missing_log': 'MISSING_LOG',
    'late_log': 'LATE_LOG',
    'out_of_range': 'OUT_OF_RANGE',
    'critical_failure': 'CRITICAL_FAILURE',
    'unsafe_operation': 'UNSAFE_OPERATION',
    'missed_round': 'MISSED_ROUND',
    'documentation_error': 'DOCUMENTATION_ERROR',
    'unauthorized_change': 'UNAUTHORIZED_CHANGE',
    'safety_violation': 'SAFETY_VIOLATION',
  };
  
  const lower = String(type).toLowerCase().replace(/\s+/g, '_');
  return mapping[lower] || type.toUpperCase().replace(/\s+/g, '_');
}

async function calculateEmployeeScore(facilityId, operatorId, violations, logs) {
  const operatorViolations = violations.filter(v => {
    const vOpId = v.operatorId;
    const vOpIdStr = typeof vOpId === 'string' ? vOpId : (vOpId?.S || vOpId?.sub || String(vOpId));
    return vOpIdStr === operatorId;
  });

  const operatorLogs = logs.filter(l => {
    const lOpId = l.operatorId || l.operator;
    const lOpIdStr = typeof lOpId === 'string' ? lOpId : (lOpId?.S || lOpId?.sub || String(lOpId));
    return lOpIdStr === operatorId;
  });

  let totalSeverity = 0;
  let weightedSeverity = 0;
  
  operatorViolations.forEach(v => {
    const severity = v.severity || 50;
    totalSeverity += severity;
    weightedSeverity += severity * 1.5;
  });

  const avgSeverity = operatorViolations.length > 0 ? totalSeverity / operatorViolations.length : 0;
  const riskScore = Math.min(100, Math.round(weightedSeverity / Math.max(operatorLogs.length, 1)));
  const virtuousScore = Math.max(0, 100 - riskScore);
  const complianceRate = operatorLogs.length > 0 
    ? Math.round(((operatorLogs.length - operatorViolations.length) / operatorLogs.length) * 100)
    : 100;

  return {
    operatorId,
    logsSubmitted: operatorLogs.length,
    violationCount: operatorViolations.length,
    avgSeverity: Math.round(avgSeverity),
    weightedScore: Math.round(weightedSeverity),
    virtuousScore,
    riskScore,
    complianceRate,
    cumulativeLevel: virtuousScore >= 90 ? 'Excellent' : virtuousScore >= 75 ? 'Good' : virtuousScore >= 60 ? 'Fair' : 'Needs Improvement'
  };
}

export const handler = async (event) => {
  try {
    console.log("📋 Compliance Analyzer Event:", JSON.stringify(event, null, 2));

    const claims = getClaims(event);
    if (!claims) {
      return json(401, { message: "Unauthorized" });
    }

    const facilityId = claims["custom:facilityId"];
    const params = event?.queryStringParameters || {};
    const days = parseInt(params.days || '7');
    
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    console.log(`📊 Analyzing compliance for facility ${facilityId}, last ${days} days`);

    // Query violations
    const violationsResult = await ddb.send(new QueryCommand({
      TableName: VIOLATIONS_TABLE,
      KeyConditionExpression: "PK = :pk AND SK > :start",
      ExpressionAttributeValues: {
        ":pk": `FACILITY#${facilityId}`,
        ":start": `VIOLATION#${startDate.toISOString()}`,
      },
    }));

    let violations = violationsResult.Items || [];
    
    // Normalize violation types
    violations = violations.map(v => ({
      ...v,
      violationType: normalizeViolationType(v.violationType || v.type || 'UNKNOWN'),
      operatorId: typeof v.operatorId === 'string' ? v.operatorId : (v.operatorId?.S || v.operatorId?.sub || String(v.operatorId))
    }));
    
    // Query facility logs
    const logsResult = await ddb.send(new QueryCommand({
      TableName: LOGS_TABLE,
      KeyConditionExpression: "PK = :pk AND SK > :start",
      ExpressionAttributeValues: {
        ":pk": `FACILITY#${facilityId}`,
        ":start": `LOG#${startDate.toISOString()}`,
      },
    }));

    const logs = logsResult.Items || [];

    console.log(`📊 Found ${logs.length} logs and ${violations.length} violations`);

    // Calculate compliance metrics
    const critical = violations.filter(v => (v.severity || 0) >= 80).length;
    const high = violations.filter(v => (v.severity || 0) >= 60 && (v.severity || 0) < 80).length;
    const medium = violations.filter(v => (v.severity || 0) >= 40 && (v.severity || 0) < 60).length;
    const low = violations.filter(v => (v.severity || 0) < 40).length;

    // Get unique operator IDs
    const allOperatorIds = new Set();
    [...logs, ...violations].forEach(item => {
      const opId = item.operatorId || item.operator;
      if (opId) {
        const opIdStr = typeof opId === 'string' ? opId : (opId?.S || opId?.sub || String(opId));
        if (opIdStr && opIdStr !== 'undefined') allOperatorIds.add(opIdStr);
      }
    });

    const operatorIds = Array.from(allOperatorIds);

    // Calculate employee scores
    const employeeScores = await Promise.all(
      operatorIds.map(opId => calculateEmployeeScore(facilityId, opId, violations, logs))
    );

    employeeScores.sort((a, b) => b.virtuousScore - a.virtuousScore);

    const totalLogs = logs.length;
    const totalViolations = violations.length;
    const orgComplianceScore = totalLogs > 0 
      ? Math.round(((totalLogs - totalViolations) / totalLogs) * 100)
      : 100;

    return json(200, {
      facilityId,
      analysisType: "compliance_analysis",
      periodDays: days,
      logsAnalyzed: totalLogs,
      violationsFound: totalViolations,
      complianceScore: orgComplianceScore,
      summary: { 
        critical, 
        high, 
        medium, 
        low,
        total: totalViolations 
      },
      employeeScores,
      violations: violations.slice(0, 20),
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return json(500, {
      message: "compliance_analysis_error",
      error: err?.message || String(err),
    });
  }
};
