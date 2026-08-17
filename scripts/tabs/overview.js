/**
 * Tab 1: Executive Overview — Stage 5
 * Butterfly chart (system gaps), Heatmap (body×rank), KPI strip
 */

window.TabOverview = (function () {

  let butterflyChart = null;
  let heatmapChart = null;
  let salaryTiersChart = null;
  let initialized = false;

  const COLORS = {
    men: '#14b8a6',   // Teal
    women: '#f43f5e', // Rose
    good: '#10b981',  // Emerald
    bad: '#f43f5e',   // Rose
    gridLine: 'rgba(148,163,184,0.15)',
    tick: '#94a3b8',
  };

  function fmtShekel(v) { return '₪' + Math.round(v).toLocaleString('he-IL'); }

  // ── KPIs ──────────────────────────────────────────────────────

  function renderKPIs(records) {
    const appState = (window.App && window.App.state) || null;
    const ptData = (appState && appState.data && appState.data.partTime) || null;
    let v;

    // If no rank filter is active and we have partTime data, use official full-time dataset (Tableau methodology)
    if (appState && (!appState.filters.rank || appState.filters.rank.length === 0) && ptData && ptData.length > 0) {
      let ptFiltered = ptData;
      if (appState.filters.year && appState.activeTab !== 'trends') {
        ptFiltered = ptFiltered.filter(r => r.year === Number(appState.filters.year));
      }
      if (appState.filters.system && appState.filters.system.length > 0) {
        ptFiltered = ptFiltered.filter(r => appState.filters.system.includes(r.system));
      }
      if (appState.filters.subSystem && appState.filters.subSystem.length > 0) {
        ptFiltered = ptFiltered.filter(r => appState.filters.subSystem.includes(r.subSystem));
      }
      if (appState.filters.bodyName && appState.filters.bodyName.length > 0) {
        ptFiltered = ptFiltered.filter(r => appState.filters.bodyName.includes(r.bodyName));
      }

      // Compute weighted metrics
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

      const avgMenCost = c_mc > 0 ? (c_ms / c_mc) : 0;
      const avgWomenCost = c_wc > 0 ? (c_ws / c_wc) : 0;
      const employerCostGap = (avgMenCost > 0 && avgWomenCost > 0) ? ((avgMenCost - avgWomenCost) / avgMenCost) * 100 : null;
      const overallCost = (c_mc + c_wc > 0) ? (c_ms + c_ws) / (c_mc + c_wc) : 0;

      v = {
        totalRecords: records.length,
        totalMen: Math.round(ft_men_tot),
        totalWomen: Math.round(ft_women_tot),
        totalEmployees: Math.round(ft_tc || (ft_men_tot + ft_women_tot)),
        avgMenWage: Math.round(avgMenWage),
        avgWomenWage: Math.round(avgWomenWage),
        genderPayGapPercent: payGap !== null ? Math.round(payGap * 100) / 100 : null,
        avgMenEmployerCost: Math.round(avgMenCost),
        avgWomenEmployerCost: Math.round(avgWomenCost),
        overallEmployerCost: Math.round(overallCost),
        employerCostGapPercent: employerCostGap !== null ? Math.round(employerCostGap * 100) / 100 : null,
      };
    } else {
      v = DataValidator.computeKPIs(records);
    }

    if (v.genderPayGapPercent !== null) {
      document.getElementById('kpiPayGap').textContent = v.genderPayGapPercent.toFixed(2) + '%';
      document.getElementById('kpiPayGap').className = 'text-3xl font-extrabold tracking-tight ' + (v.genderPayGapPercent > 0 ? 'text-rose-500' : 'text-emerald-500');
    } else {
      document.getElementById('kpiPayGap').textContent = 'אין נתונים';
      document.getElementById('kpiPayGap').className = 'text-xl font-bold tracking-tight text-slate-400 mt-2';
    }

    document.getElementById('kpiMenWage').textContent = fmtShekel(v.avgMenWage);
    document.getElementById('kpiMenCount').textContent = Math.round(v.totalMen).toLocaleString('he-IL') + ' עובדים';

    document.getElementById('kpiWomenWage').textContent = fmtShekel(v.avgWomenWage);
    document.getElementById('kpiWomenCount').textContent = Math.round(v.totalWomen).toLocaleString('he-IL') + ' עובדות';

    // Calculate proportions for the wage bars
    const maxWage = Math.max(v.avgMenWage, v.avgWomenWage, 1);
    const mBar = document.getElementById('kpiMenBar');
    const wBar = document.getElementById('kpiWomenBar');
    if (mBar) mBar.style.width = ((v.avgMenWage / maxWage) * 100) + '%';
    if (wBar) wBar.style.width = ((v.avgWomenWage / maxWage) * 100) + '%';

    document.getElementById('kpiTotalEmployees').textContent = Math.round(v.totalEmployees).toLocaleString('he-IL');
    document.getElementById('kpiTotalRecords').textContent = v.totalRecords.toLocaleString('he-IL') + ' שורות נתונים';

    const ws = v.totalEmployees > 0 ? ((v.totalWomen / v.totalEmployees) * 100).toFixed(1) : '0.0';
    document.getElementById('kpiWomenShare').textContent = ws + '%';
    
    // Update share bar
    const shareBar = document.getElementById('kpiShareBar');
    if (shareBar) shareBar.style.width = ws + '%';

    // Employer Cost KPIs
    const empCostEl = document.getElementById('kpiEmployerCost');
    if (empCostEl) empCostEl.textContent = fmtShekel(v.overallEmployerCost);

    const empCostGapEl = document.getElementById('kpiEmployerCostGap');
    if (empCostGapEl) {
      empCostGapEl.textContent = v.employerCostGapPercent !== null ? v.employerCostGapPercent.toFixed(2) + '%' : '—';
    }
  }

  // ── Butterfly Chart ───────────────────────────────────────────

  function renderButterflyChart(records) {
    const el = document.getElementById('chartButterfly');
    if (!el) return;

    const systems = [...new Set(records.map(r => r.system))].filter(Boolean);
    const data = systems.map(sys => {
      const sub = records.filter(r => r.system === sys);
      const hc = sub.reduce((s, r) => s + (r.menCount || 0) + (r.womenCount || 0), 0);
      const g = DataValidator.calculateAggregateGap(sub);
      const mw = DataValidator.calculateWeightedAverageMenWage(sub);
      const ww = DataValidator.calculateWeightedAverageWomenWage(sub);
      return { system: sys, menWage: mw, womenWage: ww, gap: g, hc };
    }).filter(d => d.hc >= DataEngine.PRIVACY_THRESHOLD && d.gap !== null)
      .sort((a, b) => b.gap - a.gap);

    if (butterflyChart) butterflyChart.dispose();

    butterflyChart = echarts.init(el);
    butterflyChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: params => {
          const sys = params[0].name;
          const d = data.find(x => x.system === sys);
          return `<strong>${sys}</strong><br>` +
            `שכר גברים: ${fmtShekel(d.menWage)}<br>` +
            `שכר נשים: ${fmtShekel(d.womenWage)}<br>` +
            `פער: ${d.gap.toFixed(1)}%`;
        },
        textStyle: { fontFamily: 'Heebo' }
      },
      grid: { left: 60, right: 60, top: 50, bottom: 30 },
      title: {
        text: 'פער שכר לפי מערכת — השוואת גברים ונשים',
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      legend: {
        data: ['שכר גברים', 'שכר נשים'],
        right: 0, top: 30,
        textStyle: { fontFamily: 'Heebo', fontSize: 12 }
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: v => fmtShekel(Math.abs(v)),
          fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick
        },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
      },
      yAxis: {
        type: 'category',
        data: data.map(d => d.system),
        axisLabel: { fontFamily: 'Heebo', fontSize: 12, color: '#334155' },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: COLORS.gridLine } },
      },
      series: [
        {
          name: 'שכר גברים',
          type: 'bar',
          stack: 'wage',
          data: data.map(d => -d.menWage), // negative = left
          itemStyle: { color: COLORS.men, borderRadius: [4, 0, 0, 4] },
          label: {
            show: true, position: 'left',
            formatter: p => fmtShekel(Math.abs(p.value)),
            fontFamily: 'Heebo', fontSize: 11, color: COLORS.men
          },
          barMaxWidth: 28,
        },
        {
          name: 'שכר נשים',
          type: 'bar',
          stack: 'wage',
          data: data.map(d => d.womenWage), // positive = right
          itemStyle: { color: COLORS.women, borderRadius: [0, 4, 4, 0] },
          label: {
            show: true, position: 'right',
            formatter: p => fmtShekel(p.value),
            fontFamily: 'Heebo', fontSize: 11, color: COLORS.women
          },
          barMaxWidth: 28,
        }
      ]
    });

    // Drill-down event
    butterflyChart.off('click');
    butterflyChart.on('click', function (params) {
      if (params.name) {
        App.setFilterAndRoute({ system: params.name }, 'ranks');
      }
    });
  }

  // ── Heatmap ───────────────────────────────────────────────────

  function renderHeatmap(records) {
    const el = document.getElementById('chartHeatmap');
    if (!el) return;

    // Top 15 bodies by headcount
    const bodyMap = {};
    records.forEach(r => {
      if (!r.bodyName) return;
      bodyMap[r.bodyName] = (bodyMap[r.bodyName] || 0) + (r.menCount || 0) + (r.womenCount || 0);
    });
    const topBodies = Object.entries(bodyMap)
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);

    // Top 10 ranks by headcount
    const rankMap = {};
    records.filter(r => topBodies.includes(r.bodyName)).forEach(r => {
      if (!r.rank) return;
      rankMap[r.rank] = (rankMap[r.rank] || 0) + (r.menCount || 0) + (r.womenCount || 0);
    });
    const topRanks = Object.entries(rankMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(e => e[0]);

    // Build heatmap data: [rankIdx, bodyIdx, gapValue]
    const heatData = [];
    topRanks.forEach((rank, ri) => {
      topBodies.forEach((body, bi) => {
        const sub = records.filter(r => r.bodyName === body && r.rank === rank);
        const hc = sub.reduce((s, r) => s + (r.menCount || 0) + (r.womenCount || 0), 0);
        if (hc < DataEngine.PRIVACY_THRESHOLD) return;
        const mw = DataValidator.calculateWeightedAverageMenWage(sub);
        const ww = DataValidator.calculateWeightedAverageWomenWage(sub);
        const g = DataValidator.calculateGenderPayGap(mw, ww);
        if (g !== null) {
          heatData.push({
            value: [ri, bi, Math.round(g * 10) / 10, hc, Math.round(mw), Math.round(ww)],
            label: { color: '#000', fontWeight: 'bold' }
          });
        }
      });
    });

    if (heatmapChart) heatmapChart.dispose();
    heatmapChart = echarts.init(el);

    // Truncate long labels
    const truncate = (s, max) => s.length > max ? s.substring(0, max - 1) + '…' : s;

    heatmapChart.setOption({
      tooltip: {
        formatter: p => {
          if (p.componentType !== 'series') return p.name;
          const rank = topRanks[p.value[0]];
          const body = topBodies[p.value[1]];
          return `<strong>${body}</strong><br>דירוג: ${rank}<br>` +
                 `פער שכר: <strong>${p.value[2]}%</strong><br>` +
                 `עובדים: ${p.value[3].toLocaleString('he-IL')}<br>` +
                 `שכר גברים: ${fmtShekel(p.value[4])}<br>` +
                 `שכר נשים: ${fmtShekel(p.value[5])}`;
        },
        textStyle: { fontFamily: 'Heebo' }
      },
      title: {
        text: 'מפת חום — פער שכר לפי גוף ודירוג',
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      grid: { left: 140, right: 30, top: 50, bottom: 60 },
      dataZoom: [
        {
          type: 'slider',
          yAxisIndex: 0,
          right: 0,
          start: 0,
          end: topBodies.length > 15 ? (15 / topBodies.length) * 100 : 100,
          filterMode: 'empty'
        }
      ],
      xAxis: {
        type: 'category',
        data: topRanks.map(r => truncate(r, 14)),
        position: 'top',
        axisLabel: { fontFamily: 'Heebo', fontSize: 10, color: '#475569', rotate: 30 },
        axisTick: { show: false },
        splitArea: { show: true, areaStyle: { color: ['rgba(0,0,0,0.02)', 'transparent'] } },
      },
      yAxis: {
        type: 'category',
        data: topBodies.map(b => truncate(b, 20)),
        triggerEvent: true,
        axisLabel: { fontFamily: 'Heebo', fontSize: 10, color: '#334155', cursor: 'pointer' },
        axisTick: { show: false },
      },
      visualMap: {
        type: 'piecewise',
        dimension: 2,
        orient: 'horizontal',
        left: 'center', bottom: 0,
        pieces: [
          { min: 50, label: 'קריטי (>50%)', color: '#4a0404' },
          { min: 30, max: 50, label: 'חמור (30-50%)', color: '#991b1b' },
          { min: 15, max: 30, label: 'גבוה (15-30%)', color: '#ef4444' },
          { min: 5, max: 15, label: 'קל (5-15%)', color: '#fca5a5' },
          { min: -5, max: 5, label: 'שוויוני (±5%)', color: '#fef3c7' },
          { max: -5, label: 'הפוך (<-5%)', color: '#10b981' }
        ],
        textStyle: { fontFamily: 'Heebo', fontSize: 11 },
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        label: {
          show: true,
          formatter: p => '{a|' + p.value[2] + '%}',
          rich: {
            a: {
              color: '#000',
              fontFamily: 'Heebo',
              fontSize: 11,
              fontWeight: 700
            }
          }
        },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } }
      }]
    });

    // Reset button logic
    const resetBtn = document.getElementById('btnResetHeatmap');
    if (resetBtn) {
      // Check if global filter is active for body/rank
      if ((App.state.filters.bodyName && App.state.filters.bodyName.length > 0) || 
          (App.state.filters.rank && App.state.filters.rank.length > 0)) {
        resetBtn.classList.remove('hidden');
        resetBtn.classList.add('flex');
        resetBtn.onclick = () => {
          App.setFilterAndRoute({ bodyName: '', rank: '' }, 'overview');
        };
      } else {
        resetBtn.classList.add('hidden');
        resetBtn.classList.remove('flex');
      }
    }

    // Drill-down event
    heatmapChart.off('click');
    heatmapChart.on('click', function (params) {
      if (params.componentType === 'yAxis') {
        const originalBody = topBodies.find(b => truncate(b, 20) === params.value) || params.value;
        App.setFilterAndRoute({ bodyName: originalBody }, 'ranks');
      } else if (params.componentType === 'series' && params.value) {
        const rank = topRanks[params.value[0]];
        const body = topBodies[params.value[1]];
        App.setFilterAndRoute({ bodyName: body, rank: rank }, 'ranks');
      }
    });
  }

  // ── Insights Panel ────────────────────────────────────────────

  function renderInsights(records, year) {
    const el = document.getElementById('insightsOverview');
    if (el) el.innerHTML = InsightsEngine.overviewInsights(records, year);
  }

  // ── Gap Distribution Histogram ────────────────────────────────

  let distributionChart = null;

  function renderDistribution(records) {
    const el = document.getElementById('chartDistribution');
    if (!el) return;

    // Calculate gap for every body in the dataset
    const bodies = [...new Set(records.map(r => r.bodyName))].filter(Boolean);
    const gaps = [];

    bodies.forEach(body => {
      const sub = records.filter(r => r.bodyName === body);
      const menCount = sub.reduce((s, r) => s + (r.menCount || 0), 0);
      const womenCount = sub.reduce((s, r) => s + (r.womenCount || 0), 0);
      const hc = menCount + womenCount;
      if (hc < DataEngine.PRIVACY_THRESHOLD) return;
      const gap = DataValidator.calculateAggregateGap(sub);
      const avgWage = DataValidator.calculateOverallAverageWage(sub);
      const menWage = DataValidator.calculateWeightedAverageMenWage(sub);
      const womenWage = DataValidator.calculateWeightedAverageWomenWage(sub);

      if (gap !== null) {
        gaps.push({ body, gap, hc, menCount, womenCount, avgWage, menWage, womenWage });
      }
    });

    if (gaps.length === 0) return;

    // Create buckets (e.g., <0%, 0-10%, 10-20%, 20-30%, 30-40%, >40%)
    const buckets = [
      { label: 'פער הפוך (<0%)', min: -Infinity, max: 0, bodies: [], hc: 0 },
      { label: '0-10%', min: 0, max: 10, bodies: [], hc: 0 },
      { label: '10-20%', min: 10, max: 20, bodies: [], hc: 0 },
      { label: '20-30%', min: 20, max: 30, bodies: [], hc: 0 },
      { label: '30-40%', min: 30, max: 40, bodies: [], hc: 0 },
      { label: '40%+', min: 40, max: Infinity, bodies: [], hc: 0 }
    ];

    gaps.forEach(g => {
      for (let b of buckets) {
        if (g.gap > b.min && g.gap <= b.max) {
          b.bodies.push(g);
          b.hc += g.hc;
          break;
        }
      }
    });
    
    // Sort bodies within buckets
    buckets.forEach(b => b.bodies.sort((x, y) => y.gap - x.gap));

    if (distributionChart) distributionChart.dispose();
    distributionChart = echarts.init(el);

    distributionChart.setOption({
      title: {
        text: 'התפלגות גופים לפי גודל פער השכר',
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: p => {
          const b = buckets[p[0].dataIndex];
          return `<strong>${b.label}</strong><br>` +
                 `מספר גופים: ${b.bodies.length}<br>` +
                 `סה"כ עובדים: ${b.hc.toLocaleString('he-IL')}<br>` +
                 `<span style="font-size:10px;color:#64748b;margin-top:4px;display:block;">לחץ לצפייה ברשימת הגופים</span>`;
        },
        textStyle: { fontFamily: 'Heebo' }
      },
      grid: { left: 40, right: 30, top: 50, bottom: 30 },
      xAxis: {
        type: 'category',
        data: buckets.map(b => b.label),
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: '#334155' },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
      },
      series: [{
        name: 'גופים',
        type: 'bar',
        data: buckets.map((b, i) => ({
          value: b.bodies.length,
          bucketData: b, // Pass raw data for click event
          itemStyle: { 
            // Color gradient based on gap magnitude
            color: i === 0 ? COLORS.good : 
                   i === 1 ? '#fef08a' : 
                   i === 2 ? '#fcd34d' : 
                   i === 3 ? '#fbbf24' : 
                   i === 4 ? '#f87171' : COLORS.bad,
            borderRadius: [4, 4, 0, 0]
          }
        })),
        barMaxWidth: 60,
        cursor: 'pointer',
        label: {
          show: true, position: 'top',
          fontFamily: 'Heebo', fontSize: 12, fontWeight: 600, color: '#475569'
        }
      }]
    });

    // Modal click event
    distributionChart.off('click');
    distributionChart.on('click', function (params) {
      const bucket = params.data.bucketData;
      if (!bucket || bucket.bodies.length === 0) return;

      document.getElementById('distModalTitle').textContent = `גופים בקבוצת הפער: ${bucket.label}`;
      document.getElementById('distModalSub').textContent = `סה"כ ${bucket.bodies.length} גופים, ${bucket.hc.toLocaleString('he-IL')} עובדים. הרשימה מסודרת מהפער הגבוה לנמוך.`;

      const tbody = document.getElementById('distModalTableBody');
      tbody.innerHTML = '';
      
      bucket.bodies.forEach(b => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors cursor-pointer group";
        tr.onclick = () => {
          closeDistModal();
          App.setFilterAndRoute({ bodyName: b.body }, 'overview');
        };
        
        const gapColor = b.gap > 0 ? 'text-rose-500' : 'text-emerald-500';

        tr.innerHTML = `
          <td class="px-4 py-3 font-medium text-slate-800">
            <div>${b.body}</div>
            <div class="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">לחץ לסינון הגוף</div>
          </td>
          <td class="px-4 py-3 font-bold text-center ${gapColor}" dir="ltr">${b.gap.toFixed(1)}%</td>
          <td class="px-4 py-3 text-center text-slate-600 text-xs">
            <span class="font-bold text-teal-600">${(b.menCount || 0).toLocaleString('he-IL')}</span>
            <span class="text-[10px] text-slate-400"> (₪${Math.round(b.menWage || 0).toLocaleString('he-IL')})</span>
          </td>
          <td class="px-4 py-3 text-center text-slate-600 text-xs">
            <span class="font-bold text-rose-500">${(b.womenCount || 0).toLocaleString('he-IL')}</span>
            <span class="text-[10px] text-slate-400"> (₪${Math.round(b.womenWage || 0).toLocaleString('he-IL')})</span>
          </td>
          <td class="px-4 py-3 font-bold text-center text-slate-800">${b.avgWage ? '₪' + Math.round(b.avgWage).toLocaleString('he-IL') : '—'}</td>
        `;
        tbody.appendChild(tr);
      });

      openDistModal();
    });
  }

  // ── Modal Logic ───────────────────────────────────────────────
  
  function openDistModal() {
    const modal = document.getElementById('distModal');
    const content = document.getElementById('distModalContent');
    modal.classList.remove('hidden');
    // slight delay for transition
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      content.classList.remove('scale-95');
    }, 10);
  }

  function closeDistModal() {
    const modal = document.getElementById('distModal');
    const content = document.getElementById('distModalContent');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }

  // Bind close button once
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnColseDistModal');
    if (btn) btn.addEventListener('click', closeDistModal);
    
    // Close on backdrop click
    const modal = document.getElementById('distModal');
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDistModal();
    });
  });

  // ── Salary Tiers Stacked Chart ───────────────────────────────

  function renderSalaryTiersChart(records) {
    const el = document.getElementById('chartSalaryTiers');
    if (!el) return;

    const systems = [...new Set(records.map(r => r.system))].filter(Boolean);
    const data = systems.map(sys => {
      const sub = records.filter(r => r.system === sys);
      const gross = DataValidator.calculateOverallAverageWage(sub);
      let taxSum = 0, costSum = 0, count = 0;
      sub.forEach(r => {
        const mc = r.menCount || 0, wc = r.womenCount || 0;
        const totalC = mc + wc;
        if (totalC > 0 && r.avgTotalTaxGross) { taxSum += r.avgTotalTaxGross * totalC; }
        if (totalC > 0 && r.avgTotalEmployerCost) { costSum += r.avgTotalEmployerCost * totalC; }
        if (totalC > 0 && r.avgTotalTaxGross && r.avgTotalEmployerCost) { count += totalC; }
      });
      const taxGross = count > 0 ? taxSum / count : gross;
      const employerCost = count > 0 ? costSum / count : taxGross;

      return {
        system: sys,
        gross: Math.round(gross),
        taxAdd: Math.max(0, Math.round(taxGross - gross)),
        costAdd: Math.max(0, Math.round(employerCost - taxGross)),
        totalCost: Math.round(employerCost)
      };
    }).filter(d => d.gross > 0);

    if (salaryTiersChart) salaryTiersChart.dispose();
    salaryTiersChart = echarts.init(el);

    salaryTiersChart.setOption({
      title: {
        text: 'מבנה השכר לפי מערכת — שלוש שכבות (שוטף, מס, עלות מעסיק)',
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: params => {
          const sys = params[0].name;
          const d = data.find(x => x.system === sys);
          if (!d) return sys;
          return `<strong>${sys}</strong><br>` +
                 `ברוטו שוטף: ${fmtShekel(d.gross)}<br>` +
                 `תוספת ברוטו למס: ${fmtShekel(d.taxAdd)}<br>` +
                 `הפרשות מעסיק: ${fmtShekel(d.costAdd)}<br>` +
                 `<strong>סה"כ עלות העסקה: ${fmtShekel(d.totalCost)}</strong>`;
        },
        textStyle: { fontFamily: 'Heebo' }
      },
      legend: {
        data: ['ברוטו שוטף', 'תוספת למס', 'הפרשות מעסיק'],
        right: 0, top: 25,
        textStyle: { fontFamily: 'Heebo', fontSize: 11 }
      },
      grid: { left: 80, right: 30, top: 60, bottom: 40 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.system),
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: '#334155', rotate: 15 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: v => fmtShekel(v), fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick },
        splitLine: { lineStyle: { color: COLORS.gridLine } }
      },
      series: [
        { name: 'ברוטו שוטף', type: 'bar', stack: 'total', data: data.map(d => d.gross), itemStyle: { color: '#1e3a8a' } },
        { name: 'תוספת למס', type: 'bar', stack: 'total', data: data.map(d => d.taxAdd), itemStyle: { color: '#d97706' } },
        { name: 'הפרשות מעסיק', type: 'bar', stack: 'total', data: data.map(d => d.costAdd), itemStyle: { color: '#14b8a6' } }
      ]
    });
  }

  // ── Tableau-style Body Breakdown (Dual ECharts) ───────────────

  let bodyBreakdownChart = null;
  let breakdownType = 'bodyName'; // 'system' | 'bodyName' | 'rank' | 'subSystem'
  let breakdownSort = 'hc';       // 'hc' | 'gap' | 'overallWage' | 'womenWage' | 'menWage'
  let breakdownSortDir = 'desc';  // 'desc' | 'asc'
  let breakdownTopN = 15;
  let _lastBreakdownRecords = [];

  function _aggregateBreakdown(records, groupKey) {
    const T = (window.DataEngine && window.DataEngine.PRIVACY_THRESHOLD) || 5;

    // Check if we can use partTime (official full-time body dataset) for bodyName, system, subSystem
    const appState = (window.App && window.App.state) || null;
    const ptData = (appState && appState.data && appState.data.partTime) || null;

    if (groupKey !== 'rank' && ptData && ptData.length > 0) {
      // Filter partTime records matching current active filters
      let ptFiltered = ptData;
      if (appState.filters.year && appState.activeTab !== 'trends') {
        ptFiltered = ptFiltered.filter(r => r.year === Number(appState.filters.year));
      }
      if (appState.filters.system && appState.filters.system.length > 0) {
        ptFiltered = ptFiltered.filter(r => appState.filters.system.includes(r.system));
      }
      if (appState.filters.subSystem && appState.filters.subSystem.length > 0) {
        ptFiltered = ptFiltered.filter(r => appState.filters.subSystem.includes(r.subSystem));
      }
      if (appState.filters.bodyName && appState.filters.bodyName.length > 0) {
        ptFiltered = ptFiltered.filter(r => appState.filters.bodyName.includes(r.bodyName));
      }

      const map = {};
      ptFiltered.forEach(r => {
        const key = r[groupKey];
        if (!key) return;
        if (!map[key]) map[key] = {
          key,
          menCount: 0, womenCount: 0, totalCount: 0,
          menWageSum: 0, womenWageSum: 0, totalWageSum: 0,
          menWageCount: 0, womenWageCount: 0, totalWageCount: 0
        };
        const m = map[key];
        const mc = r.ftMenCount || 0, wc = r.ftWomenCount || 0, tc = r.ftTotalCount || (mc + wc);
        m.menCount += mc;
        m.womenCount += wc;
        m.totalCount += tc;
        if (r.ftMenWage && mc > 0)   { m.menWageSum += r.ftMenWage * mc; m.menWageCount += mc; }
        if (r.ftWomenWage && wc > 0) { m.womenWageSum += r.ftWomenWage * wc; m.womenWageCount += wc; }
        if (r.ftTotalWage && tc > 0) { m.totalWageSum += r.ftTotalWage * tc; m.totalWageCount += tc; }
      });

      return Object.values(map).map(m => {
        const hc = Math.round(m.totalCount || (m.menCount + m.womenCount));
        if (hc < T) return null;
        const menCount = Math.round(m.menCount);
        const womenCount = Math.round(m.womenCount);
        const menPct = hc > 0 ? (menCount / hc) * 100 : 0;
        const womenPct = hc > 0 ? (womenCount / hc) * 100 : 0;
        const menWage = m.menWageCount > 0 ? Math.round(m.menWageSum / m.menWageCount) : null;
        const womenWage = m.womenWageCount > 0 ? Math.round(m.womenWageSum / m.womenWageCount) : null;
        const overallWage = m.totalWageCount > 0 
          ? Math.round(m.totalWageSum / m.totalWageCount) 
          : ((m.menWageSum + m.womenWageSum) && (m.menWageCount + m.womenWageCount))
            ? Math.round((m.menWageSum + m.womenWageSum) / (m.menWageCount + m.womenWageCount))
            : null;
        const gap = (menWage != null && womenWage != null && menWage > 0)
          ? ((menWage - womenWage) / menWage) * 100
          : null;
        return {
          key: m.key,
          hc,
          menCount,
          womenCount,
          menPct,
          womenPct,
          menWage,
          womenWage,
          overallWage,
          gap
        };
      }).filter(Boolean);
    }

    // Otherwise (e.g. for rank aggregation or fallback), aggregate from records
    const map = {};
    records.forEach(r => {
      const key = r[groupKey];
      if (!key) return;
      if (!map[key]) map[key] = {
        key,
        menCount: 0, womenCount: 0,
        menWageSum: 0, womenWageSum: 0,
        menWageCount: 0, womenWageCount: 0
      };
      const m = map[key];
      const mc = r.menCount || 0, wc = r.womenCount || 0;
      m.menCount += mc;
      m.womenCount += wc;
      if (r.avgMenWage && mc > 0)   { m.menWageSum += r.avgMenWage * mc; m.menWageCount += mc; }
      if (r.avgWomenWage && wc > 0) { m.womenWageSum += r.avgWomenWage * wc; m.womenWageCount += wc; }
    });

    return Object.values(map).map(m => {
      const hc = Math.round(m.menCount + m.womenCount);
      if (hc < T) return null;
      const menCount = Math.round(m.menCount);
      const womenCount = Math.round(m.womenCount);
      const menPct  = hc > 0 ? (menCount / hc) * 100 : 0;
      const womenPct = hc > 0 ? (womenCount / hc) * 100 : 0;
      const menWage   = m.menWageCount   > 0 ? Math.round(m.menWageSum   / m.menWageCount)   : null;
      const womenWage = m.womenWageCount > 0 ? Math.round(m.womenWageSum / m.womenWageCount) : null;
      const totalWageSum = m.menWageSum + m.womenWageSum;
      const totalWageCount = m.menWageCount + m.womenWageCount;
      const overallWage = totalWageCount > 0 ? Math.round(totalWageSum / totalWageCount) : null;
      const gap = (menWage != null && womenWage != null && menWage > 0)
        ? ((menWage - womenWage) / menWage) * 100
        : null;
      return { 
        key: m.key, 
        hc, 
        menCount, 
        womenCount, 
        menPct, 
        womenPct, 
        menWage, 
        womenWage, 
        overallWage, 
        gap 
      };
    }).filter(Boolean);
  }

  function renderBodyBreakdown(records) {
    _lastBreakdownRecords = records;
    _drawBodyBreakdownChart();
    _bindBodyBreakdownControls();
  }

  function _drawBodyBreakdownChart() {
    const el = document.getElementById('chartBodyBreakdown');
    if (!el) return;

    const allData = _aggregateBreakdown(_lastBreakdownRecords, breakdownType);

    // Apply Sorting & Direction
    let sorted = [...allData];
    if (breakdownSort === 'gap') {
      sorted = sorted.filter(d => d.gap !== null).sort((a, b) => {
        return breakdownSortDir === 'desc' ? b.gap - a.gap : a.gap - b.gap;
      });
    } else if (breakdownSort === 'overallWage') {
      sorted = sorted.filter(d => d.overallWage != null).sort((a, b) => {
        return breakdownSortDir === 'desc' ? b.overallWage - a.overallWage : a.overallWage - b.overallWage;
      });
    } else if (breakdownSort === 'womenWage') {
      sorted = sorted.filter(d => d.womenWage != null).sort((a, b) => {
        return breakdownSortDir === 'desc' ? b.womenWage - a.womenWage : a.womenWage - b.womenWage;
      });
    } else if (breakdownSort === 'menWage') {
      sorted = sorted.filter(d => d.menWage != null).sort((a, b) => {
        return breakdownSortDir === 'desc' ? b.menWage - a.menWage : a.menWage - b.menWage;
      });
    } else {
      sorted = sorted.sort((a, b) => {
        return breakdownSortDir === 'desc' ? b.hc - a.hc : a.hc - b.hc;
      });
    }

    const top = sorted.slice(0, breakdownTopN);

    // Update dynamic subtitle
    const subEl = document.getElementById('breakdownSubTitle');
    if (subEl) {
      const typeMap = { bodyName: 'הגופים', system: 'המערכות', rank: 'הדירוגים', subSystem: 'תת-המערכות' };
      const sortMapDesc = { 
        hc: 'מספר העובדים הגבוה ביותר', 
        gap: 'פער השכר הגבוה ביותר', 
        overallWage: 'השכר הממוצע הכללי הגבוה ביותר',
        womenWage: 'שכר הנשים הגבוה ביותר', 
        menWage: 'שכר הגברים הגבוה ביותר' 
      };
      const sortMapAsc = { 
        hc: 'מספר העובדים הנמוך ביותר', 
        gap: 'פער השכר הנמוך ביותר (או פער הפוך)', 
        overallWage: 'השכר הממוצע הכללי הנמוך ביותר',
        womenWage: 'שכר הנשים הנמוך ביותר', 
        menWage: 'שכר הגברים הנמוך ביותר' 
      };
      const sortMap = breakdownSortDir === 'desc' ? sortMapDesc : sortMapAsc;
      subEl.textContent = `רשימת ${top.length} ${typeMap[breakdownType] || 'הגופים'} בעלי ${sortMap[breakdownSort] || 'מספר העובדים'} — לחץ על שורה לצלילה`;
    }

    // Reverse for bottom-to-top display (echarts inverse)
    const names    = top.map(d => d.key).reverse();
    const menPcts  = top.map(d => +d.menPct.toFixed(1)).reverse();
    const womenPcts = top.map(d => +d.womenPct.toFixed(1)).reverse();
    const womenWages = top.map(d => d.womenWage ? -(Math.round(d.womenWage)) : null).reverse();
    const menWages   = top.map(d => d.menWage   ?  Math.round(d.menWage)    : null).reverse();

    // Dynamic height: min 420, 36px per bar
    const chartH = Math.max(420, top.length * 36 + 130);
    el.style.height = chartH + 'px';

    if (bodyBreakdownChart) bodyBreakdownChart.dispose();
    bodyBreakdownChart = echarts.init(el);

    // Truncate long labels
    const trunc = (s, max) => s && s.length > max ? s.substring(0, max - 1) + '…' : (s || '');
    const truncNames = names.map(n => trunc(n, 24));

    // Max absolute salary for symmetric x-axis on right chart
    const maxSalary = Math.max(
      ...top.map(d => Math.max(d.menWage || 0, d.womenWage || 0)), 1
    );
    const salaryAxisMax = Math.ceil(maxSalary / 5000) * 5000;

    const fmtK = v => {
      const abs = Math.abs(v);
      return abs >= 1000 ? (abs / 1000).toFixed(1) + 'K' : abs.toString();
    };

    bodyBreakdownChart.setOption({
      animation: true,
      animationDuration: 500,
      backgroundColor: 'transparent',
      title: [
        {
          text: 'התפלגות העובדים לפי מגדר',
          left: '25%',
          textAlign: 'center',
          top: 8,
          textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
        },
        {
          text: 'שכר ברוטו שוטף והפרשים נשים מול גברים',
          left: '75%',
          textAlign: 'center',
          top: 8,
          textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
        }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: params => {
          const nameIndex = names.indexOf(params[0]?.name);
          const d = top[top.length - 1 - nameIndex] || top.find(x => trunc(x.key, 24) === params[0]?.name);
          if (!d) return params[0]?.name || '';
          const gap = d.menWage && d.womenWage ? (((d.menWage - d.womenWage) / d.menWage) * 100).toFixed(1) : '—';
          const overallWageText = d.overallWage ? `₪${Math.round(d.overallWage).toLocaleString('he-IL')}` : '—';
          const menWageText = d.menWage ? `₪${Math.round(d.menWage).toLocaleString('he-IL')}` : '—';
          const womenWageText = d.womenWage ? `₪${Math.round(d.womenWage).toLocaleString('he-IL')}` : '—';
          const fmtCnt = n => Math.round(n).toLocaleString('he-IL');
          return `<div style="font-family:Heebo,sans-serif; text-align:right; min-width:200px;" dir="rtl">` +
            `<strong style="font-size:13px; color:#0f172a;">${d.key}</strong><br>` +
            `<div style="font-size:11px; color:#64748b; margin-top:2px;">סה"כ עובדים: <strong>${fmtCnt(d.hc)}</strong></div>` +
            `<div style="font-size:11px; color:#334155; margin-bottom:6px;">שכר ממוצע כללי: <strong>${overallWageText}</strong></div>` +
            `<div style="border-top:1px solid #e2e8f0; padding-top:5px; margin-top:4px; line-height:1.6;">` +
              `<span style="color:#0284c7">■</span> <strong>גברים:</strong> ${fmtCnt(d.menCount)} עובדים · שכר: ${menWageText}<br>` +
              `<span style="color:#be185d">■</span> <strong>נשים:</strong> ${fmtCnt(d.womenCount)} עובדות · שכר: ${womenWageText}` +
            `</div>` +
            `<div style="border-top:1px solid #e2e8f0; padding-top:4px; margin-top:4px; font-size:11px; color:#334155;">` +
              `פער שכר מגדרי: <strong style="color:${d.gap > 0 ? '#e11d48' : '#059669'}">${gap}%</strong>` +
            `</div>` +
            `</div>`;
        },
        textStyle: { fontFamily: 'Heebo' }
      },
      legend: {
        data: ['נשים', 'גברים', 'שכר נשים', 'שכר גברים'],
        bottom: 5,
        left: 'center',
        textStyle: { fontFamily: 'Heebo', fontSize: 11, color: '#475569' },
        itemWidth: 12, itemHeight: 10
      },
      grid: [
        { // Left: gender distribution stacked bars
          left: 170,
          right: '52%',
          top: 48,
          bottom: 45
        },
        { // Right: salary diverging bars
          left: '51%',
          right: 35,
          top: 48,
          bottom: 45
        }
      ],
      xAxis: [
        { // Left: 0–100% (gender)
          type: 'value',
          gridIndex: 0,
          min: 0,
          max: 100,
          axisLabel: { formatter: v => v + '%', fontFamily: 'Heebo', fontSize: 10, color: '#94a3b8' },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
          axisTick: { show: false }
        },
        { // Right: diverging salary
          type: 'value',
          gridIndex: 1,
          min: -salaryAxisMax,
          max: salaryAxisMax,
          axisLabel: {
            formatter: v => '₪' + fmtK(v),
            fontFamily: 'Heebo', fontSize: 10, color: '#94a3b8'
          },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
          axisTick: { show: false }
        }
      ],
      yAxis: [
        { // Left Y-axis: category names
          type: 'category',
          gridIndex: 0,
          data: truncNames,
          axisLabel: {
            fontFamily: 'Heebo', fontSize: 11, color: '#334155',
            width: 150, overflow: 'truncate', align: 'right'
          },
          axisTick: { show: false },
          axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } }
        },
        { // Right Y-axis: no labels (shared visual Y)
          type: 'category',
          gridIndex: 1,
          data: truncNames,
          axisLabel: { show: false },
          axisTick: { show: false },
          axisLine: { show: false },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          // LEFT CHART — Women %
          name: 'נשים',
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          stack: 'gender',
          data: womenPcts,
          itemStyle: { color: '#be185d', borderRadius: [0, 0, 0, 0] },
          label: {
            show: true,
            position: 'inside',
            formatter: p => p.value > 8 ? p.value.toFixed(0) + '%' : '',
            fontFamily: 'Heebo', fontSize: 10, color: '#fff', fontWeight: 700
          },
          barMaxWidth: 26,
          emphasis: { focus: 'series' }
        },
        {
          // LEFT CHART — Men %
          name: 'גברים',
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          stack: 'gender',
          data: menPcts,
          itemStyle: { color: '#0284c7', borderRadius: [0, 0, 0, 0] },
          label: {
            show: true,
            position: 'inside',
            formatter: p => p.value > 8 ? p.value.toFixed(0) + '%' : '',
            fontFamily: 'Heebo', fontSize: 10, color: '#fff', fontWeight: 700
          },
          barMaxWidth: 26,
          emphasis: { focus: 'series' }
        },
        {
          // RIGHT CHART — Women wage (negative → left)
          name: 'שכר נשים',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          stack: 'salary',
          data: womenWages,
          itemStyle: { color: '#f472b6', borderRadius: [3, 0, 0, 3] },
          label: {
            show: true,
            position: 'left',
            formatter: p => p.value !== null ? '₪' + fmtK(p.value) : '',
            fontFamily: 'Heebo', fontSize: 10, color: '#9d174d', fontWeight: 600
          },
          barMaxWidth: 24,
          emphasis: { focus: 'series', itemStyle: { color: '#db2777' } }
        },
        {
          // RIGHT CHART — Men wage (positive → right)
          name: 'שכר גברים',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          stack: 'salary',
          data: menWages,
          itemStyle: { color: '#38bdf8', borderRadius: [0, 3, 3, 0] },
          label: {
            show: true,
            position: 'right',
            formatter: p => p.value !== null ? '₪' + fmtK(p.value) : '',
            fontFamily: 'Heebo', fontSize: 10, color: '#0369a1', fontWeight: 600
          },
          barMaxWidth: 24,
          emphasis: { focus: 'series', itemStyle: { color: '#0284c7' } }
        }
      ]
    });

    // Drill-down click
    bodyBreakdownChart.off('click');
    bodyBreakdownChart.on('click', params => {
      if (!params.name) return;
      const originalName = names[truncNames.indexOf(params.name)] || params.name;
      if (breakdownType === 'bodyName') {
        App.setFilterAndRoute({ bodyName: originalName }, 'ranks');
      } else if (breakdownType === 'system') {
        App.setFilterAndRoute({ system: originalName }, 'ranks');
      } else if (breakdownType === 'rank') {
        App.setFilterAndRoute({ rank: originalName }, 'ranks');
      } else {
        App.setFilterAndRoute({ subSystem: originalName }, 'ranks');
      }
    });
  }

  function _syncBreakdownControlsUI() {
    // Sort buttons UI
    document.querySelectorAll('.btnBreakdownSort').forEach(b => {
      const a = b.dataset.sort === breakdownSort;
      b.classList.toggle('bg-white', a);
      b.classList.toggle('text-slate-900', a);
      b.classList.toggle('shadow-sm', a);
      b.classList.toggle('text-slate-600', !a);
    });

    // Direction buttons UI
    document.querySelectorAll('.btnBreakdownDir').forEach(b => {
      const a = b.dataset.dir === breakdownSortDir;
      b.classList.toggle('bg-white', a);
      b.classList.toggle('text-slate-900', a);
      b.classList.toggle('shadow-sm', a);
      b.classList.toggle('text-slate-600', !a);
    });

    // Top-N buttons UI
    document.querySelectorAll('.btnBreakdownN').forEach(b => {
      const a = parseInt(b.dataset.n) === breakdownTopN;
      b.classList.toggle('bg-white', a);
      b.classList.toggle('text-slate-900', a);
      b.classList.toggle('shadow-sm', a);
      b.classList.toggle('text-slate-600', !a);
    });

    // Radio UI
    document.querySelectorAll('.bodyBreakdownRadio').forEach(r => {
      r.checked = (r.value === breakdownType);
    });
  }

  function _bindBodyBreakdownControls() {
    // Radio buttons (Type)
    document.querySelectorAll('.bodyBreakdownRadio').forEach(radio => {
      radio.onchange = () => {
        breakdownType = radio.value;
        _syncBreakdownControlsUI();
        _drawBodyBreakdownChart();
      };
    });

    // Sort buttons
    const sBtns = document.querySelectorAll('.btnBreakdownSort');
    sBtns.forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
    });
    document.querySelectorAll('.btnBreakdownSort').forEach(btn => {
      btn.addEventListener('click', () => {
        if (breakdownSort === btn.dataset.sort) {
          // If clicking active button, toggle direction!
          breakdownSortDir = (breakdownSortDir === 'desc') ? 'asc' : 'desc';
        } else {
          breakdownSort = btn.dataset.sort;
        }
        _syncBreakdownControlsUI();
        _drawBodyBreakdownChart();
      });
    });

    // Direction buttons
    const dBtns = document.querySelectorAll('.btnBreakdownDir');
    dBtns.forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
    });
    document.querySelectorAll('.btnBreakdownDir').forEach(btn => {
      btn.addEventListener('click', () => {
        breakdownSortDir = btn.dataset.dir;
        _syncBreakdownControlsUI();
        _drawBodyBreakdownChart();
      });
    });

    // Top-N buttons
    const nBtns = document.querySelectorAll('.btnBreakdownN');
    nBtns.forEach(btn => {
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
    });
    document.querySelectorAll('.btnBreakdownN').forEach(btn => {
      btn.addEventListener('click', () => {
        breakdownTopN = parseInt(btn.dataset.n);
        _syncBreakdownControlsUI();
        _drawBodyBreakdownChart();
      });
    });

    _syncBreakdownControlsUI();
  }

  // ── Public ────────────────────────────────────────────────────

  function update(records, year) {
    renderKPIs(records);
    renderButterflyChart(records);
    renderHeatmap(records);
    renderDistribution(records);
    renderSalaryTiersChart(records);
    renderBodyBreakdown(records);
    renderInsights(records, year);
  }

  function resize() {
    if (butterflyChart) butterflyChart.resize();
    if (heatmapChart) heatmapChart.resize();
    if (distributionChart) distributionChart.resize();
    if (salaryTiersChart) salaryTiersChart.resize();
    if (bodyBreakdownChart) bodyBreakdownChart.resize();
  }

  return { update, resize };
})();

