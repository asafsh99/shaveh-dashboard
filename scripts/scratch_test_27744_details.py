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

# Numeric clean
for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

for c in df_pt.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף']:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

# Check airport authority across all calculations:
ov_airport = df_ov[(df_ov['שם גוף'].astype(str).str.contains('שדות תעופה')) & (df_ov['שנה'] == 2024)]
pt_airport = df_pt[(df_pt['שם גוף'].astype(str).str.contains('שדות תעופה')) & (df_pt['שנה'] == 2024)]

print("=== AIRPORT AUTHORITY 2024 DETAILS ===")
print("Part-time dataset record:")
for col, val in pt_airport.iloc[0].items():
    print(f"  {col}: {val}")

print("\nOverview dataset records:")
for idx, row in ov_airport.iterrows():
    print(f"  Rank: {row['דירוג']} | MenCount: {row['סך גברים עובדים']} | WomenCount: {row['סך נשים עובדות']} | TotalAvgMonth: {row['מספר עובדים ממוצע לחודש']} | MenWage: {row['שכר גברים ממוצע']} | WomenWage: {row['שכר נשים ממוצע']} | GrossRegular: {row['ממוצע ברוטו שוטף והפרשים']}")

# Let's test all possible formulas to get 27744:
# 1. Total monthly positions:
# דירוג מפעלי: 4225.666667 * 27828.660785 = 117604178.68
# חוזים אישיים: 26.75 * 30047.973713 = 803783.30
# אחר: 32.166667 * (??)
# Total sum of row 2 and 3 = 118,407,961.98
# If divided by total valid positions (4225.666667 + 26.75 = 4252.416667) = 27842.62
# If divided by total monthly positions (4225.666667 + 26.75 + 32.166667 = 4284.583333) = 27635.81

# What if:
# Total men wage mass in Overview: 28.416667*13755.737487 + 3039.666667*29559.726203 + 16.083333*34600.08808 = 90670412.30
# Total women wage mass in Overview: 1186.0*22975.731459 + 10.666667*22565.106178 = 27490578.14
# Total combined wage mass = 118,160,990.44
# If divided by:
# 1. Total men + women valid for wage:
# Total men = 3084.166667. Valid women = 1186.0 + 10.666667 = 1196.666667.
# Total valid = 3084.166667 + 1196.666667 = 4280.833333.
# 118,160,990.44 / 4280.833333 = 27602.30
# 2. Total men + total women (4284.583333):
# 118,160,990.44 / 4284.583333 = 27578.13
# 3. What about without row 1 (אחר)?
# Only row 2 (מפעלי) and row 3 (חוזים):
# Men: 3039.666667*29559.726203 + 16.083333*34600.08808 = 90279517.47
# Women: 27490578.14
# Total = 117,770,095.61
# Divided by valid men+women in rows 2 & 3 (3055.75 + 1196.666667 = 4252.416667):
# 117,770,095.61 / 4252.416667 = 27694.86

# What about:
# Let's search if 27744 is:
# (MenWage * MenCount + WomenWage * WomenCount) / (MenCount + WomenCount) where:
# MenWage = 29472 (from PT) or 29560 (from Overview row 2)?
# 29472 * 3084 + 22952 * 1201 -> (90891648 + 27565352) / 4285 = 118457000 / 4285 = 27644
# What about (29559.726 * 3084.167 + 22975.731 * 1200.417) / 4284.583 = (91167098 + 27580459) / 4284.583 = 118747557 / 4284.583 = 27715
# What about row 2 + row 3:
# (27828.66 * 4225.667 + 30047.97 * 26.75) / 4269 = 118407961.98 / 4269 = 27736.7
# What about (27828.66 * 4226 + 30048 * 27) / 4269 = 27742.7 ~ 27744 !
