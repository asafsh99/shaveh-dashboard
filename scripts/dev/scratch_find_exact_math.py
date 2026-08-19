# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
import itertools

df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]
for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

sub = df_ov[(df_ov['שם גוף'].astype(str).str.contains('שדות תעופה')) & (df_ov['שנה'] == 2024)]

print("Overview rows:")
for idx, r in sub.iterrows():
    print(r['דירוג'], r['סך גברים עובדים'], r['סך נשים עובדות'], r['מספר עובדים ממוצע לחודש'], r['שכר גברים ממוצע'], r['שכר נשים ממוצע'], r['ממוצע ברוטו שוטף והפרשים'])

# Goals:
# MenWage = 29455
# WomenWage = 22936
# OverallWage = 27744
# MenCount = 3084
# WomenCount = 1201
# TotalCount = 4285
# Gap = 22.1%

# Let's test combinations:
# What if:
# Look at the 3 rows:
# Row 1: אחר -> 28.416667 men (13755.737), 3.75 women (NaN)
# Row 2: מפעלי -> 3039.666667 men (29559.726), 1186.0 women (22975.731), 4225.666667 tot (27828.661)
# Row 3: חוזים -> 16.083333 men (34600.088), 10.666667 women (22565.106), 26.75 tot (30047.974)

# Test A: What if Tableau does NOT include 'אחר' in the wage averaging because women wage is NaN, or calculates across valid paired records?
# If paired only (rows 2 and 3):
# Men: (3039.666667 * 29559.726203 + 16.083333 * 34600.08808) / (3039.666667 + 16.083333) = 29586.26
# Women: (1186.0 * 22975.731459 + 10.666667 * 22565.106178) / (1186.0 + 10.666667) = 22972.07

# Test B: What if 29455 is:
# Look at: 29455, 22936, 27744
# Notice: (29472 + 29440) / 2 = 29456
# What if: (Full-time wage * FT count + Part-time wage * PT count) ...
# What if FT + PT from the part-time dataset:
# FT Men: 3075, wage: 29472
# PT Men: 9, wage: 14969
# FT Women: 1194, wage: 22952
# PT Women: 7, wage: 16551
# Total Men count = 3075 + 9 = 3084
# Total Women count = 1194 + 7 = 1201
# Total Employees = 4269 + 16 = 4285
# Total Men Wage = (3075 * 29472 + 9 * 14969) / 3084 = 29429.67
# Total Women Wage = (1194 * 22952 + 7 * 16551) / 1201 = 22914.69
# Total Overall Wage = (4269 * 27762 + 16 * 15655) / 4285 = 27716.81

# Test C: What if Tableau calculated:
# 29455 / 22936 / 27744:
# Notice:
# 29455 = (29472 * 3075 + 13755.737 * 28.416667) / (3075 + 28.416667) -> (90626400 + 390891) / 3103.417 = 29327.8
# What if: (29559.726 * 3075 + 34600.088 * 16.083) / (3075 + 16.083) -> (90896157 + 556473) / 3091.083 = 29585.9
# What if:
# Look at: 29455: 29455 / 29472 = 0.9994
# 22936: 22936 / 22952 = 0.9993
# 27744: 27744 / 27762 = 0.99935
# Gap = (29455 - 22936) / 29455 = 6519 / 29455 = 0.22132065 -> 22.1%!

# Let's test if there is an exact formula across multiple bodies:
# Let's inspect other bodies in the same graph (Image 3) to see their numbers in Tableau!
