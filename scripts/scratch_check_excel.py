# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Check excel sheets
xl = pd.ExcelFile('data/נתוני סקירה כללית (3).xlsx')
print("Sheet names in Excel:", xl.sheet_names)

df_xl = xl.parse(xl.sheet_names[0], skiprows=1)
df_xl.columns = [c.strip() for c in df_xl.columns]
sub_xl = df_xl[(df_xl['שם גוף'].astype(str).str.contains('שדות תעופה'))]
print("All Airport Authority rows in Excel:")
for idx, r in sub_xl.iterrows():
    print(r['שנה'], r['דירוג'], r['סך גברים עובדים'], r['סך נשים עובדות'], r['מספר עובדים ממוצע לחודש'], r['שכר גברים ממוצע'], r['שכר נשים ממוצע'], r['ממוצע ברוטו שוטף והפרשים'])
