/**
 * Charts Module - Stage 3
 * Manages Chart.js instances for wage comparison bar chart
 * and multi-year pay gap trend line chart.
 * All charts react to filter changes via update() calls.
 */

window.Charts = (function() {

  // ── Chart.js Global RTL + Hebrew Defaults ─────────────────────
  Chart.defaults.font.family = "'Heebo', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.rtl = true;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
  Chart.defaults.plugins.tooltip.rtl = true;
  Chart.defaults.plugins.tooltip.titleAlign = 'right';
  Chart.defaults.plugins.tooltip.bodyAlign = 'right';

  // ── Color Palette ─────────────────────────────────────────────
  const COLORS = {
    men:       { bg: 'rgba(59, 130, 246, 0.75)',  border: '#3b82f6',  light: 'rgba(59, 130, 246, 0.1)' },
    women:     { bg: 'rgba(168, 85, 247, 0.75)',   border: '#a855f7',  light: 'rgba(168, 85, 247, 0.1)' },
    gap:       { bg: 'rgba(244, 63, 94, 0.75)',    border: '#f43f5e',  light: 'rgba(244, 63, 94, 0.08)' },
    gapFill:   'rgba(244, 63, 94, 0.12)',
    gridLine:  'rgba(148, 163, 184, 0.15)',
    tickColor: '#94a3b8',
  };

  // ── Chart Instances ───────────────────────────────────────────
  let wageComparisonChart = null;
  let payGapTrendChart = null;

  // ── Shekel Formatter ──────────────────────────────────────────
  function formatShekel(val) {
    return '₪' + Math.round(val).toLocaleString('he-IL');
  }

  // ── Wage Comparison Bar Chart ─────────────────────────────────
  /**
   * Renders or updates the grouped bar chart comparing Men vs Women wages
   * across years (or across systems/bodies when a year is selected).
   */
  function renderWageComparisonChart(records, filterState) {
    const ctx = document.getElementById('chartWageComparison');
    if (!ctx) return;

    // Determine grouping axis
    let groupField, groupLabel;
    if (!filterState.year) {
      // No year filter → group by year
      groupField = 'year';
      groupLabel = 'שנה';
    } else if (!filterState.system) {
      // Year selected, no system → group by system
      groupField = 'system';
      groupLabel = 'מערכת';
    } else if (!filterState.bodyName) {
      // Year + system → group by body (limit to top 15 by headcount)
      groupField = 'bodyName';
      groupLabel = 'גוף';
    } else {
      // Full drilldown → group by rank
      groupField = 'rank';
      groupLabel = 'דירוג';
    }

    // Compute KPIs per group
    const groups = [...new Set(records.map(r => r[groupField]))].filter(v => v !== '' && v != null);

    // Sort: years numerically, others by total employee count descending
    let sortedGroups;
    if (groupField === 'year') {
      sortedGroups = groups.sort((a, b) => a - b);
    } else {
      sortedGroups = groups.map(g => {
        const subset = records.filter(r => r[groupField] === g);
        const totalEmp = subset.reduce((s, r) => s + (r.menCount || 0) + (r.womenCount || 0), 0);
        return { label: g, totalEmp };
      }).sort((a, b) => b.totalEmp - a.totalEmp)
        .slice(0, 15)
        .map(x => x.label);
    }

    const labels = sortedGroups.map(g => {
      // Truncate long labels for display
      const s = String(g);
      return s.length > 22 ? s.substring(0, 20) + '…' : s;
    });

    const menWages = [];
    const womenWages = [];

    sortedGroups.forEach(g => {
      const subset = records.filter(r => r[groupField] === g);
      const kpi = DataValidator.computeKPIs(subset);
      menWages.push(kpi.avgMenWage);
      womenWages.push(kpi.avgWomenWage);
    });

    const chartData = {
      labels,
      datasets: [
        {
          label: 'שכר גברים ממוצע',
          data: menWages,
          backgroundColor: COLORS.men.bg,
          borderColor: COLORS.men.border,
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'שכר נשים ממוצע',
          data: womenWages,
          backgroundColor: COLORS.women.bg,
          borderColor: COLORS.women.border,
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: {
            padding: 16,
            font: { size: 12, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 12 },
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatShekel(ctx.raw)}`
          }
        },
        title: {
          display: true,
          text: `השוואת שכר ממוצע גברים / נשים – לפי ${groupLabel}`,
          align: 'start',
          font: { size: 14, weight: '700' },
          color: '#1e293b',
          padding: { bottom: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: COLORS.gridLine },
          ticks: {
            color: COLORS.tickColor,
            font: { size: 11 },
            callback: (v) => formatShekel(v),
          },
          border: { display: false }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: COLORS.tickColor,
            font: { size: 11 },
            maxRotation: groupField === 'year' ? 0 : 35,
          },
          border: { display: false }
        }
      }
    };

    if (wageComparisonChart) {
      wageComparisonChart.data = chartData;
      wageComparisonChart.options = chartOptions;
      wageComparisonChart.update('none');
    } else {
      wageComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: chartOptions
      });
    }
  }

  // ── Pay Gap Trend Line Chart ──────────────────────────────────
  /**
   * Renders or updates the multi-year pay gap trend line chart.
   * Shows Gap % as primary line and Men/Women wages as secondary context.
   */
  function renderPayGapTrendChart(records) {
    const ctx = document.getElementById('chartPayGapTrend');
    if (!ctx) return;

    const years = [...new Set(records.map(r => r.year))].filter(v => v != null).sort((a, b) => a - b);

    const gapData = [];
    const menData = [];
    const womenData = [];

    years.forEach(yr => {
      const subset = records.filter(r => r.year === yr);
      const kpi = DataValidator.computeKPIs(subset);
      gapData.push(kpi.genderPayGapPercent);
      menData.push(kpi.avgMenWage);
      womenData.push(kpi.avgWomenWage);
    });

    const chartData = {
      labels: years.map(String),
      datasets: [
        {
          label: 'פער שכר (%)',
          data: gapData,
          borderColor: COLORS.gap.border,
          backgroundColor: COLORS.gapFill,
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#fff',
          pointBorderColor: COLORS.gap.border,
          pointBorderWidth: 2.5,
          yAxisID: 'yGap',
          order: 0,
        },
        {
          label: 'שכר גברים',
          data: menData,
          borderColor: COLORS.men.border,
          backgroundColor: COLORS.men.light,
          borderWidth: 1.5,
          borderDash: [5, 4],
          tension: 0.3,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: COLORS.men.border,
          yAxisID: 'yWage',
          order: 1,
        },
        {
          label: 'שכר נשים',
          data: womenData,
          borderColor: COLORS.women.border,
          backgroundColor: COLORS.women.light,
          borderWidth: 1.5,
          borderDash: [5, 4],
          tension: 0.3,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: COLORS.women.border,
          yAxisID: 'yWage',
          order: 2,
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: {
            padding: 16,
            font: { size: 12, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 12 },
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.yAxisID === 'yGap') {
                return `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%`;
              }
              return `${ctx.dataset.label}: ${formatShekel(ctx.raw)}`;
            }
          }
        },
        title: {
          display: true,
          text: 'מגמת פער שכר מגדרי (2018–2024)',
          align: 'start',
          font: { size: 14, weight: '700' },
          color: '#1e293b',
          padding: { bottom: 16 }
        }
      },
      scales: {
        yGap: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          ticks: {
            color: COLORS.gap.border,
            font: { size: 11, weight: '600' },
            callback: (v) => v.toFixed(0) + '%',
          },
          title: {
            display: true,
            text: 'פער שכר (%)',
            color: COLORS.gap.border,
            font: { size: 11, weight: '600' },
          },
          border: { display: false },
          min: 20,
          max: 35,
        },
        yWage: {
          type: 'linear',
          position: 'left',
          grid: { color: COLORS.gridLine },
          ticks: {
            color: COLORS.tickColor,
            font: { size: 11 },
            callback: (v) => formatShekel(v),
          },
          title: {
            display: true,
            text: 'שכר ממוצע (₪)',
            color: COLORS.tickColor,
            font: { size: 11, weight: '500' },
          },
          border: { display: false },
        },
        x: {
          grid: { display: false },
          ticks: {
            color: COLORS.tickColor,
            font: { size: 12, weight: '500' },
          },
          border: { display: false },
        }
      }
    };

    if (payGapTrendChart) {
      payGapTrendChart.data = chartData;
      payGapTrendChart.options = chartOptions;
      payGapTrendChart.update('none');
    } else {
      payGapTrendChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: chartOptions
      });
    }
  }

  // ── Public API ────────────────────────────────────────────────
  /**
   * Main update entry point — called by App on every filter change.
   * @param {Array<Object>} records - the currently filtered records
   * @param {Object} filterState - current filter selections
   */
  function update(records, filterState) {
    renderWageComparisonChart(records, filterState);
    renderPayGapTrendChart(records);
  }

  return { update };
})();
