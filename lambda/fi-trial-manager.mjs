/**
 * fi-trial-manager.mjs
 * Daily CloudWatch Events Lambda — cleans up expired trial accounts.
 *
 * Schedule: runs once per day.
 * Logic:
 *   1. List all Cognito users with custom:tier = "trial"
 *   2. If UserCreateDate > (TRIAL_DAYS + GRACE_DAYS) ago → delete Cognito user + DynamoDB record
 *   3. Log summary for CloudWatch Logs
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  DynamoDBClient,
  DeleteItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';

const REGION     = process.env.AWS_REGION        || 'us-east-2';
const USER_POOL  = process.env.COGNITO_USER_POOL || 'us-east-2_mKMqaRq70';
const USERS_TABLE = process.env.USERS_TABLE      || 'NexumUsers';

// 7-day trial + 30-day grace = 37 days total before deletion
const TRIAL_DAYS = 7;
const GRACE_DAYS = 30;
const EXPIRY_MS  = (TRIAL_DAYS + GRACE_DAYS) * 24 * 60 * 60 * 1000;

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const dynamo  = new DynamoDBClient({ region: REGION });

export const handler = async () => {
  const now = Date.now();
  let nextToken;
  let deleted = 0;
  let skipped = 0;

  do {
    const listCmd = new ListUsersCommand({
      UserPoolId:  USER_POOL,
      Filter:      'custom:tier = "trial"',
      Limit:       60,
      PaginationToken: nextToken,
    });

    const { Users = [], PaginationToken } = await cognito.send(listCmd);
    nextToken = PaginationToken;

    for (const u of Users) {
      const createdAt = u.UserCreateDate ? new Date(u.UserCreateDate).getTime() : 0;
      if (!createdAt || now - createdAt < EXPIRY_MS) {
        skipped++;
        continue;
      }

      const username = u.Username;
      const email    = u.Attributes?.find(a => a.Name === 'email')?.Value || username;

      // Delete from Cognito
      try {
        await cognito.send(new AdminDeleteUserCommand({
          UserPoolId: USER_POOL,
          Username:   username,
        }));
      } catch (err) {
        console.error(`Failed to delete Cognito user ${username}:`, err);
        continue;
      }

      // Best-effort: remove from NexumUsers table (PK = email or username)
      try {
        await dynamo.send(new DeleteItemCommand({
          TableName: USERS_TABLE,
          Key: { email: { S: email } },
        }));
      } catch {
        // Not fatal — Cognito record is the source of truth
      }

      deleted++;
      console.log(`Deleted expired trial account: ${email} (created ${new Date(createdAt).toISOString()})`);
    }
  } while (nextToken);

  const summary = `Trial manager: deleted=${deleted} skipped=${skipped}`;
  console.log(summary);
  return { statusCode: 200, body: summary };
};
