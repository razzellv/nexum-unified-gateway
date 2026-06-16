export function calculatePMBOKLifecycle(equipment: any) {
  const {
    purchasePrice = 0, purchaseDate, usefulLifeYears = 20,
    residualValue = 0, replacementCost = 0,
    maintenanceCostAccumulated = 0, laborCostAccumulated = 0,
    partsConsumedValue = 0, contractorCostAccumulated = 0,
  } = equipment;

  const ageYears = purchaseDate
    ? (Date.now() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    : 0;
  const depreciableAmount = purchasePrice - residualValue;

  // ── Depreciation Methods ─────────────────────────────────────────────────
  const slAnnual = usefulLifeYears > 0 ? depreciableAmount / usefulLifeYears : 0;
  const slBookValue = Math.max(residualValue, purchasePrice - slAnnual * ageYears);

  const ddbRate = usefulLifeYears > 0 ? 2 / usefulLifeYears : 0;
  let ddbBookValue = purchasePrice;
  const fullYears = Math.floor(ageYears);
  for (let y = 0; y < fullYears; y++) {
    ddbBookValue = Math.max(residualValue, ddbBookValue * (1 - ddbRate));
  }
  const frac = ageYears - fullYears;
  if (frac > 0) ddbBookValue = Math.max(residualValue, ddbBookValue * (1 - ddbRate * frac));

  const sydTotal = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
  let sydBookValue = purchasePrice;
  for (let y = 0; y < ageYears && y < usefulLifeYears; y++) {
    const fraction = Math.min(1, ageYears - y);
    sydBookValue -= (depreciableAmount * ((usefulLifeYears - y) / sydTotal)) * fraction;
  }
  sydBookValue = Math.max(residualValue, sydBookValue);

  // ── EVM Metrics (PMBOK 7th edition) ─────────────────────────────────────
  // Model the asset lifecycle as a project with 10% annual O&M budget (industry standard)
  const annualOMBudget = purchasePrice * 0.1;
  const bac = purchasePrice + annualOMBudget * usefulLifeYears;
  const timeElapsedPct = usefulLifeYears > 0 ? Math.min(1, ageYears / usefulLifeYears) : 0;
  const plannedValue = bac * timeElapsedPct;

  const totalOMAccumulated = maintenanceCostAccumulated + laborCostAccumulated + partsConsumedValue + contractorCostAccumulated;
  const actualCost = purchasePrice + totalOMAccumulated;

  const valueRetained = purchasePrice > 0 ? slBookValue / purchasePrice : 1;
  const earnedValue = purchasePrice * valueRetained + totalOMAccumulated * 0.25;

  const cpi = actualCost > 0 ? earnedValue / actualCost : 1;
  const spi = plannedValue > 0 ? earnedValue / plannedValue : 1;
  const costVariance = earnedValue - actualCost;
  const scheduleVariance = earnedValue - plannedValue;
  const eac = cpi > 0.01 ? actualCost + (bac - earnedValue) / cpi : bac;
  const vac = bac - eac;

  // ── Capital Replacement Forecast ─────────────────────────────────────────
  const inflationRate = 0.035;
  const discountRate = 0.05;
  const yearsToReplacement = Math.max(0, usefulLifeYears - ageYears);
  const baseReplacement = replacementCost || purchasePrice;
  const inflatedReplacement = baseReplacement * Math.pow(1 + inflationRate, yearsToReplacement);
  const npvReplacement = yearsToReplacement > 0
    ? inflatedReplacement / Math.pow(1 + discountRate, yearsToReplacement)
    : inflatedReplacement;
  const annualReserveFunding = yearsToReplacement > 0 ? inflatedReplacement / yearsToReplacement : inflatedReplacement;

  // ── LCCA (Life Cycle Cost Analysis — ASTM E917) ──────────────────────────
  const disposalEstimate = Math.round(purchasePrice * 0.03);
  const lcca = {
    acquisition: purchasePrice,
    operationsAndMaintenance: Math.round(totalOMAccumulated),
    projectedFutureOM: Math.round(annualOMBudget * yearsToReplacement),
    disposalEstimate,
    totalLCC: Math.round(purchasePrice + totalOMAccumulated + annualOMBudget * yearsToReplacement + disposalEstimate),
  };

  return {
    depreciation: {
      straightLine: { annual: Math.round(slAnnual), bookValue: Math.round(slBookValue) },
      decliningBalance: { rate: Math.round(ddbRate * 100), bookValue: Math.round(ddbBookValue) },
      sumOfYearsDigits: { bookValue: Math.round(sydBookValue) },
    },
    evm: {
      plannedValue: Math.round(plannedValue),
      earnedValue: Math.round(earnedValue),
      actualCost: Math.round(actualCost),
      cpi: Math.round(cpi * 100) / 100,
      spi: Math.round(spi * 100) / 100,
      costVariance: Math.round(costVariance),
      scheduleVariance: Math.round(scheduleVariance),
      eac: Math.round(eac),
      vac: Math.round(vac),
      bac: Math.round(bac),
    },
    capitalForecast: {
      currentReplacementCost: baseReplacement,
      yearsToReplacement: Math.round(yearsToReplacement * 10) / 10,
      inflatedReplacement: Math.round(inflatedReplacement),
      npvReplacement: Math.round(npvReplacement),
      annualReserveFunding: Math.round(annualReserveFunding),
      costDelta: Math.round(inflatedReplacement - baseReplacement),
    },
    lcca,
    ageYears: Math.round(ageYears * 10) / 10,
  };
}

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
