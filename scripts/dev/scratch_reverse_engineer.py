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

boi_ov = df_ov[(df_ov['שם גוף'].astype(str).str.contains('בנק ישראל')) & (df_ov['שנה'] == 2024)]
boi_pt = df_pt[(df_pt['שם גוף'].astype(str).str.contains('בנק ישראל')) & (df_pt['שנה'] == 2024)].iloc[0]

print("=== BANK OF ISRAEL TARGETS ===")
print("Target Men Wage: 36348")
print("Target Women Wage: 32055")
print("Target Overall Wage: 34361")
print("Target Men Count: 578")
print("Target Women Count: 475")

# Let's test combinations:
# In PartTime file:
# FT Men: 559, FT Men Wage: 36414, PT Men: 19, PT Men Wage: 16166
# FT Women: 467, FT Women Wage: 32079, PT Women: 7, PT Women Wage: 13381
# FT Total: 1026, FT Total Wage: 34406, PT Total: 26, PT Total Wage: 15450

# In Overview file:
# ארעיים: Men = 177.25, MenWage = 15122.464867, Women = 143.0, WomenWage = 12221.567450
# מפעלי: Men = 390.833333, MenWage = 40981.859063, Women = 326.083333, WomenWage = 37934.072300
# חוזים אישיים: Men = 10.0, MenWage = 61568.316667, Women = 5.0, WomenWage = 56594.866667

# Test 1: What if Tableau does:
# (FT_Wage * FT_Count + PT_Wage * PT_Count) / (FT_Count + PT_Count)?
# Men: (36414 * 559 + 16166 * 19) / (559 + 19) = (20355426 + 307154) / 578 = 20662580 / 578 = 35748.4

# Test 2: What if:
# Look at: 36,414 (FT) vs 36,348 (Tableau) -> Diff is only 66 shekels!
# Look at: 32,079 (FT) vs 32,055 (Tableau) -> Diff is only 24 shekels!
# Look at: 34,406 (FT) vs 34,361 (Tableau) -> Diff is only 45 shekels!
# Look at: Airport: 29,472 (FT) vs 29,455 (Tableau) -> Diff is only 17 shekels!
# Look at: Airport: 22,952 (FT) vs 22,936 (Tableau) -> Diff is only 16 shekels!
# Look at: Airport: 27,762 (FT) vs 27,744 (Tableau) -> Diff is only 18 shekels!

print("\n--- Differences from Full-Time dataset ---")
print("BOI Men: 36414 - 36348 =", 36414 - 36348)
print("BOI Women: 32079 - 32055 =", 32079 - 32055)
print("BOI Total: 34406 - 34361 =", 34406 - 34361)

# How is the diff calculated?
# Let's check:
# For BOI:
# Total Men count in Overview = 177.25 + 390.833333 + 10.0 = 578.083333 -> 578
# Total Women count in Overview = 143.0 + 326.083333 + 5.0 = 474.083333 -> 474 (or 475)
# Total Men FT = 559, Total Women FT = 467
# Total Men PT in PartTime file = 19
# Total Women PT in PartTime file = 7
# 559 + 19 = 578!
# 467 + 7 = 474 (or with rounding in table 475)!

# What about the wages?
# How do 36,348 and 32,055 and 34,361 get calculated?
# Let's test all possible formulas in a loop:
target_m = 36348
target_w = 32055
target_t = 34361

# Let's test:
# Formula 1: What if (FT_Men_Wage * 559 + Overview_Men_Wage * 19) / 578?
# (36414 * 559 + 33409.05 * 19) / 578 = 36315.3

# Formula 2: What if:
# Look at:
# 36414 * (559 / 560) ?
# What if:
# (FT_Men_Wage * 559 + something) / 578 = 36348
# => 36348 * 578 - 36414 * 559 = 21009144 - 20355426 = 653718
# => 653718 / 19 = 34406.21 !!!!!!!!!!!!!!!!! WOW !!!!!!!!!!!!!!!!!!
# LOOK AT THAT: 653718 / 19 = 34406.21 = FT_TOTAL_WAGE (34,406) !!!!!!!!!!!!!!
print("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
print("FOUND IT FOR MEN:")
print("(FT_Men_Wage * FT_Men_Count + FT_Total_Wage * PT_Men_Count) / (FT_Men_Count + PT_Men_Count):")
val_m = (36414 * 559 + 34406 * 19) / (559 + 19)
print(f"Men: {val_m:.2f} -> round: {round(val_m)}")

# Let's test for WOMEN:
# (FT_Women_Wage * FT_Women_Count + FT_Total_Wage * PT_Women_Count) / (FT_Women_Count + PT_Women_Count):
val_w = (32079 * 467 + 34406 * 7) / (467 + 7)
print(f"Women: {val_w:.2f} -> round: {round(val_w)}")
# Target women: 32055 vs 32113?
# What if for Women: (FT_Women_Wage * 467 + PT_Women_Wage * 7) ...
# Let's test:
# 32055 * 474 - 32079 * 467 = 15194070 - 14980893 = 213177 / 7 = 30453.8 ?

# Let's test Airport Authority with this formula:
# FT Men: 3075, FT Men Wage: 29472, PT Men: 9, FT Total Wage: 27762
val_m_airport = (29472 * 3075 + 27762 * 9) / (3075 + 9)
print(f"Airport Men: {val_m_airport:.2f} -> round: {round(val_m_airport)}") # 29467

# Let's test all possible formulas for Airport:
# Airport Target: Men = 29455, Women = 22936, Total = 27744
# Let's solve:
# 29455 * 3084 - 29472 * 3075 = 90839220 - 90626400 = 212820 / 9 = 23646.67
# 22936 * 1201 - 22952 * 1194 = 27546136 - 27404688 = 141448 / 7 = 20206.85
# 27744 * 4285 - 27762 * 4269 = 118883040 - 118516000 = 367040 / 16 = 22940.0

# What about:
# Look at the PartTime file columns:
# What if:
# Total Wage = (FT Total Wage * FT Total Count + PT Total Wage * PT Total Count) / Total Count ?
# For Airport: (27762 * 4269 + 15655 * 15) / (4269 + 15) = (118516000 + 234825) / 4284 = 27719.6
