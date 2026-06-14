/**
 * fi-dot — Decision Outcome Tracking™ Lambda
 * Table: DecisionOutcomes  PK=FACILITY#<facilityId>  SK=DECISION#<decisionId>
 *
 * Routes:
 *   GET    /decision-outcomes?facilityId=X            → list all decisions for facility
 *   GET    /decision-outcomes?facilityId=X&id=Y       → single decision
 *   POST   /decision-outcomes                          → create / update decision record
 *   DELETE /decision-outcomes/{decisionId}?facilityId=X
 */

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const db     = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const TABLE  = process.env.TABLE || 'DecisionOutcomes';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

function ok(body)     { return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }
function err(s, m)    { return { statusCode: s,   headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: m }) }; }

function strip(item) {
  const r = unmarshall(item);
  delete r.PK;
  delete r.SK;
  return r;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return ok({});

  const method   = event.httpMethod;
  const qs       = event.queryStringParameters || {};
  const facilityId = qs.facilityId || 'facility-001';

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (method === 'GET') {
    const decisionId = qs.id;

    if (decisionId) {
      const res = await db.send(new GetItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: `FACILITY#${facilityId}`, SK: `DECISION#${decisionId}` }),
      }));
      if (!res.Item) return err(404, 'Decision not found');
      return ok(strip(res.Item));
    }

    // List all
    const res = await db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: marshall({
        ':pk':     `FACILITY#${facilityId}`,
        ':prefix': 'DECISION#',
      }),
      ScanIndexForward: false,
    }));
    return ok((res.Items || []).map(strip));
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (method === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return err(400, 'Invalid JSON'); }

    const { decisionId, facilityId: fid, ...rest } = body;
    const fId = fid || facilityId;
    if (!decisionId) return err(400, 'decisionId required');

    const now = new Date().toISOString();
    const item = {
      PK:         `FACILITY#${fId}`,
      SK:         `DECISION#${decisionId}`,
      decisionId,
      facilityId: fId,
      updatedAt:  now,
      createdAt:  rest.createdAt || now,
      ...rest,
    };

    await db.send(new PutItemCommand({
      TableName: TABLE,
      Item:      marshall(item, { removeUndefinedValues: true }),
    }));
    return ok({ saved: true, decisionId, updatedAt: now });
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  if (method === 'DELETE') {
    const pathParts  = (event.path || '').split('/').filter(Boolean);
    const decisionId = pathParts[pathParts.length - 1];
    if (!decisionId || decisionId === 'decision-outcomes') return err(400, 'decisionId path param required');

    await db.send(new DeleteItemCommand({
      TableName: TABLE,
      Key: marshall({ PK: `FACILITY#${facilityId}`, SK: `DECISION#${decisionId}` }),
    }));
    return ok({ deleted: true, decisionId });
  }

  return err(405, 'Method not allowed');
};
