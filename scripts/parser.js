/**
 * Data Engine & Multi-File Parser — Stage 5
 * Handles PapaParse ingestion of all 4 CSV files:
 *   1. סקירה כללית (overview) — 27K rows, body×rank granularity
 *   2. חלקיות משרה (partTime) — 3.6K rows, body-level
 *   3. שכר נמוך (lowWage) — 3.6K rows, body-level
 *   4. מקבלי השלמה למינימום (minWage) — 3.6K rows, body-level
 *
 * All files are UTF-16LE, tab-delimited, with Row 0 = metadata, Row 1 = headers.
 */

window.DataEngine = (function () {

  // ── Privacy threshold: suppress records where headcount < N ────
  const PRIVACY_THRESHOLD = 5;

  /**
   * Sanitizes numeric string inputs (removes commas, %, handles empty/NaN)
   * @param {string|number} val
   * @returns {number|null}
   */
  function cleanNumeric(val) {
    if (val === null || val === undefined) return null;
    const str = String(val).replace(/,/g, '').replace(/%/g, '').trim();
    if (str === '' || str === 'NaN' || str === 'nan' || str === 'null') return null;
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  /**
   * Generic CSV parser: decodes UTF-16LE ArrayBuffer → PapaParse → row objects
   * @param {ArrayBuffer} buffer - raw file bytes
   * @param {Function} mapFn - maps raw object → sanitized record
   * @returns {Array<Object>}
   */
  function parseBuffer(buffer, mapFn) {
    const text = new TextDecoder('utf-16le').decode(buffer);
    const parsed = Papa.parse(text, {
      delimiter: '\t',
      header: false,
      skipEmptyLines: true,
    });

    if (!parsed.data || parsed.data.length < 2) {
      throw new Error('Invalid or empty CSV content.');
    }

    const rawHeaders = parsed.data[1].map((h) => String(h).trim());
    const dataRows = parsed.data.slice(2);

    return dataRows.map((row, idx) => {
      const rawObj = {};
      rawHeaders.forEach((header, i) => {
        rawObj[header] = row[i] ? String(row[i]).trim() : '';
      });
      return mapFn(rawObj, idx);
    });
  }

  // ── File-Specific Mapping Functions ────────────────────────────

  /** סקירה כללית — body × rank granularity */
  function mapOverview(raw, idx) {
    return {
      id: idx + 1,
      source: raw['מקור התוכן'] || '',
      year: parseInt(raw['שנה']) || null,
      system: raw['מערכת'] || '',
      subSystem: raw['תת-מערכת'] || '',
      bodyName: raw['שם גוף'] || '',
      rank: raw['דירוג'] || '',
      menCount: cleanNumeric(raw['סך גברים עובדים']),
      womenCount: cleanNumeric(raw['סך נשים עובדות']),
      menPercent: cleanNumeric(raw['גברים']),
      womenPercent: cleanNumeric(raw['נשים']),
      totalMonthlyAvg: cleanNumeric(raw['מספר עובדים ממוצע לחודש']),
      avgMenWage: cleanNumeric(raw['שכר גברים ממוצע']),
      avgWomenWage: cleanNumeric(raw['שכר נשים ממוצע']),
      avgGrossRegular: cleanNumeric(raw['ממוצע ברוטו שוטף והפרשים']),
      avgMenTaxGross: cleanNumeric(raw['ממוצע ברוטו מס לגברים']),
      avgWomenTaxGross: cleanNumeric(raw['ממוצע ברוטו מס לנשים']),
      avgTotalTaxGross: cleanNumeric(raw['ממוצע ברוטו למס']),
      avgMenEmployerCost: cleanNumeric(raw['ממוצע עלות העסקה לגברים']),
      avgWomenEmployerCost: cleanNumeric(raw['ממוצע עלות העסקה לנשים']),
      avgTotalEmployerCost: cleanNumeric(raw['ממוצע עלות העסקה']),
    };
  }

  /** חלקיות משרה — body-level, full vs part-time split */
  function mapPartTime(raw, idx) {
    return {
      id: idx + 1,
      source: raw['מקור התוכן'] || '',
      year: parseInt(raw['שנה']) || null,
      system: raw['מערכת'] || '',
      subSystem: raw['תת-מערכת'] || '',
      bodyName: raw['שם גוף'] || '',
      // Part-time counts
      ptMenCount: cleanNumeric(raw['כמות עובדים גברים בחלקיות משרה']),
      ptWomenCount: cleanNumeric(raw['כמות עובדים נשים בחלקיות משרה']),
      ptTotalCount: cleanNumeric(raw['כמות עובדים בחלקיות משרה']),
      // Full-time counts
      ftMenCount: cleanNumeric(raw['כמות עובדים גברים במשרה מלאה']),
      ftWomenCount: cleanNumeric(raw['כמות עובדים נשים במשרה מלאה']),
      ftTotalCount: cleanNumeric(raw['כמות עובדים במשרה מלאה']),
      // Part-time wages (ברוטו שוטף)
      ptMenWage: cleanNumeric(raw['ממוצע ברוטו שוטף והפרשים לגברים במשרה חלקית']),
      ptWomenWage: cleanNumeric(raw['ממוצע ברוטו שוטף והפרשים לנשים במשרה חלקית']),
      ptTotalWage: cleanNumeric(raw['ממוצע ברוטו שוטף והפרשים לעובדים במשרה חלקית']),
      // Full-time wages (ברוטו שוטף)
      ftMenWage: cleanNumeric(raw['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']),
      ftWomenWage: cleanNumeric(raw['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']),
      ftTotalWage: cleanNumeric(raw['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']),
      // Part-time employer cost
      ptMenCost: cleanNumeric(raw['ממוצע עלות העסקה לגברים למשרה חלקית']),
      ptWomenCost: cleanNumeric(raw['ממוצע עלות העסקה לנשים למשרה חלקית']),
      ptTotalCost: cleanNumeric(raw['ממוצע עלות העסקה למשרה חלקית']),
      // Full-time employer cost
      ftMenCost: cleanNumeric(raw['ממוצע עלות העסקה לגברים במשרה מלאה']),
      ftWomenCost: cleanNumeric(raw['ממוצע עלות העסקה לנשים במשרה מלאה']),
      ftTotalCost: cleanNumeric(raw['ממוצע עלות העסקה למשרה מלאה']),
    };
  }

  /** שכר נמוך — body-level, below-average earners */
  function mapLowWage(raw, idx) {
    return {
      id: idx + 1,
      source: raw['מקור התוכן'] || '',
      year: parseInt(raw['שנה']) || null,
      system: raw['מערכת'] || '',
      subSystem: raw['תת-מערכת'] || '',
      bodyName: raw['שם גוף'] || '',
      lwMenCount: cleanNumeric(raw['מספר גברים מקבלי שכר נמוך']),
      lwWomenCount: cleanNumeric(raw['מספר נשים מקבלות נמוך משכר ממוצע']),
      lwTotalCount: cleanNumeric(raw['מספר עובדים ממוצע לחודש המקבלים שכר נמוך מהממוצע']),
      lwMenWage: cleanNumeric(raw['ממוצע ברוטו והפרשים של מקבלי שכר נמוך גברים']),
      lwWomenWage: cleanNumeric(raw['ממוצע ברוטו והפרשים של מקבלי שכר נמוך נשים']),
      lwTotalWage: cleanNumeric(raw['ממוצע שכר ברוטו והפרשים של מקבלי שכר נמוך']),
      lwMenTaxGross: cleanNumeric(raw['ממוצע ברוטו למס של מקבלי שכר נמוך גברים']),
      lwWomenTaxGross: cleanNumeric(raw['ממוצע ברוטו למס של מקבלי שכר נמוך נשים']),
      lwTotalTaxGross: cleanNumeric(raw['ממוצע ברוטו למס למקבלי שכר נמוך']),
      lwMenCost: cleanNumeric(raw['ממוצע עלות העסקה של מקבלי שכר נמוך גברים']),
      lwWomenCost: cleanNumeric(raw['ממוצע עלות העסקה של מקבלי שכר נמוך נשים']),
      lwTotalCost: cleanNumeric(raw['ממוצע עלות העסקה למקבלי שכר נמוך']),
    };
  }

  /** מקבלי השלמה למינימום — body-level, minimum wage supplement */
  function mapMinWage(raw, idx) {
    return {
      id: idx + 1,
      source: raw['מקור התוכן'] || '',
      year: parseInt(raw['שנה']) || null,
      system: raw['מערכת'] || '',
      subSystem: raw['תת-מערכת'] || '',
      bodyName: raw['שם גוף'] || '',
      mwMenCount: cleanNumeric(raw['גברים מקבלי השלמה למינימום']),
      mwWomenCount: cleanNumeric(raw['נשים מקבלות השלמה למינימום']),
      mwTotalCount: cleanNumeric(raw['מספר עובדים ממוצע לחודש המקבלים השלמה']),
      mwMenWage: cleanNumeric(raw['ממוצע ברוטו והפרשים של מקבלי השלמה גברים']),
      mwWomenWage: cleanNumeric(raw['ממוצע ברוטו והפרשים של מקבלי השלמה נשים']),
      mwTotalWage: cleanNumeric(raw['ממוצע שכר ברוטו והפרשים של מקבלי השלמה']),
      mwMenTaxGross: cleanNumeric(raw['ממוצע ברוטו מס לגברים מקבלי השלמה']),
      mwWomenTaxGross: cleanNumeric(raw['ממוצע ברוטו מס לנשים מקבלות השלמה']),
      mwTotalTaxGross: cleanNumeric(raw['ממוצע ברוטו למס למקבלי השלמה']),
      mwMenCost: cleanNumeric(raw['ממוצע עלות העסקה לגברים מקבלי השלמה']),
      mwWomenCost: cleanNumeric(raw['ממוצע עלות העסקה לנשים מקבלות השלמה']),
      mwTotalCost: cleanNumeric(raw['ממוצע עלות העסקה למקבלי השלמה']),
    };
  }

  // ── File Fetcher ────────────────────────────────────────────────

  async function fetchBuffer(path) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`Failed to load: ${path} (${resp.statusText})`);
    return resp.arrayBuffer();
  }

  // ── Public API ─────────────────────────────────────────────────

  /**
   * Loads all 4 CSV datasets in parallel (or returns preloaded bundle if running via file:// protocol).
   * @returns {Promise<{overview, partTime, lowWage, minWage}>}
   */
  async function loadAll() {
    if (window.__PRELOADED_DATA__) {
      console.log('[DataEngine] Loading from preloaded bundle (instant & file:// compatible)');
      return window.__PRELOADED_DATA__;
    }

    const [bufOverview, bufPartTime, bufLowWage, bufMinWage] = await Promise.all([
      fetchBuffer('./data/נתוני סקירה כללית (3).csv'),
      fetchBuffer('./data/נתוני חלקיות משרה (1).csv'),
      fetchBuffer('./data/נתוני שכר נמוך (1).csv'),
      fetchBuffer('./data/נתוני מקבלי השלמה למינימום (2).csv'),
    ]);

    return {
      overview: parseBuffer(bufOverview, mapOverview),
      partTime: parseBuffer(bufPartTime, mapPartTime),
      lowWage: parseBuffer(bufLowWage, mapLowWage),
      minWage: parseBuffer(bufMinWage, mapMinWage),
    };
  }

  /**
   * Backward-compatible single-file loader (used by validator).
   */
  async function loadDatasetFromFile(filePath) {
    const buf = await fetchBuffer(filePath);
    return parseBuffer(buf, mapOverview);
  }

  return {
    cleanNumeric,
    loadAll,
    loadDatasetFromFile,
    PRIVACY_THRESHOLD,
  };
})();
