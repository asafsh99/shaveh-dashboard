import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC_RANKS = os.path.join(BASE_DIR, 'data', 'שכר דיגיטלי דירוג.xlsx')
SRC_BODIES = os.path.join(BASE_DIR, 'data', 'שכר דיגיטלי גוף.xlsx')
OUT = os.path.join(BASE_DIR, 'scripts', 'salary_ranges_bundle.js')

# Matches DataEngine.PRIVACY_THRESHOLD used elsewhere in the dashboard, and the
# same threshold already applied in build_smoothing_bundle.py / build_smoothing_body_bundle.py.
# An entire rank/body entity is dropped when its total headcount is at or below
# this floor; when the total is fine but one gender's headcount alone is at or
# below it, only that gender's wage/cost/bands are suppressed (set to null) -
# showing an average over 1-5 identifiable people is itself a disclosure.
PRIVACY_THRESHOLD = 5

BAND_ORDER = ['קטן מ-8', '8-12', '12-16', '16-20', '20-24', '24-28', '28-32', '32-36', '36-40', '40-44', 'גדול מ-44', 'לא מוגדר']
BAND_LABELS = {
    # Hebrew "X עד Y" phrasing (rather than an en-dash) sidesteps RTL/bidi
    # reordering artifacts that occur when two number groups are joined by
    # a neutral dash character inside an RTL text run.
    'קטן מ-8': 'עד 8,000',
    '8-12': '8,000 עד 12,000',
    '12-16': '12,000 עד 16,000',
    '16-20': '16,000 עד 20,000',
    '20-24': '20,000 עד 24,000',
    '24-28': '24,000 עד 28,000',
    '28-32': '28,000 עד 32,000',
    '32-36': '32,000 עד 36,000',
    '36-40': '36,000 עד 40,000',
    '40-44': '40,000 עד 44,000',
    'גדול מ-44': 'מעל 44,000',
    'לא מוגדר': 'לא מוגדר',
}

print('Reading ranks from', SRC_RANKS)
df_ranks_all = pd.read_excel(SRC_RANKS, sheet_name=0, header=0)
df_ranks_all.columns = [str(c).strip() for c in df_ranks_all.columns]

print('Reading bodies from', SRC_BODIES)
df_bodies_all = pd.read_excel(SRC_BODIES, sheet_name='sahar_dig_misrad', header=0)
df_bodies_all.columns = [str(c).strip() for c in df_bodies_all.columns]

# The rank file is bin-level (exact SALARY_MIDPOINT per row) - it has no pre-computed band
# bucket and no COUNT_MISPAR_OVED (position-months). Derive both from what IS available so
# the shared agg_block()/attach_gender() logic below needs no further changes for ranks.
def salary_to_band(midpoint):
    if pd.isna(midpoint):
        return 'לא מוגדר'
    m = float(midpoint)
    if m < 8000: return 'קטן מ-8'
    if m < 12000: return '8-12'
    if m < 16000: return '12-16'
    if m < 20000: return '16-20'
    if m < 24000: return '20-24'
    if m < 28000: return '24-28'
    if m < 32000: return '28-32'
    if m < 36000: return '32-36'
    if m < 40000: return '36-40'
    if m < 44000: return '40-44'
    return 'גדול מ-44'

df_ranks_all['kvuza_tvach'] = df_ranks_all['SALARY_MIDPOINT'].apply(salary_to_band)
# TOTAL_MISROT ("משרות", FTE-weighted position-months) substitutes for the missing
# COUNT_MISPAR_OVED (raw employee-months regardless of FTE share) - see methodologyNote
# below for the real, verified size of the gap this introduces.
df_ranks_all['COUNT_MISPAR_OVED'] = df_ranks_all['TOTAL_MISROT']

years = sorted(set(df_ranks_all['SHANA'].dropna().astype(int).tolist()) | set(df_bodies_all['SHANA'].dropna().astype(int).tolist()))
print('Years found:', years)


def agg_block(sub: pd.DataFrame):
    """Aggregate a slice of rows (already the target entity + gender scope) into summary stats."""
    headcount = float(sub['COUNT_OVEDIM'].sum())
    posmonths = float(sub['COUNT_MISPAR_OVED'].sum())
    gross_sum = float(sub['SUM_BRUTO_SHOTEF_HEFRESHIM'].sum())
    cost_sum = float(sub['SUM_ALUT_HAASAKA'].sum())
    l_base = float(sub['total_sachar_mshulav'].sum())
    l_add = float(sub['total_salary_additions'].sum())
    l_extra = float(sub['total_additional_work'].sum())
    l_exp = float(sub['total_expense_refund'].sum())
    l_oth = float(sub['total_other_payments'].sum())
    layer_base_combined = l_base + l_add  # "יסוד ותוספות"
    layers_total = layer_base_combined + l_extra + l_exp + l_oth

    avg_wage = round(gross_sum / posmonths, 2) if posmonths > 0 else None
    avg_cost = round(cost_sum / posmonths, 2) if posmonths > 0 else None

    layer_pct = None
    if layers_total > 0:
        layer_pct = {
            'base': round(layer_base_combined / layers_total, 4),
            'extra': round(l_extra / layers_total, 4),
            'expense': round(l_exp / layers_total, 4),
            'other': round(l_oth / layers_total, 4),
        }

    bands = []
    band_grp = sub.groupby('kvuza_tvach')['COUNT_OVEDIM'].sum()
    for b in BAND_ORDER:
        c = float(band_grp.get(b, 0.0))
        if c <= 0 and b == 'לא מוגדר':
            continue
        bands.append({'band': b, 'label': BAND_LABELS[b], 'count': round(c, 1)})
    band_total = sum(b['count'] for b in bands) or 1
    for b in bands:
        b['pct'] = round(b['count'] / band_total, 4)

    return {
        'headcount': round(headcount, 1),
        'positionMonths': round(posmonths, 1),
        'avgWage': avg_wage,
        'avgCost': avg_cost,
        'layerPct': layer_pct,
        'bands': bands,
    }


privacy_stats = {'entities_dropped': 0, 'gender_slices_suppressed': 0}


def suppress_if_tiny(agg):
    """Null out wage/cost/bands for a men-only or women-only slice that's too
    small to publish safely; the headcount number itself is kept (counts alone
    are already shown throughout the dashboard even for tiny groups)."""
    if agg['headcount'] <= PRIVACY_THRESHOLD:
        privacy_stats['gender_slices_suppressed'] += 1
        return {**agg, 'avgWage': None, 'avgCost': None, 'layerPct': None, 'bands': []}
    return agg


def attach_gender(block, sub):
    """Compute the men/women split for a block and attach it in-place."""
    men = agg_block(sub[sub['NAME_MIN'] == 'גברים'])
    women = agg_block(sub[sub['NAME_MIN'] == 'נשים'])
    men_safe = suppress_if_tiny(men)
    women_safe = suppress_if_tiny(women)
    block['menWage'] = men_safe['avgWage']
    block['womenWage'] = women_safe['avgWage']
    block['menHeadcount'] = men['headcount']
    block['womenHeadcount'] = women['headcount']
    block['menLayerPct'] = men_safe['layerPct']
    block['womenLayerPct'] = women_safe['layerPct']
    block['menBands'] = men_safe['bands']
    block['womenBands'] = women_safe['bands']
    return block


by_year = {}
for year in years:
    yr_ranks = df_ranks_all[df_ranks_all['SHANA'] == year]
    yr_bodies = df_bodies_all[df_bodies_all['SHANA'] == year]

    all_kvutza = sorted(set(yr_ranks['KVUTZA'].dropna().unique().tolist()) | set(yr_bodies['KVUTZA'].dropna().unique().tolist()))

    groups_out = []
    for kv in all_kvutza:
        g_r = yr_ranks[yr_ranks['KVUTZA'] == kv]
        g_b = yr_bodies[yr_bodies['KVUTZA'] == kv]

        if g_r['COUNT_OVEDIM'].sum() <= 0 and g_b['COUNT_OVEDIM'].sum() <= 0:
            continue  # this sector has no data at all for this year

        overall = agg_block(g_r)
        attach_gender(overall, g_r)

        ranks_out = []
        for rk in sorted(g_r['DIRUG_MEUHAD'].dropna().unique().tolist()):
            rsub = g_r[g_r['DIRUG_MEUHAD'] == rk]
            rblock = agg_block(rsub)
            rblock['name'] = rk
            attach_gender(rblock, rsub)
            if rblock['headcount'] > PRIVACY_THRESHOLD:
                ranks_out.append(rblock)
            elif rblock['headcount'] > 0:
                privacy_stats['entities_dropped'] += 1
        ranks_out.sort(key=lambda r: -r['headcount'])

        bodies_out = []
        for bd in sorted(g_b['MISRAD_GROUP'].dropna().unique().tolist()):
            bsub = g_b[g_b['MISRAD_GROUP'] == bd]
            bblock = agg_block(bsub)
            bblock['name'] = bd
            sub_kutsa_vals = [v for v in bsub['TAT_KUTSA'].dropna().unique().tolist() if str(v).strip() not in ('', '-')]
            bblock['subGroup'] = sub_kutsa_vals[0] if sub_kutsa_vals else None
            attach_gender(bblock, bsub)
            if bblock['headcount'] > PRIVACY_THRESHOLD:
                bodies_out.append(bblock)
            elif bblock['headcount'] > 0:
                privacy_stats['entities_dropped'] += 1
        bodies_out.sort(key=lambda b: -b['headcount'])

        groups_out.append({
            'id': kv,
            'name': kv,
            'overall': overall,
            'ranks': ranks_out,
            'bodies': bodies_out,
        })

    groups_out.sort(key=lambda g: -g['overall']['headcount'])
    by_year[str(year)] = {'groups': groups_out}
    total_hc = sum(g['overall']['headcount'] for g in groups_out)
    print(f'  year {year}: {len(groups_out)} groups, total headcount (rank basis) = {total_hc:,.0f}')

# ── Cross-year stability flag ──────────────────────────────────────────
# The rank sheet has a documented classification break around 2024 (e.g.
# "אחים ואחיות" jumps from ~1,700 to ~39,800 headcount then back down) that
# is clearly a reporting-scope change, not real growth. Flag any entity
# whose headcount jumps by more than 2.5x between two years it has data
# for, so multi-year charts can warn instead of implying a real trend.
STABILITY_RATIO = 2.5

def compute_stability(kind):
    """kind: 'ranks' or 'bodies'. Returns {(kvutza, name): bool} stability map."""
    series = {}  # (kv, name) -> {year: headcount}
    for year in years:
        yd = by_year.get(str(year))
        if not yd:
            continue
        for g in yd['groups']:
            for item in g[kind]:
                key = (g['id'], item['name'])
                series.setdefault(key, {})[year] = item['headcount']

    stability = {}
    for key, by_yr in series.items():
        yrs_sorted = sorted(by_yr.keys())
        if len(yrs_sorted) < 2:
            stability[key] = True
            continue
        max_ratio = 1.0
        for a, b in zip(yrs_sorted, yrs_sorted[1:]):
            ha, hb = by_yr[a], by_yr[b]
            if ha > 0 and hb > 0:
                max_ratio = max(max_ratio, ha / hb, hb / ha)
        stability[key] = max_ratio <= STABILITY_RATIO
    return stability


for kind in ('ranks', 'bodies'):
    stab = compute_stability(kind)
    unstable_count = sum(1 for v in stab.values() if not v)
    print(f'Stability ({kind}): {len(stab) - unstable_count}/{len(stab)} stable, {unstable_count} flagged')
    for year in years:
        yd = by_year.get(str(year))
        if not yd:
            continue
        for g in yd['groups']:
            for item in g[kind]:
                item['stableTrend'] = stab.get((g['id'], item['name']), True)

bundle = {
    'meta': {
        'years': years,
        'defaultYear': 2024 if 2024 in years else years[-1],
        'partialYears': [y for y in years if y >= 2025],
        'source': 'דירוגים: שכר דיגיטלי דירוג.xlsx (bin-level) | גופים: שכר דיגיטלי גוף.xlsx, גיליון "sahar_dig_misrad" — אגף השכר באוצר',
        'bandOrder': BAND_ORDER,
        'bandLabels': BAND_LABELS,
        'methodologyNote': (
            'שכר ממוצע מחושב כסך ברוטו שוטף והפרשים (SUM_BRUTO_SHOTEF_HEFRESHIM) חלקי סך חודשי-משרה; '
            'עלות העסקה מחושבת באותו אופן מתוך SUM_ALUT_HAASAKA. עמודת AVG_SACHAR_P במקור אינה משמשת כי היא קבועה '
            'לכל שורות אותה קבוצה (KVUTZA) באותה שנה ואינה משתנה בין דירוגים/גופים. '
            'מקורות שונים לדירוגים ולגופים: נתוני הגופים מגיעים מקובץ "שכר דיגיטלי גוף" (גיליון "sahar_dig_misrad"), שם חודשי-המשרה '
            'מגיעים מעמודת COUNT_MISPAR_OVED (ספירת חודשי-עבודה גולמית, ללא שקלול חלקיות משרה). נתוני הדירוגים מגיעים '
            'מקובץ נפרד "שכר דיגיטלי דירוג" (bin-level, מדרגת שכר מדויקת ולא רצועה קבועה) שאינו כולל את עמודת '
            'COUNT_MISPAR_OVED — לכן חודשי-המשרה לדירוגים מחושבים מעמודת TOTAL_MISROT ("משרות", משוקללת לפי חלקיות '
            'משרה בפועל) במקום. בבדיקה אמפירית (2024, אחים ואחיות) שתי השיטות כמעט זהות בקבוצות עם משרות מלאות ברובן '
            '(למשל משרדי ממשלה, הפרש <0.5%), אך נבדלות ב-15%-17% בקבוצות עם היקף משרה חלקית גבוה יותר (מערכת הבריאות, '
            'שלטון מקומי) — כיוון ש-TOTAL_MISROT משקלל חלקיות משרה בעוד COUNT_MISPAR_OVED סופר כל חודש-עבודה כיחידה '
            'שלמה בלי קשר לאחוז המשרה. המשמעות: שכר ממוצע לדירוג עשוי להיות מעט שונה (עד כ-17%, תלוי בקבוצה) משכר '
            'ממוצע לאותו דירוג לו חושב מקובץ "גוף" — זהו הבדל שיטתי בין שני קבצי המקור, לא טעות בחישוב. גם רצועות '
            'השכר (bands) לדירוגים אינן מגיעות מעמודה מוכנה מראש אלא מחושבות ישירות ממדרגת השכר המדויקת '
            '(SALARY_MIDPOINT) של כל שורה. '
            'שנת 2025 חלקית (לא כל המערכות דיווחו עדיין, ובחלקן החודשים שדווחו חלקיים) — יש להתייחס אליה בזהירות. '
            'בשנים 2018-2019 מספר הקבוצות המדווחות מצומצם משמעותית (רק משרדי ממשלה, בטחוניים, מערכת הבריאות ומערכת החינוך), '
            'וב-2024 חל זינוק בהיקף הדיווח בגיליון הדירוגים לעומת 2023 (כנראה שיפור כיסוי, לא צמיחה אמיתית) — השוואה בין שנים '
            'צריכה להיעשות בזהירות רבה בשל פערי כיסוי אלה, ולא רק כמגמה כלכלית אמיתית. '
            f'בשל כך, לכל דירוג/גוף מחושב דגל "stableTrend": קפיצה של פי {STABILITY_RATIO} או יותר במספר המשרות בין שתי שנים '
            'עוקבות (שיש בהן נתונים) מסמנת אותו כלא-יציב — בסטודיו ההשוואה הרב-שנתית ישויות כאלה מסומנות באזהרה מפורשת.'
        )
    },
    'byYear': by_year,
}

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('window.SALARY_RANGES_DATA = ')
    json.dump(bundle, f, ensure_ascii=False)
    f.write(';\n')

print(f"Privacy suppression (threshold={PRIVACY_THRESHOLD}): "
      f"{privacy_stats['entities_dropped']} rank/body entities dropped entirely (total headcount <= {PRIVACY_THRESHOLD}), "
      f"{privacy_stats['gender_slices_suppressed']} gender-specific wage/band slices hidden (that gender's headcount <= {PRIVACY_THRESHOLD}).")

size_mb = os.path.getsize(OUT) / (1024 * 1024)
print(f'Wrote {OUT} ({size_mb:.2f} MB)')
