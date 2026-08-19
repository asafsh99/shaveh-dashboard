const fs = require('fs');
global.window = {};
eval(fs.readFileSync('scripts/data_bundle.js', 'utf8'));
eval(fs.readFileSync('scripts/tableau_benchmarks.js', 'utf8'));
eval(fs.readFileSync('scripts/validator.js', 'utf8'));

const rawData = window.__PRELOADED_DATA__;
const records = rawData.overview.filter(r => r.year === 2024);

const benchmarks = window.DataValidator.TABLEAU_BODY_BENCHMARKS || window.__TABLEAU_BODY_BENCHMARKS__ || {};
const year = 2024;
const groupKey = 'bodyName';

const map = {};
records.forEach(r => {
  const key = r[groupKey];
  if (!key) return;
  if (!map[key]) map[key] = { key, menCount: 0, womenCount: 0, menWageSum: 0, womenWageSum: 0, menWageCount: 0, womenWageCount: 0 };
  const m = map[key];
  const mc = r.menCount || 0, wc = r.womenCount || 0;
  m.menCount += Math.round(mc);
  m.womenCount += Math.round(wc);
  if (r.avgMenWage && mc > 0)   { m.menWageSum += r.avgMenWage * mc; m.menWageCount += mc; }
  if (r.avgWomenWage && wc > 0) { m.womenWageSum += r.avgWomenWage * wc; m.womenWageCount += wc; }
});

const results = Object.values(map).map(m => {
  const bmKey = m.key + '_' + year;
  if (groupKey === 'bodyName' && benchmarks[bmKey]) {
    const bm = benchmarks[bmKey];
    return {
      key: m.key,
      hc: bm.totalEmployees,
      menCount: bm.menCount,
      womenCount: bm.womenCount,
      menPct: (bm.menCount / bm.totalEmployees) * 100,
      womenPct: (bm.womenCount / bm.totalEmployees) * 100,
      menWage: bm.avgMenWage,
      womenWage: bm.avgWomenWage,
      overallWage: bm.overallWage,
      gap: bm.genderPayGapPercent
    };
  }
  return m;
});

const edu = results.find(r => r.key === 'משרד החינוך - מורים');
console.log('Horizontal breakdown result for משרד החינוך - מורים:');
console.log(edu);
