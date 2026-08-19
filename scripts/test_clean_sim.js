const fs = require('fs');

global.window = {};
const dataBundleCode = fs.readFileSync('scripts/data_bundle.js', 'utf8');
eval(dataBundleCode);

const rawData = window.__PRELOADED_DATA__;

const bodyName = 'רשות שדות תעופה';
const year = 2024;

let ptFiltered = rawData.partTime.filter(r => r.year === year && r.bodyName === bodyName);

let ft_ms = 0, ft_mc = 0, ft_ws = 0, ft_wc = 0, ft_tc = 0, ft_men_tot = 0, ft_women_tot = 0;

ptFiltered.forEach(r => {
  const mc = r.ftMenCount || 0, wc = r.ftWomenCount || 0, tc = r.ftTotalCount || (mc + wc);
  ft_men_tot += mc;
  ft_women_tot += wc;
  ft_tc += tc;

  if (r.ftMenWage && mc > 0) { ft_ms += r.ftMenWage * mc; ft_mc += mc; }
  if (r.ftWomenWage && wc > 0) { ft_ws += r.ftWomenWage * wc; ft_wc += wc; }
});

const avgMenWage = ft_mc > 0 ? (ft_ms / ft_mc) : 0;
const avgWomenWage = ft_wc > 0 ? (ft_ws / ft_wc) : 0;
const payGap = (avgMenWage > 0 && avgWomenWage > 0) ? ((avgMenWage - avgWomenWage) / avgMenWage) * 100 : null;

let singleBodyOverallWage = null;
if (ptFiltered.length === 1 && ptFiltered[0].ftTotalWage) {
  singleBodyOverallWage = ptFiltered[0].ftTotalWage;
}
const overallWage = Math.round(singleBodyOverallWage || (ft_mc + ft_wc > 0 ? (ft_ms + ft_ws)/(ft_mc + ft_wc) : 0));

console.log("RESULT:");
console.log({
  totalMen: ft_men_tot,
  totalWomen: ft_women_tot,
  totalEmployees: ft_tc,
  avgMenWage: Math.round(avgMenWage),
  avgWomenWage: Math.round(avgWomenWage),
  overallWage: overallWage,
  payGap: payGap !== null ? payGap.toFixed(1) + '%' : null
});
