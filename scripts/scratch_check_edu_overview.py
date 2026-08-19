# -*- coding: utf-8 -*-
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

edu_ov = df_ov[df_ov['שם גוף'].astype(str).str.contains('משרד החינוך')]
print("Unique bodies matching 'משרד החינוך' in Overview file:")
print(edu_ov['שם גוף'].unique())

print("\nRows for 'משרד החינוך' in Overview file (2024):")
sub = edu_ov[edu_ov['שנה'] == '2024']
for idx, r in sub.iterrows():
    print(r['שם גוף'], r['דירוג'], r['סך גברים עובדים'], r['סך נשים עובדות'], r['שכר גברים ממוצע'], r['שכר נשים ממוצע'])
