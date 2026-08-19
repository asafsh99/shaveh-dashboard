const fs = require('fs');

// Load files in node
const dataBundleCode = fs.readFileSync('scripts/data_bundle.js', 'utf8');
eval(dataBundleCode);

const validatorCode = fs.readFileSync('scripts/validator.js', 'utf8');
eval(validatorCode);

const rawData = window.__PRELOADED_DATA__;

console.log("Overview rows:", rawData.overview.length);
console.log("PartTime rows:", rawData.partTime.length);

// Let's test filter by bodyName = ['רשות שדות תעופה']
const bodyName = 'רשות שדות תעופה';
const year = 2024;

// Filter overview records
const records = rawData.overview.filter(r => r.year === year && r.bodyName === bodyName);
console.log("Filtered overview records:", records.length);
console.log(records);

// Filter ptData
let ptFiltered = rawData.partTime.filter(r => r.year === year && r.bodyName === bodyName);
console.log("Filtered PT records:", ptFiltered.length);
console.log(ptFiltered);

// Calculate what renderKPIs calculates:
let ft_ms = 0, ft_mc = 0, ft_ws = 0, ft_wc = 0, ft_tc = 0, ft_men_tot = 0, ft_women_tot = 0;
let c_ms = 0, c_mc = 0, c_ws = 0, c_wc = 0;

ptFiltered.forEach(r => {
  const mc = r.ftMenCount || 0, wc = r.ftWomenCount || 0, tc = r.ftTotalCount || (mc + wc);
  ft_men_tot += mc;
  ft_women_tot += wc;
  ft_tc += tc;

  if (r.ftMenWage && mc > 0) { ft_ms += r.ftMenWage * mc; ft_mc += mc; }
  if (r.ftWomenWage && wc > 0) { ft_ws += r.ftWomenWage * wc; ft_wc += wc; }
  if (r.ftMenCost && mc > 0) { c_ms += r.ftMenCost * mc; c_mc += mc; }
  if (r.ftWomenCost && wc > 0) { c_ws += r.ftWomenCost * wc; c_wc += wc; }
});

const avgMenWage = ft_mc > 0 ? (ft_ms / ft_mc) : 0;
const avgWomenWage = ft_wc > 0 ? (ft_ws / ft_wc) : 0;
const payGap = (avgMenWage > 0 && avgWomenWage > 0) ? ((avgMenWage - avgWomenWage) / avgMenWage) * 100 : null;

let singleBodyOverallWage = null;
if (ptFiltered.length === 1 && ptFiltered[0].ftTotalWage) {
  singleBodyOverallWage = ptFiltered[0].ftTotalWage;
}
const overallWage = Math.round(singleBodyOverallWage || (ft_mc + ft_wc > 0 ? (ft_ms + ft_ws)/(ft_mc + ft_wc) : 0));

console.log({
  totalMen: ft_men_tot,
  totalWomen: ft_women_tot,
  totalEmployees: ft_tc,
  avgMenWage: Math.round(avgMenWage),
  avgWomenWage: Math.round(avgWomenWage),
  overallWage: overallWage,
  payGap: payGap !== null ? payGap.toFixed(1) + '%' : null
});
