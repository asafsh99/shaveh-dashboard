# -*- coding: utf-8 -*-
"""
Regenerates data/smoothing_data.json and scripts/smoothing_data.js from the
source Excel file. Run this whenever the source file changes:

    python scripts/dev/build_smoothing_bundle.py

Source: data/שכר דיגיטלי דירוג.xlsx (first/only sheet) — a bin-level
salary histogram export (year x rank x group x gender x salary-bin),
used by smoothing_studio.html to render smoothed salary-distribution
curves. Multi-year (currently 2018-2025); the app's year selector and
per-series year picker are driven entirely by whichever years are
present in this file, so replacing it with an updated export needs no
code changes.

The source columns mostly match the field names the app expects (SHANA,
DIRUG_MEUHAD, KVUTZA, NAME_MIN, SALARY_MIDPOINT, COUNT_OVEDIM,
TOTAL_MISROT, AVG_SALARY_IN_BIN, TOTAL_DIRUG_OVEDIM, PCT_OVEDIM) — those
are a straight passthrough. As of 2026-08-30 the source also carries
the same salary-layer columns used by the "שכר דיגיטלי" tab's bundle
(scripts/dev/build_salary_ranges_bundle.py) at bin-level granularity
instead of just per-rank aggregates, so this script also emits those,
renamed to short keys (given as OUT_KEY below) purely to keep file size
down across ~35k rows - the values themselves are untouched sums:
  COUNT_MISPAR_OVED          -> posMonths   (position-months, wage denominator)
  SUM_BRUTO_SHOTEF_HEFRESHIM -> sumGross    (used for the exact avg wage)
  SUM_ALUT_HAASAKA           -> sumCost     (used for the exact avg employer cost)
  total_sachar_mshulav       -> lBase   \\
  total_salary_additions     -> lAdd     } the 4-layer decomposition,
  total_additional_work      -> lExtra    } identical methodology to
  total_expense_refund       -> lExp      } build_salary_ranges_bundle.py
  total_other_payments       -> lOther  /
Unlike the previous source file, this one is NOT pre-suppressed (rows
with as few as 1-4 employees exist in it), so the privacy filter below
is load-bearing, not just a safety check.
"""
import pandas as pd
import numpy as np
import json, sys, os

sys.stdout.reconfigure(encoding='utf-8')

SRC = 'data/שכר דיגיטלי דירוג.xlsx'
OUT_JSON = 'data/smoothing_data.json'
OUT_JS = 'scripts/smoothing_data.js'
PRIVACY_THRESHOLD = 5  # matches DataEngine.PRIVACY_THRESHOLD used elsewhere in the dashboard

# src column -> output key (identity for the original passthrough fields). Bin identity/
# privacy fields are REQUIRED - the script refuses to run without them. The wage/layer
# enrichment fields are OPTIONAL - the source file has dropped/re-added them before, and
# when one is missing the app already degrades gracefully (e.g. the "precise wage" KPI line
# just hides itself when its denominator is unavailable), so we emit null rather than fail.
REQUIRED_FIELD_MAP = {
    'SHANA': 'SHANA', 'DIRUG_MEUHAD': 'DIRUG_MEUHAD', 'KVUTZA': 'KVUTZA',
    'NAME_MIN': 'NAME_MIN', 'SALARY_MIDPOINT': 'SALARY_MIDPOINT',
    'COUNT_OVEDIM': 'COUNT_OVEDIM', 'TOTAL_MISROT': 'TOTAL_MISROT',
    'AVG_SALARY_IN_BIN': 'AVG_SALARY_IN_BIN',
    'TOTAL_DIRUG_OVEDIM': 'TOTAL_DIRUG_OVEDIM', 'PCT_OVEDIM': 'PCT_OVEDIM',
}
OPTIONAL_FIELD_MAP = {
    'COUNT_MISPAR_OVED': 'posMonths',
    'SUM_BRUTO_SHOTEF_HEFRESHIM': 'sumGross',
    'SUM_ALUT_HAASAKA': 'sumCost',
    'total_sachar_mshulav': 'lBase',
    'total_salary_additions': 'lAdd',
    'total_additional_work': 'lExtra',
    'total_expense_refund': 'lExp',
    'total_other_payments': 'lOther',
}
INT_FIELDS = {'SHANA', 'SALARY_MIDPOINT', 'COUNT_OVEDIM', 'TOTAL_DIRUG_OVEDIM'}
STR_FIELDS = {'DIRUG_MEUHAD', 'KVUTZA', 'NAME_MIN'}

print(f'Reading {SRC} ...')
df = pd.read_excel(SRC, sheet_name=0, header=0)
df.columns = [str(c).strip() for c in df.columns]

missing_required = [f for f in REQUIRED_FIELD_MAP if f not in df.columns]
if missing_required:
    raise SystemExit(f'ERROR: source file is missing REQUIRED columns: {missing_required}')

missing_optional = [f for f in OPTIONAL_FIELD_MAP if f not in df.columns]
if missing_optional:
    print(f'WARNING: source file is missing optional columns {missing_optional} - '
          f'the affected app features (precise wage/cost, salary-layer breakdown) will be '
          f'unavailable for ranks until these are added back.')

FIELD_MAP = dict(REQUIRED_FIELD_MAP)
FIELD_MAP.update({f: out for f, out in OPTIONAL_FIELD_MAP.items() if f in df.columns})
ALL_OUT_KEYS = list(REQUIRED_FIELD_MAP.values()) + list(OPTIONAL_FIELD_MAP.values())

df = df.dropna(subset=['SHANA', 'DIRUG_MEUHAD', 'KVUTZA', 'NAME_MIN', 'SALARY_MIDPOINT'])

before = len(df)
df = df[df['COUNT_OVEDIM'] > PRIVACY_THRESHOLD]
suppressed = before - len(df)
if suppressed:
    print(f'Dropped {suppressed} row(s) with COUNT_OVEDIM <= {PRIVACY_THRESHOLD} (privacy floor).')

def clean_row(r):
    out = {k: None for k in ALL_OUT_KEYS}  # missing-optional-column keys stay null
    for src_field, out_key in FIELD_MAP.items():
        v = r[src_field]
        if pd.isna(v):
            out[out_key] = None
        elif src_field in INT_FIELDS:
            out[out_key] = int(round(float(v)))
        elif src_field in STR_FIELDS:
            out[out_key] = str(v).strip()
        else:
            out[out_key] = round(float(v), 4)
    return out

records = [clean_row(r) for _, r in df.iterrows()]
print(f'Parsed {len(records)} bin-level records '
      f'({df["KVUTZA"].nunique()} groups, {df["DIRUG_MEUHAD"].nunique()} ranks, '
      f'years={sorted(df["SHANA"].unique().tolist())}).')

with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, separators=(',', ':'))

with open(OUT_JS, 'w', encoding='utf-8') as f:
    f.write('window.SMOOTHING_RAW_DATA = ')
    json.dump(records, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

for path in (OUT_JSON, OUT_JS):
    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f'Wrote {path} ({size_mb:.2f} MB)')
