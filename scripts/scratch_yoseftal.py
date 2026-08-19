# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Load files
df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

df_pt = pd.read_csv('data/נתוני חלקיות משרה (1).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

for c in df_pt.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף']:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

yos_ov = df_ov[(df_ov['שם גוף'].astype(str).str.contains('יוספטל')) & (df_ov['שנה'] == 2024)]
yos_pt = df_pt[(df_pt['שם גוף'].astype(str).str.contains('יוספטל')) & (df_pt['שנה'] == 2024)].iloc[0]

print("=== YOSEFTAL TARGETS ===")
print("Target Men Count: 125")
print("Target Women Count: 214")
print("Target Total Count: 339")
print("Target Men Wage: 41200")
print("Target Women Wage: 25299")
print("Target Overall Wage: 31266")

print("\n--- PartTime Row ---")
for k, v in yos_pt.items():
    if pd.notnull(v):
        print(f"  {k}: {v}")

print("\n--- Overview Rows ---")
for idx, r in yos_ov.iterrows():
    print(f"  {r['דירוג']} | MC: {r['סך גברים עובדים']} | WC: {r['סך נשים עובדות']} | MW: {r['שכר גברים ממוצע']} | WW: {r['שכר נשים ממוצע']} | Emp: {r['מספר עובדים ממוצע לחודש']} | Gross: {r['ממוצע ברוטו שוטף והפרשים']}")

# Let's test formulas for 41200, 25299, 31266:
# In PartTime row:
# FT Men Count: 120, FT Men Wage: 40964
# FT Women Count: 188, FT Women Wage: 25125
# FT Total Count: 308, FT Total Wage: 31316
# PT Men Count: 5, PT Men Wage: NaN
# PT Women Count: 26, PT Women Wage: 27305
# PT Total Count: 31, PT Total Wage: NaN

# Total Men = 120 + 5 = 125! (EXACT MATCH)
# Total Women = 188 + 26 = 214! (EXACT MATCH)
# Total Count = 125 + 214 = 339! (EXACT MATCH)

# Now what about the wages:
# Men:
# (40964 * 120 + X * 5) / 125 = 41200
# => 41200 * 125 - 40964 * 120 = 5150000 - 4915680 = 234320 / 5 = 46864!
# Where does 46864 come from?
# Look at overview rows for Yoseftal:
# רופאים מומחים Men Wage: 103,940.8, MC: 25.67
# רופאים מתמחים Men Wage: 33,960.5, MC: 12.83
# רנטגנאים: 35,701.0, MC: 5.0
# אחים ואחיות: 28,882.2, MC: 30.42
# מנהלי: 18,178.5, MC: 33.83

# Women:
# (25125 * 188 + 27305 * 26) / 214 = (4723500 + 709930) / 214 = 5433430 / 214 = 25389.86
# Target is 25299!
# Let's check: (25125 * 188 + X * 26) / 214 = 25299
# => 25299 * 214 - 25125 * 188 = 5413986 - 4723500 = 690486 / 26 = 26557.15 !

# Overall Wage:
# (41200 * 125 + 25299 * 214) / 339 = (5150000 + 5413986) / 339 = 10563986 / 339 = 31162.2
# But Target Overall Wage is 31266!
# Notice: (31316 * 308 + X * 31) / 339 = 31266
# => 31266 * 339 - 31316 * 308 = 10599174 - 9645328 = 953846 / 31 = 30769.23 !

