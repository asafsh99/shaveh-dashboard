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
for c in df_pt.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף']:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

targets = {
    2020: (20705, 15632, 16912),
    2021: (19049, 13992, 15565),
    2022: (19513, 14336, 16042),
    2023: (20834, 15588, 17300),
    2024: (21632, 16051, 17833)
}

print("=== SEARCHING ACROSS ALL POSSIBLE AGGREGATION PATTERNS ===")

# Pattern 1: In Overview, what if weights are 'גברים' and 'נשים' (which are FTE proportions)?
print("\n--- Pattern 1: Overview weighted by 'גברים' and 'נשים' columns ---")
for yr, (exp_m, exp_w, exp_t) in targets.items():
    sub = df_ov[df_ov['שנה'] == yr]
    # If weights are 'גברים' column * 'מספר עובדים ממוצע לחודש' or just 'גברים' column?
    for w_m_col, w_w_col in [('סך גברים עובדים', 'סך נשים עובדות'), ('גברים', 'נשים')]:
        mc = sub.dropna(subset=['שכר גברים ממוצע'])[w_m_col].sum()
        ms = (sub[w_m_col] * sub['שכר גברים ממוצע']).dropna().sum()
        mw = ms / mc if mc > 0 else 0

        wc = sub.dropna(subset=['שכר נשים ממוצע'])[w_w_col].sum()
        ws = (sub[w_w_col] * sub['שכר נשים ממוצע']).dropna().sum()
        ww = ws / wc if wc > 0 else 0
        
        tw = (ms + ws) / (mc + wc) if (mc + wc) > 0 else 0
        if abs(mw - exp_m) < 100 or abs(ww - exp_w) < 100:
            print(f"  Year {yr} ({w_m_col}): Men=₪{mw:,.0f} (exp {exp_m}) | Women=₪{ww:,.0f} (exp {exp_w}) | Total=₪{tw:,.0f} (exp {exp_t})")

# Pattern 2: In PartTime, what if weights are different columns or subsets?
print("\n--- Pattern 2: PartTime weighted by different wage columns ---")
for yr, (exp_m, exp_w, exp_t) in targets.items():
    sub = df_pt[df_pt['שנה'] == yr]
    
    # What if FT + PT combined into total FTE?
    # Suppose FT is 1.0 FTE, and PT average fraction is e.g. 0.5 FTE?
    # Or what if we use 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'?
    
    # Let's test all possible combinations of weight columns and wage columns in df_pt
    for w_col in ['ממוצע ברוטו שוטף והפרשים', 'ממוצע ברוטו מס', 'ממוצע עלות העסקה']:
        m_wage_col = f"{w_col} לגברים במשרה מלאה"
        w_wage_col = f"{w_col} לנשים במשרה מלאה"
        t_wage_col = f"{w_col} לעובדים במשרה מלאה"
        if m_wage_col in sub.columns:
            # Simple average
            mw_sim = sub[m_wage_col].mean()
            ww_sim = sub[w_wage_col].mean()
            tw_sim = sub[t_wage_col].mean()
            if abs(mw_sim - exp_m) < 100 or abs(ww_sim - exp_w) < 100:
                print(f"  MATCH PT SIMPLE: Year {yr} Col {w_col}: Men={mw_sim:.0f}, Women={ww_sim:.0f}, Total={tw_sim:.0f}")

