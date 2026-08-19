# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np

# Load overview
df = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df.columns = [c.strip() for c in df.columns]
for c in df.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df[c] = pd.to_numeric(df[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

sub = df[(df['שם גוף'].astype(str).str.contains('שדות תעופה')) & (df['שנה'] == 2024)]

# Check weighted formulas:
# Ranks:
# 1. אחר: MenCount = 28.42, MenWage = 13755.74, WomenCount = 3.75, WomenWage = NaN, TotCount = 32.17, TotWage = NaN
# 2. מפעלי: MenCount = 3039.67, MenWage = 29559.73, WomenCount = 1186.0, WomenWage = 22975.73, TotCount = 4225.67, TotWage = 27828.66
# 3. חוזים: MenCount = 16.08, MenWage = 34600.09, WomenCount = 10.67, WomenWage = 22565.11, TotCount = 26.75, TotWage = 30047.97

# When we compute:
# Men:
m_sum = (sub['סך גברים עובדים'] * sub['שכר גברים ממוצע']).sum()
m_cnt = sub.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
print(f"Men weighted: {m_sum / m_cnt:.2f}") # 29440.40

# Women:
w_sum = (sub['סך נשים עובדות'] * sub['שכר נשים ממוצע']).sum()
w_cnt = sub.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
print(f"Women weighted: {w_sum / w_cnt:.2f}") # 22972.07

# Total:
t_sum = (sub['מספר עובדים ממוצע לחודש'] * sub['ממוצע ברוטו שוטף והפרשים']).sum()
t_cnt = sub.dropna(subset=['ממוצע ברוטו שוטף והפרשים'])['מספר עובדים ממוצע לחודש'].sum()
print(f"Total weighted: {t_sum / t_cnt:.2f}") # 27842.61

# What if:
# Look at the numbers from Tableau:
# Men: 29,455
# Women: 22,936
# Overall: 27,744
# Gap: 22.1%
print("Tableau numbers: Men 29,455, Women 22,936, Total 27,744, Gap 22.1%, MenCount 3,084, WomenCount 1,201, TotalCount 4,285")
