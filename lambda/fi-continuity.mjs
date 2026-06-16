/**
 * fi-continuity — Continuity Intelligence™ Lambda
 * Table: ContinuityScores  PK=FACILITY#<facilityId>  SK=CONTINUITY#CURRENT
 *
 * Routes:
 *   GET    /continuity?facilityId=X   → load saved record
 *   POST   /continuity                 → save record
 */

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const db    = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const TABLE = process.env.TABLE || 'ContinuityScores';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const ok  = b => ({ statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const err = (s, m) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: m }) });

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return ok({});

  const method     = event.httpMethod;
  const qs         = event.queryStringParameters || {};
  const facilityId = qs.facilityId || 'facility-001';

  if (method === 'GET') {
    const res = await db.send(new GetItemCommand({
      TableName: TABLE,
      Key: marshall({ PK: `FACILITY#${facilityId}`, SK: 'CONTINUITY#CURRENT' }),
    }));
    if (!res.Item) return ok(null);
    const item = unmarshall(res.Item);
    delete item.PK; delete item.SK;
    return ok(item);
  }

  if (method === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
    const { facilityId: fid, ...rest } = body;
    const fId = fid || facilityId;
    const now = new Date().toISOString();
    const item = { PK: `FACILITY#${fId}`, SK: 'CONTINUITY#CURRENT', facilityId: fId, updatedAt: now, ...rest };
    await db.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall(item, { removeUndefinedValues: true }),
    }));
    return ok({ saved: true, updatedAt: now });
  }

  return err(405, 'Method not allowed');
};
