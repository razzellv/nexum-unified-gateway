// ── fi-users Lambda ───────────────────────────────────────────────────────────
// FI Platform — List / manage users within an org
//
// JWT-protected routes:
//   GET    /users              — list users in this org (leadership only)
//   GET    /users/{userId}     — get a single user's profile
//   PATCH  /users/{userId}     — update role / department / status (admin/manager)

import { DynamoDBClient }                   from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand,
         GetCommand, PutCommand,
         UpdateCommand }                   from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
}                                           from "@aws-sdk/client-cognito-identity-provider";

const ddb     = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const cognito = new CognitoIdentityProviderClient({ region: "us-east-2" });

const USER_POOL_ID = process.env.USER_POOL_ID || "us-east-2_mKMqaRq70";
const USERS_TABLE  = process.env.USERS_TABLE  || "NexumUsers";

const TIER_LIMITS = {
  basic:            { maxUsers: 10,  maxEquipment: 50   },
  standard:         { maxUsers: 25,  maxEquipment: 200  },
  business:         { maxUsers: 50,  maxEquipment: null },
  premium:          { maxUsers: null, maxEquipment: null },
  enterprise:       { maxUsers: null, maxEquipment: null },
  admin:            { maxUsers: null, maxEquipment: null },
  retail_starter:   { maxUsers: 5,   maxEquipment: 100  },
  retail_pro:       { maxUsers: 10,  maxEquipment: 500  },
  command_basic:    { maxUsers: 15,  maxEquipment: 200  },
  command_standard: { maxUsers: 30,  maxEquipment: null },
  command_pro:      { maxUsers: null, maxEquipment: null },
};

const LEADERSHIP_ROLES = ["admin", "executive", "director", "manager", "supervisor", "chief", "owner"];

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type":                 "application/json",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,PATCH,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getMethod(e) { return e?.requestContext?.http?.method || e?.httpMethod || ""; }
function getPath(e)   { return e?.requestContext?.http?.path   || e?.path       || ""; }
function getClaims(e) {
  return e?.requestContext?.authorizer?.jwt?.claims ||
         e?.requestContext?.authorizer?.claims      || null;
}
function facilityId(c) {
  return c["custom:facilityId"] || c["custom:orgId"] || c.sub || "facility-001";
}

function cognitoAttr(attrs, name) {
  return (attrs || []).find(a => a.Name === name)?.Value || null;
}

function mapCognitoUser(u) {
  const attrs = u.Attributes || u.UserAttributes || [];
  return {
    userId:     u.Username,
    email:      cognitoAttr(attrs, "email"),
    name:       cognitoAttr(attrs, "name"),
    role:       cognitoAttr(attrs, "custom:role"),
    orgId:      cognitoAttr(attrs, "custom:orgId"),
    facilityId: cognitoAttr(attrs, "custom:facilityId"),
    department: cognitoAttr(attrs, "custom:department"),
    tier:       cognitoAttr(attrs, "custom:tier"),
    orgType:    cognitoAttr(attrs, "custom:orgType"),
    status:     u.UserStatus,
    createdAt:  u.UserCreateDate,
    lastLogin:  u.UserLastModifiedDate,
  };
}

export const handler = async (event) => {
  const method = getMethod(event);
  const path   = getPath(event);

  if (method === "OPTIONS") return json(200, {});

  const claims = getClaims(event);
  if (!claims) return json(401, { message: "Unauthorized" });

  const fid    = facilityId(claims);
  const role   = (claims["custom:role"] || claims.role || "").toLowerCase();
  const orgId  = claims["custom:orgId"] || claims.sub;
  const isAdmin = role === "admin" || (claims.email || "").endsWith("@nexumsuum.com") || (claims.email || "").endsWith("@nexumsuum-facilityintelligence.com");

  // Require leadership role to list/manage users
  if (!isAdmin && !LEADERSHIP_ROLES.some(r => role.includes(r))) {
    return json(403, { message: "Insufficient permissions." });
  }

  // ── GET /users ────────────────────────────────────────────────────────────
  if (method === "GET" && (path.endsWith("/users") || path.includes("/users?"))) {
    try {
      const qs    = event.queryStringParameters || {};
      const limit = Math.min(parseInt(qs.limit || "60"), 200);

      // Filter by orgId so we only return users in this org
      const filter = `"custom:orgId" = "${orgId}"`;

      const result = await cognito.send(new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter:     filter,
        Limit:      limit,
      }));

      const users = (result.Users || []).map(mapCognitoUser);
      return json(200, { users, count: users.length });
    } catch (err) {
      console.error("GET /users:", err);
      // Graceful fallback: return DynamoDB records if Cognito fails
      try {
        const r = await ddb.send(new QueryCommand({
          TableName:                 USERS_TABLE,
          KeyConditionExpression:    "PK = :pk",
          ExpressionAttributeValues: { ":pk": `ORG#${orgId}` },
          Limit: 100,
        }));
        return json(200, { users: r.Items || [], count: r.Count || 0, source: "dynamo" });
      } catch (dbErr) {
        return json(500, { message: "Failed to fetch users.", detail: err.message });
      }
    }
  }

  // ── POST /users ───────────────────────────────────────────────────────────
  if (method === "POST" && (path.endsWith("/users") || path.includes("/users?"))) {
    if (!isAdmin && !["admin","manager","director","executive","chief","owner"].some(r => role.includes(r))) {
      return json(403, { message: "Only managers and above can create users." });
    }
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
      if (!body.userId && !body.email) return json(400, { message: "userId or email is required." });

      const tier = claims["custom:tier"] || "basic";

      if (tier !== "admin") {
        const limits = TIER_LIMITS[tier] || TIER_LIMITS["basic"];
        const limit  = limits.maxUsers;
        if (limit !== null) {
          try {
            const countResult = await ddb.send(new QueryCommand({
              TableName:                 USERS_TABLE,
              KeyConditionExpression:    "PK = :pk",
              ExpressionAttributeValues: { ":pk": `ORG#${orgId}` },
              Select:                    "COUNT",
            }));
            const currentCount = countResult.Count || 0;
            if (currentCount >= limit) {
              return json(403, {
                error:   "LIMIT_REACHED",
                code:    "user_limit",
                current: currentCount,
                limit:   limit,
                tier:    tier,
                message: `User limit reached (${currentCount}/${limit}). Upgrade your plan to add more.`,
              });
            }
          } catch (countErr) {
            console.error("User limit count check failed (allowing write):", countErr);
          }
        }
      }

      const now    = new Date().toISOString();
      const userId = body.userId || body.email;
      const item   = {
        PK:         `ORG#${orgId}`,
        SK:         `USER#${userId}`,
        userId,
        email:      body.email      || "",
        name:       body.name       || "",
        role:       body.role       || "staff",
        department: body.department || "",
        tier:       body.tier       || tier,
        orgId,
        facilityId: fid,
        status:     body.status     || "active",
        createdAt:  now,
        updatedAt:  now,
      };

      await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));
      return json(201, { success: true, userId, user: item });
    } catch (err) {
      console.error("POST /users:", err);
      return json(500, { message: "Failed to create user.", detail: err.message });
    }
  }

  // ── GET /users/{userId} ───────────────────────────────────────────────────
  if (method === "GET" && path.includes("/users/")) {
    try {
      const userId = path.split("/users/")[1].split("?")[0];
      const result = await cognito.send(new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username:   userId,
      }));
      return json(200, { user: mapCognitoUser(result) });
    } catch (err) {
      if (err.name === "UserNotFoundException") return json(404, { message: "User not found." });
      console.error("GET /users/{userId}:", err);
      return json(500, { message: "Failed to fetch user.", detail: err.message });
    }
  }

  // ── PATCH /users/{userId} ─────────────────────────────────────────────────
  if (method === "PATCH" && path.includes("/users/")) {
    if (!isAdmin && !["admin","manager","director","executive","chief","owner"].some(r => role.includes(r))) {
      return json(403, { message: "Only managers and above can update users." });
    }
    try {
      const userId = path.split("/users/")[1].split("?")[0];
      const body   = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};

      const attrs = [];
      if (body.role)       attrs.push({ Name: "custom:role",       Value: String(body.role) });
      if (body.department) attrs.push({ Name: "custom:department", Value: String(body.department) });
      if (body.tier)       attrs.push({ Name: "custom:tier",       Value: String(body.tier) });

      if (attrs.length === 0) return json(400, { message: "No updatable fields provided." });

      await cognito.send(new AdminUpdateUserAttributesCommand({
        UserPoolId:     USER_POOL_ID,
        Username:       userId,
        UserAttributes: attrs,
      }));

      return json(200, { userId, updated: attrs.map(a => a.Name) });
    } catch (err) {
      if (err.name === "UserNotFoundException") return json(404, { message: "User not found." });
      console.error("PATCH /users/{userId}:", err);
      return json(500, { message: "Failed to update user.", detail: err.message });
    }
  }

  return json(404, { message: "Not found." });
};
