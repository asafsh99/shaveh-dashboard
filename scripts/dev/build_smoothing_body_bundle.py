# -*- coding: utf-8 -*-
"""
Regenerates scripts/smoothing_body_data.js (the only format the app actually
loads - a `data/smoothing_body_data.json` twin used to be written too, but
nothing ever read it, so it was dropped) from the "גוף" (bodies/employers)
sheet of the digital-salary source file. Run whenever that source file changes:

    python scripts/dev/build_smoothing_body_bundle.py

This is the body-level counterpart to build_smoothing_bundle.py (which
covers ranks from שכר דיגיטלי דירוג.xlsx). The two datasets are NOT
the same shape:
  - Ranks (שכר דיגיטלי דירוג): one row per exact SALARY_MIDPOINT bin
    (continuous-ish histogram, many distinct salary points per entity).
  - Bodies ("גוף" sheet): one row per one of 11 FIXED salary bands
    (kvuza_tvach) per body - the source simply does not report bodies
    at finer resolution than that. A body's "distribution" curve in the
    studio is therefore only ever an 11-point step, not a smooth curve -
    this is a real data limitation, not a bug, and is documented in the
    studio's methodology panel.

Field mapping (src -> output key). Money/layer fields use the exact
same source columns and short keys as build_smoothing_bundle.py's rank
bundle, so a single computeSeriesData()-style aggregation works for
both entity types:
  MISRAD_GROUP               -> BODY_NAME (body/employer display name)
  kvuza_tvach                -> BAND (one of the 11 fixed bands; mapped
                                 to a representative SALARY_MIDPOINT in
                                 JS via BAND_MIDPOINTS, not baked in here)
  TAT_KUTSA                  -> SUBGROUP (informational only, currently unused by the app)
  SUM_CHELKEUT_HODESH_MISRA  -> TOTAL_MISROT (position-share analogue of the rank file's TOTAL_MISROT)
  COUNT_MISPAR_OVED          -> posMonths
  SUM_BRUTO_SHOTEF_HEFRESHIM -> sumGross
  SUM_ALUT_HAASAKA           -> sumCost
  total_sachar_mshulav       -> lBase
  total_salary_additions     -> lAdd
  total_additional_work      -> lExtra
  total_expense_refund       -> lExp
  total_other_payments       -> lOther

Rows in the essentially-meaningless "לא מוגדר" (undefined) band are
dropped - they account for <0.01% of headcount in this file and don't
correspond to a real salary point.
"""
import pandas as pd
import json, sys, os

sys.stdout.reconfigure(encoding='utf-8')

SRC = 'data/שכר דיגיטלי גוף.xlsx'
SHEET = 'גוף'
OUT_JS = 'scripts/smoothing_body_data.js'
PRIVACY_THRESHOLD = 5

FIELD_MAP = {
    'SHANA': 'SHANA',
    'MISRAD_GROUP': 'BODY_NAME',
    'kvuza_tvach': 'BAND',
    'KVUTZA': 'KVUTZA',
    'TAT_KUTSA': 'SUBGROUP',
    'NAME_MIN': 'NAME_MIN',
    'COUNT_OVEDIM': 'COUNT_OVEDIM',
    'SUM_CHELKEUT_HODESH_MISRA': 'TOTAL_MISROT',
    'COUNT_MISPAR_OVED': 'posMonths',
    'SUM_BRUTO_SHOTEF_HEFRESHIM': 'sumGross',
    'SUM_ALUT_HAASAKA': 'sumCost',
    'total_sachar_mshulav': 'lBase',
    'total_salary_additions': 'lAdd',
    'total_additional_work': 'lExtra',
    'total_expense_refund': 'lExp',
    'total_other_payments': 'lOther',
}
INT_FIELDS = {'SHANA', 'COUNT_OVEDIM'}
STR_FIELDS = {'BODY_NAME', 'BAND', 'KVUTZA', 'SUBGROUP', 'NAME_MIN'}

print(f'Reading {SRC!r} sheet {SHEET!r} ...')
df = pd.read_excel(SRC, sheet_name=SHEET, header=0)
df.columns = [str(c).strip() for c in df.columns]

missing = [f for f in FIELD_MAP if f not in df.columns]
if missing:
    raise SystemExit(f'ERROR: source sheet is missing expected columns: {missing}')

df = df.dropna(subset=['SHANA', 'MISRAD_GROUP', 'KVUTZA', 'NAME_MIN', 'kvuza_tvach'])
df = df[df['kvuza_tvach'] != 'לא מוגדר']

before = len(df)
df = df[df['COUNT_OVEDIM'] > PRIVACY_THRESHOLD]
suppressed = before - len(df)
if suppressed:
    print(f'Dropped {suppressed} row(s) with COUNT_OVEDIM <= {PRIVACY_THRESHOLD} (privacy floor).')

def clean_row(r):
    out = {}
    for src_field, out_key in FIELD_MAP.items():
        v = r[src_field]
        if pd.isna(v):
            out[out_key] = None
        elif out_key in INT_FIELDS:
            out[out_key] = int(round(float(v)))
        elif out_key in STR_FIELDS:
            out[out_key] = str(v).strip()
        else:
            out[out_key] = round(float(v), 4)
    return out

records = [clean_row(r) for _, r in df.iterrows()]
print(f'Parsed {len(records)} body-level records '
      f'({df["KVUTZA"].nunique()} groups, {df["MISRAD_GROUP"].nunique()} bodies, '
      f'years={sorted(df["SHANA"].unique().tolist())}).')

with open(OUT_JS, 'w', encoding='utf-8') as f:
    f.write('window.SMOOTHING_BODY_DATA = ')
    json.dump(records, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

for path in (OUT_JS,):
    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f'Wrote {path} ({size_mb:.2f} MB)')
