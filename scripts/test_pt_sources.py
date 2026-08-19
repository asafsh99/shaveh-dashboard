import pandas as pd
import numpy as np
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pt_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"
df_pt = pd.read_csv(pt_path, sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

# Numeric clean
for c in ['כמות עובדים גברים במשרה מלאה', 'כמות עובדים נשים במשרה מלאה', 'כמות עובדים במשרה מלאה',
          'כמות עובדים גברים בחלקיות משרה', 'כמות עובדים נשים בחלקיות משרה', 'כמות עובדים בחלקיות משרה',
          'ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה',
          'ממוצע ברוטו שוטף והפרשים לגברים במשרה חלקית', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה חלקית', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה חלקית']:
    if c in df_pt.columns:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

print("=== PART TIME SPLIT BY SOURCE ===")
for src in ['נתוני שכר חודשיים', 'נתוני שכר שנתיים']:
    print(f"\n--- Source: {src} ---")
    sub_src = df_pt[df_pt['מקור התוכן'] == src]
    for yr in [2020, 2021, 2022, 2023, 2024]:
        sub = sub_src[sub_src['שנה'] == yr]
        ft_mc = sub.dropna(subset=['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה'])['כמות עובדים גברים במשרה מלאה'].sum()
        ft_ms = (sub['כמות עובדים גברים במשרה מלאה'] * sub['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']).dropna().sum()
        ft_mw = ft_ms / ft_mc if ft_mc > 0 else 0

        ft_wc = sub.dropna(subset=['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה'])['כמות עובדים נשים במשרה מלאה'].sum()
        ft_ws = (sub['כמות עובדים נשים במשרה מלאה'] * sub['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']).dropna().sum()
        ft_ww = ft_ws / ft_wc if ft_wc > 0 else 0

        ft_tc = sub.dropna(subset=['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'])['כמות עובדים במשרה מלאה'].sum()
        ft_ts = (sub['כמות עובדים במשרה מלאה'] * sub['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה']).dropna().sum()
        ft_tw = ft_ts / ft_tc if ft_tc > 0 else 0
        gap = ((ft_mw - ft_ww) / ft_mw) * 100 if ft_mw > 0 else 0
        print(f"  {yr}: Men=₪{ft_mw:,.0f} | Women=₪{ft_ww:,.0f} | Overall=₪{ft_tw:,.0f} | Gap={gap:.1f}% | (Count: Men={ft_mc:,.0f}, Women={ft_wc:,.0f})")

