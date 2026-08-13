/**
 * Tab 5: Entity Directory & Searchable Table — V1 Statutory Upgrade
 * Interactive table of bodies & ranks with real-time search and sorting
 */

window.TabDirectory = (function () {

  let currentRecords = [];
  let sortCol = 'employerCost';
  let sortDir = -1; // -1 = desc, 1 = asc

  function fmtShekel(v) { return v != null ? '₪' + Math.round(v).toLocaleString('he-IL') : '—'; }
  function fmtPct(v) { return v != null ? v.toFixed(1) + '%' : '—'; }
  function fmt(v) { return v != null ? Math.round(v).toLocaleString('he-IL') : '—'; }

  function buildAggregateRows(records) {
    const map = {};
    records.forEach(r => {
      if (!r.bodyName) return;
      const key = r.bodyName + '|||' + (r.rank || 'כללי');
      if (!map[key]) {
        map[key] = {
          bodyName: r.bodyName,
          rank: r.rank || 'כללי',
          system: r.system || '',
          menCount: 0, womenCount: 0,
          menWageSum: 0, womenWageSum: 0,
          menCostSum: 0, womenCostSum: 0
        };
      }
      const m = map[key];
      const mc = r.menCount || 0, wc = r.womenCount || 0;
      m.menCount += mc;
      m.womenCount += wc;
      if (r.avgMenWage && mc > 0) m.menWageSum += r.avgMenWage * mc;
      if (r.avgWomenWage && wc > 0) m.womenWageSum += r.avgWomenWage * wc;
      if (r.avgMenEmployerCost && mc > 0) m.menCostSum += r.avgMenEmployerCost * mc;
      if (r.avgWomenEmployerCost && wc > 0) m.womenCostSum += r.avgWomenEmployerCost * wc;
    });

    const T = (window.DataEngine && window.DataEngine.PRIVACY_THRESHOLD) || 5;

    return Object.values(map).map(m => {
      const hc = m.menCount + m.womenCount;
      if (hc < T) return null;

      const menW = m.menCount > 0 ? m.menWageSum / m.menCount : null;
      const womenW = m.womenCount > 0 ? m.womenWageSum / m.womenCount : null;
      const avgW = hc > 0 ? (m.menWageSum + m.womenWageSum) / hc : null;
      const avgCost = hc > 0 ? (m.menCostSum + m.womenCostSum) / hc : null;
      const gap = (menW && womenW && menW > 0) ? ((menW - womenW) / menW) * 100 : null;

      return {
        bodyName: m.bodyName,
        rank: m.rank,
        system: m.system,
        hc,
        menPct: hc > 0 ? (m.menCount / hc) * 100 : 0,
        avgWage: avgW,
        employerCost: avgCost,
        gap
      };
    }).filter(Boolean);
  }

  function renderTable() {
    const searchEl = document.getElementById('searchDirectory');
    const searchVal = (searchEl ? searchEl.value : '').toLowerCase().trim();

    let rows = buildAggregateRows(currentRecords);

    if (searchVal) {
      rows = rows.filter(r =>
        r.bodyName.toLowerCase().includes(searchVal) ||
        r.rank.toLowerCase().includes(searchVal) ||
        r.system.toLowerCase().includes(searchVal)
      );
    }

    rows.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return av.localeCompare(bv, 'he-IL') * sortDir;
      return (av - bv) * sortDir;
    });

    const countEl = document.getElementById('directoryCount');
    if (countEl) {
      countEl.textContent = `מציג ${Math.min(100, rows.length).toLocaleString('he-IL')} מתוך ${rows.length.toLocaleString('he-IL')} רשומות`;
    }

    const tbody = document.getElementById('directoryTableBody');
    if (!tbody) return;

    const displayRows = rows.slice(0, 100);

    tbody.innerHTML = displayRows.map(r => {
      const gapStyle = r.gap == null ? '' :
        r.gap > 15 ? 'color:#f43f5e; font-weight:700;' :
        r.gap < 0 ? 'color:#10b981; font-weight:700;' : '';

      return `<tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
        <td class="px-4 py-2.5 font-medium text-slate-800">${r.bodyName}</td>
        <td class="px-4 py-2.5 text-slate-600">${r.rank}</td>
        <td class="px-4 py-2.5 text-slate-500 text-xs">${r.system}</td>
        <td class="px-4 py-2.5 text-center font-medium">${fmt(r.hc)}</td>
        <td class="px-4 py-2.5 text-center text-slate-600">${fmtPct(r.menPct)}</td>
        <td class="px-4 py-2.5 text-center font-bold text-slate-800">${fmtShekel(r.avgWage)}</td>
        <td class="px-4 py-2.5 text-center font-bold text-brand-600">${fmtShekel(r.employerCost)}</td>
        <td class="px-4 py-2.5 text-center" style="${gapStyle}">${r.gap != null ? fmtPct(r.gap) : '—'}</td>
      </tr>`;
    }).join('');
  }

  function bindEvents() {
    const searchEl = document.getElementById('searchDirectory');
    if (searchEl) {
      searchEl.removeEventListener('input', renderTable);
      searchEl.addEventListener('input', renderTable);
    }

    const headers = document.querySelectorAll('#tableDirectory thead th');
    headers.forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (!col) return;
        if (sortCol === col) {
          sortDir *= -1;
        } else {
          sortCol = col;
          sortDir = -1;
        }
        renderTable();
      });
    });
  }

  function update(records) {
    currentRecords = records;
    bindEvents();
    renderTable();
  }

  function resize() {}

  return { update, resize };
})();
