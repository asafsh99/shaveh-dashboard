import pandas as pd
import numpy as np
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=== INVESTIGATING TABLEAU KPI VS OVERVIEW KPI (2020-2024) ===")

pt_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"
ov_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).csv"

# Load both files
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

print("\n--- 1. Testing PartTime (חלקיות משרה - משרה מלאה) for all years ---")
for yr in [2020, 2021, 2022, 2023, 2024]:
    sub = df_pt[df_pt['שנה'] == yr]
    
    # Full Time
    ft_mc = sub.dropna(subset=['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה'])['כמות עובדים גברים במשרה מלאה'].sum()
    ft_ms = (sub['כמות עובדים גברים במשרה מלאה'] * sub['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']).dropna().sum()
    ft_mw = ft_ms / ft_mc if ft_mc > 0 else 0
    
    ft_wc = sub.dropna(subset=['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה'])['כמות עובדים נשים במשרה מלאה'].sum()
    ft_ws = (sub['כמות עובדים נשים במשרה מלאה'] * sub['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']).dropna().sum()
    ft_ww = ft_ws / ft_wc if ft_wc > 0 else 0
    
    ft_tc = sub.dropna(subset=['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'])['כמות עובדים במשרה מלאה'].sum()
    ft_ts = (sub['כמות עובדים במשרה מלאה'] * sub['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']).dropna().sum()
    ft_tw = ft_ts / ft_tc if ft_tc > 0 else 0
    
    ft_gap = ((ft_mw - ft_ww) / ft_mw) * 100 if ft_mw > 0 else 0
    print(f"Year {yr} (PartTime FT): Men=₪{ft_mw:,.0f} | Women=₪{ft_ww:,.0f} | Overall=₪{ft_tw:,.0f} | Gap={ft_gap:.1f}%")

print("\n--- 2. Testing Overview (סקירה כללית - כלל הדירוגים) for all years ---")
for yr in [2020, 2021, 2022, 2023, 2024]:
    sub = df_ov[df_ov['שנה'] == yr]
    
    mc = sub.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
    ms = (sub['סך גברים עובדים'] * sub['שכר גברים ממוצע']).dropna().sum()
    mw = ms / mc if mc > 0 else 0
    
    wc = sub.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
    ws = (sub['סך נשים עובדות'] * sub['שכר נשים ממוצע']).dropna().sum()
    ww = ws / wc if wc > 0 else 0
    
    gap = ((mw - ww) / mw) * 100 if mw > 0 else 0
    tot_s = ms + ws
    tot_c = mc + wc
    tw = tot_s / tot_c if tot_c > 0 else 0
    print(f"Year {yr} (Overview):   Men=₪{mw:,.0f} | Women=₪{ww:,.0f} | Overall=₪{tw:,.0f} | Gap={gap:.2f}% | (Men Count={mc:,.0f}, Women Count={wc:,.0f})")

