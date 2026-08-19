# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('window.__PRELOADED_DATA__ = ', '').rstrip(';\n'))

overview = data['overview']
part_time = data['partTime']

ichilov_pt = next((r for r in part_time if r.get('bodyName') == 'איכילוב' and r.get('year') == 2024), None)
ichilov_ov = [r for r in overview if r.get('bodyName') == 'איכילוב' and r.get('year') == 2024]

print("=== ICHILOV DATA ===")
print("PartTime Row:")
for k, v in ichilov_pt.items():
    print(f"  {k}: {v}")

print("\nOverview Ranks:")
for r in ichilov_ov:
    print(f"  {r.get('rank')}: MC={r.get('menCount')}, MW={r.get('avgMenWage')}, WC={r.get('womenCount')}, WW={r.get('avgWomenWage')}")

# Target Men Wage = 23125
# Let's test combinations to see what exactly equals 23125:

# Values:
# FT Men: 1774.25, FT Men Wage: 23313.345706
# PT Men: 230.5, PT Men Wage: 20731.863030
# FT Total: 4470.666667, FT Total Wage: 21350.684751
# PT Total: 1588.666667, PT Total Wage: 18473.331040

# Total Men = 2004.75

# Test 1: (23313.345706 * 1774.25 + 21350.684751 * 230.5) / 2004.75
# What if PT Men are weighted by FT Total Wage (21,351)?
t1 = (23313.345706 * 1774.25 + 21350.684751 * 230.5) / 2004.75
print(f"Test 1 (weight PT Men by FT Total Wage): {t1:.2f} -> round: {round(t1)}")

# Test 2: (23313.345706 * 1774.25 + 21683.74 * 230.5) / 2004.75
# What PT rate X yields exactly 23125?
# 23125 * 2004.75 - 23313.345706 * 1774.25 = 46359843.75 - 41363704.92 = 4996138.83 / 230.5 = 21675.22!
print(f"Required PT Rate for 23125: {(23125 * 2004.75 - 23313.345706 * 1774.25) / 230.5:.2f}")

# Test 3: What if we compute from Overview Ranks?
# Sum across all ranks with reported Men Wage:
sum_mw = sum((r.get('menCount') or 0) * (r.get('avgMenWage') or 0) for r in ichilov_ov if r.get('avgMenWage') is not None)
count_m = sum((r.get('menCount') or 0) for r in ichilov_ov if r.get('avgMenWage') is not None)
ov_avg_m = sum_mw / count_m if count_m > 0 else 0
print(f"Test 3 (Overview rank weighted average): {ov_avg_m:.2f} -> round: {round(ov_avg_m)}")
print(f"Total Men count in Overview: {count_m}")

# Look at Test 3: 23125.13 !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# WOW !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# sum_mw / count_m = 23,125.13 -> round: 23,125 !!!!!!!!!!!!!!!!!!!!!!!!!!!
