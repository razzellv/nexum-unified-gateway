export function calculateOperationalDepreciation(equipment: any) {
  const {
    purchasePrice = 0, purchaseDate, usefulLifeYears = 20,
    residualValue = 0, currentEfficiency, efficiencyBaseline = 100,
    maintenanceCostAccumulated = 0, laborCostAccumulated = 0,
    partsConsumedValue = 0, contractorCostAccumulated = 0,
    replacementCost = 0, maintenanceCostTrend = 'stable'
  } = equipment;

  const ageYears = purchaseDate
    ? (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    : 0;

  const annualDepreciation = (purchasePrice - residualValue) / usefulLifeYears;
  const accountingBookValue = Math.max(residualValue, purchasePrice - (annualDepreciation * ageYears));

  const efficiencyLoss = ((efficiencyBaseline - (currentEfficiency || efficiencyBaseline)) / efficiencyBaseline);
  const totalLifetimeCost = maintenanceCostAccumulated + laborCostAccumulated + partsConsumedValue + contractorCostAccumulated;
  const lifetimeCostRatio = purchasePrice > 0 ? totalLifetimeCost / purchasePrice : 0;

  const operationalAdjustment = Math.max(0, 1 - (efficiencyLoss * 0.6) - (Math.min(lifetimeCostRatio * 0.4, 0.4)));
  const operationalBookValue = Math.max(0, accountingBookValue * operationalAdjustment);

  let score = 0;
  score += Math.min(40, lifetimeCostRatio * 40);
  score += Math.min(30, efficiencyLoss * 60);
  score += Math.min(20, (ageYears / usefulLifeYears) * 20);
  if (maintenanceCostTrend === 'accelerating') score += 5;
  if (maintenanceCostTrend === 'critical') score += 10;
  score = Math.min(100, Math.round(score));

  const remainingLifeYears = Math.max(0, usefulLifeYears - ageYears - (efficiencyLoss * 5));
  const replacementWindowMonths = Math.round(remainingLifeYears * 12);

  let decisionDefensibilityRating = 'Weak';
  if (score >= 71) decisionDefensibilityRating = 'Strong';
  else if (score >= 41) decisionDefensibilityRating = 'Moderate';
  else if (score >= 20) decisionDefensibilityRating = 'Developing';

  const name = equipment.equipmentName || 'This asset';
  const age = Math.round(ageYears * 10) / 10;
  const effPct = Math.round(efficiencyLoss * 100);
  const costK = Math.round(totalLifetimeCost / 1000);
  const replK = Math.round(replacementCost / 1000);

  let boardReadyJustification = '';
  if (score >= 86) {
    boardReadyJustification = `${name} is ${age} years old and operating at ${effPct}% below baseline efficiency. Accumulated maintenance costs of $${costK}K represent ${Math.round(lifetimeCostRatio * 100)}% of original purchase price. With replacement cost at $${replK}K and operational life effectively exhausted, immediate replacement is financially and operationally justified.`;
  } else if (score >= 71) {
    boardReadyJustification = `${name} is entering its replacement window. At ${age} years with ${effPct}% efficiency degradation and $${costK}K in accumulated costs, capital planning for replacement within ${replacementWindowMonths} months is recommended. Early planning avoids emergency replacement premium.`;
  } else if (score >= 41) {
    boardReadyJustification = `${name} requires monitoring. Efficiency has declined ${effPct}% from baseline over ${age} years. Maintenance costs are trending upward. Estimated ${Math.round(remainingLifeYears)} years of operational life remaining under current maintenance regime.`;
  } else {
    boardReadyJustification = `${name} is performing within acceptable parameters. Current maintenance investment is appropriate for asset age and condition. Continue scheduled PM program and monitor efficiency trend annually.`;
  }

  return {
    accountingBookValue: Math.round(accountingBookValue),
    operationalBookValue: Math.round(operationalBookValue),
    totalLifetimeCost: Math.round(totalLifetimeCost),
    lifetimeCostRatio: Math.round(lifetimeCostRatio * 100) / 100,
    efficiencyDegradationRate: ageYears > 0 ? Math.round((efficiencyLoss / ageYears) * 100) / 100 : 0,
    replacementJustificationScore: score,
    estimatedRemainingLifeYears: Math.round(remainingLifeYears * 10) / 10,
    replacementWindowMonths,
    decisionDefensibilityRating,
    boardReadyJustification,
    annualDepreciation: Math.round(annualDepreciation),
    ageYears: Math.round(ageYears * 10) / 10,
  };
}
