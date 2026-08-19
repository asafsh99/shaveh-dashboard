/**
 * Tab 4: Trends & Benchmarking & Multi-Entity Comparator — Stage 5
 * Complete Multi-Year Trajectory, Flexible Multi-Entity & Multi-Metric Comparison Studio (2018–2024).
 */

window.TabTrends = (function () {

  let compareChart = null;
  let trajectoryChart = null;
  let isEventsBound = false;

  // Comparison State (Supports up to 2 simultaneous metrics, e.g. Men Wage vs Women Wage)
  const compState = {
    entityType: 'bodyName', // 'bodyName' | 'rank' | 'system'
    selectedEntities: [
      'איכילוב',
      'הדסה',
      'המרכז הרפואי על שם חיים שיבא – תל השומר'
    ],
    fromYear: 2021,
    toYear: 2024,
    metrics: ['avgMenWage', 'avgWomenWage'], // Array of 1 or 2 metrics
    chartType: 'line' // 'line' | 'bar'
  };

  const PRESETS = {
    hospitals: {
      type: 'bodyName',
      entities: ['איכילוב', 'הדסה', 'המרכז הרפואי על שם חיים שיבא – תל השומר', 'המרכז הרפואי רמבם', 'המרכז הרפואי האוניברסיטאי סורוקה']
    },
    govCompanies: {
      type: 'bodyName',
      entities: ['רשות שדות תעופה', 'חברת החשמל לישראל בע"מ', 'רכבת ישראל בע"מ', 'חברת דואר ישראל בע"מ', 'נמל אשדוד בע"מ']
    },
    finance: {
      type: 'bodyName',
      entities: ['בנק ישראל', 'הבורסה לניירות ערך בתל-אביב בע"מ', 'רשות ניירות ערך', 'ענבל חברה לביטוח בע"מ']
    },
    ranks: {
      type: 'rank',
      entities: ['רופאים מומחים', 'אחים ואחיות', 'מהנדסים', 'מנהלי', 'מח"ר', 'חוזים אישיים']
    }
  };

  const METRIC_CONFIG = {
    gap: { label: 'פער שכר מגדרי', shortLabel: 'פער %', unit: '%', isCurrency: false, decimals: 1, reversePolarity: true },
    avgMenWage: { label: 'שכר ממוצע גברים', shortLabel: 'שכר גברים', unit: '₪', isCurrency: true, decimals: 0, reversePolarity: false },
    avgWomenWage: { label: 'שכר ממוצע נשים', shortLabel: 'שכר נשים', unit: '₪', isCurrency: true, decimals: 0, reversePolarity: false },
    overallWage: { label: 'שכר ממוצע כללי', shortLabel: 'שכר כללי', unit: '₪', isCurrency: true, decimals: 0, reversePolarity: false },
    womenPercent: { label: '% נשים מועסקות', shortLabel: '% נשים', unit: '%', isCurrency: false, decimals: 1, reversePolarity: false },
    totalEmployees: { label: 'מספר עובדים כולל', shortLabel: 'עובדים', unit: '', isCurrency: false, decimals: 0, reversePolarity: false }
  };

  const PALETTE = [
    '#1D4ED8', '#DB2777', '#059669', '#D97706', '#7C3AED',
    '#0369A1', '#BE185D', '#047857', '#B45309', '#6D28D9',
    '#1E40AF', '#9D174D', '#065F46', '#92400E', '#4C1D95'
  ];

  // ── Helper: Compute Metric for Entity & Year ─────────────────

  function getEntityMetric(entityName, entityType, year) {
    const appState = (window.App && window.App.state) || null;
    const overview = (appState && appState.data && appState.data.overview) || [];
    const partTime = (appState && appState.data && appState.data.partTime) || [];
    const benchmarks = window.__TABLEAU_BODY_BENCHMARKS__ || {};

    if (entityType === 'bodyName') {
      const key = `${entityName}_${year}`;
      const bm = benchmarks[key];
      if (bm) {
        return {
          avgMenWage: bm.avgMenWage,
          menWage: bm.avgMenWage,
          avgWomenWage: bm.avgWomenWage,
          womenWage: bm.avgWomenWage,
          overallWage: bm.overallWage,
          totalWage: bm.overallWage,
          gap: bm.genderPayGapPercent,
          totalEmployees: bm.totalEmployees,
          womenPercent: bm.totalEmployees > 0 ? Math.round((bm.womenCount / bm.totalEmployees) * 1000) / 10 : null,
          menCount: bm.menCount,
          womenCount: bm.womenCount
        };
      }
      // Fallback: calculate from overview & partTime
      const ptRow = partTime.find(r => r.bodyName === entityName && r.year === year);
      const ovRows = overview.filter(r => r.bodyName === entityName && r.year === year);
      
      const totM = ptRow ? (ptRow.ftMenCount || 0) + (ptRow.ptMenCount || 0) : ovRows.reduce((s, r) => s + (r.menCount || 0), 0);
      const totW = ptRow ? (ptRow.ftWomenCount || 0) + (ptRow.ptWomenCount || 0) : ovRows.reduce((s, r) => s + (r.womenCount || 0), 0);
      const totHC = totM + totW;

      let mw = null, ww = null, tw = null;
      if (ptRow && ptRow.ftMenWage && ptRow.ftMenCount > 0) {
        const rate = ptRow.ptMenWage || ptRow.ftTotalWage || ptRow.ftMenWage;
        mw = ((ptRow.ftMenWage * ptRow.ftMenCount) + (rate * (ptRow.ptMenCount || 0))) / (totM || 1);
      }
      if (ptRow && ptRow.ftWomenWage && ptRow.ftWomenCount > 0) {
        const rate = ptRow.ptWomenWage || ptRow.ftTotalWage || ptRow.ftWomenWage;
        ww = ((ptRow.ftWomenWage * ptRow.ftWomenCount) + (rate * (ptRow.ptWomenCount || 0))) / (totW || 1);
      }
      if (ptRow && ptRow.ftTotalWage && ptRow.ftTotalCount > 0) {
        const rate = ptRow.ptTotalWage || ptRow.ftTotalWage;
        tw = ((ptRow.ftTotalWage * ptRow.ftTotalCount) + (rate * (ptRow.ptTotalCount || 0))) / (totHC || 1);
      }

      const g = (mw && ww && mw > 0) ? ((mw - ww) / mw) * 100 : null;
      return {
        avgMenWage: mw ? Math.round(mw) : null,
        menWage: mw ? Math.round(mw) : null,
        avgWomenWage: ww ? Math.round(ww) : null,
        womenWage: ww ? Math.round(ww) : null,
        overallWage: tw ? Math.round(tw) : null,
        totalWage: tw ? Math.round(tw) : null,
        gap: g !== null ? Math.round(g * 10) / 10 : null,
        totalEmployees: Math.round(totHC),
        womenPercent: totHC > 0 ? Math.round((totW / totHC) * 1000) / 10 : null,
        menCount: Math.round(totM),
        womenCount: Math.round(totW)
      };
    }

    if (entityType === 'rank') {
      const rows = overview.filter(r => r.rank === entityName && r.year === year);
      if (rows.length === 0) return null;

      let sumMS = 0, sumMC = 0, sumWS = 0, sumWC = 0, sumTS = 0, sumTC = 0;
      rows.forEach(r => {
        if (r.avgMenWage && r.menCount > 0) { sumMS += r.avgMenWage * r.menCount; sumMC += r.menCount; }
        if (r.avgWomenWage && r.womenCount > 0) { sumWS += r.avgWomenWage * r.womenCount; sumWC += r.womenCount; }
        if (r.avgGrossRegular && r.monthlyEmployeeCount > 0) { sumTS += r.avgGrossRegular * r.monthlyEmployeeCount; sumTC += r.monthlyEmployeeCount; }
      });

      const mw = sumMC > 0 ? (sumMS / sumMC) : null;
      const ww = sumWC > 0 ? (sumWS / sumWC) : null;
      const tw = sumTC > 0 ? (sumTS / sumTC) : null;
      const totHC = sumMC + sumWC;
      const g = (mw && ww && mw > 0) ? ((mw - ww) / mw) * 100 : null;

      return {
        avgMenWage: mw ? Math.round(mw) : null,
        menWage: mw ? Math.round(mw) : null,
        avgWomenWage: ww ? Math.round(ww) : null,
        womenWage: ww ? Math.round(ww) : null,
        overallWage: tw ? Math.round(tw) : null,
        totalWage: tw ? Math.round(tw) : null,
        gap: g !== null ? Math.round(g * 10) / 10 : null,
        totalEmployees: Math.round(totHC),
        womenPercent: totHC > 0 ? Math.round((sumWC / totHC) * 1000) / 10 : null,
        menCount: Math.round(sumMC),
        womenCount: Math.round(sumWC)
      };
    }

    if (entityType === 'system') {
      const rows = partTime.length > 0 ? partTime.filter(r => r.system === entityName && r.year === year) : overview.filter(r => r.system === entityName && r.year === year);
      if (rows.length === 0) return null;

      let sumMS = 0, sumMC = 0, sumWS = 0, sumWC = 0, sumTS = 0, sumTC = 0;
      if (partTime.length > 0) {
        rows.forEach(r => {
          if (r.ftMenWage && r.ftMenCount > 0) { sumMS += r.ftMenWage * r.ftMenCount; sumMC += r.ftMenCount; }
          if (r.ftWomenWage && r.ftWomenCount > 0) { sumWS += r.ftWomenWage * r.ftWomenCount; sumWC += r.ftWomenCount; }
          if (r.ftTotalWage && r.ftTotalCount > 0) { sumTS += r.ftTotalWage * r.ftTotalCount; sumTC += r.ftTotalCount; }
        });
      } else {
        rows.forEach(r => {
          if (r.avgMenWage && r.menCount > 0) { sumMS += r.avgMenWage * r.menCount; sumMC += r.menCount; }
          if (r.avgWomenWage && r.womenCount > 0) { sumWS += r.avgWomenWage * r.womenCount; sumWC += r.womenCount; }
          if (r.avgGrossRegular && r.monthlyEmployeeCount > 0) { sumTS += r.avgGrossRegular * r.monthlyEmployeeCount; sumTC += r.monthlyEmployeeCount; }
        });
      }

      const mw = sumMC > 0 ? (sumMS / sumMC) : null;
      const ww = sumWC > 0 ? (sumWS / sumWC) : null;
      const tw = sumTC > 0 ? (sumTS / sumTC) : null;
      const totHC = sumMC + sumWC;
      const g = (mw && ww && mw > 0) ? ((mw - ww) / mw) * 100 : null;

      return {
        avgMenWage: mw ? Math.round(mw) : null,
        menWage: mw ? Math.round(mw) : null,
        avgWomenWage: ww ? Math.round(ww) : null,
        womenWage: ww ? Math.round(ww) : null,
        overallWage: tw ? Math.round(tw) : null,
        totalWage: tw ? Math.round(tw) : null,
        gap: g !== null ? Math.round(g * 10) / 10 : null,
        totalEmployees: Math.round(totHC),
        womenPercent: totHC > 0 ? Math.round((sumWC / totHC) * 1000) / 10 : null,
        menCount: Math.round(sumMC),
        womenCount: Math.round(sumWC)
      };
    }

    return null;
  }

  // ── Extract Available Years ───────────────────────────────────

  function getAvailableYears() {
    const appState = (window.App && window.App.state) || null;
    if (appState && appState.filterOptions && appState.filterOptions.years.length > 0) {
      return [...appState.filterOptions.years].sort((a, b) => a - b);
    }
    return [2018, 2019, 2020, 2021, 2022, 2023, 2024];
  }

  // ── Comparison Studio Chart Rendering ─────────────────────────

  function renderComparisonStudio() {
    const el = document.getElementById('chartCompareTrends');
    if (!el) return;

    const availableYears = getAvailableYears();
    const fromY = Math.min(compState.fromYear, compState.toYear);
    const toY = Math.max(compState.fromYear, compState.toYear);
    const selectedYears = availableYears.filter(y => y >= fromY && y <= toY);

    const activeMetrics = compState.metrics.length > 0 ? compState.metrics : ['gap'];
    const isMultiMetric = activeMetrics.length > 1;
    const entities = compState.selectedEntities;

    // Determine Y-Axes: check if metrics have different units (e.g. ₪ vs %)
    const metricConfigs = activeMetrics.map(m => METRIC_CONFIG[m] || METRIC_CONFIG.gap);
    const hasDifferentUnits = isMultiMetric && (metricConfigs[0].unit !== metricConfigs[1].unit);

    const formatValForMetric = (val, mCfg) => {
      if (val === null || val === undefined) return '--';
      if (mCfg.isCurrency) return `₪${Math.round(val).toLocaleString('he-IL')}`;
      if (mCfg.unit === '%') return `${Number(val).toFixed(mCfg.decimals)}%`;
      return Number(val).toLocaleString('he-IL');
    };

    // Build series for each (entity, metric) combination
    const deltaRows = [];
    const series = [];

    entities.forEach((entityName, eIdx) => {
      const baseColor = PALETTE[eIdx % PALETTE.length];

      activeMetrics.forEach((mKey, mIdx) => {
        const mCfg = METRIC_CONFIG[mKey] || METRIC_CONFIG.gap;
        const seriesName = isMultiMetric ? `${entityName} (${mCfg.shortLabel})` : entityName;
        const yAxisIndex = hasDifferentUnits ? mIdx : 0;

        const data = selectedYears.map(yr => {
          const metricsObj = getEntityMetric(entityName, compState.entityType, yr);
          if (!metricsObj) return null;
          const val = metricsObj[mKey];
          return val !== undefined ? val : null;
        });

        // Collect points for delta table
        const validPoints = [];
        data.forEach((val, i) => {
          if (val !== null && val !== undefined) validPoints.push({ year: selectedYears[i], val });
        });

        if (validPoints.length > 0) {
          const startP = validPoints[0];
          const endP = validPoints[validPoints.length - 1];
          const absDelta = endP.val - startP.val;
          const pctChange = startP.val !== 0 ? (absDelta / Math.abs(startP.val)) * 100 : 0;
          deltaRows.push({
            entityName,
            metricLabel: mCfg.label,
            metricKey: mKey,
            color: baseColor,
            mCfg,
            isSecondaryMetric: mIdx === 1,
            startYear: startP.year,
            startVal: startP.val,
            endYear: endP.year,
            endVal: endP.val,
            absDelta,
            pctChange
          });
        }

        if (compState.chartType === 'bar') {
          series.push({
            name: seriesName,
            type: 'bar',
            yAxisIndex,
            data,
            itemStyle: {
              color: baseColor,
              opacity: mIdx === 1 ? 0.6 : 1.0,
              borderRadius: [4, 4, 0, 0]
            },
            emphasis: { focus: 'series' }
          });
        } else {
          // Line Chart: Metric 0 = Solid + Circle, Metric 1 = Dashed + Triangle
          series.push({
            name: seriesName,
            type: 'line',
            yAxisIndex,
            data,
            smooth: true,
            symbol: mIdx === 1 ? 'triangle' : 'circle',
            symbolSize: mIdx === 1 ? 9 : 8,
            lineStyle: {
              width: mIdx === 1 ? 2.5 : 3.5,
              type: mIdx === 1 ? 'dashed' : 'solid',
              color: baseColor
            },
            itemStyle: { color: baseColor },
            emphasis: { focus: 'series' }
          });
        }
      });
    });

    if (compareChart) compareChart.dispose();
    compareChart = echarts.init(el);

    // Build Y-Axis configuration
    let yAxisConfig;
    if (hasDifferentUnits) {
      yAxisConfig = [
        {
          type: 'value',
          name: metricConfigs[0].label,
          position: 'left',
          axisLabel: {
            fontFamily: 'Heebo', fontSize: 11, color: '#64748b',
            formatter: v => metricConfigs[0].isCurrency ? `${(v/1000).toFixed(0)}k ₪` : (metricConfigs[0].unit === '%' ? `${v}%` : v)
          },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }
        },
        {
          type: 'value',
          name: metricConfigs[1].label,
          position: 'right',
          axisLabel: {
            fontFamily: 'Heebo', fontSize: 11, color: '#64748b',
            formatter: v => metricConfigs[1].isCurrency ? `${(v/1000).toFixed(0)}k ₪` : (metricConfigs[1].unit === '%' ? `${v}%` : v)
          },
          splitLine: { show: false }
        }
      ];
    } else {
      const primaryCfg = metricConfigs[0];
      yAxisConfig = {
        type: 'value',
        axisLabel: {
          fontFamily: 'Heebo', fontSize: 11, color: '#64748b',
          formatter: v => primaryCfg.isCurrency ? `${(v/1000).toFixed(0)}k ₪` : (primaryCfg.unit === '%' ? `${v}%` : v)
        },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }
      };
    }

    const titleText = isMultiMetric
      ? `השוואת ${metricConfigs[0].label} מול ${metricConfigs[1].label} (${fromY}–${toY})`
      : `השוואת ${metricConfigs[0].label} (${fromY}–${toY})`;

    compareChart.setOption({
      title: {
        text: titleText,
        subtext: `${entities.length} ${compState.entityType === 'bodyName' ? 'גופים' : (compState.entityType === 'rank' ? 'דירוגים' : 'מערכות')} נבחרו | קו רציף: ${metricConfigs[0].label}${isMultiMetric ? ` | קו מקווקו: ${metricConfigs[1].label}` : ''}`,
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 15, fontWeight: 700, color: '#0f172a' },
        subtextStyle: { fontFamily: 'Heebo', fontSize: 12, color: '#64748b' }
      },
      tooltip: {
        trigger: 'axis',
        textStyle: { fontFamily: 'Heebo', fontSize: 12 },
        formatter: params => {
          if (!params || params.length === 0) return '';
          let html = `<div class="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1.5">${params[0].name}</div>`;
          params.forEach(p => {
            if (p.value === null || p.value === undefined) return;
            const seriesObj = series[p.seriesIndex];
            const mCfg = (hasDifferentUnits && seriesObj && seriesObj.yAxisIndex === 1) ? metricConfigs[1] : metricConfigs[0];
            html += `<div class="flex items-center justify-between gap-4 py-0.5">
              <span>${p.marker} <strong>${p.seriesName}</strong></span>
              <span class="font-bold text-slate-900">${formatValForMetric(p.value, mCfg)}</span>
            </div>`;
          });
          return html;
        },
        axisPointer: { type: 'cross', lineStyle: { color: '#94a3b8', type: 'dashed' } }
      },
      legend: {
        type: 'scroll',
        top: 36,
        right: 0,
        left: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 11, color: '#334155' }
      },
      grid: { left: 65, right: hasDifferentUnits ? 65 : 30, top: 90, bottom: 35 },
      xAxis: {
        type: 'category',
        data: selectedYears.map(String),
        boundaryGap: compState.chartType === 'bar',
        axisLabel: { fontFamily: 'Heebo', fontSize: 12, fontWeight: 600, color: '#334155' },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.15)' } }
      },
      yAxis: yAxisConfig,
      series
    });

    renderDeltaTable(deltaRows, formatValForMetric);
  }

  // ── Render Delta Table ────────────────────────────────────────

  function renderDeltaTable(rows, formatValForMetric) {
    const tbody = document.getElementById('tbodyCompDelta');
    const thStart = document.getElementById('thCompStartVal');
    const thEnd = document.getElementById('thCompEndVal');
    if (!tbody) return;

    if (thStart) thStart.textContent = `ערך ב-${compState.fromYear}`;
    if (thEnd) thEnd.textContent = `ערך ב-${compState.toYear}`;

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400">לא נבחרו ישויות להשוואה</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const mCfg = r.mCfg;
      const isImproved = mCfg.reversePolarity ? r.absDelta < 0 : r.absDelta > 0;
      const isWorsened = mCfg.reversePolarity ? r.absDelta > 0 : r.absDelta < 0;

      let badgeHtml = '';
      if (Math.abs(r.absDelta) < 0.05) {
        badgeHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">ללא שינוי</span>`;
      } else if (isImproved) {
        badgeHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">שיפור 🟢</span>`;
      } else {
        badgeHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">החמרה 🔴</span>`;
      }

      const sign = r.absDelta > 0 ? '+' : '';
      const deltaColor = isImproved ? 'text-emerald-600 font-bold' : (isWorsened ? 'text-rose-600 font-bold' : 'text-slate-600');

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-2">
            <span class="w-3 h-3 ${r.isSecondaryMetric ? 'rounded-none rotate-45' : 'rounded-full'} shrink-0" style="background-color: ${r.color}"></span>
            <span>${r.entityName} <span class="text-xs font-normal text-slate-500">(${r.metricLabel})</span></span>
          </td>
          <td class="px-4 py-2.5 text-center text-slate-700 font-medium">${formatValForMetric(r.startVal, mCfg)}</td>
          <td class="px-4 py-2.5 text-center text-slate-900 font-bold">${formatValForMetric(r.endVal, mCfg)}</td>
          <td class="px-4 py-2.5 text-center ${deltaColor}">${sign}${mCfg.isCurrency ? '₪' : ''}${r.absDelta.toFixed(mCfg.decimals)}${mCfg.unit === '%' ? '%' : ''}</td>
          <td class="px-4 py-2.5 text-center ${deltaColor}">${sign}${r.pctChange.toFixed(1)}%</td>
          <td class="px-4 py-2.5 text-center">${badgeHtml}</td>
        </tr>
      `;
    }).join('');
  }

  // ── Render Tags Container ─────────────────────────────────────

  function renderTagsContainer() {
    const container = document.getElementById('containerCompTags');
    if (!container) return;

    if (compState.selectedEntities.length === 0) {
      container.innerHTML = `<span class="text-xs text-slate-400 py-1">אין ישויות נבחרות. השתמש בחיפוש למעלה או בחר אחת ההשוואות המומלצות.</span>`;
      return;
    }

    container.innerHTML = compState.selectedEntities.map((name, idx) => {
      const color = PALETTE[idx % PALETTE.length];
      return `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white border border-slate-300 text-slate-800 shadow-xs">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${color}"></span>
          <span>${name}</span>
          <button data-remove="${name}" class="btnRemoveTag hover:text-rose-600 ml-0.5 text-slate-400 transition-colors font-bold">&times;</button>
        </span>
      `;
    }).join('');

    container.querySelectorAll('.btnRemoveTag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toRemove = e.target.dataset.remove;
        compState.selectedEntities = compState.selectedEntities.filter(item => item !== toRemove);
        renderTagsContainer();
        renderComparisonStudio();
      });
    });
  }

  // ── Populate Year Selectors ───────────────────────────────────

  function populateYearSelectors() {
    const selFrom = document.getElementById('selectCompFromYear');
    const selTo = document.getElementById('selectCompToYear');
    if (!selFrom || !selTo) return;

    const years = getAvailableYears();
    
    selFrom.innerHTML = years.map(y => `<option value="${y}" ${y === compState.fromYear ? 'selected' : ''}>${y}</option>`).join('');
    selTo.innerHTML = years.map(y => `<option value="${y}" ${y === compState.toYear ? 'selected' : ''}>${y}</option>`).join('');
  }

  // ── Update Metric Selector UI ─────────────────────────────────

  function updateMetricButtonsUI() {
    document.querySelectorAll('.btnCompMetric').forEach(b => {
      const m = b.dataset.metric;
      const isSelected = compState.metrics.includes(m);
      if (isSelected) {
        b.classList.add('bg-brand-600', 'text-white', 'font-bold');
        b.classList.remove('bg-white', 'text-slate-700');
      } else {
        b.classList.remove('bg-brand-600', 'text-white', 'font-bold');
        b.classList.add('bg-white', 'text-slate-700');
      }
    });
  }

  // ── Bind Interactive Events ───────────────────────────────────

  function bindInteractiveEvents() {
    if (isEventsBound) return;
    isEventsBound = true;

    // 1. Presets buttons
    document.querySelectorAll('.btnPreset').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.id;
        let presetKey = 'hospitals';
        if (id === 'presetGovCompanies') presetKey = 'govCompanies';
        if (id === 'presetFinance') presetKey = 'finance';
        if (id === 'presetRanks') presetKey = 'ranks';

        const p = PRESETS[presetKey];
        if (p) {
          compState.entityType = p.type;
          compState.selectedEntities = [...p.entities];
          updateCompTypeUI();
          renderTagsContainer();
          renderComparisonStudio();
        }
      });
    });

    // 2. Entity Type buttons
    document.querySelectorAll('.btnCompType').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        if (type !== compState.entityType) {
          compState.entityType = type;
          if (type === 'rank') {
            compState.selectedEntities = ['רופאים מומחים', 'אחים ואחיות', 'מהנדסים', 'מנהלי'];
          } else if (type === 'system') {
            compState.selectedEntities = ['מערכת הבריאות', 'חברות ממשלתיות', 'שלטון מקומי', 'משרדי ממשלה'];
          } else {
            compState.selectedEntities = ['איכילוב', 'הדסה', 'המרכז הרפואי על שם חיים שיבא – תל השומר'];
          }
          updateCompTypeUI();
          renderTagsContainer();
          renderComparisonStudio();
        }
      });
    });

    // 3. Search input & autocomplete
    const searchInput = document.getElementById('inputCompSearch');
    const dropdown = document.getElementById('dropdownCompResults');
    if (searchInput && dropdown) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 1) {
          dropdown.classList.add('hidden');
          return;
        }

        const appState = (window.App && window.App.state) || null;
        const overview = (appState && appState.data && appState.data.overview) || [];
        
        let pool = [];
        if (compState.entityType === 'bodyName') {
          pool = [...new Set(overview.map(r => r.bodyName).filter(Boolean))];
        } else if (compState.entityType === 'rank') {
          pool = [...new Set(overview.map(r => r.rank).filter(Boolean))];
        } else {
          pool = [...new Set(overview.map(r => r.system).filter(Boolean))];
        }

        const matches = pool.filter(name => name.toLowerCase().includes(query) && !compState.selectedEntities.includes(name)).slice(0, 15);

        if (matches.length === 0) {
          dropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center">לא נמצאו תוצאות</div>`;
          dropdown.classList.remove('hidden');
          return;
        }

        dropdown.innerHTML = matches.map(name => `
          <div class="p-2.5 text-xs text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors font-medium flex items-center justify-between" data-add="${name}">
            <span>${name}</span>
            <span class="text-brand-600 font-bold text-[11px]">+ הוסף</span>
          </div>
        `).join('');

        dropdown.querySelectorAll('[data-add]').forEach(item => {
          item.addEventListener('click', () => {
            const addName = item.dataset.add;
            if (!compState.selectedEntities.includes(addName)) {
              compState.selectedEntities.push(addName);
              renderTagsContainer();
              renderComparisonStudio();
            }
            searchInput.value = '';
            dropdown.classList.add('hidden');
          });
        });

        dropdown.classList.remove('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    }

    // 4. Year Selectors
    const selFrom = document.getElementById('selectCompFromYear');
    const selTo = document.getElementById('selectCompToYear');
    if (selFrom) {
      selFrom.addEventListener('change', (e) => {
        compState.fromYear = Number(e.target.value);
        renderComparisonStudio();
      });
    }
    if (selTo) {
      selTo.addEventListener('change', (e) => {
        compState.toYear = Number(e.target.value);
        renderComparisonStudio();
      });
    }

    // 5. Multi-Metric Selector buttons (Support selecting up to 2 metrics simultaneously)
    document.querySelectorAll('.btnCompMetric').forEach(btn => {
      btn.addEventListener('click', () => {
        const metric = btn.dataset.metric;
        const idx = compState.metrics.indexOf(metric);

        if (idx !== -1) {
          // Already selected: toggle off if more than 1 metric is active
          if (compState.metrics.length > 1) {
            compState.metrics.splice(idx, 1);
          }
        } else {
          // Not selected: add or replace oldest to enforce max 2 metrics
          if (compState.metrics.length < 2) {
            compState.metrics.push(metric);
          } else {
            // Replace the second metric
            compState.metrics[1] = metric;
          }
        }

        updateMetricButtonsUI();
        renderComparisonStudio();
      });
    });

    // 6. Chart Type buttons
    const btnLine = document.getElementById('btnChartTypeLine');
    const btnBar = document.getElementById('btnChartTypeBar');
    if (btnLine && btnBar) {
      btnLine.addEventListener('click', () => {
        compState.chartType = 'line';
        btnLine.classList.add('bg-slate-100', 'text-slate-900', 'font-bold');
        btnLine.classList.remove('text-slate-600');
        btnBar.classList.remove('bg-slate-100', 'text-slate-900', 'font-bold');
        btnBar.classList.add('text-slate-600');
        renderComparisonStudio();
      });
      btnBar.addEventListener('click', () => {
        compState.chartType = 'bar';
        btnBar.classList.add('bg-slate-100', 'text-slate-900', 'font-bold');
        btnBar.classList.remove('text-slate-600');
        btnLine.classList.remove('bg-slate-100', 'text-slate-900', 'font-bold');
        btnLine.classList.add('text-slate-600');
        renderComparisonStudio();
      });
    }

    // 7. Clear All Entities
    const btnClear = document.getElementById('btnClearCompEntities');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        compState.selectedEntities = [];
        renderTagsContainer();
        renderComparisonStudio();
      });
    }
  }

  function updateCompTypeUI() {
    document.querySelectorAll('.btnCompType').forEach(b => {
      if (b.dataset.type === compState.entityType) {
        b.classList.add('bg-brand-600', 'text-white', 'font-bold');
        b.classList.remove('text-slate-600');
      } else {
        b.classList.remove('bg-brand-600', 'text-white', 'font-bold');
        b.classList.add('text-slate-600');
      }
    });

    const lbl = document.getElementById('lblCompSearch');
    const input = document.getElementById('inputCompSearch');
    if (lbl && input) {
      if (compState.entityType === 'bodyName') {
        lbl.textContent = 'הוסף גופים להשוואה:';
        input.placeholder = '🔍 הקלד לחיפוש והוספה (למשל איכילוב, הדסה...)';
      } else if (compState.entityType === 'rank') {
        lbl.textContent = 'הוסף דירוגים להשוואה:';
        input.placeholder = '🔍 הקלד לחיפוש והוספה (למשל רופאים מומחים, מהנדסים...)';
      } else {
        lbl.textContent = 'הוסף מערכות להשוואה:';
        input.placeholder = '🔍 הקלד לחיפוש והוספה (למשל מערכת הבריאות, חברות ממשלתיות...)';
      }
    }
  }

  // ── Cross-Sector Trajectory Chart (2018–2024) ─────────────────

  function renderTrajectory(allOverview) {
    const el = document.getElementById('chartTrajectory');
    if (!el) return;

    const years = getAvailableYears();
    const systems = ['מערכת הבריאות', 'חברות ממשלתיות', 'שלטון מקומי', 'משרדי ממשלה', 'בטחוניים', 'תאגידים'];

    const seriesData = systems.map((sys, idx) => {
      const data = years.map(yr => {
        const metrics = getEntityMetric(sys, 'system', yr);
        return metrics ? metrics.gap : null;
      });

      return {
        name: sys,
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        itemStyle: { color: PALETTE[idx % PALETTE.length] },
        emphasis: { focus: 'series' }
      };
    });

    // National average line from benchmarks
    const nationalData = years.map(yr => {
      if (window.DataValidator && window.DataValidator.TABLEAU_BENCHMARKS && window.DataValidator.TABLEAU_BENCHMARKS[yr]) {
        return window.DataValidator.TABLEAU_BENCHMARKS[yr].genderPayGapPercent;
      }
      return null;
    });

    if (nationalData.some(v => v !== null)) {
      seriesData.push({
        name: 'ממוצע ארצי',
        type: 'line',
        data: nationalData,
        symbol: 'diamond',
        symbolSize: 8,
        lineStyle: { width: 3.5, type: 'dashed', color: '#0f172a' },
        itemStyle: { color: '#0f172a' },
        z: 10
      });
    }

    if (trajectoryChart) trajectoryChart.dispose();
    trajectoryChart = echarts.init(el);

    trajectoryChart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: params => {
          let html = `<div class="font-bold text-slate-800 border-b pb-1 mb-1">${params[0].name}</div>`;
          const sorted = [...params].sort((a, b) => (b.value || 0) - (a.value || 0));
          sorted.forEach(p => {
            if (p.value == null) return;
            const bold = p.seriesName === 'ממוצע ארצי' ? 'font-bold text-slate-950' : '';
            html += `<div class="flex justify-between gap-3 text-xs ${bold}">
              <span>${p.marker} ${p.seriesName}</span>
              <span class="font-bold">${p.value.toFixed(1)}%</span>
            </div>`;
          });
          return html;
        },
        textStyle: { fontFamily: 'Heebo' },
        axisPointer: { type: 'cross' }
      },
      legend: {
        type: 'scroll',
        top: 0, right: 0, left: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 11 }
      },
      grid: { left: 50, right: 20, top: 45, bottom: 25 },
      xAxis: {
        type: 'category',
        data: years.map(String),
        boundaryGap: false,
        axisLabel: { fontFamily: 'Heebo', fontSize: 12, color: '#334155', fontWeight: 600 },
        splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.15)' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: '#64748b', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }
      },
      series: seriesData
    });
  }

  // ── Insights ──────────────────────────────────────────────────

  function renderInsights(allOverview) {
    const el = document.getElementById('insightsTrends');
    if (el && window.InsightsEngine && InsightsEngine.trendInsights) {
      el.innerHTML = InsightsEngine.trendInsights(allOverview);
    }
  }

  // ── Public API ────────────────────────────────────────────────

  function update(allOverview) {
    bindInteractiveEvents();
    populateYearSelectors();
    updateMetricButtonsUI();
    renderTagsContainer();
    renderComparisonStudio();
    renderTrajectory(allOverview);
    renderInsights(allOverview);
  }

  function resize() {
    if (compareChart) compareChart.resize();
    if (trajectoryChart) trajectoryChart.resize();
  }

  return { update, resize, compState };
})();
