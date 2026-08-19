const fs = require('fs');

global.window = {};
eval(fs.readFileSync('scripts/data_bundle.js', 'utf8'));

const overview = window.__PRELOADED_DATA__.overview.filter(r => r.year === 2024);
const minWage = window.__PRELOADED_DATA__.minWage.filter(r => r.year === 2024);

console.log(`Overview count for 2024: ${overview.length}`);
console.log(`MinWage count for 2024: ${minWage.length}`);

console.log('Sample minWage row:', minWage[0]);

const mwBodyMap = {};
minWage.forEach(r => {
  if (!r.bodyName) return;
  const count = (r.totalCount !== null && r.totalCount !== undefined) ? r.totalCount : ((r.menCount || 0) + (r.womenCount || 0));
  mwBodyMap[r.bodyName] = (mwBodyMap[r.bodyName] || 0) + (count || 0);
});

const ovBodyMap = {};
overview.forEach(r => {
  if (!r.bodyName) return;
  if (!ovBodyMap[r.bodyName]) {
    ovBodyMap[r.bodyName] = { hc: 0, wageSum: 0, wageHc: 0, system: r.system };
  }
  const mHc = r.menCount || 0;
  const wHc = r.womenCount || 0;
  if (r.avgMenWage) {
    ovBodyMap[r.bodyName].wageSum += r.avgMenWage * mHc;
    ovBodyMap[r.bodyName].wageHc += mHc;
  }
  if (r.avgWomenWage) {
    ovBodyMap[r.bodyName].wageSum += r.avgWomenWage * wHc;
    ovBodyMap[r.bodyName].wageHc += wHc;
  }
  ovBodyMap[r.bodyName].hc += (mHc + wHc);
});

let plotted = 0;
Object.keys(ovBodyMap).forEach(body => {
  const ov = ovBodyMap[body];
  const mwHc = mwBodyMap[body] || 0;
  if (ov.hc < 10) return;
  const avgWage = ov.wageHc > 0 ? (ov.wageSum / ov.wageHc) : 0;
  if (avgWage === 0) return;
  const mwPct = (mwHc / ov.hc) * 100;
  if (mwPct > 0) {
    plotted++;
  }
});

console.log(`Total bodies with min wage anomaly > 0%: ${plotted}`);
