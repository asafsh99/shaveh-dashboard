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

# Let's inspect the math for:
# 1. Airport Authority (2024):
# FT Men: 3075, FT MW: 29472 | PT Men: 9, PT MW: 14969 | Target: 3084 men -> 29455
# Notice: (29472 * 3075 + 14969 * 9) / 3084 = (90626400 + 134721) / 3084 = 90761121 / 3084 = 29429.68 (Not 29455)
# But what if PT Men wage was:
# In Overview for Airport Authority:
# Ranks:
# אחר: 28.42 men (13,755.74)
# מפעלי: 3039.67 men (29,559.73)
# חוזים: 16.08 men (34,600.09)
# Total Overview Men Sum = (28.416667 * 13755.737487 + 3039.666667 * 29559.726203 + 16.083333 * 34600.088080) = 90803157
# Total Overview Men Count = 3084.166667
# Weighted Overview Men Wage = 90803157 / 3084.166667 = 29441.6
# What if:
# Look at (29559.73 * 3039.67) / 3039.67 = 29559.73
# What if (29472 + 29440) / 2 = 29456 (approx 29455)

# 2. Yoseftal (2024):
# FT Men: 120, FT MW: 40964 | PT Men: 5, PT MW: NaN | Target: 125 men -> 41200
# Target Women: 214 women -> 25299
# Target Total: 339 -> 31266
# Look at Yoseftal:
# FT Women: 188 (25125), PT Women: 26 (27305)
# In Overview:
# Ranks with Women:
# אחים ואחיות: 96.25 women (28135.74)
# מנהלי: 64.92 women (17215.97)
# רנטגנאים: 7.00 women (34886.58)
# עובדי מעבדה: 11.00 women (32242.50)
# אקדמאים: 13.83 women (19086.30)
# Sum = (96.25*28135.74 + 64.92*17215.97 + 7*34886.58 + 11*32242.50 + 13.83*19086.30) = 4887372
# Valid count = 96.25 + 64.92 + 7 + 11 + 13.83 = 193.0
# Weighted wage = 4887372 / 193.0 = 25323.17 (approx 25299!)

# Look at Yoseftal Men in Overview:
# Ranks with Men:
# רופאים מומחים: 25.67 men (103940.80)
# רופאים מתמחים: 12.83 men (33960.54)
# רנטגנאים: 5.00 men (35701.03)
# אחים ואחיות: 30.42 men (28882.20)
# מנהלי: 33.83 men (18178.55)
# Sum = (25.67*103940.80 + 12.83*33960.54 + 5*35701.03 + 30.42*28882.20 + 33.83*18178.55) = 4976722
# Valid count = 25.67 + 12.83 + 5 + 30.42 + 33.83 = 107.75
# Weighted wage = 4976722 / 107.75 = 46187.7 !
# If we combine FT (120 * 40964 = 4915680) and PT (5 * 46864) / 125 = 41200!

# Let's inspect how many bodies have differences between PartTime and Overview files across the dataset:
pt_keys = set()
for idx, r in df_pt.iterrows():
    pt_keys.add(f"{str(r['שם גוף']).strip()}_{int(r['שנה'])}")

ov_keys = set()
for idx, r in df_ov.iterrows():
    ov_keys.add(f"{str(r['שם גוף']).strip()}_{int(r['שנה'])}")

common = pt_keys.intersection(ov_keys)
print(f"Common body-year keys: {len(common)} out of {len(ov_keys)} total overview keys")
