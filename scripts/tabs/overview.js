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
    const v = DataValidator.computeKPIs(records);

    if (v.genderPayGapPercent !== null) {
      document.getElementById('kpiPayGap').textContent = v.genderPayGapPercent.toFixed(2) + '%';
      document.getElementById('kpiPayGap').className = 'text-3xl font-extrabold tracking-tight ' + (v.genderPayGapPercent > 0 ? 'text-rose-500' : 'text-emerald-500');
    } else {
      document.getElementById('kpiPayGap').textContent = 'אין נתונים';
      document.getElementById('kpiPayGap').className = 'text-xl font-bold tracking-tight text-slate-400 mt-2';
    }

    document.getElementById('kpiMenWage').textContent = fmtShekel(v.avgMenWage);
    document.getElementById('kpiMenCount').textContent = v.totalMen.toLocaleString('he-IL') + ' עובדים';

    document.getElementById('kpiWomenWage').textContent = fmtShekel(v.avgWomenWage);
    document.getElementById('kpiWomenCount').textContent = v.totalWomen.toLocaleString('he-IL') + ' עובדות';

    // Calculate proportions for the wage bars
    const maxWage = Math.max(v.avgMenWage, v.avgWomenWage, 1);
    const mBar = document.getElementById('kpiMenBar');
    const wBar = document.getElementById('kpiWomenBar');
    if (mBar) mBar.style.width = ((v.avgMenWage / maxWage) * 100) + '%';
    if (wBar) wBar.style.width = ((v.avgWomenWage / maxWage) * 100) + '%';

    document.getElementById('kpiTotalEmployees').textContent = v.totalEmployees.toLocaleString('he-IL');
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

  // ── Public ────────────────────────────────────────────────────

  function update(records, year) {
    renderKPIs(records);
    renderButterflyChart(records);
    renderHeatmap(records);
    renderDistribution(records);
    renderSalaryTiersChart(records);
    renderInsights(records, year);
  }

  function resize() {
    if (butterflyChart) butterflyChart.resize();
    if (heatmapChart) heatmapChart.resize();
    if (distributionChart) distributionChart.resize();
    if (salaryTiersChart) salaryTiersChart.resize();
  }

  return { update, resize };
})();
