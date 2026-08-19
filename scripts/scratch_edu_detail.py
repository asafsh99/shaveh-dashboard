# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]
for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')
df_ov['שנה'] = pd.to_numeric(df_ov['שנה'], errors='coerce')

edu = df_ov[(df_ov['שם גוף'] == 'משרד החינוך - מורים') & (df_ov['שנה'] == 2024)]
print(f"Count of rows for 'משרד החינוך - מורים' (2024): {len(edu)}")
for idx, r in edu.iterrows():
    print(r['דירוג'], "| MC:", r['סך גברים עובדים'], "| WC:", r['סך נשים עובדות'], "| MW:", r['שכר גברים ממוצע'], "| WW:", r['שכר נשים ממוצע'], "| Monthly:", r['מספר עובדים ממוצע לחודש'], "| Gross:", r['ממוצע ברוטו שוטף והפרשים'])

df_pt = pd.read_csv('data/נתוני חלקיות משרה (1).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]
for c in df_pt.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף']:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')
df_pt['שנה'] = pd.to_numeric(df_pt['שנה'], errors='coerce')

edu_pt = df_pt[(df_pt['שם גוף'] == 'משרד החינוך - מורים') & (df_pt['שנה'] == 2024)]
print(f"\nPartTime row for 'משרד החינוך - מורים' (2024):")
for idx, r in edu_pt.iterrows():
    for k, v in r.items():
        print(f"  {k}: {v}")
