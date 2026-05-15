// Cognito User Pool Post-Confirmation trigger.
// Fires after a new user confirms their email address.
//
// Priority order for role/facilityId/department:
//   1. Invite record (if custom:inviteId present on user) — staff joining via invite link
//   2. Pilot record (approved/active pilot) — pilot-program signups get 'business' tier
//   3. Defaults — new org owner gets tier='basic', role='manager'

import { DynamoDBClient }                   from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const ddb     = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const cognito = new CognitoIdentityProviderClient({ region: "us-east-2" });

const PILOTS_TABLE     = process.env.PILOTS_TABLE      || "NexumPilots";
const ONBOARDING_TABLE = process.env.ONBOARDING_TABLE  || "NexumOnboarding";
const DEFAULT_TIER     = "basic";
const DEFAULT_ROLE     = "manager";

export const handler = async (event) => {
  try {
    const userAttrs  = event.request?.userAttributes || {};
    const userEmail  = (userAttrs.email || "").toLowerCase();
    const userPoolId = event.userPoolId;
    const username   = event.userName;

    if (!userEmail || !userPoolId || !username) return event;

    // ── 1. Check for invite record ────────────────────────────────────────────
    const inviteId = userAttrs["custom:inviteId"] || "";
    let inviteData = null;

    if (inviteId) {
      try {
        const result = await ddb.send(new GetCommand({
          TableName: ONBOARDING_TABLE,
          Key: { PK: `INVITE#${inviteId}`, SK: "METADATA" },
        }));
        if (result.Item && result.Item.status === "pending") {
          inviteData = result.Item;
          // Mark invite accepted so link can't be reused
          await ddb.send(new UpdateCommand({
            TableName: ONBOARDING_TABLE,
            Key: { PK: `INVITE#${inviteId}`, SK: "METADATA" },
            UpdateExpression: "SET #st = :accepted, acceptedAt = :now",
            ExpressionAttributeNames:  { "#st": "status" },
            ExpressionAttributeValues: { ":accepted": "accepted", ":now": new Date().toISOString() },
          }));
          // Also update org-scoped record
          await ddb.send(new UpdateCommand({
            TableName: ONBOARDING_TABLE,
            Key: { PK: `ORG#${inviteData.orgId}`, SK: `INVITE#${inviteId}` },
            UpdateExpression: "SET #st = :accepted, acceptedAt = :now",
            ExpressionAttributeNames:  { "#st": "status" },
            ExpressionAttributeValues: { ":accepted": "accepted", ":now": new Date().toISOString() },
          }));
          console.log(`Invite ${inviteId} accepted by ${userEmail} → role=${inviteData.role}`);
        }
      } catch (err) {
        console.error("invite lookup error:", err.message);
      }
    }

    // ── 2. Check for pilot tier ───────────────────────────────────────────────
    let tier = DEFAULT_TIER;
    for (const status of ["approved", "active"]) {
      const result = await ddb.send(new QueryCommand({
        TableName:                 PILOTS_TABLE,
        IndexName:                 "GSI1",
        KeyConditionExpression:    "GSI1PK = :status",
        FilterExpression:          "email = :email",
        ExpressionAttributeValues: { ":status": `STATUS#${status}`, ":email": userEmail },
        Limit: 1,
      }));
      if (result.Items?.length > 0) {
        tier = result.Items[0].pilotTier || "business";
        console.log(`Pilot match: ${userEmail} → tier=${tier}`);
        break;
      }
    }

    // ── 3. Build attribute update ─────────────────────────────────────────────
    const attrs = [{ Name: "custom:tier", Value: tier }];

    if (inviteData) {
      // Staff joining via invite — apply all invite-assigned attributes
      if (inviteData.role)       attrs.push({ Name: "custom:role",       Value: inviteData.role });
      if (inviteData.facilityId) attrs.push({ Name: "custom:facilityId", Value: inviteData.facilityId });
      if (inviteData.department) attrs.push({ Name: "custom:department", Value: inviteData.department });
      if (inviteData.orgId)      attrs.push({ Name: "custom:orgId",      Value: inviteData.orgId });
      if (inviteData.orgType)    attrs.push({ Name: "custom:orgType",    Value: inviteData.orgType });
    } else {
      // New org owner — set default role if not already present
      const existingRole = userAttrs["custom:role"];
      if (!existingRole) attrs.push({ Name: "custom:role", Value: DEFAULT_ROLE });
    }

    await cognito.send(new AdminUpdateUserAttributesCommand({
      UserPoolId:     userPoolId,
      Username:       username,
      UserAttributes: attrs,
    }));

    console.log(`Post-confirmation: ${username} (${userEmail}) → tier=${tier}, role=${inviteData?.role || userAttrs["custom:role"] || DEFAULT_ROLE}`);

  } catch (err) {
    // Never throw — must return event or Cognito signup fails
    console.error("cognito-post-confirmation error:", err.message);
  }

  return event;
};
