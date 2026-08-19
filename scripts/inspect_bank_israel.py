# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Load files
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

poi_bodies = ['בנק ישראל', 'רשות שדות תעופה', 'חברת החשמל לישראל בע"מ', 'המרכז הרפואי יוספטל', 'מפעל הפיס', 'מנהלת תקומה']

for b in poi_bodies:
    print(f"\n=================== {b} (2024) ===================")
    sub_ov = df_ov[(df_ov['שם גוף'].astype(str).str.contains(b.replace(' בע"מ', ''))) & (df_ov['שנה'] == 2024)]
    sub_pt = df_pt[(df_pt['שם גוף'].astype(str).str.contains(b.replace(' בע"מ', ''))) & (df_pt['שנה'] == 2024)]
    
    print("--- PartTime File (Full-Time FTE Row) ---")
    for idx, r in sub_pt.iterrows():
        print(f"FT Men: {r.get('כמות עובדים גברים במשרה מלאה')}, FT Women: {r.get('כמות עובדים נשים במשרה מלאה')}, FT Total: {r.get('כמות עובדים במשרה מלאה')}")
        print(f"FT Men Wage: {r.get('ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה')}, FT Women Wage: {r.get('ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה')}, FT Total Wage: {r.get('ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה')}")
        print(f"PT Men: {r.get('כמות עובדים גברים בחלקיות משרה')}, PT Women: {r.get('כמות עובדים נשים בחלקיות משרה')}, PT Total: {r.get('כמות עובדים בחלקיות משרה')}")
        print(f"PT Men Wage: {r.get('ממוצע ברוטו שוטף והפרשים לגברים במשרה חלקית')}, PT Women Wage: {r.get('ממוצע ברוטו שוטף והפרשים לנשים במשרה חלקית')}, PT Total Wage: {r.get('ממוצע ברוטו שוטף והפרשים לעובדים במשרה חלקית')}")

    print("--- Overview File (Ranks breakdown) ---")
    tot_mc = 0
    tot_wc = 0
    m_w_sum = 0
    m_w_cnt = 0
    w_w_sum = 0
    w_w_cnt = 0
    tot_emp = 0
    
    for idx, r in sub_ov.iterrows():
        mc = r.get('סך גברים עובדים') or 0
        wc = r.get('סך נשים עובדות') or 0
        mw = r.get('שכר גברים ממוצע')
        ww = r.get('שכר נשים ממוצע')
        emp = r.get('מספר עובדים ממוצע לחודש') or 0
        tot_mc += mc
        tot_wc += wc
        tot_emp += emp
        if pd.notnull(mw) and mc > 0:
            m_w_sum += mw * mc
            m_w_cnt += mc
        if pd.notnull(ww) and wc > 0:
            w_w_sum += ww * wc
            w_w_cnt += wc
        print(f"  Rank: {r.get('דירוג')} | Men: {mc:.2f} (Wage: {mw}) | Women: {wc:.2f} (Wage: {ww}) | Monthly: {emp:.2f} (Gross: {r.get('ממוצע ברוטו שוטף והפרשים')})")
    
    print(f"  --> Sum Men: {tot_mc:.2f} (round: {round(tot_mc)}), Sum Women: {tot_wc:.2f} (round: {round(tot_wc)}), Sum Monthly: {tot_emp:.2f} (round: {round(tot_emp)})")
    print(f"  --> Weighted Men Wage: {m_w_sum/m_w_cnt if m_w_cnt else 0:.2f}, Weighted Women Wage: {w_w_sum/w_w_cnt if w_w_cnt else 0:.2f}")
