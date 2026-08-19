# -*- coding: utf-8 -*-
import pandas as pd
import json, os, sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== Generating data_bundle.js ===")

def clean_val(v):
    if pd.isna(v) or v is None:
        return None
    s = str(v).replace(',', '').replace('%', '').strip()
    if s in ['', 'NaN', 'nan', 'null']:
        return None
    try:
        n = float(s)
        return int(n) if n.is_integer() else round(n, 2)
    except:
        return s

# 1. Overview
df_ov = pd.read_csv('data/נתוני סקירה כללית (3).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_ov.columns = [c.strip() for c in df_ov.columns]
overview_list = []
for idx, r in df_ov.iterrows():
    overview_list.append({
        'id': idx + 1,
        'source': clean_val(r.get('מקור התוכן', '')),
        'year': int(r['שנה']) if pd.notnull(r.get('שנה')) else None,
        'system': clean_val(r.get('מערכת', '')),
        'subSystem': clean_val(r.get('תת-מערכת', '')),
        'bodyName': clean_val(r.get('שם גוף', '')),
        'rank': clean_val(r.get('דירוג', '')),
        'menCount': clean_val(r.get('סך גברים עובדים')),
        'womenCount': clean_val(r.get('סך נשים עובדות')),
        'menPercent': clean_val(r.get('גברים')),
        'womenPercent': clean_val(r.get('נשים')),
        'totalMonthlyAvg': clean_val(r.get('מספר עובדים ממוצע לחודש')),
        'avgMenWage': clean_val(r.get('שכר גברים ממוצע')),
        'avgWomenWage': clean_val(r.get('שכר נשים ממוצע')),
        'avgGrossRegular': clean_val(r.get('ממוצע ברוטו שוטף והפרשים')),
        'avgMenTaxGross': clean_val(r.get('ממוצע ברוטו מס לגברים')),
        'avgWomenTaxGross': clean_val(r.get('ממוצע ברוטו מס לנשים')),
        'avgTotalTaxGross': clean_val(r.get('ממוצע ברוטו למס')),
        'avgMenEmployerCost': clean_val(r.get('ממוצע עלות העסקה לגברים')),
        'avgWomenEmployerCost': clean_val(r.get('ממוצע עלות העסקה לנשים')),
        'avgTotalEmployerCost': clean_val(r.get('ממוצע עלות העסקה')),
    })
print(f"Overview rows: {len(overview_list)}")

# 2. PartTime
df_pt = pd.read_csv('data/נתוני חלקיות משרה (1).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_pt.columns = [c.strip() for c in df_pt.columns]
pt_list = []
for idx, r in df_pt.iterrows():
    pt_list.append({
        'id': idx + 1,
        'source': clean_val(r.get('מקור התוכן', '')),
        'year': int(r['שנה']) if pd.notnull(r.get('שנה')) else None,
        'system': clean_val(r.get('מערכת', '')),
        'subSystem': clean_val(r.get('תת-מערכת', '')),
        'bodyName': clean_val(r.get('שם גוף', '')),
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
        'ptMenCost': clean_val(r.get('ממוצע עלות העסקה לגברים למשרה חלקית')),
        'ptWomenCost': clean_val(r.get('ממוצע עלות העסקה לנשים למשרה חלקית')),
        'ptTotalCost': clean_val(r.get('ממוצע עלות העסקה למשרה חלקית')),
        'ftMenCost': clean_val(r.get('ממוצע עלות העסקה לגברים במשרה מלאה')),
        'ftWomenCost': clean_val(r.get('ממוצע עלות העסקה לנשים במשרה מלאה')),
        'ftTotalCost': clean_val(r.get('ממוצע עלות העסקה למשרה מלאה')),
    })
print(f"PartTime rows: {len(pt_list)}")

# 3. LowWage
df_lw = pd.read_csv('data/נתוני שכר נמוך (1).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_lw.columns = [c.strip() for c in df_lw.columns]
lw_list = []
for idx, r in df_lw.iterrows():
    lw_list.append({
        'id': idx + 1,
        'source': clean_val(r.get('מקור התוכן', '')),
        'year': int(r['שנה']) if pd.notnull(r.get('שנה')) else None,
        'system': clean_val(r.get('מערכת', '')),
        'subSystem': clean_val(r.get('תת-מערכת', '')),
        'bodyName': clean_val(r.get('שם גוף', '')),
        'lwMenCount': clean_val(r.get('מספר גברים מקבלי שכר נמוך')),
        'lwWomenCount': clean_val(r.get('מספר נשים מקבלות נמוך משכר ממוצע')),
        'lwTotalCount': clean_val(r.get('מספר עובדים ממוצע לחודש המקבלים שכר נמוך מהממוצע')),
        'lwMenWage': clean_val(r.get('ממוצע ברוטו והפרשים של מקבלי שכר נמוך גברים')),
        'lwWomenWage': clean_val(r.get('ממוצע ברוטו והפרשים של מקבלי שכר נמוך נשים')),
        'lwTotalWage': clean_val(r.get('ממוצע שכר ברוטו והפרשים של מקבלי שכר נמוך')),
        'lwMenTaxGross': clean_val(r.get('ממוצע ברוטו למס של מקבלי שכר נמוך גברים')),
        'lwWomenTaxGross': clean_val(r.get('ממוצע ברוטו למס של מקבלי שכר נמוך נשים')),
        'lwTotalTaxGross': clean_val(r.get('ממוצע ברוטו למס למקבלי שכר נמוך')),
        'lwMenCost': clean_val(r.get('ממוצע עלות העסקה של מקבלי שכר נמוך גברים')),
        'lwWomenCost': clean_val(r.get('ממוצע עלות העסקה של מקבלי שכר נמוך נשים')),
        'lwTotalCost': clean_val(r.get('ממוצע עלות העסקה למקבלי שכר נמוך')),
    })
print(f"LowWage rows: {len(lw_list)}")

# 4. MinWage
df_mw = pd.read_csv('data/נתוני מקבלי השלמה למינימום (2).csv', sep='\t', encoding='utf-16le', skiprows=1)
df_mw.columns = [c.strip() for c in df_mw.columns]
mw_list = []
for idx, r in df_mw.iterrows():
    mw_list.append({
        'id': idx + 1,
        'source': clean_val(r.get('מקור התוכן', '')),
        'year': int(r['שנה']) if pd.notnull(r.get('שנה')) else None,
        'system': clean_val(r.get('מערכת', '')),
        'subSystem': clean_val(r.get('תת-מערכת', '')),
        'bodyName': clean_val(r.get('שם גוף', '')),
        'mwMenCount': clean_val(r.get('גברים מקבלי השלמה למינימום')),
        'mwWomenCount': clean_val(r.get('נשים מקבלות השלמה למינימום')),
        'mwTotalCount': clean_val(r.get('מספר עובדים ממוצע לחודש המקבלים השלמה')),
        'mwMenWage': clean_val(r.get('ממוצע ברוטו והפרשים של מקבלי השלמה גברים')),
        'mwWomenWage': clean_val(r.get('ממוצע ברוטו והפרשים של מקבלי השלמה נשים')),
        'mwTotalWage': clean_val(r.get('ממוצע שכר ברוטו והפרשים של מקבלי השלמה')),
        'mwMenTaxGross': clean_val(r.get('ממוצע ברוטו מס לגברים מקבלי השלמה')),
        'mwWomenTaxGross': clean_val(r.get('ממוצע ברוטו מס לנשים מקבלות השלמה')),
        'mwTotalTaxGross': clean_val(r.get('ממוצע ברוטו למס למקבלי השלמה')),
        'mwMenCost': clean_val(r.get('ממוצע עלות העסקה לגברים מקבלי השלמה')),
        'mwWomenCost': clean_val(r.get('ממוצע עלות העסקה לנשים מקבלות השלמה')),
        'mwTotalCost': clean_val(r.get('ממוצע עלות העסקה למקבלי השלמה')),
    })
print(f"MinWage rows: {len(mw_list)}")

bundle_data = {
    'overview': overview_list,
    'partTime': pt_list,
    'lowWage': lw_list,
    'minWage': mw_list
}

with open('scripts/data_bundle.js', 'w', encoding='utf-8') as f:
    f.write('window.__PRELOADED_DATA__ = ')
    json.dump(bundle_data, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

print("Successfully written scripts/data_bundle.js. File size:", round(os.path.getsize('scripts/data_bundle.js') / (1024*1024), 2), "MB")
