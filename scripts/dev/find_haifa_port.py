# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('window.__PRELOADED_DATA__ = ', '').rstrip(';\n'))

overview = data['overview']
part_time = data['partTime']
low_wage = data['lowWage']
min_wage = data['minWage']

print("=== Checking bodies containing 'חיפה' or 'נמל' in Overview ===")
ov_haifa = sorted(list(set(r.get('bodyName') for r in overview if any(k in (r.get('bodyName') or '') for k in ['נמל', 'חיפה']))))
for b in ov_haifa:
    years = sorted(list(set(r.get('year') for r in overview if r.get('bodyName') == b)))
    print(f"  Overview: '{b}' -> Years: {years}")

print("\n=== Checking bodies containing 'חיפה' or 'נמל' in PartTime ===")
pt_haifa = sorted(list(set(r.get('bodyName') for r in part_time if any(k in (r.get('bodyName') or '') for k in ['נמל', 'חיפה']))))
for b in pt_haifa:
    years = sorted(list(set(r.get('year') for r in part_time if r.get('bodyName') == b)))
    print(f"  PartTime: '{b}' -> Years: {years}")

print("\n=== Checking all 'נמל' in Overview ===")
ov_namal = sorted(list(set(r.get('bodyName') for r in overview if 'נמל' in (r.get('bodyName') or ''))))
print("All Port bodies in Overview:", ov_namal)

print("\n=== Checking all 'נמל' in PartTime ===")
pt_namal = sorted(list(set(r.get('bodyName') for r in part_time if 'נמל' in (r.get('bodyName') or ''))))
print("All Port bodies in PartTime:", pt_namal)
