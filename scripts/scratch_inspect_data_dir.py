# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np

df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]
for c in df_ov.columns:
    if c not in ['INDEX()', 'מקור התוכן', 'שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']:
        df_ov[c] = pd.to_numeric(df_ov[c].astype(str).str.replace(',', '').str.strip(), errors='coerce')

yos = df_ov[(df_ov['שם גוף'].astype(str).str.contains('יוספטל')) & (df_ov['שנה'] == 2024)]

print("All Yoseftal rows in Overview:")
for idx, r in yos.iterrows():
    print(r['דירוג'], "| MC:", r['סך גברים עובדים'], "| WC:", r['סך נשים עובדות'], "| MW:", r['שכר גברים ממוצע'], "| WW:", r['שכר נשים ממוצע'], "| TotEmp:", r['מספר עובדים ממוצע לחודש'], "| Gross:", r['ממוצע ברוטו שוטף והפרשים'])

# Look at rows where Gross / Monthly is reported:
# אחים ואחיות: TotEmp=126.67, Gross=28320.62
# מנהלי: TotEmp=98.75, Gross=17551.71
# רנטגנאים: TotEmp=12.00, Gross=35253.45
# אקדמאים בהסכם קיבוצי: TotEmp=16.83, Gross=NaN
# עובדי מעבדה: TotEmp=15.00, Gross=NaN
# רופאים מומחים: TotEmp=28.92, Gross=NaN
# רופאים מתמחים: TotEmp=16.83, Gross=NaN
# חוזים אישיים: TotEmp=3.33, Gross=NaN
# פארה רפואיים: TotEmp=6.33, Gross=NaN
# הנדסאים: TotEmp=3.83, Gross=NaN
# מהנדסים: TotEmp=2.00, Gross=NaN
# עובדים סוציאלים: TotEmp=4.00, Gross=NaN
# רוקחים: TotEmp=2.00, Gross=NaN
# סטאזרים: TotEmp=2.25, Gross=NaN
# פסיכולוגים: TotEmp=0.33, Gross=NaN

# Let's check other data files in the directory!
# Let's list all files in data/
import os
print("\nFiles in data/:", os.listdir('data'))
