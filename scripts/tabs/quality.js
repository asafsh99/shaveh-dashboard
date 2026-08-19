/**
 * Tab 3: Employment Quality — Stage 5
 * Stacked bar (FT vs PT by gender), Dumbbell (FT vs PT wage gaps),
 * Treemap (minimum wage recipients)
 */

window.TabQuality = (function () {

  let stackedChart = null;
  let dumbbellChart = null;
  let treemapChart = null;
  let bubbleChart = null;

  const COLORS = {
    menFt: '#1D4ED8',   // Blue 700 — men full-time
    womenFt: '#DB2777', // Pink 600 — women full-time
    menPt: '#93C5FD',   // Blue 300 — men part-time (lighter)
    womenPt: '#F9A8D4', // Pink 300 — women part-time (lighter)
    menLw: '#1E3A8A',   // Blue 900 — men low-wage (darker)
    womenLw: '#9D174D', // Pink 900 — women low-wage (darker)
    tick: '#94a3b8',
    gridLine: 'rgba(148,163,184,0.12)',
  };

  function fmtShekel(v) { return '₪' + Math.round(v).toLocaleString('he-IL'); }
  function fmt(n) { return n != null ? n.toLocaleString('he-IL') : '—'; }

  // ── Stacked Bar: Employment Composition ───────────────────────

  function renderStackedBar(partTime) {
    const el = document.getElementById('chartStacked');
    if (!el) return;

    const systems = [...new Set(partTime.map(r => r.system))].filter(Boolean);
    const data = systems.map(sys => {
      const sub = partTime.filter(r => r.system === sys);
      const ftMen = sub.reduce((s, r) => s + (r.ftMenCount || 0), 0);
      const ftWomen = sub.reduce((s, r) => s + (r.ftWomenCount || 0), 0);
      const ptMen = sub.reduce((s, r) => s + (r.ptMenCount || 0), 0);
      const ptWomen = sub.reduce((s, r) => s + (r.ptWomenCount || 0), 0);
      
      const totalMen = ftMen + ptMen;
      const totalWomen = ftWomen + ptWomen;

      return {
        system: sys,
        ptMen,
        ptWomen,
        ptMenPct: totalMen > 0 ? (ptMen / totalMen) * 100 : 0,
        ptWomenPct: totalWomen > 0 ? (ptWomen / totalWomen) * 100 : 0,
        totalMen,
        totalWomen
      };
    }).sort((a, b) => b.ptWomenPct - a.ptWomenPct);

    if (stackedChart) stackedChart.dispose();
    stackedChart = echarts.init(el);

    stackedChart.setOption({
      title: {
        text: 'שיעור המועסקים במשרה חלקית — אחוז מתוך המגדר',
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: params => {
          const sysName = params[0].name;
          const d = data.find(x => x.system === sysName);
          let html = `<strong>${sysName}</strong><br>`;
          html += `סה"כ נשים במערכת: ${fmt(d.totalWomen)}<br>`;
          html += `סה"כ גברים במערכת: ${fmt(d.totalMen)}<br><hr style="margin: 4px 0; border-color: #e2e8f0;">`;
          html += `${params[0].marker} גברים בחלקיות: <strong>${params[0].value}%</strong> (${fmt(d.ptMen)} עובדים)<br>`;
          html += `${params[1].marker} נשים בחלקיות: <strong>${params[1].value}%</strong> (${fmt(d.ptWomen)} עובדות)<br>`;
          return html;
        },
        textStyle: { fontFamily: 'Heebo' }
      },
      legend: {
        data: ['% גברים בחלקיות', '% נשים בחלקיות'],
        right: 0, top: 30,
        textStyle: { fontFamily: 'Heebo', fontSize: 11 }
      },
      grid: { left: 130, right: 40, top: 80, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick, formatter: '{value}%' },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
      },
      yAxis: {
        type: 'category',
        data: data.map(d => d.system),
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: '#334155' },
        axisTick: { show: false },
      },
      series: [
        {
          name: '% גברים בחלקיות',
          type: 'bar',
          data: data.map(d => Math.round(d.ptMenPct * 10) / 10),
          itemStyle: { color: COLORS.menPt, borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', formatter: '{c}%', color: '#64748b', fontSize: 10 },
          barMaxWidth: 16,
        },
        {
          name: '% נשים בחלקיות',
          type: 'bar',
          data: data.map(d => Math.round(d.ptWomenPct * 10) / 10),
          itemStyle: { color: COLORS.womenPt, borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', formatter: '{c}%', color: '#64748b', fontSize: 10 },
          barMaxWidth: 16,
        },
      ]
    });
  }

  // ── Dumbbell: FT vs PT Wage Gaps ──────────────────────────────

  function renderDumbbell(partTime) {
    const el = document.getElementById('chartDumbbell');
    if (!el) return;

    const systems = [...new Set(partTime.map(r => r.system))].filter(Boolean);

    // Weighted averages per system
    const data = systems.map(sys => {
      const sub = partTime.filter(r => r.system === sys);
      // Full-time weighted wages
      let ftMenWS = 0, ftMenCS = 0, ftWomenWS = 0, ftWomenCS = 0;
      let ptMenWS = 0, ptMenCS = 0, ptWomenWS = 0, ptWomenCS = 0;
      sub.forEach(r => {
        if (r.ftMenWage && r.ftMenCount > 0) { ftMenWS += r.ftMenWage * r.ftMenCount; ftMenCS += r.ftMenCount; }
        if (r.ftWomenWage && r.ftWomenCount > 0) { ftWomenWS += r.ftWomenWage * r.ftWomenCount; ftWomenCS += r.ftWomenCount; }
        if (r.ptMenWage && r.ptMenCount > 0) { ptMenWS += r.ptMenWage * r.ptMenCount; ptMenCS += r.ptMenCount; }
        if (r.ptWomenWage && r.ptWomenCount > 0) { ptWomenWS += r.ptWomenWage * r.ptWomenCount; ptWomenCS += r.ptWomenCount; }
      });
      return {
        system: sys,
        ftMen: ftMenCS > 0 ? ftMenWS / ftMenCS : null,
        ftWomen: ftWomenCS > 0 ? ftWomenWS / ftWomenCS : null,
        ptMen: ptMenCS > 0 ? ptMenWS / ptMenCS : null,
        ptWomen: ptWomenCS > 0 ? ptWomenWS / ptWomenCS : null,
      };
    }).filter(d => d.ftMen && d.ftWomen && d.ptMen && d.ptWomen)
      .sort((a, b) => {
        const aGap = ((a.ptMen - a.ptWomen) / a.ptMen * 100);
        const bGap = ((b.ptMen - b.ptWomen) / b.ptMen * 100);
        return bGap - aGap;
      });

    if (dumbbellChart) dumbbellChart.dispose();
    dumbbellChart = echarts.init(el);

    // Custom rendering using scatter + lines
    const categories = data.map(d => d.system);

    dumbbellChart.setOption({
      title: {
        text: 'פער שכר — משרה מלאה מול חלקית',
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        formatter: p => {
          const d = data[p.dataIndex] || data[Math.floor(p.dataIndex / 2)];
          if (!d) return '';
          const ftGap = d.ftMen > 0 ? ((d.ftMen - d.ftWomen) / d.ftMen * 100).toFixed(1) : '—';
          const ptGap = d.ptMen > 0 ? ((d.ptMen - d.ptWomen) / d.ptMen * 100).toFixed(1) : '—';
          return `<strong>${d.system}</strong><br>` +
            `<strong>משרה מלאה:</strong> גברים ${fmtShekel(d.ftMen)} | נשים ${fmtShekel(d.ftWomen)} | פער ${ftGap}%<br>` +
            `<strong>חלקית:</strong> גברים ${fmtShekel(d.ptMen)} | נשים ${fmtShekel(d.ptWomen)} | פער ${ptGap}%`;
        },
        textStyle: { fontFamily: 'Heebo' }
      },
      legend: {
        data: ['גברים (מלאה)', 'נשים (מלאה)', 'גברים (חלקית)', 'נשים (חלקית)'],
        right: 0, top: 30,
        textStyle: { fontFamily: 'Heebo', fontSize: 11 }
      },
      grid: { left: 110, right: 30, top: 80, bottom: 30 },
      xAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick, formatter: v => fmtShekel(v) },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: '#334155' },
        axisTick: { show: false },
      },
      series: [
        // Full-time men
        { name: 'גברים (מלאה)', type: 'scatter', data: data.map((d, i) => [d.ftMen, i]),
          symbolSize: 14, itemStyle: { color: COLORS.menFt, borderColor: '#fff', borderWidth: 2 }, z: 3 },
        // Full-time women
        { name: 'נשים (מלאה)', type: 'scatter', data: data.map((d, i) => [d.ftWomen, i]),
          symbolSize: 14, itemStyle: { color: COLORS.womenFt, borderColor: '#fff', borderWidth: 2 }, z: 3 },
        // Part-time men
        { name: 'גברים (חלקית)', type: 'scatter', data: data.map((d, i) => [d.ptMen, i + 0.3]),
          symbolSize: 10, symbol: 'diamond', itemStyle: { color: COLORS.menPt, borderColor: '#fff', borderWidth: 1 }, z: 3 },
        // Part-time women
        { name: 'נשים (חלקית)', type: 'scatter', data: data.map((d, i) => [d.ptWomen, i + 0.3]),
          symbolSize: 10, symbol: 'diamond', itemStyle: { color: COLORS.womenPt, borderColor: '#fff', borderWidth: 1 }, z: 3 },
      ]
    });
  }

  // ── Bubble Chart: Minimum Wage Anomaly ────────────────────────

  function renderBubble(minWage, overview) {
    const el = document.getElementById('chartBubble');
    if (!el || !overview || overview.length === 0) return;

    const mwBodyMap = {};
    minWage.forEach(r => {
      if (!r.bodyName) return;
      const count = (r.totalCount !== null && r.totalCount !== undefined) ? r.totalCount : ((r.menCount || 0) + (r.womenCount || 0) || (r.mwMenCount || 0) + (r.mwWomenCount || 0));
      mwBodyMap[r.bodyName] = (mwBodyMap[r.bodyName] || 0) + (count || 0);
    });

    const ovBodyMap = {};
    overview.forEach(r => {
      if (!r.bodyName) return;
      if (!ovBodyMap[r.bodyName]) {
        ovBodyMap[r.bodyName] = { hc: 0, wageSum: 0, wageHc: 0, system: r.system };
      }
      
      const mHc = r.menCount || 0;
      const wHc = r.womenCount || 0;
      
      if (r.avgMenWage) {
        ovBodyMap[r.bodyName].wageSum += r.avgMenWage * mHc;
        ovBodyMap[r.bodyName].wageHc += mHc;
      }
      if (r.avgWomenWage) {
        ovBodyMap[r.bodyName].wageSum += r.avgWomenWage * wHc;
        ovBodyMap[r.bodyName].wageHc += wHc;
      }
      if (r.avgGrossRegular && !r.avgMenWage && !r.avgWomenWage) {
        ovBodyMap[r.bodyName].wageSum += r.avgGrossRegular * (mHc + wHc);
        ovBodyMap[r.bodyName].wageHc += (mHc + wHc);
      }
      
      ovBodyMap[r.bodyName].hc += (mHc + wHc);
    });

    const seriesMap = {};
    Object.keys(ovBodyMap).forEach(body => {
      const ov = ovBodyMap[body];
      const mwHc = mwBodyMap[body] || 0;
      if (ov.hc < 5) return;

      const avgWage = ov.wageHc > 0 ? (ov.wageSum / ov.wageHc) : 0;
      if (avgWage === 0) return; // Don't plot bodies with no wage data

      const mwPct = (mwHc / ov.hc) * 100;
      if (mwPct > 0) {
        const sys = ov.system || 'אחר';
        if (!seriesMap[sys]) seriesMap[sys] = [];
        seriesMap[sys].push({
          name: body,
          value: [Math.round(avgWage), Math.round(mwPct * 10) / 10, Math.round(ov.hc), Math.round(mwHc)]
        });
      }
    });

    const series = Object.keys(seriesMap).map(sys => {
      return {
        name: sys,
        type: 'scatter',
        itemStyle: {
          opacity: 0.8,
          borderColor: '#fff',
          borderWidth: 1
        },
        data: seriesMap[sys]
      };
    });

    if (bubbleChart) bubbleChart.dispose();
    bubbleChart = echarts.init(el);

    bubbleChart.setOption({
      title: {
        text: 'אנומליית "השלמה למינימום": שיעור מקבלי השלמה מול שכר ממוצע בגוף',
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      legend: {
        type: 'scroll',
        top: 30,
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 11 }
      },
      tooltip: {
        formatter: p => {
          const d = p.data;
          return `<strong>${d.name} (${p.seriesName})</strong><br>` +
            `שכר ממוצע: ${fmtShekel(d.value[0])}<br>` +
            `שיעור מקבלי השלמה: ${d.value[1]}%<br>` +
            `סך עובדים בגוף: ${fmt(d.value[2])}`;
        },
        textStyle: { fontFamily: 'Heebo' }
      },
      grid: { left: 70, right: 70, top: 80, bottom: 60 },
      xAxis: {
        type: 'value',
        name: 'שכר ברוטו ממוצע (₪)',
        nameLocation: 'middle',
        nameGap: 35,
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, formatter: '{value} ₪' },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
        scale: true
      },
      yAxis: {
        type: 'value',
        name: '% מקבלי השלמה',
        nameLocation: 'middle',
        nameGap: 45,
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, formatter: '{value}%' },
        splitLine: { lineStyle: { color: COLORS.gridLine } },
        min: 0,
        max: 100
      },
      series: series.map(s => {
        s.symbolSize = val => Math.max(5, Math.min(90, Math.sqrt(val[2]) / 3.5));
        s.clip = false;
        return s;
      })
    });
  }

  // ── Insights ──────────────────────────────────────────────────

  function renderInsights(partTime, lowWage, minWage, year) {
    const el = document.getElementById('insightsQuality');
    if (el) el.innerHTML = InsightsEngine.qualityInsights(partTime, lowWage, minWage, year);
  }

  // ── Public ────────────────────────────────────────────────────

  function update(partTime, lowWage, minWage, year, overview) {
    renderStackedBar(partTime);
    renderDumbbell(partTime);
    if (overview) renderBubble(minWage, overview);
    renderInsights(partTime, lowWage, minWage, year);
  }

  function resize() {
    if (stackedChart) stackedChart.resize();
    if (dumbbellChart) dumbbellChart.resize();
    if (bubbleChart) bubbleChart.resize();
  }

  return { update, resize };
})();
