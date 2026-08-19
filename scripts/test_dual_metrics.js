const fs = require('fs');

global.window = {
  App: {
    state: {
      data: {},
      filterOptions: { years: [2018, 2019, 2020, 2021, 2022, 2023, 2024] }
    }
  }
};

eval(fs.readFileSync('scripts/data_bundle.js', 'utf8'));
eval(fs.readFileSync('scripts/tableau_benchmarks.js', 'utf8'));
global.window.App.state.data = window.__PRELOADED_DATA__;
eval(fs.readFileSync('scripts/parser.js', 'utf8'));
global.DataEngine = window.DataEngine;
eval(fs.readFileSync('scripts/validator.js', 'utf8'));
global.DataValidator = window.DataValidator;
eval(fs.readFileSync('scripts/insights.js', 'utf8'));
global.InsightsEngine = window.InsightsEngine;
eval(fs.readFileSync('scripts/tabs/trends.js', 'utf8'));

console.log('TabTrends multi-metric state:', window.TabTrends.compState.metrics);

// Check simulation of Ichilov vs Hadassah with 2 metrics (Men wage vs Women wage):
console.log('\n--- Simulation 1: Men Wage vs Women Wage (₪) ---');
const entities = ['איכילוב', 'הדסה'];
const years = [2021, 2022, 2023, 2024];

entities.forEach(ent => {
  console.log(`\nEntity: ${ent}`);
  years.forEach(yr => {
    const k = `${ent}_${yr}`;
    const bm = window.__TABLEAU_BODY_BENCHMARKS__[k];
    console.log(`  ${yr}: Men = ₪${bm.avgMenWage.toLocaleString()} | Women = ₪${bm.avgWomenWage.toLocaleString()} | Gap = ${bm.genderPayGapPercent}%`);
  });
});
