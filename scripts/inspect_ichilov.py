# -*- coding: utf-8 -*-
import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/data_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

json_str = text[text.index('{'):text.rindex('}')+1]
data = json.loads(json_str)

overview = data['overview']
part_time = data['partTime']

with open('scripts/tableau_benchmarks.js', 'r', encoding='utf-8') as f:
    bm_text = f.read()
bm_json = bm_text[bm_text.index('{'):bm_text.rindex('}')+1]
benchmarks = json.loads(bm_json)

# Find all body names matching ichilov / sourasky / tel aviv medical
ichilov_bodies = set()
for r in overview:
    b = r.get('bodyName') or ''
    if any(k in b for k in ['איכילוב', 'סוראסקי', 'סורסקי', 'מרכז רפואי תל אביב', 'תל-אביב']):
        ichilov_bodies.add(b)

for r in part_time:
    b = r.get('bodyName') or ''
    if any(k in b for k in ['איכילוב', 'סוראסקי', 'סורסקי', 'מרכז רפואי תל אביב', 'תל-אביב']):
        ichilov_bodies.add(b)

print("Matching bodies for Ichilov:", ichilov_bodies)

for b in sorted(ichilov_bodies):
    print(f"\n=================== {b} (2024) ===================")
    k = f"{b}_2024"
    bm = benchmarks.get(k)
    print("Benchmark Data:")
    print(bm)
    
    # Check PT row
    pt_row = next((r for r in part_time if r.get('bodyName') == b and r.get('year') == 2024), None)
    if pt_row:
        print("\nPartTime Row:")
        print(f"  FT Men: {pt_row.get('ftMenCount')}, FT Women: {pt_row.get('ftWomenCount')}, FT Total: {pt_row.get('ftTotalCount')}")
        print(f"  FT Men Wage: {pt_row.get('ftMenWage')}, FT Women Wage: {pt_row.get('ftWomenWage')}, FT Total Wage: {pt_row.get('ftTotalWage')}")
        print(f"  PT Men: {pt_row.get('ptMenCount')}, PT Women: {pt_row.get('ptWomenCount')}, PT Total: {pt_row.get('ptTotalCount')}")
        print(f"  PT Men Wage: {pt_row.get('ptMenWage')}, PT Women Wage: {pt_row.get('ptWomenWage')}, PT Total Wage: {pt_row.get('ptTotalWage')}")
        
    # Check Overview rows
    ov_rows = [r for r in overview if r.get('bodyName') == b and r.get('year') == 2024]
    print(f"\nOverview Rows ({len(ov_rows)} ranks):")
    for r in ov_rows:
        print(f"  {r.get('rank')} | Men: {r.get('menCount')} (Wage: {r.get('avgMenWage')}) | Women: {r.get('womenCount')} (Wage: {r.get('avgWomenWage')}) | Monthly: {r.get('monthlyEmployeeCount')} (Gross: {r.get('avgGrossRegular')})")
