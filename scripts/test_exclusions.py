import pandas as pd
import numpy as np
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pt_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"
ov_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).csv"

df_pt = pd.read_csv(pt_path, sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

df_ov = pd.read_csv(ov_path, sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

for c in df_pt.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף']:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

print("Target 2024: Men=21,632, Women=16,051, Total=17,833, Gap=25.8%")

# Let's test all possible filters on df_ov in 2024:
d24_ov = df_ov[df_ov['שנה'] == 2024]
d24_pt = df_pt[df_pt['שנה'] == 2024]

# Let's test filtering by systems, or filtering by subSystems, or excluding certain systems!
# What if 'מערכת החינוך' or 'שלטון מקומי' or certain rows have different weights?
for sys_to_exclude in [None] + d24_ov['מערכת'].unique().tolist():
    sub = d24_ov if sys_to_exclude is None else d24_ov[d24_ov['מערכת'] != sys_to_exclude]
    
    mc = sub.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
    ms = (sub['סך גברים עובדים'] * sub['שכר גברים ממוצע']).dropna().sum()
    mw = ms / mc if mc > 0 else 0

    wc = sub.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
    ws = (sub['סך נשים עובדות'] * sub['שכר נשים ממוצע']).dropna().sum()
    ww = ws / wc if wc > 0 else 0
    
    tw = (ms + ws) / (mc + wc) if (mc + wc) > 0 else 0
    gap = ((mw - ww) / mw) * 100 if mw > 0 else 0
    if abs(mw - 21632) < 200 or abs(ww - 16051) < 200:
        print(f"Excluding {sys_to_exclude}: Men=₪{mw:,.0f} | Women=₪{ww:,.0f} | Total=₪{tw:,.0f} | Gap={gap:.1f}%")

# Let's test in PartTime!
print("\n--- PartTime combinations in 2024 ---")
for sys_to_exclude in [None] + d24_pt['מערכת'].unique().tolist():
    sub = d24_pt if sys_to_exclude is None else d24_pt[d24_pt['מערכת'] != sys_to_exclude]
    
    mc = sub.dropna(subset=['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה'])['כמות עובדים גברים במשרה מלאה'].sum()
    ms = (sub['כמות עובדים גברים במשרה מלאה'] * sub['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']).dropna().sum()
    mw = ms / mc if mc > 0 else 0

    wc = sub.dropna(subset=['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה'])['כמות עובדים נשים במשרה מלאה'].sum()
    ws = (sub['כמות עובדים נשים במשרה מלאה'] * sub['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']).dropna().sum()
    ww = ws / wc if wc > 0 else 0
    
    tw = (ms + ws) / (mc + wc) if (mc + wc) > 0 else 0
    gap = ((mw - ww) / mw) * 100 if mw > 0 else 0
    if abs(mw - 21632) < 300 or abs(ww - 16051) < 300:
        print(f"PT Excluding {sys_to_exclude}: Men=₪{mw:,.0f} | Women=₪{ww:,.0f} | Total=₪{tw:,.0f} | Gap={gap:.1f}%")

