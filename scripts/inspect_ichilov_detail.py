# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('window.__PRELOADED_DATA__ = ', '').rstrip(';\n'))

with open('scripts/tableau_benchmarks.js', 'r', encoding='utf-8') as f:
    benchmarks = json.loads(f.read().replace('window.__TABLEAU_BODY_BENCHMARKS__ = ', '').rstrip(';\n'))

overview = data['overview']
part_time = data['partTime']

ichilov_bm_2024 = benchmarks.get('איכילוב_2024')
ichilov_pt_2024 = next((r for r in part_time if r.get('bodyName') == 'איכילוב' and r.get('year') == 2024), None)
ichilov_ov_2024 = [r for r in overview if r.get('bodyName') == 'איכילוב' and r.get('year') == 2024]

print("=================== איכילוב (2024) ===================")
print("Benchmark Object:")
print(json.dumps(ichilov_bm_2024, ensure_ascii=False, indent=2))

print("\nPartTime Row (2024):")
print(json.dumps(ichilov_pt_2024, ensure_ascii=False, indent=2))

print(f"\nOverview Ranks ({len(ichilov_ov_2024)} ranks):")
for r in ichilov_ov_2024:
    print(f" - {r.get('rank')}: Men={r.get('menCount')} (Wage={r.get('avgMenWage')}), Women={r.get('womenCount')} (Wage={r.get('avgWomenWage')}), TotalMonthly={r.get('monthlyEmployeeCount')}, Gross={r.get('avgGrossRegular')}")
