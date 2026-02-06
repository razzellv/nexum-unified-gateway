// Manager Dashboard - System Confidence Metrics Lambda
// Calculates confidence scores based on differential temps, pressures, and efficiency

export const handler = async (event) => {
  console.log('📊 Manager Dashboard Confidence Metrics Request:', JSON.stringify(event));
  
  const facilityId = event.pathParameters?.facilityId || 'facility-001';
  const days = event.queryStringParameters?.days || '7';
  
  try {
    // TODO: Query DynamoDB for facility logs from last N days
    // For now, return mock data structure
    
    const confidenceMetrics = {
      facility_id: facilityId,
      period_days: parseInt(days),
      generated_at: new Date().toISOString(),
      
      overall_confidence: 87.5,
      
      systems: [
        {
          system_type: 'boiler',
          equipment_id: 'BLR-001',
          name: 'Primary Boiler #1',
          confidence_score: 92.3,
          status: 'excellent',
          metrics: {
            // Temperature differentials
            avg_supply_temp: 185,
            rated_supply_temp: 180,
            temp_variance: 2.8, // %
            
            // Pressure performance
            avg_system_pressure: 125,
            rated_pressure: 125,
            pressure_variance: 0.0, // %
            
            // Efficiency
            operational_efficiency: 87.5,
            rated_efficiency: 85.0,
            efficiency_ratio: 1.029, // operational/rated
            
            // Fuel consumption vs output
            avg_fuel_psi: 3.5,
            avg_firing_rate: 75,
            
            // Runtime
            total_runtime_hours: 156,
            expected_runtime_hours: 168,
            runtime_ratio: 0.929
          },
          alerts: [],
          logs_count: 42
        },
        {
          system_type: 'chiller',
          equipment_id: 'CHL-001',
          name: 'Chiller #1',
          confidence_score: 85.7,
          status: 'good',
          metrics: {
            // Chilled water differential
            avg_chw_supply: 44,
            avg_chw_return: 54,
            chw_delta_t: 10,
            rated_delta_t: 12,
            delta_t_efficiency: 0.833, // actual/rated
            
            // Condenser water differential
            avg_cw_supply: 95,
            avg_cw_return: 85,
            cw_delta_t: 10,
            rated_cw_delta_t: 10,
            
            // Efficiency (kW/ton)
            avg_kw_per_ton: 0.65,
            rated_kw_per_ton: 0.60,
            efficiency_ratio: 0.923, // rated/actual (lower is better for chillers)
            
            // Tonnage
            avg_tons: 450,
            rated_tons: 500,
            capacity_utilization: 0.90,
            
            total_runtime_hours: 144,
            expected_runtime_hours: 168,
            runtime_ratio: 0.857
          },
          alerts: [
            {
              type: 'efficiency_warning',
              message: 'ΔT below optimal - check flow rate',
              severity: 2
            }
          ],
          logs_count: 38
        },
        {
          system_type: 'pump',
          equipment_id: 'PMP-001',
          name: 'CHW Pump #1',
          confidence_score: 78.2,
          status: 'fair',
          metrics: {
            avg_motor_current: 45.5,
            rated_motor_current: 42.0,
            current_variance: 8.3, // %
            
            avg_vfd_frequency: 58,
            avg_motor_speed: 1715,
            rated_motor_speed: 1750,
            
            avg_load_percent: 82,
            
            vibration_normal_pct: 85,
            vibration_elevated_pct: 15,
            
            total_runtime_hours: 165,
            expected_runtime_hours: 168,
            runtime_ratio: 0.982
          },
          alerts: [
            {
              type: 'vibration_warning',
              message: '15% of readings show elevated vibration',
              severity: 2
            },
            {
              type: 'current_warning',
              message: 'Motor current 8% above rated',
              severity: 2
            }
          ],
          logs_count: 35
        },
        {
          system_type: 'ahu',
          equipment_id: 'AHU-001',
          name: 'AHU Floor 1',
          confidence_score: 88.9,
          status: 'good',
          metrics: {
            // Temperature differential
            avg_supply_temp: 55,
            avg_return_temp: 72,
            temp_delta: 17,
            rated_temp_delta: 15,
            
            avg_fan_speed: 75,
            
            filter_clean_pct: 100,
            filter_dirty_pct: 0,
            
            total_runtime_hours: 160,
            expected_runtime_hours: 168,
            runtime_ratio: 0.952
          },
          alerts: [],
          logs_count: 40
        }
      ],
      
      summary: {
        total_systems: 4,
        excellent: 1,
        good: 2,
        fair: 1,
        poor: 0,
        total_alerts: 3,
        critical_alerts: 0,
        warning_alerts: 3,
        avg_confidence: 86.3,
        total_logs: 155
      }
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(confidenceMetrics)
    };
    
  } catch (error) {
    console.error('❌ Error calculating confidence metrics:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to calculate confidence metrics',
        message: error.message
      })
    };
  }
};
