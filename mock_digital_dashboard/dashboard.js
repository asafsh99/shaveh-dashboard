// Digital Salary Dashboard Logic
let stateDataByYear = {};
let publicData = {};
let currentYear = '2023';
let currentSystem = 'all_systems';
let currentTab = 'tab-matrix';

// Chart instances
let drawerTrendChartInstance = null;
let drawerLayersChartInstance = null;
let systemTrendChartInstance = null;
let systemLayersChartInstance = null;
let topExtraChartInstance = null;
let clusterChartInstance = null;
let highEarnersChartInstance = null;
let giniChartInstance = null;
let socioWageChartInstance = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupFilterListeners();
  setupDrawer();
  await loadData();
});

// Setup tab navigation
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const targetTab = btn.dataset.tab;
      currentTab = targetTab;
      
      document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
      document.getElementById(targetTab).style.display = 'block';
      
      // Update year filter visibility (only Tab 1 & 2 are multi-year timeseries)
      const yearControl = document.getElementById('yearControlItem');
      if (targetTab === 'tab-public-bodies' || targetTab === 'tab-local-gov') {
        yearControl.style.opacity = '0.5';
        yearControl.style.pointerEvents = 'none';
      } else {
        yearControl.style.opacity = '1';
        yearControl.style.pointerEvents = 'auto';
      }

      renderCurrentTab();
    });
  });
}

// Load JSON data files / embedded objects
async function loadData() {
  try {
    if (window.STATE_SERVICE_DATA && window.PUBLIC_BODIES_DATA) {
      stateDataByYear = window.STATE_SERVICE_DATA;
      publicData = window.PUBLIC_BODIES_DATA;
    } else {
      const [stateRes, pubRes] = await Promise.all([
        fetch('data/state_service_by_year.json'),
        fetch('data/public_bodies_data.json')
      ]);
      stateDataByYear = await stateRes.json();
      publicData = await pubRes.json();
    }

    populateYearSelector();
    renderCurrentTab();
    document.getElementById('statusBadge').textContent = `● נתוני ${Object.keys(stateDataByYear).length} שנים טעונים בהצלחה`;
    document.getElementById('statusBadge').className = 'badge-change positive';
  } catch (err) {
    console.error('Error loading data:', err);
    document.getElementById('statusBadge').textContent = '⚠️ שגיאה בטעינת נתונים';
    document.getElementById('statusBadge').className = 'badge-change negative';
  }
}

// Populate year dropdown
function populateYearSelector() {
  const yearSelect = document.getElementById('yearSelect');
  yearSelect.innerHTML = '';
  
  const years = Object.keys(stateDataByYear).sort((a, b) => parseInt(b) - parseInt(a));
  years.forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = `שנת ${yr}`;
    if (yr === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  });
}

// Setup event listeners for filters
function setupFilterListeners() {
  document.getElementById('systemSelect').addEventListener('change', (e) => {
    currentSystem = e.target.value;
    renderCurrentTab();
  });

  document.getElementById('yearSelect').addEventListener('change', (e) => {
    currentYear = e.target.value;
    renderCurrentTab();
  });

  document.getElementById('searchInput').addEventListener('input', () => {
    renderCurrentTab();
  });

  document.getElementById('sortSelect').addEventListener('change', () => {
    renderCurrentTab();
  });
}

// Setup drawer overlay and close
function setupDrawer() {
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('itemDrawer');
  const closeBtn = document.getElementById('drawerCloseBtn');

  const closeDrawer = () => {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
  };

  overlay.addEventListener('click', closeDrawer);
  closeBtn.addEventListener('click', closeDrawer);
}

// Render the active tab
function renderCurrentTab() {
  if (currentTab === 'tab-matrix') {
    renderMatrixTab();
  } else if (currentTab === 'tab-comparison') {
    renderComparisonTab();
  } else if (currentTab === 'tab-public-bodies') {
    renderPublicBodiesTab();
  } else if (currentTab === 'tab-local-gov') {
    renderLocalGovTab();
  }
}

// =========================================================================
// TAB 1: DIGITAL SALARY MATRIX
// =========================================================================
function renderMatrixTab() {
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  const sortMode = document.getElementById('sortSelect').value;
  let items = [];
  let isPublicSystem = false;

  const clusterMap = {
    'public_local_gov': 'שלטון מקומי',
    'public_higher_ed': 'גופים נתמכים במערכת ההשכלה הגבוהה',
    'public_health': 'גופים ציבוריים במערכת הבריאות',
    'public_companies': 'חברות ממשלתיות',
    'public_corporations': 'תאגידים',
    'public_all': 'כלל הגופים'
  };

  if (clusterMap[currentSystem]) {
    isPublicSystem = true;
    const targetCluster = clusterMap[currentSystem];
    
    // Get groups for this cluster
    const clusterGroups = (publicData.clusters_groups || []).filter(cg => {
      if (targetCluster === 'כלל הגופים') return cg.cluster !== 'סך הכל לכלל הגופים';
      return cg.cluster === targetCluster;
    });

    // Add group totals as sector_totals
    clusterGroups.forEach(cg => {
      items.push({
        id: `pub_group__${cg.cluster}__${cg.group}`.replace(/\s+/g, '_'),
        system: cg.cluster,
        name: `סה"כ קבוצה: ${cg.group}`,
        type: 'sector_total',
        jobs: cg.jobs,
        jobs_change_pct: cg.jobs_change_pct,
        avg_salary: cg.avg_salary,
        salary_change_pct: cg.salary_change_pct,
        p10_salary: cg.avg_salary ? cg.avg_salary * 0.65 : null,
        p90_salary: cg.avg_salary ? cg.avg_salary * 1.75 : null,
        layer_base_pct: cg.layer_base_pct,
        layer_extra_pct: cg.layer_extra_pct,
        layer_expenses_pct: cg.layer_expenses_pct,
        layer_other_pct: cg.layer_other_pct
      });
    });

    // Get individual bodies for this cluster
    const bodies = (publicData.bodies || []).filter(b => {
      if (targetCluster === 'כלל הגופים') return true;
      return b.cluster === targetCluster;
    });

    bodies.forEach(b => {
      // Find gender info if exists
      const gInfo = (publicData.gender_by_body || []).find(g => g.body === b.body);
      const medianSal = b.median_salary || (gInfo ? (gInfo.men.median_salary + gInfo.women.median_salary)/2 : null);

      items.push({
        id: `pub_body__${b.body}`.replace(/\s+/g, '_'),
        system: `${b.cluster} (${b.group})`,
        name: b.body,
        type: 'body',
        jobs: b.jobs,
        avg_salary: b.avg_salary,
        salary_change_pct: b.salary_change_pct,
        p10_salary: medianSal ? medianSal * 0.75 : (b.avg_salary ? b.avg_salary * 0.6 : null),
        p90_salary: medianSal ? medianSal * 1.6 : (b.avg_salary ? b.avg_salary * 1.8 : null),
        median_salary: medianSal,
        layer_base_pct: b.layer_base_pct,
        layer_extra_pct: b.layer_extra_pct,
        layer_expenses_pct: b.layer_expenses_pct,
        layer_other_pct: b.layer_other_pct
      });
    });

  } else {
    // State Service System or All Systems
    const rawItems = stateDataByYear[currentYear] || [];
    
    if (currentSystem === 'all_systems') {
      items = [...rawItems];

      // Add top-level Public Bodies cluster summaries into All Systems view!
      const topClusters = (publicData.clusters_groups || []).filter(cg => cg.cluster !== 'סך הכל לכלל הגופים');
      
      // Group by cluster
      const clusterAgg = {};
      topClusters.forEach(cg => {
        if (!clusterAgg[cg.cluster]) {
          clusterAgg[cg.cluster] = {
            cluster: cg.cluster,
            jobs: 0,
            sumSal: 0,
            sumBase: 0,
            sumExtra: 0,
            sumExp: 0,
            sumOth: 0,
            count: 0
          };
        }
        clusterAgg[cg.cluster].jobs += cg.jobs;
        clusterAgg[cg.cluster].sumSal += (cg.jobs * cg.avg_salary);
        clusterAgg[cg.cluster].sumBase += (cg.jobs * (cg.layer_base_pct || 0.7));
        clusterAgg[cg.cluster].sumExtra += (cg.jobs * (cg.layer_extra_pct || 0.15));
        clusterAgg[cg.cluster].sumExp += (cg.jobs * (cg.layer_expenses_pct || 0.05));
        clusterAgg[cg.cluster].sumOth += (cg.jobs * (cg.layer_other_pct || 0.1));
        clusterAgg[cg.cluster].count += cg.jobs;
      });

      Object.values(clusterAgg).forEach(ca => {
        const avgSal = ca.count > 0 ? Math.round(ca.sumSal / ca.count) : 0;
        items.push({
          id: `cluster_total__${ca.cluster}`.replace(/\s+/g, '_'),
          system: 'גופים ציבוריים נתמכים',
          name: `אשכול: ${ca.cluster}`,
          type: 'sector_total',
          jobs: Math.round(ca.jobs),
          avg_salary: avgSal,
          p10_salary: Math.round(avgSal * 0.65),
          p90_salary: Math.round(avgSal * 1.85),
          layer_base_pct: ca.count > 0 ? ca.sumBase / ca.count : 0.7,
          layer_extra_pct: ca.count > 0 ? ca.sumExtra / ca.count : 0.15,
          layer_expenses_pct: ca.count > 0 ? ca.sumExp / ca.count : 0.05,
          layer_other_pct: ca.count > 0 ? ca.sumOth / ca.count : 0.1
        });
      });

    } else {
      items = rawItems.filter(item => item.system === currentSystem || item.type === 'all_systems_total');
    }
  }

  // Search filter
  if (searchTerm) {
    items = items.filter(item => item.name.toLowerCase().includes(searchTerm) || item.system.toLowerCase().includes(searchTerm));
  }

  // Sort items (keep totals at top)
  items.sort((a, b) => {
    if (a.type === 'all_systems_total') return -1;
    if (b.type === 'all_systems_total') return 1;
    if (a.type === 'sector_total' && b.type !== 'sector_total') return -1;
    if (b.type === 'sector_total' && a.type !== 'sector_total') return 1;

    if (sortMode === 'salary_desc') return (b.avg_salary || 0) - (a.avg_salary || 0);
    if (sortMode === 'salary_asc') return (a.avg_salary || 0) - (b.avg_salary || 0);
    if (sortMode === 'jobs_desc') return (b.jobs || 0) - (a.jobs || 0);
    if (sortMode === 'name_asc') return a.name.localeCompare(b.name, 'he');
    return 0;
  });

  // Render KPIs
  renderKPIs(items);

  // Render Table
  const tbody = document.getElementById('matrixTableBody');
  tbody.innerHTML = '';

  const maxSalaryScale = 65000;

  items.forEach(item => {
    const tr = document.createElement('tr');
    if (item.type === 'all_systems_total' || item.type === 'sector_total') {
      tr.classList.add('row-total');
    }

    // Name column
    const nameTd = document.createElement('td');
    nameTd.innerHTML = `
      <div style="font-weight: 700; color: ${item.type === 'all_systems_total' ? 'var(--accent-blue)' : (item.type === 'sector_total' ? '#fcd34d' : '#fff')};">
        ${item.name}
      </div>
      <div style="font-size: 11px; color: var(--text-muted);">${item.system}</div>
    `;

    // Jobs column
    const jobsTd = document.createElement('td');
    const jobsFormatted = item.jobs ? Math.round(item.jobs).toLocaleString('he-IL') : '-';
    const jobsChange = item.jobs_change_pct !== null && item.jobs_change_pct !== undefined
      ? `<span class="badge-change ${item.jobs_change_pct >= 0 ? 'positive' : 'negative'}">${item.jobs_change_pct >= 0 ? '+' : ''}${(item.jobs_change_pct * 100).toFixed(1)}%</span>`
      : '';
    jobsTd.innerHTML = `<div>${jobsFormatted}</div>${jobsChange}`;

    // Salary column
    const salTd = document.createElement('td');
    const salFormatted = item.avg_salary ? `₪${Math.round(item.avg_salary).toLocaleString('he-IL')}` : '-';
    const salChange = item.salary_change_pct !== null && item.salary_change_pct !== undefined
      ? `<span class="badge-change ${item.salary_change_pct >= 0 ? 'positive' : 'negative'}">${item.salary_change_pct >= 0 ? '+' : ''}${(item.salary_change_pct * 100).toFixed(1)}%</span>`
      : '';
    salTd.innerHTML = `<div style="font-weight: 800; font-size: 15px;">${salFormatted}</div>${salChange}`;

    // Range column (Decile 1 to Decile 10 or Range)
    const rangeTd = document.createElement('td');
    if (item.p10_salary && item.p90_salary) {
      const p10Pct = Math.min(100, Math.max(0, (item.p10_salary / maxSalaryScale) * 100));
      const p90Pct = Math.min(100, Math.max(0, (item.p90_salary / maxSalaryScale) * 100));
      const avgPct = Math.min(100, Math.max(0, (item.avg_salary / maxSalaryScale) * 100));
      const widthPct = Math.max(2, p90Pct - p10Pct);

      rangeTd.innerHTML = `
        <div class="range-bar-container">
          <div class="range-labels">
            <span>עשירון 1 / תחתון: ₪${(item.p10_salary / 1000).toFixed(1)}k</span>
            <span>עשירון 10 / עליון: ₪${(item.p90_salary / 1000).toFixed(1)}k</span>
          </div>
          <div class="range-bar-track">
            <div class="range-bar-span" style="right: ${p10Pct}%; width: ${widthPct}%;"></div>
            <div class="range-bar-marker" style="right: ${avgPct}%;" title="ממוצע: ₪${Math.round(item.avg_salary).toLocaleString()}"></div>
          </div>
        </div>
      `;
    } else {
      rangeTd.innerHTML = '<span class="text-muted">-</span>';
    }

    // 4 Layers Column
    const layerTd = document.createElement('td');
    if (item.layer_base_pct !== null && item.layer_base_pct !== undefined) {
      const basePct = (item.layer_base_pct * 100).toFixed(0);
      const extraPct = ((item.layer_extra_pct || 0) * 100).toFixed(0);
      const expPct = ((item.layer_expenses_pct || 0) * 100).toFixed(0);
      const othPct = ((item.layer_other_pct || 0) * 100).toFixed(0);

      layerTd.innerHTML = `
        <div class="layer-bar-container" title="יסוד: ${basePct}% | עבודה נוספת: ${extraPct}% | החזר הוצאות: ${expPct}% | אחרים: ${othPct}%">
          <div class="layer-stacked-bar">
            <div class="layer-segment seg-base" style="width: ${basePct}%;"></div>
            <div class="layer-segment seg-extra" style="width: ${extraPct}%;"></div>
            <div class="layer-segment seg-exp" style="width: ${expPct}%;"></div>
            <div class="layer-segment seg-oth" style="width: ${othPct}%;"></div>
          </div>
          <div class="range-labels">
            <span>יסוד: ${basePct}%</span>
            <span>נוספת: ${extraPct}%</span>
            <span>הוצאות: ${expPct}%</span>
            <span>אחר: ${othPct}%</span>
          </div>
        </div>
      `;
    } else {
      layerTd.innerHTML = '<span class="text-muted">-</span>';
    }

    tr.appendChild(nameTd);
    tr.appendChild(jobsTd);
    tr.appendChild(salTd);
    tr.appendChild(rangeTd);
    tr.appendChild(layerTd);

    // Row click opens drawer
    tr.addEventListener('click', () => openItemDrawer(item));

    tbody.appendChild(tr);
  });

  const periodLabel = isPublicSystem ? 'דו"ח גופים ציבוריים מעודכן' : `שנת ${currentYear}`;
  document.getElementById('quickFilterStats').textContent = `מוצגות ${items.length} שורות עבור ${document.getElementById('systemSelect').selectedOptions[0].text} (${periodLabel})`;
}

// Render Top KPI Cards
function renderKPIs(items) {
  const kpiContainer = document.getElementById('kpiContainer');
  const allSystemsRow = items.find(i => i.type === 'all_systems_total') || items[0] || {};

  const totalJobs = allSystemsRow.jobs || items.reduce((acc, i) => acc + (i.jobs || 0), 0);
  const avgSal = allSystemsRow.avg_salary || 0;
  const p10 = allSystemsRow.p10_salary || 0;
  const p90 = allSystemsRow.p90_salary || 0;
  const p90p10Ratio = (p10 > 0) ? (p90 / p10).toFixed(2) : '-';
  const basePct = allSystemsRow.layer_base_pct ? `${(allSystemsRow.layer_base_pct * 100).toFixed(1)}%` : '-';
  const extraPct = allSystemsRow.layer_extra_pct ? `${(allSystemsRow.layer_extra_pct * 100).toFixed(1)}%` : '-';

  kpiContainer.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-header">
        <span class="kpi-title">סך משרות (FTE)</span>
        <span class="kpi-icon">👥</span>
      </div>
      <div class="kpi-value">${totalJobs.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</div>
      <div class="kpi-subtitle">עובדים בשירות המדינה בשנת ${currentYear}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-header">
        <span class="kpi-title">שכר ממוצע למשרה</span>
        <span class="kpi-icon">💰</span>
      </div>
      <div class="kpi-value">₪${avgSal.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</div>
      <div class="kpi-subtitle">
        ${allSystemsRow.salary_change_pct ? `שינוי משנת 2010: +${(allSystemsRow.salary_change_pct * 100).toFixed(1)}%` : 'ברוטו חודשי ממוצע'}
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-header">
        <span class="kpi-title">יחס עשירון עליון לתחתון (P90 / P10)</span>
        <span class="kpi-icon">📈</span>
      </div>
      <div class="kpi-value">${p90p10Ratio}x</div>
      <div class="kpi-subtitle">עשירון 10: ₪${(p90/1000).toFixed(1)}k | עשירון 1: ₪${(p10/1000).toFixed(1)}k</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-header">
        <span class="kpi-title">שכר יסוד מול עבודה נוספת</span>
        <span class="kpi-icon">🧩</span>
      </div>
      <div class="kpi-value">${basePct} <span style="font-size: 14px; color: var(--text-muted);">יסוד</span></div>
      <div class="kpi-subtitle">עבודה נוספת מהווה ${extraPct} מהשכר</div>
    </div>
  `;
}

// =========================================================================
// DRAWER: DRILL-DOWN & HISTORICAL ANALYSIS
// =========================================================================
function openItemDrawer(item) {
  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('itemDrawer');

  document.getElementById('drawerTitle').textContent = item.name;
  document.getElementById('drawerSubtitle').textContent = `${item.system}`;
  document.getElementById('drawerSalaryVal').textContent = item.avg_salary ? `₪${Math.round(item.avg_salary).toLocaleString()}` : '-';
  document.getElementById('drawerJobsVal').textContent = item.jobs ? Math.round(item.jobs).toLocaleString() : '-';

  if (drawerTrendChartInstance) drawerTrendChartInstance.destroy();
  if (drawerLayersChartInstance) drawerLayersChartInstance.destroy();

  // Check if this is a Public Body
  if (item.id && (item.id.startsWith('pub_body__') || item.id.startsWith('pub_group__') || item.id.startsWith('cluster_total__'))) {
    // Public Body Drilldown: Gender & Layers Breakdown
    const bodyName = item.name.replace('סה"כ קבוצה: ', '').replace('אשכול: ', '');
    const gInfo = (publicData.gender_by_body || []).find(g => g.body === bodyName);
    const repList = (publicData.reporting_types || []).filter(r => r.body === bodyName);

    // Chart 1: Gender Comparison / Distribution
    const ctxTrend = document.getElementById('drawerTrendChart').getContext('2d');
    if (gInfo && gInfo.men.median_salary && gInfo.women.median_salary) {
      drawerTrendChartInstance = new Chart(ctxTrend, {
        type: 'bar',
        data: {
          labels: ['גברים', 'נשים'],
          datasets: [
            {
              label: 'שכר חציוני (₪)',
              data: [gInfo.men.median_salary, gInfo.women.median_salary],
              backgroundColor: ['#38bdf8', '#ec4899']
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: `השוואת שכר חציוני לפי מגדר (פער: ${gInfo.median_gap_pct || 0}%)`, color: '#cbd5e1' },
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' } },
            y: { ticks: { color: '#94a3b8' } }
          }
        }
      });
    } else {
      // Fallback: 4 layers breakdown
      drawerTrendChartInstance = new Chart(ctxTrend, {
        type: 'doughnut',
        data: {
          labels: ['שכר יסוד ותוספות', 'עבודה נוספת', 'החזר הוצאות', 'תשלומים אחרים'],
          datasets: [{
            data: [
              (item.layer_base_pct || 0.7) * 100,
              (item.layer_extra_pct || 0.15) * 100,
              (item.layer_expenses_pct || 0.05) * 100,
              (item.layer_other_pct || 0.1) * 100
            ],
            backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ec4899']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'התפלגות 4 רבדי השכר ברוטו', color: '#cbd5e1' },
            legend: { labels: { color: '#cbd5e1' } }
          }
        }
      });
    }

    // Chart 2: Reporting types or Salary Layers
    const ctxLayers = document.getElementById('drawerLayersChart').getContext('2d');
    if (repList.length > 0) {
      drawerLayersChartInstance = new Chart(ctxLayers, {
        type: 'bar',
        data: {
          labels: repList.map(r => r.report_type),
          datasets: [{
            label: 'שכר ממוצע (₪)',
            data: repList.map(r => r.avg_salary),
            backgroundColor: ['#f43f5e', '#a855f7', '#6366f1']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'שכר לפי סוגי עובדים (שיאנים / בכירים / דירוג)', color: '#cbd5e1' },
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' } },
            y: { ticks: { color: '#94a3b8' } }
          }
        }
      });
    } else {
      drawerLayersChartInstance = new Chart(ctxLayers, {
        type: 'bar',
        data: {
          labels: ['יסוד', 'נוספת', 'הוצאות', 'אחר'],
          datasets: [{
            label: '% מסך השכר',
            data: [
              (item.layer_base_pct || 0.7) * 100,
              (item.layer_extra_pct || 0.15) * 100,
              (item.layer_expenses_pct || 0.05) * 100,
              (item.layer_other_pct || 0.1) * 100
            ],
            backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ec4899']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'התפלגות רבדי השכר (%)', color: '#cbd5e1' },
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' } },
            y: { max: 100, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }

  } else {
    // State Service Timeseries
    const years = Object.keys(stateDataByYear).sort((a, b) => parseInt(a) - parseInt(b));
    const salarySeries = [];
    const p10Series = [];
    const p90Series = [];
    const basePctSeries = [];
    const extraPctSeries = [];
    const validYears = [];

    years.forEach(yr => {
      const list = stateDataByYear[yr] || [];
      const match = list.find(i => i.id === item.id || (item.type === 'all_systems_total' && i.type === 'all_systems_total'));
      if (match && match.avg_salary) {
        validYears.push(yr);
        salarySeries.push(match.avg_salary);
        p10Series.push(match.p10_salary || null);
        p90Series.push(match.p90_salary || null);
        basePctSeries.push(match.layer_base_pct ? match.layer_base_pct * 100 : null);
        extraPctSeries.push(match.layer_extra_pct ? match.layer_extra_pct * 100 : null);
      }
    });

    renderDrawerCharts(validYears, salarySeries, p10Series, p90Series, basePctSeries, extraPctSeries);
  }

  overlay.classList.add('open');
  drawer.classList.add('open');
}

function renderDrawerCharts(years, salaries, p10s, p90s, bases, extras) {
  // Destroy previous instances
  if (drawerTrendChartInstance) drawerTrendChartInstance.destroy();
  if (drawerLayersChartInstance) drawerLayersChartInstance.destroy();

  const ctxTrend = document.getElementById('drawerTrendChart').getContext('2d');
  drawerTrendChartInstance = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: 'שכר ממוצע',
          data: salaries,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          fill: true,
          tension: 0.3,
          borderWidth: 3
        },
        {
          label: 'עשירון 10 (P90)',
          data: p90s,
          borderColor: '#a855f7',
          borderDash: [5, 5],
          tension: 0.3,
          borderWidth: 1.5
        },
        {
          label: 'עשירון 1 (P10)',
          data: p10s,
          borderColor: '#38bdf8',
          borderDash: [5, 5],
          tension: 0.3,
          borderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#cbd5e1' } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' } }
      }
    }
  });

  const ctxLayers = document.getElementById('drawerLayersChart').getContext('2d');
  drawerLayersChartInstance = new Chart(ctxLayers, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: '% שכר יסוד',
          data: bases,
          backgroundColor: '#3b82f6'
        },
        {
          label: '% עבודה נוספת',
          data: extras,
          backgroundColor: '#f59e0b'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#cbd5e1' } }
      },
      scales: {
        x: { stacked: true, ticks: { color: '#94a3b8' } },
        y: { stacked: true, max: 100, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

// =========================================================================
// TAB 2: SYSTEM COMPARISON
// =========================================================================
function renderComparisonTab() {
  const years = ['2010', '2012', '2014', '2016', '2018', '2020', '2022', '2023'];
  const allSystemsSalary = [];
  const ministriesSalary = [];
  const healthSalary = [];
  const educationSalary = [];

  years.forEach(yr => {
    const list = stateDataByYear[yr] || [];
    const allRow = list.find(i => i.type === 'all_systems_total');
    const minRow = list.find(i => i.system === 'משרדי הממשלה' && i.type === 'sector_total');
    const heaRow = list.find(i => i.system === 'משרד הבריאות' && i.type === 'sector_total');
    const eduRow = list.find(i => i.system === 'משרד החינוך' && i.type === 'sector_total');

    allSystemsSalary.push(allRow ? allRow.avg_salary : null);
    ministriesSalary.push(minRow ? minRow.avg_salary : null);
    healthSalary.push(heaRow ? heaRow.avg_salary : null);
    educationSalary.push(eduRow ? eduRow.avg_salary : null);
  });

  if (systemTrendChartInstance) systemTrendChartInstance.destroy();
  const ctxTrend = document.getElementById('systemSalaryTrendChart').getContext('2d');
  systemTrendChartInstance = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        { label: 'כלל המערכות (ממוצע משוקלל)', data: allSystemsSalary, borderColor: '#f43f5e', borderWidth: 3, tension: 0.2 },
        { label: 'מערכת הבריאות', data: healthSalary, borderColor: '#10b981', borderWidth: 2, tension: 0.2 },
        { label: 'משרדי הממשלה', data: ministriesSalary, borderColor: '#6366f1', borderWidth: 2, tension: 0.2 },
        { label: 'מערכת החינוך', data: educationSalary, borderColor: '#f59e0b', borderWidth: 2, tension: 0.2 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' } }
      }
    }
  });

  // Compare 4 layers across systems (2023)
  const list2023 = stateDataByYear['2023'] || [];
  const secLabels = ['כלל המערכות', 'משרדי הממשלה', 'מערכת הבריאות', 'מערכת החינוך'];
  const baseData = [];
  const extraData = [];
  const expData = [];
  const othData = [];

  const targets = [
    list2023.find(i => i.type === 'all_systems_total'),
    list2023.find(i => i.system === 'משרדי הממשלה' && i.type === 'sector_total'),
    list2023.find(i => i.system === 'משרד הבריאות' && i.type === 'sector_total'),
    list2023.find(i => i.system === 'משרד החינוך' && i.type === 'sector_total')
  ];

  targets.forEach(t => {
    if (t) {
      baseData.push((t.layer_base_pct || 0) * 100);
      extraData.push((t.layer_extra_pct || 0) * 100);
      expData.push((t.layer_expenses_pct || 0) * 100);
      othData.push((t.layer_other_pct || 0) * 100);
    }
  });

  if (systemLayersChartInstance) systemLayersChartInstance.destroy();
  const ctxLayers = document.getElementById('systemLayersChart').getContext('2d');
  systemLayersChartInstance = new Chart(ctxLayers, {
    type: 'bar',
    data: {
      labels: secLabels,
      datasets: [
        { label: 'יסוד ותוספות', data: baseData, backgroundColor: '#3b82f6' },
        { label: 'עבודה נוספת', data: extraData, backgroundColor: '#f59e0b' },
        { label: 'החזר הוצאות', data: expData, backgroundColor: '#10b981' },
        { label: 'אחר והפרשים', data: othData, backgroundColor: '#ec4899' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { stacked: true, ticks: { color: '#94a3b8' } },
        y: { stacked: true, max: 100, ticks: { color: '#94a3b8' } }
      }
    }
  });

  // Top extra work ranks
  const topExtra = list2023
    .filter(i => i.layer_extra_pct && i.type === 'rank')
    .sort((a, b) => b.layer_extra_pct - a.layer_extra_pct)
    .slice(0, 7);

  if (topExtraChartInstance) topExtraChartInstance.destroy();
  const ctxTopExtra = document.getElementById('topExtraWorkChart').getContext('2d');
  topExtraChartInstance = new Chart(ctxTopExtra, {
    type: 'bar',
    data: {
      labels: topExtra.map(i => `${i.name} (${i.system})`),
      datasets: [{
        label: '% עבודה נוספת מתוך סך השכר',
        data: topExtra.map(i => i.layer_extra_pct * 100),
        backgroundColor: '#f59e0b'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' } }
      }
    }
  });
}

// =========================================================================
// TAB 3: PUBLIC BODIES & HIGH EARNERS
// =========================================================================
function renderPublicBodiesTab() {
  const clusters = publicData.clusters_groups || [];
  const genderBodies = publicData.gender_by_body || [];

  // Group by Cluster
  const clusterAverages = {};
  clusters.forEach(cg => {
    if (!clusterAverages[cg.cluster]) {
      clusterAverages[cg.cluster] = { totalCost: 0, totalJobs: 0, sumSalaryJobs: 0 };
    }
    clusterAverages[cg.cluster].totalJobs += cg.jobs;
    clusterAverages[cg.cluster].sumSalaryJobs += (cg.jobs * cg.avg_salary);
  });

  const clusterLabels = Object.keys(clusterAverages);
  const clusterSalaries = clusterLabels.map(c => Math.round(clusterAverages[c].sumSalaryJobs / clusterAverages[c].totalJobs));

  if (clusterChartInstance) clusterChartInstance.destroy();
  const ctxCluster = document.getElementById('clusterSalaryChart').getContext('2d');
  clusterChartInstance = new Chart(ctxCluster, {
    type: 'bar',
    data: {
      labels: clusterLabels,
      datasets: [{
        label: 'שכר ממוצע באשכול (₪)',
        data: clusterSalaries,
        backgroundColor: '#6366f1'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#94a3b8', maxRotation: 45 } },
        y: { ticks: { color: '#94a3b8' } }
      }
    }
  });

  // Reporting types comparison (High earners vs rank employees)
  const repTypes = publicData.reporting_types || [];
  const highEarners = repTypes.filter(r => r.report_type === 'בעלי שכר גבוה');
  const rankEmployees = repTypes.filter(r => r.report_type === 'עובדי דירוג');

  const avgHighSal = highEarners.length ? Math.round(highEarners.reduce((a, b) => a + b.avg_salary, 0) / highEarners.length) : 0;
  const avgRankSal = rankEmployees.length ? Math.round(rankEmployees.reduce((a, b) => a + b.avg_salary, 0) / rankEmployees.length) : 0;

  if (highEarnersChartInstance) highEarnersChartInstance.destroy();
  const ctxHigh = document.getElementById('highEarnersGapChart').getContext('2d');
  highEarnersChartInstance = new Chart(ctxHigh, {
    type: 'bar',
    data: {
      labels: ['בעלי שכר גבוה (שיאנים)', 'עובדי דירוג'],
      datasets: [{
        label: 'שכר ממוצע (₪)',
        data: [avgHighSal, avgRankSal],
        backgroundColor: ['#f43f5e', '#38bdf8']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' } }
      }
    }
  });

  // Render Table of Bodies with Gender Gaps
  const tbody = document.getElementById('publicBodiesTableBody');
  tbody.innerHTML = '';

  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  let filtered = genderBodies;
  if (searchTerm) {
    filtered = filtered.filter(b => b.body.toLowerCase().includes(searchTerm) || b.cluster.toLowerCase().includes(searchTerm));
  }

  filtered.slice(0, 50).forEach(b => {
    const tr = document.createElement('tr');
    const gapFormatted = b.median_gap_pct !== null && b.median_gap_pct !== undefined
      ? `<span class="badge-change ${b.median_gap_pct > 15 ? 'negative' : 'positive'}">${b.median_gap_pct.toFixed(1)}%</span>`
      : '-';

    tr.innerHTML = `
      <td>${b.cluster}</td>
      <td>${b.group}</td>
      <td style="font-weight: 700; color: #fff;">${b.body}</td>
      <td>₪${(b.men.median_salary || 0).toLocaleString()}</td>
      <td style="color: #38bdf8;">₪${(b.men.median_salary || 0).toLocaleString()}</td>
      <td style="color: #ec4899;">₪${(b.women.median_salary || 0).toLocaleString()}</td>
      <td>${gapFormatted}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =========================================================================
// TAB 4: LOCAL GOVERNMENT
// =========================================================================
function renderLocalGovTab() {
  const localGov = publicData.local_gov || [];

  // Gini vs Salary Scatter
  const scatterPoints = localGov
    .filter(m => m.gini_index && m.avg_salary)
    .map(m => ({ x: m.gini_index, y: m.avg_salary, name: m.body }));

  if (giniChartInstance) giniChartInstance.destroy();
  const ctxGini = document.getElementById('giniScatterChart').getContext('2d');
  giniChartInstance = new Chart(ctxGini, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'רשויות מקומיות (ג\'יני מול שכר)',
        data: scatterPoints,
        backgroundColor: 'rgba(99, 102, 241, 0.6)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#cbd5e1' } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw.name}: ג'יני ${ctx.raw.x}, שכר ₪${ctx.raw.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'מדד ג\'יני', color: '#94a3b8' }, ticks: { color: '#94a3b8' } },
        y: { title: { display: true, text: 'שכר ממוצע (₪)', color: '#94a3b8' }, ticks: { color: '#94a3b8' } }
      }
    }
  });

  // Socio Cluster Wage Ratios
  const socioRatios = {};
  localGov.forEach(m => {
    if (m.socio_cluster && m.women_to_men_ratio) {
      if (!socioRatios[m.socio_cluster]) socioRatios[m.socio_cluster] = [];
      socioRatios[m.socio_cluster].push(m.women_to_men_ratio);
    }
  });

  const socioLabels = Object.keys(socioRatios).sort((a, b) => parseInt(a) - parseInt(b));
  const socioAvgRatios = socioLabels.map(s => {
    const list = socioRatios[s];
    return ((list.reduce((a, b) => a + b, 0) / list.length) * 100).toFixed(1);
  });

  if (socioWageChartInstance) socioWageChartInstance.destroy();
  const ctxSocio = document.getElementById('socioClusterWageChart').getContext('2d');
  socioWageChartInstance = new Chart(ctxSocio, {
    type: 'line',
    data: {
      labels: socioLabels.map(s => `אשכול ${s}`),
      datasets: [{
        label: 'שכר נשים כ-% משכר גברים',
        data: socioAvgRatios,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { min: 50, max: 100, ticks: { color: '#94a3b8' } }
      }
    }
  });

  // Render Municipalities Table
  const tbody = document.getElementById('localGovTableBody');
  tbody.innerHTML = '';

  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  let filtered = localGov;
  if (searchTerm) {
    filtered = filtered.filter(m => m.body.toLowerCase().includes(searchTerm) || m.group.toLowerCase().includes(searchTerm));
  }

  filtered.slice(0, 50).forEach(m => {
    const tr = document.createElement('tr');
    const ratioFormatted = m.women_to_men_ratio ? `${(m.women_to_men_ratio * 100).toFixed(1)}%` : '-';

    tr.innerHTML = `
      <td>${m.group}</td>
      <td style="font-weight: 700; color: #fff;">${m.body}</td>
      <td>${m.population ? m.population.toLocaleString() : '-'}</td>
      <td><span class="badge-change" style="background: rgba(99, 102, 241, 0.2); color: #818cf8;">אשכול ${m.socio_cluster || '-'}</span></td>
      <td>${m.gini_index || '-'}</td>
      <td>₪${(m.avg_salary || 0).toLocaleString()}</td>
      <td style="color: #10b981; font-weight: 700;">${ratioFormatted}</td>
    `;
    tbody.appendChild(tr);
  });
}
