# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

sub = df_ov[(df_ov['שם גוף'].astype(str).str.contains('שדות תעופה')) & (df_ov['שנה'] == 2024)]

print("Rows for airport 2024 in Overview:")
for idx, r in sub.iterrows():
    print(r['דירוג'], "| MenCount:", r['סך גברים עובדים'], "| WomenCount:", r['סך נשים עובדות'], "| MenWage:", r['שכר גברים ממוצע'], "| WomenWage:", r['שכר נשים ממוצע'], "| TotalWage:", r['ממוצע ברוטו שוטף והפרשים'], "| TotalEmployees:", r['מספר עובדים ממוצע לחודש'])

# Let's find the exact combination that gives 29455, 22936, 27744:
# Total Men Count: 28.416667 + 3039.666667 + 16.083333 = 3084.166667 -> 3,084!
# Total Women Count: 3.75 + 1186.0 + 10.666667 = 1200.416667 -> 1,201!
# Total Employees: 32.166667 + 4225.666667 + 26.75 = 4284.583333 -> 4,285!

# How to get 29455, 22936, 27744?
# Let's test:
# 1. Total Wage:
# Row 2 (דירוג מפעלי): 4225.666667 * 27828.660785 = 117604639.6
# Row 3 (חוזים אישיים): 26.75 * 30047.973713 = 803783.3
# Sum = 118408422.9
# If divided by total employees 4284.583333 -> 118408422.9 / 4284.583333 = 27635.9
# If divided by (4225.667 + 26.75) = 4252.416667 -> 118408422.9 / 4252.416667 = 27842.6

# What about:
# Let's search across all public bodies in the dataset to see if 29455, 22936, 27744 is in another file or sheet or column:
for col in df_ov.columns:
    if 'שכר' in col or 'ממוצע' in col or 'ברוטו' in col:
        m = sub[col].dropna()
        if len(m) > 0:
            print(f"Col: {col} -> values: {list(m)}")

# Let's check other CSV files in data/
for f in ['נתוני חלקיות משרה (1).csv', 'נתוני שכר נמוך (1).csv', 'נתוני מקבלי השלמה למינימום (2).csv']:
    df = pd.read_csv(f'data/{f}', sep='\t', encoding='utf-16le', skiprows=1)
    df.columns = [c.strip() for c in df.columns]
    for c in df.columns:
        if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף']:
            df[c] = pd.to_numeric(df[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')
    s = df[(df['שם גוף'].astype(str).str.contains('שדות תעופה')) & (df['שנה'] == 2024)]
    print(f"\nFile: {f}")
    for idx, r in s.iterrows():
        for col in df.columns:
            val = r[col]
            if pd.notnull(val) and (isinstance(val, (int, float)) and val > 100):
                print(f"  {col}: {val}")
