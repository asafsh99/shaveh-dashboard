const fs = require('fs');
global.window = {};
eval(fs.readFileSync('scripts/data_bundle.js', 'utf8'));
eval(fs.readFileSync('scripts/tableau_benchmarks.js', 'utf8'));
eval(fs.readFileSync('scripts/validator.js', 'utf8'));

const testBodies = [
  'אולפנים - מורים',
  'חינוך התישבותי - מורים',
  'משרד החינוך - מורים',
  'קרן השתלמות למורים על יסודיים (עגור חברה לניהול)',
  'קרנות השתלמות למורים וגננות- חב\' מנהלת בע"מ',
  'המועצה להסדר ההימורים בספורט'
];

testBodies.forEach(b => {
  const bm = window.__TABLEAU_BODY_BENCHMARKS__[b + '_2024'];
  console.log('=== ' + b + ' ===');
  console.log(bm);
});
