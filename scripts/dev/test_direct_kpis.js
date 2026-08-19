const fs = require('fs');

global.window = {};
const dataBundleCode = fs.readFileSync('scripts/data_bundle.js', 'utf8');
eval(dataBundleCode);

const validatorCode = fs.readFileSync('scripts/validator.js', 'utf8');
eval(validatorCode);

const rawData = window.__PRELOADED_DATA__;

const bodyName = 'רשות שדות תעופה';
const year = 2024;

const records = rawData.overview.filter(r => r.year === year && r.bodyName === bodyName);

const kpis = window.DataValidator.computeKPIs(records);

console.log("=== COMPUTE KPIS FOR AIRPORT AUTHORITY 2024 ===");
console.log({
  totalMen: Math.round(kpis.totalMen),
  totalWomen: Math.round(kpis.totalWomen),
  totalEmployees: Math.round(kpis.totalEmployees),
  avgMenWage: Math.round(kpis.avgMenWage),
  avgWomenWage: Math.round(kpis.avgWomenWage),
  overallWage: Math.round(kpis.overallWage),
  genderPayGapPercent: kpis.genderPayGapPercent !== null ? kpis.genderPayGapPercent.toFixed(1) + '%' : null,
  womenShare: ((kpis.totalWomen / kpis.totalEmployees) * 100).toFixed(0) + '%'
});
