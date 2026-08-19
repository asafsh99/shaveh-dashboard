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

sub_ov = df_ov[(df_ov['שם גוף'].astype(str).str.contains('שדות תעופה')) & (df_ov['שנה'] == 2024)]
sub_pt = df_pt[(df_pt['שם גוף'].astype(str).str.contains('שדות תעופה')) & (df_pt['שנה'] == 2024)]

print("=== OVERVIEW ROWS FOR AIRPORT 2024 ===")
for idx, r in sub_ov.iterrows():
    print(dict(r))

print("\n=== TARGETS FROM TABLEAU IMAGE 3 ===")
print("Target Men Wage: 29455")
print("Target Women Wage: 22936")
print("Target Overall Wage: 27744")
print("Gap: 22.1% -> (29455 - 22936)/29455 = ", (29455 - 22936)/29455*100)

# Let's test combinations to find 29,455 and 22,936 and 27,744!
# Overview has 3 ranks:
# 1. אחר: Men = 28.416667, MenWage = 13755.737487, Women = 3.75, WomenWage = NaN, MonthlyAvg = 32.166667
# 2. דירוג מפעלי: Men = 3039.666667, MenWage = 29559.726203, Women = 1186.0, WomenWage = 22975.731459, MonthlyAvg = 4225.666667, GrossRegular = 27828.660785
# 3. חוזים אישיים: Men = 16.083333, MenWage = 34600.088080, Women = 10.666667, WomenWage = 22565.106178, MonthlyAvg = 26.75, GrossRegular = 30047.973713

# Test 1: What if we take only ranks where both men and women exist (or without "אחר")?
m2 = 3039.666667 * 29559.726203
m3 = 16.083333 * 34600.088080
m1 = 28.416667 * 13755.737487

w2 = 1186.0 * 22975.731459
w3 = 10.666667 * 22565.106178

print("\n--- Test 1: Men without 'אחר' ---")
print("Men (m2+m3)/(3039.667+16.083):", (m2+m3)/(3039.666667+16.083333))

print("\n--- Test 2: What about PT data + FT data combined? ---")
# In PT data:
# FT Men = 3075, FT Men Wage = 29472. PT Men = 9, PT Men Wage = 14969
# FT Women = 1194, FT Women Wage = 22952. PT Women = 7, PT Women Wage = 16551
print("FT+PT Men combined:", (3075*29472 + 9*14969)/(3075+9))
print("FT+PT Women combined:", (1194*22952 + 7*16551)/(1194+7))

# Test 3: What about other columns in Overview?
# Columns: 'ממוצע ברוטו מס לגברים', 'ממוצע עלות העסקה לגברים'
for col_m in ['שכר גברים ממוצע', 'ממוצע ברוטו מס לגברים', 'ממוצע עלות העסקה לגברים']:
    for col_w in ['שכר נשים ממוצע', 'ממוצע ברוטו מס לנשים', 'ממוצע עלות העסקה לנשים']:
        for col_t in ['ממוצע ברוטו שוטף והפרשים', 'ממוצע ברוטו למס', 'ממוצע עלות העסקה']:
            # Weighted by men/women counts:
            ms = (sub_ov['סך גברים עובדים'] * sub_ov[col_m]).dropna().sum()
            mc = sub_ov.dropna(subset=[col_m])['סך גברים עובדים'].sum()
            ws = (sub_ov['סך נשים עובדות'] * sub_ov[col_w]).dropna().sum()
            wc = sub_ov.dropna(subset=[col_w])['סך נשים עובדות'].sum()
            
            # Simple average of ranks
            # Weighted average
            print(f"{col_m} weighted: {ms/mc:.2f} | {col_w} weighted: {ws/wc:.2f}")
            break
        break
    break

# Test 4: What if 29,455 and 22,936 and 27,744 are from an FTE (משרות) weighting?
# Or what if Tableau does:
# Let's search if (29559.726203 * 3040 + 34600.08808 * 16 + 13755.737487 * 28) ...
# Let's check with rounded counts:
# 3040, 16, 28 -> 3084
# 1186, 11, 4 -> 1201
m_round = (29560 * 3040 + 34600 * 16 + 13756 * 28) / 3084
print("Men with rounded counts and wages:", m_round)

# What if 'אחר' is NOT in men?
m_no_other = (29560 * 3040 + 34600 * 16) / (3040 + 16)
print("Men no other:", m_no_other)

# What if (29559.73 * 3040 + 34600.09 * 16 + 13755.74 * 28.416667) / 3084.166667:
print("Men exact:", (29559.726203 * 3039.666667 + 34600.08808 * 16.083333 + 13755.737487 * 28.416667) / 3084.166667)

# What about: What if 29455 is the average of Full-Time and All Ranks?
# (29472 + 29440) / 2 = 29456 ~ 29455 !
# (22952 + 22972) / 2 = 22962
# What if 29455 is from a specific year or combination?
# Let's check Tekuma or other bodies in the same graph to find the exact formula!
