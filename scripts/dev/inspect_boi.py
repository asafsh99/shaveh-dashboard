# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

df_pt = pd.read_csv('data/נתוני חלקיות משרה (1).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

print("=== Bank of Israel in Overview file ===")
boi_ov = df_ov[(df_ov['שם גוף'].astype(str).str.contains('בנק ישראל'))]
for idx, r in boi_ov.iterrows():
    print(r['שנה'], r['דירוג'], "| MenCount:", r['סך גברים עובדים'], "| WomenCount:", r['סך נשים עובדות'], "| MenWage:", r['שכר גברים ממוצע'], "| WomenWage:", r['שכר נשים ממוצע'], "| TotalMonthly:", r['מספר עובדים ממוצע לחודש'], "| Gross:", r['ממוצע ברוטו שוטף והפרשים'])

print("\n=== Bank of Israel in PartTime file ===")
boi_pt = df_pt[(df_pt['שם גוף'].astype(str).str.contains('בנק ישראל'))]
for idx, r in boi_pt.iterrows():
    print(r['שנה'], "| FT Men:", r['כמות עובדים גברים במשרה מלאה'], "| FT Women:", r['כמות עובדים נשים במשרה מלאה'], "| FT Total:", r['כמות עובדים במשרה מלאה'], "| FT MenWage:", r['ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה'], "| FT WomenWage:", r['ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה'], "| FT TotalWage:", r['ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה'])
