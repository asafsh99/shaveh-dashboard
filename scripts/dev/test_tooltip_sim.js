const fs = require('fs');

global.window = {};
const dataBundleCode = fs.readFileSync('scripts/data_bundle.js', 'utf8');
eval(dataBundleCode);

const validatorCode = fs.readFileSync('scripts/validator.js', 'utf8');
eval(validatorCode);

const rawData = window.__PRELOADED_DATA__;
const records = rawData.overview.filter(r => r.year === 2024);

// Function from overview.js
function _aggregateBreakdown(records, groupKey) {
  const T = 5;
  const map = {};
  records.forEach(r => {
    const key = r[groupKey];
    if (!key) return;
    if (!map[key]) map[key] = {
      key,
      menCount: 0, womenCount: 0,
      menWageSum: 0, womenWageSum: 0,
      menWageCount: 0, womenWageCount: 0
    };
    const m = map[key];
    const mc = r.menCount || 0, wc = r.womenCount || 0;
    m.menCount += mc;
    m.womenCount += wc;
    if (r.avgMenWage && mc > 0)   { m.menWageSum += r.avgMenWage * mc; m.menWageCount += mc; }
    if (r.avgWomenWage && wc > 0) { m.womenWageSum += r.avgWomenWage * wc; m.womenWageCount += wc; }
  });

  return Object.values(map).map(m => {
    const hc = Math.round(m.menCount + m.womenCount);
    if (hc < T) return null;
    const menCount = Math.round(m.menCount);
    const womenCount = Math.round(m.womenCount);
    const menPct  = hc > 0 ? (menCount / hc) * 100 : 0;
    const womenPct = hc > 0 ? (womenCount / hc) * 100 : 0;
    const menWage   = m.menWageCount   > 0 ? Math.round(m.menWageSum   / m.menWageCount)   : null;
    const womenWage = m.womenWageCount > 0 ? Math.round(m.womenWageSum / m.womenWageCount) : null;
    const totalWageSum = m.menWageSum + m.womenWageSum;
    const totalWageCount = m.menWageCount + m.womenWageCount;
    const overallWage = totalWageCount > 0 ? Math.round(totalWageSum / totalWageCount) : null;
    const gap = (menWage != null && womenWage != null && menWage > 0)
      ? ((menWage - womenWage) / menWage) * 100
      : null;
    return { 
      key: m.key, 
      hc, 
      menCount, 
      womenCount, 
      menPct, 
      womenPct, 
      menWage, 
      womenWage, 
      overallWage, 
      gap 
    };
  }).filter(Boolean);
}

const breakdown = _aggregateBreakdown(records, 'bodyName');
const airport = breakdown.find(b => b.key.includes('שדות תעופה'));

console.log("=== AIRPORT AUTHORITY HOVER TOOLTIP METRICS ===");
console.log(airport);
