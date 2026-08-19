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

// Test getEntityMetric for all metrics
const bodies = ['איכילוב', 'הדסה', 'המרכז הרפואי על שם חיים שיבא – תל השומר'];
const years = [2021, 2022, 2023, 2024];
const metrics = ['gap', 'avgMenWage', 'avgWomenWage', 'overallWage', 'womenPercent', 'totalEmployees'];

// Expose getEntityMetric for testing by evaluating inside TabTrends closure:
const getEntityMetric = (name, type, yr) => {
  const m = window.TabTrends.compState.metric;
  const metricsObj = (function() {
    const key = `${name}_${yr}`;
    const bm = window.__TABLEAU_BODY_BENCHMARKS__[key];
    if (bm) {
      return {
        avgMenWage: bm.avgMenWage,
        menWage: bm.avgMenWage,
        avgWomenWage: bm.avgWomenWage,
        womenWage: bm.avgWomenWage,
        overallWage: bm.overallWage,
        gap: bm.genderPayGapPercent,
        totalEmployees: bm.totalEmployees,
        womenPercent: bm.totalEmployees > 0 ? Math.round((bm.womenCount / bm.totalEmployees) * 1000) / 10 : null
      };
    }
    return null;
  })();
  return metricsObj;
};

metrics.forEach(m => {
  console.log(`\n=== Metric: ${m} ===`);
  bodies.forEach(b => {
    const row = years.map(yr => {
      const metricsObj = getEntityMetric(b, 'bodyName', yr);
      return `${yr}: ${metricsObj ? metricsObj[m] : '--'}`;
    });
    console.log(`  ${b}:`, row.join(' | '));
  });
});
