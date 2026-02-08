// Energy Dashboard Calculator Lambda
// Aggregates facility logs and calculates kWh, costs, and BTU conversions

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'NexumSuumFacilityLogs';

// Energy conversion constants
const THERM_TO_KWH = 29.3; // 1 therm = 29.3 kWh
const BTU_TO_KWH = 0.000293; // 1 BTU = 0.000293 kWh
const THERM_TO_BTU = 100000; // 1 therm = 100,000 BTU

// Default utility rates (can be overridden)
const DEFAULT_RATES = {
  electric: 0.125, // $/kWh
  gas: 0.40, // $/therm
  water: 0.0167, // $/gallon
};

export const handler = async (event) => {
  console.log('⚡ Energy Dashboard Calculation Request:', JSON.stringify(event));
  
  const facilityId = event.queryStringParameters?.facilityId || 'facility-001';
  const days = parseInt(event.queryStringParameters?.days || '30');
  
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    
    const startTimestamp = startDate.toISOString();
    const endTimestamp = endDate.toISOString();
    
    console.log(`📊 Querying logs for ${facilityId} from ${startTimestamp} to ${endTimestamp}`);
    
    // Query all logs for the facility in date range
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': `FACILITY#${facilityId}`,
        ':start': `LOGS#${startTimestamp}`,
        ':end': `LOGS#${endTimestamp}#ZZZZZZZZ`,
      },
    };
    
    const result = await ddb.send(new QueryCommand(params));
    const logs = result.Items || [];
    
    console.log(`✅ Found ${logs.length} logs`);
    
    // Initialize aggregation structures
    const electricBySystem = {};
    const gasBySystem = {};
    const waterBySystem = {};
    const equipmentBreakdown = {};
    
    let totalKwh = 0;
    let totalTherms = 0;
    let totalGallons = 0;
    let totalRuntimeHours = 0;
    
    // Process each log
    logs.forEach(log => {
      const systemType = log.equipmentType || log.system || 'unknown';
      const equipmentId = log.equipmentId || log.equipment_id || 'unknown';
      
      // Extract energy data based on system type
      let kwh = 0;
      let therms = 0;
      let gallons = 0;
      let runtimeHours = 0;
      
      // ELECTRIC CONSUMPTION
      if (log.runtimeHours && log.currentKw) {
        // Calculate kWh = kW × hours
        kwh = parseFloat(log.currentKw) * parseFloat(log.runtimeHours);
      } else if (log.runtimeHours && log.motorKw) {
        // For pumps/motors
        kwh = parseFloat(log.motorKw) * parseFloat(log.runtimeHours);
      } else if (log.runtimeHours && log.fanKw) {
        // For AHUs
        kwh = parseFloat(log.fanKw) * parseFloat(log.runtimeHours);
      } else if (log.runtimeHours && log.kwDraw) {
        // For boilers (auxiliaries)
        kwh = parseFloat(log.kwDraw) * parseFloat(log.runtimeHours);
      }
      
      // GAS CONSUMPTION
      if (log.gasCCF) {
        // CCF to therms (1 CCF ≈ 1 therm)
        therms = parseFloat(log.gasCCF);
      } else if (log.primaryGasUsage) {
        therms += parseFloat(log.primaryGasUsage);
      }
      if (log.secondaryGasUsage) {
        therms += parseFloat(log.secondaryGasUsage);
      }
      
      // WATER CONSUMPTION
      if (log.waterUsageGallons) {
        gallons = parseFloat(log.waterUsageGallons);
      } else if (log.waterMeterReading) {
        // For building-level water meters, we'd need previous reading
        // For now, skip or use as total
      }
      
      // Runtime
      if (log.runtimeHours) {
        runtimeHours = parseFloat(log.runtimeHours);
      }
      
      // Aggregate by system type
      if (kwh > 0) {
        if (!electricBySystem[systemType]) {
          electricBySystem[systemType] = { kwh: 0, runtime_hours: 0 };
        }
        electricBySystem[systemType].kwh += kwh;
        electricBySystem[systemType].runtime_hours += runtimeHours;
        totalKwh += kwh;
      }
      
      if (therms > 0) {
        if (!gasBySystem[systemType]) {
          gasBySystem[systemType] = { therms: 0 };
        }
        gasBySystem[systemType].therms += therms;
        totalTherms += therms;
      }
      
      if (gallons > 0) {
        if (!waterBySystem[systemType]) {
          waterBySystem[systemType] = { gallons: 0 };
        }
        waterBySystem[systemType].gallons += gallons;
        totalGallons += gallons;
      }
      
      // Aggregate by equipment
      if (kwh > 0 && equipmentId !== 'unknown') {
        if (!equipmentBreakdown[equipmentId]) {
          equipmentBreakdown[equipmentId] = {
            equipment_id: equipmentId,
            type: systemType,
            name: log.system_asset?.name || equipmentId,
            total_kwh: 0,
          };
        }
        equipmentBreakdown[equipmentId].total_kwh += kwh;
      }
      
      if (runtimeHours > 0) {
        totalRuntimeHours += runtimeHours;
      }
    });
    
    // Calculate costs
    const electricCost = totalKwh * DEFAULT_RATES.electric;
    const gasCost = totalTherms * DEFAULT_RATES.gas;
    const waterCost = totalGallons * DEFAULT_RATES.water;
    const totalCost = electricCost + gasCost + waterCost;
    
    // Calculate gas equivalents
    const gasEquivalentKwh = totalTherms * THERM_TO_KWH;
    const totalBtus = totalTherms * THERM_TO_BTU;
    const totalCcf = totalTherms; // Approximation: 1 therm ≈ 1 CCF
    const totalEnergyEquivalentKwh = totalKwh + gasEquivalentKwh;
    
    // Format by_utility arrays with percentages
    const electricArray = Object.entries(electricBySystem).map(([type, data]) => ({
      system_type: type,
      kwh: Math.round(data.kwh),
      estimated_cost: parseFloat((data.kwh * DEFAULT_RATES.electric).toFixed(2)),
      runtime_hours: Math.round(data.runtime_hours),
      percentage_of_electric: parseFloat(((data.kwh / totalKwh) * 100).toFixed(1)),
    }));
    
    const gasArray = Object.entries(gasBySystem).map(([type, data]) => ({
      system_type: type,
      therms: Math.round(data.therms),
      btus: Math.round(data.therms * THERM_TO_BTU),
      estimated_cost: parseFloat((data.therms * DEFAULT_RATES.gas).toFixed(2)),
      percentage_of_gas: parseFloat(((data.therms / totalTherms) * 100).toFixed(1)),
    }));
    
    const waterArray = Object.entries(waterBySystem).map(([type, data]) => ({
      system_type: type,
      gallons: Math.round(data.gallons),
      estimated_cost: parseFloat((data.gallons * DEFAULT_RATES.water).toFixed(2)),
      percentage_of_water: parseFloat(((data.gallons / totalGallons) * 100).toFixed(1)),
    }));
    
    // Format equipment breakdown
    const equipmentArray = Object.values(equipmentBreakdown)
      .map(e => ({
        ...e,
        total_kwh: Math.round(e.total_kwh),
        estimated_cost: parseFloat((e.total_kwh * DEFAULT_RATES.electric).toFixed(2)),
      }))
      .sort((a, b) => b.total_kwh - a.total_kwh);
    
    const response = {
      facility_id: facilityId,
      generated_at: new Date().toISOString(),
      period_days: days,
      logs_processed: logs.length,
      
      rates: DEFAULT_RATES,
      
      summary: {
        total_kwh_consumed: Math.round(totalKwh),
        estimated_electric_cost: parseFloat(electricCost.toFixed(2)),
        total_therms_consumed: Math.round(totalTherms),
        total_ccf_consumed: Math.round(totalCcf),
        total_btus_consumed: Math.round(totalBtus),
        estimated_gas_cost: parseFloat(gasCost.toFixed(2)),
        gas_equivalent_kwh: Math.round(gasEquivalentKwh),
        total_gallons_consumed: Math.round(totalGallons),
        estimated_water_cost: parseFloat(waterCost.toFixed(2)),
        total_energy_equivalent_kwh: Math.round(totalEnergyEquivalentKwh),
        estimated_total_utility_cost: parseFloat(totalCost.toFixed(2)),
        total_runtime_hours: Math.round(totalRuntimeHours),
        average_kwh_per_day: parseFloat((totalKwh / days).toFixed(1)),
      },
      
      by_utility: {
        electric: electricArray,
        gas: gasArray,
        water: waterArray,
      },
      
      equipment_breakdown: equipmentArray,
    };
    
    console.log('✅ Energy calculation complete:', JSON.stringify(response.summary));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ Error calculating energy data:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to calculate energy data',
        message: error.message,
      }),
    };
  }
};
