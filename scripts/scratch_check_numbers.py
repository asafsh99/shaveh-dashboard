# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== CHECKING PART TIME CSV ===")
df_pt = pd.read_csv('data/נתוני חלקיות משרה (1).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]
sub_pt = df_pt[df_pt['שם גוף'].astype(str).str.contains('שדות תעופה', na=False)]
print(sub_pt[sub_pt['שנה'] == 2024].to_dict(orient='records'))

print("\n=== CHECKING OVERVIEW CSV (נתוני סקירה כללית (3).csv) ===")
df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]
sub_ov = df_ov[df_ov['שם גוף'].astype(str).str.contains('שדות תעופה', na=False)]
print("Overview rows count:", len(sub_ov))
print(sub_ov[sub_ov['שנה'] == 2024].to_dict(orient='records'))
