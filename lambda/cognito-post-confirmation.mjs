// ── cognito-post-confirmation Lambda ──────────────────────────────────────────
// Cognito User Pool Post-Confirmation trigger.
// Fires after a new user confirms their email address.
//
// Behaviour:
//   1. Check NexumPilots table for an approved/active pilot entry with this email.
//      If found → set custom:tier = "business"
//   2. Otherwise → set custom:tier = "basic" (default tier for all new users)
//   3. Also sets custom:role = "manager" if not already present (sensible default)
//
// Wired as: Cognito User Pool → Triggers → Post confirmation → this Lambda ARN

import { DynamoDBClient }                   from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const ddb     = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const cognito = new CognitoIdentityProviderClient({ region: "us-east-2" });

const PILOTS_TABLE = process.env.PILOTS_TABLE || "NexumPilots";
const PILOT_TIER   = "business";
const DEFAULT_TIER = "basic";
const DEFAULT_ROLE = "manager";

export const handler = async (event) => {
  try {
    const userEmail  = (event.request?.userAttributes?.email || "").toLowerCase();
    const userPoolId = event.userPoolId;
    const username   = event.userName;

    if (!userEmail || !userPoolId || !username) return event;

    // ── Check for approved or active pilot ────────────────────────────────────
    let tier = DEFAULT_TIER;

    for (const status of ["approved", "active"]) {
      const result = await ddb.send(new QueryCommand({
        TableName:                 PILOTS_TABLE,
        IndexName:                 "GSI1",
        KeyConditionExpression:    "GSI1PK = :status",
        FilterExpression:          "email = :email",
        ExpressionAttributeValues: {
          ":status": `STATUS#${status}`,
          ":email":  userEmail,
        },
        Limit: 1,
      }));

      if (result.Items && result.Items.length > 0) {
        tier = result.Items[0].pilotTier || PILOT_TIER;
        console.log(`Pilot match found for ${userEmail} (status=${status}) → tier=${tier}`);
        break;
      }
    }

    // ── Set custom:tier (and default role if not present) ─────────────────────
    const existingRole = event.request?.userAttributes?.["custom:role"];
    const attrs = [
      { Name: "custom:tier", Value: tier },
    ];
    if (!existingRole) {
      attrs.push({ Name: "custom:role", Value: DEFAULT_ROLE });
    }

    await cognito.send(new AdminUpdateUserAttributesCommand({
      UserPoolId:     userPoolId,
      Username:       username,
      UserAttributes: attrs,
    }));

    console.log(`Post-confirmation: ${username} (${userEmail}) → tier=${tier}`);

  } catch (err) {
    // Never throw — must return event to Cognito or signup fails
    console.error("cognito-post-confirmation error:", err.message);
  }

  return event;
};
