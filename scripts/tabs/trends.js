/**
 * Tab 4: Trends & Benchmarking — Stage 5
 * Multi-line trajectory, Slope chart, Sparklines grid (Cross-year analysis)
 */

window.TabTrends = (function () {

  let trajectoryChart = null;
  let slopeChart = null;

  const COLORS = {
    gap: '#f43f5e',
    good: '#10b981', // Emerald
    bad: '#f43f5e',  // Rose
    gridLine: 'rgba(148,163,184,0.15)',
    tick: '#94a3b8',
    systems: [
      '#0f766e', '#14b8a6', '#5eead4', '#be123c',
      '#f43f5e', '#fda4af', '#1e293b', '#64748b'
    ]
  };

  // ── Multi-Line Trajectory Chart ───────────────────────────────

  function renderTrajectory(allOverview) {
    const el = document.getElementById('chartTrajectory');
    if (!el) return;

    const years = [...new Set(allOverview.map(r => r.year))].filter(Boolean).sort((a, b) => a - b);
    const systems = [...new Set(allOverview.map(r => r.system))].filter(Boolean);

    const seriesData = systems.map((sys, idx) => {
      const data = years.map(yr => {
        const sub = allOverview.filter(r => r.system === sys && r.year === yr);
        if (sub.length === 0) return null;
        const mw = DataValidator.calculateWeightedAverageMenWage(sub);
        const ww = DataValidator.calculateWeightedAverageWomenWage(sub);
        if (!mw || !ww) return null;
        const g = ((mw - ww) / mw) * 100;
        return Math.round(g * 10) / 10;
      });
      return {
        name: sys,
        type: 'line',
        data,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        itemStyle: { color: COLORS.systems[idx % COLORS.systems.length] },
        emphasis: { focus: 'series' }
      };
    }).filter(s => s.data.some(v => v !== null));

    // National average line
    const nationalData = years.map(yr => {
      const sub = allOverview.filter(r => r.year === yr);
      const mw = DataValidator.calculateWeightedAverageMenWage(sub);
      const ww = DataValidator.calculateWeightedAverageWomenWage(sub);
      if (!mw || !ww) return null;
      const g = ((mw - ww) / mw) * 100;
      return Math.round(g * 10) / 10;
    });

    seriesData.push({
      name: 'ממוצע ארצי',
      type: 'line',
      data: nationalData,
      symbol: 'diamond',
      symbolSize: 8,
      lineStyle: { width: 4, type: 'dashed', color: '#1e293b' },
      itemStyle: { color: '#1e293b' },
      z: 10
    });

    if (trajectoryChart) trajectoryChart.dispose();
    trajectoryChart = echarts.init(el);

    trajectoryChart.setOption({
      title: {
        text: 'מגמת פער שכר לאורך זמן (2018–2024)',
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: params => {
          let html = `<strong>${params[0].name}</strong><br>`;
          // Sort by value descending for tooltip
          const sorted = [...params].sort((a, b) => (b.value || 0) - (a.value || 0));
          sorted.forEach(p => {
            if (p.value == null) return;
            const marker = p.seriesName === 'ממוצע ארצי' ? '⬛' : p.marker;
            const bold = p.seriesName === 'ממוצע ארצי' ? 'font-bold' : '';
            html += `<div class="${bold}">${marker} ${p.seriesName}: ${p.value.toFixed(1)}%</div>`;
          });
          return html;
        },
        textStyle: { fontFamily: 'Heebo' },
        axisPointer: { type: 'cross' }
      },
      legend: {
        type: 'scroll',
        top: 30, right: 0, left: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 11 }
      },
      grid: { left: 50, right: 30, top: 80, bottom: 30 },
      xAxis: {
        type: 'category',
        data: years.map(String),
        boundaryGap: false,
        axisLabel: { fontFamily: 'Heebo', fontSize: 12, color: '#334155', fontWeight: 600 },
        splitLine: { show: true, lineStyle: { color: COLORS.gridLine } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick, formatter: '{value}%' },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
        min: 'dataMin',
      },
      series: seriesData
    });
  }

  // ── Slope Chart: 2018 vs 2024 ─────────────────────────────────

  function renderSlope(allOverview) {
    const el = document.getElementById('chartSlope');
    if (!el) return;

    const years = [...new Set(allOverview.map(r => r.year))].filter(Boolean).sort((a, b) => a - b);
    if (years.length < 2) return;

    const yStart = years[0];
    const yEnd = years[years.length - 1];
    const systems = [...new Set(allOverview.map(r => r.system))].filter(Boolean);

    const data = systems.map(sys => {
      const subStart = allOverview.filter(r => r.system === sys && r.year === yStart);
      const subEnd = allOverview.filter(r => r.system === sys && r.year === yEnd);
      
      const hcStart = subStart.reduce((s, r) => s + (r.menCount||0) + (r.womenCount||0), 0);
      const hcEnd = subEnd.reduce((s, r) => s + (r.menCount||0) + (r.womenCount||0), 0);
      
      if (hcStart < DataEngine.PRIVACY_THRESHOLD || hcEnd < DataEngine.PRIVACY_THRESHOLD) return null;

      const mwS = DataValidator.calculateWeightedAverageMenWage(subStart);
      const wwS = DataValidator.calculateWeightedAverageWomenWage(subStart);
      const mwE = DataValidator.calculateWeightedAverageMenWage(subEnd);
      const wwE = DataValidator.calculateWeightedAverageWomenWage(subEnd);

      if (!mwS || !mwE) return null;
      
      const gS = ((mwS - wwS) / mwS) * 100;
      const gE = ((mwE - wwE) / mwE) * 100;

      return {
        system: sys,
        start: Math.round(gS * 10) / 10,
        end: Math.round(gE * 10) / 10,
        delta: gE - gS
      };
    }).filter(Boolean);

    if (slopeChart) slopeChart.dispose();
    slopeChart = echarts.init(el);

    const seriesData = data.map(d => {
      const isImproved = d.delta < 0;
      const color = isImproved ? COLORS.good : COLORS.bad;
      return {
        name: d.system,
        type: 'line',
        data: [
          { value: [0, d.start], name: String(yStart) },
          { value: [1, d.end], name: String(yEnd) }
        ],
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color, opacity: 0.7 },
        itemStyle: { color },
        label: {
          show: true,
          position: p => p.dataIndex === 0 ? 'left' : 'right',
          formatter: p => p.dataIndex === 0 ? `${d.system} ${p.value[1]}%` : `${p.value[1]}%`,
          fontFamily: 'Heebo',
          fontSize: 11,
          color: '#334155'
        }
      };
    });

    slopeChart.setOption({
      title: {
        text: `שינוי בפער השכר: ${yStart} מול ${yEnd}`,
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      grid: { left: 60, right: 180, top: 60, bottom: 30 },
      xAxis: {
        type: 'category',
        data: [String(yStart), String(yEnd)],
        axisLabel: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#0f172a' },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'value',
        show: false, // hide y axis for clean slope chart
        min: 'dataMin', max: 'dataMax'
      },
      tooltip: {
        formatter: p => `<strong>${p.seriesName}</strong><br>${p.data.name}: ${p.data.value[1]}%`,
        textStyle: { fontFamily: 'Heebo' }
      },
      series: seriesData
    });
  }

  // ── Top Movers YoY ────────────────────────────────────────────

  let moversChart = null;

  function renderMovers(allOverview) {
    const el = document.getElementById('chartMovers');
    if (!el) return;

    const years = [...new Set(allOverview.map(r => r.year))].filter(Boolean).sort((a, b) => a - b);
    if (years.length < 2) return;

    const yStart = years[years.length - 2]; // Previous year
    const yEnd = years[years.length - 1];   // Latest year

    const bodies = [...new Set(allOverview.map(r => r.bodyName))].filter(Boolean);
    
    const data = bodies.map(body => {
      const subStart = allOverview.filter(r => r.bodyName === body && r.year === yStart);
      const subEnd = allOverview.filter(r => r.bodyName === body && r.year === yEnd);
      
      const hcStart = subStart.reduce((s, r) => s + (r.menCount||0) + (r.womenCount||0), 0);
      const hcEnd = subEnd.reduce((s, r) => s + (r.menCount||0) + (r.womenCount||0), 0);
      
      if (hcStart < 50 || hcEnd < 50) return null; // Noise filter for bodies

      const mwS = DataValidator.calculateWeightedAverageMenWage(subStart);
      const wwS = DataValidator.calculateWeightedAverageWomenWage(subStart);
      const mwE = DataValidator.calculateWeightedAverageMenWage(subEnd);
      const wwE = DataValidator.calculateWeightedAverageWomenWage(subEnd);

      if (!mwS || !mwE) return null;
      
      const gS = ((mwS - wwS) / mwS) * 100;
      const gE = ((mwE - wwE) / mwE) * 100;

      return { body, delta: gE - gS };
    }).filter(Boolean);

    // Top 5 improved and Top 5 regressed
    const sorted = data.sort((a, b) => a.delta - b.delta);
    const topImproved = sorted.slice(0, 5);
    const topRegressed = sorted.slice(-5).filter(d => d.delta > 0);
    
    // Combine and sort for chart (descending)
    const combined = [...topImproved, ...topRegressed].sort((a, b) => b.delta - a.delta);

    if (moversChart) moversChart.dispose();
    moversChart = echarts.init(el);

    const truncate = (s, max) => s.length > max ? s.substring(0, max - 1) + '…' : s;

    moversChart.setOption({
      title: {
        text: `השינוי הגדול ביותר (${yStart}–${yEnd})`,
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        formatter: p => `<strong>${p.name}</strong><br>שינוי: ${p.value > 0 ? '+' : ''}${p.value.toFixed(1)} נקודות אחוז`,
        textStyle: { fontFamily: 'Heebo' }
      },
      grid: { left: 100, right: 30, top: 50, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
      },
      yAxis: {
        type: 'category',
        data: combined.map(d => truncate(d.body, 20)),
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: '#334155' },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: combined.map(d => ({
          value: Math.round(d.delta * 10) / 10,
          itemStyle: { 
            color: d.delta < 0 ? COLORS.good : COLORS.bad,
            borderRadius: d.delta < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0]
          }
        })),
        label: {
          show: true,
          position: p => p.value < 0 ? 'left' : 'right',
          formatter: p => `${p.value > 0 ? '+' : ''}${p.value}%`,
          fontFamily: 'Heebo', fontSize: 11, fontWeight: 600,
          color: p => p.value < 0 ? COLORS.good : COLORS.bad
        }
      }]
    });
  }

  // ── Insights ──────────────────────────────────────────────────

  function renderInsights(allOverview) {
    const el = document.getElementById('insightsTrends');
    if (el) el.innerHTML = InsightsEngine.trendInsights(allOverview);
  }

  // ── Public ────────────────────────────────────────────────────

  function update(allOverview) {
    renderTrajectory(allOverview);
    renderSlope(allOverview);
    renderMovers(allOverview);
    renderInsights(allOverview);
  }

  function resize() {
    if (trajectoryChart) trajectoryChart.resize();
    if (slopeChart) slopeChart.resize();
    if (moversChart) moversChart.resize();
  }

  return { update, resize };
})();
