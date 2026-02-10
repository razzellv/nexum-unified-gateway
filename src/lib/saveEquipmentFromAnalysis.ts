// src/lib/saveEquipmentFromAnalysis.ts
// Helper function to save equipment after AI nameplate analysis

interface AIAnalysisData {
  analysis: string;
  specs?: any;
  imageBase64?: string;
  imageType?: string;
  fileName?: string;
}

interface SaveEquipmentParams {
  aiData: AIAnalysisData;
  facilityId: string;
}

export async function saveEquipmentFromAnalysis({ 
  aiData, 
  facilityId 
}: SaveEquipmentParams) {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                         'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';
    
    // Step 1: Parse AI analysis text to extract structured data
    const extractedData = parseAIAnalysis(aiData.analysis);
    
    // Step 2: Upload image to S3 if provided (optional - add later)
    let s3ImageUrl: string | null = null;
    if (aiData.imageBase64) {
      s3ImageUrl = await uploadImageToS3({
        base64: aiData.imageBase64,
        mimeType: aiData.imageType || 'image/jpeg',
        fileName: aiData.fileName || 'nameplate.jpg',
        facilityId,
      });
    }
    
    // Step 3: Prepare equipment data for DynamoDB
    const equipmentData = {
      facilityId,
      manufacturer: extractedData.manufacturer || 'Unknown',
      model: extractedData.model || 'Unknown',
      serialNumber: extractedData.serialNumber || '',
      equipmentType: extractedData.equipmentType || 'Other',
      specifications: {
        raw_analysis: aiData.analysis,
        ...extractedData.specifications,
      },
      photos: s3ImageUrl ? [s3ImageUrl] : [],
      location: extractedData.location || '',
      voltage: extractedData.voltage || null,
      amperage: extractedData.amperage || null,
      phase: extractedData.phase || null,
      horsepower: extractedData.horsepower || null,
      refrigerantType: extractedData.refrigerantType || null,
      capacity: extractedData.capacity || null,
      efficiency: extractedData.efficiency || null,
      aiExtracted: true,
      source: 'nameplate-scan',
      notes: `AI-analyzed on ${new Date().toISOString()}`,
    };

    // Step 4: Save to DynamoDB via API
    const accessToken = localStorage.getItem('nexum_access_token');
    
    const response = await fetch(`${API_BASE_URL}/equipment/intelligence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(equipmentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save equipment');
    }

    const result = await response.json();
    
    return {
      success: true,
      equipment: result.equipment,
      isDuplicate: result.isDuplicate,
    };

  } catch (error) {
    console.error('Error saving equipment:', error);
    throw error;
  }
}

// Parse AI analysis text to extract structured fields
function parseAIAnalysis(analysisText: string) {
  const extracted: any = {
    specifications: {},
  };

  // Equipment Type
  const typeMatch = analysisText.match(/Equipment Type[:\s]+([^\n]+)/i);
  if (typeMatch) {
    const type = typeMatch[1].trim().toLowerCase();
    if (type.includes('boiler')) extracted.equipmentType = 'Boiler';
    else if (type.includes('chiller')) extracted.equipmentType = 'Chiller';
    else if (type.includes('pump')) extracted.equipmentType = 'Pump';
    else if (type.includes('ahu') || type.includes('air handler')) extracted.equipmentType = 'AHU';
    else if (type.includes('compressor')) extracted.equipmentType = 'Compressor';
    else if (type.includes('cooling tower')) extracted.equipmentType = 'Cooling Tower';
    else extracted.equipmentType = 'Other';
  }

  // Manufacturer
  const mfgMatch = analysisText.match(/Manufacturer[:\s]+([^\n]+)/i) ||
                   analysisText.match(/Brand[:\s]+([^\n]+)/i);
  if (mfgMatch) {
    extracted.manufacturer = mfgMatch[1].trim();
  }

  // Model Number
  const modelMatch = analysisText.match(/Model Number[:\s]+([^\n]+)/i) ||
                     analysisText.match(/Model[:\s]+([^\n]+)/i);
  if (modelMatch) {
    extracted.model = modelMatch[1].trim();
  }

  // Serial Number
  const serialMatch = analysisText.match(/Serial Number[:\s]+([^\n]+)/i) ||
                      analysisText.match(/Serial[:\s]+([^\n]+)/i);
  if (serialMatch) {
    extracted.serialNumber = serialMatch[1].trim();
  }

  // Capacity
  const capacityMatch = analysisText.match(/Capacity[:\s]+([^\n]+)/i) ||
                        analysisText.match(/Size[:\s]+([^\n]+)/i);
  if (capacityMatch) {
    extracted.capacity = capacityMatch[1].trim();
    extracted.specifications.capacity = capacityMatch[1].trim();
  }

  // Power Rating (HP or kW)
  const powerMatch = analysisText.match(/Power Rating[:\s]+([^\n]+)/i) ||
                     analysisText.match(/(\d+\.?\d*)\s*(HP|kW)/i);
  if (powerMatch) {
    const powerValue = powerMatch[1].trim();
    if (powerValue.includes('HP')) {
      extracted.horsepower = powerValue;
    } else if (powerValue.includes('kW')) {
      extracted.specifications.kilowatts = powerValue;
    }
  }

  // Voltage
  const voltageMatch = analysisText.match(/Voltage[:\s]+([^\n]+)/i) ||
                       analysisText.match(/(\d+)\s*V/i);
  if (voltageMatch) {
    extracted.voltage = voltageMatch[1].trim().replace(/[^\d]/g, '');
  }

  // Phase
  const phaseMatch = analysisText.match(/Phase[:\s]+([^\n]+)/i) ||
                     analysisText.match(/(\d+)[- ]?phase/i);
  if (phaseMatch) {
    extracted.phase = phaseMatch[1].trim().replace(/[^\d]/g, '');
  }

  // Refrigerant Type
  const refMatch = analysisText.match(/Refrigerant Type[:\s]+([^\n]+)/i) ||
                   analysisText.match(/Refrigerant[:\s]+([^\n]+)/i) ||
                   analysisText.match(/(R-?\d+[A-Za-z]*)/i);
  if (refMatch) {
    extracted.refrigerantType = refMatch[1].trim();
  }

  // Efficiency (kW/ton, EER, SEER, etc.)
  const effMatch = analysisText.match(/Efficiency[:\s]+([^\n]+)/i) ||
                   analysisText.match(/(\d+\.?\d*)\s*(kW\/ton|EER|SEER)/i);
  if (effMatch) {
    extracted.efficiency = effMatch[1].trim();
  }

  // Pressure Ratings
  const pressureMatch = analysisText.match(/Pressure[:\s]+([^\n]+)/i);
  if (pressureMatch) {
    extracted.specifications.pressure = pressureMatch[1].trim();
  }

  return extracted;
}

// Upload image to S3 (placeholder - implement based on your S3 setup)
async function uploadImageToS3(params: {
  base64: string;
  mimeType: string;
  fileName: string;
  facilityId: string;
}): Promise<string> {
  // TODO: Implement actual S3 upload
  // For now, return placeholder
  console.log('S3 upload placeholder called', params.fileName);
  
  // You'll need to either:
  // 1. Create an S3 upload Lambda endpoint
  // 2. Use AWS SDK in frontend with presigned URLs
  // 3. Upload via existing API endpoint
  
  return `https://nexum-facility-intelligence.s3.amazonaws.com/nameplates/${params.facilityId}/${Date.now()}-${params.fileName}`;
}
