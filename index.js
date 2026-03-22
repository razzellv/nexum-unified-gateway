const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const client = new DynamoDBClient({ region: 'us-east-2' });
const db = DynamoDBDocumentClient.from(client);
const LOGS_TABLE = 'FacilityLogs-v2';
const EQUIPMENT_TABLE = 'NexumEquipment';
const VIOLATIONS_TABLE = 'ViolationEvents';
const NJ_ELECTRIC_RATE = 0.18;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Content-Type': 'application/json' };
const ok = (body) => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const err = (code, msg) => ({ statusCode: code, headers: CORS, body: JSON.stringify({ error: msg }) });
function getClaims(event) { try { return event.requestContext?.authorizer?.jwt?.claims || event.requestContext?.authorizer?.claims || {}; } catch { return {}; } }
exports.handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path || '';
  const claims = getClaims(event);
  const qs = event.queryStringParameters || {};
  let body = {}; try { body = JSON.parse(event.body || '{}'); } catch {}
  if (method === 'GET' && path.includes('/mpcc/readings')) {
    const facilityId = qs.facilityId || claims['custom:facilityId'];
    const days = parseInt(qs.days || '30');
    if (!facilityId) return err(400, 'facilityId required');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    let mpccLogs = [];
    try {
      const result = await db.send(new QueryCommand({ TableName: LOGS_TABLE, IndexName: 'facilityId-timestamp-index', KeyConditionExpression: 'facilityId = :fid AND #ts >= :since', FilterExpression: 'systemType = :type', ExpressionAttributeNames: { '#ts': 'timestamp' }, ExpressionAttributeValues: { ':fid': facilityId, ':since': since, ':type': 'mpcc' }, ScanIndexForward: false, Limit: 100 }));
      mpccLogs = result.Items || [];
    } catch (e) { console.error('MPCC readings query error:', e); }
    const readings = mpccLogs.map(log => ({ logId: log.logId, timestamp: log.timestamp, equipmentId: log.equipmentId, currentLoadKW: log.metrics?.currentLoadKW || 0, peakDemandKW: log.metrics?.peakDemandKW || 0, kwhReading: log.metrics?.kwhReading || 0, demandIntervalKWH: log.metrics?.demandIntervalKWH || 0, incomingAmpsL1: log.metrics?.incomingAmpsL1 || 0, incomingAmpsL2: log.metrics?.incomingAmpsL2 || 0, incomingAmpsL3: log.metrics?.incomingAmpsL3 || 0, powerFactor: log.metrics?.powerFactor || null, busbarTemp: log.metrics?.busbarTemp || null, safetyStatus: log.metrics?.safetyStatus || 'normal', runtimeHours: log.metrics?.runtimeHours || 0, kwDraw: log.metrics?.kwDraw || 0, estimatedCost: (log.metrics?.demandIntervalKWH || 0) * NJ_ELECTRIC_RATE }));
    const totalKWH = readings.reduce((s, r) => s + (r.demandIntervalKWH || 0), 0);
    const avgLoadKW = readings.length > 0 ? readings.reduce((s, r) => s + r.currentLoadKW, 0) / readings.length : 0;
    const peakDemandKW = readings.reduce((max, r) => Math.max(max, r.peakDemandKW || 0), 0);
    const pfReadings = readings.filter(r => r.powerFactor);
    const avgPF = pfReadings.length > 0 ? pfReadings.reduce((s, r) => s + r.powerFactor, 0) / pfReadings.length : null;
    return ok({ facilityId, period_days: days, readings, aggregate: { totalReadings: readings.length, totalKWH: Math.round(totalKWH * 10) / 10, estimatedCost: Math.round(totalKWH * NJ_ELECTRIC_RATE * 100) / 100, avgLoadKW: Math.round(avgLoadKW * 10) / 10, peakDemandKW: Math.round(peakDemandKW * 10) / 10, avgPowerFactor: avgPF ? Math.round(avgPF * 100) / 100 : null, electricRate: NJ_ELECTRIC_RATE } });
  }
  if (method === 'GET' && path.includes('/mpcc/summary')) {
    const facilityId = qs.facilityId || claims['custom:facilityId'];
    const months = parseInt(qs.months || '3');
    if (!facilityId) return err(400, 'facilityId required');
    const since = new Date(); since.setMonth(since.getMonth() - months);
    let mpccLogs = [];
    try {
      const result = await db.send(new QueryCommand({ TableName: LOGS_TABLE, IndexName: 'facilityId-timestamp-index', KeyConditionExpression: 'facilityId = :fid AND #ts >= :since', FilterExpression: 'systemType = :type', ExpressionAttributeNames: { '#ts': 'timestamp' }, ExpressionAttributeValues: { ':fid': facilityId, ':since': since.toISOString(), ':type': 'mpcc' }, ScanIndexForward: false }));
      mpccLogs = result.Items || [];
    } catch (e) { console.error('MPCC summary query error:', e); }
    const byMonth = {};
    mpccLogs.forEach(log => {
      const month = log.timestamp?.substring(0, 7);
      if (!month) return;
      if (!byMonth[month]) byMonth[month] = { kwh: 0, cost: 0, peakKW: 0, readings: 0 };
      const kwh = log.metrics?.demandIntervalKWH || 0;
      byMonth[month].kwh += kwh; byMonth[month].cost += kwh * NJ_ELECTRIC_RATE;
      byMonth[month].peakKW = Math.max(byMonth[month].peakKW, log.metrics?.peakDemandKW || 0);
      byMonth[month].readings += 1;
    });
    const monthlySummary = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([month, data]) => ({ month, totalKWH: Math.round(data.kwh * 10) / 10, estimatedCost: Math.round(data.cost * 100) / 100, peakDemandKW: Math.round(data.peakKW * 10) / 10, readings: data.readings }));
    return ok({ facilityId, months, monthlySummary, totals: { kwh: Math.round(monthlySummary.reduce((s, m) => s + m.totalKWH, 0) * 10) / 10, cost: Math.round(monthlySummary.reduce((s, m) => s + m.estimatedCost, 0) * 100) / 100, electricRate: NJ_ELECTRIC_RATE } });
  }
  if (method === 'POST' && path.includes('/mpcc/violation-check')) {
    const { facilityId, equipmentId, metrics } = body;
    if (!facilityId || !equipmentId || !metrics) return err(400, 'facilityId, equipmentId, metrics required');
    let baseline = null;
    try {
      const result = await db.send(new QueryCommand({ TableName: EQUIPMENT_TABLE, KeyConditionExpression: 'equipmentId = :eid', ExpressionAttributeValues: { ':eid': equipmentId } }));
      baseline = result.Items?.[0]?.baseline || null;
    } catch (e) { console.error('Baseline fetch error:', e); }
    const violations = [];
    if (baseline) {
      const ratedAmps = baseline.ampRating;
      const avgAmps = ((parseFloat(metrics.incomingAmpsL1 || 0) + parseFloat(metrics.incomingAmpsL2 || 0) + parseFloat(metrics.incomingAmpsL3 || 0)) / 3);
      if (ratedAmps && avgAmps > ratedAmps * 0.9) { const pct = Math.round((avgAmps / ratedAmps) * 100); violations.push({ type: 'HIGH_AMPERAGE_DEMAND', severity: avgAmps > ratedAmps ? 95 : 75, description: 'MPCC amperage at ' + pct + '% of rated capacity (' + avgAmps.toFixed(1) + 'A / ' + ratedAmps + 'A rated)', equipmentId, facilityId, timestamp: new Date().toISOString() }); }
      if (metrics.powerFactor && parseFloat(metrics.powerFactor) < 0.85) { violations.push({ type: 'LOW_POWER_FACTOR', severity: 60, description: 'Power factor ' + metrics.powerFactor + ' below recommended 0.85', equipmentId, facilityId, timestamp: new Date().toISOString() }); }
      const ratedKW = baseline.ratedKW || (baseline.ampRating * (baseline.voltage || 480) * 1.732 / 1000);
      if (ratedKW && parseFloat(metrics.peakDemandKW) > ratedKW * 1.1) { violations.push({ type: 'DEMAND_SPIKE', severity: 80, description: 'Peak demand ' + metrics.peakDemandKW + ' kW exceeds rated capacity', equipmentId, facilityId, timestamp: new Date().toISOString() }); }
    }
    if (metrics.safetyStatus === 'alarm' || metrics.safetyStatus === 'lockout') { violations.push({ type: 'MPCC_' + metrics.safetyStatus.toUpperCase(), severity: metrics.safetyStatus === 'lockout' ? 100 : 85, description: 'MPCC panel in ' + metrics.safetyStatus + ' state', equipmentId, facilityId, timestamp: new Date().toISOString() }); }
    if (metrics.groundFaultStatus === 'fault') { violations.push({ type: 'GROUND_FAULT_DETECTED', severity: 90, description: 'Ground fault detected on MPCC panel', equipmentId, facilityId, timestamp: new Date().toISOString() }); }
    for (const v of violations) {
      try { await db.send(new PutCommand({ TableName: VIOLATIONS_TABLE, Item: { ...v, violationId: 'mpcc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6), source: 'mpcc-auto', status: 'open' } })); } catch (e) { console.error('Violation save error:', e); }
    }
    return ok({ checked: true, violations, violationCount: violations.length, hasViolations: violations.length > 0 });
  }
  return err(404, 'Route not found: ' + method + ' ' + path);
};
