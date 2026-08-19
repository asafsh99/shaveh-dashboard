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

console.log('TabTrends loaded successfully:', Object.keys(window.TabTrends));

// Test benchmarks for Ichilov and Hadassah from 2021 to 2024:
const years = [2021, 2022, 2023, 2024];
['איכילוב', 'הדסה'].forEach(body => {
  console.log(`\n=== ${body} ===`);
  years.forEach(yr => {
    const k = `${body}_${yr}`;
    console.log(`  ${yr}:`, window.__TABLEAU_BODY_BENCHMARKS__[k]);
  });
});
