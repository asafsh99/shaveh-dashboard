# -*- coding: utf-8 -*-
import json, sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('window.__PRELOADED_DATA__ = ', '').rstrip(';\n'))

overview = data['overview']
part_time = data['partTime']

# Find all records for train / rakevet
train_ov = [r for r in overview if 'רכבת' in (r.get('bodyName') or '')]
train_pt = [r for r in part_time if 'רכבת' in (r.get('bodyName') or '')]

print(f"Total Overview rows for 'רכבת': {len(train_ov)}")
print(f"Total PartTime rows for 'רכבת': {len(train_pt)}")

print("\nOverview Years and Body Names:")
ov_by_year = {}
for r in train_ov:
    b = r.get('bodyName')
    y = r.get('year')
    if (b, y) not in ov_by_year:
        ov_by_year[(b, y)] = 0
    ov_by_year[(b, y)] += 1

for (b, y), count in sorted(ov_by_year.items()):
    print(f"  {y} | {b} ({count} ranks)")

print("\nPartTime Years and Body Names:")
for r in train_pt:
    print(f"  {r.get('year')} | {r.get('bodyName')} | FT Men: {r.get('ftMenCount')}, FT Women: {r.get('ftWomenCount')}")

# Also check original Excel files directly:
print("\n--- Checking original Excel files directly ---")
df_ov = pd.read_excel('data/נתוני סקירה כללית.xlsx', header=1)
df_ov.columns = [c.strip() for c in df_ov.columns]
rail_ov = df_ov[df_ov['שם גוף'].astype(str).str.contains('רכבת', na=False)]
print("Unique (Body, Year) in Overview Excel:")
print(rail_ov[['שם גוף', 'שנה']].drop_duplicates().sort_values(by=['שנה', 'שם גוף']).to_string(index=False))

df_pt = pd.read_excel('data/נתוני חלקיות משרה.xlsx', header=1)
df_pt.columns = [c.strip() for c in df_pt.columns]
rail_pt = df_pt[df_pt['שם גוף'].astype(str).str.contains('רכבת', na=False)]
print("\nUnique (Body, Year) in PartTime Excel:")
print(rail_pt[['שם גוף', 'שנה']].drop_duplicates().sort_values(by=['שנה', 'שם גוף']).to_string(index=False))
