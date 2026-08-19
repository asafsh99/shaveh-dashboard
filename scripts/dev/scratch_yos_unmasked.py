# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

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

y_pt = df_pt[(df_pt['שם גוף'].astype(str).str.contains('יוספטל')) & (df_pt['שנה'] == 2024)].iloc[0]

# In PartTime file for Yoseftal:
# FT Men: 120, FT Men Wage: 40964
# FT Women: 188, FT Women Wage: 25125
# FT Total: 308, FT Total Wage: 31316
# PT Men: 5, PT Women: 26, PT Total: 31
# PT Women Wage: 27305

# In Tableau:
# Target Men Wage = 41200
# Target Women Wage = 25299
# Target Overall Wage = 31266

# How to get 41200:
# Notice: 40964 + 236 = 41200!
# What is 236?
# 40964 * (125 / 120) = 42670
# (40964 * 120 + 46864 * 5) / 125 = 41200!
# What if:
# Look at 41200:
# (40964 * 120 + 31316 * 5) / 125 = 40578
# What if the PartTime men wage (suppressed due to privacy in CSV < 5) was actually in Tableau's backend database?
# In Tableau's backend, the database has all raw records WITHOUT privacy suppression!
# When Tableau computes the aggregate for Yoseftal, it uses the exact backend unsuppressed database!
# In the exported CSV, rows/cells with < 5 employees are blanked out (NaN), but Tableau computes from the full unmasked data!

print("Target numbers for Yoseftal in Tableau:")
print("Men: 125 -> 41200")
print("Women: 214 -> 25299")
print("Total: 339 -> 31266")
print("Gap: (41200 - 25299) / 41200 =", (41200 - 25299) / 41200 * 100)
