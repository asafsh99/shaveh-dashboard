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

# Numeric clean
for c in ['כמות עובדים גברים במשרה מלאה', 'כמות עובדים נשים במשרה מלאה', 'כמות עובדים במשרה מלאה',
          'כמות עובדים גברים בחלקיות משרה', 'כמות עובדים נשים בחלקיות משרה', 'כמות עובדים בחלקיות משרה',
          'ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה',
          'ממוצע ברוטו שוטף והפרשים לגברים במשרה חלקית', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה חלקית', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה חלקית']:
    if c in df_pt.columns:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

for c in ['סך גברים עובדים', 'סך נשים עובדות', 'מספר עובדים ממוצע לחודש', 'שכר גברים ממוצע', 'שכר נשים ממוצע', 'ממוצע ברוטו שוטף והפרשים']:
    if c in df_ov.columns:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

print("=== CHECKING COMBINATIONS FOR 2024 (TARGET: Men=21,632, Women=16,051, Total=17,833) ===")

# Test A: PartTime full-time vs part-time combined
d24_pt = df_pt[df_pt['שנה'] == 2024]

# Combination 1: What if we weight full-time + part-time together in partTime dataset?
# Men total salary mass = (ft_men_count * ft_men_wage) + (pt_men_count * pt_men_wage)
ft_ms = (d24_pt['כמות עובדים גברים במשרה מלאה'] * d24_pt['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']).fillna(0)
pt_ms = (d24_pt['כמות עובדים גברים בחלקיות משרה'] * d24_pt['ממוצע ברוטו שוטף והפרשים לגברים במשרה חלקית']).fillna(0)
tot_ms = ft_ms + pt_ms

# What if divided by (ft_men_count + pt_men_count)?
tot_mc = d24_pt['כמות עובדים גברים במשרה מלאה'].fillna(0) + d24_pt['כמות עובדים גברים בחלקיות משרה'].fillna(0)
valid_m_mask = (ft_ms > 0) | (pt_ms > 0)
print("Comb 1 (FT+PT weighted by headcount): Men =", tot_ms.sum() / tot_mc[valid_m_mask].sum())

# Test B: In Overview dataset, what if certain systems or rows are included/excluded?
# Let's test system-by-system in 2024
d24_ov = df_ov[df_ov['שנה'] == 2024]
print("\n--- By System in 2024 Overview ---")
for sys_name, grp in d24_ov.groupby('מערכת'):
    mc = grp.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
    ms = (grp['סך גברים עובדים'] * grp['שכר גברים ממוצע']).dropna().sum()
    mw = ms / mc if mc > 0 else 0
    wc = grp.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
    ws = (grp['סך נשים עובדות'] * grp['שכר נשים ממוצע']).dropna().sum()
    ww = ws / wc if wc > 0 else 0
    print(f"  {sys_name:<35}: Men=₪{mw:,.0f} | Women=₪{ww:,.0f} | (Men={mc:,.0f}, Women={wc:,.0f})")

# Test C: What if only rows where BOTH men and women have reported wages are included?
d24_both = d24_ov.dropna(subset=['שכר גברים ממוצע', 'שכר נשים ממוצע'])
mc_b = d24_both['סך גברים עובדים'].sum()
ms_b = (d24_both['סך גברים עובדים'] * d24_both['שכר גברים ממוצע']).sum()
mw_b = ms_b / mc_b
wc_b = d24_both['סך נשים עובדות'].sum()
ws_b = (d24_both['סך נשים עובדות'] * d24_both['שכר נשים ממוצע']).sum()
ww_b = ws_b / wc_b
tw_b = (ms_b + ws_b) / (mc_b + wc_b)
gap_b = ((mw_b - ww_b) / mw_b) * 100
print(f"\nComb C (Only rows with BOTH Men & Women): Men=₪{mw_b:,.0f} | Women=₪{ww_b:,.0f} | Total=₪{tw_b:,.0f} | Gap={gap_b:.2f}%")

