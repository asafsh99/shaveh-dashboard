import pandas as pd
import numpy as np
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ov_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני סקירה כללית (3).csv"
pt_path = r"c:\Users\asafs\Documents\work\sahar_shavee\data\נתוני חלקיות משרה (1).csv"

df_ov = pd.read_csv(ov_path, sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

df_pt = pd.read_csv(pt_path, sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

# Numeric clean
for c in ['סך גברים עובדים', 'גברים', 'סך נשים עובדות', 'נשים', 'מספר עובדים ממוצע לחודש', 'שכר גברים ממוצע', 'שכר נשים ממוצע', 'ממוצע ברוטו שוטף והפרשים']:
    if c in df_ov.columns:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

for c in ['כמות עובדים גברים במשרה מלאה', 'כמות עובדים נשים במשרה מלאה', 'כמות עובדים במשרה מלאה',
          'כמות עובדים גברים בחלקיות משרה', 'כמות עובדים נשים בחלקיות משרה', 'כמות עובדים בחלקיות משרה',
          'ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה',
          'ממוצע ברוטו שוטף והפרשים לגברים במשרה חלקית', 'ממוצע ברוטו שוטף והפרשים לנשים במשרה חלקית', 'ממוצע ברוטו שוטף והפרשים לעובדים במשרה חלקית']:
    if c in df_pt.columns:
        df_pt[c] = pd.to_numeric(df_pt[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

# Target values across years:
targets = {
    2020: {'men': 20705, 'women': 15632, 'total': 16912},
    2021: {'men': 19049, 'women': 13992, 'total': 15565},
    2022: {'men': 19513, 'women': 14336, 'total': 16042},
    2023: {'men': 20834, 'women': 15588, 'total': 17300},
    2024: {'men': 21632, 'women': 16051, 'total': 17833}
}

print("=== CHECKING HOW 21632, 16051, 17833 ARE PRODUCED ===")

# Test 1: What if we do a macro system-level average (average of the 8 systems weighted by system size)?
print("\n--- Test 1: Overview macro weighted by system ---")
for yr, exp in targets.items():
    d = df_ov[df_ov['שנה'] == yr]
    # Group by system first
    sys_agg = []
    for s, grp in d.groupby('מערכת'):
        mc = grp.dropna(subset=['שכר גברים ממוצע'])['סך גברים עובדים'].sum()
        ms = (grp['סך גברים עובדים'] * grp['שכר גברים ממוצע']).dropna().sum()
        mw = ms / mc if mc > 0 else 0
        wc = grp.dropna(subset=['שכר נשים ממוצע'])['סך נשים עובדות'].sum()
        ws = (grp['סך נשים עובדות'] * grp['שכר נשים ממוצע']).dropna().sum()
        ww = ws / wc if wc > 0 else 0
        sys_agg.append({'system': s, 'mc': mc, 'wc': wc, 'mw': mw, 'ww': ww})
    df_sys = pd.DataFrame(sys_agg)
    # Simple average of systems
    print(f"Year {yr} Simple System Avg: Men={df_sys['mw'].mean():.0f} | Women={df_sys['ww'].mean():.0f}")

# Test 2: What if we do body-level average from PartTime (without privacy thresholds)?
print("\n--- Test 2: PartTime body-level aggregations ---")
for yr, exp in targets.items():
    d = df_pt[df_pt['שנה'] == yr]
    # Simple average of bodies
    mw_simple = d['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה'].mean()
    ww_simple = d['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה'].mean()
    tw_simple = d['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'].mean()
    print(f"Year {yr} Simple Body Avg: Men={mw_simple:.0f} | Women={ww_simple:.0f} | Total={tw_simple:.0f}")

# Test 3: What if we take the total wage mass in PartTime divided by headcount?
# Let's check partTime columns:
# Notice in partTime there is also 'ממוצע עלות העסקה', 'ממוצע ברוטו מס'
# What if the weighting in Tableau is based on 'משרות' (Jobs) instead of 'עובדים' (People)?
# Let's check if there is an FTE column or job fraction column!

