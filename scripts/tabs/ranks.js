/**
 * Tab 2: Rank Deep-Dive — Stage 5 & Statutory Upgrade
 * Scatter plot (women share vs gap), Lollipop (top gaps), Insights
 * Includes Option 2 Drill-Down: Clicking a rank in Lollipop/Scatter switches the Scatter plot to show bodies within that rank!
 */

window.TabRanks = (function () {

  let scatterChart = null;
  let lollipopChart = null;
  let hierarchyChart = null;

  let selectedRank = null;
  let lastRecords = [];
  let lastIsFiltered = false;

  const COLORS = {
    men: '#14b8a6',   // Teal
    women: '#f43f5e', // Rose
    gap: '#f43f5e',   // Rose
    emerald: '#10b981',// Emerald
    tick: '#94a3b8',
    gridLine: 'rgba(148,163,184,0.15)',
  };

  function fmtShekel(v) { return '₪' + Math.round(v).toLocaleString('he-IL'); }

  function bindResetBtn() {
    const btn = document.getElementById('btnResetScatter');
    if (!btn) return;
    
    if (selectedRank) {
      btn.classList.remove('hidden');
      btn.classList.add('flex');
    } else {
      btn.classList.add('hidden');
      btn.classList.remove('flex');
    }

    btn.onclick = () => {
      selectedRank = null;
      renderScatter(lastRecords, lastIsFiltered);
      renderLollipop(lastRecords, lastIsFiltered);
    };
  }

  // ── Scatter Plot: Women Share vs Pay Gap (All Ranks OR Drill-down to Bodies) ──

  function renderScatter(records, isFiltered) {
    const el = document.getElementById('chartScatter');
    if (!el) return;

    bindResetBtn();

    const data = [];

    if (!selectedRank) {
      // LEVEL 1: All Ranks
      const ranks = [...new Set(records.map(r => r.rank))].filter(Boolean);
      const minHc = isFiltered ? window.DataEngine.PRIVACY_THRESHOLD : 50;

      ranks.forEach(rank => {
        const sub = records.filter(r => r.rank === rank);
        const hc = sub.reduce((s, r) => s + (r.menCount || 0) + (r.womenCount || 0), 0);
        if (hc < minHc) return;
        const wc = sub.reduce((s, r) => s + (r.womenCount || 0), 0);
        const wsPct = (wc / hc * 100);
        
        const g = DataValidator.calculateAggregateGap(sub);
        const mw = DataValidator.calculateWeightedAverageMenWage(sub);
        const ww = DataValidator.calculateWeightedAverageWomenWage(sub);

        if (g !== null) {
          data.push({
            value: [wsPct, g],
            name: rank,
            hc,
            menWage: mw,
            womenWage: ww,
            symbolSize: Math.max(6, Math.min(40, Math.sqrt(hc) / 3)),
          });
        }
      });
    } else {
      // LEVEL 2: Bodies within selectedRank
      const subRecords = records.filter(r => r.rank === selectedRank);
      const bodies = [...new Set(subRecords.map(r => r.bodyName))].filter(Boolean);

      bodies.forEach(body => {
        const sub = subRecords.filter(r => r.bodyName === body);
        const hc = sub.reduce((s, r) => s + (r.menCount || 0) + (r.womenCount || 0), 0);
        if (hc < window.DataEngine.PRIVACY_THRESHOLD) return;
        const wc = sub.reduce((s, r) => s + (r.womenCount || 0), 0);
        const wsPct = (wc / hc * 100);
        
        const g = DataValidator.calculateAggregateGap(sub);
        const mw = DataValidator.calculateWeightedAverageMenWage(sub);
        const ww = DataValidator.calculateWeightedAverageWomenWage(sub);

        if (g !== null) {
          data.push({
            value: [wsPct, g],
            name: body,
            hc,
            menWage: mw,
            womenWage: ww,
            symbolSize: Math.max(8, Math.min(42, Math.sqrt(hc) * 2)),
          });
        }
      });
    }

    if (scatterChart) scatterChart.dispose();
    scatterChart = echarts.init(el);

    const titleText = selectedRank
      ? `גופים בדירוג "${selectedRank}" — שיעור נשים מול פער שכר`
      : 'שיעור נשים מול פער שכר — לפי דירוג (לחץ על בועה או על דירוג לסריקה)';

    scatterChart.setOption({
      title: {
        text: titleText,
        right: selectedRank ? 140 : 0, // Make room for reset button if active
        textStyle: { fontFamily: 'Heebo', fontSize: 13, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        formatter: p => {
          const d = p.data;
          const labelType = selectedRank ? 'גוף' : 'דירוג';
          return `<strong>${d.name}</strong> (${labelType})<br>` +
            `שיעור נשים: ${d.value[0].toFixed(1)}%<br>` +
            `פער שכר: ${d.value[1].toFixed(1)}%<br>` +
            `עובדים בדירוג: ${d.hc.toLocaleString('he-IL')}<br>` +
            `גברים: ${fmtShekel(d.menWage)} | נשים: ${fmtShekel(d.womenWage)}`;
        },
        textStyle: { fontFamily: 'Heebo' }
      },
      grid: { left: 60, right: 30, top: 60, bottom: 60 },
      xAxis: {
        name: 'שיעור נשים (%)',
        nameLocation: 'center',
        nameGap: 35,
        nameTextStyle: { fontFamily: 'Heebo', fontSize: 12, color: '#64748b' },
        min: 0, max: 100,
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick, formatter: v => v + '%' },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
        axisLine: { lineStyle: { color: COLORS.gridLine } },
      },
      yAxis: {
        name: 'פער שכר (%)',
        nameLocation: 'center',
        nameGap: 45,
        nameTextStyle: { fontFamily: 'Heebo', fontSize: 12, color: '#64748b' },
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick, formatter: v => v + '%' },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
        axisLine: { lineStyle: { color: COLORS.gridLine } },
      },
      series: [{
        type: 'scatter',
        data: data.map(d => ({
          ...d,
          symbolSize: d.symbolSize,
        })),
        itemStyle: {
          color: p => {
            if (!p.data) return COLORS.gap;
            return p.data.value[1] > 0 ? COLORS.gap : COLORS.emerald;
          },
          opacity: 0.75,
          borderColor: '#fff',
          borderWidth: 1.5,
        },
        emphasis: {
          itemStyle: { opacity: 1, shadowBlur: 14, shadowColor: 'rgba(0,0,0,0.3)' }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            { yAxis: 0, lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 } },
            { xAxis: 50, lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 } },
          ],
          label: { show: false }
        },
      }]
    });

    // Click handler for scatter points
    scatterChart.off('click');
    scatterChart.on('click', params => {
      if (!selectedRank && params.data && params.data.name) {
        selectedRank = params.data.name;
        renderScatter(lastRecords, lastIsFiltered);
        renderLollipop(lastRecords, lastIsFiltered);
      }
    });
  }

  // ── Lollipop: Top 15 Ranks by Gap ─────────────────────────────

  function renderLollipop(records, isFiltered) {
    const el = document.getElementById('chartLollipop');
    if (!el) return;

    const ranks = [...new Set(records.map(r => r.rank))].filter(Boolean);
    const minHc = isFiltered ? window.DataEngine.PRIVACY_THRESHOLD : 100;

    const data = ranks.map(rank => {
      const sub = records.filter(r => r.rank === rank);
      const hc = sub.reduce((s, r) => s + (r.menCount || 0) + (r.womenCount || 0), 0);
      if (hc < minHc) return null;
      const g = DataValidator.calculateAggregateGap(sub);
      if (g === null) return null;
      return { rank, gap: Math.round(g * 10) / 10, hc };
    }).filter(Boolean)
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
      .slice(0, 15)
      .reverse(); // ECharts renders bottom-up

    if (lollipopChart) lollipopChart.dispose();
    lollipopChart = echarts.init(el);

    const truncate = (s, max) => s.length > max ? s.substring(0, max - 1) + '…' : s;

    lollipopChart.setOption({
      title: {
        text: 'דירוגים מובילים בפער שכר (לחץ על דירוג לחקירת גופים)',
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 13, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        formatter: p => `<strong>${data[p.dataIndex].rank}</strong><br>פער: ${p.value}%<br>עובדים: ${data[p.dataIndex].hc.toLocaleString('he-IL')}<br><span style="font-size:10px;color:#3b82f6;">👇 לחץ לצלילה לפי גופים</span>`,
        textStyle: { fontFamily: 'Heebo' }
      },
      grid: { left: 130, right: 50, top: 50, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick, formatter: v => v + '%' },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
      },
      yAxis: {
        type: 'category',
        data: data.map(d => truncate(d.rank, 18)),
        axisLabel: {
          fontFamily: 'Heebo', fontSize: 11,
          color: p => {
            const item = data.find(d => truncate(d.rank, 18) === p);
            return (item && item.rank === selectedRank) ? '#1e3a8a' : '#334155';
          },
          fontWeight: p => {
            const item = data.find(d => truncate(d.rank, 18) === p);
            return (item && item.rank === selectedRank) ? 'bold' : 'normal';
          },
        },
        axisTick: { show: false },
      },
      series: [
        // Line stems
        {
          type: 'bar',
          data: data.map(d => d.gap),
          barWidth: 3,
          itemStyle: {
            color: p => (p && p.dataIndex !== undefined && data[p.dataIndex] && data[p.dataIndex].gap > 0)
              ? 'rgba(244,63,94,0.4)' : 'rgba(16,185,129,0.4)',
            borderRadius: 2,
          },
          z: 1,
        },
        // Dots
        {
          type: 'scatter',
          data: data.map((d, i) => [d.gap, i]),
          symbolSize: (val, p) => (p && p.dataIndex !== undefined && data[p.dataIndex] && data[p.dataIndex].rank === selectedRank ? 20 : 14),
          itemStyle: {
            color: p => (p && p.dataIndex !== undefined && data[p.dataIndex] && data[p.dataIndex].rank === selectedRank)
              ? '#1e3a8a'
              : (p && p.dataIndex !== undefined && data[p.dataIndex] && data[p.dataIndex].gap > 0 ? COLORS.gap : COLORS.emerald),
            borderColor: '#fff',
            borderWidth: 2,
          },
          z: 2,
          label: {
            show: true,
            position: p => (p && p.dataIndex !== undefined && data[p.dataIndex] && data[p.dataIndex].gap > 0) ? 'right' : 'left',
            formatter: p => (p && p.dataIndex !== undefined && data[p.dataIndex]) ? data[p.dataIndex].gap + '%' : '',
            fontFamily: 'Heebo', fontSize: 11, fontWeight: 600,
            color: p => (p && p.dataIndex !== undefined && data[p.dataIndex] && data[p.dataIndex].gap > 0) ? COLORS.gap : COLORS.emerald,
          }
        }
      ]
    });

    // Click handler for lollipop chart
    lollipopChart.off('click');
    lollipopChart.on('click', params => {
      const item = data[params.dataIndex];
      if (item && item.rank) {
        if (selectedRank === item.rank) {
          selectedRank = null; // Toggle off if clicked twice
        } else {
          selectedRank = item.rank;
        }
        renderScatter(lastRecords, lastIsFiltered);
        renderLollipop(lastRecords, lastIsFiltered);
      }
    });
  }

  // ── Rank Hierarchy (Inter-Rank Gaps) ──────────────────────────

  function renderRankHierarchy(records, isFiltered) {
    const el = document.getElementById('chartRankHierarchy');
    if (!el) return;

    const ranks = [...new Set(records.map(r => r.rank))].filter(Boolean);
    const minHc = isFiltered ? window.DataEngine.PRIVACY_THRESHOLD : 100;

    const data = ranks.map(rank => {
      const sub = records.filter(r => r.rank === rank);
      const hc = sub.reduce((s, r) => s + (r.menCount || 0) + (r.womenCount || 0), 0);
      if (hc < minHc) return null;
      
      const overallWage = DataValidator.calculateOverallAverageWage(sub);
      return { rank, wage: Math.round(overallWage), hc };
    }).filter(Boolean)
      .sort((a, b) => b.wage - a.wage)
      .slice(0, 20)
      .reverse();

    if (hierarchyChart) hierarchyChart.dispose();
    hierarchyChart = echarts.init(el);

    const truncate = (s, max) => s.length > max ? s.substring(0, max - 1) + '…' : s;

    hierarchyChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: p => `<strong>${data[p[0].dataIndex].rank}</strong><br>שכר ממוצע: ${fmtShekel(p[0].value)}<br>עובדים: ${data[p[0].dataIndex].hc.toLocaleString('he-IL')}`,
        textStyle: { fontFamily: 'Heebo' }
      },
      grid: { left: 140, right: 30, top: 20, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick, formatter: v => '₪' + (v/1000).toFixed(0) + 'K' },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
      },
      yAxis: {
        type: 'category',
        data: data.map(d => truncate(d.rank, 20)),
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: '#334155' },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: data.map(d => d.wage),
          barWidth: '50%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#93c5fd' }
            ]),
            borderRadius: [0, 4, 4, 0]
          },
          label: {
            show: true,
            position: 'insideRight',
            formatter: p => fmtShekel(p.value),
            fontFamily: 'Heebo', fontSize: 11, fontWeight: 500, color: '#fff'
          }
        }
      ]
    });
  }

  // ── Insights ──────────────────────────────────────────────────

  function renderInsights(records, year) {
    const el = document.getElementById('insightsRanks');
    if (el) el.innerHTML = InsightsEngine.rankInsights(records, year);
  }

  // ── Public ────────────────────────────────────────────────────

  function update(records, year, isFiltered = false) {
    lastRecords = records;
    lastIsFiltered = isFiltered;

    renderScatter(records, isFiltered);
    renderLollipop(records, isFiltered);
    renderRankHierarchy(records, isFiltered);
    renderInsights(records, year);
  }

  function resize() {
    if (scatterChart) scatterChart.resize();
    if (lollipopChart) lollipopChart.resize();
    if (hierarchyChart) hierarchyChart.resize();
  }

  return { update, resize };
})();
