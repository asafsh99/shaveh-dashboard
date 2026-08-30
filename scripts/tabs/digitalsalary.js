/**
 * Tab 6: Digital Salary — Ranges & Tiers (2018-2025)
 * Independent dataset (window.SALARY_RANGES_DATA, built from
 * "שכר דיגיטלי מגויר2018-2025- עדי ואסף (1).xlsx").
 * Not connected to the shared App filters/state — self-contained controller.
 */

window.TabDigitalSalary = (function () {

  let bandsChart = null;
  let layersChart = null;
  let rankCompareChart = null;
  let bodyCompareChart = null;
  let trendChart = null;

  let initialized = false;
  let ds = { year: null, groupId: null, mode: 'overall', rankName: null, bodyName: null, bandMode: 'stack' };

  const MAX_TREND = 6;
  let trend = { selected: [], fromYear: null, toYear: null, metric: 'avgWage' }; // selected: [{ key, entityType, entityName, groupId, groupName }]
  const TREND_PALETTE = ['#1D4ED8', '#DB2777', '#059669', '#D97706', '#7C3AED', '#0369A1'];

  const COLORS = {
    men: '#1D4ED8',
    women: '#DB2777',
    band: '#334155',
    layerBase: '#334155',
    layerExtra: '#F59E0B',
    layerExpense: '#14B8A6',
    layerOther: '#8B5CF6',
    tick: '#94a3b8',
    gridLine: 'rgba(148,163,184,0.12)',
  };

  function fmtShekel(v) {
    if (v == null || isNaN(v)) return '--';
    return '₪' + Math.round(v).toLocaleString('he-IL');
  }
  function fmtNum(v) {
    if (v == null || isNaN(v)) return '--';
    return Math.round(v).toLocaleString('he-IL');
  }
  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  const BAND_SHORT_LABELS = {
    'קטן מ-8': '<8K',
    '8-12': '8-12K',
    '12-16': '12-16K',
    '16-20': '16-20K',
    '20-24': '20-24K',
    '24-28': '24-28K',
    '28-32': '28-32K',
    '32-36': '32-36K',
    '36-40': '36-40K',
    '40-44': '40-44K',
    'גדול מ-44': '44K+',
  };

  function COLORS_DOT(color) {
    return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function getData() { return window.SALARY_RANGES_DATA; }

  function getYearData(year) {
    const data = getData();
    if (!data) return null;
    return (data.byYear && data.byYear[String(year)]) || null;
  }

  function getAllEntitiesFlatAnyYear() {
    const data = getData();
    if (!data) return [];
    const map = new Map();
    (data.meta.years || []).forEach(year => {
      const yd = getYearData(year);
      if (!yd) return;
      yd.groups.forEach(g => {
        (g.ranks || []).forEach(r => {
          const key = g.id + '::rank::' + r.name;
          const prev = map.get(key);
          if (!prev || r.headcount > prev.headcount) {
            map.set(key, { key, entityType: 'rank', entityName: r.name, groupId: g.id, groupName: g.name, headcount: r.headcount });
          }
        });
        (g.bodies || []).forEach(b => {
          const key = g.id + '::body::' + b.name;
          const prev = map.get(key);
          if (!prev || b.headcount > prev.headcount) {
            map.set(key, { key, entityType: 'body', entityName: b.name, groupId: g.id, groupName: g.name, headcount: b.headcount });
          }
        });
      });
    });
    return Array.from(map.values());
  }

  function getEntityYearBlock(groupId, entityType, name, year) {
    const yd = getYearData(year);
    if (!yd) return null;
    const g = yd.groups.find(x => x.id === groupId);
    if (!g) return null;
    const list = entityType === 'body' ? g.bodies : g.ranks;
    return (list || []).find(x => x.name === name) || null;
  }

  const LOW_BANDS = ['קטן מ-8', '8-12'];       // "עד 12,000"
  const HIGH_BANDS = ['28-32', '32-36', '36-40', '40-44', 'גדול מ-44']; // "מעל 28,000"

  function getMetricValue(block, metric) {
    if (!block) return null;
    if (metric === 'gap') {
      if (block.menWage && block.womenWage && block.menWage > 0) {
        return (block.menWage - block.womenWage) / block.menWage * 100;
      }
      return null;
    }
    if (metric === 'layerBase' || metric === 'layerExtra' || metric === 'layerExpense' || metric === 'layerOther') {
      const key = metric.replace('layer', '').replace(/^./, c => c.toLowerCase());
      return block.layerPct && block.layerPct[key] != null ? block.layerPct[key] * 100 : null;
    }
    if (metric === 'bandLow' || metric === 'bandHigh') {
      if (!block.bands || !block.bands.length) return null;
      const keys = metric === 'bandLow' ? LOW_BANDS : HIGH_BANDS;
      const pct = block.bands.filter(b => keys.includes(b.band)).reduce((sum, b) => sum + b.pct, 0);
      return pct * 100;
    }
    return block[metric] != null ? block[metric] : null;
  }

  function isEntityUnstableInRange(s) {
    for (let y = trend.fromYear; y <= trend.toYear; y++) {
      const block = getEntityYearBlock(s.groupId, s.entityType, s.entityName, y);
      if (block && block.stableTrend === false) return true;
    }
    return false;
  }

  function findGroup(groupId) {
    const yd = getYearData(ds.year);
    if (!yd || !yd.groups.length) return null;
    return yd.groups.find(g => g.id === groupId) || yd.groups[0];
  }

  // ── One-time UI setup ───────────────────────────────────────────

  function setupControls() {
    const data = getData();
    if (!data) return;

    const meta = data.meta || {};
    ds.year = meta.defaultYear || (meta.years || [])[meta.years.length - 1];

    const yearSel = document.getElementById('selectDsYear');
    yearSel.innerHTML = (meta.years || []).map(y => {
      const partial = (meta.partialYears || []).includes(y);
      return `<option value="${y}">${y}${partial ? ' (חלקי)' : ''}</option>`;
    }).join('');
    yearSel.value = ds.year;

    yearSel.addEventListener('change', () => {
      ds.year = Number(yearSel.value);
      populateGroupSelect();
      render();
    });

    populateGroupSelect();

    document.querySelectorAll('.btnDsMode').forEach(btn => {
      btn.addEventListener('click', () => {
        ds.mode = btn.dataset.mode;
        document.querySelectorAll('.btnDsMode').forEach(b => {
          b.classList.toggle('bg-white', b === btn);
          b.classList.toggle('text-slate-900', b === btn);
          b.classList.toggle('shadow-xs', b === btn);
          b.classList.toggle('text-slate-600', b !== btn);
        });
        document.getElementById('dsRankSelectWrap').classList.toggle('hidden', ds.mode !== 'rank');
        document.getElementById('dsRankSelectWrap').classList.toggle('flex', ds.mode === 'rank');
        document.getElementById('dsRankCompareSection').classList.toggle('hidden', ds.mode !== 'rank');
        document.getElementById('dsBodySelectWrap').classList.toggle('hidden', ds.mode !== 'body');
        document.getElementById('dsBodySelectWrap').classList.toggle('flex', ds.mode === 'body');
        document.getElementById('dsBodyCompareSection').classList.toggle('hidden', ds.mode !== 'body');
        render();
      });
    });

    const rankSel = document.getElementById('selectDsRank');
    rankSel.addEventListener('change', () => {
      ds.rankName = rankSel.value;
      render();
    });

    const bodySel = document.getElementById('selectDsBody');
    bodySel.addEventListener('change', () => {
      ds.bodyName = bodySel.value;
      render();
    });

    document.querySelectorAll('.btnDsBandMode').forEach(btn => {
      btn.addEventListener('click', () => {
        ds.bandMode = btn.dataset.bandmode;
        document.querySelectorAll('.btnDsBandMode').forEach(b => {
          b.classList.toggle('bg-white', b === btn);
          b.classList.toggle('text-slate-900', b === btn);
          b.classList.toggle('shadow-xs', b === btn);
          b.classList.toggle('text-slate-600', b !== btn);
        });
        render();
      });
    });

    const methBtn = document.getElementById('btnDigitalSalaryMethodology');
    const methPanel = document.getElementById('digitalSalaryMethodologyPanel');
    if (methBtn && methPanel) {
      methBtn.addEventListener('click', () => methPanel.classList.toggle('hidden'));
    }

    setupTrendControls();
  }

  function populateGroupSelect() {
    const yd = getYearData(ds.year);
    const groupSel = document.getElementById('selectDsGroup');
    if (!yd || !groupSel) return;

    groupSel.innerHTML = yd.groups.map(g =>
      `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)} (${fmtNum(g.overall.headcount)} משרות)</option>`
    ).join('');

    if (!yd.groups.length) return;

    const stillValid = ds.groupId && yd.groups.some(g => g.id === ds.groupId);
    if (!stillValid) {
      const defaultGroup = yd.groups.find(g => g.id === 'משרדי ממשלה') || yd.groups[0];
      ds.groupId = defaultGroup.id;
    }
    groupSel.value = ds.groupId;

    groupSel.addEventListener('change', () => {
      ds.groupId = groupSel.value;
      const g = findGroup(ds.groupId);
      ds.rankName = g && g.ranks.length ? g.ranks[0].name : null;
      ds.bodyName = g && g.bodies.length ? g.bodies[0].name : null;
      populateRankSelect();
      populateBodySelect();
      render();
    });

    populateRankSelect();
    populateBodySelect();
  }

  function populateRankSelect() {
    const g = findGroup(ds.groupId);
    const rankSel = document.getElementById('selectDsRank');
    if (!g || !rankSel) return;

    if (!g.ranks.length) {
      rankSel.innerHTML = `<option value="">אין נתוני דירוגים לשנה זו</option>`;
      ds.rankName = null;
      return;
    }

    rankSel.innerHTML = g.ranks.map(r =>
      `<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)} (${fmtNum(r.headcount)} משרות)</option>`
    ).join('');
    if (!ds.rankName || !g.ranks.some(r => r.name === ds.rankName)) {
      ds.rankName = g.ranks[0].name;
    }
    rankSel.value = ds.rankName;
  }

  function populateBodySelect() {
    const g = findGroup(ds.groupId);
    const bodySel = document.getElementById('selectDsBody');
    if (!g || !bodySel) return;

    if (!g.bodies.length) {
      bodySel.innerHTML = `<option value="">אין נתוני גופים לשנה זו</option>`;
      ds.bodyName = null;
      return;
    }

    bodySel.innerHTML = g.bodies.map(b =>
      `<option value="${escapeHtml(b.name)}">${escapeHtml(b.name)} (${fmtNum(b.headcount)} משרות)</option>`
    ).join('');
    if (!ds.bodyName || !g.bodies.some(b => b.name === ds.bodyName)) {
      ds.bodyName = g.bodies[0].name;
    }
    bodySel.value = ds.bodyName;
  }

  // ── Multi-year comparison studio ───────────────────────────────

  const TREND_METRIC_LABELS = {
    avgWage: 'שכר ממוצע כללי', menWage: 'שכר גברים', womenWage: 'שכר נשים',
    gap: 'פער מגדרי %', headcount: 'מספר משרות',
    layerBase: 'יסוד ותוספות %', layerExtra: 'עבודה נוספת %', layerExpense: 'החזר הוצאות %', layerOther: 'תשלומים והפרשים %',
    bandLow: '% בשכר נמוך (עד 12,000)', bandHigh: '% בשכר גבוה (מעל 28,000)'
  };
  const TREND_PCT_METRICS = new Set(['gap', 'layerBase', 'layerExtra', 'layerExpense', 'layerOther', 'bandLow', 'bandHigh']);
  const TREND_CURRENCY_METRICS = new Set(['avgWage', 'menWage', 'womenWage']);

  function setupTrendControls() {
    const data = getData();
    if (!data) return;
    const years = data.meta.years || [];

    const fromSel = document.getElementById('selectDsTrendFromYear');
    const toSel = document.getElementById('selectDsTrendToYear');
    if (!fromSel || !toSel) return;

    fromSel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    toSel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    trend.fromYear = years[0];
    trend.toYear = data.meta.defaultYear || years[years.length - 1];
    fromSel.value = trend.fromYear;
    toSel.value = trend.toYear;

    fromSel.addEventListener('change', () => {
      trend.fromYear = Number(fromSel.value);
      if (trend.fromYear > trend.toYear) { trend.toYear = trend.fromYear; toSel.value = trend.toYear; }
      renderTrend();
    });
    toSel.addEventListener('change', () => {
      trend.toYear = Number(toSel.value);
      if (trend.toYear < trend.fromYear) { trend.fromYear = trend.toYear; fromSel.value = trend.fromYear; }
      renderTrend();
    });

    document.querySelectorAll('.btnDsTrendMetric').forEach(btn => {
      btn.addEventListener('click', () => {
        trend.metric = btn.dataset.metric;
        document.querySelectorAll('.btnDsTrendMetric').forEach(b => {
          b.classList.toggle('bg-brand-600', b === btn);
          b.classList.toggle('text-white', b === btn);
          b.classList.toggle('shadow-xs', b === btn);
          b.classList.toggle('bg-white', b !== btn);
          b.classList.toggle('text-slate-700', b !== btn);
          b.classList.toggle('border', b !== btn);
          b.classList.toggle('border-slate-200', b !== btn);
        });
        renderTrend();
      });
    });

    const searchInput = document.getElementById('inputDsTrendSearch');
    const dropdown = document.getElementById('dropdownDsTrendResults');
    if (searchInput && dropdown) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length < 1) { dropdown.classList.add('hidden'); return; }

        if (trend.selected.length >= MAX_TREND) {
          dropdown.innerHTML = `<div class="p-3 text-xs text-amber-600 text-center">ניתן להשוות עד ${MAX_TREND} ישויות בו-זמנית</div>`;
          dropdown.classList.remove('hidden');
          return;
        }

        const selectedKeys = new Set(trend.selected.map(s => s.key));
        const matches = getAllEntitiesFlatAnyYear()
          .filter(r => r.entityName.toLowerCase().includes(query) && !selectedKeys.has(r.key))
          .slice(0, 15);

        if (matches.length === 0) {
          dropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center">לא נמצאו תוצאות</div>`;
          dropdown.classList.remove('hidden');
          return;
        }

        dropdown.innerHTML = matches.map(r => `
          <div class="p-2.5 text-xs text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors font-medium flex items-center justify-between" data-key="${escapeHtml(r.key)}">
            <span>
              <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${r.entityType === 'body' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}">${r.entityType === 'body' ? 'גוף' : 'דירוג'}</span>
              ${escapeHtml(r.entityName)} <span class="text-slate-400 font-normal">· ${escapeHtml(r.groupName)}</span>
            </span>
            <span class="text-brand-600 font-bold text-[11px] shrink-0">+ הוסף</span>
          </div>
        `).join('');

        dropdown.querySelectorAll('[data-key]').forEach(item => {
          item.addEventListener('click', () => {
            const r = getAllEntitiesFlatAnyYear().find(x => x.key === item.dataset.key);
            if (r && trend.selected.length < MAX_TREND && !trend.selected.some(s => s.key === r.key)) {
              trend.selected.push(r);
              renderTrend();
            }
            searchInput.value = '';
            dropdown.classList.add('hidden');
          });
        });

        dropdown.classList.remove('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== searchInput) dropdown.classList.add('hidden');
      });
    }

    const clearBtn = document.getElementById('btnDsTrendClear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        trend.selected = [];
        renderTrend();
      });
    }

    renderTrend();
  }

  function renderTrendTags() {
    const container = document.getElementById('containerDsTrendTags');
    if (!container) return;

    if (trend.selected.length === 0) {
      container.innerHTML = `<span class="text-xs text-slate-400 py-1">אין ישויות נבחרות. חפש והוסף למעלה כדי לראות מגמה רב-שנתית.</span>`;
      return;
    }

    container.innerHTML = trend.selected.map((s, idx) => {
      const color = TREND_PALETTE[idx % TREND_PALETTE.length];
      const unstable = isEntityUnstableInRange(s);
      return `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white border border-slate-300 text-slate-800 shadow-xs">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color:${color}"></span>
          <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${s.entityType === 'body' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}">${s.entityType === 'body' ? 'גוף' : 'דירוג'}</span>
          <span>${escapeHtml(s.entityName)}</span>
          <span class="text-slate-400 font-normal">· ${escapeHtml(s.groupName)}</span>
          ${unstable ? '<span title="קפיצת סיווג חדה בטווח השנים הנבחר — פרשנות המגמה לא אמינה" class="text-amber-600">⚠️</span>' : ''}
          <button data-remove="${escapeHtml(s.key)}" class="btnDsTrendRemove hover:text-rose-600 ml-0.5 text-slate-400 transition-colors font-bold">&times;</button>
        </span>
      `;
    }).join('');

    container.querySelectorAll('.btnDsTrendRemove').forEach(btn => {
      btn.addEventListener('click', () => {
        trend.selected = trend.selected.filter(s => s.key !== btn.dataset.remove);
        renderTrend();
      });
    });
  }

  function renderTrendChart() {
    const el = document.getElementById('chartDsTrend');
    if (!el) return;
    if (trendChart) trendChart.dispose();
    trendChart = echarts.init(el);

    const items = trend.selected;
    if (items.length === 0 || trend.fromYear == null || trend.toYear == null) {
      trendChart.setOption({
        title: { text: 'הוסף דירוגים/גופים כדי לראות מגמה רב-שנתית', left: 'center', top: 'middle', textStyle: { fontFamily: 'Heebo', fontSize: 13, color: '#94a3b8' } }
      }, true);
      return;
    }

    const years = [];
    for (let y = trend.fromYear; y <= trend.toYear; y++) years.push(y);

    const isPct = TREND_PCT_METRICS.has(trend.metric);
    const isCurrency = TREND_CURRENCY_METRICS.has(trend.metric);

    const series = items.map((s, idx) => {
      const color = TREND_PALETTE[idx % TREND_PALETTE.length];
      const unstable = isEntityUnstableInRange(s);
      const data = years.map(y => {
        const block = getEntityYearBlock(s.groupId, s.entityType, s.entityName, y);
        const v = getMetricValue(block, trend.metric);
        return v == null ? null : Math.round(v * 100) / 100;
      });
      return {
        name: (unstable ? '⚠️ ' : '') + s.entityName + ' · ' + s.groupName,
        type: 'line',
        data,
        connectNulls: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color, type: unstable ? 'dashed' : 'solid' },
        itemStyle: { color }
      };
    });

    trendChart.setOption({
      title: {
        text: `מגמת "${TREND_METRIC_LABELS[trend.metric]}" לאורך זמן`,
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        trigger: 'axis',
        textStyle: { fontFamily: 'Heebo' },
        formatter: params => {
          let html = `<strong>${params[0].axisValue}</strong><br>`;
          params.forEach(p => {
            const v = p.data;
            const vf = v == null ? 'אין נתונים' : isPct ? v.toFixed(1) + '%' : isCurrency ? fmtShekel(v) : fmtNum(v);
            html += `${p.marker} ${p.seriesName}: <strong>${vf}</strong><br>`;
          });
          return html;
        }
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 10 }
      },
      grid: { left: 60, right: 30, top: 60, bottom: 60 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: COLORS.tick },
        axisLine: { lineStyle: { color: COLORS.gridLine } }
      },
      yAxis: {
        type: 'value',
        name: TREND_METRIC_LABELS[trend.metric],
        nameTextStyle: { fontFamily: 'Heebo', fontSize: 10, color: COLORS.tick },
        axisLabel: {
          fontFamily: 'Heebo', fontSize: 10, color: COLORS.tick,
          formatter: v => isPct ? v + '%' : isCurrency ? '₪' + (v / 1000) + 'K' : v
        },
        splitLine: { lineStyle: { color: COLORS.gridLine } }
      },
      series
    });
  }

  function renderTrendDeltaTable() {
    const tbody = document.getElementById('tbodyDsTrendDelta');
    const thStart = document.getElementById('thDsTrendStart');
    const thEnd = document.getElementById('thDsTrendEnd');
    if (!tbody) return;

    if (thStart) thStart.textContent = `ערך ${trend.fromYear || ''}`;
    if (thEnd) thEnd.textContent = `ערך ${trend.toYear || ''}`;

    if (trend.selected.length === 0 || trend.fromYear == null) {
      tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-4 text-center text-slate-400">אין ישויות נבחרות</td></tr>`;
      return;
    }

    const isPct = TREND_PCT_METRICS.has(trend.metric);
    const isCurrency = TREND_CURRENCY_METRICS.has(trend.metric);
    const fmtVal = v => v == null ? '—' : isPct ? v.toFixed(1) + '%' : isCurrency ? fmtShekel(v) : fmtNum(v);

    tbody.innerHTML = trend.selected.map(s => {
      let startVal = null, endVal = null;
      for (let y = trend.fromYear; y <= trend.toYear; y++) {
        const v = getMetricValue(getEntityYearBlock(s.groupId, s.entityType, s.entityName, y), trend.metric);
        if (v != null && startVal == null) startVal = v;
        if (v != null) endVal = v;
      }
      const delta = (startVal != null && endVal != null) ? endVal - startVal : null;
      const pctChange = (startVal != null && endVal != null && startVal !== 0) ? (delta / Math.abs(startVal)) * 100 : null;
      const deltaColor = delta == null ? '' : (isPct ? delta < 0 : delta > 0) ? 'color:#059669;font-weight:700;' : delta === 0 ? '' : 'color:#DC2626;font-weight:700;';
      const unstable = isEntityUnstableInRange(s);

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-4 py-2.5 font-bold text-slate-900">${unstable ? '⚠️ ' : ''}${escapeHtml(s.entityName)} <span class="text-slate-400 font-normal">· ${escapeHtml(s.groupName)}</span></td>
          <td class="px-4 py-2.5 text-center">${fmtVal(startVal)}</td>
          <td class="px-4 py-2.5 text-center font-bold">${fmtVal(endVal)}</td>
          <td class="px-4 py-2.5 text-center" style="${deltaColor}">${delta != null ? (delta > 0 ? '+' : '') + (isPct ? delta.toFixed(1) + 'pp' : isCurrency ? fmtShekel(delta) : fmtNum(delta)) : '—'}</td>
          <td class="px-4 py-2.5 text-center" style="${deltaColor}">${pctChange != null ? (pctChange > 0 ? '+' : '') + pctChange.toFixed(1) + '%' : '—'}</td>
        </tr>
      `;
    }).join('');
  }

  function renderTrend() {
    renderTrendTags();
    renderTrendChart();
    renderTrendDeltaTable();
  }

  // ── KPIs ─────────────────────────────────────────────────────────

  function renderKpis(block) {
    document.getElementById('dsKpiHeadcount').textContent = fmtNum(block.headcount);
    document.getElementById('dsKpiWage').textContent = fmtShekel(block.avgWage);
    document.getElementById('dsKpiCost').textContent = fmtShekel(block.avgCost);
    document.getElementById('dsKpiMenWage').textContent = fmtShekel(block.menWage);
    document.getElementById('dsKpiWomenWage').textContent = fmtShekel(block.womenWage);
  }

  // ── Chart: Salary Range Distribution (bands) ─────────────────────

  function renderBands(block, title) {
    const el = document.getElementById('chartDsBands');
    if (!el) return;
    if (bandsChart) bandsChart.dispose();
    bandsChart = echarts.init(el);

    if (!block.bands || !block.bands.length) {
      bandsChart.setOption({ title: { text: 'אין נתוני התפלגות זמינים', left: 'center', top: 'middle', textStyle: { fontFamily: 'Heebo', fontSize: 13, color: '#94a3b8' } } }, true);
      return;
    }

    // Combined band list defines the canonical band order/labels; look up
    // the matching men/women counts by band key (real bands are always
    // present in every gender subset, even when the count is 0).
    const bands = (block.bands || []).filter(b => b.band !== 'לא מוגדר');
    const menByBand = new Map((block.menBands || []).map(b => [b.band, b]));
    const womenByBand = new Map((block.womenBands || []).map(b => [b.band, b]));

    const menCounts = bands.map(b => (menByBand.get(b.band) || {}).count || 0);
    const womenCounts = bands.map(b => (womenByBand.get(b.band) || {}).count || 0);
    const totalCounts = bands.map((b, i) => menCounts[i] + womenCounts[i]);

    const isPct = ds.bandMode === 'stack100';
    const menVals = isPct ? menCounts.map((v, i) => totalCounts[i] > 0 ? v / totalCounts[i] * 100 : 0) : menCounts;
    const womenVals = isPct ? womenCounts.map((v, i) => totalCounts[i] > 0 ? v / totalCounts[i] * 100 : 0) : womenCounts;

    // Total-headcount label sits on the topmost stacked segment (women);
    // it looks up the precomputed total rather than that segment's own value.
    const topLabel = {
      show: true, position: 'top', fontFamily: 'Heebo', fontSize: 10, fontWeight: 700, color: '#334155',
      formatter: p => totalCounts[p.dataIndex] > 0 ? fmtNum(totalCounts[p.dataIndex]) : ''
    };

    bandsChart.setOption({
      title: {
        text: isPct
          ? 'הרכב מגדרי לפי טווח שכר חודשי (₪ ברוטו) — אחוזים'
          : 'התפלגות משרות לפי טווח שכר חודשי (₪ ברוטו) — לפי מגדר',
        subtext: title,
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' },
        subtextStyle: { fontFamily: 'Heebo', fontSize: 11, color: '#64748b' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontFamily: 'Heebo' },
        formatter: params => {
          const i = params[0].dataIndex;
          const b = bands[i];
          let html = `<strong>${b.label} ₪</strong><br>`;
          html += `${COLORS_DOT(COLORS.men)} גברים: <strong>${fmtNum(menCounts[i])}</strong>${isPct ? ` (${menVals[i].toFixed(1)}%)` : ''}<br>`;
          html += `${COLORS_DOT(COLORS.women)} נשים: <strong>${fmtNum(womenCounts[i])}</strong>${isPct ? ` (${womenVals[i].toFixed(1)}%)` : ''}<br>`;
          html += `<hr style="margin: 4px 0; border-color: #e2e8f0;">סה"כ: <strong>${fmtNum(totalCounts[i])}</strong> משרות`;
          return html;
        }
      },
      legend: {
        data: ['גברים', 'נשים'],
        right: 0, top: 30,
        textStyle: { fontFamily: 'Heebo', fontSize: 11 }
      },
      grid: { left: 50, right: 30, top: 80, bottom: 60 },
      xAxis: {
        type: 'category',
        data: bands.map(b => b.label),
        axisLabel: { fontFamily: 'Heebo', fontSize: 10, color: COLORS.tick, rotate: 35 },
        axisLine: { lineStyle: { color: COLORS.gridLine } }
      },
      yAxis: {
        type: 'value',
        name: isPct ? '% מהמשרות בטווח' : 'מספר משרות',
        max: isPct ? 100 : null,
        nameTextStyle: { fontFamily: 'Heebo', fontSize: 10, color: COLORS.tick },
        axisLabel: { fontFamily: 'Heebo', fontSize: 10, color: COLORS.tick, formatter: v => isPct ? v + '%' : v },
        splitLine: { lineStyle: { color: COLORS.gridLine } }
      },
      series: [
        {
          name: 'גברים', type: 'bar', stack: 'total', data: menVals,
          itemStyle: { color: COLORS.men },
          barMaxWidth: 40
        },
        {
          name: 'נשים', type: 'bar', stack: 'total', data: womenVals,
          itemStyle: { color: COLORS.women, borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 40, label: isPct ? undefined : topLabel
        }
      ]
    });
  }

  // ── Chart: Salary Layers (100% stacked single bar) ────────────────

  function renderLayers(block, title) {
    const el = document.getElementById('chartDsLayers');
    if (!el) return;
    if (layersChart) layersChart.dispose();
    layersChart = echarts.init(el);

    const lp = block.layerPct;
    if (!lp) {
      layersChart.setOption({ title: { text: 'אין נתוני רבדי שכר זמינים', left: 'center', top: 'middle', textStyle: { fontFamily: 'Heebo', fontSize: 13, color: '#94a3b8' } } }, true);
      return;
    }

    const mlp = block.menLayerPct || {};
    const wlp = block.womenLayerPct || {};

    const segments = [
      { name: 'יסוד ותוספות', key: 'base', value: lp.base, color: COLORS.layerBase },
      { name: 'עבודה נוספת', key: 'extra', value: lp.extra, color: COLORS.layerExtra },
      { name: 'החזר הוצאות', key: 'expense', value: lp.expense, color: COLORS.layerExpense },
      { name: 'תשלומים והפרשים', key: 'other', value: lp.other, color: COLORS.layerOther },
    ];

    layersChart.setOption({
      title: {
        text: 'רבדי שכר — אחוז מהברוטו',
        subtext: title,
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' },
        subtextStyle: { fontFamily: 'Heebo', fontSize: 11, color: '#64748b' }
      },
      tooltip: {
        trigger: 'item',
        textStyle: { fontFamily: 'Heebo' },
        formatter: p => {
          const seg = segments.find(s => s.name === p.name);
          const mv = seg && mlp[seg.key] != null ? (mlp[seg.key] * 100).toFixed(1) + '%' : '--';
          const wv = seg && wlp[seg.key] != null ? (wlp[seg.key] * 100).toFixed(1) + '%' : '--';
          let html = `${p.marker} <strong>${p.name}</strong>: ${(p.value * 100).toFixed(1)}% (מכלל הברוטו)<br>`;
          html += `<hr style="margin: 4px 0; border-color: #e2e8f0;">`;
          html += `<span style="color:${COLORS.men}">●</span> אצל גברים (מברוטו הגברים): <strong>${mv}</strong><br>`;
          html += `<span style="color:${COLORS.women}">●</span> אצל נשים (מברוטו הנשים): <strong>${wv}</strong>`;
          return html;
        }
      },
      legend: {
        bottom: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 11 }
      },
      series: [{
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['50%', '52%'],
        label: {
          show: true,
          position: 'inside',
          formatter: p => (p.value * 100).toFixed(1) + '%',
          fontFamily: 'Heebo', fontSize: 11, fontWeight: 700, color: '#ffffff'
        },
        labelLine: { show: false },
        data: segments.map(s => ({ name: s.name, value: s.value, itemStyle: { color: s.color } }))
      }]
    });
  }

  // ── Chart: Rank comparison within group (bar-per-rank, avg wage) ──

  function renderRankCompare(g) {
    const el = document.getElementById('chartDsRankCompare');
    if (!el) return;
    if (rankCompareChart) rankCompareChart.dispose();
    rankCompareChart = echarts.init(el);

    if (!g.ranks.length) {
      rankCompareChart.setOption({ title: { text: 'אין נתוני דירוגים לשנה זו', left: 'center', top: 'middle', textStyle: { fontFamily: 'Heebo', fontSize: 13, color: '#94a3b8' } } }, true);
      return;
    }

    const ranks = [...g.ranks].sort((a, b) => (a.avgWage || 0) - (b.avgWage || 0));

    rankCompareChart.setOption({
      title: {
        text: `כלל הדירוגים בקבוצת "${g.name}" — שכר חודשי ממוצע (${ds.year})`,
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontFamily: 'Heebo' },
        formatter: params => {
          const p = params[0];
          const r = ranks[p.dataIndex];
          return `<strong>${r.name}</strong><br>שכר ממוצע: ${fmtShekel(r.avgWage)}<br>מספר משרות: ${fmtNum(r.headcount)}`;
        }
      },
      grid: { left: 160, right: 50, top: 50, bottom: 20 },
      xAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 10, color: COLORS.tick, formatter: v => '₪' + (v / 1000) + 'K' },
        splitLine: { lineStyle: { color: COLORS.gridLine } }
      },
      yAxis: {
        type: 'category',
        data: ranks.map(r => r.name),
        axisLabel: {
          fontFamily: 'Heebo', fontSize: 10,
          color: (val) => val === ds.rankName ? '#0f172a' : '#64748b'
        }
      },
      series: [{
        type: 'bar',
        data: ranks.map(r => ({
          value: r.avgWage,
          itemStyle: { color: r.name === ds.rankName ? '#1D4ED8' : '#cbd5e1' }
        })),
        barMaxWidth: 16
      }]
    });

    rankCompareChart.off('click');
    rankCompareChart.on('click', params => {
      const r = ranks[params.dataIndex];
      if (!r) return;
      ds.rankName = r.name;
      document.getElementById('selectDsRank').value = r.name;
      render();
    });
  }

  // ── Chart: Body comparison within group (bar-per-body, avg wage) ──

  function renderBodyCompare(g) {
    const el = document.getElementById('chartDsBodyCompare');
    if (!el) return;
    if (bodyCompareChart) bodyCompareChart.dispose();
    bodyCompareChart = echarts.init(el);

    if (!g.bodies.length) {
      bodyCompareChart.setOption({ title: { text: 'אין נתוני גופים לשנה זו', left: 'center', top: 'middle', textStyle: { fontFamily: 'Heebo', fontSize: 13, color: '#94a3b8' } } }, true);
      return;
    }

    const bodies = [...g.bodies].sort((a, b) => (a.avgWage || 0) - (b.avgWage || 0));
    const visibleCount = 20;

    bodyCompareChart.setOption({
      title: {
        text: `כלל הגופים בקבוצת "${g.name}" — שכר חודשי ממוצע (${ds.year}) · ${bodies.length} גופים, גרור לגלילה`,
        right: 0,
        textStyle: { fontFamily: 'Heebo', fontSize: 14, fontWeight: 700, color: '#1e293b' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontFamily: 'Heebo' },
        formatter: params => {
          const p = params[0];
          const b = bodies[p.dataIndex];
          return `<strong>${b.name}</strong>${b.subGroup ? ' · ' + b.subGroup : ''}<br>שכר ממוצע: ${fmtShekel(b.avgWage)}<br>מספר משרות: ${fmtNum(b.headcount)}`;
        }
      },
      grid: { left: 220, right: 50, top: 50, bottom: 20 },
      dataZoom: [{ type: 'slider', yAxisIndex: 0, right: 0, start: bodies.length > visibleCount ? (1 - visibleCount / bodies.length) * 100 : 0, end: 100, filterMode: 'empty' }],
      xAxis: {
        type: 'value',
        axisLabel: { fontFamily: 'Heebo', fontSize: 10, color: COLORS.tick, formatter: v => '₪' + (v / 1000) + 'K' },
        splitLine: { lineStyle: { color: COLORS.gridLine } }
      },
      yAxis: {
        type: 'category',
        data: bodies.map(b => truncate(b.name, 28)),
        axisLabel: {
          fontFamily: 'Heebo', fontSize: 10,
          color: (val) => val === truncate(ds.bodyName || '', 28) ? '#0f172a' : '#64748b'
        }
      },
      series: [{
        type: 'bar',
        data: bodies.map(b => ({
          value: b.avgWage,
          itemStyle: { color: b.name === ds.bodyName ? '#1D4ED8' : '#cbd5e1' }
        })),
        barMaxWidth: 16
      }]
    });

    bodyCompareChart.off('click');
    bodyCompareChart.on('click', params => {
      const b = bodies[params.dataIndex];
      if (!b) return;
      ds.bodyName = b.name;
      document.getElementById('selectDsBody').value = b.name;
      render();
    });
  }

  // ── Master render ──────────────────────────────────────────────

  function render() {
    const g = findGroup(ds.groupId);
    if (!g) return;

    let block, title;
    if (ds.mode === 'rank' && ds.rankName) {
      block = g.ranks.find(r => r.name === ds.rankName) || g.overall;
      title = `${g.name} · ${ds.rankName} · ${ds.year}`;
    } else if (ds.mode === 'body' && ds.bodyName) {
      block = g.bodies.find(b => b.name === ds.bodyName) || g.overall;
      title = `${g.name} · ${ds.bodyName} · ${ds.year}`;
    } else {
      block = g.overall;
      title = `${g.name} · כלל הקבוצה · ${ds.year}`;
    }

    renderKpis(block);
    renderBands(block, title);
    renderLayers(block, title);

    if (ds.mode === 'rank') {
      renderRankCompare(g);
    } else if (ds.mode === 'body') {
      renderBodyCompare(g);
    }
  }

  function update() {
    const data = getData();
    if (!data) return;

    if (!initialized) {
      setupControls();
      initialized = true;
      // The distribution/layers studio is a separate, self-contained module (own dataset,
      // own state) - initialize it once here rather than loading/computing it up front.
      if (window.DsStudio) window.DsStudio.init();
    }
    render();

    setTimeout(() => {
      if (bandsChart) bandsChart.resize();
      if (layersChart) layersChart.resize();
      if (rankCompareChart) rankCompareChart.resize();
      if (bodyCompareChart) bodyCompareChart.resize();
      if (trendChart) trendChart.resize();
      if (window.DsStudio) window.DsStudio.resize();
    }, 10);
  }

  return { update };
})();
