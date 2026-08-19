# -*- coding: utf-8 -*-
import pandas as pd
import numpy as np
import json, sys, os

sys.stdout.reconfigure(encoding='utf-8')

print("Reading Excel files...")
df_ov = pd.read_excel('data/נתוני סקירה כללית.xlsx', header=1)
df_ov.columns = [c.strip() for c in df_ov.columns]

df_pt = pd.read_excel('data/נתוני חלקיות משרה.xlsx', header=1)
df_pt.columns = [c.strip() for c in df_pt.columns]

df_low = pd.read_excel('data/נתוני שכר נמוך.xlsx', header=1)
df_low.columns = [c.strip() for c in df_low.columns]

df_min = pd.read_excel('data/נתוני מקבלי השלמה למינימום.xlsx', header=1)
df_min.columns = [c.strip() for c in df_min.columns]

def clean_val(v):
    if pd.isna(v) or v is None:
        return None
    try:
        val = float(v)
        return val
    except:
        return str(v).strip()

def clean_str(v):
    if pd.isna(v) or v is None:
        return ""
    return str(v).strip()

# 1. Transform Overview records
overview_records = []
for idx, r in df_ov.iterrows():
    overview_records.append({
        'index': clean_val(r.get('INDEX()')),
        'source': clean_str(r.get('מקור התוכן')),
        'year': int(clean_val(r.get('שנה')) or 0),
        'system': clean_str(r.get('מערכת')),
        'subSystem': clean_str(r.get('תת-מערכת')),
        'bodyName': clean_str(r.get('שם גוף')),
        'rank': clean_str(r.get('דירוג')),
        'menCount': clean_val(r.get('סך גברים עובדים')),
        'menPercent': clean_val(r.get('גברים')),
        'womenCount': clean_val(r.get('סך נשים עובדות')),
        'womenPercent': clean_val(r.get('נשים')),
        'monthlyEmployeeCount': clean_val(r.get('מספר עובדים ממוצע לחודש')),
        'avgMenWage': clean_val(r.get('שכר גברים ממוצע')),
        'avgWomenWage': clean_val(r.get('שכר נשים ממוצע')),
        'avgGrossRegular': clean_val(r.get('ממוצע ברוטו שוטף והפרשים')),
        'avgMenTaxableGross': clean_val(r.get('ממוצע ברוטו מס לגברים')),
        'avgWomenTaxableGross': clean_val(r.get('ממוצע ברוטו מס לנשים')),
        'avgTaxableGross': clean_val(r.get('ממוצע ברוטו למס')),
        'avgMenEmployerCost': clean_val(r.get('ממוצע עלות העסקה לגברים')),
        'avgWomenEmployerCost': clean_val(r.get('ממוצע עלות העסקה לנשים')),
        'avgEmployerCost': clean_val(r.get('ממוצע עלות העסקה'))
    })

print(f"Parsed {len(overview_records)} overview records.")

# 2. Transform PartTime records
part_time_records = []
for idx, r in df_pt.iterrows():
    part_time_records.append({
        'index': clean_val(r.get('INDEX()')),
        'source': clean_str(r.get('מקור התוכן')),
        'year': int(clean_val(r.get('שנה')) or 0),
        'system': clean_str(r.get('מערכת')),
        'subSystem': clean_str(r.get('תת-מערכת')),
        'bodyName': clean_str(r.get('שם גוף')),
        'ptMenCount': clean_val(r.get('כמות עובדים גברים בחלקיות משרה')),
        'ptWomenCount': clean_val(r.get('כמות עובדים נשים בחלקיות משרה')),
        'ptTotalCount': clean_val(r.get('כמות עובדים בחלקיות משרה')),
        'ftMenCount': clean_val(r.get('כמות עובדים גברים במשרה מלאה')),
        'ftWomenCount': clean_val(r.get('כמות עובדים נשים במשרה מלאה')),
        'ftTotalCount': clean_val(r.get('כמות עובדים במשרה מלאה')),
        'ptMenWage': clean_val(r.get('ממוצע ברוטו שוטף והפרשים לגברים במשרה חלקית')),
        'ptWomenWage': clean_val(r.get('ממוצע ברוטו שוטף והפרשים לנשים במשרה חלקית')),
        'ptTotalWage': clean_val(r.get('ממוצע ברוטו שוטף והפרשים לעובדים במשרה חלקית')),
        'ftMenWage': clean_val(r.get('ממוצע ברוטו שוטף והפרשים לגברים במשרה מלאה')),
        'ftWomenWage': clean_val(r.get('ממוצע ברוטו שוטף והפרשים לנשים במשרה מלאה')),
        'ftTotalWage': clean_val(r.get('ממוצע ברוטו שוטף והפרשים לעובדים במשרה מלאה')),
        'ftMenTaxableGross': clean_val(r.get('ממוצע ברוטו מס לגברים במשרה מלאה')),
        'ftWomenTaxableGross': clean_val(r.get('ממוצע ברוטו מס לנשים במשרה מלאה')),
        'ftTotalTaxableGross': clean_val(r.get('ממוצע ברוטו מס למשרה מלאה')),
        'ptMenTaxableGross': clean_val(r.get('ממוצע ברוטו מס לגברים למשרה חלקית')),
        'ptWomenTaxableGross': clean_val(r.get('ממוצע ברוטו מס לנשים למשרה חלקית')),
        'ptTotalTaxableGross': clean_val(r.get('ממוצע ברוטו מס למשרה חלקית')),
        'ftMenEmployerCost': clean_val(r.get('ממוצע עלות העסקה לגברים במשרה מלאה')),
        'ftWomenEmployerCost': clean_val(r.get('ממוצע עלות העסקה לנשים במשרה מלאה')),
        'ftTotalEmployerCost': clean_val(r.get('ממוצע עלות העסקה למשרה מלאה')),
        'ptMenEmployerCost': clean_val(r.get('ממוצע עלות העסקה לגברים למשרה חלקית')),
        'ptWomenEmployerCost': clean_val(r.get('ממוצע עלות העסקה לנשים למשרה חלקית')),
        'ptTotalEmployerCost': clean_val(r.get('ממוצע עלות העסקה למשרה חלקית'))
    })

print(f"Parsed {len(part_time_records)} part-time records.")

# 3. Transform LowWage records
low_wage_records = []
for idx, r in df_low.iterrows():
    low_wage_records.append({
        'index': clean_val(r.get('INDEX()')),
        'source': clean_str(r.get('מקור התוכן')),
        'year': int(clean_val(r.get('שנה')) or 0),
        'system': clean_str(r.get('מערכת')),
        'subSystem': clean_str(r.get('תת-מערכת')),
        'bodyName': clean_str(r.get('שם גוף')),
        'menCount': clean_val(r.get('מספר גברים מקבלי שכר נמוך')),
        'womenCount': clean_val(r.get('מספר נשים מקבלות נמוך משכר ממוצע')),
        'totalCount': clean_val(r.get('מספר עובדים ממוצע לחודש המקבלים שכר נמוך מהממוצע')),
        'menWage': clean_val(r.get('ממוצע ברוטו והפרשים של מקבלי שכר נמוך גברים')),
        'womenWage': clean_val(r.get('ממוצע ברוטו והפרשים של מקבלי שכר נמוך נשים')),
        'totalWage': clean_val(r.get('ממוצע שכר ברוטו והפרשים של מקבלי שכר נמוך')),
        'menTaxableGross': clean_val(r.get('ממוצע ברוטו למס של מקבלי שכר נמוך גברים')),
        'womenTaxableGross': clean_val(r.get('ממוצע ברוטו למס של מקבלי שכר נמוך נשים')),
        'totalTaxableGross': clean_val(r.get('ממוצע ברוטו למס למקבלי שכר נמוך')),
        'menEmployerCost': clean_val(r.get('ממוצע עלות העסקה של מקבלי שכר נמוך גברים')),
        'womenEmployerCost': clean_val(r.get('ממוצע עלות העסקה של מקבלי שכר נמוך נשים')),
        'totalEmployerCost': clean_val(r.get('ממוצע עלות העסקה למקבלי שכר נמוך'))
    })

# 4. Transform MinWage records
min_wage_records = []
for idx, r in df_min.iterrows():
    min_wage_records.append({
        'index': clean_val(r.get('INDEX()')),
        'source': clean_str(r.get('מקור התוכן')),
        'year': int(clean_val(r.get('שנה')) or 0),
        'system': clean_str(r.get('מערכת')),
        'subSystem': clean_str(r.get('תת-מערכת')),
        'bodyName': clean_str(r.get('שם גוף')),
        'menCount': clean_val(r.get('גברים מקבלי השלמה למינימום')),
        'womenCount': clean_val(r.get('נשים מקבלות השלמה למינימום')),
        'totalCount': clean_val(r.get('מספר עובדים ממוצע לחודש המקבלים השלמה')),
        'menWage': clean_val(r.get('ממוצע ברוטו והפרשים של מקבלי השלמה גברים')),
        'womenWage': clean_val(r.get('ממוצע ברוטו והפרשים של מקבלי השלמה נשים')),
        'totalWage': clean_val(r.get('ממוצע שכר ברוטו והפרשים של מקבלי השלמה')),
        'menTaxableGross': clean_val(r.get('ממוצע ברוטו מס לגברים מקבלי השלמה')),
        'womenTaxableGross': clean_val(r.get('ממוצע ברוטו מס לנשים מקבלות השלמה')),
        'totalTaxableGross': clean_val(r.get('ממוצע ברוטו למס למקבלי השלמה')),
        'menEmployerCost': clean_val(r.get('ממוצע עלות העסקה לגברים מקבלי השלמה')),
        'womenEmployerCost': clean_val(r.get('ממוצע עלות העסקה לנשים מקבלות השלמה')),
        'totalEmployerCost': clean_val(r.get('ממוצע עלות העסקה למקבלי השלמה'))
    })

bundle_obj = {
    'overview': overview_records,
    'partTime': part_time_records,
    'lowWage': low_wage_records,
    'minWage': min_wage_records
}

out_path = 'scripts/data_bundle.js'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('window.__PRELOADED_DATA__ = ')
    json.dump(bundle_obj, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

size_mb = os.path.getsize(out_path) / (1024 * 1024)
print(f"Generated {out_path} ({size_mb:.2f} MB)")
