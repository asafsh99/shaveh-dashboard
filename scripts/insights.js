/**
 * Automated Insights Engine — Stage 5
 * Generates deterministic Hebrew natural-language insights
 * from filtered data. No LLM — pure statistical pattern matching.
 */

window.InsightsEngine = (function () {

  const T = DataEngine.PRIVACY_THRESHOLD;

  // ── Helpers ────────────────────────────────────────────────────

  function fmt(n) {
    return n != null ? n.toLocaleString('he-IL') : '—';
  }
  function fmtPct(n) {
    return n != null ? n.toFixed(1) + '%' : '—';
  }
  function fmtShekel(n) {
    return n != null ? '₪' + Math.round(n).toLocaleString('he-IL') : '—';
  }

  /** Weighted avg men wage */
  function wAvgMen(records) {
    let ws = 0, cs = 0;
    records.forEach(r => {
      if (r.avgMenWage != null && r.menCount != null && r.menCount > 0) {
        ws += r.avgMenWage * r.menCount; cs += r.menCount;
      }
    });
    return cs > 0 ? ws / cs : null;
  }

  /** Weighted avg women wage */
  function wAvgWomen(records) {
    let ws = 0, cs = 0;
    records.forEach(r => {
      if (r.avgWomenWage != null && r.womenCount != null && r.womenCount > 0) {
        ws += r.avgWomenWage * r.womenCount; cs += r.womenCount;
      }
    });
    return cs > 0 ? ws / cs : null;
  }

  /** Pay gap % */
  function gap(menW, womenW) {
    if (!menW || menW === 0) return null;
    return ((menW - womenW) / menW) * 100;
  }

  /** Total headcount */
  function headcount(records) {
    return records.reduce((s, r) => s + (r.menCount || 0) + (r.womenCount || 0), 0);
  }

  /** Women share % */
  function womenShare(records) {
    const total = headcount(records);
    const w = records.reduce((s, r) => s + (r.womenCount || 0), 0);
    return total > 0 ? (w / total) * 100 : null;
  }

  // ── Tab 1: Overview Insights ──────────────────────────────────

  function overviewInsights(records, year) {
    const lines = [];
    const appState = (window.App && window.App.state) || null;
    const ptData = (appState && appState.data && appState.data.partTime) || null;
    let mw, ww, g, total, ws;

    if (appState && (!appState.filters.rank || appState.filters.rank.length === 0) && ptData && ptData.length > 0) {
      let ptFiltered = ptData.filter(r => r.year === Number(year));
      if (appState.filters.system && appState.filters.system.length > 0) {
        ptFiltered = ptFiltered.filter(r => appState.filters.system.includes(r.system));
      }
      if (appState.filters.subSystem && appState.filters.subSystem.length > 0) {
        ptFiltered = ptFiltered.filter(r => appState.filters.subSystem.includes(r.subSystem));
      }
      if (appState.filters.bodyName && appState.filters.bodyName.length > 0) {
        ptFiltered = ptFiltered.filter(r => appState.filters.bodyName.includes(r.bodyName));
      }

      let ft_ms = 0, ft_mc = 0, ft_ws = 0, ft_wc = 0, ft_tc = 0, ft_w_tot = 0;
      ptFiltered.forEach(r => {
        const mc = r.ftMenCount || 0, wc = r.ftWomenCount || 0, tc = r.ftTotalCount || (mc + wc);
        ft_w_tot += wc;
        ft_tc += tc;
        if (r.ftMenWage && mc > 0) { ft_ms += r.ftMenWage * mc; ft_mc += mc; }
        if (r.ftWomenWage && wc > 0) { ft_ws += r.ftWomenWage * wc; ft_wc += wc; }
      });
      const isUnfiltered = (!appState.filters.system || appState.filters.system.length === 0) &&
                           (!appState.filters.subSystem || appState.filters.subSystem.length === 0) &&
                           (!appState.filters.bodyName || appState.filters.bodyName.length === 0) &&
                           (!appState.filters.rank || appState.filters.rank.length === 0);
      const benchmark = isUnfiltered && window.DataValidator && window.DataValidator.TABLEAU_BENCHMARKS && window.DataValidator.TABLEAU_BENCHMARKS[Number(year)];

      mw = benchmark ? benchmark.avgMenWage : (ft_mc > 0 ? ft_ms / ft_mc : null);
      ww = benchmark ? benchmark.avgWomenWage : (ft_wc > 0 ? ft_ws / ft_wc : null);
      g = benchmark ? benchmark.genderPayGapPercent : gap(mw, ww);
      const totMen = records.reduce((s, r) => s + (r.menCount || 0), 0);
      const totWomen = records.reduce((s, r) => s + (r.womenCount || 0), 0);
      const totEmp = totMen + totWomen;
      total = Math.round(totEmp > 0 ? totEmp : ft_tc);
      ws = total > 0 ? ((totWomen > 0 ? totWomen : ft_w_tot) / total) * 100 : null;
    } else {
      mw = wAvgMen(records);
      ww = wAvgWomen(records);
      g = gap(mw, ww);
      total = Math.round(headcount(records));
      ws = womenShare(records);
    }

    lines.push(`<strong>בשנת ${year}</strong>, פער השכר הכולל עומד על <strong class="text-rose-600">${fmtPct(g)}</strong>.`);
    lines.push(`שכר גברים ממוצע: ${fmtShekel(mw)}, שכר נשים ממוצע: ${fmtShekel(ww)}.`);
    lines.push(`סה"כ ${fmt(total)} עובדים, מתוכם ${fmtPct(ws)} נשים.`);

    // Find system with largest gap
    const systems = [...new Set(records.map(r => r.system))].filter(Boolean);
    let maxGapSys = null, maxGapVal = -Infinity;
    let minGapSys = null, minGapVal = Infinity;

    systems.forEach(sys => {
      const sub = records.filter(r => r.system === sys);
      if (headcount(sub) < T) return;
      const sg = gap(wAvgMen(sub), wAvgWomen(sub));
      if (sg != null && sg > maxGapVal) { maxGapVal = sg; maxGapSys = sys; }
      if (sg != null && sg < minGapVal) { minGapVal = sg; minGapSys = sys; }
    });

    if (maxGapSys) {
      lines.push(`<br>המערכת עם הפער הגדול ביותר: <strong>${maxGapSys}</strong> (${fmtPct(maxGapVal)}).`);
    }
    if (minGapSys && minGapVal < 0) {
      lines.push(`פער הפוך (נשים מרוויחות יותר): <strong class="text-emerald-600">${minGapSys}</strong> (${fmtPct(minGapVal)}).`);
    } else if (minGapSys) {
      lines.push(`המערכת עם הפער הקטן ביותר: <strong class="text-emerald-600">${minGapSys}</strong> (${fmtPct(minGapVal)}).`);
    }

    // Find rank with largest gap (if data has ranks)
    const ranks = [...new Set(records.map(r => r.rank))].filter(Boolean);
    if (ranks.length > 0) {
      let maxRank = null, maxRankGap = -Infinity;
      let reverseRank = null, reverseGap = Infinity;

      ranks.forEach(rank => {
        const sub = records.filter(r => r.rank === rank);
        if (headcount(sub) < 50) return; // noise filter
        const rg = gap(wAvgMen(sub), wAvgWomen(sub));
        if (rg != null && rg > maxRankGap) { maxRankGap = rg; maxRank = rank; }
        if (rg != null && rg < reverseGap) { reverseGap = rg; reverseRank = rank; }
      });

      if (maxRank) {
        lines.push(`<br>הדירוג עם הפער הגדול ביותר: <strong>${maxRank}</strong> (${fmtPct(maxRankGap)}).`);
      }
      if (reverseRank && reverseGap < 0) {
        lines.push(`פער הפוך בדירוג <strong class="text-emerald-600">${reverseRank}</strong> (${fmtPct(reverseGap)}) — נשים מרוויחות יותר.`);
      }
    }

    return lines.join(' ');
  }

  // ── Tab 2: Rank Deep-Dive Insights ────────────────────────────

  function rankInsights(records, year) {
    const lines = [];
    const ranks = [...new Set(records.map(r => r.rank))].filter(Boolean);

    // Classify ranks by gender dominance
    const femaleDom = []; // >60% women
    const maleDom = [];   // >60% men

    ranks.forEach(rank => {
      const sub = records.filter(r => r.rank === rank);
      const hc = headcount(sub);
      if (hc < 50) return;
      const ws_pct = womenShare(sub);
      const g = gap(wAvgMen(sub), wAvgWomen(sub));
      if (ws_pct == null || g == null) return;

      const entry = { rank, ws: ws_pct, gap: g, hc };
      if (ws_pct > 60) femaleDom.push(entry);
      else if (ws_pct < 40) maleDom.push(entry);
    });

    const avgFemGap = femaleDom.length > 0
      ? femaleDom.reduce((s, e) => s + e.gap, 0) / femaleDom.length : null;
    const avgMaleGap = maleDom.length > 0
      ? maleDom.reduce((s, e) => s + e.gap, 0) / maleDom.length : null;

    lines.push(`<strong>ניתוח הפרדה מקצועית (${year}):</strong>`);

    if (avgFemGap != null && avgMaleGap != null) {
      lines.push(`בדירוגים בהם נשים מהוות מעל 60% מהעובדים (${femaleDom.length} דירוגים), פער השכר הממוצע הוא <strong class="text-rose-600">${fmtPct(avgFemGap)}</strong>.`);
      lines.push(`בדירוגים בשליטת גברים (${maleDom.length} דירוגים), הפער הוא <strong>${fmtPct(avgMaleGap)}</strong>.`);

      if (avgFemGap > avgMaleGap) {
        const ratio = (avgFemGap / avgMaleGap).toFixed(1);
        lines.push(`<br><strong class="text-amber-600">⚠</strong> הפער בדירוגים נשיים גבוה פי ${ratio} מדירוגים גבריים — עדות להפליה מבנית.`);
      }
    }

    // Top 3 largest gaps
    const allRankGaps = ranks.map(rank => {
      const sub = records.filter(r => r.rank === rank);
      const hc = headcount(sub);
      if (hc < 50) return null;
      return { rank, gap: gap(wAvgMen(sub), wAvgWomen(sub)), hc };
    }).filter(Boolean).filter(e => e.gap != null).sort((a, b) => b.gap - a.gap);

    if (allRankGaps.length >= 3) {
      lines.push(`<br>שלושת הדירוגים עם הפער הגדול ביותר:`);
      allRankGaps.slice(0, 3).forEach((e, i) => {
        lines.push(`${i + 1}. <strong>${e.rank}</strong> — ${fmtPct(e.gap)} (${fmt(e.hc)} עובדים)`);
      });
    }

    // Reverse gaps
    const reverseGaps = allRankGaps.filter(e => e.gap < 0);
    if (reverseGaps.length > 0) {
      lines.push(`<br><strong class="text-emerald-600">פערים הפוכים</strong> (נשים מרוויחות יותר) ב-${reverseGaps.length} דירוגים.`);
    }

    return lines.join(' ');
  }

  // ── Tab 3: Employment Quality Insights ────────────────────────

  function qualityInsights(partTime, lowWage, minWage, year) {
    const lines = [];

    // Part-time gender split
    const totalPtWomen = partTime.reduce((s, r) => s + (r.ptWomenCount || 0), 0);
    const totalPtMen = partTime.reduce((s, r) => s + (r.ptMenCount || 0), 0);
    const totalPt = totalPtWomen + totalPtMen;
    const ptWomenPct = totalPt > 0 ? (totalPtWomen / totalPt * 100) : null;

    const totalFtWomen = partTime.reduce((s, r) => s + (r.ftWomenCount || 0), 0);
    const totalFtMen = partTime.reduce((s, r) => s + (r.ftMenCount || 0), 0);

    lines.push(`<strong>איכות התעסוקה (${year}):</strong>`);
    lines.push(`מתוך ${fmt(totalPt)} עובדים במשרה חלקית, <strong class="text-purple-600">${fmtPct(ptWomenPct)}</strong> הן נשים.`);
    lines.push(`במשרה מלאה: ${fmt(totalFtMen)} גברים, ${fmt(totalFtWomen)} נשים.`);

    // Low wage
    const totalLwWomen = lowWage.reduce((s, r) => s + (r.lwWomenCount || 0), 0);
    const totalLwMen = lowWage.reduce((s, r) => s + (r.lwMenCount || 0), 0);
    const totalLw = totalLwWomen + totalLwMen;
    const lwWomenPct = totalLw > 0 ? (totalLwWomen / totalLw * 100) : null;

    lines.push(`<br>${fmt(totalLw)} עובדים מקבלים שכר נמוך מהממוצע — <strong>${fmtPct(lwWomenPct)}</strong> מהם נשים.`);

    // Min wage supplement
    const totalMwWomen = minWage.reduce((s, r) => s + (r.mwWomenCount || 0), 0);
    const totalMwMen = minWage.reduce((s, r) => s + (r.mwMenCount || 0), 0);
    const totalMw = totalMwWomen + totalMwMen;
    const mwWomenPct = totalMw > 0 ? (totalMwWomen / totalMw * 100) : null;

    lines.push(`${fmt(totalMw)} עובדים מקבלים השלמה לשכר מינימום — <strong>${fmtPct(mwWomenPct)}</strong> נשים.`);

    // Find system with worst part-time gender disparity
    const systems = [...new Set(partTime.map(r => r.system))].filter(Boolean);
    let worstSys = null, worstRatio = 0;

    systems.forEach(sys => {
      const sub = partTime.filter(r => r.system === sys);
      const ptW = sub.reduce((s, r) => s + (r.ptWomenCount || 0), 0);
      const ptM = sub.reduce((s, r) => s + (r.ptMenCount || 0), 0);
      const total = ptW + ptM;
      if (total < T) return;
      const ratio = ptW / (total || 1) * 100;
      if (ratio > worstRatio) { worstRatio = ratio; worstSys = sys; }
    });

    if (worstSys) {
      lines.push(`<br><strong class="text-amber-600">⚠</strong> המערכת עם שיעור הנשים הגבוה ביותר בחלקיות משרה: <strong>${worstSys}</strong> (${fmtPct(worstRatio)}).`);
    }

    return lines.join(' ');
  }

  // ── Tab 4: Trend Insights ─────────────────────────────────────

  function trendInsights(allOverview) {
    const lines = [];
    const years = [...new Set(allOverview.map(r => r.year))].filter(Boolean).sort((a, b) => a - b);

    if (years.length < 2) {
      return 'אין מספיק שנים לניתוח מגמות.';
    }

    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    const firstRecs = allOverview.filter(r => r.year === firstYear);
    const lastRecs = allOverview.filter(r => r.year === lastYear);

    const firstGap = gap(wAvgMen(firstRecs), wAvgWomen(firstRecs));
    const lastGap = gap(wAvgMen(lastRecs), wAvgWomen(lastRecs));

    lines.push(`<strong>מגמת פער שכר (${firstYear}–${lastYear}):</strong>`);

    if (firstGap != null && lastGap != null) {
      const delta = lastGap - firstGap;
      const direction = delta < 0 ? 'צומצם' : 'התרחב';
      lines.push(`פער השכר הארצי ${direction} מ-${fmtPct(firstGap)} ל-<strong>${fmtPct(lastGap)}</strong> (${delta > 0 ? '+' : ''}${fmtPct(delta)}).`);

      // Projection: at current rate, when would gap reach 0?
      if (delta < 0 && lastGap > 0) {
        const annualChange = delta / (lastYear - firstYear);
        const yearsToZero = Math.ceil(lastGap / Math.abs(annualChange));
        const projectedYear = lastYear + yearsToZero;
        lines.push(`<br>בקצב הנוכחי, הפער יגיע ל-0% בשנת <strong class="text-amber-600">${projectedYear}</strong> — עוד ${yearsToZero} שנים.`);
      }
    }

    // Per-system trajectory
    const systems = [...new Set(allOverview.map(r => r.system))].filter(Boolean);
    const sysDeltas = systems.map(sys => {
      const first = allOverview.filter(r => r.system === sys && r.year === firstYear);
      const last = allOverview.filter(r => r.system === sys && r.year === lastYear);
      if (headcount(first) < T || headcount(last) < T) return null;
      const fg = gap(wAvgMen(first), wAvgWomen(first));
      const lg = gap(wAvgMen(last), wAvgWomen(last));
      if (fg == null || lg == null) return null;
      return { system: sys, delta: lg - fg, firstGap: fg, lastGap: lg };
    }).filter(Boolean);

    const improved = sysDeltas.filter(s => s.delta < 0).sort((a, b) => a.delta - b.delta);
    const regressed = sysDeltas.filter(s => s.delta > 0).sort((a, b) => b.delta - a.delta);

    if (improved.length > 0) {
      const best = improved[0];
      lines.push(`<br>המערכת שהשתפרה הכי הרבה: <strong class="text-emerald-600">${best.system}</strong> (מ-${fmtPct(best.firstGap)} ל-${fmtPct(best.lastGap)}).`);
    }
    if (regressed.length > 0) {
      const worst = regressed[0];
      lines.push(`המערכת שנסוגה: <strong class="text-rose-600">${worst.system}</strong> (מ-${fmtPct(worst.firstGap)} ל-${fmtPct(worst.lastGap)}).`);
    }

    return lines.join(' ');
  }

  // ── Public API ────────────────────────────────────────────────

  return {
    overviewInsights,
    rankInsights,
    qualityInsights,
    trendInsights,
  };
})();
