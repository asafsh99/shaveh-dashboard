/**
 * Application State & Tab Router — Stage 5
 * Manages global data loading, URL-based tab routing, shared filters,
 * and delegates updates to the active tab controller.
 */

window.App = (function() {

  // ── Global State ──────────────────────────────────────────────
  const state = {
    data: {
      overview: [],
      partTime: [],
      lowWage: [],
      minWage: []
    },
    activeTab: 'overview', // 'overview' | 'ranks' | 'quality' | 'trends' | 'directory'
    workforceScope: 'fullTime', // 'fullTime' | 'allEmployees'
    filters: {
      year: 2024,         // Default to latest year (strictly single-select)
      system: [],
      subSystem: [],
      bodyName: [],
      rank: []
    },
    filterOptions: {
      years: [],
      systems: [],
      subSystems: [],
      bodies: [],
      ranks: []
    },
    dropdownCache: { system: '', subSystem: '', body: '', rank: '' }
  };

  // ── Initialization & Data Load ────────────────────────────────
  
  async function updateStatus(text, badgeCount = null) {
    // Status banner removed from UI per user request
    console.log(`[Status] ${text} ${badgeCount ? '(' + badgeCount + ')' : ''}`);
  }

  async function init() {
    const loader = document.getElementById('loadingOverlay');

    try {
      updateStatus('טוען ומפענח 4 מערכי נתונים במקביל...');
      loader.classList.remove('hidden');

      // Load all 4 files via DataEngine
      const rawData = await DataEngine.loadAll();
      state.data = rawData;

      // Run automated data integrity checks on every load
      if (window.DataValidator && window.DataValidator.validateLoadedData) {
        DataValidator.validateLoadedData(rawData);
      }

      // Extract filter options based on the overview dataset
      extractMasterFilters(rawData.overview);

      // Force latest year if valid
      if (state.filterOptions.years.length > 0) {
        state.filters.year = Math.max(...state.filterOptions.years);
      }

      bindEvents();
      
      // Initialize routing
      window.addEventListener('hashchange', handleRouteChange);
      handleRouteChange();
      
      setTimeout(() => {
        // Initial render
        onFilterChange();
      }, 500);

      // Success
      const totalRecs = rawData.overview.length + rawData.partTime.length + rawData.lowWage.length + rawData.minWage.length;
      updateStatus('4 קבצי נתונים נטענו ועובדו בהצלחה.', `${totalRecs.toLocaleString('he-IL')} שורות`);

      loader.classList.add('hidden');
      console.log('%c[App] Stage 5 Initialization complete.', 'color: #059669; font-weight: bold;');

    } catch (err) {
      console.error('[App] Initialization failed:', err);
      updateStatus(`שגיאה בטעינת הנתונים: ${err.message}`);
      loader.classList.add('hidden');
    }
  }

  // ── Tab Routing ───────────────────────────────────────────────

  function handleRouteChange() {
    let hash = window.location.hash.replace('#', '') || 'overview';
    const validTabs = ['overview', 'ranks', 'quality', 'trends', 'directory'];
    
    if (!validTabs.includes(hash)) {
      hash = 'overview';
      window.location.hash = hash;
      return;
    }

    state.activeTab = hash;

    // Update DOM visibility
    validTabs.forEach(tabId => {
      const el = document.getElementById(`tab-${tabId}`);
      if (el) el.classList.toggle('hidden', tabId !== hash);
      
      const navBtn = document.getElementById(`nav-${tabId}`);
      if (navBtn) {
        if (tabId === hash) {
          navBtn.classList.add('text-brand-600', 'bg-brand-50', 'border-brand-600');
          navBtn.classList.remove('text-slate-500', 'hover:bg-slate-50', 'border-transparent');
        } else {
          navBtn.classList.remove('text-brand-600', 'bg-brand-50', 'border-brand-600');
          navBtn.classList.add('text-slate-500', 'hover:bg-slate-50', 'border-transparent');
        }
      }
    });

    // Update filter bar UI constraints
    applyFilterUIConstraints(hash);

    // Trigger update cycle for the active tab
    onFilterChange();

    // Trigger resize to fix ECharts canvas sizing if element was hidden
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 10);
  }

  function applyFilterUIConstraints(tabId) {
    const yearEl = document.getElementById('filterYear');
    const sysEl = document.getElementById('btnDropdown-system');
    const subSysEl = document.getElementById('btnDropdown-subSystem');
    const bodyEl = document.getElementById('btnDropdown-body');
    const rankEl = document.getElementById('btnDropdown-rank');
    const yearLabel = document.getElementById('yearFilterAlert');

    if (tabId === 'trends') {
      yearEl.disabled = true;
      yearEl.classList.add('opacity-50', 'cursor-not-allowed');
      yearLabel.classList.remove('hidden');
      if (subSysEl) { subSysEl.disabled = true; subSysEl.classList.add('opacity-50'); }
      bodyEl.disabled = true; bodyEl.classList.add('opacity-50');
      rankEl.disabled = true; rankEl.classList.add('opacity-50');
    } else {
      yearEl.disabled = false;
      yearEl.classList.remove('opacity-50', 'cursor-not-allowed');
      yearLabel.classList.add('hidden');
      
      sysEl.disabled = false; sysEl.classList.remove('opacity-50');
      if (subSysEl) { subSysEl.disabled = false; subSysEl.classList.remove('opacity-50'); }
      bodyEl.disabled = false; bodyEl.classList.remove('opacity-50');
      
      // Rank is only relevant for Overview and Ranks tabs
      if (tabId === 'quality') {
        rankEl.disabled = true; rankEl.classList.add('opacity-50');
        state.filters.rank = []; // Clear rank if moving to Quality
      } else {
        rankEl.disabled = false; rankEl.classList.remove('opacity-50');
      }
    }
  }

  // ── Filters & Cascading ───────────────────────────────────────

  function extractUnique(records, field, sortFn) {
    const vals = [...new Set(records.map(r => r[field]).filter(v => v !== '' && v != null))];
    return sortFn ? vals.sort(sortFn) : vals.sort();
  }

  function extractMasterFilters(records) {
    state.filterOptions.years = extractUnique(records, 'year', (a, b) => a - b);
    state.filterOptions.systems = extractUnique(records, 'system');
    state.filterOptions.subSystems = extractUnique(records, 'subSystem');
    state.filterOptions.bodies = extractUnique(records, 'bodyName');
    state.filterOptions.ranks = extractUnique(records, 'rank');

    // Dynamic header & document title update based on loaded years range
    const yrs = state.filterOptions.years;
    if (yrs.length > 0) {
      const minY = Math.min(...yrs);
      const maxY = Math.max(...yrs);
      const yearText = `${minY}–${maxY}`;
      
      document.title = `פערי שכר מגדריים במגזר הציבורי | ${yearText}`;
      
      const badge = document.getElementById('headerYearBadge');
      if (badge) badge.textContent = `${yearText}`;
    }
  }

  function getCascadedRecords(upToField) {
    let records = state.data.overview;
    // Year is always applied (unless trend tab)
    if (state.filters.year && state.activeTab !== 'trends') {
      records = records.filter(r => r.year === Number(state.filters.year));
    }
    if (upToField === 'year') return records;

    if (state.filters.system && state.filters.system.length > 0) {
      records = records.filter(r => state.filters.system.includes(r.system));
    }
    if (upToField === 'system') return records;

    if (state.filters.subSystem && state.filters.subSystem.length > 0) {
      records = records.filter(r => state.filters.subSystem.includes(r.subSystem));
    }
    if (upToField === 'subSystem') return records;

    if (state.filters.bodyName && state.filters.bodyName.length > 0) {
      records = records.filter(r => state.filters.bodyName.includes(r.bodyName));
    }
    if (upToField === 'bodyName') return records;

    if (state.filters.rank && state.filters.rank.length > 0) {
      records = records.filter(r => state.filters.rank.includes(r.rank));
    }
    return records;
  }

  function updateCascadedOptions() {
    const sysPool = getCascadedRecords('year');
    state.filterOptions.systems = extractUnique(sysPool, 'system');

    const subSysPool = getCascadedRecords('system');
    state.filterOptions.subSystems = extractUnique(subSysPool, 'subSystem');

    const bodiesPool = getCascadedRecords('subSystem');
    state.filterOptions.bodies = extractUnique(bodiesPool, 'bodyName');

    const ranksPool = getCascadedRecords('bodyName');
    state.filterOptions.ranks = extractUnique(ranksPool, 'rank');
  }

  function applyFiltersTo(dataset) {
    let records = dataset;
    if (state.filters.year && state.activeTab !== 'trends') {
      records = records.filter(r => r.year === Number(state.filters.year));
    }
    if (state.filters.system && state.filters.system.length > 0) {
      records = records.filter(r => state.filters.system.includes(r.system));
    }
    if (state.filters.subSystem && state.filters.subSystem.length > 0 && records.length > 0 && 'subSystem' in records[0]) {
      records = records.filter(r => state.filters.subSystem.includes(r.subSystem));
    }
    if (state.filters.bodyName && state.filters.bodyName.length > 0) {
      records = records.filter(r => state.filters.bodyName.includes(r.bodyName));
    }
    // Only overview has 'rank' column
    if (state.filters.rank && state.filters.rank.length > 0 && records.length > 0 && 'rank' in records[0]) {
      records = records.filter(r => state.filters.rank.includes(r.rank));
    }
    return records;
  }

  // ── DOM Rendering (Custom Dropdowns) ─────────────────────────

  function populateYearDropdown(options, currentValue) {
    const el = document.getElementById('filterYear');
    if (!el) return;
    el.innerHTML = '';
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      option.selected = (Number(opt) === Number(currentValue));
      el.appendChild(option);
    });
  }

  function sortDropdownList(list) {
    const labels = Array.from(list.children).filter(child => child.tagName && child.tagName.toLowerCase() === 'label');
    if (labels.length === 0) return;
    
    const checked = labels.filter(label => label.querySelector('input') && label.querySelector('input').checked);
    const unchecked = labels.filter(label => label.querySelector('input') && !label.querySelector('input').checked);
    
    // Maintain alphabetical order using Hebrew locale
    const sortAlpha = (a, b) => a.textContent.trim().localeCompare(b.textContent.trim(), 'he-IL');
    checked.sort(sortAlpha);
    unchecked.sort(sortAlpha);
    
    checked.forEach(l => list.appendChild(l));
    unchecked.forEach(l => list.appendChild(l));
  }

  function renderCheckboxDropdown(fieldId, key, options, placeholder, currentValues) {
    const listEl = document.getElementById(`listDropdown-${fieldId}`);
    const labelEl = document.getElementById(`labelDropdown-${fieldId}`);
    if (!listEl || !labelEl) return;

    // Filter to valid current values
    let validValues = (currentValues || []).filter(v => options.includes(v));
    if (validValues.length !== (currentValues || []).length) {
      state.filters[key] = validValues;
    }

    // Update label
    if (validValues.length === 0) {
      labelEl.textContent = placeholder;
    } else if (validValues.length === 1) {
      labelEl.textContent = validValues[0];
    } else {
      labelEl.textContent = `${validValues.length} נבחרו`;
    }

    const optionsSig = options.join('|');
    if (state.dropdownCache[fieldId] !== optionsSig) {
      // Rebuild DOM
      state.dropdownCache[fieldId] = optionsSig;
      listEl.innerHTML = '';
      
      if (options.length === 0) {
        listEl.innerHTML = '<div class="text-xs text-slate-400 p-2 text-center">אין אפשרויות</div>';
        return;
      }

      options.forEach(opt => {
        const isChecked = validValues.includes(opt);
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer rounded text-sm text-slate-700';
        
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4';
        cb.value = opt;
        cb.checked = isChecked;
        
        cb.addEventListener('change', (e) => {
          if (e.target.checked) {
            state.filters[key].push(opt);
          } else {
            state.filters[key] = state.filters[key].filter(v => v !== opt);
          }
          
          // Cascading reset
          if (fieldId === 'system') { state.filters.subSystem = []; state.filters.bodyName = []; state.filters.rank = []; }
          if (fieldId === 'subSystem') { state.filters.bodyName = []; state.filters.rank = []; }
          if (fieldId === 'body') { state.filters.rank = []; }
          
          sortDropdownList(listEl);
          onFilterChange();
        });

        const span = document.createElement('span');
        span.textContent = opt;
        
        label.appendChild(cb);
        label.appendChild(span);
        listEl.appendChild(label);
      });
    } else {
      // Just update checkboxes
      Array.from(listEl.querySelectorAll('input[type="checkbox"]')).forEach(cb => {
        cb.checked = validValues.includes(cb.value);
      });
    }
  }

  function renderFilters() {
    populateYearDropdown(state.filterOptions.years, state.filters.year);
    renderCheckboxDropdown('system', 'system', state.filterOptions.systems, 'כל המערכות', state.filters.system);
    renderCheckboxDropdown('subSystem', 'subSystem', state.filterOptions.subSystems, 'כל תת-המערכות', state.filters.subSystem);
    renderCheckboxDropdown('body', 'bodyName', state.filterOptions.bodies, 'כל הגופים', state.filters.bodyName);
    renderCheckboxDropdown('rank', 'rank', state.filterOptions.ranks, 'כל הדירוגים', state.filters.rank);

    const count = Object.values(state.filters).reduce((acc, v) => {
      if (Array.isArray(v)) return acc + (v.length > 0 ? 1 : 0);
      return acc + (v !== '' && v !== null ? 1 : 0);
    }, 0);
    const badge = document.getElementById('activeFilterCount');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count <= 1); // 1 is default (Year)
    }
  }

  // ── Master Update Cycle ───────────────────────────────────────

  function onFilterChange() {
    updateCascadedOptions();
    renderFilters();

    const fOverview = applyFiltersTo(state.data.overview);
    
    // Delegate to active tab controller
    switch (state.activeTab) {
      case 'overview':
        if (window.TabOverview) TabOverview.update(fOverview, state.filters.year);
        break;
      
      case 'ranks': {
        const isFiltered = (state.filters.rank && state.filters.rank.length > 0) || 
                           (state.filters.bodyName && state.filters.bodyName.length > 0) || 
                           (state.filters.system && state.filters.system.length > 0);
        if (window.TabRanks) TabRanks.update(fOverview, state.filters.year, isFiltered);
        break;
      }
      
      case 'quality':
        const fOverviewQ = applyFiltersTo(state.data.overview);
        const fPartTime = applyFiltersTo(state.data.partTime);
        const fLowWage = applyFiltersTo(state.data.lowWage);
        const fMinWage = applyFiltersTo(state.data.minWage);
        if (window.TabQuality) TabQuality.update(fPartTime, fLowWage, fMinWage, state.filters.year, fOverviewQ);
        break;
      
      case 'trends':
        // Trends ignores the year filter, so we pass it a special set filtered by system only
        let tRecords = state.data.overview;
        if (state.filters.system && state.filters.system.length > 0) {
          tRecords = tRecords.filter(r => state.filters.system.includes(r.system));
        }
        if (window.TabTrends) TabTrends.update(tRecords);
        break;

      case 'directory':
        if (window.TabDirectory) TabDirectory.update(fOverview);
        break;
    }
  }

  // ── Event Binding ─────────────────────────────────────────────

  function bindEvents() {
    // Year Filter
    const yearEl = document.getElementById('filterYear');
    if (yearEl) {
      yearEl.addEventListener('change', (e) => {
        state.filters.year = Number(e.target.value);
        state.filters.system = []; state.filters.subSystem = []; state.filters.bodyName = []; state.filters.rank = [];
        onFilterChange();
      });
    }

    // Custom Dropdowns UI Events
    ['system', 'subSystem', 'body', 'rank'].forEach(fieldId => {
      const btn = document.getElementById(`btnDropdown-${fieldId}`);
      const menu = document.getElementById(`menuDropdown-${fieldId}`);
      const search = document.getElementById(`searchDropdown-${fieldId}`);
      const list = document.getElementById(`listDropdown-${fieldId}`);
      
      if (!btn) return;

      // Toggle menu
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = menu.classList.contains('hidden');
        // Close all others
        document.querySelectorAll('[id^="menuDropdown-"]').forEach(m => m.classList.add('hidden'));
        
        if (isHidden) {
          menu.classList.remove('hidden');
          search.value = '';
          search.focus();
          
          // Reorder list: checked items at the top, alphabetically
          sortDropdownList(list);
          
          Array.from(list.children).forEach(child => child.classList.remove('hidden'));
        }
      });

      // Search filtering
      search.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        Array.from(list.children).forEach(label => {
          if (!label.tagName || label.tagName.toLowerCase() !== 'label') return;
          const text = label.textContent.toLowerCase();
          label.classList.toggle('hidden', !text.includes(val));
        });
      });
      
      // Stop propagation on menu click so it stays open when clicking checkboxes
      menu.addEventListener('click', e => e.stopPropagation());
    });

    // Close on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('[id^="menuDropdown-"]').forEach(m => m.classList.add('hidden'));
    });

    document.getElementById('btnResetFilters').addEventListener('click', () => {
      // Keep year at latest, reset rest
      const latestYear = state.filterOptions.years.length > 0 ? Math.max(...state.filterOptions.years) : 2024;
      state.filters = { year: latestYear, system: [], subSystem: [], bodyName: [], rank: [] };
      onFilterChange();
    });

    // Resize event for ECharts
    window.addEventListener('resize', () => {
      if (window.TabOverview) TabOverview.resize();
      if (window.TabRanks) TabRanks.resize();
      if (window.TabQuality) TabQuality.resize();
      if (window.TabTrends) TabTrends.resize();
    });
  }

  // ── Drill-Down API ────────────────────────────────────────────
  
  function setFilterAndRoute(filterObj, targetTabHash) {
    if (filterObj.year !== undefined) state.filters.year = Number(filterObj.year);
    if (filterObj.system !== undefined) state.filters.system = Array.isArray(filterObj.system) ? filterObj.system : (filterObj.system ? [filterObj.system] : []);
    if (filterObj.bodyName !== undefined) state.filters.bodyName = Array.isArray(filterObj.bodyName) ? filterObj.bodyName : (filterObj.bodyName ? [filterObj.bodyName] : []);
    if (filterObj.rank !== undefined) state.filters.rank = Array.isArray(filterObj.rank) ? filterObj.rank : (filterObj.rank ? [filterObj.rank] : []);

    // Update cascade and UI
    onFilterChange();
    
    // Navigate if requested
    if (targetTabHash) {
      window.location.hash = targetTabHash;
    }
  }

  return { init, state, onFilterChange, setFilterAndRoute };
})();

window.addEventListener('DOMContentLoaded', () => App.init());
