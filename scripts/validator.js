/**
 * Data Validation & Aggregation Engine - Stage 1
 * Implements Headcount-Weighted Aggregation math and outputs
 * verification tables (console.table) for full dataset audit.
 *
 * Methodology note: every weighted average below excludes rows whose
 * weight (employee count) is <= PRIVACY_THRESHOLD from *both* the
 * numerator and the denominator — matching the same small-group privacy
 * suppression the source ministry applies (verified empirically against
 * the public "שכר שווה" Tableau dashboard on several bodies: Mifal
 * HaPayis, Bank of Israel, Haifa municipality — all reproduced within
 * ~0.2% using this rule together with the "משרה מלאה" wage columns).
 */

window.DataValidator = (function() {

  const PRIVACY_THRESHOLD = 5;

  /**
   * Generic headcount-weighted average: Sum(value_i * weight_i) / Sum(weight_i),
   * over rows where both value and weight are present and weight > threshold.
   */
  function weightedAvg(records, valueField, weightField, threshold = PRIVACY_THRESHOLD) {
    let sum = 0, weightSum = 0;
    records.forEach(r => {
      const v = r[valueField];
      const w = r[weightField];
      if (v !== null && v !== undefined && w !== null && w !== undefined && w > threshold) {
        sum += v * w;
        weightSum += w;
      }
    });
    return weightSum > 0 ? (sum / weightSum) : 0;
  }

  /**
   * Calculates Total Employees (Men + Women)
   * Sums exact fractional employee counts across all records, and rounds only at the final total.
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

    const roundedMen = Math.round(totalMen);
    const roundedWomen = Math.round(totalWomen);

    return {
      totalMen: roundedMen,
      totalWomen: roundedWomen,
      totalEmployees: roundedMen + roundedWomen
    };
  }

  /**
   * Computes complementary gender percentage shares ensuring they sum to EXACTLY 100%
   * and neither exceeds 100% or falls below 0%.
   * @param {number} menCount
   * @param {number} womenCount
   * @param {number} [decimals=0] - Decimal places (0 for integers, 1 for 0.1 precision)
   * @returns {{ menPct: number, womenPct: number, womenShare: number, menShare: number }}
   */
  function computeComplementaryShares(menCount, womenCount, decimals = 0) {
    const m = Math.max(0, Number(menCount) || 0);
    const w = Math.max(0, Number(womenCount) || 0);
    const total = m + w;
    if (total <= 0) {
      return { menPct: 0, womenPct: 0, menShare: 0, womenShare: 0 };
    }

    if (decimals === 0) {
      const rawWomen = (w / total) * 100;
      const womenPct = Math.min(100, Math.max(0, Math.round(rawWomen)));
      const menPct = Math.max(0, 100 - womenPct);
      return { menPct, womenPct, menShare: menPct, womenShare: womenPct };
    } else {
      const factor = Math.pow(10, decimals);
      const rawWomen = (w / total) * 100;
      const womenPct = Math.min(100, Math.max(0, Math.round(rawWomen * factor) / factor));
      const menPct = Math.max(0, +(100 - womenPct).toFixed(decimals));
      return { menPct, womenPct, menShare: menPct, womenShare: womenPct };
    }
  }

  // ── Rank-level (overview.csv) weighted averages ──────────────────
  // Use these only where per-rank detail is needed — "שכר גברים/נשים
  // ממוצע" in this file is a plainer wage concept than the FT columns
  // below (it does not include "הפרשים" — retroactive/differential
  // payments), so it will not reproduce the official published figures
  // as closely. It's the only source with rank-level detail though.

  function calculateWeightedAverageMenWage(records) {
    return weightedAvg(records, 'avgMenWage', 'menCount');
  }

  function calculateWeightedAverageWomenWage(records) {
    return weightedAvg(records, 'avgWomenWage', 'womenCount');
  }

  /**
   * Calculates Overall Average Wage (Men + Women combined) from overview.csv.
   * Prioritizes avgGrossRegular (a per-row combined-gender wage already
   * reported by the ministry), weighted by monthly employee count, with
   * fallback to the gender components when it's missing.
   */
  function calculateOverallAverageWage(records) {
    let weightedWageSum = 0;
    let validCountSum = 0;

    records.forEach(r => {
      let hc = (r.monthlyEmployeeCount !== null && r.monthlyEmployeeCount > 0)
        ? r.monthlyEmployeeCount
        : ((r.menCount || 0) + (r.womenCount || 0));
      if (hc <= PRIVACY_THRESHOLD) return;

      if (r.avgGrossRegular !== null && r.avgGrossRegular !== undefined) {
        weightedWageSum += r.avgGrossRegular * hc;
        validCountSum += hc;
      } else {
        let mc = (r.menCount !== null && r.menCount > PRIVACY_THRESHOLD) ? r.menCount : 0;
        let wc = (r.womenCount !== null && r.womenCount > PRIVACY_THRESHOLD) ? r.womenCount : 0;
        if (r.avgMenWage !== null && mc > 0) {
          weightedWageSum += r.avgMenWage * mc;
          validCountSum += mc;
        }
        if (r.avgWomenWage !== null && wc > 0) {
          weightedWageSum += r.avgWomenWage * wc;
          validCountSum += wc;
        }
      }
    });

    return validCountSum > 0 ? (weightedWageSum / validCountSum) : 0;
  }

  function calculateWeightedAverageMenEmployerCost(records) {
    return weightedAvg(records, 'avgMenEmployerCost', 'menCount');
  }

  function calculateWeightedAverageWomenEmployerCost(records) {
    return weightedAvg(records, 'avgWomenEmployerCost', 'womenCount');
  }

  function calculateWeightedAverageEmployerCost(records) {
    let sum = 0, count = 0;
    records.forEach(r => {
      let hc = (r.monthlyEmployeeCount !== null && r.monthlyEmployeeCount > 0)
        ? r.monthlyEmployeeCount
        : ((r.menCount || 0) + (r.womenCount || 0));
      if (hc <= PRIVACY_THRESHOLD) return;

      if (r.avgEmployerCost !== null && r.avgEmployerCost !== undefined) {
        sum += r.avgEmployerCost * hc;
        count += hc;
      } else {
        let mc = (r.menCount !== null && r.menCount > PRIVACY_THRESHOLD) ? r.menCount : 0;
        let wc = (r.womenCount !== null && r.womenCount > PRIVACY_THRESHOLD) ? r.womenCount : 0;
        if (r.avgMenEmployerCost !== null && mc > 0) {
          sum += r.avgMenEmployerCost * mc;
          count += mc;
        }
        if (r.avgWomenEmployerCost !== null && wc > 0) {
          sum += r.avgWomenEmployerCost * wc;
          count += wc;
        }
      }
    });
    return count > 0 ? (sum / count) : 0;
  }

  // ── Full-time (partTime.csv "משרה מלאה") weighted averages ───────
  // This is the source that actually matches the official published
  // figures (verified against Mifal HaPayis, Bank of Israel and Haifa
  // municipality — all within ~0.2%). Use this for any body/system/
  // national-level wage or gap figure. It has no rank-level detail.

  function calculateFTWeightedMenWage(partTimeRecords) {
    return weightedAvg(partTimeRecords, 'ftMenWage', 'ftMenCount');
  }

  function calculateFTWeightedWomenWage(partTimeRecords) {
    return weightedAvg(partTimeRecords, 'ftWomenWage', 'ftWomenCount');
  }

  function calculateFTWeightedOverallWage(partTimeRecords) {
    return weightedAvg(partTimeRecords, 'ftTotalWage', 'ftTotalCount');
  }

  function calculateFTWeightedMenEmployerCost(partTimeRecords) {
    return weightedAvg(partTimeRecords, 'ftMenEmployerCost', 'ftMenCount');
  }

  function calculateFTWeightedWomenEmployerCost(partTimeRecords) {
    return weightedAvg(partTimeRecords, 'ftWomenEmployerCost', 'ftWomenCount');
  }

  function calculateFTWeightedEmployerCost(partTimeRecords) {
    return weightedAvg(partTimeRecords, 'ftTotalEmployerCost', 'ftTotalCount');
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
   * Safely calculates the aggregate pay gap across multiple overview.csv
   * records by ONLY including rows where BOTH men and women have reported
   * wages. This prevents "apples-to-oranges" artifacts (e.g., comparing
   * men in body A to women in body B).
   */
  function calculateAggregateGap(records) {
    const valid = records.filter(r => r.avgMenWage !== null && r.avgWomenWage !== null);
    if (valid.length === 0) return null;

    const mw = calculateWeightedAverageMenWage(valid);
    const ww = calculateWeightedAverageWomenWage(valid);
    return calculateGenderPayGap(mw, ww);
  }

  /**
   * Same idea as calculateAggregateGap but for partTime.csv FT columns —
   * the correct source for body/system/national-level gap figures.
   */
  function calculateFTAggregateGap(partTimeRecords) {
    const valid = partTimeRecords.filter(r => r.ftMenWage !== null && r.ftWomenWage !== null);
    if (valid.length === 0) return null;

    const mw = calculateFTWeightedMenWage(valid);
    const ww = calculateFTWeightedWomenWage(valid);
    return calculateGenderPayGap(mw, ww);
  }

  /**
   * Computes full aggregated KPIs for a set of *partTime* records (the
   * correct source for body/system/national-level figures — see file
   * header). `overviewRecords` (optional) is only used to report the
   * total headcount (all employees, not just full-time) and record count,
   * matching what the rest of the dashboard already shows for "כלל
   * המועסקים".
   * @param {Array<Object>} partTimeRecords
   * @param {Array<Object>} [overviewRecords]
   * @returns {Object}
   */
  function computeKPIs(partTimeRecords, overviewRecords) {
    const avgMenWage = calculateFTWeightedMenWage(partTimeRecords);
    const avgWomenWage = calculateFTWeightedWomenWage(partTimeRecords);
    const overallWage = calculateFTWeightedOverallWage(partTimeRecords);
    const payGap = calculateFTAggregateGap(partTimeRecords);

    const avgMenEmployerCost = calculateFTWeightedMenEmployerCost(partTimeRecords);
    const avgWomenEmployerCost = calculateFTWeightedWomenEmployerCost(partTimeRecords);
    const overallEmployerCost = calculateFTWeightedEmployerCost(partTimeRecords);
    const employerCostGap = calculateGenderPayGap(avgMenEmployerCost, avgWomenEmployerCost);

    const basisRecords = overviewRecords || partTimeRecords;
    const counts = overviewRecords
      ? calculateTotalEmployees(overviewRecords)
      : { totalMen: null, totalWomen: null, totalEmployees: null };

    return {
      totalRecords: basisRecords.length,
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
   * Same shape as computeKPIs, but computed entirely from overview.csv —
   * the only source with rank-level detail. Use this only when a rank
   * filter is active (partTime.csv has no rank column to filter by).
   * @param {Array<Object>} records
   * @returns {Object}
   */
  function computeOverviewKPIs(records) {
    const counts = calculateTotalEmployees(records);
    const bothPresent = records.filter(r => r.avgMenWage !== null && r.avgWomenWage !== null);
    const basis = bothPresent.length > 0 ? bothPresent : records;

    const avgMenWage = calculateWeightedAverageMenWage(basis);
    const avgWomenWage = calculateWeightedAverageWomenWage(basis);
    const overallWage = calculateOverallAverageWage(records);
    const payGap = calculateGenderPayGap(avgMenWage, avgWomenWage);

    const avgMenEmployerCost = calculateWeightedAverageMenEmployerCost(basis);
    const avgWomenEmployerCost = calculateWeightedAverageWomenEmployerCost(basis);
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
   * @param {Array<Object>} partTimeRecords
   * @param {Array<Object>} [overviewRecords]
   */
  function runValidationReport(partTimeRecords, overviewRecords) {
    console.log("%c========================================================", "color: #2563eb; font-weight: bold;");
    console.log("%c DATA INTEGRITY VERIFICATION REPORT - STAGE 1", "color: #1e40af; font-size: 14px; font-weight: bold;");
    console.log("%c========================================================", "color: #2563eb; font-weight: bold;");

    // 1. Overall Dataset KPIs
    const overall = computeKPIs(partTimeRecords, overviewRecords);
    console.log("%c\n1. Overall Dataset KPIs (All Years, All Systems):", "font-weight: bold; color: #047857;");
    console.table([overall]);

    // 2. Breakdown by Data Source (Monthly vs Annual)
    const sources = [...new Set(partTimeRecords.map(r => r.source))];
    const sourceBreakdown = sources.map(src => {
      const filtered = partTimeRecords.filter(r => r.source === src);
      return { Source: src, ...computeKPIs(filtered) };
    });
    console.log("%c\n2. Breakdown by Data Source (Monthly vs Annual Salary):", "font-weight: bold; color: #047857;");
    console.table(sourceBreakdown);

    // 3. Breakdown by Year (2018 - 2024)
    const years = [...new Set(partTimeRecords.map(r => r.year))].sort((a, b) => a - b);
    const yearBreakdown = years.map(yr => {
      const filtered = partTimeRecords.filter(r => r.year === yr);
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

  /**
   * Automated runtime sanity checks on loaded datasets.
   * Catches mismapped columns, percentage vs count issues, and mathematical bounds.
   */
  function validateLoadedData(datasets) {
    const checks = [];
    const pt = datasets.partTime || [];

    // 1. Check count invariant (ensure counts aren't percentages)
    const maxMen = Math.max(...pt.map(r => r.ftMenCount || 0), 0);
    const maxWomen = Math.max(...pt.map(r => r.ftWomenCount || 0), 0);
    if (maxMen > 100 && maxWomen > 100) {
      checks.push({ test: 'אימות סוג מספרי עובדים (כמויות אמיתיות ולא אחוזים)', status: 'PASS' });
    } else {
      checks.push({ test: 'אימות סוג מספרי עובדים', status: 'FAIL', error: 'כמויות העובדים נמוכות מדי או מיוצגות כאחוזים' });
    }

    // 2. Check mathematical bounds on wages (min <= overall <= max)
    let boundViolations = 0;
    pt.forEach(r => {
      if (r.ftMenWage && r.ftWomenWage && r.ftTotalWage) {
        const minW = Math.min(r.ftMenWage, r.ftWomenWage) - 5;
        const maxW = Math.max(r.ftMenWage, r.ftWomenWage) + 5;
        if (r.ftTotalWage < minW || r.ftTotalWage > maxW) {
          boundViolations++;
        }
      }
    });
    if (boundViolations === 0) {
      checks.push({ test: 'גבולות שכר ממוצע כללי (תמיד בטווח בין שכר גברים לשכר נשים)', status: 'PASS' });
    } else {
      checks.push({ test: 'גבולות שכר ממוצע כללי', status: 'FAIL', error: `נמצאו ${boundViolations} חריגות מתמטיות` });
    }

    // 3. Anchor sanity check (מנהלת תקומה 2024) — a body with a distinctive,
    // manually-verified headcount, useful for catching column-mapping breaks.
    const tekuma = pt.find(r => r.year === 2024 && (r.bodyName || '').includes('תקומה'));
    if (tekuma && tekuma.ftMenCount === 15 && tekuma.ftWomenCount === 34 && Math.round(tekuma.ftTotalWage) === 29833) {
      checks.push({ test: 'בדיקת עוגן נתוני זהב (מנהלת תקומה 2024)', status: 'PASS' });
    } else if (tekuma) {
      checks.push({ test: 'בדיקת עוגן נתוני זהב (מנהלת תקומה 2024)', status: 'WARN', note: 'ערכי מנהלת תקומה שונים מקובץ היחוס' });
    }

    console.log("%c========================================================", "color: #059669; font-weight: bold;");
    console.log("%c בדיקות תקינות נתונים אוטומטיות (DATA SANITY CHECKS)", "color: #047857; font-size: 13px; font-weight: bold;");
    console.log("%c========================================================", "color: #059669; font-weight: bold;");
    console.table(checks);
    return checks;
  }

  return {
    PRIVACY_THRESHOLD,
    weightedAvg,
    calculateTotalEmployees,
    computeComplementaryShares,
    calculateWeightedAverageMenWage,
    calculateWeightedAverageWomenWage,
    calculateOverallAverageWage,
    calculateWeightedAverageMenEmployerCost,
    calculateWeightedAverageWomenEmployerCost,
    calculateWeightedAverageEmployerCost,
    calculateFTWeightedMenWage,
    calculateFTWeightedWomenWage,
    calculateFTWeightedOverallWage,
    calculateFTWeightedMenEmployerCost,
    calculateFTWeightedWomenEmployerCost,
    calculateFTWeightedEmployerCost,
    calculateGenderPayGap,
    calculateAggregateGap,
    calculateFTAggregateGap,
    computeKPIs,
    computeOverviewKPIs,
    runValidationReport,
    validateLoadedData,
  };
})();
