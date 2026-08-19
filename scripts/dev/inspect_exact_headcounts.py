import pandas as pd
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

d24_pt = df_pt[df_pt['שנה'] == 2024]
d24_ov = df_ov[df_ov['שנה'] == 2024]

print("=== PART TIME 2024 HEADCOUNTS ===")
print("Full-Time Men:", d24_pt['כמות עובדים גברים במשרה מלאה'].sum())
print("Full-Time Women:", d24_pt['כמות עובדים נשים במשרה מלאה'].sum())
print("Full-Time Total (FTE full):", d24_pt['כמות עובדים במשרה מלאה'].sum())
print("Part-Time Total:", d24_pt['כמות עובדים בחלקיות משרה'].sum())
print("Total PT + FT:", d24_pt['כמות עובדים במשרה מלאה'].sum() + d24_pt['כמות עובדים בחלקיות משרה'].sum())

print("\n=== OVERVIEW 2024 HEADCOUNTS ===")
print("Men Count:", d24_ov['סך גברים עובדים'].sum())
print("Women Count:", d24_ov['סך נשים עובדות'].sum())
print("Total Overview Employees (Men + Women):", d24_ov['סך גברים עובדים'].sum() + d24_ov['סך נשים עובדות'].sum())
print("Monthly Avg Employees Column:", d24_ov['מספר עובדים ממוצע לחודש'].sum())

