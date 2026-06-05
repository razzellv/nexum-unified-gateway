/**
 * fi-evidence-board.mjs
 * Nexum Suum FI Platform — Evidence Board™
 * Collect, pin, and organize operational evidence into investigation cases.
 * Linked to Observation Journal, Violations, Work Orders, and Facility Logs.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { randomUUID } from 'crypto';

const ddb    = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const TABLE  = 'NexumEvidenceBoards';
const POOL   = 'us-east-2_mKMqaRq70';
const CLIENT = '7vvu6kruod12nu1nkfonbfekre';

const verifier = CognitoJwtVerifier.create({
  userPoolId: POOL,
  tokenUse:   'id',
  clientId:   CLIENT,
});

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

function res(status, body) {
  return { statusCode: status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

async function verifyToken(event) {
  const auth = event.headers?.Authorization || event.headers?.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('No token');
  return verifier.verify(token);
}

function facilityId(claims) {
  return claims['custom:facilityId'] || 'facility-001';
}

// ── Route handlers ────────────────────────────────────────────────────────────

// GET /evidence-boards  — list all boards for this facility
async function listBoards(fid) {
  const { Items = [] } = await ddb.send(new QueryCommand({
    TableName:                 TABLE,
    KeyConditionExpression:    'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `FACILITY#${fid}`, ':prefix': 'BOARD#' },
  }));
  return Items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// POST /evidence-boards  — create a new board
async function createBoard(fid, body, claims) {
  const boardId = randomUUID();
  const now     = new Date().toISOString();
  const item = {
    PK:          `FACILITY#${fid}`,
    SK:          `BOARD#${boardId}`,
    boardId,
    facilityId:  fid,
    title:       body.title       || 'Untitled Investigation',
    description: body.description || '',
    category:    body.category    || 'general',   // safety | compliance | operational | equipment | personnel
    priority:    body.priority    || 'medium',    // low | medium | high | critical
    status:      'open',
    tags:        body.tags        || [],
    createdBy:   claims.email     || claims['cognito:username'],
    createdAt:   now,
    updatedAt:   now,
    evidenceCount: 0,
    conclusionNotes: '',
    assignedTo:  body.assignedTo  || null,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

// GET /evidence-boards/{boardId}  — board + all its evidence items
async function getBoard(fid, boardId) {
  const [boardRes, evidenceRes] = await Promise.all([
    ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `FACILITY#${fid}`, SK: `BOARD#${boardId}` } })),
    ddb.send(new QueryCommand({
      TableName:                 TABLE,
      KeyConditionExpression:    'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `FACILITY#${fid}`, ':prefix': `EVIDENCE#${boardId}#` },
    })),
  ]);
  if (!boardRes.Item) return null;
  const evidence = (evidenceRes.Items || []).sort((a, b) => new Date(a.occurredAt || a.pinnedAt) - new Date(b.occurredAt || b.pinnedAt));
  return { ...boardRes.Item, evidence };
}

// PATCH /evidence-boards/{boardId}  — update board metadata/status
async function updateBoard(fid, boardId, body) {
  const allowed = ['title', 'description', 'category', 'priority', 'status', 'tags', 'assignedTo', 'conclusionNotes'];
  const sets    = ['#updatedAt = :updatedAt'];
  const names   = { '#updatedAt': 'updatedAt' };
  const values  = { ':updatedAt': new Date().toISOString() };

  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`#${key} = :${key}`);
      names[`#${key}`] = key;
      values[`:${key}`] = body[key];
    }
  }

  const result = await ddb.send(new UpdateCommand({
    TableName:                 TABLE,
    Key:                       { PK: `FACILITY#${fid}`, SK: `BOARD#${boardId}` },
    UpdateExpression:          `SET ${sets.join(', ')}`,
    ExpressionAttributeNames:  names,
    ExpressionAttributeValues: values,
    ReturnValues:              'ALL_NEW',
    ConditionExpression:       'attribute_exists(PK)',
  }));
  return result.Attributes;
}

// DELETE /evidence-boards/{boardId}  — delete board
async function deleteBoard(fid, boardId) {
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `FACILITY#${fid}`, SK: `BOARD#${boardId}` } }));
}

// POST /evidence-boards/{boardId}/evidence  — pin a piece of evidence
async function pinEvidence(fid, boardId, body, claims) {
  const itemId = randomUUID();
  const now    = new Date().toISOString();
  const item   = {
    PK:          `FACILITY#${fid}`,
    SK:          `EVIDENCE#${boardId}#${itemId}`,
    itemId,
    boardId,
    facilityId:  fid,
    // source type: observation | violation | workorder | log | manual
    sourceType:  body.sourceType  || 'manual',
    sourceId:    body.sourceId    || null,
    title:       body.title       || 'Evidence Item',
    description: body.description || '',
    // When the underlying event occurred (from source record)
    occurredAt:  body.occurredAt  || now,
    pinnedAt:    now,
    pinnedBy:    claims.email     || claims['cognito:username'],
    notes:       body.notes       || '',
    tags:        body.tags        || [],
    // Optional metadata from the source record
    metadata:    body.metadata    || {},
    severity:    body.severity    || null,
    linkedItems: body.linkedItems || [],
  };
  await Promise.all([
    ddb.send(new PutCommand({ TableName: TABLE, Item: item })),
    // Increment evidence count on the board
    ddb.send(new UpdateCommand({
      TableName:                 TABLE,
      Key:                       { PK: `FACILITY#${fid}`, SK: `BOARD#${boardId}` },
      UpdateExpression:          'SET evidenceCount = if_not_exists(evidenceCount, :zero) + :one, #updatedAt = :now',
      ExpressionAttributeNames:  { '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':now': new Date().toISOString() },
    })),
  ]);
  return item;
}

// PATCH /evidence-boards/{boardId}/evidence/{itemId}  — update notes/tags on evidence
async function updateEvidence(fid, boardId, itemId, body) {
  const allowed = ['notes', 'tags', 'linkedItems', 'title', 'description', 'severity'];
  const sets    = [];
  const names   = {};
  const values  = {};

  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`#${key} = :${key}`);
      names[`#${key}`] = key;
      values[`:${key}`] = body[key];
    }
  }
  if (!sets.length) throw new Error('Nothing to update');

  const result = await ddb.send(new UpdateCommand({
    TableName:                 TABLE,
    Key:                       { PK: `FACILITY#${fid}`, SK: `EVIDENCE#${boardId}#${itemId}` },
    UpdateExpression:          `SET ${sets.join(', ')}`,
    ExpressionAttributeNames:  names,
    ExpressionAttributeValues: values,
    ReturnValues:              'ALL_NEW',
    ConditionExpression:       'attribute_exists(PK)',
  }));
  return result.Attributes;
}

// DELETE /evidence-boards/{boardId}/evidence/{itemId}  — unpin evidence
async function unpinEvidence(fid, boardId, itemId) {
  await Promise.all([
    ddb.send(new DeleteCommand({ TableName: TABLE, Key: { PK: `FACILITY#${fid}`, SK: `EVIDENCE#${boardId}#${itemId}` } })),
    ddb.send(new UpdateCommand({
      TableName:                 TABLE,
      Key:                       { PK: `FACILITY#${fid}`, SK: `BOARD#${boardId}` },
      UpdateExpression:          'SET evidenceCount = if_not_exists(evidenceCount, :one) - :one, #updatedAt = :now',
      ExpressionAttributeNames:  { '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':one': 1, ':now': new Date().toISOString() },
    })),
  ]);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return res(200, {});

  let claims;
  try { claims = await verifyToken(event); }
  catch { return res(401, { error: 'Unauthorized' }); }

  const fid    = facilityId(claims);
  const method = event.httpMethod;
  const path   = event.pathParameters || {};
  const body   = event.body ? JSON.parse(event.body) : {};

  try {
    // ── /evidence-boards ────────────────────────────────────────────────────
    if (!path.boardId) {
      if (method === 'GET')  return res(200, { boards: await listBoards(fid) });
      if (method === 'POST') return res(201, await createBoard(fid, body, claims));
    }

    // ── /evidence-boards/{boardId} ───────────────────────────────────────────
    if (path.boardId && !path.itemId) {
      if (method === 'GET') {
        const board = await getBoard(fid, path.boardId);
        return board ? res(200, board) : res(404, { error: 'Not found' });
      }
      if (method === 'PATCH')  return res(200, await updateBoard(fid, path.boardId, body));
      if (method === 'DELETE') { await deleteBoard(fid, path.boardId); return res(204, {}); }

      // POST /evidence-boards/{boardId}/evidence
      if (method === 'POST' && path.subResource === 'evidence') {
        return res(201, await pinEvidence(fid, path.boardId, body, claims));
      }
    }

    // ── /evidence-boards/{boardId}/evidence/{itemId} ─────────────────────────
    if (path.boardId && path.itemId) {
      if (method === 'PATCH')  return res(200, await updateEvidence(fid, path.boardId, path.itemId, body));
      if (method === 'DELETE') { await unpinEvidence(fid, path.boardId, path.itemId); return res(204, {}); }
    }

    return res(404, { error: 'Route not found' });
  } catch (err) {
    console.error(err);
    return res(500, { error: err.message || 'Internal error' });
  }
};
