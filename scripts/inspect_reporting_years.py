# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('window.__PRELOADED_DATA__ = ', '').rstrip(';\n'))

overview = data['overview']

# Group by system and find years
system_years = {}
for r in overview:
    s = r.get('system')
    y = r.get('year')
    if s not in system_years:
        system_years[s] = set()
    system_years[s].add(y)

print("Years available per system:")
for s, yrs in sorted(system_years.items()):
    print(f"  {s}: {sorted(list(yrs))}")

# Check when bodies joined reporting
body_min_year = {}
for r in overview:
    b = r.get('bodyName')
    y = r.get('year')
    if b not in body_min_year or y < body_min_year[b]:
        body_min_year[b] = y

joined_2021 = [b for b, y in body_min_year.items() if y == 2021]
joined_2018 = [b for b, y in body_min_year.items() if y == 2018]

print(f"\nTotal bodies starting at 2018: {len(joined_2018)}")
print(f"Total bodies starting at 2021: {len(joined_2021)} (including רכבת ישראל, חברות בת וכו')")
print(f"Sample bodies starting at 2021: {joined_2021[:10]}")
