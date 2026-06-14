/**
 * fi-project-controls.mjs
 * Earned Value Management (EVM) CRUD for the Project Controls module.
 *
 * Routes:
 *   GET    /project-controls              → list all projects for facility
 *   GET    /project-controls?projectId=X  → single project
 *   POST   /project-controls              → create / update project
 *   DELETE /project-controls/{projectId}  → delete project
 *
 * DynamoDB table: ProjectControls
 *   PK: FACILITY#<facilityId>
 *   SK: PROJECT#<projectId>
 */

import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const REGION = process.env.AWS_REGION || 'us-east-2';
const TABLE  = process.env.TABLE || 'ProjectControls';

const db = new DynamoDBClient({ region: REGION });

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

const ok    = (body) => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const error = (msg, code = 400) => ({ statusCode: code, headers: CORS, body: JSON.stringify({ error: msg }) });

function decodeJwt(event) {
  const raw = (event.headers?.Authorization || event.headers?.authorization || '').replace('Bearer ', '');
  if (!raw) return null;
  try {
    const [, payload] = raw.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch { return null; }
}

function evmCalc(bac = 0, pv = 0, ev = 0, ac = 0) {
  const sv   = ev - pv;
  const cv   = ev - ac;
  const spi  = pv > 0 ? ev / pv  : 0;
  const cpi  = ac > 0 ? ev / ac  : 0;
  const eac  = cpi > 0 ? bac / cpi : bac;
  const etc  = eac - ac;
  const vac  = bac - eac;
  const tcpi = (bac - ac) > 0 ? (bac - ev) / (bac - ac) : 0;
  let health = 'red';
  if (spi >= 0.95 && cpi >= 0.95) health = 'green';
  else if (spi >= 0.80 && cpi >= 0.80) health = 'yellow';
  return { sv, cv, spi, cpi, eac, etc, vac, tcpi, health };
}

function strip(item) {
  const u = unmarshall(item);
  return {
    ...u,
    facilityId: u.PK?.replace('FACILITY#', '') ?? u.facilityId,
    projectId:  u.SK?.replace('PROJECT#', '')  ?? u.projectId,
  };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const claims = decodeJwt(event);
  if (!claims) return error('Unauthorized', 401);

  const facilityId = claims['custom:facilityId'] || 'facility-001';
  const role = claims['custom:role'] || '';
  const isAdmin = role === 'admin';
  const method = event.httpMethod;
  const pathParams = event.pathParameters || {};
  const qs = event.queryStringParameters || {};

  const PK = `FACILITY#${facilityId}`;

  // ── GET ────────────────────────────────────────────────────────────────────
  if (method === 'GET') {
    const projectId = pathParams.projectId || qs.projectId;

    if (projectId) {
      const res = await db.send(new GetItemCommand({
        TableName: TABLE,
        Key: marshall({ PK, SK: `PROJECT#${projectId}` }),
      }));
      if (!res.Item) return error('Project not found', 404);
      return ok(strip(res.Item));
    }

    // List all
    const res = await db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: marshall({ ':pk': PK, ':prefix': 'PROJECT#' }),
      ScanIndexForward: false,
      Limit: 100,
    }));
    return ok((res.Items || []).map(strip));
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { projectId, projectName, bac = 0, pv = 0, ev = 0, ac = 0, startDate, plannedEndDate, notes, workOrderId, createdAt } = body;

    if (!projectId)   return error('projectId is required');
    if (!projectName) return error('projectName is required');

    const metrics = evmCalc(bac, pv, ev, ac);
    const now = new Date().toISOString();

    const item = {
      PK, SK: `PROJECT#${projectId}`,
      facilityId, projectId, projectName,
      bac, pv, ev, ac,
      ...metrics,
      startDate: startDate || null,
      plannedEndDate: plannedEndDate || null,
      notes: notes || '',
      workOrderId: workOrderId || null,
      createdAt: createdAt || now,
      updatedAt: now,
    };

    await db.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall(item, { removeUndefinedValues: true }),
    }));

    return ok(item);
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (method === 'DELETE') {
    const projectId = pathParams.projectId || qs.projectId;
    if (!projectId) return error('projectId is required');

    await db.send(new DeleteItemCommand({
      TableName: TABLE,
      Key: marshall({ PK, SK: `PROJECT#${projectId}` }),
    }));

    return ok({ deleted: true, projectId });
  }

  return error('Method not allowed', 405);
};
