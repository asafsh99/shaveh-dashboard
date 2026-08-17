/**
 * Data Validation & Aggregation Engine - Stage 1
 * Implements Headcount-Weighted Aggregation math and outputs
 * verification tables (console.table) for full dataset audit.
 */

window.DataValidator = (function() {

  /**
   * Calculates Total Employees (Men + Women)
   * @param {Array<Object>} records 
   * @returns {Object} { totalMen, totalWomen, totalEmployees }
   */
  function calculateTotalEmployees(records) {
    let totalMen = 0;
    let totalWomen = 0;

    records.forEach(r => {
      totalMen += (r.menCount || 0);
      totalWomen += (r.womenCount || 0);
    });

    return {
      totalMen,
      totalWomen,
      totalEmployees: totalMen + totalWomen
    };
  }

  /**
   * Calculates Weighted Average Men's Wage
   * Formula: Sum(AvgWage_i * Count_i) / Sum(Count_i)
   * @param {Array<Object>} records 
   * @returns {number}
   */
  function calculateWeightedAverageMenWage(records) {
    let weightedWageSum = 0;
    let validCountSum = 0;

    records.forEach(r => {
      if (r.avgMenWage !== null && r.menCount !== null && r.menCount > 0) {
        weightedWageSum += r.avgMenWage * r.menCount;
        validCountSum += r.menCount;
      }
    });

    return validCountSum > 0 ? (weightedWageSum / validCountSum) : 0;
  }

  /**
   * Calculates Weighted Average Women's Wage
   * Formula: Sum(AvgWage_i * Count_i) / Sum(Count_i)
   * @param {Array<Object>} records 
   * @returns {number}
   */
  function calculateWeightedAverageWomenWage(records) {
    let weightedWageSum = 0;
    let validCountSum = 0;

    records.forEach(r => {
      if (r.avgWomenWage !== null && r.womenCount !== null && r.womenCount > 0) {
        weightedWageSum += r.avgWomenWage * r.womenCount;
        validCountSum += r.womenCount;
      }
    });

    return validCountSum > 0 ? (weightedWageSum / validCountSum) : 0;
  }

  /**
   * Calculates Overall Average Wage (Men + Women combined)
   * Formula: Sum(AvgMenWage_i*MenCount_i + AvgWomenWage_i*WomenCount_i) / Sum(Valid Men + Valid Women)
   * @param {Array<Object>} records 
   * @returns {number}
   */
  function calculateOverallAverageWage(records) {
    let weightedWageSum = 0;
    let validCountSum = 0;

    records.forEach(r => {
      let mc = (r.menCount !== null && r.menCount > 0) ? r.menCount : 0;
      let wc = (r.womenCount !== null && r.womenCount > 0) ? r.womenCount : 0;
      if (r.avgMenWage !== null && mc > 0) {
        weightedWageSum += r.avgMenWage * mc;
        validCountSum += mc;
      }
      if (r.avgWomenWage !== null && wc > 0) {
        weightedWageSum += r.avgWomenWage * wc;
        validCountSum += wc;
      }
    });

    return validCountSum > 0 ? (weightedWageSum / validCountSum) : 0;
  }

  function calculateWeightedAverageMenEmployerCost(records) {
    let sum = 0, count = 0;
    records.forEach(r => {
      if (r.avgMenEmployerCost !== null && r.menCount !== null && r.menCount > 0) {
        sum += r.avgMenEmployerCost * r.menCount;
        count += r.menCount;
      }
    });
    return count > 0 ? (sum / count) : 0;
  }

  function calculateWeightedAverageWomenEmployerCost(records) {
    let sum = 0, count = 0;
    records.forEach(r => {
      if (r.avgWomenEmployerCost !== null && r.womenCount !== null && r.womenCount > 0) {
        sum += r.avgWomenEmployerCost * r.womenCount;
        count += r.womenCount;
      }
    });
    return count > 0 ? (sum / count) : 0;
  }

  function calculateWeightedAverageEmployerCost(records) {
    let sum = 0, count = 0;
    records.forEach(r => {
      let mc = (r.menCount !== null && r.menCount > 0) ? r.menCount : 0;
      let wc = (r.womenCount !== null && r.womenCount > 0) ? r.womenCount : 0;
      if (r.avgMenEmployerCost !== null && mc > 0) {
        sum += r.avgMenEmployerCost * mc;
        count += mc;
      }
      if (r.avgWomenEmployerCost !== null && wc > 0) {
        sum += r.avgWomenEmployerCost * wc;
        count += wc;
      }
    });
    return count > 0 ? (sum / count) : 0;
  }

  /**
   * Calculates Overall Gender Pay Gap (%)
   * Formula: ((AvgMenWage - AvgWomenWage) / AvgMenWage) * 100
   * @param {number} avgMenWage 
   * @param {number} avgWomenWage 
   * @returns {number}
   */
  function calculateGenderPayGap(avgMenWage, avgWomenWage) {
    if (!avgMenWage || avgMenWage === 0 || !avgWomenWage || avgWomenWage === 0) return null;
    return ((avgMenWage - avgWomenWage) / avgMenWage) * 100;
  }

  /**
   * Safely calculates the aggregate pay gap across multiple records
   * by ONLY including records where BOTH men and women have reported wages.
   * This prevents "apples-to-oranges" artifacts (e.g., comparing men in body A to women in body B).
   */
  function calculateAggregateGap(records) {
    const valid = records.filter(r => r.avgMenWage !== null && r.avgWomenWage !== null);
    if (valid.length === 0) return null;
    
    const mw = calculateWeightedAverageMenWage(valid);
    const ww = calculateWeightedAverageWomenWage(valid);
    return calculateGenderPayGap(mw, ww);
  }

  /**
   * Computes full aggregated KPIs object for a set of records
   * @param {Array<Object>} records 
   * @returns {Object}
   */
  function computeKPIs(records) {
    const counts = calculateTotalEmployees(records);
    const avgMenWage = calculateWeightedAverageMenWage(records);
    const avgWomenWage = calculateWeightedAverageWomenWage(records);
    const overallWage = calculateOverallAverageWage(records);
    const payGap = calculateGenderPayGap(avgMenWage, avgWomenWage);

    const avgMenEmployerCost = calculateWeightedAverageMenEmployerCost(records);
    const avgWomenEmployerCost = calculateWeightedAverageWomenEmployerCost(records);
    const overallEmployerCost = calculateWeightedAverageEmployerCost(records);
    const employerCostGap = calculateGenderPayGap(avgMenEmployerCost, avgWomenEmployerCost);

    return {
      totalRecords: records.length,
      totalMen: counts.totalMen,
      totalWomen: counts.totalWomen,
      totalEmployees: counts.totalEmployees,
      avgMenWage: Math.round(avgMenWage * 100) / 100,
      avgWomenWage: Math.round(avgWomenWage * 100) / 100,
      overallWage: Math.round(overallWage * 100) / 100,
      genderPayGapPercent: payGap !== null ? Math.round(payGap * 100) / 100 : null,
      avgMenEmployerCost: Math.round(avgMenEmployerCost * 100) / 100,
      avgWomenEmployerCost: Math.round(avgWomenEmployerCost * 100) / 100,
      overallEmployerCost: Math.round(overallEmployerCost * 100) / 100,
      employerCostGapPercent: employerCostGap !== null ? Math.round(employerCostGap * 100) / 100 : null,
    };
  }

  /**
   * Generates and logs comprehensive validation tables to console
   * @param {Array<Object>} records 
   */
  function runValidationReport(records) {
    console.log("%c========================================================", "color: #2563eb; font-weight: bold;");
    console.log("%c DATA INTEGRITY VERIFICATION REPORT - STAGE 1", "color: #1e40af; font-size: 14px; font-weight: bold;");
    console.log("%c========================================================", "color: #2563eb; font-weight: bold;");

    // 1. Overall Dataset KPIs
    const overall = computeKPIs(records);
    console.log("%c\n1. Overall Dataset KPIs (All Years, All Systems):", "font-weight: bold; color: #047857;");
    console.table([overall]);

    // 2. Breakdown by Data Source (Monthly vs Annual)
    const sources = [...new Set(records.map(r => r.source))];
    const sourceBreakdown = sources.map(src => {
      const filtered = records.filter(r => r.source === src);
      return { Source: src, ...computeKPIs(filtered) };
    });
    console.log("%c\n2. Breakdown by Data Source (Monthly vs Annual Salary):", "font-weight: bold; color: #047857;");
    console.table(sourceBreakdown);

    // 3. Breakdown by Year (2018 - 2024)
    const years = [...new Set(records.map(r => r.year))].sort((a, b) => a - b);
    const yearBreakdown = years.map(yr => {
      const filtered = records.filter(r => r.year === yr);
      return { Year: yr, ...computeKPIs(filtered) };
    });
    console.log("%c\n3. Breakdown by Year (2018 - 2024):", "font-weight: bold; color: #047857;");
    console.table(yearBreakdown);

    return {
      overall,
      sourceBreakdown,
      yearBreakdown
    };
  }

  return {
    calculateTotalEmployees,
    calculateWeightedAverageMenWage,
    calculateWeightedAverageWomenWage,
    calculateOverallAverageWage,
    calculateGenderPayGap,
    calculateAggregateGap,
    computeKPIs,
    runValidationReport
  };
})();
