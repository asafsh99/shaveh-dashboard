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

print("Searching for משרד החינוך in df_ov:")
edu_ov = df_ov[df_ov['שם גוף'].astype(str).str.contains('חינוך')]
print(edu_ov[['שנה', 'מערכת', 'תת-מערכת', 'שם גוף', 'דירוג']].drop_duplicates().to_string())

print("\nSearching for משרד החינוך in df_pt:")
edu_pt = df_pt[df_pt['שם גוף'].astype(str).str.contains('חינוך')]
print(edu_pt[['שנה', 'מערכת', 'תת-מערכת', 'שם גוף']].drop_duplicates().to_string())

sub_ov_2024 = df_ov[(df_ov['שם גוף'].astype(str).str.contains('מורים|חינוך')) & (df_ov['שנה'] == 2024)]
print("\nDetailed rows for 2024 in Overview:")
for idx, r in sub_ov_2024.iterrows():
    print(f"Body: {r['שם גוף']} | Rank: {r['דירוג']} | MC: {r['סך גברים עובדים']} | WC: {r['סך נשים עובדות']} | MW: {r['שכר גברים ממוצע']} | WW: {r['שכר נשים ממוצע']} | Monthly: {r['מספר עובדים ממוצע לחודש']} | Gross: {r['ממוצע ברוטו שוטף והפרשים']}")

sub_pt_2024 = df_pt[(df_pt['שם גוף'].astype(str).str.contains('מורים|חינוך')) & (df_pt['שנה'] == 2024)]
print("\nDetailed rows for 2024 in PartTime:")
for idx, r in sub_pt_2024.iterrows():
    print(f"Body: {r['שם גוף']} | FT Men: {r.get('כמות עובדים גברים במשרה מלאה')} | FT Women: {r.get('כמות עובדים נשים במשרה מלאה')} | FT Total: {r.get('כמות עובדים במשרה מלאה')} | FT MW: {r.get('ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה')} | FT WW: {r.get('ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה')} | FT TW: {r.get('ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה')}")
    print(f"       PT Men: {r.get('כמות עובדים גברים בחלקיות משרה')} | PT Women: {r.get('כמות עובדים נשים בחלקיות משרה')} | PT Total: {r.get('כמות עובדים בחלקיות משרה')} | PT MW: {r.get('ממוצע ברוטו שוטף והפרשים לגברים במשרה חלקית')} | PT WW: {r.get('ממוצע ברוטו שוטף והפרשים לנשים במשרה חלקית')} | PT TW: {r.get('ממוצע ברוטו שוטף והפרשים לעובדים במשרה חלקית')}")
