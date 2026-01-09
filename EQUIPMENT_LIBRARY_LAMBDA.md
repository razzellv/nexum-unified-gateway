# Equipment Library Lambda - save-equipment

## Purpose
Save scanned equipment to permanent DynamoDB EquipmentLibrary table

## Environment Variables
- EQUIPMENT_LIBRARY_TABLE=EquipmentLibrary

## Lambda Code (save-equipment.mjs)
```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const TABLE = process.env.EQUIPMENT_LIBRARY_TABLE || "EquipmentLibrary";

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

export const handler = async (event) => {
  try {
    const claims = getClaims(event);
    if (!claims) return json(401, { message: "Unauthorized" });

    const facilityId = claims["custom:facilityId"];
    const orgId = claims["custom:orgId"];
    const userId = claims.sub;

    const body = JSON.parse(event.body || "{}");
    const { specs, confidence, documentType, photos = [], ai_analysis } = body;

    if (!specs) {
      return json(400, { message: "Equipment specs required" });
    }

    const equipmentId = `eq-${randomUUID()}`;
    const timestamp = new Date().toISOString();

    const item = {
      PK: `ORG#${orgId}`,
      SK: `EQUIPMENT#${equipmentId}#${timestamp}`,
      
      // IDs
      equipmentId,
      facilityId,
      orgId,
      
      // Equipment Data
      manufacturer: specs.Brand || specs.Manufacturer || 'Unknown',
      model: specs.Model || 'Unknown',
      serialNumber: specs.Serial_Number || specs.Serial || 'N/A',
      equipmentType: specs.Equipment_Type?.toLowerCase() || 'unknown',
      yearManufactured: specs.Year ? parseInt(specs.Year) : null,
      
      // Full specs
      specs: specs,
      
      // AI Analysis
      ai_analysis: ai_analysis || {
        confidence: confidence,
        documentType: documentType
      },
      
      // Media
      photos: photos,
      reports: [],
      
      // Metadata
      scannedAt: timestamp,
      scannedBy: userId,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      
      // GSI keys
      GSI1PK: `FACILITY#${facilityId}`,
      GSI1SK: `EQUIPMENT#${specs.Equipment_Type?.toLowerCase() || 'unknown'}#${timestamp}`,
      GSI2PK: `ORG#${orgId}`,
      GSI2SK: `TYPE#${specs.Equipment_Type?.toLowerCase() || 'unknown'}#${timestamp}`,
    };

    await client.send(new PutCommand({
      TableName: TABLE,
      Item: item
    }));

    // Count total equipment for billing
    const countResult = await client.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `ORG#${orgId}` },
      Select: "COUNT"
    }));

    const totalEquipment = countResult.Count || 0;
    const isOverLimit = totalEquipment > 25;

    return json(200, {
      message: "Equipment saved to library",
      equipmentId,
      totalEquipment,
      isOverLimit,
      additionalCharge: isOverLimit ? 10.00 : 0
    });

  } catch (err) {
    console.error("Error:", err);
    return json(500, { message: err?.message || "Internal server error" });
  }
};
```

## IAM Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:758027491272:table/EquipmentLibrary",
        "arn:aws:dynamodb:us-east-2:758027491272:table/EquipmentLibrary/index/*"
      ]
    }
  ]
}
```

## API Gateway Route
POST /equipment/save-to-library
- JWT Authorizer: Required
- Integration: save-equipment Lambda
