  // ── Digital Salary tab: embedded distribution/layers studio (ranks + bodies) ──
  window.DsStudio = (function () {

    // Ranks (שכר דיגיטלי דירוג) report a real salary bin per row; bodies (the "גוף" sheet
    // of the digital-salary file) only report one of these 11 fixed bands per row - there is
    // no finer resolution available for bodies at the source. Each band gets a representative
    // ₪ value so it can share the same numeric x-axis as the rank bins.
    const BAND_MIDPOINTS = {
      'קטן מ-8': 6000, '8-12': 10000, '12-16': 14000, '16-20': 18000, '20-24': 22000,
      '24-28': 26000, '28-32': 30000, '32-36': 34000, '36-40': 38000, '40-44': 42000,
      'גדול מ-44': 48000,
    };

    // Global App State
    const AppState = {
      rawData: window.SMOOTHING_RAW_DATA || [],         // rank-level, bin-level granularity
      bodyRawData: window.SMOOTHING_BODY_DATA || [],    // body-level, 11-band granularity
      availableYears: [],
      defaultYear: null,   // year assigned to newly-added series / presets
      // Entity type (rank vs body) is GLOBAL, not per-series: ranks have a real continuous
      // salary histogram while bodies only have 11 fixed bands, so mixing them in one chart
      // would be a misleading apples-to-oranges comparison. Switching this resets every
      // series to the wildcard for the new type.
      entityType: 'rank',
      metaByTypeYear: { rank: new Map(), body: new Map() }, // entityType -> year -> { groups, entityNames, entityToGroups, groupToEntities }
      genders: ['גברים', 'נשים', 'שניהם יחד'],

      // Comparison Series (Max 6)
      series: [
        {
          id: 'series-1',
          name: 'אחים ואחיות - נשים',
          entityType: 'rank',
          group: 'מערכת הבריאות',
          entityName: 'אחים ואחיות',
          gender: 'נשים',
          color: '#db2777', // Magenta/Pink
          visible: true
        },
        {
          id: 'series-2',
          name: 'אחים ואחיות - גברים',
          entityType: 'rank',
          group: 'מערכת הבריאות',
          entityName: 'אחים ואחיות',
          gender: 'גברים',
          color: '#2563eb', // Royal Blue
          visible: true
        }
      ],

      // Controls
      metric: 'COUNT_OVEDIM', // 'COUNT_OVEDIM' | 'PCT_OVEDIM' | 'TOTAL_MISROT'
      smoothType: 'spline',   // 'spline' | 'kde' | 'ma' | 'raw'
      smoothParam: 0.45,
      areaOpacity: 0.25,
      lineWidth: 3,
      showStatsLines: true,
      showPeaks: true,
      showRawPoints: false,
      zoomRange: [0, 100], // %

      // Distinct Colors for Series
      colorPalette: [
        '#db2777', // Magenta Pink
        '#2563eb', // Royal Blue
        '#10b981', // Emerald Green
        '#8b5cf6', // Violet Purple
        '#f59e0b', // Amber Orange
        '#06b6d4', // Cyan Teal
        '#ef4444', // Red
        '#64748b'  // Slate Gray
      ]
    };

    let chartInstance = null;
    let layersChartInstance = null;

    const LAYER_SEGMENTS = [
      { key: 'base',    name: 'יסוד ותוספות',      color: '#334155' },
      { key: 'extra',   name: 'עבודה נוספת',        color: '#F59E0B' },
      { key: 'expense', name: 'החזר הוצאות',        color: '#14B8A6' },
      { key: 'other',   name: 'תשלומים והפרשים',    color: '#8B5CF6' },
    ];

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // Quick-comparison presets - the list shown depends on the global דירוג/גוף toggle,
    // since the two vocabularies (rank names vs body names) are entirely different.
    const RANK_PRESETS = [
      { key: 'engineers',     emoji: '🛠️', label: 'גברים מול נשים - מהנדסים' },
      { key: 'nurses',        emoji: '👩‍⚕️', label: 'גברים מול נשים - אחים ואחיות' },
      { key: 'medical',       emoji: '🩺', label: 'גברים מול נשים - רופאים מומחים' },
      { key: 'legal',         emoji: '⚖️', label: 'גברים מול נשים - משפטנים' },
      { key: 'multi-ranks',   emoji: '🏢', label: '4 דירוגים מרכזיים' },
      { key: 'admin-sectors', emoji: '🏛️', label: 'דירוג מנהלי לפי מגזרים' },
      { key: 'overall',       emoji: '🌐', label: 'כלל המגזר הציבורי' },
    ];
    const BODY_PRESETS = [
      { key: 'body-teachers-gender', emoji: '👩‍🏫', label: 'גברים מול נשים - משרד החינוך' },
      { key: 'body-cities',          emoji: '🏙️', label: 'עיריות גדולות' },
      { key: 'body-universities',    emoji: '🎓', label: 'אוניברסיטאות מרכזיות' },
      { key: 'body-corps',           emoji: '🏦', label: 'בנק ישראל מול מפעל הפיס' },
      { key: 'body-overall',         emoji: '🌐', label: 'כלל הגופים' },
    ];

    function renderPresetButtons() {
      const container = document.getElementById('presetButtonsContainer');
      const list = AppState.entityType === 'body' ? BODY_PRESETS : RANK_PRESETS;
      container.innerHTML = list.map(p => `
        <button class="preset-btn px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition whitespace-nowrap" data-preset="${p.key}">
          ${p.emoji} ${escapeHtml(p.label)}
        </button>
      `).join('');
      container.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
      });
    }

    // Initialize once, lazily - called by TabDigitalSalary when this section is first shown
    // (this dataset is large, so we don't want it loading/computing on every page load).
    let initialized = false;
    function init() {
      if (initialized) return;
      initialized = true;
      lucide.createIcons();
      initData();
      initChart();
      initEvents();
      renderSeriesControls();
      updateDashboard();
    }

    // Called every time the digital-salary tab is shown, so ECharts recalculates sizing
    // against the now-visible container (charts initialized while a tab is display:none get 0x0).
    function resize() {
      if (chartInstance) chartInstance.resize();
      if (layersChartInstance) layersChartInstance.resize();
    }

    const ENTITY_FIELD = { rank: 'DIRUG_MEUHAD', body: 'BODY_NAME' };
    const ENTITY_WILDCARD = { rank: 'כל הדירוגים', body: 'כל הגופים' };

    function rawDataFor(entityType) {
      return entityType === 'body' ? AppState.bodyRawData : AppState.rawData;
    }

    // Extract metadata from raw data
    function initData() {
      if (!AppState.rawData || AppState.rawData.length === 0) {
        console.error('No raw data found in SMOOTHING_RAW_DATA');
        return;
      }

      document.getElementById('totalRecordsBadge').textContent =
        (AppState.rawData.length + AppState.bodyRawData.length).toLocaleString('he-IL');

      // Years are discovered from the data itself (SHANA field) - if either source file is
      // ever replaced with a richer multi-year export, every year in it shows up here
      // automatically, with no code changes.
      const yearSet = new Set();
      AppState.rawData.forEach(d => { if (d.SHANA) yearSet.add(Number(d.SHANA)); });
      AppState.bodyRawData.forEach(d => { if (d.SHANA) yearSet.add(Number(d.SHANA)); });
      AppState.availableYears = Array.from(yearSet).sort((a, b) => b - a); // newest first
      AppState.defaultYear = AppState.availableYears.includes(2024) ? 2024 : AppState.availableYears[0];

      buildAllYearsMeta();

      // Each series carries its own year (so different series can be compared across
      // years) - anything created before a year existed (initial defaults, or a series
      // whose year no longer exists) falls back to the current default year.
      AppState.series.forEach(s => {
        if (!s.year || !AppState.availableYears.includes(s.year)) {
          s.year = AppState.defaultYear;
          s.name = `${s.name} (${s.year})`;
        }
      });
    }

    // Precompute, for every (entity type, year) pair, which groups/entities exist and how
    // they cross-reference each other - used to drive the dependent group/entity dropdowns
    // in each series card, scoped to THAT series' own type+year (needed for cross-year
    // comparison, since the set of ranks/bodies reported can differ from year to year, and
    // ranks/bodies are obviously entirely different vocabularies from each other).
    function buildAllYearsMeta() {
      ['rank', 'body'].forEach(entityType => {
        const nameField = ENTITY_FIELD[entityType];
        const data = rawDataFor(entityType);
        const metaByYear = new Map();

        AppState.availableYears.forEach(year => {
          const groupSet = new Set();
          const nameSet = new Set();
          const entityToGroups = new Map();
          const groupToEntities = new Map();

          data.forEach(d => {
            if (Number(d.SHANA) !== year) return;
            const nm = d[nameField];
            if (d.KVUTZA) groupSet.add(d.KVUTZA);
            if (nm) nameSet.add(nm);
            if (d.KVUTZA && nm) {
              if (!entityToGroups.has(nm)) entityToGroups.set(nm, new Set());
              entityToGroups.get(nm).add(d.KVUTZA);
              if (!groupToEntities.has(d.KVUTZA)) groupToEntities.set(d.KVUTZA, new Set());
              groupToEntities.get(d.KVUTZA).add(nm);
            }
          });

          metaByYear.set(year, {
            groups: ['כל הקבוצות', ...Array.from(groupSet).sort((a,b) => a.localeCompare('he'))],
            entityNames: [ENTITY_WILDCARD[entityType], ...Array.from(nameSet).sort((a,b) => a.localeCompare('he'))],
            entityToGroups,
            groupToEntities
          });
        });

        AppState.metaByTypeYear[entityType] = metaByYear;
      });
    }

    // Groups selectable given a chosen entity (rank or body), within a specific type+year
    function getAvailableGroups(entityName, year, entityType) {
      const meta = AppState.metaByTypeYear[entityType].get(year);
      if (!meta) return ['כל הקבוצות'];
      if (!entityName || entityName === ENTITY_WILDCARD[entityType]) return meta.groups;
      const valid = meta.entityToGroups.get(entityName) || new Set();
      return ['כל הקבוצות', ...meta.groups.filter(g => g !== 'כל הקבוצות' && valid.has(g))];
    }

    // Ranks/bodies selectable given a chosen group, within a specific type+year
    function getAvailableEntityNames(group, year, entityType) {
      const meta = AppState.metaByTypeYear[entityType].get(year);
      const wildcard = ENTITY_WILDCARD[entityType];
      if (!meta) return [wildcard];
      if (!group || group === 'כל הקבוצות') return meta.entityNames;
      const valid = meta.groupToEntities.get(group) || new Set();
      return [wildcard, ...meta.entityNames.filter(n => n !== wildcard && valid.has(n))];
    }

    // Initialize ECharts Instance
    function initChart() {
      const chartDom = document.getElementById('mainChart');
      chartInstance = echarts.init(chartDom, null, { renderer: 'canvas' });

      const layersDom = document.getElementById('chartLayers');
      layersChartInstance = echarts.init(layersDom, null, { renderer: 'canvas' });

      window.addEventListener('resize', () => {
        if (chartInstance) chartInstance.resize();
        if (layersChartInstance) layersChartInstance.resize();
      });
    }

    // Setup UI Event Listeners
    function initEvents() {
      // Methodology panel toggle
      document.getElementById('btnSmoothingMethodology').addEventListener('click', () => {
        document.getElementById('smoothingMethodologyPanel').classList.toggle('hidden');
      });

      // Global entity-type toggle (rank vs body) - applies to every series at once. Ranks
      // and bodies can't be mixed in one chart, so switching resets every series to the
      // wildcard for the new type.
      document.querySelectorAll('.entity-type-global-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (AppState.entityType === btn.dataset.type) return;
          AppState.entityType = btn.dataset.type;
          AppState.series.forEach(s => {
            s.entityType = AppState.entityType;
            s.entityName = ENTITY_WILDCARD[AppState.entityType];
            s.group = 'כל הקבוצות';
            autoUpdateSeriesName(s);
          });
          renderEntityTypeGlobalButtons();
          updateSmoothingAvailability();
          renderPresetButtons();
          renderSeriesControls();
          updateDashboard();
        });
      });
      renderEntityTypeGlobalButtons();
      updateSmoothingAvailability();
      renderPresetButtons();

      // Close any open entity-search dropdown (body mode) when clicking elsewhere
      document.addEventListener('click', (e) => {
        document.querySelectorAll('.entity-search-dropdown').forEach(dd => {
          const input = document.querySelector(`.entity-search-input[data-id="${dd.dataset.id}"]`);
          if (!dd.contains(e.target) && e.target !== input) dd.classList.add('hidden');
        });
      });

      // Add Series button
      document.getElementById('btnAddSeries').addEventListener('click', () => {
        if (AppState.series.length >= 6) {
          alert('ניתן להציג עד 6 סדרות במקביל להשוואה ברורה ומדויקת.');
          return;
        }
        const newColor = AppState.colorPalette[AppState.series.length % AppState.colorPalette.length];
        // Start from the previous series' year+rank rather than a blank 'all' series -
        // usually you're adding a series to tweak one thing (e.g. compare genders or
        // years), not build a whole new filter from scratch.
        const prevSeries = AppState.series[AppState.series.length - 1];
        const entityType = AppState.entityType;
        const newSeries = {
          id: 'series-' + Date.now(),
          entityType,
          group: 'כל הקבוצות',
          entityName: prevSeries ? prevSeries.entityName : ENTITY_WILDCARD[entityType],
          gender: 'שניהם יחד',
          year: prevSeries ? prevSeries.year : AppState.defaultYear,
          color: newColor,
          visible: true
        };
        autoUpdateSeriesName(newSeries);
        AppState.series.push(newSeries);
        renderSeriesControls();
        updateDashboard();
      });

      // Metric toggle buttons
      document.querySelectorAll('.metric-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.metric-btn').forEach(b => {
            b.classList.remove('active', 'bg-white', 'text-blue-700', 'shadow-sm');
            b.classList.add('text-slate-600');
          });
          btn.classList.add('active', 'bg-white', 'text-blue-700', 'shadow-sm');
          btn.classList.remove('text-slate-600');
          AppState.metric = btn.dataset.metric;
          
          // Update label
          const labels = {
            'COUNT_OVEDIM': 'כמות עובדים',
            'PCT_OVEDIM': 'אחוז עובדים (%)',
            'TOTAL_MISROT': 'היקף משרות'
          };
          document.getElementById('yAxisLabelTxt').textContent = labels[AppState.metric];
          updateDashboard();
        });
      });

      // Smoothing Algorithm Radios
      document.querySelectorAll('input[name="smoothType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          AppState.smoothType = e.target.value;
          updateSmoothingSliderConfig();
          updateDashboard();
        });
      });

      // Smooth intensity slider
      const smoothSlider = document.getElementById('smoothIntensitySlider');
      smoothSlider.addEventListener('input', (e) => {
        AppState.smoothParam = parseFloat(e.target.value);
        document.getElementById('smoothParamVal').textContent = AppState.smoothParam.toFixed(2);
        updateDashboard();
      });

      // Area Opacity Slider
      const opacitySlider = document.getElementById('areaOpacitySlider');
      opacitySlider.addEventListener('input', (e) => {
        AppState.areaOpacity = parseInt(e.target.value) / 100;
        document.getElementById('opacityVal').textContent = e.target.value + '%';
        updateDashboard();
      });

      // Line Width Slider
      const widthSlider = document.getElementById('lineWidthSlider');
      widthSlider.addEventListener('input', (e) => {
        AppState.lineWidth = parseInt(e.target.value);
        document.getElementById('lineWidthVal').textContent = e.target.value + 'px';
        updateDashboard();
      });

      // Reference Toggles
      document.getElementById('chkShowStatsLines').addEventListener('change', (e) => {
        AppState.showStatsLines = e.target.checked;
        updateDashboard();
      });
      document.getElementById('chkShowPeaks').addEventListener('change', (e) => {
        AppState.showPeaks = e.target.checked;
        updateDashboard();
      });
      document.getElementById('chkShowRawPoints').addEventListener('change', (e) => {
        AppState.showRawPoints = e.target.checked;
        updateDashboard();
      });

      // Quick Zoom Range Buttons
      document.querySelectorAll('.range-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const range = btn.dataset.range;
          if (range === 'all') {
            AppState.zoomRange = [0, 100];
          } else {
            const [minS, maxS] = range.split(',').map(Number);
            const maxPct = Math.min(100, Math.round((maxS / 130000) * 100));
            AppState.zoomRange = [0, maxPct];
          }
          if (chartInstance) {
            chartInstance.dispatchAction({
              type: 'dataZoom',
              start: AppState.zoomRange[0],
              end: AppState.zoomRange[1]
            });
          }
        });
      });

      document.getElementById('btnResetZoom').addEventListener('click', () => {
        AppState.zoomRange = [0, 100];
        if (chartInstance) {
          chartInstance.dispatchAction({
            type: 'dataZoom',
            start: 0,
            end: 100
          });
        }
      });

      // Export Actions
      document.getElementById('btnExportImage').addEventListener('click', () => {
        if (!chartInstance) return;
        const url = chartInstance.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });
        const a = document.createElement('a');
        a.href = url;
        a.download = `התפלגות_שכר_${new Date().toISOString().slice(0,10)}.png`;
        a.click();
      });

      document.getElementById('btnExportCSV').addEventListener('click', exportCSV);

      // Collapsible Table
      document.getElementById('btnToggleTable').addEventListener('click', () => {
        const container = document.getElementById('tableContainer');
        const chevron = document.getElementById('tableChevron');
        const isHidden = container.classList.contains('hidden');
        if (isHidden) {
          container.classList.remove('hidden');
          chevron.style.transform = 'rotate(180deg)';
        } else {
          container.classList.add('hidden');
          chevron.style.transform = 'rotate(0deg)';
        }
      });
    }

    // Configure slider based on chosen algorithm
    function updateSmoothingSliderConfig() {
      const slider = document.getElementById('smoothIntensitySlider');
      const valLabel = document.getElementById('smoothParamVal');
      const container = document.getElementById('smoothSliderContainer');

      if (AppState.smoothType === 'spline') {
        container.style.opacity = '1';
        slider.disabled = false;
        slider.min = '0.1';
        slider.max = '0.9';
        slider.step = '0.05';
        AppState.smoothParam = 0.45;
        slider.value = '0.45';
        valLabel.textContent = '0.45';
      } else if (AppState.smoothType === 'kde') {
        container.style.opacity = '1';
        slider.disabled = false;
        slider.min = '1000';
        slider.max = '8000';
        slider.step = '500';
        AppState.smoothParam = 3000;
        slider.value = '3000';
        valLabel.textContent = '3,000 ₪';
      } else if (AppState.smoothType === 'ma') {
        container.style.opacity = '1';
        slider.disabled = false;
        slider.min = '2';
        slider.max = '10';
        slider.step = '1';
        AppState.smoothParam = 4;
        slider.value = '4';
        valLabel.textContent = '4 מדרגות';
      } else {
        container.style.opacity = '0.4';
        slider.disabled = true;
        valLabel.textContent = 'ללא';
      }
    }

    // Style the global rank/body toggle buttons to reflect AppState.entityType
    function renderEntityTypeGlobalButtons() {
      const isRank = AppState.entityType === 'rank';
      const rankBtn = document.getElementById('btnEntityTypeRank');
      const bodyBtn = document.getElementById('btnEntityTypeBody');
      rankBtn.classList.toggle('bg-white', isRank);
      rankBtn.classList.toggle('text-blue-700', isRank);
      rankBtn.classList.toggle('shadow-sm', isRank);
      rankBtn.classList.toggle('text-slate-500', !isRank);
      bodyBtn.classList.toggle('bg-white', !isRank);
      bodyBtn.classList.toggle('text-blue-700', !isRank);
      bodyBtn.classList.toggle('shadow-sm', !isRank);
      bodyBtn.classList.toggle('text-slate-500', isRank);
    }

    // Bodies only have 11 discrete bands - there's no continuum to smooth, so the whole
    // smoothing-algorithm section is disabled and the chart renders as discrete bars instead.
    function updateSmoothingAvailability() {
      const isBody = AppState.entityType === 'body';
      document.getElementById('smoothAlgorithmSection').classList.toggle('hidden', isBody);
      document.getElementById('smoothSliderContainer').classList.toggle('hidden', isBody);
      document.getElementById('smoothNotAvailableNote').classList.toggle('hidden', !isBody);
    }

    // Apply Presets
    function applyPreset(presetKey) {
      if (presetKey === 'engineers') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'מהנדסים - נשים',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'מהנדסים',
            gender: 'נשים',
            color: '#db2777',
            visible: true
          },
          {
            id: 'series-2',
            name: 'מהנדסים - גברים',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'מהנדסים',
            gender: 'גברים',
            color: '#2563eb',
            visible: true
          }
        ];
      } else if (presetKey === 'nurses') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'אחים ואחיות - נשים',
            entityType: 'rank',
            group: 'מערכת הבריאות',
            entityName: 'אחים ואחיות',
            gender: 'נשים',
            color: '#db2777',
            visible: true
          },
          {
            id: 'series-2',
            name: 'אחים ואחיות - גברים',
            entityType: 'rank',
            group: 'מערכת הבריאות',
            entityName: 'אחים ואחיות',
            gender: 'גברים',
            color: '#2563eb',
            visible: true
          }
        ];
      } else if (presetKey === 'medical') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'רופאים מומחים - נשים',
            entityType: 'rank',
            group: 'מערכת הבריאות',
            entityName: 'רופאים מומחים',
            gender: 'נשים',
            color: '#db2777',
            visible: true
          },
          {
            id: 'series-2',
            name: 'רופאים מומחים - גברים',
            entityType: 'rank',
            group: 'מערכת הבריאות',
            entityName: 'רופאים מומחים',
            gender: 'גברים',
            color: '#2563eb',
            visible: true
          }
        ];
      } else if (presetKey === 'legal') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'משפטנים - נשים',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'משפטנים',
            gender: 'נשים',
            color: '#db2777',
            visible: true
          },
          {
            id: 'series-2',
            name: 'משפטנים - גברים',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'משפטנים',
            gender: 'גברים',
            color: '#2563eb',
            visible: true
          }
        ];
      } else if (presetKey === 'multi-ranks') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'אחים ואחיות',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'אחים ואחיות',
            gender: 'שניהם יחד',
            color: '#10b981',
            visible: true
          },
          {
            id: 'series-2',
            name: 'עובדי הוראה',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'עובדי הוראה',
            gender: 'שניהם יחד',
            color: '#8b5cf6',
            visible: true
          },
          {
            id: 'series-3',
            name: 'רופאים מומחים',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'רופאים מומחים',
            gender: 'שניהם יחד',
            color: '#2563eb',
            visible: true
          },
          {
            id: 'series-4',
            name: 'מנהלי',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'מנהלי',
            gender: 'שניהם יחד',
            color: '#f59e0b',
            visible: true
          }
        ];
      } else if (presetKey === 'admin-sectors') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'מנהלי - שלטון מקומי',
            entityType: 'rank',
            group: 'שלטון מקומי',
            entityName: 'מנהלי',
            gender: 'שניהם יחד',
            color: '#2563eb',
            visible: true
          },
          {
            id: 'series-2',
            name: 'מנהלי - משרדי ממשלה',
            entityType: 'rank',
            group: 'משרדי ממשלה',
            entityName: 'מנהלי',
            gender: 'שניהם יחד',
            color: '#10b981',
            visible: true
          },
          {
            id: 'series-3',
            name: 'מנהלי - מערכת הבריאות',
            entityType: 'rank',
            group: 'מערכת הבריאות',
            entityName: 'מנהלי',
            gender: 'שניהם יחד',
            color: '#f59e0b',
            visible: true
          }
        ];
      } else if (presetKey === 'overall') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'כלל המגזר - נשים',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'כל הדירוגים',
            gender: 'נשים',
            color: '#db2777',
            visible: true
          },
          {
            id: 'series-2',
            name: 'כלל המגזר - גברים',
            entityType: 'rank',
            group: 'כל הקבוצות',
            entityName: 'כל הדירוגים',
            gender: 'גברים',
            color: '#2563eb',
            visible: true
          }
        ];
      } else if (presetKey === 'body-teachers-gender') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'משרד החינוך - מורים - נשים',
            entityType: 'body',
            group: 'מערכת החינוך',
            entityName: 'משרד החינוך - מורים',
            gender: 'נשים',
            color: '#db2777',
            visible: true
          },
          {
            id: 'series-2',
            name: 'משרד החינוך - מורים - גברים',
            entityType: 'body',
            group: 'מערכת החינוך',
            entityName: 'משרד החינוך - מורים',
            gender: 'גברים',
            color: '#2563eb',
            visible: true
          }
        ];
      } else if (presetKey === 'body-cities') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'עיריית תל אביב- יפו',
            entityType: 'body',
            group: 'שלטון מקומי',
            entityName: 'עיריית תל אביב- יפו',
            gender: 'שניהם יחד',
            color: '#2563eb',
            visible: true
          },
          {
            id: 'series-2',
            name: 'עיריית ירושלים',
            entityType: 'body',
            group: 'שלטון מקומי',
            entityName: 'עיריית ירושלים',
            gender: 'שניהם יחד',
            color: '#10b981',
            visible: true
          },
          {
            id: 'series-3',
            name: 'עיריית חיפה',
            entityType: 'body',
            group: 'שלטון מקומי',
            entityName: 'עיריית חיפה',
            gender: 'שניהם יחד',
            color: '#f59e0b',
            visible: true
          }
        ];
      } else if (presetKey === 'body-universities') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'אוניברסיטת תל-אביב',
            entityType: 'body',
            group: 'גופים נתמכים במערכת ההשכלה הגבוהה',
            entityName: 'אוניברסיטת תל-אביב',
            gender: 'שניהם יחד',
            color: '#2563eb',
            visible: true
          },
          {
            id: 'series-2',
            name: 'האוניברסיטה העברית בי-ם',
            entityType: 'body',
            group: 'גופים נתמכים במערכת ההשכלה הגבוהה',
            entityName: 'האוניברסיטה העברית בי-ם',
            gender: 'שניהם יחד',
            color: '#10b981',
            visible: true
          },
          {
            id: 'series-3',
            name: 'אוניברסיטת בן גוריון בנגב',
            entityType: 'body',
            group: 'גופים נתמכים במערכת ההשכלה הגבוהה',
            entityName: 'אוניברסיטת בן גוריון בנגב',
            gender: 'שניהם יחד',
            color: '#f59e0b',
            visible: true
          }
        ];
      } else if (presetKey === 'body-corps') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'בנק ישראל',
            entityType: 'body',
            group: 'תאגידים',
            entityName: 'בנק ישראל',
            gender: 'שניהם יחד',
            color: '#2563eb',
            visible: true
          },
          {
            id: 'series-2',
            name: 'מפעל הפיס',
            entityType: 'body',
            group: 'תאגידים',
            entityName: 'מפעל הפיס',
            gender: 'שניהם יחד',
            color: '#db2777',
            visible: true
          }
        ];
      } else if (presetKey === 'body-overall') {
        AppState.series = [
          {
            id: 'series-1',
            name: 'כלל הגופים - נשים',
            entityType: 'body',
            group: 'כל הקבוצות',
            entityName: 'כל הגופים',
            gender: 'נשים',
            color: '#db2777',
            visible: true
          },
          {
            id: 'series-2',
            name: 'כלל הגופים - גברים',
            entityType: 'body',
            group: 'כל הקבוצות',
            entityName: 'כל הגופים',
            gender: 'גברים',
            color: '#2563eb',
            visible: true
          }
        ];
      }

      // Presets don't specify a year explicitly - start on the default year. The entity
      // type is derived from the preset itself (all its series share one type by
      // construction) rather than hardcoded, since presets now cover both rank and body.
      AppState.entityType = AppState.series[0].entityType;
      AppState.series.forEach(s => { s.year = AppState.defaultYear; s.name = `${s.name} (${s.year})`; });
      renderEntityTypeGlobalButtons();
      updateSmoothingAvailability();

      renderSeriesControls();
      updateDashboard();
    }

    // Render Series List UI
    function renderSeriesControls() {
      const container = document.getElementById('seriesList');
      container.innerHTML = '';

      document.getElementById('seriesCountBadge').textContent = `${AppState.series.length} / 6`;

      AppState.series.forEach((s, idx) => {
        // Every series carries its own year, so different series can be pinned to
        // different years for comparison; fall back to the default if it's ever missing.
        if (!s.year || !AppState.availableYears.includes(s.year)) s.year = AppState.defaultYear;

        // Entity type is a global setting (see btnEntityTypeRank/Body) - every series is kept
        // in sync with it. Defensive normalization: if entity+group ended up incompatible
        // with this series' year (e.g. a year change, a global type switch, or a preset
        // combo that doesn't exist that year), fall back the group to 'all' rather than
        // rendering a dead selection.
        s.entityType = AppState.entityType;
        const meta = AppState.metaByTypeYear[s.entityType].get(s.year);
        if (s.entityName !== ENTITY_WILDCARD[s.entityType] && s.group !== 'כל הקבוצות') {
          const groupsForEntity = meta && meta.entityToGroups.get(s.entityName);
          if (!groupsForEntity || !groupsForEntity.has(s.group)) {
            s.group = 'כל הקבוצות';
          }
        }

        const card = document.createElement('div');
        card.className = `series-card rounded-xl p-3 border ${s.visible ? 'bg-white border-slate-200' : 'bg-slate-50/70 border-dashed border-slate-300 opacity-60'}`;
        card.id = `card-${s.id}`;

        // Dependent dropdowns: only offer entities that exist in the chosen group THAT
        // TYPE+YEAR, and only offer groups that actually have the chosen entity THAT TYPE+YEAR.
        const availableEntityNames = getAvailableEntityNames(s.group, s.year, s.entityType);
        const availableGroups = getAvailableGroups(s.entityName, s.year, s.entityType);

        const yearOptionsHtml = AppState.availableYears.map(y => {
          return `<option value="${y}" ${y === s.year ? 'selected' : ''}>${y}</option>`;
        }).join('');

        const entityOptionsHtml = availableEntityNames.map(n => {
          return `<option value="${escapeHtml(n)}" ${n === s.entityName ? 'selected' : ''}>${escapeHtml(n)}</option>`;
        }).join('');

        const groupOptionsHtml = availableGroups.map(g => {
          return `<option value="${escapeHtml(g)}" ${g === s.group ? 'selected' : ''}>${escapeHtml(g)}</option>`;
        }).join('');

        const genderOptionsHtml = AppState.genders.map(gen => {
          return `<option value="${gen}" ${gen === s.gender ? 'selected' : ''}>${gen}</option>`;
        }).join('');

        card.innerHTML = `
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 flex-1">
              <span class="w-3 h-3 rounded-full shrink-0 shadow-sm" style="background-color: ${s.color};"></span>
              <input type="text" value="${escapeHtml(s.name)}" class="series-name-input text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full truncate" data-id="${s.id}">
            </div>

            <div class="flex items-center gap-1">
              <button class="btn-toggle-vis p-1 text-slate-400 hover:text-slate-700 rounded" data-id="${s.id}" title="${s.visible ? 'הסתר מהגרף' : 'הצג בגרף'}">
                <i data-lucide="${s.visible ? 'eye' : 'eye-off'}" class="w-3.5 h-3.5"></i>
              </button>
              <input type="color" value="${s.color}" class="color-picker-input w-5 h-5 rounded cursor-pointer border-0 bg-transparent" data-id="${s.id}" title="שנה צבע סדרה">
              ${AppState.series.length > 1 ? `
                <button class="btn-del-series p-1 text-red-400 hover:text-red-600 rounded" data-id="${s.id}" title="מחק סדרה">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="space-y-1.5 text-[11px]">
            <div class="flex items-center gap-2">
              <label class="shrink-0 whitespace-nowrap text-[10px] text-slate-400 font-medium">שנה:</label>
              <select class="year-select flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-bold focus:ring-1 focus:ring-blue-500" data-id="${s.id}">
                ${yearOptionsHtml}
              </select>
            </div>

            <div class="flex items-center gap-2 relative">
              <label class="shrink-0 whitespace-nowrap text-[10px] text-slate-400 font-medium">${s.entityType === 'body' ? 'גוף:' : 'דירוג:'}</label>
              ${s.entityType === 'body' ? `
                <input type="text" class="entity-search-input flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-blue-500" data-id="${s.id}" autocomplete="off" placeholder="🔍 חפש גוף..." value="${s.entityName === ENTITY_WILDCARD.body ? '' : escapeHtml(s.entityName)}">
                <div class="entity-search-dropdown hidden absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100" data-id="${s.id}"></div>
              ` : `
                <select class="entity-select flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-blue-500" data-id="${s.id}">
                  ${entityOptionsHtml}
                </select>
              `}
            </div>

            <div class="flex items-center gap-2">
              <label class="shrink-0 whitespace-nowrap text-[10px] text-slate-400 font-medium">קבוצה:</label>
              <select class="group-select flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-blue-500" data-id="${s.id}">
                ${groupOptionsHtml}
              </select>
            </div>

            <div class="flex items-center gap-2">
              <label class="shrink-0 whitespace-nowrap text-[10px] text-slate-400 font-medium">מגדר:</label>
              <select class="gender-select flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-blue-500" data-id="${s.id}">
                ${genderOptionsHtml}
              </select>
            </div>
          </div>
        `;

        container.appendChild(card);
      });

      lucide.createIcons();
      bindSeriesCardEvents();
    }

    function bindSeriesCardEvents() {
      // Name edit
      document.querySelectorAll('.series-name-input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const s = AppState.series.find(x => x.id === e.target.dataset.id);
          if (s) {
            s.name = e.target.value.trim() || 'סדרה';
            updateDashboard();
          }
        });
      });

      // Visibility toggle
      document.querySelectorAll('.btn-toggle-vis').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const s = AppState.series.find(x => x.id === btn.dataset.id);
          if (s) {
            s.visible = !s.visible;
            renderSeriesControls();
            updateDashboard();
          }
        });
      });

      // Color picker
      document.querySelectorAll('.color-picker-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const s = AppState.series.find(x => x.id === inp.dataset.id);
          if (s) {
            s.color = e.target.value;
            renderSeriesControls();
            updateDashboard();
          }
        });
      });

      // Delete series
      document.querySelectorAll('.btn-del-series').forEach(btn => {
        btn.addEventListener('click', (e) => {
          AppState.series = AppState.series.filter(x => x.id !== btn.dataset.id);
          renderSeriesControls();
          updateDashboard();
        });
      });

      // Year Select (per-series - this is what enables comparing the same entity/group
      // across different years)
      document.querySelectorAll('.year-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const s = AppState.series.find(x => x.id === sel.dataset.id);
          if (s) {
            s.year = Number(e.target.value);
            // The entity/group combo might not exist in the newly chosen year
            const meta = AppState.metaByTypeYear[s.entityType].get(s.year);
            if (s.entityName !== ENTITY_WILDCARD[s.entityType] && s.group !== 'כל הקבוצות') {
              const validGroups = meta && meta.entityToGroups.get(s.entityName);
              if (!validGroups || !validGroups.has(s.group)) {
                s.group = 'כל הקבוצות';
              }
            }
            autoUpdateSeriesName(s);
            renderSeriesControls();
            updateDashboard();
          }
        });
      });

      // Entity Select (rank name or body name, depending on s.entityType)
      document.querySelectorAll('.entity-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const s = AppState.series.find(x => x.id === sel.dataset.id);
          if (s) selectEntityForSeries(s, e.target.value);
        });
      });

      // Entity search box (body mode only - hundreds of bodies makes a plain <select>
      // unusable, so this filters as you type instead).
      document.querySelectorAll('.entity-search-input').forEach(inp => {
        const dropdown = document.querySelector(`.entity-search-dropdown[data-id="${inp.dataset.id}"]`);
        if (!dropdown) return;
        const open = () => {
          const s = AppState.series.find(x => x.id === inp.dataset.id);
          if (s) {
            renderEntitySearchResults(s, dropdown, inp.value);
            dropdown.classList.remove('hidden');
          }
        };
        inp.addEventListener('focus', open);
        inp.addEventListener('input', open);
      });

      // Group Select
      document.querySelectorAll('.group-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const s = AppState.series.find(x => x.id === sel.dataset.id);
          if (s) {
            s.group = e.target.value;
            // If the selected group does not have the currently selected entity (this series' type+year), reset entity to the wildcard
            if (s.group !== 'כל הקבוצות' && s.entityName !== ENTITY_WILDCARD[s.entityType]) {
              const meta = AppState.metaByTypeYear[s.entityType].get(s.year);
              const validEntities = meta && meta.groupToEntities.get(s.group);
              if (!validEntities || !validEntities.has(s.entityName)) {
                s.entityName = ENTITY_WILDCARD[s.entityType];
              }
            }
            autoUpdateSeriesName(s);
            renderSeriesControls();
            updateDashboard();
          }
        });
      });

      // Gender Select
      document.querySelectorAll('.gender-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const s = AppState.series.find(x => x.id === sel.dataset.id);
          if (s) {
            s.gender = e.target.value;
            autoUpdateSeriesName(s);
            renderSeriesControls();
            updateDashboard();
          }
        });
      });
    }

    function autoUpdateSeriesName(s) {
      let parts = [];
      if (s.entityName !== ENTITY_WILDCARD[s.entityType]) parts.push(s.entityName);
      if (s.group !== 'כל הקבוצות') parts.push(s.group);
      if (s.gender !== 'שניהם יחד') parts.push(s.gender);
      const base = parts.length > 0 ? parts.join(' - ') : (s.entityType === 'body' ? 'כלל הגופים' : 'כלל הדירוגים');
      s.name = `${base} (${s.year})`;
    }

    // Shared by the rank <select> and the body search-box: apply a new entity choice to a
    // series, resetting the group if it's no longer compatible, then re-render.
    function selectEntityForSeries(s, value) {
      s.entityName = value;
      if (s.entityName !== ENTITY_WILDCARD[s.entityType] && s.group !== 'כל הקבוצות') {
        const meta = AppState.metaByTypeYear[s.entityType].get(s.year);
        const validGroups = meta && meta.entityToGroups.get(s.entityName);
        if (!validGroups || !validGroups.has(s.group)) {
          s.group = 'כל הקבוצות';
        }
      }
      autoUpdateSeriesName(s);
      renderSeriesControls();
      updateDashboard();
    }

    // Populate the body-mode entity search dropdown with matches for the current query
    // (substring, case-insensitive) - there are hundreds of bodies, so a plain <select>
    // isn't usable and this needs real filtering.
    function renderEntitySearchResults(s, dropdown, query) {
      const wildcard = ENTITY_WILDCARD[s.entityType];
      const available = getAvailableEntityNames(s.group, s.year, s.entityType).filter(n => n !== wildcard);
      const q = (query || '').trim().toLowerCase();
      const matches = q ? available.filter(n => n.toLowerCase().includes(q)).slice(0, 30) : available.slice(0, 20);

      let html = `<div class="entity-search-item p-2 text-slate-500 font-semibold cursor-pointer hover:bg-slate-100" data-value="${escapeHtml(wildcard)}" data-id="${s.id}">${escapeHtml(wildcard)}</div>`;
      if (matches.length === 0) {
        html += `<div class="p-2 text-slate-400 text-center">לא נמצאו תוצאות</div>`;
      } else {
        html += matches.map(n => `<div class="entity-search-item p-2 hover:bg-blue-50 cursor-pointer" data-value="${escapeHtml(n)}" data-id="${s.id}">${escapeHtml(n)}</div>`).join('');
        if (!q && available.length > 20) {
          html += `<div class="p-2 text-slate-400 text-center text-[11px]">... הקלידו לחיפוש בין ${available.length} גופים</div>`;
        }
      }
      dropdown.innerHTML = html;

      dropdown.querySelectorAll('.entity-search-item').forEach(item => {
        item.addEventListener('click', () => {
          const ser = AppState.series.find(x => x.id === item.dataset.id);
          if (ser) selectEntityForSeries(ser, item.dataset.value);
        });
      });
    }

    // Filter and Aggregate Data for a given Series
    function computeSeriesData(s) {
      const nameField = ENTITY_FIELD[s.entityType];
      const wildcard = ENTITY_WILDCARD[s.entityType];
      const filtered = rawDataFor(s.entityType).filter(d => {
        if (Number(d.SHANA) !== s.year) return false;
        if (s.group !== 'כל הקבוצות' && d.KVUTZA !== s.group) return false;
        if (s.entityName !== wildcard && d[nameField] !== s.entityName) return false;
        if (s.gender !== 'שניהם יחד' && d.NAME_MIN !== s.gender) return false;
        return true;
      });

      if (filtered.length === 0) {
        return {
          seriesId: s.id,
          seriesName: s.name,
          color: s.color,
          visible: s.visible,
          totalEmployees: 0,
          totalMisrot: 0,
          weightedMean: 0,
          medianSalary: 0,
          modeSalary: 0,
          stdDev: 0,
          preciseAvgWage: null,
          preciseAvgCost: null,
          layerPct: null,
          bins: new Map(),
          sortedBins: []
        };
      }

      // Aggregate by SALARY_MIDPOINT
      const bins = new Map();
      let totalEmployees = 0;
      let totalMisrot = 0;
      let weightedSalarySum = 0;

      // Salary-layer / precise-wage sums (same fields & formula as the "שכר דיגיטלי" tab's
      // build_salary_ranges_bundle.py, just aggregated live here instead of pre-baked per rank)
      let posMonths = 0, sumGross = 0, sumCost = 0;
      let lBase = 0, lAdd = 0, lExtra = 0, lExp = 0, lOther = 0;

      filtered.forEach(d => {
        // Ranks report a real SALARY_MIDPOINT bin; bodies only report one of 11 fixed bands
        // (BAND), which is mapped to a representative ₪ value so both entity types share the
        // same numeric x-axis.
        const salary = s.entityType === 'body' ? (BAND_MIDPOINTS[d.BAND] || 0) : (Number(d.SALARY_MIDPOINT) || 0);
        const count = Number(d.COUNT_OVEDIM) || 0;
        const misrot = Number(d.TOTAL_MISROT) || 0;
        const avgSal = Number(d.AVG_SALARY_IN_BIN) || salary;

        if (!bins.has(salary)) {
          bins.set(salary, { salary, count: 0, misrot: 0, weightedSum: 0 });
        }
        const b = bins.get(salary);
        b.count += count;
        b.misrot += misrot;
        b.weightedSum += count * avgSal;

        totalEmployees += count;
        totalMisrot += misrot;
        weightedSalarySum += count * avgSal;

        posMonths += Number(d.posMonths) || 0;
        sumGross += Number(d.sumGross) || 0;
        sumCost += Number(d.sumCost) || 0;
        lBase += Number(d.lBase) || 0;
        lAdd += Number(d.lAdd) || 0;
        lExtra += Number(d.lExtra) || 0;
        lExp += Number(d.lExp) || 0;
        lOther += Number(d.lOther) || 0;
      });

      const preciseAvgWage = posMonths > 0 ? Math.round(sumGross / posMonths) : null;
      const preciseAvgCost = posMonths > 0 ? Math.round(sumCost / posMonths) : null;

      const layerBaseCombined = lBase + lAdd; // "יסוד ותוספות"
      const layersTotal = layerBaseCombined + lExtra + lExp + lOther;
      const layerPct = layersTotal > 0 ? {
        base: layerBaseCombined / layersTotal,
        extra: lExtra / layersTotal,
        expense: lExp / layersTotal,
        other: lOther / layersTotal,
      } : null;

      const sortedBins = Array.from(bins.values()).sort((a,b) => a.salary - b.salary);
      const weightedMean = totalEmployees > 0 ? Math.round(weightedSalarySum / totalEmployees) : 0;

      // Compute estimated median
      let medianSalary = 0;
      let cumulative = 0;
      const halfTotal = totalEmployees / 2;
      for (const b of sortedBins) {
        cumulative += b.count;
        if (cumulative >= halfTotal) {
          medianSalary = b.salary;
          break;
        }
      }

      // Compute mode (Peak)
      let modeSalary = 0;
      let maxCount = -1;
      sortedBins.forEach(b => {
        if (b.count > maxCount) {
          maxCount = b.count;
          modeSalary = b.salary;
        }
      });

      // Compute standard deviation
      let varianceSum = 0;
      sortedBins.forEach(b => {
        varianceSum += b.count * Math.pow(b.salary - weightedMean, 2);
      });
      const stdDev = totalEmployees > 1 ? Math.round(Math.sqrt(varianceSum / totalEmployees)) : 0;

      return {
        seriesId: s.id,
        seriesName: s.name,
        color: s.color,
        visible: s.visible,
        totalEmployees,
        totalMisrot: Math.round(totalMisrot * 10) / 10,
        weightedMean,
        medianSalary,
        modeSalary,
        stdDev,
        preciseAvgWage,
        preciseAvgCost,
        layerPct,
        bins,
        sortedBins
      };
    }

    // Apply Smoothing Algorithms
    function generateSmoothedPoints(computedSeries, allSalarySteps) {
      if (!computedSeries || computedSeries.totalEmployees === 0) return [];

      const metric = AppState.metric;
      const smoothType = AppState.smoothType;
      const param = AppState.smoothParam;

      const rawPoints = allSalarySteps.map(sal => {
        const b = computedSeries.bins.get(sal);
        let val = 0;
        if (b) {
          if (metric === 'COUNT_OVEDIM') val = b.count;
          else if (metric === 'PCT_OVEDIM') val = computedSeries.totalEmployees > 0 ? (b.count / computedSeries.totalEmployees) * 100 : 0;
          else if (metric === 'TOTAL_MISROT') val = b.misrot;
        }
        return [sal, val];
      });

      if (smoothType === 'raw' || smoothType === 'spline') {
        return rawPoints;
      }

      if (smoothType === 'ma') {
        const windowSize = Math.max(2, Math.round(param));
        const smoothed = [];
        for (let i = 0; i < rawPoints.length; i++) {
          let sum = 0;
          let weightSum = 0;
          for (let j = Math.max(0, i - windowSize); j <= Math.min(rawPoints.length - 1, i + windowSize); j++) {
            const dist = Math.abs(i - j);
            const w = Math.exp(-Math.pow(dist / (windowSize / 2), 2));
            sum += rawPoints[j][1] * w;
            weightSum += w;
          }
          const smoothedVal = weightSum > 0 ? sum / weightSum : 0;
          smoothed.push([rawPoints[i][0], Math.round(smoothedVal * 100) / 100]);
        }
        return smoothed;
      }

      if (smoothType === 'kde') {
        const bandwidth = param || 3000;
        const total = computedSeries.totalEmployees;
        if (total === 0) return rawPoints;

        const nonZeroBins = computedSeries.sortedBins.filter(b => b.count > 0);

        const kdePoints = allSalarySteps.map(x => {
          let density = 0;
          nonZeroBins.forEach(b => {
            const u = (x - b.salary) / bandwidth;
            const k = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
            density += b.count * k;
          });
          const normalizedDensity = density / bandwidth;
          
          let yVal = 0;
          if (metric === 'COUNT_OVEDIM') {
            yVal = normalizedDensity * 1000;
          } else if (metric === 'PCT_OVEDIM') {
            yVal = (normalizedDensity * 1000 / total) * 100;
          } else if (metric === 'TOTAL_MISROT') {
            yVal = normalizedDensity * 1000 * (computedSeries.totalMisrot / total);
          }

          return [x, Math.round(yVal * 100) / 100];
        });

        return kdePoints;
      }

      return rawPoints;
    }

    // Main Update Function
    function updateDashboard() {
      if (!AppState.rawData || AppState.rawData.length === 0) return;

      // Build the shared x-axis salary grid from whichever years/entity-types are actually
      // in play across the current series (each series can be pinned to a different year
      // and/or entity type).
      const activeYears = new Set(AppState.series.map(s => s.year));
      const usedTypes = new Set(AppState.series.map(s => s.entityType));
      const salarySet = new Set();
      if (usedTypes.has('rank')) {
        AppState.rawData.forEach(d => {
          if (activeYears.has(Number(d.SHANA)) && d.SALARY_MIDPOINT !== undefined) salarySet.add(Number(d.SALARY_MIDPOINT));
        });
      }
      if (usedTypes.has('body')) {
        // Bands are the same fixed 11 values regardless of year - no need to scan rows.
        Object.values(BAND_MIDPOINTS).forEach(v => salarySet.add(v));
      }
      const allSalarySteps = Array.from(salarySet).sort((a,b) => a - b);

      const computedResults = AppState.series.map(s => computeSeriesData(s));
      const visibleResults = computedResults.filter(r => r.visible);

      renderKPICards(computedResults);
      renderChart(visibleResults, allSalarySteps);
      renderLayersChart(visibleResults);
      renderTable(computedResults, allSalarySteps);

      const emptyOverlay = document.getElementById('chartEmptyOverlay');
      if (visibleResults.length === 0 || visibleResults.every(r => r.totalEmployees === 0)) {
        emptyOverlay.classList.remove('hidden');
      } else {
        emptyOverlay.classList.add('hidden');
      }
    }

    // Render KPI Metric Cards
    function renderKPICards(computedResults) {
      const container = document.getElementById('kpiCardsGrid');
      container.innerHTML = '';

      const activeResults = computedResults.filter(r => r.visible && r.totalEmployees > 0);

      if (activeResults.length === 0) {
        container.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-4 border border-slate-200 text-center text-xs text-slate-500 font-medium">
            בחר סדרות נתונים פעילות להצגת מדדי שכר השוואתיים
          </div>
        `;
        return;
      }

      activeResults.forEach(r => {
        const card = document.createElement('div');
        card.className = 'glass-panel rounded-2xl p-4 shadow-sm border-t-4 transition hover:shadow-md';
        card.style.borderTopColor = r.color;

        card.innerHTML = `
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-800 truncate" title="${escapeHtml(r.seriesName)}">${escapeHtml(r.seriesName)}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" style="background-color: ${r.color}15; color: ${r.color};">
              ${r.totalEmployees.toLocaleString('he-IL')} עובדים
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">שכר ממוצע משוקלל</span>
              <span class="text-base font-black text-slate-900 font-mono">₪${r.weightedMean.toLocaleString('he-IL')}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block font-medium">שכר חציוני משוער</span>
              <span class="text-base font-black text-slate-900 font-mono">₪${r.medianSalary.toLocaleString('he-IL')}</span>
            </div>
          </div>

          <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-500">
            <span>שיא שכיחות: <strong class="font-mono text-slate-700">₪${r.modeSalary.toLocaleString('he-IL')}</strong></span>
            <span>סטיית תקן: <strong class="font-mono text-slate-700">±₪${r.stdDev.toLocaleString('he-IL')}</strong></span>
          </div>

          ${r.preciseAvgWage != null ? `
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-500" title="מהחישוב המדויק של רבדי השכר (ברוטו שוטף והפרשים חלקי חודשי-משרה) - ראו מתודולוגיה">
              <span>שכר ממוצע מדויק (רבדים): <strong class="font-mono text-slate-700">₪${r.preciseAvgWage.toLocaleString('he-IL')}</strong></span>
              <span>עלות מעסיק: <strong class="font-mono text-slate-700">₪${(r.preciseAvgCost || 0).toLocaleString('he-IL')}</strong></span>
            </div>
          ` : ''}
        `;
        container.appendChild(card);
      });
    }

    // Render ECharts
    // Discrete rendering for body-mode series: grouped bars over the 11 fixed bands
    // (category axis), no smoothing/dataZoom - there is nothing continuous to show.
    function renderBodyBarChart(visibleResults) {
      const metric = AppState.metric;
      const metricLabels = {
        'COUNT_OVEDIM': 'כמות עובדים',
        'PCT_OVEDIM': 'אחוז עובדים (%)',
        'TOTAL_MISROT': 'היקף משרות'
      };
      const yAxisName = metricLabels[metric];
      const bandEntries = Object.entries(BAND_MIDPOINTS); // [[bandName, ₪value], ...] in fixed order
      const categories = bandEntries.map(([name]) => name);

      const echartsSeries = visibleResults.map(r => {
        const data = bandEntries.map(([, val]) => {
          const b = r.bins.get(val);
          if (!b) return 0;
          if (metric === 'COUNT_OVEDIM') return Math.round(b.count);
          if (metric === 'PCT_OVEDIM') return r.totalEmployees > 0 ? Math.round((b.count / r.totalEmployees) * 10000) / 100 : 0;
          if (metric === 'TOTAL_MISROT') return Math.round(b.misrot * 10) / 10;
          return 0;
        });
        return {
          name: r.seriesName,
          type: 'bar',
          data,
          barMaxWidth: 28,
          itemStyle: { color: r.color }
        };
      });

      const option = {
        animation: true,
        animationDuration: 400,
        backgroundColor: 'transparent',
        grid: { top: 40, right: 25, bottom: 70, left: 65, containLabel: true },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: [10, 14],
          textStyle: { fontFamily: 'Heebo, sans-serif', color: '#1e293b', fontSize: 12 },
          extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); border-radius: 12px;',
          formatter: function(params) {
            if (!params || params.length === 0) return '';
            let html = `<div dir="rtl" class="space-y-1.5 text-right">`;
            html += `<div class="font-black text-slate-900 border-b border-slate-100 pb-1">רצועת שכר: <span class="font-mono text-blue-600">${params[0].axisValue}</span></div>`;
            params.forEach(p => {
              const valFormatted = metric === 'PCT_OVEDIM' ? `${p.value.toFixed(2)}%` : Number(p.value).toLocaleString('he-IL');
              html += `
                <div class="flex items-center justify-between gap-4 text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${p.color};"></span>
                    <span class="font-medium text-slate-700">${p.seriesName}:</span>
                  </div>
                  <span class="font-black text-slate-900 font-mono">${valFormatted}</span>
                </div>
              `;
            });
            html += `</div>`;
            return html;
          }
        },
        legend: {
          show: true, top: 5, left: 'center',
          textStyle: { fontFamily: 'Heebo, sans-serif', fontSize: 12, color: '#475569' }
        },
        xAxis: {
          type: 'category',
          data: categories,
          name: 'רצועת שכר ברוטו (11 רצועות קבועות)',
          nameLocation: 'middle',
          nameGap: 45,
          nameTextStyle: { fontFamily: 'Heebo, sans-serif', fontSize: 12, fontWeight: 'bold', color: '#64748b' },
          axisLabel: { fontFamily: 'Heebo, sans-serif', color: '#64748b', interval: 0, rotate: 25 }
        },
        yAxis: {
          type: 'value',
          name: yAxisName,
          nameTextStyle: { fontFamily: 'Heebo, sans-serif', fontSize: 12, fontWeight: 'bold', color: '#64748b' },
          axisLabel: {
            fontFamily: 'Heebo, sans-serif', color: '#64748b',
            formatter: (val) => metric === 'PCT_OVEDIM' ? `${val.toFixed(1)}%` : Number(val).toLocaleString('he-IL')
          },
          splitLine: { lineStyle: { color: '#f1f5f9' } }
        },
        series: echartsSeries
      };

      chartInstance.setOption(option, true);
    }

    function renderChart(visibleResults, allSalarySteps) {
      if (!chartInstance) return;

      // Bodies only have 11 discrete bands - render as grouped bars on a category axis
      // instead of a smoothed/continuous line, since there's no real continuum to draw.
      if (AppState.entityType === 'body') {
        renderBodyBarChart(visibleResults);
        return;
      }

      const metric = AppState.metric;
      const smoothType = AppState.smoothType;
      const smoothParam = AppState.smoothParam;
      const isSpline = smoothType === 'spline';

      const metricLabels = {
        'COUNT_OVEDIM': 'כמות עובדים',
        'PCT_OVEDIM': 'אחוז עובדים (%)',
        'TOTAL_MISROT': 'היקף משרות'
      };

      const yAxisName = metricLabels[metric];
      const echartsSeries = [];

      visibleResults.forEach((r, idx) => {
        const points = generateSmoothedPoints(r, allSalarySteps);

        const mainSeriesObj = {
          name: r.seriesName,
          type: 'line',
          data: points,
          smooth: isSpline ? smoothParam : false,
          showSymbol: AppState.showRawPoints,
          symbolSize: 4,
          lineStyle: {
            width: AppState.lineWidth,
            color: r.color
          },
          itemStyle: {
            color: r.color
          },
          areaStyle: AppState.areaOpacity > 0 ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${r.color}${Math.round(AppState.areaOpacity * 255).toString(16).padStart(2, '0')}` },
              { offset: 1, color: `${r.color}00` }
            ])
          } : undefined,
          markLine: AppState.showStatsLines ? {
            symbol: ['none', 'none'],
            silent: false,
            data: [
              {
                xAxis: r.weightedMean,
                lineStyle: { type: 'dashed', color: r.color, width: 1.5 },
                label: {
                  formatter: `ממוצע: ₪${r.weightedMean.toLocaleString('he-IL')}`,
                  position: 'insideEndTop',
                  fontSize: 10,
                  color: r.color
                }
              },
              {
                xAxis: r.medianSalary,
                lineStyle: { type: 'dotted', color: r.color, width: 1.5 },
                label: {
                  formatter: `חציון: ₪${r.medianSalary.toLocaleString('he-IL')}`,
                  position: 'insideMiddleTop',
                  fontSize: 10,
                  color: r.color
                }
              }
            ]
          } : undefined,
          markPoint: AppState.showPeaks ? {
            symbol: 'pin',
            symbolSize: 32,
            itemStyle: { color: r.color },
            data: [
              {
                name: 'שיא',
                coord: [
                  r.modeSalary,
                  (points.find(p => p[0] === r.modeSalary) || [0, 0])[1]
                ],
                value: `שיא: ₪${r.modeSalary.toLocaleString('he-IL')}`,
                label: { fontSize: 9, color: '#ffffff' }
              }
            ]
          } : undefined
        };

        echartsSeries.push(mainSeriesObj);
      });

      const option = {
        animation: true,
        animationDuration: 600,
        backgroundColor: 'transparent',
        grid: {
          top: 40,
          right: 25,
          bottom: 70,
          left: 65,
          containLabel: true
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            crossStyle: { color: '#94a3b8' },
            lineStyle: { color: '#cbd5e1', width: 1, type: 'dashed' }
          },
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: [10, 14],
          textStyle: {
            fontFamily: 'Heebo, sans-serif',
            color: '#1e293b',
            fontSize: 12
          },
          extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); border-radius: 12px;',
          formatter: function(params) {
            if (!params || params.length === 0) return '';
            const salary = Number(params[0].axisValue).toLocaleString('he-IL');
            let html = `<div dir="rtl" class="space-y-1.5 text-right">`;
            html += `<div class="font-black text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between gap-4">
                      <span>מדרגת שכר:</span>
                      <span class="font-mono text-blue-600">₪${salary}</span>
                    </div>`;

            params.forEach(p => {
              const valFormatted = metric === 'PCT_OVEDIM' ? `${p.data[1].toFixed(2)}%` : Number(p.data[1]).toLocaleString('he-IL');
              html += `
                <div class="flex items-center justify-between gap-4 text-xs">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${p.color};"></span>
                    <span class="font-medium text-slate-700">${p.seriesName}:</span>
                  </div>
                  <span class="font-black text-slate-900 font-mono">${valFormatted}</span>
                </div>
              `;
            });

            html += `</div>`;
            return html;
          }
        },
        legend: {
          show: true,
          top: 5,
          left: 'center',
          textStyle: {
            fontFamily: 'Heebo, sans-serif',
            fontSize: 12,
            color: '#475569'
          }
        },
        xAxis: {
          type: 'value',
          name: 'שכר ברוטו (₪)',
          nameLocation: 'middle',
          nameGap: 32,
          nameTextStyle: {
            fontFamily: 'Heebo, sans-serif',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#64748b'
          },
          axisLabel: {
            fontFamily: 'Heebo, sans-serif',
            formatter: (val) => val >= 1000 ? `₪${(val/1000).toFixed(0)}k` : `₪${val}`,
            color: '#64748b'
          },
          splitLine: {
            lineStyle: { color: '#f1f5f9' }
          },
          min: 0
        },
        yAxis: {
          type: 'value',
          name: yAxisName,
          nameTextStyle: {
            fontFamily: 'Heebo, sans-serif',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#64748b'
          },
          axisLabel: {
            fontFamily: 'Heebo, sans-serif',
            formatter: (val) => metric === 'PCT_OVEDIM' ? `${val.toFixed(1)}%` : Number(val).toLocaleString('he-IL'),
            color: '#64748b'
          },
          splitLine: {
            lineStyle: { color: '#f1f5f9' }
          }
        },
        dataZoom: [
          {
            type: 'slider',
            show: true,
            xAxisIndex: [0],
            start: AppState.zoomRange[0],
            end: AppState.zoomRange[1],
            bottom: 8,
            height: 24,
            borderColor: 'transparent',
            backgroundColor: '#f8fafc',
            fillerColor: 'rgba(37, 99, 235, 0.12)',
            handleStyle: {
              color: '#2563eb',
              borderColor: '#1d4ed8'
            },
            textStyle: {
              fontFamily: 'Heebo, sans-serif',
              fontSize: 10,
              color: '#64748b'
            },
            labelFormatter: (val) => `₪${(val/1000).toFixed(0)}k`
          },
          {
            type: 'inside',
            xAxisIndex: [0]
          }
        ],
        series: echartsSeries
      };

      chartInstance.setOption(option, true);
    }

    // Render the salary-layer composition chart: a 100%-stacked horizontal bar, one row per
    // visible series, using the exact same 4-layer methodology (fields and formula) as the
    // "שכר דיגיטלי" tab's build_salary_ranges_bundle.py.
    function renderLayersChart(visibleResults) {
      if (!layersChartInstance) return;

      const withLayers = visibleResults.filter(r => r.totalEmployees > 0 && r.layerPct);
      const overlay = document.getElementById('chartLayersEmptyOverlay');

      if (withLayers.length === 0) {
        overlay.classList.remove('hidden');
        layersChartInstance.clear();
        return;
      }
      overlay.classList.add('hidden');

      const categories = withLayers.map(r => r.seriesName);

      const series = LAYER_SEGMENTS.map(seg => ({
        name: seg.name,
        type: 'bar',
        stack: 'total',
        barMaxWidth: 34,
        itemStyle: { color: seg.color },
        label: {
          show: true,
          formatter: p => p.value >= 5 ? p.value.toFixed(0) + '%' : '',
          color: '#ffffff',
          fontFamily: 'Heebo',
          fontSize: 10,
          fontWeight: 700,
        },
        data: withLayers.map(r => Math.round(r.layerPct[seg.key] * 1000) / 10),
      }));

      layersChartInstance.setOption({
        backgroundColor: 'transparent',
        grid: { top: 10, right: 20, bottom: 30, left: 10, containLabel: true },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          textStyle: { fontFamily: 'Heebo' },
          formatter: params => {
            const r = withLayers[params[0].dataIndex];
            let html = `<div style="text-align:right"><strong>${r.seriesName}</strong><br>`;
            params.forEach(p => {
              html += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>${p.value.toFixed(1)}%</strong><br>`;
            });
            html += `</div>`;
            return html;
          }
        },
        legend: {
          bottom: 0,
          textStyle: { fontFamily: 'Heebo', fontSize: 11, color: '#475569' }
        },
        xAxis: {
          type: 'value',
          max: 100,
          axisLabel: { formatter: '{value}%', fontFamily: 'Heebo', color: '#64748b' },
          splitLine: { lineStyle: { color: '#f1f5f9' } }
        },
        yAxis: {
          type: 'category',
          data: categories,
          axisLabel: { fontFamily: 'Heebo', fontSize: 11, color: '#334155', width: 160, overflow: 'truncate' }
        },
        series
      }, true);
    }

    // Render Table Data
    function renderTable(computedResults, allSalarySteps) {
      const thead = document.getElementById('tableHeaderRow');
      const tbody = document.getElementById('tableBody');
      const countLabel = document.getElementById('tableRowsCount');

      const activeResults = computedResults.filter(r => r.visible);

      thead.innerHTML = `<th class="py-2 px-3 rounded-r-lg">מדרגת שכר</th>`;
      activeResults.forEach(r => {
        thead.innerHTML += `
          <th class="py-2 px-3" style="color: ${r.color}">
            ${r.seriesName} (עובדים)
          </th>
          <th class="py-2 px-3 text-slate-400 font-normal">
            % מסך הסדרה
          </th>
        `;
      });

      const tableRows = [];
      allSalarySteps.forEach(sal => {
        let hasData = false;
        const rowObj = { salary: sal, values: [] };

        activeResults.forEach(r => {
          const b = r.bins.get(sal);
          const count = b ? b.count : 0;
          const pct = r.totalEmployees > 0 ? (count / r.totalEmployees) * 100 : 0;
          if (count > 0) hasData = true;
          rowObj.values.push({ count, pct });
        });

        if (hasData) {
          tableRows.push(rowObj);
        }
      });

      countLabel.textContent = `${tableRows.length} מדרגות שכר`;

      tbody.innerHTML = tableRows.map(row => {
        return `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-2 px-3 font-bold text-slate-800 font-mono">₪${row.salary.toLocaleString('he-IL')}</td>
            ${row.values.map(v => `
              <td class="py-2 px-3 font-bold ${v.count > 0 ? 'text-slate-900' : 'text-slate-300'} font-mono">${v.count.toLocaleString('he-IL')}</td>
              <td class="py-2 px-3 ${v.pct > 0 ? 'text-slate-500' : 'text-slate-300'} font-mono">${v.pct > 0 ? v.pct.toFixed(2) + '%' : '-'}</td>
            `).join('')}
          </tr>
        `;
      }).join('');
    }

    // Export CSV
    function exportCSV() {
      const activeYears = new Set(AppState.series.map(s => s.year));
      const usedTypes = new Set(AppState.series.map(s => s.entityType));
      const salarySet = new Set();
      if (usedTypes.has('rank')) {
        AppState.rawData.forEach(d => {
          if (activeYears.has(Number(d.SHANA)) && d.SALARY_MIDPOINT !== undefined) salarySet.add(Number(d.SALARY_MIDPOINT));
        });
      }
      if (usedTypes.has('body')) {
        Object.values(BAND_MIDPOINTS).forEach(v => salarySet.add(v));
      }
      const allSalarySteps = Array.from(salarySet).sort((a,b) => a - b);
      const computedResults = AppState.series.map(s => computeSeriesData(s)).filter(r => r.visible);

      let csv = '\uFEFF'; // UTF-8 BOM
      csv += 'מדרגת שכר (₪)';
      computedResults.forEach(r => {
        csv += `,${r.seriesName} - כמות עובדים,${r.seriesName} - אחוז מסך הסדרה`;
      });
      csv += '\n';

      allSalarySteps.forEach(sal => {
        let hasData = false;
        let line = `"${sal}"`;

        computedResults.forEach(r => {
          const b = r.bins.get(sal);
          const count = b ? b.count : 0;
          const pct = r.totalEmployees > 0 ? (count / r.totalEmployees) * 100 : 0;
          if (count > 0) hasData = true;
          line += `,"${count}","${pct.toFixed(2)}%"`;
        });

        if (hasData) {
          csv += line + '\n';
        }
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const yearsLabel = Array.from(activeYears).sort().join('-');
      a.download = `השוואת_התפלגות_שכר_${yearsLabel}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    }

    return { init, resize };
  })();
