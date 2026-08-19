import pandas as pd
import numpy as np
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ov_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).csv"
pt_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"

df_ov = pd.read_csv(ov_path, sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

for c in ['סך גברים עובדים', 'סך נשים עובדות', 'מספר עובדים ממוצע לחודש', 'שכר גברים ממוצע', 'שכר נשים ממוצע', 'ממוצע ברוטו שוטף והפרשים']:
    if c in df_ov.columns:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

print("=== TESTING BY 'מקור התוכן' in Overview ===")
for src in ['נתוני שכר חודשיים', 'נתוני שכר שנתיים', 'ALL']:
    print(f"\n--- Source: {src} ---")
    sub_src = df_ov if src == 'ALL' else df_ov[df_ov['מקור התוכן'] == src]
    
    for yr in [2020, 2021, 2022, 2023, 2024]:
        d = sub_src[sub_src['שנה'] == yr]
        mc = d.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
        ms = (d['סך גברים עובדים'] * d['שכר גברים ממוצע']).dropna().sum()
        mw = ms / mc if mc > 0 else 0
        
        wc = d.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
        ws = (d['סך נשים עובדות'] * d['שכר נשים ממוצע']).dropna().sum()
        ww = ws / wc if wc > 0 else 0
        
        tw = (ms + ws) / (mc + wc) if (mc + wc) > 0 else 0
        gap = ((mw - ww) / mw) * 100 if mw > 0 else 0
        print(f"  {yr}: Men=₪{mw:,.0f} | Women=₪{ww:,.0f} | Overall=₪{tw:,.0f} | Gap={gap:.1f}% | (Count: Men={mc:,.0f}, Women={wc:,.0f})")

