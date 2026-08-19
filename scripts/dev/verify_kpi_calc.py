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

# Targets from Tableau screenshot:
# 2020: Men=20705, Women=15632, Overall=16912, Gap=24.5%
# 2021: Men=19049, Women=13992, Overall=15565, Gap=26.5%
# 2022: Men=19513, Women=14336, Overall=16042, Gap=26.5%
# 2023: Men=20834, Women=15588, Overall=17300, Gap=25.2%
# 2024: Men=21632, Women=16051, Overall=17833, Gap=25.8%

print("=== VERIFYING NATIONAL / FILTERED KPI CALCULATION ===")

# In partTime:
# Notice that when filtering by year, how does weighting work?
for yr in [2020, 2021, 2022, 2023, 2024]:
    sub = df_pt[df_pt['שנה'] == yr]
    
    # 1. Full-time weighted
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
    print(f"Year {yr}: Men=₪{ft_mw:,.0f} | Women=₪{ft_ww:,.0f} | Overall=₪{ft_tw:,.0f} | Gap={gap:.1f}%")

