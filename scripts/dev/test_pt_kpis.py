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
          'ממוצע עלות העסקה לגברים במשרה מלאה', 'ממוצע עלות העסקה לנשים במשרה מלאה', 'ממוצע עלות העסקה למשרה מלאה']:
    if c in df_pt.columns:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

def compute_pt_kpis(df):
    ft_mc = df.dropna(subset=['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה'])['כמות עובדים גברים במשרה מלאה'].sum()
    ft_ms = (df['כמות עובדים גברים במשרה מלאה'] * df['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה']).dropna().sum()
    ft_mw = ft_ms / ft_mc if ft_mc > 0 else 0

    ft_wc = df.dropna(subset=['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה'])['כמות עובדים נשים במשרה מלאה'].sum()
    ft_ws = (df['כמות עובדים נשים במשרה מלאה'] * df['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה']).dropna().sum()
    ft_ww = ft_ws / ft_wc if ft_wc > 0 else 0

    ft_tc = df['כמות עובדים במשרה מלאה'].sum()
    gap = ((ft_mw - ft_ww) / ft_mw) * 100 if ft_mw > 0 else 0
    
    # Employer cost
    c_mc = df.dropna(subset=['ממוצע עלות העסקה לגברים במשרה מלאה'])['כמות עובדים גברים במשרה מלאה'].sum()
    c_ms = (df['כמות עובדים גברים במשרה מלאה'] * df['ממוצע עלות העסקה לגברים במשרה מלאה']).dropna().sum()
    c_mw = c_ms / c_mc if c_mc > 0 else 0

    c_wc = df.dropna(subset=['ממוצע עלות העסקה לנשים במשרה מלאה'])['כמות עובדים נשים במשרה מלאה'].sum()
    c_ws = (df['כמות עובדים נשים במשרה מלאה'] * df['ממוצע עלות העסקה לנשים במשרה מלאה']).dropna().sum()
    c_ww = c_ws / c_wc if c_wc > 0 else 0
    c_tot = (c_ms + c_ws) / (c_mc + c_wc) if (c_mc + c_wc) > 0 else 0
    c_gap = ((c_mw - c_ww) / c_mw) * 100 if c_mw > 0 else 0

    return {
        'totalMen': round(df['כמות עובדים גברים במשרה מלאה'].sum()),
        'totalWomen': round(df['כמות עובדים נשים במשרה מלאה'].sum()),
        'totalEmployees': round(ft_tc),
        'avgMenWage': round(ft_mw),
        'avgWomenWage': round(ft_ww),
        'genderPayGapPercent': round(gap, 2),
        'avgMenEmployerCost': round(c_mw),
        'avgWomenEmployerCost': round(c_ww),
        'overallEmployerCost': round(c_tot),
        'employerCostGapPercent': round(c_gap, 2)
    }

df24 = df_pt[df_pt['שנה'] == 2024]
print("=== 2024 National KPIs (Full-Time / Tableau Methodology) ===")
print(compute_pt_kpis(df24))

print("\n=== 2024 'מנהלת תקומה' KPIs ===")
tekuma = df24[df24['שם גוף'].astype(str).str.contains('תקומה')]
print(compute_pt_kpis(tekuma))

print("\n=== 2024 'בנק ישראל' KPIs ===")
bank = df24[df24['שם גוף'].astype(str).str.contains('בנק ישראל')]
print(compute_pt_kpis(bank))

print("\n=== 2024 'חברות ממשלתיות' System KPIs ===")
soes = df24[df24['מערכת'] == 'חברות ממשלתיות']
print(compute_pt_kpis(soes))

